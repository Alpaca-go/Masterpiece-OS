# Masterpiece OS｜九州美学空间生图链路定向校准开发文档

> 文档版本：v1.1  
> 文档状态：主开发文档  
> v1.0 状态：保留为“分层架构与上游原型化讨论备份”，不再直接作为本轮实施方案  
> 适用项目：Masterpiece OS（妙作）  
> 当前垂直测试项目：九州美学空间效果图  
> 开发目标：修复“只保留大空间、却丢失 Golden Anchor 与原项目空间气质”的问题  
> 当前实施边界：先稳定九州美学项目级空间生图，不在本轮扩散到通用 Vertical Spatial Archetype  
> 开发方式：Codex 定向审计与小步改造  
> 禁止事项：不要大范围重写空间链路，不要建设空间动线或行业知识库，不要把九州美学变成医美行业通用模板

---

# 0. v1.1 修订原因

v1.0 的分层方向是正确的，但首次落地结果暴露出关键偏差：

- “大空间”被保护住了；
- Golden Anchor 的材质、灯光、品牌整合与空间气质没有真正进入结果；
- 原本的项目建筑美学被行业默认的“科技医美大厅”替代；
- Logo 被放大成空间主雕塑；
- 紫色被错误地表现为大面积墙面与科技灯光；
- 最终结果变成“灰白科技医美大厅 + 紫色墙面 + 巨型 Logo + 流线灯带”。

这说明当前实现错误地把：

```text
保留空间骨架
```

执行成了：

```text
保留旧效果图的大部分视觉表现，只在表面叠加九州美学元素
```

本次 v1.1 的核心修正是：

> **保留空间事实、体量、功能和动线；强替换视觉皮肤、材质、灯光、品牌整合与装饰密度。**

---

# 1. 本轮开发结论

本轮暂时不要推进“通用垂直空间原型回流”。

正确顺序调整为：

```text
第一步：稳定九州美学 Project Visual Canon v2
第二步：拆分 Structure Reference 与 Style Anchor
第三步：提高 Anchor 对建筑语言、材质和品牌整合的影响
第四步：加入 Logo 尺度硬约束
第五步：加入 Anchor Style Drift 验收
第六步：完成外立面 / 大厅 / 接待区三场景回归
第七步：再用第二个不同品牌验证可泛化字段
第八步：验证成功后，才重新启用 Vertical Spatial Archetype
```

因此，v1.0 中的以下内容本轮改为 **延后**：

- `premium-medical-aesthetics-v1.yaml` 的正式启用
- 同类型项目自动继承
- 上游分析自动匹配 Vertical Spatial Archetype
- 跨项目风格回流

保留 Schema 设计可以，但不要让它参与当前九州美学生图。

---

# 2. 本轮要解决的根因

## 2.1 结构参考与风格参考没有分离

当前链路很可能把“原空间效果图”作为高权重参考输入。

模型因此同时继承了：

- 空间大小
- 门窗与前台位置
- 功能关系
- 玻璃比例
- 天花语言
- 金属比例
- 灰色材质
- 科技灯带
- 原有行业默认风格

Golden Anchor 只能在表层补充：

- 紫色
- Logo
- 一点柔光

这不是风格重构，而是：

> 在旧效果图上贴九州美学。

必须改成：

```text
Structure Reference
只提供体量、空间深度、功能布局、动线、门窗与主要构件位置

Style Anchor
提供建筑表皮、材质、灯光、品牌整合、视觉噪音和装饰密度
```

---

## 2.2 Anchor 建筑语言权重过低

v1.0 的建议值：

```yaml
architectural_language: 0.30
composition: 0.20
spatial_scale: 0.00
```

其中 `spatial_scale: 0.00` 正确，但 `architectural_language: 0.30` 不足以替换行业默认视觉皮肤。

九州美学项目级权重调整为：

```yaml
anchor_influence:
  brand_atmosphere: 0.95
  brand_integration: 0.95
  material_and_lighting: 0.90
  color_relationship: 0.85
  architectural_language: 0.75
  decorative_density: 0.80
  composition: 0.30
  functional_layout: 0.05
  spatial_scale: 0.00
```

解释：

- **大空间不由 Anchor 决定。**
- **空间表皮与建筑表达必须由 Anchor 强校准。**
- 构图仅弱参考，避免复制 Anchor。
- 功能布局几乎不参考 Anchor。

---

## 2.3 Spatial Foundation 保护范围过宽或语义不清

需要把“建筑事实”与“旧视觉皮肤”分开。

### 应锁定

- 空间类型
- 总体体量
- 层高
- 纵深
- 功能分区
- 动线
- 门窗位置
- 主要构件位置
- 镜头职责
- 大空间意图

### 不应锁定

- 旧天花造型
- 旧灯带语言
- 旧墙面颜色
- 旧金属比例
- 旧玻璃风格
- 旧品牌墙表现
- 旧装饰系统
- 旧行业默认医美气质

建议新增：

```yaml
spatial_foundation:
  protected:
    spatial_scale: lock
    ceiling_height: lock
    depth_expression: lock
    functional_zoning: lock
    circulation: lock
    aperture_positions: lock
    major_fixture_positions: constrain
    camera_role: constrain

  replaceable_visual_skin:
    ceiling_language: replace
    wall_finish_language: replace
    lighting_language: replace
    metal_glass_ratio: replace
    brand_wall_expression: replace
    decorative_system: replace
    atmosphere_rendering: replace
```

---

# 3. Golden 资产的正式名称与存放位置

本轮继续使用两份文档和两张 Golden Anchor，但需要正式命名与分责。

## 3.1 人类可读文档

```text
docs/
└─ golden/
   └─ spatial/
      └─ jiuzhou-aesthetics/
         ├─ golden-prompt-v1.0.md
         ├─ golden-acceptance-standard-v1.0.md
         ├─ calibration-development-v1.1.md
         └─ README.md
```

对应文件：

```text
九州美学-空间效果图-Golden-Prompt-v1.0.md
→ docs/golden/spatial/jiuzhou-aesthetics/golden-prompt-v1.0.md

九州美学-空间效果图-Golden-Acceptance-Standard-v1.0.md
→ docs/golden/spatial/jiuzhou-aesthetics/golden-acceptance-standard-v1.0.md

本开发文档
→ docs/golden/spatial/jiuzhou-aesthetics/calibration-development-v1.1.md
```

Markdown 仍然是人类源标准，不允许每次全文注入模型。

---

## 3.2 Golden Anchor 图像

正式命名：

```text
JZMX-SGR-01-Exterior
JZMX-SGR-02-Reception
```

推荐路径：

```text
assets/
└─ golden-references/
   └─ spatial/
      └─ jiuzhou-aesthetics/
         ├─ JZMX-SGR-01-Exterior.png
         ├─ JZMX-SGR-02-Reception.png
         └─ metadata.yaml
```

### `JZMX-SGR-01-Exterior`

负责：

- 外立面品牌整合
- 入口仪式感
- 珍珠白建筑表皮
- 门头与灯箱的层级
- 柔和紫色边缘照明
- 品牌视觉与建筑一体化

不负责：

- 大厅空间尺度
- 室内功能分区
- 内部镜头构图

### `JZMX-SGR-02-Reception`

负责：

- 前台区域的材质和灯光
- 品牌墙的克制表达
- 弧形服务界面的柔和感
- 低噪音、温柔、可信的医美气质
- 小面积羽瓣装置的装饰密度

不负责：

- 空间大小
- 层高
- 大厅纵深
- 前台实际位置
- 功能布局
- 大厅整体构图

---

## 3.3 `metadata.yaml`

```yaml
project_id: jiuzhou-aesthetics
asset_family: spatial-golden-reference
version: 1.1

anchors:
  - id: JZMX-SGR-01-Exterior
    file: JZMX-SGR-01-Exterior.png
    role: exterior_style_anchor
    applicable_space_types:
      - storefront
      - entrance
    allowed_influence:
      - brand_atmosphere
      - brand_integration
      - material_and_lighting
      - color_relationship
      - architectural_skin
      - decorative_density
    forbidden_influence:
      - spatial_scale
      - interior_functional_layout
      - interior_camera_composition

  - id: JZMX-SGR-02-Reception
    file: JZMX-SGR-02-Reception.png
    role: interior_style_anchor
    applicable_space_types:
      - reception
      - lobby
      - consultation_entry
    allowed_influence:
      - brand_atmosphere
      - brand_integration
      - material_and_lighting
      - color_relationship
      - architectural_skin
      - decorative_density
      - reception_expression
    forbidden_influence:
      - spatial_scale
      - ceiling_height
      - depth_expression
      - functional_layout
      - circulation
      - camera_role

influence:
  brand_atmosphere: 0.95
  brand_integration: 0.95
  material_and_lighting: 0.90
  color_relationship: 0.85
  architectural_language: 0.75
  decorative_density: 0.80
  composition: 0.30
  functional_layout: 0.05
  spatial_scale: 0.00
```

---

# 4. 新的参考图职责拆分

## 4.1 Source Space Reference

用户上传或链路已有的空间图，不再直接被称为 Style Reference。

它的职责只能是：

```yaml
source_space_reference:
  provides:
    - room_envelope
    - spatial_scale
    - ceiling_height
    - depth
    - aperture_positions
    - functional_zoning
    - circulation
    - major_fixture_positions
    - camera_view
  does_not_provide:
    - material_palette
    - ceiling_design_language
    - lighting_style
    - brand_wall_style
    - decorative_style
    - medical_aesthetic_tone
```

## 4.2 Style Anchor

两张 Golden Anchor 只负责视觉重构：

```yaml
style_anchor:
  provides:
    - architectural_skin
    - material_behavior
    - lighting_behavior
    - brand_integration
    - color_relationship
    - decorative_density
    - feminine_medical_aesthetic_tone
  does_not_provide:
    - room_size
    - ceiling_height
    - functional_layout
    - circulation
    - exact_composition
```

---

# 5. Structure Reference 预处理

如果当前生图模型无法独立控制一张参考图中的“结构”和“风格”，必须在进入生成模型前，先把原空间效果图转换为结构参考。

推荐生成以下中间资产中的至少一种：

```text
structure-graybox.png
structure-edge-map.png
structure-depth-map.png
structure-semantic-mask.png
```

## 5.1 最小可行方案

本轮先实现：

1. 原空间图降低饱和度；
2. 压低材质纹理；
3. 模糊品牌信息；
4. 去除或弱化 Logo；
5. 降低灯光色彩；
6. 保留主要边缘、体量、门窗和构件位置；
7. 标记其职责为“结构参考，不是风格参考”。

## 5.2 进阶方案

后续可增加：

- 深度图
- 线稿图
- 语义分区 Mask
- 主要构件 Bounding Regions
- 墙面 / 地面 / 天花 / 玻璃分层

本轮不建设完整空间知识库，只解决参考职责分离。

---

# 6. 九州美学 Project Visual Canon v2

v1 的形容词和色彩方向不足以阻止模型调用行业默认“科技医美大厅”。

v2 必须增加明确的空间语法与禁止语法。

推荐文件：

```text
config/
└─ spatial/
   └─ projects/
      └─ jiuzhou-aesthetics/
         ├─ project-visual-canon-v2.yaml
         ├─ anchor-metadata-v1.1.yaml
         ├─ generation-profile-v2.yaml
         └─ project-evaluator-v2.yaml
```

---

## 6.1 正向空间语法

```yaml
project_visual_canon:
  project_id: jiuzhou-aesthetics
  version: 2

  core_atmosphere:
    - serene
    - warm_professional
    - refined_feminine
    - low_noise
    - trustworthy
    - restrained_luxury

  dominant_surfaces:
    - pearl_white_continuous_walls
    - warm_white_mineral_surfaces
    - light_microcement
    - low_reflective_pale_stone

  architectural_skin:
    surface_continuity: high
    curvature: soft_and_integrated
    visual_joints: low
    ornament_density: low
    hard_metal_lines: minimal
    glass_partition_dominance: forbidden

  lighting_language:
    ambient: soft_indirect_warm_neutral
    accent: very_subtle_low_saturation_lavender
    ceiling_expression: quiet_and_integrated
    glare: very_low
    neon_trails: forbidden
    technology_showcase_lighting: forbidden

  brand_integration:
    mode: architecturally_integrated
    logo_prominence: controlled
    logo_as_monument: forbidden
    signage_relief: subtle
    lightbox_use: restrained
    graphic_surface_coverage: low

  decorative_system:
    feather_petals: small_scale_or_background
    crystals: optional_and_sparse
    iridescence: controlled
    hero_installation_occupancy: low
    decoration_must_not_dominate_space: true

  reception_expression:
    service_interface: soft_continuous
    front_desk_material: pale_mineral_matte
    mirror_metal_front_desk: forbidden
    hospitality: warm_but_not_hotel_like
```

---

## 6.2 明确禁止的空间语法

```yaml
project_exclusions:
  - giant_wall_logo
  - monumental_logo_sculpture
  - generic_futuristic_clinic
  - technology_showroom_ceiling
  - neon_curve_light_trails
  - dominant_black_frame_glass
  - dense_vertical_metal_fins
  - large_saturated_purple_wall
  - mirror_stainless_reception
  - nightclub_luxury
  - generic_beauty_salon
  - fantasy_installation
  - oversized_iridescent_sculpture
  - hotel_lobby_furniture_language
```

这组排除项必须进入运行时 Project Negative Guards。

---

# 7. Logo 尺度合同

Logo 过大属于系统缺少几何约束，不应只靠“克制”形容词修复。

建议新增：

```yaml
brand_signage_contract:
  prominence: controlled

  logo_symbol:
    wall_height_ratio:
      min: 0.06
      preferred: 0.10
      max: 0.15

  full_lockup:
    wall_width_ratio:
      min: 0.16
      preferred: 0.22
      max: 0.28

  relief_depth:
    mode: subtle

  lighting:
    halo_intensity: low
    allow_overexposed_edge: false

  forbidden:
    - monumental_logo
    - logo_as_primary_sculpture
    - logo_larger_than_reception_focal_zone
    - logo_dominates_first_read
```

验收原则：

> 观看者首先感受到空间品质，其次自然识别九州美学，而不是先被巨型 Logo 压住。

---

# 8. 编译优先级 v1.1

新的运行时合并顺序：

```text
当前用户任务
>
Spatial Structure Foundation
>
Locked Brand Assets
>
九州美学 Project Visual Canon v2
>
Golden Anchor 授权的视觉维度
>
当前场景构图建议
>
通用默认值
```

本轮移除：

```text
Vertical Spatial Archetype
```

或保持：

```yaml
vertical_spatial_archetype:
  enabled: false
```

直到九州美学三场景回归通过。

---

# 9. Prompt Compiler 分区

最终 Prompt 应明确拆成以下部分：

```text
[CURRENT TASK]
空间类型、画幅、镜头职责与交付目标

[STRUCTURE FOUNDATION — PRESERVE]
空间体量、层高、纵深、动线、门窗、主要构件位置

[VISUAL SKIN — REPLACE]
旧材质、旧灯光、旧品牌墙、旧天花视觉语言不得继承

[LOCKED BRAND ASSETS]
九州美学名称、英文名、Logo、必要文案

[JIUZHOU PROJECT VISUAL CANON V2]
珍珠白连续表面、暖中性柔光、低噪音女性医美气质、
克制品牌整合、低装饰密度

[GOLDEN ANCHOR CALIBRATION]
只继承材质、灯光、品牌整合、建筑表皮、装饰克制度；
不继承空间大小、功能布局与精确构图

[LOGO SCALE CONTRACT]
明确 Logo 与墙面比例上限

[PROJECT NEGATIVE GUARDS]
禁止科技展厅、霓虹曲线、巨型 Logo、大面积紫墙、
镜面前台、黑框玻璃主导等

[OUTPUT CONTRACT]
提案级、真实可落地、高端医美空间效果图
```

---

# 10. 编译器冲突规则

## 10.1 允许保留

```text
source space:
- 空间面积
- 层高
- 纵深
- 门窗
- 功能分区
- 动线
- 前台大致位置
- 镜头视角
```

## 10.2 必须替换

```text
source space:
- 天花视觉语言
- 旧灯带
- 旧颜色
- 旧品牌墙
- 旧材质风格
- 旧装饰
- 旧行业气质
- 旧 Logo 尺度
```

## 10.3 伪代码

```ts
function compileJiuzhouSpatialTask(input: SpatialTaskInput) {
  const structure = extractStructureOnly(input.sourceSpaceReference);

  const result = createContext({
    task: input.task,
    structureFoundation: structure,
    lockedAssets: input.lockedAssets
  });

  replaceVisualSkin(result, input.projectVisualCanonV2);

  applyStyleAnchor(result, input.goldenAnchor, {
    allowed: [
      "brandAtmosphere",
      "brandIntegration",
      "materials",
      "lighting",
      "architecturalSkin",
      "decorativeDensity"
    ],
    forbidden: [
      "spatialScale",
      "ceilingHeight",
      "functionalLayout",
      "circulation",
      "exactComposition"
    ]
  });

  enforceLogoScaleContract(result);
  applyProjectNegativeGuards(result);
  assertStructureFoundationPreserved(result, structure);

  return result;
}
```

---

# 11. Anchor Style Drift 验收

现有 Acceptance Standard 需要在运行时项目评估器中补充以下硬失败项。

## 11.1 新增失败标签

```text
anchor_style_drift
logo_oversized
generic_futuristic_clinic
architecture_skin_not_replaced
purple_surface_overuse
technology_showroom_lighting
brand_integration_applied_not_integrated
large_space_intent_lost
```

## 11.2 硬失败条件

以下任一出现，直接 `fail`：

```yaml
fatal_checks:
  - giant_logo_dominates_space
  - generic_futuristic_clinic_language
  - anchor_material_lighting_not_inherited
  - source_visual_skin_remains_dominant
  - locked_large_space_intent_destroyed
  - dominant_saturated_purple_surface
```

## 11.3 新增评分维度

在原有评分中加入：

```yaml
golden_anchor_alignment:
  max_score: 15
  checks:
    - material_behavior_alignment
    - lighting_behavior_alignment
    - brand_integration_alignment
    - decorative_density_alignment
    - refined_feminine_medical_tone

logo_scale_and_brand_restraint:
  max_score: 5
  checks:
    - logo_ratio_within_contract
    - signage_does_not_dominate_space
    - brand_is_integrated
```

总分可重新归一至 100 分，或作为额外 Gate。建议先作为 Gate，不立即重写整份人工验收 Markdown。

---

# 12. 三场景回归测试

在向上游泛化前，必须连续通过三个场景。

## 12.1 Case A｜九州美学外立面

Golden Anchor：

```text
JZMX-SGR-01-Exterior
```

必须通过：

- 珍珠白建筑表皮
- 克制的门头 Logo
- 灯箱与门头统一
- 柔和紫色边缘照明
- 入口仪式感
- 不成为夜店或美容院门店

---

## 12.2 Case B｜九州美学大空间大厅

Golden Anchor：

```text
JZMX-SGR-02-Reception
```

仅用于：

- 材质
- 灯光
- 品牌整合
- 建筑表皮
- 装饰密度

必须通过：

- 原有大空间尺度保留
- 层高与纵深保留
- 前中后景关系清楚
- 不复制小型前台
- 不出现科技展厅天花
- 不出现巨型 Logo
- 不出现大面积紫墙
- 空间气质接近 Golden Anchor

---

## 12.3 Case C｜九州美学接待区

Golden Anchor：

```text
JZMX-SGR-02-Reception
```

必须通过：

- 前台服务属性清楚
- 品牌墙克制
- Logo 比例正确
- 材质和灯光接近 Anchor
- 不变成酒店大堂
- 不变成普通美容院
- 羽瓣装置只作辅助

---

# 13. 自动化测试

建议新增：

```text
structure-style-reference-separation.test.ts
replaceable-visual-skin.test.ts
anchor-architectural-language-weight.test.ts
logo-scale-contract.test.ts
anchor-style-drift-evaluator.test.ts
large-space-preservation.test.ts
generic-futuristic-clinic-exclusion.test.ts
project-canon-v2-prompt-snapshot.test.ts
```

关键断言：

```ts
expect(anchorInfluence.spatialScale).toBe(0);
expect(anchorInfluence.architecturalLanguage).toBeGreaterThanOrEqual(0.75);

expect(compiled.structure.spatialScale)
  .toEqual(sourceStructure.spatialScale);

expect(compiled.visualSkin)
  .not.toEqual(sourceRender.visualSkin);

expect(compiled.negativeGuards)
  .toContain("giant_wall_logo");

expect(compiled.negativeGuards)
  .toContain("technology_showroom_ceiling");

expect(result.logoWallWidthRatio)
  .toBeLessThanOrEqual(0.28);
```

---

# 14. 开发实施顺序 v1.1

## Calibration Step 1｜冻结失败样本

保存当前失败图及分析：

```text
tests/
└─ fixtures/
   └─ spatial/
      └─ jiuzhou-calibration/
         ├─ failed-large-lobby-v1.png
         ├─ failure-analysis-v1.md
         └─ expected-corrections.yaml
```

失败标签：

```yaml
failure_tags:
  - anchor_style_drift
  - logo_oversized
  - generic_futuristic_clinic
  - architecture_skin_not_replaced
  - purple_surface_overuse
```

---

## Calibration Step 2｜正式放置 Golden 资产

- 放置两份 MD。
- 两张 Anchor 改为正式 ID。
- 创建 `metadata.yaml`。
- 记录版本与 checksum。

---

## Calibration Step 3｜拆分 Structure 与 Style

- 审计当前参考图如何进入模型。
- 禁止原空间完整渲染图同时充当强风格参考。
- 增加结构化中间参考。
- 在 Prompt 中明确旧视觉皮肤可替换。

---

## Calibration Step 4｜Project Visual Canon v2

- 增加正向空间语法。
- 增加明确禁止语法。
- 增加 Logo 尺度合同。
- 增加 Anchor 权重 v1.1。
- 暂停 Vertical Archetype。

---

## Calibration Step 5｜改造 Prompt Compiler

- 加入 `[STRUCTURE FOUNDATION — PRESERVE]`。
- 加入 `[VISUAL SKIN — REPLACE]`。
- 加入 `[LOGO SCALE CONTRACT]`。
- 加入项目 Negative Guards。
- 输出字段来源与冲突记录。

---

## Calibration Step 6｜改造项目评估器

- 增加 Anchor Style Drift。
- 增加 Logo 尺度检查。
- 增加科技医美默认模板检测。
- 增加大空间保留检查。

---

## Calibration Step 7｜三场景回归

顺序：

```text
外立面
→ 接待区
→ 大空间大厅
```

三者全部稳定后，本轮开发才算完成。

---

## Calibration Step 8｜第二项目 Anti-Clone 验证

本步骤不属于当前第一轮实现，只在九州美学稳定后执行。

选择一个完全不同的女性医美 / 女性健康 / 高档会所项目，验证：

- 能继承安静、成熟、可信、私享的气质；
- 不继承九州美学淡紫色；
- 不继承羽瓣、水晶和同款拱门；
- 不继承九州美学构图；
- 能生成自己的项目视觉签名。

通过后，才恢复 v1.0 中的 Vertical Spatial Archetype 计划。

---

# 15. 本轮不做的内容

明确不开发：

- 通用空间行业知识库
- 空间动线知识库
- 面向用户的 Archetype 选择按钮
- 自动把九州美学风格应用到所有医美项目
- 大范围空间生成器重构
- 多层复杂权重 UI
- 用更多 Anchor 掩盖当前职责错误
- 继续增加冗长 Prompt，而不改数据职责

---

# 16. 交付验收标准

## 16.1 资产

- [ ] 两张 Anchor 使用正式 ID。
- [ ] `metadata.yaml` 存在。
- [ ] 两份 Golden MD 保留为源标准。
- [ ] v1.0 保留为架构讨论备份。
- [ ] v1.1 成为主开发文档。

## 16.2 链路

- [ ] Structure Reference 与 Style Anchor 已分离。
- [ ] 原空间视觉皮肤可被替换。
- [ ] 大空间事实仍然锁定。
- [ ] Anchor 建筑语言权重提升至 0.75。
- [ ] Anchor 空间尺度权重保持 0。

## 16.3 项目 Canon

- [ ] Project Visual Canon v2 已建立。
- [ ] 正向空间语法已结构化。
- [ ] 禁止空间语法已结构化。
- [ ] Logo 尺度合同已执行。
- [ ] Vertical Archetype 当前关闭。

## 16.4 验收

- [ ] 巨型 Logo 会被硬失败拦截。
- [ ] 科技展厅式医美空间会被标记。
- [ ] Anchor Style Drift 会被检测。
- [ ] 大空间被压缩会被硬失败拦截。
- [ ] 三场景回归全部通过。

## 16.5 结果

- [ ] 大空间、层高和纵深未丢失。
- [ ] 九州美学原有气质恢复。
- [ ] Golden Anchor 的材质、灯光、品牌整合得到继承。
- [ ] 没有复制 Anchor 的具体构图。
- [ ] Logo 不再成为空间主雕塑。
- [ ] 结果可进入正式品牌提案。

---

# 17. 给 Codex 的修订执行指令

```text
请先读取：

1. 《九州美学空间效果图 Golden Prompt》
2. 《九州美学空间效果图 Golden Acceptance Standard》
3. JZMX-SGR-01-Exterior
4. JZMX-SGR-02-Reception
5. 《Masterpiece OS｜九州美学空间生图链路定向校准开发文档 v1.1》
6. 当前失败的大空间大厅生成图

先审计当前空间参考图如何进入生图模型，不要立即修改代码。

本轮的核心不是继续加 Prompt，而是完成以下职责分离：

- Source Space Reference 只负责空间体量、层高、纵深、功能、动线与主要构件位置。
- Golden Anchor 负责建筑表皮、材质、灯光、品牌整合、颜色关系与装饰密度。
- 不允许 Source Space Reference 的旧天花、旧灯光、旧材质和旧行业风格继续作为强视觉参考。
- 不允许 Golden Anchor 影响空间尺度和功能布局。

必须执行：

1. 将 Vertical Spatial Archetype 暂时关闭，不参与当前生成。
2. 将 Anchor architectural_language 权重提升至 0.75。
3. 保持 Anchor spatial_scale 权重为 0。
4. 建立 Project Visual Canon v2。
5. 加入 Logo 尺度合同。
6. 加入 giant_wall_logo、generic_futuristic_clinic、
   technology_showroom_ceiling、purple_surface_overuse 等项目排除项。
7. 增加 Anchor Style Drift 与大空间保留检查。
8. 用外立面、接待区、大空间大厅完成三场景回归。
9. 不要建设空间行业知识库、动线知识库或用户 Archetype 按钮。
10. 不要进行大范围重构。

开发前先输出：

- 当前代码链路审计
- 原空间参考图与 Anchor 的当前权重和职责
- 现有目录映射
- 要新增或修改的文件清单
- 风险点
- 最小实施计划

确认审计结果后再写代码。
```

---

# 18. 最终判断

本轮问题不应归因为：

```text
Anchor 不够多
Prompt 不够长
紫色不够明显
```

真正的问题是：

```text
结构参考与风格参考没有拆开
+
旧视觉皮肤被错误保留
+
Anchor 建筑语言影响不足
+
Logo 没有尺度合同
+
验收器没有检测 Anchor Style Drift
```

因此，v1.1 的唯一正确方向是：

> **保留空间骨架，替换视觉皮肤；  
> 强化 Golden Anchor 的建筑、材质与品牌整合作用；  
> 限制 Logo 和行业默认科技医美语言；  
> 九州美学稳定后，再讨论向上游泛化。**

---

**End of Development Document v1.1**
