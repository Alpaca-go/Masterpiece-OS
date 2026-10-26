# 最终用户授权文本 · 待用户明确同意

**此文件是拟授权文本，不代表用户已经授权。** 本轮只准备、冻结和离线验证，不能因模板中使用第一人称或 JSON 中有 true 就执行。

请用户审阅本目录六项交付后，明确批准以下完整范围。以下文本也可通过回复“我同意本目录 authorization.md 中绑定下列 Policy 和 Source Manifest 摘要的完整 RKS-02E1C 授权范围”进行明确引用；含糊的“继续准备”不视为真实派发许可。

> 我已审阅 RKS-02E1C 请求冻结清单、DCD/UVU 完整文本与全部实际上传附件证明、唯一执行器接线审查、模型和费用风险说明。
>
> 我选择保持模型别名 `qwen3.6-plus`，配置 Provider `dashscope`、协议 `openai-chat-multimodal`，仅使用完整北京 URL：`https://ws-1miaebhuom22vyxa.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions`。不改为日期模型，不改变原请求的 `stream=false`，不新增或修改 thinking、`enable_thinking`、`max_tokens` 或 `thinking_budget`。
>
> 我仅授权隔离项目“冯烫烫” `d9ccf5c1-10f3-4c43-b0a7-cd64b62f4627` 进行一次正式 `createVisualWorkflow` 的 analyze 操作，输入为已冻结的项目记录与 10 张原始素材，并仅允许已冻结的 DCD 总览图/五张细节图及 UVU 十张原图的 JPEG 上传优化字节。
>
> 授权绑定来源提交 `3d7fe3b8355266ce84a175fb61a3b53fbb37e360`、Policy SHA256 `19d5cfacf6f1b839cad4e0be80b68cc7019f32db64244c8a93faac54b0182fc6`、Source Manifest 文件 SHA256 `a27a7649f3106ac1da0014a365c4182e58c7360b6a6d5d5010d0b321b205db12`。任何身份、输入、素材、源码或请求 pin 变化都应停止，重新提交审阅，不自动重新冻结来继续执行。
>
> 唯一会话为 `rks-02e1c-ftt-3d7fe3b8-once`，唯一 ledgerRoot 为 `E:\Masterpiece-OS-Main-Publish-20261015-Verified\.codex-smoke\rks-02e1b\real-analysis-budget`。必须通过本次审阅的 composition、同一个 `analysisProviders` 监护器和原生单次 HTTPS POST 执行；发送前持久化 reservation，累计最多两次派发、严格串行、自动重试零。第三次请求发送前阻断，已用或已保留次数不退款；不得删除账本、换根、换会话、直接点 UI 或改用其他 Provider client 来补跑。
>
> 我理解两阶段各 32K 输入只是规划预算。示例费用（合计 64K 输入、32K 含思考输出约 ¥0.512）不是保证，服务端别名版本与默认值可能变化，思考及可见输出可能明显增加费用；**本次没有人民币绝对硬上限**，超时/取消/未知状态也可能已经计费。客户端没有实时账单硬停能力。费用按真实 usage 和适用账单核对，unknown 不得视为零。
>
> 异常、未知请求状态、usage 缺失/非法、模型/URL 不符、计费依据缺失、账单或计费方案出现已知未知/冲突时立即停止后续执行，保留实际证据，不自动重发、恢复或追加模型校验。接受两次派发后仍可能分析失败；不得伪造成功状态或用历史结果补齐。
>
> 仅允许使用我在执行回合明确提供的凭据或明确指定的单个环境变量作为本次密钥来源，由可信调用者显式传入；不得读取其他账户/原项目/全局凭据。本次允许为该隔离 workflow 显式创建一个加密分析 profile，不复制原设置、不添加生图 profile，任何密钥、Authorization、原始 Provider 响应均不得进入 Git 或审计报告。若凭据来源尚未明确，保持停止。
>
> 我保留 E0 已确认的社区临街四川特色小馆、亲民堂食与市井烟火气、四川地域文化、开放明档和真实经营活动；红砖、暖木、赤陶、浅抹灰仍是项目级视觉候选；温暖人工光及明确标注为设计假设的自然光。新分析仅是新证据，不自动取代这些设计目标，不能把候选/假设升级为物业事实。
>
> 此授权只包括一次正式分析及其正式 Pipeline 必要写入、脱敏执行证据。完成或失败后均停止。`saveDraft → confirm → capture → 正式 Prompt 冻结` 另按交付流程逐项审阅；不因此授权自动确认新设计、模型校验、生图、RKS 正式分类/知识晋升、修改原用户项目或 P7B/B1/Compiler/Golden/完整性摘要，也不授权 merge、部署或发布。

执行时可信调用者需将真实用户批准记录与 [authorization-template.json](authorization-template.json) 的字段绑定，不能把模板当已批准数据。该模板带 `_warning`，直接传给执行器会拒绝；移除提示字段的前提是对话中已取得上面的明确批准，而不是程序自行同意。

截至本交付：**没有用户真实分析授权，没有读取真实密钥，没有创建 claim/ledger，没有真实 Provider 请求。**
