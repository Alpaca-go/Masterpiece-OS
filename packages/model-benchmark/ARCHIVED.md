# @masterpiece/model-benchmark — ACTIVE, NOT ARCHIVED

> **Status (2026-08-25 audit correction)**: This package was originally
> marked ARCHIVED in commit `df4d9b11`. **That verdict was incorrect.**
> The package is actively consumed by runtime-core and has a dedicated
> test file.

## Why this file exists (audit correction)

The 2026-08-25 audit (item #6.2) initially claimed this package had
"no production consumer". That claim was based on a search scoped to
`apps/web`, `apps/web-runtime`, `apps/cli`, and the npm `workspaces`
glob. **The audit missed two real consumers:**

1. `packages/runtime-core/src/application/image-generation/service.ts`
   line 77 imports `@masterpiece/model-benchmark/index.js`. This
   service is part of the shipped runtime-core service graph and is
   wired through `image-generation/service.ts` which the
   `current-operation-graph.ts` operation registry surfaces to the
   `apps/web-runtime` host.
2. `tests/model-benchmark.test.js` is a dedicated unit test that
   exercises the package's `createModelBenchmark`,
   `attachBenchmarkRuns`, and `saveHumanBenchmarkEvaluation`
   functions directly. It is part of the project's `npm test` suite
   that must stay green.

When audit H3.3 (commit this directory) tried to move the package
out of `packages/`, both consumers would have broken. The move was
rejected and the package stays in `packages/` as an active workspace
member.

## What this package is

`@masterpiece/model-benchmark` exports a 2-to-3-model human
evaluation harness with four scoring dimensions
(`brandAlignment`, `visualQuality`, `referenceCompliance`,
`commercialUsability`) and 1–5 integer scoring. It pairs with
`@masterpiece/evaluation-loop-contracts` (imported by its
`src/index.js`).

## What consumes it

| Consumer | Path | What it uses |
|---|---|---|
| `runtime-core` | `packages/runtime-core/src/application/image-generation/service.ts:77` | `createModelBenchmark`, `attachBenchmarkRuns`, `saveHumanBenchmarkEvaluation` |
| Tests | `tests/model-benchmark.test.js` | direct unit tests against the package |

## Forward guidance

- **Do not** treat this package as a candidate for removal from
  `workspaces/`. Removing it requires first refactoring
  `image-generation/service.ts` to either inline the import or move
  the consumed functions into `@masterpiece/runtime-core` itself.
- A future cleanup could consolidate the multi-model evaluation
  logic into `@masterpiece/runtime-core`, but that is structural
  refactoring and must ship its own baseline-impact analysis.
- Adding a new import from `apps/*` or `apps/web-runtime/` into this
  package is fine; the package is part of the live runtime surface.

## Audit references

- `docs/baseline/runtime-reconciliation-2026-08-25.md` (item #6.2;
  original claim, now corrected)
- Commit `df4d9b11` — first ARCHIVED.md (incorrect)
- H3.3 attempt (rejected) — would have broken
  `image-generation/service.ts` and `tests/model-benchmark.test.js`.
  The attempt was abandoned and superseded by this correction.
- This file replaces the original ARCHIVED.md. The file path stays
  the same to preserve the audit trail; only the content is corrected.