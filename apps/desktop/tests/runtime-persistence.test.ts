import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { atomicWriteJsonWithRetry } from '../src/main/runtime/atomic-write.ts';
import { RunWriteCoordinator } from '../src/main/runtime/run-write-coordinator.ts';
import { transitionRuntimeStatus } from '../src/main/runtime/runtime-status.ts';
import { findRecoverableRunProjection } from '../src/main/runtime/recovery-service.ts';

test('atomic JSON write retries transient Windows rename failures and keeps one complete payload', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'atomic-write-'));
  const target = path.join(temporary, 'run.json');
  const delays: number[] = [];
  let renames = 0;
  try {
    const result = await atomicWriteJsonWithRetry(target, { revision: 7 }, {
      maxAttempts: 5,
      baseDelayMs: 10,
      rename: (async (source: string, destination: string) => {
        renames += 1;
        if (renames < 3) throw Object.assign(new Error('busy'), { code: 'EPERM' });
        await fs.rename(source, destination);
      }) as typeof fs.rename,
      wait: async (milliseconds) => { delays.push(milliseconds); }
    });
    assert.equal(result.success, true);
    assert.equal(result.attempts, 3);
    assert.deepEqual(delays, [10, 20]);
    assert.deepEqual(JSON.parse(await fs.readFile(target, 'utf8')), { revision: 7 });
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('atomic JSON write retains a recovery temp after bounded retry exhaustion', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'atomic-write-failed-'));
  const target = path.join(temporary, 'run.json');
  try {
    const result = await atomicWriteJsonWithRetry(target, { id: 'recoverable' }, {
      maxAttempts: 2,
      baseDelayMs: 1,
      rename: (async () => { throw Object.assign(new Error('locked'), { code: 'EBUSY' }); }) as typeof fs.rename,
      wait: async () => undefined
    });
    assert.equal(result.success, false);
    assert.equal(result.attempts, 2);
    assert.equal(result.errorCode, 'EBUSY');
    assert.ok(result.tempPath);
    assert.deepEqual(JSON.parse(await fs.readFile(result.tempPath!, 'utf8')), { id: 'recoverable' });
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('per-run coordinator serializes one run while allowing the queue to continue after failure', async () => {
  const coordinator = new RunWriteCoordinator();
  const order: string[] = [];
  const first = coordinator.enqueue('run-a', 'first', async () => {
    order.push('first:start');
    await new Promise((resolve) => setTimeout(resolve, 5));
    order.push('first:end');
    throw new Error('expected');
  });
  const second = coordinator.enqueue('run-a', 'second', async () => { order.push('second'); });
  await assert.rejects(first, /expected/u);
  await second;
  assert.deepEqual(order, ['first:start', 'first:end', 'second']);
});

test('runtime status cannot regress after the Step 4 result is committed', () => {
  const protectedStatus = transitionRuntimeStatus(
    { analysisStatus: 'result_committed', persistenceStatus: 'healthy', recoverable: false },
    { analysisStatus: 'failed_before_completion', persistenceStatus: 'projection_sync_failed' }
  );
  assert.equal(protectedStatus.analysisStatus, 'result_committed');
  assert.equal(protectedStatus.persistenceStatus, 'projection_sync_failed');
  assert.equal(protectedStatus.recoverable, true);
});

test('recovery rebuilds a deleted projection from the durable run report and quarantines invalid temp files', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'run-recovery-'));
  const runId = '00000000-0000-4000-8000-000000000001';
  const runRoot = path.join(temporary, runId);
  const runtimeRoot = path.join(runRoot, 'runtime');
  await fs.mkdir(runtimeRoot, { recursive: true });
  const completed = {
    id: runId,
    analysisRunId: 'analysis',
    projectName: '恢复测试',
    status: 'completed' as const,
    analysisStatus: 'completed' as const,
    persistenceStatus: 'healthy' as const,
    recoverable: false,
    revision: 9,
    apiProfileId: 'profile',
    provider: 'mock',
    model: 'mock',
    documentCount: 1,
    documentNames: ['策略.md'],
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    reportFilename: 'report.md'
  };
  await fs.writeFile(path.join(runtimeRoot, 'run-report.json'), JSON.stringify({ run: completed }), 'utf8');
  await fs.writeFile(path.join(runtimeRoot, 'run.json.invalid.tmp'), '{not-json', 'utf8');
  try {
    const recovery = await findRecoverableRunProjection(runRoot, runId);
    assert.equal(recovery.recovered, true);
    assert.equal(recovery.record?.analysisStatus, 'completed');
    assert.equal(recovery.record?.revision, 10);
    assert.equal(recovery.quarantined.length, 1);
    await fs.access(path.join(runtimeRoot, 'recovery', 'quarantine', 'run.json.invalid.tmp'));
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('Desktop entry enforces a single Electron instance', async () => {
  const source = await fs.readFile(new URL('../src/main/index.ts', import.meta.url), 'utf8');
  assert.match(source, /app\.requestSingleInstanceLock\(\)/u);
  assert.match(source, /SECOND_INSTANCE_BLOCKED/u);
  assert.match(source, /mainWindow\.focus\(\)/u);
});

