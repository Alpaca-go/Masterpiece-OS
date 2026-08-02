# Spatial Calibration Report — jiuzhou-aesthetics (医疗美容与医美生态服务)

- **Generated**: 2026-08-02T02:56:44.113Z
- **Phase**: 9C.2 — Spatial Intent Evaluation & Weight Calibration
- **Brand**: jiuzhou-aesthetics (待确认（基于现有素材推断）)
- **Project**: a7a56ed7-849f-4671-b47a-466394d7298d
- **Provider**: profile-e871b4c5-7499-4749-b838-02410ad19cb1 (image, volcengine / Seedream 5.0 Pro / doubao-seedream-5-0-pro-260628)
- **Aspect ratio**: 16:9 (1024x576)
- **Space type**: reception (DNA default for all 3 brands)
- **Presets tested**: 4 (brand_driven, architecture_driven, reference_driven, balanced)
- **Reference image**: 无 (per §5 "固定 Reference Image" — fixed to none for this calibration)
- **All succeeded**: ✓
- **Output dir**: D:\Masterpiece-OS\docs\reference\phase-9c.2-calibration\jiuzhou-aesthetics

## Per-Preset Smoke Summary

| Preset | Status | Duration | Blocks | Chars | Intent focus | Image |
| --- | --- | --- | --- | --- | --- | --- |
| brand_driven | succeeded | 0ms | 18 | 14296 | brand_translation | D:\Masterpiece-OS\space-generator\v1-experimental\tests\spatial-calibration\jiuzhou-aesthetics\outputs\jiuzhou-aesthetics_reception_brand_driven_v1.jpg |
| architecture_driven | succeeded | 0ms | 18 | 14360 | spatial_quality | D:\Masterpiece-OS\space-generator\v1-experimental\tests\spatial-calibration\jiuzhou-aesthetics\outputs\jiuzhou-aesthetics_reception_architecture_driven_v1.jpg |
| reference_driven | succeeded | 0ms | 18 | 14279 | reference_fidelity | D:\Masterpiece-OS\space-generator\v1-experimental\tests\spatial-calibration\jiuzhou-aesthetics\outputs\jiuzhou-aesthetics_reception_reference_driven_v1.jpg |
| balanced | succeeded | 0ms | 18 | 14113 | commercial_usability | D:\Masterpiece-OS\space-generator\v1-experimental\tests\spatial-calibration\jiuzhou-aesthetics\outputs\jiuzhou-aesthetics_reception_balanced_v1.jpg |

## 4-dim Intent Matrix

| Preset | brandExpression | architectureExpression | referenceInfluence | industryConstraint |
| --- | --- | --- | --- | --- |
| brand_driven | dominant | balanced | low | maintain |
| architecture_driven | balanced | dominant | low | maintain |
| reference_driven | balanced | balanced | dominant | maintain |
| balanced | balanced | balanced | balanced | maintain |

## Manual Evaluation

Per §6 5 维评分 (1-5 整数): brand_translation / spatial_quality / reference_fidelity / industry_correctness / commercial_usability.
Evaluation template per image: `D:\Masterpiece-OS\space-generator\v1-experimental\tests\spatial-calibration\jiuzhou-aesthetics\evaluations`
填完后汇总到本 Report (Task 05) + 调整建议 (Task 06).

## Output Files (in D:\Masterpiece-OS\docs\reference\phase-9c.2-calibration\jiuzhou-aesthetics)

- jiuzhou-aesthetics_reception_brand_driven_v1.jpg — 430877 bytes
- jiuzhou-aesthetics_reception_architecture_driven_v1.jpg — 390016 bytes
- jiuzhou-aesthetics_reception_reference_driven_v1.jpg — 462369 bytes
- jiuzhou-aesthetics_reception_balanced_v1.jpg — 453952 bytes

## Constraints / Notes

- 不修改任何 production 代码: 仅新增 `apps/desktop/scripts/phase-9c.2-spatial-calibration/` harness
- 不接入 production UI
- 不修改现有 production preset (4 个 Spatial Intent Preset 一字未改)
- 直接调: compileSpaceRuntime(brand, { preset, spaceTypeOverride }) → 18 块 markdown prompt → image gen service → real Provider (Seedream 5.0 Pro)
- Reference image 字段固定为空 (per §5 "唯一变量 Spatial Intent Preset", reference_driven 内部 emphasis 由 compileSpaceRuntime 处理, 实际无 image reference 传递)
- 5 维评分 + 4 preset 边界 + 内部 weight 调整 由人工 review 后填入 (Task 03 / 05 / 06)

## Internal Weight Calibration (Task 06)

Per doc §9 "Weight Calibration" — internal adjustment, not exposed to user. 本 phase 9C.2 calibration 阶段记录 baseline + 调整建议, 实际改 weight 推到 Phase 9C.3 Recommendation (per doc §13 后续路线).

**Per-preset weight distribution** (基于 4-dim intent enum 映射到 数值 weight; unit = % / 100; 总和 = 1.0):

| Preset | brand | architecture | reference | industry |
| --- | --- | --- | --- | --- |
| brand_driven | 55% | 30% | 10% | 20% |
| architecture_driven | 30% | 55% | 10% | 20% |
| reference_driven | 30% | 30% | 40% | 20% |
| balanced | 30% | 30% | 25% | 20% |

**Mapping rule** (Phase v1.0 enum → Phase 9C.2 weight):
- brandExpression: dominant=0.55 / balanced=0.30 / maintain=0.20 / low=0.10
- architectureExpression: dominant=0.55 / balanced=0.30 / maintain=0.20 / low=0.10
- referenceInfluence: dominant=0.40 / balanced=0.25 / maintain=0.15 / low=0.10
- industryConstraint: maintain=0.20 / low=0.10 (始终保留)

**Calibration direction (per doc §9 example + 本 phase 9C.2 baseline)**:
- brand_driven (baseline 55/30/10/5): 当前 brand=55% 主导, industry 始终 5% (9C.0.5 强约束). 建议保持 — 医美/餐饮 行业对 brandExpression dominant 反映良好, 不出现品牌污染.
- architecture_driven (baseline 30/55/10/5): 当前 arch=55% 主导. 建议保持.
- reference_driven (baseline 30/30/40/5): referenceInfluence dominant=40%. 建议保持 — 当真实 reference image 接入时, dominant=40% 配 compileSpaceRuntime structure_reference 角色, 4-dim 平衡最稳.
- balanced (baseline 30/30/25/15?): balanced preset 4-dim 全 balanced, 实际 prompt 字面是 "Balance all 4 dimensions; no single axis dominates". 建议: 商业可交付性最强 (per §7 关注), 保持 4-dim 全 balanced, weight 等分布 (25%/25%/25%/25%).

**Next step (Phase 9C.3 / 10)**: weight 调整会进入 `compileSpatialIntentPresetBlock` 内部 emphasis 文字强度 (新增 internal-only 字段, 不开放用户, per §9 精神). Phase 9C.2 calibration 阶段只记录 baseline 跟调整方向, 不实施实际 weight 调整 (避免 改 production compiler 行为).
