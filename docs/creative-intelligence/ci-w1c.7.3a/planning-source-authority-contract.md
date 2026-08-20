# CI-W1C.7.3A — Planning Source Authority Contract

> **Mode**: Zero-API diagnostic phase · **HEAD**: 5159d938
> **Purpose**: Define the **authority taxonomy** used to reclassify CI-W1C.7.3 anchors and compute the legitimate planning-only retention curve. Lock the contract before PART D reclassification.

## Authority taxonomy (8 categories)

Each anchor from CI-W1C.7.3 is reclassified into exactly ONE of these 8 categories. The categories are defined by **WHO authored the content and WHERE it lives in the pipeline**.

| Code | Category | Definition | Counts as positive planning retention? |
|---|---|---|:-:|
| `PLANNING_STRATEGIC_SOURCE` | Original planning source | Human-authored planning content (brief, brand strategy doc, positioning, audience definition, etc.) | **YES** |
| `USER_REQUIREMENT` | User-stated requirement | User explicitly typed/confirmed a rule (locked.facts, logoLock) | **YES** (constraint) |
| `PROJECT_METADATA` | Project metadata | ProjectRecord fields (brandName, industry, etc.) — value may be placeholder | **YES** (data) |
| `LOCKED_IDENTITY` | Locked identity | LOCKED authority facts (logo UUIDs, locked.assets) | **NO** (constraint, not strategy) |
| `LEGACY_VISUAL_EVIDENCE` | Legacy visual evidence | PNG visual boards, old VI/poster/package/spatial, visual_understanding_core extraction (asset hex codes, motif names, etc.) | **NO** |
| `VISUAL_DIAGNOSIS` | VUC diagnosis | VUC's brandRole inference, valuableAssets, brandMisreadRisks, categoryCliches | **NO** |
| `CREATIVE_HYPOTHESIS` | Creative hypothesis | VUC's upgrade proposals, creativeDecision block, model-generated content | **NO** |
| `UNKNOWN_SOURCE` | Unknown | Cannot be classified | **NO** |

## Strict rule (per spec PART D)

> "Planning retention may count only: PLANNING_STRATEGIC_SOURCE, USER_REQUIREMENT, PROJECT_METADATA."
>
> "LOCKED_IDENTITY is tracked separately as constraint retention."
>
> "LEGACY_VISUAL_EVIDENCE / VISUAL_DIAGNOSIS must NOT count as positive planning retention."

## Stage schema (8 strategic stages, used in PART E)

```
1 Planning Source       (raw human-authored planning documents — if any)
2 Parsed               (parsed planning content — if any)
3 Document Intelligence (DI/DVC — extracts from PNGs, may carry VISUAL_DIAGNOSIS)
4 Evidence             (evidence-ledger.json — generic 4-row table)
5 Truth                (project-truth.json — 17/16 facts)
6 Need                 (need-intelligence.json — 5 generic needs)
7 Strategic Context    (compile-strategic-context.ts — runtime)
8 Prompt               (synthesis.prompt.json — actually sent to model)
9 Synthesis            (synthesis.attempt-1.raw.txt — model output)
```

CI-W1C.7.3A measures retention **only across stages 1-8** (no synthesis output for the planning curve, because the planning curve measures PLANNING SEMANTICS PRESERVED, not model output quality).

## Scoring rubric

For each anchor at each stage:
- `2` = preserved project-specific (anchor's value is fully present in this stage)
- `1` = generalized / weakened (some reference but mostly generic)
- `0` = lost (no trace of the anchor's planning content in this stage)

`retention(stage) = (count_2 + count_1 * 0.5) / count_anchors`

## LegacyPositiveLeakage(stage)

> "Expected: 0 at Need / Prompt / Synthesis."

This metric tracks how many LEGACY_VISUAL_EVIDENCE or VISUAL_DIAGNOSIS anchors are present in stages that should only carry planning content. If Need / Prompt / Synthesis contain visual diagnosis data, that's a **legacy positive leak** (visual content accidentally informing strategic decision).

Expected value at every strategic stage (Need, Prompt, Synthesis): **0** (must not happen; if it does, the prompt is contaminated).

## Anchor count summary (pre-reclassification, from CI-W1C.7.3)

| Project | Anchors | Source |
|---|---:|---|
| G01 | 15 | `g01-distinctive-planning-anchors.json` (CI-W1C.7.3) |
| G02 | 16 | `g02-distinctive-planning-anchors.json` (CI-W1C.7.3) |
| **Combined** | **31** | |

These 31 anchors are the **LEGACY anchors** (most are LEGACY_VISUAL_EVIDENCE / VISUAL_DIAGNOSIS). The legitimate PLANNING anchor count will be derived in PART D.

## What CI-W1C.7.3 measured vs what CI-W1C.7.3A measures

| Metric | CI-W1C.7.3 | CI-W1C.7.3A |
|---|---|---|
| Anchor source | visual-decision-packet entries (30+ per project) | reclassified per authority taxonomy |
| Per-stage retention curve | [1.00, 1.00, 1.00, 0.065, 0.065, 0.065, 0.065, 0.065, 0.000, 0.000, 0.000, 0.032, 0.032] | (to be computed) |
| First-loss stage verdict | `NEED_DERIVATION_GENERICIZATION` | (to be derived in PART G) |
| Planning vs Legacy | mixed (treated as planning) | separated |

The CI-W1C.7.3 curve is **legacy visual + visual diagnosis content** retention. The CI-W1C.7.3A curve is **legitimate planning content** retention. They are different metrics and will produce different verdicts.
