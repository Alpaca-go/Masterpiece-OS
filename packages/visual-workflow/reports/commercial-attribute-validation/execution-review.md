# 九州美学商业属性增强版：单张真实生图验证

执行日期：2026-10-19（Asia/Shanghai）。分支 `fix/jiuzhou-architectural-language`，代码基线 `e0fb8569d32e7b1f87464aae3c0c3ab85ab59923`。

本轮使用商业属性增强后的确认方案，完成 **Seedream 生图 1 次、Qwen 0 次、其他模型 0 次、重试 0 次**。没有修改确认字段、Prompt、构图输入或生产代码。原始 JPEG 与标准业务 PNG 已保存，真实调用结束后立即停止模型执行。

初步结论：接待工具、台卡和方向提示更明确，候客组团与柔和阴影有所改善；建筑珠光连续关系及低对比气质保留。但商业身份仍不能据单图确认到“明确的医美运营”，近景遮挡、精密薄片层级、背景门洞与隐私关系也存在保留意见。**不宣布质量稳定达标，不更新人工验收状态。**

## 最新图片与上一版对照

![商业属性增强版真实输出](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/commercial-attribute/real-validation/authorized-execution/jiuzhou-standard-output.png)

[标准业务 PNG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/commercial-attribute/real-validation/authorized-execution/jiuzhou-standard-output.png) · [原始 Provider JPEG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/commercial-attribute/real-validation/authorized-execution/jiuzhou-provider-original.jpg) · [上一版 P1—P4 主厅图](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architectural-refinement/real-validation/authorized-execution/jiuzhou-standard-output.png)

图片及 Provider 原始响应保留在 Git 忽略目录。本审查目录只保存脱敏请求、摘要、哈希和报告，不包含图像字节、真实密钥或原始响应正文。

## 正式入口、配置及授权控制

现有网页 `visual-workflow:generate` 使用 `startValidated`，图像成功后会自动校验，因此本轮没有调用该入口。

执行使用已有正式 `createShortChainGenerationService.start`：这是 `startValidated` 的原始生图阶段，保留确认一致性、上下文指纹、编译预检、单张数量、空间语义、参考解析、路由 Gate A、实际 Prompt Gate B、所属 Provider Adapter、业务输出及会话历史。没有移除守卫、伪造校验结果或私改生产流程；没有构造或调用质量校验服务。

执行前针对商业属性表单的既有定向测试通过，证明该入口一次生成只产生模拟图片请求 1 次、模拟校验调用 0 次。[仅生图入口证据](./generation-only-entry-proof.json)

新环境为 `.codex-smoke/commercial-attribute/real-validation/user-data/visual-workflow/`，从本轮商业属性已确认副本一次性复制项目数据，未复制模型配置或凭据。用户在正规独立模型设置页面保存真实 Seedream 配置并回复“已配置”后继续。配置匹配 `volcengine / seedream-image / doubao-seedream-5-0-pro-260628`，使用官方 HTTPS 端点，未使用 `.invalid`。

API Key 仅由既有加密凭据存储和正式运行时在内存中使用；代理未读取后输出或复制密钥，请求头不落盘。配置页面禁止真实模型派发。执行脚本在派发前比对实际请求体，并以持久调用台账、一次 POST 限额、独占执行目录及拒绝重定向来限制重复或越权请求。没有调用账单探测或额外模型连接测试。

## 已确认方案及实际请求核对

| 核查项 | 实际结果 |
| --- | --- |
| 确认 SHA256 | `7cbdfd2ffc792816040316fa405bd623ce55703a2e7b10f06b2d1157987fb70d` |
| 正式 Prompt SHA256 | `39cd488da22189e31a0592474574bc4a4d69eff777cbdfa9ab3cfec31bc5eb4b` |
| Provider Prompt SHA256 | `547bfe42a77e7384b33a27ddeafd22321e692d3fc76badcb588bfdb15732e4df` |
| 实际请求体 SHA256 | `58f2ef2c8d035225fce921c1552f58ebe38408478431b203bfa7660a74dd306c` |
| 模型 / Provider / 协议 | `doubao-seedream-5-0-pro-260628` / `volcengine` / `seedream-image` |
| 图像参数 | 2K、16:9、接待主厅入口视角、单张 |
| 参考图路径 | `generationBasis: standard`、`referenceAssetIds: []`、实际请求没有 `image` 字段 |

上述摘要与商业属性审查记录逐项一致，没有回退旧版 P1—P4 方案，没有临时改 Prompt 或调整构图。Provider usage 同时确认输入图片 0、生成图片 1。旧图、主厅基线图和商业属性参考图均未作为图像输入。

确认来源文字中的“本轮不授权真实生图”是前一轮离线审查的历史边界；本次派发依据用户当前单独明确授权，没有改写历史确认记录。

[预检记录](./preflight-summary.json) · [实际请求比对](./request-comparison.json) · [实际请求体（不含请求头）](./provider-request.json) · [确认方案](../commercial-attribute/confirmed-direction.json) · [正式 Prompt](../commercial-attribute/formal-prompt.txt) · [Provider Prompt](../commercial-attribute/provider-prompt.txt)

## 执行结果与图片完整性

- Provider 返回 HTTP 200，模型请求耗时 78.967 秒，业务全程约 81.026 秒。
- 原始 JPEG：2816×1584，248662 字节；SHA256 `373ecd7e0b6c811e54bc7676c1c68bf0518f41595c20d0f5beaf24910657bbab`。
- 标准业务 PNG：2816×1584，2881776 字节；SHA256 `524f07920aa10389ebbf189eee051a34ca21166c42d1e58f425e23f03ae08cc2`。
- 两者解码后的像素完全一致，业务仅执行既有 JPEG 转 PNG，没有后期改图、补字、Logo 合成或修图。
- 运行 ID：`d2410069-156f-447a-a55e-adbe17185f4e`。业务终态为 `succeeded`，没有质量校验结果；成功生成不等于视觉质量或人工验收通过。

[执行摘要](./execution-summary.json) · [调用台账](./call-ledger.json) · [响应摘要](./image-response-summary.json) · [图片完整性](./image-integrity.json) · [原始图片元数据](./original-image-metadata.json)

## 模型价格与可获得费用

执行前查阅官方公开价格及模型说明：Seedream 5.0 Pro 单图输出按像素档位计费，超过 261 万像素为 ¥0.60/张。本次实际为 4460544 像素、零输入参考图，按公开价估算 **¥0.60**。请求未开启图层拆分或多图生成，没有发现异常计费指示。[官方价格](https://docs.volcengine.com/docs/ark/model-pricing?lang=zh)、[官方模型与调用条件](https://docs.volcengine.com/docs/ark/seedream-5-0-pro?lang=zh)

价格核查使用官方域名的索引内容；直接打开文档页返回 JavaScript 应用外壳，不能将其表述为已读取账户实时账单。具体账户折扣、余额和模型权益没有额外探测。

本次 Provider usage 为输入图片 0、生成图片 1、输出/总 Token 17424。API 未返回实际货币扣费，故 ¥0.60 是公开价估算，不是已结算金额。可计费模型请求总数为 1；Qwen、其他模型、重试、重生成和纠正均为 0。[费用记录](./fee-record.json)、[执行前价格核查](./pricing-check.json)

## P1—P3 初步视觉观察

以下是代理对两张真实图片的目视观察，不是新的模型评价、用户验收或建筑实测。两个零参考图请求的生成随机性未被控制，不能把一张结果的全部差异归因为本次字段修订。取景及艺术造型虽有明显变化，实际发送的确认 Prompt 和请求体没有变化。

| 重点 | 相比上一版可见的改善或保留 | 未解决或无法可靠确认 |
| --- | --- | --- |
| P1 前台登记与预约 | 前台暗屏设备和小型台卡更加明确，工作工具数量克制，服务面仍可用 | 黑屏不能证明具体登记/预约应用；台卡有浅色线迹，不能认证为严格无字。没有确认可读品牌名或 Logo |
| P1 候客真实使用 | 沙发与两把单椅围绕小桌形成等候交流组，周边留有通行；桌上可辨杯/托盘式服务物件 | 闭合服务册无法可靠辨认，不能把杯盘推断为指定茶水内容；没有证明所有细节指令均落实 |
| P1 服务转场及身份位置 | 背景小箭头强化方向感，后续室内入口位置比单纯空白深处更明确；没有出现大 Logo 墙、产品货架或营销海报 | 并列门洞及门扇带来诊室门排联想，错位过渡与完整隐私屏蔽仍待审查；门洞后可见局部室内轮廓。独立的品牌预留面不够明确，仍不能断言“一眼就是医美”，也可能读为其他高端服务接待或 SPA |
| P2 建筑艺术成果 | 珠光半透明曲面延展至上部采光界面的连续关系仍在；接待与候客横向分布、暖白乳白、浅暖灰、局部弱紫及安静明亮气质保留 | 左侧近景大层片较抢眼，部分遮挡前台；两侧仍有裁切框景，商业服务可读性受到一定影响。大曲面与尖叶式轮廓仍占主导，精密局部薄片层级没有充分成立 |
| P3 材料与柔光 | 薄边轮廓、叠合和局部珠光可辨；地面及家具阴影比上一版更宽缓，定向硬阴影有所减少 | 大块乳白高亮面仍压平局部层间深度，上部采光和部分表面很亮，不能证明所有高光细节均保留；局部工艺精密度仍不稳定 |

没有人物不是本轮失败条件：本轮本来要求服务关系能够靠空间和物件成立。也不以人物缺席解释功能全部失效。与此同时，不能把出现平板或箭头等同于整套医美运营逻辑已经完成。

品牌与文字仍处在既有后期合成边界内，本轮未执行任何补字合成。台卡上的微弱线迹属于需要人工关注的输出细节，不作为已交付的预约文案。具体观察见 [逐项对照](./visual-comparison.json)。

## 只读、工程检查及停止

正式九州项目、各历史测试副本和图片、上一轮输出、本轮商业属性确认副本及历史审查目录，共 12 个保护根完整清单前后相同。没有修改生产编译器、原确认方向、Golden、完整性记录、人工视觉验收状态、其他项目或独立业务。[只读与范围证明](./readonly-and-scope-proof.json)

报告的本地链接和敏感信息扫描、仓库文件政策及离线 `repo:verify` 结果见 [工程检查](./gate-results.json)。这些检查不调用真实模型，也不能代替视觉验收。原始 Provider 响应及图片位置仅以本地索引保留：[原始本地产物索引](./local-artifact-index.json)。

唯一一次生图授权已使用。模型执行进程、配置专用 Host 和 Renderer 已停止；没有追加收费校验或生成。未合并、部署、发布或更新任何人工质量结论。

本轮停在图片与证据交付，等待用户人工视觉审核，不宣布商业属性目标全部达成或视觉质量稳定。
