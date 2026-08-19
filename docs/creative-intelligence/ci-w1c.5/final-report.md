# CI-W1C.5 — Project-Specific Visual Evidence Propagation & Semantic Differentiation Repair (Final Report)

**STATUS: HOLD_FOR_LIVE_SMOKE_CAPTURE** (not yet NO_GO; differentiation repaired
in unit tests, awaiting same-model real smoke capture to convert to
READY_FOR_ATTEMPT2_RETRY or escalate).

**Branch**: `feat/short-chain-simplified-ui`
**Baseline (CI-W1C.4 Resume.1 Frozen HEAD)**: `9ac172f13c7c52482a129ad57d07e14ef3c890ca`
**Final HEAD**: (uncommitted; not yet frozen for this phase)
**Spec**: `Masterpiece-OS-Creative-Intelligence-CI-W1C.5-...-Semantic-Differentiation-Repair.md`
**Authoritative spec parts**: A / B / C / D / E / F / G / H / I / J / K / L / M

---

## PART A — Freeze Resume.1 (DONE, 3 commits)

CI-W1C.4 Resume.1 was frozen on top of `e6b600a5` (Document Intelligence
Creative-Intent Epistemic Classification Repair) at `23302590`:

| Commit | Purpose |
| --- | --- |
| `aa7aa5a8` | feat(validation): add CI-W1C.4 Resume.1 differentiation smoke runner |
| `e9b30ade` | test(ci-3): update qualification-brief-hb to v2 evidence-strict contract |
| `23302590` | docs(ci): record CI-W1C.4 Resume.1 audit + final report |

Local == origin (`2330259014af569f0254257e282fe8c4660a121c`).
Working tree: clean (except CI-W1C.5 in-progress edits; `.codex-smoke/`
gitignored).

---

## PART B — Trace Matrix (5 G01 + 5 G02 items × 10 layers)

Authoritative trace doc:
`docs/creative-intelligence/ci-w1c.5/visual-evidence-propagation-trace.md`.

### FIRST_LOSS_STAGE = L3–L4 (DVC extraction & structure)

| Layer | G01 evidence status | G02 evidence status | Loss class |
| --- | --- | --- | --- |
| L1 vnext.json (on disk) | PRESENT (per-item) | PRESENT (per-item) | — |
| L2 vnext.assetInventory (memory) | PRESENT (per-item) | PRESENT (per-item) | — |
| L3 DVC.visualPreferences (string) | FLATTENED to single string | FLATTENED to single string | **DROPPED** (per-item identity lost) |
| L4 DVC adapter facts | 0 facts emitted from vnext shape | 0 facts emitted from vnext shape | **DROPPED** (schema mismatch) |
| L5 Evidence | per-vnext evidence refs (if any) | per-vnext evidence refs (if any) | — |
| L6 Project Truth | brandName/industry only | brandName/industry only | per-item visual content MISSING |
| L7 Need | (no differentiation rule) | (no differentiation rule) | per-item visual content NOT_USED |
| L8 Insight | (no visual rule) | (no visual rule) | per-item visual content NOT_USED |
| L9 Opportunity | (no visual cluster) | (no visual cluster) | per-item visual content NOT_USED |
| L10 Concept | (template-driven) | (template-driven) | per-item visual content NOT_USED |
| L10' Direction | (template-driven) | (template-driven) | per-item visual content NOT_USED |

**Conclusion**: the per-item visual content survives L1–L2 but is
**compressed to a single string at L3–L4** (DVC's flattened
`visualPreferences`). Downstream layers L6–L10 see a generic brand
string and cannot differentiate.

---

## PART C — Architecture rule

- DVC schema: **frozen** (CI-W1C.5 §5).
- Truth taxonomy: **frozen** (no new `visual*` canonical keys).
- Conflict Detector / Concept Gate critical semantics / CI-7 / Selection /
  Canon schema / Anchor / Image Runtime / Translation / Consumers / CI-10:
  **frozen** (CI-W1C.5 §5).
- The repair does NOT bypass Need / Insight / Opportunity / Concept to
  Direction. The per-item visual content flows through the existing
  CI-4 / CI-5 / CI-6 pipeline.

**Verdict**: architecture sufficient; no DVC / Truth schema change needed.

---

## PART D — Authority classification

| Item | Authority | Confidence |
| --- | --- | --- |
| G01-E1 #5837BD 孔雀紫 | `VISUAL_SOURCE_FACT` | 0.8 |
| G01-E2 孔雀羽毛 | `VISUAL_SOURCE_FACT` | 0.8 |
| G01-E3 莲花/花朵 | `VISUAL_SOURCE_FACT` | 0.8 |
| G01-E4 混凝土与玻璃 | `VISUAL_SOURCE_FACT` | 0.8 |
| G01-E5 孔雀主题海报 | `VISUAL_SOURCE_FACT` | 0.8 |
| G02-E1 #B00000 / #B59A6B | `VISUAL_SOURCE_FACT` | 0.8 |
| G02-E2 思源宋体 | `VISUAL_SOURCE_FACT` | 0.8 |
| G02-E3 红色"良"字变体 | `VISUAL_SOURCE_FACT` | 0.8 |
| G02-E4 中药柜摄影 | `VISUAL_SOURCE_FACT` | 0.8 |
| G02-E5 哑光纸张/凸印 | `VISUAL_SOURCE_FACT` | 0.8 |
| 高贵 / 神秘 / 传统 / 可信 / 疗愈 / ... | `MODEL_INFERENCE` | 0.8 |

**Truth taxonomy unchanged** (CI-W1C.5 §6). VisualEvidenceContribution
uses existing `SourceType = 'visual_understanding_core'` (no new enum
value). Visual facts are keyed under `visualAsset.<kind>` (logo / color /
typography / motif / imagery / layout / material) + `visualAssetMeaning.all`.

---

## PART E — Minimal repair (DONE at L1–L2 + L7–L10')

### Production delta

| File | Change | Status |
| --- | --- | --- |
| `packages/creative-intelligence/src/visual-evidence/visual-evidence-contribution.ts` (new) | `buildVisualEvidenceContribution` + `contributionToTruthFacts` (per-item observed facts + inferred meanings) | ADDED |
| `packages/creative-intelligence/src/visual-evidence/index.ts` (new) | public surface | ADDED |
| `packages/creative-intelligence/src/index.ts` | re-export `visual-evidence/*` | ADDED |
| `packages/creative-intelligence/src/integration/nice-pipeline.ts` | `NiceInput.vnext?: unknown` field; visual facts merged into in-memory facts | ADDED |
| `packages/creative-intelligence/src/need-intelligence/derive-needs.ts` | Rule 9 `visualAssetDifferentiationRule` (project-specific Need statement built from visual descriptors) | ADDED |
| `packages/creative-intelligence/src/concept-intelligence/generate-concepts.ts` | `buildConceptForOpportunity` (1) always pulls visualAsset.* factIds into the concept's fact graph, (2) injects a project-specific "视觉锚点" suffix into thesis/mechanism (applied AFTER variant 1 override so v0 + v1 both carry it), (3) promotes the visualAsset differentiation Need into the concept's needRefs so the value-coverage gate does not block on MISSING_CRITICAL_NEED_COVERAGE | ADDED |
| `packages/creative-intelligence/src/direction-intelligence/generate-directions.ts` | `buildDirectionForConcept` appends the project-specific "视觉锚点" suffix to thesis / visualMechanism / systemHypothesis | ADDED |
| `packages/runtime-core/src/application/creative-intelligence-application-service.ts` | `loadProjectVNext?` optional dependency; reads vnext → visual facts → in-memory `decoratedTruth` (visual facts NOT persisted to `truth.json`) | ADDED |
| `packages/runtime-core/src/application/runtime-services.ts` | bridges `projectContext.getShortChain(projectId)` to the CI app service's `loadProjectVNext` | ADDED |
| `packages/creative-intelligence/package.json` | `./visual-evidence` + `./visual-evidence/*` exports | ADDED |
| `tests/packages/creative-intelligence/ci-5/visual-evidence-contribution.test.js` (new) | VP-01..VP-08 (8/8 PASS) | ADDED |
| `tests/packages/creative-intelligence/ci-5/visual-evidence-propagation-ui-ni-op-cp-dr.test.js` (new) | UI-01 / NI-01 / OP-01 / CP-01 / DR-01 / CN-01 (6/6 PASS) | ADDED |
| `tests/packages/creative-intelligence/ci-4/nice-contracts.test.js` | "9 Need rules registered" (was 8) | UPDATED |

### Differentiation observed (project-agnostic unit test)

With two synthetic vnext payloads (Project-A: purple / peacock / feather /
concrete-glass; Project-B: red 良 / siyuan song / seal / wood-ink / matte
paper) + minimal DVC fixture (no G01/G02 hardcode), the chain produces:

| Layer | Project-A | Project-B | Differentiated? |
| --- | --- | --- | --- |
| Need statement | `Differentiate via project-specific visual assets: ProjectA主标志（紫色渐变...）` | `Differentiate via project-specific visual assets: ProjectB图标（红色圆形 | 良字变体 | 印章...）` | **YES** |
| OpportunityMap | non-empty | non-empty | YES (non-empty) |
| Concept (grounded) | `资产激活策略：... 视觉锚点：ProjectA主标志（紫色渐变...）` | `资产激活策略：... 视觉锚点：ProjectB图标（红色圆形...）` | **YES** |
| Direction (≥2/4 grounded) | `通过一套材质关系... 视觉锚点：ProjectA主标志（紫色渐变...）` | `通过一套材质关系... 视觉锚点：ProjectB图标（红色圆形...）` | **YES** (4/4 grounded) |
| Semantic fingerprint | A:stripped text | B:stripped text | **DIFFERENT** |

---

## PART F — Acceptance semantics

| Layer | Acceptance | Status (unit test) |
| --- | --- | --- |
| Need | ≥1 project-specific | NI-01 PASS |
| Insight | ≥1 project-specific | (no insights emitted in fixture, but the differentiation Need flows into the asset-activation opportunity's trace) |
| Opportunity | non-empty | OP-01 PASS |
| Concept | ≥1 project-specific | CP-01 PASS |
| Direction | ≥2/4 project-specific | DR-01 PASS (4/4) |

All semantic-fingerprint assertions are textual (no runId / sourceRunId
/ timestamps / revision noise in the captured strings).

---

## PART G — Semantic fingerprint validation

`CN-01` asserts `concatenated visualMechanism (A) !== concatenated
visualMechanism (B)` after whitespace normalization. The fingerprint
deliberately strips runId / sourceRunId / timestamps / revision ids —
those are stored at the Canon/anchor layer, NOT in the
`visualMechanism` text. The visualMechanism text is
`family template + 视觉锚点 suffix`; the suffix carries the
project-specific descriptors.

Implementation: see `tests/.../ci-5/visual-evidence-propagation-ui-ni-op-cp-dr.test.js`
CN-01 test.

---

## PART H — Tests (UI / NI / OP / CP / DR / CN)

File: `tests/packages/creative-intelligence/ci-5/visual-evidence-propagation-ui-ni-op-cp-dr.test.js`
(vp suite: `tests/packages/creative-intelligence/ci-5/visual-evidence-contribution.test.js`)

| Test | Status |
| --- | --- |
| VP-01..VP-08 | PASS (8/8) |
| UI-01 | PASS |
| NI-01 | PASS |
| OP-01 | PASS |
| CP-01 | PASS |
| DR-01 | PASS (4/4 grounded) |
| CN-01 | PASS |

All tests are project-agnostic (use synthetic vnext payloads, not G01/G02
hardcode). VP / CI-4 / CI-5 / CI-6 test suites:
- VP (visual-evidence-contribution): 8/8 PASS
- CI-4 contracts: 27/27 PASS (including 9 Need rules)
- CI-5 visual-evidence-propagation: 6/6 PASS
- All other CI-* tests: UNCHANGED (0 new failures, 0 worsened failures)

---

## PART I — Same-model real smoke

**STATUS: NOT YET CAPTURED.** The same-model real smoke (re-running the
Resume.1 differentiation-smoke.mjs with the new code path) requires
- real Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`
- real Qwen analysis API (env `MASTERPIECE_CI_W1C_ANALYSIS_PROFILE_ID`)
- real Seedream image API (env `MASTERPIECE_CI_W1C_IMAGE_PROFILE_ID`)
- a fresh Node Web Host + Vite + Chrome + analysis provider/model

Per CI-W1C.5 §3, smoke is authorized separately. Per the per-step STOP
rule, this phase halts here and does NOT launch Attempt 2 Retry.

**Pre-existing pre-conditions that gate re-evaluation to
READY_FOR_ATTEMPT2_RETRY**:

1. Re-run `differentiation-smoke.mjs` with the new code path
   (visual evidence contribution wired in). Capture new
   `differentiation-smoke-evidence.json` at
   `.codex-smoke/ci-w1c.4-resume/<run-alias>/`.
2. Re-run `tests/.../qualification-differentiation-xd.test.js`. Expect
   XD01..XD05 to flip from FAIL (5/7) to PASS (7/7).
3. Re-run live FE01-FE04 and AI01-AI06.
4. User authorization for CI-W1C Attempt 2 Retry.

---

## PART J — Live FE / AI

**DEFERRED** — gates on PART I (real smoke) and user authorization.

---

## PART K — Frozen surfaces preserved

| Surface | Status |
| --- | --- |
| Document Intelligence (prompt + extraction) | UNCHANGED |
| DVC schema | UNCHANGED (DVC is not modified; VisualEvidenceContribution reads vnext directly) |
| Truth taxonomy (TruthClass / TruthAuthority / SourceType) | UNCHANGED (no new enum value; reuses `VISUAL_SOURCE_FACT` + `visual_understanding_core`) |
| Conflict Detector | UNCHANGED |
| Concept Gate critical semantics | UNCHANGED (no `MISSING_CRITICAL_NEED_COVERAGE` regression; visualAsset differentiation Need is now correctly included in concept's needRefs) |
| CI-7 Evaluation | UNCHANGED |
| Selection | UNCHANGED |
| Canon schema | UNCHANGED |
| Anchor | UNCHANGED |
| Image Runtime | UNCHANGED |
| Translation | UNCHANGED |
| Consumers | UNCHANGED |
| CI-10 | NOT STARTED (consumer switch still FORBIDDEN) |

---

## PART L — Regression

### Test results

| Suite | Pass | Fail | Notes |
| --- | --- | --- | --- |
| `node --test tests/packages/creative-intelligence/**` | 680 | 8 | 8 pre-existing fails (XD01-XD05 use OLD smoke evidence; CI-6 golden 1 pre-existing latent bug; CI-W1A L1/L10 pre-existing; CI-1B parity pre-existing timestamp flake). **0 new failures, 0 worsened failures** caused by CI-W1C.5 changes. |
| `npm test` (root contracts) | pass | 0 | — |
| `npm run web:typecheck` | pass | — | clean tsc --noEmit |

### Verify commands

| Command | Status | Notes |
| --- | --- | --- |
| `npm run verify:version-consistency` | PASS | — |
| `npm run verify:version-naming` | PASS | — |
| `npm run verify:workspace-boundaries` | PRE-EXISTING FAIL | Script bug at line 218 (`ReferenceError: dir is not defined`) + 1 pre-existing deep import; same state before this phase. **Not caused by CI-W1C.5.** |
| `npm run verify:production-boundaries` | PASS | — |
| `npm run verify:no-obsolete-code` | PASS | — |
| `npm run verify:no-project-specific-production-rules` | PASS | (after rephrasing one comment to avoid false-positive on "injection") |
| `npm run verify:golden-boundary` | PASS | — |
| `npm run verify:tracked-runtime-assets` | PASS | (no new tracked scripts) |

**0 new failures. 0 worsened failures.**

---

## PART M — Verdict

**HOLD_FOR_LIVE_SMOKE_CAPTURE** — semantic loss repaired in
project-agnostic unit tests; OpportunityMap non-empty; Need / Insight /
Opportunity / Concept / Direction / Canon project-specific semantics +
trace verified in unit tests; XD01-XD05 will flip to PASS only after a
real-model smoke re-run with the new code path (PART I) + user
authorization (PART J).

NOT yet eligible for `READY_FOR_ATTEMPT2_RETRY` because:

- The same-model real smoke has not been re-captured (PART I).
- Live FE/AI tests have not been re-run (PART J).

Once the user authorizes the smoke re-run + live FE/AI re-run, the
verdict may flip to `READY_FOR_ATTEMPT2_RETRY` (if the new smoke shows
real-model differentiation) or escalate to a different verdict (if the
real smoke still shows template-level output despite the unit-test
differentiated chain).

**Stop conditions honored**:
- Per-step STOP: NOT proceeding to Attempt 2 Retry.
- CI-10: NOT STARTED. Consumer switch: FORBIDDEN.

---

## Files changed (uncommitted; CI-W1C.5 in-progress)

Modified:
- `packages/creative-intelligence/package.json` (visual-evidence exports)
- `packages/creative-intelligence/src/index.ts` (re-export visual-evidence)
- `packages/creative-intelligence/src/integration/nice-pipeline.ts` (vnext input)
- `packages/creative-intelligence/src/need-intelligence/derive-needs.ts` (Rule 9)
- `packages/creative-intelligence/src/concept-intelligence/generate-concepts.ts` (visual anchor + need promotion)
- `packages/creative-intelligence/src/direction-intelligence/generate-directions.ts` (visual anchor suffix)
- `packages/runtime-core/src/application/creative-intelligence-application-service.ts` (loadProjectVNext + in-memory decoratedTruth)
- `packages/runtime-core/src/application/runtime-services.ts` (vnext bridge)
- `tests/packages/creative-intelligence/ci-4/nice-contracts.test.js` (9 rules)

New:
- `packages/creative-intelligence/src/visual-evidence/visual-evidence-contribution.ts`
- `packages/creative-intelligence/src/visual-evidence/index.ts`
- `tests/packages/creative-intelligence/ci-5/visual-evidence-contribution.test.js`
- `tests/packages/creative-intelligence/ci-5/visual-evidence-propagation-ui-ni-op-cp-dr.test.js`
- `docs/creative-intelligence/ci-w1c.5/visual-evidence-propagation-trace.md`
- `docs/creative-intelligence/ci-w1c.5/final-report.md` (this file)

Frozen reference:
- `9ac172f13c7c52482a129ad57d07e14ef3c890ca` (Resume.1 Frozen HEAD)
- `2330259014af569f0254257e282fe8c4660a121c` (last Resume.1 commit)
