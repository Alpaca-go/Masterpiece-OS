# Zero-Network Regression Proof

## Mandatory qualification checks

| Group | Result |
|---|---:|
| G02SRC-01..04 | 4/4 PASS |
| G02SRC-05 | FAIL — 0 independence dimensions, minimum 3 |
| G02ROLE-01..02 | 2/2 PASS |
| G02ANCHOR-01/04/05/08 | 4 PASS |
| G02ANCHOR-02/03/06/07 | 4 BLOCKED by source-selection failure |
| G02READY-07..08 | 2/2 PASS |
| BASELINE-01..20 | 20/20 PASS |

The source-selection verifier exits non-zero because `G02SRC-05` correctly fails. This is the required fail-closed outcome, not a verifier defect.

## Focused partitions

| Partition | Result |
|---|---:|
| R1 | 96/96 PASS |
| R2 | 34/34 PASS |
| R2.1 | 10/10 PASS |
| MOCK file | 9/9 PASS, including MOCK-01..08 |
| Transport | 23/23 PASS |
| Strategic SR | 11/11 PASS |
| SG13/mirror | 8/8 PASS |
| QR | 5/5 PASS |
| SCOPE/TRACE file | 13/13 PASS, including SCOPE 6/6 and TRACE 5/5 |

## Wider verification

- Web typecheck: PASS;
- CLI: 40/40 PASS;
- Web Runtime: 20/20 PASS;
- Web build: PASS with the existing non-blocking chunk-size warning;
- Runtime Core partition: 14/14 PASS;
- Runtime Application partition: 1621/1638, retaining the existing 17 UI/historical-diff/dirty-worktree assertions;
- full root `npm test` equivalent: 1563/1566. The two known V3/tracked-assets failures remain, plus one existing nondeterministic CI-1B parity failure whose test identity changed across identical reruns;
- relevant version, naming, production-boundary, no-project-rule, Golden-boundary, no-obsolete-code, A4, and repository guard checks PASS; repository guard tests are 40/40.

No failing output names an R1.8 changed file or production semantic path. Guard delta: 0.

Zero-execution record:

- successful external network I/O: 0;
- Provider/model calls: 0;
- downloads: 0;
- G02 executions: 0;
- G01 Attempt 6: 0;
- Image calls: 0;
- parent directory scans: 0;
- sibling source reads: 0.
