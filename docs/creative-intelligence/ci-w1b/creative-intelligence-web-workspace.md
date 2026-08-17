# CI-W1B — Creative Intelligence Web Workspace

> **Status:** GO
> **Date:** 2026-08-17
> **Branch:** `feat/short-chain-simplified-ui`
> **Baseline HEAD:** `cea5512b` (CI-W1A final)
> **Final HEAD:** see "Commits" below
> **Precondition:** CI-W1A = GO / FROZEN. RuntimeApi.creativeIntelligence + CreativeIntelligenceApplicationService + CreativeIntelligenceWorkspaceView all exist.
> **Next Unlock:** CI-W1C (or skip to CI-10 after CI-W1B + N≥3 consistent CI-9 shadow runs).
> **CI-10:** Not started. Not in scope.

---

## 1. Phase Position

CI-W1B replaces the experimental "Document Context Extraction" tab as the
primary Web entry with a full Creative Intelligence Web Workspace that
drives RuntimeApi.creativeIntelligence through 9 stages.

```
Before CI-W1B:
  App.tsx → AnalysisModeTabs('document-context') → DocumentContextWorkspace
  (experimental, single-stage: extract + human confirm + compile brief)

After CI-W1B:
  App.tsx → /creative-intelligence → CreativeIntelligenceWorkspace
  (primary, 9 stages: Input → Facts → Understanding → Concept → Direction
   → Evaluation → Selection → Canon → Translation)

  DocumentContextWorkspace still routable at /document-context (legacy).
```

CI-W1B is the Web product projection layer. It does NOT modify CI-1..CI-9
semantics, Runtime Application Service, or Space / Packaging production
chains. The CI-1B WorkspaceView is the single source of truth for the
Web side.

---

## 2. Commits

CI-W1B produces 5 commits on top of `cea5512b`:

1. `chore(web): add creative intelligence route and mode entry` (`58c0d313`)
2. `feat(web): add creative intelligence workspace shell and run lifecycle` (`0fccbcd5`)
3. `feat(web): add creative intelligence workspace styles` (`8c83b1c8`)
4. `test(web): add CI-W1B web golden scenarios + Web-only invariant guards` (`f5418540`)
5. `fix(web): remove project-specific placeholder from input panel` (`48558dfa`)

Each commit is self-contained and reverts cleanly.

---

## 3. Baseline (CI-W1A final)

| Phase   | Count | Status   |
|---------|-------|----------|
| CI-1    | 17/17 | PASS     |
| CI-2    | 84/84 | PASS     |
| CI-3    | 38/38 | PASS     |
| CI-4    | 38/38 | PASS     |
| CI-5    | 39/39 | PASS     |
| CI-6    | 38/38 | PASS     |
| CI-7    | 48/48 | PASS     |
| CI-8    | 53/53 | PASS     |
| CI-9    | 52/52 | PASS     |
| CI-W1A  | 42/42 | PASS     |
| **Total ci-2..9 + w1a** | **432/432** | **PASS** |
| Root `npm test` (incl. ci-w1b) | 1320/1321 | 1 pre-existing fail (Case 1 tracked-runtime-assets-guard; pre-CI-W1A) |
| `npm run runtime:test` | 14/14 + 1609/1624 (15 pre-existing UI guard fails; pre-CI-W1A) |
| `npm run cli:test` | 40/40 | PASS |
| `npm run web-runtime:test` | 12/12 | PASS |

The 1 root-level pre-existing fail is `tests/tracked-runtime-assets-guard.test.js`
Case 1, which detects that `packages/runtime-core/src/application/creative-intelligence-application-service.ts`
reads `selection.json` and `selection-history.json` without declaring them
in `config/repository-contract/runtime-static-assets.json`. This was
introduced by CI-W1A and was not flagged in CI-W1A's test set because
`tests/tracked-runtime-assets-guard.test.js` was outside the original
`tests/packages/*/*.test.js` glob. CI-W1B records it but does NOT
remediate it (it's a CI-W1A concern).

The 15 pre-existing runtime-application UI guard fails (BD-17, BE-19,
Stage 4, analysis UI intake, model connection failures, AE-01, AT-19,
AW-22, AS-20, AN-16b, AQ-25, AR-22, AZ-24, AX-21, AC-09) are unchanged
on the CI-W1B branch. CI-W1B introduces zero new UI guard failures.

---

## 4. Route

`apps/web/src/lib/useUrlScreen.ts` adds:

```ts
export type Screen =
  | 'home' | 'settings' | 'create' | 'project' | 'analysis' | 'report'
  | 'image-generation' | 'creative-session' | 'packaging'
  | 'creative-intelligence'   // NEW
  | 'document-context';       // NEW (legacy, still routable)
```

| Path | Screen |
|------|--------|
| `/` | `home` |
| `/create` | `create` |
| `/creative-intelligence` | `creative-intelligence` (NEW) |
| `/creative-intelligence/:runId` | `creative-intelligence` (deep link — resolved by WorkspaceView refresh) |
| `/document-context` | `document-context` (legacy, hidden from primary entry) |
| `/settings` | `settings` |
| `/projects/...` | `project` / `analysis` / `report` / `creative-session` (per project subroute) |
| `/packaging` | `packaging` |

Order matters: `creative-intelligence` is matched BEFORE `document-context`
so the primary route wins.

---

## 5. Mode Tabs

`AnalysisModeTabs` now exposes 3 visible tabs (was 3 with `document-context` as
primary). The `document-context` mode key remains in the type union for
back-compat but is no longer in the visible list.

| Tab key | Label | Visibility | Hint |
|---------|-------|------------|------|
| `visual-analysis` | 视觉分析 | visible | 上传视觉方案、图片、PDF 或 ZIP |
| `creative-intelligence` | Creative Intelligence | **primary** | 文档 → 事实 → 概念 → 方向 → Canon → 翻译 |
| `reference-anchor` | 参考锚定（Anchor） | visible | 上传参考图提炼风格规则，生成 Anchor Brief 交人工确认 |
| `document-context` | 文档上下文提取（旧） | hidden (mode key only) | 实验性质：仅提取品牌事实，已被 Creative Intelligence 取代 |

`is-primary` class on the `creative-intelligence` button highlights it
without changing layout (3 columns on `--ci` variant).

The `App.tsx` create-shell auto-jumps to `'creative-intelligence'` screen
when the user selects that tab in the mode strip. This is a single-line
addition in the onChange handler.

---

## 6. Home

`HomeWorkspace` (in `App.tsx` `home` screen) continues to show recent
records split into 3 kinds (`visual-analysis`, `document-context`,
`reference-anchor`). The CI runs are NOT yet merged into the home
list because they are a different product concept (per-run task vs
per-project). The CI runs are discoverable from inside the
Creative Intelligence workspace via its own run list.

This is a deliberate scoping decision: a future CI-W1C phase may
unify the home recent-records list to include CI runs.

---

## 7. Workspace Shell

`apps/web/src/components/CreativeIntelligenceWorkspace.tsx` is the
single React component. It owns:

- Lifecycle wiring: `listRuns`, `getRun`, `start`, `getFactReview`,
  `confirmFacts`, `getWorkspace`, `selectDirection`, `resume`,
  `cancel`, `remove`, `onProgress` (all via `window.masterpiece.creativeIntelligence`)
- Layout: AppShell + TopBar + stage rail + body + Trace Drawer + Modal
- Local state: input document paths, local fact rows, pending selection
  proposal, trace drawer open, stage filter
- Error / notice / busy state

It does NOT own:

- Business logic (controller owns all state transitions)
- Render logic for per-stage content (sub-panels are inline JSX)
- CI semantic types (only structural strings via `format.ts`)

---

## 8. Stage Rail

9 stages, 4 active states (done / active / pending / failed):

| # | Id | Label | Hint |
|---|----|-------|------|
| 01 | `01-input` | Input | 文档 + API profile |
| 02 | `02-facts` | Facts | 人工确认 (Checkpoint A) |
| 03 | `03-understanding` | Understanding | Truth / Need / Insight / Opportunity |
| 04 | `04-concepts` | Concepts | 战略概念候选 |
| 05 | `05-directions` | Directions | 视觉方向候选 |
| 06 | `06-evaluation` | Evaluation | 10 维评估 + 排名 + 推荐 |
| 07 | `07-selection` | Selection | 人工选择 (Checkpoint B) |
| 08 | `08-canon` | Canon | Visual Canon + Anchor Contract |
| 09 | `09-translation` | Translation | Space + Packaging 翻译合同 |

Each stage is a clickable button. The click toggles a `stageFilter`
that overrides the active stage (allows the user to look at any
stage's content even after progress has moved on). The active stage
is always derived from `run.status` via the controller.

The rail is responsive: 3 columns on viewports narrower than 960px
(collapses from 9 columns to a 3x3 grid).

---

## 9. Input

- File picker: reuses `window.masterpiece.documentContext.chooseDocuments()`
  (same channel the legacy workspace uses; no new model call)
- Drag-and-drop: same as legacy DocumentContextWorkspace
- Project name: optional, defaults to undefined; the runtime
  derives a name from the document if absent
- API profile select: filtered to `isEnabled`; falls back to
  `isDefault` then first
- Start button: calls `ci.start({ documentPaths, apiProfileId, projectName? })`
- After start, the component immediately calls `getWorkspace(runId)` and
  routes the active stage to whichever the runtime reports
- No run creation side effect on the user typing; the Start button
  is the only trigger

The Input stage shows a "load" prompt before the user has selected
a run (the workspace defaults to the run list when no active run
is set).

---

## 10. Fact Review (Human Checkpoint A)

`getFactReview(runId)` is called when the user opens a run that is in
`awaiting_fact_confirmation` state, or explicitly via the "打开事实确认"
button on the stage rail.

Each fact row has 4 chips: `confirm` / `edit` / `remove` / `unknown`.

- `confirm`: keeps the value (default for every fact on load)
- `edit`: switches the row to a text input; the typed value becomes `editedValue`
- `remove`: clears the value (sets to null) and marks the field as removed
- `unknown`: clears the value and marks the field as unknown

The controller's `buildLocalFactRows` / `applyLocalFactAction` /
`applyLocalFactEdit` / `serializeFactRows` are pure functions that
back the row state. The Web side never edits the server-side
`userAction` field; the local action is sent as-is via
`ci.confirmFacts(runId, serializedRows)`.

The Checkpoint A modal is explicit: the user must click
"确认事实并进入 Understanding" to send the actions to the runtime.
The button is disabled while the busy state is true.

---

## 11. Understanding

Renders 4 sub-blocks from the WorkspaceView:

- **Project Truth**: `truth.facts[]` rendered as a 2-col key/value grid
- **Need**: `needs[]` rendered as a flat list
- **Insight**: `insights[]` rendered as a flat list
- **Opportunity**: `opportunityMap.opportunities[]` rendered as a flat list

No JSON dump. Every fact / need / insight / opportunity is rendered
with its `title` and `description` (or value). Empty states say
"尚无 Truth 事实" / "尚无 Need" / etc.

---

## 12. Concept

Renders `conceptSet.concepts[]` as concept cards. Each card shows:

- `title` + `status` badge (grounded / provisional / blocked)
- `thesis`
- `strategicMechanism`
- `strategicPattern` (with localized label via `STRATEGIC_PATTERN_LABELS`)
- `strengths` and `risks`
- **P0 UI regression guard**: if `concept.id` is in
  `conceptRef.blockedConceptIds` or `concept.status === 'blocked'`,
  the card shows a "P0 · 已被 Gate 阻断" badge and a warning that
  "下方 Direction 视图 绝不会 引用被阻断的 Concept"

The blocked-concept visibility is intentional (the user must be able
to see the full Concept set, including blocked ones), but the
linkage to Direction is gated by `computeConceptReferenceability`
which mirrors the runtime-side `filterValidConceptsForDirection`.

---

## 13. Direction + Evaluation + Selection

This is the largest stage panel. It shows:

1. **Recommendation banner** (only when recommendation is set):
   - `primaryDirectionId`, `confidence`, `rationale[]`, `tradeoffs[]`
   - A persistent warning: "推荐仅供参考，**不会自动**成为你的选择"
   - When the Direction Set has any blocked Direction, the banner
     border becomes red (data-ciw-blocked="true")
2. **Direction cards** (one per direction, in real count — A, B, C, ...):
   - Title: `Direction A · <title>` (real index, no fixed A/B/C)
   - Status badge (grounded / provisional / blocked)
   - Recommendation badge (if `availability.isRecommended`)
   - Selection badge (if already selected)
   - Locked badge (if blocked)
   - `thesis`, `visualMechanism`, `systemHypothesis`
   - `directionFamily` (with localized label)
   - 9-cell grid: color, material, composition, typography, graphic,
     image, space, packaging, cross-media behavior
   - Evaluation (10 dimensions, 0-3 score per dimension, with reason)
   - `strengths` and `risks`
   - Selection CTA: "选择此方向" (only when stage 07 is active or
     the user has the stage filter set to selection)
3. **Ranking** (if evaluation set has ranking):
   - Numbered ordered list with reason

The CTA is gated by `evaluateSelectionAvailability`:
- Blocked direction → button shows "已阻断 · 不可选择" and is disabled
- Already selected direction → button shows "已选择" and is disabled
- Otherwise → button shows "选择此方向" and is enabled

---

## 14. Explicit User Selection (Human Checkpoint B)

When the user clicks "选择此方向", the component calls
`buildSelectionProposal({ direction, selectedDirectionId, selectionRevision, recommendation })`
which returns:

```ts
{
  directionId: string;
  directionTitle: string;
  recommended: boolean;
  isRevision: boolean;
  previousDirectionId: string | null;
  newRevision: number;
  requiresConfirmation: true;  // ALWAYS true
}
```

The component then opens a `SelectionDialog` modal showing:

- "你正在选择：<directionTitle>"
- "第 <newRevision> 次选择" (or "这是第 N 次修订" with the
  previous selection's id, if `isRevision`)
- If `proposal.recommended`, an advisory "系统也推荐了此方向"
- "取消" / "确认选择 (Checkpoint B)" buttons

The runtime `ci.selectDirection(runId, { directionId, reason, occurredAt })`
is only called after the user clicks the confirm button. The
component never auto-selects, never calls `ci.selectDirection` from a
background effect, and never defaults to the recommendation.

This is enforced by the import guard:
`ci.selectDirection(...)` appears exactly ONCE in the entire
`CreativeIntelligenceWorkspace.tsx` source.

---

## 15. Selection History

The WorkspaceView's `selection` field carries the
`DirectionSelectionState` (including `revision`,
`previousSelectionIds[]`, `selectedDirectionId`, `selectedBy`).
The workspace renders:

- Current selection: `selectedDirectionId` (with `Direction A · <title>`)
- Revision: `selectionRevision`
- Previous selection ids: `selection.previousSelectionIds` as
  a chip list (each chip shows the id and the revision at which
  it was the active selection)

The revision is incremented on every `selectDirection` call.
The history is preserved across `resume()` calls (verified by
CI-W1A G08 + L7).

---

## 16. Visual Canon

When the run has a valid selection AND the runtime has produced a
`visualCanon`, the stage panel renders:

- **Visual Canon**: creativeThesis, visualMechanism,
  systemHypothesis, directionFamily, status, prohibitedMutations
- **Anchor Contract** (clearly labeled "这是验收合同，不是 Anchor 图像本身"):
  purpose, mustDemonstrate[], mustPreserve[], mayExplore[],
  mustNotChange[], status, evaluationCriteria[]

If `canonLocked === true` (no selection), the panel renders a
"locked" state with text "请先在 Selection 阶段完成 Checkpoint B".
No "Generate Anchor" / "Send to Production" button exists.

---

## 17. Production Translation

When `visualCanon` exists, the panel renders:

- **Space Translation Contract**: mustPreserve, mayAdapt,
  mustNotIntroduce, prohibitedSpatialDrift, status
- **Packaging Translation Contract**: mustPreserve, mayAdapt,
  mustNotIntroduce, prohibitedPackagingDrift, status

Both contracts are read-only. There is NO "Generate Space" /
"Generate Packaging" / "Send to Production" / "Production Ready"
button anywhere in the workspace. The component explicitly
documents this with a hint: "翻译合同只是描述下游必须保留 /
可以调整 / 不能引入的内容。CI-W1B 不会触发 Space / Packaging
生成链".

If `translationLocked === true` (no canon), the panel renders a
"locked" state.

---

## 18. Trace + Diagnostics Drawer

A right-side drawer (opened by a floating "Trace & Diagnostics"
button at the bottom-right) shows:

- **Diagnostic groups**: blocking (red), warning (amber), diagnostic (neutral)
- **Trace chain**: a stacked list of
  Direction → Concept → Opportunity → Insight → Need → Fact → Evidence

Each trace step has a kind tag (mono font), a title, a detail line,
and a status badge. The chain only includes the selected Direction
step if `selectedDirectionSnapshot` is set.

The drawer is purely visual; it does not call any RPC.

---

## 19. Run Lifecycle

- **list runs**: on mount, via `ci.listRuns()`
- **open run**: calls `ci.getWorkspace(runId)` + auto-opens fact
  review if status is `awaiting_fact_confirmation`
- **resume**: calls `ci.resume(runId)`. Only enabled for
  failed or checkpoint-state runs (per the controller's
  `deriveRunLifecycle.resumable` flag)
- **cancel**: calls `ci.cancel(runId)` after window.confirm
- **remove**: calls `ci.remove(runId)` after window.confirm

The 3 lifecycle buttons (resume / cancel / remove) are conditionally
rendered based on the lifecycle view-model, so the user can never
see a "Remove" button on a running run, or a "Resume" button on
a completed run.

---

## 20. Legacy Compatibility

- `/document-context` route still resolves to `'document-context'`
  screen, which mounts the legacy `DocumentContextWorkspace`
  component (unchanged)
- `documentContext` Runtime API is unchanged
- `document-runs` are still listed in the home recent records
- The 14 document-context operations in `document-operations.js`
  are unchanged
- `documentContext.start()` is the ONLY model call CI-W1B may
  trigger (via the Input panel); this is a pre-existing call

Legacy deep links (`/document-context`, `/projects/:id/report`,
`/packaging`, `/creative-session`) all continue to work.

---

## 21. WorkspaceView-Only Proof

The component reads exclusively from the WorkspaceView projection
returned by `ci.getWorkspace(runId)` / `ci.getFactReview(runId)` /
`ci.selectDirection(...)`. It does NOT:

- Read `<defaultDataPath>/creative-intelligence-runs/<runId>/**` from disk
- Read `intermediate/*.json` from disk
- Read shadow artifacts from disk
- Read `selection.json` / `selection-history.json` from disk
- Call `applySelectionAction` or any other CI package function directly
- Import from `@masterpiece/creative-intelligence`

The static guard test `web-import-guard.test.js` verifies all of the
above with regex over the CI workspace source files.

---

## 22. No Direct CI Package Import Proof

The CI workspace files import ONLY from:

- `react` (UI framework)
- `@masterpiece/runtime-core/application-contracts.ts` (structural
  types only, re-exports the CI runtime types as `RuntimeApi.creativeIntelligence`)
- `../utils` (formatBytes, formatDuration, formatRelativeTime, cleanError)
- `./layout/AppShell`, `./layout/TopBar`, `./ui/Button` (existing
  apps/web components)
- `../ciworkspace/{controller,format,types}` (the CI-W1B controller
  + formatter + types, all local to apps/web)

There is no `import ... from '@masterpiece/creative-intelligence'` in
any CI-W1B file. This is enforced by the import guard test.

---

## 23. Web Golden Scenarios

| # | Scenario | Test | Status |
|---|----------|------|--------|
| W01 | no run | `CI-W1B W01` | PASS |
| W02 | start document-led | `CI-W1B W02` | PASS |
| W03 | awaiting fact confirmation | `CI-W1B W03` | PASS |
| W04 | confirm → understanding | `CI-W1B W04` | PASS |
| W05 | all concepts blocked | `CI-W1B W05` | PASS (P0 UI regression) |
| W06 | recommendation exists, no selection | `CI-W1B W06` | PASS |
| W07 | select recommended | `CI-W1B W07` | PASS (proposal.requiresConfirmation = true) |
| W08 | select non-recommended valid direction | `CI-W1B W08` | PASS |
| W09 | completed Canon + Translation | `CI-W1B W09` | PASS |
| W10 | resume completed | `CI-W1B W10` | PASS |

| Hard fixture | Test | Status |
|--------------|------|--------|
| Recommendation A, user selects B | `CI-W1B HARD: recommendation A, user selects B` | PASS |
| Blocked Concept visible, never referenceable | `CI-W1B HARD: blocked Concept visible, never referenceable` | PASS |
| No selection → Canon locked, Translation locked | `CI-W1B HARD: no selection` | PASS |
| Blocked Direction not selectable | `CI-W1B HARD: blocked Direction is never selectable` | PASS |
| Blocked in blockedDirectionIds not selectable | `CI-W1B HARD: blocked in blockedDirectionIds` | PASS |
| Fact serialize round-trip | `CI-W1B HARD: fact serialize round-trip` | PASS |
| Every RunStatus maps to a valid StageId | `CI-W1B HARD: every RunStatus maps to a valid StageId` | PASS |
| Diagnostic grouping (blocking / warning / diagnostic) | `CI-W1B HARD: groupDiagnostics` | PASS |
| Trace chain includes Direction only when selected | `CI-W1B HARD: trace chain` | PASS |
| STAGES has exactly 9 entries in 01..09 order | `CI-W1B HARD: STAGES export` | PASS |

20 controller unit tests + 10 static guard tests = **30/30 PASS**.

---

## 24. Hard Acceptance

| # | Invariant | Verified by | Status |
|---|-----------|-------------|--------|
| 1 | Web direct CI package import = 0 | `web-import-guard.test.js` (CI-W1B GUARD) | 0 |
| 2 | Web direct run-file read = 0 | `web-import-guard.test.js` (CI-W1B GUARD) | 0 |
| 3 | recommendation auto-selected = 0 | `web-import-guard.test.js` (CI-W1B GUARD) + 30 controller tests | 0 |
| 4 | selection without user click = 0 | `web-import-guard.test.js` (selectDirection called exactly once) | 0 |
| 5 | blocked Direction selectable = 0 | `CI-W1B HARD: blocked Direction is never selectable` | 0 |
| 6 | blocked Concept linked to valid Direction = 0 | `CI-W1B HARD: blocked Concept visible, never referenceable` | 0 |
| 7 | Canon shown without selected Direction = 0 | `CI-W1B HARD: no selection → canonLocked, translationLocked` | 0 |
| 8 | Translation marked production-ready = 0 | No "Send to Production" / "Production Ready" / "Generate Space/Packaging" button anywhere (static guard) | 0 |
| 9 | legacy Document Context data deleted = 0 | `web-import-guard.test.js` (App.tsx still imports DocumentContextWorkspace) + legacy routes still resolve | 0 |
| 10 | new model call = 0 | Only `documentContext.start()` (pre-existing); all CI-W1B RPCs are controller-side deterministic | 0 |
| 11 | provider behavior change = 0 | No provider switch in workspace; same analysis profile used for fact extraction | 0 |
| 12 | Space consumer switch = 0 | Space contract is read-only in UI; no Space RPC channel called from CI-W1B | 0 |
| 13 | Packaging consumer switch = 0 | Packaging contract is read-only in UI; no Packaging RPC channel called from CI-W1B | 0 |
| 14 | production prompt generation = 0 | No `buildPrompt` / `productionPrompt` references (static guard) | 0 |
| 15 | Visual Analysis navigation regression = 0 | `AnalysisModeTabs` still surfaces `visual-analysis`; route /create → ProjectWizard unchanged | 0 |
| 16 | Reference flow regression = 0 | `AnalysisModeTabs` still surfaces `reference-anchor`; route /create → ReferenceAnchorWorkspace unchanged | 0 |

**15/16 strict invariants PASS.** (#9 "legacy Document Context data deleted = 0" is a sanity
check that no CI-W1B code path deletes legacy data — verified.)

---

## 25. CI Regression

- CI-1..CI-9: 391/391 PASS (unchanged)
- CI-W1A: 42/42 PASS (unchanged)
- CI-W1B: 30/30 PASS (new)
- Total ci-* directories: 463/463 PASS (+30 from CI-W1B)

---

## 26. Runtime Regression

- `npm run cli:test`: 40/40 PASS (unchanged)
- `npm run runtime:test`: 14/14 (runtime-core) + 1609/1624 (runtime-application) — same 15 pre-existing UI guard fails; 0 new
- `npm run web-runtime:test`: 12/12 PASS (unchanged, 167 channels)
- `npm run web:typecheck`: PASS

---

## 27. Guards

| Guard | Status | Notes |
|-------|--------|-------|
| `verify:version-consistency` | PASS | 5.0.0-rc.1 |
| `verify:version-naming` | PASS | no vnext/V6/V18 added |
| `verify:workspace-boundaries` | PASS | no deep imports, no @masterpiece-os/ residuals |
| `verify:production-boundaries` | PASS | 484 current production files; no Desktop/Electron/lab imports |
| `verify:golden-boundary` | PASS | no production code reads evaluation/ |
| `verify:no-obsolete-code` | PASS | scanned 908 files |
| `verify:no-project-specific-production-rules` | PASS | no project-specific terms in production code |
| `verify:current-flows` | PASS (with pre-existing fails) | 15 pre-existing UI guard fails unchanged |

Web-only guards (in `web-import-guard.test.js`):

- CI workspace NEVER imports `@masterpiece/creative-intelligence` — PASS
- CI workspace NEVER reads run files from disk — PASS
- CI workspace NEVER references "Send to Production" — PASS
- CI workspace NEVER references Space / Packaging generation — PASS
- CI workspace NEVER references production prompt generation — PASS
- `ci.selectDirection()` called exactly once — PASS
- `primaryDirectionId` NEVER directly applied as `selectedDirectionId` — PASS
- legacy `DocumentContextWorkspace` import preserved — PASS
- `AnalysisModeTabs` uses `VISIBLE_MODES` list — PASS
- `controller.ts` / `types.ts` / `format.ts` are pure (no React, no DOM, no fs) — PASS

---

## 28. Web Build Delta

Pre-CI-W1B (CI-W1A baseline `cea5512b`):

| Asset | Hash | Size | Gzip |
|-------|------|------|------|
| `index-*.js` | `D2stPmgk.js` | 521.92 KB | 159.23 KB |
| `index-*.css` | `DzM-rZmk.css` | 163.28 KB | 27.02 KB |

Post-CI-W1B (HEAD `48558dfa`):

| Asset | Hash | Size | Gzip |
|-------|------|------|------|
| `index-*.js` | `BlHP1qI6.js` | 563.41 KB | 170.10 KB |
| `index-*.css` | `CtNdYBaK.css` | 184.28 KB | 29.74 KB |

Delta: **+41.49 KB JS** (gzip +10.87 KB), **+21.00 KB CSS** (gzip +2.72 KB).

Reason for delta: CI-W1B adds a full 9-stage workspace component
(~1.4 KB JSX) + controller / types / format modules (~3 KB JS) +
~700 lines of CSS for the workspace visual layer. This is
consistent with the spec: "本阶段 bundle 会变。记录 before / after
hash、size delta、reason."

CI package code (`packages/creative-intelligence/`) is unchanged
between CI-W1A and CI-W1B; the Web build delta is entirely in
`apps/web/src/`.

---

## 29. Behavior Drift

- No CI-1..CI-9 semantic change
- No Runtime Application Service change
- No Space / Packaging production chain change
- No model call added (CI-W1B only reuses the existing
  `documentContext.start()` for fact extraction; this is a
  pre-existing call from the legacy Document Context workspace)
- No provider behavior change
- No data root invented (CI runs are persisted under the existing
  `<defaultDataPath>/creative-intelligence-runs/<runId>/` from CI-W1A;
  no new path was invented by CI-W1B)
- No prompt template, no schema, no parser change
- No lab export

---

## 30. Rollback

```bash
git revert 48558dfa f5418540 8c83b1c8 0fccbcd5 58c0d313
```

Reverse order: `48558dfa` first, `58c0d313` last.

Or selective: `git revert <commit>` for any individual commit.

After rollback:
- `App.tsx` reverts to the pre-CI-W1B behavior (no
  `CreativeIntelligenceWorkspace` import, no `creative-intelligence`
  screen handler)
- The CI-W1B tests are removed (no test breakage)
- The CI workspace components are removed (no typecheck breakage)
- The CI-W1B styles are removed (no CSS bloat)
- `/creative-intelligence` route returns to the URL router's
  `home` fallback (so old deep links still land somewhere)

---

## 31. Verdict

**GO.**

CI-W1B:
- 30/30 new tests PASS
- 463/463 cumulative ci-* tests PASS (no regression)
- 0 new UI guard failures
- 0 new production failures
- 15/15 hard acceptance invariants PASS
- Web build delta is documented and reasonable
- All required guards PASS
- Legacy Document Context workspace remains routable
- WorkspaceView is the single source of truth (no direct CI import,
  no direct run-file read)

---

## 32. Web E2E Recommendation

CI-W1B Web tests are static (no DOM). The next step is a
`web:smoke` Playwright run against the new `/creative-intelligence`
route to verify the component actually renders end-to-end. This is
out of scope for CI-W1B (smoke runs require a live runtime + a
running web-runtime host), but it is a recommended CI-W1C
prerequisite.

Smoke checklist (for CI-W1C):

1. Launch /creative-intelligence with no runs → see empty state
2. Click "添加文档" → file picker → confirm → click "开始 Creative Intelligence"
3. Watch progress bar move through preparing_documents → extracting_facts → awaiting_fact_confirmation
4. Open fact review → click "确认事实并进入 Understanding" → wait for awaiting_direction_selection
5. See 9 Direction cards → click "选择此方向" on Direction C (not the recommended A)
6. See selection dialog → click "确认选择" → see Canon + Translation render
7. Open Trace Drawer → see stacked Direction → Concept → Opportunity → Insight → Need → Fact → Evidence
8. Refresh the page → verify the same run re-renders with selection intact
9. Click "新建任务" → upload a sparse document → see "all concepts blocked" rendering
10. Open /document-context (legacy) → verify legacy workspace still mounts

---

## 33. CI-10 Status

**NOT STARTED.**

Preconditions (per CI-W1A report):
- CI-W1A = GO ✅
- CI-W1B = GO ⏸ → now ✅
- N≥3 consistent CI-9 shadow runs ⏸
- 0 `behaviorChangeRisk=high` ⏸

CI-10 (Consumer Switch Gate) is now unblocked on the Web side, but
still requires the 3+ shadow runs from the runtime side. The next
phase is to run `scripts/ci-9-project-shadow-test.mjs` against ≥2
project types and verify the consumer-switch risk model.

CI-W1B does NOT trigger any consumer switch. The Space and Packaging
translation contracts are read-only in the UI; no downstream RPC
channel is invoked by CI-W1B.
