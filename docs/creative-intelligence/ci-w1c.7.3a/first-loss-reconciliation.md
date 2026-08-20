# CI-W1C.7.3A — First-Loss Reconciliation

> **Mode**: Zero-API diagnostic phase · **HEAD**: 5159d938
> **Purpose**: Reconcile CI-W1C.7.3's verdict (`FIRST_LOSS_STAGE = NEED_DERIVATION_GENERICIZATION`) against the true first-loss when anchors are reclassified per the authority taxonomy.

## Headline

> **CI-W1C.7.3 overclaimed. The TRUE_FIRST_LOSS_STAGE is `PLANNING_SOURCE_NOT_PRESENT`, not `NEED_DERIVATION_GENERICIZATION`.**
>
> The proposed 50-200 LOC CI-W1C.7.4 Need rewrite is `NOT_YET_JUSTIFIED` because no planning source exists upstream.
>
> The PRIMARY_ACTIONABLE_BOTTLENECK is `PLANNING_SEMANTIC_CARRIER_MISSING` — the dataset has no planning brief to ingest.

## Why CI-W1C.7.3's verdict was wrong

CI-W1C.7.3 measured 15-16 "anchors" per project, drawn from `visual-decision-packet.json`. It classified these as "planning anchors" and measured their retention across the pipeline.

The current audit reclassifies those 15-16 anchors per the 8-category authority contract:
- 0 of them are PLANNING_STRATEGIC_SOURCE
- 12-13 are LEGACY_VISUAL_EVIDENCE (logo, color, typography, motif, imagery, layout, material, packaging, spatial, copy — all extracted by the VUC from the PNG visual assets)
- 2-4 are VISUAL_DIAGNOSIS (brandMisreadRisk, categoryCliches, VUC-inferred brandRole + industry)
- 1 is CREATIVE_HYPOTHESIS (G02's creativeDecision block)

When reclassified, the **legitimate PLANNING anchor count is 0 per project.** The 15-16 "anchors" CI-W1C.7.3 measured were ALL legacy positive (visual or visual diagnosis), not planning.

The 93.5% drop CI-W1C.7.3 measured at Stage 3→4 is a **LEGACY drop**, not a PLANNING drop. The legitimate PLANNING curve (0/4 anchors at Stage 1, since no planning source exists) is 0% from Stage 1 onwards.

## Counterfactuals (CF-A through CF-D, NO API)

### CF-A: Remove all legacy visual sources

If we remove all `visual-decision-packet.json` entries, all PNG asset IDs, all VUC-inferred `business.industry` / `brandRole` from carriers, what LEGITIMATE planning strategy remains?

**Answer**: 
- G01: 0 PLANNING_STRATEGIC_SOURCE, 3 USER_REQUIREMENT (logoLocked + 2 lockedFacts), 1 PROJECT_METADATA (brandName from folder). Total: 4 anchors, all constraints/metadata, NONE strategy.
- G02: same.

**What planning strategy remains**: NONE. The user has not uploaded any planning document. The only project-specific content is the brand name (from folder) and 3 user-typed constraints (logo lock + language lock).

### CF-B: Planning-only Truth projection

If we keep only the planning-positive facts (USER_REQUIREMENT + PROJECT_METADATA + would-be PLANNING_STRATEGIC_SOURCE) and strip all legacy, how distinct are G01 and G02?

**Answer**: IDENTITY-STRIPPED, G01 and G02 are indistinguishable at the planning level:
- Both have brandName (G01=九州美学, G02=一剂良方) — DIFFERENT but the synthesis prompt's epistemic rules forbid using brand.name as positive strategic authority
- Both have logoLocked=true — IDENTICAL
- Both have lockedFacts[0]=原始 Logo Locked — IDENTICAL
- Both have lockedFacts[1]=输出语言简体中文 — IDENTICAL
- Both have 0 PLANNING_STRATEGIC_SOURCE — IDENTICAL

If we exclude brandName (per the epistemic rules), G01 and G02 are **100% identical at the planning level.** The "rich differentiation" CI-W1C.7.3 saw came entirely from legacy visual content.

### CF-C: Legacy-only projection

If we keep only the legacy-positive anchors (LEGACY_VISUAL_EVIDENCE + VISUAL_DIAGNOSIS + CREATIVE_HYPOTHESIS) and project the CI-W1C.7.3 retention curve, how much of "rich differentiation" came from old visuals?

**Answer**: ~94% of the CI-W1C.7.3 differentiation (between G01 and G02) came from legacy visual anchors (the 17 legacy positive per project). 0% came from planning.

The CI-W1C.7.3 6 directions:
- G01: 空间锚定矩阵 / 语义共振架构 / 策略部署门控 (spatial / typographic / model-assisted)
- G02: 静场域·空间留白架构 / 语境插槽·模块化叙事框架 / 字阵引航·语义优先排版系统 (structural / editorial / typographic)

The METAPHORS (museum plinth / tuning fork / stationary star / hot-pluggable modules / etc.) are from the model's pretrained design vocabulary, NOT from the legacy visual content of the projects.

So the 3 directions per project are differentiated at the family-name + metaphor level (model-invented) but NOT at the strategy level (no planning strategy to differentiate).

### CF-D: Audit-only hypothetical value-bearing Need

If the Need rewrite were applied (50-200 LOC change to embed brandName + lockedFacts VALUE in need statement text), would it carry the majority of planning strategy?

**Answer**: NO. The 4 planning-positive anchors (brandName + 3 constraints) are:
- 1 placeholder (brandName=九州美学, not strategy)
- 1 boolean (logoLocked=true, no VALUE)
- 2 constraint text (原始 Logo Locked, 输出语言简体中文)

Embedding these in need statements would marginally improve prompt salience (the model sees "brandName=九州美学" instead of generic) but would NOT carry strategy. The model would still default to "lock vs unknown" tension framework because the brandName+constraints don't add strategic VALUE.

**Verdict**: The Need rewrite would inject brandName (placeholder) into a generic template. It would NOT carry planning strategy because there IS no planning strategy in the dataset.

## What this means for the audit

1. **CI-W1C.7.3's `NEED_DERIVATION_GENERICIZATION` is correct as a SYMPTOM, wrong as a CAUSE.** The Need is generic because the upstream is empty. Fixing the Need alone won't help.

2. **CI-W1C.7.3's 93.5% drop is correct as a NUMBER, wrong as a DIAGNOSIS.** The drop is real (15 anchors → 1 anchor in need) but the input was mis-classified. The drop is not "planning semantics lost" but "legacy content filtered out by design."

3. **The system is correctly designed for the user's current state.** The AUTHORITATIVE > VISUAL resolution, the 5 generic needs, the prompt structure — all behave correctly when the input is what the user actually provided (PNGs + project metadata + locked facts).

4. **The system is NOT YET capable of planning-driven synthesis.** To get planning-driven output, the user must first provide planning data.

## Choosing TRUE_FIRST_LOSS_STAGE

Per spec PART G, choose the EARLIEST chronological material loss of LEGITIMATE planning semantics.

| Candidate | Earliest loss? | Verdict |
|---|---|---|
| PLANNING_SOURCE_NOT_PRESENT | Stage 1 (no source) | **EARLIEST** |
| PLANNING_SOURCE_NOT_REGISTERED | Stage 1.5 (no source to register) | superseded by NOT_PRESENT |
| DOCUMENT_PARSE_LOSS | Stage 2 (no doc to parse) | superseded by NOT_PRESENT |
| DOCUMENT_INTELLIGENCE_EXTRACTION_LOSS | Stage 3 (no doc to extract) | superseded by NOT_PRESENT |
| PLANNING_EVIDENCE_CONTRIBUTION_LOSS | Stage 4 (no planning evidence) | superseded by NOT_PRESENT |
| PROJECT_TRUTH_PLANNING_COMPRESSION | Stage 5 (no planning facts in Truth) | superseded by NOT_PRESENT |
| NEED_DERIVATION_GENERICIZATION | Stage 6 (no planning → generic needs) | CI-W1C.7.3's choice; wrong as earliest |
| STRATEGIC_CONTEXT_FILTER_LOSS | Stage 7 (no planning to filter) | superseded |
| PROMPT_SALIENCE_COLLAPSE | Stage 8 (no planning to elevate) | superseded |
| MODEL_SYNTHESIS_COLLAPSE | Stage 9 (no planning to ignore) | superseded |
| NO_MATERIAL_PLANNING_LOSS | n/a | disproven (0% at Stage 1) |

**STRICT RULE applied**: "choose the EARLIEST chronological material loss of LEGITIMATE planning semantics. Do not skip an earlier loss because a later one is easier to repair."

**Verdict**: `PLANNING_SOURCE_NOT_PRESENT`

The earliest material loss is at Stage 1, where the planning source does not exist. All later stages are downstream effects.

## Choosing PRIMARY_ACTIONABLE_BOTTLENECK

Per spec PART H, separately choose the first REPAIR TARGET (not necessarily the first chronological loss).

| Candidate | Repairable without user input? | Cost | Verdict |
|---|---|---|---|
| DOCUMENT_INGESTION_MISSING | needs user to upload brief | n/a (no code path) | superseded |
| PLANNING_SEMANTIC_CARRIER_MISSING | needs new module (~200-500 LOC) + test data | moderate | **VERDICT** |
| PROJECT_TRUTH_PLANNING_COMPRESSION | needs data first | n/a | superseded |
| NEED_DERIVATION_GENERICIZATION | fixable in 50-200 LOC | low | NOT YET JUSTIFIED |
| PROMPT_SALIENCE_COLLAPSE | fixable in 50-200 LOC | low | NOT YET JUSTIFIED |
| MODEL_SYNTHESIS_COLLAPSE | fixable in prompt | low | disproven (model is responsive) |
| NONE | n/a | n/a | disproven |

**Verdict**: `PLANNING_SEMANTIC_CARRIER_MISSING`

The first repair target is to add a planning-source ingestion path. This is a NEW module, not a fix to existing modules. The Need rewrite is NOT YET JUSTIFIED because the upstream is empty.

## What CI-W1C.7.3 got right

1. ✓ GENERIC_NEED_COLLAPSE = TRUE. The 5 need statements are LITERALLY identical between G01 and G02.
2. ✓ The 5 needs are shape-driven (not value-driven), as demonstrated by the 0 byte diff in statement text.
3. ✓ The 13 anchor drop at Stage 3→4 is real (the visual content doesn't reach evidence).
4. ✓ The recovery at Concept/Direction is surface-deep (metaphors from pretrained vocabulary, not from project content).

## What CI-W1C.7.3 overclaimed

1. ✗ Anchors were mis-classified as "planning" — they're mostly legacy visual.
2. ✗ The 93.5% drop was mis-read as "planning semantics lost" — it's "legacy content filtered out by design."
3. ✗ `NEED_DERIVATION_GENERICIZATION` was named as FIRST_LOSS_STAGE — it's a SYMPTOM of the upstream emptiness, not the cause.
4. ✗ The proposed Need rewrite was named as SUFFICIENT — it would be HELPFUL_BUT_INSUFFICIENT (and not even helpful until planning data exists).

## Recommended next phase

**CI-W1C.7.4 — Planning Source Ingestion** (NOT a Need rewrite)

Scope:
1. Add `briefFiles` upload support to the project UI (or a CLI path for testing).
2. Add a `planning-doc-parser` module that extracts: brand positioning, business strategy, audience, brand promise, competitive context, communication task, strategic/experience/transformation objective.
3. Add a `PLANNING_STRATEGIC_SOURCE` authority tier to the truth schema.
4. Write the parsed facts to Truth with full PLANNING_STRATEGIC_SOURCE authority (not suppressed by AUTHORITATIVE).
5. Re-run G01 and G02 with a sample brief.pdf (synthetic test data).
6. Re-measure planning retention curve.
7. Re-evaluate first-loss stage.

Cost: ~200-500 LOC + 5-10 tests + 1 sample brief.

Out of scope:
- Any change to existing need, prompt, or synthesis logic (the system is correctly designed for the empty-planning-source case).
- Any change to legacy visual handling (the VUC is correctly designed to extract from PNGs).

## Stop

Per spec: "STOP after this audit. DO NOT implement the repair in the same phase."

The audit is COMPLETE. The user must authorize CI-W1C.7.4 before implementation begins.
