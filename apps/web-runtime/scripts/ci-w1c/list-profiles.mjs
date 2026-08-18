// CI-W1C Phase 0: Probe Node Web Host to dump the available API
// profiles (settings.get profiles). This tells us which profile
// IDs to use for analysis + image generation.

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRuntimeRoot = path.resolve(scriptDir, '..', '..');
const repoRoot = path.resolve(webRuntimeRoot, '..', '..');
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const viteCli = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const rendererConfig = path.join(repoRoot, 'apps', 'web', 'vite.config.mjs');
const smokeRoot = path.join(repoRoot, '.codex-smoke', 'ci-w1c');
const userDataDir = path.join(smokeRoot, `node-user-data-${Date.now()}`);
const timeoutMs = 30_000;

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
async function rpc(rendererUrl, channel, args) {
  const response = await fetch(new URL(`/_masterpiece/rpc/${encodeURIComponent(channel)}`, rendererUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ args }),
  });
  const body = await response.json();
  return { status: response.status, body };
}

await fs.mkdir(userDataDir, { recursive: true });
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
let hostReady = null;
let output = '';
for (const child of children) {
  const capture = (chunk) => {
    const value = chunk.toString('utf8');
    output += value;
    for (const line of value.split(/\r?\n/)) {
      try {
        const event = JSON.parse(line.slice(line.indexOf('{')));
        if (event.event === 'NODE_WEB_HOST_READY') hostReady = event;
      } catch { /* not JSON */ }
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
try {
  const deadline = Date.now() + timeoutMs;
  await waitFor(() => hostReady, 'Node Web Host', deadline);
  await waitFor(async () => {
    const response = await fetch(rendererUrl);
    return response.ok ? true : null;
  }, 'Renderer dev server', deadline);
  const r = await rpc(rendererUrl, 'settings:get', []);
  process.stdout.write(`PROFILES ${JSON.stringify(r.body, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`PROFILES_FAILED ${error.stack || error.message}\n${output.slice(-4000)}`);
  process.exitCode = 1;
} finally {
  stopChildren();
  await delay(500);
}
