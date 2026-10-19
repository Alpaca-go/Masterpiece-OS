# 九州美学：单张 Seedream 真实生图执行报告

日期：2026-10-19（Asia/Shanghai）。状态：生成成功，已停止，等待用户人工审核。本报告不作最终质量达标声明。

![本次真实业务输出](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architecture-commercial-layer/single-image-validation/authorized-execution/jiuzhou-standard-output.png)

## 执行结果

| 项目 | 实际结果 |
| --- | --- |
| 仓库 / 分支 | Alpaca-go/Masterpiece-OS / `fix/jiuzhou-architectural-language` |
| HEAD | `1c882d0a2d17748bf61723fdb5422ce4a050507d` |
| Project ID | `ecfcdf23-a81d-4cd2-8250-74ecd221b7fb`（新隔离数据根中的副本） |
| Provider / 协议 | `volcengine` / `seedream-image` |
| 模型 | `doubao-seedream-5-0-pro-260628` |
| 请求 | 官方 HTTPS `/api/v3/images/generations`，2K、16:9、单张 |
| 场景 / 视角 | `reception` / `entrance_view`（正式 Prompt 为 reception_arrival_view） |
| 参考图 | `generationBasis: standard`，`referenceAssetIds: []`，实际 Provider 请求无 `image` 字段 |
| 正式仅生图入口 | `createShortChainGenerationService.start`，未调用 `startValidated` 或网页 `generate` |
| Run ID | `76cd163e-8412-40ef-a717-04f3d8a46bed` |
| HTTP / 业务终态 | 200 / `succeeded` |
| 请求耗时 / 完整业务耗时 | 157294 ms / 159751 ms |
| Provider 返回图片 | 1 张，2816×1584，16:9，4,460,544 像素 |
| 模型调用 | Seedream 1；Qwen 0；其他收费模型 0 |
| 重试 / 重生成 / 纠正 | 0 / 0 / 0 |
| Logo / 文字合成 | 未执行 |

调用前已读取指定七份材料，核实目标 HEAD、最新确认、所属实现摘要及空参考链路。使用正式独立配置流程中用户亲自保存的新环境凭据；未复制旧密钥，未回退全局设置或调用 `.invalid` 端点。虽然用户同时配置了分析模型，本轮没有读取其密钥或调用分析服务。

正式编译器重新编译、所属 Provider Adapter 预览和实际传输前的请求体三处核验一致。仅生图入口保留了确认有效性、编译新鲜度、路线、Prompt、参考边界与图片落盘等正常业务守卫。没有修改生产编译器、Provider Adapter 或临时绕过系统。持久化独占执行目录和传输层单次计数共同阻止重复派发；没有重试逻辑。

## 文件与图像证据

- [原始 Provider JPEG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architecture-commercial-layer/single-image-validation/authorized-execution/jiuzhou-provider-original.jpg)：301894 字节；2816×1584；SHA256 `ba0b348d5ca1b8a1d55dc84ec741b621953b80044b1eaaf251cc91535729c99f`。
- [标准业务 PNG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architecture-commercial-layer/single-image-validation/authorized-execution/jiuzhou-standard-output.png)：3578382 字节；2816×1584；SHA256 `1794ed140ff5cc04b65b822355aa024956df7ec3065f7dd36d1c8c1c7dc8528d`。
- 标准业务输出由既有图片服务将 Provider JPEG 解码转为 PNG，未裁切、调色、修图或叠加 Logo / 文字。
- [实际请求参数（无认证头）](./provider-request.json)、[实际响应摘要](./image-response-summary.json)、[图像元数据](./original-image-metadata.json)。没有保存或提交原始 Provider JSON，只保留图片字节及必要摘要。
- [调用台账](./call-ledger.json)、[费用记录](./fee-record.json)、[完整执行摘要](./execution-summary.json)、[确认与 Prompt 一致性证据](./request-comparison.json)。

## 一致性摘要

| 内容 | SHA256 |
| --- | --- |
| 确认 | `a513f62300c798fb28f5d14bcdedfe37f1c1564468b215fc91f19eff6ecc03e8` |
| 正式 Prompt | `ae419a36a828800056038d8e7008fab2f749a6398b74fd6d9e4f781d52a99013` |
| Provider Prompt | `faee0ab25c94b76be305de5bca0bc700d7f7db8c8b5a9cb1601c6a689072a61d` |
| 实际请求体 | `67958bd6daa48179450934d095ffda72a4ffa5e92b8ae67e082d027f3a1500fa` |
| 确认记录 | `161b38d0406aec5bd6716eef0ddb1d1eb535cb506fc985c830d4af1e903481f8` |
| 所属实现 | `8e8469e022ed1e2e01bdad208e5e75b9126d35afb46e3ac96e212aaa8c6e6f81` |

正式 Prompt 11259 字符、Provider Prompt 11362 字符，均为原文，无临时重写或截断。原始执行证据在本机隔离目录保存了完整副本；仓库对应文件为 [确认记录](../confirmed-direction.json)、[正式 Prompt](../formal-prompt.txt)、[Provider Prompt](../provider-prompt.txt)。

## 费用

派发前核查[火山官方公开价格](https://docs.volcengine.com/docs/ark/model-pricing?lang=zh)（可读取资料更新于 2026-09-28）：Seedream 5.0 Pro 单图大于 261 万像素为 ¥0.60/张。本次实际输出 4460544 像素、输入图 0，公开费率估算 **¥0.60**。未发现超出单图费用和调用预算的异常指标。

Provider 返回 `input_images: 0`、`generated_images: 1`、`output_tokens: 17424`、`total_tokens: 17424`，没有返回货币结算金额。账户优惠、余额及实际账单未查询，实际结算费用为未知；估价不是结算证明。没有额外收费连接测试或校验。

## 视觉观察与边界

详见 [A / B / C 视觉对比报告](./visual-comparison.md)。C 的前台完整性和双侧夹击问题较 B 改善，但左前景巨片、上部环绕关系及额外悬吊造型仍应重点审核；不能认定已恢复 A 的成熟空间并超越 A 的运营关系。随机差异不能直接归因于单个 Prompt 字段。

生成后对 17 个保护根逐文件哈希复核，包括正式及历次项目、历史报告、A/B 证据和最新确认源目录，均保持不变。执行文件与证据仅在新的 gitignore 隔离目录生成，没有覆盖历史图片。上一阶段同一 HEAD 的 `npm run repo:verify` 已通过（含离线 current-flows、Node Host / Web typecheck 与守卫测试）；真实执行阶段未修改任何生产或 tracked 文件。本次归档仅新增本报告目录中的脱敏文本，另运行 `npm run repo:verify`；结果见 [gate-results.json](./gate-results.json)。工程检查不是视觉验收。

没有更新 Golden、人工视觉验收或实现完整性记录；没有修改设计方向、合并、部署或发布。真实执行完成后，用户另行授权将脱敏文本证据提交到当前分支；原始图片、运行环境和凭据保持 Git 忽略。单次授权已用完，执行在证据交付后停止。
