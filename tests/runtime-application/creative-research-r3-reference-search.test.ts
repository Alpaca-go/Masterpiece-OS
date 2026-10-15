import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CreativeResearchPlan, DesignBrief } from '@masterpiece/runtime-core/application/creative-research/contracts.ts';
import { planInitialSearchQueries } from '@masterpiece/runtime-core/application/creative-research-search-query-planner.ts';
import {
  BAIDU_REFERENCE_SEARCH_CREDENTIAL_ID,
  BAIDU_REFERENCE_RETENTION_POLICY,
  createBaiduReferenceSearchCredentialReader,
  createBaiduReferenceSearchGateway,
} from '@masterpiece/runtime-core/application/creative-research-reference-search-baidu.ts';
import { createCreativeResearchStore } from '@masterpiece/runtime-core/application/creative-research-store.ts';
import { createCreativeResearchResearchStore } from '@masterpiece/runtime-core/application/creative-research-research-store.ts';
import { createCreativeResearchReferenceSearchService } from '@masterpiece/runtime-core/application/creative-research-reference-search-service.ts';

const NOW = '2026-08-27T08:00:00.000Z';
const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'baidu-search-references.json');

function brief(): DesignBrief {
  return {
    id: 'brief-1', sessionId: 'session-1', revision: 1,
    projectSummary: '新中式餐饮品牌', designTask: '建立品牌视觉', audience: '城市消费者',
    scenarios: ['门店'], coreMessages: ['当代东方'], constraints: [], conceptKeywords: ['东方秩序'], visualKeywords: ['克制'],
    searchKeywords: [
      { id: 'concept-zh', briefId: 'brief-1', value: '东方餐叙', kind: 'CONCEPT', source: 'AI', enabled: true, locale: 'zh-CN', createdAt: NOW },
      { id: 'concept-en', briefId: 'brief-1', value: 'modern oriental dining', kind: 'CONCEPT', source: 'DESIGNER', enabled: true, locale: 'en', createdAt: NOW },
      { id: 'category-zh', briefId: 'brief-1', value: '新中式餐饮品牌设计', kind: 'CATEGORY', source: 'AI', enabled: true, createdAt: NOW },
      { id: 'category-off', briefId: 'brief-1', value: 'disabled', kind: 'CATEGORY', source: 'AI', enabled: false, createdAt: NOW },
      { id: 'visual-1', briefId: 'brief-1', value: '克制 留白', kind: 'VISUAL', source: 'DESIGNER', enabled: true, createdAt: NOW },
    ],
    designerNotes: [], evidence: [{ id: 'evidence-1', sourceDocumentId: 'document-1', locator: { kind: 'DOCUMENT_SECTION', value: '定位' }, createdAt: NOW }],
    createdAt: NOW, updatedAt: NOW,
  };
}

function ids(...values: string[]) {
  let index = 0;
  return () => values[index++] || `id-${index}`;
}

function researchPlan(): CreativeResearchPlan {
  return {
    id: 'plan-1', sessionId: 'session-1', briefRevisionId: 'brief-1',
    clues: [
      { id: 'category-zh', value: '新中式餐饮品牌设计', kind: 'CATEGORY', enabled: true, source: 'BRIEF', priority: 'HIGH' },
      { id: 'concept-zh', value: '东方餐叙', kind: 'CONCEPT', enabled: true, source: 'BRIEF', priority: 'MEDIUM' },
      { id: 'concept-en', value: 'modern oriental dining', kind: 'CONCEPT', enabled: true, source: 'DESIGNER', priority: 'HIGH' },
      { id: 'visual-1', value: '克制 留白', kind: 'VISUAL', enabled: true, source: 'DESIGNER', priority: 'HIGH' },
    ],
    tracks: [
      { id: 'track-category', title: '新中式餐饮品类', summary: '行业案例与定位', clueIds: ['category-zh'], kind: 'CATEGORY', priority: 'PRIMARY', firstRoundEligible: true, rationale: '理解品类语境' },
      { id: 'track-concept-zh', title: '东方餐叙概念', summary: '东方叙事路径', clueIds: ['concept-zh'], kind: 'CONCEPT', priority: 'PRIMARY', firstRoundEligible: true, rationale: '理解概念表达' },
      { id: 'track-concept-en', title: '国际东方餐饮', summary: '国际案例语境', clueIds: ['concept-en'], kind: 'CULTURE', priority: 'SECONDARY', firstRoundEligible: true, rationale: '补充跨文化案例' },
      { id: 'track-visual', title: '视觉表现线索', summary: '克制与留白', clueIds: ['visual-1'], kind: 'VISUAL', priority: 'SECONDARY', firstRoundEligible: false, rationale: '延后至第二轮' },
    ],
    firstRoundQueries: [
      { id: 'planned-category', trackId: 'track-category', text: '新中式餐饮品牌设计 案例', kind: 'CATEGORY', round: 'INITIAL', rationale: '品类案例' },
      { id: 'planned-concept-zh', trackId: 'track-concept-zh', text: '新中式餐饮 东方餐叙 品牌设计', kind: 'CONCEPT', round: 'INITIAL', rationale: '概念案例' },
      { id: 'planned-concept-en', trackId: 'track-concept-en', text: 'modern oriental dining brand identity', kind: 'CONCEPT', round: 'INITIAL', rationale: '跨文化案例' },
    ],
    plannerMode: 'MODEL',
    telemetry: { clueCount: 4, trackCount: 4, initialQueryCount: 3, visualClueDeferredCount: 1, plannerFallbackUsed: false, duplicateQueryRemovedCount: 0 },
    createdAt: NOW,
  };
}

test('Research Plan compiler preserves track provenance and keeps deferred visual clues out of the initial round', () => {
  const queries = planInitialSearchQueries({ sessionId: 'session-1', plan: researchPlan(), now: () => NOW, createId: ids('q1', 'q2', 'q3'), batchId: 'batch' });
  assert.deepEqual(queries.map(({ text, kind, derivedFromKeywordIds, researchTrackId, round }) => ({ text, kind, derivedFromKeywordIds, researchTrackId, round })), [
    { text: '新中式餐饮品牌设计 案例', kind: 'CATEGORY', derivedFromKeywordIds: ['category-zh'], researchTrackId: 'track-category', round: 'INITIAL' },
    { text: '新中式餐饮 东方餐叙 品牌设计', kind: 'CONCEPT', derivedFromKeywordIds: ['concept-zh'], researchTrackId: 'track-concept-zh', round: 'INITIAL' },
    { text: 'modern oriental dining brand identity', kind: 'CONCEPT', derivedFromKeywordIds: ['concept-en'], researchTrackId: 'track-concept-en', round: 'INITIAL' },
  ]);
  assert.ok(queries.every((query) => query.status === 'PENDING' && query.batch === 'batch'));
  assert.doesNotMatch(queries.map((query) => query.text).join(' '), /克制|留白|disabled/u);
});

test('R3 Baidu provider consumes references only, normalizes provenance and deduplicates image URLs', async () => {
  const fixture = await fs.readFile(fixturePath, 'utf8');
  let requestBody = '';
  let authorization = '';
  const gateway = createBaiduReferenceSearchGateway({
    readCredential: () => 'secret-test-key', now: () => NOW, maxRetries: 0,
    fetch: async (_url, init) => {
      requestBody = String(init?.body || '');
      authorization = new Headers(init?.headers).get('authorization') || '';
      return new Response(fixture, { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const page = await gateway.search({ sessionId: 'session-1', queryId: 'query-1', query: '新中式餐饮品牌设计', kind: 'CATEGORY' });
  assert.equal(authorization, 'Bearer secret-test-key');
  const body = JSON.parse(requestBody);
  assert.equal(body.search_source, 'baidu_search_v2');
  assert.equal(Array.isArray(body.resource_type_filter), true);
  assert.deepEqual(body.resource_type_filter, [
    { type: 'web', top_k: 10 },
    { type: 'image', top_k: 10 },
  ]);
  assert.equal(page.provider, 'baidu-search');
  assert.equal(page.items.length, 2);
  assert.deepEqual(page.items.map((item) => item.resourceType), ['WEB', 'IMAGE']);
  assert.equal(page.items[0]?.canonicalUrl, 'https://example.com/case/one');
  assert.equal(page.items[1]?.remoteImageUrl, 'https://img.example.com/a.jpg?token=signed');
  assert.equal(page.items[1]?.imageWidth, 1200);
  assert.equal(page.items[1]?.imageHeight, 800);
  assert.ok(page.items.every((item) => item.sourceUrl && item.licenseOrUsageStatus === 'UNKNOWN'));
  assert.doesNotMatch(JSON.stringify(page), /generated answer/u);
});

test('R3 credential reader uses the dedicated encrypted-store identifier instead of a model profile', async () => {
  let requested = '';
  const readCredential = createBaiduReferenceSearchCredentialReader({
    async read(profileId) { requested = profileId; return 'stored-secret'; },
  });
  assert.equal(await readCredential(), 'stored-secret');
  assert.equal(requested, BAIDU_REFERENCE_SEARCH_CREDENTIAL_ID);
  assert.equal(requested, 'reference-search-baidu');
  assert.equal(BAIDU_REFERENCE_RETENTION_POLICY, 'PROVENANCE_METADATA_ONLY');
});

test('R3 Baidu provider fails closed for missing credentials and retries one server failure only', async () => {
  await assert.rejects(
    createBaiduReferenceSearchGateway({ readCredential: () => '', maxRetries: 0 }).search({ sessionId: 's', queryId: 'q', query: 'brand', kind: 'CONCEPT' }),
    (error: any) => error.code === 'SEARCH_CREDENTIAL_REQUIRED',
  );
  let calls = 0;
  const gateway = createBaiduReferenceSearchGateway({
    readCredential: () => 'key', maxRetries: 1,
    fetch: async () => {
      calls += 1;
      return calls === 1 ? new Response('{}', { status: 500 }) : new Response('{"references":[]}', { status: 200 });
    },
  });
  const page = await gateway.search({ sessionId: 's', queryId: 'q', query: 'brand', kind: 'CONCEPT' });
  assert.equal(calls, 2);
  assert.equal(page.providerCalls, 2);
  assert.deepEqual(page.items, []);
});

test('R3 Baidu provider classifies auth, rate-limit and invalid-response failures without aggressive retries', async () => {
  const cases = [
    { status: 401, body: '{}', code: 'AUTH_FAILED' },
    { status: 429, body: '{}', code: 'RATE_LIMITED' },
    { status: 200, body: '{"choices":[]}', code: 'RESPONSE_INVALID' },
  ];
  for (const fixture of cases) {
    let calls = 0;
    const gateway = createBaiduReferenceSearchGateway({
      readCredential: () => 'key', maxRetries: 1,
      fetch: async () => { calls += 1; return new Response(fixture.body, { status: fixture.status }); },
    });
    await assert.rejects(
      gateway.search({ sessionId: 's', queryId: 'q', query: 'brand', kind: 'CONCEPT' }),
      (error: any) => error.code === fixture.code,
    );
    assert.equal(calls, 1);
  }
});

test('R8 Baidu timeout aborts safely and exposes no credential in the error', async () => {
  const gateway = createBaiduReferenceSearchGateway({
    readCredential: () => 'timeout-test-secret', timeoutMs: 1, maxRetries: 0,
    fetch: async (_url, init) => new Promise<Response>((_resolve, reject) => {
      const abort = () => {
        const error = new Error('request aborted');
        error.name = 'AbortError';
        reject(error);
      };
      if (init?.signal?.aborted) abort();
      else init?.signal?.addEventListener('abort', abort, { once: true });
    }),
  });
  await assert.rejects(
    gateway.search({ sessionId: 's', queryId: 'q', query: 'brand', kind: 'CONCEPT' }),
    (error: any) => error.code === 'TIMEOUT' && !JSON.stringify(error).includes('timeout-test-secret'),
  );
});

test('R3 lifecycle persists INTAKE to RESEARCH, query status, deduped references and cross-query associations', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-research-r3-'));
  try {
    const base = createCreativeResearchStore({ readDefaultDataPath: () => temporary });
    const research = createCreativeResearchResearchStore({ readDefaultDataPath: () => temporary });
    await base.sessions.create({ id: 'session-1', projectId: 'project-1', status: 'INTAKE', sourceDocumentIds: ['document-1'], createdAt: NOW, updatedAt: NOW });
    await base.briefs.saveRevision(brief());
    await research.plans.save(researchPlan());
    const initial = await base.sessions.get('session-1');
    await base.sessions.save({ ...initial!, activeDesignBriefId: 'brief-1' });
    let active = 0;
    let peak = 0;
    const gateway = {
      async search(input: any) {
        active += 1; peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
        return {
          provider: 'baidu-search', query: input.query, providerCalls: 1,
          ...(input.queryId === 'q1' ? { providerQueryText: 'provider-safe-query' } : {}),
          items: [{
            id: 'webref-shared', sessionId: input.sessionId, sourceType: 'WEB_REFERENCE' as const, resourceType: 'WEB' as const,
            sourceUrl: 'https://example.com/shared', canonicalUrl: 'https://example.com/shared', provider: 'baidu-search',
            publisherOrDomain: 'example.com', queryId: input.queryId, matchedQueryIds: [input.queryId], resultRank: 1,
            licenseOrUsageStatus: 'UNKNOWN', tags: [], retrievedAt: NOW, createdAt: NOW,
          }],
        };
      },
    };
    const service = createCreativeResearchReferenceSearchService({
      sessions: base.sessions, briefs: base.briefs, plans: research.plans, history: research.history, references: research.references, gateway,
      now: () => NOW, createId: ids('batch-1', 'q1', 'q2', 'q3'),
    });
    await service.startResearch('session-1');
    assert.equal((await base.sessions.get('session-1'))?.status, 'RESEARCH');
    const queries = await service.planInitialSearch('session-1');
    await service.executeSearchBatch('session-1', queries.map((query) => query.id));
    assert.equal(peak, 2);
    const history = await service.getSearchHistory('session-1');
    assert.ok(history.every((query) => query.status === 'COMPLETED' && query.provider === 'baidu-search' && query.resultCount === 1));
    assert.equal(history.find((query) => query.id === 'q1')?.providerQueryText, 'provider-safe-query');
    const references = await service.listWebReferences('session-1');
    assert.equal(references.length, 1);
    assert.deepEqual(references[0]?.matchedQueryIds?.sort(), queries.map((query) => query.id).sort());
    await fs.access(path.join(temporary, 'creative-research', 'session-1', 'research', 'associations', 'reference-query.jsonl'));
    const persisted = createCreativeResearchResearchStore({ readDefaultDataPath: () => temporary });
    assert.equal((await persisted.history.listSessionSearchHistory('session-1')).length, queries.length);
    assert.equal((await persisted.plans.get('session-1'))?.briefRevisionId, 'brief-1');
    assert.equal((await persisted.references.listSessionReferences('session-1')).length, 1);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('R8 partial search batch preserves completed references and records failed query state', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-research-r8-partial-search-'));
  try {
    const base = createCreativeResearchStore({ readDefaultDataPath: () => temporary });
    const research = createCreativeResearchResearchStore({ readDefaultDataPath: () => temporary });
    await base.sessions.create({
      id: 'session-1', projectId: 'project-1', status: 'INTAKE', sourceDocumentIds: ['document-1'],
      activeDesignBriefId: 'brief-1', createdAt: NOW, updatedAt: NOW,
    });
    await base.briefs.saveRevision(brief());
    await research.plans.save(researchPlan());
    const gateway = {
      async search(input: any) {
        if (input.queryId === 'q1') throw new Error('simulated provider failure');
        return {
          provider: 'baidu-search', query: input.query, providerCalls: 1,
          items: [{
            id: `reference-${input.queryId}`, sessionId: input.sessionId, sourceType: 'WEB_REFERENCE' as const,
            resourceType: 'WEB' as const, sourceUrl: `https://example.com/${input.queryId}`,
            canonicalUrl: `https://example.com/${input.queryId}`, provider: 'baidu-search',
            publisherOrDomain: 'example.com', queryId: input.queryId, resultRank: 1,
            tags: [], retrievedAt: NOW, createdAt: NOW,
          }],
        };
      },
    };
    const service = createCreativeResearchReferenceSearchService({
      sessions: base.sessions, briefs: base.briefs, plans: research.plans, history: research.history,
      references: research.references, gateway, now: () => NOW,
      createId: ids('batch-1', 'q1', 'q2', 'q3'),
    });
    await service.startResearch('session-1');
    const queries = await service.planInitialSearch('session-1');
    await assert.rejects(service.executeSearchBatch('session-1', queries.map((query) => query.id)), /simulated provider failure/u);
    const history = await service.getSearchHistory('session-1');
    assert.equal(history.filter((query) => query.status === 'FAILED').length, 1);
    assert.equal(history.filter((query) => query.status === 'COMPLETED').length, 2);
    assert.equal((await service.listWebReferences('session-1')).length, 2);
    assert.equal((await base.sessions.get('session-1'))?.status, 'RESEARCH');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});
