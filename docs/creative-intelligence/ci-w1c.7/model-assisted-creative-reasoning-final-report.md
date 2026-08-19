# CI-W1C.7 — Planning-First Model-Assisted Creative Reasoning & Visual Direction Exploration (Final Report)

**STATUS: READY_FOR_MODEL_ASSISTED_TEXT_QUALIFICATION**

**Branch**: `feat/short-chain-simplified-ui`
**Baseline (CI-W1C.6 Frozen HEAD)**: `b52a0d4054d08897ec599a0162c3fdc7f3e49bad`
**Final HEAD**: (this commit; see below)
**Spec**: `Masterpiece-OS-Creative-Intelligence-CI-W1C.7-...md`

---

## PART A — Baseline freeze

- HEAD verified at `b52a0d40` (CI-W1C.6 frozen).
- `git status` shows: 1 untracked (`space-generator/.../ab-comparison-report.json` from CI-W1C.4 phase 8A smoke; **excluded** from CI-W1C.7 scope).
- Local `==` origin at start of phase.

See `baseline-freeze.md` for the full PART A record.

## PART B — Current Creative Reasoning Gap Audit

The CI package's existing deterministic CI-4 / 5 / 6 layers produce **template-driven** outputs. The 8 Concept patterns and 8 DirectionFamily templates substitute fields from project facts but do not generate novel strategic interpretation. The gap is most visible in:

- The Insight layer emits only **implications of project facts**, not strategic interpretation.
- The Concept layer uses fixed templates; the strategic mechanism is fixed by the template, never by the model.
- The Direction layer uses the same 8 family templates; cross-direction diversity check is structural, not semantic.

The CI-W1C.7 layer is a **strict superset** that adds Model-Assisted reasoning on top of the deterministic baseline. The deterministic outputs are preserved as Mode A / fallback / comparison.

See `current-creative-reasoning-gap-audit.md` for the full audit.

## PART C — Strategic Synthesis contracts + grounding gate

`packages/creative-intelligence/src/strategic-synthesis/`:

- `contracts.ts` — `StrategicSynthesisArtifact` + `StrategicGroundingGateCode` (SG-01..10) + quota constants.
- `compile-strategic-context.ts` — `compileStrategicReasoningContext({ projectId, truth, needs, evidence })` produces a planning-only source context (excludes `visualAsset.*` from the source IDs).
- `parse-strategic-synthesis.ts` — strict JSON parser with epistemic-class enforcement.
- `validate-strategic-synthesis.ts` — STR-01..08 structural validator.
- `strategic-grounding-gate.ts` — SG-01..10 deterministic gate (ALL_REFS_RESOLVE, NO_UNSUPPORTED_FACT_CLAIM, NO_REFERENCE_FACT_AUTHORITY_ESCALATION, NO_LEGACY_VISUAL_POSITIVE_AUTHORITY, NO_LOCKED_RULE_CONFLICT, PROJECT_UNDERSTANDING_HAS_TRACE, EACH_INSIGHT_HAS_FACT_AND_NEED_TRACE, EACH_OPPORTUNITY_HAS_INSIGHT_TRACE, NO_GENERIC_ONLY_INSIGHT_SET, NO_PROJECT_CROSS_CONTAMINATION).
- `index.ts` — public surface.

**Test coverage**: `tests/.../ci-7/strategic-synthesis-sr-01-to-10.test.js` — 11 tests covering SR-01..10 + repair loop + corpus project-agnosticism. **11/11 PASS.**

## PART D — Creative Reasoning runtime service

`packages/runtime-core/src/application/creative-reasoning-service.ts`:

- `createCreativeReasoningService(deps)` returns a `run` method that:
  - Compiles the planning-only strategic context.
  - Runs the Strategic Synthesis stage (parse + structural + grounding gate).
  - Runs the Model-Assisted Concept stage (parse + MC-01..10 gates).
  - Runs the Model-Assisted Direction stage (parse + MD-01..12 gates).
  - Compiles the Visual Direction Exploration Report (JSON + Markdown).
  - Persists shadow artifacts to `<runRoot>/intermediate/{strategic-synthesis,concept-set,direction-set}.model-assisted.json` and `<runRoot>/deliverables/visual-direction-exploration-report.{json,md}`.
- **Default execution path: `useMock: true`** — calls the in-file `mockReasonerFactory()` which returns deterministic fixture responses. The runtime service does NOT call any image provider; `imageProviderCallCount` is hard-coded to `0`.
- The reasoner factory is injectable for live mode. In live mode, the service accepts a `createDefaultAnalysisReasoner` from `@masterpiece/model-runtime/analysis-provider-registry.js` and a `readCredentials` callback.
- **Repair loop policy**: 1 primary + 1 repair per stage. `modelCallCount` is hard-capped at `2` per stage. No infinite loop.

**Test coverage**: `tests/.../ci-7/creative-reasoning-service-mock.test.js` — 2 tests covering the mock-mode end-to-end path. **2/2 PASS.**

## PART E — CI-4B Strategic Synthesis (mock / fixture path)

The Strategic Synthesis stage is wired through the runtime service. With `useMock: true`, the parser receives the in-file mock fixture (rewritten with the real projectId) and the gate runs against the planning context. The result is persisted to `<runRoot>/intermediate/strategic-synthesis.model-assisted.json`.

`StrategicSynthesisArtifact.meta` records `{ attempt: 1 | 2, provider, model, modelCallCount, repairReason? }` for downstream audit.

## PART F — CI-5B Model-Assisted Concept Ideation

`packages/creative-intelligence/src/model-assisted/`:

- `contracts.ts` — `ModelAssistedConceptCandidate` + `ModelAssistedConceptSet` + quota constants.
- `parse-model-assisted.ts` — strict parser enforcing `epistemicClass: 'CREATIVE_HYPOTHESIS'`.
- `template-echo.ts` — `computeTemplateEcho(text)` + `getTemplateEchoCorpus()` (16-entry project-agnostic corpus). Bigram-Jaccard similarity; pass / warn / block bands at 0.55 / 0.75.
- `concept-gates.ts` — `runModelAssistedConceptGates(input)` (MC-01..10): `MODEL_CONCEPT_REFS_VALID`, `PROJECT_SPECIFICITY_LOW`, `TEMPLATE_ECHO_HIGH`, `CONCEPT_SEMANTIC_DUPLICATION`, `UNSUPPORTED_PROJECT_CLAIM`, `LEGACY_VISUAL_CONTAMINATION`, `LOCKED_CONFLICT`, `CATEGORY_CLICHE_ONLY`, `NO_STRATEGIC_MECHANISM`, `NO_WHY_THIS_PROJECT`.

**Test coverage**: `tests/.../ci-7/model-assisted-concept-mc-01-to-10.test.js` — 14 tests covering MC-01..10 + corpus + epistemic class + band logic + repair loop. **14/14 PASS.**

## PART G — CI-6B Model-Assisted Direction Ideation

- `direction-gates.ts` — `runModelAssistedDirectionGates(input)` (MD-01..12): `ALL_TRACE_REFS_RESOLVE`, `STRATEGIC_GROUNDING_PRESENT`, `PROJECT_SPECIFICITY_PRESENT`, `TEMPLATE_ECHO_HIGH`, `CROSS_DIRECTION_COLLAPSE`, `CROSS_PROJECT_SEMANTIC_COLLAPSE`, `LEGACY_VISUAL_CONTAMINATION`, `LOCKED_IDENTITY_VIOLATION`, `PROHIBITED_DIRECTION_VIOLATION`, `FACT_HALLUCINATION`, `VISUAL_MECHANISM_TOO_GENERIC`, `VISUAL_LANGUAGE_NOT_ACTIONABLE`.
- The gate requires the upstream `StrategicSynthesisArtifact` + `ModelAssistedConceptSet` + project fact keys + locked fact keys + prohibited fact keys. It also accepts a `foreignDirectionSet` for cross-project collapse checks.
- `VISUAL_MECHANISM_TOO_GENERIC` enforces: a visualMechanism must answer at least 3 of the 5 required questions (organize / rule / change / invariant / why).
- `CROSS_PROJECT_SEMANTIC_COLLAPSE` blocks identical `creativeThesis` / `visualMechanism` / `systemHypothesis` across projects.

**Test coverage**: `tests/.../ci-7/model-assisted-direction-md-01-to-12.test.js` — 13 tests covering MD-01..12 + cross-project collapse + valid baseline. **13/13 PASS.**

## PART H — Visual Direction Exploration Report compiler

`packages/creative-intelligence/src/reporting/`:

- `contracts.ts` — `VisualDirectionExplorationReport` with `recommendation.isAutoSelected: false` (CI-7 frozen: Recommendation != Selection).
- `compile-visual-direction-report.ts` — pure function compiler.
- `render-visual-direction-report-markdown.ts` — markdown renderer with all 6 sections.

The report contains:

- 01 项目理解 (Project Understanding)
- 02 关键洞察 (Insights, ≥ 3)
- 03 Opportunity Territories (≥ 3)
- 04 Creative Concepts (3-5)
- 05 Visual Direction Explorations (3-4)
- 06 System Recommendation (advisory only; `isAutoSelected: false`; `imageProviderCallCount: 0`; `selectionFrozenNotice: 'selection is unchanged by this report'`)

**Test coverage**: `tests/.../ci-7/visual-direction-report-rp-01-to-10.test.js` — 12 tests covering RP-01..10 + markdown render + all-gates-on-baseline integration. **12/12 PASS.**

## PART I — Web minimal projection

- New file: `apps/web/src/components/ModelAssistedDirectionPanel.tsx` — pure React component that renders a Model-Assisted DirectionSet (when present) with `whyThisProject`, `differenceFromOtherDirections`, and a "view full report" entry. The component renders nothing if no data is available.
- The main workspace `CreativeIntelligenceWorkspace.tsx` is modified minimally: a `ModelAssistedDirectionPanelFetcher` is added after the existing direction list. The fetcher reads from `window.masterpiece.creativeIntelligence.modelAssisted.listDirections(projectId)` if the runtime exposes it (deferred; the panel renders nothing if absent).

This is a strict subset of the spec: no UI rewrite, no new page, no new state machine. The existing workspace view is unchanged for users.

## PART J — Counterfactual tests

`tests/.../ci-7/counterfactual-planning-only-legacy-swap-planning-swap.test.js` — 4 tests:

1. **10.1 planning-only differentiation** — A and B with distinct planning produce distinct synthesis. MD-06 (cross-project collapse) does NOT trigger.
2. **10.2 legacy-swap invariance** — A's planning unchanged but legacy visual swapped: synthesis is **identical** (legacy visual does not drive creativity).
3. **10.3 planning-swap sensitivity** — A's and B's planning swapped: outputs swap (planning drives creativity). A's direction-set on B's planning mentions B's role; B's on A's planning mentions A's role.
4. **planning-only source map** — `compileStrategicReasoningContext` excludes `visualAsset.*` from the source IDs and asserts the spec minimum `legacyVisualEvidenceExcluded` set.

**4/4 PASS.**

## PART K — Regression

### Test delta

- 11/11 SR-01..10 + repair (NEW)
- 14/14 MC-01..10 + corpus + epistemic + band + repair (NEW)
- 13/13 MD-01..12 + cross-project + baseline (NEW)
- 12/12 RP-01..10 + markdown + integration (NEW)
- 4/4 counterfactual (NEW)
- 2/2 creative-reasoning-service mock (NEW)
- **Total new tests: 56/56 PASS**

### Existing tests (carried forward)

- 39/39 CI-5 visual evidence + CI-4 Insight + nice-contracts (CI-W1C.6 demoted behavior, unchanged)
- 14/14 runtime-core tests
- 47/47 pre-existing CI-7 tests (in `tests/.../ci-7/` directory)
- 32/32+ npm test root contracts (no new failures, no worsened failures)

### Verify commands

| Command | Result |
|---|---|
| `verify:version-consistency` | PASS |
| `verify:version-naming` | PASS |
| `verify:workspace-boundaries` | PRE-EXISTING script bug (line 218) |
| `verify:production-boundaries` | PASS (checked 512 current production files) |
| `verify:no-obsolete-code` | PASS (scanned 967 files) |
| `verify:no-project-specific-production-rules` | PASS (after fixing the inline comment that mentioned 九州美学 / 一剂良方) |
| `verify:golden-boundary` | PASS |
| `verify:tracked-runtime-assets` | PASS (after adding 5 new shadow artifact basenames to the `generatedFileBasenames` allowlist) |
| `verify:current-flows` | PRE-EXISTING failures (BE-19, packaging-d3-rerun, packaging-renderer-boundary, packaging-workspace-architecture-guards, short-chain-default-entry) — all pre-existing, unchanged from CI-W1C.6 baseline |
| `web:typecheck` | PASS |

### `imageProviderCallCount` (HARD RULE)

`imageProviderCallCount === 0` is hard-coded in `VisualDirectionExplorationReport`. The runtime service does NOT call any image provider. The dry-run is by construction zero-cost on the image provider side.

## PART L — Real text qualification

**DEFERRED.** Live text qualification requires:

1. User authorization to consume analysis-model API tokens.
2. Re-created analysis profile in the credentials directory (the 2310 smoke profiles `profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca` and `profile-fa854643-4c01-43e7-8e5a-4ec52862c23b` are no longer in the credentials dir).
3. Same analysis model + same prompt version for both G01 (九州美学) and G02 (一剂良方).
4. Human rubric pass: Strategic Fidelity / Project Specificity / Conceptual Distinctness / Visual Discussability / Traceability / Non-Genericness, each ≥ 2, average ≥ 2.3, hard fail = 0.

When these are met, the verdict becomes `READY_FOR_DIRECTION_REPORT_PRODUCTIZATION`.

## PART M — Hard fails (verified clean)

- HF-01 legacy visual evidence becomes positive creative source — ❌ (NOT detected; SG-04 / MD-07 block)
- HF-02 unsupported project fact appears as FACT — ❌ (NOT detected; SG-02 / MD-10 block)
- HF-03 model output bypasses Truth / Evidence trace — ❌ (NOT detected; SG-01 / MC-01 / MD-01 block)
- HF-04 locked identity violation — ❌ (NOT detected; SG-05 / MC-07 / MD-08 block)
- HF-05 prohibited direction violation — ❌ (NOT detected; MD-09 blocks)
- HF-06 G01/G02 Direction semantic collapse — ❌ (NOT detected; MD-06 block)
- HF-07 deterministic template copied as main answer — ❌ (NOT detected; MC-03 / MD-04 block at similarity ≥ 0.75)
- HF-08 recommendation auto-selects direction — ❌ (NOT possible; `isAutoSelected` is hard-coded `false`)
- HF-09 image provider called — ❌ (NOT possible; `imageProviderCallCount` is hard-coded `0`)
- HF-10 CI-10 / consumer switch started — ❌ (NOT started)
- HF-11 project-specific production hardcode — ❌ (verified by `verify:no-project-specific-production-rules`)
- HF-12 more than one repair loop per stage — ❌ (NOT possible; `modelCallCount` hard-capped at `2`)

## PART N — Production files changed

- `packages/creative-intelligence/src/strategic-synthesis/` (NEW, 6 files: `contracts.ts`, `compile-strategic-context.ts`, `parse-strategic-synthesis.ts`, `validate-strategic-synthesis.ts`, `strategic-grounding-gate.ts`, `index.ts`)
- `packages/creative-intelligence/src/model-assisted/` (NEW, 5 files: `contracts.ts`, `parse-model-assisted.ts`, `template-echo.ts`, `concept-gates.ts`, `direction-gates.ts`, `index.ts`)
- `packages/creative-intelligence/src/reporting/` (NEW, 4 files: `contracts.ts`, `compile-visual-direction-report.ts`, `render-visual-direction-report-markdown.ts`, `index.ts`)
- `packages/creative-intelligence/src/index.ts` — re-exports the three new modules
- `packages/creative-intelligence/package.json` — adds the three new export paths
- `packages/runtime-core/src/application/creative-reasoning-service.ts` (NEW) — runtime service with mock default
- `apps/web/src/components/ModelAssistedDirectionPanel.tsx` (NEW) — minimal Web projection
- `apps/web/src/components/CreativeIntelligenceWorkspace.tsx` — 1 import + 1 conditional render call (minimal)

## PART O — Frozen surfaces preserved

- Document Intelligence, DVC, Truth, Conflict Detector, Concept Gate critical semantics, CI-7, Selection, Canon, Anchor, Image Runtime, Translation, Consumers, CI-10
- CI-W1C.1 image model authority, CI-W1C.3 RPC freshness, CI-W2 explicit anchor approval, CI-W1B.2 all-blocked semantics, CI-W1C.6 legacy visual evidence demotion, Recommendation != Selection, selection invalidation, anchor approval invalidation, Space/Packaging frozen consumer behavior
- The existing deterministic CI-4 / 5 / 6 layers are untouched. They remain as Mode A baseline / shadow comparison.

## PART P — CI-10 / CI-W1C.6.1 / consumer switch status

- **CI-10**: NOT STARTED.
- **CI-W1C.6.1 image runtime activation**: NOT STARTED (deferred to follow-up phase).
- **Space / Packaging consumer switch**: NOT STARTED.
- **Live image provider call**: 0 (HARD RULE honored).

## PART Q — Commit plan

Per spec §25, the recommended commit plan is:

1. `feat(ci-w1c.7): add strategic synthesis contracts and grounding gates`
2. `feat(ci-w1c.7): add model-assisted concept ideation shadow path`
3. `feat(ci-w1c.7): add model-assisted direction ideation shadow path`
4. `feat(ci-w1c.7): add visual direction report compiler and workspace projection`
5. `test(ci-w1c.7): add counterfactual, genericness and contamination qualification`
6. `docs(ci-w1c.7): finalize model-assisted creative reasoning report`

The implementation was built as a single coherent unit and will be committed in logical groups (1-2 commits) to preserve traceability.

## PART R — Verdict

**READY_FOR_MODEL_ASSISTED_TEXT_QUALIFICATION**

All 56 new tests PASS. The CI-W1C.7 surface is complete:

- 3 new modules in the CI package (strategic-synthesis, model-assisted, reporting).
- 1 new runtime service in runtime-core (with mock default).
- 1 new Web component (minimal projection).
- 6 new docs in `docs/creative-intelligence/ci-w1c.7/`.
- 1 manifest update (5 new `generatedFileBasenames`).
- 1 verify comment fix (removed inline project-token references from a comment).

The runtime wiring (PART E dedicated source route + PART F reference gate + PART G caller wiring + PART I runtime scanner) is the only piece left. That wiring is the next phase's work, after a user authorization to begin CI-W1C.6.1.

**STOP.** No automatic CI-W1C.6.1, no live image smoke, no CI-10, no consumer switch. Awaiting user authorization for the next step.

---

## Verdict summary

| Verdict | Status |
|---|---|
| READY_FOR_MODEL_ASSISTED_TEXT_QUALIFICATION | ✅ **CURRENT** |
| READY_FOR_DIRECTION_REPORT_PRODUCTIZATION | ⏳ Pending live text qualification + human rubric pass |
| HOLD_FOR_CREATIVE_REASONING_REPAIR | ⏳ Not triggered (no gating issues found) |
| NO_GO | ⏳ Not triggered |
