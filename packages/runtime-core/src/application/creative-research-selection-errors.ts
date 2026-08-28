export type CreativeResearchSelectionErrorCode =
  | 'CREATIVE_RESEARCH_SELECTION_NOT_FOUND'
  | 'CREATIVE_RESEARCH_SELECTION_REFERENCE_NOT_FOUND'
  | 'CREATIVE_RESEARCH_SELECTION_SESSION_COMPLETED'
  | 'CREATIVE_RESEARCH_SELECTION_STORE_FAILED';

export class CreativeResearchSelectionError extends Error {
  readonly code: CreativeResearchSelectionErrorCode;

  constructor(code: CreativeResearchSelectionErrorCode, message: string, options?: ErrorOptions) {
    super(`${code}: ${message}`, options);
    this.name = 'CreativeResearchSelectionError';
    this.code = code;
  }
}

export function creativeResearchSelectionError(
  code: CreativeResearchSelectionErrorCode,
  message: string,
  options?: ErrorOptions,
): CreativeResearchSelectionError {
  return new CreativeResearchSelectionError(code, message, options);
}
