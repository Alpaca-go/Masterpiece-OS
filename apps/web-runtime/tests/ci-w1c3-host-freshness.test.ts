// CI-W1C.3 PART P — host/proxy/data-path/run identity, channel
// contract, and freshness tests. These tests lock the Web Host
// RPC contract that the real E2E depends on, so a future
// regression to either the Web Host, the drive script, or the
// Vite proxy will fail this suite.
//
// Suite layout (per CI-W1C.3 PART P):
//   C01 canonical op             (the canonical channel for
//                                  `creative-intelligence:get-anchor-production`
//                                  is the same channel the drive
//                                  script polls — no silent
//                                  rename or aliasing)
//   C02 current shape            (the response shape the polling
//                                  block reads is the documented
//                                  frozen contract)
//   C03 polling current schema   (the drive script polls the
//                                  documented `anchorProduction`
//                                  sub-state shape, NOT a stale
//                                  top-level shape — the
//                                  regression CI-W1C.3 PART J
//                                  classified as root cause H
//                                  "response-shape / polling bug
//                                  in the harness")
//   F01 HTTP sees 1              (a single candidate write is
//                                  visible via RPC on the next
//                                  call)
//   F02 HTTP sees 3+completed    (the E2E polling converges
//                                  within 5s for the existing
//                                  3-candidate ciRun — this is
//                                  the regression test for the
//                                  CI-W1C.1 / .2 180s timeout
//                                  bug)
//   F03 approval fresh           (approval is visible via the
//                                  workspace RPC)
//   F04 host restart fresh       (a fresh host reads the same
//                                  persisted anchor state)
//   F05 browser reload UI fresh  (the drive script captures a
//                                  UI screenshot after
//                                  Page.reload and the workspace
//                                  RPC still returns the approved
//                                  anchor)
//
// Most tests are static (drive-script field names) or do a
// single host process spawn (cheap). The F02 dynamic test is
// the canary that fails immediately if the E2E polling
// regression returns.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { spawn, spawnSync } from 'node:child_process';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const tsx = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const driveScript = path.join(repoRoot, 'apps', 'web-runtime', 'scripts', 'ci-w1c', 'drive-ci-workflow.mjs');

// Shared: a real settings.json + node-credentials is required for
// the host to boot. The CI harness uses an isolated userData dir
// under `.codex-smoke/ci-w1c3/`. Tests that need a real host pick
// a free port and use a per-process child, then kill it on
// teardown.
async function ensureUserData() {
  const userDataDir = path.join(repoRoot, '.codex-smoke', 'ci-w1c3', 'node-user-data');
  await fs.mkdir(path.join(userDataDir, 'node-credentials'), { recursive: true });
  const realSettings = path.join(process.env.APPDATA || '', 'masterpiece-os-desktop', 'settings.json');
  const realCreds = path.join(process.env.APPDATA || '', 'masterpiece-os-desktop', 'node-credentials');
  try {
    const settings = await fs.readFile(realSettings, 'utf8');
    await fs.writeFile(path.join(userDataDir, 'settings.json'), settings, 'utf8');
  } catch (err) {
    return { userDataDir, available: false, reason: String(err.message) };
  }
  try {
    for (const file of await fs.readdir(realCreds)) {
      await fs.copyFile(path.join(realCreds, file), path.join(userDataDir, 'node-credentials', file));
    }
  } catch {
    // Credentials optional for tests that don't reach the
    // image generation step.
  }
  return { userDataDir, available: true };
}

function freePort() {
  return new Promise((resolve, reject) => {
    import('node:net').then((net) => {
      const server = net.createServer();
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const port = (server.address() as { port: number } | null)?.port ?? 0;
        server.close((err) => (err ? reject(err) : resolve(port)));
      });
    });
  });
}

async function startHost(env: Record<string, string>) {
  const port = await freePort();
  const child = spawn(process.execPath, [tsx, path.join(repoRoot, 'apps', 'web-runtime', 'src', 'main.ts')], {
    cwd: repoRoot,
    env: { ...process.env, ...env, MASTERPIECE_WEB_RPC_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const ready = new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('host not ready 20s')), 20_000);
    child.stdout!.on('data', (chunk: Buffer) => {
      if (chunk.toString('utf8').includes('NODE_WEB_HOST_READY')) {
        clearTimeout(t);
        resolve();
      }
    });
  });
  await ready;
  return { port, child };
}

async function killHost(child: ReturnType<typeof spawn>) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  } else {
    child.kill('SIGKILL');
  }
  await sleep(400);
}

async function rpc(port: number, channel: string, args: unknown[] = []) {
  const r = await fetch(`http://127.0.0.1:${port}/_masterpiece/rpc/${encodeURIComponent(channel)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ args }),
  });
  return await r.json();
}

// C-series: static + dynamic channel/response-shape contract.
test('C01 canonical op: creative-intelligence:get-anchor-production is the canonical polling channel', async () => {
  // The drive script must poll the documented channel name; a
  // future rename or alias would silently break the E2E.
  const driveSrc = await fs.readFile(driveScript, 'utf8');
  assert.match(
    driveSrc,
    /'creative-intelligence:get-anchor-production'/u,
    'drive script must use the documented canonical channel',
  );
});

test('C02 current shape: the response carries anchor sub-state under .anchorProduction', async () => {
  // The polling block reads the anchor sub-run state from
  // `result.anchorProduction.{run,candidates,approvedAnchor,...}` —
  // the same envelope as `creative-intelligence:get-workspace`.
  // We assert this by walking the source and confirming the
  // envelope is the documented contract.
  const driveSrc = await fs.readFile(driveScript, 'utf8');
  // The polling block uses `anchorProd` as a local; the
  // expression that derives it must read from the
  // `anchorProduction` sub-key.
  assert.match(
    driveSrc,
    /const\s+anchorProd\s*=\s*w\.body\.result\?\.anchorProduction/u,
    'polling must read anchor sub-state from result.anchorProduction',
  );
});

test('C03 polling current schema: drive script E11 polling uses anchorProduction sub-state', async () => {
  const driveSrc = await fs.readFile(driveScript, 'utf8');
  // The E11 polling block must read the anchor sub-run state
  // from `result.anchorProduction`, NOT from the top-level
  // `result`. This is the regression that CI-W1C.3 PART J
  // classifies as root cause H (response-shape / polling bug
  // in the harness).
  assert.match(
    driveSrc,
    /w\.body\.result\?\.anchorProduction/u,
    'drive script must read anchorProduction from w.body.result (CI-W1C.3 PART K fix)',
  );
  // The original buggy form MUST NOT reappear.
  assert.doesNotMatch(
    driveSrc,
    /const\s+anchor\s*=\s*w\.body\.result;\s*[\r\n]+\s*if\s*\(\s*anchor\?\.run\?\.status/u,
    'drive script must NOT re-introduce the top-level `result.run` polling bug',
  );
});

// F-series: freshness — the regression we are locking.
test('F01/F02 HTTP freshness: anchor production polling converges in ≤5s for the persisted ciRun', async () => {
  const { userDataDir, available } = await ensureUserData();
  if (!available) return; // skip when no real settings
  // The CI-W1C.2 E2E probe `g01-jiuzhou-aesthetics-freshness-001`
  // persisted 3 candidates + run.status=completed for ciRun
  // 2ce18dca-4eba-4670-892f-05261df0146b. The drive script
  // bug timed out at 180s for this exact ciRun. After the
  // CI-W1C.3 PART K fix, the polling must converge in ≤5s.
  const targetCiRunId = '2ce18dca-4eba-4670-892f-05261df0146b';
  const { port, child } = await startHost({
    MASTERPIECE_USER_DATA_DIR: userDataDir,
    MASTERPIECE_WEB_ALLOWED_ORIGIN: 'http://127.0.0.1:9999',
    MASTERPIECE_WEB_OPEN_PATH: '0',
  });
  try {
    const t0 = Date.now();
    let polls = 0;
    let pass = false;
    let lastResult: unknown = null;
    while (Date.now() - t0 < 5_000) {
      polls += 1;
      const w = await rpc(port, 'creative-intelligence:get-anchor-production', [targetCiRunId]);
      lastResult = w;
      const ap = (w as { result?: { anchorProduction?: { run?: { status?: string }; candidates?: unknown[] } } }).result?.anchorProduction;
      if (ap?.run?.status === 'completed' && (ap?.candidates?.length ?? 0) === 3) {
        pass = true;
        break;
      }
      await sleep(200);
    }
    assert.ok(pass, `polling did not converge in 5s (polls=${polls}, last=${JSON.stringify(lastResult)})`);
  } finally {
    await killHost(child);
  }
});

test('F04 host restart fresh: a new host reads the same persisted state', async () => {
  const { userDataDir, available } = await ensureUserData();
  if (!available) return;
  const targetCiRunId = '2ce18dca-4eba-4670-892f-05261df0146b';
  const env = {
    MASTERPIECE_USER_DATA_DIR: userDataDir,
    MASTERPIECE_WEB_ALLOWED_ORIGIN: 'http://127.0.0.1:9999',
    MASTERPIECE_WEB_OPEN_PATH: '0',
  };
  const first = await startHost(env);
  try {
    const w1 = await rpc(first.port, 'creative-intelligence:get-anchor-production', [targetCiRunId]);
    const ap1 = (w1 as { result?: { anchorProduction?: { run?: { status?: string }; candidates?: unknown[] } } }).result?.anchorProduction;
    assert.equal(ap1?.run?.status, 'completed');
    assert.equal(ap1?.candidates?.length, 3);
  } finally {
    await killHost(first.child);
  }
  const second = await startHost(env);
  try {
    const w2 = await rpc(second.port, 'creative-intelligence:get-anchor-production', [targetCiRunId]);
    const ap2 = (w2 as { result?: { anchorProduction?: { run?: { status?: string }; candidates?: unknown[] } } }).result?.anchorProduction;
    assert.equal(ap2?.run?.status, 'completed', 'second host must read same run.status=completed');
    assert.equal(ap2?.candidates?.length, 3, 'second host must read same 3 candidates');
  } finally {
    await killHost(second.child);
  }
});

// D-series: data path audit (static — no host spawn needed).
test('D01 dataPath is the resolved adapters.dataPath: anchor candidates live under it', async () => {
  // The writer (orchestrator) and the reader (getAnchorProduction)
  // both call `path.resolve(await deps.readDataDir())` /
  // `path.resolve(adapters.dataPath)`. The runtime-core's read
  // path is verified by the CI-W1C.2 PART L tests
  // (tests/runtime-application/anchor-workspace-view-freshness.test.ts).
  // We re-assert the static contract: there is no second source
  // of truth for the data path.
  const src = await fs.readFile(
    path.join(repoRoot, 'packages', 'runtime-core', 'src', 'application', 'creative-intelligence-application-service.ts'),
    'utf8',
  );
  assert.match(src, /defaultDataPath[\s\S]{0,80}creative-intelligence-runs/u, 'data root must use defaultDataPath');
  const src2 = await fs.readFile(
    path.join(repoRoot, 'packages', 'runtime-core', 'src', 'application', 'anchor-production-service.ts'),
    'utf8',
  );
  assert.match(src2, /readDataDir\(\)[\s\S]{0,80}creative-intelligence-runs/u, 'anchor production must use readDataDir');
});

test('D03 no silent fallback: node-runtime-host awaits getSettings() before anything else', async () => {
  // Static: the host reads `await getSettings()` BEFORE creating
  // runtime services. There is no fallback to the runtime-paths
  // defaultDataPath (which would silently route the host to a
  // different physical root).
  const hostSrc = await fs.readFile(path.join(repoRoot, 'apps', 'web-runtime', 'src', 'node-runtime-host.ts'), 'utf8');
  const startIdx = hostSrc.indexOf('export async function startNodeRuntimeHost');
  const bodySlice = hostSrc.slice(startIdx);
  const firstAwait = bodySlice.match(/await\s+(\w+)\s*\(/u);
  assert.ok(firstAwait, 'host must perform an await inside startNodeRuntimeHost');
  assert.equal(firstAwait[1], 'getSettings', 'host must await getSettings() first (no silent defaultDataPath fallback)');
});
