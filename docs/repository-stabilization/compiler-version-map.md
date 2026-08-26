# Compiler and Prompt Version Map

## Compiler routing

| Compiler | Used by | Runtime role | Status | Risk |
|---|---|---|---|---|
| `vnext/compile.js::compileVNextImageGeneration` | Desktop `vnext-service` | task/router/adapter orchestration | ACTIVE_DEPENDENCY | CRITICAL |
| `space/phase9b-space-compiler.js` | default `r8_6_golden` and alias `phase9b_quality` | current Space final prompt | ACTIVE_DEPENDENCY | CRITICAL |
| `vnext/prompt-compiler.js::compileVNextPrompt` | non-space routes and `vnext_legacy` fallback | generic/legacy vNext prompt | ACTIVE_DEPENDENCY | CRITICAL |
| `task-builder.js::compileImageGenerationTaskV3` | standard Short-Chain source bundle 3.0 | deliverable routing | ACTIVE_DEPENDENCY | HIGH |
| `deliverables/deliverable-prompt-compiler.js` | task v3 | packaging/interior/etc final prompt | ACTIVE_DEPENDENCY | HIGH |
| `task-builder` v1/v2 branches | persisted old tasks and migrations | compatibility | ACTIVE_DEPENDENCY | HIGH |

There is compiler chaining: vNext orchestration creates the contract and route; Space tasks delegate to Phase9B compiler, then Seedream adapter adds provider boundary/payload semantics. Packaging bypasses the Space compiler and uses deliverable compiler.

## Prompt audit

| Prompt/resource | Used by | Output role | Status |
|---|---|---|---|
| `apps/cli/prompts/v5/deep-creative-director.md` | CLI v5 prompt builder / Web analysis | analysis system behavior | ACTIVE_DEPENDENCY |
| `benchmark-instructions.md` | CLI v5 | analysis benchmark instructions | ACTIVE_DEPENDENCY |
| `execution-core-template.md` | CLI v5 | analysis execution contract | ACTIVE_DEPENDENCY |
| `report-schema.md` | CLI v5 | report output contract | ACTIVE_DEPENDENCY |
| Space blocks rendered by `phase9b-space-compiler.js` | Reference-First and current Space | provider final prompt | ACTIVE_DEPENDENCY |
| `vnext/prompt-compiler.js` templates/contracts | fallback and non-space vNext | provider final prompt | ACTIVE_DEPENDENCY |
| `space-generator/v1-baseline/*` prompt copies | experimental comparison tests | frozen comparison | TEST_DEPENDENCY |

SHA-256 audit found exact copies between CLI v5 and `space-generator/v1-baseline` for at least `benchmark-instructions.md` and `execution-core-template.md`. This is `BEHAVIOR_SENSITIVE_DUPLICATION`; the baseline is read by tests and the production copy is active, so neither is an archive candidate.

## Safety conclusion

The apparent overlap between `vnext`, `phase9b`, and `r8_6_golden` is not interchangeable equivalence. Output-sensitive differences and runtime flags require Golden protection before compiler consolidation.
