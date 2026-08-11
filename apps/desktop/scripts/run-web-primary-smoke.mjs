import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(desktopRoot, '..', '..');
const electronViteCli = path.join(repoRoot, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js');
const smokeRoot = path.join(repoRoot, '.codex-smoke', 'web-primary-runtime');
const userDataDir = path.join(smokeRoot, `user-data-${Date.now()}`);
const timeoutMs = Number(process.env.MASTERPIECE_WEB_SMOKE_TIMEOUT_MS || 90_000);

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(check, label, deadline) {
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`${label} timed out${lastError ? `: ${lastError.message}` : ''}`);
}

async function rpc(rendererUrl, channel, args, expectedOk = true) {
  const response = await fetch(new URL(`/_masterpiece/rpc/${encodeURIComponent(channel)}`, rendererUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ args }),
  });
  const body = await response.json();
  if (expectedOk && !response.ok) throw new Error(`${channel} failed: ${body.error || response.status}`);
  if (!expectedOk) {
    if (response.ok) throw new Error(`${channel} unexpectedly succeeded for an invalid smoke input`);
    if (String(body.error || '').includes('WEB_RPC_CHANNEL_NOT_FOUND')) {
      throw new Error(`${channel} is not registered in the Web runtime`);
    }
  }
  return { status: response.status, body };
}

await fs.mkdir(userDataDir, { recursive: true });
const rpcPort = await freePort();
const child = spawn(process.execPath, [
  electronViteCli,
  'dev',
  '--',
  `--user-data-dir=${userDataDir}`,
  '--disable-gpu',
], {
  cwd: desktopRoot,
  env: {
    ...process.env,
    MASTERPIECE_WEB_MODE: '1',
    MASTERPIECE_WEB_RPC_PORT: String(rpcPort),
    MASTERPIECE_WEB_RPC_URL: `http://127.0.0.1:${rpcPort}`,
    MASTERPIECE_WEB_OPEN_BROWSER: '0',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
let webReady = null;
let rendererSmoke = null;
const capture = (chunk) => {
  const text = chunk.toString('utf8');
  output += text;
  process.stdout.write(text);
  for (const line of text.split(/\r?\n/)) {
    const jsonStart = line.indexOf('{');
    if (jsonStart < 0) continue;
    try {
      const event = JSON.parse(line.slice(jsonStart));
      if (event.event === 'WEB_MODE_READY') webReady = event;
      if (event.event === 'WEB_RENDERER_SMOKE') rendererSmoke = event;
    } catch {
      // electron-vite diagnostic text may contain non-JSON braces.
    }
  }
};
child.stdout.on('data', capture);
child.stderr.on('data', capture);

const stopChildTree = () => {
  if (child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  } else {
    child.kill('SIGTERM');
  }
};

try {
  const deadline = Date.now() + timeoutMs;
  await waitFor(() => webReady, 'WEB_MODE_READY', deadline);
  const rendererUrl = webReady.rendererUrl;
  const health = await waitFor(async () => {
    const response = await fetch(new URL('/_masterpiece/health', rendererUrl));
    if (!response.ok) return null;
    const body = await response.json();
    return body.ok && body.mode === 'web' ? body : null;
  }, 'Web health', deadline);
  const renderer = await waitFor(() => (
    rendererSmoke
    && !rendererSmoke.renderError
    && rendererSmoke.rootClass
    && rendererSmoke.rootClass !== 'splash'
      ? rendererSmoke
      : null
  ), 'Web renderer page', deadline);

  const settings = await rpc(rendererUrl, 'settings:get', []);
  const analysis = await rpc(rendererUrl, 'analysis:cancel', ['__web_smoke_no_active_project__']);
  const provider = await rpc(rendererUrl, 'image-generation:get-capabilities', []);
  const referenceFirst = await rpc(rendererUrl, 'image-generation:vnext-options', []);
  const invalidTask = {
    projectId: '__web_smoke_missing_project__',
    task: {
      deliverableFamily: 'space',
      subtype: 'consultation',
      shot: 'entrance_view',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Web smoke reachability only',
      generationBasis: 'standard',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: [],
      logoUsageMode: 'post_composite',
    },
  };
  await rpc(rendererUrl, 'image-generation:vnext-compile', [invalidTask], false);
  await rpc(rendererUrl, 'image-generation:vnext-start', [{
    projectId: '__web_smoke_missing_project__',
    taskId: '__web_smoke_missing_task__',
  }], false);

  const result = {
    schemaVersion: '1.0',
    status: 'pass',
    runtime: 'web',
    rendererUrl,
    rpcUrl: webReady.rpcUrl,
    checks: {
      webBoot: true,
      rendererPage: Boolean(renderer.rootClass && renderer.rootClass !== 'splash' && !renderer.renderError),
      configLoad: Array.isArray(settings.body.result?.profiles),
      providerResolution: Boolean(provider.body.result?.modelId),
      analysisServiceReachable: analysis.body.result === false,
      referenceFirstServiceReachable: Boolean(referenceFirst.body.result),
      compilerRouteReachable: true,
      generatorRouteReachable: true,
    },
    providerCalls: 0,
    businessWrites: 0,
    completedAt: new Date().toISOString(),
  };
  if (Object.values(result.checks).some((value) => value !== true)) {
    throw new Error(`Web smoke check failed: ${JSON.stringify(result.checks)}`);
  }
  await fs.writeFile(path.join(smokeRoot, 'latest-result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`WEB_PRIMARY_SMOKE ${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`WEB_PRIMARY_SMOKE_FAILED ${error.stack || error.message}\n`);
  process.stderr.write(output.slice(-8_000));
  process.exitCode = 1;
} finally {
  stopChildTree();
}
