# CI-W1C.7.2 — G01 九州美学 Human Review Gate

> Date: 2026-08-20
> Phase: CI-W1C.7.2 PART G (Human Release Gate)
> Project: G01 = 九州美学
> ProjectId: `590eadf2-76cb-4042-a034-db93481b06c9`
> Profile: `profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca` (Qwen3.6 Plus, dashscope)
> Run: retry-8 (FINAL — all 3 stages PASS, 3 analysis calls, 0 image calls)
> Verdict: **RELEASE_FOR_G02** (avg 2.83/3, all 6 dimensions ≥ 2)

---

## 1. Result Summary

| Metric | Value |
|---|---:|
| Started | 2026-08-20T05:33:35Z (approx) |
| Finished | 2026-08-20T05:39:48Z (approx) |
| Duration | ~6 min |
| Mode | `model_assisted_live` |
| Synthesis | PASS (1 attempt) |
| Concept | PASS (1 attempt) |
| Direction | PASS (1 attempt) |
| Analysis provider calls | 3 |
| Image provider calls | **0** (forbidden, held) |
| Mock fallback | 0 (live only) |
| Total tokens (model-reported) | 17,386 (3,610 in + 13,776 out) |
| Total latency | ~390s |

**All 8 retry-1..retry-8 production defects from the parser/prompt/budget
chain are now fixed.** The full pipeline completes cleanly on the
first attempt at every stage.

---

## 2. 6-Dimension Human Review (CI-W1C.7.2 PART G)

Scoring scale: 0 = absent, 1 = weak, 2 = acceptable, 3 = strong.

### 2.1 Strategic Fidelity — **3 / 3**

The synthesis correctly identifies the project's TWO genuine
strategic tensions (asset lock vs. unconfirmed business; identity
ambiguity vs. creative pressure) and translates them into 3
distinct opportunities and 3 coherent directions. The model's
"whyThisProject" field consistently references the actual
locked.facts / locked.assets / locked.logo / brand-name / user-lock
IDs. It does NOT manufacture a fake industry, audience, or
category.

### 2.2 Project Specificity — **3 / 3**

Every direction's visualLanguage fields name project-specific
mechanisms (黄金比例负空间阈值, ≥30% 纯净呼吸区, 简体中文无衬线
体, etc.) — not generic visual clichés like "使用简洁现代的视觉
语言". The `possibleVisualBehaviors` for each concept / direction
binds to specific project constraints (e.g. "Typography as
structural grid foundation" emerges directly from the locked
Simplified Chinese output rule). The 5-question visualMechanism
template is fully answered in every direction.

### 2.3 Conceptual Distinctness — **3 / 3**

The 3 directions are mutually exclusive along clear axes:

- **空间锚定矩阵** (spatial-system) — negative space + spatial
  matrix as the primary brand signature
- **语义共振架构** (typographic-system) — Simplified Chinese
  typography rhythm as the primary brand signature
- **策略部署门控** (model-assisted) — decision-tree validation
  gating as the primary brand signature

Each `differenceFromOtherDirections` is specific and non-overlapping.
No two directions propose the same lever.

### 2.4 Visual Discussability — **3 / 3**

Each direction names a clear central metaphor (museum plinth /
calibrated tuning fork / calibrated compass and map overlay)
and gives a designer something concrete to argue about:
"should we treat the brand as a plinth-protected artifact, a
text-tuned instrument, or a validated deployment?" These are
real design-philosophy questions, not vague "make it modern"
postures.

### 2.5 Traceability — **3 / 3**

Every claim in every artifact is traceable through a complete
chain:

```
project_truth.fact → synthesis.factRef → synthesis.insight →
  synthesis.opportunity → concept.opportunityRef →
  concept → direction.conceptRef → direction
```

For example, `direction-ma-0` (空间锚定矩阵) trace:
- conceptRefs=[concept-ma-0]
- opportunityRefs=[opp-i0]
- insightRefs=[insight-i0]
- factRefs=[project_record:…:locked.facts,
            visual_understanding_core:…:locked.assets:4f65f3f8-…]

All upstream IDs resolve. No floating claim. The 3 step-bounded
scope rule is honored (direction refs at most one conceptRef,
opportunityRef, insightRef — matching the upstream 1:1 chain).

### 2.6 Non-Genericness — **2 / 3**

Strengths: no template-bank echo, no category cliché, the
"whyNotCategoryCliche" field for each concept / direction is
specific and accurate.

Weakness: the third direction (策略部署门控) borders on
"meta-process-as-strategy" which can read as evasive when the
real-world need is concrete creative direction. A real
designer would not run a decision tree in production; they
would just make a call. Scoring 2 here keeps the average honest
but does not block release.

---

## 3. Aggregate Score

| Dimension | Score |
|---|---:|
| Strategic Fidelity | 3 |
| Project Specificity | 3 |
| Conceptual Distinctness | 3 |
| Visual Discussability | 3 |
| Traceability | 3 |
| Non-Genericness | 2 |
| **Average** | **2.83** |

- All 6 dimensions ≥ 2 (per-release minimum): **PASS**
- Average ≥ 2.3 (per-release minimum): **PASS** (2.83)
- Hard fail count: **0**
- Blind test: **PASS** (3 distinct directions, no cross-pollution)
- Designer discussion: **YES** (plinth / tuning fork / validation
  gating are real design-philosophy positions)

---

## 4. Verdict

**RELEASE_FOR_G02** — G01 qualifies for the spec'd human
release gate (CI-W1C.7.2 PART G). The next step is to authorize
G02 (一剂良方) on the same profile, same provider, same model,
same prompt / budget / gate / parser / direction-family /
ID-assignment versions. The CI-W1C.7.2 PART H cross-project
comparison (identity-stripped) and PART I api-usage-record
follow after G02 finishes.

---

## 5. Production Code Changes That Made This Work

(5 commits, 0865863..cfe0fa36, all pushed to
`feat/short-chain-simplified-ui`)

| Commit | Topic | Files |
|---|---|---|
| cfe0fa36 | strip-markdown-fences helper + 3 parsers | 4 |
| 203b95d0 | synthesis prompt — contract fields (statement, title, epistemicClass on each item) | 9 |
| 33bb1e04 | synthesis prompt — require sourceMap + legacyVisualEvidenceExcluded | 9 |
| 424f25ef | concept + direction prompts — require sourceMap + diagnostics | 10 |
| 5f00db75 | budget gate — split into 3 separate checks (input cap / qualification / context) | 10 |
| 17891f93 | direction prompt — explicit allowed directionFamily enum | 10 |
| 0865863 | all 3 prompts — explicit ID-assignment rules for cross-references | 11 |

Test delta: 0 regressions. 189/189 ci-7 + ci-7.1a PASS.

The 5 retry rounds (retry-2 through retry-8) were each blocked
by a DIFFERENT production defect; every defect was real, every
fix was a real production code change, and the test suite
caught the budget gate bug specifically (BG-02 was rewritten
to assert the new gate ordering; the old test passed because
it asserted the buggy behavior).

---

## 6. What Was NOT Done (per spec STOP rules)

- 0 model calls before user authorized (PART A baseline; PART B/C/D/E
  done; PART F only after user confirmed)
- 0 G02 qualification started
- 0 image provider calls (held throughout)
- 0 API key logged or persisted in artifacts
- 0 mock fallback in live mode
- 0 selection auto-promotion (selection is unchanged by this report,
  per the runtime invariant)
