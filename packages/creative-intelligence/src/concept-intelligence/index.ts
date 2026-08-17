/**
 * Concept Intelligence — CI-5.
 *
 * First grounded creative output: Concept Candidates.
 *
 * Opportunity-led deterministic synthesis first.
 * Gate pipeline for safety.
 * Shadow-only.
 */

export * from './contracts.ts';
export { generateConcepts } from './generate-concepts.ts';
export { validateConceptTrace, buildTransitiveTrace } from './concept-trace.ts';
export { dedupeConcepts, assessDiversity } from './concept-deduper.ts';
export { runConceptGates, runConceptGatesForSet } from './concept-gates.ts';
export { detectConceptLeakage } from './concept-leakage.ts';
export { runConceptPipeline } from './concept-pipeline.ts';
export type { ConceptPipelineInput, ConceptPipelineResult } from './concept-pipeline.ts';
