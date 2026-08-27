export type CreativeResearchDirectionErrorCode =
  | 'CREATIVE_RESEARCH_DIRECTION_SESSION_NOT_FOUND'
  | 'CREATIVE_RESEARCH_DIRECTION_INVALID_STATE'
  | 'CREATIVE_RESEARCH_DIRECTION_BOARD_NOT_FOUND'
  | 'CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED'
  | 'CREATIVE_RESEARCH_DIRECTION_STORE_FAILED'
  | 'CREATIVE_RESEARCH_DIRECTION_CONTEXT_NOT_FOUND'
  | 'CREATIVE_RESEARCH_DIRECTION_CONTEXT_IMMUTABLE'
  | 'CREATIVE_RESEARCH_DIRECTION_CONFIRMATION_REQUIRED';

export class CreativeResearchDirectionError extends Error {
  readonly code: CreativeResearchDirectionErrorCode;

  constructor(code: CreativeResearchDirectionErrorCode, message: string, options?: ErrorOptions) {
    super(`${code}: ${message}`, options);
    this.name = 'CreativeResearchDirectionError';
    this.code = code;
  }
}

export function creativeResearchDirectionError(
  code: CreativeResearchDirectionErrorCode,
  message: string,
  options?: ErrorOptions,
): CreativeResearchDirectionError {
  return new CreativeResearchDirectionError(code, message, options);
}
