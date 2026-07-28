import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createVisualCanonService } from '../src/main/visual-canon-service.ts';

test('Visual Canon service versions, confirms and updates active Session reference', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'visual-canon-service-'));
  const projectId = 'project-1';
  const transitions: string[] = [];
  const entities: string[] = [];
  const projects = { paths: async () => ({ root: path.join(temp, 'project') }) };
  const sessions = {
    transition: async (_projectId: string, state: string) => { transitions.push(state); },
    setActiveEntity: async (_projectId: string, _type: string, entity: { id: string }) => { entities.push(entity.id); },
  };
  const styles = { getActive: async () => ({
    id: 'style-1',
    name: 'Style',
    version: '1.0.0',
    status: 'confirmed',
    colorSystem: { forbiddenColors: [] },
    materialAndTexture: { forbiddenTextures: [] },
    forbiddenVariations: [],
    promptComponents: { required: ['统一气质'] },
    allowedVariations: [],
  }) };
  const locks = { list: async () => [{ id: 'lock-1', priority: 'critical' }] };
  const anchors = { get: async (_projectId: string, id: string) => ({
    id,
    status: 'accepted',
    imagePath: `anchors/candidates/${id}/image.webp`,
    lockedAssetIds: ['lock-1'],
  }) };
  try {
    const service = createVisualCanonService(
      projects as never,
      sessions as never,
      styles as never,
      locks as never,
      anchors as never,
    );
    const draft = await service.build(projectId, { primaryCandidateId: 'anchor-1' });
    const confirmed = await service.confirm(projectId, draft.id);
    assert.equal(confirmed.status, 'confirmed');
    assert.equal((await service.getActive(projectId))?.id, confirmed.id);
    assert.deepEqual(transitions, ['CANON_BUILDING', 'VISUAL_CANON_CONFIRMED']);
    assert.deepEqual(entities, [confirmed.id]);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
