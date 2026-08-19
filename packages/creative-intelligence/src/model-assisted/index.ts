/**
 * CI-W1C.7 — Model-Assisted Concept + Direction (CI-5B / CI-6B) module.
 *
 * Public surface:
 *   - `parseModelAssistedConceptSet` / `parseModelAssistedDirectionSet`
 *   - `runModelAssistedConceptGates` (MC-01..10)
 *   - `runModelAssistedDirectionGates` (MD-01..12)
 *   - `computeTemplateEcho` (template-echo detector)
 *   - `getTemplateEchoCorpus` (test seam; corpus is project-agnostic)
 *   - All contract types
 *
 * This module does NOT call a model. Model invocation lives in
 * `runtime-core/src/application/creative-reasoning-service.ts`.
 */

export * from './contracts.ts';
export * from './parse-model-assisted.ts';
export * from './template-echo.ts';
export * from './concept-gates.ts';
export * from './direction-gates.ts';
