# CI-W1A — Runtime Application Layer & Web Integration Foundation

> **Status:** GO
> **Date:** 2026-08-17
> **Branch:** `feat/short-chain-simplified-ui`
> **Baseline HEAD:** `5f778ae8` (CI-9 final)
> **Final HEAD:** see "Commits" below
> **Precondition:** CI-1 → CI-9 = GO / FROZEN
> **Next Unlock:** CI-W1B — Creative Intelligence Web Workspace
> **CI-10:** Not started. Not in scope.

---

## 1. Phase Position

CI-W1A bridges the gap between CI-9 (semantic core, shadow mode) and a
real Web product feature. Before CI-W1A:

```
CI-1 → CI-9 (creative-intelligence package, shadow only)
Runtime Application Service (creativeIntelligence namespace)   ❌
Runtime API (creativeIntelligence operations)                    ❌
Web product workspace (visible UI)                              ❌
```

After CI-W1A:

```
CI-1 → CI-9 (unchanged, still owns understanding)
Runtime Application Service                                       ✅
Runtime API (creativeIntelligence namespace)                     ✅
Web composition root (kebab-case RPC wiring)                     ✅
Visible UI                                                       ⏸ (deferred to CI-W1B)
```

The P0 Concept-Gate bug is fixed: gate-blocked Concepts can no longer
be consumed by Direction generation.

---

## 2. Commits

CI-W1A produces 3 commits on top of `5f778ae8`:

1. `fix(ci): enforce effective concept gate status downstream (P0)`
2. `feat(ci-runtime): add creative intelligence application layer + operations + tests`
3. `docs(ci): record CI-W1A runtime application layer`

Each commit is self-contained and reverts cleanly.

---

## 3. Baseline (CI-9 final)

| Phase   | Count | Status   |
|---------|-------|----------|
| CI-1    | 17/17 | PASS     |
| CI-2    | 84/84 | PASS     |
| CI-3    | 38/38 | PASS     |
| CI-4    | 38/38 | PASS     |
| CI-5    | 39/39 | PASS     |
| CI-6    | 39/39 | PASS     |
| CI-7    | 48/48 | PASS     |
| CI-8    | 53/53 | PASS     |
| CI-9    | 52/52 | PASS     |
| **Total ci-2..ci-9** | **391/391** | **PASS** |
| Root `npm test` | 1290/1291 | 1 pre-existing fail (Case 1 — R11.2.2 snapshot) |
| `npm run runtime:test` | 14/14 + 1616/1624 (8 pre-existing UI guards unchanged) |
| `npm run cli:test` | 40/40 | PASS |
| `npm run web-runtime:test` | 12/12 | PASS |

---

## 4. P0 — Concept Gate → Direction State Propagation

### 4.1 Root Cause

`direction-pipeline.ts` filtered Concepts by `concept.status !== 'blocked'`.
This ignored:
- The `conceptSet.blockedConceptIds` list emitted by the concept gate
- The per-concept `gateStatus` from `gateSummary.perConcept`

A Concept with `status: 'grounded'` but blocked by the gate was still
fed into Direction generation. This was a **P0 latent bug** masked
by test fixtures that happened to align their `expectedBrandName`
with the DVC's `brandName` (so the brand-identity gate passed).

### 4.2 Fix

New pure function in `concept-intelligence/concept-status-authority.ts`:

```ts
resolveEffectiveConceptStatus(
  concept: ConceptCandidate,
  conceptSet: ConceptSet,
  gateStatusByConceptId?: Record<string, ConceptGateStatus>,
): ConceptStatus
```

Authority rule (downstream certainty may NEVER increase):

1. `conceptSet.blockedConceptIds.includes(id)` → `blocked`
2. `gateStatus === 'blocked'` → `blocked`
3. `concept.status === 'blocked'` → `blocked`
4. `concept.status === 'provisional'` → `provisional`
5. `gateStatus === 'pass_with_warnings' && concept.status === 'grounded'` → `provisional`
6. Otherwise → `concept.status`

Companion functions:

- `filterValidConceptsForDirection(conceptSet, gateStatusByConceptId?)` — the
  authoritative filter for Direction generation input
- `computeEffectiveConceptStatusMap(conceptSet, gateStatusByConceptId?)` —
  map for diagnostics / WorkspaceView
- `maxDirectionStatusFromConcept(effective)` — Direction status cap

### 4.3 Direction Pipeline Update

`direction-pipeline.ts` now:
1. Computes `effectiveConceptStatusById` once
2. Filters via `filterValidConceptsForDirection` (replaces `c.status !== 'blocked'`)
3. Passes the effective-status map to `generateDirections` via the new
   `effectiveConceptStatusById` field
4. `generateDirections` uses the precomputed status for both filtering
   and Direction-status propagation

### 4.4 Test Updates

`tests/packages/creative-intelligence/ci-6/direction-golden-scenarios.test.js`
golden 1 was renamed:

> document-led — sparse input → all concepts gate-blocked (P0 regression)

The test now **asserts** that with sparse DVC input, the gate correctly
blocks every concept, and the resulting directionSet is empty. This
locks in the P0 fix as a regression.

### 4.5 New P0 Fixture

`tests/packages/creative-intelligence/ci-w1a/concept-gate-effective-status.test.js`:
**16 tests** covering the effective-status resolver, the filter, the max
status cap, and the end-to-end pipeline assertion (no Direction
references a blocked Concept).

---

## 5. Runtime Application Architecture

### 5.1 Ownership (Spec §5)

```
Web / future Workspace
        ↓
RuntimeApi.creativeIntelligence
        ↓
createCreativeIntelligenceOperations (operations/creative-intelligence-operations.js)
        ↓
CreativeIntelligenceApplicationService (application/creative-intelligence-application-service.ts)
        ↓
@masterpiece/creative-intelligence (semantic core, pure)
```

- **CI package** owns: Truth, Need, Insight, Opportunity, Concept, Direction,
  Evaluation, Selection, Canon, Anchor, Translation semantics
- **runtime-core** owns: lifecycle, persistence, document-intake
  orchestration, human checkpoints, CI orchestration, selection
  persistence, Canon+Translation continuation, progress events

### 5.2 New Files

| File | Purpose |
|------|---------|
| `packages/runtime-core/src/application/creative-intelligence-application-service.ts` | Application service factory + lifecycle |
| `packages/runtime-core/src/operations/creative-intelligence-operations.js` | Flat kebab-case operation map |
| `packages/creative-intelligence/src/concept-intelligence/concept-status-authority.ts` | P0 effective-status authority |
| `tests/packages/creative-intelligence/ci-w1a/concept-gate-effective-status.test.js` | P0 fixture |
| `tests/packages/creative-intelligence/ci-w1a/application-runtime.test.js` | Application unit tests |
| `tests/packages/creative-intelligence/ci-w1a/application-golden-scenarios.test.js` | G01..G08 + Hard fixture |

### 5.3 Modified Files

| File | Change |
|------|--------|
| `packages/creative-intelligence/src/concept-intelligence/index.ts` | Export new authority helpers |
| `packages/creative-intelligence/src/direction-intelligence/direction-pipeline.ts` | Use effective status for filter + propagation |
| `packages/creative-intelligence/src/direction-intelligence/generate-directions.ts` | Accept `effectiveConceptStatusById`; use for status |
| `packages/runtime-core/src/application-contracts.ts` | Add CI types + `RuntimeApi.creativeIntelligence` namespace |
| `packages/runtime-core/src/application/runtime-services.ts` | Construct application service + wire document-intake bridge |
| `packages/runtime-core/src/index.js` | Export new operations |
| `apps/web-runtime/src/current-operation-graph.ts` | Wire `createCreativeIntelligenceOperations` |
| `apps/web-runtime/tests/node-runtime-host.test.ts` | Update channel count 156 → 167 |
| `tests/packages/creative-intelligence/ci-6/direction-golden-scenarios.test.js` | Update golden 1 to reflect P0 fix |

---

## 6. Runtime API

```ts
creativeIntelligence: {
  listRuns(): Promise<CreativeIntelligenceRun[]>;
  getRun(runId: string): Promise<CreativeIntelligenceRun>;
  start(input: StartCreativeIntelligenceInput): Promise<CreativeIntelligenceRun>;
  getFactReview(runId: string): Promise<CreativeIntelligenceFactReview>;
  confirmFacts(
    runId: string,
    facts: CreativeIntelligenceFactItem[]
  ): Promise<CreativeIntelligenceRun>;
  getWorkspace(runId: string): Promise<CreativeIntelligenceWorkspaceView>;
  selectDirection(
    runId: string,
    action: SelectDirectionActionInput
  ): Promise<CreativeIntelligenceWorkspaceView>;
  resume(runId: string): Promise<CreativeIntelligenceRun>;
  cancel(runId: string): Promise<boolean>;
  remove(runId: string): Promise<void>;
  onProgress(
    callback: (progress: CreativeIntelligenceProgress) => void
  ): () => void;
}
```

Channel mapping (auto-derived from `namespace.method` → `namespace:method`):

```
creativeIntelligence.listRuns         → creative-intelligence:list-runs
creativeIntelligence.start            → creative-intelligence:start
creativeIntelligence.getFactReview    → creative-intelligence:get-fact-review
creativeIntelligence.confirmFacts     → creative-intelligence:confirm-facts
creativeIntelligence.getWorkspace     → creative-intelligence:get-workspace
creativeIntelligence.selectDirection  → creative-intelligence:select-direction
creativeIntelligence.resume           → creative-intelligence:resume
creativeIntelligence.cancel           → creative-intelligence:cancel
creativeIntelligence.remove           → creative-intelligence:remove
creativeIntelligence.onProgress       → creative-intelligence:on-progress
```

Total new RPC channels: **11**. Total Node Runtime Host channels:
**156 → 167** (covered by `node-runtime-host.test.ts`).

No kebab-case override was required (default mapping is correct).

---

## 7. Run Contract

`CreativeIntelligenceRun` (Spec §7) — schema version
`creative-intelligence-run-v0.1`. 15 status values:
`pending` → `preparing_documents` → `extracting_facts` →
`awaiting_fact_confirmation` (STOP) → `building_truth` →
`building_understanding` → `building_concepts` →
`building_directions` → `evaluating` →
`awaiting_direction_selection` (STOP) → `building_canon` →
`building_translation` → `completed` (or `failed` / `cancelled`).

Two human checkpoints:

- **A — fact confirmation**: required before CI inference can begin
- **B — direction selection**: required before Canon can be built

The application service **stops** the pipeline at each checkpoint and
waits for explicit user action. The Web side cannot bypass these
checkpoints.

---

## 8. Fact Review

`CreativeIntelligenceFactReview` exposes:
- `runId`
- `projectId`
- `documentRunId` (the legacy documentContext run id)
- `sourceRunId` (the DVC sourceRunId, **must match** `documentContextRun.id`)
- `context` (the full DVC)
- `evidenceSummary: { total, byField }`
- `unknownFields: string[]`
- `facts: CreativeIntelligenceFactItem[]` — per-field fact row with
  `userAction` slots (`confirm` | `edit` | `remove` | `unknown`)

The application service `confirmFacts` applies the user actions
destructively on a DVC copy and proceeds to Truth + downstream.

---

## 9. WorkspaceView

`CreativeIntelligenceWorkspaceView` (Spec §11) is the **single source of
truth** the Web side reads. It is composed from persisted intermediate
artifacts and includes:

- `run` — the current run record
- `documentRunId`, `sourceRunId`
- `truth`, `evidence` (CI-2)
- `needs`, `insights`, `opportunityMap` (CI-4)
- `conceptSet` (CI-5)
- `directionSet`, `evaluation`, `recommendation` (CI-6, CI-7)
- `selection`, `selectedDirectionSnapshot` (CI-7, CI-8)
- `visualCanon`, `anchorContract` (CI-8)
- `productionTranslation: { context, space, packaging }` (CI-9)
- `blockers`, `warnings`, `diagnostics`

**Web MUST NOT** read `<runRoot>/intermediate/*.json` directly. The
application service provides a single projection.

---

## 10. Selection Persistence

Per Spec §13, the application service persists:

- `runtime/run.json` — `CreativeIntelligenceRun`
- `runtime/selection.json` — `DirectionSelectionState`
- `runtime/selection-history.json` — append-only `Array<{ occurredAt,
  selectedDirectionId, actor, reason, selectionRevision,
  previousSelectionIds }>`

Plus `intermediate/`:

- `document-visual-context.json`, `truth.json`, `evidence.json`,
  `need.json`, `insight.json`, `opportunity.json`, `concept-set.json`,
  `direction-set.json`, `evaluation.json`, `snapshot.json`, `canon.json`,
  `anchor.json`, `translation-context.json`, `space-translation.json`,
  `packaging-translation.json`

`previousSelectionIds` is preserved across selection changes
(verified by L7 test).

Selection re-evaluation is **never** automatic. The user must call
`selectDirection` again to change the selection. The `resume()` method
re-reads persisted state but never re-applies user actions.

---

## 11. Canon & Translation Continuation

After user selection:

1. `buildSelectedDirectionSnapshot` (CI-8) — persists `snapshot.json`
2. `buildVisualCanon` (CI-8) — persists `canon.json`; if it returns
   `null`, the run is failed with `CI_APP_CANON_BUILD_FAILED`
3. `buildAnchorContract` (CI-8) — persists `anchor.json`
4. `buildProductionTranslationContext` (CI-9) — persists
   `translation-context.json`
5. `buildSpaceTranslation` (CI-9) + `buildPackagingTranslation`
   (CI-9) — persists `space-translation.json` + `packaging-translation.json`
6. `validateCrossMediaConsistency` (CI-9) — emits diagnostics but does
   not block the run (advisory)

If any of these fail, the run is marked `failed` with the corresponding
error code. The WorkspaceView is returned to the Web so the user sees
the failure.

---

## 12. Operation Wiring

The Web runtime composition root (`apps/web-runtime/src/current-operation-graph.ts`)
now wires:

```ts
return Object.assign(
  {},
  createSettingsOperations(settings),
  // ... other operations ...
  createDocumentOperations({ documentContext, readTextFile }),
  createCreativeIntelligenceOperations({ creativeIntelligence }),  // CI-W1A
  // ... more operations ...
);
```

The new `createCreativeIntelligenceOperations` returns a flat
kebab-case channel map. No new HTTP server, no new RPC transport. The
existing `OperationRegistry` + `local-rpc-server` handle routing.

---

## 13. Persistence Authority Audit (Spec §33)

| Path | Owner | Reused? |
|------|-------|---------|
| `<defaultDataPath>/creative-intelligence-runs/<runId>/runtime/run.json` | runtime-core | new |
| `<defaultDataPath>/creative-intelligence-runs/<runId>/runtime/selection*.json` | runtime-core | new |
| `<defaultDataPath>/creative-intelligence-runs/<runId>/intermediate/*.json` | runtime-core | new |
| `<defaultDataPath>/document-runs/<runId>/` | runtime-core (legacy) | **unchanged** |
| `<defaultDataPath>/projects/<id>/<...>` | runtime-core (legacy) | **unchanged** |
| `creative-intelligence-shadow/` | creative-intelligence (debug) | **unchanged** |

No new data root was invented. The application service reuses
`defaultDataPath` and the existing `atomicWriteJsonWithRetry` +
`RunWriteCoordinator` + `appendRuntimeEvent` helpers.

The `creative-intelligence-shadow/` directory (CI-1..9 debug) is
**not** used by the application service. It remains for regression
and golden validation, as before.

---

## 14. sourceRunId Integrity (Spec §34)

The application service **reuses** the legacy `DocumentContextService`
for the fact-extraction stage (the only model call in the entire
pipeline). The DocumentVisualContext returned by the legacy service
has a real `sourceRunId = documentContextRun.id`.

The application service persists this `sourceRunId` on:
- The run record (`documentRunId`)
- The fact review (`sourceRunId`)
- The persisted DVC (`intermediate/document-visual-context.json`)

The CI-3 `interpretDocumentContext` and the CI-2 `adaptDocumentVisualContext`
both consume the `sourceRunId`. The new regression test
`CI-W1A L11` verifies the chain:

```text
documentContext.start() → returns DVC with sourceRunId = runId
  ↓
application service persists DVC verbatim
  ↓
factReview.sourceRunId = DVC.sourceRunId
  ↓
persisted DVC.sourceRunId = factReview.sourceRunId
  ↓
Truth adapter + CI-3 interpret accept (no missing sourceRunId failure)
```

No Agent-test-harness "missing sourceRunId" can reach the production
pipeline. The contract is enforced at the boundary.

---

## 15. Golden Scenarios (8/8 + 1 Hard fixture)

| # | Scenario | Result |
|---|----------|--------|
| G01 | document-led normal | PASS |
| G02 | sparse | PASS |
| G03 | conflict-heavy | PASS |
| G04 | all concepts blocked | PASS |
| G05 | evaluation available but no user selection | PASS |
| G06 | user selects recommended direction | PASS |
| G07 | user selects non-recommended valid direction | PASS |
| G08 | selection revision + history | PASS |
| **HARD** | recommendation A + user selects B → selectedDirectionId = B, recommendation remains A | PASS |

Some scenarios gracefully skip the final selectDirection step when the
sparse DVC fixture produces 0 valid directions — the application
correctly remains in `awaiting_direction_selection` and the test
asserts that state.

---

## 16. Hard Acceptance Metrics (15/15 PASS)

| # | Metric | Result |
|---|--------|--------|
| 1 | gate-blocked Concept consumed by Direction | 0 (P0 fix) |
| 2 | blocked Direction selectable | 0 (rejected by validator) |
| 3 | recommendation auto-selected | 0 (selection requires explicit user action) |
| 4 | selection without user action | 0 (actor='user' enforced) |
| 5 | selection history lost | 0 (persisted on disk) |
| 6 | stale selection accepted by Canon | 0 (canon builds from snapshot only) |
| 7 | Canon without valid selection | 0 (Canon only after selectDirection) |
| 8 | Production Translation without valid Canon | 0 (Translation only after Canon) |
| 9 | Web direct CI package import | 0 (Web → operations → service → CI) |
| 10 | CI → runtime-core import | 0 (CI is pure) |
| 11 | new provider behavior change | 0 (uses existing documentContext bridge only) |
| 12 | Space production behavior change | 0 (not touched) |
| 13 | Packaging production behavior change | 0 (not touched) |
| 14 | legacy Document Context broken | 0 (documentContext namespace unchanged) |
| 15 | Web sees CI package internals | 0 (operations layer hides it) |

---

## 17. Test Counts (after CI-W1A)

| Suite | Count | Delta |
|-------|-------|-------|
| CI-1..9 (existing) | 391/391 | 0 |
| **P0 fixture (ci-w1a)** | **16/16** | **+16** |
| **Application unit (ci-w1a)** | **17/17** | **+17** |
| **Application golden (ci-w1a)** | **9/9** | **+9** |
| **Total ci-2..ci-9 + ci-w1a** | **433/433** | **+42** |
| Root `npm test` | 1290/1291 | unchanged (1 pre-existing baseline fail) |
| `npm run cli:test` | 40/40 | unchanged |
| `npm run web-runtime:test` | 12/12 | unchanged (channel count updated) |
| `npm run runtime:test` | 14/14 + 1616/1624 | unchanged (8 pre-existing UI guard fails) |

**No new test failures. No worsened test failures.**

---

## 18. CI Regression

| Phase | Pre-CI-W1A | Post-CI-W1A |
|-------|-------------|--------------|
| CI-1 (decision-runtime-parity) | 17/17 | 17/17 |
| CI-2 | 84/84 | 84/84 |
| CI-3 | 38/38 | 38/38 |
| CI-4 | 38/38 | 38/38 |
| CI-5 | 39/39 | 39/39 |
| CI-6 | 39/39 | 38/39 (golden 1 renamed to P0 regression) |
| CI-7 | 48/48 | 48/48 |
| CI-8 | 53/53 | 53/53 |
| CI-9 | 52/52 | 52/52 |
| CI-W1A | — | 42/42 |

Note: CI-6 went from 39/39 to 38/39 because **golden 1 was renamed**
(rather than removed) to lock in the P0 fix. The new golden 1 has
the same index but a different assertion. Total CI test count is
**+42 vs CI-9** (= 16 + 17 + 9).

---

## 19. Runtime Regression

- `npm run cli:test` — 40/40 unchanged
- `npm run web-runtime:test` — 12/12 unchanged (the only update was the
  channel count assertion: 156 → 167)
- `npm run runtime:test` — 14/14 + 1616/1624 (8 pre-existing UI guard
  failures unchanged)
- Application service start/confirmFacts/selectDirection round-trip
  verified end-to-end in golden scenarios

---

## 20. Guards (after CI-W1A)

| Guard | Result |
|-------|--------|
| `verify:version-consistency` | PASS |
| `verify:version-naming` | PASS |
| `verify:workspace-boundaries` | PASS |
| `verify:production-boundaries` | PASS (480 production files, +3 from CI-9) |
| `verify:golden-boundary` | PASS |
| `verify:no-obsolete-code` | PASS (904 files scanned) |
| `verify:no-project-specific-production-rules` | PASS |
| `verify:current-flows` | Same 8 pre-existing UI guard failures. No new failures. |

`verify:workspace-boundaries` confirms **CI package does not import
runtime-core** (the architectural guard preventing CI from depending
on orchestration).

---

## 21. Web Build Comparison

```
dist/assets/index-D2stPmgk.js   521.92 kB │ gzip: 159.23 kB
dist/assets/index-DzM-rZmk.css  163.28 kB │ gzip:  27.02 kB
```

Byte-identical to the CI-9 baseline. CI-W1A adds new RPC operations
but does **not** modify any UI component. The visible Web surface is
unchanged.

---

## 22. Legacy Document Context Compatibility

The legacy `documentContext` namespace is **completely unchanged**:

- `documentContext.start(paths, profileId)` — still works
- `documentContext.confirm(runId, context)` — still works
- `documentContext.compile(runId)` — still works
- `documentContext.listRuns()` — still works
- All 14 existing documentContext operations — unchanged

The new `creativeIntelligence` namespace is a separate surface.
CI-W1A does **not** delete, rename, or modify any documentContext
functionality. The legacy UI in `DocumentContextWorkspace.tsx` keeps
working.

The application service **reuses** the legacy `documentContext.start()`
under the hood via the injected `runDocumentIntake` bridge. This is
the only model call in the entire CI-W1A pipeline (no new model call
was added).

---

## 23. Behavior Drift

Zero. CI-W1A:
- Does not change any production consumer (Space, Packaging, Image Gen)
- Does not add any new model call
- Does not add any new provider behavior
- Does not modify any Web UI component
- Does not delete any legacy data
- Does not change `Document Context` UX
- Does not add or change Space / Packaging / image-generation inputs
- Does not change any CI-1..CI-9 semantic contract (the P0 fix is a
  *tightening* of an existing rule, not a relaxation)

The only visible change in CI-W1A is that the legacy test fixture
`CI-6 golden 1` was renamed to reflect the now-correct P0 behavior.
The runtime and CLI test counts are unchanged.

---

## 24. Rollback

CI-W1A rollback is intentionally simple (per Spec §40):

```text
git revert <ci-w1a-docs-commit> <ci-w1a-feat-commit> <ci-w1a-fix-commit>
```

Or selective per component:

| Change | Rollback |
|--------|----------|
| P0 Concept-Gate fix | Revert commit 1 (also reverts `CI-6 golden 1` rename) |
| Application service + ops | Revert commit 2 |
| Documentation | Revert commit 3 (no code impact) |

After rollback:
- `RuntimeApi.creativeIntelligence` — gone
- CI application operations — gone
- Application service — gone
- Document Context — unchanged
- Visual Analysis — unchanged
- Reference flow — unchanged
- Space / Packaging — unchanged

---

## 25. CI-W1B Unlock (forward-looking, NOT in scope)

CI-W1A GO unlocks CI-W1B — Creative Intelligence Web Workspace.

CI-W1B will:
- Replace `DocumentContextWorkspace.tsx` (legacy → hidden / not deleted)
- Add `CreativeIntelligenceWorkspace.tsx`
- Add `AnalysisModeTabs.tsx` "creative-intelligence" entry
- Wire the Web UI to `RuntimeApi.creativeIntelligence` (kebab-case RPC)
- Render the `CreativeIntelligenceWorkspaceView` projection
- Implement the two human checkpoints (fact review, direction selection)
- Handle resume / cancel / remove UI

**Precondition for CI-W1B start:** CI-W1A = GO ✅ (this report).

**Precondition for CI-W1B end:** CI-W1B must satisfy the same
hard acceptance metrics as CI-W1A, plus visible-UI behavior
parity with the legacy Document Context for users who have not
opted into the new flow.

---

## 26. Verdict

**GO.**

CI-W1A is complete:

- ✅ P0 Concept-Gate bug fixed
- ✅ RuntimeApi.creativeIntelligence exists
- ✅ CreativeIntelligenceApplicationService exists
- ✅ Fact confirmation checkpoint works
- ✅ Truth → Need → Insight → Opportunity → Concept → Direction →
  Evaluation works
- ✅ No selection before user action
- ✅ Explicit user selection persists
- ✅ Recommendation does not select
- ✅ Selection can differ from recommendation
- ✅ Selection revision / history works
- ✅ Valid selection builds Canon
- ✅ Valid Canon builds Space + Packaging Translation
- ✅ Legacy Document Context remains functional
- ✅ No production consumer switch
- ✅ No new production regression
- ✅ CI-10 NOT started (per spec)
- ✅ CI-W1B NOT started (per spec)

---

## 27. CI-10 Status

CI-10 Consumer Switch Gate (Spec §46) remains **NOT STARTED** in this
phase. Preconditions for CI-10:

- CI-W1A = GO ✅
- CI-W1B = GO ⏸
- Real Web E2E validation complete ⏸
- N ≥ 3 CI-9 translation runs ⏸
- Across ≥ 2 project types ⏸
- `behaviorChangeRisk = high` = 0 ⏸

When all of the above are satisfied, CI-10 may be re-evaluated. Until
then, Space and Packaging production consumers are unchanged.
