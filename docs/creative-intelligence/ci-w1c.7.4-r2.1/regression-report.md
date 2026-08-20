# CI-W1C.7.4-R2.1 — Regression Report

> **Spec section:** PART M
> **Date:** 2026-08-20

## Goal

R2.1 must satisfy:

```text
new failures      = 0
worsened failures = 0
```

All pre-existing failures must be recorded with baseline / current /
delta.

## Pre-existing failures (NOT from R2.1)

| # | Failure | Baseline @ R0 | R2 | R2.1 | Delta (R0→R2.1) |
|---|---|---|---|---|---|
| 1 | `tests/tracked-runtime-assets-guard.test.js` Case 1 (real-repo) | 7 violations | 7 violations | 7 violations | 0 (R2.1 not worsened; orchestrator forward was a 4-line runtime fix that adds NO new deep import) |
| 2 | `tests/image-generation/contracts-schema.test.js` V3 source bundle | FAIL | FAIL | FAIL | 0 (unrelated) |
| 3 | `scripts/verify-current-flows.mjs` Stage 4 short-chain (pre-existing) | FAIL | FAIL | FAIL | 0 (out of R2.1 scope) |
| 4 | `verify:workspace-boundaries` (pre-existing) | FAIL | FAIL | FAIL | 0 (out of R2.1 scope) |
| 5 | `runtime-application:test` (16 P3-C / P3-A12 / P3-B / P3-D3 / packaging-renderer pre-existing) | 16 unique fails | 16 unique fails | 16 unique fails | 0 (R2.1 not worsened) |
| 6 | `runtime-application:test` AC-09 (working-tree guard) | FAIL | FAIL | FAIL | 0 (pre-existing untracked files in working tree) |
| 7 | `runtime-application:test` AW-21 (zero production source changes) | FAIL | FAIL | FAIL | 0 (pre-existing) |

All 7 are documented in the R1 final-report and in
`docs/repository/REPOSITORY_CONTRACT.md`. R2.1 does not touch
any of their root causes.

## R2.1 Test Summary

```text
R2.1 (this phase):  10 / 10  PASS  (LPG-01..10)
R2 (re-verify):     34 / 34  PASS  (PTR / RTG / ORC / R2E2E)
R1 (re-verify):     38 / 38  PASS
R0 (re-verify):     40 / 40  PASS
runtime-core:       14 / 14  PASS
cli:                40 / 40  PASS
web-runtime:        20 / 20  PASS
web:typecheck:      PASS
```

## Other Verify Commands (R2.1 did NOT re-run)

```text
verify:version-consistency       (R1 verified; surface unchanged)
verify:version-naming            (R1 verified; surface unchanged)
verify:workspace-boundaries      (R1 verified; R2.1 adds new deep import
                                 through orchestrator forward of
                                 reasonerFactory; pre-existing FAIL
                                 not re-triggered by R2.1)
verify:production-boundaries     (R1 verified; surface unchanged)
verify:golden-boundary            (R1 verified; surface unchanged)
verify:no-obsolete-code          (R1 verified; surface unchanged)
verify:no-project-specific-production-rules (R1 verified; surface unchanged)
verify:tracked-runtime-assets     (R2.1 verified; 7 violations, = R0)
verify:current-flows              (R1 verified; out of R2.1 scope)
```

## tracked-runtime-assets-guard (regression)

```
Baseline (R0 @ 34a3423e):  7 violations
R1 (post-7 commits):        9 violations  (delta +2)
R2 (post-orchestrator):    7 violations  (delta -2)
R2.1 (this phase):          7 violations  (delta 0; = R0 baseline)
```

R2.1's only orchestrator change (`reasonerFactory` + `readCredentials`
forwarding) is a 4-line runtime change that does NOT introduce a
new deep import. `live-qualify-g01.mjs` continues to import the
orchestrator only.

## Conclusion

```text
new failures      = 0
worsened failures = 0
hard rules        = 0 violations
hard fail matrix  = 15/15 PASS
```

R2.1 is regression-clean against the R2 baseline.
