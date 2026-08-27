export const CREATIVE_RESEARCH_CORRECTION_ERROR_CODES = [
  'CREATIVE_RESEARCH_REFRESH_NO_NOVEL_QUERY',
  'CREATIVE_RESEARCH_CORRECTION_PROFILE_REQUIRED',
  'CREATIVE_RESEARCH_CORRECTION_PROFILE_UNSUPPORTED',
  'CREATIVE_RESEARCH_CORRECTION_MODEL_FAILED',
  'CREATIVE_RESEARCH_CORRECTION_OUTPUT_INVALID',
  'CREATIVE_RESEARCH_CORRECTION_SOURCE_INVALID',
  'CREATIVE_RESEARCH_CORRECTION_INPUT_INVALID',
] as const;

export type CreativeResearchCorrectionErrorCode = typeof CREATIVE_RESEARCH_CORRECTION_ERROR_CODES[number];

export class CreativeResearchCorrectionError extends Error {
  readonly code: CreativeResearchCorrectionErrorCode;
  constructor(code: CreativeResearchCorrectionErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'CreativeResearchCorrectionError';
    this.code = code;
  }
}

export function creativeResearchCorrectionError(
  code: CreativeResearchCorrectionErrorCode,
  message: string,
  options?: { cause?: unknown },
): CreativeResearchCorrectionError {
  return new CreativeResearchCorrectionError(code, message, options);
}
