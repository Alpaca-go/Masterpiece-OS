# Phase 9D — Multi-brand / Multi-industry Spatial Regression Validation

- **Generated**: 2026-08-01T23:56:38.535Z
- **Phase**: 9D (Multi-brand / Multi-industry Spatial Regression Validation)
- **Status**: text-level 5 brand × 4 preset = 20 cases; no Provider called.
- **Industry coverage**: 5 (jiuzhou-aesthetics=medical_aesthetics, feng-tang-tang=restaurant, yi-ji-liang-fang=tcm_wellness, wa-ye=casual_dining, jin-xiu=fashion_retail)
- **Spatial Regression Score**: 6 维 / 总分 100 = 平均 (per Phase 9D §8)

## 1. Per-Case Score

| Brand | Preset | Total | Industry | Brand | Arch | Reality | Intent | Cross | Gate | Blocks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| jiuzhou-aesthetics | brand_driven | 75 | 100 | 70 | 30 | 50 | 100 | 100 | pass/low | 18 |
| jiuzhou-aesthetics | architecture_driven | 75 | 100 | 70 | 30 | 50 | 100 | 100 | pass/low | 18 |
| jiuzhou-aesthetics | reference_driven | 75 | 100 | 70 | 30 | 50 | 100 | 100 | pass/low | 18 |
| jiuzhou-aesthetics | balanced | 75 | 100 | 70 | 30 | 50 | 100 | 100 | pass/low | 18 |
| feng-tang-tang | brand_driven | 75 | 100 | 70 | 30 | 50 | 100 | 100 | pass/low | 18 |
| feng-tang-tang | architecture_driven | 75 | 100 | 70 | 30 | 50 | 100 | 100 | pass/low | 18 |
| feng-tang-tang | reference_driven | 75 | 100 | 70 | 30 | 50 | 100 | 100 | pass/low | 18 |
| feng-tang-tang | balanced | 75 | 100 | 70 | 30 | 50 | 100 | 100 | pass/low | 18 |
| yi-ji-liang-fang | brand_driven | 75 | 100 | 70 | 30 | 50 | 100 | 100 | pass/low | 18 |
| yi-ji-liang-fang | architecture_driven | 75 | 100 | 70 | 30 | 50 | 100 | 100 | pass/low | 18 |
| yi-ji-liang-fang | reference_driven | 75 | 100 | 70 | 30 | 50 | 100 | 100 | pass/low | 18 |
| yi-ji-liang-fang | balanced | 75 | 100 | 70 | 30 | 50 | 100 | 100 | pass/low | 18 |
| wa-ye | brand_driven | 87 | 100 | 100 | 70 | 50 | 100 | 100 | pass/low | 17 |
| wa-ye | architecture_driven | 87 | 100 | 100 | 70 | 50 | 100 | 100 | pass/low | 17 |
| wa-ye | reference_driven | 87 | 100 | 100 | 70 | 50 | 100 | 100 | pass/low | 17 |
| wa-ye | balanced | 87 | 100 | 100 | 70 | 50 | 100 | 100 | pass/low | 17 |
| jin-xiu | brand_driven | 82 | 100 | 70 | 70 | 50 | 100 | 100 | pass/low | 17 |
| jin-xiu | architecture_driven | 82 | 100 | 70 | 70 | 50 | 100 | 100 | pass/low | 17 |
| jin-xiu | reference_driven | 82 | 100 | 70 | 70 | 50 | 100 | 100 | pass/low | 17 |
| jin-xiu | balanced | 82 | 100 | 70 | 70 | 50 | 100 | 100 | pass/low | 17 |

## 2. Per-Brand Summary

| Brand | Industry | Recommended Preset | Avg Score | blockCount Consistent | Cross-Space Consistent |
| --- | --- | --- | --- | --- | --- |
| jiuzhou-aesthetics | medical_aesthetics | architecture_driven | 75 | ✓ | ✓ |
| feng-tang-tang | restaurant | balanced | 75 | ✓ | ✓ |
| yi-ji-liang-fang | tcm_wellness | balanced | 75 | ✓ | ✓ |
| wa-ye | casual_dining | brand_driven | 87 | ✓ | ✓ |
| jin-xiu | fashion_retail | architecture_driven | 82 | ✓ | ✓ |

## 3. Per-Preset Summary

| Preset | Avg Score | Distinct Brands |
| --- | --- | --- |
| brand_driven | 79 | 5 |
| architecture_driven | 79 | 5 |
| reference_driven | 79 | 5 |
| balanced | 79 | 5 |

## 4. Phase 9D §11 完成标准

- ✓ **至少 5 行业验证** — covered: 5 (medical_aesthetics, restaurant, tcm_wellness, casual_dining, fashion_retail)
- ✓ **4 种 Spatial Intent Preset 均测试** — tested: 4 (brand_driven, architecture_driven, reference_driven, balanced)
- ✓ **Cross Industry Gate 有效** — all 20 cases pass+low
- ✓ **无重大品牌污染** — all 20 cases industryAccuracy=100
- ✓ **不同 brand 保持差异** — 5 brand 至少 3 distinct average score profiles (JZMX/FTT/YJLF=75, WA-ye=87, JIN-XIU=82)
- ✓ **同 brand 空间保持一致** — all 5 brand crossSpaceConsistency=100 (Phase v1.0 §principles byte-equal)

## 5. Failure Case Database

Total: 5 cases
- Fixed: 2
- Documented: 3
- Open: 0

### waye-001-cross-industry-contamination (high, fixed)
- **Type**: cross_industry_contamination
- **Project**: wa-ye (pre-correction v0.1 DNA)
- **Reason**: Phase 9C.0.5 brand identity validation gate 正确捕获 cross-industry contamination; v0.1 DNA 错把炭烧牛蛙餐饮标成体育用品零售 + 用 medical/tcm concerns
- **Fix module**: Phase 9C.0.5 Brand Identity Validation Gate (阻断) + 9C.0.5 (commit 65252fd 手动 DNA 修正) + 9C.1 WAYE real-provider smoke (commit 9fb35e9 验证)

### waye-002-architecture-context-missing (medium, documented)
- **Type**: architecture_anchor_drift
- **Project**: wa-ye (regression test case)
- **Reason**: Phase 8A architecture anchors 只覆盖 JZMX / FTT / YJLF 3 行业, 缺 wa-ye + jin-xiu
- **Fix module**: Phase 8A.1 architecture anchor expansion (out of Phase 9D scope; per Phase 9D §4 不增加 anchor)

### waye-003-scene-type-fallback (low, documented)
- **Type**: space_role_fallback
- **Project**: wa-ye (casual_dining industry)
- **Reason**: Phase 9C.1 §11 "更多 Anchor" 暂不开发, 跨行业 space_type 复用 reception 兜底
- **Fix module**: Phase 10 Decision Consistency Validator 跨行业 space_type 扩展 (per Phase 9C.0.5 Updated §11 后续路线)

### phase-9d-001-spatial-regression-score-fuzzy (low, documented)
- **Type**: text_level_score_fuzzy
- **Project**: all 5 brand × 4 preset = 20 cases
- **Reason**: text-level 评估无法 100% 准确匹配 DNA 字段名 vs block 实际生成文本 (e.g. JZMX arch_dna block 没显式列 "mineral_plaster" material, 用 "Geometry" 表达)
- **Fix module**: Phase 9E Spatial Intelligence Knowledge Layer (per Phase 9D §12 后续路线) 加 structure-aware 评分

### phase-9d-002-jin-xiu-new-industry (low, fixed)
- **Type**: new_brand_coverage
- **Project**: jin-xiu (fashion_retail, Phase 9D 新增)
- **Reason**: 9C.0.5 rules 已经有 fashion_retail 行业 keywords / materials / motifs, 但缺 5 行业第 5 brand DNA sample
- **Fix module**: Phase 9D (this commit) 加 jin-xiu 5 行业第 5 brand 配套

## 6. Phase 9D §12 后续路线

- Phase 9D ✓ (current commit)
- Phase 9E Spatial Intelligence Knowledge Layer
- Phase 10 Decision Consistency Validator
- Phase 11 Professional Design Intent Controller

## 7. Constraints

- No image gen, no Provider API, no LLM call: pure text-level compile + score
- No 5.0 production code pollution (apps/cli / apps/desktop / packages unchanged)
- v1-baseline (Phase 9A.2 / 9A.3 / 9B.1 / 9B.2 / 9C / 9C.0.5 / 9C.1 / v1.0) all preserved
- 5.0 release gate 全过 (workspace-boundaries / no-obsolete-code / production-boundaries / no-project-specific-production-rules / golden-boundary / current-flows)
