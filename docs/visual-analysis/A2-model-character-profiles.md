# A2-F Model Character Profiles

**Phase:** Visual Analysis A2 — Provider Candidate Integration & Model Evaluation Matrix
**Batch:** A2-F
**Date:** 2026-08-12
**Status:** `A2_F_TEMPLATE_READY` (filled after A2-F human review)

## 1. Purpose

Per A2 spec §66, every candidate must end with a Model
Character Profile summarizing **strengths**, **weaknesses**,
**best-fit project types**, **failure patterns**, **cost /
latency profile**, and a **recommended role**. This document
captures both Provider profiles after the human review pass.

Each profile is filled from three sources:
- the per-run raw outputs under
  `docs/visual-analysis/evaluation/{caseId}/{provider}/`,
- the operational evidence in
  [`docs/visual-analysis/A2-cost-latency-reliability.md`](./A2-cost-latency-reliability.md),
- the human review sheet
  [`docs/visual-analysis/A2-human-review-sheet.md`](./A2-human-review-sheet.md).

## 2. Qwen (`qwen3.6-plus`)

Model identity actually returned by the API in this A2-D run:
`qwen3.6-plus` (no alias drift, per A2 spec §107).

### Strengths
- _filled after A2-F review_

### Weaknesses
- _filled after A2-F review_

### Best-fit project types
- _filled after A2-F review_

### Failure patterns observed in this run
- _filled after A2-F review_ (cite specific (Case, Provider)
  combinations and per-dimension subscores)

### Cost / latency profile (per A2-E)
- median latency 56.4 s, mean 66.1 s, p95 ~92 s
- cost per analysis: **UNKNOWN** (Qwen reasoner does not surface
  `usage`; per A2 spec §56 no estimate is made)
- success rate: 100% over 7 runs (no retries, no timeouts, no
  contract validation failures)

### Recommended role
- _filled after A2-G: DEFAULT (CONTROL) / ALTERNATIVE /
  SPECIALIST / EXPERIMENTAL / REJECTED_

## 3. Volcengine (`doubao-seed-2-1-turbo-260628`)

Model identity actually returned by the API in this A2-D run:
`doubao-seed-2-1-turbo-260628` (the dated alias the API resolves
`doubao-seed-2.1-turbo` to; matches the A2-B.2 capability probe).

### Strengths
- _filled after A2-F review_

### Weaknesses
- _filled after A2-F review_

### Best-fit project types
- _filled after A2-F review_

### Failure patterns observed in this run
- _filled after A2-F review_ (cite specific (Case, Provider)
  combinations and per-dimension subscores)

### Cost / latency profile (per A2-E)
- median latency 151.4 s, mean 156.2 s, p95 ~189 s
- cost per analysis: **UNKNOWN** (Volcengine reasoner does not
  surface `usage`; per A2 spec §56 no estimate is made)
- success rate: 100% over 7 runs (no retries, no timeouts, no
  contract validation failures)

### Recommended role
- _filled after A2-G: DEFAULT / ALTERNATIVE / SPECIALIST /
  EXPERIMENTAL / REJECTED_

## 4. Cross-provider observations (per A2 spec §67, §75)

- A model that is significantly better at one category (e.g.
  Packaging) but weaker at general VI is recorded as
  **SPECIALIST** for that category. A2 does NOT implement
  automatic routing (A2 spec §76); the role classification
  is informational only.
- If Candidate A and Qwen are within the spec §65 close-case
  band on all 7 cases, the default tie rule is **KEEP_QWEN_DEFAULT**
  (A2 spec §74). The recorded scorecard + reliability + latency
  data in this file is the input to the A2-G tie-breaking
  analysis.
- The blind reveal mapping for this A2-D run is recorded in
  the Human Review Sheet §8 (Candidate A = volcengine, Candidate
  B = qwen).
