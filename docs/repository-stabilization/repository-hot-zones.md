# Repository Hot Zones

## RED — behavior/current runtime

- `apps/desktop/src/renderer/src/` Web/Short-Chain UI.
- `apps/desktop/src/main/index.ts`, `web-rpc-server.ts`, `pipeline-service.ts`.
- `apps/desktop/src/main/image-generation/`, especially all `vnext-*` services.
- `apps/cli/src/v5` and `apps/cli/prompts/v5` (hidden current analysis core).
- `packages/image-generation-runtime/src/vnext` and `src/space`.
- reference resolver, Reference Boundary, target-scene projection, continuation contracts and authority/integrity gates.
- `packages/model-runtime`, `model-registry`, image adapters/providers.
- schemas and project/image-generation contracts.
- `space-generator/quality-baselines/current-verification/space-golden` and its golden-boundary verifier.
- `apps/desktop/scripts/run-web-primary-smoke.mjs` (`PROTECTED_BASELINE_INFRASTRUCTURE`).

## ORANGE — active validation, adapters, historical dependency

- `tests/`, Desktop tests, versioned regression tests.
- `space-generator/quality-baselines/r9*`, `r10*`, `r11*`, R2-B4 smoke evidence.
- `space-generator/v1-baseline` and `v1-experimental` because named root tests depend on them.
- `labs/*`: isolated from production but internally version-coupled and tested.
- version-named real-provider/phase smoke runners.
- `evaluation/`: production-isolated but release/behavior evidence.
- `apps/desktop/scripts/space-r10-archive`: UNKNOWN manual tooling.

## GREEN — documentation/historical only

- `docs/archive/v3.3`.
- `docs/archive/v4.0`.
- `space-generator/archaeology/reports`.
- documentation-only version references proven outside runtime/test imports.

GREEN means lower runtime sensitivity, not `DELETE NOW`. No S0 path receives deletion permission.

## Cross-cutting risks

- `MASTERPIECE_SPACE_COMPILER_MODE`, `MASTERPIECE_PROMPT_ROOT`, provider profile protocol and packaged filesystem paths create dependencies a static import graph alone misses.
- Prompt/compiler/reference/schema/provider files are behavior-sensitive even when hashes or APIs look similar.
- Desktop is directory-labeled Legacy Runtime but hosts Primary Web shared core; directory-level cleanup is especially unsafe.
