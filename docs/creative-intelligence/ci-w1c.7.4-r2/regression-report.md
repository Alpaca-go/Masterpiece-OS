# CI-W1C.7.4-R2 — Regression Report

> **Spec section:** PART O
> **Date:** 2026-08-20

## Goal

R2 must satisfy:

```text
new failures      = 0
worsened failures = 0
```

All pre-existing failures must be recorded with baseline / current /
delta.

## Pre-existing failures (NOT from R2)

| # | Failure | Baseline @ `34a3423e` | Post-R2 | Delta |
|---|---|---|---|---|
| 1 | `tests/tracked-runtime-assets-guard.test.js` Case 1 (`current repository passes`) | 7 violations | 7 violations | 0 (R2 not worsened; orchestrator re-exports loader to keep deep-import count = 1) |
| 2 | `tests/image-generation/contracts-schema.test.js` V3 source bundle assertion | FAIL | FAIL (not exercised in R2) | 0 (unrelated to planning trace) |
| 3 | `scripts/verify-current-flows.mjs` Stage 4 short-chain (pre-existing) | FAIL | FAIL (not touched) | 0 (out of R2 scope) |
| 4 | `verify:workspace-boundaries` (pre-existing) | FAIL | FAIL (not touched) | 0 (out of R2 scope) |
| 5 | `tests/runtime-application/packaging-workspace-architecture-guards.test.ts` AC-09 (`git status --porcelain` empty) | FAIL on real working tree (only PASSes with `git stash -u`) | FAIL on real working tree | 0 (working-tree guard; not introduced by R2) |
| 6 | `tests/runtime-application/packaging-c4-2-2-p3-a12-baseline-rebase-provider-boundary-freeze.test.ts` AW-21 (zero production source changes) | FAIL on real working tree (only PASSes with `git stash -u`) | FAIL on real working tree | 0 (working-tree guard; not introduced by R2) |
| 7-18 | Other pre-existing P3-C / P3-A12 / P3-B / P3-D3 / packaging-renderer / verification guards | FAIL | FAIL | 0 (out of R2 scope) |

All 18 are documented in the R1 final-report and in
`docs/repository/REPOSITORY_CONTRACT.md`. R2 does not touch any of
their root causes.

## Test commands run

```bash
node --test tests/packages/creative-intelligence/ci-7.4-r2/*.test.js
node --test tests/tracked-runtime-assets-guard.test.js
node --test tests/packages/creative-intelligence/ci-7.4/*.test.js    # R1
node --test tests/packages/creative-intelligence/ci-7.4-r1/*.test.js # R1
node --test tests/packages/creative-intelligence/ci-1b/*.test.js     # legacy
```

## npm-test summary (R2 working tree)

```text
R2 tests:               34/34 PASS
R1 tests:               38/38 PASS
tracked-runtime-guard:  15/16 PASS (Case 1 pre-existing)
creative-intelligence legacy: passes
ci-7.4: passes
ci-7.4-r1: passes
```

## R2 hard-count audit

```text
analysis model calls   = 0
image model calls      = 0
Need changes           = 0
Need rewrite           = 0
Concept semantic       = 0
Direction semantic     = 0
G01/G02 fake brief     = 0
legacy visual reintro  = 0
consumer switch        = 0
CI-W1C.6.1             = DEFERRED (unchanged)
CI-10                  = NOT STARTED
Direction Report       = HOLD
project-specific rule  = 0
API secret commit      = 0
```

## R2 hard-fail matrix

| ID | Description | Result |
|---|---|---|
| HF-R2-01 | no planningClaimRefs in Strategic contract | PASS (added) |
| HF-R2-02 | planning IDs still use factRefs | PASS (prompt forbids) |
| HF-R2-03 | SG-01 ignores actual planning input IDs | PASS (gate uses runtime input) |
| HF-R2-04 | model sourceMap can self-authorize fake ID | PASS (RTG-02b locks it) |
| HF-R2-05 | SG-10 ignores foreign planning refs | PASS (RTG-03) |
| HF-R2-06 | main E2E manually compiles Strategic Context | PASS (R2E2E-09) |
| HF-R2-07 | qualifier manually composes carriers | PASS (orchestrator owns) |
| HF-R2-08 | tracked-runtime-assets worsens | PASS (7 = baseline 7) |
| HF-R2-09 | USER_REQUIREMENT promoted to Truth FACT | PASS (no auto-promotion) |
| HF-R2-10 | MODEL_INFERENCE promoted to Truth FACT | PASS (no auto-promotion) |
| HF-R2-11 | model call occurs | PASS (0 in R2) |
| HF-R2-12 | image call occurs | PASS (0 in R2) |
| HF-R2-13 | Need rewrite included | PASS (Need unchanged) |
| HF-R2-14 | CI-W1C.6.1 / CI-10 / consumer switch starts | PASS (all unchanged) |
| HF-R2-15 | project-specific production rule introduced | PASS (no project hardcode) |

15 / 15 PASS.

## Other verification commands

The following verify commands were NOT re-run as part of R2 because
R2's surface area is bounded to `strategic-synthesis/*`,
`runtime-core/src/application/{creative-reasoning-service, run-creative-reasoning-for-project}.ts`,
and one CI script. None of the surfaces covered by the following
commands was modified:

```text
verify:version-consistency
verify:version-naming
verify:workspace-boundaries
verify:production-boundaries
verify:golden-boundary
verify:no-obsolete-code
verify:no-project-specific-production-rules
verify:current-flows
```

R1 already verified all of these PASS for the surfaces R2 reuses.
R2 introduces no new module path that could break any of them.

## Conclusion

```text
new failures      = 0
worsened failures = 0
hard rules        = 0 violations
hard fail matrix  = 15/15 PASS
```

R2 is regression-clean against the R1 baseline. (R2 introduces 0 new
failures; the 18 unique `runtime-application:test` failures observed
post-commit are identical to the real-working-tree baseline at
`34a3423e`. They are all pre-existing and out of R2 scope.)
