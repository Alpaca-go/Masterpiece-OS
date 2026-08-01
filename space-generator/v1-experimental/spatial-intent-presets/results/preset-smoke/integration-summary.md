# Phase v1.0 (Spatial Intent Presets) — 4 × 4 Smoke Summary

- **Generated**: 2026-08-01T16:55:22.005Z
- **Phase**: v1.0 (Spatial Intent Presets / Design Intent Controller)
- **Status**: text-level 4×4 smoke complete; no Provider called.
- **Schema**: 4 user-facing presets (brand_driven / architecture_driven / reference_driven / balanced), 4-dim intent expression (brandExpression / architectureExpression / referenceInfluence / industryConstraint).

## 1. Per-Brand Recommended Preset (per §11)

| Brand | Recommended Preset | Why |
| --- | --- | --- |
| jiuzhou-aesthetics | architecture_driven | §11: 强化建筑秩序 / 材质高级感 / 空间仪式感 |
| feng-tang-tang | balanced | §11: 平衡 Brand / Industry / Architecture / Material |
| yi-ji-liang-fang | balanced | 跟 FTT 同行业, 适合 balanced |
| wa-ye | brand_driven | §11: 强化 IP / 品牌色 / 年轻气质 / 视觉识别 |

## 2. Per-Case Result (4 brand × 4 preset = 16 cases)

| Brand | Preset | Recommended | blockCount | chars | presetBlock chars | arch_dna | brand_trans | space_role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| jiuzhou-aesthetics | brand_driven |  | 18 | 14296 | 1564 | ✓ | ✓ | ✓ |
| jiuzhou-aesthetics | architecture_driven | ✓ | 18 | 14360 | 1621 | ✓ | ✓ | ✓ |
| jiuzhou-aesthetics | reference_driven |  | 18 | 14279 | 1543 | ✓ | ✓ | ✓ |
| jiuzhou-aesthetics | balanced |  | 18 | 14113 | 1385 | ✓ | ✓ | ✓ |
| feng-tang-tang | brand_driven |  | 18 | 12038 | 1563 | ✓ | ✓ | ✓ |
| feng-tang-tang | architecture_driven |  | 18 | 12102 | 1620 | ✓ | ✓ | ✓ |
| feng-tang-tang | reference_driven |  | 18 | 12021 | 1542 | ✓ | ✓ | ✓ |
| feng-tang-tang | balanced | ✓ | 18 | 11855 | 1384 | ✓ | ✓ | ✓ |
| yi-ji-liang-fang | brand_driven |  | 18 | 12470 | 1560 | ✓ | ✓ | ✓ |
| yi-ji-liang-fang | architecture_driven |  | 18 | 12534 | 1617 | ✓ | ✓ | ✓ |
| yi-ji-liang-fang | reference_driven |  | 18 | 12453 | 1539 | ✓ | ✓ | ✓ |
| yi-ji-liang-fang | balanced | ✓ | 18 | 12287 | 1381 | ✓ | ✓ | ✓ |
| wa-ye | brand_driven | ✓ | 17 | 11532 | 1556 | ✓ | ✓ | ✓ |
| wa-ye | architecture_driven |  | 17 | 11596 | 1613 | ✓ | ✓ | ✓ |
| wa-ye | reference_driven |  | 17 | 11515 | 1535 | ✓ | ✓ | ✓ |
| wa-ye | balanced |  | 17 | 11349 | 1377 | ✓ | ✓ | ✓ |

## 3. Phase v1.0 §principles verification (per brand, across 4 presets)

- **architecture_dna byte-equal across 4 presets within same brand (16 cases)**: ✓ PASS
- **brand_translation byte-equal across 4 presets within same brand (16 cases)**: ✓ PASS
- **space_role_context (9C.1) byte-equal across 4 presets within same brand (16 cases)**: ✓ PASS (Phase v1.0 + 9C.1 不冲突)
- **industryConstraint always 'maintain'** (Phase v1.0 §3 永远不 drop industry logic): ✓ PASS (4 preset × 4 brand = 16 cases all maintain)
- **no weight numbers in prompt layer** (Phase v1.0 §3 / §7): ✓ PASS (all 4 preset emphasis text checked, no "70%" / "weight 80" patterns)
- **preset single-select only** (Phase v1.0 §8): ✓ PASS (compileSpaceRuntime options.preset accepts single string, no combination)

## 4. Test Cases (per §11)

### Case 01: Brand Driven × 蛙耶
- **Expected**: 强化 IP / 品牌色 / 年轻气质 / 视觉识别
- **Actual**: brand_driven intent (brand=dominant / arch=balanced / ref=low / industry=maintain), 17 blocks (WA-ye 9C.1 default 16 + 1 preset)

### Case 02: Architecture Driven × 九州美学
- **Expected**: 强化建筑秩序 / 材质高级感 / 空间仪式感
- **Actual**: architecture_driven intent (brand=balanced / arch=dominant / ref=low / industry=maintain), 18 blocks (JZMX 9C.1 default 17 + 1 preset)

### Case 03: Balanced × 冯烫烫
- **Expected**: 平衡 Brand / Industry / Architecture / Material
- **Actual**: balanced intent (brand=balanced / arch=balanced / ref=balanced / industry=maintain), 18 blocks (FTT 9C.1 default 17 + 1 preset)

### Case 04: Reference Driven × 任意 (跟 4 brand 兜底)
- **Expected**: 学参考图 composition / spatial grammar / lighting / material, 禁止复刻 logo / 文案 / 原品牌资产
- **Actual**: reference_driven intent (brand=balanced / arch=balanced / ref=dominant / industry=maintain), 4 brand 全部 17/18 blocks, "DO NOT copy logo" / "Treat Reference = Design Mechanism" 等核心原则在 emphasis text 出现

## 5. Phase v1.0 §12 success criteria

- ✓ 用户可理解 4 种模式 (label 中英双语 + 适用场景 + runtimeTendency enhance/maintain 显式列出)
- ✓ 模式之间生成结果存在明显差异 (4 preset emphasis text 4 distinct fingerprints, 4 distinct content)
- ✓ 不破坏 Brand DNA (architecture_dna / brand_translation byte-equal across 4 presets, 16 cases 全过)
- ✓ 不破坏 Industry Logic (industryConstraint=maintain 永远保持, 4 brand 通过 9C.0.5 brand identity gate)
- ✓ 不增加 Prompt 混乱 (text-based emphasis, no weight numbers, 4 preset emphasis text 4 distinct)
- ✓ 不增加大量测试成本 (4 preset × 4 brand = 16 cases, text-level, < 1 minute)

## 6. Phase v1.0 §13 后续路线

- Spatial Intent Presets ✓ (current commit)
- Multi-brand Validation (Phase 9D)
- Professional Design Intent Controller (Phase 10 — 弱/中/强 等级)
- Adaptive Recommendation

## 7. Constraints

- No image gen, no Provider API, no LLM call: pure text-level compile + diff
- No 5.0 production code pollution (apps/cli / apps/desktop / packages unchanged)
- v1-baseline (Phase 9A.2 / 9A.3 / 9B.1 / 9B.2 / 9C / 9C.0.5 / 9C.1) all preserved (preset is opt-in via options.preset)
