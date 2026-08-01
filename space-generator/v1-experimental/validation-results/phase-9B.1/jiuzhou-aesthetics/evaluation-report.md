# Phase 9B — jiuzhou-aesthetics A/B Evaluation (real-provider)

- **Generated**: 2026-08-01T12:48:20.067Z
- **Project**: a7a56ed7-849f-4671-b47a-466394d7298d
- **Brand**: jiuzhou-aesthetics
- **Provider / Model**: profile-e871b4c5-7499-4749-b838-02410ad19cb1 (image), profile-397281cc-653f-4822-ae4e-601ca7f8a63b (text)
- **Mode A**: Previous Pipeline (Phase 8C compileRuntimePrompt)
- **Mode B**: Spatial Intelligence Pipeline (Phase 9A.2 + 9A.3 + 8A + 8B.1)

## A vs B 跑批结果

| 指标 | Mode A | Mode B |
| --- | --- | --- |
| Status | succeeded | succeeded |
| Duration (ms) | 98530 | 80803 |
| Model call count | n/a | n/a |
| Image bytes | 581197 | 399785 |
| Block count (prompt) | 14 | 15 |
| Char count (prompt) | 8698 | 10515 |

## Phase 9B §3 Validation Objectives

- **Q1 (Spatial Intent → brand-to-space)**: Mode B 包含 compiledSpatialIntent (Phase 9A.2), 把 5 字段体验目标翻译给模型. Mode A 无.
- **Q2 (Architecture Bridge → architectural reasoning)**: Mode B 包含 architectureLanguage (Phase 9A.3), 5 字段 high-level 方向. Mode A 无.
- **Q3 (Function Bridge → commercial realism)**: 两者都有 architecture_function_bridge (Phase 8B.1), 一致.
- **Q4 (完整链路减少 generic AI 空间生成)**: 需人眼对比两张图. 见 evaluation-report.md 下面 §6.

## 图像级 6 维评分 (人工, v1.0 §25)

> 评分方法: 同一 DNA 跑 Mode A + Mode B, 真正看图 (而非 prompt 文本) 评估.
> 这一步由人工填, 不在自动 smoke 范围内.

| 维度 | Mode A | Mode B | 差异 |
| --- | --- | --- | --- |
| architecture_quality (25) |  /25 |  /25 |  |
| brand_translation (20) |  /20 |  /20 |  |
| functional_realism (20) |  /20 |  /20 |  |
| material_lighting (15) |  /15 |  /15 |  |
| composition (10) |  /10 |  /10 |  |
| rendering (10) |  /10 |  /10 |  |
| **总计** |  /100 |  /100 |  |

## Phase 9B §6.2 New Metrics

| 指标 | Mode A | Mode B |
| --- | --- | --- |
| Intent Alignment Score | (人工) | (人工) |
| Spatial Logic Score | (人工) | (人工) |
| Reasoning Trace Score | (人工) | (人工) |

## 文件

- mode-A/run.json / prompt.md / image.png
- mode-B/run.json / prompt.md / image.png
- evaluation-report.md (本文件)
