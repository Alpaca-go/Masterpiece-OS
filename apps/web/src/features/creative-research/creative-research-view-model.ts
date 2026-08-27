import type { CreativeResearchQueryDto, CreativeResearchReferenceDto } from '@masterpiece/runtime-core/application-contracts.ts';

export type ResearchUiState = 'NOT_STARTED' | 'PLANNING' | 'SEARCHING' | 'READY' | 'PARTIAL_FAILURE' | 'FAILED';

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

export function safeReferenceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
