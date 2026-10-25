# 正式分析请求路径与硬上限审计

审计范围为独立工作流 `packages/visual-workflow/src/`。未借用创意策划、迁移的共享实现。下述次数来自源码静态审计，**本轮实际执行分析阶段数、实际 Provider 派发数均为 0**。

## 调用图与数量

`service.js:157` 的 analyze 操作 → `runtime/pipeline-service.js` → 独立注册表的同一 `baseReasoner` → Qwen 或 Volcengine reasoner → client → HTTP。单次无缓存新分析的顺序如下。

| 路径 | 现有请求数 | 源码证据与边界 |
| --- | --- | --- |
| Deep Creative Director | 1 | `runtime/pipeline-service.js:200–226`；`cli/analysis-engine/creative-director/deep-creative-director.js:44–65`。无网络重试循环；内部 session guard 在返回结果后登记，不能覆盖后续阶段 |
| Unified Visual Understanding | 1–3 | `runtime/pipeline-service.js:261–308`；原始附件与 ProjectRecord 独立请求，不复用第一阶段报告 |
| 结构化决策修复 | 0–2 | `analysis-decisions/contracts.js:1` 限两轮；`repair-planner.js:2–11` 每轮一个合并 batch；`analysis-completion-orchestrator.js:147–246`；每个 batch 调用 `pipeline-service.js:429–455` |
| JSON 解析失败重试 | 额外 0–2（UVU），额外 0–2（空间），结构化修复包含在两轮内 | 本地 `response-parser.js` 修复语法不发请求；本地解析仍失败才进入上述循环。不可将它再加为独立阶段重复计数 |
| 空间语义修复 | 0–3 | `pipeline-service.js:346–427`；初次返回必须经过空间语义校验，阻塞时执行。第三次解析失败后有确定性清理，但仍须重新通过语义和充分性校验 |
| Provider 层 | 每次 reasoner 默认一次 client 调用 | `model-runtime/qwen-reasoner.js:45–66,89–121,241–251` 及 Volcengine 对应位置；直接 fetch，无 SDK 自动重试循环；注册表不自动切 Provider |

默认新分析、10 张图片、第一阶段不命中推理缓存时，正常直接通过为 **2 次**；当前代码的逻辑 client 调用静态上界为 **1 + 3 + 2 + 3 = 9 次**。错误可以提前结束，成功不保证一定只需 2 次。UVU 重试和空间重试已包含在各自的 3 次中。

“9 次”仅指已审源码的应用层 client 调用上界，不是物理网络派发的硬保证：默认 fetch 未禁止重定向；配置也能注入其他 client。未来必须锁定实际 client 并禁用重定向、SDK/代理重试、自动故障转移。Provider 内部运算过程不在客户端可审计范围，本任务的预算单位为客户端向 Provider 提交的请求。

## 无法直接满足的控制项

- **无累计预算**：正式 analyze 入参仅 projectId/force，既没有总 dispatch 预算，也没有重试开关。把 force 设为 false 只影响推理缓存，不能当作调用控制，也不符合此次新的独立分析。
- **日志存在少计风险**：结构化编排在 `analysis-completion-orchestrator.js:242` 对整个空间修复回调只加 1，回调内部最多发 3 次。`pipeline-service.js:456,509` 汇总该计数，因此可少计 2 次。日志里的 modelCallsThisRun / retryCount=0 不是发送闸门。
- **并发不是全局 1**：一次 start 内的各请求按 await 顺序进行；active Map 按项目存于当前 service 实例。`pipeline-service.js:123–140` 的检查与 set 之间还有异步读取，不能提供进程间或跨项目互斥。
- **未知状态不是终止锁**：Provider 的超时/取消通过 Promise.race 返回，远端可能已计费；异常的 requestDispatched 信息不始终完整。结构化修复会 catch 错误并继续后续轮次，故未知状态可能引发更多调用。用户重新点分析也会新建任务。
- **安全校验必须保留**：修复在两次预算之外时，应停止并保持不具备生成资格；不能跳过 schema、证据合并、空间语义、充分性、上下文写入检查来强制完成。

## 最小受控方案（仅提案，未实现、未启用）

保留生产 Pipeline、Compiler 与完整性文件。优先使用现有 `createVisualWorkflow({analysisProviders})` 注入入口，以及 registry 的 reasonerFactory / configuration.client 扩展，在独立实验进程提供 **统一调用监护器**。不要只包装 Deep Creative Director 回调：UVU 和修复都直接走 baseReasoner，必须共用同一个监护器与持久化预算。

1. 授权文件绑定本轮项目 ID、10 张素材 SHA256、模型与完整北京 URL、源码摘要、用户费用上限；默认不授权。只允许一次新会话，独占文件锁覆盖整个运行；重复启动、换 projectId、重启或未关闭旧记录全部拒绝。
2. reasoner 外层只允许已冻结的有序阶段 `DCD 首次 → UVU 首次`。用明确的阶段上下文和预先计算的 Prompt/附件哈希白名单识别，不能仅按调用序号或模糊字符串猜测。拒绝 schemaName 为修复的请求以及 UVU 重试提示变化；未知阶段一律拒绝。所有本地校验正常保留。
3. Provider client 在真正发出 POST **之前**检查授权、序号、已消耗次数、当前 in-flight、终止锁、AbortSignal、精确 model/URL/body 指纹。将下一条请求先以 `reserved/in_flight` 状态原子持久化，持久化失败则禁止发送。预算总量 2、并发 1；序号永不回退，不因 4xx/5xx、取消、异常或“疑似未发送”返还额度。
4. 每个获准 client 只执行一次 HTTP POST，固定 `redirect:error`、无自动重试、无 fallback、无重新提交。序号 3 及以上无条件发送前拒绝。模型/地域/图片输入或参数变化不自动接受。
5. 超时、断连、进程中断、无法判定接收状态、响应模型不符、usage/费用证据缺失、解析或质量校验阻塞，均写入不可自动解除的终止锁并停止会话。远端未知请求按已消耗预算处理，不以 abort 当作免计费证据。拒绝后的本地修复尝试也单独记为 blocked attempts，不能伪装为零请求日志。
6. 监护器必须位于现有 catch/retry 逻辑之外持有不可复位的终止状态；即使内部 catch 吞掉异常也不能再次发送。若注入方式无法保证及时退出和失败状态，提交最小独立模块 fatal-stop 传播变更另行评审，**不在本阶段改生产文件或刷新摘要**。禁止用进程强杀后手改 project.json 达到 completed。
7. 完成判定同时要求 dispatch 账本无未知项、最多 2 次、阶段正确，以及正式项目 completed / ready、有效 Packet/上下文和最终报告。任何一项不满足就报告失败/阻塞，等待新的人工决定；不自动补跑。

即使以上监护器实现正确，两次上限也只能保证费用调用边界，不能保证分析成功。若第二次输出还需 AI 修复，必须停止；不得为追求成功隐式扩成第三次。

实施后、调用前必须离线验证：第三次拦截、并发竞争、跨项目共用预算、重复启动、重启遗留 in-flight、状态未知、超时后迟到响应、429/5xx、重定向、配置/图片漂移、落盘失败、取消已发生、错误被编排 catch 后再次尝试、UVU 坏 JSON、空间修复与决策修复均无额外派发，以及原有 schema/语义门禁仍阻塞。所有测试使用假的网络传输端并与真实数据根隔离；测试结果不得写入此实验项目作为真实分析证据。

本阶段停止位置：已建立待分析项目，尚未构造带真实凭据的 reasoner，尚未调用 analyze。上述监护器尚无实现和离线反例测试，因此不能仅凭“用户允许最多两次”就直接执行现有 UI。
