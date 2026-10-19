# 九州美学图2、图3空间定向修正：单张真实生图报告

2026-10-19（Asia/Shanghai）。生成成功，单次调用完成并停止。最终图像质量等待用户人工验收。

![本次真实业务输出](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/fig2-fig3-spatial-correction/real-validation/authorized-execution/jiuzhou-standard-output.png)

## 实际执行

| 项目 | 结果 |
| --- | --- |
| 分支 / 提交 | `fix/jiuzhou-architectural-language` / `31ffde13a4bcc8884a6581e0da9da6638aae820d` |
| 项目 | 九州美学，ID `ecfcdf23-a81d-4cd2-8250-74ecd221b7fb`，新的隔离数据根副本 |
| 场景 / 视角 | 高端医美商业接待主厅，`reception` / `entrance_view`，入口斜向建筑摄影 |
| Provider / 协议 | `volcengine` / `seedream-image` |
| 模型 | `doubao-seedream-5-0-pro-260628` |
| 请求 | 官方 HTTPS `/api/v3/images/generations`，2K、16:9、1张 |
| 参考 | `generationBasis: standard`、`referenceAssetIds: []`，实际请求无 `image` 字段 |
| 入口 | 既有 `createShortChainGenerationService.start`，没有调用网页 `generate` / `startValidated` |
| Run ID | `9081ad05-c65c-4459-918f-3db80440ae0e` |
| HTTP / 业务终态 | 200 / `succeeded` |
| Provider请求 / 完整业务耗时 | 77589 ms / 80294 ms |
| 实际输出 | 1张，2816×1584，16:9，共4460544像素 |
| 本轮调用 | Seedream 1；Qwen 0；其他收费模型0 |
| 重试 / 重生成 / 定向纠正 | 0 / 0 / 0 |
| Logo / 文字 / 导视合成 | 均未执行 |

已读取七份指定审查材料；实际确认、正式Prompt、Provider Prompt和请求体与指定新方案一致，未回退旧复杂羽片版本。新隔离副本来自本轮 `browser-review` 的已确认项目，复制前后项目目录逐文件一致；没有复制旧设置和密钥。真实Seedream配置由用户在本机独立设置中亲自保存；虽然用户也保存了分析Profile，本轮没有读取其密钥或调用分析模型。

通过正式公共编译操作重新编译，经过既有方向有效性、输入新鲜度、路线、Prompt、参考边界和图片服务守卫，在传输前再次核验实际请求体。持久化独占执行目录及单次请求计数阻止重复派发；没有修改编译器、Provider Adapter、设计字段或正式Prompt，没有绕过业务守卫。

## 一致性摘要

| 内容 | SHA256 |
| --- | --- |
| 确认 | `30c2125a218184fe3054223dc763043f23b2a4e68f1dc3cd8c80369b67858d85` |
| 正式 Prompt | `5ddea8a3607a923662fad751781bb41cc8800a49b285c850cb57d28be95642d7` |
| Provider Prompt | `3599b487e2e193dafac5c3db287f4b44e8463479ad74b13dff066483ba05913f` |
| 实际请求体 | `5a62e0bde792095db2b1860c90fc0891476eeec818341b82e6b15ba44126d990` |
| 确认记录 | `95cd85e9867056e42c50536e17522eff5039a5ee6343be12ad97318733758acb` |
| 所属实现 | `8e8469e022ed1e2e01bdad208e5e75b9126d35afb46e3ac96e212aaa8c6e6f81` |

正式Prompt 11018字符，Provider Prompt 11121字符，均保持原文，无截断或重写。完整执行副本保留在本机隔离目录；仓库对应原文为 [确认记录](../confirmed-direction.json)、[正式Prompt](../formal-prompt.txt)、[Provider Prompt](../provider-prompt.txt)；[实际请求（无认证头）](./provider-request.json)、[逐项核验证据](./request-comparison.json)。

## 原始图片与业务输出

- [Provider原始JPEG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/fig2-fig3-spatial-correction/real-validation/authorized-execution/jiuzhou-provider-original.jpg)：2816×1584，290264字节，SHA256 `8618e7b29c43c206b7509f661e5e8f8d1b74d3f6d235cc1dfe11fbf27fd8dc8e`。
- [标准业务PNG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/fig2-fig3-spatial-correction/real-validation/authorized-execution/jiuzhou-standard-output.png)：2816×1584，2926515字节，SHA256 `adccb797485e796369417ec4dee31d2fa737c06a77229546ae4a65cc59e6cc8c`。
- 标准图片服务只将JPEG解码转为PNG；没有裁切、调色、修图、叠字或Logo合成，解码像素一致性另见核验证据。
- [图像元数据](./original-image-metadata.json)、[实际响应摘要](./image-response-summary.json)、[执行摘要](./execution-summary.json)、[调用台账](./call-ledger.json)。原始Provider JSON未保存或提交；只保存原始图片字节及必要摘要。

## 费用

派发前已核查[官方模型价格](https://docs.volcengine.com/docs/ark/model-pricing?lang=zh)，公开单图生成大于261万像素为¥0.60/张。本次实际4460544像素、输入图片0张，公开费率估算约 **¥0.60**。未发现额外请求、重试、校验或批量输出的费用异常。

Provider返回 `input_images: 0`、`generated_images: 1`、`output_tokens: 17424`、`total_tokens: 17424`，未返回货币结算金额。账户余额、优惠及账单未读取，实际结算费用未知；估价不是结算凭证。[费用记录](./fee-record.json)

## 五项视觉对照与待审

详见 [图1失败案例、图2图3目标及本次输出的对照报告](./visual-comparison.md)。本次前台、候客位置与后方洽谈桌椅可辨，复杂羽片已消失，材料和光线较图1温暖；但独立扶手椅没有明确辨认，中央曲面基座仍影响横向联系，背景也有过渡收束倾向。这些剩余问题不能由摘要一致或工程检查通过来消除。

本轮没有额外自动校验，也没有将上述助手观察写成最终人工验收通过。图2、图3只作为事后人工对照，未进入模型图像请求；本次不是控制随机种子的受控实验，不把随机差异归因于单个字段。

## 保护与停止

执行前后21个保护根逐文件复核不变，覆盖正式项目、历史副本、旧报告、上轮输出及本轮确认源目录。真实执行阶段Git tracked工作区未改动，证据与真实图片保留在新的Git忽略隔离目录。执行完成后，用户另行授权将本目录中的脱敏文本证据归档提交；图片、凭据和运行目录仍不纳入Git。本轮没有修改生产、Prompt、参数、Golden、历史图片、人工验收或完整性记录，没有合并、部署或发布。

执行基线已记录的所属112项测试、三行业对照、离线Golden及 `repo:verify` 通过。本次归档仅新增脱敏报告目录，重新运行 `npm run repo:verify`，结果见 [gate-results.json](./gate-results.json)。工程门禁不等于本次图像质量验收。

一次生图额度已用完。证据整理后停止，等待用户人工审核，不追加、重试或纠正。
