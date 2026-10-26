# RKS-02E1B · 双请求监护器离线验收

日期：2026-10-26（Asia/Shanghai）。基线：`16ede4188d56cdcd22834dbc4131efbeef2e5f29`。开发分支：`codex/rks-ftt-two-dispatch-guard`。

**监护器离线实现与反例测试通过；尚未获得真实分析授权。完整仓库回归存在基线失败，不能宣称全仓全部通过。**

实现使用既有 `createVisualWorkflow({analysisProviders})` 与独立 Qwen reasoner 的 client 扩展点，源码位于 [实验工具目录](../../tests/restaurant-knowledge/two-dispatch-guard/)。没有修改生产入口、Pipeline、Provider、schema、空间语义、充分性、项目资格门禁或生产完整性摘要。无自动执行命令、真实凭据读取、全局配置回退或恢复入口。

| 文件 | 职责 |
| --- | --- |
| `guard.mjs` | 会话一次性运行、同一 reasoner/client 监护全部阶段、精确请求与素材核验、两次总额、串行、终止锁、usage/费用依据检查 |
| `ledger.mjs` | 永不自动删除的独占 claim、发送前同步原子落盘、终止哨兵、blocked attempt 文件、篡改/重启拒绝 |
| `freeze.mjs` | 使用原 Provider 编码器做拦截式纯离线请求摘要采集；不返回模拟模型结果，不创建分析 Run |
| `single-post-transport.mjs` | 原生 HTTPS 单次 POST；没有重定向、重试或 fallback；底层 HTTP 可被离线假传输替代 |
| 三组 `*.test.*` 与 `fixtures.mjs` | 合成项目、假 Provider、假 HTTP、跨进程与故障注入验证 |

监护器只放行冻结的 **DCD 首次 → UVU 首次**，发送前登记最多两次预算。修复、重试、陌生阶段、配置/项目/素材变化、并发、第二个项目或重复点击都不能增加派发。已用额度不会因异常、取消、超时或未知状态返还。两次响应均通过仅代表传输会话关闭，**不是实际冯烫烫分析成功**。

现有隔离项目 `d9ccf5c1-10f3-4c43-b0a7-cd64b62f4627` 仍为 `ready / missing`；没有给它运行分析、写入测试结果或创建方向确认。原用户冯烫烫项目未变。测试仅使用临时合成项目，测试中的 completed/ready 和假 request ID 不进入真实项目。P7B、B1、RKS Shadow、Golden、质量验收状态不变。

## 验证结果

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 监护器、正式 Pipeline 集成、底层传输 | 52/52 PASS | [guard-tests.txt](guard-tests.txt) |
| 独立视觉工作流全套测试 | 311/311 PASS | [owned-regression.txt](owned-regression.txt) |
| repo:verify（含 current-flows、双向隔离及反例） | PASS，最终独立执行 exit 0 | [repo-verification.txt](repo-verification.txt) |
| 根 npm test（由 repo:check 执行） | 1699 PASS / 2 FAIL，基线旧资产路径违规 | [repo-check.txt](repo-check.txt) |
| CLI | 40/40 PASS | [cli-tests.txt](cli-tests.txt) |
| Shared Runtime | 14/14 + 1294/1294 PASS | [runtime-tests.txt](runtime-tests.txt) |
| Node Web Host | 14 PASS / 1 FAIL，既有通道数期望落后 | [web-runtime-tests.txt](web-runtime-tests.txt) |
| Web typecheck + build | PASS | [web-build.txt](web-build.txt) |
| 实际 Node Host + 浏览器 smoke | PASS，Provider calls=0 / business writes=0 | [web-smoke.txt](web-smoke.txt) |
| Golden runner | PASS，Provider calls=0 / auto-updated=NO；保留原 NOT_READY/NOT_APPLICABLE 状态 | [golden-tests.txt](golden-tests.txt) |

根测试的两项失败针对基线已有的两份 `review.md` 和五张截图。Node Host 测试仍断言独立通道数 20 / 总数 256，当前正式代码已为 21 / 257，浏览器 smoke 实测同样为 257。相关旧资产、测试和生产实现与基线相同，未为通过测试删除旧证据或改期望；见 [baseline-and-data-proof.json](baseline-and-data-proof.json)。`repo:check` 在根测试失败后短路，后续 CLI、Runtime、Golden、Web smoke 已分别执行，不能把短路当作后续通过。

另处理了一处上轮报告的文本编码问题：E1A `source-readonly-proof.json` 中一个任务文件名被密钥规则误判。只将任务名称中的一个字符写成 JSON Unicode 转义；JSON 解析后的全部路径和哈希逐值相等。同步更新的是 **E1A 报告文件 SHA256 索引**，不是生产 `implementation-integrity.json`、Prompt digest 或 Golden。密钥守卫及 allowlist 均未修改。初次失败保留在 [repo-check-initial.txt](repo-check-initial.txt)。

## 交付与停止

- [持久化与终止状态设计、边界和测试映射](design-and-acceptance.md)
- [绑定真实隔离项目的候选配置](candidate-scope.json)：未授权、未冻结真实请求、未创建真实会话账本
- [费用风险和最终授权清单](authorization-checklist.md)
- [最终结果](validation.json)、[产物摘要](artifact-sha256.json)

本阶段真实 Provider 请求、真实分析、真实生图、模型校验、真实自动重试均为 **0**。离线故障测试会主动触发被拒绝的重试尝试，并记录为 blocked attempt；它们没有发送到模型 API。本次不合并、不推送部署、不发布。RKS 继续保持 Shadow 原型。等待人工审核及单独真实分析授权。
