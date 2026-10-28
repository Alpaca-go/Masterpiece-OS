# Stage B1R — BLOCK：逐项来源证据未到达 Compiler

基准：`2e6da0fe2115880eac4323b2daa264f0c98df88c`；分支：`fix/rks-semantic-scope-and-operations`。本报告不覆盖 B1 报告。开始时 B1 未提交报告及 Stage A 本地日志已复制到 `.codex-smoke/stage-b1r-start-2e6da0fe/`，`manifest.json` 记录快照哈希。原 B1 README SHA-256 为 `b0b50952da9b9556d5a8d53695da77dec605a313e8f5eba2401a5675d5559c93`，原 Stage A checkpoint 为 `51449863f33c520d6ebcf65456203cf17b966927e2378b6134f89ec0517046bc`。

## 停止条件与反例

只读、离线调用 `makeFinalDesignFixture`，检查 FTT B 的 `mediaTranslations.spatial.functionalRelationships[0]`：

`Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route`

该值在传入 Packet 中为纯字符串；Packet 具有全局 provenance，但不包含该条逐项的 delta。原实验账本 `fixture.deltas` 另行保存此字段的状态 `proposed_for_human_review_not_confirmed`，以及 `knowledge:rks-observation-5` 和 `human_selection:golds[0].reason` 两条证据引用。该账本不在该 Packet 的 provenance 中。证据输出位于本地 `.codex-smoke/stage-b1r-start-2e6da0fe/ftt-source-input-diagnostic.json`，SHA-256：`4af787f4bbcada40d8b054ce2991b2e0f08e7459bb6b3a848569b0335291220c`。诊断没有执行 Compiler、Provider 或网络。

`ftt-final-design-fixture.ts:29-33` 分别写入 delta 和 Packet；`ftt-final-design-compile.ts:11-14` 只把 Packet 和 task 送给 `compileShortChainGeneration`；`generation/compile.js:125-134` 只传 packet、taskContract、projectContext 等既有字段给 Compiler。由此，授权的三个文件无法从该调用的输入准确取得本例逐项提案状态和引用：全局资产列表不能证明逐项引用，按文本猜测外部账本也不满足稳定绑定。可在输入缺证据时 fail closed，但这不等于恢复或证明本案例提案来源。本例触发“sidecar 无法与输出建立完整绑定”的停止条件；未用缺失信息授予确认或镜头权限。

## 代码和验证状态

三个授权生产文件均未修改，生产 diff 为空；尚无 sidecar 数据契约、Compiler 接线或绑定校验结果。未运行本阶段 Projection/Adapter/Compiler 测试序列、FTT/B1 跨行业编译、完整工作流或 Golden。此前 28 项未展开测试本阶段未复验，状态仍为未展开；Stage A 的 8 项历史失败与既有完整性清单冻结继续按原报告列账，不能当作 B1R 新结果。未对九州、reference-first、continuation、画外权限或 FTT 其他变体进行本阶段投影回放；不能声称这些情况安全或通过。Stage A 参考摘要与日志哈希保存在原 B1 checkpoint，未更改。

## 最小接口需求供人工审核

需要一个可信、版本化的逐条来源证据输入，从原始证据拥有者传到 Compiler：提供原字段路径和索引、原文、来源状态与确认状态、证据引用及其来源范围，并在投影、去重和系统目标程序生成过程中维持稳定标识。FTT 实验调用还须明确如何将实验 delta 以受控方式提供给该接口；生产链路需先确认实际证据拥有者、持久化格式及信任边界。此接口必须对缺失、篡改、冲突 fail closed，不能将全局 provenance 或字符串匹配当作逐项来源。实际需要调整的上游生产文件与数据契约需另行调查和批准，不在此次三文件授权内。

本阶段未更改任何生产文件、旧测试断言、Prompt、Golden 或完整性清单；未读取 API Key、调用真实 Provider 或生图。Stage B1R 为 BLOCK，不进入 Stage B2 或 E1H。
