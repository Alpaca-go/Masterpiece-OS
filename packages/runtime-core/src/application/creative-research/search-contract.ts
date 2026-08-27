import type { SearchResultPage } from './ports.ts';
import { SEARCH_QUERY_KINDS } from './contracts.ts';
import { assertJsonSerializable, assertWebReferenceResult } from './evidence.ts';

export function assertSearchResultPage(page: SearchResultPage, expected?: { query?: string }): void {
  if (!page.query.trim()) throw new Error('search result page requires query');
  if (expected?.query !== undefined && page.query !== expected.query) throw new Error('search result page query mismatch');
  if (!page.provider.trim()) throw new Error('search result page requires provider');
  if (!Array.isArray(page.items)) throw new Error('search result page items must be an array');
  for (const item of page.items) assertWebReferenceResult(item, page.provider);
  assertJsonSerializable(page, 'searchResultPage');
}

export function assertReferenceSearchInput(input: {
  query: string;
  kind: string;
  cursor?: string;
  limit?: number;
  exclusions?: { referenceIds?: string[]; domains?: string[]; urls?: string[] };
}): void {
  if (!input.query.trim()) throw new Error('search input requires query');
  if (!SEARCH_QUERY_KINDS.includes(input.kind as typeof SEARCH_QUERY_KINDS[number])) throw new Error('search input kind is invalid');
  if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100)) {
    throw new Error('search input limit must be an integer between 1 and 100');
  }
  const exclusions = input.exclusions;
  if (exclusions) {
    for (const key of Object.keys(exclusions)) {
      if (!['referenceIds', 'domains', 'urls'].includes(key)) throw new Error(`search exclusion field is invalid: ${key}`);
    }
    for (const values of Object.values(exclusions)) {
      if (values !== undefined && (!Array.isArray(values) || values.some((value) => typeof value !== 'string'))) {
        throw new Error('search exclusions must contain string arrays');
      }
    }
  }
  assertJsonSerializable(input, 'searchInput');
}
