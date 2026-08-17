/**
 * Direction Evaluation — CI-7.
 *
 * Deterministic evaluation, ranking, and recommendation of validated
 * Creative Directions.
 *
 * Recommendation ≠ Selection. Selection is a separate namespace.
 */

export * from './contracts.ts';
export { evaluateDirection } from './evaluation-dimensions.ts';
export { rankEvaluations } from './ranking.ts';
export { recommend } from './recommendation.ts';
export { buildTradeoffAnalysis } from './tradeoff-analysis.ts';
export { evaluateDirections } from './evaluate-directions.ts';
export { EVALUATION_DIAGNOSTIC_CODES } from './diagnostics.ts';
export type { DirectionTradeoff } from './tradeoff-analysis.ts';
