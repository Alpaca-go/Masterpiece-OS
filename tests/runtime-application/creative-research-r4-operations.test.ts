import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  createCreativeResearchOperations,
  projectCreativeResearchBriefEvidence,
  toCreativeResearchBriefDto,
  toCreativeResearchReferenceDto,
} from '@masterpiece/runtime-core/operations/creative-research-operations.ts';
import {
  deriveResearchUiState,
  filterCreativeResearchReferences,
  filterReferencesForResearchView,
  filterReferencesByResearchKind,
  listQueriesByResearchKind,
  retryableSearchQueryIds,
  safeReferenceUrl,
} from '../../apps/web/src/features/creative-research/creative-research-view-model.ts';
import type { DesignBrief } from '@masterpiece/runtime-core/application/creative-research/contracts.ts';

const NOW = '2026-08-27T10:00:00.000Z';

function query(id: string, status: 'PENDING' | 'COMPLETED' | 'FAILED', kind: 'CONCEPT' | 'CATEGORY' = 'CONCEPT') {
  return { id, sessionId: 'session-1', text: id, kind, batch: 'batch-1', status, derivedFromKeywordIds: ['keyword-1'], createdAt: NOW };
}

function briefEvidenceFixture(fieldEvidence?: DesignBrief['fieldEvidence']): DesignBrief {
  return {
    id: 'brief-1', sessionId: 'session-1', revision: 1,
    projectSummary: 'Summary', designTask: 'Task', audience: 'Audience', scenarios: ['Store'],
    coreMessages: ['Message'], constraints: ['Constraint'], conceptKeywords: [], visualKeywords: [],
    searchKeywords: [], designerNotes: [],
    evidence: [
      { id: 'e1', sourceDocumentId: 'C:\\private\\intake\\品牌策划.pdf', locator: { kind: 'DOCUMENT_SECTION', value: '项目背景' }, excerpt: '品牌希望建立清晰定位。', createdAt: NOW },
      { id: 'e2', sourceDocumentId: '/private/intake/调研.md', locator: { kind: 'DOCUMENT_PAGE', value: 'page:12' }, excerpt: '核心用户是城市青年。', createdAt: NOW },
      { id: 'unused', sourceDocumentId: '/private/intake/raw.txt', locator: { kind: 'DOCUMENT_RANGE', value: 'characters:1-20' }, excerpt: '不应投影', createdAt: NOW },
    ],
    fieldEvidence: fieldEvidence || { projectSummary: ['e1', 'missing'], audience: ['e1', 'e2'] },
    createdAt: NOW, updatedAt: NOW,
  };
}

test('R4 reference projection exposes browser-safe provenance only', () => {
  const projected = toCreativeResearchReferenceDto({
    id: 'ref-1', sessionId: 'session-1', sourceType: 'WEB_REFERENCE', resourceType: 'IMAGE',
    title: 'Case', sourceUrl: 'https://source.example/case', canonicalUrl: 'https://source.example/case',
    remoteImageUrl: 'https://images.example/a.jpg', thumbnail: { url: 'https://images.example/thumb.jpg' },
    provider: 'baidu-search', publisherOrDomain: 'source.example', queryId: 'q1', matchedQueryIds: ['q1', 'q2'],
    resultRank: 1, tags: [], retrievedAt: NOW, createdAt: NOW, licenseOrUsageStatus: 'UNKNOWN',
    localAssetId: 'must-not-cross', contentHash: 'must-not-cross', attribution: 'must-not-cross',
  });
  assert.deepEqual(Object.keys(projected).sort(), [
    'id', 'imageStatus', 'matchedQueryIds', 'publisher', 'queryId', 'remoteImageUrl', 'resourceType', 'resultRank',
    'retrievedAt', 'searchIntent', 'sourceType', 'sourceUrl', 'thumbnailUrl', 'title',
  ]);
  assert.doesNotMatch(JSON.stringify(projected), /localAssetId|contentHash|attribution|must-not-cross/u);
});

test('R4.1 Brief evidence projection resolves active field traces and redacts source paths', () => {
  const projected = toCreativeResearchBriefDto(briefEvidenceFixture());
  assert.deepEqual(projected.fieldEvidence, [
    { field: 'projectSummary', evidenceIds: ['e1'] },
    { field: 'audience', evidenceIds: ['e1', 'e2'] },
  ]);
  assert.deepEqual(projected.evidence.map((item) => item.sourceLabel), ['品牌策划.pdf', '调研.md']);
  assert.deepEqual(projected.evidence.map((item) => item.locator), [
    { kind: 'DOCUMENT_SECTION', value: '项目背景' },
    { kind: 'DOCUMENT_PAGE', value: 'page:12' },
  ]);
  assert.match(projected.evidence[0]?.excerpt || '', /清晰定位/u);
  assert.doesNotMatch(JSON.stringify(projected), /C:\\private|\/private\/intake|raw\.txt|不应投影/u);
});

test('R4.1 Brief evidence supports multiple evidence and drops stale or unknown ids after designer override', () => {
  const active = projectCreativeResearchBriefEvidence(briefEvidenceFixture({ audience: ['e1', 'e2', 'unknown'] }));
  assert.deepEqual(active.fieldEvidence, [{ field: 'audience', evidenceIds: ['e1', 'e2'] }]);
  assert.deepEqual(active.evidence.map((item) => item.id), ['e1', 'e2']);
  const overridden = projectCreativeResearchBriefEvidence(briefEvidenceFixture({ projectSummary: ['e1'] }));
  assert.deepEqual(overridden.fieldEvidence, [{ field: 'projectSummary', evidenceIds: ['e1'] }]);
  assert.equal(overridden.evidence.some((item) => item.id === 'e2'), false);
  const fullyOverridden = projectCreativeResearchBriefEvidence(briefEvidenceFixture({}));
  assert.deepEqual(fullyOverridden, { evidence: [], fieldEvidence: [] });
});

test('R4 operation layer keeps credential write-only and retries the same failed query', async () => {
  let secret = '';
  let deletedSessionId = '';
  let history = [query('q-failed', 'FAILED'), query('q-ok', 'COMPLETED')];
  const operations = createCreativeResearchOperations({
    briefs: {} as any,
    search: {
      startResearch: async () => ({} as any), planInitialSearch: async () => [],
      executeSearchBatch: async (_sessionId, queryIds) => {
        assert.deepEqual(queryIds, ['q-failed']);
        assert.equal(history[0]?.status, 'PENDING');
        assert.equal(history[0]?.errorCode, undefined);
      },
      getSearchHistory: async () => history,
      listWebReferences: async () => [],
    },
    history: {
      appendQuery: async (value) => value,
      recordQueryProgress: async (_sessionId, queryId, update) => {
        history = history.map((item) => item.id === queryId ? { ...item, ...update } : item);
        return history.find((item) => item.id === queryId)!;
      },
      listSessionSearchHistory: async () => history,
    },
    selection: {
      listSelections: async () => [],
      listNegativeSignals: async () => [],
      setReferenceSelection: async () => { throw new Error('not used'); },
    },
    preferences: {
      analyzeSelection: async () => [], listInsights: async () => [],
      updateInsight: async () => { throw new Error('not used'); }, finalizeInsight: async () => { throw new Error('not used'); },
    },
    listSessions: async () => [],
    deleteSession: async (sessionId) => { deletedSessionId = sessionId; return true; },
    credential: { has: async () => Boolean(secret), save: async (value) => { secret = value; }, remove: async () => { secret = ''; } },
  });
  assert.deepEqual(await operations['creative-research:save-search-credential']({}, 'super-secret'), { provider: 'baidu-search', configured: true });
  assert.doesNotMatch(JSON.stringify(await operations['creative-research:get-search-credential-status']()), /super-secret/u);
  assert.deepEqual(await operations['creative-research:delete-session']({}, 'session-delete'), { deleted: true });
  assert.equal(deletedSessionId, 'session-delete');
  await operations['creative-research:execute-search-batch']({}, 'session-1', ['q-failed']);
  assert.equal(history[0]?.id, 'q-failed');
});

test('R4 view model derives honest states, cross-query filters, and rejects unsafe source URLs', () => {
  assert.equal(deriveResearchUiState([], ''), 'NOT_STARTED');
  assert.equal(deriveResearchUiState([], 'planning'), 'PLANNING');
  assert.equal(deriveResearchUiState([query('a', 'COMPLETED'), query('b', 'FAILED')], ''), 'PARTIAL_FAILURE');
  assert.equal(deriveResearchUiState([query('a', 'FAILED')], ''), 'FAILED');
  assert.equal(deriveResearchUiState([query('a', 'COMPLETED')], ''), 'READY');
  const refs = [{ id: 'r1', matchedQueryIds: ['q1', 'q2'] }, { id: 'r2', matchedQueryIds: ['q2'] }] as any;
  assert.deepEqual(filterCreativeResearchReferences(refs, 'q1').map((item) => item.id), ['r1']);
  assert.deepEqual(filterCreativeResearchReferences(refs, 'q2').map((item) => item.id), ['r1', 'r2']);
  assert.equal(safeReferenceUrl('javascript:alert(1)'), null);
  assert.equal(safeReferenceUrl('https://example.com/source'), 'https://example.com/source');
});

test('R8 unavailable remote images fail closed to a visible placeholder', async () => {
  const [referenceCard, directionWorkspace] = await Promise.all([
    fs.readFile('apps/web/src/features/creative-research/ReferenceCard.tsx', 'utf8'),
    fs.readFile('apps/web/src/features/creative-research/DirectionWorkspace.tsx', 'utf8'),
  ]);
  for (const source of [referenceCard, directionWorkspace]) {
    assert.match(source, /onError=\{\(\) => setBroken\(true\)\}/u);
    assert.match(source, /图片暂不可用/u);
    assert.match(source, /referrerPolicy="no-referrer"/u);
  }
});

test('research rerun targets failed and pending queries while preserving completed history', () => {
  const queries = [
    query('completed', 'COMPLETED'),
    query('failed', 'FAILED'),
    query('pending', 'PENDING'),
  ] as any;
  assert.deepEqual(retryableSearchQueryIds(queries), ['failed', 'pending']);
  assert.deepEqual(retryableSearchQueryIds([query('completed', 'COMPLETED')] as any), []);
});

test('R4.1 view model separates Concept and Category before applying current-kind query chips', () => {
  const queries = [query('concept-1', 'COMPLETED', 'CONCEPT'), query('category-1', 'COMPLETED', 'CATEGORY')];
  const references = [
    { id: 'concept-only', matchedQueryIds: ['concept-1'] },
    { id: 'category-only', matchedQueryIds: ['category-1'] },
    { id: 'cross-kind', matchedQueryIds: ['concept-1', 'category-1'] },
  ] as any;
  assert.deepEqual(listQueriesByResearchKind(queries, 'CONCEPT').map((item) => item.id), ['concept-1']);
  assert.deepEqual(listQueriesByResearchKind(queries, 'CATEGORY').map((item) => item.id), ['category-1']);
  const concept = filterReferencesByResearchKind(references, queries, 'CONCEPT');
  const category = filterReferencesByResearchKind(references, queries, 'CATEGORY');
  assert.deepEqual(concept.map((item) => item.id), ['concept-only', 'cross-kind']);
  assert.deepEqual(category.map((item) => item.id), ['category-only', 'cross-kind']);
  assert.deepEqual(filterCreativeResearchReferences(concept, 'concept-1').map((item) => item.id), ['concept-only', 'cross-kind']);
  assert.deepEqual(filterReferencesForResearchView(references, queries, 'CONCEPT', 'category-1'), []);
});

test('Creative Research route uses the designer-curated Reference Guide workflow', async () => {
  const [routes, app, workspace] = await Promise.all([
    fs.readFile('apps/web/src/lib/useUrlScreen.ts', 'utf8'),
    fs.readFile('apps/web/src/App.tsx', 'utf8'),
    fs.readFile('apps/web/src/features/creative-research/CreativeResearchWorkspace.tsx', 'utf8'),
  ]);
  assert.match(routes, /'creative-intelligence': '\/creative-intelligence'/u);
  assert.match(routes, /'creative-research': '\/creative-research'/u);
  assert.match(app, /screen === 'creative-intelligence'.*CreativeIntelligenceWorkspace/su);
  assert.match(app, /screen === 'creative-research'.*CreativeResearchWorkspace/su);
  assert.match(workspace, /Brief & Guide/u);
  assert.match(workspace, /Reference Board/u);
  assert.match(workspace, /generateReferenceGuide/u);
  assert.match(workspace, /importCuratedReferences/u);
  assert.match(workspace, />依据</u);
  assert.match(workspace, /不会调用搜索 API/u);
  assert.doesNotMatch(workspace, /planInitialSearch|executeSearchBatch|CorrectionToolbar|百度 AI 搜索|找相似/u);
});
