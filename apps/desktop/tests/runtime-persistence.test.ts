import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { atomicWriteJsonWithRetry } from '../src/main/runtime/atomic-write.ts';
import { RunWriteCoordinator } from '../src/main/runtime/run-write-coordinator.ts';

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

test('Desktop entry enforces a single Electron instance', async () => {
  const source = await fs.readFile(new URL('../src/main/index.ts', import.meta.url), 'utf8');
  assert.match(source, /app\.requestSingleInstanceLock\(\)/u);
  assert.match(source, /SECOND_INSTANCE_BLOCKED/u);
  assert.match(source, /mainWindow\.focus\(\)/u);
});

