# 九州美学建筑语言修正｜单张真实验证记录

执行日期：2026-10-18（Asia/Shanghai）。代码基线：459bed832c1cdec831d3ee3b2ca963c69e7a46dc；分支：fix/jiuzhou-architectural-language。

本次提交仅归档脱敏审查记录，不修改生产代码、设计确认、Golden 或人工验收状态，不合并、不发布。图片、Provider 原始响应、含图片的请求体及完整运行产物留在本地忽略目录，没有提交到 Git。

## 执行结果

- Seedream 真实生图成功 1 次，HTTP 200，耗时 67.422 秒，输出 2816×1584，精确 16:9；完整流程耗时 189.168 秒。
- 正式业务公共 compile / generate 链路使用确认方案：doubao-seedream-5-0-pro-260628、2K、接待大厅入口视角、standard、零参考图、请求无 image 字段。实际请求体与离线审查稿完全一致。
- Qwen3.6-plus 使用用户确认的自定义端点，唯一一次质量校验在业务既有 120 秒截止处超时（QWEN_REQUEST_TIMEOUT）。结果 unverified，没有得到模型质量判断。
- 共发出 2 次可能计费的模型请求；自动重试、重生成、定向纠正、额外模型调用均为 0。校验超时不能视为不计费。
- 原项目、历史图片和确认摘要均核对不变。没有读取后输出、复制或提交 API Key；请求头未保存。

## 初步目视观察（不是人工验收）

| 检查 | 初步结果 | 遗留问题 |
| --- | --- | --- |
| 净高与展馆尺度 | 高侧窗、完整墙面与装置上方顶面更清楚，部分改善 | 宽阔低平顶面仍较显著，不能证明实际净高或排除透视作用 |
| 狭长走廊与递进 | 旧版前台旁狭长尽端及连续门洞模式不再突出 | 巨大中央装置遮挡背景，过厅与错位隐私入口的递进仍不充分 |
| 功能可读性 | 接待、候客桌椅与艺术焦点更易辨认 | 后续通行和候客容量仍需用户判断 |
| 既有视觉气质 | 暖白、低对比背景、少量紫与自然光仍在 | 装置偏厚重、呈密集羽片/花瓣簇团，透景较弱；紫色靠垫偏离薄片内层的原表面范围；直射光和明确阴影较强 |

不能宣布建筑语言修正通过。后续审核重点是装置体量与符号化、背景转场、真正的竖向尺度，以及材料光学/局部紫/柔光的保真。本轮没有据此改稿或补发模型请求。

## 费用

图像公开价格参考约 ¥0.60。Qwen 北京小于等于 256K 输入档的公开参考价为输入 ¥2/百万 Token、输出 ¥12/百万 Token；自定义工作空间实际账单可能不同。Qwen 未返回 usage，校验费用及总费用未知，不能记作 0；API 未返回实际结算金额。

来源：[火山方舟价格](https://docs.volcengine.com/docs/ark/model-pricing?lang=zh)、[官方 2K 档价格说明](https://docs.volcengine.com/docs/drama-creation/package-description?lang=zh)、[Qwen 价格](https://help.aliyun.com/zh/model-studio/qwen3-6-plus)。查询日期为执行日期；实际结算需核对账户账单。

## 可查看的本地图片

[本次业务 PNG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architectural-language/paid-validation/authorized-execution/jiuzhou-standard-output.png) · [Provider 原始 JPEG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architectural-language/paid-validation/authorized-execution/jiuzhou-provider-original.jpg) · [上一版历史 PNG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/standard-generation-preflight/authorized-execution/jiuzhou-standard-output.png)。这些链接仅在保存原本机证据的工作站可用；仓库没有图片副本。

![本次真实生成图](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architectural-language/paid-validation/authorized-execution/jiuzhou-standard-output.png)

## 脱敏证据

[执行摘要](./execution-summary.json)、[调用台账](./call-ledger.json)、[请求一致性](./request-comparison.json)、[图像响应摘要](./image-response-summary.json)、[校验状态](./validation-result.json)、[超时记录](./validation-transport-failure.json)、[费用](./fee-record.json)、[初步对照](./visual-comparison.json)、[本地原始证据哈希索引](./local-artifact-index.json)。

已确认方向及正式 Prompt 继续引用上一阶段的 [确认记录](../confirmed-direction.json) 与 [正式 Prompt](../formal-prompt.txt)，不重复生成或修改。确认 SHA256：1367fdf7d18e6ed438312d8a78a05e18324fd26fc47cf432abaa052f3a57f424；正式请求体 SHA256：6cc069be2518ee0db326ae0ed2778abeab2f0299df649b004c21d022552487b2；原图 SHA256：2e6e4c6b3692053277298b7fb38ffb33b4497ff24cb05787ff34829457e8a3a6；业务 PNG SHA256：525db8989b2145e0afeeaffefe979abd6020ac6295e78a4fd4aa8b19b08f76c7。

授权额度已使用：生图 1/1、校验 1/1。执行进程已结束，现停止等待用户人工审核。
