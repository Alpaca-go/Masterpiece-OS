# 固定模型、北京地域与费用预审

2026-10-25 只读审查了当前独立工作流 settings.json 的选中分析配置。未读取、解密、复制或校验 API Key；未请求 `/models`、测试对话或任何推理端点。

| 字段 | 结果 |
| --- | --- |
| 固定候选模型字符串 | `qwen3.6-plus` |
| 配置 provider / 实际 adapter | `dashscope` / `qwen`（本地 supports 规则） |
| protocol | `openai-chat-multimodal` |
| 北京接入地址 | `https://ws-1miaebhuom22vyxa.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` |
| 最终请求端点 | 上述地址追加 `/chat/completions` |
| 已核验项 | HTTPS、北京域名结构、业务空间 URL、modelType=analysis；无 URL 凭据或 query |
| 未核验项 | 账户模型权限、余额/优惠、密钥地域和有效性、服务可用性、实际返回模型 |
| 新隔离项目配置 | apiProfileId=null；未安装 profile 或凭据，无全局回退 |

该域名结构符合[阿里云北京接入文档](https://help.aliyun.com/zh/model-studio/beijing-access-information)。北京接入域名并不单独证明所有推理都在北京物理机房：服务部署范围还要按模型和账户核对。模型字符串为别名，不能声称锁定服务端权重快照；不自动替换为日期版本。需要更强版本固定时，应先经人工选择并重新冻结配置。

未来单独授权后，可通过正式 save-profile 在隔离根显式一次性建立同样的独立分析配置，凭据不得出现在 Git 或报告。不得后台同步源设置；不得直接把原 profileId 当作新根已存在的配置。当前未创建生图 profile。

## 计费依据与量级

[Qwen3.6 Plus 官方模型页](https://help.aliyun.com/zh/model-studio/qwen3-6-plus)在北京实时推理价格中列明：单次输入不超过 256K 时输入 ¥2/百万 Token、输出 ¥12/百万 Token；256K–1M 档为 ¥8/¥48。这里不采用 Batch、缓存、免费额度或活动折扣。实际账单以运行时账户账单和 Provider usage 为准，本轮实际模型费用为 ¥0（未派发），没有查询账户历史账单。

离线调用原有 inventory、视觉预处理与 Prompt builder，未调用 Pipeline/Reasoner，没有填入模拟模型结果。测量细节在 [offline-input-sizing.json](offline-input-sizing.json)。预处理测量写到项目之外的 `prompt-sizing` 目录，未产生分析 Run。

| 阶段 | 文本字符数 | 图片附件 | 估算图片 Token | 文本规划区间 | 合计输入规划区间 |
| --- | ---: | --- | ---: | ---: | ---: |
| Deep Creative Director | 9,331 | 1 张全素材总览 + 5 张细节 | 8,079 | 2,333–18,662 | 10,412–26,741 |
| Unified Visual Understanding | 8,043 | 全部 10 张原图的上传优化副本 | 13,120 | 2,011–16,086 | 15,131–29,206 |
| 两次总计 | 17,374 | 16 个图片附件，原图跨阶段重复计入 | 21,199 | 4,344–34,748 | 25,543–55,947 |

这是预算估计，非 tokenizer 精确计数：文本取字符数 /4 至字符数 ×2 的宽区间，图片按实际上传优化后的尺寸估算 `ceil(w/32)×ceil(h/32)`。依据[官方视觉输入说明](https://help.aliyun.com/en/model-studio/vision)，Qwen3.6 图片按 32×32 像素对应视觉 Token；实际缩放、网格取整、特殊 Token 和附件标签会产生偏差。Base64 字节数不能直接当 Token。尚未运行，无法获知输出长度。

若两次合计可见输出假设为 12K–30K Token，且**不计思考 Token**，该量级费用约 ¥0.195–¥0.472：`输入×2/1e6 + 输出×12/1e6`。输出区间只是规划假设，第一阶段 6,000–8,000 中文字要求不是 API 硬限制，第二阶段 Packet 也没有实测输出值。

**不能将上述量级当作费用封顶。** 当前 Qwen adapter 的 DCD/UVU 请求只固定 model/messages/stream=false，未传 max_tokens、thinking_budget，也未关闭 thinking。官方说明该系列默认开启思考，且思考 Token 按输出计费（[深度思考计费说明](https://help.aliyun.com/en/model-studio/deep-thinking)）。额外 20K 思考 Token 约增加 ¥0.24，额外 100K 约增加 ¥1.20，均为示例而非预测。官方模型页还列出较高的输出/思维链长度上限，不能假定实际费用止于 ¥0.47。

两次请求的数目预算与人民币预算是不同约束。最终授权前必须明确：是否保留默认思考模式、每次 max_tokens/thinking_budget 的候选值、是否有可靠的发送前费用保留机制，以及用户可接受的总费用上限。改变这些参数需在隔离受控方案中显式审阅并重新冻结，不能悄悄为省钱改变分析行为。超时/响应丢失仍可能计费；禁止自动返还额度或补跑。已发请求不能靠事后发现费用超限撤回收费。

现有成功路径的 Run 汇总不能代替逐请求账本；必须在发送层保留每次实际 usage、request ID、时间、状态、模型和费用依据，去除密钥及原始响应敏感内容。缺 usage 或未知费用时停止，不猜测为零。
