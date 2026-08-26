# Space Generator Baseline

| Field | Current baseline |
|---|---|
| Entry | Desktop `image-generation:vnext-*` IPC |
| UI | `VNextGenerationWorkspace.tsx` |
| Service | `apps/desktop/src/main/image-generation/vnext-service.ts` |
| Orchestrator | `packages/image-generation-runtime/src/vnext/compile.js` |
| Compiler | `src/space/phase9b-space-compiler.js` |
| Source adapter | `src/space/phase9b-source-adapter.js` |
| Prompt | deterministic blocks rendered by current Space compiler |
| Reference layer | resolver + space-reference-policy + Reference Boundary |
| Constraint layer | semantic separation, target-scene authority, route/provider gates |
| Golden mode | default `r8_6_golden`; `phase9b_quality` compatible alias |
| Generator | Desktop image-generation service |
| Provider | Seedream protocol/current profile |
| Schema | vNext task contract (`schemaVersion: 1.0`) and image-generation contracts |
| Fallback | `vnext_legacy` -> `vnext/prompt-compiler.js` |
| Tests | R8.6/R9/R10/R11/R2 suites plus Web smoke |

## Active historical layers

The current implementation is the R9 productionized Phase9B compiler with R8.6 Golden parity identity, followed by R10 semantic/route/Reference-First repairs and R11 continuation/R11.2 target-scene authority. Every layer remains baseline-critical.

## Locked evidence

- `space-generator/quality-baselines/current-verification/space-golden/manifest.json` — frozen, human accepted 4/4.
- `space-generator/quality-baselines/current-verification/production-route/manifest.json` — R9 production route and parity.
- R10/R11/R2 regression cases — current behavior and accepted Reference-First/continuation evidence.

No R12 production compiler was found. R12-named smoke output is not promoted to the baseline implementation.
