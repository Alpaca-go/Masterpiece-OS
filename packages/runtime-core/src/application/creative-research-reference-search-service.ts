import crypto from 'node:crypto';
import type { CreativeResearchSessionRepository, DesignBriefRepository, ReferenceResearchRepository, ReferenceSearchGateway, SearchHistoryRepository } from './creative-research/ports.ts';
import type { SearchQuery, WebReferenceItem } from './creative-research/contracts.ts';
import { planInitialSearchQueries } from './creative-research-search-query-planner.ts';
import { asCreativeResearchSearchError, creativeResearchSearchError } from './creative-research-search-errors.ts';
import { creativeResearchError } from './creative-research-errors.ts';

export function createCreativeResearchReferenceSearchService(options: {
  sessions: CreativeResearchSessionRepository;
  briefs: DesignBriefRepository;
  history: SearchHistoryRepository;
  references: ReferenceResearchRepository;
  gateway: ReferenceSearchGateway;
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
    if (session.status !== 'INTAKE') throw creativeResearchError('CREATIVE_RESEARCH_SESSION_CONFLICT', '只有 INTAKE Session 可以进入 RESEARCH');
    const brief = await options.briefs.getActiveRevision(sessionId);
    if (!brief) throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_NOT_FOUND', '开始研究前必须存在 active Design Brief');
    if (!brief.searchKeywords.some((keyword) => keyword.enabled)) throw creativeResearchSearchError('QUERY_INVALID', 'Design Brief 没有启用的 Search Keyword');
    return options.sessions.save({ ...session, status: 'RESEARCH', updatedAt: now() });
  }

  async function planInitialSearch(sessionId: string): Promise<SearchQuery[]> {
    const session = await requireSession(sessionId);
    if (session.status !== 'RESEARCH') throw creativeResearchError('CREATIVE_RESEARCH_SESSION_CONFLICT', '只有 RESEARCH Session 可以规划搜索');
    const brief = await options.briefs.getActiveRevision(sessionId);
    if (!brief) throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_NOT_FOUND', '搜索规划需要 active Design Brief');
    const queries = planInitialSearchQueries({ sessionId, brief, now, createId, batchId: createId() });
    if (!queries.length) throw creativeResearchSearchError('QUERY_INVALID', '没有可规划的 CONCEPT 或 CATEGORY Search Keyword');
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
      const page = await options.gateway.search({ sessionId, queryId, query: query.text, kind: query.kind, cursor: query.cursor });
      const stored: WebReferenceItem[] = [];
      for (const reference of page.items) {
        const value = await options.references.storeReference(reference);
        if (value.sourceType === 'WEB_REFERENCE') stored.push(value);
      }
      const completed = await options.history.recordQueryProgress(sessionId, queryId, {
        status: 'COMPLETED', provider: page.provider, completedAt: now(),
        ...(page.nextCursor ? { cursor: page.nextCursor } : {}),
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
    let index = 0;
    async function worker() {
      while (index < pending.length) {
        const query = pending[index++];
        if (query) {
          try { results.push(await executeSearchQuery(sessionId, query.id)); }
          catch (error) { failures.push(error); }
        }
      }
    }
    await Promise.all([worker(), worker()]);
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
