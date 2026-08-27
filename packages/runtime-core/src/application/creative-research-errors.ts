export const CREATIVE_RESEARCH_ERROR_CODES = [
  'CREATIVE_RESEARCH_SESSION_NOT_FOUND',
  'CREATIVE_RESEARCH_SESSION_CONFLICT',
  'CREATIVE_RESEARCH_DOCUMENT_UNSUPPORTED',
  'CREATIVE_RESEARCH_DOCUMENT_READ_FAILED',
  'CREATIVE_RESEARCH_DOCUMENT_EMPTY',
  'CREATIVE_RESEARCH_MODEL_FAILED',
  'CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID',
  'CREATIVE_RESEARCH_BRIEF_NOT_FOUND',
  'CREATIVE_RESEARCH_BRIEF_CONFLICT',
  'CREATIVE_RESEARCH_BRIEF_WRITE_FAILED',
] as const;

export type CreativeResearchErrorCode = typeof CREATIVE_RESEARCH_ERROR_CODES[number];

export class CreativeResearchError extends Error {
  readonly code: CreativeResearchErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: CreativeResearchErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'CreativeResearchError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export function creativeResearchError(
  code: CreativeResearchErrorCode,
  message: string,
  details: Record<string, unknown> = {},
): CreativeResearchError {
  return new CreativeResearchError(code, message, details);
}
