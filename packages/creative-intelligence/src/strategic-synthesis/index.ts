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
 *
 * This module does NOT call a model. Model invocation lives in
 * `runtime-core/src/application/creative-reasoning-service.ts`.
 */

export * from './contracts.ts';
export * from './compile-strategic-context.ts';
export * from './parse-strategic-synthesis.ts';
export * from './validate-strategic-synthesis.ts';
export * from './strategic-grounding-gate.ts';
export * from './build-strategic-synthesis-prompt.ts';
export * from './semantic-fingerprint.ts';
export * from './prompt-budget.ts';
