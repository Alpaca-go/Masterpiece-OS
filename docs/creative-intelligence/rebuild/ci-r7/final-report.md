# CI-R7 Final Report

Branch: `codex/creative-intelligence-r7-direction-board-handoff`
Base: `82100c0f05ca8aed0717cbdbf682ba376e4db57a` (CI-R6 final HEAD)
HEAD: `57783599` (implementation checkpoint before this finalization report)

Date: 2026-08-28

## Direction Entry

`整理成视觉方向` CTA 位于 References 页（Selection Tray 之后），附辅助文案
"这些参考已经足够让我开始设计了。"。`startDirection` 复用 R1 既有 invariant
`assertCreativeResearchTransition(session, 'DIRECTION', { selections })`，最低条件仅为
至少一个 `state = SELECTED && actor = DESIGNER` 的 Reference，没有额外强制条件。
进入后 `session.status = DIRECTION`，`activeDirectionBoardId` 指向新 Board。
已处于 DIRECTION 时 `startDirection` 幂等 resume（不产生新 revision）。

## DirectionBoard Store

`createCreativeResearchDirectionBoardStore` 落地既有 `DirectionBoardRepository` port：

```text
<defaultDataPath>/creative-research/<sessionId>/direction/
├─ boards/0001-<boardId>.json ...
└─ context/current.json
```

session containment（`assertInside` + safeIdentifier）、revision 单调递增
（必须等于 max+1）、atomic write（`atomicWriteJsonWithRetry`）、历史 revision
不可覆盖、`getCurrent()` / `listRevisionHistory()` 稳定（按 revision 升序）。

## Deterministic Draft

Board 构建为纯 deterministic evidence compilation，**零 model 调用**。

- FINALIZED Preference：`status = FINALIZED` 且文本取 `designerOverride ?? summary`，
  按固定 `REFERENCE_ATTRIBUTES` 顺序组合。
- DRAFT Preference：绝不自动写入 Board（仅在 UI 显示为"未确认倾向"）。
- Selected refs：`referenceIds` 默认 = 当前全部 SELECTED DESIGNER References
  （按 selection createdAt 稳定排序）。
- Active negatives：`negativeSignalIds` 默认 = 当前 active REJECT_REFERENCE
  （复用 R5 `activeRejectionSignals`，source Reference 仍 REJECTED）。
- 无 FINALIZED insight 时 summary 回退为
  `当前方向集中在：<Brief.visualKeywords>；重点参考<selectedAttributes 中文标签>。`，
  不使用任何替设计师做决定的语言。
- Section 预填映射：TYPOGRAPHY→typography、LAYOUT→layout、COLOR→color、
  GRAPHIC→graphic、MATERIAL→material、PHOTOGRAPHY→photography；未为
  IMAGE_TREATMENT / APPLICATION / ATMOSPHERE 扩展 schema。
- `referenceRegionIds = []`（Region UI 仍 DEFERRED，既有合法 Region 可被读取校验）。
- `designerNotes` = Brief.designerNotes + 已选 Reference designerNote 去重。

## Direction UI

顶层正式为 Brief / References / Direction 三个 tab
（`apps/web/src/features/creative-research/DirectionWorkspace.tsx`）。
Direction 为纵向设计师工作区：Project Brief（只读）、Core Visual Keywords、
Typography / Layout / Color / Graphic / Material / Photography、
Selected References（视觉卡片，查看来源 / 从方向中移除，不含任何 Selection 变更）、
Avoid / Negative Signals、Designer Notes。
动作条：`返回继续研究` / `保存方向` / `完成方向`。
已确认倾向带 `应用到方向` 按钮（点击才进入本地草稿）；DRAFT 仅展示。
新收藏未入板的 Reference 显示 "还有 N 个新收藏的 Reference 尚未加入方向" 提示，
由设计师手工加入。

## Return / Re-enter

`返回继续研究` 执行既有 `DIRECTION -> RESEARCH` transition
（`assertCreativeResearchTransition`），不删除任何 Board revision / Selection /
Preference / Search History / NegativeSignal。

再次进入：latest Board → clone authored fields → revision+1 → reconcile evidence：

- 旧 Board ref 仍 SELECTED → 保留；
- 旧 Board ref 已 NONE/REJECTED → 从新 draft 移除；
- 新 SELECTED Reference → 不自动加入，经 `availableReferenceIds` 暴露为可选证据；
- 新 FINALIZED PreferenceInsight → 经 `pendingFinalizedInsights` 提示，
  不后台覆盖已有 Direction 文本。

## CreativeDirectionContext

Compiler：只调用既有 `compileCreativeDirectionContext()`，随后
`assertCreativeDirectionContextBoundary()`；未新写 compiler，未新增
packaging / space / prompt / visualGrammar 等下游私有字段。
Preferred attributes：从 Board 内 selected Reference/Region attributes
deterministic 聚合（REFERENCE_ATTRIBUTES 顺序）。
Context 的 negativeSignals 只来自 `DirectionBoard.negativeSignalIds`。
Provenance：精确记录 designBriefId / directionBoardId / sourceDocumentIds /
referenceIds / referenceRegionIds / negativeSignalIds。

## Context Persistence

新增最小 port `CreativeDirectionContextRepository`（`save` / `getCurrent`），
concrete store `createCreativeDirectionContextStore` 持久化到
`<session>/direction/context/current.json`。
`save` 幂等：同一内容重试原样返回；不同内容抛 `CONTEXT_IMMUTABLE`。
Session COMPLETED 后 Context 不可变。

## Completion

`完成方向` 必须显式确认（文案："完成后本次 Creative Research 将进入只读完成状态。"）。
流程：require DIRECTION → active Brief → active Board → Selections / Regions /
NegativeSignals → `compileCreativeDirectionContext()` →
`assertCreativeResearchTransition(session, 'COMPLETED', { directionBoard, directionContext })`
→ **先持久化 Context，再保存 Session COMPLETED**（completedAt = now）。
`completeDirection` 幂等重试：若当前 active Board 已持久化 Context 则直接复用，
避免"Context 已写入但 Session 未保存"后的重试失败。

Read-only：COMPLETED 后 `updateDirectionBoard` / `returnToResearch` /
`startDirection` 均拒绝（INVALID_STATE）；本阶段另外补齐了缺失的底层守卫——
COMPLETED Session 上 Selection 变更
（`CREATIVE_RESEARCH_SELECTION_SESSION_COMPLETED`）与 Preference
analyze/update/finalize（`CREATIVE_RESEARCH_PREFERENCE_SESSION_COMPLETED`）
现在也会被拒绝；Search 路径此前已有 RESEARCH-only 守卫。未新增
`COMPLETED -> RESEARCH`。

## Handoff

Context API：稳定只读 RPC `creative-research:get-direction-context`
（以及 `start-direction` / `get-direction-board` / `update-direction-board` /
`list-direction-board-revisions` / `return-to-research` / `complete-direction`，
共 7 个新 channel，operation count 206 → 213）。
COMPLETED Direction UI 提供 `查看方向上下文` 与 `复制方向上下文 JSON`
（Browser-safe DTO），支持手工进入 Figma / Illustrator 等设计流程。
Context is guidance, not downstream constraint：R7 不调用 Packaging / Space
create/update，不修改 shot contract / prompt compiler / Reference Policy /
Locked Assets。

Reference First direct consumer：
`REFERENCE_FIRST_DIRECT_CONSUMER = DEFERRED_NO_SAFE_READ_BOUNDARY`

审计结论：当前 Reference First 运行时没有任何既有的安全只读接受点可以
additive 地消费 CreativeDirectionContext projection——所有候选入口
（ShortChainTaskContract、space compile inputs、approvedCreativeDecision、
editedPrompt、VisualDecisionPacket）要么是 baseline-frozen CRITICAL 文件，
要么会改变 prompt authority。`ReferenceFirstHandoffAdapter` 保持 interface-only。
R7 仍交付了 persisted CreativeDirectionContext + 稳定只读 Context API，
未为 R7 硬改 frozen Reference First。

## Provider Calls

Model: 0
Baidu: 0
Generation: 0

Direction service / operations 不持有任何 adapter / gateway 依赖；
端到端测试（startDirection → update → return → re-enter → complete →
getDirectionContext）在插桩 gateway/adapter 下断言调用数为 0。

## Downstream Writes

Packaging: 0
Space: 0
Reference First policy: 0

Board save 为 0 Selection / NegativeSignal / Search / Preference 写入
（测试前后快照 deep-equal 验证）；测试后临时数据根目录仅存在
`creative-research/`；R7 源码 grep 断言无 packaging / space / image-generation
import。

## Retention

`PROVENANCE_METADATA_ONLY`
`TRANSIENT_IMAGE_ANALYSIS_ONLY`

Direction Board / Context 只保存 Reference ids、provenance metadata、
设计师证据与方向文本；不保存远程图片 bytes，无 Web 图片下载/导入/缓存。

## Tests

R1-R6 targeted regression: **PASS**（R5 selection/preferences、R6 correction、
R4 operations、R3 search、R2 service/store、invariants 全部保持绿色）
R7 targeted contract tests: **PASS (11/11)**，
`tests/runtime-application/creative-research-r7-direction.test.ts` 覆盖
§41–49：Direction entry、initial board 证据权威、board save 校验与零底层写入、
return/re-enter reconcile、context compile 精确 provenance、completion 与只读、
Browser DTO 安全（无绝对路径/sourceDocumentIds/凭据/图片二进制）、
zero provider calls、zero downstream writes。
Root `npm test`: **PASS (1674/1674)**
`npm run cli:test`: **PASS (40/40)**
Shared Runtime tests: **PASS (14/14)**
Runtime application: **1223/1225**，仅有的 2 个失败为下列 pre-existing failures。
Node Web Host: **PASS (15/15)**（operation count 206 → 213 断言已同步）
`npm run web:build`: **PASS**
`npm run web:smoke`: **PASS**，operation count 213，provider calls 0，
business writes 0，Electron/Desktop 进程 0。
`npm run golden:test`: **PASS**，provider calls 0，auto-update 关闭。
verify:version-consistency / version-naming / workspace-boundaries /
no-obsolete-code / production-boundaries / tracked-runtime-assets /
no-project-specific-production-rules / golden-boundary: **PASS**。

`npm run verify:current-flows`（及 `npm run repo:verify`）在
runtime-application 步骤停止于上述 2 个 pre-existing 失败（与 R6 相同状态）。
补充观测：`web-runtime:typecheck` 单独运行存在 160 个 pre-existing TS 错误
（在 R6 base HEAD `82100c0f` 上原样复现，R7 增量为 0；该步骤在
verify:current-flows 中位于失败的 runtime-application 步骤之后，因此一直被掩盖）。
`web:typecheck` 另有 1 个 pre-existing 错误
（`ReferenceAnchorWorkspace.tsx:157` TS2532，与 R7 无关，web:build 不经过它）。

## Live R4

`LIVE_R4_REFERENCE_E2E = NOT RUN`

## Live R5

`LIVE_R5_SELECTION_E2E = NOT RUN`

## Live R6

`LIVE_R6_CORRECTION_E2E = NOT RUN`

## Live R7

`LIVE_R7_DIRECTION_E2E = NOT RUN`

本任务没有用户授权的真实 provider 凭据 / Public Test Session，未伪造 PASS。

## Repository Regression

Current Production 边界、Shared Core 边界、golden-case 隔离、版本规则、
Short-Chain-only Web 路径保持不变。Baseline 审计报告仓库既有的全局
frozen-baseline drift；R7 变更与 baseline manifest 路径交集为 0
（逐文件核对：所有 R7 触碰文件均不在
`docs/baseline/baseline-files-manifest.md` 中）。

## Pre-existing Failures

1. `analysis UI contains intake actions and a free-form API Profile provider`
2. `analysis API selection is controlled by App and survives settings navigation`

两者均位于 R7 变更面之外，已在干净 base 分支上原样复现，本实现未改变其结果。

## New R7 Failures

`NEW_R7_FAILURES = 0`

## Current CI

`UNCHANGED`（旧 Creative Intelligence 未做替换/迁移/deprecation）

## CI-R8 Readiness

`CONDITIONAL GO`

离线 R7 实现与回归证据完整（Direction Board / CreativeDirectionContext /
Completion / Read-only Handoff 全链路）。Readiness 仍为 conditional：
LIVE_R4/R5/R6/R7 均为 NOT RUN，RETENTION_REVIEW = NOT_CONFIRMED，
且 Reference First direct consumer 为 DEFERRED_NO_SAFE_READ_BOUNDARY，
留待 R8 处理生产冻结与迁移。
