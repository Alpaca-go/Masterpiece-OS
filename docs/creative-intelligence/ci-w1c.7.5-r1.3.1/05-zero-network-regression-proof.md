# Zero-Network Regression Proof

## Focused proof

| Suite | Result |
| --- | --- |
| SG13-01..05 | 5/5 PASS |
| SG-12/14/15 positive and drift audit | 2/2 PASS |
| Prompt mirror contract | 1/1 PASS |
| QR-01..05 | 5/5 PASS |
| Strategic SR focused suite | 11/11 PASS |
| Combined focused | 24/24 PASS |

SG13-01 reproduces the R1.3 shape with 10 Truth facts, 7 allowed facts, and an artifact mirroring the 7 visible IDs. It now passes. SG13-02..04 reject complete-Truth, missing-ID, and invented-ID mirror drift. SG13-05 proves an excluded Truth ID in `factRefs` still fails SG-01.

## R1 / R2 / R2.1

- R1 including R1.3.1: 51/51 PASS;
- R2: 34/34 PASS;
- R2.1: 10/10 PASS;
- combined: **95/95 PASS**;
- creative reasoning orchestration mock plus R2.1 wiring: 12/12 PASS.

## Wider tests

| Command | Result |
| --- | --- |
| `npm run web:typecheck` | PASS |
| `npm run cli:test` | 40/40 PASS |
| shared-runtime portion of `npm run runtime:test` | 14/14 PASS |
| runtime application | 1621/1638; 17 existing frozen-diff/UI/branch-cleanliness failures |
| `npm run web-runtime:test` | 20/20 PASS |
| `npm test` | 1615/1617; same 2 existing failures |

## Guards

PASS: version consistency, version naming, production boundaries, no project-specific production rules, Golden boundary, no obsolete code, A4 aggregate, and repository guard tests 40/40.

Recorded existing failures:

- `repo:verify`: RC007 x1 and RC005 x2;
- workspace boundaries: 25 deep imports across 18 files, plus verifier `ReferenceError: dir is not defined`;
- tracked runtime assets: 14 existing findings, none in an R1.3.1 changed file;
- baseline drift checker reports the repository's existing drift from its historical recovery anchor.

The new tests use the package export rather than adding deep imports, so workspace-boundary counts did not increase. Guard delta attributable to R1.3.1: **none**.

## Call accounting

- live model calls: 0;
- image calls: 0;
- G01 reruns: 0;
- G02 executions: 0.
