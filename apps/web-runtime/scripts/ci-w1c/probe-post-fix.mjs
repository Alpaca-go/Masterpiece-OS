// CI-W1C.3 PART L / M / N — post-fix probe.
// Starts a fresh Node Web Host + Vite pair, then runs:
//   1) HTTP freshness ≤5s for the existing ciRun (PART L)
//   2) Workspace RPC verification (PART M)
//   3) Actual Node Host restart (PART N): kill the host, restart
//      on a new port, re-prove the same disk state is visible.
//
// The existing ciRun 2ce18dca on disk has 3 candidates +
// run.status=completed + approvedAnchor=null. This probe verifies
// the production path (Vite + Web Host + RPC) sees that exact
// state without writing anything new.

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..', '..');
const tsx = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const viteCli = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const viteCfg = path.join(repoRoot, 'apps', 'web', 'vite.config.mjs');
const userDataDir = process.env.MASTERPIECE_CI_W1C3_USER_DATA_DIR;
if (!userDataDir) throw new Error('MASTERPIECE_CI_W1C3_USER_DATA_DIR is required');
const rpcPort = Number(process.env.MASTERPIECE_CI_W1C3_RPC_PORT || 5339);
const rendererPort = Number(process.env.MASTERPIECE_CI_W1C3_RENDERER_PORT || 5340);
const ciRunId = process.env.MASTERPIECE_CI_W1C3_CIRUNID || '2ce18dca-4eba-4670-892f-05261df0146b';
const rpcUrl = `http://127.0.0.1:${rpcPort}`;
const rendererUrl = `http://127.0.0.1:${rendererPort}`;

const env = {
  ...process.env,
  MASTERPIECE_USER_DATA_DIR: userDataDir,
  MASTERPIECE_WEB_RPC_PORT: String(rpcPort),
  MASTERPIECE_WEB_RPC_URL: rpcUrl,
  MASTERPIECE_WEB_ALLOWED_ORIGIN: rendererUrl,
  MASTERPIECE_WEB_OPEN_PATH: '0',
};

const evidence = { ciRunId, startedAt: new Date().toISOString(), phases: {} };

async function rpc(baseUrl, channel, args) {
  const r = await fetch(`${baseUrl}/_masterpiece/rpc/${encodeURIComponent(channel)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ args }),
  });
  return await r.json();
}

async function startPair() {
  const hostProc = spawn(process.execPath, [tsx, path.join(repoRoot, 'apps', 'web-runtime', 'src', 'main.ts')], { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
  hostProc.stdout.on('data', (c) => process.stdout.write(`[host] ${c}`));
  hostProc.stderr.on('data', (c) => process.stderr.write(`[host] ${c}`));
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('host not ready 30s')), 30_000);
    hostProc.stdout.on('data', (chunk) => {
      if (chunk.toString('utf8').includes('NODE_WEB_HOST_READY')) {
        clearTimeout(t);
        resolve();
      }
    });
  });
  const viteProc = spawn(process.execPath, [viteCli, '--config', viteCfg, '--port', String(rendererPort)], { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
  viteProc.stdout.on('data', (c) => process.stdout.write(`[vite] ${c}`));
  viteProc.stderr.on('data', (c) => process.stderr.write(`[vite] ${c}`));
  await sleep(4000);
  return { hostProc, viteProc };
}

async function killPair(procs) {
  try { procs.hostProc.kill('SIGKILL'); } catch {}
  try { procs.viteProc.kill('SIGKILL'); } catch {}
  await sleep(800);
}

let failure = null;
let firstPair = null;
try {
  firstPair = await startPair();

  // PART L — direct + Vite proxy both return 3 candidates + completed
  const t0 = Date.now();
  const direct = await rpc(rpcUrl, 'creative-intelligence:get-anchor-production', [ciRunId]);
  const directElapsed = Date.now() - t0;
  const directAnchor = direct.result?.anchorProduction;
  evidence.phases.l1_direct = {
    elapsedMs: directElapsed,
    candidatesLength: directAnchor?.candidates?.length,
    runStatus: directAnchor?.run?.status,
    candidateIds: directAnchor?.run?.candidateIds,
  };
  console.log(`L1_DIRECT elapsedMs=${directElapsed} candidates=${directAnchor?.candidates?.length} status=${directAnchor?.run?.status}`);

  const t1 = Date.now();
  const proxy = await rpc(rendererUrl, 'creative-intelligence:get-anchor-production', [ciRunId]);
  const proxyElapsed = Date.now() - t1;
  const proxyAnchor = proxy.result?.anchorProduction;
  evidence.phases.l2_viteProxy = {
    elapsedMs: proxyElapsed,
    candidatesLength: proxyAnchor?.candidates?.length,
    runStatus: proxyAnchor?.run?.status,
  };
  console.log(`L2_VITE_PROXY elapsedMs=${proxyElapsed} candidates=${proxyAnchor?.candidates?.length} status=${proxyAnchor?.run?.status}`);
  if (proxyAnchor?.candidates?.length !== 3) failure = 'L2_VITE_PROXY: expected 3 candidates';

  // Drive-style polling (uses .anchorProduction now — fixed)
  const pollStart = Date.now();
  let pollPass = false;
  const pollDeadline = Date.now() + 5000;
  let polls = 0;
  while (Date.now() < pollDeadline) {
    polls += 1;
    const w = await rpc(rendererUrl, 'creative-intelligence:get-anchor-production', [ciRunId]);
    const anchorProd = w.result?.anchorProduction;
    if (anchorProd?.run?.status === 'completed' && (anchorProd?.candidates?.length || 0) === 3) {
      pollPass = true;
      break;
    }
    await sleep(200);
  }
  evidence.phases.l3_drivePollingFixed = {
    polls,
    elapsedMs: Date.now() - pollStart,
    pass: pollPass,
  };
  console.log(`L3_DRIVE_POLLING_FIXED polls=${polls} elapsedMs=${Date.now() - pollStart} pass=${pollPass}`);
  if (!pollPass) failure = 'L3_DRIVE_POLLING_FIXED: did not converge in 5s';

  // PART M — workspace RPC for approval flow
  const workspace = await rpc(rendererUrl, 'creative-intelligence:get-workspace', [ciRunId]);
  const ws = workspace.result;
  evidence.phases.m1_workspace = {
    anchorProductionPresent: Boolean(ws?.anchorProduction),
    candidatesLength: ws?.anchorProduction?.candidates?.length,
    approvedAnchor: ws?.anchorProduction?.approvedAnchor,
  };
  console.log(`M1_WORKSPACE anchorProduction.candidates.length=${ws?.anchorProduction?.candidates?.length} approvedAnchor=${ws?.anchorProduction?.approvedAnchor ? 'set' : 'null'}`);

  // Capture the first host's PID for the N1 freshness identity
  const firstHealth = await fetch(`${rpcUrl}/_masterpiece/health`).then((r) => r.json());
  const firstPid = firstHealth?.pid;
  evidence.phases.firstPid = firstPid;
  console.log(`FIRST_HOST_PID=${firstPid}`);

  await killPair(firstPair);
  firstPair = null;

  // PART N — actual Node Host restart (new port to force a fresh process)
  const second = await startPair();
  const secondHealth = await fetch(`${rpcUrl}/_masterpiece/health`).then((r) => r.json());
  const secondPid = secondHealth?.pid;
  evidence.phases.secondPid = secondPid;
  console.log(`SECOND_HOST_PID=${secondPid}`);
  if (firstPid && secondPid && firstPid === secondPid) {
    failure = 'N1_RESTART: pid unchanged (host not actually restarted)';
  }

  const t2 = Date.now();
  const after = await rpc(rendererUrl, 'creative-intelligence:get-anchor-production', [ciRunId]);
  const afterElapsed = Date.now() - t2;
  const afterAnchor = after.result?.anchorProduction;
  evidence.phases.n2_postRestartRpc = {
    elapsedMs: afterElapsed,
    candidatesLength: afterAnchor?.candidates?.length,
    runStatus: afterAnchor?.run?.status,
  };
  console.log(`N2_POST_RESTART_RPC elapsedMs=${afterElapsed} candidates=${afterAnchor?.candidates?.length} status=${afterAnchor?.run?.status}`);
  if (afterAnchor?.candidates?.length !== 3) failure = 'N2_POST_RESTART: candidates not visible after host restart';
  if (afterAnchor?.run?.status !== 'completed') failure = 'N2_POST_RESTART: status not completed after host restart';

  await killPair(second);
} catch (err) {
  failure = `EXCEPTION: ${err.message}`;
  console.error('PROBE_FAILED', err.message);
} finally {
  if (firstPair) await killPair(firstPair);
  evidence.completedAt = new Date().toISOString();
  evidence.verdict = failure ? 'FAIL' : 'PASS';
  evidence.failure = failure;
  const out = path.join(repoRoot, '.codex-smoke', 'ci-w1c', 'ci-w1c3-post-fix.json');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(`VERDICT ${evidence.verdict} ${failure || ''}`);
  console.log(`WROTE ${out}`);
  process.exit(failure ? 1 : 0);
}
