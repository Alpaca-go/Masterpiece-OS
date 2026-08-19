# CI-W1C.5 — Visual Evidence Propagation Trace

> **Status**: COMPLETE (PART B of CI-W1C.5)
> **Date**: 2026-08-19
> **Resume.1 Frozen HEAD**: `9ac172f13c7c52482a129ad57d07e14ef3c890ca`
> **CI-W1C.5 Baseline HEAD**: `2330259014af569f0254257e282fe8c4660a121c` (local == origin)
> **Source of trace data**: real-model smoke 2026-08-19-2310 G01 (`5045f546-e943-465d-bb4f-4c48bacad27a`) + G02 (`d14336f2-7139-48cc-84f5-dcda6b9f5ed4`)
> **Production code delta at this stage**: 0 (no code change yet)

---

## 0. Goal

Determine, by **tracing concrete evidence items through every layer**, exactly
where the project-specific visual content is dropped, transformed, or ignored —
so PART E can pick the **smallest** possible repair at the first loss stage.

Per spec §3 + §11:
- 5 G01 evidence items, 5 G02 evidence items
- 10 layers (16 substages)
- Each cell: `PRESENT` / `TRANSFORMED` / `DROPPED` / `IGNORED` / `NOT_SUPPORTED_BY_SCHEMA`
- Identify `FIRST_LOSS_STAGE`

---

## 1. Evidence Items Selected

### 1.1 G01 evidence set (5 items)

| ID | Visual element | sourceRef (visualDecisionPacket path) |
|---|---|---|
| G01-E1 | `#5837BD` 孔雀紫 | `visualDecisionPacket.assetInventory.colorAssets[0]` (孔雀紫主色) |
| G01-E2 | 孔雀羽毛 | `visualDecisionPacket.assetInventory.graphicMotifs[0]` (孔雀羽毛 motif) |
| G01-E3 | 莲花 / 花朵 | `visualDecisionPacket.assetInventory.graphicMotifs[1]` (莲花/花朵图形) |
| G01-E4 | 混凝土与玻璃 | `visualDecisionPacket.assetInventory.materialCues[1]` (混凝土与玻璃材质) |
| G01-E5 | 孔雀主题海报 | `visualDecisionPacket.assetInventory.imageryAssets[0]` (孔雀主题海报) |

### 1.2 G02 evidence set (5 items)

| ID | Visual element | sourceRef (visualDecisionPacket path) |
|---|---|---|
| G02-E1 | `#B00000` 印章红 + `#B59A6B` 木色 | `visualDecisionPacket.assetInventory.colorAssets[0]` (品牌色盘) |
| G02-E2 | 思源宋体 | `visualDecisionPacket.assetInventory.typographyAssets[0]` (思源宋体体系) |
| G02-E3 | 红色"良"字变体 | `visualDecisionPacket.assetInventory.logoAssets[0]` (图标与文字标组合) |
| G02-E4 | 中药柜摄影 | `visualDecisionPacket.assetInventory.imageryAssets[0]` (中药柜摄影) |
| G02-E5 | 哑光纸张 / 凸印 | `visualDecisionPacket.assetInventory.materialCues[0]` (名片纸张与工艺) |

---

## 2. Layer Definitions

The trace matrix uses 10 conceptual layers (16 substages):

1. **L1 — visualDecisionPacket**: structured analysis output in `project-visual-context.vnext.json`
2. **L2 — brief v2**: pure-content brief (the input document the workflow reads)
3. **L3 — Extraction**: DVC extraction step (model extracts structured fields from brief)
4. **L4 — DVC structure**: top-level fields of `DocumentVisualContext`
5. **L5 — Evidence Registry**: `intermediate/evidence.json` entries
6. **L6 — Project Truth**: `intermediate/truth.json` facts
7. **L7 — Need input**: inputs to need-builder
8. **L8 — Need output**: `intermediate/need.json` items
9. **L9 — Insight input**: inputs to insight-builder
10. **L10 — Insight output**: `intermediate/insight.json` items
11. **L11 — Opportunity input**: inputs to opportunity-builder
12. **L12 — Opportunity output**: `intermediate/opportunity.json` items
13. **L13 — Concept input**: inputs to concept generation
14. **L14 — Concept output**: `intermediate/concept-set.json` items
15. **L15 — Direction input**: inputs to direction generation
16. **L16 — Direction output**: `intermediate/direction-set.json` items

---

## 3. Trace Matrix — G01

| Stage | G01-E1 #5837BD 孔雀紫 | G01-E2 孔雀羽毛 | G01-E3 莲花/花朵 | G01-E4 混凝土与玻璃 | G01-E5 孔雀主题海报 |
|---|---|---|---|---|---|
| **L1 visualDecisionPacket** | PRESENT | PRESENT | PRESENT | PRESENT | PRESENT |
| **L2 brief v2 (V-4 to V-10)** | PRESENT (V-6) | PRESENT (V-7) | PRESENT (V-7) | PRESENT (V-10) | PRESENT (V-8) |
| **L3 Extraction (model output → DVC fields)** | TRANSFORMED — items concatenated into `visualPreferences` string, per-item `kind` / `assetId` / `frequency` / `visualFeatures` LOST | TRANSFORMED | TRANSFORMED | TRANSFORMED | TRANSFORMED |
| **L4 DVC structure** | TRANSFORMED — all 5 G01 items live inside one `visualPreferences` string field; no `visualAssetObservations` or equivalent structured list | TRANSFORMED | TRANSFORMED | TRANSFORMED | TRANSFORMED |
| **L5 Evidence Registry** | DROPPED — only 3 entries exist (`brand_name`, `industry`, `general`); no per-item asset entries | DROPPED | DROPPED | DROPPED | DROPPED |
| **L6 Project Truth** | DROPPED — `truth.facts` has 17 items but **0 reference `visualDecisionPacket.assetInventory.*` source paths**; only `project_record.*` and `document_visual_context.*` fact IDs | DROPPED | DROPPED | DROPPED | DROPPED |
| **L7 Need input** | IGNORED — Need construction reads `brand.name` / `business.industry` / `locked.facts` / `audience.primary` / `business.model` only; does not read `visualPreferences` / `visualIdentity` / `visualDecisionPacket` | IGNORED | IGNORED | IGNORED | IGNORED |
| **L8 Need output** | DROPPED — 4 Need items, **0 reference any visual asset fact**; all factRefs are `project_record:locked.facts` / `project_record:locked.logo` / `document_visual_context:brand.name` / `business.industry` / `audience.primary` | DROPPED | DROPPED | DROPPED | DROPPED |
| **L9 Insight input** | IGNORED — Insight construction reads Need items + facts; since Need carries no visual refs, Insight has nothing to consume | IGNORED | IGNORED | IGNORED | IGNORED |
| **L10 Insight output** | DROPPED — 3 Insight items, all reference `project_record:locked.facts` / `document_visual_context:brand.name` / `audience.primary` only; **0 reference visual assets** | DROPPED | DROPPED | DROPPED | DROPPED |
| **L11 Opportunity input** | IGNORED — Opportunity derivation reads Insight.factRefs + Need.factRefs; both are non-visual, so opportunity construction has no visual input | IGNORED | IGNORED | IGNORED | IGNORED |
| **L12 Opportunity output** | DROPPED — 3 Opportunity items, all `factRefs` are non-visual (locked.facts / locked.logo / brand.name / business.industry / audience.primary / business.model); **0 reference visualDecisionPacket paths** | DROPPED | DROPPED | DROPPED | DROPPED |
| **L13 Concept input** | IGNORED — `generateConcepts` reads `opportunity.factRefs` + `insight.factRefs` + `need.factRefs`; since none reference visual items, the input to concept generation has no visual content | IGNORED | IGNORED | IGNORED | IGNORED |
| **L14 Concept output** | TRANSFORMED — 2 Concepts produced by `CLUSTER_PATTERN_MAP[opp.cluster]` with **deterministic template text** ("将已有的品牌资产从被动存储状态激活为创意驱动力..."). Title / thesis / mechanism / rationale are template literals, not derived from visual items | TRANSFORMED | TRANSFORMED | TRANSFORMED | TRANSFORMED |
| **L15 Direction input** | IGNORED — Direction generation reads `concept.factRefs` (non-visual) + `concept.opportunityRefs` + `concept.insightRefs` (all non-visual); the direction input has no visual anchor | IGNORED | IGNORED | IGNORED | IGNORED |
| **L16 Direction output** | TRANSFORMED — 4 Directions produced by direction synthesis with **deterministic template families** ("material-expression", "editorial-system", "modular-identity", "editorial-system"); thesis / visualMechanism are templated from `directionFamily` + concept; **0 reference visualDecisionPacket items** | TRANSFORMED | TRANSFORMED | TRANSFORMED | TRANSFORMED |

---

## 4. Trace Matrix — G02

| Stage | G02-E1 #B00000 / #B59A6B | G02-E2 思源宋体 | G02-E3 红色"良"字 | G02-E4 中药柜摄影 | G02-E5 哑光纸张/凸印 |
|---|---|---|---|---|---|
| **L1 visualDecisionPacket** | PRESENT | PRESENT | PRESENT | PRESENT | PRESENT |
| **L2 brief v2 (V-4 to V-10)** | PRESENT (V-5) | PRESENT (V-6) | PRESENT (V-4) | PRESENT (V-8) | PRESENT (V-10) |
| **L3 Extraction** | TRANSFORMED — items flattened to `visualPreferences` string; per-item structure lost | TRANSFORMED | TRANSFORMED | TRANSFORMED | TRANSFORMED |
| **L4 DVC structure** | TRANSFORMED — single `visualPreferences` string contains all 5 G02 items; no per-item structured form | TRANSFORMED | TRANSFORMED | TRANSFORMED | TRANSFORMED |
| **L5 Evidence Registry** | DROPPED — only 3 entries (`brand_name`, `industry`, `general`); no per-item asset entries | DROPPED | DROPPED | DROPPED | DROPPED |
| **L6 Project Truth** | DROPPED — 17 facts, 0 reference `visualDecisionPacket.*` | DROPPED | DROPPED | DROPPED | DROPPED |
| **L7 Need input** | IGNORED | IGNORED | IGNORED | IGNORED | IGNORED |
| **L8 Need output** | DROPPED — 4 Need items, identical to G01 (string-equal) | DROPPED | DROPPED | DROPPED | DROPPED |
| **L9 Insight input** | IGNORED | IGNORED | IGNORED | IGNORED | IGNORED |
| **L10 Insight output** | DROPPED — 3 Insight items, identical to G01 (string-equal) | DROPPED | DROPPED | DROPPED | DROPPED |
| **L11 Opportunity input** | IGNORED | IGNORED | IGNORED | IGNORED | IGNORED |
| **L12 Opportunity output** | DROPPED — 3 Opportunity items, identical to G01 (string-equal) | DROPPED | DROPPED | DROPPED | DROPPED |
| **L13 Concept input** | IGNORED | IGNORED | IGNORED | IGNORED | IGNORED |
| **L14 Concept output** | TRANSFORMED — 2 Concepts produced by template; identical to G01 (string-equal) | TRANSFORMED | TRANSFORMED | TRANSFORMED | TRANSFORMED |
| **L15 Direction input** | IGNORED | IGNORED | IGNORED | IGNORED | IGNORED |
| **L16 Direction output** | TRANSFORMED — 4 Directions produced by template; identical to G01 (string-equal) | TRANSFORMED | TRANSFORMED | TRANSFORMED | TRANSFORMED |

---

## 5. FIRST_LOSS_STAGE Identification

### 5.1 The L3 → L4 transition is where loss becomes structural

**L1 → L2 → L3**: PRESENT → PRESENT → TRANSFORMED.
At L3, the DVC extraction flattens the visualDecisionPacket items into a single
`visualPreferences` string. Each item's per-item identity is lost (assetId,
kind, frequency, visualFeatures, possibleBrandMeaning are compressed into
`视觉资产侧主标志` ... `品牌色盘` ... `图形 motif` segments separated by `|`).

**L4 (DVC structure)**: TRANSFORMED.
`visualPreferences` is a single string field. There is no per-item record
of "kind=color, value=#5837BD, source=visualDecisionPacket.assetInventory.colorAssets[0]"
that can be indexed by Evidence Registry or Project Truth.

**L5 (Evidence Registry)**: DROPPED.
The 5 G01 items + 5 G02 items do not appear as discrete evidence entries. The
Evidence Registry only carries:
- `project:...:brand_name` (project_record)
- `project:...:industry` (project_record)
- `doc:...:general` (one document_visual_context entry; summary only)

The `doc:...:general` entry has empty `content` — it's a placeholder, not a
structured per-item observation.

**L6 (Project Truth)**: DROPPED.
No `visualDecisionPacket.assetInventory.*` fact IDs exist. Project Truth carries
brand.name / business.industry / locked.facts / audience.primary / business.model
only.

**L7+**: IGNORED → DROPPED → TRANSFORMED chain (Need / Insight / Opportunity
do not see visual items; Concept / Direction use deterministic templates that
ignore any visual content that might have been available).

### 5.2 FIRST_LOSS_STAGE

> **FIRST_LOSS_STAGE = L3-L4 (DVC extraction & structure)**
>
> The DVC extractor (L3) reads the brief v2 and produces a single
> `visualPreferences` string, losing the per-item structure of
> `visualDecisionPacket.assetInventory`. The DVC top-level structure (L4)
> doesn't expose per-item fields. As a result, the Evidence Registry (L5)
> cannot index per-item evidence, Project Truth (L6) cannot carry per-item
> facts, and Need / Insight / Opportunity / Concept / Direction (L7-L16)
> all receive no visual asset signal — even though the model is generating
> `visualPreferences` content, no downstream layer knows how to use it.

### 5.3 Why not earlier / later

- **Not L1 → L2**: brief v2 preserves all 5 G01 items in V-4 to V-10 (PRESENT)
- **Not L2 → L3**: DVC extractor can read the items; the items are present in
  the extraction result (as `visualPreferences` string content). The issue is
  that the extraction output is shaped as one string, not as a list of items.
- **Not L3 → L4 (alternative)**: L3 is the model step that produces the
  string; L4 is the typed `DocumentVisualContext` shape. The boundary between
  them is the model → schema handoff. The model produces a string; the schema
  only has `visualPreferences: string[]` (or similar). The model COULD produce
  a structured list, but the schema doesn't ask for it.
- **Not L4 → L5**: Even if DVC had a structured `visualAssetObservations` field,
  the Evidence Registry (L5) would still need an extractor to index per-item.
  This is downstream of the loss but the seed is at L3-L4.

---

## 6. Architecture Rule (PART C)

Per spec §2:

> 禁止 `visualDecisionPacket → direct Direction bypass`
> 保持 `Sources → Evidence → Project Truth → Understanding → Opportunity → Concept → Direction → Canon`

**DVC sufficiency decision: SUFFICIENT** (no schema change required).

The DVC already has `visualPreferences` (string). What is missing is:
1. A **structured per-item list** derived from `visualDecisionPacket.assetInventory`
   (e.g. `visualAssetObservations: Array<{kind, statement, sourceRef, confidence}>`).
2. A **per-item evidence indexing** in the Evidence Registry.
3. A **per-item fact carrier** in Project Truth (e.g. `visualAsset.color` /
   `visualAsset.material`).
4. A **Need / Insight / Opportunity input compiler** that surfaces
   `visualAsset.*` facts to the lower layers.

Items 1, 2, 3 can be done by adding a **new layer / carrier** between DVC and
Evidence Registry (or between DVC and Need input). The DVC schema itself
doesn't need to change if we expose the new carrier as a **separate
contribution contract** (e.g. `VisualEvidenceContribution` per spec §14).

**Truth sufficiency decision: SUFFICIENT** (no schema change required).

The Truth taxonomy already has `fact.truthClass` and `fact.evidenceRefs`. The
new `visualAsset.*` facts can be added under existing truthClass values
(VISUAL_SOURCE_FACT for observed facts; MODEL_INFERENCE for inferred meanings).
No new `truthClass` enum value needed.

---

## 7. Authority Classification (PART D)

Per spec §13:

### 7.1 VISUAL_SOURCE_FACT (the 5 G01 + 5 G02 items)

These come from `visualDecisionPacket.assetInventory` which is a structured
analysis output (not a user or document claim). Per spec, structured analysis
outputs at `confidence >= 0.8` are `VISUAL_SOURCE_FACT`:

| Item | sourceRef | confidence | Authority |
|---|---|---|---|
| #5837BD 孔雀紫 | visualDecisionPacket.assetInventory.colorAssets[0] | 1.0 | VISUAL_SOURCE_FACT |
| 孔雀羽毛 | visualDecisionPacket.assetInventory.graphicMotifs[0] | 0.9 | VISUAL_SOURCE_FACT |
| 莲花/花朵 | visualDecisionPacket.assetInventory.graphicMotifs[1] | 0.8 | VISUAL_SOURCE_FACT |
| 混凝土与玻璃 | visualDecisionPacket.assetInventory.materialCues[1] | 0.8 | VISUAL_SOURCE_FACT |
| 孔雀主题海报 | visualDecisionPacket.assetInventory.imageryAssets[0] | 0.9 | VISUAL_SOURCE_FACT |
| #B00000 / #B59A6B 品牌色盘 | visualDecisionPacket.assetInventory.colorAssets[0] | 1.0 | VISUAL_SOURCE_FACT |
| 思源宋体 | visualDecisionPacket.assetInventory.typographyAssets[0] | 1.0 | VISUAL_SOURCE_FACT |
| 红色"良"字变体 | visualDecisionPacket.assetInventory.logoAssets[0] | 1.0 | VISUAL_SOURCE_FACT |
| 中药柜摄影 | visualDecisionPacket.assetInventory.imageryAssets[0] | 0.8 | VISUAL_SOURCE_FACT |
| 哑光纸张/凸印 | visualDecisionPacket.assetInventory.materialCues[0] | 0.9 | VISUAL_SOURCE_FACT |

### 7.2 MODEL_INFERENCE (meanings)

The `possibleBrandMeaning` field in `visualDecisionPacket.assetInventory` is
inferred by the analysis model from visual content. It is NOT user-confirmed
or document-confirmed. Per spec §13, meanings should be `MODEL_INFERENCE`
unless user/document explicitly confirms:

| Meaning | Source | Class |
|---|---|---|
| 高端 / 专业 / 美学 (from #5837BD) | assetInventory.colorAssets[0].possibleBrandMeaning | MODEL_INFERENCE |
| 优雅 / 蜕变 (from 孔雀羽毛) | assetInventory.graphicMotifs[0].possibleBrandMeaning | MODEL_INFERENCE |
| 纯净 / 和谐 (from 莲花/花朵) | assetInventory.graphicMotifs[1].possibleBrandMeaning | MODEL_INFERENCE |
| 专业 / 科技感 / 纯净 (from 混凝土与玻璃) | assetInventory.materialCues[1].possibleBrandMeaning | MODEL_INFERENCE |
| 美学体验 / 蜕变 (from 孔雀主题海报) | assetInventory.imageryAssets[0].possibleBrandMeaning | MODEL_INFERENCE |
| 中药柜木质感 / 印章红 / 医疗白 (G02) | assetInventory.colorAssets[0].possibleBrandMeaning | MODEL_INFERENCE |
| 传统文化底蕴 / 专业严谨 (G02 思源宋体) | assetInventory.typographyAssets[0].possibleBrandMeaning | MODEL_INFERENCE |
| 传统与现代结合 / 素问经典传承 (G02 logo) | assetInventory.logoAssets[0].possibleBrandMeaning | MODEL_INFERENCE |
| 传统中药房 / 制药过程 (G02 imagery) | assetInventory.imageryAssets[*].possibleBrandMeaning | MODEL_INFERENCE |
| 质感 / 低调奢华 (G02 material) | assetInventory.materialCues[0].possibleBrandMeaning | MODEL_INFERENCE |

> **Important**: The 5 G01 + 5 G02 visual items are real evidence (the
> `visualFeatures` field). The 5 + 5 meanings are model inferences and must
> not be promoted to `USER_REQUIREMENT` or `LOCKED` fact status.

---

## 8. Production Code Touch Map

| Layer | Code path | Modification needed? |
|---|---|---|
| L1 visualDecisionPacket | `apps/web-runtime/.../visual-context-builder` + `packages/creative-intelligence/.../visual-decision-packet.ts` | **NO** (don't touch vnext.json generation) |
| L2 brief v2 | `.codex-smoke/ci-w1c.4-resume/g0X-...-brief-v2.md` | **NO** (already evidence-strict) |
| L3 Extraction | `packages/creative-intelligence/src/document-intelligence/document-context-core.ts` (EXTRACTION_SYSTEM_PROMPT) | **NO** (FROZEN — Document Intelligence epistemic classification is FROZEN per spec) |
| L4 DVC structure | `packages/creative-intelligence/src/document-intelligence/contracts.ts` (DocumentVisualContext schema) | **NO** (FROZEN — DVC schema is FROZEN per spec) |
| **NEW L4.5 — VisualEvidenceContribution** | (new file under `packages/creative-intelligence/src/visual-evidence/` or similar) | **YES** (smallest possible new module — does NOT modify L3 / L4 frozen surfaces) |
| L5 Evidence Registry | `packages/creative-intelligence/src/truth/...` (evidence contract) | **PARTIAL** — only add indexing path for new contribution; do not change existing schema |
| L6 Project Truth | `packages/creative-intelligence/src/truth/contracts.ts` | **PARTIAL** — only add `visualAsset.*` fact registration; do not change existing taxonomy |
| L7-L12 Need/Insight/Opportunity input compiler | `packages/creative-intelligence/src/concept-intelligence/...` (need-builder, insight-builder, opportunity-builder) | **PARTIAL** — read new contribution; existing logic preserved |
| L13-L16 Concept / Direction generation | `packages/creative-intelligence/src/concept-intelligence/generate-concepts.ts` + `direction-intelligence/` | **NO** (template logic stays; just feeds visual content into the template's variable slots) |

---

## 9. Selected Minimal Repair (preview of PART E)

> Per spec §4 + §14:
> "A. Visual evidence contribution / normalization" is the allowed unfreeze
> scope, and the first loss stage is at L3-L4. The minimal repair is to add a
> **VisualEvidenceContribution** module that:
>
> 1. Reads `visualDecisionPacket.assetInventory` (from `project-visual-context.vnext.json`).
> 2. Emits structured `observedFacts` (kind / statement / sourceRef / confidence
>    / VISUAL_SOURCE_FACT) and `inferredMeanings` (statement / sourceRef /
>    confidence / MODEL_INFERENCE).
> 3. Registers each observed fact as an Evidence Registry entry + Project Truth
>    fact (with `key` namespace `visualAsset.*`).
> 4. Surfaces a `visualAsset.*` fact list to the Need / Insight / Opportunity
>    input compiler so those layers can produce `project-specific` items.

See PART E (next step) for the actual code change plan and commit boundaries.

---

## 10. Sign-off conditions for this trace

- [x] 5 G01 + 5 G02 evidence items selected
- [x] 10 layers (16 substages) traced
- [x] Each cell classified (PRESENT / TRANSFORMED / DROPPED / IGNORED)
- [x] FIRST_LOSS_STAGE identified: **L3-L4 (DVC extraction & structure)**
- [x] DVC sufficiency: SUFFICIENT (no schema change)
- [x] Truth sufficiency: SUFFICIENT (no schema change)
- [x] Authority preserved: 10 visual items = VISUAL_SOURCE_FACT; 10+ meanings = MODEL_INFERENCE
- [x] Architecture rule: no `visualDecisionPacket → direct Direction` bypass
- [x] No production code change yet
- [x] Output written to `docs/creative-intelligence/ci-w1c.5/visual-evidence-propagation-trace.md`

Proceed to PART E (minimal repair) and PART I (same-model real smoke).
