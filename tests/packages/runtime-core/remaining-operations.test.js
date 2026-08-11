import assert from 'node:assert/strict';
import test from 'node:test';

import { createOperationRegistry, createReportOperations, createSettingsOperations } from '@masterpiece/runtime-core';

test('Settings adapters and report services are reached through Shared Registry', async () => {
  const calls = [];
  const registry = createOperationRegistry();
  registry.registerAll(createSettingsOperations({
    get: async () => ({ logLevel: 'info' }),
    save: async (input) => calls.push(['save', input]),
    saveProfile: async () => ({}),
    deleteProfile: async () => {},
    setDefaultProfile: async () => {},
    setProfileEnabled: async () => {},
    testProfile: async () => ({ ok: true }),
  }));
  registry.registerAll(createReportOperations({
    reports: {
      read: async (projectId) => `report:${projectId}`,
      rename: async (projectId, filename) => ({ projectId, filename }),
    },
  }));

  assert.deepEqual(await registry.execute('settings:get'), { logLevel: 'info' });
  await registry.execute('settings:save', [{ logLevel: 'debug' }]);
  assert.deepEqual(calls, [['save', { logLevel: 'debug' }]]);
  assert.equal(await registry.execute('report:read', ['p1']), 'report:p1');
});
