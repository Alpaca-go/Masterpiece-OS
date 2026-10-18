# 九州美学受控真实生图调用预检

状态：**等待用户最终执行确认，真实模型调用 0 次**。2026-10-17 在 `fix/visual-workflow-image-quality-regression`、源码提交 `78838062c9cd6c985aa3314d3a464939d5ef2098` 完成离线预检。只新增本报告；没有修改生产实现、完整性摘要、Golden、人工质量状态或原项目。

## 独立任务与来源

本次记录：[preflight.json](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/preflight.json)。测试 ID `fe2d2e89-b09b-45e6-905d-f668a6a25d64`，正式任务 ID `d9287f98-01ce-419c-ab01-7e4f04b70f4d`。

在独立测试目录一次性复制原项目的 project.json、input 和 project-context；没有复制历史生成目录或已验收图片作为生成参考。原项目仅用于读取。用户确认定位只写入独立任务的 `currentInstruction`：

> 九州美学是具有艺术展馆空间气质的高端医美机构，艺术表达、建筑、材料与空间体验需要整体协调，同时保留真实的接待、咨询、隐私与医疗运营功能。

[任务合同](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/task-contract.json)、[完整来源及编译追踪](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/source-trace.json) 保存定位与原始 Packet 的区别：本轮定位是可追溯用户输入；原有模型分析、系统推导和未知项沿用审核来源分类，不提升为用户确认或素材事实。人工验收图只用于后续人工对照。

原项目全部 46 个文件与上一轮离线审核清单一致，且本次读取前后哈希一致：[读取前](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/original-project-inventory.before.json)、[读取后](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/original-project-inventory.after.json)。没有修改原 Packet 或历史兼容字段。

## 正式编译与请求核对

实际执行独立包原有 `createShortChainGenerationService.compile` 和 `start({dryRun:true})`，进入原有 `createImageService.startCompiledCreativeTask`，保留标准路线的编译、Logo、上下文及空间质量检查；随后由原有模型适配器编译 Provider 请求。网络被禁止，凭证只检查文件存在，没有读取或复制密钥。dry-run 状态为 `ready`，不是生成成功。

| 项目 | 预检结果 |
|---|---|
| Provider / 模型 | volcengine / `doubao-seedream-5-0-pro-260628` |
| 协议 / 适配器 | `seedream-image` / `seedream-5.0-pro` |
| Endpoint | `https://ark.cn-beijing.volces.com/api/v3/images/generations` |
| 场景 / 镜头 | reception / entrance_view |
| 路线 / 构图 / 尺寸 | standard / 16:9 横向 / `2K` |
| 输出数量 / 生成参考图 | 1 / 0 |
| Logo | post_composite；此次不自动合成，不把 Logo 注入生成参考图 |
| 请求其他参数 | `response_format=b64_json`、`watermark=false`；不添加 n、image 或组图参数 |
| 与上一轮真实请求核对 | 除 Prompt 外，body、method、URL 完全一致 |
| 已审核定位与正式任务定位 | 完全相同 |
| 正式编译 Prompt 与生成入口 Prompt | 完全相同，并与已审核离线 Prompt 逐字节相同 |

2K 使用上一轮相同的 Provider 尺寸档位，16:9 由同一适配器加入自然语言请求；上一轮实际输出 2816×1584，本轮返回尺寸须如实记录，不能提前保证固定像素尺寸。

- [正式编译完整 Prompt](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/final-prompt.txt)：SHA-256 `108dd9aacf66ad53b76056d23e82b20b35b4ee7c06987399dfb1ef63def18761`。
- [实际将发送的完整 Provider Prompt](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/provider-prompt.txt)：含原适配器前缀；SHA-256 `c003baed2bce4bd448cb5357e1f04db033e6813e117f6359127ca9b2ea294d1b`。
- [不含鉴权头的完整请求](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/provider-request.json)、[标准生成入口输入](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/generation-input.json)。后者为预检 dryRun=true；最终授权后才允许以相同任务及 Prompt 执行 dryRun=false。

正式 Prompt 7,793 Unicode 字符，**超过 7,500 质量软预算，softBudgetExceeded=true**；适配器前缀后 7,896 字符，仍低于当前配置 12,000 硬限制。未截断、扩容预算或删除运营约束；软预算超限仍是本轮人工审查需要观察的风险。

## 单次调用与费用申请

根据 2026-10-17 查询的[火山方舟官方价格](https://docs.volcengine.com/docs/ark/model-pricing?lang=zh)，该模型单图输出超过 261 万像素为 **¥0.60/张**。本次 2K、无输入参考图，预计费用 **¥0.60**；申请的执行器费用上限也是 **¥0.60**，不假定折扣或赠额。此为执行器请求预算，不声称设置了 Provider 账户级硬限额。

待批准的调用计划是 **1 次生图、0 次额外模型验图、0 次自动纠正、0 次重新生成**。现有公开 `visual-workflow:generate` 使用 `startValidated`，会追加模型验图；因此本次受控执行拟调用其原有 `start` 标准生图部分，完整保留其中前置门禁和同一 image service / adapter，生成后直接交人工审查，不修改生产入口或验图实现。离线已验证该入口最终 Prompt 与审核结果一致。本计划在最终确认范围内明确披露，不将其称为已完成公开入口的端到端真实验证。

执行时须在首个请求发送前持久化调用次数及 ¥0.60 预算占用，只允许匹配预检 URL、body 和 Prompt 哈希的一次 POST；无论超时、网络错误、限流或返回失败，均停止且不重试。所有额外模型请求禁止。若配置、源码完整性、原项目哈希、Prompt 或价格发生变化，先停止重新提交预检。现阶段只完成离线预检，尚未启用真实调用执行器。

## 隔离、结果保全与验收边界

[实现校验](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/implementation.json) 通过，implementationDigest 为 `6bb6c099b5120c7a5209e8048dc4bd3f4dde115b04e6fb3ab4aeff3ea456f71d`；人工质量状态仍为 `pending-separate-quality-repair`。本轮 `verify:visual-workflow-isolation` 通过：[日志](E:/image-quality-regression-evidence/design-fidelity-isolation-preflight.log)。此前全部工程门禁见[完整门禁恢复报告](./cross-zone-gate-recovery-review.md)；本次没有代码行为变化，不把预检或历史工程通过等同于视觉质量恢复。

最初三张验收图已只读登记 SHA-256：[对照图清单](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/human-reference-inventory.json)。它们不会发送给 Provider，观察内容不会写入 Packet。最终获准执行后，应另建真实 run 记录，保存 Provider 返回的原始高清图片及其哈希、正式工作流输出、实际调用/耗时/费用记录，并提供与三图并排的人工对照材料；不覆盖 dry-run、原项目或历史图片，不自动合成、冻结质量或更新 Golden。

当前停在最终执行确认之前；不合并、不发布。
