import test from 'node:test';
import assert from 'node:assert/strict';
import type { CreativeResearchSession, DesignBrief } from '@masterpiece/runtime-core/application/creative-research/contracts.ts';
import {
  buildBaiduReferenceSearchRequest,
  measureBaiduQueryUnits,
  normalizeBaiduQueryWhitespace,
  prepareBaiduQueryText,
} from '@masterpiece/runtime-core/application/creative-research-reference-search-baidu.ts';
import { createCreativeResearchReferenceSearchService } from '@masterpiece/runtime-core/application/creative-research-reference-search-service.ts';

const NOW = '2026-08-27T08:00:00.000Z';

function validBrief(): DesignBrief {
  return {
    id: 'brief-1', sessionId: 'session-1', revision: 1,
    projectSummary: 'Project', designTask: 'Identity', audience: 'Audience',
    scenarios: [], coreMessages: [], constraints: [], conceptKeywords: [], visualKeywords: [], designerNotes: [], evidence: [],
    searchKeywords: [{ id: 'keyword-1', briefId: 'brief-1', value: 'brand identity', kind: 'CONCEPT', source: 'AI', enabled: true, createdAt: NOW }],
    createdAt: NOW, updatedAt: NOW,
  };
}

test('R3.1 request builder emits the exact official resource_type_filter array and caps each modality', () => {
  const body = buildBaiduReferenceSearchRequest({ sessionId: 'session-1', queryId: 'query-1', query: 'brand identity', kind: 'CONCEPT', limit: 20 });
  assert.equal(body.search_source, 'baidu_search_v2');
  assert.equal(Array.isArray(body.resource_type_filter), true);
  assert.deepEqual(body.resource_type_filter, [
    { type: 'web', top_k: 20 },
    { type: 'image', top_k: 20 },
  ]);
  assert.deepEqual(buildBaiduReferenceSearchRequest({
    sessionId: 'session-1', queryId: 'query-2', query: 'brand', kind: 'CATEGORY', limit: 100,
  }).resource_type_filter, [
    { type: 'web', top_k: 50 },
    { type: 'image', top_k: 30 },
  ]);
});

test('R3.1 query units and deterministic trimming cover ASCII, Chinese, mixed text, whitespace and emoji', () => {
  const ascii72 = 'a'.repeat(72);
  const ascii73 = 'a'.repeat(73);
  const chinese36 = '中'.repeat(36);
  const chinese37 = '中'.repeat(37);
  assert.equal(measureBaiduQueryUnits(ascii72), 72);
  assert.equal(prepareBaiduQueryText(ascii72), ascii72);
  assert.equal(measureBaiduQueryUnits(ascii73), 73);
  assert.equal(prepareBaiduQueryText(ascii73), ascii72);
  assert.equal(measureBaiduQueryUnits(chinese36), 72);
  assert.equal(prepareBaiduQueryText(chinese36), chinese36);
  assert.equal(measureBaiduQueryUnits(chinese37), 74);
  assert.equal(prepareBaiduQueryText(chinese37), chinese36);
  assert.equal(measureBaiduQueryUnits('品牌 design'), 11);
  assert.equal(normalizeBaiduQueryWhitespace('  品牌\t\n  design  '), '品牌 design');
  assert.equal(measureBaiduQueryUnits('A😀B'), 4);
  assert.equal(prepareBaiduQueryText(`核心概念 ${'视觉修饰词'.repeat(20)}`), '核心概念');
});

function serviceFor(session: CreativeResearchSession, brief: DesignBrief, onSave?: (value: CreativeResearchSession) => void) {
  return createCreativeResearchReferenceSearchService({
    sessions: {
      async create(value) { return value; }, async get() { return session; },
      async save(value) { onSave?.(value); return value; }, async listByProject() { return []; },
    },
    briefs: {
      async saveRevision(value) { return value; }, async getActiveRevision() { return brief; }, async listRevisions() { return [brief]; },
    },
    history: {
      async appendQuery(value) { return value; }, async recordQueryProgress() { throw new Error('unused'); }, async listSessionSearchHistory() { return []; },
    },
    references: {
      async storeReference(value) { return value; }, async getReference() { return null; }, async listSessionReferences() { return []; },
      async saveSelection(value) { return value; }, async saveRegion(value) { return value; }, async saveNegativeSignal(value) { return value; },
    },
    gateway: { async search() { throw new Error('unused'); } },
    now: () => NOW,
  });
}

test('R3.1 startResearch delegates INTAKE -> RESEARCH authority to the R1 invariant', async () => {
  const session: CreativeResearchSession = {
    id: 'session-1', projectId: 'project-1', status: 'INTAKE', sourceDocumentIds: ['document-1'],
    activeDesignBriefId: 'brief-1', createdAt: NOW, updatedAt: NOW,
  };
  let saved: CreativeResearchSession | undefined;
  await serviceFor(session, validBrief(), (value) => { saved = value; }).startResearch(session.id);
  assert.equal(saved?.status, 'RESEARCH');

  await assert.rejects(
    serviceFor({ ...session, activeDesignBriefId: 'brief-other' }, validBrief()).startResearch(session.id),
    /requires an active DesignBrief/u,
  );
  await assert.rejects(
    serviceFor(session, { ...validBrief(), sessionId: 'session-other' }).startResearch(session.id),
    /must belong to session/u,
  );
  const foreignKeyword = { ...validBrief(), searchKeywords: [{ ...validBrief().searchKeywords[0]!, briefId: 'brief-other' }] };
  await assert.rejects(
    serviceFor(session, foreignKeyword).startResearch(session.id),
    /keyword\.briefId must match brief\.id/u,
  );
});
