import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStyleProfileService } from '../src/main/style-profile-service.ts';

test('Style Profile service versions profiles, updates active pointer and Session references', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'style-profile-service-'));
  const projectId = 'project-1';
  const projectRoot = path.join(root, 'project');
  const transitions: string[] = [];
  const entities: string[] = [];
  let workflowState = 'CREATIVE_DECISION_COMPLETED';
  const projects = { paths: async () => ({ root: projectRoot }) };
  const sessions = {
    setActiveEntity: async (_projectId: string, _type: string, entity: { id: string }) => { entities.push(entity.id); },
    create: async () => ({ workflowState }),
    transition: async (_projectId: string, state: string) => {
      transitions.push(state);
      workflowState = state;
    },
  };
  const decision = {
    projectId,
    runId: 'run-1',
    newDirection: { visualAnchor: '统一方向', sceneMechanism: '单一焦点', compositionStrategy: ['主次清晰'] },
    preserve: { identity: ['Logo'] },
    mustChange: {},
    prohibitedCarryover: [],
  };
  try {
    const service = createStyleProfileService(projects as never, sessions as never);
    const v1 = await service.compile(projectId, decision);
    const v2 = await service.compile(projectId, decision);
    assert.equal(v1.version, '1.0.0');
    assert.equal(v2.version, '1.1.0');
    assert.equal((await service.getActive(projectId))?.id, v2.id);
    assert.equal((await service.list(projectId)).length, 2);
    const old = (await service.list(projectId)).find((item) => item.id === v1.id);
    assert.equal(old?.status, 'superseded');
    assert.deepEqual(transitions, ['STYLE_PROFILE_CREATED']);
    assert.deepEqual(entities, [v1.id, v2.id]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
