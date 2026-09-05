import assert from 'node:assert/strict';
import test from 'node:test';
import { createVisualMigrationProductOperations } from '@masterpiece/runtime-core';

test('PI-1 browser operations delegate only to the Product Service', async () => {
  const calls: string[] = [];
  const state = { schemaVersion: 'visual-migration-product/v1', projectId: 'project-1', status: 'task_ready', updatedAt: '2026-09-03T00:00:00.000Z' };
  const service = Object.fromEntries([
    'getState', 'prepareReference', 'prepareTask', 'startGeneration', 'auditGeneration', 'executeCorrection',
  ].map((name) => [name, async () => { calls.push(name); return state; }]));
  const operations = createVisualMigrationProductOperations({ service: service as never });
  const expected = [
    ['visual-migration-product:get-state', 'getState'],
    ['visual-migration-product:prepare-reference', 'prepareReference'],
    ['visual-migration-product:prepare-task', 'prepareTask'],
    ['visual-migration-product:start-generation', 'startGeneration'],
    ['visual-migration-product:audit-generation', 'auditGeneration'],
    ['visual-migration-product:execute-correction', 'executeCorrection'],
  ] as const;
  assert.deepEqual(Object.keys(operations), expected.map(([channel]) => channel));
  for (const [channel, method] of expected) {
    assert.deepEqual(await operations[channel](null, {} as never), state);
    assert.equal(calls.at(-1), method);
  }

  const lastCall = calls.at(-1);
  assert.throws(
    () => operations['visual-migration-product:start-generation'](null, { projectId: 'project-1', apiKey: 'must-not-cross-rpc' } as never),
    (error: unknown) => (error as { code?: string }).code === 'VISUAL_MIGRATION_PRODUCT_FORBIDDEN_INPUT',
  );
  assert.equal(calls.at(-1), lastCall);
});
