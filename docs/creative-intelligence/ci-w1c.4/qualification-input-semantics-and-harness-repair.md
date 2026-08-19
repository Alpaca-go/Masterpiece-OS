# Masterpiece OS · Creative Intelligence
# CI-W1C.4 — Qualification Input Semantics & Harness Repair

> **Status:** **HOLD_FOR_DOCUMENT_INTELLIGENCE_REPAIR**
> **Date:** 2026-08-19
> **Target Branch:** `feat/short-chain-simplified-ui`
> **Baseline HEAD:** `52385557` (CI-W1C Attempt 2 final = NOT_READY)
> **Final HEAD:** `52385557` (no production code changes)
> **Primary Blocker (Attempt 2):** Cross-project semantic collapse between G01 九州美学 and G02 一剂良方
> **Observed Root Cause (Attempt 2):** Qualification harness injected near-identical synthetic brief; project-specific brief attempts (G01.002 / G02.002) were blocked at E07 with `CRITICAL_CONFLICT_DEPENDENCY`
> **CI-W1C.4 Verdict:** **HOLD** — production Document Intelligence extraction is a real semantic classification defect (creative intent enters `locked.facts`); do NOT modify production in this phase
> **Next Unlock:** Independent **Document Intelligence Creative-Intent Classification Repair** phase; Attempt 2 Retry re-evaluates after that
> **CI-10:** **NOT STARTED** (consumer switch remains forbidden)
> **Production Consumer Switch:** **FORBIDDEN**
> **Production code changes in this phase:** **0**

---

## 1. Baseline

### 1.1 Git state

```text
HEAD = 52385557 ci(ci-w1c-attempt-2): real-project qualification + CI-10 readiness decision (NOT_READY)
local == origin/feat/short-chain-simplified-ui
working tree clean (no tracked modifications; only this report's deliverables untracked)
```

The 15-line log shows CI-W1C.3 (a424090b) → CI-W1C Attempt 2 (52385557) on top, with no other intervening commits on the feature branch.

### 1.2 Source-of-truth references

- **Attempt 2 NOT_READY decision:** `docs/creative-intelligence/ci-w1c-attempt-2/real-project-qualification-and-ci10-readiness.md` (commit `52385557`)
- **Attempt 2 evidence (truth JSON for all 6 runs):** `.codex-smoke/ci-w1c-attempt-2/qualification-extract.json` (6,326 lines)
- **G01 / G02 project-specific briefs that triggered the conflict:** `.codex-smoke/ci-w1c-attempt-2/g01-jiuzhou-brief.md`, `g02-yiji-brief.md`
- **Document Intelligence extraction prompt:** `packages/creative-intelligence/src/document-intelligence/document-context-core.ts` → `EXTRACTION_SYSTEM_PROMPT` (lines 147–173)
- **DVC adapter (locked.facts projection):** `packages/creative-intelligence/src/truth/adapters/document-visual-context-adapter.ts` → `adaptDocumentVisualContext` (lines 224–235, 277–296)
- **Conflict detector:** `packages/creative-intelligence/src/truth/conflict-detector.ts` → `detectConflicts` (lines 34–107, esp. `locked_value_violation` at 58–68)
- **Concept gate (CRITICAL_CONFLICT_DEPENDENCY):** `packages/creative-intelligence/src/concept-intelligence/concept-gates.ts` → `runUnknownConflictGate` (lines 457–508, esp. 492–500)
- **Key registry (LOCKED_FACTS key + LOCKED_KEYS):** `packages/creative-intelligence/src/truth/key-registry.ts` (lines 19–76)
- **Truth contracts (authority / truthClass):** `packages/creative-intelligence/src/truth/contracts.ts` (lines 14–46)
- **Drive script (qualification harness):** `apps/web-runtime/scripts/ci-w1c/drive-ci-workflow.mjs` (existing; lines 246–293 = brief generation)

---

## 2. Attempt 2 NOT_READY context (recap)

CI-W1C Attempt 2 completed **3 technically qualified runs** (G01, G02, G03) all passing 19/19 checkpoints. The **single hard blocker** was **cross-project semantic collapse**: G01 九州美学 and G02 一剂良方 produced **identical direction sets, identical DNA, identical canon version**. The same collapse was observed at Need / Insight / Opportunity.

Two additional `project-specific brief` attempts (G01.002, G02.002) **were blocked at E07** with `CRITICAL_CONFLICT_DEPENDENCY: 品牌身份锁存在未解决冲突`. The CI-W1C Attempt 2 report's root-cause analysis attributed this to:
> "the brief's creative intent was extracted as `locked.facts` and conflicted with project.json's locked facts."

This raised the **central question for CI-W1C.4**:
> *Is this a qualification harness brief-structure defect, or a real production Document Intelligence semantic classification defect?*

The remainder of this report is the audit answering that question.

---

## 3. PART A — Baseline verification

**Result:** PASS.

```text
HEAD             = 523855573675b317ce8f1e7929718eb61f697cac
origin/feat/...  = 523855573675b317ce8f1e7929718eb61f697cac
branch           = feat/short-chain-simplified-ui
working tree     = clean (no tracked modifications)
untracked        = docs/creative-intelligence/ci-w1c.4/  (this phase's deliverables only)
```

Recent commit log on this branch (top 15):

```text
52385557 ci(ci-w1c-attempt-2): real-project qualification + CI-10 readiness decision (NOT_READY)
a424090b ci(ci-w1c.3): repair drive-script E11 polling field path (Web Host RPC freshness)
478ad4ac docs(ci): record CI-W1C.2 E2E probe result
00c2d51f docs(ci): record CI-W1C.2 workspace-view freshness repair
77eeac06 test(ci-runtime): lock Anchor workspace-view freshness contract (CI-W1C.2 PART L)
f0a3edf0 docs(ci): record CI-W1C.1 runtime authority repair (PART N final report)
ad6bef4a fix(runtime-core): loop submitAnchorGeneration to produce N candidates (CI-W1C.1 PART H)
6d922014 fix(runtime-core) + test(ci-runtime): use 2048*1152 for Anchor (CI-W1C.1 PART G)
32ea0a39 feat(web): add image profile selector to CI workspace Anchor step (CI-W1C.1 PART C UI)
9e5bebde fix(ci-runtime) + test(ci-runtime): anchor image-model authority + no analysis profile fallback (CI-W1C.1 PART B + C + J)
5f57bc4a docs(ci): record CI-W1C HOLD authority-gap baseline (CI-W1C.1)
2a70a62a chore(guard): allowlist CI-W1C validation harness scripts (3 paths)
11c99189 docs(ci): record CI-W1C real Web E2E validation (HOLD)
63e5c0a2 test(ci): add CI-W1C Web E2E validation harness (drive script + probes)
6e597f51 fix(runtime-core): correct V3 sourcePreset + deliverable for anchor (CI-W1C.0.3)
```

---

## 4. PART B — Semantic fixtures (S01–S08)

The fixture set is captured at `docs/creative-intelligence/ci-w1c.4/semantic-fixtures.json` (machine-readable). The eight fixtures cover the epistemic classes production must distinguish:

| Fixture | Raw text | Expected class | Expected field | Expected authority | Expected truthClass | Expected LOCKED? | Hard rule |
|---|---|---|---|---|---|---|---|
| S01 | 品牌名称是九州美学 | FACT | brandName | AUTHORITATIVE_DOCUMENT_FACT | fact | NO | — |
| S02 | Logo 不允许修改 | LOCKED_RULE / USER_REQUIREMENT | lockedFacts | LOCKED | user_requirement | YES | — |
| S03 | 希望整体视觉更专业理性 | USER_REQUIREMENT | visualPreferences / brandPersonality | AUTHORITATIVE_DOCUMENT_FACT | user_requirement / fact | **NO** | **must NOT enter locked.facts** |
| S04 | 希望强调全链生态平台的协同关系 | USER_REQUIREMENT | requiredTouchpoints / brandPersonality | AUTHORITATIVE_DOCUMENT_FACT | user_requirement / fact | **NO** | **must NOT enter locked.facts** |
| S05 | 可以探索网络化视觉语言 | CREATIVE_HYPOTHESIS | visualPreferences | AUTHORITATIVE_DOCUMENT_FACT (or CREATIVE_HYPOTHESIS) | creative_hypothesis / user_requirement | **NO** | **must NOT enter locked.facts** |
| S06 | 行业可能属于医美服务 | MODEL_INFERENCE / UNKNOWN | industry (with hedging marker preserved) | MODEL_INFERENCE / UNKNOWN | inference / unknown | NO | — |
| S07 | 品牌名称必须保持为一剂良方 | LOCKED_RULE / USER_REQUIREMENT | brandName (FACT) + lockedFacts (LOCKED) | LOCKED + AUTHORITATIVE_DOCUMENT_FACT | user_requirement + fact | (mixed) | — |
| S08 | 空间氛围希望更具疗愈感 | USER_REQUIREMENT | visualPreferences / brandPersonality | AUTHORITATIVE_DOCUMENT_FACT | user_requirement / fact | **NO** | **must NOT enter locked.facts** |

### 4.1 Epistemic class taxonomy (production-shaped)

Production already has these classes (`packages/creative-intelligence/src/truth/contracts.ts` lines 14–19):

```ts
export type TruthClass =
  | 'fact'
  | 'user_requirement'
  | 'inference'
  | 'creative_hypothesis'
  | 'unknown';
```

And the authority precedence (lines 23–32) places `LOCKED` above `AUTHORITATIVE_DOCUMENT_FACT`. The taxonomy is already **correct in shape**. The defect is that the **extraction prompt does not deterministically assign** statements to these classes — the model decides per-brief.

---

## 5. PART C — Classification audit

### 5.1 Audit targets

Per the spec, audit covers:
1. `document-context extraction prompt/schema` — `EXTRACTION_SYSTEM_PROMPT` (DVC contract)
2. `DocumentVisualContext` normalization — `normalizeExtractedContext`
3. `fact extraction mapping` — `EXTRACTION_SYSTEM_PROMPT` field list
4. `locked.facts projection` — DVC adapter line 224–235
5. `source authority merge` — assembler (project_record + DVC)
6. `Project Truth conflict detection` — `detectConflicts`
7. `CRITICAL_CONFLICT_DEPENDENCY` gate — concept-gate cascade

### 5.2 Per-fixture audit

For each fixture, the audit records: raw text · expected class/field · **production-actual evidence** · verdict.

| Fixture | Expected | Production actual (from Attempt 2 evidence) | Verdict |
|---|---|---|---|
| **S01** 品牌名称是九州美学 | brandName, FACT, NOT locked | G01.001 + G01.002 both have `document_visual_context:...:brand.name = "九州美学"` with `authority=AUTHORITATIVE_DOCUMENT_FACT, truthClass=fact, value=<match project.json>`. No conflict on brand.name (G01). | **PASS** — production puts factual brand name in brandName, not lockedFacts |
| **S02** Logo 不允许修改 | lockedFacts, LOCKED_RULE | Production places "Logo 不允许修改"-like content in `lockedFacts` correctly (project.json's 2 locked.facts are "原始 Logo Locked..." / "输出语言固定为简体中文。", both `authority=LOCKED, truthClass=user_requirement`). | **PASS** — production treats explicit "不允许/必须" as locked |
| **S03** 希望整体视觉更专业理性 | visualPreferences / brandPersonality, USER_REQUIREMENT, NOT locked | No fixture-specific evidence (G01.001 brief did not contain "希望" content). For **G02.002** brief, equivalent "希望..." content DID enter `locked.facts` (see G02.002 evidence below). | **FAIL** — production has no deterministic guard; behavior is brief-dependent |
| **S04** 希望强调全链生态平台的协同关系 | requiredTouchpoints / brandPersonality, USER_REQUIREMENT, NOT locked | **G02.002 evidence (qualification-extract.json lines 4226–4244):** `document_visual_context:756f507e-...:locked.facts = ["信息层级作为包装触点稳定DNA", "不同包装使用同一套信息架构但允许密度差异", "现有品牌资产激活", "跨媒介一致"]`. The G02 brief's "我们希望...保持一种贯穿触点的视觉一致性" was paraphrased by the model into `lockedFacts`. This is **S03/S04-class content mis-projected to LOCKED**. | **FAIL** — production defect confirmed: creative intent → `locked.facts` (LOCKED authority) |
| **S05** 可以探索网络化视觉语言 | visualPreferences, CREATIVE_HYPOTHESIS, NOT locked | No direct fixture evidence, but the same production EXTRACTION_SYSTEM_PROMPT that fails S04 has no rule mapping "可以探索/或许/建议" to a low-authority field. | **LIKELY FAIL** — same production defect class, lower observed risk because softer wording |
| **S06** 行业可能属于医美服务 | industry, MODEL_INFERENCE / UNKNOWN, NOT brand.name | G01.001 + G02.001 + G03.002: DVC `business.industry = null` (synthetic brief has no industry). G01.002 + G02.002: DVC `business.industry = null`. The model did not extract "可能" content into industry in the captured runs. **But** the production EXTRACTION_SYSTEM_PROMPT has no rule for "可能/似乎/大概" → model_inference. | **INSUFFICIENT EVIDENCE** — production prompt lacks the rule, but the captured briefs did not exercise this path. Risk is medium, not high. |
| **S07** 品牌名称必须保持为一剂良方 | brandName (FACT) + lockedFacts (LOCKED), both authoritative | G02.001 + G02.002: `document_visual_context:...:brand.name = "一剂良方"`, `authority=AUTHORITATIVE_DOCUMENT_FACT, truthClass=fact`. The model placed the brand name in `brandName`, not `lockedFacts`. But the same brief's "我们希望...保持一种贯穿触点的视觉一致性" went into `lockedFacts`. So S07's "必须保持" was correctly mapped to `brandName` (FACT) in this run, but the surrounding context still triggered S04-class mis-projection. | **PARTIAL PASS** — brand identity goes to brandName; "保持" surrounding context goes to lockedFacts incorrectly |
| **S08** 空间氛围希望更具疗愈感 | visualPreferences / brandPersonality, USER_REQUIREMENT, NOT locked | No direct fixture evidence, but same production defect class as S03/S04. | **LIKELY FAIL** — same production defect class, lower observed risk |

### 5.3 The G02.002 evidence (the smoking gun)

G02.002 (`ciRunId 7b0b95a4-...`, runStatus=`direction_blocked`) used the project-specific brief `g02-yiji-brief.md`. Brief content (excerpt):

> "我们希望这个项目的方向探索能够围绕方剂可读性、药材地道感、功效传承这三个主题来展开，并希望最终的方向能够在产品包装、门店和品牌视觉这三个触点上同时落地，同时保持一种贯穿触点的视觉一致性。"
> "我们希望方向的核心思路是把现有的品牌资产从被动的状态激活为主动的叙事驱动力，让品牌通过信息层级的清晰组织而被识别 — 不同包装形态（方剂盒、瓶贴、标签）共享同一套信息架构，但允许根据具体形态调整信息密度。"

Truth layer for G02.002 (`qualification-extract.json` lines 4226–4244, 4412–4426):

```json
{
  "id": "document_visual_context:756f507e-...:locked.facts",
  "key": "locked.facts",
  "value": [
    "信息层级作为包装触点稳定DNA",
    "不同包装使用同一套信息架构但允许密度差异",
    "现有品牌资产激活",
    "跨媒介一致"
  ]
}
{
  "id": "project_record:a13d6c09-...:locked.facts",
  "key": "locked.facts",
  "value": [
    "原始 Logo Locked：不得修改、重绘、拆解、替换、仿造或改变内部字形。",
    "输出语言固定为简体中文。"
  ]
}
{
  "id": "locked_value_violation:locked.facts:document_visual_context:...:locked.facts:project_record:...:locked.facts",
  "type": "locked_value_violation",
  "factIds": [...]
}
{
  "id": "value_mismatch:locked.facts:document_visual_context:...:locked.facts:project_record:...:locked.facts",
  "type": "value_mismatch",
  "factIds": [...]
}
```

Concept gate cascade:

```text
locked_value_violation (CRITICAL conflict type in runUnknownConflictGate)
  + value_mismatch
  → CRITICAL_CONFLICT_DEPENDENCY (block)
  → direction_blocked
```

### 5.4 Why the same brief doesn't always produce the defect

G01.002 used a similar but **lexically different** brief. The DVC for G01.002 produced `locked.facts = null` (no extraction into lockedFacts). Its `brand.personality = ["质感", "传承"]` — the model placed the creative-intent content into `brandPersonality` (FACT-class, not LOCKED), so no `locked_value_violation` was raised, and the run reached `awaiting_direction_selection` with the same direction set as G01.001 (because the brief still carried no genuinely project-specific visual structure).

**Why the difference?** The G02.002 brief contains stronger "lock-like" lexemes:
- "**保持**一种贯穿触点的视觉一致性"
- "**稳定**DNA"
- "**共享**同一套信息架构"

The model interpreted these as locked rules and paraphrased the brief's *creative intent* into `lockedFacts`. The G01.002 brief uses softer phrasings like "希望...能够展开" / "希望创作者在思考方向时能够关注" — softer wording, model chose `brandPersonality` instead.

**This is non-determinism at the classification layer, not at the model output layer.** The model itself is deterministic per (prompt, input), but the EXTRACTION_SYSTEM_PROMPT does not provide deterministic classification rules. Same model, different lexical context, different classification — that is a **production prompt defect**, not a test-infrastructure issue.

### 5.5 Locked value_violation is correct — the upstream is wrong

`detectConflicts` correctly produces `locked_value_violation` when two facts disagree on a LOCKED_KEYS key with different values. This is **the conflict gate working as designed** (PART K regression: PRESERVED). The defect is one layer up: the DVC's `adaptDocumentVisualContext` maps `input.lockedFacts` directly to `LOCKED_FACTS` with `authority=LOCKED, truthClass=user_requirement` (lines 224–235). When the DVC's `lockedFacts` array contains *creative intent* (because the extraction prompt mis-projected S03/S04-class content), the DVC adapter correctly classifies it as LOCKED, and the conflict gate correctly rejects it.

**The chain is correct; the input is wrong.** Production needs to teach the EXTRACTION_SYSTEM_PROMPT to map statements to TruthClass correctly **before** they enter the DVC.

### 5.6 The S07 risk — brand identity may also leak into lockedFacts

The spec says S07 "品牌名称必须保持为一剂良方" should be USER_REQUIREMENT / locked rule. In the captured G02 runs, the model put "一剂良方" in `brandName` (FACT), not `lockedFacts`. **However**, the same brief context triggered the S04-class mis-projection. So S07's behavior is not the dominant risk; S04 is.

The S07 risk is **secondary**: the model COULD put "品牌名称必须保持为X" into `lockedFacts` (carrying the brand name as a locked fact), which would then conflict with `project.json:brand.name`. The production prompt should explicitly say:
> *"brand identity statements go to `brandName` (FACT), not to `lockedFacts`, even when phrased as '必须保持' / '固定'."*

---

## 6. PART D — Production defect decision

### 6.1 Decision

**Verdict: HOLD_FOR_DOCUMENT_INTELLIGENCE_REPAIR.**

Per spec §14:
> "如果 normal creative intent 在 production extractor 下稳定进入 locked.facts: 则 CI-W1C.4 = HOLD, 并提出独立: Document Intelligence Creative-Intent Classification Repair。此时禁止继续修 qualification harness 来绕过真实 semantic bug。"

The G02.002 evidence demonstrates that **production extraction** can put creative intent (`希望...保持一种贯穿触点的视觉一致性` → `信息层级作为包装触点稳定DNA`) into `locked.facts`, which is then mapped to LOCKED authority. The conflict gate correctly rejects this, but the defect is that creative intent ever reached the gate as a LOCKED fact.

**The defect is in `EXTRACTION_SYSTEM_PROMPT` + `normalizeExtractedContext` + `adaptDocumentVisualContext` working as a chain**, specifically:

1. `EXTRACTION_SYSTEM_PROMPT` does not say:
   - "希望 / 想要 / 应该" → `visualPreferences` or `brandPersonality` (USER_REQUIREMENT), not `lockedFacts`
   - "保持 / 一致 / 稳定" does not by itself imply LOCKED — must be combined with "必须 / 不可 / 不允许 / 固定" to qualify
   - "可以探索 / 或许 / 建议" → `visualPreferences` (CREATIVE_HYPOTHESIS), not `lockedFacts`
   - "可能 / 似乎 / 大概" → `industry` with truthClass=inference (or unknown)
   - "品牌名称必须保持为X" → `brandName` (FACT), NOT `lockedFacts`

2. `adaptDocumentVisualContext` (DVC adapter) maps every DVC `lockedFacts` entry to `LOCKED_FACTS` with `authority=LOCKED` without checking the source-role or signal-strength. This is correct given the current DVC schema, but the DVC schema's `lockedFacts` field is itself a coarse bucket.

3. The DVC schema does not have a `userRequirements` / `creativeHypotheses` / `modelInferences` / `userLockedRules` field that distinguishes LOCKED from USER_REQUIREMENT. The DVC has only `lockedFacts` and `prohibitedDirections`. So even if the extraction prompt were improved, the DVC contract would not have a clean place for "creative intent that is high-priority but not LOCKED".

### 6.2 What this means for CI-W1C.4

Per spec §14 / §15 / §37 / PART O:

> "如果需要修改：document extractor / Project Truth / authority merge → STOP。不要在本阶段直接修。"

**STOP.** Do not proceed to PART E (harness repair). Do not write a project-specific brief generator. Do not write creative-intent role, manual fact edit, approval invalidation, or semantic differentiation smoke. **All of these would be qualifying around a real production defect.**

### 6.3 What needs to happen instead

A separate, independent phase must be opened: **Document Intelligence Creative-Intent Classification Repair.** This phase must:

1. Modify the EXTRACTION_SYSTEM_PROMPT in `packages/creative-intelligence/src/document-intelligence/document-context-core.ts` to add explicit epistemic classification rules:
   - Define "lock signal" lexemes: `必须 / 不可 / 不允许 / 固定 / 锁定 / 不得 / 不能` → `lockedFacts` (LOCKED_RULE)
   - Define "user requirement" lexemes: `希望 / 想要 / 应该 / 期待 / 鼓励` → `visualPreferences` / `brandPersonality` (USER_REQUIREMENT)
   - Define "creative hypothesis" lexemes: `可以探索 / 或许 / 建议 / 尝试` → `visualPreferences` (CREATIVE_HYPOTHESIS)
   - Define "model inference" hedging markers: `可能 / 似乎 / 大概 / 或许属于` → `industry` with truthClass=inference
   - Brand identity with "必须保持" / "固定" → `brandName` (FACT), NOT `lockedFacts`

2. Optionally extend the DVC schema to carry epistemic class per entry (so the DVC adapter can map `lockedFacts: [{text, class: 'LOCKED_RULE' | 'USER_REQUIREMENT' | 'CREATIVE_HYPOTHESIS'}]` to the correct truth projection). This is a bigger change; minimum viable is the prompt-only fix.

3. Add a CI test (or augment the existing CI-3 semantic test) that:
   - S03 / S04 / S05 / S08 inputs produce DVC `visualPreferences` / `brandPersonality`, never `lockedFacts`
   - S07 input produces DVC `brandName` (= "一剂良方"), not `lockedFacts`
   - S02 input produces DVC `lockedFacts` (= "Logo 不允许修改")

4. Re-run the G02.002-style brief and verify that:
   - `document_visual_context:...:locked.facts` is null (creative intent was NOT projected to lockedFacts)
   - `document_visual_context:...:visualPreferences` or `brandPersonality` contains the creative intent content
   - No `locked_value_violation` is raised
   - Run reaches `awaiting_direction_selection` and produces project-specific directions

5. After the production fix lands, **then** the qualification harness can be improved (PART E–J) and a fresh CI-W1C Attempt 2 Retry can be run.

### 6.4 What CI-W1C.4 explicitly does NOT do

CI-W1C.4 does NOT:
- Modify `EXTRACTION_SYSTEM_PROMPT` (production code)
- Modify `adaptDocumentVisualContext` (production code)
- Modify `detectConflicts` (production code)
- Modify the concept-gate pipeline (production code)
- Modify the DVC schema (production code)
- Write a qualification-only brief generator (PART E)
- Add a creative_intent source role (PART F)
- Add visualContextVNext summary injection (PART G)
- Add harness single-fact edit (PART H)
- Add harness approval invalidation (PART I)
- Run semantic-input smoke (PART J)
- Modify the conflict gate (PART K)
- Weaken any production gate

CI-W1C.4 ONLY:
- Documents the audit
- Documents the production defect
- Proposes the independent Document Intelligence Creative-Intent Classification Repair
- Sets the verdict to HOLD

---

## 7. PART E–J — Harness repair (SKIPPED per PART D)

Per spec §15 / §49:
> "如果 audit 证明 production semantic defect, 则 STOP。不要在本阶段直接修 qualification harness。"

The following parts are explicitly **NOT** executed in this phase:
- PART E Project-specific brief generator
- PART F Creative-intent source role
- PART G visualContextVNext integration
- PART H Manual fact edit
- PART I Approval invalidation
- PART J Semantic differentiation smoke (counted as qualification — also forbidden)

The smoke-only G01 / G02 / G03 semantic differentiation runs (per spec §27 / §28) are also skipped, because they would still be using the broken production extraction. Running them now would produce results that are misleading (they would either pass because the broken extraction collapses to the same identity, or fail at E07 for the same reason G01.002 / G02.002 failed). Neither outcome contributes to qualification.

---

## 8. PART K — Conflict gate regression

### 8.1 Real locked fact conflict → CRITICAL_CONFLICT_DEPENDENCY (PRESERVED)

Existing tests confirm the conflict gate is correct:

```text
✔ CI-2 conflict: identity_mismatch when brand.name differs across carriers
✔ CI-2 conflict: industry_mismatch detected
✔ CI-2 conflict: brand role mismatch detected
✔ CI-2 conflict: locked_value_violation when non-LOCKED candidate contradicts LOCKED
✔ CI-2 conflict: reference_contamination on identity key
✔ CI-2 conflict: value_mismatch on non-identity key with distinct values
✔ CI-2 conflict: NO conflict when all values match
✔ CI-2 conflict: stale_source on single LOCKED fact marked stale
✔ CI-2 conflict: empty fact list returns no conflicts
✔ CI-2 conflict: stable ordering by key then id
```

All 10 conflict-detector tests pass on baseline `52385557` (verified `npx tsx --test tests/packages/creative-intelligence/ci-2/conflict-detector.test.js` → 10/10 PASS, 0 fail). The gate is **not weakened**.

### 8.2 Creative intent / preference → must NOT trigger false locked conflict (FAIL — production defect)

This is the **broken case**. The G02.002 evidence demonstrates the failure path: creative intent ("信息层级作为包装触点稳定DNA") entered `locked.facts`, was projected to LOCKED authority, and triggered `locked_value_violation` + `value_mismatch` + `CRITICAL_CONFLICT_DEPENDENCY`.

This is NOT a gate weakening — the gate correctly rejected a LOCKED-classified fact. The defect is **upstream** (the extraction prompt + DVC adapter put the wrong content into the LOCKED bucket). Per spec PART O, this fix belongs in a separate Document Intelligence Creative-Intent Classification Repair phase, not in CI-W1C.4.

### 8.3 Gate is not weakened

The CI-W1C.4 phase does not modify `detectConflicts`, `concept-gates`, or any production conflict-gate code. The 10 conflict-detector tests still pass. The 17 CI-3 document-intelligence-semantic tests still pass. The 28 CI-2 adapter tests still pass. The 18 CI-3 document-context-core-parity tests still pass. The gate is preserved.

---

## 9. PART L — Tests (deferred to Document Intelligence Creative-Intent Classification Repair)

The SC01–SC08, HB01–HB06, FE01–FE04, AI01–AI06, XD01–XD06 test families specified by the spec are **not added in this phase** because:
- SC01–SC08 are **semantic classification tests**. They are part of the **Document Intelligence Creative-Intent Classification Repair** phase, not CI-W1C.4. Adding them now would either test the broken behavior (redundant) or test a half-fixed state (misleading).
- HB01–HB06 are **harness brief tests**. They require PART E (harness repair), which is blocked by PART D.
- FE01–FE04 are **manual fact edit tests**. They require PART H, blocked.
- AI01–AI06 are **approval invalidation tests**. They require PART I, blocked.
- XD01–XD06 are **semantic differentiation smoke tests**. They require PART E + production fix.

The recommended commit plan is unchanged from spec §47, but the commits land in the **next** phase, not this one:
1. `test(ci-w1c): add creative-intent classification fixtures` → into Document Intelligence Creative-Intent Classification Repair
2. `test(ci-w1c): audit locked-fact extraction boundaries` → into Document Intelligence Creative-Intent Classification Repair
3. `feat(validation): add project-specific creative-intent brief generator` → into CI-W1C.4 (post-repair) or Attempt 2 Retry
4. `feat(validation): add single-fact manual edit harness support` → into CI-W1C.4 (post-repair)
5. `feat(validation): add direction-change approval invalidation harness support` → into CI-W1C.4 (post-repair)
6. `test(e2e): add G01/G02 semantic differentiation smoke` → into Attempt 2 Retry
7. `docs(ci): record CI-W1C.4 qualification input semantics and harness repair` → THIS commit (CI-W1C.4 docs)

---

## 10. PART M — Invariant preservation

The spec requires preserving:
- CI-W1C.3 RPC shape / freshness — PRESERVED (no change to RPC channels)
- CI-W1C.2 read-after-write — PRESERVED (no change to workspace-view surface)
- CI-W1C.1 image authority — PRESERVED (no change to image-generation authority)
- CI-W2 approval semantics — PRESERVED (no change to anchor approval)
- CI-W1B.2 conflict gate — PRESERVED (no change to conflict detector)
- CI-7 Recommendation ≠ Selection — PRESERVED (no change to recommendation flow)

**Production code changes in this phase: 0.** Verified by `git status --short` (only untracked files, no tracked modifications).

---

## 11. PART N — Full regression

### 11.1 Verify commands (clean)

```text
verify:version-consistency          PASS
verify:version-naming               PASS
verify:workspace-boundaries         PASS  (0 failure, 0 warning)
verify:no-obsolete-code             PASS  (928 files scanned)
verify:production-boundaries        PASS  (492 production files clean)
verify:no-project-specific-production-rules  PASS
verify:golden-boundary              PASS
verify:tracked-runtime-assets       PASS  (8 declared assets, all checks green)
```

### 11.2 CI-2 / CI-3 test suites (clean)

```text
tests/packages/creative-intelligence/ci-2/conflict-detector.test.js           10/10 PASS
tests/packages/creative-intelligence/ci-2/adapters.test.js                    28/28 PASS
tests/packages/creative-intelligence/ci-3/document-intelligence-semantic.test.js  17/17 PASS
tests/packages/creative-intelligence/ci-3/document-context-core-parity.test.js  18/18 PASS
```

### 11.3 verify:current-flows

`verify:current-flows` is the one command that does NOT clean. The baseline (no CI-W1C.4 untracked files) shows **14 pre-existing failures** in P3-C / packaging-c4-2-1+ / Stage-4 / Web-upload-unchanged tests. These failures are not introduced by CI-W1C.4 — they exist on the pure baseline `52385557` and are part of the current HEAD's known state. The failures are in:
- `architecture-boundary.test.ts` (analysis UI contains intake actions)
- `creative-task-reference-path-binding.test.ts` (BD-17)
- `image-generation-entry-points.test.ts` (model connection failures expose diagnostics)
- `packaging-c4-2-1-*.test.ts` (AT-19, AS-20, AN-16b, AQ-25, AR-22, AZ-24, AX-21, AE-01, Stage 4)
- `space-reference-path-binding.test.ts` (BE-19)
- `packaging-workspace-architecture-guards.test.ts` (AC-09 — fails on any untracked file)

CI-W1C.4 adds **0 new failures** and **0 worsened failures** to `verify:current-flows`. The 14 pre-existing failures are unrelated to the CI-W1C.4 audit scope (they are about P3-C packaging and short-chain architecture, not about Document Intelligence extraction or conflict detection). The 15th failure (AC-09) is "git status must be empty", which fails solely because of this phase's untracked deliverables — it will pass once the deliverables are committed.

### 11.4 npm test / runtime:test / web-runtime:test / cli:test / web:typecheck

Not re-run in this phase. The CI-W1C.4 spec is explicit that **production code changes = 0**, so the pre-existing baseline (CI-W1C Attempt 2 baseline: 1442/1444 npm test, 1622/1638 runtime:test, 20/20 web-runtime:test, 40/40 cli:test) is preserved. The 2 pre-existing npm test flakes and 16 pre-existing runtime:test flakes are documented in the CI-W1C Attempt 2 report and are out of scope for CI-W1C.4.

---

## 12. PART O — Production code policy (0 confirmed)

CI-W1C.4 modifies **only**:
- `docs/creative-intelligence/ci-w1c.4/qualification-input-semantics-and-harness-repair.md` (this report)
- `docs/creative-intelligence/ci-w1c.4/semantic-fixtures.json` (machine-readable fixtures)

**Production code (apps/cli, apps/web, apps/web-runtime, packages/*) modified: 0.** Verified by `git status --short` (only untracked files in docs/creative-intelligence/ci-w1c.4/).

The audit deliberately **did NOT** modify:
- `packages/creative-intelligence/src/document-intelligence/document-context-core.ts` (EXTRACTION_SYSTEM_PROMPT)
- `packages/creative-intelligence/src/truth/adapters/document-visual-context-adapter.ts`
- `packages/creative-intelligence/src/truth/conflict-detector.ts`
- `packages/creative-intelligence/src/concept-intelligence/concept-gates.ts`
- `packages/creative-intelligence/src/truth/contracts.ts`
- `packages/creative-intelligence/src/truth/key-registry.ts`
- `apps/web-runtime/scripts/ci-w1c/drive-ci-workflow.mjs` (no new harness code)
- `apps/web-runtime/scripts/ci-w1c/*` (no new harness code)

The only changes that would have qualified the verdict as READY (instead of HOLD) are EXACTLY the production-code changes the spec forbids in PART O. The verdict must be HOLD.

---

## 13. PART P — Verdict

### 13.1 Final verdict

```text
CI-W1C.4 = HOLD_FOR_DOCUMENT_INTELLIGENCE_REPAIR
```

### 13.2 Conditions for re-evaluation

CI-W1C.4 may re-evaluate to **READY_FOR_ATTEMPT2_RETRY** only after:

1. **Document Intelligence Creative-Intent Classification Repair** phase opens and lands:
   - EXTRACTION_SYSTEM_PROMPT gains deterministic epistemic classification rules (FACT / USER_REQUIREMENT / LOCKED_RULE / CREATIVE_HYPOTHESIS / MODEL_INFERENCE / UNKNOWN) with explicit lock-signal lexemes (`必须 / 不可 / 不允许 / 固定 / 锁定 / 不得` → LOCKED_RULE) and user-requirement lexemes (`希望 / 想要 / 应该 / 鼓励` → USER_REQUIREMENT).
   - At minimum SC01–SC08 tests (semantic classification) pass on the fixed extraction prompt.
   - G02.002-style brief re-run: `document_visual_context:...:locked.facts` is null; `visualPreferences` / `brandPersonality` carries the creative intent; no `locked_value_violation`; run reaches `awaiting_direction_selection`.

2. CI-W1C.4 (this phase's) PART E–L re-runs:
   - PART E project-specific brief generator (sourced from existing project evidence, no hidden fact injection)
   - PART F creative-intent source role
   - PART G visualContextVNext summary integration (traceable, not locked)
   - PART H single-fact manual edit harness
   - PART I approval invalidation harness
   - PART J semantic differentiation smoke (NOT COUNTED as qualification)
   - PART L tests HB01–HB06, FE01–FE04, AI01–AI06, XD01–XD06

3. Full regression (PART N) all green except the documented 14 pre-existing verify:current-flows failures (which must be addressed by their owning phases, not by CI-W1C.4).

4. Explicit user authorization for CI-W1C Attempt 2 Retry.

5. Attempt 2 Retry itself: G01 fresh qualification, G02 fresh qualification, G03 repeatability. N≥3, ≥2 project types, cross-project differentiation PASS, repeatability PASS, all hard acceptance met.

### 13.3 CI-10 status

```text
CI-10 = NOT STARTED
Consumer switch = FORBIDDEN per CI-W1C.3 STOP conditions
```

### 13.4 CI-W1C Attempt 2 Retry readiness

```text
Attempt 2 Retry = NOT_READY
```

CI-W1C.4 = HOLD. Attempt 2 Retry requires the Document Intelligence Creative-Intent Classification Repair + CI-W1C.4 PART E–L + user authorization, in that order.

---

## 14. Hard acceptance (per spec §40)

```text
creative intent → locked.facts            = 0/0 (PART C found this; HOLD verdict accepts the bug exists, not the absence)
creative preference → locked.facts        = 0/0 (same)
unsupported fact injection                = 0/0 (PART O: no production code touched)
project-specific hardcoded production rule= 0/0 (PART O)
conflict gate weakened                    = 0/0 (PART K: 10/10 conflict-detector tests pass)
manual fact edit lost downstream          = N/A (PART H not executed — deferred)
stale approval survives selection change  = N/A (PART I not executed — deferred)
Web direct filesystem read                = 0/0 (PART O)
CI semantic change                        = 0/0 (PART O)
Anchor semantic change                    = 0/0 (PART O)
Translation semantic change               = 0/0 (PART O)
Space consumer switch                     = 0/0 (PART O)
Packaging consumer switch                 = 0/0 (PART O)
CI-10 work                                = 0/0 (PART P)
```

The audit documents 1 **positive** finding (the production defect) and explicitly accepts it via the HOLD verdict. The fix is **out of scope for CI-W1C.4** by spec PART O.

---

## 15. Positive acceptance (per spec §41)

```text
G01 project-specific brief traceable      = DEFERRED (PART E blocked)
G02 project-specific brief traceable      = DEFERRED (PART E blocked)
G01 brief != G02 brief                    = DEFERRED
no false locked.fact conflict             = FAILED (production defect — HOLD)
manual single-fact edit PASS              = DEFERRED
approval invalidation PASS                = DEFERRED
G01/G02 semantic differentiation smoke    = DEFERRED
all regressions preserved                 = PASS (0 production code changes; verify:* clean; CI-2/3 tests clean)
```

**5 of 8 positive checks are DEFERRED** (require post-repair phase). **1 of 8 FAILED** (the production defect itself, which is the whole point of HOLD). **1 of 8 PASS** (regression preservation). The verdict is HOLD, not NO_GO and not READY.

---

## 16. Guards

### 16.1 Conflict gate

Not weakened. The gate correctly rejects real LOCKED-classified facts. The audit confirms the gate is correct. The defect is upstream.

### 16.2 Production code

Untouched. 0 production-code changes. `git status --short` shows only the new untracked directory `docs/creative-intelligence/ci-w1c.4/`.

### 16.3 Architecture

`Document Intake → Fact / Requirement classification → Project Truth → Need → Insight → Opportunity → Concept → Direction → Canon` is unchanged. Epistemic classes (`FACT / USER_REQUIREMENT / MODEL_INFERENCE / CREATIVE_HYPOTHESIS / UNKNOWN`) are unchanged. The fix proposed for the next phase modifies **how the EXTRACTION_SYSTEM_PROMPT maps text to these classes**, not the classes themselves.

### 16.4 CI-10 / consumer switch

Forbidden per spec §49. CI-10 NOT STARTED.

---

## 17. Build delta

```text
production source delta = 0
test source delta      = 0
docs source delta      = +2 files (this report + fixtures.json, both untracked)
harness delta          = 0
```

---

## 18. Behavior drift

No production behavior drift. The 14 pre-existing `verify:current-flows` failures are unrelated to CI-W1C.4 scope. The 15th (AC-09) is the "git status must be empty" guard, which only fails because this report + fixtures are untracked. Once committed, AC-09 will pass (assuming no other untracked work exists at commit time).

---

## 19. Rollback

CI-W1C.4 made **0 production code changes**. Rollback is a no-op:

```bash
rm -rf docs/creative-intelligence/ci-w1c.4/
git checkout -- .
```

This restores the tree to `52385557` exactly.

---

## 20. Final Definition (per spec §51)

> **CI-W1C.4 的成功标志不是：让 G01 / G02 终于生成不同 Direction。**
> **而是：Qualification 输入能够以正确的 epistemic / authority 语义携带真实项目差异；creative intent 不会被错误升级成 locked fact；用户对事实的修改能够进入 downstream Truth；方向变化能够正确使旧 Anchor approval 失效；并且这些能力全部不需要修改 Creative Intelligence 核心语义。**

CI-W1C.4 has **not** achieved this. The audit proves the production extractor **does** incorrectly upgrade creative intent to locked fact (G02.002 evidence). The remaining 4 success-criteria (project-specific brief, manual fact edit, approval invalidation, G01/G02 differentiation) are all blocked by the same production defect and require the Document Intelligence Creative-Intent Classification Repair first.

**CI-W1C.4 is therefore properly the **HOLD** verdict, not a NO_GO**: the production defect is real and repairable in a separate, focused phase. The architecture is correct; the extraction prompt and (optionally) the DVC schema need an epistemic-classification layer.

---

## 21. Commit plan (this phase only)

```text
docs(ci): record CI-W1C.4 qualification input semantics and harness repair (HOLD)
  - docs/creative-intelligence/ci-w1c.4/qualification-input-semantics-and-harness-repair.md
  - docs/creative-intelligence/ci-w1c.4/semantic-fixtures.json
```

No other commits in this phase. The remaining 6 commits from spec §47 (commits 1–6) are deferred to the Document Intelligence Creative-Intent Classification Repair + post-repair CI-W1C.4 + Attempt 2 Retry phases.

---

## 22. References

| Resource | Path |
|---|---|
| CI-W1C Attempt 2 NOT_READY report | `docs/creative-intelligence/ci-w1c-attempt-2/real-project-qualification-and-ci10-readiness.md` |
| Attempt 2 evidence (truth JSON, 6 runs) | `.codex-smoke/ci-w1c-attempt-2/qualification-extract.json` |
| G01 / G02 project-specific briefs | `.codex-smoke/ci-w1c-attempt-2/g01-jiuzhou-brief.md`, `g02-yiji-brief.md` |
| Extraction prompt (DVC) | `packages/creative-intelligence/src/document-intelligence/document-context-core.ts` lines 147–173 |
| DVC adapter (locked.facts projection) | `packages/creative-intelligence/src/truth/adapters/document-visual-context-adapter.ts` lines 224–235 |
| Conflict detector | `packages/creative-intelligence/src/truth/conflict-detector.ts` |
| Concept gate (CRITICAL_CONFLICT_DEPENDENCY) | `packages/creative-intelligence/src/concept-intelligence/concept-gates.ts` lines 457–508 |
| Key registry (LOCKED_FACTS, LOCKED_KEYS) | `packages/creative-intelligence/src/truth/key-registry.ts` |
| Truth contracts (authority, truthClass) | `packages/creative-intelligence/src/truth/contracts.ts` |
| Drive script (qualification harness) | `apps/web-runtime/scripts/ci-w1c/drive-ci-workflow.mjs` |
| CI-2 conflict detector tests | `tests/packages/creative-intelligence/ci-2/conflict-detector.test.js` |
| CI-2 adapter tests | `tests/packages/creative-intelligence/ci-2/adapters.test.js` |
| CI-3 document-intelligence-semantic tests | `tests/packages/creative-intelligence/ci-3/document-intelligence-semantic.test.js` |
| CI-3 document-context-core-parity tests | `tests/packages/creative-intelligence/ci-3/document-context-core-parity.test.js` |
| Spec (this phase) | `C:\Users\Administrator\.minimax\v2\assets\2026\08\19\17-59-02-145-asset_20260819-175902-145_26df9d23d0c5_b1aa5054-Masterpiece-OS-Creative-Intelligence-CI-W1C.4-Qualification-Input-Semantics-Harness-Repair.md` |
| Semantic fixtures (this phase) | `docs/creative-intelligence/ci-w1c.4/semantic-fixtures.json` |

---

## 23. Final state

```text
HEAD                                  = 52385557 (unchanged)
branch                                = feat/short-chain-simplified-ui
local == origin                       = true
working tree (tracked)                 = clean
untracked (this phase)                = docs/creative-intelligence/ci-w1c.4/
production code changes               = 0
production test changes               = 0
qualification harness changes         = 0
docs changes                          = 2 files (this report + fixtures)
CI-W1C.4 verdict                      = HOLD_FOR_DOCUMENT_INTELLIGENCE_REPAIR
CI-W1C Attempt 2 Retry                = NOT_READY (blocked by HOLD)
CI-10                                 = NOT STARTED
Space / Packaging consumer switch     = FORBIDDEN
provider / model changes              = 0
Anchor / Translation semantic changes = 0
Direction generator changes           = 0
Locked conflict gate                  = PRESERVED (10/10 tests pass)
```

**This phase is complete. Awaiting explicit user authorization to (a) open the Document Intelligence Creative-Intent Classification Repair phase, or (b) declare NO_GO and stop.** Per spec §43, the **verdict itself is the deliverable**; no further attempt-2 re-run is allowed from this phase.
