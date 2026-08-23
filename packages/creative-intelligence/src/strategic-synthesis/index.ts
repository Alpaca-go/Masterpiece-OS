/**
 * CI-W1C.7 — Strategic Synthesis (CI-4B) module.
 *
 * Public surface:
 *   - `compileStrategicReasoningContext` — deterministic input compiler
 *   - `parseStrategicSynthesis` — strict JSON parser
 *   - `validateStrategicSynthesisStructural` — light structural check
 *   - `runStrategicGroundingGate` — SG-01..10 grounding gate
 *   - `buildStrategicSynthesisPrompt` — full planning semantics prompt
 *   - `semanticSha256` / `strategicInputFingerprint` / `conceptInputFingerprint` /
 *     `directionInputFingerprint` — CI-W1C.7.1A canonical fingerprint
 *   - `checkPromptBudget` / `DEFAULT_QUALIFICATION_BUDGET` — CI-W1C.7.1A budget gate
 *   - `STRATEGIC_SYNTHESIS_*` constants and types
 *   - CI-W1C.7.4 planning-strategic-evidence surface (see
 *     `planning-strategic-evidence.ts`, `planning-source-registration.ts`,
 *     `build-planning-strategic-evidence.ts`, `epistemic-routing.ts`)
 *
 * This module does NOT call a model. Model invocation lives in
 * `runtime-core/src/application/creative-reasoning-service.ts`.
 */

export * from './contracts.ts';
export * from './compile-strategic-context.ts';
export * from './parse-strategic-synthesis.ts';
export * from './validate-strategic-synthesis.ts';
export * from './strategic-grounding-gate.ts';
export * from './ground-truth-anchor-retention.ts';
export * from './build-strategic-synthesis-prompt.ts';
export * from './semantic-fingerprint.ts';
export * from './prompt-budget.ts';
export * from './planning-strategic-evidence.ts';
export * from './planning-source-registration.ts';
export * from './build-planning-strategic-evidence.ts';
export * from './epistemic-routing.ts';
export * from './epistemic-classifier.ts';
// CI-W1C.7.5-R1
export * from './structured-extraction-coverage.ts';
export * from './document-context-to-planning-claims.ts';
// CI-W1C.7.5-R1.2
export * from './planning-semantic-extraction.ts';
// CI-W1C.7.5-R1.3.1
export * from './qualification-review.ts';
// CI-W1C.7.5-R1.4.1
export * from './qualification-audit.ts';
