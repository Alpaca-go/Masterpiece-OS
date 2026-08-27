import crypto from 'node:crypto';
import type { DesignBrief, SearchKeyword, SearchQuery, SearchQueryKind } from './creative-research/contracts.ts';
import { creativeResearchSearchError } from './creative-research-search-errors.ts';

export interface InitialSearchPlanOptions {
  sessionId: string;
  brief: DesignBrief;
  now?: () => string;
  createId?: () => string;
  batchId?: string;
  maxQueries?: number;
}

function clean(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
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
  };
}

export function planInitialSearchQueries(options: InitialSearchPlanOptions): SearchQuery[] {
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
  return planned.slice(0, maxQueries);
}
