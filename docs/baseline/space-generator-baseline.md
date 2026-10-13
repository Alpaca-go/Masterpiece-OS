# Space Generator Baseline

| Field | Current baseline |
|---|---|
| Entry | Short-Chain space family through `packages/runtime-core/src/application/image-generation/short-chain-service.ts` |
| UI | `apps/web/src/pages/ShortChainPage.tsx` |
| Service | `packages/runtime-core/src/application/image-generation/short-chain-service.ts` |
| Orchestrator | `packages/image-generation-runtime/src/generation/compile.js` (`compileShortChainGeneration`) |
| Compiler | `packages/image-generation-runtime/src/space/compiler.js` (string id `phase9b-quality-compiler`) |
| Source adapter | `packages/image-generation-runtime/src/space/source-adapter.js` |
| Prompt | deterministic blocks rendered by `packages/image-generation-runtime/src/space/compiler.js` |
| Reference layer | `packages/image-generation-runtime/src/reference-engine/reference-asset-resolver.ts` + `packages/image-generation-runtime/src/space/space-reference-policy.js` + `packages/image-generation-runtime/src/space/reference-boundary.js` |
| Constraint layer | semantic separation, target-scene authority, route/provider gates |
| Golden mode | default `r8_6_golden`; `phase9b_quality` compatible alias |
| Generator | `packages/runtime-core/src/application/image-generation/service.ts` |
| Provider | Seedream protocol/current profile via `packages/image-generation-runtime/src/generation/seedream-adapter.js` |
| Schema | generation task contract (`packages/image-generation-runtime/src/generation/task-contract.js`) and image-generation contracts |
| Fallback | `vnext_legacy` -> `packages/image-generation-runtime/src/generation/prompt-compiler.js` |
| Tests | space/reference/continuation suites plus Web smoke `apps/web-runtime/scripts/run-web-primary-smoke.mjs` |

## Active compatibility identifiers

`r8_6_golden` and `phase9b_quality` select `packages/image-generation-runtime/src/space/compiler.js`. `vnext_legacy` selects `packages/image-generation-runtime/src/generation/prompt-compiler.js`. The compiler id `phase9b-quality-compiler` stays a string. `packages/image-generation-runtime/src/vnext/` and `phase9b-space-compiler.js` are not files on this tip.

Continuation lives under `packages/image-generation-runtime/src/space/continuation/`. Target-scene projection lives under `packages/image-generation-runtime/src/space/scene-projection/`.

## Locked evidence

- `space-generator/quality-baselines/current-verification/space-golden/manifest.json` — frozen, human accepted 4/4.
- `space-generator/quality-baselines/current-verification/production-route/manifest.json` — production route and parity.
- Continuation and Reference-First evidence under `space-generator/quality-baselines/current-verification/`.

No separate R12 production compiler file was found. R12-named smoke output is not promoted to the baseline implementation.
