import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { assertNodeOnlyProcessTree } from './process-tree-evidence.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRuntimeRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(webRuntimeRoot, '..', '..');
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const viteCli = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const rendererConfig = path.join(repoRoot, 'apps', 'web', 'vite.config.mjs');
const smokeRoot = path.join(repoRoot, '.codex-smoke', 'web-primary-runtime');
const userDataDir = path.join(smokeRoot, `node-user-data-${Date.now()}`);
const chromeDataDir = path.join(smokeRoot, `chrome-user-data-${Date.now()}`);
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
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
    if (response.ok) throw new Error(`${channel} unexpectedly succeeded for invalid smoke input`);
    if (String(body.error || '').includes('WEB_RPC_CHANNEL_NOT_FOUND')) throw new Error(`${channel} is not registered`);
  }
  return { status: response.status, body };
}
function chromeExecutable() {
  const candidates = [
    process.env.MASTERPIECE_CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function connectCdp(webSocketDebuggerUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketDebuggerUrl);
    const pending = new Map();
    let nextId = 1;
    socket.once('error', reject);
    socket.once('open', () => resolve({
      async call(method, params = {}) {
        const id = nextId++;
        const response = new Promise((resolveCall, rejectCall) => pending.set(id, { resolveCall, rejectCall }));
        socket.send(JSON.stringify({ id, method, params }));
        return response;
      },
      close() { socket.close(); },
    }));
    socket.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (!message.id || !pending.has(message.id)) return;
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.rejectCall(new Error(`${message.error.code}: ${message.error.message}`));
      else request.resolveCall(message.result);
    });
  });
}

await fs.mkdir(userDataDir, { recursive: true });
await fs.mkdir(chromeDataDir, { recursive: true });
const rpcPort = await freePort();
const rendererPort = await freePort();
const rendererUrl = `http://127.0.0.1:${rendererPort}`;
const rpcUrl = `http://127.0.0.1:${rpcPort}`;
const env = {
  ...process.env,
  MASTERPIECE_USER_DATA_DIR: userDataDir,
  MASTERPIECE_WEB_OPEN_PATH: '0',
  MASTERPIECE_WEB_RPC_PORT: String(rpcPort),
  MASTERPIECE_WEB_RPC_URL: rpcUrl,
  MASTERPIECE_WEB_ALLOWED_ORIGIN: rendererUrl,
};
const children = [
  spawn(process.execPath, [tsxCli, path.join(webRuntimeRoot, 'src', 'main.ts')], { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'] }),
  spawn(process.execPath, [viteCli, '--config', rendererConfig, '--port', String(rendererPort)], { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'] }),
];
let output = '';
let hostReady = null;
for (const child of children) {
  const capture = (chunk) => {
    const value = chunk.toString('utf8');
    output += value;
    process.stdout.write(value);
    for (const line of value.split(/\r?\n/)) {
      try {
        const event = JSON.parse(line.slice(line.indexOf('{')));
        if (event.event === 'NODE_WEB_HOST_READY') hostReady = event;
      } catch { /* build diagnostics are not JSON */ }
    }
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
}
function stopChildren() {
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    else child.kill('SIGTERM');
  }
}
let chromeChild = null;
let cdp = null;

try {
  const deadline = Date.now() + timeoutMs;
  await waitFor(() => hostReady, 'Node Web Host', deadline);
  const health = await waitFor(async () => {
    const response = await fetch(`${rpcUrl}/_masterpiece/health`);
    if (!response.ok) return null;
    const body = await response.json();
    return body.ok && body.mode === 'web' && body.host === 'node' ? body : null;
  }, 'Node Web health', deadline);
  await waitFor(async () => {
    const response = await fetch(rendererUrl);
    return response.ok ? true : null;
  }, 'Renderer dev server', deadline);

  const chrome = chromeExecutable();
  if (!chrome) throw new Error('Chrome is required for the rendered-page smoke assertion');
  const screenshotPath = path.join(smokeRoot, 'latest-renderer.png');
  await fs.rm(screenshotPath, { force: true });
  const debugPort = await freePort();
  chromeChild = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--disable-extensions', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--metrics-recording-only', '--no-first-run',
    '--no-default-browser-check', '--no-pings', `--user-data-dir=${chromeDataDir}`,
    `--remote-debugging-port=${debugPort}`, '--window-size=1440,1000', rendererUrl,
  ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  chromeChild.stderr.on('data', (chunk) => { output += chunk.toString('utf8'); });
  const target = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    const targets = await response.json();
    return targets.find((item) => item.type === 'page' && item.url.startsWith(rendererUrl)) || null;
  }, 'Chrome DevTools target', Math.min(deadline, Date.now() + 20_000));
  cdp = await connectCdp(target.webSocketDebuggerUrl);
  await cdp.call('Page.enable');
  const rendererState = await waitFor(async () => {
    const evaluation = await cdp.call('Runtime.evaluate', {
      expression: `JSON.stringify({ rootClass: document.getElementById('root')?.firstElementChild?.className || '', text: document.body.innerText, title: document.title })`,
      returnByValue: true,
    });
    const state = JSON.parse(evaluation.result.value || '{}');
    return state.rootClass && state.rootClass !== 'splash' && state.text && !/正在启动 Masterpiece OS/.test(state.text)
      ? state
      : null;
  }, 'Representative renderer state', Math.min(deadline, Date.now() + 30_000));
  const captured = await cdp.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const screenshot = Buffer.from(captured.data, 'base64');
  if (screenshot.length <= 10_000) throw new Error('Rendered-page screenshot is unexpectedly small');
  await fs.writeFile(screenshotPath, screenshot);
  const processEvidenceWithBrowser = assertNodeOnlyProcessTree(process.pid);
  cdp.close();
  cdp = null;
  if (chromeChild.exitCode === null) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(chromeChild.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    else chromeChild.kill('SIGTERM');
  }

  const settings = await rpc(rendererUrl, 'settings:get', []);
  const analysis = await rpc(rendererUrl, 'analysis:cancel', ['__web_smoke_no_active_project__']);
  const provider = await rpc(rendererUrl, 'image-generation:get-capabilities', []);
  const referenceFirst = await rpc(rendererUrl, 'image-generation:short-chain-options', []);
  await rpc(rendererUrl, 'image-generation:short-chain-compile', [{ projectId: '__web_smoke_missing_project__' }], false);
  await rpc(rendererUrl, 'image-generation:short-chain-start', [{ projectId: '__web_smoke_missing_project__', taskId: '__missing__' }], false);
  const processEvidence = assertNodeOnlyProcessTree(process.pid);
  const result = {
    schemaVersion: '1.1', status: 'pass', runtime: 'web', host: 'node', rendererUrl, rpcUrl,
    checks: {
      // Current 180-channel production baseline plus fourteen R4 browsing and
      // seven R5 selection/preference channels in the current operation graph.
      nodeHostBoot: hostReady.operationCount === 201,
      nodeHealth: health.host === 'node',
      rendererPage: screenshot.length > 10_000 && rendererState.rootClass !== 'splash',
      configLoad: Array.isArray(settings.body.result?.profiles),
      providerResolution: Boolean(provider.body.result?.modelId),
      analysisServiceReachable: analysis.body.result === false,
      referenceFirstServiceReachable: Boolean(referenceFirst.body.result),
      compilerRouteReachable: true,
      generatorRouteReachable: true,
      electronProcessCountZero: processEvidence.electronProcessCount === 0,
      desktopMainProcessCountZero: processEvidence.desktopMainProcessCount === 0,
    },
    processEvidence: { ...processEvidence, browserInspection: processEvidenceWithBrowser },
    rendererState: { rootClass: rendererState.rootClass, title: rendererState.title },
    screenshotPath, providerCalls: 0, businessWrites: 0, completedAt: new Date().toISOString(),
  };
  if (Object.values(result.checks).some((value) => value !== true)) throw new Error(`Web smoke check failed: ${JSON.stringify(result.checks)}`);
  await fs.writeFile(path.join(smokeRoot, 'latest-result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`WEB_PRIMARY_SMOKE ${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`WEB_PRIMARY_SMOKE_FAILED ${error.stack || error.message}\n${output.slice(-8000)}`);
  process.exitCode = 1;
} finally {
  cdp?.close();
  if (chromeChild?.exitCode === null) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(chromeChild.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    else chromeChild.kill('SIGTERM');
  }
  stopChildren();
  await fs.rm(chromeDataDir, { recursive: true, force: true }).catch(() => {});
}
