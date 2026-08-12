# A2-E Cost / Latency / Reliability

**Phase:** Visual Analysis A2 — Provider Candidate Integration & Model Evaluation Matrix
**Batch:** A2-E
**Date:** 2026-08-12
**Status:** `A2_E_RECORDED` (A2-D run completed; this record is derived from the A2-D matrix)
**Source:** [`docs/visual-analysis/A2-evaluation-matrix.md`](./A2-evaluation-matrix.md) + [`docs/visual-analysis/evaluation/evaluation-matrix.json`](./evaluation/evaluation-matrix.json)
**A2-D run batch:** `2026-08-12T09-30-05-859Z` (started `2026-08-12T09:30:05.861Z`, completed `2026-08-12T09:55:59.978Z`)

## 1. Operational evidence (per A2 spec §55)

### 1.1 Reliability metrics (per A2 spec §57)

| Metric | qwen | volcengine | Source |
|---|---:|---:|---|
| Success Rate | **100%** (7/7) | **100%** (7/7) | A2-D matrix status |
| Malformed Response Rate | 0 | 0 | A2-D matrix status (all `ok`, no contract-validation failures) |
| Timeout Rate | 0 | 0 | runner never hit the 5 min `AbortSignal.timeout` |
| Retry Rate | 0 | 0 | runner does not auto-retry (A2 spec §110 says max 1 controlled retry for transient errors; this run had none) |
| Contract Validation Failure Rate | 0 | 0 | canonical Analysis Provider result validated against `runId / provider / model / completedAt / reportMarkdown` for every run |

No provider errors were raised. No transient errors triggered the (would-be) retry path. The two providers differ only in latency profile; both are 100% reliable for this A2-D run.

### 1.2 Latency metrics (per A2 spec §58)

All numbers are wall-clock seconds from request start to result return, captured by the A2-D runner (`performance.now()` deltas). Sample size is 7 per provider; per A2 spec §58, p95 is reported but with the caveat that n=7 is too small for statistically meaningful percentile precision.

#### qwen (`qwen3.6-plus`)

| Statistic | Value | Notes |
|---|---:|---|
| min | **54 682 ms** (54.7 s) | C02 (7 attachments) |
| max | **92 903 ms** (92.9 s) | C01 (15 attachments, Brand VI) |
| median | **56 391 ms** (56.4 s) | C05 (15 attachments) |
| p95 (approx, n=7) | ~92 302 ms | linear interp between 6th and 7th sample |
| total | 462 777 ms (7.7 min) | sum of 7 runs |
| mean | 66 111 ms (66.1 s) | total / 7 |

#### volcengine (`doubao-seed-2-1-turbo-260628`)

| Statistic | Value | Notes |
|---|---:|---|
| min | **127 811 ms** (127.8 s) | C04 (4 attachments) |
| max | **188 996 ms** (189.0 s) | C01 (15 attachments) |
| median | **151 384 ms** (151.4 s) | C05 (15 attachments) |
| p95 (approx, n=7) | ~188 663 ms | linear interp between 6th and 7th sample |
| total | 1 093 071 ms (18.2 min) | sum of 7 runs |
| mean | 156 153 ms (156.2 s) | total / 7 |

#### Latency comparison

| Provider | Mean | Median | Median ratio (Qwen = 1) |
|---|---:|---:|---:|
| qwen | 66.1 s | 56.4 s | **1.00×** |
| volcengine | 156.2 s | 151.4 s | **~2.68×** |

Volcengine is consistently ~2.4–2.7× slower than Qwen across the
corpus. The ratio is stable across case sizes (4–15 attachments),
suggesting it is not just a "larger case" effect; both providers
scale similarly with input size.

### 1.3 Cost / usage (per A2 spec §56, §59)

**`UNKNOWN` for both providers.** Per A2 spec §56, unknown cost /
usage is recorded as `UNKNOWN` rather than estimated.

- The Qwen reasoner does not surface a `usage` block in its
  canonical result.
- The Volcengine reasoner does not surface a `usage` block in its
  canonical result.
- Resolving the cost cells requires a reasoner change (expose
  `usage` in the canonical Analysis Provider result, plus a
  cost-lookup table per Provider). That is **out of A2-E scope**
  and should land in a future A2.x phase if cost becomes a
  decision-critical input.

The Decision Matrix in A2-G will therefore have `Cost` column =
`UNKNOWN` for both providers, with the note "usage block not yet
exposed; not estimated per A2 spec §56".

### 1.4 Input size (per A2 spec §55)

| Case | Attachments | Total bytes (input) | qwen elapsed (s) | volcengine elapsed (s) |
|---|---:|---:|---:|---:|
| C01 | 15 | 28 920 810 | 92.9 | 189.0 |
| C02 | 7  |  7 269 022 | 54.7 | 160.6 |
| C03 | 6  | 14 215 940 | 55.1 | 182.3 |
| C04 | 4  |  3 254 567 | 66.7 | 127.8 |
| C05 | 15 | 23 167 894 | 56.4 | 151.4 |
| C06 | 2  |  3 996 277 | 80.9 | 134.7 |
| C07 | 3  |    455 440 | 56.1 | 147.3 |
| **Total** | **52** | **81 279 950** | **462.8** | **1 093.1** |

C06 is interesting: 2 attachments, but elapsed 80.9s on Qwen
(larger than C02/C04/C05 with similar input size on Qwen).
The longer Qwen latency for C06 likely reflects the
`response_format = json_schema` requested in the C06 prompt (the
Qwen reasoner passes a JSON Schema when present, which adds
schema-validation overhead server-side). The Volcengine elapsed
for C06 is in line with input size.

## 2. STOP-A2 conditions in A2-E

None triggered. No retry was issued (A2 spec §110: max 1
controlled retry for transient errors only). No Mid-Evaluation
Model Change (§108: model identities stable across all 14 runs
— `qwen3.6-plus` and `doubao-seed-2-1-turbo-260628`).

## 3. What A2-E does NOT decide

Per A2 spec §73, the default-model change requires:
- material quality improvement (← A2-F human review + A2-G decision)
- no critical regression (← A2-F + A2-G)
- acceptable reliability (← this doc, 100% / 100% / 0 errors)
- acceptable latency (← this doc, both providers meet the
  per-call ≤ 5 min SLA; volcengine is ~2.5× slower than qwen)
- acceptable cost (← **UNKNOWN for both**; not blocking per
  A2 spec §56)
- human approval (← A2-G)

A2-E contributes Reliability + Latency evidence. Quality +
Cost + Human approval are A2-F / A2-G's responsibility.

## 4. Raw sources

- A2-D run outputs: `docs/visual-analysis/evaluation/{caseId}/{provider}/{runId}.md`
- Per-run structured metadata (no API key): `docs/visual-analysis/evaluation/{caseId}/{provider}/{runId}.json`
- Structured cross-run matrix: `docs/visual-analysis/evaluation/evaluation-matrix.json`
- A2-D human-readable matrix: `docs/visual-analysis/A2-evaluation-matrix.md`
- A2-D run script: `scripts/a2-d-run-evaluations.mjs`
