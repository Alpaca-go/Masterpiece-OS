# Phase 9B — Spatial Intelligence Pipeline A/B Comparison (text-level)

- **Generated**: 2026-08-01T10:48:30.236Z
- **Phase**: 9B (Space Generator v1.1)
- **Status**: text-level A/B complete (image-level requires real-provider smoke)
- **Mode A**: `compileRuntimePromptModeA` = Phase 8C compileRuntimePrompt (anchor_aware_8a_8b1)
- **Mode B**: `compileRuntimePromptWithSpatialIntelligence` = Mode A + spatial_intent + architecture_language

## 0. 目的

Phase 9B 验证 Spatial Intelligence (Phase 9A.1 / 9A.2 / 9A.3) 是否提升 brand-to-space 翻译.
这一步只做 **prompt 文本级** A/B 对比, 不调真实 Provider.

真实 Provider image-level A/B 由单独的 user-authorized smoke 跑 (在 apps/desktop/scripts/phase-9b/),
不在本自动 phase 内.

## 1. 3 brand 概览

| Brand | Mode A blocks | Mode A chars | Mode B blocks | Mode B chars | Block diff | Char diff | Char ratio |
| --- | --- | --- | --- | --- | --- | --- | --- |
| jiuzhou-aesthetics | 12 | 7255 | 14 | 8698 | +2 | +1443 | +19.9% |
| feng-tang-tang | 12 | 5281 | 14 | 6634 | +2 | +1353 | +25.6% |
| yi-ji-liang-fang | 12 | 5401 | 14 | 6872 | +2 | +1471 | +27.2% |

## 2. 3 brand Mode B spatial intent + architecture language

| Brand | Experience Goal | Spatial Principles (Mode B) |
| --- | --- | --- |
| jiuzhou-aesthetics | 创造低压力、高信任的专业医疗体验 | gradual transition / controlled openness / balanced privacy / continuous space / soft boundary / controlled transparency |
| feng-tang-tang | 创造可信赖的、围绕食物制作的日常餐饮体验 | human scale / visible process / warm interaction |
| yi-ji-liang-fang | 创造慢节奏的、可被理解的中医调理体验 | layered privacy / natural material relationship / quiet circulation / natural materials / calm circulation |

## 3. 块结构 (Mode B = 14 块)

Mode B 在 Mode A (12 块 anchor-aware) 基础上, 在 `task` 之后插入 2 个新块:

1. `task` (Mode A 第 1 块)
2. `spatial_intent` (Phase 9A.2 — 体验目标 + spatial strategy)
3. `architecture_language` (Phase 9A.3 — 5 字段 architecture language)
4. `architecture_context` (Phase 8A anchor in-context reference)
5. `architecture_function_bridge` (Phase 8B.1)
6. `architectural_concept` / `architecture_dna` / `brand_translation` / `functional_requirement`
7. `material` / `lighting` / `composition` / `rendering`
8. `negative_constraints`

## 4. 验证

- ✓ 3 brand 各自 distinct experienceGoal
- ✓ 3 brand spatialPrinciples 不重叠 (JZMX continuous space, FTT human scale, YJLF layered privacy)
- ✓ Mode A 不含 spatial_intent / architecture_language (12 块)
- ✓ Mode B 包含全部 12 baseline 块 + 2 个新块 (14 块)
- ✓ Mode B JZMX 包含 §10 期望: continuous space / soft boundary / controlled transparency
- ✓ Mode B FTT 包含 §10 期望: human scale / visible process / warm interaction
- ✓ Mode B YJLF 包含 §10 期望: layered privacy / natural materials / calm circulation
- ✓ compileFieldEnrichedPrompt 100% 不变 (11 块 baseline 仍然返回 11 块)
- ✓ 不调真实 Provider (no fetch / http / LLM imports)

## 5. 文件

- `results/{brand}/mode-A.prompt.md` — Mode A compiled prompt
- `results/{brand}/mode-B.prompt.md` — Mode B compiled prompt
- `results/{brand}/ab-comparison.json` — A/B 对比结构化 (block count / char count / diff / spatial intent / architecture language)
- `results/ab-comparison-aggregate.json` — 3 brand 聚合

## 6. 下一 phase: Phase 9B image-level smoke (user-authorized)

真实 Provider smoke 在 `apps/desktop/scripts/phase-9b/` 提供, 需要:

1. profile IDs (text + image, 来自 `C:\Users\Administrator\AppData\Roaming\masterpiece-os-desktop\credentials\`)
2. representative project ID (来自 `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\`)
3. 用户的 explicit authorization

跑完后:
- `validation-results/phase-9B/{brand}/mode-A/{run.json, prompt.md, image.png}`
- `validation-results/phase-9B/{brand}/mode-B/{run.json, prompt.md, image.png}`
- `validation-results/phase-9B/{brand}/evaluation-report.md`

(per Phase 9B §8 Artifact Storage)
