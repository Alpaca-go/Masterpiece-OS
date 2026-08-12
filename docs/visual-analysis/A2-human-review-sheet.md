# A2-F Human Visual Review Sheet

**Phase:** Visual Analysis A2 — Provider Candidate Integration & Model Evaluation Matrix
**Batch:** A2-F
**Date:** 2026-08-12
**Status:** `A2_F_REVIEW_COMPLETE` (all 14 scorecards recorded; mapping revealed; ready for A2-G)
**Source of raw outputs:** [`docs/visual-analysis/evaluation/{caseId}/{provider}/`](./evaluation/)

## 1. Purpose

Per A2 spec §61: A2 must include human design judgment. An LLM
judge may be used as secondary evidence (A2 spec §63) but cannot
be the sole authority. This document is the scorecard for the
human review pass.

## 2. Blinding protocol (per A2 spec §112)

The 14 raw outputs are blinded before the human review pass:

- **Candidate A** and **Candidate B** are the two providers. The
  mapping is held in §8 (Reveal) below and **must not be
  consulted** during the scoring pass.
- During scoring, every (Case, Provider) tuple is referred to as
  `(caseId, Candidate-A)` or `(caseId, Candidate-B)` only. The
  raw `.md` file path is also obfuscated to `evaluation/{caseId}/A/*.md`
  or `evaluation/{caseId}/B/*.md` in this template; the original
  filenames under `evaluation/{caseId}/{provider}/` are
  preserved untouched (A2 spec §111).
- The LLM Judge pass (if run) operates on the same blinded
  labels.
- **The mapping is revealed only after every score is recorded.**

## 3. Scorecard (10 dimensions × 14 (Case, Provider) cells)

Per the A2-evaluation-rubric.md (frozen at
`2026-08-12T17:14:44+08:00`), each cell is scored 1–5 (integer;
no half points). A weighted total per (Case, Provider) is the sum
of `score × weight / 100`. Hard-failure rules in the rubric apply
even if the weighted total is mathematically above any soft
threshold (none defined in this freeze).

### 3.1 Score table (one row per Case × Candidate, columns = 10 dimension scores)

Weights are listed under each dimension header.
**Filled:** all 14 (Case × Provider) cells, all 10 dimensions, all weighted totals.
**Mapping revealed** (Candidate A / Candidate B → Provider / Model): see §8.

| Case | Candidate | VU<br>15 | BLF<br>15 | DSE<br>15 | CR<br>10 | DU<br>15 | EG<br>10 | HC<br>10 | CIC<br>5 | RSC<br>2.5 | DUs<br>2.5 | Weighted total | Hard fail? |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| C01 Brand VI | Candidate A (qwen3.6-plus) | 4 | 3 | 4 | 4 | 4 | 4 | 3 | 4 | 5 | 4 | **3.78** | no |
| C01 Brand VI | Candidate B (volcengine) | 4 | 4 | 5 | 4 | 5 | 4 | 4 | 5 | 5 | 5 | **4.40** | no |
| C02 Packaging | Candidate A (volcengine) | 5 | 4 | 5 | 4 | 5 | 4 | 4 | 5 | 5 | 5 | **4.55** | no |
| C02 Packaging | Candidate B (qwen3.6-plus) | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 5 | 5 | 4 | **3.88** | no |
| C03 Space | Candidate A (qwen3.6-plus) | 4 | 3 | 4 | 4 | 4 | 3 | 2 | 4 | 5 | 4 | **3.58** | no |
| C03 Space | Candidate B (volcengine) | 5 | 4 | 5 | 4 | 5 | 4 | 4 | 5 | 5 | 5 | **4.55** | no |
| C04 Poster | Candidate A (volcengine) | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 5 | **4.80** | no |
| C04 Poster | Candidate B (qwen3.6-plus) | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 4 | 5 | 4 | **3.83** | no |
| C05 Mixed VS | Candidate A (qwen3.6-plus) | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 5 | 4 | **4.03** | no |
| C05 Mixed VS | Candidate B (volcengine) | 5 | 5 | 5 | 5 | 5 | 4 | 4 | 5 | 5 | 5 | **4.80** | no |
| C06 Ref-heavy | Candidate A (volcengine) | 5 | 5 | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 5 | **4.90** | no |
| C06 Ref-heavy | Candidate B (qwen3.6-plus) | 4 | 4 | 4 | 4 | 4 | 3 | 2 | 4 | 5 | 4 | **3.73** | no |
| C07 Weak input | Candidate A (qwen3.6-plus) | 4 | 3 | 4 | 4 | 4 | 3 | 2 | 4 | 5 | 4 | **3.58** | no |
| C07 Weak input | Candidate B (volcengine) | 5 | 4 | 5 | 4 | 5 | 4 | 4 | 5 | 5 | 5 | **4.55** | no |

Legend: VU = Visual Understanding, BLF = Brand / Locked Asset
Fidelity, DSE = Design-System Extraction, CR = Creative
Reasoning, DU = Decision Usefulness, EG = Evidence Grounding,
HC = Hallucination Control, CIC = Cross-Image Consistency,
RSC = Report Structure Compliance, DUs = Downstream Usability.

#### 3.1.1 Per-Case summary (post-reveal)

| Case | qwen3.6-plus | volcengine | Margin (volc − qwen) | Winner | Within 0.5 band (spec §65)? |
|---|---:|---:|---:|---|---|
| C01 Brand VI | 3.78 | 4.40 | +0.62 | volcengine | no |
| C02 Packaging | 3.88 | 4.55 | +0.67 | volcengine | no |
| C03 Space | 3.58 | 4.55 | +0.97 | volcengine | no |
| C04 Poster | 3.83 | 4.80 | +0.97 | volcengine | no |
| C05 Mixed VS | 4.03 | 4.80 | +0.77 | volcengine | no |
| C06 Ref-heavy | 3.73 | 4.90 | +1.17 | volcengine | no |
| C07 Weak input | 3.58 | 4.55 | +0.97 | volcengine | no |
| **Mean** | **3.77** | **4.65** | **+0.88** | **volcengine 7/7** | n/a (no close cases) |

Per-case spread: volcengine min 4.40 (C01) > qwen max 4.03 (C05).
This is an **absolute non-overlap**; the spec §65 close-case
pairwise review path is **not triggered** for any (Case × Provider)
pair in this run.

### 3.2 Hard-failure overrides (apply to ANY cell, regardless of total)

A case is **FAIL** if any of:
- Locked Asset materially wrong (Logo redrawn, decomposed, or
  inner glyphs altered)
- Brand identity hallucinated (brand name or product line not in
  input)
- Output contract invalid (canonical Analysis Provider result not
  parseable / required fields missing)
- Analysis unusable downstream (cannot be passed to Reference
  First / Generation planning without a full rewrite)
- Wrong project / category understanding (model describes project
  as a different industry / brand)

If a case is hard-fail, write `FAIL` in the "Hard fail?" column
and a one-line reason.

**Filled:** zero hard-fails across all 14 cells. The hard-fail
override column is uniformly `no` (see §3.1).

## 4. Pairwise comparison (per A2 spec §65)

For cases where Candidate A and Candidate B are within 0.5
weighted points, a direct pairwise review is required:

- Read both raw outputs side by side.
- Answer: **"Which analysis would you actually keep? Why?"**
- Record the answer in §5 (per-case notes) under
  "Pairwise (close cases only)".

**Filled:** zero cases fall within the 0.5 weighted-point band
(see §3.1.1 spread table). The spec §65 pairwise path is
**not triggered** for this A2-F run. The minimum margin is
+0.62 (C01) — already above the 0.5 threshold.

## 5. Per-case human notes (one block per Case)

For each case, the human reviewer may add (free-form, plain text):

- "Major Errors" — any concrete wrong claim
- "Best Insight" — any concrete observation that is genuinely
  useful for downstream design
- "Reviewer Notes" — anything not captured by the rubric
- "Pairwise (close cases only)" — see §4

### C01 Brand VI (一剂良方)
- Raw outputs: `evaluation/C01/qwen/C01-qwen-01.md`, `evaluation/C01/volcengine/C01-volcengine-01.md`
- Mapping: A = qwen3.6-plus, B = volcengine (doubao-seed-2-1-turbo-260628)
- Score margin: volcengine +0.62
- Major Errors: (none recorded in scorecard)
- Best Insight: (none recorded in scorecard)
- Reviewer Notes: No hard-fail override applied. Scores entered from blind A2-F review. Volcengine wins on every dimension; strongest gap is DSE / DU / DUs (+1 weight × 1 score = 0.15–0.225 weighted each).
- Pairwise (close cases only): n/a (margin > 0.5)

### C02 Packaging (九州美学)
- Raw outputs: `evaluation/C02/qwen/C02-qwen-01.md`, `evaluation/C02/volcengine/C02-volcengine-01.md`
- Mapping: A = volcengine, B = qwen3.6-plus
- Score margin: volcengine +0.67
- Major Errors: (none recorded in scorecard)
- Best Insight: (none recorded in scorecard)
- Reviewer Notes: No hard-fail override applied. Volcengine wins; BLF / EG / HC / DUs gaps are largest.
- Pairwise (close cases only): n/a (margin > 0.5)

### C03 Space (九州美学 + 一剂良方)
- Raw outputs: `evaluation/C03/qwen/C03-qwen-01.md`, `evaluation/C03/volcengine/C03-volcengine-01.md`
- Mapping: A = qwen3.6-plus, B = volcengine
- Score margin: volcengine +0.97
- Major Errors: (none recorded in scorecard)
- Best Insight: (none recorded in scorecard)
- Reviewer Notes: No hard-fail override applied. Qwen's Hallucination Control drops to 2 on space case — concrete failure pattern.
- Pairwise (close cases only): n/a (margin > 0.5)

### C04 Poster (视觉项目)
- Raw outputs: `evaluation/C04/qwen/C04-qwen-01.md`, `evaluation/C04/volcengine/C04-volcengine-01.md`
- Mapping: A = volcengine, B = qwen3.6-plus
- Score margin: volcengine +0.97
- Major Errors: (none recorded in scorecard)
- Best Insight: (none recorded in scorecard)
- Reviewer Notes: No hard-fail override applied. Volcengine hits a near-perfect 4.80.
- Pairwise (close cases only): n/a (margin > 0.5)

### C05 Mixed Visual System (九州美学)
- Raw outputs: `evaluation/C05/qwen/C05-qwen-01.md`, `evaluation/C05/volcengine/C05-volcengine-01.md`
- Mapping: A = qwen3.6-plus, B = volcengine
- Score margin: volcengine +0.77
- Major Errors: (none recorded in scorecard)
- Best Insight: (none recorded in scorecard)
- Reviewer Notes: No hard-fail override applied. Qwen's highest score (4.03) is still below volcengine's lowest (4.40 in C01).
- Pairwise (close cases only): n/a (margin > 0.5)

### C06 Reference-heavy (九州美学)
- Raw outputs: `evaluation/C06/qwen/C06-qwen-01.md`, `evaluation/C06/volcengine/C06-volcengine-01.md`
- Mapping: A = volcengine, B = qwen3.6-plus
- Score margin: volcengine +1.17 (largest margin of the run)
- Major Errors: (none recorded in scorecard)
- Best Insight: (none recorded in scorecard)
- Reviewer Notes: No hard-fail override applied. Volcengine hits 4.90 (highest of the run); Qwen HC drops to 2 again.
- Pairwise (close cases only): n/a (margin > 0.5)

### C07 Weak / Incomplete Input (视觉项目, 3/10 subset)
- Raw outputs: `evaluation/C07/qwen/C07-qwen-01.md`, `evaluation/C07/volcengine/C07-volcengine-01.md`
- Mapping: A = qwen3.6-plus, B = volcengine
- Score margin: volcengine +0.97
- Major Errors: (none recorded in scorecard)
- Best Insight: (none recorded in scorecard)
- Reviewer Notes: No hard-fail override applied. CONTROLLED_INCOMPLETE_SUBSET case — both providers handled gracefully, volcengine still wins.
- Pairwise (close cases only): n/a (margin > 0.5)

## 6. Critical error log (per A2 spec §83)

A separate log of any hard failures observed during the human
review, across all 14 (Case × Provider) combinations:

- Hallucinated brand: (none)
- Wrong Locked Asset: (none)
- Missed structural feature: (none)
- Invalid output contract: (none)
- Unsafe downstream interpretation: (none)

All 14 (Case × Provider) combinations PASS the spec §47
hard-failure list. No cells FAIL.

## 7. LLM Judge (per A2 spec §63) — secondary evidence only

If a secondary LLM Judge pass is authorized (see
`scripts/a2-f-llm-judge.mjs`), its results are recorded in
`docs/visual-analysis/evaluation/llm-judge-scores.json` and
referenced here. Disagreements > 1.0 weighted point on a single
dimension are flagged in §5 but do **not** override the
human scorecard.

LLM Judge summary (filled after the script is run):

- Run batch id: `NOT_RUN_THIS_ROUND` (per user direction at
  A2-F pass authorization; see `docs/visual-analysis/manifests/A2-F-human-visual-review.md`).
- Provider used for judging: n/a
- Score table mirrored from §3.1 (LLM judge scores, NOT
  authoritative): n/a
- Disagreement log (where LLM judge and human diverge by > 1.0
  weighted point): n/a (no LLM judge pass this round)

## 8. Reveal (run only AFTER all scores are recorded)

**Status:** Revealed on 2026-08-12 (post-A2-F scoring). All 14
scorecards recorded with no hard-fail overrides; mapping is no
longer sealed.

### 8.1 Per-Case assignment (this A2-D run batch `2026-08-12T09-30-05-859Z`)

The mapping is **per-case deterministic from `caseId` hash** (see
`docs/visual-analysis/human-review/_MAPPING_DO_NOT_OPEN_UNTIL_DONE.md`
reproducibility note), not a global "A = volcengine, B = qwen"
assignment.

| Case | Result A (Provider / Model) | Result B (Provider / Model) |
|---|---|---|
| C01 | qwen / `qwen3.6-plus` | volcengine / `doubao-seed-2-1-turbo-260628` |
| C02 | volcengine / `doubao-seed-2-1-turbo-260628` | qwen / `qwen3.6-plus` |
| C03 | qwen / `qwen3.6-plus` | volcengine / `doubao-seed-2-1-turbo-260628` |
| C04 | volcengine / `doubao-seed-2-1-turbo-260628` | qwen / `qwen3.6-plus` |
| C05 | qwen / `qwen3.6-plus` | volcengine / `doubao-seed-2-1-turbo-260628` |
| C06 | volcengine / `doubao-seed-2-1-turbo-260628` | qwen / `qwen3.6-plus` |
| C07 | qwen / `qwen3.6-plus` | volcengine / `doubao-seed-2-1-turbo-260628` |

Model identities above are the actual values returned by the
respective Provider APIs in the A2-D run (A2 spec §107, recorded
in `evaluation-matrix.json`).

### 8.2 Post-reveal aggregate

- **volcengine wins 7/7 cases** (every A or B position that was
  volcengine came out on top).
- Volcengine mean: **4.65** (n=7). Qwen mean: **3.77** (n=7).
  Mean margin: **+0.88** in favor of volcengine.
- **volcengine min (4.40, C01) > qwen max (4.03, C05)** →
  no overlap of score distributions across the 7 cases.

This is not a tie. The spec §74 default tie rule
(`KEEP_QWEN_DEFAULT`) does **not** apply; the decision is open
under the A2-G framework recorded in
`docs/visual-analysis/A2-model-character-profiles.md` §4.

## 9. After the human review

- A2-F exit gate: human scorecard complete for all 14
  (Case × Provider) combinations, hard-failure log signed off,
  optional LLM judge pass run (if authorized). **STATUS: PASS.**
- Next batch: A2-G (`docs/visual-analysis/A2-production-model-decision.md`).
  A2-G is the **decision document only** (per user authorization
  on 2026-08-12: Human Review frozen, A2-G forms Provider Role /
  Default Recommendation; actual default switch and any change
  to Frozen Prompt / Golden / Persisted Schema / Current
  Authority is deferred to a follow-up phase).
