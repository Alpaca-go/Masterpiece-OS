# CI-W1C.7.5 — Real Planning-Document Live Text Qualification & Semantic Retention Review

> **Status:** G01 COMPLETE / G02 NOT STARTED / **STOP** (per spec PART U)
> **Date:** 2026-08-21
> **Branch:** `feat/short-chain-simplified-ui`
> **Baseline:** `3db85e2c69a40455c7c74a8e45c4d4ae36558709` (R2.1 final)
> **Upstream verdict:** `READY_FOR_REAL_PLANNING_DOCUMENT_QUALIFICATION` (R2.1)
> **Frozen profile:** `profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca` (provider=`dashscope`, model=`qwen3.6-plus`)

## 0. Verdict

```
G01: HOLD_FOR_PLANNING_EXTRACTION_REPAIR
G02: NOT STARTED (per spec PART U STOP)
Final: HOLD_FOR_PLANNING_EXTRACTION_REPAIR
```

Per spec PART T: next is `CI-W1C.7.5-R1 — Planning Semantic
Extraction & Epistemic Classification Repair`.

## 1. Phase structure

| Phase | Status |
|---|---|
| CI-W1C.7.5-A Zero-Cost Preflight | PASS (0 new / 0 worsened failures; same 18 pre-existing baseline fails) |
| CI-W1C.7.5-B Freeze Live Model Config | PASS (`profile-9eb57f7e-...` = dashscope + qwen3.6-plus) |
| CI-W1C.7.5-C Real Planning Source | G01 = 九州美学 (rich narrative-style brand positioning proposal provided by user) |
| CI-W1C.7.5-D Planning Intake Audit | DONE (planning brief registered; 0 claims extracted by current heuristic) |
| CI-W1C.7.5-E G01 Live Qualification | DONE (2 text calls, 0 image calls; Strategic FAIL, Concept / Direction NOT_RUN) |
| CI-W1C.7.5-F Semantic Retention Audit | DONE (12 anchors, 0 preserved) |
| CI-W1C.7.5-G Planning Claim / Ref Coverage | DONE (0/12 used) |
| CI-W1C.7.5-H Need Impact Review | NOT REACHABLE (Need impact unmeasurable when Strategic fails) |
| CI-W1C.7.5-I Project Specificity (identity-strip) | DONE (0 project-specific signals in synthesis) |
| CI-W1C.7.5-J G01 Human Review Gate | DONE (rubric 0/7; verdict = HOLD_FOR_PLANNING_EXTRACTION_REPAIR) |
| CI-W1C.7.5-K G02 Qualification | NOT STARTED (spec PART U STOP) |
| CI-W1C.7.5-L Cross-Project Review | NOT STARTED (no G02) |
| CI-W1C.7.5-M Legacy Visual Leakage Audit | PASS (LegacyPositiveLeakage = 0) |
| CI-W1C.7.5-N Failure Classification | DONE (primary: A — PLANNING_EXTRACTION; secondary: B — PLANNING_GROUNDING, D — STRATEGIC_PROMPT_POLICY, G — RUNTIME_DEFECT) |
| CI-W1C.7.5-O Hard Fail Matrix | DONE (HF-02 / HF-07 / HF-08 = FAIL; all other 15 = PASS) |

## 2. PART A preflight summary

| Check | Baseline (R2.1) | This run | Delta |
|---|---|---|---|
| web:typecheck | PASS | PASS | 0 |
| runtime-core | 14/14 | 14/14 | 0 |
| cli:test | 40/40 | 40/40 | 0 |
| web-runtime:test | 20/20 | 20/20 | 0 |
| runtime-application:test | 18 fails (pre-existing) | 18 fails (pre-existing) | 0 new / 0 worsened |
| verify:version-consistency | PASS | PASS | 0 |
| verify:version-naming | PASS | PASS | 0 |
| verify:production-boundaries | PASS | PASS | 0 |
| verify:golden-boundary | PASS | PASS | 0 |
| verify:no-obsolete-code | PASS | PASS | 0 |
| verify:no-project-specific-production-rules | PASS | PASS | 0 |
| verify:workspace-boundaries | FAIL (25 deep imports, pre-existing) | FAIL (same baseline) | 0 new |
| verify:tracked-runtime-assets | FAIL (7 violations, pre-existing) | FAIL (7 violations, same) | 0 new |
| verify:current-flows | FAIL (pre-existing) | FAIL (same) | 0 new |

**0 new failures, 0 worsened failures.** Preflight passes per
spec.

## 3. PART B profile freeze

| Field | Value |
|---|---|
| profileId | `profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca` |
| provider | `dashscope` |
| model | `qwen3.6-plus` |
| baseUrl | (env, not logged in committed docs) |
| modelType | `analysis` |
| protocol | `openai-chat-multimodal` |

G01 used this profile. G02 was forbidden by spec PART E.13
and is not started.

## 4. PART D planning intake

| Field | Value |
|---|---|
| Source file | `D:\测试项目\九州美学\九州美学品牌定位提案-1.1(1).docx` (real, human-authored) |
| characterCount | 10,737 |
| contentHash (16) | `97e9a84e41d59e37` |
| documentRole | `brand-strategy` (matched by `/品牌(?:策略|战略|定位|策划)/i`) |
| sourceRole | `PLANNING_STRATEGIC_SOURCE` |
| Extracted claims | **0** (heuristic extractor handles only `key: value` format; this is a 10,737-char narrative-style doc) |
| Planning intake exported | `g01-planning-intake.{json,md}` |

The 0-claim finding is the load-bearing evidence for the
G01 verdict. 12 source-backed planning anchors exist in
the doc (recorded in `g01-planning-anchor-map.json`) but
none of them is machine-extractable by the current
`buildPlanningStrategicEvidenceArtifact`.

## 5. PART E live qualification

| Field | Value |
|---|---|
| Mode | `model_assisted_live` |
| Analysis calls | 2 (1 base + 1 repair) |
| Image calls | 0 |
| Duration | 437,176 ms (≈7m17s) |
| Strategic | FAIL (2 attempts, blockedCodes = [SG-01]) |
| Concept | NOT_RUN (per spec PART E.13) |
| Direction | NOT_RUN (per spec PART E.13) |
| G02 calls | 0 (per spec PART E.13) |

### Failure mode (causal chain)

1. **A — PLANNING_EXTRACTION** (primary): heuristic
   extractor → 0 claims. Prompt `PLANNING STRATEGIC
   EVIDENCE` section is empty.
2. **B — PLANNING_GROUNDING** (contributing):
   `parseSourceMap` in `parse-strategic-synthesis.ts:216-245`
   uses `isStringArray()` silent-fallback: when the model
   emitted `sourceMap.needs / .evidence / .planningTruth` as
   lists of objects (instead of the contract-required
   `string[]`), the parser dropped them to `[]`. Consequence:
   gate's `knownNeedIds` and `knownEvidenceIds` are empty
   Sets. Every `insights[*].needRefs` / `evidenceRefs` check
   fails → SG-01 fires 21 times.
3. **D — STRATEGIC_PROMPT_POLICY** (contributing): the
   prompt does not make the `string[]` requirement explicit
   for the rich `sourceMap` slots, leading qwen3.6-plus to
   emit rich objects.

## 6. PART F / G / I / M / N / O results

- **F Semantic retention**: 0 / 12 anchors preserved.
  All DROPPED. Score 0.00 across the chain.
- **G Claim / ref coverage**: 0 / 12 (no planning input).
- **I Project specificity (identity-stripped)**: model
  output was generic — no 医美 / B2B / 九州通 / 品牌定位
  vocabulary appeared in any synthesis field.
- **M Legacy visual leakage**: `LegacyPositiveLeakage = 0`.
  No legacy visual evidence was promoted to positive
  strategy.
- **N Failure classification**: A primary, B + D + G
  contributing.
- **O Hard fail matrix**:
  - HF-01 N/A (no successful attempt)
  - **HF-02 FAIL** (SG-01 final)
  - HF-03 N/A (0 planning statements)
  - HF-04 / HF-05 PASS
  - HF-06 PASS
  - **HF-07 FAIL** (planning evidence empty; model produced
    no project-specific strategy)
  - **HF-08 FAIL** (cousin of spec: rich planning input
    structurally absent, output generic)
  - HF-09..HF-18 PASS

## 7. PART P API budget

| Bucket | G01 used | G01 budget | G02 budget | Total |
|---|---|---|---|---|
| Base calls | 1 | 3 | 0 (forbidden) | 1 |
| Repair calls | 1 | 3 (1/stage) | 0 | 1 |
| Image calls | 0 | 0 | 0 | 0 |
| Wall time | 437s | n/a | n/a | 437s |

Cost label: `successful_qualification_cost = 0`,
`repair_retry_cost = 2` (both failed),
`debug_cost = 0` (offline gate re-run was local),
`total_billed_calls = 2`,
`image_calls = 0`.
Estimated USD cost: `ESTIMATED / PARTIAL` (dashscope /
qwen3.6-plus pricing not exposed by the runtime; not
committed).

## 8. G01 verdict

`HOLD_FOR_PLANNING_EXTRACTION_REPAIR`

(spec PART J.22: this is the only correct verdict given
that the planning source is real and rich but the
extraction layer cannot consume it; the alternative
`HOLD_FOR_STRATEGIC_SYNTHESIS_REPAIR` is incorrect because
the synthesis layer behaves correctly given the empty
planning input it received.)

## 9. G02 status

NOT STARTED. Per spec PART U:
> After G01: STOP until explicit user release for G02.

The G01 verdict is HOLD, not RELEASE, so G02 is not
authorized.

## 10. Final verdict

`HOLD_FOR_PLANNING_EXTRACTION_REPAIR`

### Rationale

1. The user provided a real, rich, human-authored brand
   positioning proposal.
2. The current production planning-extraction layer
   (`buildPlanningStrategicEvidenceArtifact`) uses a regex
   extractor that only handles `key: value` single-line
   patterns; narrative-style documents produce 0 claims.
3. As a result, the prompt's `PLANNING STRATEGIC
   EVIDENCE` section is empty, the model has no
   project-specific planning authority, and the synthesis
   output is generic.
4. A secondary parser defect (`parseSourceMap` silent
   drop of object arrays) compounds the failure by causing
   21 SG-01 blocks even though the cited IDs are valid.
5. Per spec PART T, the next step is
   `CI-W1C.7.5-R1 — Planning Semantic Extraction &
   Epistemic Classification Repair`. The R1 phase should
   also fix the parser silent-drop (Failure B) so that
   once planning claims exist, the ground wiring does not
   silently collapse.

## 11. STOP / next phase

Per spec PART U:
> After final verdict: STOP. Do NOT automatically start
> Need repair, Direction Report productization, CI-W1C.6.1,
> Anchor, Image, CI-10, consumer switch.

`CI-W1C.7.5-R1` is the proposed next phase. The user
authorizes R1 separately.

## 12. Required docs (PART Q)

| Doc | Status |
|---|---|
| `preflight-baseline.md` | (= this file §2 + `g01-source-inventory.md` PART A audit) |
| `provider-profile-freeze.md` | (= this file §3) |
| `g01-source-inventory.md` | WRITTEN |
| `g01-planning-intake.json` | WRITTEN |
| `g01-planning-intake.md` | WRITTEN |
| `g01-planning-anchor-map.json` | WRITTEN |
| `g01-runtime-call-report.md` | WRITTEN |
| `g01-semantic-retention.md` | WRITTEN |
| `g01-human-review.md` | WRITTEN |
| `g02-source-inventory.md` | NOT WRITTEN (G02 not started) |
| `g02-planning-intake.{json,md}` | NOT WRITTEN (G02 not started) |
| `g02-planning-anchor-map.json` | NOT WRITTEN (G02 not started) |
| `g02-runtime-call-report.md` | NOT WRITTEN (G02 not started) |
| `g02-semantic-retention.md` | NOT WRITTEN (G02 not started) |
| `g02-human-review.md` | NOT WRITTEN (G02 not started) |
| `cross-project-semantic-comparison.md` | NOT WRITTEN (G02 not started) |
| `cross-project-identity-stripped-review.md` | NOT WRITTEN (G02 not started) |
| `need-impact-review.md` | NOT WRITTEN (Need impact unmeasurable when Strategic fails) |
| `legacy-visual-leakage-audit.md` | (= this file §6 M; also inline in `g01-human-review.md` §3) |
| `api-usage-report.md` | (= this file §7) |
| `final-report.md` | THIS FILE |

Files NOT WRITTEN for G02 are correct per spec PART Q
("G02 files are created only after user release").

## 13. Suggested commit plan (per spec)

Per spec suggested 6 commits; **only 1 commit was used in
this run** because G01 was the only stage that ran and it
ended at HOLD_FOR_PLANNING_EXTRACTION_REPAIR with no
follow-on G02 / cross-project work. The single commit
captures all G01 docs + the qualification script:

```
<one commit>
  feat(ci-w1c.7.5): thin planning-project qualification script
                    + G01 real planning qualification docs
                    (verdict: HOLD_FOR_PLANNING_EXTRACTION_REPAIR)
```

The script `live-qualify-planning-project.mjs` is the
spec-PART-R-allowed thin script. It calls ONLY the
canonical production surface (`registerPlanningBriefFromPath`
via real `projectStore` and `runCreativeReasoningForProject`).
No manual planning-claim construction, no manual strategic
context compile, no manual prompt build, no direct provider
HTTP, no image generation, no project-specific logic.
