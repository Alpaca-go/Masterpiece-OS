export type CreativeResearchPreferenceErrorCode =
  | 'CREATIVE_RESEARCH_PREFERENCE_MIN_SELECTION_REQUIRED'
  | 'CREATIVE_RESEARCH_PREFERENCE_PROFILE_REQUIRED'
  | 'CREATIVE_RESEARCH_PREFERENCE_PROFILE_UNSUPPORTED'
  | 'CREATIVE_RESEARCH_PREFERENCE_MODEL_FAILED'
  | 'CREATIVE_RESEARCH_PREFERENCE_OUTPUT_INVALID'
  | 'CREATIVE_RESEARCH_PREFERENCE_EVIDENCE_INVALID'
  | 'CREATIVE_RESEARCH_PREFERENCE_STORE_FAILED';

export class CreativeResearchPreferenceError extends Error {
  readonly code: CreativeResearchPreferenceErrorCode;

  constructor(code: CreativeResearchPreferenceErrorCode, message: string, options?: ErrorOptions) {
    super(`${code}: ${message}`, options);
    this.name = 'CreativeResearchPreferenceError';
    this.code = code;
  }
}

export function creativeResearchPreferenceError(
  code: CreativeResearchPreferenceErrorCode,
  message: string,
  options?: ErrorOptions,
): CreativeResearchPreferenceError {
  return new CreativeResearchPreferenceError(code, message, options);
}
