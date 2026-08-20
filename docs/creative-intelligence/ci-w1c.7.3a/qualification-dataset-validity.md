# CI-W1C.7.3A — Qualification Dataset Validity

> **Mode**: Zero-API diagnostic phase · **HEAD**: 5159d938
> **Purpose**: Classify the G01 / G02 project datasets as candidates for **planning strategic** qualification vs **current project context** qualification. State explicitly what CI-W1C.7.2 actually qualified.

## What is the difference?

- **PLANNING_QUALIFICATION** = the model is asked to drive Direction from a real planning document (brief, brand strategy, positioning, audience definition, etc.). The output Direction should be **derivable from the planning source**.
- **CONTEXT_QUALIFICATION** = the model is asked to drive Direction from the current project context (visual assets, project.json metadata, VUC diagnosis). The output Direction is **derivable from the visual + metadata context** but NOT from any planning source.

CI-W1C.7.2 qualified: **"current project context → Direction"**. This is what its prompts carried (visual-decision-packet entries, locked.assets UUIDs, generic 5 needs, 3 projectFacts in Truth). It did NOT qualify: "planning document → Direction."

## Validity classification

### G01 九州美学

| Aspect | Present? | Evidence |
|---|:-:|---|
| Original planning brief (PDF / DOCX / TXT) | NO | `briefFiles: []` empty in project.json; 0 .docx/.pdf/.txt files in tree |
| Brand positioning statement | NO | only VUC-inferred brandRole (in visual-decision-packet) |
| Business / service strategy | NO | business.model = UNKNOWN, business.industry = 待确认 |
| Audience definition | NO | project.json.audience not present; DVC v2 brandCore.audience=[] |
| Brand promise | NO | no written promise; only VUC's possibleBrandMeaning |
| Competitive context | NO | categoryCliches from VUC is diagnosis, not analysis |
| Communication task | NO | no field anywhere |
| Strategic / business objective | NO | no field anywhere |
| Experience / transformation objective | NO | only in G02's VUC creativeDecision (G02 only) |
| Visual assets (PNGs) | YES | 28 PNGs |
| VUC diagnosis from visuals | YES | visual-decision-packet.json |
| Project metadata (brandName, lockedFacts) | YES | project.json |

**G01 classification**: `PARTIAL_PLANNING_QUALIFICATION_DATASET` (FAIL on planning; PASS on context).

**Sub-classification**: This dataset qualifies `current project context → Direction` only. It does NOT qualify `planning document → Direction` because no planning document exists.

### G02 一剂良方

Same as G01 (same shape of project.json, same `briefFiles: []`, same VISUAL_DIAGNOSIS content from VUC). G02 has the additional `creativeDecision` block in visual-decision-packet which contains VUC's `uniqueUpgradeThesis` narrative — but this is also a VUC-generated CREATIVE_HYPOTHESIS, not a human-authored planning document.

**G02 classification**: `PARTIAL_PLANNING_QUALIFICATION_DATASET` (FAIL on planning; PASS on context).

## What CI-W1C.7.2 actually qualified

Re-stating the qualifier label per spec instruction:

> CI-W1C.7.2 qualified: **"current project context → Direction"**
> NOT: "planning document → Direction."

The 6 successful synthesis/concept/direction runs (3 G01 + 3 G02) produced outputs that are derivable from the visual + metadata context but NOT from any planning source. The Direction outputs are **context-driven visual generation**, not **planning-driven strategic synthesis**.

## Why this matters

If the goal is to qualify a **planning-driven pipeline** (Direction Report should reflect real business strategy from a planning brief), the current G01/G02 datasets are **INVALID_FOR_PLANNING_QUALIFICATION**. The system cannot demonstrate planning-driven synthesis because there is no planning input to drive it.

If the goal is to qualify a **context-driven pipeline** (Direction Report reflects the visual + metadata state of the project), the current G01/G02 datasets are `VALID_PLANNING_QUALIFICATION_DATASET` (well, more precisely: VALID_CONTEXT_QUALIFICATION_DATASET — but the spec uses "PLANNING" as the umbrella term).

**The question of which qualifier to validate against determines whether CI-W1C.7.2 is a PASS or a HOLD.**

| Qualifier target | G01/G02 dataset validity | CI-W1C.7.2 verdict |
|---|---:|---|
| planning document → Direction | INVALID_FOR_PLANNING_QUALIFICATION (no planning doc) | SHOULD BE HOLD (cannot demonstrate) |
| current project context → Direction | VALID_PLANNING_QUALIFICATION_DATASET (context-rich) | PASS (as recorded) |

CI-W1C.7.2 was scored as PASS because its implicit qualifier was context-driven. If the product intent is planning-driven, then CI-W1C.7.2's verdict does not prove the product capability — it proves the context pipeline works, which is a different (and weaker) claim.

## Re-specification needed

To qualify a **planning-driven pipeline**, the dataset needs:
- A real planning brief (human-authored) for G01 and G02
- Or: the existing `creativeDecision` block in G02's VUC upgraded to a PLANNING_STRATEGIC_SOURCE tier
- Or: a re-architecture where the VUC output is treated as an INPUT to a planning step (with the planning step producing the real planning data)

The audit does NOT recommend any of these in this phase. It only records that the gap exists and the qualifier should be re-specified before the product can claim "planning-driven" capability.

## Verdict

| Project | Dataset validity for **planning-driven** qualification |
|---|---|
| G01 | **INVALID_FOR_PLANNING_QUALIFICATION** (no planning doc) |
| G02 | **INVALID_FOR_PLANNING_QUALIFICATION** (no planning doc; VUC's creativeDecision is not a human-authored planning source) |

If we relax the qualifier to "context-driven", both are VALID_PLANNING_QUALIFICATION_DATASET.
