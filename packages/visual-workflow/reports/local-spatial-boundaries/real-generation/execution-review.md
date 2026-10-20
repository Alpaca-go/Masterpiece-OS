# 九州美学 P6｜单张真实生图验证执行报告

2026-10-20（Asia/Shanghai）。**唯一一次请求成功；P0/P1初步改善，P2相向座位仍未实现。已停止，等待用户人工视觉审核。** 未修改Prompt、编译器或生产逻辑。

![P6真实输出](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-local-boundaries/real-validation/authorized-execution/jiuzhou-standard-output.png)

| 项目 | 结果 |
|---|---|
| 分支 / 执行基线 | fix/jiuzhou-final-spatial-balance / a4e6512c9fe74eac9a75880fb286c73dc8b52071 |
| Provider / 协议 / 模型 | volcengine / seedream-image / doubao-seedream-5-0-pro-260628 |
| 入口 / 场景 | 现有generation-only start / reception / entrance_view |
| 批准参数 | 2K、16:9、单张、standard、referenceAssetIds=[]，实际body无image |
| 实际图片 | 2816×1584，16:9，4460544像素 |
| HTTP / 终态 | 200 / succeeded |
| Provider / 业务耗时 | 64140 ms / 68770 ms |
| Run ID | b2b574a1-80f5-4368-b909-e2fdcbe8d1fe |
| 模型调用 | Seedream 1；Qwen 0；其他付费模型0 |
| 重试 / 重生成 / 自动纠正 | 0 / 0 / 0 |
| Logo、文字与品牌合成 | 均未执行 |

## 五项批准摘要

八份指定材料已读取，源P6副本最新确认、正式编译结果、Provider Prompt及实际Adapter请求均一致，没有回退到P5。

| 对象 | SHA256 |
|---|---|
| 确认内容 | a73503cbfab73f9c35453092393fb1bb16c039f2c38392931212bd3bc0ee523b |
| 确认记录 | 9c25be9009a8da0e6023e80bf51969e9c3ac45e6a655cf5df0865e8b356186da |
| 正式Prompt | 8484241e0199f37a00929063c93685d4e2f9ac19926d1735d82a5a86672a1eb2 |
| Provider Prompt | 9446bb3eb32e508940136166142be623caa7ca2b20a9154c064c1e6568188854 |
| 实际Request body | 081f266cfe9acc0af7da4f28ba2284339b02e5856e44714390f5f6b62e9c1cb8 |
| 原始Provider JPEG | 8a8c39675f8c8aeb9428beda457a46f3d58e03f7b75f04703b68371a94d0e725 |
| 标准业务PNG | 1cedc6cb10e80746d286fd3ed8fcfc1840b9664a1cdb144d655f0bf789d3fded |

[实际请求](provider-request.json)、[摘要及像素核对](request-comparison.json)、[预检](preflight-summary.json)、[调用账本](call-ledger.json)、[执行摘要](execution-summary.json)、[响应摘要](image-response-summary.json)、[原图元数据](original-image-metadata.json)。原图与PNG解码像素完全相同，仅经既有业务服务PNG格式转换，没有修图或叠字。

- [原始Provider JPEG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-local-boundaries/real-validation/authorized-execution/jiuzhou-provider-original.jpg)：216815字节。
- [标准业务PNG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-local-boundaries/real-validation/authorized-execution/jiuzhou-standard-output.png)：2093496字节。

## 配置与现有正式业务链路

首次预检发现P6环境只有.invalid占位配置时停止派发。用户在正式独立设置页保存真实端点和凭据并回复“配置完成”。再次检查发现新条目保留默认analysis/dashscope/openai-chat-multimodal元数据，生图仍选中旧占位项。执行器通过既有visual-workflow:save-profile操作，在同一profileId上将非敏感用途/Provider/协议更正为已授权的image_generation/volcengine/seedream-image；没有传入apiKey参数，没有复制凭据文件，既有接口仅原位校验已保存凭据。随后全部预检通过。此为配置元数据纠正，不是更改模型、Prompt或生产逻辑。

从P6最新确认项目创建新的数据隔离执行副本。图片服务使用用户刚保存的独立configuration对象及明确profileId原位读取凭据，未复制settings或密钥，也未回退全局、创意策划或视觉迁移配置。

采用现有createShortChainGenerationService.compile → start → createImageService → Seedream Adapter；确认、分析新鲜度、路由、Prompt、零参考及图片服务守卫均保留。使用现有仅生图入口，无startValidated或质量校验器调用。持久化执行目录独占创建，POST前核对批准端点和完整body摘要，发送前写入计数，最多一次；失败也不会重试。认证头、API Key和Provider原始JSON不归档，只有图片及非敏感响应摘要。

历史图片仅用于事后目视对照，没有注册为模型参考，没有image字段。网页配置宿主禁止模型外网派发，唯一真实请求由限次传输执行器经现有Adapter发出。

## 参数与费用

已查核[官方API参数](https://docs.volcengine.com/docs/ark/image-generation-api?lang=en)：支持2K档位并由Prompt表达比例，本次保留批准请求原样，输出也为16:9。[官方模型价格](https://docs.volcengine.com/docs/ark/model-pricing?lang=en&redirect=1)列明单图超过261万像素为¥0.60/张；本图4460544像素、参考图0张，公开费率估算 **¥0.60**。

API返回input_images=0、generated_images=1、output_tokens=17424、total_tokens=17424，没有返回人民币结算金额。未查询账户余额、优惠或账单，**实际结算金额未知**。[费用记录](fee-record.json)是公开费率估算，不是付款凭证。没有额外收费校验、批量输出或重试费用。

## 初步视觉判断与保护

[P0/P1/P2逐项目视报告及P5差异](visual-comparison.md)：左前景玻璃房/环灯不再出现，珠光从跨厅曲带转为左侧局部，中央与前台上方顶面完整；薄边、透景和局部淡紫仍可辨。右侧主屏更像浅色面部轮廓与比例图，但两把椅子仍同侧，无法建立隔台相向服务；前台还出现附加人脸图示屏，带红色纹理的内容仍有解剖联想风险。因此不能认定三项目标同时通过，也不能把随机差异认定为某个字段的必然效果。

[保护证明](protection-proof.json)记录23个受保护根目录逐文件前后相同，归档阶段仅排除本次新建real-generation目录。P6原确认副本、P5副本与真实图、正式项目和历史审查材料不变；冻结分支仍为5103076。生产实现、Prompt、Golden、完整性及人工视觉质量记录均未改变。[范围证明](scope-proof.json)、[仓库门禁](gate-results.json)。本次未改变生产行为；原有112项工作流、三行业及Golden通过记录保持，并重新执行repo:verify。

图片与运行产物保留在Git忽略目录；只提交本目录脱敏文本证据，不提交图片、凭据或Provider原始响应。不合并、发布或部署。一次授权已用完，证据整理后停止，等待用户人工审核。
