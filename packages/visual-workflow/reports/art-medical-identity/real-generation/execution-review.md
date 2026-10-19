# 九州美学｜艺术建筑与医美身份修复：单张真实生图执行报告

2026-10-19（Asia/Shanghai）。**单次真实生图成功；停止等待人工视觉审核。** 助手视觉观察认为珠光艺术有所恢复，但专业面询设备内容和面对面服务关系仍不足，不能据工程结果宣布最终质量通过。

![本次业务输出](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-art-medical/real-validation/authorized-execution/jiuzhou-standard-output.png)

## 执行结果

| 项目 | 结果 |
|---|---|
| 基线分支 / 提交 | fix/jiuzhou-architectural-language / ab15bb29fc577b6f67258b1dc9344ff2c8916016 |
| 场景 / 视角 | 高端医美商业接待主厅 / reception / entrance_view |
| Provider / 协议 / 模型 | volcengine / seedream-image / doubao-seedream-5-0-pro-260628 |
| 请求与输出 | 2K、16:9、单张；实际 2816×1584，4460544 像素 |
| 模式 / 参考 | standard / referenceAssetIds=[] / 实际请求无image字段 |
| HTTP / 业务终态 | 200 / succeeded |
| Provider耗时 / 业务总耗时 | 83357 ms / 86142 ms |
| Run ID | 349908fd-04bc-40ed-8057-5c05c7bd173e |
| 调用 | Seedream 1；Qwen 0；其他收费模型 0 |
| 重试 / 重生成 / 自动纠正 | 0 / 0 / 0 |
| Logo、文字及导视后期合成 | 未执行 |

七份指定审查材料及目标提交已读取并核验。确认、正式Prompt、Provider Prompt及实际Adapter请求体均与批准版本一致，没有回退历史版本。原始Provider图片与业务PNG均保存，解码像素完全一致，只进行了既有图片服务的PNG格式转换，没有修图或叠字。

## 正式链路与隔离

本轮建立新的数据副本，项目ID、确认及上下文原样保留。使用既有 createShortChainGenerationService.compile → start → createImageService → Seedream Adapter；经过现有确认有效性、输入新鲜度、场景路由、Prompt、零参考及图片服务守卫。网页generate会接质量校验，因此本轮使用既有generation-only入口，不调用startValidated或校验器。没有修改业务代码或绕过业务守卫。

你在本地独立设置保存的配置通过原有configuration对象原位供图片服务读取，并显式传入该profileId；仅使用此功能本轮配置，没有复制任何API Key、加密凭据或settings到新副本，没有读取全局/策划/迁移配置。执行前独占创建授权目录，每次POST在传输前核对请求摘要、目标端点并计数，最多允许一次；失败不会自动重试。

## 摘要与原始文件

| 对象 | SHA256 |
|---|---|
| 确认内容 | 9a30125902f48246e0adad56259d8cee52ee324329a60a06b1e56b0e87643495 |
| 正式Prompt | 8f0a50fa9ddd99021757386bd81ccfa8a682b31dfc706e5eb361cdf0ee745805 |
| Provider Prompt | 103832bda3069f24609f619d13dabb280699df58302d006f8724cf557a311ec9 |
| 实际请求体 | f67862d07324bb76057f51a18a945f322363e487769cb85d9ccbd499b2417269 |
| 原始JPEG | dc0c08b0337ce62cfcdc286371811746e256fee9717f69a42bdf55601f3474da |
| 标准PNG | f77ed999b431ea037fb3c91913b6239b9e4568b94fd372687b44357ea1f2d4b0 |
| 独立实现 | 8e8469e022ed1e2e01bdad208e5e75b9126d35afb46e3ac96e212aaa8c6e6f81 |

- [原始Provider JPEG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-art-medical/real-validation/authorized-execution/jiuzhou-provider-original.jpg)：2816×1584，288751字节。
- [标准业务PNG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-art-medical/real-validation/authorized-execution/jiuzhou-standard-output.png)：2816×1584，3098995字节。
- [实际请求（无认证头）](provider-request.json)、[摘要与像素核对](request-comparison.json)、[调用账本](call-ledger.json)、[响应摘要](image-response-summary.json)、[执行摘要](execution-summary.json)。未保存Provider原始JSON或认证头。
- 批准原文仍为[确认](../confirmed-direction.json)、[正式Prompt](../formal-prompt.txt)、[Provider Prompt](../provider-prompt.txt)，无修改或截断。

## 参数与费用

执行前核对[官方Seedream参数](https://docs.volcengine.com/docs/ark/seedream-5-0-pro?lang=zh)，支持2K档位及Prompt描述宽高比；本次参数保持批准请求原样。按[官方公开价格](https://docs.volcengine.com/docs/ark/model-pricing?lang=en&redirect=1)，单图生成超过261万像素为¥0.60/张；本次4460544像素、无输入图片，公开费率估算约 **¥0.60**。未出现额外模型、校验、重试或批量输出的费用风险。

API返回 input_images=0、generated_images=1、output_tokens=17424、total_tokens=17424，没有返回人民币结算金额。未查询账户账单、余额或优惠，**实际结算金额未知**，公开估算不是付款凭证。[费用记录](fee-record.json)

## 视觉对照与停止

完整逐项检查见[五维视觉对照及P0/P1/P2报告](visual-comparison.md)。图2、图3及茶室化失败图都只作事后分析，没有输入Seedream。艺术曲层更鲜明，但右侧体量较强；设备屏幕偏头颅影像，未呈现明确的专业皮肤分析用途或相向座位关系。暖白、浅木和弱虹彩保留，右侧日照方向性仍明显。以上为助手观察，最终质量由用户审核；两项核心目标尚不能同时确认通过。

执行前后21个受保护根目录逐文件核对不变，覆盖正式项目、历史副本、旧图片、原确认副本和既有报告。没有改Prompt、编译器、Adapter、Golden、人工验收或完整性记录。仅新增本目录脱敏文本报告；图片、运行产物及凭据保留在Git忽略目录，不提交大二进制。不合并、部署或发布。

基线已有112项所属工作流回归、三行业请求对照、Golden及repo:verify通过；此次没有生产行为变更，仅为报告归档重新运行repo:verify，见[门禁结果](gate-results.json)。工程结果不替代视觉验收。

本轮一次生图额度已用完。证据整理后停止，不重试、不重生成、不纠正，等待用户审核。
