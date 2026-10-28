# S4-D-01 — Visual Analysis Core Boundary

Capability: Structured analysis completion and host-specific prompt-root resolution

Old Owner: The Desktop pipeline imported the analysis package root and read Electron `app` state directly.

New Owner: `@masterpiece/analysis-runtime/core/visual-analysis-core.ts` owns the shared capability boundary. Desktop owns only `analysis-runtime-adapter.ts`, which translates Electron application paths into the runtime adapter contract.

## Moved Files

None. This is an adapter-first extraction because the current analysis pipeline still composes Desktop project storage and CLI v5 execution.

## New Files

- `packages/analysis-runtime/src/core/visual-analysis-core.ts`
- `apps/desktop/src/main/analysis-runtime-adapter.ts`
- `tests/packages/analysis-runtime/visual-analysis-core-facade.test.js`
- This batch manifest

## Compatibility Adapters

The existing analysis package exports remain intact. The new facade re-exports the same structured-completion function object, so there is no second implementation.

## Import Changes

- The active pipeline imports structured analysis through the shared Core facade.
- `pipeline-service.ts` no longer imports Electron.
- Desktop startup and authorized smoke runners inject the Desktop prompt-root adapter explicitly.

## Runtime Changes

None. Prompt files, prompt content, provider request shape, retries, checkpoint logic, report generation and CLI v5 pipeline loading remain unchanged.

## Golden Coverage

- G-01/G-02/G-03 analysis compatibility
- G-04 analysis capability status

## Verification

Pre-Test: Unit 713/713 PASS; CLI 40/40 PASS; Desktop build PASS; Web Smoke PASS; Golden 5/5 PASS; Provider calls 0.

Post-Test: Unit 714/714 PASS; CLI 40/40 PASS; Desktop build PASS; Web Smoke PASS; Golden 5/5 PASS (G-04 NOT_APPLICABLE); Provider calls 0; Golden auto-update disabled.

## Rollback

Restore the package-root import and Electron prompt-root lookup inside `pipeline-service.ts`; remove the shared facade, Desktop adapter and identity test.

Result: PASS.
