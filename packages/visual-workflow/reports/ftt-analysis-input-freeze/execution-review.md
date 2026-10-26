# 唯一执行器接线审查

审查对象：[composition.mjs](../../tests/restaurant-knowledge/analysis-input-freeze/composition.mjs)。这是实验 composition，不是正式 UI 路由；没有修改受保护生产代码或添加全局 Provider client。

入口 `executeAuthorizedOnce({authorization, apiKey})` 没有 CLI 或自动调用。导入模块不会创建工作流、读取凭据、写账本或联网。缺失授权、直接传入带 `_warning` 的模板都会拒绝，离线核验见 [offline-audit.json](offline-audit.json)。人类授权的真实性依赖可信调用者与对话记录；JSON 布尔值本身不构成授权。

接线顺序：

1. 验证人工授权所绑定的 Policy SHA256、source-manifest 文件 SHA256、固定项目/会话/ledgerRoot，以及别名漂移和无人民币硬上限的接受范围。
2. 核验源码、项目完整记录、intake 和 10 张素材；已存在任何 live ledgerRoot 则停止。重新用相同本地 builder 和原编码器生成两个 pin，与已冻结 pin 完全比较。没有模型调用。
3. `createSinglePostTransport()` 使用默认原生 `https.request`，不接受调用者 transport/requestImpl，不跟随跳转或重试；源码在冻结清单内。
4. `createTwoDispatchGuard({policy, scopeRoot:policy.ledgerRoot, fetchOnce})`，传输包装仅在每次原生 POST 前再核验源码。**预算 reservation 已由 guard 持久化，再允许包装进入一次原生 HTTPS POST。**
5. `createVisualWorkflow({root:policy.workflowRoot, analysisProviders:guard.analysisProviders, fetchImpl:deny, validationReasoner:deny})`。唯一同一个 `analysisProviders` 创建唯一 reasoner，DCD/UVU/修复都通过其封闭 client。图片传输和模型校验被拒绝。
6. 仅在授权范围内为隔离根显式创建分析 profile，凭据由调用者传入；不读取环境变量、不读全局/原项目凭据、不导入原设置，不创建生图 profile。隔离根 profiles 非空则拒绝，不覆盖。凭据加密存于 ignored 的隔离工作流，授权文本单列此写入权限。
7. 唯一分析调用为 `guard.runOnce(projectId, () => workflow.operations['visual-workflow:analyze']({}, projectId, true))`。没有直调 pipeline 绕开正式门禁。`true` 强制真实 reasoning，禁止把缓存或历史结果冒充本次成功。
8. `closed` 后还核验真实项目 `completed / ready` 和正式报告路径。报告/结构化校验由正式 Pipeline 决定，不手改状态。只返回脱敏摘要，然后停在人类证据审阅边界，不执行方向写入、Compiler、生图或模型校验。

## 控制结果

| 要求 | 实际保证 / 限制 |
| --- | --- |
| 同一项目与根 | Policy 固定 E1A isolated workflow/project；无 root/project 参数 |
| 同一会话 | `rks-02e1c-ftt-3d7fe3b8-once`；没有 session 参数 |
| 同一账本 | 沿用 E1B 候选 `...\.codex-smoke\rks-02e1b\real-analysis-budget`；本轮不存在且未创建 |
| 发送前预算 | claim 独占 wx+fsync；ledger reservation 写临时文件/fsync/rename 后才调传输 |
| 累计最多两次 | 第一次仅 DCD，第二次仅 UVU；正文、messages、附件路径/字节双层校验 |
| 严格串行 | busy/activeRun 和单 reasoner；并发调用立即终止，不排队补跑 |
| 自动重试 0 | 原生传输无重试，未知或失败终止；Pipeline 原有本地 catch/修复可能进入监护器，但没有新网络权限 |
| 第三次请求 | 在 reasoner/client 两个发送前入口拒绝并记录 blocked；不归还已 reservation 的额度 |
| 异常 / usage | guard 对模型、request ID、usage、finish_reason 和响应格式验证，任一失败终止 |
| 重启 / 换会话 | claim 永久保留，不按 PID/时间解除；新会话或第二进程不能重开同一根 |
| 接线代码变化 | source-manifest 核验及每次 HTTP 前复核；变化需要重新审阅和授权 |
| 人为绕过 | 不能防止有文件系统权限的人删除账本、修改工具或直接调用 UI；这些动作均不在授权范围内 |

模型别名服务端隐式更新不可通过正文 hash 完全检测；远端账单也不在监护器自动观测能力内，详见费用说明。存储故障立即停止，不能承诺故障磁盘上所有拒绝日志均能落盘；已有 claim/额度不重用。

## 离线证据与边界

既有 E1B 的 guard/integration/transport 三组测试合计 **52/52 PASS**。涵盖第三次请求、修复、丢 usage、未知响应、并发、重复会话、重启、写盘失败、超时迟到，以及 302/307/429/500 的单次底层传输。测试中的成功均只发生于临时合成项目，不进入真实冯烫烫数据。

本次真实项目只经历 inventory、prepareVisualAssets、空 benchmark preparation、Prompt builder 和仅拦截编码。没有触发 `visual-workflow:analyze`，没有返回假模型结果，没有实例化真实 guard，未消耗真实 claim。完整接线仍未经过真实 Provider 运行，不把离线审查称为真实分析成功或模型可用性验证。

受保护生产代码无需修改。如果后续发现现有注入点不足，或必须改生产 Prompt/Adapter/Compiler 才能运行，应停止并提出独立变更审批；不得顺带修改 B1/P7B 或刷新完整性记录。
