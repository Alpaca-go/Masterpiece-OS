# Phase 3 — Visual Abstraction / Spatial Translation / Decision Packet 自查

## 输入

- Phase 2 `VisualUnderstandingCore`。
- 原始资产的语义、形式、节奏、材料与光线抽象结果。
- 空间成果物的结构、材料、光线、色彩、品牌融合、功能体验和误读风险。

## 输出

- `VisualAbstractionV2`：不再把孔雀羽毛压缩为单一“几何纹理”。
- `SpatialTranslationV2`：完整可执行的空间转译。
- `MediaTranslationPacketV2`：spatial 完整实现，packaging/poster/vi 明确标记为 `interface_only`。
- `VisualDecisionPacket`：分析报告与 Prompt Compiler 的共同执行源。
- `visualDecisionPacketToPromptSourceObject`：旧 vNext 上下文的无报告兼容适配。

## Golden Prompt 覆盖项

- JZ-09 柔性层叠曲线。
- JZ-10 半透明生物组织结构。
- JZ-11 光线穿透与渐变层次。
- JZ-15/JZ-16/JZ-17 珍珠白、矿物灰、低饱和矿物紫与 70/20/10。
- JZ-18 微水泥、哑光石材、磨砂玻璃、半透明树脂。
- JZ-19 自然侧光、低对比与漫反射。
- JZ-22 空间误读风险进入可执行负面规则。

## 仍缺失项

- 统一模型输出与 Pipeline 持久化。
- 人类报告由 Packet 确定性渲染。
- Prompt Compiler 直接读取 Packet、冲突检测和覆盖门禁。
- Backtrace Audit 自动 JSON/Markdown 输出。

## 单元测试

- 羽毛抽象覆盖语义、形式、节奏、材料与光线。
- 空间色彩/材料/光线行为可执行且完整。
- 非空间媒介不会伪装为已实现。
- 空间数据不足时标记 `executionDataStatus=insufficient`。
- 兼容适配保留抽象因果链和项目专属禁止项。
