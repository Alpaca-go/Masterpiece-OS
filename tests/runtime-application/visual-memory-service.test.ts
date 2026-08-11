import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createVisualMemoryService } from '@masterpiece/runtime-core/application/visual-memory-service.ts';

test('Visual Memory service persists visual-memory.json from existing project sources', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-visual-memory-'));
  const outputs = path.join(root, 'outputs');
  await fs.mkdir(outputs, { recursive: true });
  await fs.writeFile(path.join(outputs, 'project-visual-context.json'), JSON.stringify({
    schemaVersion: '1.0',
    projectId: 'p1',
    sourceRunId: 'run-1',
    generatedAt: '2026-07-28T00:00:00.000Z',
    identity: { projectName: '测试', brandName: '测试', industry: '餐饮' },
    currentVisualSystem: {},
    evaluation: { visualProblems: ['碎片化'] },
  }));
  const project = {
    id: 'p1',
    assets: [{ id: 'a1', relativePath: 'a1.png', mimeType: 'image/png', status: 'ready' }],
  };
  const projects = {
    paths: async () => ({ root, outputs }),
    get: async () => project,
  };
  const sessions = {
    create: async () => ({
      understanding: {
        generatedAt: '2026-07-28T00:01:00.000Z',
        projectIdentity: { industry: '餐饮' },
        currentProblems: [],
        upgradePrinciples: ['统一'],
        oldPatternsToAvoid: [],
        valuableAssets: [],
        assetReadingSummary: [{
          assetId: 'a1',
          summary: '产品结构',
          recommendedUsage: 'structure_reference',
        }],
      },
    }),
  };
  const directions = {
    getActive: async () => ({
      id: 'direction-1',
      version: '1.0.0',
      brandReposition: '现代餐饮',
      visualWorld: '克制',
      creativeConcept: '真实温度',
      primaryConcept: '真实温度',
      visualKeywords: ['克制'],
      colorStrategy: '暖色',
      materialStrategy: '纸张',
      compositionStrategy: '留白',
      photographyStrategy: '真实',
      visualMechanism: '轨迹',
      designStrategy: '统一',
      oldVisualProblems: [],
      keepAssets: [],
      thingsToKeep: [],
      transformAssets: [],
      removeAssets: [],
      thingsToRemove: [],
      generationRules: [],
    }),
  };
  const locks = { list: async () => [] };
  const service = createVisualMemoryService(
    projects as never,
    sessions as never,
    directions as never,
    locks as never,
  );

  const memory = await service.compile('p1');
  assert.equal(memory.project_id, 'p1');
  assert.equal((await service.get('p1'))?.id, memory.id);
  assert.ok(await fs.stat(path.join(root, 'visual-memory', 'visual-memory.json')));
  assert.ok(await fs.stat(path.join(root, 'visual-memory', 'source-snapshot.json')));
});
