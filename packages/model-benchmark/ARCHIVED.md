# @masterpiece/model-benchmark — ARCHIVED

> **Status (2026-08-25 audit)**: No production consumer. Retained as
> `workspaces` member for historical reference only.

## Why this file exists

Internal audit (`docs/baseline/runtime-reconciliation-2026-08-25.md`,
item #6.2) verified that `@masterpiece/model-benchmark` is **not imported
by any active runtime path**:

- `apps/web/src/**` — 0 references
- `apps/web-runtime/src/**` — 0 references
- `apps/cli/src/**` — 0 references
- `packages/runtime-core/src/**` — 0 references

## What's in the package

The package exports `createModelBenchmark`, `attachBenchmarkRuns`,
and `saveHumanBenchmarkEvaluation` (see `src/index.js`). It is paired
with `@masterpiece/evaluation-loop-contracts`, which it deep-imports.

The contract describes a 2-to-3 model human-evaluation harness with
four dimensions (`brandAlignment`, `visualQuality`,
`referenceCompliance`, `commercialUsability`) and 1–5 integer scoring.

## Why it is not in the runtime

- The P0 baseline (`masterpiece-reference-first-stable-2026-08`) ships
  with a single-model Seedream path (`imageGenerationPipelineMode: vnext`).
- Multi-model A/B benchmarking is not part of any shipped user surface.
- No UI surface, no IPC operation, no event channel wires this package.

## Forward guidance

- **Do not import this package from new code** without an accompanying
  product surface. Adding an import without an IPC + UI entry will
  produce dead weight identical to what this audit caught.
- If a future product surface genuinely needs multi-model benchmarking,
  resurrect the package in a separate change that ships the surface
  (operation, channel, UI panel, smoke evidence) in the same change.
- Removal from `workspaces` is intentionally **not** part of this
  audit's cleanup scope. Doing so without a recorded decision would
  erase the audit trail.

## Audit references

- `docs/baseline/runtime-reconciliation-2026-08-25.md` (audit notes)
- `CURRENT_BASELINE.md` §6 (provider baseline; baseline-critical
  multi-model benchmarking is not currently listed)