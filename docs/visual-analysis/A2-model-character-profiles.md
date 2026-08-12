# A2-F Model Character Profiles

**Phase:** Visual Analysis A2 — Provider Candidate Integration & Model Evaluation Matrix
**Batch:** A2-F
**Date:** 2026-08-12
**Status:** `A2_F_PROFILES_READY` (human review frozen, mapping revealed; filled from A2-F scorecard + A2-D matrix + A2-E)

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

### Strengths (from A2-F §3.1, 7-case averages)

- **Report Structure Compliance (RSC) = 5.00 / 5** — perfect
  across all 7 cases. Canonical Analysis Provider output
  contract is always parseable, with all required sections
  present.
- **Creative Reasoning (CR) = 4.00 / 5** — stable; never below
  4 in any case. Distinguishes fact from inference at a usable
  level.
- **Stable baseline on Visual Understanding / Design-System
  Extraction / Decision Usefulness (4.00 / 5 each)** — never
  surprising the user, never under-delivering on the basics.

### Weaknesses

- **Hallucination Control (HC) = 2.71 / 5** — the largest
  single-dimension deficit of any provider in the A2-F run.
  Qwen scored 2 in 4 of 7 cases (C03 Space, C06 Ref-heavy,
  C07 Weak input, …) and 3 in 2 more (C02, C04). Cross-image
  inputs with multiple brands and packaging structures
  repeatedly produced invented material / structure / text
  claims.
- **Evidence Grounding (EG) = 3.29 / 5** — the second-largest
  deficit. Qwen scored 3 on EG in 5 of 7 cases (C02, C03, C04,
  C06, C07), suggesting it sometimes extrapolates beyond the
  visual evidence rather than staying anchored to it.
- **Brand / Locked Asset Fidelity (BLF) = 3.57 / 5** —
  occasionally confused on brand details (C01 = 3,
  C03 / C07 = 3), though no cell hit the spec §47 hard-fail
  threshold.

### Best-fit project types

- **Single-brand, format-restricted inputs where the canonical
  Output Contract must be respected and the prompt budget is
  tight.** Qwen's perfect RSC score and stable CR make it a
  safe "format-only" provider when the analysis is downstream
  consumed by a strict parser.
- **Low-context short-form cases** (≤ 4 attachments) where
  hallucination risk is naturally low. C04 (Poster, 4
  attachments) was the only case where Qwen did not fall below
  3.83 weighted.

### Failure patterns observed in this run

| Pattern | Cases | Evidence |
|---|---|---|
| Hallucination on multi-brand mixed inputs | C03, C07 (HC = 2) | Mixed brand sets (九州 + 一剂良方 in C03; weak subset in C07) — Qwen invents structure/material claims |
| Hallucination on Reference-heavy inputs | C06 (HC = 2) | Reference-heavy case (2 trace-evidence-driven input assets) — Qwen extends beyond the visible references |
| EG drift on complex inputs | C02, C03, C04, C06, C07 (EG = 3) | Five of seven cases — Qwen's evidence grounding slips on inputs with more than 4 attachments or with reference-image chains |
| BLF drift on brand-mixed inputs | C01, C03, C07 (BLF = 3) | When the input set contains multiple brand visual systems, Qwen occasionally confuses brand details |

### Cost / latency profile (per A2-E)

- median latency 56.4 s, mean 66.1 s, p95 ~92 s
- cost per analysis: **UNKNOWN** (Qwen reasoner does not surface
  `usage`; per A2 spec §56 no estimate is made)
- success rate: 100% over 7 runs (no retries, no timeouts, no
  contract validation failures)

### Recommended role

- **ALTERNATIVE / FALLBACK** (per A2-G decision; see
  `docs/visual-analysis/A2-production-model-decision.md` §5).
- Qwen remains **registered** in the analysis-provider registry
  with all adapter / contract / baseline / fixture artifacts
  preserved (per A2-G non-removal clause).
- The Qwen reasoner + adapter is the explicit fallback path for
  the post-A2-G default switch; any Volcengine availability
  event should fall back to Qwen without code change beyond
  config.

## 3. Volcengine (`doubao-seed-2-1-turbo-260628`)

Model identity actually returned by the API in this A2-D run:
`doubao-seed-2-1-turbo-260628` (the dated alias the API resolves
`doubao-seed-2.1-turbo` to; matches the A2-B.2 capability probe).

### Strengths (from A2-F §3.1, 7-case averages)

- **Five of ten dimensions at perfect 5.00 / 5**: DSE, DU, CIC,
  RSC, DUs. Volcengine hit the top score on every (Case,
  Dimension) cell where the dimension weight allowed it.
- **Visual Understanding (VU) = 4.86 / 5** — near-perfect;
  only dropped below 5 once (C01, BLF=4).
- **Brand / Locked Asset Fidelity (BLF) = 4.43 / 5** — strong;
  min 4 across all 7 cases (no cell below 4). Qwen's BLF was
  3.57.
- **Hallucination Control (HC) = 4.14 / 5** — the decisive
  delta over Qwen. Volcengine never dropped below 4 on HC in
  any case; Qwen dropped to 2 four times.
- **Decision Usefulness (DU) = 5.00 / 5** — every case
  produced an analysis that the reviewer accepted as
  directly usable for Reference First / Generation planning.

### Weaknesses

- **Creative Reasoning (CR) = 4.29 / 5** — the only dimension
  where Volcengine was not clearly dominant. C01, C02, C03,
  C06, C07 all scored 4 on CR. Acceptable, but the smallest
  margin over Qwen (Qwen CR = 4.00).
- **Evidence Grounding (EG) = 3.86 / 5** — Volcengine
  occasionally scores 3 on EG (C04, C06), though never 2.
  This is a less serious version of Qwen's EG weakness.

### Best-fit project types

- **All A2 corpus categories.** Volcengine won every case in
  the frozen corpus (C01 Brand VI, C02 Packaging, C03 Space,
  C04 Poster, C05 Mixed VS, C06 Ref-heavy, C07 Weak input).
  No category-specific weakness observed.
- **Reference-heavy multi-brand inputs (C06):** strongest
  single-case result of the run (4.90 / 5), demonstrating
  the model can follow reference-image chains without
  hallucinating surrounding material.
- **Weak / Incomplete input (C07):** still wins (4.55) on a
  CONTROLLED_INCOMPLETE_SUBSET (3 of 10 attachments), with
  no fabricated structure.

### Failure patterns observed in this run

- No hard-fail patterns observed.
- Soft observation: **CR is the only dimension where
  Volcengine did not reach 5.00.** Even in Volcengine's
  highest-scoring case (C06, 4.90), CR was 4. The pattern
  holds across the corpus — Volcengine is strong on
  descriptive / structural dimensions and slightly less
  strong on inferential / judgment dimensions.

### Cost / latency profile (per A2-E)

- median latency 151.4 s, mean 156.2 s, p95 ~189 s
- cost per analysis: **UNKNOWN** (Volcengine reasoner does not
  surface `usage`; per A2 spec §56 no estimate is made)
- success rate: 100% over 7 runs (no retries, no timeouts, no
  contract validation failures)

### Recommended role

- **DEFAULT (production)** (per A2-G decision; see
  `docs/visual-analysis/A2-production-model-decision.md` §5).
- The A2-G decision document is the **decision artifact**; the
  actual default switch is deferred to a follow-up phase per
  user authorization. Until the follow-up phase lands, the
  runtime default remains Qwen (no production code or config
  change in this A2-G batch).

## 4. Cross-provider observations (per A2 spec §67, §75)

### 4.1 No specialist pattern

- A model that is significantly better at one category (e.g.
  Packaging) but weaker at general VI is recorded as
  **SPECIALIST** for that category. A2 does NOT implement
  automatic routing (A2 spec §76); the role classification
  is informational only.
- **In this run, Volcengine wins all 7 cases across all
  categories.** No specialist classification is warranted for
  either provider.

### 4.2 Tie rule (per A2 spec §74)

- The spec §74 default tie rule is **KEEP_QWEN_DEFAULT**.
  This run is **not a tie** (mean margin +0.88 in favor of
  Volcengine; volcengine min 4.40 > qwen max 4.03 → absolute
  non-overlap).
- The decision is therefore made under the A2-G framework
  recorded in `docs/visual-analysis/A2-production-model-decision.md`
  §3, not the spec §74 default.

### 4.3 Per-dimension margin summary (volcengine − qwen, weighted by A2 rubric weights)

| Dim | Weight | Qwen avg | Volcengine avg | Δ (volc − qwen) | Weighted contribution |
|---|---:|---:|---:|---:|---:|
| VU | 15 | 4.00 | 4.86 | +0.86 | +0.129 |
| BLF | 15 | 3.57 | 4.43 | +0.86 | +0.129 |
| DSE | 15 | 4.00 | 5.00 | +1.00 | +0.150 |
| CR | 10 | 4.00 | 4.29 | +0.29 | +0.029 |
| DU | 15 | 4.00 | 5.00 | +1.00 | +0.150 |
| EG | 10 | 3.29 | 3.86 | +0.57 | +0.057 |
| HC | 10 | 2.71 | 4.14 | +1.43 | +0.143 |
| CIC | 5 | 4.14 | 5.00 | +0.86 | +0.043 |
| RSC | 2.5 | 5.00 | 5.00 | 0.00 | 0.000 |
| DUs | 2.5 | 4.00 | 5.00 | +1.00 | +0.025 |
| **Total weighted** | **100** | **3.77** | **4.65** | **+0.88** | **+0.855** |

- Top contributing dimensions to the volcengine advantage:
  DSE (+0.150), DU (+0.150), HC (+0.143), VU (+0.129), BLF
  (+0.129). Five dimensions account for 0.70 of the 0.88
  total margin.
- RSC is a tie (5.00 vs 5.00) — both providers respect the
  output contract, so the default switch is a
  quality-of-analysis decision, not a contract-compliance
  decision.

### 4.4 Blind reveal mapping for this A2-D run

- Per-case (not global) assignment; see
  `docs/visual-analysis/human-review/_MAPPING_DO_NOT_OPEN_UNTIL_DONE.md`
  and `docs/visual-analysis/A2-human-review-sheet.md` §8.1.
- The blinding protocol was honored end-to-end: the
  per-case assignments, the human scoring, and the A2-E
  cost / latency / reliability evidence were all produced
  without the human reviewer knowing which Candidate was
  which Provider. The mapping was revealed only after all
  14 scorecards were recorded, per spec §112.
