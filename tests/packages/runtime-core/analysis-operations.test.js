import assert from 'node:assert/strict';
import test from 'node:test';

import { createAnalysisOperations, createOperationRegistry } from '@masterpiece/runtime-core';

test('Analysis operations preserve start and cancellation argument order without Electron', async () => {
  const calls = [];
  const pipeline = {
    start: async (...args) => { calls.push(['start', ...args]); return { ok: true }; },
    cancel: (projectId) => { calls.push(['cancel', projectId]); return false; },
  };
  const registry = createOperationRegistry();
  registry.registerAll(createAnalysisOperations({ pipeline }));

  assert.deepEqual(
    await registry.execute('analysis:start', ['project-1', true, 'profile-1']),
    { ok: true },
  );
  assert.equal(await registry.execute('analysis:cancel', ['project-1']), false);
  assert.deepEqual(calls, [
    ['start', 'project-1', true, 'profile-1'],
    ['cancel', 'project-1'],
  ]);
});
