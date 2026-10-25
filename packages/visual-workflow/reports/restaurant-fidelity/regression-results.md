# RKS-02B 完整离线回归记录

本轮要求的新增专项、受影响模块完整回归、repo 和 Golden 均完成并通过。另行执行的仓库政策测试仍保留两项历史失败，不将其写成全仓测试通过。

| 执行范围 | 结果 | 完整日志 |
| --- | --- | --- |
| RKS-02B 新增专项 | 18/18 PASS | [专项](logs/fidelity-tests.txt) |
| 餐饮知识模块全部测试 | 50/50 PASS | [餐饮模块](logs/restaurant-tests.txt) |
| 独立视觉工作流全部测试 | 211/211 PASS | [完整工作流](logs/workflow-tests.txt) |
| npm run repo:verify | PASS；文档准备 2/2、Runtime application 1294/1294、仓库 guard 56/56；其余 guard 及 Node/Web typecheck 均 PASS | [仓库门禁](logs/repo-verify.txt) |
| npm run golden:test | 5/5 PASS；Provider calls=0；auto-updated=NO | [Golden](logs/golden-test.txt) |
| node --test tests/repository-policy.test.js | 0/2；仅原有两项政策冲突 | [历史政策检查](logs/repository-policy.txt) |
| 首次 npm run repo:verify | Golden 读取边界检查失败，已在测试侧解决后完整重跑 PASS | [初次执行](logs/repo-verify-initial.txt) |
| 报告元数据加入后的 npm run repo:verify | 同一宽匹配规则命中 JSON 中描述前次错误的诊断文字，改用结构化原因标识后完整重跑 | [元数据执行](logs/repo-verify-report-metadata.txt) |

各组数量有包含关系，不应相加：18 项包含于餐饮 50 项和工作流 211 项。工作流基线为 193 项，本轮新增 18 项。六类 RKS-02A 反例原输入保留，并额外验证非四川日本料理不会接受 FTT 知识。

命令、计数分组、退出码和每份完整日志的 SHA256 见 [结构化结果](regression-results.json)。提交的完整日志将 Windows CRLF 规范为 LF、纯空白行规范为空行，诊断内容保留；同时记录本机原始日志路径与原始字节 SHA256。日志来自离线测试及替身执行，里面的模拟分析/图片流程与随机测试 Run ID 不代表用户真实项目。本轮没有执行全量根 `npm test`，不借历史阶段的执行结果充当本次运行。

首次门禁拦截位置为新增 `ftt-fidelity.test.ts` 对自身 Fixture 构造器源码的冗余读取；现有规则按 readFile 后文出现 fixtures 的宽匹配触发。移除了这项源码读取和自省断言，保留完整历史 Packet 的字节一致性、SHA256 与差异重放检查。没有修改 guard、生产代码、编译语义期待、Golden 或完整性摘要。初次失败日志完整保留。

在加入执行报告后，同一规则也扫描到 JSON 中对前次错误的英文说明；诊断文字没有执行读取。结构化结果改用简短原因标识，详细经过保留在本 Markdown。该次失败日志也保留，门禁规则未改。

历史政策失败分别涉及：两个既有 `reports/*/review.md` 文件名，以及五张既有 tracked PNG 的位置。八项文件（含政策测试本身）均与本次冻结起点逐字节一致，详细 SHA256 列于结构化结果；失败名称和资产也与 RKS-01G 独立基线复现一致。本轮没有清理历史文件或放宽政策。

正式入口验证由 repo:verify 内完整 current-flows 完成，包含独立工作流迁入分析后的 Logo 角色读取与导入、mock 分析、报告、mock 图片请求的离线 E2E。完整工作流的公开操作实现完整性门禁、B1 只读建议、保存/确认/编译/重开等测试均通过；这些测试证明既有入口没有被本轮实验改动破坏，不代表已经将 RKS 接入生产。

全部正式源码、Prompt、B1/P7B、配置、完整性记录、Golden、人工验收及知识状态保持起点不变。所有真实模型相关计数与自动重试为 0。自动化回归通过不解除 [人工清单](human-checklist.md) 中的输入阻塞；仍需独立审核生产变更提案和材料参数。
