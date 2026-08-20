# CI-W1C.7.3A — Final Report

> **Audit**: Planning Source Authority & First-Loss Reconciliation
> **Mode**: Zero-API diagnostic phase (docs only)
> **HEAD**: 5159d938d2f635bfad4e2397664711890fd03ea1
> **Branch**: `feat/short-chain-simplified-ui`
> **Status**: COMPLETE / STOP after audit

---

## TL;DR — 4-line summary

| Field | Verdict |
|---|---|
| **DATASET_VERDICT** | G01 = `INVALID_FOR_PLANNING_QUALIFICATION` (0 planning docs). G02 = same. |
| **TRUE_FIRST_LOSS_STAGE** | `PLANNING_SOURCE_NOT_PRESENT` (not `NEED_DERIVATION_GENERICIZATION` as CI-W1C.7.3 claimed) |
| **PRIMARY_ACTIONABLE_BOTTLENECK** | `PLANNING_SEMANTIC_CARRIER_MISSING` (add planning-source ingestion; the system has no way to ingest a brief) |
| **NEED_REWRITE_VERDICT** | `NEED_REWRITE_NOT_YET_JUSTIFIED` (planning docs missing; the proposed 50-200 LOC Need rewrite is NOT YET JUSTIFIED) |

**One-line**: CI-W1C.7.3 was right about the symptom (Need is generic) but wrong about the cause (the cause is upstream — no planning source exists). The recommended next phase is **NOT** the Need rewrite; it is **adding a planning-source ingestion path** so that real planning data can reach the pipeline.

---

## 1. Dataset verdict

| Project | Planning source present? | What exists? | Verdict |
|---|---|---|---|
| G01 九州美学 | NO | 28 PNG visual boards + project.json (brandName from folder + industry=待确认 placeholder + 2 lockedFacts) | `INVALID_FOR_PLANNING_QUALIFICATION` |
| G02 一剂良方 | NO | 35 PNG visual boards + project.json (brandName from folder + industry=待确认 placeholder + 2 lockedFacts) | `INVALID_FOR_PLANNING_QUALIFICATION` |

**The rich "project data" both projects have (asset inventory, brandRole, categoryCliches, brandMisreadRisks, copy strings) is VUC-INFERRED from the PNGs**, not authored by a human planner. The `briefFiles: []` field in project.json is empty in both projects. The `outputs/九州美学-视觉方案升级报告-qwen3.6-plus.md` is a VUC-generated diagnosis report, not a planning brief.

**What CI-W1C.7.2 actually qualified**: `current project context → Direction`. It did NOT qualify `planning document → Direction`. If the product intent is planning-driven synthesis, the dataset does not support the qualifier.

---

## 2. What CI-W1C.7.3 got right

1. ✓ **GENERIC_NEED_COLLAPSE = TRUE.** Identity-stripped G01 vs G02 `need-intelligence.json` `statement` fields are LITERALLY identical (0 byte diff).
2. ✓ The 5 needs are shape-driven (`generatedBy: "deterministic_rule"`), driven by Truth shape not values.
3. ✓ The 13-of-15-anchor drop at Stage 3→4 is real (visual content doesn't reach evidence).
4. ✓ The recovery at Concept/Direction is surface-deep (metaphors from pretrained design vocabulary, not from project content).
5. ✓ The synthesis output is generic (the 3 axes of "lock vs unknown" are paraphrases of the same structure).

## 3. What CI-W1C.7.3 overclaimed

1. ✗ **Anchors were mis-classified as "planning"** — they're mostly legacy visual (12-13 of 15-16 are LEGACY_VISUAL_EVIDENCE).
2. ✗ **The 93.5% drop was mis-read** as "planning semantics lost" — it's "legacy content filtered out by design."
3. ✗ **`NEED_DERIVATION_GENERICIZATION` was named as FIRST_LOSS_STAGE** — it's a SYMPTOM of the upstream emptiness, not the cause. The cause is upstream at Stage 1.
4. ✗ **The proposed Need rewrite was named as a 50-200 LOC fix** — it would be HELPFUL_BUT_INSUFFICIENT (and not even helpful until planning data exists).

## 4. Reclassification summary

| Category | G01 | G02 | Counts as positive planning retention? |
|---|---:|---:|:-:|
| PLANNING_STRATEGIC_SOURCE | 0 | 0 | YES |
| USER_REQUIREMENT | 3 | 3 | YES |
| PROJECT_METADATA | 1 | 1 | YES |
| LOCKED_IDENTITY (constraint) | 7 | 5 | NO (constraint only) |
| LEGACY_VISUAL_EVIDENCE | 12 | 13 | NO (legacy positive) |
| VISUAL_DIAGNOSIS | 5 | 3 | NO (legacy positive) |
| CREATIVE_HYPOTHESIS | 0 | 1 | NO (legacy positive) |
| UNKNOWN_SOURCE | 0 | 0 | NO |
| **TOTAL** | **28** | **27** | |
| **PLANNING-POSITIVE** | **4** | **4** | |

| Anchor count | G01 | G02 |
|---|---:|---:|
| Real planning anchor count (planning-positive) | 4 | 4 |
| Legacy visual anchor count (CI-W1C.7.3 measured) | 15 | 16 |
| Constraint anchor count (LOCKED_IDENTITY) | 7 | 5 |
| **Total** | 26 | 25 |

The 4 planning-positive anchors per project are: 1 PROJECT_METADATA (brandName, placeholder) + 3 USER_REQUIREMENT (logoLocked + 2 lockedFacts). **0 anchors carry project-specific planning STRATEGY.**

## 5. New planning-only retention curve

Stages 1-8 (planning-positive anchors only):

```
G01:   [0.000, 0.000, 0.875, 0.250, 1.000, 0.500, 1.000, 1.000]
G02:   [0.000, 0.000, 0.875, 0.250, 1.000, 0.500, 1.000, 1.000]
COMBINED: [0.000, 0.000, 0.875, 0.250, 1.000, 0.500, 1.000, 1.000]
```

Stages: 1_planning_source / 2_parsed / 3_di_dvc / 4_evidence / 5_truth / 6_need / 7_strategic_context / 8_prompt

**The curve is the OPPOSITE shape of CI-W1C.7.3's curve:**
- CI-W1C.7.3: `[1.00, 1.00, 1.00, 0.065, 0.065, ...]` (high at DVC, low at Evidence, near-zero at Synthesis) — measures LEGACY retention
- CI-W1C.7.3A: `[0.00, 0.00, 0.875, 0.250, 1.000, ...]` (zero at Planning Source, RECOVERS at DVC, plateau at Truth-Prompt) — measures PLANNING retention

**Interpretation**: The legitimate planning curve is 0% at Stage 1-2 (no planning source). It RECOVERS at Stage 3 because the v1 DVC carries user-typed metadata (brandName, lockedFacts). It dips at Stage 4 (evidence doesn't have per-locked-fact rows). It returns to 100% at Stage 5 (Truth has all facts). It dips again at Stage 6 (Need is generic, per CI-W1C.7.3's finding). It returns to 100% at Stage 7-8 (strategic context and prompt carry the facts).

The dip at Stage 6 (Need) is the GENERIC_NEED_COLLAPSE CI-W1C.7.3 found. But the dip doesn't matter for planning strategy because there IS no planning strategy to begin with.

## 6. Document processing trace

| Step | G01 | G02 |
|---|---|---|
| Planning doc upload | N/A (no source) | N/A |
| File registration | N/A | N/A |
| Parser invocation | N/A | N/A |
| Document context creation | N/A | N/A |
| DI invocation (via PNGs) | REACHED | REACHED |
| DI output persistence (v1 + v2 DVC) | REACHED | REACHED |
| DI contribution to evidence | **DI_OUTPUT_NOT_CONTRIBUTED_TO_EVIDENCE** (4 generic rows, no per-asset rows) | **DI_OUTPUT_NOT_CONTRIBUTED_TO_EVIDENCE** (4 generic rows, no per-asset rows) |
| Evidence promotion to truth | PARTIAL (brand.name + industry only) | PARTIAL (brand.name + industry only) |
| Truth → Need → Prompt | YES | YES |
| Synthesis reached | YES (PASS) | YES (PASS) |

**The hard gap is between DI output persistence and Evidence contribution.** The v1 DVC has 30+ asset entries, but evidence-ledger.json has only 4 generic rows. This is a schema gap (no `asset_metadata` type), not a wiring bug.

## 7. Project Truth planning coverage

| Aspect | G01 | G02 |
|---|---|---|
| PLANNING_STRATEGIC_SOURCE facts in Truth | 0/17 = 0% | 0/16 = 0% |
| Planning-positive facts (USER_REQ + PROJECT_META) | 4/17 = 24% | 4/16 = 25% |
| Planning-positive VALUE facts (not placeholders/constraints) | 0/17 = 0% | 0/16 = 0% |
| Constraint-only facts (LOCKED_IDENTITY) | 7/17 = 41% | 6/16 = 38% |
| Legacy-positive facts (VUC-inferred carriers) | 4-5/17 = 24% | 4-5/16 = 25% |
| UNKNOWN facts | 2/17 = 12% | 2/16 = 13% |

**NONE of the 17/16 Truth facts carry a project-specific planning VALUE that is not a placeholder or constraint.** The "rich" facts (brandRole=高端医疗美容 / 中医诊疗) are VISUAL_DIAGNOSIS, not PLANNING.

## 8. Legacy positive leakage

| Stage | Legacy anchors present | Expected | Status |
|---|---:|---:|:-:|
| 1 Planning Source | 0 | 0 | ✓ |
| 2 Parsed | 0 | 0 | ✓ |
| 3 DI/DVC | 34 (combined) | 0 (legacy lives here) | ✓ DESIGN |
| 4 Evidence | 0 | 0 | ✓ |
| 5 Truth | 5 per project (10 combined) | 0 | **LEAK** (VUC-inferred industry+brandRole reach Truth) |
| 6 Need | 0 | 0 | ✓ |
| 7 Strategic Context | 5 per project | 0 | **LEAK** (carries Truth) |
| 8 Prompt | 5 per project | 0 | **LEAK** (in AUTHORITATIVE PROJECT FACTS) |
| 9 Synthesis | 0 (not quoted) | 0 | ✓ |

**The prompt leakage is REAL but OPERATIONALLY NEUTRALIZED.** The VUC-inferred values reach the prompt, but the synthesis model does not use them (it defaults to AUTHORITATIVE=待确认 placeholder). The cost is prompt size + noise, not output quality.

## 9. Counterfactual findings (CF-A, CF-B, CF-C, CF-D, no API)

| Counterfactual | Finding |
|---|---|
| **CF-A** Remove all legacy visual sources | 0 PLANNING_STRATEGIC_SOURCE remain. Only 3 USER_REQUIREMENT + 1 PROJECT_METADATA. **No planning strategy remains.** |
| **CF-B** Planning-only Truth projection | Identity-stripped G01 and G02 are **indistinguishable** at the planning level (excluding brandName per the synthesis epistemic rules, both are 100% identical). |
| **CF-C** Legacy-only projection | ~94% of CI-W1C.7.3's "rich differentiation" came from legacy visual anchors. The remaining 6% came from the model's pretrained design vocabulary (metaphors, family names). |
| **CF-D** Audit-only hypothetical value-bearing Need | The Need rewrite would inject `brandName=九州美学` (placeholder) into a generic template. It would NOT carry planning strategy. Marginal prompt-salience improvement only. |

## 10. TRUE_FIRST_LOSS_STAGE

Per spec strict rule: "choose the EARLIEST chronological material loss of LEGITIMATE planning semantics. Do not skip an earlier loss because a later one is easier to repair."

**`PLANNING_SOURCE_NOT_PRESENT`** (Stage 1)

The earliest material loss is at Stage 1, where the planning source does not exist. All later stages (NEED_DERIVATION_GENERICIZATION, PROMPT_SALIENCE_COLLAPSE, etc.) are downstream effects.

## 11. PRIMARY_ACTIONABLE_BOTTLENECK

Per spec: "the first repair target, not necessarily the first chronological loss."

**`PLANNING_SEMANTIC_CARRIER_MISSING`**

The system has no way to ingest a planning brief. The `briefFiles: []` field is empty in both projects. There is no `document-processing` flow that has been exercised. The first repair is to **add the planning-source ingestion path**, not to fix the existing modules.

## 12. NEED_REWRITE_VERDICT

Per spec: "SUFFICIENT only if: real Planning semantics already survive upstream and Need is actually the first meaningful generalizer."

**`NEED_REWRITE_NOT_YET_JUSTIFIED`**

- Real planning semantics don't survive upstream: TRUE (0 PLANNING_STRATEGIC_SOURCE in Truth)
- Need is the first generalizer: FALSE (Stage 1 is the first generalizer, and it generalizes to 0 because no source exists)

The proposed 50-200 LOC CI-W1C.7.4 Need rewrite is **NOT YET JUSTIFIED**. It should be deferred until planning data is in the pipeline.

## 13. Recommended next repair phase (NOT in this audit)

**CI-W1C.7.4 — Planning Source Ingestion** (NOT a Need rewrite)

Scope:
1. Add `briefFiles` upload support (UI + CLI test path).
2. Add a `planning-doc-parser` module: extracts brand positioning, business strategy, audience, brand promise, competitive context, communication task, strategic/experience/transformation objective.
3. Add `PLANNING_STRATEGIC_SOURCE` authority tier to the truth schema.
4. Write parsed facts to Truth with full PLANNING_STRATEGIC_SOURCE authority.
5. Re-run G01 and G02 with a sample brief (synthetic test data).
6. Re-measure planning retention curve.
7. Re-evaluate first-loss stage.

Cost: ~200-500 LOC + 5-10 tests + 1 sample brief.

Out of scope:
- Any change to existing need, prompt, or synthesis logic (the system is correctly designed for the empty-planning-source case).
- Any change to legacy visual handling (the VUC is correctly designed to extract from PNGs).

## 14. Productization status

Per spec PART K: "Direction Report productization remains HOLD."

Verdict: **HOLD** remains in effect. Per spec: "Do not unlock until: real planning-source status is known, TRUE_FIRST_LOSS is reconciled, next repair is selected from evidence."

This audit (CI-W1C.7.3A):
- ✓ real planning-source status is known (NONE)
- ✓ TRUE_FIRST_LOSS is reconciled (PLANNING_SOURCE_NOT_PRESENT, overriding CI-W1C.7.3's verdict)
- ✓ next repair is selected from evidence (PLANNING_SEMANTIC_CARRIER_MISSING → CI-W1C.7.4)

After the user authorizes CI-W1C.7.4 and it completes, the productization decision can be revisited.

## 15. Hard rules (PART M) — all verified 0

| Rule | Status |
|---|:-:|
| analysis calls | 0 |
| image calls | 0 |
| production Need changes | 0 |
| production Truth changes | 0 |
| DVC changes | 0 |
| DI changes | 0 |
| prompt changes | 0 |
| legacy visual positive reintroduction | 0 |
| consumer switch | 0 |
| CI-W1C.6.1 | 0 (still DEFERRED) |
| CI-10 | 0 (still NOT STARTED) |
| Direction Report productization | 0 (still HOLD) |
| project-specific production hardcode | 0 |

## 16. Frozen surfaces preserved

All CI-W1C.6/7/7.1/7.1A/7.2 surfaces are UNTOUCHED:
- Document Intelligence (visual-decision-packet.json) — read but not modified
- DVC v2 (project-visual-context.vnext.json) — read but not modified
- Truth taxonomy (project-truth.json) — read but not modified
- Conflict Detector — no changes
- Need layer — no changes
- Concept Gate / Direction Gate — no changes
- Image Runtime / Translation / Consumers — no changes
- LEGACY_VISUAL_EVIDENCE demoted (CI-W1C.6 PART B) — preserved
- All CI-W1C.7.1A fingerprint + prompt budget contracts — preserved
- All CI-W1C.7.2 model contracts — preserved
- Recommendation advisory-only — selection unchanged

## 17. Files produced (15 deliverables)

```
docs/creative-intelligence/ci-w1c.7.3a/
├── baseline-freeze.md                              (PART A)
├── planning-source-inventory.md                    (PART B)
├── qualification-dataset-validity.md               (PART C)
├── planning-source-authority-contract.md           (PART D — contract)
├── g01-anchor-authority-reclassification.json      (PART D — G01)
├── g02-anchor-authority-reclassification.json      (PART D — G02)
├── g01-planning-semantic-propagation.md            (PART E — G01)
├── g02-planning-semantic-propagation.md            (PART E — G02)
├── planning-only-retention-metrics.json           (PART E — combined)
├── legacy-positive-leakage-audit.md                (PART F + legacy leakage)
├── document-processing-di-trace.md                 (PART F + trace)
├── project-truth-planning-coverage.md             (PART H)
├── need-rewrite-sufficiency-audit.md               (PART I)
├── first-loss-reconciliation.md                   (PART G + J + K, includes CF-A/B/C/D)
└── final-report.md                                 (PART N, this file)
```

## 18. Stop

Per spec: "STOP after this audit. DO NOT implement the repair in the same phase."

The audit is COMPLETE at HEAD 5159d938 (Documentation Tip). Implementation HEAD is unchanged at c058316c. The next commit (after user authorization) would be a new Documentation Tip for CI-W1C.7.4, OR a new Implementation HEAD if the user chooses to start CI-W1C.7.4 work directly.

**The user must authorize the next step.** The recommended next step is **CI-W1C.7.4 (planning-source ingestion)**, NOT the previously-recommended Need rewrite. The previously-recommended Need rewrite is `NOT_YET_JUSTIFIED` until planning data exists in the pipeline.
