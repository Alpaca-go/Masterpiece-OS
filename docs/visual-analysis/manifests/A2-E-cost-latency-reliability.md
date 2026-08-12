# A2-E Manifest

**Batch:** A2-E — Cost / Latency / Reliability
**Purpose:** Record operational evidence from the A2-D
Cross-Model Evaluation Matrix run; surface Reliability
(§57), Latency (§58), and Cost (§59) for the A2-G
Production Default Decision.
**Status:** `A2_E_RECORDED` (2026-08-12, derived from
A2-D run batch `2026-08-12T09-30-05-859Z`)

## Files

### Created
- `docs/visual-analysis/A2-cost-latency-reliability.md` — the
  A2-E record (human-readable + numbers).

### Source (already in repo)
- `docs/visual-analysis/A2-evaluation-matrix.md`
- `docs/visual-analysis/evaluation/evaluation-matrix.json`
- `docs/visual-analysis/evaluation/{caseId}/{provider}/{runId}.md`
- `docs/visual-analysis/evaluation/{caseId}/{provider}/{runId}.json`
- `scripts/a2-d-run-evaluations.mjs` (the runner that produced
  the matrix)

## Reliability summary

- Success Rate: **100% / 100%** (qwen / volcengine, 7/7 each)
- Malformed Response Rate: 0
- Timeout Rate: 0
- Retry Rate: 0
- Contract Validation Failure Rate: 0

## Latency summary

| Provider | Median (s) | Mean (s) | Total (s) | Median ratio |
|---|---:|---:|---:|---:|
| qwen | 56.4 | 66.1 | 462.8 | 1.00× |
| volcengine | 151.4 | 156.2 | 1 093.1 | 2.68× |

Both providers meet the per-call ≤ 5 min SLA. Volcengine is
~2.4–2.7× slower than qwen; the ratio is stable across case
sizes.

## Cost summary

`UNKNOWN` for both providers. Neither Qwen reasoner nor
Volcengine reasoner surfaces a `usage` block in the canonical
Analysis Provider result. Per A2 spec §56, no estimate is
made. Resolving the cost cells requires a reasoner change (out
of A2-E scope).

## STOP conditions encountered

None. No retry issued. No mid-evaluation model change
(A2 spec §108: model identities stable across all 14 runs).

## Verification

- Source data is `docs/visual-analysis/evaluation/evaluation-matrix.json`
  (committed in A2-D, `9136214`).
- Latency stats recomputed from the matrix as a one-off (no
  new automated gate; the matrix JSON is the canonical
  source).
- Reliability metrics are derived from `status: "ok"` on
  every row of the matrix.

## Rollback

This doc is purely derived from the A2-D matrix. Deleting it
does not affect the matrix. Re-deriving it is idempotent.

## A2-E exit gate

- [x] Reliability metrics recorded per A2 spec §57
- [x] Latency metrics recorded per A2 spec §58 (median, p95
  approx, min, max)
- [x] Cost recorded as `UNKNOWN` per A2 spec §56 (no estimate)
- [x] Input size recorded per A2 spec §55
- [x] No STOP-A2 conditions triggered

A2-F (Human Visual Review) is the next batch. A2-F needs a
scorecard template (Provider × Case × Rubric Dimension)
and a blind review protocol (A2 spec §112). LLM Judge
(A2 spec §63) may be used as secondary evidence.
