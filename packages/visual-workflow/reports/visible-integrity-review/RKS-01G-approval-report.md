# RKS-01G · 完整性记录独立审批与回归

日期：2026-10-24（Asia/Shanghai）。起点为 `73b953c7fe92eacafa051cfb93c64dd1a6267d08`，独立分支 `codex/rks-visible-integrity-review`。

结论：**指定三项 SHA256 已按本轮用户授权独立审核并更新；专项、完整独立工作流、current-flows、repo:verify 和离线 Golden 均通过。根公共测试仅剩在精确起点独立复现的两项历史政策冲突。** 本轮没有修改生产源码或测试期待值，不作图像质量验收。

## 审批前提与精确范围

更新前确认工作树干净、HEAD 精确等于指定起点，三项源码实际摘要全部匹配 RKS-01F 的 `protected-change-approval.json.proposedSha256`。检查完整性记录中的 133 项实现文件及 4 项前端文件；只有指定三项存在预期差异，没有额外受保护文件变化。此前审批单记录的其他文件摘要也一致。

重新审阅 `d6fe157 → 73b953c` 的实际源码 diff：Compiler 仅调整真实来源映射及逐字段渲染审计；source-adapter 仅调整可见要求路由、投影后执行 owner 去重、拒绝与审计；语义分类器仅增加有界活动/效果证据及可见字段的审查兜底。既有分类优先级、场景 scope、确认/指纹、Shared 策划/迁移、Provider、配置及重试实现没有扩大修改。审核结论符合可见经营行为归属修复范围。

下表是**完整性记录**的旧值和获批新值；三份**源码本身**在本轮更新前后始终等于新值，未再次修改。

| manifest path | 记录更新前 SHA256 | 记录更新后 SHA256 / 源码审批前后 SHA256 |
| --- | --- | --- |
| src/generation-runtime/space/compiler.js | `0b90295b72f3926da8de474e7d2c8bf1ce40961003eeede4fa1fbe461f6957d8` | `9d701f3578816fe3ceb825e2ea7bc0723143fe8b62bbac8651292621765aacee` |
| src/generation-runtime/space/source-adapter.js | `ab726f3af21c98ed6fca26d2971b0ed8bd5772e18060bff1ef169817e0da92a5` | `ea9334a585f65b2af63b5da91cb9236ba2be475e00ce7da5421617596928d19e` |
| src/generation-runtime/space/semantic/separate-space-semantics.js | `714dca781a2d6e9de72a303da36a85b53818febada6b854029c0670b50ac3fb3` | `9867c041bd560bd968575deb9261f25494603b116e9a7e7ea39c15daeaf799a2` |

`implementation-integrity.json` 仅 3 行替换，完整精确 diff 见 `implementation-integrity.patch`。JSON 结构核对确认其他条目、所有属性、顺序和内容保持不变：

- `qualityAcceptance` 仍为 `pending-separate-quality-repair`。
- `extractionStatus` 仍为 `independent-current-implementation`。
- 其余 130 项实现摘要和全部 4 项前端摘要未改，校验逻辑未改。

manifest 文件 SHA256 从 `8646f6664d40f0c2de3b6428c98edaf862600ce57b6be29cf16fc95266c2c952` 变为 `23aec1826589ead04295a8aa144ef8a7ce7dad7977912e8010d9f9478986d8cd`。原生 `verifyImplementation()` 验证通过，返回 implementationDigest `d535517c22084b07d92eabc7a14b134ef0f272008d26b1cc52e0fed410fafea0`。

机器证据见 `approval-evidence.json`。这些摘要批准的是特定实现内容，**不代表人工图像质量验收通过**。

## 完整离线回归

| 命令 / 检查 | 数量与结果 |
| --- | --- |
| RKS-01F 全部专项 `visible-requirement-ownership.test.ts` | 26/26 PASS |
| 独立视觉工作流全部测试 | 176/176 PASS |
| `npm run verify:current-flows` | 文档准备 2/2、Runtime application 1294/1294；Node/Web typecheck PASS；整体 PASS |
| `npm run repo:verify` | 整体 PASS；内含文档准备 2/2、Runtime application 1294/1294、guard 56/56，合计 Node test 1352/1352；其他离线 guard 均 PASS |
| `npm run golden:test` | 5/5 PASS；Provider calls=0；Golden auto-updated=NO |
| `npm test` | 1699/1701，FAIL 仅为下述两项已独立复现的历史政策冲突 |
| 精确起点的独立政策复现 | 0/2，两个失败名称及相关文件与当前完全一致 |

所有测试数量、命令、失败名称、日志路径及日志 SHA256 见 `regression-results.json`。原始执行日志保存在 ignored 的本机 `.codex-smoke/rks-01g/`；没有提交用户项目内容、凭据或 Provider 原始响应。

## 正式入口验证

RKS-01F 被摘要 guard 阻断的五项测试现均 PASS，未绕过 guard：

1. B1 已有报告 RPC 只读返回方向建议，不创建方向记录。
2. public operations 在注册、编译、生图和 Logo 合成入口先验证获批实现。
3. generation baseline lock 阻止输入/模型/代码漂移和旧任务。
4. public Web 操作的保存、确认、编译、mock 生成、重开及分析请求失效流程。
5. 项目资料显式保存及重新分析/确认要求。

`current-flows` 中此前被阻断的两项也均 PASS：迁入项目完成分析后的 Logo 角色读取；独立工作流导入、mock 分析、报告和 mock 图片请求的离线 E2E。报告中的生成/分析都指注入的测试替身，真实模型调用为 0。Document Context 取消轮询用例在本轮完整 current-flows 与 repo:verify 中均通过，没有修改该测试。

## 两项历史政策冲突的独立复现

使用临时 detached Git worktree 精确检出 `73b953c`，检出前后均确认其工作树干净，在该工作树内独立执行 `node --test tests/repository-policy.test.js`。该命令只依赖 Node 内置模块，不安装依赖、不读取用户配置。结果为两项失败：

- `仓库不包含项目源文件或项目交付物`：两个历史 reports 目录中的 `review.md` 违反该用例的文件名政策。
- `仓库内栅格图片只能用于脱敏示例、测试、模板或已声明运行时资产`：五张既有 tracked PNG 的路径不在该用例允许列表内。

`regression-results.json.baselinePolicyReproduction` 列出测试源文件和七项历史资产的起点/当前 SHA256，八项逐一相等；当前 `npm test` 的失败名称集合也与该独立复现完全一致。没有清理历史文件、放宽政策或修改测试期待值。

保留一次执行环境干扰：首次 repo:verify 在版本检查中发现临时基线工作树内的第二份 package-lock.json。保存其政策日志及文件摘要后，核对绝对路径确在本任务预定目录、HEAD 为起点、无本地修改，移除仅该临时工作树；完整 repo:verify 重跑通过。没有更改 guard。这次失败与重跑日志均保留，未作为行为回归或完整性异常处理。

## P7B、B1、Golden 与数据不变性

审批单记录的其余 53 项保护文件再次核对 SHA256 完全一致，包括 P7B 历史记录、B1 建议与方向确认实现、基线锁、Seedream/Provider Adapter、根 lockfile、RKS 分类、知识卡、项目方向草案及根因矩阵。本轮三个生产源码也与 `73b953c` 逐字节相同。

对 Golden、evaluation、space-generator、保护配置、独立源码/Prompt、Web 独立 UI、P7B/B1 历史证据和 RKS 资产的 Git 比较均无变化，详见 `approval-evidence.json.protectedRoots`。Golden 运行只生成 ignored 的执行报告，没有改历史期望、Prompt Hash 或验收状态。

没有读取、修改或迁移实际用户项目、确认记录、模型配置或凭据；离线正式入口测试仅使用其自建临时合成存储。Seedream 5.0 Pro 配置未改；RKS 知识卡验证状态未改；没有重跑实际 P7B 或冯烫烫项目。

## 剩余阻塞与停止

剩余自动化阻塞仅为上述两个历史仓库政策冲突，应在另行授权的治理任务中处理。实现摘要审批已完成，但视觉质量仍待独立人工验收；冯烫烫图 1 的实际 Run 关联仍为 undetermined，本次不能作为其根因或视觉质量通过的证明。

实现级批准不修改项目级 baseline-lock 策略。若某个既有受保护项目仍绑定旧 implementationDigest，它会继续按既有规则 fail closed；本轮没有读取或更新这些本地策略，也没有把通用离线入口通过当作实际 P7B 项目复验。

真实分析 **0**、真实生图 **0**、真实模型校验 **0**、自动重试 **0**。未合并 main、未部署、未发布。完成后提交独立审批分支并停止，等待人工审核。
