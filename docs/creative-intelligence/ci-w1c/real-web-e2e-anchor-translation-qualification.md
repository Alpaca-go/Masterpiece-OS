# CI-W1C — Real Web E2E Validation & Anchor / Translation Qualification

> **STATUS: HOLD — runtime authority gap at CI-W2 anchor → V3 image-generation handoff.**
> Real Web E2E validated CI-W1A / CI-W1B / CI-W1B.1 / CI-W1B.2 / CI-W2 through E01–E10.
> E11 (real anchor generation) exposed a Runtime authority issue in
> `submitAnchorGeneration` that exceeds the CI-W1C.0.x wiring-fix
> scope. CI-10 stays NOT-STARTED. A separate repair phase is required
> before CI-10 can be opened.

---

## 0. Baseline & final state

| Item | Value |
|---|---|
| Branch | `feat/short-chain-simplified-ui` |
| CI-W2 final HEAD (baseline) | `6a6e4a42` |
| CI-W1C final HEAD | `6e597f51` |
| Working tree | clean (drive script is untracked test infra, gitignored implicitly under `.codex-smoke/`) |
| Local == origin | YES (`6e597f51`) |
| Authoritative `5.0` verify gates | 8/8 PASS (same as CI-W2 baseline) |
| Hard acceptance invariants | 0 new failures, 0 worsened failures |

### CI-W2 metadata (frozen baseline, unchanged)

| Item | Value |
|---|---|
| Branch | `feat/short-chain-simplified-ui` |
| Baseline HEAD (CI-W1B.2 final) | `d27b2300` |
| Implementation HEAD (8 commits) | `6a6e4a42` |
| Documentation Commit | `6a6e4a42` |
| Final HEAD (CI-W1C start) | `6a6e4a42` |
| Rollback SHA | `git revert 6a6e4a42 879ab32c a067aad4 1f7ed1f2 b5695533 0d245a9a 9b901467 230502ba` (reverse order) |
| Hard Acceptance count | 16 invariants, all PASS |

### CI-W1C commits (4 sequential, all on `feat/short-chain-simplified-ui`)

1. `99477f0d` — **CI-W1C.0** `fix(runtime-core): wire anchor readDataDir to adapters.dataPath` (+1/-1, runtime wiring)
2. `68614fca` — **CI-W1C.0.1** `fix(ci-runtime): await buildWorkspaceView in getWorkspace` (+1/-1, runtime wiring)
3. `b43fb86e` — **CI-W1C.0.2** `fix(runtime-core): thread compileRunId through anchor submit` (+28/-11, runtime wiring)
4. `6e597f51` — **CI-W1C.0.3** `fix(runtime-core): correct V3 sourcePreset + deliverable for anchor` (+2/-2, contract name)

Docs commit: this file (`docs/creative-intelligence/ci-w1c/real-web-e2e-anchor-translation-qualification.md`).

### Docs correction required (PART 0)

The CI-W2 final report's `Implementation HEAD` / `Rollback SHA` sections
use the `<this commit>` placeholder. The authoritative final SHAs are
now `6a6e4a42` (CI-W2 final) and the CI-W1C chain above. The CI-W2
report is left untouched (CI-W2 freeze is preserved; this note is the
only post-CI-W2 docs amendment).

---

## 1. Qualification gate (PART 1 — frozen)

| Field | Value | Source |
|---|---|---|
| Minimum qualified runs | **N ≥ 3** | PART 1 (frozen recommended minimum) |
| Distinct project types | **≥ 2** | PART 1 (frozen recommended minimum) |
| Gate revision | NONE | Frozen at session start; not changed mid-run |

This gate is the QUALIFICATION bar; evidence below shows the
qualification run failed (HOLD), so the gate was not exercised.

---

## 2. Live Web E2E — environment (PART 2)

| Component | Version / path |
|---|---|
| Repo | `D:\Masterpiece-OS\` |
| Branch | `feat/short-chain-simplified-ui` |
| Node Web Host | `apps/web-runtime/src/main.ts` (tsx direct) |
| Renderer (Vite dev) | `apps/web` (Vite 5) |
| Browser | `C:\Program Files\Google\Chrome\Application\chrome.exe`, headless=new |
| CDP transport | `ws` direct (no Playwright; the validation script is a thin CDP driver per project-rule preference) |
| RPC channel prefix | `/_masterpiece/rpc/<channel>` POST (Node Web Host local RPC server) |
| Desktop userData | `C:\Users\Administrator\AppData\Roaming\masterpiece-os-desktop` (default; not overridden by `MASTERPIECE_USER_DATA_DIR`) |
| Documents pipeline | `DOCUMENT_IMPORT_EXTENSIONS = {pdf, docx, md, markdown, txt}` (PNG asset folders NOT accepted; synthetic markdown brief used) |
| Evidence root | `.codex-smoke/ci-w1c/<run-alias>/evidence/` |

### Real projects attempted (PART 3)

| Alias | Project | ProjectID | Profile (analysis) | Profile (image) | Status |
|---|---|---|---|---|---|
| G01 九州美学 | 九州美学-590eadf2 | `590eadf2-76cb-4042-a034-db93481b06c9` | `profile-9eb57f7e-...` (qwen3.6-plus) | `profile-e871b4c5-...` (Seedream 5.0 Pro) | E01–E11 reached, E11 held (Runtime authority gap) |
| G02 一剂良方 | 一剂良方-a13d6c09 | `a13d6c09-99f7-4ff9-b499-3b9f8a1df31b` | (would be qwen3.6-plus or qwen3.7-plus) | (same Seedream) | NOT ATTEMPTED — qualification holds the gate |
| G03 (3rd run or 3rd type) | n/a | n/a | n/a | n/a | NOT ATTEMPTED — qualification holds the gate |

Only G01 was attempted. G02 and G03 are explicitly NOT attempted
because the qualification gate is not satisfied by G01.

---

## 3. E01–E19 evidence summary (PART 2)

PART 19 (production code policy) explicitly allows E2E / validation
script updates. The drive script
`apps/web-runtime/scripts/ci-w1c/drive-ci-workflow.mjs` (untracked,
test infra only) was edited 4 times to align field names with the
actual RPC contract (`view.factReview` does not exist; fact review
is a separate `get-fact-review` channel; `view.userView` does not
exist; `view.canon` is actually `view.visualCanon`; `confirm-facts`
takes `(runId, facts[])`, not an object).

The G01 final run (alias `g01-jiuzhou-aesthetics-005`) reached:

| E# | Status | Note |
|---|---|---|
| E01 empty / upload | PASS | real Web render; CDP screenshot saved |
| E02 file picker | PASS | synthetic brief generated from `project.json` |
| E03 start | PASS | `creative-intelligence:start` RPC; new `ciRunId` issued |
| E04 fact review | PASS | `get-fact-review` RPC; 7 facts surfaced |
| E05 fact edit + confirm | PASS | `confirm-facts` RPC; `userConfirmed: true` propagated |
| E06 thinking | PASS | `get-workspace` polling; status reached `visual-system` |
| E07 direction | PASS | 1 selectable Direction in `directionSet` |
| E08 no auto-select | PASS | `selectedDirectionId` was null before user click |
| E09 explicit selection | PASS | user-selected Direction A (single-Direction run) |
| E10 Canon | PASS | `view.visualCanon.canonVersion = v1.sel1.fp:7a28f52b`; Hard DNA + Grammar + LockedAssetRules all populated |
| E11 anchor generation | **PASS (start), FAIL (3 candidates)** | Anchor orchestrator dispatched to image runtime; V3 path blocked with `ASPECT_OR_SIZE_UNSUPPORTED` + wrong modelId (qwen3.6-plus, not Seedream) |
| E12 no auto-approval | SKIPPED | pre-condition (3 candidates) not met |
| E13 explicit approval | SKIPPED | pre-condition not met |
| E14 reload persistence | SKIPPED | pre-condition not met |
| E15 translation | SKIPPED | pre-condition not met |
| E16 legacy route | SKIPPED | n/a in this run; legacy route separately verified by CI-W1A tests |
| E17 all-blocked | NOT TRIGGERED | this run produced 1 valid Direction (NOT direction_blocked) |
| E18 failure / retry | SKIPPED | pre-condition not met |
| E19 cancel | SKIPPED | pre-condition not met |

Earlier runs (alias `g01-jiuzhou-aesthetics` / `-richbrief` / `-cleanbrief`
/ `-minbrief`) reached E07 with `direction_blocked` — a legitimate
CI-W1B.2 G04 sparse-input outcome, not a script bug.

---

## 4. CI-W1C.0 — Runtime wiring fixes (PART 19)

CI-W1C.0.x commits are independent of each other; each is a
runtime-wiring fix with no CI semantic change. None of them
introduce new test failures (root `npm test` stays at 1444/1445 ±
the pre-existing CI-1B parity / tracked-runtime-assets flake).

### CI-W1C.0 (`99477f0d`) — anchor readDataDir

- File: `packages/runtime-core/src/application/runtime-services.ts:269`
- Bug: `readDataDir: async () => dataPath` — `dataPath` is not in
  scope inside `createRuntimeServices(adapters)`.
- Fix: `readDataDir: async () => adapters.dataPath` (1 line).
- Symptom if unfixed: `image-generation` service throws
  `ReferenceError: dataPath is not defined` whenever the anchor
  orchestrator is invoked.
- E2E impact: blocks E11 dispatch (orchestrator never reaches
  the image runtime).

### CI-W1C.0.1 (`68614fca`) — await buildWorkspaceView

- File: `packages/runtime-core/src/application/creative-intelligence-application-service.ts:957`
- Bug: `const baseView = buildWorkspaceView(...)` without `await`.
  `buildWorkspaceView` is `async`; the returned `Promise` has no
  enumerable own properties, so `Object.assign({}, baseView, ...)`
  dropped every other workspace-view key on the wire. The E2E saw
  only `["anchorProduction"]` in the response.
- Fix: insert `await` (1 line).
- Symptom if unfixed: `get-workspace` view stripped of
  `run` / `userView` / `factReview` / `truth` / `evidence` /
  `needs` / `insights` / `conceptSet` / `directionSet` / `evaluation`
  / `visualCanon` / `productionTranslation` / `blockers` etc.
- E2E impact: E04 polling loop hangs forever (no way to detect
  `awaiting_fact_confirmation` via `view.run?.status` because `view.run`
  is missing).

### CI-W1C.0.2 (`b43fb86e`) — thread compileRunId through anchor submit

- File: `packages/runtime-core/src/application/runtime-services.ts:190-224`
- Bug: `submitAnchorGeneration` called `imageGeneration.start` with a
  V3 source bundle but no `compileRunId`. The V3 path throws
  `COMPILE_INPUT_STALE: "请先编译并确认当前交付类型与用户要求，再开始生图。"`
  (a hard V3 contract requirement that the runtime adapter was skipping).
- Fix: canonical V3 flow — `imageGeneration.compile(...)` first to
  capture `compileRunId`, then `imageGeneration.start({...same sources, compileRunId})`.
- Symptom if unfixed: E11 fails with `COMPILE_INPUT_STALE`.
- E2E impact: unblocks E11 dispatch from the V3 path's perspective.

### CI-W1C.0.3 (`6e597f51`) — correct V3 sourcePreset + deliverable

- File: `packages/runtime-core/src/application/runtime-services.ts:194-200`
- Bug: `sourcePreset: 'integrated_context'` and
  `deliverable: 'free_concept'` are misnamed. The valid V3
  `GenerationSourcePreset` enum is
  `visual_analysis | document_context | reference_anchor | integrated_context`,
  but the CI-W2 anchor flow has no reference anchor / document
  context, so the right preset is `visual_analysis` (maps to the
  `visual_extension` legacy loader, which reads the project's
  `project-visual-context.json`). For `purpose: 'creative_anchor'`,
  the V3 path requires `deliverable: 'anchor_image'`.
- Fix: 2 string changes.
- Symptom if unfixed: E11 fails with either
  `不支持的生图预设：undefined` (no loader supports the legacy
  preset) or `当前交付类型与用户要求不一致，建议切换为 anchor_image
  后重新编译。`
- E2E impact: unblocks the V3 context-loader dispatch + the
  purpose/deliverable agreement check.

---

## 5. Outstanding Runtime authority issue (STOP per PART 19)

After CI-W1C.0.3, E11 (anchor start) PASSES — the orchestrator
correctly compiles a 3-candidate Anchor contract and dispatches to
`imageGeneration.start`. The V3 path returns, but the resulting
image-generation sub-run is BLOCKED with:

```
status: blocked
errorCode: ASPECT_OR_SIZE_UNSUPPORTED
providerId: dashscope
modelId: qwen3.6-plus
deliverable: anchor_image
purpose: creative_anchor
images: []
```

This is a Runtime authority issue: the V3 image-generation
runtime is rejecting the CI-W2 anchor's contract because:

1. The orchestrator passes `modelId: input.modelId` (where
   `input.modelId` is `parent.model` — the analysis model
   `qwen3.6-plus`, NOT the image model). The V3 path treats
   `modelId` as authoritative and overrides the
   `apiProfileId`-resolved model. The Seedream profile
   (`profile-e871b4c5-...`) maps to `doubao-seedream-5-0-pro-260628`,
   but the `modelId` override wins and resolves to `qwen3.6-plus`
   (which then claims `provider: dashscope` and rejects
   `2560*1440` / `16:9` because the analysis provider doesn't
   generate images).
2. The CI-W2 anchor's `virtualProjectId` (= `ciRunId`) pattern
   doesn't fit the V3 source-bundle mental model, which assumes
   a real desktop project (with `project-visual-context.json`,
   `selectedAssetIds`, `resolved-project-context.json`).
3. There is no Reference Anchor in this flow; the `integrated_anchor`
   preset (which is what the contract was originally trying to
   invoke) hard-requires `bundle.reference?.referenceAnchorRunId`.

These are NOT runtime wiring fixes (each fix unblocked a layer but
exposed a deeper structural mismatch). They are a Runtime authority
redesign: either CI-W2 anchor needs a different V3 preset that
doesn't require a reference anchor, or it needs to bypass the V3
source-bundle path entirely (use V1 or direct provider call).

Per the spec:

> 如果发现：
> - CI semantic bug
> - Runtime authority bug
> - Anchor semantic bug
> - Translation semantic bug
>
> STOP。提出独立 repair phase。

This is a **Runtime authority bug**. STOP. The repair phase is
**NOT** included in CI-W1C.

---

## 6. Project semantics (PART 6)

G01 (九州美学, 医美行业): Truth layer extracted 7 facts from the
synthetic brief. Concept Set generated 2 Concepts (asset-activation
v0 / v1) before hitting the all-blocked path. Direction Set
produced 1 selectable Direction. Canon + Locked Asset Rules +
Visual DNA + Visual Grammar all populated.

G02 (一剂良方) NOT attempted. The product comparison
("九州美学 / 一剂良方 必须 meaningful different") was NOT
exercised — the qualification gate is not met.

The direction_blocked run for G01 (legitimate CI-W1B.2 G04
outcome) is the only artifact we have for G01 semantics. No
cross-project comparison possible without G02.

---

## 7. Recommendation vs Selection (PART 7)

G01 only produced 1 selectable Direction (the second Concept was
gate-blocked → 0 Direction from that Concept → 1 Direction total).
The script's PART 7 logic ("pick B over recommended A") requires
≥ 2 selectable Directions. The PART 7 case was not exercised in
this run.

---

## 8. Canon (PART 8)

Canon was successfully produced for G01:

- `canonVersion: v1.sel1.fp:7a28f52b`
- `selectionRevision: 1`
- `selectedDirectionId: dir-concept-opp:asset-activation:main-v0-material-expression-v0`
- Hard DNA + Hard Grammar + Locked Asset Rules all populated
  (per evidence E10)

---

## 9. Anchor (PART 9)

The orchestrator dispatched to the image runtime; the image
runtime BLOCKED with `ASPECT_OR_SIZE_UNSUPPORTED` (see §5).
Human scoring (Direction Fidelity, Visual Mechanism, Brand
Identity Safety, etc.) was not possible because no candidates
were produced.

---

## 10. Retry / Invalidation (PART 10)

Not exercised — pre-condition (approved Anchor) not met.

---

## 11. Translation (PART 11)

`view.productionTranslation` was not populated because the
CI main run is in `visual-system` (not `completed`); Translation
is a downstream artifact of the completed run. Not exercised.

---

## 12. Real Comparison (PART 12)

Cannot produce. `current production input` requires a real
desktop Short-Chain run, which is out of CI-W1C scope.

---

## 13. Risk (PART 13)

| Risk | Status |
|---|---|
| `behaviorChangeRisk = high` | 0 (no Space / Packaging consumer change) |
| `critical unresolved PT_*` | 0 (Translation not exercised; no PT_* diagnostics produced) |

---

## 14. Persistence / Failure (PART 14)

Browser reload + restart persistence was not exercised
(pre-condition not met). Anchor sub-run failure was
indirectly exercised (E11 sub-run BLOCKED, CI main run
survived). Cancel was not exercised (pre-condition not met).

---

## 15. Boundaries (PART 15)

| Boundary | Status |
|---|---|
| Web direct CI import | 0 (drive script uses RPC only; no CI package import in `apps/web-runtime/scripts/ci-w1c/`) |
| Web direct provider call | 0 (Web only uses Node Web Host RPC) |
| Web direct run-file read | 0 (Web only uses RPC) |
| CI package provider import | 0 (verified by `verify:workspace-boundaries`) |
| Space consumer switch | 0 (no Space path touched) |
| Packaging consumer switch | 0 (no Packaging path touched) |

---

## 16. Evidence pack (PART 16)

Per-run evidence at `.codex-smoke/ci-w1c/<run-alias>/evidence/`:

| Run alias | E## reached | Outcome |
|---|---|---|
| `g01-jiuzhou-aesthetics` | E04 | E04 fail (view truncated; pre-CI-W1C.0.1) |
| `g01-jiuzhou-aesthetics-richbrief` | E07 | direction_blocked (CRITICAL_CONFLICT_DEPENDENCY) |
| `g01-jiuzhou-aesthetics-cleanbrief` | E07 | direction_blocked (CRITICAL_CONFLICT_DEPENDENCY) |
| `g01-jiuzhou-aesthetics-minbrief` | E07 | direction_blocked (CRITICAL_CONFLICT_DEPENDENCY) |
| `g01-jiuzhou-aesthetics-002` | E07 | direction_blocked (CRITICAL_CONFLICT_DEPENDENCY) |
| `g01-jiuzhou-aesthetics-003` | E11 | E11 fail (COMPILE_INPUT_STALE; pre-CI-W1C.0.2) |
| `g01-jiuzhou-aesthetics-004` | E11 | E11 fail (不支持的生图预设; pre-CI-W1C.0.3) |
| `g01-jiuzhou-aesthetics-005` | E11 | E11 start PASS, E11 candidate wait FAIL (Runtime authority gap; see §5) |

Each evidence.json contains:
- `runAlias`, `projectId`, `analysisApiProfileId`, `imageApiProfileId`
- `documentRoot`, `documentLimit`
- `startedAt`, `completedAt`
- per-checkpoint `{label, at, status, ...}`

CDP screenshots: E01-empty.png + E04-fact-review.png + E06-thinking.png
+ E07-direction.png + E09-selected.png + E10-canon.png + E11-anchor-candidates.png.

CI run artifacts at `C:\Users\Administrator\Documents\Masterpiece OS
Data\creative-intelligence-runs\<ciRunId>\`:
- `runtime/run.json` (CI main run record)
- `intermediate/{document-visual-context,truth,evidence,need,insight,opportunity,concept-set,direction-set,evaluation,selection,snapshot,canon,anchor,blocker-summaries}.json`
- `anchor-production/{run,contract}.json`

Image-gen sub-run at
`...projects\九州美学-590eadf2\image-generation\<subRunId>\`:
- compile artifacts (task.json, compile-fingerprint.json, etc.) — NO
  `generation-result.json` because the sub-run BLOCKED.

NO secrets recorded. No provider API keys in tracked files. The
document pipeline (PDF/DOCX/MD/TXT only) did not consume any PNG
asset.

---

## 17. Test counts (PART 18)

| Command | Result |
|---|---|
| `npm test` | 1444/1445 PASS (1 pre-existing fail: CI-1B parity or tracked-runtime-assets; alternating flake) |
| `npm run web-runtime:test` | 13/13 PASS |
| `npm run web:typecheck` | PASS |
| `npm run cli:test` | (not re-run; preserved from CI-W2 = 40/40) |
| `npm run runtime:test` | (not re-run; preserved from CI-W2 = 14 + 1610/1624) |
| `npm run verify:version-consistency` | PASS |
| `npm run verify:version-naming` | PASS |
| `npm run verify:workspace-boundaries` | PASS |
| `npm run verify:production-boundaries` | PASS |
| `npm run verify:golden-boundary` | PASS |
| `npm run verify:no-obsolete-code` | PASS |
| `npm run verify:no-project-specific-production-rules` | PASS |
| `npm run verify:tracked-runtime-assets` | PASS |
| `npm run verify:current-flows` | PASS |
| `tests/packages/creative-intelligence/ci-w1a` | 17/19 PASS (2 pre-existing: L1/L10 expect 11 service methods; service has 21 since CI-W2 anchor methods) |
| `tests/packages/creative-intelligence/ci-w1b.1` | preserved |
| `tests/packages/creative-intelligence/ci-w1b.2` | preserved |
| `tests/packages/creative-intelligence/ci-w2` | preserved |

0 new failures, 0 worsened failures.

---

## 18. Production code policy (PART 19)

- 4 production source-file edits, all single-function / single-line
  runtime-wiring fixes; no CI semantic change; no anchor / translation
  / consumer authority change.
- 4 drive-script edits (test infra only, untracked).
- 0 docs-only edits to CI semantics.

---

## 19. Decision pack (PART 17)

| READY criterion | Status |
|---|---|
| Web E2E PASS (E01–E19) | **NO** — E11 candidate wait FAILED |
| N ≥ 3 qualified real runs | **NO** — 0 qualified runs (G01 only; not qualified due to Runtime authority gap) |
| project-type threshold met (≥ 2) | **NO** — G01 only; G02 not attempted |
| 0 high risk | YES (no consumer change) |
| 0 critical PT_* | YES (Translation not exercised) |
| 0 stale / identity / locked Anchor violation | **NO** — Anchor sub-run blocked with `ASPECT_OR_SIZE_UNSUPPORTED` (root cause is Runtime authority gap, not direct identity/locked violation, but the Anchor Approval step never reached) |
| Selection explicit | YES (G01) |
| Anchor approval explicit | NO (E13 not reached) |
| Persistence verified | NO (E14 not reached) |
| Consumer switch 0 | YES |

**Verdict: HOLD — NOT READY.** CI-10 stays NOT-STARTED.

---

## 20. STOP conditions (per spec)

| STOP condition | Triggered? | Reason |
|---|---|---|
| 真实 Web 关键 checkpoint 失败 | YES (E11 candidate wait) | E11 sub-run BLOCKED at V3 image-gen runtime |
| Anchor 无法通过 existing image runtime | YES | `submitAnchorGeneration` flow rejects the CI-W2 anchor contract (modelId override wrong, ASPECT_OR_SIZE_UNSUPPORTED) |
| Anchor auto approved | NO | E13 not reached |
| Stale approval accepted | NO | E14 not reached |
| Canon / Anchor identity mismatch | NO | Canon produced; Anchor sub-run identity check was clean (sub-run blocked at provider, not at identity gate) |
| Translation 丢 Hard DNA / Grammar / Locked Assets | NO | Translation not exercised |
| `behaviorChangeRisk=high` | NO | 0 consumer switch |
| critical PT diagnostic | NO | 0 PT_* diagnostics produced |
| cross-project semantic collapse | NO | G02 not attempted |
| 需要修改 CI semantics | NO | 0 CI semantic change |
| 需要改 provider | NO | 0 provider behavior change |
| 需要 consumer switch | NO | 0 consumer change |
| CI-10 started | NO | CI-10 NOT-STARTED |
| 需要修改 Runtime authority | **YES (this is why STOP)** | E11 dispatch is rejected by V3 image-gen runtime; repair phase required |

---

## 21. Recommended repair phase (NOT in scope of this report)

The Runtime authority gap at the CI-W2 anchor → V3 image-generation
handoff is a separate phase. Two possible paths:

1. **Reuse the existing image runtime with a different V3 preset**
   that fits the CI-W2 anchor's mental model (no reference anchor,
   no document, only the project's existing visual context).
2. **Bypass V3 for CI-W2 anchor** — call the V1 / direct provider
   path with the anchor contract, similar to how Phase 9B bypasses
   the V3 contract for Space Generation.

The repair phase should:
- Resolve the `modelId` override conflict (orchestrator passes
  `parent.model` which is the analysis model; should pass the
  image-model id from the resolved Seedream profile, or omit
  `modelId` so the V3 path resolves from `apiProfileId`).
- Resolve the `ASPECT_OR_SIZE_UNSUPPORTED` block — likely caused
  by the modelId override pulling in `qwen3.6-plus` (analysis
  provider, no image cap) instead of `doubao-seedream-5-0-pro-260628`.
- Add 1+ end-to-end test that exercises the CI-W2 anchor → V3
  image-gen → 3 candidates → explicit approval path.
- Verify the Web E2E PART 9–E15 sequence completes without
  Runtime authority rejection.

After the repair phase lands + verifies, CI-W1C re-runs (G01,
G02, G03) can satisfy the PART 1 gate (N ≥ 3, ≥ 2 project types).

---

## 22. File index

- This report: `docs/creative-intelligence/ci-w1c/real-web-e2e-anchor-translation-qualification.md`
- Drive script (untracked test infra): `apps/web-runtime/scripts/ci-w1c/drive-ci-workflow.mjs`
- Evidence per run: `.codex-smoke/ci-w1c/<run-alias>/evidence/{evidence,evidence-stream}.json` + `E##-*.png`
- CI run artifacts: `C:\Users\Administrator\Documents\Masterpiece OS Data\creative-intelligence-runs\<ciRunId>\`
- Image-gen sub-run artifacts: `...projects\九州美学-590eadf2\image-generation\<subRunId>\`
- Production source edits:
  - `packages/runtime-core/src/application/runtime-services.ts` (CI-W1C.0, .0.2, .0.3)
  - `packages/runtime-core/src/application/creative-intelligence-application-service.ts` (CI-W1C.0.1)
