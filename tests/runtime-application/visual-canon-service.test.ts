import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createVisualCanonService } from '@masterpiece/runtime-core/application/visual-canon-service.ts';

test('Visual Canon service versions, confirms and updates active Session reference', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'visual-canon-service-'));
  const projectId = 'project-1';
  const transitions: string[] = [];
  const entities: string[] = [];
  const projects = { paths: async () => ({ root: path.join(temp, 'project') }) };
  const sessions = {
    create: async () => ({
      projectContext: { industry: '文化零售' },
      understanding: { projectIdentity: { industry: '东方生活美学' } },
    }),
    transition: async (_projectId: string, state: string) => { transitions.push(state); },
    setActiveEntity: async (_projectId: string, _type: string, entity: { id: string }) => { entities.push(entity.id); },
  };
  const style = {
    id: 'style-1',
    name: 'Style',
    version: '1.0.0',
    status: 'confirmed',
    colorSystem: { forbiddenColors: [] },
    materialAndTexture: { forbiddenTextures: [] },
    forbiddenVariations: [],
    promptComponents: { required: ['统一气质'] },
    allowedVariations: [],
  };
  const styles = {
    getActive: async () => style,
    list: async () => [style],
  };
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
    assert.deepEqual(confirmed.visualDNA.industryAttributes, ['东方生活美学', '文化零售']);
    assert.equal((await service.getActive(projectId))?.id, confirmed.id);
    assert.deepEqual(transitions, ['CANON_BUILDING', 'VISUAL_CANON_CONFIRMED']);
    assert.deepEqual(entities, [confirmed.id]);
    const explorationCanon = await service.buildFromExploration(projectId, {
      exploration: {
        schemaVersion: '1.0',
        id: 'exploration-1',
        projectId,
        creativeDirectionId: 'direction-1',
        creativeDirectionVersion: '1.0.0',
        styleProfileId: 'style-1',
        styleProfileVersion: '1.0.0',
        status: 'selected',
        conceptCount: 4,
        selectedConceptId: 'concept-1',
        selection: {
          conceptId: 'concept-1',
          rationale: '最适合建立可复用空间与材质系统。',
          selectedBy: 'designer',
          selectedAt: '2026-07-29T00:00:00.000Z',
        },
        concepts: Array.from({ length: 4 }, (_, index) => ({
          id: `concept-${index + 1}`,
          index: index + 1,
          type: index === 0 ? 'space' : 'graphic',
          title: `Concept ${index + 1}`,
          objective: index === 0 ? '建立空间结构与陈列关系' : '探索图形关系',
          outputType: index === 0 ? 'interior_scene' : 'brand_poster',
          aspectRatio: index === 0 ? '16:9' : '4:5',
          status: 'generated',
          selectionStatus: index === 0 ? 'selected' : 'not_selected',
          generationRunId: `run-${index + 1}`,
          imagePath: `image-generation/run-${index + 1}/images/concept.png`,
          createdAt: '2026-07-29T00:00:00.000Z',
          updatedAt: '2026-07-29T00:00:00.000Z',
        })),
        createdAt: '2026-07-29T00:00:00.000Z',
        updatedAt: '2026-07-29T00:00:00.000Z',
      } as never,
    });
    assert.equal(explorationCanon.version, '1.1.0');
    assert.equal(explorationCanon.sourceExplorationId, 'exploration-1');
    assert.equal(explorationCanon.canonImages[0]?.sourceKind, 'visual_concept');
    assert.ok(explorationCanon.spatialSystem.displayRules.length > 0);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
