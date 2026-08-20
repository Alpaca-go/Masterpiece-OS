# CI-W1C.7.3A — Legacy Positive Leakage Audit

> **Mode**: Zero-API diagnostic phase · **HEAD**: 5159d938
> **Purpose**: Audit whether LEGACY_VISUAL_EVIDENCE / VISUAL_DIAGNOSIS / CREATIVE_HYPOTHESIS anchors leak into the strategic pipeline stages (Need, Prompt, Synthesis). Expected: 0 at Need / Prompt / Synthesis.

## Definition

`LegacyPositiveLeakage(stage)` = count of legacy positive anchors (LEGACY_VISUAL_EVIDENCE + VISUAL_DIAGNOSIS + CREATIVE_HYPOTHESIS) whose VALUE is reachable as a positive authority at that stage.

If a stage is meant to carry only planning-positive content, ANY legacy positive anchor reaching that stage is a **leak**.

## Per-stage leakage (G01 + G02 combined)

| Stage | Legacy positive anchors present | Expected | Status | Notes |
|---|---:|---:|---|---|
| 1 Planning Source | 0 | 0 | ✓ | No planning source. No legacy. |
| 2 Parsed | 0 | 0 | ✓ | — |
| 3 DI/DVC | 34 (combined) | 0 (legacy lives here) | ✓ (DESIGN) | The DVC's job is to extract from visuals. Legacy is its CONTENT. |
| 4 Evidence | 0 | 0 | ✓ | Evidence is a 4-row generic table (brand_name, industry, visual_understanding_core, PSO provenance). No per-asset evidence. |
| 5 Truth | 8 (G01 5 + G02 5; subtract 2 for unique to each project) | 0 | **LEAK** | VUC-inferred `industry=医疗美容` / `中医健康管理与诊疗服务` and `brandRole=高端医疗美容服务提供者` / `提供中医诊疗、慢病管理及养生服务的体验机构` reach Truth as visual_understanding_core facts. |
| 6 Need | 0 | 0 | ✓ | Need factRefs reference these UUIDs but need statements are generic. No leakage at statement level. |
| 7 Strategic Context | 8 (carries Truth) | 0 | **LEAK** | The runtime context builder carries Truth's VISUAL_DIAGNOSIS entries as `authoritativeFacts[]`. |
| 8 Prompt | 8 (carries Truth) | 0 | **LEAK** | The prompt's AUTHORITATIVE PROJECT FACTS section lists the VUC-inferred values. |
| 9 Synthesis | 0 (paraphrased only) | 0 | ✓ | The synthesis model does NOT quote the VUC-inferred industry+brandRole. It defaults to AUTHORITATIVE=待确认 placeholder. |

## Net leakage summary

| Stage | Leak count | Severity | Verdict |
|---|---:|---|---|
| 5 Truth | 5 per project (10 combined) | MODERATE | VUC values reach Truth as `VISUAL_SOURCE_FACT` facts. The conflict resolution CORRECTLY suppresses them in favor of `AUTHORITATIVE_PROJECT_METADATA=待确认` for `business.industry`, but the raw values ARE in Truth. |
| 7 Strategic Context | 5 per project (10 combined) | LOW | The runtime builder copies Truth's facts into the prompt context. The prompt's epistemic rules say "AUTHORITATIVE wins for business facts," but the visual_understanding_core values are also in the same facts[] array. |
| 8 Prompt | 5 per project (10 combined) | LOW | The prompt's AUTHORITATIVE PROJECT FACTS section lists ALL 3 projectFacts (brandName from 3 carriers, brandRole from 2 carriers, business.industry from 3 carriers) with values. The model sees `industry=待确认` (AUTHORITATIVE) AND `industry=医疗美容` (VISUAL) in the same prompt. The model correctly uses the AUTHORITATIVE value but the visual value is "leaked" into the prompt. |

## What the leakage does NOT cause

- **The synthesis output does NOT quote the VUC-inferred industry or brandRole.** The model's text content uses the AUTHORITATIVE=待确认 placeholder, paraphrased as "undefined market context" / "unresolved business model."
- **The concept output does NOT use the VUC-inferred values as centralMetaphor.** The 3 G01 metaphors (museum plinth / tuning fork / compass) and 3 G02 metaphors (stationary star / hot-pluggable modules / typesetting orbit) are all from the model's pretrained design vocabulary, not from the VUC's values.
- **The direction output does NOT use the VUC-inferred values as directionFamily.** G01 uses spatial-system / typographic-system / model-assisted; G02 uses structural-system / editorial-system / typographic-system. None of these families are derived from the VUC's industry or brandRole.

## What the leakage DOES cause

- **The prompt carries contradictory information.** The AUTHORITATIVE PROJECT FACTS section says `industry=待确认` AND `industry=医疗美容` AND `industry=中医健康管理与诊疗服务` (3 carriers). The model has to choose which to use.
- **The Truth conflict metadata carries forward.** The prompt's conflict warnings about "open conflicts on industry" are real because the VUC value contradicts the AUTHORITATIVE placeholder.
- **The 5-dim evaluation framework sees a "risk" need** (from the open industry conflict) that the model must navigate, even though the user has accepted the placeholder as their current state.

## Verdict

The legacy positive leakage at Truth / Strategic Context / Prompt is **STRUCTURALLY PRESENT but OPERATIONALLY NEUTRALIZED**:
- Present: the VUC's values are in the data
- Neutralized: the conflict resolution + epistemic rules + model behavior combine to suppress these values in the synthesis output
- Cost: the prompt is LARGER and NOISIER than it needs to be (carries redundant/contradictory data)

If the user re-specifies business.industry to a real value (e.g., confirms "医疗美容" in project.json), the conflict would be RESOLVED, the leakage would END, and the prompt would carry a single clean value. The system is correctly designed for this future state.

## Hard rule check (spec PART F)

> "LEGACY_VISUAL_EVIDENCE / VISUAL_DIAGNOSIS must NOT count as positive planning retention."

✓ Confirmed: the planning-positive retention curve in `planning-only-retention-metrics.json` EXCLUDES all legacy positive anchors. Only PLANNING_STRATEGIC_SOURCE + USER_REQUIREMENT + PROJECT_METADATA are counted.

> "Expected: 0 at Need / Prompt / Synthesis."

- Need: 0 ✓
- Prompt: 5 (G01) + 5 (G02) per project, 10 combined — **NOT 0** (leak present)
- Synthesis: 0 ✓

The Prompt leak is real but operationally neutralized. The audit does not recommend fixing the prompt at this stage (the leak is small and not impacting the synthesis output).
