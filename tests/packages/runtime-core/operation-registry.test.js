import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OPERATION_REGISTRY_ID,
  SHARED_RUNTIME_ID,
  createOperationRegistry,
  createSharedRuntime,
} from '@masterpiece/runtime-core';

test('Shared Operation Registry dispatches existing channel semantics without a host', async () => {
  const registry = createOperationRegistry();
  registry.register('projects:get', (_context, projectId) => ({ id: projectId }));

  assert.equal(registry.id, OPERATION_REGISTRY_ID);
  assert.deepEqual(await registry.execute('projects:get', ['project-1']), { id: 'project-1' });
  assert.deepEqual(registry.list(), ['projects:get']);
});

test('Shared Operation Registry rejects duplicate, invalid and unknown operations', async () => {
  const registry = createOperationRegistry();
  registry.register('analysis:cancel', () => false);

  assert.throws(() => registry.register('analysis:cancel', () => true), /RUNTIME_OPERATION_DUPLICATE/u);
  assert.throws(() => registry.register('invalid', () => true), /RUNTIME_OPERATION_ID_INVALID/u);
  await assert.rejects(registry.execute('analysis:start', []), /RUNTIME_OPERATION_NOT_FOUND/u);
});

test('Shared Runtime boots, dispatches and disposes with Electron absent', async () => {
  const events = [];
  const runtime = createSharedRuntime({
    onStart: () => events.push('start'),
    onDispose: () => events.push('dispose'),
  });
  runtime.registerOperations({
    'analysis:cancel': () => false,
    'image-generation:vnext-options': () => ({ ready: true }),
  });

  assert.equal(runtime.id, SHARED_RUNTIME_ID);
  await runtime.start();
  assert.equal(runtime.state, 'started');
  assert.equal(await runtime.registry.execute('analysis:cancel'), false);
  await runtime.dispose();
  assert.equal(runtime.state, 'disposed');
  assert.deepEqual(events, ['start', 'dispose']);
  assert.equal(runtime.registry.size, 0);
});

