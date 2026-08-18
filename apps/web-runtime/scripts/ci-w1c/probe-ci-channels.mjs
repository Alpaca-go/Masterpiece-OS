// CI-W1C Phase 0: Probe Node Web Host to confirm CI-W1A + CI-W2 channels are
// registered. This is a 30-second smoke that does NOT start a CI run — it
// only verifies the channel surface.
//
// This file is intentionally minimal: it re-uses the existing web-primary
// smoke pattern (CDP via WebSocket + headless Chrome + RPC) but does not
// drive the full CI workflow. The full workflow lives in
// `drive-ci-workflow.mjs`.

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRuntimeRoot = path.resolve(scriptDir, '..', '..');
const repoRoot = path.resolve(webRuntimeRoot, '..', '..');
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const viteCli = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const rendererConfig = path.join(repoRoot, 'apps', 'web', 'vite.config.mjs');
const smokeRoot = path.join(repoRoot, '.codex-smoke', 'ci-w1c');
const userDataDir = path.join(smokeRoot, `node-user-data-${Date.now()}`);
const chromeDataDir = path.join(smokeRoot, `chrome-user-data-${Date.now()}`);
const timeoutMs = Number(process.env.MASTERPIECE_CI_W1C_TIMEOUT_MS || 60_000);

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

  // Probe the CI RPC channels (CI-W1A surface + CI-W2 anchor surface).
  // We do NOT call start — we only confirm the channels are registered.
  // Calling a non-existent channel with a non-empty projectId returns
  // a structured error rather than WEB_RPC_CHANNEL_NOT_FOUND.
  const probeChannels = [
    'creative-intelligence:start',
    'creative-intelligence:get-run',
    'creative-intelligence:list-runs',
    'creative-intelligence:get-fact-review',
    'creative-intelligence:confirm-facts',
    'creative-intelligence:get-workspace',
    'creative-intelligence:select-direction',
    'creative-intelligence:resume',
    'creative-intelligence:cancel',
    'creative-intelligence:remove',
    'creative-intelligence:start-anchor-production',
    'creative-intelligence:compile-anchor-production',
    'creative-intelligence:get-anchor-production',
    'creative-intelligence:list-anchor-candidates',
    'creative-intelligence:approve-anchor-candidate',
    'creative-intelligence:reject-anchor-candidate',
    'creative-intelligence:retry-anchor-candidate',
    'creative-intelligence:cancel-anchor-production',
    'creative-intelligence:get-approved-anchor',
    'creative-intelligence:get-anchor-approval-history',
  ];
  const probe = {};
  for (const channel of probeChannels) {
    try {
      const r = await rpc(rendererUrl, channel, ['__ci_w1c_probe_no_such_run__'], false);
      const errorCode = String(r.body?.error || '');
      probe[channel] = {
        status: r.status,
        registered: !errorCode.includes('CHANNEL_NOT_FOUND'),
        errorCode: errorCode.split(':')[0].trim() || null,
      };
    } catch (error) {
      probe[channel] = { registered: false, error: String(error.message) };
    }
  }

  const result = {
    schemaVersion: 'ci-w1c.0.1',
    status: 'pass',
    probe,
    channelCount: hostReady.operationCount,
    health: { host: health.host, mode: health.mode },
    rendererUrl,
    rpcUrl,
    completedAt: new Date().toISOString(),
  };
  const allRegistered = probeChannels.every((c) => probe[c]?.registered);
  result.status = allRegistered ? 'pass' : 'fail';
  if (!allRegistered) result.message = 'Some CI channels are not registered; see probe.*.registered';
  await fs.writeFile(path.join(smokeRoot, 'probe-result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`CI_W1C_PROBE ${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`CI_W1C_PROBE_FAILED ${error.stack || error.message}\n${output.slice(-8000)}`);
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
