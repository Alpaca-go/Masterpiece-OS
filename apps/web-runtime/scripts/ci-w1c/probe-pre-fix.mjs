// CI-W1C.3 PART A — pre-fix probe.
// Starts Node Web Host + Vite (mimicking the drive script topology),
// then runs a direct RPC probe and a drive-style polling probe.
// Prints results to stdout.

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..', '..');
const tsx = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const viteCli = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const viteCfg = path.join(repoRoot, 'apps', 'web', 'vite.config.mjs');
const userDataDir = process.env.MASTERPIECE_CI_W1C3_USER_DATA_DIR;
if (!userDataDir) throw new Error('MASTERPIECE_CI_W1C3_USER_DATA_DIR is required');

const rpcPort = Number(process.env.MASTERPIECE_CI_W1C3_RPC_PORT || 4327);
const rendererPort = Number(process.env.MASTERPIECE_CI_W1C3_RENDERER_PORT || 4328);
const rpcUrl = `http://127.0.0.1:${rpcPort}`;
const rendererUrl = `http://127.0.0.1:${rendererPort}`;
const ciRunId = process.env.MASTERPIECE_CI_W1C3_CIRUNID || '2ce18dca-4eba-4670-892f-05261df0146b';

const env = {
  ...process.env,
  MASTERPIECE_USER_DATA_DIR: userDataDir,
  MASTERPIECE_WEB_RPC_PORT: String(rpcPort),
  MASTERPIECE_WEB_RPC_URL: rpcUrl,
  MASTERPIECE_WEB_ALLOWED_ORIGIN: rendererUrl,
  MASTERPIECE_WEB_OPEN_PATH: '0',
};

const hostProc = spawn(process.execPath, [tsx, path.join(repoRoot, 'apps', 'web-runtime', 'src', 'main.ts')], { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
hostProc.stdout.on('data', (c) => process.stdout.write(`[host] ${c}`));
hostProc.stderr.on('data', (c) => process.stderr.write(`[host] ${c}`));
const viteProc = spawn(process.execPath, [viteCli, '--config', viteCfg, '--port', String(rendererPort)], { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
viteProc.stdout.on('data', (c) => process.stdout.write(`[vite] ${c}`));
viteProc.stderr.on('data', (c) => process.stderr.write(`[vite] ${c}`));

const cleanup = () => {
  try { hostProc.kill('SIGKILL'); } catch {}
  try { viteProc.kill('SIGKILL'); } catch {}
};

try {
  // Wait for host ready
  const hostReady = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('host not ready 30s')), 30_000);
    hostProc.stdout.on('data', (chunk) => {
      if (chunk.toString('utf8').includes('NODE_WEB_HOST_READY')) { clearTimeout(t); resolve(); }
    });
  }).catch((err) => { throw err; });
  console.log('HOST_READY');
  // Wait for Vite
  await sleep(4000);
  console.log('VITE_PROBABLY_READY');

  async function rpc(baseUrl, channel, args) {
    const r = await fetch(`${baseUrl}/_masterpiece/rpc/${encodeURIComponent(channel)}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ args }),
    });
    return await r.json();
  }

  // Direct RPC against the Node Web Host
  const direct = await rpc(rpcUrl, 'creative-intelligence:get-anchor-production', [ciRunId]);
  const directAnchor = direct?.result?.anchorProduction;
  console.log(`DIRECT_RPC anchorProduction.candidates.length=${directAnchor?.candidates?.length} run.status=${directAnchor?.run?.status}`);

  // Vite proxy RPC
  const proxy = await rpc(rendererUrl, 'creative-intelligence:get-anchor-production', [ciRunId]);
  const proxyAnchor = proxy?.result?.anchorProduction;
  console.log(`VITE_PROXY anchorProduction.candidates.length=${proxyAnchor?.candidates?.length} run.status=${proxyAnchor?.run?.status}`);

  // Drive-style polling (uses anchor.run.status and anchor.candidates -- the bug)
  const start = Date.now();
  let polls = 0;
  let drivePass = false;
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    polls += 1;
    const w = await rpc(rendererUrl, 'creative-intelligence:get-anchor-production', [ciRunId]);
    const anchor = w?.result;
    // CI-W1C drive script E11 polling bug: checks top-level run/candidates
    if (anchor?.run?.status === 'completed' && (anchor?.candidates?.length || 0) === 3) {
      console.log(`DRIVE_POLLING_PASSED poll=${polls} elapsedMs=${Date.now() - start}`);
      drivePass = true;
      break;
    }
    await sleep(1500);
  }
  if (!drivePass) {
    console.log(`DRIVE_POLLING_TIMEOUT polls=${polls} elapsedMs=${Date.now() - start} (BUG REPRODUCED)`);
  }
  // Fixed polling (uses anchorProduction.run.status and anchorProduction.candidates)
  let fixedPass = false;
  const fStart = Date.now();
  const fDeadline = Date.now() + 10_000;
  while (Date.now() < fDeadline) {
    const w = await rpc(rendererUrl, 'creative-intelligence:get-anchor-production', [ciRunId]);
    const ap = w?.result?.anchorProduction;
    if (ap?.run?.status === 'completed' && (ap?.candidates?.length || 0) === 3) {
      console.log(`FIXED_POLLING_PASSED elapsedMs=${Date.now() - fStart}`);
      fixedPass = true;
      break;
    }
    await sleep(500);
  }
  if (!fixedPass) {
    console.log(`FIXED_POLLING_FAILED (unexpected)`);
  }
} catch (err) {
  console.error('PROBE_FAILED', err.message);
} finally {
  cleanup();
  await sleep(500);
  process.exit(0);
}
