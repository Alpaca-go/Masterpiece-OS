# Compatibility Baseline

Identifiers below remain required. Several old directory names are absent on tip `codex/visual-migration-vm1-integration-freeze`. Absence of a directory does not authorize deleting the identifier.

| Dependency | Where it lives on this tip | Status |
|---|---|---|
| Analysis pipeline | `apps/cli/src/analysis-engine/bootstrap.js`, entered from `packages/runtime-core/src/application/pipeline-service.ts` | ACTIVE_DEPENDENCY |
| Analysis prompts | `apps/cli/prompts/analysis/` | ACTIVE_DEPENDENCY |
| Project config filename `masterpiece-os-v5.json` | discovered by `apps/cli/src/analysis-engine/bootstrap.js` | ACTIVE_DEPENDENCY |
| Reference First | `packages/runtime-core/src/application/reference-first-reconstruction.ts` and `packages/runtime-core/src/application/image-generation/short-chain-service.ts` | ACTIVE_RUNTIME |
| `vnext_legacy` compiler mode | `packages/image-generation-runtime/src/generation/compile.js` selects `packages/image-generation-runtime/src/generation/prompt-compiler.js` | ACTIVE_DEPENDENCY |
| Persisted `vnext-1.0` run contract | `packages/runtime-core/src/application/image-generation/short-chain-service.ts` | ACTIVE_DEPENDENCY |
| task/schema `1.0` | persisted legacy tasks/runs and tests | LEGACY_DEPENDENCY |
| task/schema `2.0` | migration/retry source into V3 | COMPATIBILITY |
| `r8_6_golden` | default mode for `packages/image-generation-runtime/src/space/compiler.js`; parity and release boundary | TEST_DEPENDENCY / LOCKED |
| `phase9b_quality` and compiler id `phase9b-quality-compiler` | same production compiler as `r8_6_golden` | ACTIVE_DEPENDENCY |
| Continuation and target-scene behavior | `space/continuation/` and `space/scene-projection/` | ACTIVE_DEPENDENCY |
| optional generation adapters | profile/protocol-driven shared service compatibility | ACTIVE_DEPENDENCY |

`apps/cli/src/v5/`, `apps/cli/prompts/v5/`, `packages/image-generation-runtime/src/vnext/`, `phase9b-space-compiler.js`, and `apps/desktop/` are not on this tip. Desktop was removed in S5.

The registry of persisted identifiers is `config/repository-contract/compatibility-registry.json`. This page does not edit it.

Names such as old, legacy, v5, or vnext do not authorize deletion. Compatibility can only be reduced after S2 behavior protection and a separately authorized migration/removal phase.
