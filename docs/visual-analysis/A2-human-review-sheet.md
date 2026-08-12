# A2-F Human Visual Review Sheet

**Phase:** Visual Analysis A2 — Provider Candidate Integration & Model Evaluation Matrix
**Batch:** A2-F
**Date:** 2026-08-12
**Status:** `A2_F_TEMPLATE_READY` (human scoring pending)
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

| Case | Candidate | VU<br>15 | BLF<br>15 | DSE<br>15 | CR<br>10 | DU<br>15 | EG<br>10 | HC<br>10 | CIC<br>5 | RSC<br>2.5 | DUs<br>2.5 | Weighted total | Hard fail? |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| C01 Brand VI | Candidate A | | | | | | | | | | | | (compute) | |
| C01 Brand VI | Candidate B | | | | | | | | | | | | (compute) | |
| C02 Packaging | Candidate A | | | | | | | | | | | | (compute) | |
| C02 Packaging | Candidate B | | | | | | | | | | | | (compute) | |
| C03 Space | Candidate A | | | | | | | | | | | | (compute) | |
| C03 Space | Candidate B | | | | | | | | | | | | (compute) | |
| C04 Poster | Candidate A | | | | | | | | | | | | (compute) | |
| C04 Poster | Candidate B | | | | | | | | | | | | (compute) | |
| C05 Mixed VS | Candidate A | | | | | | | | | | | | (compute) | |
| C05 Mixed VS | Candidate B | | | | | | | | | | | | (compute) | |
| C06 Ref-heavy | Candidate A | | | | | | | | | | | | (compute) | |
| C06 Ref-heavy | Candidate B | | | | | | | | | | | | (compute) | |
| C07 Weak input | Candidate A | | | | | | | | | | | | (compute) | |
| C07 Weak input | Candidate B | | | | | | | | | | | | (compute) | |

Legend: VU = Visual Understanding, BLF = Brand / Locked Asset
Fidelity, DSE = Design-System Extraction, CR = Creative
Reasoning, DU = Decision Usefulness, EG = Evidence Grounding,
HC = Hallucination Control, CIC = Cross-Image Consistency,
RSC = Report Structure Compliance, DUs = Downstream Usability.

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

## 4. Pairwise comparison (per A2 spec §65)

For cases where Candidate A and Candidate B are within 0.5
weighted points, a direct pairwise review is required:

- Read both raw outputs side by side.
- Answer: **"Which analysis would you actually keep? Why?"**
- Record the answer in §5 (per-case notes) under
  "Pairwise (close cases only)".

## 5. Per-case human notes (one block per Case)

For each case, the human reviewer may add (free-form, plain text):

- "Major Errors" — any concrete wrong claim
- "Best Insight" — any concrete observation that is genuinely
  useful for downstream design
- "Reviewer Notes" — anything not captured by the rubric
- "Pairwise (close cases only)" — see §4

### C01 Brand VI (一剂良方)
- Raw outputs: `evaluation/C01/A/*.md`, `evaluation/C01/B/*.md`
- Major Errors:
- Best Insight:
- Reviewer Notes:
- Pairwise (close cases only):

### C02 Packaging (九州美学)
- Raw outputs: `evaluation/C02/A/*.md`, `evaluation/C02/B/*.md`
- Major Errors:
- Best Insight:
- Reviewer Notes:
- Pairwise (close cases only):

### C03 Space (九州美学 + 一剂良方)
- Raw outputs: `evaluation/C03/A/*.md`, `evaluation/C03/B/*.md`
- Major Errors:
- Best Insight:
- Reviewer Notes:
- Pairwise (close cases only):

### C04 Poster (视觉项目)
- Raw outputs: `evaluation/C04/A/*.md`, `evaluation/C04/B/*.md`
- Major Errors:
- Best Insight:
- Reviewer Notes:
- Pairwise (close cases only):

### C05 Mixed Visual System (九州美学)
- Raw outputs: `evaluation/C05/A/*.md`, `evaluation/C05/B/*.md`
- Major Errors:
- Best Insight:
- Reviewer Notes:
- Pairwise (close cases only):

### C06 Reference-heavy (九州美学)
- Raw outputs: `evaluation/C06/A/*.md`, `evaluation/C06/B/*.md`
- Major Errors:
- Best Insight:
- Reviewer Notes:
- Pairwise (close cases only):

### C07 Weak / Incomplete Input (视觉项目, 3/10 subset)
- Raw outputs: `evaluation/C07/A/*.md`, `evaluation/C07/B/*.md`
- Major Errors:
- Best Insight:
- Reviewer Notes:
- Pairwise (close cases only):

## 6. Critical error log (per A2 spec §83)

A separate log of any hard failures observed during the human
review, across all 14 (Case × Provider) combinations:

- Hallucinated brand:
- Wrong Locked Asset:
- Missed structural feature:
- Invalid output contract:
- Unsafe downstream interpretation:

## 7. LLM Judge (per A2 spec §63) — secondary evidence only

If a secondary LLM Judge pass is authorized (see
`scripts/a2-f-llm-judge.mjs`), its results are recorded in
`docs/visual-analysis/evaluation/llm-judge-scores.json` and
referenced here. Disagreements > 1.0 weighted point on a single
dimension are flagged in §5 but do **not** override the
human scorecard.

LLM Judge summary (filled after the script is run):

- Run batch id:
- Provider used for judging:
- Score table mirrored from §3.1 (LLM judge scores, NOT
  authoritative):
- Disagreement log (where LLM judge and human diverge by > 1.0
  weighted point):

## 8. Reveal (run only AFTER all scores are recorded)

The mapping for this A2-D run batch
`2026-08-12T09-30-05-859Z` is:

- **Candidate A** = `volcengine` (model resolved: `doubao-seed-2-1-turbo-260628`)
- **Candidate B** = `qwen` (model resolved: `qwen3.6-plus`)

This assignment is recorded here for audit. It was fixed for
the entire A2-D batch; the random seed (if any) and the
recording moment are part of the audit trail.

Once §8 is read, the human review is unblinded and A2-G
(Production Model Decision) can use the scorecard + this
mapping to produce the recommendation.

## 9. After the human review

- A2-F exit gate: human scorecard complete for all 14
  (Case × Provider) combinations, hard-failure log signed off,
  optional LLM judge pass run (if authorized).
- Next batch: A2-G (`docs/visual-analysis/A2-production-model-decision.md`).
