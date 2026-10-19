# 九州美学建筑艺术融合｜单张真实生图验证

执行日期：2026-10-18（Asia/Shanghai）。代码基线：`5be446d5c32b43275c3013e64c9946d38f29c61d`；分支：`fix/jiuzhou-architectural-language`。

本轮严格使用最新确认方案，经所属独立工作流正式公共 compile / generate、Provider Adapter 及既有质量校验链路执行。没有修改生产代码、已确认设计方向、Golden 或人工视觉验收状态；没有合并、部署或发布。图2—图4没有上传、注册为参考或进入请求。最终图像仍等待用户人工视觉审核，不宣称已达到校准图质量或稳定达标。

## 图片与执行结果

![本次真实生成图](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architectural-integration/paid-validation/authorized-execution/jiuzhou-standard-output.png)

[业务输出 PNG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architectural-integration/paid-validation/authorized-execution/jiuzhou-standard-output.png) · [原始 Provider JPEG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architectural-integration/paid-validation/authorized-execution/jiuzhou-provider-original.jpg) · [上一轮中央雕塑图片](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architectural-language/paid-validation/authorized-execution/jiuzhou-standard-output.png)

- 真实生图成功：Seedream 5.0 Pro，HTTP 200，80.921 秒，2816×1584，精确 16:9；业务输出与原始 Provider 图片均已保存。
- Qwen3.6-plus 唯一一次校验成功：HTTP 200，104.529 秒，返回 `passed`，本轮没有超时。业务全程 186.799 秒。
- 总共 2 次可能计费模型请求：生图 1/1、质量校验 1/1；自动重试、重生成、定向纠正及额外请求均为 0。额度已用完，执行进程已退出。
- 生图模型 `doubao-seedream-5-0-pro-260628`，Provider `volcengine`，协议 `seedream-image`；2K、16:9、单张、接待主厅入口视角，斜向构图要求保留在确认 Prompt 中。`generationBasis: standard`、`referenceAssetIds: []`，实际请求无 `image` 字段，API usage 也记录输入图片 0、生成图片 1。

## 方案与隔离核对

确认 SHA256：`43ca56e5048923d14193a7e6074dde7e6307b659d3e1497f3c9f285aecca313f`。

正式 Prompt SHA256：`f198bce5f89752defb0a2eddf08d99c9a4acff0c4c7b1742d256a6f994507cc2`。

Provider Prompt SHA256：`c78fe636b197308cc9fb8428be41f13a344804903b260d8e11a4527b724e4de6`。

实际请求体 SHA256：`9efb0fad70b5aaf5e4d495359828aa2b3d58dc6baa1ae3159325632f20607908`。

以上均与最新离线审查基线精确匹配，没有回退旧确认或手工注入确认 JSON。[确认记录](../confirmed-direction.json)、[正式 Prompt](../formal-prompt.txt)、[Provider Prompt](../provider-prompt.txt)、[请求一致性](./request-comparison.json)可复核。

由最新审查副本的项目数据建立全新隔离验证环境，用户在正规独立设置页面重新保存两项真实 Profile。没有读取后输出或搬运旧真实 API Key；运行时仅由既有加密凭据存储向正式业务链路供给凭据，请求头不落盘。离线副本中的 .invalid 配置没有被当成真实端点。新环境的加密凭据留在 Git 忽略路径，不进入 Prompt 或报告。

原正式项目、上一轮真实测试项目、新方案离线审查项目均核对文件清单不变；历史图片和确认记录哈希不变，见执行摘要。预检只做正式离线编译、DNS/TLS 与官方公开价格查询，没有连接测试推理请求。旧确认记录来源声明中的“本轮不授权”属于上一轮离线审查的历史授权边界，本轮真实调用依据当前用户单独明确授权；原确认记录未因此被改写。

## 四项初步目视评估

以下是代理对可见画面的初步观察，既不是用户验收，也不是建筑实测。

| 项目 | 相比上一轮的改善 | 尚未解决或无法证明 |
| --- | --- | --- |
| A 建筑艺术融合 | 中央独立花瓣团块消失；层片沿右侧建筑界面延伸到上部采光边界；中心通路和后方大开口更清楚，实体墙、顶面和开口共同建立建筑体量 | 右侧仍是密集屏风，层间透见后景有限；无法由单图证明真实净高、撤除艺术后的完整建筑效果或构造合理性 |
| B 装置精致度 | 方向性长层片和细边较清楚，局部珠光虹彩可见，不再是独立羽束/花瓣簇 | 宽大乳白层面和底部仍显厚，部分区域不透明；层间留隙与半透明深度未充分达到目标 |
| C 商业功能组织 | 前景到达、左侧接待、右侧座椅与小桌、背景开敞过渡可读；没有突出双侧密集房门的狭长走廊 | 座椅主要为线性分布，成组交流关系较弱；后方更像树景休憩入口，错位隐私边界和后续运营递进不够明确，五段式未被完整证明 |
| D 气质材质保真 | 暖白乳白背景、中性软装和局部弱紫虹彩保留，上一轮紫色靠垫消失；整体仍安静明亮 | 明确斜向阳光及座椅/地面阴影仍在，未完全实现柔和漫射光；大面积层片仍可能读成乳白实体艺术墙 |

单张图显示建筑融合方向有改善，但商业组织、精密透景及柔光仍需人工判断。下一轮问题只能作为审查建议，不在本轮继续改设计或追加模型调用。详见[逐项对照](./visual-comparison.json)。

## 自动校验的范围

Qwen 识别到接待台、半透明珠光层墙、候客桌椅、后方拱形开口、左侧门洞和自然光，返回品牌气质匹配、场景完整、无质量问题，且 `humanReviewRequired: true`。Logo 状态为 `pending_post_composite`，本轮没有执行标识合成。

该校验是既有通用交付物判断，不能证明所有 A—D 专项要求已经达成，也没有替代本报告对线性候客、隐私入口、材料厚重和定向阴影的保留意见。工程一致性通过、自动校验 passed、用户视觉验收待定是三个不同结论。[校验结果](./validation-result.json)。

## 图片完整性与费用

原始 JPEG SHA256：`2a0698e00735d4460aa530a2c409645939cbbb9a186acdee6e000674ba9a09c4`。

业务 PNG SHA256：`9ce5f34d69428fe723dde6e8359c0679fb4c1cb95c1b2257ea673b457abd4187`。

Seedream usage：输入图片 0、生成图片 1。按公开 2K 单图价格估算 ¥0.60。Qwen usage：输入 2309、输出 6124 Token（含推理输出）；按北京小于等于 256K 档输入 ¥2/百万、输出 ¥12/百万估算 ¥0.078106；合计 **¥0.678106**。自定义端点账户的实际账单可能不同，API 没有返回结算金额，不能把估算视为已扣费金额。

执行前未发现异常收费迹象；正式端点证书有效，两项请求成功，没有认证探测、重定向转发或追加调用。费用来源：[火山方舟价格](https://docs.volcengine.com/docs/ark/model-pricing?lang=en&redirect=1)、[Qwen 官方价格](https://help.aliyun.com/zh/model-studio/qwen3-6-plus)。查询日期为执行日期。[费用记录](./fee-record.json)。

## 证据与停止状态

[执行摘要](./execution-summary.json)、[调用台账](./call-ledger.json)、[预检](./preflight-summary.json)、[图像响应摘要](./image-response-summary.json)、[Qwen 响应摘要](./validation-response-summary.json)、[原始本地产物索引](./local-artifact-index.json)。原始响应及含图校验请求只保存在本地忽略目录，不进入 Git；本目录仅包含脱敏摘要、业务校验结果及报告。

真实生成与证据整理完成后停止。未更新人工验收、质量冻结或完整性记录，未提交、推送、合并或发布。本轮两次调用授权均已使用，最终图片交由用户人工审核。

脱敏报告完成后，`npm run repo:verify` 通过（离线，0 次模型调用）；新增报告的四类凭据形状及行尾空白检查通过。Git 变更仅为本次新增审查目录。
