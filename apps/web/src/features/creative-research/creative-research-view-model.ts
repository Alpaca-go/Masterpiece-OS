import type { CreativeResearchQueryDto, CreativeResearchReferenceDto } from '@masterpiece/runtime-core/application-contracts.ts';

export type ResearchUiState = 'NOT_STARTED' | 'PLANNING' | 'SEARCHING' | 'READY' | 'PARTIAL_FAILURE' | 'FAILED';
export type ReferenceResearchKind = 'CONCEPT' | 'CATEGORY';

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
