# 持久化预算、发送边界与验收

## 接入方式和信任边界

实验 composition 使用 `createTwoDispatchGuard` 的 `analysisProviders` 传给既有 `createVisualWorkflow`。外层必须通过 `guard.runOnce(projectId, () => workflow.operations['visual-workflow:analyze'](...))` 发起；绕开外层时 provider factory 拒绝创建 reasoner。factory 每会话仅创建一次，拒绝传入其他 client/environment、不同 Provider/模型/URL。DCD、UVU、两种修复全部走同一个封闭 client，不只是给第一阶段加计数。

单次请求有两层拦截：reasoner 外层匹配阶段、完整 messages 摘要和附件文件路径/字节摘要；client 内层在真实 POST 前再次检查项目输入、原始素材、模型、完整 URL 和实际编码后的正文 SHA256。不同 Prompt 或重试提示无法借用另一阶段名通过。DCD 还绑定真实 projectRoot。input 的状态字段可由正式 Pipeline 更新，项目身份、素材、描述、Logo、语言等分析输入则固定；没有手改分析完成标志。

`freezeStage` 使用原有 Qwen encoder 和一个只捕获请求便抛错的 client，得到准确的编码后摘要。它没有网络函数或模拟模型结果；不是分析成功证据。附件包括实际总览图/细节图时也必须冻结，不能只记录 10 张原图却漏掉上传派生图。真实项目本轮尚未做新的 request freeze；候选文件的 stages=null 故不能拿来构造可运行监护器。

`createSinglePostTransport()` 使用原生 `https.request`，每次仅一次 request/end，不解析 Location、不追随跳转、不重试 429/5xx，不使用带重试的 SDK。监护器要求 method=POST、redirect=error，并将 3xx 和已跳转响应视为终止错误。离线测试可注入假 requestImpl/fetchOnce；这些是受信任的测试接缝，不是用户模型配置接口。未来真实接线必须使用已审查的原生单次传输，不得塞入内部重试的自定义传输。任意恶意代码或人为删除/换根不在可信应用代码的保证范围，不能因此授权未经审阅的执行器。

## 账本和停止语义

| 文件/状态 | 规则 |
| --- | --- |
| `claim.json` | 同一固定 ledgerRoot 独占 `wx` 创建并 fsync；带 sessionId、projectId、policy SHA256。成功、失败、取消、崩溃后均不删除，不按 PID/超时释放 |
| `ledger.json` | 每次保存写新临时文件、fsync、rename；发送前保存 reserved_in_flight，之后才允许 HTTP。无写盘重试、无额度返还 |
| `requests[]` | 会话/项目、模型、Provider、北京 URL、DCD/UVU、序号、正文与附件摘要、登记/发送/结果时间、Provider request ID、usage、费率依据和估算费用、终止原因 |
| `terminal.json` | 永久终止哨兵。超时、未知、异常、缺 usage、费用依据不可用、配置变更或并发冲突时建立；没有自动解除接口 |
| `blocked/*.json` | 每个拒绝尝试的单独原子记录，含原因、时间和会话/项目。请求阶段入口可记录待请求序号及 messages/声明附件摘要；未编码正文的拒绝如实记录 bodySha256=null |
| `closed` | 两次响应完成并且外层操作返回；仅是会话账本状态，不单独赋予项目 completed/ready 或生图资格 |

预算按发送前 reservation 计费保留，最多两个。即使失败发生在发送前最后时刻，已登记的槽位也不退回。外层同步设置 busy，第二个调用不会排队变成隐性补跑，而是终止；同一 ledgerRoot 的另一进程/第二个项目无法夺取 claim。重复 sessionId、新 sessionId、不同项目均不能重开此根；ledgerRoot 本身也在 policy 中绑定。已存在账本但 claim 缺失属于损坏状态，拒绝覆盖。

整个会话共用 AbortController，超时或取消后外部终止锁独立于 Pipeline 的 catch。迟到响应不能把失败改为成功、不能补 usage 解锁或归还额度。现有编排可能继续少量本地错误处理/修复尝试；每次仍会被终止锁拦截并记账，绝不会重新获得网络权限。正式 Pipeline 的失败处理继续决定项目失败状态，不用强杀后手改状态。

断电/磁盘故障下不承诺“所有拒绝日志都一定能落盘”：存储故障时立即停止，内存快照保留 persistenceFailure；已有 claim/reservation 不自动重用。若连 terminal/blocked 都无法写入，不谎报它们已持久化；重启仍因 claim 已存在而拒绝。操作员不得删除文件或选择新根来恢复额度。底层文件系统和磁盘持久性属于运行环境前提。

只持久化摘要、允许字段的 usage、计费依据和 request ID，不存 API Key、Authorization、完整请求正文/图片 Base64、原始 Provider 响应或异常原文。费用值为公开费率估算，不冒充已对账账单。

## 52 项测试覆盖映射

| 要求 | 离线证据 |
| --- | --- |
| 两次合法请求 | guard 测试验证 reserve 已在磁盘后才调用假 HTTP；正式 Pipeline 集成测试用两次假响应完成合成项目 |
| 第三次 / catch 后再试 | 连续三次拒绝、持久化 blocked 文件、传输计数仍为 2；正式决策修复 catch 同样被拒 |
| UVU JSON 重试 | guard 在返回上层前检测 JSON 错误并锁定；正式 Pipeline 不进入额外 HTTP |
| 空间语义修复 | 正式 Pipeline 的空间语义门禁失败，第三次请求拒绝，合成项目不能 completed |
| schema / 充分性 | 移除真实 schema 字段 materialLanguage 触发正式修复路径；无法靠预算逻辑越过充分性门禁 |
| 异常 / usage / 费用 | 500、连接异常、无效响应、空内容、截断、缺 ID、模型不符、缺/非法 usage、缺费用依据均拒绝后续发送 |
| 并发 / 重复点击 / 第二项目 | 请求并发与已有 HTTP in-flight 时第二调用、重复 runOnce 和跨项目调用均拒绝 |
| 重启 / 崩溃 | 子进程保存 reservation 后直接退出；另一进程在新 sessionId 下也无法重开；孤立账本拒绝覆盖 |
| 素材 / 项目 / 模型 / 阶段变更 | 原图、intake、model、provider、URL、client、stage、Prompt、bodyPin、ledgerRoot 漂移均发送前拦截 |
| 落盘失败 | reserve 写失败时 HTTP=0；response 写失败时已发送请求不退额、不续跑 |
| 超时迟到 | 模拟远端不服从取消且晚返回成功，终止和无 usage 状态不被成功覆盖 |
| HTTP 隐性调用 | 原生单次传输用假 request 测试 200/302/307/429/500、连接错误和取消，始终最多一个底层 request/end |
| 正式资格不变 | 未分析合成项目的 confirm 仍 ANALYSIS_REQUIRED；不完整报告在首次后即失败 |

运行方式：`node --import tsx --test packages/visual-workflow/tests/restaurant-knowledge/two-dispatch-guard/guard.test.mjs packages/visual-workflow/tests/restaurant-knowledge/two-dispatch-guard/integration.test.ts packages/visual-workflow/tests/restaurant-knowledge/two-dispatch-guard/transport.test.mjs`。无真实环境变量、用户凭据或机器本地测试素材依赖。
