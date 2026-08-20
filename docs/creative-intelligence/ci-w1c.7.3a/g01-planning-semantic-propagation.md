# CI-W1C.7.3A — G01 Planning-Only Semantic Propagation

> **Mode**: Zero-API diagnostic phase · **HEAD**: 5159d938
> **Project**: G01 九州美学
> **Scoring rubric**: 2 = preserved project-specific; 1 = generalized/weakened; 0 = lost
> **Anchors scored** (PLANNING-POSITIVE ONLY per authority contract):
> - S01 brandName=九州美学 (PROJECT_METADATA)
> - S04 logoLocked=true (USER_REQUIREMENT)
> - S05 lockedFacts[0] 原始 Logo Locked (USER_REQUIREMENT)
> - S06 lockedFacts[1] 输出语言简体中文 (USER_REQUIREMENT)
> **Excluded from this curve** (legacy positive, tracked separately): all A01..A15 + S02, S03.

## Per-anchor propagation across 8 strategic stages

| Anchor | 1 PlanSrc | 2 Parsed | 3 DI/DVC | 4 Evidence | 5 Truth | 6 Need | 7 StratCtxt | 8 Prompt | Total | Retention |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---:|---:|
| S01 brandName | 0 | 0 | 2 | 2 | 2 | 1 | 2 | 2 | 11/16 | 0.69 |
| S04 logoLocked | 0 | 0 | 1 | 0 | 2 | 1 | 2 | 2 | 8/16 | 0.50 |
| S05 Logo Locked fact | 0 | 0 | 2 | 0 | 2 | 1 | 2 | 2 | 9/16 | 0.56 |
| S06 简体中文 fact | 0 | 0 | 2 | 0 | 2 | 1 | 2 | 2 | 9/16 | 0.56 |
| **TOTAL** | 0 | 0 | 5 | 2 | 8 | 4 | 8 | 8 | 37/64 | **0.58** |

## Per-stage retention (planning-positive only)

| Stage | Anchors 2 (preserved) | Anchors 1 (weakened) | Anchors 0 (lost) | Retention |
|---|:-:|:-:|:-:|---:|
| 1 Planning Source | 0/4 | 0 | 4 | **0.000** |
| 2 Parsed | 0/4 | 0 | 4 | **0.000** |
| 3 DI/DVC | 3/4 | 1 | 0 | 0.875 |
| 4 Evidence | 1/4 | 0 | 3 | 0.250 |
| 5 Truth | 4/4 | 0 | 0 | 1.000 |
| 6 Need | 0/4 | 4 | 0 | 0.500 |
| 7 Strategic Context | 4/4 | 0 | 0 | 1.000 |
| 8 Prompt | 4/4 | 0 | 0 | 1.000 |

## Anchor-by-anchor narrative (G01)

**S01 brandName=九州美学** (PROJECT_METADATA)
- Stages 1-2: LOST. No planning source contains the brand name. The name comes from the project folder on upload, but that's not a planning source.
- Stage 3 (v1 DVC projectFacts.brandName, v2 DVC brandCore.name): 2. Brand name IS in both DVCs.
- Stage 4 (evidence-ledger): 2. Has `project:...:brand_name` evidence row.
- Stage 5 (truth): 2. `project_record:...:brand.name=九州美学` is AUTHORITATIVE + UNANIMOUS.
- Stage 6 (need): 1. Referenced in `identity.factRefs` but need statement is generic.
- Stage 7 (strategic context): 2. Carries the truth.
- Stage 8 (prompt): 2. In AUTHORITATIVE PROJECT FACTS section.
- **NOT in synthesis content** (the synthesis model treats brand.name as forbidden for positive strategic authority per the synthesis prompt's epistemic rules).

**S04 logoLocked=true** (USER_REQUIREMENT)
- Stages 1-2: LOST. No planning source specifies logoLocked.
- Stage 3 (v2 DVC brandCore doesn't have a logoLocked boolean; v1 DVC has 5 lockedAssets including 4f65f3f8 logo): 1. The lock is implicit in the lockedAssets but the boolean is not preserved.
- Stage 4 (evidence): 0. No specific evidence row.
- Stage 5 (truth): 2. `locked.logo=true` (LOCKED authority).
- Stage 6 (need): 1. Referenced via need.factRefs.
- Stage 7 (strategic context): 2. Carries the truth.
- Stage 8 (prompt): 2. In LOCKED RULES section.

**S05 lockedFacts[0] 原始 Logo Locked** (USER_REQUIREMENT)
- Stage 3: 2 (v2 DVC confirmedDecisions[0] = this exact text).
- Stage 4: 0 (no specific evidence row).
- Stage 5: 2 (truth has locked.facts=LOCKED with this text in value).
- Stage 6: 1 (referenced in need.factRefs).
- Stage 7: 2.
- Stage 8: 2.

**S06 lockedFacts[1] 输出语言简体中文** (USER_REQUIREMENT)
- Stage 3: 2 (v2 DVC confirmedDecisions[1] = this exact text).
- Stage 4: 0.
- Stage 5: 2.
- Stage 6: 1.
- Stage 7: 2.
- Stage 8: 2.

## Critical observations

1. **Stage 1-2 is 0% across all 4 anchors.** This is the PLANNING_SOURCE_NOT_PRESENT condition. No planning source means no planning semantics to lose.

2. **Stage 3 jumps to 87.5%** because the v1 DVC carries brandName and the v2 DVC carries the lockedFacts as confirmedDecisions. **The DI/DVC is doing the right thing** with what little it has.

3. **Stage 4 (Evidence) is 25%** — only brandName has an evidence row. The lockedFacts don't have specific evidence rows.

4. **Stage 5 (Truth) is 100%** — all 4 anchors are in project-truth.json with full values.

5. **Stage 6 (Need) is 50%** — all 4 anchors are referenced in need factRefs but the need STATEMENTS are generic (per CI-W1C.7.3 finding: "Locked assets and locked facts must remain unchanged across downstream creative interpretation" is the same statement for G01 and G02).

6. **Stage 7-8 is 100%** — the strategic context and prompt faithfully carry the truth.

7. **None of the 4 anchors reach the synthesis output as project-specific content.** The synthesis model paraphrases them as "visual rigidity" (S04/S05) and "linguistic rigidity" (S06) but the brand name and exact locked-fact text are absent from the synthesis content. This is by design per the synthesis prompt's epistemic rules.

## LegacyPositiveLeakage(stage)

| Stage | Legacy anchors present | Expected | Status |
|---|---:|---:|:-:|
| 1 Planning Source | 0 | 0 | ✓ |
| 2 Parsed | 0 | 0 | ✓ |
| 3 DI/DVC | 17 | 0 (legacy, allowed) | ✓ (this is where legacy lives) |
| 4 Evidence | 0 | 0 | ✓ (Evidence is 4 generic rows; no legacy) |
| 5 Truth | 5 (industry, brandRole) | 0 | **LEAK** (VUC-inferred values reached Truth) |
| 6 Need | 0 | 0 | ✓ |
| 7 Strategic Context | 5 (carries Truth) | 0 | **LEAK** (carries the VUC-inferred values) |
| 8 Prompt | 5 (carries Truth) | 0 | **LEAK** (VUC-inferred industry+brandRole in AUTHORITATIVE PROJECT FACTS) |
| 9 Synthesis (out of scope) | 0 (paraphrased only) | 0 | ✓ |

**Finding**: There IS legacy positive leakage at Stages 5/7/8 — the VUC-inferred `industry=医疗美容` and `brandRole=高端医疗美容服务提供者` reached the prompt (via Truth), which means the prompt is contaminated with VISUAL_DIAGNOSIS content. However, the synthesis output does NOT use these values (it uses the AUTHORITATIVE=待确认 placeholder instead, correctly). So the leakage is at the DATA level, not the SYNTHESIS OUTPUT level.

## CI-W1C.7.3 comparison

CI-W1C.7.3 measured `[1.00, 1.00, 1.00, 0.065, 0.065, 0.065, 0.065, 0.065, 0.000, 0.000, 0.000, 0.032, 0.032]` (15-anchor curve, all legacy positive).

CI-W1C.7.3A planning-only curve: `[0.000, 0.000, 0.875, 0.250, 1.000, 0.500, 1.000, 1.000]` (4-anchor curve, all planning positive).

The two curves measure DIFFERENT things:
- CI-W1C.7.3: legacy visual + visual diagnosis retention (high → low at Stage 3→4 → low at Synthesis)
- CI-W1C.7.3A: legitimate planning retention (zero at Stage 1-2 → high at Stage 5+Truth → unchanged to Prompt)

The CI-W1C.7.3A curve is BETTER than CI-W1C.7.3's curve at Stages 5-8 (because constraint retention is faithful) but WORSE at Stages 1-2 (because no planning source exists).

## Conclusion for G01

The legitimate planning-positive content is 4 anchors (1 PROJECT_METADATA + 3 USER_REQUIREMENT). They are all CONSTRAINTS or PLACEHOLDERS, not strategy. The pipeline preserves them faithfully from Truth to Prompt.

The 17 legacy-positive anchors (CI-W1C.7.3's 15 + 2 supplementary) are all VISUAL_DIAGNOSIS or LEGACY_VISUAL_EVIDENCE. They are partially contaminated into the prompt at Stage 8 (VUC-inferred industry+brandRole) but the synthesis output does not use them.

The TRUE_FIRST_LOSS for legitimate planning content is at **Stage 1 (Planning Source)**: the source doesn't exist.
