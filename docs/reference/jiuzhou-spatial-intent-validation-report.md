# Spatial Intent Presets Validation Report — 九州美学 / EXTERIOR (16:9)

- **Generated**: 2026-08-04T05:09:55.789Z
- **Phase**: v1.0 Spatial Intent Presets validation harness (per user request 2026-08-02)
- **Brand**: jiuzhou-aesthetics (九州美学 / 医疗美容 / 皮肤管理)
- **Project**: ed3c1d39-b841-4466-920c-b53d7996cb6c
- **Provider**: profile-0d48c72e-1288-436f-a450-c84c5b8298ca (image, volcengine / Seedream 5.0 Pro / doubao-seedream-5-0-pro-260628)
- **Aspect ratio**: 16:9 (1024x576)
- **Space type**: reception (compileSpaceRuntime spaceTypeOverride, DNA default is reception)
- **Presets tested**: 4 (brand_driven, architecture_driven, reference_driven, balanced)
- **Total cases**: 4 (= 4 presets × 1 image each)
- **All succeeded**: ✓
- **Output dir**: E:\Masterpiece-OS\docs\reference

## Per-Preset Summary

| Preset | Status | Duration | Blocks | Chars | Reference | Image |
| --- | --- | --- | --- | --- | --- | --- |
| brand_driven | succeeded | 124696ms | 18 | 14296 | — | E:\Masterpiece-OS\docs\reference\jiuzhou_exterior_brand_driven_v1.jpg |
| architecture_driven | succeeded | 97957ms | 18 | 14360 | — | E:\Masterpiece-OS\docs\reference\jiuzhou_exterior_architecture_driven_v1.jpg |
| reference_driven | succeeded | 108117ms | 18 | 14279 | JZMX-ARCH-01 | E:\Masterpiece-OS\docs\reference\jiuzhou_exterior_reference_driven_v1.jpg |
| balanced | succeeded | 80640ms | 18 | 14113 | — | E:\Masterpiece-OS\docs\reference\jiuzhou_exterior_balanced_v1.jpg |

## Per-Preset Intent (4 维)

| Preset | brandExpression | architectureExpression | referenceInfluence | industryConstraint |
| --- | --- | --- | --- | --- |
| brand_driven | dominant | balanced | low | maintain |
| architecture_driven | balanced | dominant | low | maintain |
| reference_driven | balanced | balanced | dominant | maintain |
| balanced | balanced | balanced | balanced | maintain |

## Output Files (in E:\Masterpiece-OS\docs\reference)

- jiuzhou_exterior_brand_driven_v1.jpg — 392654 bytes
- jiuzhou_exterior_architecture_driven_v1.jpg — 394083 bytes
- jiuzhou_exterior_reference_driven_v1.jpg — 388539 bytes
- jiuzhou_exterior_balanced_v1.jpg — 474435 bytes

## Per-Preset Detail Reports

Validation artifacts at `E:\Masterpiece-OS\space-generator\v1-experimental\validation-results\spatial-preset-validation\jiuzhou-aesthetics`:
- brand_driven/prompt.md, run.json, report.md, image.png (gitignored)
- architecture_driven/prompt.md, run.json, report.md, image.png (gitignored)
- reference_driven/prompt.md, run.json, report.md, image.png (gitignored)
- balanced/prompt.md, run.json, report.md, image.png (gitignored)

## Notes / Constraints

- **不修改任何 production 代码**: 仅新增 `apps/desktop/scripts/spatial-preset-validation/` harness
- **不接入 production UI**: production 生图 UI 的 SourceBundle preset (visual_extension / document_concept / reference_preview / integrated_anchor) 跟 Spatial Intent Presets 是两套独立抽象,本次验证不改动 production UI
- **不修改现有 production preset**: SourceBundle preset 一字未改
- **直接调**: compileSpaceRuntime(brand, { preset, spaceTypeOverride }) → 17-18 块 markdown prompt → image gen service → real Provider (Seedream 5.0 Pro)
- **Reference (Mode 3)**: JZMX-ARCH-01.png (`E:\Masterpiece-OS\space-generator\v1-experimental\architecture-anchors\jiuzhou-aesthetics\JZMX-ARCH-01.png`) 复制到 `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\九州美学垂直测试-ed3c1d39\input\assets\JZMX-ARCH-01-reference.png`,role=`structure_reference`
- **Provider model**: `doubao-seedream-5-0-pro-260628` (image_profile_id=profile-0d48c72e-1288-436f-a450-c84c5b8298ca)
- **Image size**: `1024*576` (16:9 horizontal, EXTERIOR 店面/门头效果图)

## Next-Step Decision

- 4 张图实际效果由人工 review (在 E:\Masterpiece-OS\docs\reference)
- 是否进入下一轮优化: 取决于 4 张图能否呈现 4 preset 预期差异 (brand_driven 强品牌 / architecture_driven 强建筑 / reference_driven 强参考 / balanced 平衡)
- 跟 Phase 9D §6 Spatial Regression Score (6 维 text-level) 互补: 9D 是 text-level 评分, 本 validation 是 real-provider 实际出图对比