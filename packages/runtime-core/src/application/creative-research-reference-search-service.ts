import crypto from 'node:crypto';
import type { CreativeResearchPlanRepository, CreativeResearchSessionRepository, DesignBriefRepository, ReferenceResearchRepository, ReferenceSearchGateway, SearchHistoryRepository } from './creative-research/ports.ts';
import type { SearchQuery, WebReferenceItem } from './creative-research/contracts.ts';
import { planInitialSearchQueries } from './creative-research-search-query-planner.ts';
import { asCreativeResearchSearchError, creativeResearchSearchError } from './creative-research-search-errors.ts';
import { creativeResearchError } from './creative-research-errors.ts';
import { assertCreativeResearchTransition } from './creative-research/invariants.ts';
import type { CreativeResearchReferenceImageCache } from './creative-research-reference-image-cache.ts';

export function createCreativeResearchReferenceSearchService(options: {
  sessions: CreativeResearchSessionRepository;
  briefs: DesignBriefRepository;
  plans: CreativeResearchPlanRepository;
  history: SearchHistoryRepository;
  references: ReferenceResearchRepository;
  gateway: ReferenceSearchGateway;
  imageCache?: CreativeResearchReferenceImageCache;
  now?: () => string;
  createId?: () => string;
}) {
  const now = options.now || (() => new Date().toISOString());
  const createId = options.createId || (() => crypto.randomUUID());

  async function requireSession(sessionId: string) {
    const session = await options.sessions.get(sessionId);
    if (!session) throw creativeResearchError('CREATIVE_RESEARCH_SESSION_NOT_FOUND', `Creative Research Session 不存在：${sessionId}`);
    return session;
  }

  async function startResearch(sessionId: string) {
    const session = await requireSession(sessionId);
    const brief = await options.briefs.getActiveRevision(sessionId);
    if (!brief) throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_NOT_FOUND', '开始研究前必须存在 active Design Brief');
    const plan = await options.plans.get(sessionId);
    if (!plan || plan.briefRevisionId !== brief.id) {
      throw creativeResearchSearchError('QUERY_INVALID', '开始研究前必须为当前 Brief Revision 生成 Research Plan');
    }
    assertCreativeResearchTransition(session, 'RESEARCH', {
      activeDesignBrief: brief,
      searchKeywords: brief.searchKeywords,
    });
    return options.sessions.save({ ...session, status: 'RESEARCH', updatedAt: now() });
  }

  async function planInitialSearch(sessionId: string): Promise<SearchQuery[]> {
    const session = await requireSession(sessionId);
    if (session.status !== 'RESEARCH') throw creativeResearchError('CREATIVE_RESEARCH_SESSION_CONFLICT', '只有 RESEARCH Session 可以规划搜索');
    const brief = await options.briefs.getActiveRevision(sessionId);
    if (!brief) throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_NOT_FOUND', '搜索规划需要 active Design Brief');
    const plan = await options.plans.get(sessionId);
    if (!plan || plan.briefRevisionId !== brief.id) throw creativeResearchSearchError('QUERY_INVALID', 'Research Plan 与 active Brief Revision 不匹配');
    const queries = planInitialSearchQueries({ sessionId, plan, now, createId, batchId: createId() });
    for (const query of queries) await options.history.appendQuery(query);
    return queries;
  }

  async function executeSearchQuery(sessionId: string, queryId: string): Promise<{ query: SearchQuery; references: WebReferenceItem[] }> {
    const session = await requireSession(sessionId);
    if (session.status !== 'RESEARCH') throw creativeResearchError('CREATIVE_RESEARCH_SESSION_CONFLICT', '只有 RESEARCH Session 可以执行搜索');
    const query = (await options.history.listSessionSearchHistory(sessionId)).find((item) => item.id === queryId);
    if (!query) throw creativeResearchSearchError('QUERY_NOT_FOUND', `Search Query 不存在：${queryId}`);
    if (query.status !== 'PENDING') throw creativeResearchSearchError('QUERY_INVALID', `Search Query ${queryId} 已经终止`);
    try {
      const seenReferences = query.excludeSeen
        ? (await options.references.listSessionReferences(sessionId)).filter((item): item is WebReferenceItem => item.sourceType === 'WEB_REFERENCE')
        : [];
      const page = await options.gateway.search({
        sessionId, queryId, query: query.text, kind: query.kind, intent: query.intent || 'KNOWLEDGE',
        ...(query.cursor ? { cursor: query.cursor } : {}),
        ...(query.excludeSeen ? { exclusions: {
          referenceIds: seenReferences.map((item) => item.id),
          urls: [...new Set(seenReferences.flatMap((item) => [item.sourceUrl, item.canonicalUrl]).filter(Boolean))],
        } } : {}),
      });
      const cacheQueue = [...page.items];
      const cachedItems: WebReferenceItem[] = [];
      async function cacheWorker() {
        while (cacheQueue.length) {
          const reference = cacheQueue.shift();
          if (reference) cachedItems.push(options.imageCache && reference.remoteImageUrl ? await options.imageCache.cache(reference) : reference);
        }
      }
      await Promise.all(Array.from({ length: Math.min(3, cacheQueue.length) }, () => cacheWorker()));
      cachedItems.sort((left, right) => left.resultRank - right.resultRank);
      const stored: WebReferenceItem[] = [];
      for (const cached of cachedItems) {
        const value = await options.references.storeReference(cached);
        if (value.sourceType === 'WEB_REFERENCE') stored.push(value);
      }
      const completed = await options.history.recordQueryProgress(sessionId, queryId, {
        status: 'COMPLETED', provider: page.provider, completedAt: now(),
        ...(page.nextCursor ? { cursor: page.nextCursor } : {}),
        ...(page.providerQueryText ? { providerQueryText: page.providerQueryText } : {}),
        resultCount: stored.length, providerCalls: page.providerCalls ?? 1,
      });
      return { query: completed, references: stored };
    } catch (error) {
      const failure = asCreativeResearchSearchError(error);
      await options.history.recordQueryProgress(sessionId, queryId, {
        status: 'FAILED', completedAt: now(), errorCode: failure.code, errorMessage: failure.message,
      }).catch(() => undefined);
      throw failure;
    }
  }

  async function executeSearchBatch(sessionId: string, queryIds?: string[]) {
    const pending = (await options.history.listSessionSearchHistory(sessionId))
      .filter((query) => query.status === 'PENDING' && (!queryIds || queryIds.includes(query.id)));
    const results: Array<Awaited<ReturnType<typeof executeSearchQuery>>> = [];
    const failures: unknown[] = [];
    let fatalFailure: unknown;
    let index = 0;
    async function worker() {
      while (index < pending.length && !fatalFailure) {
        const query = pending[index++];
        if (query) {
          try { results.push(await executeSearchQuery(sessionId, query.id)); }
          catch (error) {
            failures.push(error);
            const failure = asCreativeResearchSearchError(error);
            if (failure.code === 'AUTH_FAILED' || failure.code === 'SEARCH_CREDENTIAL_REQUIRED') fatalFailure = failure;
          }
        }
      }
    }
    await Promise.all([worker(), worker()]);
    if (fatalFailure) throw fatalFailure;
    if (failures.length) throw failures[0];
    return results;
  }

  async function getSearchHistory(sessionId: string) { await requireSession(sessionId); return options.history.listSessionSearchHistory(sessionId); }
  async function listWebReferences(sessionId: string) {
    await requireSession(sessionId);
    return (await options.references.listSessionReferences(sessionId)).filter((item): item is WebReferenceItem => item.sourceType === 'WEB_REFERENCE');
  }
  async function getReference(sessionId: string, referenceId: string) { await requireSession(sessionId); return options.references.getReference(sessionId, referenceId); }

  return { startResearch, planInitialSearch, executeSearchQuery, executeSearchBatch, getSearchHistory, listWebReferences, getReference };
}
