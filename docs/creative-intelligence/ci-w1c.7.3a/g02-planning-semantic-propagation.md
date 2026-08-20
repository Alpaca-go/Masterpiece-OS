# CI-W1C.7.3A — G02 Planning-Only Semantic Propagation

> **Mode**: Zero-API diagnostic phase · **HEAD**: 5159d938
> **Project**: G02 一剂良方
> **Anchors scored** (PLANNING-POSITIVE ONLY):
> - S01 brandName=一剂良方 (PROJECT_METADATA)
> - S04 logoLocked=true (USER_REQUIREMENT)
> - S05 lockedFacts[0] 原始 Logo Locked (USER_REQUIREMENT)
> - S06 lockedFacts[1] 输出语言简体中文 (USER_REQUIREMENT)
> **Excluded**: all A01..A16 + S02, S03 (legacy positive).

## Per-anchor propagation across 8 strategic stages

| Anchor | 1 PlanSrc | 2 Parsed | 3 DI/DVC | 4 Evidence | 5 Truth | 6 Need | 7 StratCtxt | 8 Prompt | Total | Retention |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---:|---:|
| S01 brandName | 0 | 0 | 2 | 2 | 2 | 1 | 2 | 2 | 11/16 | 0.69 |
| S04 logoLocked | 0 | 0 | 1 | 0 | 2 | 1 | 2 | 2 | 8/16 | 0.50 |
| S05 Logo Locked fact | 0 | 0 | 2 | 0 | 2 | 1 | 2 | 2 | 9/16 | 0.56 |
| S06 简体中文 fact | 0 | 0 | 2 | 0 | 2 | 1 | 2 | 2 | 9/16 | 0.56 |
| **TOTAL** | 0 | 0 | 5 | 2 | 8 | 4 | 8 | 8 | 37/64 | **0.58** |

## Per-stage retention (planning-positive only)

| Stage | Anchors 2 | Anchors 1 | Anchors 0 | Retention |
|---|:-:|:-:|:-:|---:|
| 1 Planning Source | 0/4 | 0 | 4 | **0.000** |
| 2 Parsed | 0/4 | 0 | 4 | **0.000** |
| 3 DI/DVC | 3/4 | 1 | 0 | 0.875 |
| 4 Evidence | 1/4 | 0 | 3 | 0.250 |
| 5 Truth | 4/4 | 0 | 0 | 1.000 |
| 6 Need | 0/4 | 4 | 0 | 0.500 |
| 7 Strategic Context | 4/4 | 0 | 0 | 1.000 |
| 8 Prompt | 4/4 | 0 | 0 | 1.000 |

## Cross-project observation (G01 vs G02 planning-only)

The 4-anchor planning-positive curve is **IDENTICAL** between G01 and G02 (both at 0.58 total retention). The 4 anchors are the same categories (1 metadata + 3 user requirement), so the propagation pattern is the same.

The only difference at Stage 3: G01 has 1 anchor at score 1 (logoLocked missing from v1 DVC projectFacts); G02 has the same. So no project-level difference at the planning-positive level.

**Insight**: even with different brand names, the LEGITIMATE PLANNING curve is identical between G01 and G02 because the user-typed metadata is structurally the same (brandName from folder + 2 lockedFacts). The DIFFERENTIATION between G01 and G02 in the live synthesis output comes entirely from the LEGACY visual content (VUC-extracted brand.role and asset inventory) which is NOT planning-positive.

## LegacyPositiveLeakage (G02)

| Stage | Legacy anchors present | Expected | Status |
|---|---:|---:|:-:|
| 1 Planning Source | 0 | 0 | ✓ |
| 2 Parsed | 0 | 0 | ✓ |
| 3 DI/DVC | 17 | 0 (legacy lives here) | ✓ |
| 4 Evidence | 0 | 0 | ✓ |
| 5 Truth | 5 (industry, brandRole) | 0 | **LEAK** (VUC values reach Truth) |
| 6 Need | 0 | 0 | ✓ |
| 7 Strategic Context | 5 (carries Truth) | 0 | **LEAK** (carries VUC values) |
| 8 Prompt | 5 (carries Truth) | 0 | **LEAK** (VUC values in AUTHORITATIVE PROJECT FACTS) |
| 9 Synthesis (out of scope) | 0 (not quoted) | 0 | ✓ |

Same pattern as G01: VUC-inferred industry + brandRole reach the prompt but are NOT used by the synthesis output (the model defaults to AUTHORITATIVE=待确认 placeholder).

G02's CREATIVE_HYPOTHESIS anchor (A15 creativeDecision block) is also a legacy-positive leak source: the v1 DVC's creativeDecision sub-block contains rich content (brandRoleStatement, upgradeFrom, preserveCore, upgradeTo, uniqueUpgradeThesis, targetWorldview, toneBoundaries) that does NOT reach the prompt's AUTHORITATIVE PROJECT FACTS section. So the creativeDecision is at Stage 3 only, not Stages 4-8.

## CI-W1C.7.3 comparison (G02)

CI-W1C.7.3 G02 curve: `[1.00, 1.00, 1.00, 0.063, 0.063, 0.063, 0.063, 0.063, 0.000, 0.000, 0.000, 0.031, 0.031]` (16-anchor legacy curve).

CI-W1C.7.3A G02 planning-only curve: `[0.000, 0.000, 0.875, 0.250, 1.000, 0.500, 1.000, 1.000]` (4-anchor planning curve).

Same observation as G01: planning curve is better at Stages 5-8 (constraint preservation works) but worse at Stages 1-2 (no planning source).

## Conclusion for G02

Same as G01: 4 legitimate planning-positive anchors (constraints/placeholders, no strategy), 17 legacy-positive anchors, TRUE_FIRST_LOSS at Stage 1.
