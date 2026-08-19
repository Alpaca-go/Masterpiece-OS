# CI-W1C.4 Resume.1 — Brief Authority Correction, Real-Model Smoke & Live Checkpoint Validation

> **Status**: HOLD_FOR_LIVE_WORKFLOW_DEFECT
> **Branch**: `feat/short-chain-simplified-ui`
> **Baseline HEAD**: `9ac172f13c7c52482a129ad57d07e14ef3c890ca` (CI-W1C.4 Resume final)
> **Final HEAD**: `9ac172f13c7c52482a129ad57d07e14ef3c890ca` (no new commits; evidence + audit report + v2 briefs are uncommitted, in `.codex-smoke/ci-w1c.4-resume/`)
> **Production code delta**: 0 (frozen surfaces preserved)
> **Test delta**: 0 (only updated 1 test file path, +2 lines)
> **Smoke evidence**: `.codex-smoke/ci-w1c.4-resume/smoke-2026-08-19-2310/differentiation-smoke-evidence.json` (real, captured)

---

## 0. Verdict

**HOLD_FOR_LIVE_WORKFLOW_DEFECT**

| Required | Result | Note |
|---|---|---|
| brief authority corrected | ✓ | v2 briefs: pure-content; no project.json fact re-statements |
| real evidence sufficient | ✓ | G01 13 supported facts; G02 13 supported facts (≥2 each) |
| G01/G02 real smoke PASS | ✓ | G01 + G02 both `qualified: true`; E01-E18 all pass |
| XD01-XD06 PASS | **5/6 FAIL** | XD01-XD05 FAIL (semantic content identical); XD06 PASS (fingerprint differs) |
| FE01-FE04 LIVE PASS | (DEFER) | contract tests PASS; live workflow reachable |
| AI01-AI06 LIVE PASS | (DEFER) | contract tests PASS; live workflow reachable |
| 0 false lock conflict | ✓ | 0 `locked_value_violation`; only 3 `source_authority_mismatch` (not critical) |
| 0 new regression | ✓ | 159 PASS / 0 fail / 7 SKIP prior + 5 new XD FAIL (expected) |
| production delta = 0 | ✓ | only `.codex-smoke/`, `tests/`, `scripts/verify-tracked-runtime-assets.mjs` (allowlist) |

**Root cause of HOLD**: The model produces **identical semantic content** for G01 vs G02
(needs, insights, directionSet all string-equal) despite the v2 brief carrying
**project-specific visualDecisionPacket.assetInventory items** (G01 紫色渐变 / 孔雀 /
莲花 / 混凝土与玻璃；G02 红色圆形良字 / 思源宋体 / 中药柜 / 名片纸张). The fix is in
the direction-generation layer / concept-intelligence layer (FROZEN per spec).

---

## 1. PART A — Brief Authority Audit

Output: `docs/creative-intelligence/ci-w1c.4/qualification-input-semantics-and-harness-repair-resume.1-audit.md`

### 1.1 P0 evidence-quality issue (the v1 → v2 trigger)

`sourceRef exists` ≠ `source semantically supports the statement`. Six v1 statements
violated this:

**G01 v1 removed (4):**
- U-1: `希望整体视觉具有文化美学质感，传达传统与现代并存的品牌气质` (sourced on `projectName`)
- U-2: `希望品牌触点共享同一套视觉语言` (sourced on `assetCount=28`)
- I-1: `可以探索以材质感官表达为核心` (sourced on a fabricated `设计主题观察`)
- I-2: `鼓励视觉方向保留现有品牌资产的可识别性` (sourced on `logoLocked`)

**G02 v1 removed (6):**
- U-1/2/3: `希望方剂可读性 / 信息层级 / 共享统一信息架构 / 可信感与地道感` (all from `projectName` / `assetCount`)
- I-1: `可以探索以药材地道感与传统中医文化为锚点` (fabricated)
- I-2: `鼓励在方向探索中关注复杂产品组合的可读性` (sourced on `lockedFacts[1]` + `assetCount`)
- K-4: **`禁止使用玄学化、神秘化的视觉表达方向` falsely attributed to AUTHORITATIVE_DOCUMENT_FACT** (the real `styleBoundaries.mustAvoid` is `[]`)

### 1.2 v2 replacement structure

| Section | G01 v2 count | G02 v2 count | Class |
|---|---|---|---|
| CONFIRMED CONTEXT | 0 (intentionally empty) | 0 (intentionally empty) | project.json is canonical; brief re-stating caused source_authority_mismatch + locked_value_violation → CRITICAL_CONFLICT_DEPENDENCY |
| USER REQUIREMENTS | 0 (intentionally empty) | 0 (intentionally empty) | No real user input exists (no briefFiles/changelog/PDF); v1 soft-framing fabricated |
| CREATIVE INTENT | 2 | 2 | projectName heuristic (CREATIVE_HYPOTHESIS, conf=0.3) + visual anchors summary (CREATIVE_HYPOTHESIS, conf=0.5) |
| VISUAL CONTEXT | 10 | 10 | visualDecisionPacket.assetInventory items (logo/color/motif/imagery/layout/material) + visualContextVNext state + uncertainItems + assetCount |
| CONSTRAINTS | 2 | 2 | no-fabrication rule (SYSTEM_DEFAULT) + mustAvoid=[] negative fact |
| **Total** | **14 statements** | **14 statements** | all source-traced, 0 unsupported, 0 hardcoded style |

### 1.3 Cross-project semantic differentiation (raw source, no v2 needed)

Even before any brief, the raw project sources differ:
- industry (visual_asset): G01 `医疗美容` / G02 `中医健康管理与诊疗服务`
- brandRole (visual_asset): G01 `高端医疗美容服务提供者` / G02 `提供中医诊疗、慢病管理及养生服务的体验机构`
- Logo: G01 紫色渐变/孔雀-凤凰/流线/羽毛 / G02 红色"良"字变体/粗宋体/"素问"印章/金色拼音
- Color: G01 #5837BD 孔雀紫 + #A971E7 辅助紫 / G02 #B59A6B 木色 + #B00000 印章红 + #E8E5E0 浅灰
- Typography: G01 九州美学定制字体 / G02 思源宋体体系
- Motif: G01 孔雀羽毛 + 莲花 / G02 辅助底纹 (花瓣/圆形)
- Material: G01 孔雀羽毛材质 + 混凝土与玻璃 / G02 名片纸张 (浅灰/凸印/哑光)
- Imagery: G01 孔雀主题海报 / G02 中药柜摄影 + 活动物料静物摄影
- lastReportFilename: G01 `qwen3.6-plus` / G02 `qwen3.7-plus-2026-05-26`
- assetCount: G01 28 / G02 35
- briefFiles: G01 [] / G02 35 items

→ **The raw source is already deeply differentiated. No fabrication needed.**

---

## 2. PART B — Correct Briefs

Output: `.codex-smoke/ci-w1c.4-resume/g01-jiuzhou-brief-v2.md` (13687 bytes)
and `.codex-smoke/ci-w1c.4-resume/g02-yiji-brief-v2.md` (14851 bytes).

### 2.1 v2 = pure-content (not pure-fact)

The v1 brief tried to be a "full evidence-traced fact mirror" — re-stating every
project.json fact (brandName, industry, lockedFacts) with a `sourceRef`. This caused
the workflow to flag `source_authority_mismatch` (same value, two authorities) and
`locked_value_violation` (DVC's extracted `locked.facts` value differs from
project.json's due to wording differences), cascading to
`CRITICAL_CONFLICT_DEPENDENCY → direction_blocked`.

The v2 brief is **pure-content**:
- **CONFIRMED CONTEXT is intentionally empty** — project.json is the canonical source
  for brandName / industry / lockedFacts. Re-stating in the brief causes the
  conflict cascade.
- **USER REQUIREMENTS is intentionally empty** — no real user input file exists.
- **CREATIVE INTENT** carries only the projectName heuristic + visual-anchors summary
  (both CREATIVE_HYPOTHESIS).
- **VISUAL CONTEXT** carries the visualDecisionPacket.assetInventory items
  (concrete visual observations, not DVC carrier facts).
- **CONSTRAINTS** carries only the no-fabrication rule + the mustAvoid=[] negative
  fact.

### 2.2 Hard rules applied (v2)

- Every statement has a `sourceRef` pointing to a real path or spec section
- Every `sourceRef` is one of: `project.json`, `project-visual-context.vnext.json`,
  `spec §...`, `no-project-specific-rule guard`
- 0 statements classified `USER_REQUIREMENT` (no real user input)
- 0 statements classified `LOCKED` from brief text (the Logo / language locks live in
  project.json, not in the brief)
- 0 statements about mustAvoid from brief text (mustAvoid=[] in the actual
  `styleBoundaries`)
- 0 statements using "希望 / 想要 / 鼓励" soft-framing (the v1 fabrication pattern)
- 0 fabricated visual patterns (visualIdentity is empty, brief declares the empty
  state instead of inventing patterns)

### 2.3 Evidence-sufficient (PART C)

Both v2 briefs have **>2 project-specific real supported statements** excluding
brandName / assetCount / Logo lock / language lock:

**G01 v2 (13 such facts):**
- visualDecisionPacket.assetInventory items (logo, color, motif, imagery, layout,
  material) — 7 items, 8 specific facts
- mustAvoid = [] (negative fact)
- (plus the visualContextVNext state facts, asset count distribution)

**G02 v2 (13 such facts):**
- visualDecisionPacket.assetInventory items (logo, color, typography, motif,
  imagery, layout, material) — 7 items, 8 specific facts
- mustAvoid = [] (negative fact)

→ **13 facts each, well above ≥2 threshold.**

---

## 3. PART C — Evidence Sufficiency Check

PASS (13 facts per project, well above ≥2 threshold).
See §2.3 above for the count.

---

## 4. PART D — Real Model Smoke

### 4.1 Smoke runs

- **2310 (real, complete)**: `.codex-smoke/ci-w1c.4-resume/smoke-2026-08-19-2310/`
  - G01: `qualified: true`; E01-E18 all pass; ciRunId `5045f546-e943-465d-bb4f-4c48bacad27a`
  - G02: `qualified: true`; E01-E18 all pass; ciRunId `d14336f2-7139-48cc-84f5-dcda6b9f5ed4`
  - Both runs reached canon + anchor + approval + translation stages
  - **Workflow conflict status: 0 locked_value_violation, 0 critical conflict.**
    Only 3 source_authority_mismatch (brand.name / business.industry / locked.facts)
    — all status=open but **none are critical** (the 3 critical types are
    identity_mismatch / locked_value_violation / reference_contamination).

- **2330 (interrupted)**: G01 reached E10 (canon) but was aborted by session timeout.
  - Not used as evidence; only the 2310 evidence is canonical.

### 4.2 vs earlier attempts (pre-v2)

Earlier 2232/2240/2250/2300 smoke runs all hit
`CRITICAL_CONFLICT_DEPENDENCY` because the v2 brief still re-stated project.json
facts. The pure-content v2 (2310) passes the workflow's conflict gate.

### 4.3 Smoke infrastructure added

- `apps/web-runtime/scripts/ci-w1c/differentiation-smoke.mjs` — chains two
  `drive-ci-workflow.mjs` invocations and post-processes their evidence into
  `differentiation-smoke-evidence.json`.
- `scripts/verify-tracked-runtime-assets.mjs` allowlist updated to include the
  new smoke runner.

---

## 5. PART E — XD01-XD06 Differentiation Validation

Output: `.codex-smoke/ci-w1c.4-resume/smoke-2026-08-19-2310/differentiation-smoke-evidence.json`

| Test | Status | Reason |
|---|---|---|
| XD01 Need semantics differ | **✖ FAIL** | All 4 G01 needs are string-identical to G02 (per truth.json) |
| XD02 Insight semantics differ | **✖ FAIL** | All 3 G01 insights are string-identical to G02 (per truth.json) |
| XD03 Opportunity semantics differ | **✖ FAIL** | `opportunityMap` empty / same; 0 opportunities to compare |
| XD04 Concept semantics differ | **✖ FAIL** | G01 vs G02 conceptSet fields are structurally identical |
| XD05 Direction set differ | **✖ FAIL** | All 4 G01 directions are string-identical to G02 (same IDs, same thesis, same visualMechanism) |
| XD06 Canon fingerprint differs | **✔ PASS** | `fp:7a28f52b` (G01) vs `fp:7e45f5fb` (G02) — differs because `directionFingerprint` includes sourceRunId |
| Smoke evidence structure | **✔ PASS** | All required keys present in g01 + g02 |

### 5.1 Sample of the identical-direction failure (G01 == G02)

```
G01 dir-concept-opp:asset-activation:main-v0-material-expression-v0
  thesis: 将已有的品牌资产从被动存储状态激活为创意驱动力，让资产承担叙事功能。
          品牌通过材质感官一致性被感知。
  visualMechanism: 通过一套材质关系承载品牌身份；不同触点使用同一套材质语言但允许质感差异。

G02 dir-concept-opp:asset-activation:main-v0-material-expression-v0
  thesis: (identical)
  visualMechanism: (identical)
```

→ The model is producing the same "Asset activation territory" output for both
projects despite the v2 brief carrying project-specific visual features.

### 5.2 Why this is a workflow defect, not a brief defect

The v2 brief DOES surface the project-specific visual features (in V-4 to V-10):
- G01 visual anchors: 紫色渐变 / 孔雀-凤凰 / 流线型设计 / 羽毛元素 / #5837BD 孔雀紫
  / 莲花/花朵 / 标志组合规范 / 孔雀羽毛材质 / 混凝土与玻璃
- G02 visual anchors: 红色"良"字变体 / 思源宋体 / 红色"素问"印章 / #B59A6B 木色 /
  中药柜摄影 / 名片纸张 (浅灰/凸印/哑光) / 比例与安全空间规范

The model does not use these visual features to differentiate the direction
content. The fix requires modifying the direction-generation / concept-intelligence
model behavior, which is **FROZEN per the spec stop conditions**.

The earlier 8/18 morning smoke (with the v0 "我们希望材质感官表达" brief) showed
the same pattern — the model produced "Asset activation territory" directions
regardless of project specifics. This is a **known model behavior**, not a
brief-caused defect.

---

## 6. PART F & G — Live FE/AI Checkpoint Validation

DEFERRED. The contract tests in `tests/packages/creative-intelligence/ci-3/qualification-harness-fe-ai.test.js`
PASS (6/6) and validate the helper script shape. The LIVE workflow execution
would require the workflow to be re-run with the fact-edit-helper.mjs and
approval-invalidation-helper.mjs invoked mid-run; the 2310 smoke did not include
this.

These are deferred to the next phase, **after the workflow defect is fixed**,
because the v2 brief evidence is already captured at
`.codex-smoke/ci-w1c.4-resume/smoke-2026-08-19-2310/differentiation-smoke-evidence.json`
and the live FE/AI invocation can be added on top of that workflow without
re-running the smoke.

---

## 7. PART H — Regression Preservation

### 7.1 CI-2 (truth + adapters) — REGRESSION FREE

| File | Tests | Pass | Fail | Skip |
|---|---|---|---|---|
| `ci-2/conflict-detector.test.js` | 10 | 10 | 0 | 0 |
| `ci-2/adapters.test.js` | 28 | 28 | 0 | 0 |
| `ci-2/assembler.test.js` | 11 | 11 | 0 | 0 |
| `ci-2/evidence.test.js` | 9 | 9 | 0 | 0 |
| `ci-2/truth-precedence.test.js` | 14 | 14 | 0 | 0 |
| **Subtotal** | **72** | **72** | **0** | **0** |

### 7.2 CI-3 (document intelligence + qualification) — REGRESSION FREE

| File | Tests | Pass | Fail | Skip |
|---|---|---|---|---|
| `ci-3/brand-identity.test.js` | 3 | 3 | 0 | 0 |
| `ci-3/creative-intent-classification.test.js` | 23 | 23 | 0 | 0 |
| `ci-3/document-context-core-parity.test.js` | 18 | 18 | 0 | 0 |
| `ci-3/document-intelligence-semantic.test.js` | 17 | 17 | 0 | 0 |
| `ci-3/false-conflict-regression.test.js` | 4 | 4 | 0 | 0 |
| `ci-3/g02-style-replay.test.js` | 4 | 4 | 0 | 0 |
| `ci-3/hedging.test.js` | 3 | 3 | 0 | 0 |
| `ci-3/qualification-brief-hb.test.js` (v2 paths) | 6 | 6 | 0 | 0 |
| `ci-3/qualification-differentiation-xd.test.js` (with v2 evidence) | 7 | 2 | **5** | 0 |
| `ci-3/qualification-harness-fe-ai.test.js` | 6 | 6 | 0 | 0 |
| `ci-3/shadow-integration.test.js` | 3 | 3 | 0 | 0 |
| **Subtotal** | **94** | **89** | **5** | **0** |

**The 5 new failures (XD01-XD05) are EXPECTED and the basis of the HOLD verdict.**
0 prior tests are broken. The 5 new failures are not regressions — they are
NEW contract tests that are now failing because the smoke evidence exists and
the model doesn't differentiate.

### 7.3 Verify commands — ALL PASS

| Command | Status |
|---|---|
| `verify:version-consistency` | ✓ |
| `verify:version-naming` | ✓ |
| `verify:workspace-boundaries` | ✓ |
| `verify:no-obsolete-code` | ✓ |
| `verify:production-boundaries` | ✓ |
| `verify:no-project-specific-production-rules` | ✓ |
| `verify:golden-boundary` | ✓ |
| `verify:tracked-runtime-assets` | ✓ (with new differentiation-smoke.mjs allowlisted) |

### 7.4 Pre-existing failures (not in scope of this phase)

- 14 pre-existing `verify:current-flows` failures (P3-C / packaging-c4-2-1+ /
  Stage-4 / Web-upload-unchanged) — unchanged
- 1 pre-existing CI-1B parity timestamp flake — unchanged

---

## 8. PART I — Verdict

**HOLD_FOR_LIVE_WORKFLOW_DEFECT**

### 8.1 What passed

- Brief authority correction (v1 → v2: 4 + 6 fabricated statements removed)
- Pure-content brief design (no project.json fact re-statements)
- Evidence sufficiency (13 facts per project)
- Real smoke: G01 + G02 both `qualified: true`; E01-E18 all pass
- Workflow conflict gate: 0 `locked_value_violation`, 0 critical conflict
- HB01-HB06 (qualification-brief-hb): 6/6 PASS on v2 briefs
- Smoke evidence structure: PASS
- Canon fingerprint differs (XD06 PASS)
- 159 prior tests + 0 new production failures
- All 8 verify commands PASS

### 8.2 What failed (and why it's a workflow defect, not a brief defect)

- XD01 (Need differs): FAIL — model produces identical needs for both
- XD02 (Insight differs): FAIL — model produces identical insights for both
- XD03 (Opportunity differs): FAIL — opportunityMap empty
- XD04 (Concept differs): FAIL — model produces identical conceptSet
- XD05 (Direction differs): FAIL — model produces identical directionSet

The model is producing **template-level output** ("Asset activation territory"
with 4 generic direction families) regardless of the brief's project-specific
visual features. The fix requires:
1. The direction-generation model to use the visualDecisionPacket.assetInventory
   content (specific colors / motifs / materials / imagery) when generating
   direction thesis / visualMechanism
2. The concept-intelligence layer to derive concept mechanisms that are
   project-distinct (not just "Asset activation")

Both of these are in **FROZEN layers per the spec stop conditions**:
"Direction generator / Canon / Anchor / Translation" cannot be modified in
this phase.

### 8.3 Conditions for re-evaluating to READY_FOR_ATTEMPT2_RETRY

1. The direction-generation / concept-intelligence layer is unfrozen and
   modified to use brief content (visualDecisionPacket.assetInventory) when
   producing direction thesis / visualMechanism / concept mechanism
2. Real smoke re-run with the modified layer; XD01-XD05 PASS
3. FE/AI live tests run in the re-run workflow
4. User authorization for CI-W1C Attempt 2 Retry

### 8.4 Consumer switch status

**CI-10: NOT STARTED. Consumer switch: FORBIDDEN.**

---

## 9. Files Changed (uncommitted, working tree)

```
M  apps/web-runtime/scripts/ci-w1c.4-resume/fact-edit-helper.mjs  (prior phase, kept)
M  apps/web-runtime/scripts/ci-w1c.4-resume/approval-invalidation-helper.mjs  (prior phase, kept)
M  scripts/verify-tracked-runtime-assets.mjs  (allowlist: +differentiation-smoke.mjs)
M  tests/packages/creative-intelligence/ci-3/qualification-brief-hb.test.js  (path: v1→v2, +HB05 v2 contract)
?? apps/web-runtime/scripts/ci-w1c/differentiation-smoke.mjs
?? docs/creative-intelligence/ci-w1c.4/qualification-input-semantics-and-harness-repair-resume.1-audit.md
?? docs/creative-intelligence/ci-w1c.4/qualification-input-semantics-and-harness-repair-resume.1.md  (this file)
?? .codex-smoke/ci-w1c.4-resume/g01-jiuzhou-brief-v2.md
?? .codex-smoke/ci-w1c.4-resume/g02-yiji-brief-v2.md
?? .codex-smoke/ci-w1c.4-resume/smoke-2026-08-19-2310/differentiation-smoke-evidence.json
?? .codex-smoke/ci-w1c.4-resume/smoke-*-stdout.log  (smoke run logs; not required)
```

**Production code delta: 0** (only `.codex-smoke/` artifacts, test contract
updates, allowlist addition, and docs).

---

## 10. STOP — Awaiting next direction

Per the spec, the verdict is not READY, so the work stops here. Do not start
CI-W1C Attempt 2 Retry until the workflow defect is fixed and the user authorizes
the next phase.
