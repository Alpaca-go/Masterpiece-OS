import crypto from 'node:crypto';
import type { DesignBrief, SearchKeyword, SearchKeywordKind, SearchQuery } from './creative-research/contracts.ts';
import { DESIGN_BRIEF_FIELDS, SEARCH_KEYWORD_KINDS } from './creative-research/contracts.ts';
import { assertDesignBriefRevision } from './creative-research/evidence.ts';
import type { CreativeResearchSessionRepository, DesignBriefRepository, ReferenceResearchRepository, SearchHistoryRepository } from './creative-research/ports.ts';
import { planInitialSearchQueries } from './creative-research-search-query-planner.ts';
import { creativeResearchCorrectionError } from './creative-research-correction-errors.ts';
import { creativeResearchError } from './creative-research-errors.ts';

export interface ResearchSearchKeywordUpdate {
  id?: string;
  value: string;
  kind: SearchKeywordKind;
  enabled?: boolean;
  rationale?: string;
  locale?: string;
}

export interface ResearchSearchStrategyUpdate {
  conceptKeywords?: string[];
  visualKeywords?: string[];
  searchKeywords?: ResearchSearchKeywordUpdate[];
  designerNote?: string;
}

const ALLOWED_KEYS = new Set(['conceptKeywords', 'visualKeywords', 'searchKeywords', 'designerNote']);
function clean(value: string): string { return String(value || '').replace(/\s+/gu, ' ').trim(); }
function cleanList(values: string[] | undefined, fallback: string[], cap: number): string[] {
  if (values === undefined) return [...fallback];
  return [...new Set(values.map(clean).filter(Boolean))].slice(0, cap);
}
function normalized(value: string): string { return clean(value).toLocaleLowerCase(); }

export function createCreativeResearchSearchStrategyService(options: {
  sessions: CreativeResearchSessionRepository;
  briefs: DesignBriefRepository;
  history: SearchHistoryRepository;
  references: ReferenceResearchRepository;
  now?: () => string;
  createId?: () => string;
}) {
  const now = options.now || (() => new Date().toISOString());
  const createId = options.createId || (() => crypto.randomUUID());

  async function requireResearch(sessionId: string) {
    const session = await options.sessions.get(sessionId);
    if (!session) throw creativeResearchError('CREATIVE_RESEARCH_SESSION_NOT_FOUND', `Creative Research Session 不存在：${sessionId}`);
    if (session.status !== 'RESEARCH') throw creativeResearchError('CREATIVE_RESEARCH_SESSION_CONFLICT', '调整关键词只允许在 RESEARCH 阶段执行');
    const brief = await options.briefs.getActiveRevision(sessionId);
    if (!brief) throw creativeResearchError('CREATIVE_RESEARCH_BRIEF_NOT_FOUND', '调整关键词需要 active Design Brief');
    return { session, brief };
  }

  function reviseKeywords(previous: DesignBrief, briefId: string, updates: ResearchSearchKeywordUpdate[] | undefined, timestamp: string): SearchKeyword[] {
    if (!updates) return previous.searchKeywords.map((item) => ({ ...item, briefId }));
    const priorById = new Map(previous.searchKeywords.map((item) => [item.id, item]));
    const seen = new Set<string>();
    return updates.slice(0, 24).flatMap((update) => {
      const value = clean(update.value);
      if (!value || !SEARCH_KEYWORD_KINDS.includes(update.kind)) throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_INPUT_INVALID', 'Search Keyword 内容或类型无效');
      const key = `${update.kind}:${normalized(value)}`;
      if (seen.has(key)) return [];
      seen.add(key);
      const prior = update.id ? priorById.get(update.id) : undefined;
      const unchanged = Boolean(prior) && prior!.value === value && prior!.kind === update.kind
        && (prior!.rationale || '') === (update.rationale || '') && (prior!.locale || '') === (update.locale || '');
      return [{
        id: unchanged ? prior!.id : createId(), briefId, value, kind: update.kind,
        source: unchanged ? prior!.source : 'DESIGNER', enabled: update.enabled ?? prior?.enabled ?? true,
        ...(update.rationale ? { rationale: clean(update.rationale) } : {}),
        ...(update.locale ? { locale: clean(update.locale) } : {}),
        createdAt: unchanged ? prior!.createdAt : timestamp,
      } satisfies SearchKeyword];
    });
  }

  async function updateResearchSearchStrategy(sessionId: string, patch: ResearchSearchStrategyUpdate): Promise<DesignBrief> {
    const illegal = Object.keys(patch as Record<string, unknown>).filter((key) => !ALLOWED_KEYS.has(key));
    if (illegal.length) throw creativeResearchCorrectionError('CREATIVE_RESEARCH_CORRECTION_INPUT_INVALID', `RESEARCH 搜索策略禁止修改事实字段：${illegal.join(', ')}`);
    const { session, brief: previous } = await requireResearch(sessionId);
    const timestamp = now();
    const briefId = createId();
    const searchKeywords = reviseKeywords(previous, briefId, patch.searchKeywords, timestamp);
    const fieldEvidence = { ...(previous.fieldEvidence || {}) };
    if (patch.conceptKeywords !== undefined) delete fieldEvidence.conceptKeywords;
    if (patch.visualKeywords !== undefined) delete fieldEvidence.visualKeywords;
    const next: DesignBrief = {
      ...previous,
      id: briefId,
      revision: previous.revision + 1,
      conceptKeywords: cleanList(patch.conceptKeywords, previous.conceptKeywords, 12),
      visualKeywords: cleanList(patch.visualKeywords, previous.visualKeywords, 12),
      searchKeywords,
      designerNotes: patch.designerNote ? [...previous.designerNotes, clean(patch.designerNote)].slice(-32) : previous.designerNotes,
      fieldEvidence,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    assertDesignBriefRevision(previous, next);
    const nextByPriorId = new Map(searchKeywords.map((item) => [item.id, item]));
    const removed = previous.searchKeywords.filter((item) => item.enabled && (!nextByPriorId.has(item.id) || nextByPriorId.get(item.id)?.enabled === false));
    await options.briefs.saveRevision(next);
    await options.sessions.save({ ...session, activeDesignBriefId: next.id, updatedAt: timestamp });
    for (const keyword of removed) {
      await options.references.saveNegativeSignal({
        id: createId(), sessionId, type: 'REMOVE_KEYWORD', scope: 'KEYWORD', sourceKeywordId: keyword.id,
        value: keyword.value, reason: patch.designerNote ? clean(patch.designerNote) : '设计师移除或停用搜索关键词', actor: 'DESIGNER', createdAt: timestamp,
      });
    }
    return next;
  }

  async function planKeywordAdjustmentSearch(sessionId: string): Promise<SearchQuery[]> {
    const { brief } = await requireResearch(sessionId);
    const history = await options.history.listSessionSearchHistory(sessionId);
    const batch = createId();
    const historical = new Set(history.flatMap((item) => [item.text, item.providerQueryText || '']).map(normalized).filter(Boolean));
    const planned = planInitialSearchQueries({ sessionId, brief, now, createId, batchId: batch, maxQueries: 4 })
      .filter((item) => !historical.has(normalized(item.text)))
      .map((item) => ({ ...item, origin: 'KEYWORD_ADJUSTMENT' as const, excludeSeen: true,
        parentQueryIds: history.at(-1) ? history.filter((query) => query.batch === history.at(-1)!.batch).map((query) => query.id) : undefined }));
    if (!planned.length) throw creativeResearchCorrectionError('CREATIVE_RESEARCH_REFRESH_NO_NOVEL_QUERY', '调整后的关键词没有产生新的搜索组合，请继续修改关键词。');
    for (const query of planned) await options.history.appendQuery(query);
    return planned;
  }

  return Object.freeze({ updateResearchSearchStrategy, planKeywordAdjustmentSearch });
}
