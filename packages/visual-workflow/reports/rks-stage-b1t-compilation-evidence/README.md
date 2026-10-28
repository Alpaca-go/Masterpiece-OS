# Stage B1T — 候选实现 / BLOCK / 回归触发停止

日期：2026-10-28（Asia/Shanghai）。分支 `fix/rks-semantic-scope-and-operations`；起始基准 `7865909107240dc046ffd337859ef389d16f5829`，开始时工作区干净。

**已实现并验证一条真实存储所有者的离线纵向链路；本阶段未通过验收。** 新增独立测试最终 31/31；原 Stage A 三组、E1G 和 E1E 保持通过。随后原 E1F 用例出现新增拒绝，触发“Stage A 已通过的安全用例出现新增回归”的停止条件。发现后没有继续修改生产代码、补放行、修改历史断言或执行后续行为回归。整体继续 BLOCK。

E1F 本次命令还存在执行错误：构造历史文件列表时多切掉一个参数，漏了 `evidence-boundaries.test.ts`。实际只运行 **128 项：54 PASS / 74 FAIL**，不能写成完整 159 项。触发停止后没有重跑以替换这份记录。未运行的 31 个原断言和实际命令均已列账。

## 1. 实际修改与调用图

路径均以 `packages/visual-workflow/` 为根。[production-diff.patch](./production-diff.patch) 包含五个获准生产文件及一个新增证据模块的完整 diff。

|文件|本轮用途|
|---|---|
|`src/runtime/image-generation/short-chain-service.js`|在已有 capture 成功后固定任务 ID；通过新内部接口核对所有者和 Packet，传递一次性编译对象；保留原 start/resolve 及持久化格式|
|`src/generation-runtime/generation/compile.js`|消费进程内捕获身份，核对任务、原 Packet、confirmation；在现有确认覆盖之后绑定有效 Packet；向 Compiler 传递证据；另设不可派发的离线审核入口|
|`src/generation-runtime/space/compilation-evidence.js`（新增）|唯一新增生产模块：版本化证据数据、真实所有者复核、私有 WeakMap/WeakSet 身份、逐项映射、实验 delta replay、投影封存及校验、任务限定的系统程序来源|
|`src/generation-runtime/space/scene-projection/target-scene-projection.js`|有逐项证据时保留父句/原文范围，阻断条件、未知范围或失去父命题的残句；无证据的旧纯投影观察保留原判定顺序，不产生编译权限|
|`src/generation-runtime/space/source-adapter.js`|从明确字段/原索引投影实际功能输出；保留重复来源和 withheld 记录；绑定建筑/艺术/品牌及构图输出；系统程序另行按注册程序与任务绑定；封存 IR|
|`src/generation-runtime/space/compiler.js`|验证进程内绑定和投影 IR；分别检查原始语义、来源/镜头、输出语义；输出约束以 `operationConstraints` 检查，不再一律反映射为 `functionalRelationships`；审核结果没有正式提示词或任务|

```text
服务端 projects/context（既有内部依赖，非 RPC 数据）
  → short-chain-service.capture(projectId)
  → captureSpaceCompilationEvidence
      → 实际 project-design-direction.resolve(snapshot)
      → 读取持久化 context，精确核对原 Packet
      → 再 resolve，确认读取期间来源未变
      → applyUserConfirmedVisualDecision，绑定有效 Packet 指纹
      → 签发不可序列化授权的单次对象（私有 WeakMap）
  → generation/compile.consumeCapturedSpaceEvidence
      → 核对 project/task/basis/指令及原 Packet/confirmation
      → 现有 applyUserConfirmedVisualDecision
      → bindCapturedSpaceEvidence（私有 consumed identity）
  → Compiler.assertSpaceEvidenceBinding
  → Adapter → scopeSourceEntries → 原索引/原文/父范围/镜头输出
      → sealSpaceProjection（整个 IR + 逐项输出）
  → Compiler.validateSpaceProjection
      + 原始 validateSpatialSemantics
      + 输出 validateSpatialSemantics
  → 仅满足各门禁后沿原正式编译路径返回；本轮测试不派发

FTT fixture.A + fixture.deltas + 实际 scene + 最终 Packet
  → 显式 delta replay / before-after 核对
  → offline_review 身份（永远没有执行资格）
  → 同一 Adapter / Projection / Compiler 检查
  → review_only、dispatchable=false、payload=null

实际执行仍保留 start() → designDirectionStore.resolve(snapshot)
```

`project-design-direction.js`、确认写入服务、持久化格式、Provider、Prompt、Seedream、Golden 和完整性清单均未修改。历史 FTT helper 和所有旧测试断言也未修改；FTT 通过新增独立测试显式传证。

## 2. 受信边界与防伪造证据

`captureSpaceCompilationEvidence` 不接受一个 `trusted` 标志作为授权。它使用服务端既有 `projects` 文件系统能力实例化真实确认所有者，调用真实 resolve，并检查持久化分析 context 和传入 Packet 一致。客户端提供的同形 snapshot 至多成为比较输入，不能免除实际所有者检查。

签发的对象本身无可序列化授权字段；身份保存在模块私有 WeakMap。consume 无论成功或失败均消耗一次使用机会；成功消费的记录还须通过私有 WeakSet 才能建立有效 Packet 绑定。复制、JSON/structuredClone、普通 snapshot、`sourceOwner` 字符串、布尔值及哈希均不能重建这些身份。投影 sidecar 同样需要私有身份及完整 IR 校验；磁盘上的 trace 只是审计信息，不能作为授权令牌重放。

本轮测试验证真实持久化 confirmed 记录、stale、needs_reconfirmation、分析变化、context Packet 不匹配、project/task/basis/指令变化、确认内容变化、伪造对象和序列化副本、重复消费、投影值改写，以及编译后真实所有者要求重新确认时 start 被阻断。测试使用隔离临时目录、真实存储实现和显式测试确认操作；没有修改真实用户记录。

信任边界是 RPC 数据与服务端既有依赖注入之间，不声称防御能任意执行同进程代码或替换服务端 `projects` 能力的攻击者。正式服务在 mint 后立即同步编译，执行前继续 resolve；本实现不提供离线永久有效授权，也未证明任意内部调用者长期保存不透明对象时的完整失效策略。

## 3. 原始与有效 Packet 逐项映射

契约 `space-compilation-evidence/1.0` 保存 project/task/basis、recordSha256、confirmationSha256、analysisFingerprint、confirmationId、原始和有效 Packet 指纹。每条包含 sourceKind/owner/record、fieldPath、sourceFieldPath、originalIndex、originalText、packetText、entryFingerprint、sourceStatus、confirmationStatus、evidenceRefs、完整 parentScope、semanticType/modality 和原语义证据。

映射依据确认覆盖规则的明确路径，不通过在 Packet 中搜索相同字符串推定授权：

|有效 Packet 范围|实际来源与权限|
|---|---|
|`mediaTranslations.spatial.*`|确认记录 `spatialTranslation.*` 中对应的准确路径和索引；设计意图 confirmed，仍非已验证物业事实|
|`colorSystem / materialSystem / lightingSystem`|确认记录对应的 colorBehavior/materialLanguage/lightingLanguage；不由名称或数组角色推定空间比例|
|确认明确提供的 creativeDecision 等覆盖|按已有覆盖规则绑定；strategicNegatives 的 trim/去重显式记录来源路径和原索引|
|未被覆盖的分析内容|保留 analysis_packet / unconfirmed；不能因其他字段获得确认而继承确认状态|
|确认覆盖前的全部原条目|独立保存在 originalEntries；覆盖/删除不从审计账本消失|
|系统目标程序|system_target_program、not_user_confirmation、程序指纹及任务引用；与用户确认和实验来源分开|

同字段重复文本分别保留索引与不同条目指纹。原 Packet、有效 Packet 或确认条目删除、改写、排序变化都使旧绑定失效；测试验证不改变原 Packet。

输出保存稳定 binding ID、实际输出路径/索引、输出范围、原范围、sourceEntryIds、完整父范围、类型/模态、sceneScope 与 visibilityAuthority。画外记录 withheld，review/unresolved 阻断正式执行；原始未知/条件单元即使未进入输出数组，仍经原语义 gate 检查。

本轮不是所有 Renderer 派生字段逐条来源映射的完备证明。材料/照明等保留现有转换，并纳入原始条目账本和整个 IR 的封存；其所有转换的细粒度映射还未逐项审完。部分非恒等建筑/品牌改写保守留在 review，未通过自动放行恢复历史结果。现有新增测试只证明被测样本，不能据 31/31 宣称所有输入已闭环。

## 4. FTT proposed 路径

独立测试从实际 `makeFinalDesignFixture()` 取得 fixture.A、deltas 和 dining variant，逐条核对所选 scene 的 `before`，重放 `after`，最后核对整个最终 Packet。遗漏 delta、before 冲突、最终改写都返回明确的 `SPACE_EVIDENCE_INVALID`。共同变更及镜头覆盖按账本顺序处理，不凭文本匹配选来源。

`functionalRelationships[0]` 的原文仍是：

```text
Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route
```

证据到达 Compiler 后仍保留：

- `sourceKind = offline_experiment_delta`、`sourceOwner = offline_experiment`。
- `sourceStatus = proposed_for_human_review_not_confirmed`、`confirmationStatus = proposed`。
- `knowledge:rks-observation-5`、`human_selection:golds[0].reason`。
- 原数组索引 0、准确 fieldPath、完整原文/父范围及 delta 记录 ID。

审核结果为 `review_only / dispatchable=false / executionEligibility=denied / payload=null`，不包含 `taskContract` 或 `finalPrompt`。同一实验证据交给正式 Compiler 会被拒绝。knowledge/human_selection 不产生确认。本轮没有将所有三镜头和重复覆盖的 FTT 组合都跑完，不能将这一个独立测试等同于历史 FTT 全部恢复。

## 5. 四个维度与系统程序

来源绑定成功不等于语义通过；真实用户确认不等于已验证物业事实；semantic PASS 不等于 current_shot；镜头许可也不等于任务有执行资格。Compiler 在正式返回前分别核对这些维度；缺证据的旧输入不默认 confirmed。

reference-first/continuation 的系统程序通过注册表生成的预期投影与实际输出逐项核对，并绑定程序和任务标识。continuation 提供虚构目标程序会被拒绝。测试证明程序条目仍是 `not_user_confirmation`，且旧语义/镜头门禁继续生效：咨询程序中的部分措辞仍被阻断。没有为了系统来源增加语义白名单或改 Stage A；也没有证明这两种模式正式编译成功。

Art-direction 既有独立授权流程没有扩权为本轮 design-direction 的授权证明。新的统一空间证据入口目前要求 design-direction 的真实 capture；未完成这条旧模式的兼容验收，不将失败掩盖为通过。

## 6. 实际测试结果与停止点

|执行|结果|记录|
|---|---|---|
|第一步受信捕获/任务绑定|11/11|[step-1-tests.txt](./step-1-tests.txt)、step-1-diff.patch|
|第二步原/有效 Packet 绑定|15/15|[step-2-tests.txt](./step-2-tests.txt)、step-2-diff.patch|
|Projection/Adapter/Compiler 初次纵向批次|25/25|step-3-4-tests.txt；此批次共同接线，不能称作分开的两个阶段验收|
|补充系统程序、重复来源及执行前复核|31/31|vertical-tests.txt|
|增加建筑/品牌等输出绑定后|31/31|[vertical-final-tests.txt](./vertical-final-tests.txt)、vertical-diff.patch|
|Stage A visible / field / scope|14/14、101/101、158/158|对应 stage-a-*.txt|
|E1G|46/46|e1g.txt|
|E1E 原探针|19/19，unsafeCompletion=failed，模型回调 0|e1e.txt、e1e-probes.json|
|E1F **不完整命令**|128：54 PASS / 74 FAIL|[e1f.txt](./e1f.txt)、regressions.json；遗漏 evidence-boundaries 的 31 项|
|跨行业完整组、FTT 原套件、B1、完整工作流、Golden|NOT_RUN_AFTER_STOP|未在保护回归后继续执行；部分同名内容在 E1F 子集中出现，不等于完整组运行|
|repo:verify|FAIL，退出 1|[repo-verify.txt](./repo-verify.txt)；仅仓库冻结/治理核对，非后续行为测试|

regressions.json 保存实际命令、时长、计数和摘要；log-hashes.json 保存日志原字节摘要及文本归一化摘要（CRLF→LF，E1F 另去除行尾空白）。初次 repo:verify 输出含 npm 更新提示，保留在 repo-verify-initial.txt；随后治理核对明确关闭 updater、设置 npm offline 并预加载网络阻断。没有把 npm 提示当作真实 Provider 行为证据；也不能从首次 npm 输出单独证明整个进程的网络事件数。行为测试均预加载现有网络阻断，后续回归子进程还移除凭据相关环境变量；新增测试明确核对尝试计数 0。

## 7. 新增与保留失败逐项归因

[failure-attribution.json](./failure-attribution.json) 列出全部 74 个实际失败、原始错误码、历史对照及遗漏的 31 个断言。历史 Stage A 日志只用于名称/结果对照，读取时先核对已提交 checkpoint 的 SHA-256；它不是本轮重新运行的基准。

|分组|数目|实际原因和限度|
|---|---|---|
|新增旧调用缺少证据|66|历史直接 compile/compileSpacePrompt 调用没有新私有身份，报 missing_or_forged_capture/binding。符合不能缺证据运行的新增安全要求，但原先通过的后续范围/owner 断言没有执行到，不能宣布旧安全回归仍通过，也不能自行改断言迁移|
|新增真实确认服务路径被阻断|1|`automatic suggestion can be confirmed without field rewriting and reaches actual offline image adapter` 经实际服务到 Compiler，报 SPACE_EXECUTION_EVIDENCE_BLOCKED。是明确新增拒绝；TAP 未序列化具体 gate 子项，停止后未追加运行探针，细项根因仍待核实|
|原有失败在更早 gate 被拒绝|7|原 Stage A 失败名称仍失败，但当前原因变成缺证据；不能据此核销原投影/系统程序问题|

C1–C5 争议保持独立：C1 所在的证据边界文件被本次错误命令遗漏，未运行；C2–C5 的原用例在更早证据门禁拒绝，未运行到原争议断言。原有其余三项范围/系统程序失败同样被更早 gate 遮蔽。原 8 个失败没有任何一个被本轮宣告修复。

依照停止条件，未为消除这些失败补兼容 confirmed、跳过 gate 或修改历史断言。原先 PASS 的 67 个用例本轮 FAIL，哪怕多数是接口要求改变，也不能把它们从新失败总数扣除。真实服务拒绝至少说明纵向合成成功样本还不能代表已接受的真实服务用例。

## 8. 原 28 项未展开用例

[unexpanded-tests.json](./unexpanded-tests.json) 保存 18 项 fidelity、10 项 final-design 的完整原名称。本轮均为 **NOT_RUN_AFTER_PROTECTED_REGRESSION / executedThisRound=false**。没有运行旧文件初始化，更没有吞初始化异常将它们变成 pass/skip。独立新增的 FTT 证据测试不能替代这 28 个历史断言。它们仍阻止 B1T 完整验收。

## 9. 冻结、仓库门禁与审核结论

[preservation.json](./preservation.json) 列出五个修改文件的基准 blob/摘要、一个新增生产模块，以及 165 个受保护文件的当前摘要与 Git diff 核对。两个 Stage A semantic 文件、确认所有者、原测试/helper、Provider/Seedream、Prompt、Golden、完整性清单均保持基准内容。原始项目文件写入 0、真实 Provider 调用 0、真实模型分析/生图 0。

repo:verify 的 Repository Contract Guard PASS；isolation 报新增证据模块未列入完整性记录，以及基准已有 `analysis-completion-orchestrator.js` 漂移。manifestDrift 另外记录获准生产修改与清单的差异；没有修改清单隐藏它们。链内后续 current-flows 等命令未执行，不能声称通过全门禁。

新增产物只有获准的证据模块、独立离线测试及本报告目录。报告中的 diff、日志、逐项失败和冻结记录无生产调用关系；未新增 Provider/Prompt/Golden/持久化服务或同步机制。

**结论：只能交付 BLOCK 的候选代码及问题证据供人工审核，不能作为已通过 B1T 的版本进入下一阶段验收。** 后续需要先审核缺证据的历史纯检查调用如何迁移，以及真实确认服务新增拒绝的具体来源/镜头子项；不能先改历史断言。之后还须完整重跑漏掉的 E1F 文件、跨行业、FTT/B1、原 28 项、全工作流及所需 Golden/仓库闸门。没有进入 E1H、真实 Provider、合并或发布。
