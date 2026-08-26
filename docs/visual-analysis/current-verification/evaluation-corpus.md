# A2 Evaluation Corpus (Frozen)

**Phase:** Visual Analysis A2 — Provider Candidate Integration & Model Evaluation Matrix
**Batch:** A2-C
**Status:** `A2_C_CORPUS_FROZEN`
**Frozen at:** `2026-08-12T17:14:44+08:00`
**Frozen by:** Mavis (per user authorization at the same instant)
**Source of truth (machine-readable):**
[`docs/visual-analysis/A2-evaluation-corpus.manifest.json`](./A2-evaluation-corpus.manifest.json)

## Freeze metadata

| Field | Value |
|---|---|
| manifestHashAlg | `sha-256` |
| **manifestHash** | `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa` |
| productVersion | `5.0.0-rc.1` |
| a1BaselineTag | `masterpiece-reference-first-stable-2026-08` |
| evidencePassRef | `A2-C Corpus Evidence Pass (2026-08-12T09:14:44 UTC)` |
| caseIds | `C01, C02, C03, C04, C05, C06, C07` (7 cases) |
| totalInputAssets | **52** |
| distinctProjects | 3 (一剂良方, 九州美学, 视觉项目-...dca9b7d4) |

Any modification of the manifest or this document after this instant
requires a new Corpus revision (per A2 spec §121 STOP-A2-08):
invalidate the current evaluation, create a new corpus revision with
explicit reason, and rerun all candidates.

## 1. Methodology

The corpus was selected in three steps:

1. **A2-A Candidate Model Discovery** committed the project directory
   set; only those three projects (`一剂良方-a13d6c09`,
   `九州美学-590eadf2`, `视觉项目-20260728-002711-dca9b7d4`) are
   eligible for A2 evaluation.
2. **A2-B.2 capability probe** confirmed `volcengine` /
   `doubao-seed-2.1-turbo` is reachable and Vision / Multi-image /
   Structured output capabilities verified (3/3 PASS, Context
   UNKNOWN).
3. **A2-C Corpus Evidence Pass** (2026-08-12, 17:10 UTC) read every
   input asset, generated three contact sheets into
   `.codex-smoke/a2-corpus-review/` (untracked), and walked the
   `reference-trace.json` / `reference-plan.json` files of every
   project to identify real reference relationships. Only the data
   from that pass drives the C06 selection.

No Packaging / Space / Poster / Mixed classification was made from
brand / industry hints; the user manually reviewed the contact sheets
and decided the case mapping.

## 2. Frozen selection

| CaseId | Category | Project | Contact sheet | Input assets | Selection source |
|---|---|---|---|---|---|
| C01 | Brand VI | 一剂良方-a13d6c09 | `.codex-smoke/a2-corpus-review/一剂良方-a13d6c09-contact-sheet.png` | 15 | contact-sheet `[NN]` |
| C02 | Packaging / Physical Application | 九州美学-590eadf2 | `.codex-smoke/a2-corpus-review/九州美学-590eadf2-contact-sheet.png` | 7 | contact-sheet `[NN]` |
| C03 | Space / Environment | 九州美学-590eadf2 + 一剂良方-a13d6c09 | (both) | 6 (4 + 2) | contact-sheet `[NN]` |
| C04 | Poster / Campaign | 视觉项目-...dca9b7d4 | `.codex-smoke/a2-corpus-review/视觉项目-20260728-002711-dca9b7d4-contact-sheet.png` | 4 | contact-sheet `[NN]` |
| C05 | Mixed Visual System | 九州美学-590eadf2 | `.codex-smoke/a2-corpus-review/九州美学-590eadf2-contact-sheet.png` | 15 | contact-sheet `[NN]` |
| C06 | Reference-heavy | 九州美学-590eadf2 | n/a (trace-evidence-driven) | 2 | vnext `reference-trace.json` |
| C07 | Weak / Incomplete Input | 视觉项目-...dca9b7d4 | `.codex-smoke/a2-corpus-review/视觉项目-20260728-002711-dca9b7d4-contact-sheet.png` | 3 (CONTROLLED_INCOMPLETE_SUBSET) | contact-sheet `[NN]` |

## 3. Per-case detail

The full per-case detail (input asset lists, what must be understood,
what must not be hallucinated, what decisions should be useful,
locked assets in scope, evaluation notes, and C06 trace evidence)
lives in the machine-readable manifest. The highlights per case:

### C01 — Brand VI
- Project: `一剂良方` (中医体验馆/中医健康管理)
- Contact-sheet `[NN]`: `01 03 04 05 06 09 10 12 13 18 23 24 25 30 33` (15 of 35)
- Purpose: Comprehensive Brand VI extraction from a 4K landscape
  corpus spanning multiple touchpoints; tests Visual Understanding,
  Brand / Locked-Asset Fidelity, Design-System Extraction, Evidence
  Grounding, and Cross-Image Consistency.
- Locked: brand-name `一剂良方`, Logo (主标识), Logo Locked, output
  language fixed to 简体中文.
- CONTROL case in A2-A; both providers must run this.

### C02 — Packaging / Physical Application
- Project: `九州美学` (医疗美容)
- Contact-sheet `[NN]`: `04 12 13 19 21 26 28` (7 of 28)
- Purpose: Read packaging / surface vocabulary of a high-end medical
  aesthetics brand; ground analysis in the visible label / surface,
  not in product context outside the input.
- Locked: brand-name `九州美学`, Logo (主Logo, user_confirmed), Logo
  Locked, output language fixed to 简体中文.
- Tests Visual Understanding on product surfaces, Brand Fidelity on
  clinical surface vocabulary, Decision Usefulness for downstream
  Packaging generation.

### C03 — Space / Environment
- Projects: `九州美学` (4 inputs) + `一剂良方` (2 inputs) — **the only
  multi-project case in this corpus**.
- Contact-sheet `[NN]`:
  - 九州美学: `07 10 14 25`
  - 一剂良方: `16 27`
- Purpose: Read space / environment shots from two distinct brand
  contexts without conflating them; extract per-brand spatial rules
  and surface the difference.
- Locked: each project's brand-name + Logo (per visual-decision-packet)
  + output language 简体中文.
- A merged single-brand profile = Cross-Image Consistency failure.

### C04 — Poster / Campaign
- Project: `视觉项目-...dca9b7d4` (街食/卤菜/跷脚牛肉)
- Contact-sheet `[NN]`: `03 06 08 10` (4 of 10)
- Purpose: Read portrait-orientation poster / campaign visuals
  (the only portrait corpus in this freeze); extract composition,
  hierarchy, color saturation rules.
- Locked: per project record.
- **Encoding risk:** the visual-decision-packet for this project
  contains UTF-8 / GBK mojibake on the brand-name field. The
  analysis must not propagate the mojibake; correct brand-name
  handling is part of the C04 quality bar.

### C05 — Mixed Visual System
- Project: `九州美学` (医疗美容)
- Contact-sheet `[NN]`: `01 03 04 07 08 10 12 14 17 19 21 22 25 26 28` (15 of 28)
- Purpose: Extract a single coherent Visual System across 15
  heterogeneous touchpoints of the same brand; tests Cross-Image
  Consistency at scale and Design-System Extraction under a
  non-uniform (FHD) source.
- Locked: brand-name + Logo + Logo Locked + 简体中文.
- Highest design-system-extraction weight of the corpus.

### C06 — Reference-heavy (trace-evidence-driven)
- Project: `九州美学`
- Input assets (NOT contact-sheet-driven):
  - `[07] 2eed2724-e5de-465a-bca4-26dcbd8b80e7`
    — appears in **5** vnext compilations
    (`vnext-task-825abd82-…-90e426ea291b`,
    `vnext-task-cd91ed86-…-85d69ab7cfa9`,
    `vnext-task-e39ea407-…-97ebd9a5311c`,
    `vnext-task-f7ec924d-…-a98c6e890e9c`,
    `vnext-task-fb712de6-…-95f95fec0179`)
    as a `user_explicit` reference.
  - `[09] 357df67c-bbaa-4f79-8cf3-4f90cd81719d`
    — appears in **3** vnext compilations
    (`vnext-task-33059902-…-2c8f11866d8d`,
    `vnext-task-92b0d621-…-e4fb8a9bb731`,
    `vnext-task-999c4c22-…-258cb585c85c`)
    as a `user_explicit` reference.
- **No other input asset in any project has a non-zero
  `providerReferenceCount` in the vnext pipeline.** The selection is
  therefore exhaustive within the current evidence set.
- Context: `project-context/visual-decision-packet.json` (project
  facts); brand-name `九州美学` (locked); Logo asset
  `4f65f3f8-1749-4354-b488-1d8c50e21061` (locked); output language
  简体中文. `referenceMode = reference_assisted`,
  `providerReferenceCount = 2`.
- Target: the analysis must treat the two reference images as the
  canonical brand references and ground brand / logo / identity
  extraction in them. The analysis should explicitly cite the
  reference images when describing brand identity, Visual DNA, and
  the brand-vs-asset distinction. There is no "expected answer" (A2
  spec §33); this is a scenario description.
- The two reference assets are fixed; any modification requires a
  new Corpus revision (A2 spec §121).

### C07 — Weak / Incomplete Input (CONTROLLED_INCOMPLETE_SUBSET)
- Project: `视觉项目-...dca9b7d4` (街食/卤菜/跷脚牛肉)
- Contact-sheet `[NN]`: `01 04 07` (3 of 10)
- **Tagged `CONTROLLED_INCOMPLETE_SUBSET`.** These 3 inputs do NOT
  represent the project's natural state; the project has 7 more
  input assets that are intentionally out of scope for this case.
- Purpose: Test the model's behavior when given a deliberately
  small, controlled subset of an otherwise complete project corpus —
  Report Structure Compliance, Decision Usefulness, and explicit
  uncertainty handling under low evidence.
- A model that produces a confident full Brand VI from 3 images is
  failing C07. A model that produces a structured but explicitly
  caveated low-evidence report is passing.

## 4. Run Budget (per A2 spec §51)

| Field | Value |
|---|---|
| maxProviders | **2** |
| providers | `qwen / qwen3.6-plus` (CONTROL) + `volcengine / doubao-seed-2.1-turbo` (CANDIDATE A; capabilities verified by A2-B.2 probe) |
| maxCases | 7 |
| caseIds | C01, C02, C03, C04, C05, C06, C07 |
| maxRunsPerCase | 3 (1 default, 2 additional only for close / unstable candidates) |
| defaultRunsPerCase | 1 |
| estimatedCallCount (minimum) | **14** (= 7 × 2 × 1) |
| estimatedCallCount (close-stability) | up to **42** (= 7 × 2 × 3) |
| expectedProviderCalls | qwen: 7; volcengine: 7 |

## 5. STOP conditions honored

- **STOP-A2-08** (modify corpus after freeze): NOT triggered. This
  document is the freeze commit.
- **STOP-A2-09** (modify weights to favor a candidate): NOT
  triggered. Weights live in `A2-evaluation-rubric.md`, frozen
  independently.
- **STOP-A2-15** (real Provider call into default CI): NOT triggered.
  Evaluation runs are manual / opt-in (A2 spec §20, §21, §105).
- **STOP-A2-16** (LLM judge as sole judge): NOT triggered. LLM judge
  is allowed as secondary evidence only (A2 spec §63); human review
  is mandatory (A2-F).

## 6. Reproducibility

Re-running the freeze-build script
(`.codex-smoke/build-a2-corpus-manifest.mjs`) with the same fixed
`FROZEN_AT_ISO` produces the same
`manifestHash = f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa`.
A different timestamp produces a different hash and a different
freeze; the freeze is one-shot, not a function of "now".
