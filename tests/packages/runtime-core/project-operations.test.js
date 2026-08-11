import assert from 'node:assert/strict';
import test from 'node:test';

import { createOperationRegistry, createProjectOperations } from '@masterpiece/runtime-core';

test('Project operations dispatch through Shared Registry without Electron', async () => {
  const calls = [];
  const project = { id: 'project-1', status: 'ready' };
  const projects = {
    list: async () => [project],
    get: async () => project,
    create: async (input) => ({ ...project, ...input }),
    remove: async (id) => calls.push(['remove', id]),
    scan: async (id) => ({ id }),
    removeAsset: async () => ({}),
    removeBatch: async () => ({}),
    clearAssets: async () => ({}),
    importFiles: async () => ({}),
  };
  const pipeline = {
    reconcileOrphanedProject: async (value) => value,
    isActive: () => false,
  };
  const registry = createOperationRegistry();
  registry.registerAll(createProjectOperations({ projects, pipeline }));

  assert.deepEqual(await registry.execute('projects:list'), [project]);
  assert.deepEqual(await registry.execute('projects:get', ['project-1']), project);
  await registry.execute('projects:remove', ['project-1']);
  assert.deepEqual(calls, [['remove', 'project-1']]);
});

test('Project removal preserves the active analysis guard', async () => {
  const project = { id: 'project-1', status: 'running' };
  const operations = createProjectOperations({
    projects: { get: async () => project, remove: async () => assert.fail('must not remove') },
    pipeline: { reconcileOrphanedProject: async (value) => value, isActive: () => true },
  });

  await assert.rejects(operations['projects:remove']({}, 'project-1'), /正在分析的项目不能删除/u);
});
