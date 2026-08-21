# G01 — Human Review Gate

> CI-W1C.7.5 PART J — 7-dimension human rubric.
> Strategic synthesis FAILED (SG-01, 21 issues). Concept and
> Direction stages were not run (per spec PART E.13 fail-closed
> policy). The rubric is filled in for diagnostic completeness
> but the gate is **NOT REACHABLE** in this run.

## 0. Reachability status

| Stage | Status | Reason |
|---|---|---|
| Strategic | FAIL (SG-01) | Parser silently dropped model-emitted object arrays → all needRef / evidenceRef unresolved |
| Concept | NOT_RUN | Spec PART E.13: "Strategic fails after repair: Concept = NOT_RUN" |
| Direction | NOT_RUN | Spec PART E.13: same |

Because Strategic failed, the human review gate is
**structurally NOT REACHABLE** — there is no
`projectUnderstanding`, `tensions`, `insights`, or
`opportunities` artifact to score. The rubric is filled in
for diagnostic reference (so a future release-for-repair
agent can see what would have been evaluated).

## 1. Rubric (7 dimensions, 0–3 scale)

| # | Dimension | Definition | G01 score | Notes |
|---|---|---|---|---|
| 1 | Planning Fidelity | Does the synthesis faithfully reflect the planning source (industry, brand_role, business_model, audience, brand_promise, etc.)? | 0 (DROPPED) | All 12 anchors dropped; PLANNING STRATEGIC EVIDENCE was empty in the prompt. |
| 2 | Strategic Specificity | Is the strategic output specific to THIS project (vs. generic across all projects with locked.logo=true)? | 0 (DROPPED) | Synthesis summary was generic "operates under strict immutability rules ... unresolved business model ... visual and linguistic fidelity". No 医美 / B2B / 九州通 / 品牌定位 vocabulary. |
| 3 | Semantic Retention | Did anchors flow through Planning → Strategic → Insight → Opportunity? | 0 (DROPPED) | 0/12 anchors preserved. |
| 4 | Insight Quality | Are insights non-generic, project-grounded, and specific? | 0 (DROPPED) | All 4 insights were generic locked-asset patterns. No project-specific insight about B2B resource integration, parent-company backing, or competitive landscape. |
| 5 | Conceptual Distinctness | Are concepts distinct (not just rearranged generic) and project-grounded? | 0 (NOT_RUN) | Concept stage never executed. |
| 6 | Visual Discussability | Are directions visually discussable (specific, not abstract)? | 0 (NOT_RUN) | Direction stage never executed. |
| 7 | Traceability | Is every claim traceable to a source ID? | 0 (PARTIAL via Truth; 0 via planning) | Truth-derived refs are present and resolve; planning-derived refs = 0 (no planning input). |

### Hard minimums (spec PART J.21)

| Requirement | Value | Verdict |
|---|---|---|
| Each dimension ≥ 2 | required | FAIL (0/7 dimensions meet it) |
| Average ≥ 2.4 | required | FAIL (avg = 0/7 = 0) |
| Planning Fidelity ≥ 2 | hard min | FAIL (0) |
| Strategic Specificity ≥ 2 | hard min | FAIL (0) |
| Traceability ≥ 2 | hard min | FAIL (0) |

## 2. Failure classification (spec PART N)

| Class | Present? | Evidence |
|---|---|---|
| A — PLANNING_EXTRACTION | **YES (primary)** | `buildPlanningStrategicEvidenceArtifact` regex extractor → 0 claims on narrative-style doc; planning brief effectively unused. |
| B — PLANNING_GROUNDING | YES (contributing) | `parseSourceMap` silent-drop of model-emitted object arrays in sourceMap.needs / .evidence / .planningTruth → gate has empty known-id Sets → SG-01 fires 21 times. |
| C — NEED_GENERICIZATION | not evaluated | Need stage is upstream of synthesis; the model never reached concept so Need impact is not measurable. |
| D — STRATEGIC_PROMPT_POLICY | YES (contributing) | The prompt does not make the `string[]` requirement for `sourceMap.needs/evidence` explicit enough — the model emitted rich objects instead. |
| E — MODEL_CAPABILITY | not primary | The model (qwen3.6-plus) followed most of the contract (planningClaimRefs: [], sourceMap.planningClaims: []); the failure was the object-vs-string mismatch and the empty planning input, not the model's general capability. |
| F — INPUT_DOCUMENT_INSUFFICIENCY | NO | The 10,737-char doc is rich and complete; the issue is in the extractor, not the doc. |
| G — RUNTIME_DEFECT | YES (contributing) | `isStringArray` silent-fallback is a runtime defect that should be a hard parse error. |

**Primary class: A — PLANNING_EXTRACTION.** The doc IS
human-authored and rich; the extractor cannot handle it.

## 3. Hard fail matrix (spec PART O)

| ID | Description | Status |
|---|---|---|
| HF-01 | Unresolved planningClaimRef in final successful attempt | N/A — no successful attempt (Strategic FAIL) |
| HF-02 | SG-01 / SG-10 / SG-11 / SG-12 final failure | **FAIL** (SG-01 final, 21 issues) |
| HF-03 | Unsupported planning statement promoted as FACT | N/A — 0 planning statements to consider |
| HF-04 | USER_REQUIREMENT → FACT | not observed |
| HF-05 | MODEL_INFERENCE → FACT | not observed |
| HF-06 | Legacy Visual Evidence becomes positive strategy | not observed (model output did not promote any visualAsset.* / old_*) |
| HF-07 | Strategic Synthesis materially ignores planning evidence | **FAIL** (planning evidence was empty; nothing to ignore but also nothing to use) |
| HF-08 | Rich planning input still collapses to generic lock/unknown strategy | **FAIL** (close cousin: rich planning input is structurally absent, output is generic lock) |
| HF-09 | G01 auto-starts G02 | PASS (G02 not started) |
| HF-10 | >2 attempts/stage | PASS (Strategic: 2 attempts = base + repair; not >2) |
| HF-11 | image call > 0 | PASS (0) |
| HF-12 | consumer switch | PASS (no consumer touched) |
| HF-13 | CI-W1C.6.1 starts | PASS (not started) |
| HF-14 | CI-10 starts | PASS (not started) |
| HF-15 | auto Direction selection | PASS (Direction NOT_RUN) |
| HF-16 | synthetic brief used as real | PASS (real human-authored 九州美学品牌定位提案-1.1(1).docx) |
| HF-17 | provider/model/profile differs between G01/G02 | PASS (only G01 ran) |
| HF-18 | project-specific production hardcode | PASS (no production code change in 7.5) |

**HF-02 / HF-07 / HF-08 are the only FAIL items** — all
three are downstream of Failure A (PLANNING_EXTRACTION).

## 4. G01 verdict (spec PART J.22)

| Option | Verdict |
|---|---|
| `RELEASE_FOR_G02` | NO |
| `HOLD_FOR_PLANNING_EXTRACTION_REPAIR` | **YES (primary)** |
| `HOLD_FOR_STRATEGIC_SYNTHESIS_REPAIR` | NO (synthesis layer is correct given the input; input is the problem) |
| `HOLD_FOR_NEED_REPAIR_EVALUATION` | NO (not reached) |
| `HOLD_FOR_MODEL_CAPABILITY_REVIEW` | NO (model behaviour consistent with contract) |
| `NO_GO` | NO (path forward is clear: planning extraction repair) |

### Verdict: `HOLD_FOR_PLANNING_EXTRACTION_REPAIR`

**Reasoning**: The user provided a real, rich, human-authored
brand positioning proposal (10,737 chars, 12+
source-backed planning anchors). The current
`buildPlanningStrategicEvidenceArtifact` regex extractor
produces 0 claims from narrative-style documents. The
prompt's `PLANNING STRATEGIC EVIDENCE` section is therefore
empty, the model has no project-specific planning authority,
and the synthesis output is generic / not project-specific.
This is a real Planning Semantic Extraction & Epistemic
Classification defect (spec PART T → CI-W1C.7.5-R1).

A secondary contributing defect is the `parseSourceMap`
silent-drop behaviour (Failure B). Both should be repaired in
the same R1 phase; the extraction fix unblocks real
planning input, the parser fix prevents the silent
grounding collapse.

### STOP per spec PART U

The spec mandates STOP after G01. G02 requires explicit
user `RELEASE_FOR_G02`, and this G01 verdict does not
support that release.
