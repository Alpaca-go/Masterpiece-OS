/**
 * Evaluation diagnostic constants.
 */

import type { EvaluationDiagnosticCode } from './contracts.ts';

export const EVALUATION_DIAGNOSTIC_CODES: readonly EvaluationDiagnosticCode[] = [
  'EVAL_DIRECTION_MISSING',
  'EVAL_BLOCKED_DIRECTION',
  'EVAL_TRACE_INCOMPLETE',
  'EVAL_NO_VALID_DIRECTIONS',
  'EVAL_TIE',
  'EVAL_LOW_CONFIDENCE',
  'EVAL_RECOMMENDATION_EMPTY',
] as const;
