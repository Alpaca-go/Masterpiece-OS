# 九州美学 P7b 单张真实生图执行报告

2026-10-20 Asia/Shanghai。**技术执行成功；主厅开阔度改善，但隔台相向面询未成立，珠光范围亦有退步。本轮没有标记视觉质量通过，等待用户审核。**

![本次真实生成图](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-p7b/real-validation/authorized-execution/jiuzhou-standard-output.png)

基线fix/jiuzhou-final-spatial-balance / f558a5465778e3f49534417c09e889f5ecfbd3b1，起点工作区干净。使用P7a最新确认方向的数据隔离副本，五项批准摘要全部相同；正式Prompt10451、Provider Prompt10554字符且无截断。13类空间关系与38项字段保真重新核验通过，未回退P7/P6，也没有重新分析或改任何方向/Prompt。

[预检与五摘要证明](P7b-preflight-and-hash-proof.json)、[38项完整保真及预检](P7b-final-preflight-proof.json)、[实际Provider请求](P7b-provider-request.json)。实际body摘要79d70c85ba1eced01a0256dcb60cb60dc8e6acf1d1021a903f78eddbcb090b99，与批准请求逐值一致：volcengine / doubao-seedream-5-0-pro-260628 / seedream-image / 2K / 16:9 / 1张 / standard / referenceAssetIds=[]，无image字段。

通过现有createShortChainGenerationService.compile及generation-only start进入现有Image Service与Seedream Adapter；没有手工HTTP拼接绕过链路。transport包装仅核对实际body、限制目的地址和单次派发、保存原图及脱敏摘要，真正请求仍由Adapter构造。原位使用既有用户保存的独立生图配置，没有复制settings或凭据；预检只读取公开配置元数据与凭据文件存在性，解密仅由正式Image Service内部执行。

执行前以独占authorized-execution目录预留本轮额度，每次派发前先持久化ledger；已经存在的目录会阻止再次执行。实际Seedream派发**1**，Qwen/其他模型/自动重试/重生成/定向纠正/Logo导视及屏幕后期合成均**0**。[调用记录](P7b-call-ledger.json)、[持久化授权锁](P7b-authorization.json)。

| 项目 | 结果 |
|---|---|
| HTTP / 运行状态 | 200 / succeeded |
| 总流程耗时 | 86958ms（约87秒，含本地结果与保护核对）；Provider请求响应约69102ms |
| Run ID | dbeebb1c-ff7c-418e-9d0c-e17ad279b654 |
| 输出 | 2816×1584，精确16:9，JPEG原图及业务PNG均保存 |
| 原图SHA256 | b8acd690ac71f16757bc6a88e4ebedd92187122c04b98d4bdc4ea948b761d44c |
| PNG SHA256 | 765b1ee08542d625c08708f5d4d097ffdfebc806290659f1c3c3365609970b22 |
| 像素保真 | 原JPEG解码像素与业务PNG解码像素完全相同，无修图 |
| Provider usage | input_images=0、generated_images=1、output_tokens=17424、total_tokens=17424 |

[原始Provider JPEG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-p7b/real-validation/authorized-execution/jiuzhou-provider-original.jpg)、[标准业务PNG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-p7b/real-validation/authorized-execution/jiuzhou-standard-output.png)、[图像尺寸/摘要/像素一致证据](P7b-image-evidence.json)、[执行摘要](P7b-execution-summary.json)、[非敏感响应摘要](P7b-image-response-summary.json)。未提交原始Provider JSON；图片保存在gitignore的本机执行目录中，文件索引可复核。

费用：按[官方公开价格](https://docs.volcengine.com/docs/ark/model-pricing?lang=en&redirect=1)，本次2K单图约¥0.60，零输入参考图；API未返回实际货币扣费，未查询账户折扣/余额或追加计费探测，实际结算金额未知。[费用记录](P7b-fee-record.json)。

## 图像审查结论

- P0：相较P6更开敞，前台与成组候客联系改善；实际面询进出及私密服务流线仍不能完整验证。
- P1：珠光薄边、叠层、淡紫与空间深度可见；左右巨大围框，尤其右侧落地至顶的拱框，未实现单套局部边界。建筑衔接有所恢复，但不等于艺术职责达标。
- P2：两椅仍在同一台面前侧并排，没有真正隔台相向；面部示意比解剖扫描接近目标，前台没有额外面部广告屏，但不能以此认定面询通过。
- P3：暖白浅木、柔和自然光、完整前台与候客保留；双侧艺术体量扩大和面询角落化仍是需审核的问题。

详见[P0–P3逐项图像证据与四个问题回答](P7b-visual-review.md)、[P5/P6/P7b对照](P7b-comparison.md)。只有单次样本，不把随机差异认定为字段的必然作用，不更新Golden或人工视觉验收状态。

## 保护与停止

26个既有受保护目录逐文件一致，含P7a/P7/P5/P6项目、历史图及报告。隔离副本仅本轮编译/会话数据变化，方向、输入、原分析Context不变；共享宿主、Compiler、Adapter、Schema、预算规则、完整性与冻结分支无改动。[保护证明](P7b-protection-proof.json)、[权限范围](P7b-scope-proof.json)。repo:verify通过，零Provider离线门禁保持通过，[结果与完整日志](P7b-gate-results.json)。

本轮唯一真实调用已经用完，后续没有派发或修正。停止等待用户人工审核；无合并、部署、发布或远程推送。
