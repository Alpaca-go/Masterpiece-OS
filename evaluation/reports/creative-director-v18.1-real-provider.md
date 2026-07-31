# Creative Director Decision Layer v18.1 真实 Provider 验证

日期：2026-07-28  
项目：冯烫烫  
用户授权：是  
本记录不包含 API Key 或可恢复凭据。

## 决策层

| 字段 | 结果 |
| --- | --- |
| Provider / Model | qwen / qwen3.6-plus |
| 输入 | 已持久化 Creative Understanding + 视觉分析升级报告 |
| 图片附件 | 0 |
| 状态 | ready |
| 版本 | 1.1.0 |
| 模型调用次数 | 1 |
| 耗时 | 86,080 ms |
| 输出目录 | `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\未标题-c68c6211\creative-session\direction` |

Creative Direction 随后编译为 `Style Profile 1.1.0`，状态为 `confirmed`，其
`source.creativeDecisionId` 指向本次 Direction 转换得到的 Creative Decision。

## Provider 与 Prompt 验证

- Provider / Model：dashscope / wan2.7-image-pro
- Prompt 包含 Creative Direction ID/版本对应的新视觉语言。
- Prompt 包含禁止旧 VI 复制、旧海报换内容、旧包装换皮、旧空间重新排列的规则。
- 最终 Provider 参考图为 1 张 `current_project_logo`。
- 未发送完整 VI 合集、旧海报集合、全部包装图或 Canon 图片。
- Run Store、任务快照、下载与图片校验均复用现有链路。

## 失败驱动修复

第一次真实运行在 Style Profile 编译阶段被阻断：`generationRules` 被同时映射到允许规则
和禁止规则。修复后增加真实 `compileStyleProfile` 回归断言，保证两组规则无交集。

第一次成功生图仍输出 VI 展示板，不满足空间任务。根据失败图修正 Anchor 编译器：

- 按用户任务识别空间、包装、海报责任；
- 空间任务强制地面、墙面、顶面、纵深、动线、家具/服务设施；
- 明确禁止 VI 展示板、规范页、物料合集、平面稿和 Logo 墙替代完整空间；
- 将 `spaceStrategy` 提升为 Task-specific Creative Direction；
- Style Profile 降为支持规则，不得覆盖交付责任。

第二次生图已变为完整空间，但没有身份参考，品牌文字准确度不足。随后修正 Locked Assets：
当 ProjectVisualContext 未提供可用 Logo 图片时，只从 Creative Understanding 中选择最多
1 张 `identity_reference` 作为身份图，不放宽到其他 `reading_only` 原图。

## 最终真实结果

| 字段 | 结果 |
| --- | --- |
| Run ID | `f756ee40-ce84-4b58-99d6-ae2a1fddda3f` |
| 状态 | succeeded |
| 模型调用次数 | 1 |
| 耗时 | 9,652 ms |
| Provider 参考图 | 1 张身份图 |
| 输出 | `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\未标题-c68c6211\image-generation\f756ee40-ce84-4b58-99d6-ae2a1fddda3f\images\image-01.png` |

人工视觉检查（1–5）：

| 指标 | 分数 | 说明 |
| --- | ---: | --- |
| 品牌准确度 | 4 | 品牌名、印章语义与跷脚牛肉品类清晰；局部中文字形仍有模型失真 |
| 重构程度 | 4 | 已从 VI 展示板转为完整可进入餐饮空间；墙面品牌图形仍略多 |
| 分析报告落实 | 4 | 开放后厨、木作、微水泥、克制红色与真实商业尺度得到落实 |
| 设计完成度 | 4 | 单一透视、地墙顶、柜台、桌椅、动线和光线关系完整 |

结论：API、状态机、版本追踪、参考图边界和视觉硬门禁通过。中文精确排印仍应在正式设计
阶段作为后期修正项，不应把生成图中的文字直接视为可交付矢量资产。

## 可复用命令

```powershell
$env:MASTERPIECE_SMOKE_PROJECT_ID='<project-id>'
$env:MASTERPIECE_SMOKE_TEXT_PROFILE_ID='<text-profile-id>'
$env:MASTERPIECE_SMOKE_IMAGE_PROFILE_ID='<image-profile-id>'
npm --prefix apps/desktop run smoke:creative-direction
```

设置 `MASTERPIECE_SMOKE_REUSE_DIRECTION=1` 可复用已持久化 Direction，仅重跑 Provider 图像验收。
