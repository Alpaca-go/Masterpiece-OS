# CI-W1C.7.3 — Concept / Direction Recovery Audit

> **Mode**: Zero-API static audit · **HEAD**: `c058316c442e3554c49a91a468533d5d426e5768`
> **Purpose**: Audit why Concept / Direction diversity reappears despite the upstream first-loss. Determine whether the recovery comes from actual strategy, direct facts, family-diversity requirements, metaphor variation, randomness, or recovered underused semantics.

## Recovery at Stage 12 (Concept)

### G01 (3 concept candidates)

| # | Title | Central metaphor | directionFamily hint | Source of recovery |
|---|---|---|---|---|
| 1 | "Architectural Context Frame" | "museum plinth for a protected artifact" | spatial | metaphor from pretrained design vocabulary |
| 2 | "Linguistic Resonance Architecture" | "calibrated tuning fork" | typographic | metaphor from pretrained design vocabulary |
| 3 | "Strategic Deployment Matrix" | "compass and map overlay" | model-assisted | metaphor from pretrained design vocabulary |

### G02 (3 concept candidates)

| # | Title | Central metaphor | directionFamily hint | Source of recovery |
|---|---|---|---|---|
| 1 | "静场域·空间留白架构" | "静止的恒星与可塑的轨道空间" | structural | metaphor from pretrained design vocabulary |
| 2 | "语境插槽·模块化叙事框架" | "标准化底盘与可热插拔的业务模块" | editorial | metaphor from pretrained design vocabulary |
| 3 | "字阵引航·语义优先排版系统" | "精密排版轨道与终点签名" | typographic | metaphor from pretrained design vocabulary |

## Recovery at Stage 13 (Direction)

### G01 (3 directions)

| # | Title | directionFamily | Why distinct from synthesis? |
|---|---|---|---|
| 1 | 空间锚定矩阵 | spatial-system | spatial metaphor elaborated |
| 2 | 语义共振架构 | typographic-system | typographic metaphor elaborated |
| 3 | 策略部署门控 | model-assisted | "validation-gating" elaborated |

### G02 (3 directions)

| # | Title | directionFamily | Why distinct from synthesis? |
|---|---|---|---|
| 1 | 静场域·空间留白架构 | structural-system | spatial metaphor elaborated |
| 2 | 语境插槽·模块化叙事框架 | editorial-system | editorial metaphor elaborated |
| 3 | 字阵引航·语义优先排版系统 | typographic-system | typographic metaphor elaborated |

## Where does the recovery come from?

The concept model receives the synthesis output as input. The 3 synthesis opportunities are:
- G01: Contextual Framework Engine / Linguistic-First Positioning / Identity Clarification Protocol
- G02: Contextual Framing Systems / Modular Positioning Frameworks / Precision-Led Linguistic Anchoring

The concept model takes each opportunity and invents a creative metaphor. The metaphors are:
- G01: museum plinth / calibrated tuning fork / compass and map overlay
- G02: stationary star + adaptable orbit / standard chassis + hot-pluggable modules / precise typesetting orbit + endpoint signature

**These metaphors are NOT derived from the project-truth or v1 DVC content.** They are derived from the model's **pretrained design vocabulary**. The model has been trained on design literature, art books, architectural theory, etc. When asked to elaborate a "Contextual Framework" opportunity, the model invents a metaphor from its training data, not from the prompt.

## 4 sources of recovery — analysis

| Source | Evidence | Contributes? |
|---|---|---|
| **Actual strategy** (synthesis output) | The 3 opportunities are paraphrased as concept titles. e.g., "Contextual Framework Engine" → "Architectural Context Frame" | PARTIAL (title is paraphrase; metaphor is new) |
| **Direct facts** (brand.role, locked.assets) | None of the 3 G01 metaphors mention 医疗美容, 高端, 九州美学, 孔雀, 紫色, 羽毛, 翎羽, 弧形+紫灯, 处方签, 医疗美容空间, MR001 误读, 莲花 | NO |
| **Family-diversity requirement** (the prompt's TASK section asks for 3 distinct families) | The 3 G01 directions use 3 distinct families (spatial-system / typographic-system / model-assisted). The 3 G02 directions use 3 distinct families (structural-system / editorial-system / typographic-system). | **YES — this is the primary driver of differentiation** |
| **Metaphor variation / randomness** (model's pretrained vocabulary) | G01 metaphors are 博物馆基座 / 校准音叉 / 罗盘+地图. G02 metaphors are 静止恒星 / 标准化底盘 / 精密排版轨道. All 6 metaphors are different and project-specific in their VOCABULARY but generic in their SEMANTIC FUNCTION. | **YES — this is the secondary driver** |
| **Recovered underused semantics** (project-specific content from the prompt) | None. No brand-specific content from v1 DVC reaches concept or direction. | NO |

## What the audit concludes

**The Concept / Direction diversity is REAL but ARTIFICIAL.** It comes from:
1. The prompt's family-diversity requirement (3 distinct families per project)
2. The model's pretrained design vocabulary (6 unique metaphors across 6 directions)

It is NOT grounded in the project's planning content. The 6 directions across G01 and G02 are all "structural solutions to the same generic problem" (lock + unknown + language). The DIFFERENTIATION is at the surface level (metaphor, family, title) but not at the strategy level (tension, insight, opportunity).

## Hard rule check (spec PART L)

The spec says: "Audit why Concept/Direction diversity reappears. Determine whether it comes from actual strategy, direct facts, family-diversity requirements, metaphor variation, randomness, or recovered underused semantics."

**Findings**:
- Actual strategy: PARTIAL (titles paraphrase the synthesis opportunities, but metaphors are new).
- Direct facts: NO.
- Family-diversity requirements: **YES, primary**.
- Metaphor variation / randomness: **YES, secondary**.
- Recovered underused semantics: **NO**.

## Implication for the audit verdict

The Concept/Direction recovery is **a side-effect of the prompt's family-diversity requirement and the model's pretrained design vocabulary**, not a sign that the upstream first-loss is "healing." The recovery is:
- SURFACE deep (Chinese titles, unique metaphors, specific family assignments)
- STRATEGY shallow (all 6 directions solve the same generic problem)

If a 7th project (G07) were processed, it would produce 3 new directions with 3 new metaphors, but the TENSION framework and the OPPORTUNITY titles would be paraphrases of the same 3 generic axes. The recovery is reproducible but not project-grounded.

## Cross-project contamination check

The 6 directions across G01 + G02:
- directionFamily overlap: only `typographic-system` (1 of 3 each)
- Chinese title overlap: NONE
- centralMetaphor overlap: NONE
- visualMechanism overlap: NONE
- crossMediaBehavior overlap: NONE
- strengths/risks overlap: NONE
- advisory recommendation overlap: NONE (G01 → ma-2 model-assisted; G02 → ma-0 structural-system)
- cross-pollinated brand name: NONE
- cross-pollinated centralMetaphor: NONE
- cross-pollinated fact ID: NONE

**No cross-project contamination.** The recovery is clean.

## Bookkeeping note (PART S prep)

G02 human review header must agree with 3.00/3 aggregate. Verified: G02 6-dim scores 3+3+3+3+3+3 = 18 / 6 = 3.00. Header and aggregate match.

API usage totals:
- 6 final-success analysis calls (3 G01 + 3 G02)
- 0 image calls
- G01 final cost: ~¥0.09
- G02 final cost: ~¥0.084
- **Final successful qualification cost: ~¥0.18** (~$0.025 USD)
- Retry/debug cost: PARTIAL/ESTIMATED (8 G01 retries + 1 G02 run; exact per-retry totals not captured)

See `first-loss-stage-decision.md` for the final verdict.
