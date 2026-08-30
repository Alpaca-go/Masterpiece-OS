import type {
  CreativeResearchQueryDto,
  CreativeResearchReferenceAttributeDto,
  CreativeResearchReferenceDto,
  CreativeResearchReferenceSelectionDto,
} from '@masterpiece/runtime-core/application-contracts.ts';

export type ResearchUiState = 'NOT_STARTED' | 'PLANNING' | 'SEARCHING' | 'READY' | 'PARTIAL_FAILURE' | 'FAILED';
export type ReferenceResearchKind = 'CONCEPT' | 'CATEGORY';

export interface SelectionTraySummary {
  selectedCount: number;
  attributeCounts: Partial<Record<CreativeResearchReferenceAttributeDto, number>>;
}

export interface CorrectionSuggestion {
  message: string;
  actions: readonly ['REFRESH', 'ADJUST_KEYWORDS', 'REANALYZE'];
}

export function deriveSoftCorrectionSuggestion(
  queries: CreativeResearchQueryDto[],
  references: CreativeResearchReferenceDto[],
  selections: CreativeResearchReferenceSelectionDto[],
): CorrectionSuggestion | null {
  const batches = [...new Set(queries.map((query) => query.batch))];
  if (batches.length < 3) return null;
  const recentBatches = new Set(batches.slice(-3));
  const recentQueryIds = new Set(queries.filter((query) => recentBatches.has(query.batch)).map((query) => query.id));
  const recentReferenceIds = new Set(references.filter((reference) => reference.matchedQueryIds.some((id) => recentQueryIds.has(id))).map((item) => item.id));
  const judged = selections.filter((item) => recentReferenceIds.has(item.referenceId));
  const selected = judged.filter((item) => item.state === 'SELECTED').length;
  const rejected = judged.filter((item) => item.state === 'REJECTED').length;
  if (selected > 1 && rejected < Math.max(4, selected * 3)) return null;
  return {
    message: '你已经查看了多批参考，但还没有形成明显选择。当前搜索方向可能需要调整。',
    actions: ['REFRESH', 'ADJUST_KEYWORDS', 'REANALYZE'],
  };
}

export function deriveSelectionTraySummary(selections: CreativeResearchReferenceSelectionDto[]): SelectionTraySummary {
  const selected = selections.filter((selection) => selection.state === 'SELECTED');
  const attributeCounts: SelectionTraySummary['attributeCounts'] = {};
  for (const selection of selected) {
    for (const attribute of new Set(selection.selectedAttributes)) {
      attributeCounts[attribute] = (attributeCounts[attribute] || 0) + 1;
    }
  }
  return { selectedCount: selected.length, attributeCounts };
}

export function deriveResearchUiState(queries: CreativeResearchQueryDto[], busy: string): ResearchUiState {
  if (busy === 'planning') return 'PLANNING';
  if (busy === 'searching') return 'SEARCHING';
  if (!queries.length) return 'NOT_STARTED';
  const completed = queries.filter((query) => query.status === 'COMPLETED').length;
  const failed = queries.filter((query) => query.status === 'FAILED').length;
  if (failed && completed) return 'PARTIAL_FAILURE';
  if (failed && failed === queries.length) return 'FAILED';
  return completed === queries.length ? 'READY' : 'NOT_STARTED';
}

export function retryableSearchQueryIds(queries: CreativeResearchQueryDto[]): string[] {
  return queries
    .filter((query) => query.status === 'FAILED' || query.status === 'PENDING')
    .map((query) => query.id);
}

export function filterCreativeResearchReferences(
  references: CreativeResearchReferenceDto[],
  queryId: string,
): CreativeResearchReferenceDto[] {
  return queryId === 'all' ? references : references.filter((reference) => reference.matchedQueryIds.includes(queryId));
}

export function listQueriesByResearchKind(
  queries: CreativeResearchQueryDto[],
  kind: ReferenceResearchKind,
): CreativeResearchQueryDto[] {
  return queries.filter((query) => query.kind === kind);
}

export function filterReferencesByResearchKind(
  references: CreativeResearchReferenceDto[],
  queries: CreativeResearchQueryDto[],
  kind: ReferenceResearchKind,
): CreativeResearchReferenceDto[] {
  const queryIds = new Set(listQueriesByResearchKind(queries, kind).map((query) => query.id));
  return references.filter((reference) => reference.matchedQueryIds.some((queryId) => queryIds.has(queryId)));
}

export function filterReferencesForResearchView(
  references: CreativeResearchReferenceDto[],
  queries: CreativeResearchQueryDto[],
  kind: ReferenceResearchKind,
  queryId: string,
): CreativeResearchReferenceDto[] {
  const kindQueries = listQueriesByResearchKind(queries, kind);
  const kindReferences = filterReferencesByResearchKind(references, queries, kind);
  if (queryId === 'all') return kindReferences;
  if (!kindQueries.some((query) => query.id === queryId)) return [];
  return filterCreativeResearchReferences(kindReferences, queryId);
}

export function safeReferenceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
