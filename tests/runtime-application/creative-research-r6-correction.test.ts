import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { DesignBrief, WebReferenceItem } from '@masterpiece/runtime-core/application/creative-research/contracts.ts';
import { createCreativeResearchStore } from '@masterpiece/runtime-core/application/creative-research-store.ts';
import { createCreativeResearchResearchStore } from '@masterpiece/runtime-core/application/creative-research-research-store.ts';
import { createCreativeResearchPreferenceStore } from '@masterpiece/runtime-core/application/creative-research-preference-store.ts';
import { createCreativeResearchSearchRefinementService } from '@masterpiece/runtime-core/application/creative-research-search-refinement-service.ts';
import { createCreativeResearchSearchStrategyService } from '@masterpiece/runtime-core/application/creative-research-search-strategy-service.ts';
import { createCreativeResearchReanalysisService } from '@masterpiece/runtime-core/application/creative-research-reanalysis-service.ts';
import { createCreativeResearchReferenceSearchService } from '@masterpiece/runtime-core/application/creative-research-reference-search-service.ts';
import { createCreativeResearchSearchRefinementAdapter, normalizeSearchRefinementDrafts } from '@masterpiece/runtime-core/application/creative-research-search-refinement-adapter.ts';
import { deriveSoftCorrectionSuggestion } from '../../apps/web/src/features/creative-research/creative-research-view-model.ts';

const NOW = '2026-08-27T16:00:00.000Z';
function ids(prefix: string) { let index = 0; return () => `${prefix}-${++index}`; }
function brief(): DesignBrief {
  const evidence = [{ id: 'doc-evidence-1', sourceDocumentId: 'document-1', locator: { kind: 'DOCUMENT_SECTION' as const, value: '项目' }, excerpt: '公共文化项目', createdAt: NOW }];
  return {
    id: 'brief-1', sessionId: 'session-1', revision: 1, projectSummary: '公共文化项目', designTask: '建立视觉身份', audience: '城市公众',
    scenarios: ['展览'], coreMessages: ['开放'], constraints: ['必须易读'], conceptKeywords: ['公共性'], visualKeywords: ['克制'],
    searchKeywords: [
      { id: 'concept-1', briefId: 'brief-1', value: '公共文化品牌', kind: 'CONCEPT', source: 'AI', enabled: true, createdAt: NOW },
      { id: 'category-1', briefId: 'brief-1', value: '文化机构视觉识别', kind: 'CATEGORY', source: 'AI', enabled: true, createdAt: NOW },
      { id: 'visual-1', briefId: 'brief-1', value: '编辑排版', kind: 'VISUAL', source: 'AI', enabled: true, createdAt: NOW },
    ], designerNotes: [], evidence,
    fieldEvidence: Object.fromEntries(['projectSummary', 'designTask', 'audience', 'scenarios', 'coreMessages', 'constraints'].map((field) => [field, ['doc-evidence-1']])),
    createdAt: NOW, updatedAt: NOW,
  };
}
function reference(): WebReferenceItem {
  return { id: 'reference-1', sessionId: 'session-1', sourceType: 'WEB_REFERENCE', resourceType: 'IMAGE', title: 'Editorial identity', tags: [],
    sourceUrl: 'https://example.com/case', canonicalUrl: 'https://example.com/case', remoteImageUrl: 'https://img.example.com/case.jpg',
    provider: 'baidu-search', publisherOrDomain: 'example.com', queryId: 'query-old', resultRank: 1, retrievedAt: NOW, createdAt: NOW };
}
async function fixture(root: string) {
  const base = createCreativeResearchStore({ readDefaultDataPath: () => root });
  const research = createCreativeResearchResearchStore({ readDefaultDataPath: () => root });
  const insights = createCreativeResearchPreferenceStore({ readDefaultDataPath: () => root });
  await base.sessions.create({ id: 'session-1', projectId: 'project-1', status: 'RESEARCH', sourceDocumentIds: ['document-1'], activeDesignBriefId: 'brief-1', createdAt: NOW, updatedAt: NOW });
  await base.briefs.saveRevision(brief());
  await research.history.appendQuery({ id: 'query-old', sessionId: 'session-1', text: '公共文化品牌 编辑排版', kind: 'CONCEPT', batch: 'batch-old', status: 'COMPLETED', provider: 'baidu-search', derivedFromKeywordIds: ['concept-1', 'visual-1'], createdAt: NOW, completedAt: NOW });
  await research.references.storeReference(reference());
  await research.references.saveSelection({ sessionId: 'session-1', referenceId: 'reference-1', state: 'SELECTED', selectedAttributes: ['LAYOUT'], designerNote: '喜欢信息层级', actor: 'DESIGNER', createdAt: NOW, updatedAt: NOW });
  return { base, research, insights };
}

test('R6 refresh appends novel provenance without mutating Brief, keywords, selections, and passes seen exclusions to search', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r6-refresh-'));
  try {
    const { base, research, insights } = await fixture(root);
    const beforeBrief = await base.briefs.getActiveRevision('session-1');
    const beforeSelections = await research.references.listSelections('session-1');
    const refinement = createCreativeResearchSearchRefinementService({ ...base, ...research, insights,
      adapter: { async planQueries(input) { assert.equal(input.mode, 'REFRESH'); return [{ kind: 'CONCEPT', text: '公共文化 当代编号系统', derivedFromKeywordIds: ['concept-1', 'visual-1'] }]; } },
      now: () => NOW, createId: ids('refresh'),
    });
    const planned = await refinement.planRefreshSearch('session-1', 'analysis-profile');
    assert.equal(planned[0]?.origin, 'REFRESH'); assert.equal(planned[0]?.excludeSeen, true); assert.deepEqual(planned[0]?.parentQueryIds, ['query-old']);
    assert.deepEqual(await base.briefs.getActiveRevision('session-1'), beforeBrief);
    assert.deepEqual(await research.references.listSelections('session-1'), beforeSelections);
    let exclusions: any;
    const search = createCreativeResearchReferenceSearchService({ ...base, ...research, gateway: { async search(input) { exclusions = input.exclusions; return { provider: 'baidu-search', query: input.query, items: [] }; } }, now: () => NOW });
    await search.executeSearchQuery('session-1', planned[0]!.id);
    assert.deepEqual(exclusions.referenceIds, ['reference-1']);
    assert.ok(exclusions.urls.includes('https://example.com/case'));
    assert.equal((await research.references.listSessionReferences('session-1')).length, 1);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('R6 refinement validation rejects historical duplicates and invalid keyword evidence; similar requires a same-session source', async () => {
  const input: any = { sessionId: 'session-1', profileId: 'p', mode: 'REFRESH', enabledSearchKeywords: [{ id: 'concept-1', value: '公共文化', kind: 'CONCEPT' }], conceptKeywords: [], visualKeywords: [], recentQueries: [{ id: 'old', text: '重复 query', kind: 'CONCEPT', batch: 'b' }], selections: [], activeRejectionReasons: [], preferenceInsights: [] };
  assert.throws(() => normalizeSearchRefinementDrafts({ queries: [{ kind: 'CONCEPT', text: '重复 query', derivedFromKeywordIds: ['concept-1'] }] }, input), (error: any) => error.code === 'CREATIVE_RESEARCH_REFRESH_NO_NOVEL_QUERY');
  assert.throws(() => normalizeSearchRefinementDrafts({ queries: [{ kind: 'CONCEPT', text: 'new', derivedFromKeywordIds: ['fake'] }] }, input), /keyword evidence/u);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r6-similar-'));
  try {
    const { base, research, insights } = await fixture(root);
    const service = createCreativeResearchSearchRefinementService({ ...base, ...research, insights,
      adapter: { async planQueries(data) { assert.equal(data.similar?.reference?.id, 'reference-1'); return [{ kind: 'CATEGORY', text: '文化机构 网格系统 案例', derivedFromKeywordIds: ['category-1', 'visual-1'] }]; } }, now: () => NOW, createId: ids('similar'),
    });
    await assert.rejects(service.planSimilarSearch({ sessionId: 'session-1', profileId: 'p', sourceReferenceId: 'missing', dimension: 'LAYOUT', targetKind: 'CATEGORY' }), (error: any) => error.code === 'CREATIVE_RESEARCH_CORRECTION_SOURCE_INVALID');
    const planned = await service.planSimilarSearch({ sessionId: 'session-1', profileId: 'p', sourceReferenceId: 'reference-1', dimension: 'LAYOUT', targetKind: 'CATEGORY' });
    assert.equal(planned.length, 1); assert.equal(planned[0]?.origin, 'SIMILAR'); assert.deepEqual(planned[0]?.sourceReferenceIds, ['reference-1']);
    assert.equal((await base.briefs.getActiveRevision('session-1'))?.id, 'brief-1');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('R6 refinement adapter requires the explicit profile and allows only one structured-output repair', async () => {
  let calls = 0; let diagnostics: any;
  const adapter = createCreativeResearchSearchRefinementAdapter({
    readCredentials: async () => ({ profileId: 'profile-1', displayName: 'Analysis', provider: 'qwen', model: 'analysis-model', modelType: 'analysis', protocol: 'openai-chat', baseUrl: 'https://model.example.com', apiKey: 'secret', isEnabled: true, isDefault: false }),
    reasonerFactory: () => async () => ({ text: ++calls === 1 ? '{broken' : JSON.stringify({ queries: [{ kind: 'CONCEPT', text: '公共文化 模块化参与系统', derivedFromKeywordIds: ['concept-1'] }] }) }),
    onDiagnostics: (value) => { diagnostics = value; },
  });
  const result = await adapter.planQueries({ sessionId: 'session-1', profileId: 'profile-1', mode: 'REFRESH', enabledSearchKeywords: [{ id: 'concept-1', value: '公共文化', kind: 'CONCEPT' }], conceptKeywords: [], visualKeywords: [], recentQueries: [], selections: [], activeRejectionReasons: [], preferenceInsights: [] });
  assert.equal(result.length, 1); assert.equal(calls, 2); assert.equal(diagnostics.repairCount, 1);
  await assert.rejects(adapter.planQueries({ sessionId: 'session-1', profileId: '', mode: 'REFRESH', enabledSearchKeywords: [], conceptKeywords: [], visualKeywords: [], recentQueries: [], selections: [], activeRejectionReasons: [], preferenceInsights: [] }), (error: any) => error.code === 'CREATIVE_RESEARCH_CORRECTION_PROFILE_REQUIRED');
});

test('R6 research search strategy creates revision, preserves facts/evidence, records REMOVE_KEYWORD, and plans novel adjustment queries', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r6-strategy-'));
  try {
    const { base, research } = await fixture(root);
    const service = createCreativeResearchSearchStrategyService({ ...base, ...research, now: () => NOW, createId: ids('strategy') });
    await assert.rejects(service.updateResearchSearchStrategy('session-1', { audience: '非法修改' } as any), (error: any) => error.code === 'CREATIVE_RESEARCH_CORRECTION_INPUT_INVALID');
    const revised = await service.updateResearchSearchStrategy('session-1', {
      conceptKeywords: ['公共文化', '参与感'], visualKeywords: ['模块网格'], designerNote: '不要旧式机构感',
      searchKeywords: [
        { ...brief().searchKeywords[0]!, enabled: false },
        { ...brief().searchKeywords[1]! },
        { id: 'visual-1', value: '模块网格', kind: 'VISUAL', enabled: true },
      ],
    });
    assert.equal(revised.revision, 2); assert.equal((await base.sessions.get('session-1'))?.status, 'RESEARCH');
    assert.equal(revised.audience, brief().audience); assert.deepEqual(revised.fieldEvidence?.audience, ['doc-evidence-1']);
    const signals = await research.references.listNegativeSignals('session-1');
    assert.ok(signals.some((item) => item.type === 'REMOVE_KEYWORD' && item.sourceKeywordId === 'concept-1'));
    const queries = await service.planKeywordAdjustmentSearch('session-1');
    assert.ok(queries.length > 0 && queries.every((item) => item.origin === 'KEYWORD_ADJUSTMENT' && item.excludeSeen));
    assert.equal((await research.references.listSelections('session-1')).length, 1);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('R6 explicit reanalysis re-reads documents, uses R1 transition, accepts only document factual evidence, and preserves research evidence', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r6-reanalysis-'));
  try {
    const { base, research, insights } = await fixture(root);
    let rereads = 0; let captured: any;
    const documentAdapter = { async readEvidence() { rereads += 1; return { projectId: 'project-1', sourceDocumentIds: ['document-1'], evidence: brief().evidence }; } };
    const draft = { ...brief(), evidenceIds: ['doc-evidence-1'], searchKeywordSuggestions: [{ value: '公共参与 视觉系统', kind: 'CONCEPT' as const }] };
    const adapter = { async reanalyzeDesignBrief(input: any) { captured = input; return { ...draft, searchKeywords: undefined, designerNotes: undefined, evidence: undefined, id: undefined, sessionId: undefined, revision: undefined, createdAt: undefined, updatedAt: undefined }; } };
    const service = createCreativeResearchReanalysisService({ ...base, ...research, insights, documentAdapter, adapter, now: () => NOW, createId: ids('reanalyze') });
    const next = await service.reanalyzeDesignBrief('session-1', { profileId: 'analysis-profile', feedback: ['关键词理解偏了'] });
    assert.equal(rereads, 1); assert.equal(next.revision, 2); assert.equal((await base.sessions.get('session-1'))?.status, 'INTAKE');
    assert.equal(captured.previousBrief.id, 'brief-1'); assert.equal(captured.recentSearchHistory.length, 1); assert.equal(captured.selections.length, 1);
    assert.ok((await research.references.listNegativeSignals('session-1')).some((item) => item.type === 'REANALYSIS_FEEDBACK'));
    assert.equal((await research.references.listSessionReferences('session-1')).length, 1); assert.equal((await research.references.listSelections('session-1')).length, 1);
    assert.equal((await research.history.listSessionSearchHistory('session-1')).length, 1);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('R6 reanalysis rejects fabricated reference factual evidence before writing a revision or feedback signal', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-r6-reanalysis-invalid-'));
  try {
    const { base, research, insights } = await fixture(root);
    const documentAdapter = { async readEvidence() { return { projectId: 'project-1', sourceDocumentIds: ['document-1'], evidence: brief().evidence }; } };
    const invalid = { ...brief(), evidenceIds: ['doc-evidence-1'], fieldEvidence: { ...brief().fieldEvidence, audience: ['reference-1'] }, searchKeywordSuggestions: [] };
    const service = createCreativeResearchReanalysisService({ ...base, ...research, insights, documentAdapter,
      adapter: { async reanalyzeDesignBrief() { return invalid; } }, now: () => NOW, createId: ids('invalid'),
    });
    await assert.rejects(service.reanalyzeDesignBrief('session-1', { profileId: 'profile-1', feedback: ['太行业化'] }), (error: any) => error.code === 'CREATIVE_RESEARCH_CORRECTION_OUTPUT_INVALID');
    assert.equal((await base.briefs.listRevisions('session-1')).length, 1);
    assert.equal((await research.references.listNegativeSignals('session-1')).length, 0);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('R6 soft correction signal is read-only and appears only after three poor batches', () => {
  const query = (batch: string, index: number) => ({ id: `q-${index}`, text: `query ${index}`, kind: 'CONCEPT' as const, status: 'COMPLETED' as const, batch, origin: 'REFRESH' as const, createdAt: NOW });
  assert.equal(deriveSoftCorrectionSuggestion([query('b1', 1), query('b2', 2)], [], []), null);
  const queries = [query('b1', 1), query('b2', 2), query('b3', 3)];
  const snapshot = JSON.stringify({ queries, references: [], selections: [] });
  assert.match(deriveSoftCorrectionSuggestion(queries, [], [])?.message || '', /可能需要调整/u);
  assert.equal(JSON.stringify({ queries, references: [], selections: [] }), snapshot);
});
