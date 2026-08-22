# Zero-Network Regression Proof

This phase used local repository inspection, one authorized replacement-source read, local deterministic classification and offline tests only.

| Counter | Value |
|---|---:|
| Successful external network I/O during qualification/tests | 0 |
| Provider/model calls | 0 |
| Downloads | 0 |
| G02 executions | 0 |
| G02 Attempt 1 | 0 |
| Image calls | 0 |

The final user-requested Git push is a delivery action, not qualification network I/O.

## Qualification checks

- `G02RSRC-01..07`: 7/7 PASS.
- `G02ROLE-01..03`: 2/3 PASS; `G02ROLE-02` fails because the deterministic source role is `UNKNOWN_SOURCE`.
- `G02ANCHOR-01..12`: 5/12 PASS; the seven content/review checks fail closed because anchor construction is blocked by the role gate.
- `VERIFIER-01..06`: 6/6 PASS.
- `BASELINE-01..20`: 20/20 PASS; full G01 verifier output is 26/26 including G02READY-01..06.

## Focused partitions

| Partition | Result |
|---|---:|
| R1 | 96/96 PASS |
| R2 | 34/34 PASS |
| R2.1 | 10/10 PASS |
| MOCK | 9/9 PASS |
| Transport | 23/23 PASS |
| Strategic SR | 11/11 PASS |
| SG13/mirror | 8/8 PASS |
| QR | 5/5 PASS |
| SCOPE/TRACE file | 13/13 PASS |

## Root test labeling

- **Actual full `npm test`: NOT COMPLETED.** The environment has no npm CLI; no partition is relabeled as an npm run.
- **Root non-R1 partition:** 1,563/1,566. Existing failures: V3 source-bundle expectation, nondeterministic CI-1B timestamp parity, and tracked-runtime-assets current-repository state.
- **Focused R1:** 96/96.
- **Combined partition equivalent:** 1,659/1,662.
- **Exact full-script Node invocation:** 1,660/1,662. The same V3 and tracked-assets failures remained; the CI-1B parity test passed in this invocation, confirming the previously recorded timing nondeterminism.

## Wider checks

- CLI: 40/40 PASS.
- Runtime Core: 14/14 PASS.
- Web Runtime: 20/20 PASS.
- Runtime Application: 1,621/1,638; 17 existing UI/historical-diff/dirty-worktree assertions fail outside the A.1 changed surface.
- Web typecheck: PASS.
- Web build: PASS with the existing non-blocking chunk-size warning.
- Version, naming, production-boundary, project-rule, Golden-boundary, no-obsolete-code and all six A4 guards: PASS.
- Repository guard tests: 40/40 PASS.
- Guard delta attributable to A.1: 0.
