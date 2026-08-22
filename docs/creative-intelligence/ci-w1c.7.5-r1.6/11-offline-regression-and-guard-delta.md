# Offline Regression and Guard Delta

## Focused suites

| Suite | Result |
|---|---:|
| R1 aggregate | 96/96 PASS |
| MOCK-01..08 | 8/8 PASS |
| TIMEOUT-01..06 | 6/6 PASS |
| RETRY-01..07 | 7/7 PASS |
| TAX-01..06 | 6/6 PASS |
| EVID-TR-01..04 | 4/4 PASS |
| Transport contract combined | 23/23 PASS |
| R2 | 34/34 PASS |
| R2.1 | 10/10 PASS |
| Strategic SR | 11/11 PASS |
| SG13/mirror | 8/8 PASS |
| QR | 5/5 PASS |
| SCOPE | 6/6 PASS |
| TRACE | 5/5 PASS |

## Wider verification

- Web typecheck: PASS
- CLI: 40/40 PASS
- web-runtime: 20/20 PASS
- Web build: PASS, with the existing non-blocking chunk-size warning
- root `npm test`: 1660/1662; the two known repository-state failures remain the V3 source-bundle expectation and tracked-runtime-assets declarations
- runtime test: 1621/1638; 17 existing historical clean-tree/frozen-diff/UI assertions fail outside the R1.6 changed surface

## Guards

Version consistency, version naming, production boundaries, no project-specific production rules, Golden boundary, no obsolete code, A4, and repository guard tests (40/40) all PASS. `repo:verify` stops on the existing RC005 frozen planning fixtures and RC007 local-artifact dependency. No production code changed in R1.6 and no new phase-relevant guard violation was introduced.

Guard delta: 0.
