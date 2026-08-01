# Phase 9B.1 — Spatial Reality Pipeline A/B Comparison (text-level)

- **Generated**: 2026-08-01T12:17:54.581Z
- **Phase**: 9B.1 (Space Generator v1.1)
- **Status**: text-level A/B complete (image-level requires real-provider smoke)
- **Mode A**: `compileRuntimePromptModeASpatialReality` = Phase 9B Mode B (14 块, baseline)
- **Mode B**: `compileRuntimePromptWithSpatialReality` = Phase 9B Mode B + spatial_reality_constraint 块 (15 块)

## 0. 目的

Phase 9B.1 在 Phase 9B Spatial Intelligence 基础上, 加 Spatial Reality Constraint
(8 字段硬约束 + 反漂移), 防止 Spatial Intent 增强后模型偏向 exhibition / installation
/ concept architecture, 提升商业真实性.

这一步只做 prompt 文本级 A/B 对比, 不调真实 Provider.

真实 Provider image-level A/B 由单独的 user-authorized smoke 跑, 不在本自动 phase 内.

## 1. 3 brand 概览

| Brand | Mode A blocks | Mode A chars | Mode B blocks | Mode B chars | Block diff | Char diff | Char ratio | Required zones | Forbidden |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| jiuzhou-aesthetics | 14 | 8698 | 15 | 10515 | +1 | +1817 | +20.9% | 6 | 8 |
| feng-tang-tang | 14 | 6634 | 15 | 8342 | +1 | +1708 | +25.7% | 5 | 8 |
| yi-ji-liang-fang | 14 | 6872 | 15 | 8693 | +1 | +1821 | +26.5% | 6 | 8 |

## 2. 3 brand 8 字段 spatialRealityDna

| Brand | spaceType | requiredZones count | forbiddenSpatialTypes count |
| --- | --- | --- | --- |
| jiuzhou-aesthetics | medical_aesthetics_clinic | 6 | 8 |
| feng-tang-tang | casual_dining_restaurant | 5 | 8 |
| yi-ji-liang-fang | tcm_wellness_clinic | 6 | 8 |

## 3. 3 brand forbiddenSpatialTypes (反漂移)

| Brand | 关键 forbidden |
| --- | --- |
| jiuzhou-aesthetics | hospital corridor (硬墙 + 顶灯 + 排椅) / art gallery (空墙 + 射灯 + 单件艺术品) / modern museum (白盒 + 离散雕塑) ... +5 more |
| feng-tang-tang | fine dining (无桌布 / 无水晶灯 / 无 5 道菜礼仪) / modern art museum (白盒 + 离散雕塑 + 静音) / art gallery (空墙 + 射灯) ... +5 more |
| yi-ji-liang-fang | modern hospital (硬墙 + 顶灯 + 排椅 + 消毒水) / spa (纯白 + 流水 + 香薰 + 慢节奏冥想) / modern museum (白盒 + 雕塑 + 巡游) ... +5 more |

## 4. 块结构 (Mode B = 15 块)

Mode B 在 Phase 9B Mode B (14 块) 基础上, 在 `architecture_language` 之后插入 1 个新块:

1. `task`
2. `spatial_intent` (Phase 9A.2 — 体验目标 + spatial strategy)
3. `architecture_language` (Phase 9A.3 — 5 字段 high-level 方向)
4. `spatial_reality_constraint` (Phase 9B.1 — 8 字段商业现实硬约束, **本 phase 新增**)
5. `architecture_context` (Phase 8A anchor in-context reference)
6. `architecture_function_bridge` (Phase 8B.1)
7. `architectural_concept` / `architecture_dna` / `brand_translation` / `functional_requirement`
8. `material` / `lighting` / `composition` / `rendering`
9. `negative_constraints`

## 5. §8 冻结验证

Phase 9B.1 §8 冻结: **Spatial Intent / Architecture Anchor / architecture_context 都不动**.
禁止降低建筑语言能力.

- ✓ Mode B compiledSpatialIntent (Phase 9A.2) 不变
- ✓ Mode B architectureLanguage (Phase 9A.3) 不变
- ✓ Mode B architecture_context (Phase 8A) block content 不变
- ✓ Mode A = Phase 9B Mode B (14 块 baseline 100% 兼容)

## 6. 验证

- ✓ 3 brand 各自 distinct 8 字段 (spaceType / requiredZones / forbiddenSpatialTypes)
- ✓ 3 brand JZMX 含 'hospital corridor' forbidden, FTT / YJLF 不含
- ✓ 3 brand FTT requiredZones 含 'open_kitchen' signature, YJLF 含 'tea_corner', JZMX 含 'consultation_room'
- ✓ Mode A 14 块 (Phase 9B Mode B baseline, 100% 不变)
- ✓ Mode B 15 块 (14 + spatial_reality_constraint)
- ✓ Mode B 块顺序正确 (spatial_reality_constraint 在 architecture_language 之后, architecture_context 之前)
- ✓ 8 字段全覆盖 (spaceType / commercialScale / requiredZones / operationLogic / userFlow / privacyRequirement / materialReality / forbiddenSpatialTypes)
- ✓ compileFieldEnrichedPrompt 100% 不变 (11 块 baseline 仍然返回 11 块)
- ✓ compileRuntimePromptWithSpatialIntelligence 100% 不变 (14 块 Phase 9B Mode B 仍然返回 14 块)
- ✓ 不调真实 Provider (no fetch / http / LLM imports)

## 7. 6 维评价指标 (§6)

| 指标 | 目标 | Mode B 改进点 | 验证方法 |
| --- | --- | --- | --- |
| Brand Translation | 不下降 | architecture_context / brand_translation 块不变 | image-level 需人工 |
| Architecture Quality | 不下降 | architecture_language 块不变 | image-level 需人工 |
| Functional Realism | 提升 ≥15% | spatial_reality_constraint 显式列 requiredZones + userFlow | image-level 需人工 |
| Commercial Realism | 提升 ≥20% | materialReality 强制真实材料 + forbiddenSpatialTypes 反漂移 | image-level 需人工 |
| Spatial Coherence | 提升 | spaceType + commercialScale 给模型量化的空间类型 / 规模 | image-level 需人工 |
| Visual Quality | 保持 | 不修改任何视觉相关 baseline | image-level 需人工 |

## 8. 文件

- `results/{brand}/mode-A.prompt.md` — Mode A compiled prompt
- `results/{brand}/mode-B.prompt.md` — Mode B compiled prompt
- `results/{brand}/ab-comparison.json` — A/B 对比结构化 (block count / char count / diff / spatialRealityDna)
- `results/ab-comparison-aggregate.json` — 3 brand 聚合

## 9. 下一 phase: Phase 9C — Spatial Intelligence Runtime Integration (§10)

真实 Provider smoke (user-authorized) 后, 把 spatial-reality layer 跟 spatial-intelligence 一起挪到 production runtime.
