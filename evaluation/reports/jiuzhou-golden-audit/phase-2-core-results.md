# Phase 2 — Unified Visual Understanding Core 自查

## 输入

- `ProjectRecord` 中用户确认的品牌名、行业、Logo 和 Locked Facts。
- 原始视觉资产元数据。
- 结构化模型输出中的逐事实来源、证据、置信度、资产分类、诊断和创意决策。

## 输出

- `VisualUnderstandingCore`：
  - `projectFacts`：品牌名、行业、品牌角色均携带来源、证据、置信度和状态。
  - `lockedAssets`：仅允许 `source_fact` 或 `user_confirmed`。
  - `assetInventory`：区分品牌资产、Mockup 环境、参考案例和展示装饰。
  - `diagnosis`：价值、过度、过时、系统弱项、品类俗套、误读风险和跨媒介缺口。
  - `creativeDecision`：唯一升级命题、保留/弱化/升级目标、世界观、气质边界和战略禁止项。
  - `validation`：Hard Fact Gate 与明确的探索模式提示。

## Golden Prompt 覆盖项

- JZ-01 高端医美全链生态平台。
- JZ-02/JZ-03 普通美容院与传统医院诊室误读风险。
- JZ-04/JZ-05/JZ-06 东方生命美学、现代医疗专业感、未来材料科技感。
- JZ-07/JZ-08 高饱和紫和具象孔雀表达的诊断。
- JZ-12/JZ-13/JZ-14 气质正反边界。
- JZ-20 专业、稳定、可信赖和长期价值的创意命题来源。
- JZ-22 茶空间、零售、售楼处和霓虹等场景误读风险的数据入口。

## 仍缺失项

- JZ-09 至 JZ-11：多维视觉抽象和空间结构/光线转译。
- JZ-15 至 JZ-19：空间专属色彩、材料和光线行为。
- JZ-21：Prompt Compiler 的 Logo 条件分支与冲突检测。
- Packet 持久化、报告渲染、Backtrace 自动生成和最终 Prompt 覆盖门禁。

## 单元测试结果

- Desktop 测试：211/211 通过。
- 新增用例覆盖：
  - ProjectRecord 硬事实覆盖模型推断；
  - AI 英文名和 AI 色彩提案不得 Locked；
  - Mockup 木材背景不进入品牌资产；
  - 品牌角色或 Logo 未确认时阻断正式升级；
  - 九州诊断与唯一升级命题保持项目专属性。
