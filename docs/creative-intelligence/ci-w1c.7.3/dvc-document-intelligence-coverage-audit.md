# CI-W1C.7.3 — DVC + Document Intelligence Coverage Audit

> **Mode**: Zero-API static audit · **HEAD**: `c058316c442e3554c49a91a468533d5d426e5768`
> **Purpose**: Determine whether the DVC + Document Intelligence layer is structurally sufficient to carry the strategic dimensions required for project-specific synthesis. The audit lists the 9 dimensions the spec calls out (brand promise, strategic contradiction, audience psychology, competitive frame, communication task, cultural context, experience goal, transformation objective, etc.) and checks each against the actual DVC schema.

## DVC schema inventory (v1 visual-decision-packet)

The `visual-decision-packet.json` (v1.0) has these top-level sections:

| Section | G01 count | G02 count | Distinctive? |
|---|---:|---:|---|
| `projectFacts` (brandName / industry / brandRole) | 3 | 3 | YES (G01 industry=医疗美容, G02=中医健康管理与诊疗服务) |
| `lockedAssets` | 5 | 4 | YES (logos different; G01 has 2 logo variants, G02 has 1 logo+text combo) |
| `assetInventory.logoAssets` | 2 | 1 | YES |
| `assetInventory.colorAssets` | 2 | 1 (color palette) | YES |
| `assetInventory.typographyAssets` | 1 | 1 (思源宋体) | YES |
| `assetInventory.graphicMotifs` | 2 | 1 | YES |
| `assetInventory.imageryAssets` | 1 | 2 | YES |
| `assetInventory.layoutPatterns` | 1 | 1 | YES |
| `assetInventory.materialCues` | 2 | 1 | YES |
| `assetInventory.packagingStructures` | 2 | 2 | YES |
| `assetInventory.spatialCues` | 1 | 2 | YES |
| `assetInventory.copyAssets` | 2 | 1 (with 4 taglines) | YES |
| `diagnosis.valuableAssets` | 2 | 3 | YES |
| `diagnosis.overusedExpressions` | 1 | 1 | YES |
| `diagnosis.outdatedExpressions` | 1 | 0 | YES |
| `diagnosis.weakSystemAreas` | 1 | 1 | YES |
| `diagnosis.categoryCliches` | 1 | 1 | YES |
| `diagnosis.brandMisreadRisks` | 2 | 2 | YES (different risks) |
| `diagnosis.crossMediaGaps` | 1 | 1 | YES |
| `creativeDecision` (G02 only) | 0 | 1 | YES (G02 has unique block) |

**DVC layer is RICH and project-distinct.** 18+ sections × 31/33 entries = rich coverage. The DVC is NOT a bottleneck.

## DVC v2 (project-visual-context.vnext.json) schema inventory

The v2 DVC has these sections:

| Section | G01 | G02 |
|---|---|---|
| `brandCore.name` | 九州美学 | 一剂良方 |
| `brandCore.industry` | "待确认（基于现有素材推断）" | "待确认（基于现有素材推断）" |
| `brandCore.brandRole` | **null** | **null** |
| `brandCore.audience` | **[]** (empty) | **[]** (empty) |
| `lockedAssets.brandNameLocked` | true | true |
| `lockedAssets.confirmedColors` | **[]** (empty) | **[]** (empty) |
| `lockedAssets.packageStructures` | **[]** (empty) | **[]** (empty) |
| `lockedAssets.lockedAssetIds` | **[]** (empty) | **[]** (empty) |
| `visualIdentity.tone / colorBehavior / graphicBehavior / materialBehavior / compositionBehavior / lightingBehavior` | **all []** | **all []** |
| `styleBoundaries.mustAvoid` | **[]** (empty) | **[]** (empty) |
| `styleBoundaries.uncertainItems` | `[target_audience, visual_tone, color_behavior]` | `[target_audience, visual_tone, color_behavior]` |
| `confirmedDecisions` | 2 (the locked facts) | 2 (the locked facts) |
| `sourceAssetRefs[]` | 28 | 35 |

**v2 DVC is NEAR-EMPTY at the strategy level.** brandCore, visualIdentity, styleBoundaries — all 6+ arrays are EMPTY in both projects. The v2 DVC only carries asset-level data + the locked facts.

## Strategic dimensions coverage check (per spec list of 9)

The spec asks: does the DVC carry brand promise, strategic contradiction, audience psychology, competitive frame, communication task, cultural context, experience goal, transformation objective, etc.?

| Dimension | v1 visual-decision-packet | v2 project-visual-context.vnext | Where it actually lives |
|---|---|---|---|
| **Brand promise** | YES (brandRole "高端医疗美容服务提供者" / "中医诊疗...") | PARTIAL (brandCore.name but no brandRole field) | v1 (rich) |
| **Strategic contradiction** | YES (diagnosis.brandMisreadRisks MR001/MR002) | NO (styleBoundaries empty) | v1 (rich) |
| **Audience psychology** | PARTIAL (locked.copyAssets, but no explicit audience field) | NO (audience=[]) | nowhere explicit |
| **Competitive frame** | PARTIAL (diagnosis.categoryCliches) | NO (mustAvoid=[]) | v1 partial |
| **Communication task** | NO (no explicit "task" field) | NO | NOWHERE |
| **Cultural context** | YES (copyAssets, imageryAssets) | NO | v1 (rich) |
| **Experience goal** | NO (no explicit "experienceGoal" field) | NO | NOWHERE |
| **Transformation objective** | YES in G02 (creativeDecision.uniqueUpgradeThesis) | NO | v1 G02 only (1 of 2 projects) |
| **Target worldview** | YES in G02 (creativeDecision.targetWorldview) | NO | v1 G02 only |
| **Tone boundaries** | YES in G02 (creativeDecision.toneBoundaries) | NO | v1 G02 only |

## Coverage verdict

**The v1 visual-decision-packet is RICH and project-distinct.** It carries 7+ of 9 strategic dimensions (all but Communication Task and Experience Goal), and it is COMPLETELY DIFFERENT between G01 and G02 in content.

**The v2 project-visual-context.vnext is NEAR-EMPTY at the strategy level.** It only carries asset-level data; brandRole, audience, visualIdentity, mustAvoid — all empty. The v2 DVC is **structurally insufficient** for any project-specific synthesis. It is the SAME template for both projects.

**The PROBLEM is not the v1 DVC. The problem is the v1 DVC is NOT consumed by the planning pipeline.** Only 3 of the v1 DVC's 30+ fields reach the prompt (via project-truth.json → strategic-context → prompt):
- `projectFacts.brandName` (yes)
- `projectFacts.industry` (yes, but as "待确认" via AUTHORITATIVE selection)
- `projectFacts.brandRole` (yes)

Everything else — `assetInventory`, `diagnosis`, `lockedAssets`, `creativeDecision` — does NOT flow to the prompt.

## Does expanding the v2 DVC schema help?

NO. The v1 visual-decision-packet already has the rich data. Expanding v2 schema does not help because the v1 DVC data is not being read by `compile-strategic-context.ts` (which only reads from `project-truth.json`).

The FIRST_LOSS_STAGE for DVC is **NOT "schema expansion"** (which the spec warns against assuming) — it is "v1 DVC is structurally rich but structurally disconnected from the planning pipeline."

## Hard rule check (spec PART G)

The spec says: "Do not assume schema expansion is needed; prove it." This audit proves:
- v1 DVC has the rich content → schema is NOT the bottleneck.
- v1 DVC content does not flow to Truth/Prompt → WIRING is the bottleneck.

Therefore the FIRST_LOSS_STAGE is NOT DVC_SCHEMA_COMPRESSION. It is one of:
- `EVIDENCE_CONTRIBUTION_LOSS` (v1 DVC asset entries never become evidence-ledger rows)
- `PROJECT_TRUTH_COMPRESSION` (v1 DVC projectFacts do flow to Truth, but the AUTHORITATIVE resolution suppresses business.industry)

See `first-loss-stage-decision.md` for the final verdict.
