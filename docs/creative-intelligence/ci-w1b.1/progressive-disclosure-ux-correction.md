# CI-W1B.1 — Progressive Disclosure UX Correction & Input Interaction Repair

> **Status:** GO  
> **Date:** 2026-08-17  
> **Branch:** `feat/short-chain-simplified-ui`  
> **Baseline:** CI-W1B = GO  
> **Baseline HEAD:** `b5cdc1ea`  
> **Implementation HEAD:** `d4da1901`  
> **Documentation Commit:** `ff5d1c8b`  
> **Scope:** Web UX correction only  
> **Runtime / CI Semantic Change:** NONE  
> **CI-10:** NOT STARTED  
> **Next Unlock:** CI-W1C — Real Web E2E Validation & CI-9 Translation Qualification

---

## 0. Commits

The seven suggested commit messages were consolidated into four
semantic commits because the component surface was delivered as one
progressive-disclosure rewrite (Parts A + D–I live in the same file and
cannot be split without breaking the typecheck at intermediate
commits):

| # | Commit | Subject |
|---|---|---|
| 1 | `3d22c809` | refactor(web): replace CI stage rail with progressive user views (user view projection + fact grouping in `ciworkspace`; internal mapping retained) |
| 2 | `f351b85f` | fix(web): repair creative intelligence document picker interaction (P0 upload repair + input/fact-review/thinking/direction-decision/visual-system UI + advanced analysis drawer) |
| 3 | `d4da1901` | test(web): add CI-W1B.1 progressive disclosure and upload guards (42 cases, wired into root `npm test`) |
| 4 | `ff5d1c8b` | docs(ci): record CI-W1B.1 UX correction (this report) |
| — | (finalization) | docs(ci): fix CI-W1B.1 report commit reference (self-reference hash correction) |

---

## 1. Problem StatementCI-W1B delivered a complete Web Workspace but the real page exposed two
problems:

1. **P0 — upload area click produced no response.** On the initial
   Creative Intelligence page, clicking the upload area / icon did
   nothing, and when the picker bridge returned no documents the UI
   stayed completely silent.
2. **UX — the 9 internal pipeline stages (Input → Facts → Understanding →
   Concepts → Directions → Evaluation → Selection → Canon → Translation)
   were rendered as the primary navigation rail.** These are internal
   architecture, not user tasks.

This phase splits **System Layer** from **User Layer**: the internal
pipeline keeps running unchanged, while the default UI is projected onto
five user views.

---

## 2. P0 — Upload No-Response Root Cause

Audited surface: `CreativeIntelligenceWorkspace.tsx`,
`ciworkspace/controller.ts`, `web-api.ts`, `apps/web-runtime` RPC wiring
(`node-native-operations.ts`), and the CI workspace CSS.

### Root cause classification

**A (missing onClick) + G (silent empty-result no-op).**

| Candidate | Verdict | Evidence |
|---|---|---|
| A missing onClick | **CONFIRMED** | The `.drop-zone` surface and the `↥` orbit icon had `onDragOver`/`onDrop` only. Only the inner 「选择文档」 button had `onClick`. The primary upload surface was never clickable and had no keyboard support. |
| B disabled state | no | The button was not disabled in the no-run input state. |
| C overlay / pointer-events | no | No overlay or `pointer-events` rule covered the dropzone (CSS audit clean). |
| D RPC mapping | no | `documentContext.chooseDocuments` kebab-maps to `document-context:choose-documents`, which is exactly the channel registered by `node-native-operations.ts`. Mapping is correct. |
| E chooseDocuments bridge unavailable | no | The namespace proxy (`createWebRuntimeApi`) always materializes `documentContext`; the RPC exists in the Node Web Host. |
| F hidden runtime error | no | Thrown errors were caught and surfaced; the failure was in the *empty-result* branch, which was not surfaced. |
| G other | **CONFIRMED** | `handleChooseDocuments` did `if (!chosen.length) return;`. In the Node Web Host the picker bridge is env-var backed (`MASTERPIECE_WEB_SELECTED_DOCUMENTS`); unset → `[]` → silent return, no feedback. Drag & drop had the same defect: `window.masterpiece.files.getPathForFile` returns `''` in the browser proxy, so all dropped paths were filtered out silently. |

### Not a runtime semantic issue

The CI semantic chain (`ci.start({ documentPaths })` →
`CreativeIntelligenceApplicationService`) was never in the failure path.
The RPC bridge and runtime contracts are correct. **STOP condition
(runtime-core semantic bug) did NOT trigger** — the fix stayed entirely
in the Web layer.

---

## 3. P0 — Upload Fix

One single handler serves every trigger:

```
dropzone click / icon click / 选择文档 button / keyboard Enter / keyboard Space
        └──> handleChooseDocuments()
                 └──> window.masterpiece.documentContext.chooseDocuments()
                              └──> documentPaths updated (deduped)
```

- Upload hero is a real interactive surface: `role="button"`,
  `tabIndex={0}`, `onClick`, `onKeyDown` (Enter / Space), `onDrop`
  (drag & drop routes through `getPathForFile` into the same
  `inputDocumentPaths` state).
- **Picker errors are always visible, never silent:**
  - empty result → `无法打开文件选择器，请重试。` + detail
    「选择器未返回任何文档…」(role="alert");
  - thrown error → same headline + raw cleaned message in a
    `<details>` block (advanced info retained);
  - drag & drop that cannot resolve paths → visible error with detail.
- **Input guard:** `Start` is disabled with no `documentPaths`, enabled
  as soon as at least one document is present
  (`disabled={busy || !profileId || !inputDocumentPaths.length}`).

## 4. Input Interaction Tests

`tests/packages/creative-intelligence/ci-w1b.1/web-ux-guards.test.js`:

- exactly one `handleChooseDocuments` definition exists;
- upload hero click / 选择文档 button / Enter+Space keydown all route
  through that single handler (`tabIndex={0}` focusable);
- `documentContext.chooseDocuments()` is invoked exactly once, from the
  handler;
- drag & drop resolves dropped files via `files.getPathForFile`;
- empty picker result detected (`if (!chosen || !chosen.length)`),
  `setPickerError` in both empty and catch branches, `role="alert"`;
- `Start` disabled without document paths.

---

## 5. Old 9-Stage Rail Audit

Before removal the rail rendered `STAGES.map(...)` into
`.ci-workspace__rail` with 9 `.ci-stage` cards (`01-input` … 
`09-translation`), driven by `activeStageForStatus` + `stageStatusOf`,
with per-stage tab filtering (`stageFilter`). This made internal
architecture the default navigation.

After CI-W1B.1:

- rail markup, stage cards, `data-ciw-stage` attributes and the
  responsive rail CSS are all **removed** from the default UI
  (not dimmed — gone);
- the internal mapping is **retained unchanged** in
  `ciworkspace/types.ts` (`STAGES`, `StageId`) and
  `ciworkspace/controller.ts` (`STAGE_BY_STATUS`,
  `activeStageForStatus`, `stageLabelForStatus`, `deriveRunLifecycle`)
  for runtime state mapping, resume, tests and the advanced-analysis
  drawer (RETAIN fixtures in `user-view-projection.test.js` prove the
  mapping still resolves every `RunStatus` to a valid `StageId`);
- `stageFilter` UI state was removed; rendering is now driven by
  `data-ciw-user-view`.

---

## 6. User Layer / System Layer

| User Layer (default visible) | System Layer (hidden by default, via 查看分析依据) |
|---|---|
| 上传项目资料 | Project Truth |
| 确认项目事实 | Need / Insight / Opportunity |
| Creative Directions | Concept / Evaluation internals |
| 视觉系统 | Trace / Diagnostics |
| 应用适配 | Selection Revision / Canon Version / Translation Version |

No internal stage name (Truth / Need / Insight / Opportunity / Concept /
Evaluation / Selection / Canon / Translation, CI-7..CI-9, Checkpoint A/B)
is rendered as default user copy anymore.

---

## 7. User View Mapping

New pure functions in `ciworkspace/controller.ts` +
`ciworkspace/types.ts`:

```ts
type CreativeIntelligenceUserView =
  | 'input' | 'fact-review' | 'thinking' | 'direction-decision' | 'visual-system';

deriveCreativeIntelligenceUserView(runStatus)  // pure projection
deriveThinkingProgress(runStatus)              // friendly step, null outside reasoning
```

| RunStatus | User view |
|---|---|
| none (no active run) | `input` |
| pending / preparing_documents / extracting_facts | `thinking` |
| awaiting_fact_confirmation | `fact-review` |
| building_truth / building_understanding / building_concepts / building_directions / evaluating | `thinking` |
| awaiting_direction_selection | `direction-decision` |
| building_canon / building_translation | `thinking` |
| completed | `visual-system` |
| failed / cancelled | `input` (error + 恢复 / 删除 recovery surfaced in the run strip) |

`deriveThinkingProgress` mapping (Spec §23):

- building_truth / building_understanding → 理解项目核心信息
- building_concepts → 梳理创意机会
- building_directions / evaluating → 生成并评估创意方向
- pending / preparing / extracting → 准备项目资料
- building_canon / building_translation → 生成视觉系统与适配方案
- checkpoints / terminal states → null

---

## 8. Input Page

- Main title: **Creative Intelligence** (the
  "Creative Intelligence Web Workspace" title is gone).
- Subtitle: 从项目资料出发，理解品牌与业务，形成可执行的创意方向与视觉系统。
- Visual center: large upload hero —
  上传项目资料 / PDF · DOCX · Markdown · TXT /
  可一次上传多份策划、品牌、产品或业务资料 / [选择文档].
- Model / API profile reduced to a small secondary card
  (当前模型：… [更改]).
- Recent runs capped at **5** (项目名 / 状态 / 更新时间, click to
  resume the task); the run list is no longer the page body.
- Active failed/cancelled run shows error + 查看任务/恢复/取消/删除.

## 9. Fact Review

- Title: **确认项目事实**; subtitle: 这些信息会成为后续创意推理的事实基础。请确认、修改或标记未知。
- No "Facts" / "Checkpoint A" / "Understanding" copy.
- Groups (`groupFactRows`, pure function): 品牌 / 业务 / 产品 / 服务 /
  目标用户 / 核心要求 / Locked Facts / 尚未确认.
- Actions per fact: 确认 / 修改 / 删除 / 标记未知 / 查看来源
  (source details behind a `<details>` toggle; internal fields like
  sourceRunId / schemaVersion / field paths are never shown).
- CTA: **确认事实并继续**.

## 10. Thinking

- Single user state: **正在形成创意方向**.
- Shows only the three friendly steps
  (理解项目核心信息 → 梳理创意机会 → 生成并评估创意方向) plus the
  intake / visual-system-build labels.
- No Truth / Need / Insight / Opportunity / Concept / Evaluation pages
  or NICE / CI-7 / CI-8 / CI-9 technical copy.

## 11. Direction Decision

- `Directions + Evaluation + Selection` merged into one view:
  **Creative Directions** (标题: 选择创意方向).
- Card default: 名称 / 核心说明 (thesis) / Visual Mechanism /
  System Hypothesis / 适用媒介 (方向族 · 跨媒介 · 空间 · 包装) /
  优势 / 风险 / 系统推荐 badge / 选择此方向.
- Composition / Color / Material / Typography / Graphic / Image /
  Space / Packaging / Cross-Media / 10-dim evaluation collapsed behind
  **查看完整方向**; trace stays in 查看分析依据.
- Direction status shown with user labels only (已就绪 / 待定 /
  已阻断); raw enum never rendered.

## 12. Recommendation

- Banner: **系统推荐：{方向}** with rationale behind an optional
  **为什么推荐** disclosure.
- Advisory-only: “推荐仅供参考，不会自动成为你的选择。只有点击
  「选择此方向」并确认后才生效。”
- **Never auto-selected.** `evaluateSelectionAvailability` /
  `buildSelectionProposal` semantics unchanged; `primaryDirectionId`
  is never assigned to `selectedDirectionId` (guard-tested).

## 13. Selection Confirmation

Dialog copy:

```
确认选择「XXX」？
这个方向将成为后续视觉系统的基础。
系统推荐不会替代你的选择。
[取消] [确认选择]
```

- `ci.selectDirection()` is invoked **only** from the post-confirm
  handler (single call site, guard-tested).
- blocked Direction renders 不可选择 (disabled), never selectable.
- Revision selection shows a rebuild notice; the internal Checkpoint B
  semantics are untouched.

## 14. Visual System

Completed runs (selection → canon → translation) land on **视觉系统**:

- Visual Canon → **核心视觉原则** with the 8 user sections
  (01 核心视觉原则 / 02 视觉 DNA / 03 构图与层级 / 04 色彩关系 /
  05 材质关系 / 06 图形语言 / 07 跨媒介延展 / 08 禁止偏移).
- Anchor Contract → **视觉验收标准** (目的 +
  必须呈现 / 必须保留 / 可以探索 / 不得改变), subtitle:
  定义后续视觉产出必须保留、可以探索和禁止改变的内容.
- No selection → Canon stays locked (选择创意方向后才会生成视觉系统。);
  no Canon → Translation stays locked.

## 15. Application Adaptation

- Production Translation → **应用适配**, split into **空间适配** and
  **包装适配**.
- Each bucket shows exactly: **必须保留 / 可以调整 / 不能引入**.
- No "Production Ready" / "Send to Production" / "Generate Space" /
  "Generate Packaging" CTA exists (guard-tested in all four CI files).

## 16. Advanced Analysis

- Entry: **查看分析依据** (no default "Trace & Diagnostics" copy).
- Drawer (role=dialog) exposes the internal pipeline on demand:
  Project Truth / Need / Insight / Opportunity / Concept / Evaluation /
  Trace / Diagnostics / Selection Revision / Canon Version /
  Translation Version.
- Diagnostics severity mapped to user language: blocking → 需要处理,
  warning → 提醒, diagnostic → 技术信息 (raw codes kept).

## 17. Trace / Diagnostics

`buildTraceChain` / `groupDiagnostics` (pure controller functions) are
unchanged; they now feed the advanced drawer only. Per-direction trace
detail is reachable from the collapsed 查看完整方向 hint and the global
drawer.

## 18. Legacy Compatibility

- `DocumentContextWorkspace` and the `/document-context` route are
  untouched; `AnalysisModeTabs` keeps the `document-context` mode key.
- The `document-context:choose-documents` RPC bridge
  (`MASTERPIECE_WEB_SELECTED_DOCUMENTS`) is unchanged — the legacy
  workspace and the CI input share it.
- The user-facing CI tab hint was reworded to
  上传资料 → 确认事实 → 选择创意方向 → 视觉系统 (no internal names).

## 19. Web Boundary Proof

- Web never imports `@masterpiece/creative-intelligence` (guard).
- Web never reads run files / intermediate JSON / shadow JSON (guard).
- `ciworkspace/controller.ts` + `types.ts` + `format.ts` stay pure
  (no React, no DOM, no fs) — guard + projection tests import them
  directly under `node --test`.
- `ci.selectDirection` single call site; recommendation never becomes
  selection; blocked direction never selectable (guards).
- Runtime diff: `packages/creative-intelligence/**` and
  `packages/runtime-core/**` have **zero changes** in this phase.

## 20. UX Golden Scenarios

| # | Scenario | Test | Result |
|---|---|---|---|
| UX01 | initial page shows upload as primary | `CI-W1B.1 UX01` (projection `input`) + upload-hero guards | PASS |
| UX02 | main 9-stage rail absent by default | `CI-W1B.1 UX02` (static: no rail/`data-ciw-stage`/`STAGES.map`, no Checkpoint A/B copy) | PASS |
| UX03 | upload click invokes picker | `CI-W1B.1 UX03` (single handler, click/Enter/Space/drop wiring, single `chooseDocuments()` call) | PASS |
| UX04 | picker error visible | `CI-W1B.1 UX04` (visible copy + role=alert + empty/catch branches + Start gating) | PASS |
| UX05 | fact review primary at checkpoint A | `CI-W1B.1 UX05` (projection + groups + user CTA copy) | PASS |
| UX06 | reasoning maps to one thinking state | `CI-W1B.1 UX06` (single view + friendly progress mapping) | PASS |
| UX07 | direction/evaluation/selection merged | `CI-W1B.1 UX07` (single `direction-decision` view; no evaluation/selection views) | PASS |
| UX08 | recommendation does not auto-select | `CI-W1B.1 UX08` (proposal requires confirmation; recommendation unchanged after user pick) | PASS |
| UX09 | completed run shows visual system | `CI-W1B.1 UX09` (projection + user labels) | PASS |
| UX10 | advanced analysis reveals internal pipeline | `CI-W1B.1 UX10` (drawer sections + severity labels) | PASS |

42 CI-W1B.1 test cases, all PASS.

## 21. Hard Acceptance (all = 0)

- upload click no-op → **0** (single wired handler)
- silent picker error → **0** (visible error + role=alert)
- main 9-stage rail visible by default → **0** (removed from DOM)
- recommendation auto-selected → **0** (guard)
- selection without explicit confirmation → **0** (dialog gates the single call site)
- blocked Direction selectable → **0** (不可选择, disabled)
- Canon shown before selection → **0** (locked view)
- Production CTA exposed → **0** (regex guards)
- Space / Packaging generation trigger → **0**
- Web direct CI import → **0**
- Web direct run-file read → **0**
- Runtime semantic change → **0** (`packages/**` diff empty)
- provider behavior change → **0**
- legacy Document Context deletion → **0**

## 22. Regression

| Suite | Result | Delta vs CI-W1B |
|---|---|---|
| `npm test` | 1362/1363 | 1 pre-existing fail (`tracked-runtime-assets-guard` Case 1 — recorded in CI-W1B, **kept unchanged** per phase rule). +42 new CI-W1B.1 tests all pass. |
| CI-W1A 专项 | 42/42 | unchanged |
| CI-W1B 专项 | 30/30 | unchanged |
| CI-W1B.1 专项 | 42/42 | new |
| `npm run runtime:test` | 14/14 + 1610/1624 | 14 pre-existing UI guard fails (BD-17, BE-19, Stage 4, analysis UI intake, model connection failures, AE-01, AT-19, AW-22, AS-20, AN-16b, AQ-25, AR-22, AZ-24, AX-21). AC-09 / AW-21 pass on the clean committed tree (they fail only while the worktree is dirty). **new failures = 0, worsened = 0.** |
| `npm run web-runtime:test` | 12/12 | unchanged |
| `npm run cli:test` | 40/40 | unchanged |
| `npm run web:typecheck` | PASS | — |
| `npm run web-runtime:typecheck` | 100 pre-existing TS errors | verified identical (100) at baseline worktree `b5cdc1ea` — 0 new |
| `npm run web:build` | PASS | see §25 |

## 23. Guards

All release gates run:

| Gate | Result |
|---|---|
| `verify:version-consistency` | PASS (5.0.0-rc.1) |
| `verify:version-naming` | PASS |
| `verify:workspace-boundaries` | PASS (0 failures) |
| `verify:production-boundaries` | PASS (484 files) |
| `verify:golden-boundary` | PASS |
| `verify:no-obsolete-code` | PASS (910 files) |
| `verify:no-project-specific-production-rules` | PASS |
| `verify:current-flows` | All pre-runtime steps PASS (engine doc paths, version naming, project rules, golden boundary, offline evaluation); the gate exits at the runtime-application step with the **same 14 pre-existing UI guard fails** recorded in CI-W1B (their report recorded the identical reality as "PASS with pre-existing fails"). 0 new. |

`tracked-runtime-assets-guard` Case 1: **unchanged**, not remediated in
this phase (explicit phase rule).

## 24. Behavior Drift (intended, Web-only)

- 9-stage rail, per-stage tabs and `data-ciw-stage` removed from the
  default UI (internal mapping retained).
- `RUN_STATUS_LABELS` checkpoint letters removed from user copy
  (待事实确认 (A) → 待事实确认; 待方向选择 (B) → 待方向选择).
- Run delete confirm copy no longer lists internal artifact names
  (Concept / Direction / Canon).
- Direction status chips render user labels instead of raw enums.
- `TraceDrawer` → advanced-analysis drawer with the same data plus
  Selection Revision / Canon Version / Translation Version.
- AnalysisModeTabs hint reworded to the user journey.
- No runtime, CI, provider, selection, Canon, Translation or consumer
  change. `ci.start` / `ci.confirmFacts` / `ci.selectDirection` /
  `ci.resume` / `ci.cancel` / `ci.remove` wire contracts unchanged.

## 25. Web Build Delta

Baseline built from worktree at `b5cdc1ea` (same toolchain, same
node_modules):

| Asset | Before (b5cdc1ea) | After (d4da1901) | Delta |
|---|---|---|---|
| JS | `index-B1J7KimH.js` 563,460 B | `index-CnhYa8jI.js` 564,199 B | +739 B (+0.13%) |
| CSS | `index-CEXt0-jI.css` 184,356 B | `index-Zv-L9Y0J.css` 190,708 B | +6,352 B (+3.45%) |

Reason: new user-view panels + progressive disclosure copy replace the
stage rail and per-stage panels; CSS gains the upload hero / fact
groups / thinking / direction-decision / visual-system / advanced
drawer styles while the rail styles are removed. Bundle change is
expected and permitted by this phase.

## 26. Rollback

`git revert ff5d1c8b d4da1901 f351b85f 3d22c809` restores the
CI-W1B UI exactly. No data migration, no runtime state change, no
schema change — the workspace view model and run files are untouched by
this phase, so a rollback is lossless.

## 27. Verdict

CI-W1B.1 = **GO**.

- Upload click opens the picker; picker failure is visible; initial
  page is upload-first.
- The 9 internal stage cards are not shown by default; Fact Review is
  the first user checkpoint.
- Internal Truth / Need / Insight / Opportunity / Concept pipeline is
  hidden by default and reachable through 查看分析依据.
- Direction + Evaluation + Selection are one user decision experience;
  recommendation remains advisory; selection still requires explicit
  confirm.
- Completed run shows the Visual System with user-facing Canon /
  Anchor / Translation language and Space / Packaging adaptation
  buckets.
- No Runtime semantic change, no CI semantic change, no consumer
  switch, no new production regression.

## 28. Web E2E Readiness

Static + projection guards are in place. The real-browser E2E
(real file upload, fact review, direction selection, canon, space /
packaging translation — 九州美学 / 一剂良方, N ≥ 3 runs, ≥ 2 project
types, behaviorChangeRisk=high = 0) is **CI-W1C** and has not been
started. Known pre-existing limitations recorded for CI-W1C planning:
`web:smoke` `nodeHostBoot` still hardcodes `operationCount === 155`
while the host now registers 167 channels (drift introduced by CI-W1A;
all other smoke checks pass), and the Node Web Host picker bridge
remains env-var driven (`MASTERPIECE_WEB_SELECTED_DOCUMENTS`) — the
CI-W1C E2E should drive document selection through that mechanism or
through the browser file input path, whichever CI-W1C scopes.

## 29. CI-10 Status

**NOT STARTED.** No Space / Packaging production consumer, generation
CTA or routing change exists in this phase. Post-phase instruction:
stop here; do not continue UI changes; proceed to CI-W1C when
authorized.
