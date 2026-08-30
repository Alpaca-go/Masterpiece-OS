import crypto from 'node:crypto';
import type { CreativeResearchPlan, DesignBrief, SearchKeyword, SearchQuery, SearchQueryKind } from './creative-research/contracts.ts';
import { creativeResearchSearchError } from './creative-research-search-errors.ts';
import { lockQueryToPlatform } from './creative-research-platform-query-compiler.ts';
import type { VisualReferencePlatform } from './creative-research/contracts.ts';

export interface InitialSearchPlanOptions {
  sessionId: string;
  plan: CreativeResearchPlan;
  now?: () => string;
  createId?: () => string;
  batchId?: string;
  maxQueries?: number;
}

export interface KeywordAdjustmentSearchPlanOptions {
  sessionId: string;
  brief: DesignBrief;
  now?: () => string;
  createId?: () => string;
  batchId?: string;
  maxQueries?: number;
}

function clean(value: string): string {
  return value.replace(/([，,。.!！?？；;：:、])\1+/gu, '$1').replace(/\s+/gu, ' ').trim();
}

function comparisonKey(value: string): string {
  return clean(value).replace(/[，,。.!！?？；;：:、]+/gu, ' ').replace(/\s+/gu, ' ').trim().toLocaleLowerCase();
}

function buildQuery(
  sessionId: string,
  kind: SearchQueryKind,
  primary: SearchKeyword,
  visual: SearchKeyword | undefined,
  batch: string,
  createdAt: string,
  createId: () => string,
): SearchQuery {
  const parts = [primary, visual].filter((item): item is SearchKeyword => Boolean(item));
  return {
    id: createId(),
    sessionId,
    text: parts.map((item) => clean(item.value)).join(' '),
    kind,
    batch,
    status: 'PENDING',
    derivedFromKeywordIds: parts.map((item) => item.id),
    createdAt,
    origin: 'INITIAL',
  };
}

export function planInitialSearchQueries(options: InitialSearchPlanOptions): SearchQuery[] {
  if (options.plan.sessionId !== options.sessionId) {
    throw creativeResearchSearchError('QUERY_INVALID', 'Research Plan 与 Creative Research Session 不匹配');
  }
  const createId = options.createId || (() => crypto.randomUUID());
  const createdAt = (options.now || (() => new Date().toISOString()))();
  const batch = options.batchId || createId();
  const tracks = new Map(options.plan.tracks.map((track) => [track.id, track]));
  const seen = new Set<string>();
  const maxQueries = Math.min(10, Math.max(6, options.maxQueries ?? 9));
  const queries = options.plan.firstRoundQueries.flatMap((planned) => {
    const track = tracks.get(planned.trackId);
    const text = clean(planned.text);
    const key = comparisonKey(text);
    if (!track?.firstRoundEligible || !text || !key || seen.has(key)) return [];
    seen.add(key);
    return [{
      id: createId(),
      sessionId: options.sessionId,
      text,
      kind: planned.kind,
      batch,
      status: 'PENDING' as const,
      derivedFromKeywordIds: [...track.clueIds],
      researchTrackId: track.id,
      round: 'INITIAL' as const,
      intent: planned.intent || 'KNOWLEDGE',
      locale: planned.locale || 'ZH',
      ...(planned.groupId ? { groupId: planned.groupId } : {}),
      ...(planned.platform ? { platform: planned.platform } : {}),
      createdAt,
      origin: 'INITIAL' as const,
    }];
  }).slice(0, maxQueries);
  if (queries.length < Math.min(6, options.plan.firstRoundQueries.length)) throw creativeResearchSearchError('QUERY_INVALID', 'Research Plan 未提供足够的有效首轮 Query');
  return queries;
}

export function planKeywordAdjustmentQueries(options: KeywordAdjustmentSearchPlanOptions): SearchQuery[] {
  if (options.brief.sessionId !== options.sessionId) {
    throw creativeResearchSearchError('QUERY_INVALID', 'Design Brief 与 Creative Research Session 不匹配');
  }
  const enabled = options.brief.searchKeywords.filter((keyword) => keyword.enabled && clean(keyword.value));
  const concepts = enabled.filter((keyword) => keyword.kind === 'CONCEPT').slice(0, 2);
  const categories = enabled.filter((keyword) => keyword.kind === 'CATEGORY').slice(0, 2);
  const visuals = enabled.filter((keyword) => keyword.kind === 'VISUAL');
  const createId = options.createId || (() => crypto.randomUUID());
  const createdAt = (options.now || (() => new Date().toISOString()))();
  const batch = options.batchId || createId();
  const planned = [
    ...concepts.map((keyword, index) => buildQuery(options.sessionId, 'CONCEPT', keyword, visuals[index], batch, createdAt, createId)),
    ...categories.map((keyword, index) => buildQuery(options.sessionId, 'CATEGORY', keyword, visuals[concepts.length + index] || visuals[index], batch, createdAt, createId)),
  ];
  const maxQueries = Math.min(4, Math.max(1, options.maxQueries ?? 4));
  const seen = new Set<string>();
  const platforms: VisualReferencePlatform[] = ['ZCOOL', 'HUABAN', 'PINTEREST'];
  return planned.filter((query) => {
    const key = comparisonKey(query.text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, maxQueries).map((query, index) => {
    const platform = platforms[index % platforms.length]!;
    return { ...query, text: lockQueryToPlatform(query.text, platform), round: 'REFINEMENT' as const,
      intent: 'VISUAL' as const, locale: platform === 'PINTEREST' ? 'EN' as const : 'ZH' as const, platform };
  });
}
