# S3 Archive Candidates

## Executed

| Candidate | Confidence | Result | Reason |
|---|---|---|---|
| `apps/desktop/scripts/space-r10-archive/` (4 files) | HIGH | `SAFE_TO_ARCHIVE` / S3-D-01 | Completed one-shot baseline construction and closeout utilities; zero current runtime, package script, test, dynamic-load, and baseline dependencies |

## Deferred

| Candidate | Confidence | Result | Reason |
|---|---|---|---|
| Versioned `evaluation/reports/*` | MEDIUM | `DEFER_TO_S4_OR_LATER` | Historical evidence is isolated, but selected reports remain Golden inputs and the family is intentionally retained as evaluation evidence |
| Exact duplicate baseline prompts/traces/payloads | MEDIUM | `DEFER_TO_S4_OR_LATER` | Physical duplication does not prove architectural redundancy; several copies are current regression evidence |

## Rejected

| Candidate | Result | Reason |
|---|---|---|
| `apps/desktop/scripts/r85-redirect-stability-smoke.ts` | `REJECTED_FOR_ARCHIVE` / KEEP | Reused by the protected R8.6 final smoke and later continuation workflows |
| Versioned Desktop real-provider runners exposed by `apps/desktop/package.json` | `REJECTED_FOR_ARCHIVE` / KEEP | Current package-script and release-smoke dependencies |
| `space-generator/v1-experimental/` | `REJECTED_FOR_ARCHIVE` / KEEP | Root package scripts and current tests directly execute this isolated experiment suite |
| R8.6/R9/R10/R11 quality baselines | `REJECTED_FOR_ARCHIVE` / KEEP | Current tests and Golden Regression consume these artifacts |
| CLI v5, vNext, Phase9B, Desktop shared core, providers | `REJECTED_FOR_ARCHIVE` / KEEP | Active runtime or baseline-critical dependencies |

## Unknown

| Candidate | Confidence | Result | Reason |
|---|---|---|---|
| `history/reviews/` and ignored local history | LOW | `UNKNOWN` / KEEP | Ignored contents are outside the tracked repository contract and usage cannot be proven |
