# CI-W1C.7.2 — Cross-Project Comparison (G01 vs G02)

> Date: 2026-08-20
> Phase: CI-W1C.7.2 PART H
> Method: identity-stripped (replace project-specific IDs with
> `[PROJECT_*]` placeholders; compare structure, axes, and
> phrasings only)

---

## 1. Setup

Both projects ran through the same Qwen 3.6 Plus (dashscope)
endpoint with the same prompt / budget / gate / parser /
direction-family / ID-assignment versions. Both used the
default profile `profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca`
(isDefault=true, hasApiKey=true, connectionStatus=connected).

| Project | Real Name | ProjectId | factCount | needCount | evidenceCount |
|---|---|---|---:|---:|---:|
| G01 | [PROJECT_A] | `590eadf2-…` | 17 | 5 | 4 |
| G02 | [PROJECT_B] | `a13d6c09-…` | 16 | 5 | 4 |

Both projects share the same general constraint profile:
locked brand mark + locked Simplified Chinese output +
unconfirmed business model + unconfirmed audience.

---

## 2. Synthesis Comparison

### 2.1 Project Understanding (5-axis comparison)

| Axis | G01 | G02 | Same? |
|---|---|---|---|
| Summary | 7 sentences on locked asset + locked language + business ambiguity | 7 sentences on locked asset + locked language + business ambiguity | structurally identical |
| Core challenge | strategic differentiation without asset modification | strategic differentiation without asset modification | identical |
| Transformation goal | shift creative focus to contextual strategy | establish modular creative architecture | structurally similar (G01=framework, G02=modular) |
| Brand role interpretation | "unchangeable visual anchor" | "immutable anchor within undefined context" | near-identical (Qwen kept this exact phrase) |
| Audience tension | "undefined audience" | "unconfirmed audience" | near-identical |

The "summary" / "core challenge" / "transformation goal" axes
are produced from a Planning-First synthesis and are necessarily
homogeneous across projects with the same constraint profile.
The model is correctly NOT inventing project-specific
differentiation here. Differentiation happens at the
opportunity / concept / direction layers, not at the synthesis
layer. ✓

### 2.2 Tensions

| | G01 | G02 |
|---|---:|---:|
| Tension count | 2 | 2 |
| Average tension word count | ~25 words | ~22 words |
| factRefs per tension (avg) | 2 | 2 |
| needRefs per tension (avg) | 2 | 2 |

Both projects produce 2 tensions of similar shape:
1. **Asset lock vs. unconfirmed business model**
2. **Asset lock vs. differentiation pressure**

The exact phrasings differ (G01 says "原始标识绝对锁定与未知商业模型之间的表达冲突"; G02 says "When visual anchors are immutable, strategic differentiation must shift from form to positioning architecture" — translated to English in the report) but the strategic content is the same. ✓

### 2.3 Insights

| | G01 | G02 |
|---|---:|---:|
| Insight count | 3 | 3 |
| Common insight axes | (a) form→positioning, (b) modular light-assumption, (c) language precision | (a) form→positioning, (b) modular light-assumption, (c) language precision |
| factRefs per insight (avg) | 1.7 | 1.7 |
| needRefs per insight (avg) | 1.7 | 1.7 |

The 3 insight axes are identical between G01 and G02:
(a) "shift creative energy from form to positioning",
(b) "modular light-assumption system",
(c) "language constraint as strategic lever". ✓

### 2.4 Opportunities

| | G01 | G02 |
|---|---:|---:|
| Opportunity count | 3 | 3 |
| Common territory themes | system-as-strategy / language-as-strategy / governance-as-strategy | system-as-strategy / language-as-strategy / governance-as-strategy |
| Naming style | Chinese (上下文留白 / 语义先验 / 部署门控) | Chinese (静场域 / 语境插槽 / 字阵引航) |

Same 3-axis territory map, different naming. ✓

---

## 3. Concept Comparison

| | G01 | G02 |
|---|---:|---:|
| Concept count | 3 | 3 |
| centralMetaphor present | yes | yes |
| centralMetaphor style | "museum plinth" / "tuning fork" / "compass + map" | "静止的恒星" / "标准化底盘" / "精密排版轨道" |
| translationHypothesis organizationLogic | rule-based / semantic hierarchy / decision-tree | spatial grid / parametric slot / typographic grid |
| whyNotCategoryCliche (per concept) | specific, distinct | specific, distinct |

The central metaphors are DIFFERENT across the two projects
(G01 uses English/Western metaphors; G02 uses Chinese/CJK
metaphors). This is interesting — Qwen appears to have
learned that G01 needed different metaphors than G02, even
though the underlying constraints are identical. This is
either (a) the model deliberately varied its metaphor pool to
avoid cross-project contamination, or (b) coincidence given
the warm cache. We cannot distinguish these from this single
run, but the cross-project contamination check passes. ✓

---

## 4. Direction Comparison

This is the most important comparison — directions are what
the user will actually see and select from.

### 4.1 Family usage

| family | G01 | G02 |
|---|---|---|
| structural-system | ✗ | ✓ (静场域) |
| relational-network | ✗ | ✗ |
| narrative-sequence | ✗ | ✗ |
| editorial-system | ✗ | ✓ (语境插槽) |
| typographic-system | ✓ (语义共振) | ✓ (字阵引航) |
| material-system | ✗ | ✗ |
| image-led | ✗ | ✗ |
| spatial-system | ✓ (空间锚定) | ✗ |
| model-assisted | ✓ (策略部署门控) | ✗ |

**G01 chose**: spatial-system, typographic-system, model-assisted
**G02 chose**: structural-system, editorial-system, typographic-system

Both projects used `typographic-system` once. The other 2
families per project are non-overlapping — `spatial-system` and
`model-assisted` (G01) vs `structural-system` and
`editorial-system` (G02). This is consistent with the
constraint that the parser accepts only the 9 family values
from the enum and the model picks from there.

The 3-by-3 axes G01 and G02 are both coherent design-philosophy
trichotomies but choose different "lenses" into the same
problem space. ✓ No cross-contamination.

### 4.2 Visual language density

| | G01 | G02 |
|---|---:|---:|
| Average chars per direction (visualLanguage fields) | 5 fields × 80-150 chars | 5 fields × 80-150 chars |
| Average chars per direction (crossMediaBehavior fields) | 6 fields × 60-100 chars | 6 fields × 60-100 chars |

Both projects produce equally dense visualLanguage and
crossMediaBehavior fields. The fields are project-specific
(no carry-over of G01 values into G02). ✓

### 4.3 crossMediaBehavior surface area

Both projects populate brandVI + editorial + packaging + space +
digitalUI. G01 also populates campaignPoster; G02 also
populates campaignPoster. Identical coverage. ✓

### 4.4 Recommendation stability

| | G01 | G02 |
|---|---|---|
| Recommended direction | 策略部署门控 (direction-ma-2) | 静场域·空间留白架构 (direction-ma-0) |
| Rationale | "Highest grounded-trace score" | "Highest grounded-trace score" |

The recommendations use the same scoring rationale but pick
different directions. The model is genuinely distinguishing
project fit, not just picking the first option. ✓

---

## 5. Cross-Project Contamination Check (spec PART H hard rule)

| Check | Result |
|---|---|
| Same directionFamily used by both projects? | partial: `typographic-system` only |
| Same direction title? | **NO** |
| Same visualMechanism? | **NO** |
| Same crossMediaBehavior? | **NO** |
| Same strengths/risks? | **NO** |
| Same advisory recommendation direction? | **NO** (G01 → direction-ma-2; G02 → direction-ma-0) |
| Cross-pollinated brand-name / project-specific fact ID? | **NO** (G01 uses `4f65f3f8-…` + `brand-name-32fa23e11f42`; G02 uses `2409032d-…` + `brand-name-a29bc2c550f3`) |
| Cross-pollinated centralMetaphor? | **NO** |

**No cross-project contamination detected.** ✓

The G01 / G02 outputs are clearly different brands / problems
being addressed with different but equally coherent design
strategies. The Qwen endpoint did NOT memorize G01 and
re-output it for G02. ✓

---

## 6. Spec Required Conclusion (PART H §6.2)

> The output of G01 and G02 must be **clearly different brands
> / problems** (identity-stripped semantic comparison must
> show non-overlapping centralMetaphors, visualMechanisms,
> and advisory recommendations).

**PASS.** G01 = 九州美学 (visual-marketing-art brand) under
asset lock + Chinese output. G02 = 一剂良方 (prescription-
medicine brand) under asset lock + Chinese output. The model
produced 3 distinct directions per project, with non-
overlapping family usage (only `typographic-system` overlaps)
and non-overlapping recommendations.

The two reports are recognizably addressing different brand
problems even with the same constraint surface, and the
recommendation math (highest grounded-trace score) picks
different directions per project rather than defaulting to
the same template. ✓
