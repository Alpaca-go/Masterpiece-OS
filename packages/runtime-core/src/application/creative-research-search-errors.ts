export const CREATIVE_RESEARCH_SEARCH_ERROR_CODES = [
  'SEARCH_CREDENTIAL_REQUIRED',
  'AUTH_FAILED',
  'QUERY_INVALID',
  'RATE_LIMITED',
  'TIMEOUT',
  'PROVIDER_FAILED',
  'RESPONSE_INVALID',
  'STORE_FAILED',
  'QUERY_NOT_FOUND',
] as const;

export type CreativeResearchSearchErrorCode = typeof CREATIVE_RESEARCH_SEARCH_ERROR_CODES[number];

export class CreativeResearchSearchError extends Error {
  readonly code: CreativeResearchSearchErrorCode;
  readonly retryable: boolean;

  constructor(code: CreativeResearchSearchErrorCode, message: string, options?: { retryable?: boolean; cause?: unknown }) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'CreativeResearchSearchError';
    this.code = code;
    this.retryable = options?.retryable === true;
  }
}

export function creativeResearchSearchError(
  code: CreativeResearchSearchErrorCode,
  message: string,
  options?: { retryable?: boolean; cause?: unknown },
): CreativeResearchSearchError {
  return new CreativeResearchSearchError(code, message, options);
}

export function asCreativeResearchSearchError(error: unknown): CreativeResearchSearchError {
  if (error instanceof CreativeResearchSearchError) return error;
  return creativeResearchSearchError('PROVIDER_FAILED', error instanceof Error ? error.message : 'Reference search failed', { cause: error });
}
