# Phase 4 — Unified Pipeline / Packet Report 自查

## 输入

- ProjectRecord 硬事实。
- 原始视觉资产附件与资产 ID。
- Unified Visual Understanding 的 A-F 结构化模型输出。

## 输出

- `visual-decision-packet.json`：独立持久化的生图执行主源。
- `project-visual-context.vnext.json`：同时保存 Packet 与旧 Prompt Source 兼容对象。
- 人类分析报告：由同一 Packet 确定性渲染，不再从报告二次摘要生成 Prompt。
- 报告显式区分 `[Source Fact]`、`[User Confirmed]`、`[AI Diagnosis]`、`[Creative Proposal]` 和 `[Unknown]`。

## 行为变化

- Unified 提取只接收 ProjectRecord 和原始视觉附件，不接收旧报告 Markdown。
- 正式模式下，诊断、唯一命题、气质边界、抽象或空间色材光缺失会抛出 `PROMPT_SOURCE_INSUFFICIENT` 并重试一次。
- Hard Fact 不足时保留探索模式，不把模型推断升级为正式品牌结论。
- packaging/poster/vi 在本轮报告中明确标记为接口未实现，不生成虚假最终结论。
- 若 Unified 提取连续失败，旧报告仍可作为可读回退，既有功能不会因新链路失败而丢失。

## Golden Prompt 覆盖

- JZ-01 至 JZ-22 所需字段现在均可从同一 Packet 追溯到报告与 Prompt Source。
- 报告不再把 AI 英文名、AI 色彩、辅助图形、字体或网格自动列为 Locked。

## 仍缺失项

- Prompt Compiler 直接读取 Packet 并执行冲突/覆盖门禁。
- Backtrace Audit 的自动覆盖率报告。
- 九州真实 Provider 回归和跨项目防过拟合回归。

## 测试结果

- Desktop：220/220 通过。
- TypeScript：通过。
- `npm run verify:current-flows`：通过，且全程离线、零真实模型调用。
