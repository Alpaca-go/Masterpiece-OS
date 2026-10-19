# 九州美学 P5｜单张真实生图验证

2026-10-19（Asia/Shanghai）。**单次请求成功，已停止。助手初步判断：前台权重有所改善，珠光跨度与医美咨询准确性仍未达到同时通过的条件。等待用户人工视觉审核。**

![本轮真实图片](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-spatial-balance/real-validation/authorized-execution/jiuzhou-standard-output.png)

| 项目 | 结果 |
|---|---|
| 分支 / 目标提交 | fix/jiuzhou-final-spatial-balance / 0b32dc5dbb022f28dc2a57ebfa4568f26e169227 |
| Provider / 协议 / 模型 | volcengine / seedream-image / doubao-seedream-5-0-pro-260628 |
| 场景 / 视角 | reception / entrance_view，高端医美商业接待主厅 |
| 请求 | 2K、16:9、单张、standard、referenceAssetIds=[]，无image字段 |
| 实际输出 | 2816×1584，16:9，4460544 像素 |
| HTTP / 终态 | 200 / succeeded |
| Provider / 业务耗时 | 81034 ms / 88355 ms |
| Run ID | d09ba353-3668-4ad4-81e6-17e9482c5130 |
| 调用 / 重试 | Seedream 1；Qwen 0；其他模型 0；重试、重生成、自动纠正均0 |
| 后期合成 | Logo、文字、品牌合成均未执行 |

## 批准内容与请求一致性

七份指定材料均已读取；目标提交、源副本当前确认及正式编译结果均核对通过，没有修改设计字段或Prompt。

| 对象 | SHA256 |
|---|---|
| 确认内容 | 9e71ce823c14d343248df4904a8cecd056d60838dbeb79b19eb20b708e6736a0 |
| 正式Prompt | 733c44d0e67a83c051ccc1aa596aaf8424c6a53510ad87dbf738c1af6dd05a68 |
| Provider Prompt | 4d5ca5a666096761dd509f8eccbfc537308cffafbcf3ddbd7abc81c736caf22d |
| 实际Adapter请求体 | 3c67f2b1fbed9a1c46cdf919d8a93933e6e26890145ab464f4306194ca757141 |
| Provider原始JPEG | 549968e246b1be8d866e0a1267e3a4b81ea883b465a1cb39a6b71dc74bb89b73 |
| 业务PNG | 016c988155a674f22974281d724cfe199c66629a259730c09bec4b73dfe70cff |

[请求正文](provider-request.json)、[摘要与像素核对](request-comparison.json)、[预检记录](preflight-summary.json)、[调用账本](call-ledger.json)、[执行摘要](execution-summary.json)、[响应摘要](image-response-summary.json)、[原图元数据](original-image-metadata.json)。原图与业务PNG解码像素完全相同，仅经过原有图片服务PNG格式转换，未修图或叠字。

- [原始Provider JPEG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-spatial-balance/real-validation/authorized-execution/jiuzhou-provider-original.jpg)：328159字节。
- [标准业务PNG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-spatial-balance/real-validation/authorized-execution/jiuzhou-standard-output.png)：3559363字节。

## 正式链路与配置

使用最新P5确认副本新建数据隔离的执行副本，原项目ID及确认内容原样保留。现有 createShortChainGenerationService.compile → start → createImageService → Seedream Adapter 完成执行；确认、分析新鲜度、场景路由、Prompt、标准零参考与图片服务守卫全部保留。使用现有仅生图入口，无startValidated调用及质量校验器，也没有修改生产实现。

首次预检发现离线.invalid端点后停止派发；用户通过正式独立模型设置保存真实配置并明确回复“配置完成”。随后重新预检通过。图片服务原位使用该独立configuration对象及明确profileId，没有复制凭据、settings或从全局/策划/迁移环境回退配置；不输出API Key。配置网页所在宿主阻止模型外网访问，真实执行只由限定传输执行器发送。

持久化执行目录独占创建，POST前再次核对端点、完整请求体摘要、模型、2K与无image字段，并在发送前将调用计数写盘；最多一次，不自动重试。未保存认证头或Provider原始JSON，只记录图片及非敏感响应摘要。

## 参数与费用

[官方API参数](https://docs.volcengine.com/docs/ark/image-generation-api?lang=en)支持分辨率档位2K并由Prompt描述比例；批准Prompt含16:9，本轮保持原请求不变，实际图片比例也为16:9。[官方模型价格](https://docs.volcengine.com/docs/ark/model-pricing?lang=en&redirect=1)列出单图生成超过261万像素为¥0.60/张；本次4460544像素、输入图片0张，公开费率估算约 **¥0.60**。

API返回 generated_images=1、input_images=0、output_tokens=17424、total_tokens=17424，没有返回人民币结算金额。未查询账户账单、优惠或余额，**实际结算金额未知**。无额外付费校验、批量、多图输入、重试或重生成；[费用记录](fee-record.json)为公开估算，不是付款凭证。

## 视觉结论与保护

[P0—P3逐项检查及上一版差异](visual-comparison.md)：P0珠光保有艺术性，但仍形成横跨前台上方的大曲带，右侧围护依旧；P1前台服务面更突出、与候客联系更清楚，但员工工作侧及全厅焦点层级仍不足；P2屏幕虽有面部侧影，仍偏解剖头部图，且台前同侧双椅没有明确相向服务；P3暖白浅木与局部虹彩保留，日照仍有较强方向性。不能宣称整体视觉质量通过，不能把随机差异归因于单一字段。

[保护核对](protection-proof.json)记录22个既有根目录逐文件前后相同（归档阶段仅排除本次新增real-generation目录）；覆盖原项目、P5确认副本、历史副本、历史图片与已有审查材料。生产代码、Provider Adapter、Golden、完整性及人工视觉验收记录不变。[范围证明](scope-proof.json)、[门禁结果](gate-results.json)。本次没有生产行为修改；沿用已通过的112项工作流、三行业请求对照与Golden记录，并重新执行repo:verify。工程检查不替代视觉验收。

图片与本地运行产物保留在Git忽略目录，仅新增脱敏报告。未提交本轮报告、合并、部署或发布。一次生图授权额度已用完；完成证据整理后停止，等待用户人工审核。
