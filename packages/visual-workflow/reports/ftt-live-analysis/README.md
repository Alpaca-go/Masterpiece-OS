# RKS-02E1C-LIVE · 单次正式分析执行结果

**结果：分析失败并已停止。正式项目为 `failed / missing`，没有获得 `completed / ready` 资格。两次 Provider 请求均有完整响应和 usage；空间语义门禁触发的第三次修复调用已在发送前阻断。没有补跑。**

## 执行身份与只读预检

分支：`codex/rks-ftt-two-dispatch-guard`；执行提交 `ace11a248c7e3ca5d00f486ed3e53111ba8cf576`，来源基线 `3d7fe3b8355266ce84a175fb61a3b53fbb37e360`。

项目：冯烫烫 `d9ccf5c1-10f3-4c43-b0a7-cd64b62f4627`；行业：餐饮服务 / 四川特色小吃 / 跷脚牛肉。

Policy SHA256：`19d5cfacf6f1b839cad4e0be80b68cc7019f32db64244c8a93faac54b0182fc6`。
Source Manifest SHA256：`a27a7649f3106ac1da0014a365c4182e58c7360b6a6d5d5010d0b321b205db12`。

用户明确授权的唯一密钥来源 `P14C_QWEN_API_KEY` 在当前 Node 进程存在、非空、可读取。预检只输出布尔结果，没有输出、记录或提交密钥，也未查询其他环境变量、原项目/全局凭据。全部源码、项目记录、身份指纹、10 张原图、派生附件及两阶段精确请求摘要通过只读核对。原用户项目 46 文件一致，执行前固定账本和隔离 profile 均不存在。

依据此前真实分析授权和本轮凭据来源授权，通过冻结的 `executeAuthorizedOnce` 显式传入该环境变量的密钥。只在隔离 workflow 创建一个加密分析 profile。随后正式 `createVisualWorkflow` 的 analyze 只执行 **1 次**，DCD/UVU 使用同一个 `analysisProviders` 监护器和原生单次 HTTPS POST，没有更改模型、thinking、输出参数或请求正文。

模型：`qwen3.6-plus`；Provider：`dashscope`；北京端点：

`https://ws-1miaebhuom22vyxa.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions`

会话：`rks-02e1c-ftt-3d7fe3b8-once`。账本固定为 `E:\Masterpiece-OS-Main-Publish-20261015-Verified\.codex-smoke\rks-02e1b\real-analysis-budget`，已终止并保留 claim/ledger/terminal/blocked，不删除、不换根或会话。

## 两次真实请求与费用

执行时间：北京时间 2026-10-26 **15:26:58.644–15:33:53.749**，总耗时 **415.105 秒（约 6 分 55 秒）**。

| 阶段 | 状态 | 输入 Token | 输出 Token | 总 Token | 冻结费率估算 CNY |
| --- | --- | ---: | ---: | ---: | ---: |
| DCD | response_received | 12,812 | 8,763 | 21,575 | 0.130780 |
| UVU | response_received | 16,898 | 15,181 | 32,079 | 0.215968 |
| 合计 | 两次均有 request ID / usage | 29,710 | 23,944 | 53,654 | **0.346748** |

逐请求 request ID、时间、模型、北京 URL、正文/附件摘要、usage 和公开费率保存在 [provider-evidence.json](provider-evidence.json)。两次正文均与已批准的 DCD/UVU pin 完全相同，响应模型校验通过。

费用按照已冻结的北京实时推理公开费率计算，输出计费包含思考与可见回答。这是 usage 估算，**不是已核对账单或费用保证**；没有读取账户账单。没有为余额、模型验证或查账增加调用。

## 失败点与第三次阻断

UVU 后，正式 Pipeline 的空间语义校验返回 `block`：

| 字段 | 代码 | 分类 |
| --- | --- | --- |
| `mediaTranslations.spatial.functionalNetwork[0]` | `INVALID_SPACE_FUNCTIONAL_SEMANTICS` | `decorative_identity` |
| `mediaTranslations.spatial.mustBeVisible[0]` | `INVALID_SPACE_MUST_BE_VISIBLE_SEMANTICS` | `decorative_identity` |

校验时，第一条功能网络含“顾客进入→品牌标识吸引→菜单查看…”；第一条可见性项为“入口处的品牌标识和菜单”。这里只记录冻结实现对真实分析结果作出的门禁判定，不修改其规则，也不在本轮判断是否需要调整该规则。

现有编排试图进入 targeted spatial repair。监护器记录 `stage=REPAIR`、`attemptedSequence=3`，在 HTTP 前以 `DISPATCH_LIMIT` 拒绝。账本终态 `terminated`。实际网络派发仍只有两次，额外修复 Provider 请求 **0**，自动重试 **0**。

本地 `analysis-repair-audit.json` 中 `modelCallCount=1` 是进入修复接口前的尝试计数，不能当作已派发第三次请求。该区别及原始诊断文件摘要保存在 [failure-diagnosis.json](failure-diagnosis.json)。本地相机焦距/画幅默认值处理不涉及新模型请求。没有修改生产代码、Prompt、校验器、Compiler、Golden 或完整性记录来消除失败。

## 已保存的实际产物

- [DCD 阶段报告](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/rks-02e1a/workflow/data/projects/d9ccf5c1-10f3-4c43-b0a7-cd64b62f4627/outputs/视觉方案升级报告.md)：第一阶段中间产物，**不是完成整条正式分析后的最终报告**。
- [未通过最终校验的 Packet](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/rks-02e1a/workflow/data/projects/d9ccf5c1-10f3-4c43-b0a7-cd64b62f4627/project-context/visual-decision-packet.json)及其 initial/repaired 历史：留作证据，不能授予生图资格。
- [正式修复审计](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/rks-02e1a/workflow/data/projects/d9ccf5c1-10f3-4c43-b0a7-cd64b62f4627/project-context/analysis-repair-audit.json)和本地 initial/final/spatial validation 文件均保留。
- Packet 来源指纹：`f9864b46dce85ac90f8970d25629176bad2a15748c628ee8d824ac9acd36b22c`。未生成 ready 的正式上下文，其来源指纹不存在。
- 实际文件路径、字节数和 SHA256 在 [artifact-manifest.json](artifact-manifest.json)。没有把原始 Provider 响应、密钥、Authorization、Base64 或加密凭据复制进报告目录。

Packet 内部局部字段 `validation.executionDataStatus=ready` 不能覆盖整个编排失败的结论。以正式项目 `failed / missing` 和本次终止账本为准，不手改状态或创建成功记录。

## 保留边界与停止状态

原用户冯烫烫项目 46 文件不变，树摘要仍为 `e4c417097b951eed3cac0d2a27e29748a43fa471f8b7b87812ecc31cfbe2acaf`。冻结源码和隔离项目分析输入未变。

E0 已确认的社区临街四川特色小馆、亲民堂食与市井烟火气、四川地域文化、开放明档及真实经营活动继续有效。红砖、暖木、赤陶、浅抹灰仍是项目级候选；温暖人工光及明确标注假设的自然光保留。新分析建议没有自动覆盖这些用户目标，RKS 仍是 Shadow。

本次 B1 `saveDraft / confirm / capture`、正式 Prompt 编译、生图、真实模型校验均为 **0**；没有 merge、部署、发布或自动补跑。历史账本 `kind` 标签来自冻结 guard 的固定实现，未改写它；实际授权和本次 LIVE 结果分别由授权收据与执行证据证明。

后续只读证据审计完成，`repo:verify`（含 current-flows）离线通过。详情见 [validation.json](validation.json) 和 ignored 本地验证日志。**此次授权的一次分析已结束，等待用户下一阶段人工审核；不重新调用执行器。**
