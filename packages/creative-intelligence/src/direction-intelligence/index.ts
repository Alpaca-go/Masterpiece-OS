/**
 * Direction Intelligence — CI-6.
 *
 * First visual-system output: Creative Direction Candidates.
 *
 * Concept-led deterministic synthesis first.
 * 11-gate pipeline for safety.
 * Family-difference evaluation for diversity.
 * Shadow-only.
 */

export * from './contracts.ts';
export { generateDirections } from './generate-directions.ts';
export { validateDirectionTrace, buildDirectionTransitiveTrace } from './direction-trace.ts';
export { evaluateDirectionFamilyDifference } from './direction-family.ts';
export { dedupeDirections } from './direction-deduper.ts';
export { runDirectionGates, runDirectionGatesForSet } from './direction-gates.ts';
export { detectDirectionLeakage } from './direction-leakage.ts';
export { runDirectionPipeline } from './direction-pipeline.ts';
export { DIRECTION_DIAGNOSTIC_CODES } from './diagnostics.ts';
export type { DirectionPipelineInput, DirectionPipelineResult } from './direction-pipeline.ts';
