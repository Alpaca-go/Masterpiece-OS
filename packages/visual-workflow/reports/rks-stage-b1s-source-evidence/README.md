# Stage B1S — BLOCK：可信确认来源交接需要上游服务接口

日期：2026-10-28（Asia/Shanghai）。基准及当前 HEAD：`11523613363992da5bed8b05b7024e9574d754e5`；分支：`fix/rks-semantic-scope-and-operations`。开始时工作区干净。

**本轮触发用户规定的停止条件，未实施候选代码，未完成 B1S 验收。** 用户要求：“若需要修改用户确认或持久化服务才能证明生产来源可信，立即停止并报告必要接口，不得继续以实验数据代替生产授权。”只做了仓库契约阅读、静态来源追踪、冻结核对与报告所需的 `repo:verify`。停止后没有继续运行编译探针或行为回归。

所有路径均以本仓库实际的独立工作流 `packages/visual-workflow/` 为根。没有修改策划/迁移使用的 `packages/image-generation-runtime/`。报告不能作为扩大生产修改范围的授权。

## 1. 具体停止点

生产可信所有者已经存在；缺口是其检查结果没有作为来源输入到达 Compiler。

|位置|当前行为|B1S 缺口|
|---|---|---|
|`src/project-design-direction.js:94-118`，`state()`|从项目目录读取持久化记录、Packet、context；检查项目及记录状态、字段语义、绑定分析指纹与项目完成状态；历史确认记录要求重新确认|此状态及检查上下文没有随 confirmation 进入 Compiler|
|同文件 `:150-160`，`confirm()`|要求 `confirmedByUser === true`；通过现有记录冲突、分析和结构检查后，持久化确认及分析绑定|不能在 Compiler 中用同形普通对象、字段名或哈希重建这次用户操作|
|同文件 `:167-177`，`capture()/resolve()`|仅确认状态可 capture；返回 `confirmation` 和含 project、record、confirmation、analysis、source、confirmedAt 的 snapshot；resolve 重新 capture 并比较快照|这是应使用的生产所有者入口；需要传递实际检查结果，而非给实验输入标一个相同的 sourceOwner|
|`src/runtime/image-generation/short-chain-service.js:159-180`|调用 `capture()`，只把 `designDirection?.confirmation` 作为 `userConfirmedVisualDecision` 传给 `compileShortChainGeneration()`|Compiler 的输入没有 capture snapshot 或能回到该所有者复核的接口|
|`src/generation-runtime/generation/compile.js:115-133`|调用 `applyUserConfirmedVisualDecision()`，再把有效 Packet 交给 `compileSpacePrompt()`|传下去的是 Packet；没有经过可信所有者校验的逐项账本|
|`src/generation-runtime/generation/user-confirmed-visual-decision.js:30-46,88-91`|检查 schema/project/status、适用媒介与空间字段结构；构造有效 Packet 的确认标记及指纹|这是结构与覆盖逻辑，不验证持久化来源、capture 状态或真实用户操作；指纹不能补足该授权|

只修改四个允许的生产文件，可以拒绝缺证据输入、校验字节与索引，却无法把一个普通 confirmation 对象证明为“已持久化且通过现有授权检查的记录”。若在这些文件内从该对象直接签发 `trusted/confirmed` 来源，恰好违反本轮来源所有权要求。

最小必要扩展是 **`src/runtime/image-generation/short-chain-service.js` 的生产交接接口**。它不在本轮允许修改的四个文件中，属于用户明确要求先停止的其他上游服务。当前证据不要求修改持久化格式；也未证明必须修改 `project-design-direction.js`。如果实现采用由 capture 所有者签发不可由调用者伪造的内存凭据，则还需单独审核 capture 返回接口的扩展。这里均未实施。

**已有保护不能抹去：** `short-chain-service.js:299-302` 在 start 时读取编译保存的设计方向快照并执行 `designDirectionStore.resolve()`。正式服务已有 capture → 编译 → 保存快照 → resolve 的检查。本轮没有测试或证明公共服务可绕过该保护；发现的是 Compiler 无法独立消费其来源证明，不能把接口缺口写成已证实的公共执行漏洞。反过来，start 的已有检查也不能证明直接调用 Compiler 的输入拥有可信来源。

## 2. 需要批准的最小接口（设计要求，未实现）

由现有生产所有者完成授权检查，再经上述服务显式交接给 `generation/compile.js`。需要同时携带：

- 版本、project、实际所有者、持久化 record/confirmation 标识，capture 对应的分析绑定及任务范围；能够回到所有者复核的受信调用能力。不能以客户端提供的 `authorized: true`、普通 snapshot、sourceOwner 字符串或哈希替代该能力。
- capture 对应的原始 Packet 与有效 Packet 的各自绑定，明确 confirmation 覆盖了哪些原字段和条目。Compiler 覆盖、改写、去重后不能沿用不匹配的旧绑定。保存至磁盘后，执行时仍须通过原有 resolve 复核；不能序列化一个内存标记后当作永久授权。
- 缺少记录、stale、needs_reconfirmation、项目或任务不匹配均明确阻断。未确认的分析提案、系统程序、实验账本分别保留各自所有者；不能回退为用户确认。

建议只先批准这一个服务交接点及必要的独立证据模块；若 capture 本身还需改动，再列实际接口需求。不能凭此报告扩大到 Provider、Prompt、持久化写入或真实项目修改。

逐项只读契约仍须包含本轮指定的全部字段：`sourceKind`、`sourceOwner`、`sourceRecordId`、`packetFingerprint`、`fieldPath`、`originalIndex`、`originalText`、`entryFingerprint`、`sourceStatus`、`confirmationStatus`、`evidenceRefs`、`parentScope`、`semanticType`、`modality`。版本针对证据数据契约，不新增产品阶段式常量。原始 Packet、确认覆盖后的 Packet 不能混用同一个指纹。

投影输出还需独立的稳定 output binding ID、输出字段/索引、输出范围及其原文范围、sceneScope、visibilityAuthority。一个输出引用哪些完整父命题、原索引以及变更记录须明确；重复文本不能合并其来源授权。身份及指纹只证明绑定一致性，不证明信任或确认。

四个维度须分别裁决：内容语义 A、来源/确认 B、镜头权限 C、正式任务执行资格 D。系统生成程序可以拥有系统来源，但不能自行成为用户确认；reference-first 和 continuation 也不能因有参考图或目标程序跳过 B/D。旧输入缺少 sidecar 时不得默认 confirmed；当前没有证明可保留的兼容例外。

## 3. FTT → Compiler 的现存证据链及断点

以下是**当前源码追踪**，不是已实现或重新执行成功的链路：

```text
makeFinalDesignFixture.set()
  ├─ fixture.deltas：scene/path/before/after/status/evidenceRefs/reason
  └─ 实验 Packet：直接写入 after 的副本
       ↓ variant[group]
ftt-final-design-compile.ts：只传 projectContext.visualDecisionPacket + task
       ↓ generation/compile.js：Packet（可叠加普通 confirmation）
       ↓ compileSpacePrompt → adaptSpaceSource → scopeSourceEntries
       ↓ 原 Compiler functionalGate：仅投影后的若干字符串列表
       ✕ fixture.deltas 未进入该调用链
```

`ftt-final-design-fixture.ts:29-34` 将 delta 和 Packet 分开写入；`:50-51` 的共同实验变更将以下数组值写入 `mediaTranslations.spatial.functionalRelationships`：

```text
Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route
```

该次实验写入的原索引是 `[0]`，状态按 category `D` 保存为 `proposed_for_human_review_not_confirmed`，引用为 `knowledge:rks-observation-5` 和 `human_selection:golds[0].reason`。两条引用都不是新的用户确认。此静态赋值证据不能替代本轮要求的“最终 Packet 与选中 delta.after 完整一致”的运行验证；**B1S 未执行该验证，仍不可验收**。

同一 fixture 后续又按 entrance/storefront 写入同一字段。今后绑定必须使用实际 scene、明确的变更次序、before → after 覆盖链及最终数组的每个索引和值。不得从最后一个文本相同的 delta 猜所有者；共同 B、dining、entrance、storefront 也不得混用。重复条目、原文改写、漏记录和冲突均须负例。

本轮未实现 evidence builder、版本化运行契约、Projection/Adapter sidecar、Compiler 接线或纯审核返回类型。不存在从 fixture.deltas 到 Compiler 的完整可验收链；不能用新报告文件冒充这段链已完成。

## 4. 正式与审核路径

目标权限差异如下；这是待实现契约，不是本轮新增行为：

|路径|来源和确认|镜头|可返回结果|派发|
|---|---|---|---|---|
|用户确认|已持久化并通过现有所有者检查；逐项绑定完整|仍须通过现有权限|仅 A/B/C/D 分别满足后才有正式资格|还须现有 start/resolve 与执行检查|
|系统目标程序|系统生成 + 对应任务契约；不冒充用户输入|目标程序本身不授权任意当前可见性|在任务、来源和输出绑定通过后判断|不独立授权|
|FTT 实验|离线实验所有者，proposed；human_selection/knowledge 引用不改变确认状态|保留画外、边界与 review_required|纯离线、不可派发文本审核结果|禁止生成 ready、正式 Provider payload 或可执行任务|
|unknown / 缺 sidecar|缺可信所有者或完整绑定|不能默认 current_shot|明确证据缺失/冲突|阻断|

当前 `ftt-final-design-compile.ts` 仍尝试正式编译并构造本地 providerBody；其历史断言未经批准未改。本轮没有运行它，也没有把该 helper 的历史设计说成新的审核契约。不能通过关闭 functionalGate 恢复编译；亦未新增任何 review-only 旁路。

## 5. reference-first / continuation 与安全约束状态

现有 Adapter 在这两种模式下会进入目标程序投影或 continuation override；Compiler 仍对若干输出列表做语义检查。其来源及执行资格的 B1S sidecar 没有接入。本轮没有 replay 这些模式，因此不能声称已证明相同门禁、系统程序绑定或镜头权限闭环。

实验升级确认、错路径/索引、旧证据配新文本、丢父句子句独立获权、删除 unknown 后 ready、off-frame/review_required 当前可见、缺 sidecar 默认运行、reference-first/continuation 旁路这八类要求，均为 **NOT_RUN_STOP_TRIGGER / 未完成证明**。生产未改只证明没有本轮引入的代码变更，不证明原实现已经阻断全部风险。

## 6. 实施顺序与验证实际状态

|步骤|本轮状态|原因|
|---|---|---|
|可信证据构造与 Packet 绑定|NOT_STARTED_STOP_TRIGGER|实施前发现生产可信所有者交接缺口|
|FTT 字符串/delta/数组索引/重复/改写正反例|NOT_RUN_STOP_TRIGGER|第一步前停止|
|证据传入 Projection / Adapter|NOT_STARTED_STOP_TRIGGER|没有通过前置绑定测试|
|Compiler 输出/原文/执行资格一致性|NOT_STARTED_STOP_TRIGGER|未关闭或修改原 gate|
|用户确认、系统程序、FTT 三路径|NOT_RUN_STOP_TRIGGER|不以合成 confirmed 对象代替生产来源|
|Stage A / E1G / E1F / FTT / B1 / 完整工作流 / Golden|NOT_RUN_STOP_TRIGGER|遵守立即停止条件，不引用历史日志作本轮通过|

Stage A 保护记录仍为原 [checkpoint](../rks-stage-b1-projection-evidence/stage-a-checkpoint.json)：visible 14/14、field 101/101、scope 158/158、E1G 46/46、E1E 19/19、E1F 151/159、cross 39/43（28 未展开）、workflow 621/663、Golden 5/5；这些是**历史记录**，本轮均未复验。E1F 的 8 项旧失败和其余工作流失败未在 B1S 核销或重归因。旧报告继续保留其原因；本轮不能新增“已修复”结论。

此前 28 项：18 项 `ftt-fidelity.test.ts`、10 项 `ftt-final-design.test.ts`，本轮都未运行/未展开，没有被记为 skip、pass 或已恢复。原共同初始化链及首个失败证据见 [原逐项附录](../rks-semantic-field-contract-audit/TRACE-AND-CASE-LEDGER.md)。[unexpanded-tests.json](./unexpanded-tests.json) 保留完整 28 个名称、本轮 NOT_RUN_STOP_TRIGGER 及历史未展开状态，不能把历史基准 pass 当成本轮状态。

唯一执行的工程门禁是 `npm run repo:verify`：**FAIL，退出 1**。Repository Contract Guard PASS；随后 isolation guard 报 `VISUAL_WORKFLOW_IMPLEMENTATION_CHANGED: src/analysis-decisions/analysis-completion-orchestrator.js`。该文件与指定 HEAD 一致，本轮未改，为基准已存在的完整性漂移。后续 `verify:current-flows` 等链内命令没有执行；不宣称全门禁通过。完整输出见 [repo-verify.txt](./repo-verify.txt)。没有同步完整性清单。没有运行历史报告生成器，避免覆盖历史产物。

## 7. diff 与冻结证明

[preservation.json](./preservation.json) 记录指定基准、分支、工作区差异、受保护文件 Git blob 与当前 SHA-256；[production-diff.patch](./production-diff.patch) 为零字节。四个获准生产文件、两个 Stage A semantic 文件、两个 FTT helper、原测试、Prompt、Provider、Seedream、Golden、完整性清单及上游服务均未修改。Git diff HEAD 对所有原跟踪文件为空；文件内容比较不是质量验收或授权证明。

新增内容均仅用于本轮报告，无生产调用关系：README 为结论与接口需求；preservation.json 为只读冻结证据；unexpanded-tests.json 为历史 28 项本轮状态；repo-verify.txt 为本轮门禁输出；production-diff.patch 为生产空 diff。没有新增运行时模块、修改历史测试断言或真实项目文件。

真实 Provider、分析、生图、派发、重试、凭据读取均为 0。没有提交、推送、合并、发布或进入 E1H。当前交付是 **停止报告与可审核的最小接口需求**，不是候选实现通过。
