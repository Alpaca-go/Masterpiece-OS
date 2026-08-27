import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createCreativeResearchOperations, toCreativeResearchReferenceDto } from '@masterpiece/runtime-core/operations/creative-research-operations.ts';
import { deriveResearchUiState, filterCreativeResearchReferences, safeReferenceUrl } from '../../apps/web/src/features/creative-research/creative-research-view-model.ts';

const NOW = '2026-08-27T10:00:00.000Z';

function query(id: string, status: 'PENDING' | 'COMPLETED' | 'FAILED') {
  return { id, sessionId: 'session-1', text: id, kind: 'CONCEPT' as const, batch: 'batch-1', status, derivedFromKeywordIds: ['keyword-1'], createdAt: NOW };
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
    'id', 'matchedQueryIds', 'publisher', 'queryId', 'remoteImageUrl', 'resourceType', 'resultRank',
    'retrievedAt', 'sourceUrl', 'thumbnailUrl', 'title',
  ]);
  assert.doesNotMatch(JSON.stringify(projected), /localAssetId|contentHash|attribution|must-not-cross/u);
});

test('R4 operation layer keeps credential write-only and retries the same failed query', async () => {
  let secret = '';
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
    listSessions: async () => [],
    credential: { has: async () => Boolean(secret), save: async (value) => { secret = value; }, remove: async () => { secret = ''; } },
  });
  assert.deepEqual(await operations['creative-research:save-search-credential']({}, 'super-secret'), { provider: 'baidu-search', configured: true });
  assert.doesNotMatch(JSON.stringify(await operations['creative-research:get-search-credential-status']()), /super-secret/u);
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

test('R4 route remains parallel to the unchanged Creative Intelligence route and exposes only Brief/References tabs', async () => {
  const [routes, app, workspace] = await Promise.all([
    fs.readFile('apps/web/src/lib/useUrlScreen.ts', 'utf8'),
    fs.readFile('apps/web/src/App.tsx', 'utf8'),
    fs.readFile('apps/web/src/features/creative-research/CreativeResearchWorkspace.tsx', 'utf8'),
  ]);
  assert.match(routes, /'creative-intelligence': '\/creative-intelligence'/u);
  assert.match(routes, /'creative-research': '\/creative-research'/u);
  assert.match(app, /screen === 'creative-intelligence'.*CreativeIntelligenceWorkspace/su);
  assert.match(app, /screen === 'creative-research'.*CreativeResearchWorkspace/su);
  assert.match(workspace, />Brief</u);
  assert.match(workspace, />References /u);
  assert.doesNotMatch(workspace, /Selection Tray|更像这个|负向偏好|区域框选/u);
});
