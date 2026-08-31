import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCreativeResearchCuratedReferenceService } from '@masterpiece/runtime-core/application/creative-research-curated-reference-service.ts';
import { createCreativeResearchReferenceGuideService } from '@masterpiece/runtime-core/application/creative-research-reference-guide-service.ts';
import { createCreativeResearchReferenceGuideStore } from '@masterpiece/runtime-core/application/creative-research-reference-guide-store.ts';
import { createCreativeResearchResearchStore } from '@masterpiece/runtime-core/application/creative-research-research-store.ts';
import type { CreativeResearchSession, DesignBrief } from '@masterpiece/runtime-core/application/creative-research/contracts.ts';

const NOW = '2026-08-31T00:00:00.000Z';

function session(status: CreativeResearchSession['status'] = 'RESEARCH'): CreativeResearchSession {
  return { id: 'session-1', projectId: 'project-1', status, sourceDocumentIds: ['brief.md'], activeDesignBriefId: 'brief-1', createdAt: NOW, updatedAt: NOW };
}

function brief(): DesignBrief {
  return {
    id: 'brief-1', sessionId: 'session-1', revision: 1, projectSummary: '高端医疗品牌', designTask: '建立可信且克制的视觉体系',
    audience: '高净值用户', scenarios: ['品牌'], coreMessages: ['专业可信'], constraints: ['避免廉价科技感'],
    conceptKeywords: ['医学', '高端'], visualKeywords: ['留白'], searchKeywords: [], designerNotes: [], evidence: [], createdAt: NOW, updatedAt: NOW,
  };
}

test('curated references persist locally, deduplicate by hash, and remain selection-compatible', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-curated-reference-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'selected.png');
  await fs.writeFile(source, Buffer.from('89504e470d0a1a0a', 'hex'));
  const research = createCreativeResearchResearchStore({ readDefaultDataPath: () => root });
  const sessions = { get: async () => session(), create: async (value: CreativeResearchSession) => value, save: async (value: CreativeResearchSession) => value, listByProject: async () => [], delete: async () => true };
  const service = createCreativeResearchCuratedReferenceService({
    readDefaultDataPath: () => root, sessions, references: research.references, now: () => NOW, createId: () => 'ref-1',
  });
  const imported = await service.importCuratedReferences('session-1', [
    { path: source, originalFileName: '精选.png' }, { path: source, originalFileName: '重复.png' },
  ]);
  assert.equal(imported.length, 1);
  assert.equal(imported[0]?.sourceType, 'CURATED_REFERENCE');
  assert.match(imported[0]?.cachedImageUrl || '', /curated-references\/ref-1\/image/u);
  assert.equal((await service.listCuratedReferences('session-1')).length, 1);
  assert.equal((await research.references.getReference('session-1', 'ref-1'))?.sourceType, 'CURATED_REFERENCE');
  assert.equal(await fs.readFile(imported[0]!.localPath, 'hex'), '89504e470d0a1a0a');
});

test('Reference Guide is bound to the active Brief revision and creates no Search History', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-reference-guide-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const currentSession = session('INTAKE');
  const currentBrief = brief();
  const research = createCreativeResearchResearchStore({ readDefaultDataPath: () => root });
  const guides = createCreativeResearchReferenceGuideStore({ readDefaultDataPath: () => root });
  let id = 0;
  const service = createCreativeResearchReferenceGuideService({
    sessions: { get: async () => currentSession, create: async (value) => value, save: async (value) => value, listByProject: async () => [], delete: async () => true },
    briefs: { getActiveRevision: async () => currentBrief, saveRevision: async (value) => value, listRevisions: async () => [currentBrief] },
    plans: research.plans, guides, now: () => NOW, createId: () => `guide-id-${++id}`,
    createPlan: async () => ({ visualReferencePlan: { groups: [
      { id: 'industry', kind: 'INDUSTRY', title: '行业基准', keywords: ['医美', '医学'], rationale: '保持行业可信', priority: 1 },
      { id: 'positioning', kind: 'POSITIONING', title: '气质迁移', keywords: ['奢侈品', '美术馆'], rationale: '寻找成熟气质', priority: 2 },
      { id: 'cross', kind: 'CROSS_CATEGORY', title: '相邻品类', keywords: ['高端护肤'], rationale: '观察消费品表达', priority: 3 },
    ] } }),
  });
  const guide = await service.generateReferenceGuide('session-1', { profileId: 'analysis-1' });
  assert.equal(guide.briefRevisionId, 'brief-1');
  assert.equal(guide.territories.length, 3);
  assert.ok(guide.territories.every((territory) => territory.observe.length > 0 && (territory.suggestedQueries?.length || 0) > 0));
  assert.deepEqual(await research.history.listSessionSearchHistory('session-1'), []);
  assert.equal((await service.getReferenceGuide('session-1'))?.id, guide.id);
  assert.equal((await service.startResearch('session-1')).status, 'RESEARCH');
});
