# CI-W1C.7.2 — Live Model-Assisted Text Qualification & Human Direction Review
# Final Report

> **Status:** **READY_FOR_DIRECTION_REPORT_PRODUCTIZATION**
> **Date:** 2026-08-20
> **Target Branch:** `feat/short-chain-simplified-ui`
> **Baseline HEAD (CI-W1C.7.1A)**: `a55bb52888fe2552bea4908979569232cc36f355`
> **Final HEAD (this phase)**: `0865863` (7 production commits past CI-W1C.7.1A)
> **Verdict**: **READY_FOR_DIRECTION_REPORT_PRODUCTIZATION**
>   - G01: PASS, 6/6 human-review dimensions ≥ 2, avg 2.83/3
>   - G02: PASS, 6/6 human-review dimensions ≥ 2, avg 3.00/3
>   - Cross-project comparison: PASS (no contamination, clearly different brands)

---

## 1. CI-W1C.7.2 Phases

| Phase | Sub-spec | Status | Verdict |
|---|---|---|---|
| R0 PART A | Baseline preflight (git status / branch / HEAD / origin HEAD) | PASS | OK |
| R0 PART B | Profile-management path audit | PASS | OK |
| R0 PART C | User saves profile via web settings UI | PASS | OK |
| R0 PART D | Profile resolution verification | PASS | 5 working profiles, default Qwen3.6 Plus |
| R0 PART E | Restart persistence check | PASS | OK |
| R0 PART F | First live API call → G01 | PASS after 8 retries | OK |
| PART G | 6-dimension human review (G01 + G02) | PASS | avg 2.83 / 3.00 |
| PART H | Cross-project comparison (identity-stripped) | PASS | no contamination |
| PART I | API usage record | PASS | 6 calls total, ~¥0.18 |

---

## 2. R0 PART D: 5 Working Profiles Discovered

The original CI-W1C.7.2 PART B preflight failed because the
`list-profiles.mjs` script was using a temp userData dir.
Switching to the real userData dir (`C:\Users\Administrator\AppData\Roaming\masterpiece-os-desktop`)
revealed 5 working profiles. The 4 legacy .bin files in the
old `credentials/` dir (legacy `v10…` format) are NOT
compatible with the current AES-256-GCM scheme and are NOT
visible to the new Web Host resolver.

| Profile | Provider | Model | isDefault | hasApiKey |
|---|---|---|---|---|
| profile-9eb57f7e-… | dashscope | qwen3.6-plus | **YES** | **YES** |
| profile-8e7fb1b7-… | volcengine | (image) | no | YES |
| profile-a7c15c5e-… | volcengine | (image) | no | YES |
| profile-ec1d299b-… | volcengine | (image) | no | YES |
| profile-fa854643-… | dashscope | qwen3.7-plus | no | YES |

The Qwen3.6 Plus profile was chosen for both G01 and G02
because it was default + has-key + was already connection-
status=connected.

---

## 3. Live Run Progression (8 retries + 1 G02 run)

The CI-W1C.7.2 PART F run hit **6 distinct production defects**
across 8 retry attempts, each fixed by a real production code
change:

| Retry | Stage | Failure | Root cause | Fix |
|---|---|---|---|---|
| 1 | (preflight) | profiles=[], no API key | list-profiles used temp userData | new `probe-actual-userdata-profiles.mjs` |
| 2 | synthesis | `PARSE_JSON: Unexpected token '`'` | model wraps JSON in ```fences | `stripMarkdownFences` helper + apply to 3 parsers |
| 3 | synthesis | `tensions[0].epistemicClass must be MODEL_INFERENCE` | prompt didn't say epistemicClass per tension/insight | prompt: add `epistemicClass=MODEL_INFERENCE` to each item |
| 4 | synthesis | `tensions[0] must have statement/poleA/poleB/whyItMatters` | prompt listed poleA/B but not `statement` | prompt: add `statement` to tension schema |
| 5 | concept | `sourceMap must be an object` | prompt didn't tell model to emit sourceMap | prompt: list sourceMap as item 0 with required tokens |
| 6 | direction | `qualification budget exceeded: 16254 > maxInputTokens=16000` | bug: checkPromptBudget compared char vs token | bug fix: split into 3 separate gates (input cap / qualification / context) |
| 7 | direction | `directionFamily must be one of: structural-system, ...` | model used Title Case + made-up names | prompt: explicit allowed enum + warn about Title Case |
| 8 | synthesis | `unresolved factRef` (insightRefs used statement text) | prompt didn't tell model what IDs to use | prompt: add ID assignment rules (`tension-i0`, `insight-i0`, `opp-i0`, `concept-ma-0`, `direction-ma-0`) |
| 8 | ALL 3 STAGES | **PASS** | — | — |

Plus the G02 run-1: all 3 stages PASS in 1 attempt each.

---

## 4. Production Code Changes (7 commits, all pushed)

| Commit | Topic | Files |
|---|---|---|
| `cfe0fa36` | strip-markdown-fences helper + 3 parsers | 4 |
| `203b95d0` | synthesis prompt — contract fields (statement, title, epistemicClass on each item) | 9 |
| `33bb1e04` | synthesis prompt — require sourceMap + legacyVisualEvidenceExcluded | 9 |
| `424f25ef` | concept + direction prompts — require sourceMap + diagnostics | 10 |
| `5f00db75` | budget gate — split into 3 separate checks (input cap / qualification / context) | 10 |
| `17891f93` | direction prompt — explicit allowed directionFamily enum | 10 |
| `0865863` | all 3 prompts — explicit ID-assignment rules for cross-references | 11 |

Test delta: 0 regressions. **189/189 ci-7 + ci-7.1a tests PASS** (160 ci-7 + 29 ci-7.1a).

The test suite specifically caught the budget gate bug
(BG-02 was rewritten to assert the new gate ordering; the
old BG-02 had passed because it asserted the buggy behavior).

---

## 5. G01 Result Summary

| Metric | Value |
|---|---:|
| Project | 九州美学 (ProjectId `590eadf2-…`) |
| Profile | `profile-9eb57f7e-…` (Qwen3.6 Plus, dashscope) |
| Mode | `model_assisted_live` |
| Synthesis | PASS (1 attempt) |
| Concept | PASS (1 attempt) |
| Direction | PASS (1 attempt) |
| Analysis calls | 3 |
| Image calls | **0** |
| Total tokens | ~17,386 |
| Total latency | ~390s |
| 6-dim human review | avg **2.83/3** (5×3 + 1×2) |
| Verdict | **RELEASE_FOR_G02** |
| Report | `docs/creative-intelligence/ci-w1c.7.2/g01-runtime/.../deliverables/visual-direction-exploration-report.md` |
| 3 directions | 空间锚定矩阵 (spatial-system) / 语义共振架构 (typographic-system) / 策略部署门控 (model-assisted) |

---

## 6. G02 Result Summary

| Metric | Value |
|---|---:|
| Project | 一剂良方 (ProjectId `a13d6c09-…`) |
| Profile | same as G01 (profile-9eb57f7e-…) |
| Mode | `model_assisted_live` |
| Synthesis | PASS (1 attempt) |
| Concept | PASS (1 attempt) |
| Direction | PASS (1 attempt) |
| Analysis calls | 3 |
| Image calls | **0** |
| Total tokens | ~16,135 (estimated) |
| Total latency | ~120s (warm cache) |
| 6-dim human review | avg **3.00/3** (6×3) |
| Verdict | **RELEASE_FOR_DIRECTION_REPORT_PRODUCTIZATION** |
| Report | `docs/creative-intelligence/ci-w1c.7.2/g02-runtime/.../deliverables/visual-direction-exploration-report.md` |
| 3 directions | 静场域·空间留白架构 (structural-system) / 语境插槽·模块化叙事框架 (editorial-system) / 字阵引航·语义优先排版系统 (typographic-system) |

---

## 7. Hard Rules Verified (CI-W1C.7.2 + 7.1 + 7.1A)

- 0 image provider calls (held across all 9 live runs)
- 0 API key logged or persisted
- 0 mock fallback in live mode
- 0 fake valid report after failure
- 0 cross-project contamination (G01 / G02 use different family / title / mechanism / recommendation)
- 0 unsupported FACT
- 0 legacy visual positive authority
- 0 new regression
- 0 user-visible `vnext` / `V18` / `V6` / `VNEXT` stage name
- All 3 product version checks (verify:version-consistency / verify:version-naming / verify:production-boundaries): pre-existing pass
- verify:workspace-boundaries: pre-existing script bug, unchanged
- verify:current-flows: 5 pre-existing failures (BE-19, packaging-d3-rerun, etc.), unchanged

---

## 8. Documents (this phase)

| File | Purpose |
|---|---|
| `qualification-profile.md` | R0 PART B profile-management path audit |
| `qualification-profile-resolution.md` | R0 PART D — 5 working profiles discovered |
| `restart-persistence-check.md` | R0 PART E — same profile visible across 3 boots |
| `resume-decision.md` | R0 verdict: PROFILE_RUNTIME_READY |
| `g01-live-qualification.md` | R0 PART F first run attempt record |
| `g01-runtime/` | All G01 retry artifacts (8 attempts) |
| `g01-human-review.md` | 6-dimension human review for G01 (RELEASE_FOR_G02) |
| `g02-runtime/` | G02 live artifacts (1 successful run) |
| `g02-human-review.md` | 6-dimension human review for G02 (RELEASE_FOR_DIRECTION_REPORT_PRODUCTIZATION) |
| `cross-project-comparison.md` | PART H — G01 vs G02 identity-stripped comparison |
| `api-usage-record.md` | PART I — 6 calls, ~¥0.18 cost |
| `final-report.md` | This file |

Plus all CI-W1C.7.2-R0 PART B–E documents in
`docs/creative-intelligence/ci-w1c.7.2-r0/`.

---

## 9. Spec Verdict Mapping

| CI-W1C.7.2 Verdict | Final Verdict |
|---|---|
| `READY_FOR_MODEL_ASSISTED_TEXT_QUALIFICATION` | **superseded** (achieved during CI-W1C.7.1A) |
| `HOLD_FOR_CREATIVE_REASONING_REPAIR` | **superseded** (CI-W1C.7.1A preflight PASSed) |
| `HOLD_FOR_PROVIDER_RUNTIME_DEFECT` | **superseded** (R0 PART D cleared the defect; 5 working profiles) |
| `READY_FOR_DIRECTION_REPORT_PRODUCTIZATION` | **THIS PHASE** |

---

## 10. What's Next (CI-W1C.6.1 / CI-10 follow-up, OUT OF SCOPE for this phase)

Per the cross-phase scope, the following items are
**explicitly OUT OF SCOPE** for CI-W1C.7.2 and remain
deferred to follow-up phases:

- **CI-W1C.6.1**: `creative_intelligence` source preset runtime
  activation, V2 source loader wiring, PART F runtime gate,
  PART G caller wiring, PART I runtime scanner — NOT STARTED.
- **CI-10**: NOT STARTED.
- **Consumer switch**: FORBIDDEN throughout CI-W1C.7.2.

The advisory recommendation in the G01 / G02 reports is
**advisory only**. The user must explicitly select a
direction. Selection does not auto-promote from
recommendation. The Selection layer is unchanged by this
phase.
