# Masterpiece OS｜九州美学空间 Golden 资产接入与上游风格原型化开发文档

> 文档版本：v1.0  
> 适用项目：Masterpiece OS（妙作）  
> 当前垂直测试项目：九州美学空间效果图  
> 开发目标：使用两份 Golden 文档与两张 Golden Anchor 定向修正九州美学空间生图，同时保护既有建筑美学、空间气质、大空间尺度等结论，并将可泛化部分有限度回流到项目分析层  
> 开发方式：Codex 定向改造  
> 状态：建议按本文档分阶段实施

---

# 0. 本次要解决的问题

当前已经有四份高价值校准资产：

1. `九州美学-空间效果图-Golden-Prompt-v1.0.md`
2. `九州美学-空间效果图-Golden-Acceptance-Standard-v1.0.md`
3. 九州美学外立面 Golden Anchor
4. 九州美学前台接待区 Golden Anchor

这些资产可以显著提升九州美学空间效果图的品牌一致性，但如果直接将两份 Markdown 全文和两张图片注入所有医美空间任务，会产生三个严重问题：

- **覆盖既有空间结论**：小型接待区 Anchor 可能把原本确定的“大空间、强纵深、高层高”压缩为小型美容院前台。
- **污染上游分析**：珍珠白、淡紫、羽瓣、水晶、拱门等九州美学专属语言会被误识别为“女性医美行业默认答案”。
- **形成复制机**：以后女性美感、微创医美、高档会所等项目会反复生成“白色拱门 + 紫色灯带 + 羽瓣 + 水晶”。

因此，本次开发不能只是“把 Golden Prompt 拼到现有 Prompt 后面”，而应新增一套分层资产与冲突控制机制。

---

# 1. 最终目标

完成后，空间生图链路应具备以下能力：

## 1.1 对九州美学

- 两份 Golden 文档成为九州美学空间生成与验收的项目级基准。
- 两张 Golden Anchor 用于校准品牌氛围、品牌空间整合、材质、灯光和装饰密度。
- Anchor 不得覆盖已经确定的：
  - 建筑美学
  - 大空间尺度
  - 层高与纵深
  - 功能分区
  - 动线
  - 空间类型
  - 主要镜头职责
- 生成结果更接近现有两张优秀 Anchor，但不是机械复刻其构图。

## 1.2 对相同类型的新项目

女性美感、微创医美、高档会所、女性健康、私享服务等项目可以继承：

- 成熟、克制的女性气质
- 医疗可信与私享服务的平衡
- 低噪音、安静、柔和的空间气质
- 浅色矿物基底与低反射材质行为
- 品牌与建筑一体化的表达策略
- 柔和间接照明方式

但不能自动继承：

- 九州美学名称与 Logo
- 珍珠白 + 淡紫的具体色板
- 孔雀羽、九瓣放射、虹彩羽瓣
- 紫色水晶
- 同款拱门
- 同款弧形前台
- 同款灯箱位置
- 同款构图

## 1.3 对系统架构

新增四层上下文：

```text
L0｜Spatial Foundation
空间事实、建筑美学、空间尺度、功能与镜头硬约束
        ↓
L1｜Vertical Spatial Archetype
可跨项目继承的垂直主题语义原型
        ↓
L2｜Project Visual Canon
九州美学项目专属视觉系统与 Golden 资产
        ↓
L3｜Generation Task
当前空间类型、画幅、镜头职责与输出要求
        ↓
Independent Evaluation
通用空间质量评估 + 项目专属 Golden 验收
```

---

# 2. 核心设计原则

## 2.1 Golden 文档不是运行时 Prompt 模板

两份 Markdown 是：

- 人类可阅读的源标准
- 设计与开发审计依据
- 结构化配置的来源

运行时不应每次读取并全文拼接 Markdown。否则会造成：

- Prompt 过长
- 重复语义
- 项目词泄漏
- 生成与验收职责混淆
- 难以做字段级冲突处理

正确做法是：

```text
Golden Markdown
    ↓ 开发阶段提取
Structured YAML / JSON
    ↓ 运行时加载
Context Compiler
    ↓
Model Prompt / Evaluator Input
```

## 2.2 Golden Prompt 与 Acceptance Standard 必须分离

- `Golden Prompt`：约束生成。
- `Golden Acceptance Standard`：约束评估。
- 不允许把完整验收评分表拼进生成 Prompt。
- 不允许让“为了通过评分”反向制造僵化模板。

## 2.3 Anchor 只能影响被授权的维度

Anchor 不是全局参考图，而是按维度授权的校准资产。

例如：

- 可以影响：品牌氛围、灯光、材料、装饰密度。
- 不能影响：空间尺度、功能布局、层高、动线。
- 低权重影响：建筑几何、镜头构图。

## 2.4 继承语义，不继承视觉签名

上游只能回流“为什么这样设计”的语义：

- 安静
- 成熟
- 克制
- 医疗可信
- 私享温度
- 品牌建筑一体化

不能回流“具体长什么样”的签名：

- 淡紫
- 羽瓣
- 水晶
- 拱门
- 同款前台
- 同款灯箱

---

# 3. 四份资产应该放在哪里

推荐将“人类文档”“运行时配置”“图像资产”分开存放。

> 下列路径为推荐标准。如果当前仓库已有同职责目录，Codex 应按职责映射到现有目录，不要为了照抄路径制造重复模块。

## 3.1 人类可读 Golden 文档

```text
docs/
└─ golden/
   └─ spatial/
      └─ jiuzhou-aesthetics/
         ├─ golden-prompt-v1.0.md
         ├─ golden-acceptance-standard-v1.0.md
         └─ README.md
```

放置方式：

```text
九州美学-空间效果图-Golden-Prompt-v1.0.md
→ docs/golden/spatial/jiuzhou-aesthetics/golden-prompt-v1.0.md

九州美学-空间效果图-Golden-Acceptance-Standard-v1.0.md
→ docs/golden/spatial/jiuzhou-aesthetics/golden-acceptance-standard-v1.0.md
```

用途：

- 设计师与开发者阅读
- Codex 开发时参考
- 版本审计
- 人工验收标准
- 不直接作为运行时 Prompt 全文加载

## 3.2 Golden Anchor 图像

```text
assets/
└─ golden/
   └─ spatial/
      └─ jiuzhou-aesthetics/
         └─ anchors/
            ├─ storefront-anchor-v1.png
            ├─ reception-anchor-v1.png
            └─ anchor-manifest.yaml
```

建议重命名：

```text
77f515f4-153d-4552-94b2-b0f0d5867375(1).png
→ storefront-anchor-v1.png

8478777d-1847-4cf3-9a99-183d4f2db779(1).png
→ reception-anchor-v1.png
```

不要继续使用随机 UUID 文件名，否则后续很难：

- 管理版本
- 判断 Anchor 职责
- 做自动测试
- 更新权重
- 审计引用关系

## 3.3 运行时项目配置

```text
config/
└─ spatial/
   ├─ archetypes/
   │  └─ premium-medical-aesthetics-v1.yaml
   ├─ projects/
   │  └─ jiuzhou-aesthetics/
   │     ├─ project-visual-canon-v1.yaml
   │     ├─ anchor-manifest-v1.yaml
   │     ├─ generation-profile-v1.yaml
   │     └─ project-exclusions-v1.yaml
   └─ evaluators/
      ├─ global-space-quality-v1.yaml
      └─ jiuzhou-aesthetics-acceptance-v1.yaml
```

## 3.4 Schema 与编译代码

推荐按现有职责映射到类似位置：

```text
src/
└─ spatial/
   ├─ schemas/
   │  ├─ spatial-foundation.schema.ts
   │  ├─ vertical-style-archetype.schema.ts
   │  ├─ project-visual-canon.schema.ts
   │  ├─ anchor-manifest.schema.ts
   │  └─ spatial-evaluation.schema.ts
   ├─ analysis/
   │  ├─ vertical-archetype-extractor.ts
   │  ├─ archetype-matcher.ts
   │  └─ project-signature-extractor.ts
   ├─ compiler/
   │  ├─ spatial-context-compiler.ts
   │  ├─ spatial-conflict-resolver.ts
   │  ├─ anchor-influence-resolver.ts
   │  └─ spatial-prompt-builder.ts
   ├─ evaluation/
   │  ├─ global-space-evaluator.ts
   │  ├─ project-golden-evaluator.ts
   │  └─ evaluation-merger.ts
   └─ loaders/
      ├─ golden-asset-loader.ts
      └─ spatial-config-loader.ts
```

---

# 4. 四份资产的职责分配

| 资产 | 层级 | 运行时用途 | 不允许做的事 |
|---|---|---|---|
| Golden Prompt MD | 项目文档 | 作为结构化生成配置的源标准 | 每次全文拼入 Prompt |
| Acceptance Standard MD | 项目文档 | 作为项目验收配置的源标准 | 反向控制空间分析 |
| 外立面 Anchor | 项目 Visual Canon | 校准门头、品牌整合、灯光、材质 | 决定空间尺度 |
| 前台 Anchor | 项目 Visual Canon | 校准前台气质、品牌墙、装饰密度 | 覆盖大空间、层高、功能布局 |
| `premium-medical-aesthetics` Archetype | 上游通用原型 | 提供气质、材质行为、灯光行为偏置 | 继承九州美学色彩和图形 |
| Project Canon | 九州美学项目级 | 提供 Logo、色彩、图形、项目排除项 | 成为行业默认值 |

---

# 5. 新增数据模型

## 5.1 Spatial Foundation

该对象承载此前已经确定的空间结论，属于最高优先级硬约束。

```yaml
spatial_foundation:
  version: 1
  space_type: lobby
  architecture_aesthetic:
    mode: modern_monolithic
    preservation: lock
  spatial_scale:
    class: large
    ceiling_height: generous
    depth_expression: strong
    breathing_room: high
    foreground_midground_background: true
    preservation: lock
  atmosphere_intent:
    primary:
      - refined
      - serene
      - professional
    preservation: constrain
  functional_zoning:
    preservation: lock
  circulation:
    preservation: lock
  camera_intent:
    preservation: constrain
```

### 必须新增的保护字段

```yaml
preservation:
  architecture: lock
  spatial_scale: lock
  functional_zoning: lock
  circulation: lock
  atmosphere_core: constrain
  camera_role: constrain
```

解释：

- `lock`：任何 Project Canon、Archetype、Anchor 都不能覆盖。
- `constrain`：可优化表现方式，但不能改变核心结论。
- `bias`：可提供偏向。
- `suggest`：仅作弱建议。
- `exclude`：明确禁止。

## 5.2 Vertical Spatial Archetype

新增 `premium-medical-aesthetics-v1.yaml`：

```yaml
id: premium-medical-aesthetics
version: 1

applicable_themes:
  - female_aesthetics
  - minimally_invasive_medical_aesthetics
  - premium_wellbeing
  - private_club_hospitality
  - female_health

feminine_expression:
  mode: restrained_refinement
  softness: 0.68
  sensuality: 0.12
  sweetness: 0.08
  maturity: 0.82
  professionalism: 0.86

medical_hospitality_balance:
  medical_credibility: 0.78
  hospitality_warmth: 0.64
  clinical_coldness: 0.12
  retail_commerciality: 0.20
  private_club_feeling: 0.58

atmosphere_axes:
  serenity: 0.90
  trust: 0.88
  warmth: 0.62
  luxury: 0.72
  openness: 0.78
  visual_noise: 0.16
  futurism: 0.30
  classicism: 0.08

architectural_form_bias:
  geometry: soft_monolithic
  curvilinear_bias: 0.72
  orthogonal_bias: 0.28
  surface_continuity: 0.84
  joint_visibility: 0.18
  ornament_density: 0.12
  threshold_ceremony: 0.70

material_behavior:
  base: light_mineral_matte
  surface_reflectivity: low
  translucency: controlled_accent
  metal_temperature: cool_neutral
  texture_scale: fine
  material_contrast: subtle

lighting_behavior:
  ambient_mode: soft_indirect
  base_temperature: warm_neutral
  accent_saturation: low
  edge_lighting: subtle
  contrast: low_to_medium
  glare_tolerance: very_low
  shadow_softness: high

brand_integration_strategy:
  mode: architecturally_integrated
  signage_prominence: controlled
  graphic_surface_coverage: low
  identity_touchpoints:
    - primary_brand_wall
    - wayfinding
    - integrated_lightbox
    - curated_display
  avoid_applied_mockup_feeling: true

palette_relation:
  neutral_base: dominant
  brand_accent: controlled
  chromatic_saturation: low

risk_exclusions:
  - nightlife_luxury
  - ceremonial_wedding
  - generic_beauty_salon
  - fantasy_installation
  - over_saturated_brand_color
  - cheap_material_render

anti_clone_policy:
  inherit_semantics_not_signatures: true
  exact_palette_inheritance: false
  exact_motif_inheritance: false
  exact_layout_inheritance: false
  exact_prop_inheritance: false
  require_project_specific_signature: true
  minimum_distinct_dimensions: 3
```

## 5.3 Project Visual Canon

`project-visual-canon-v1.yaml` 只服务九州美学：

```yaml
project_id: jiuzhou-aesthetics
version: 1

locked_assets:
  brand_name_zh: 九州美学
  brand_name_en: Jointown Aesthetics
  logo_asset_id: jiuzhou-primary-logo
  locked_copy:
    - 科学与美学相遇
    - 因美而生

project_palette:
  base:
    - pearl_white
    - warm_white
    - light_gray
  accent:
    - mineral_lavender
    - mist_purple
  text:
    - graphite_black
  metal:
    - silver_gray
  iridescence: controlled

signature_motifs:
  - peacock_feather_flow
  - nine_petals_radial
  - translucent_iridescent_petals
  - feather_eye_ellipse

project_material_accents:
  - pearl_surface
  - translucent_acrylic
  - controlled_iridescence
  - pale_lavender_crystal

project_rules:
  white_is_dominant: true
  purple_is_accent: true
  full_realistic_peacock: forbidden
  fantasy_environment: forbidden
  architecture_first: true
  brand_is_integrated_not_applied: true
```

注意：

- 这些字段不得出现在 `premium-medical-aesthetics` 通用原型中。
- `pale_lavender_crystal` 只属于九州美学，不是女性医美默认道具。

## 5.4 Anchor Manifest

```yaml
project_id: jiuzhou-aesthetics
version: 1

anchors:
  - id: storefront-anchor-v1
    file: assets/golden/spatial/jiuzhou-aesthetics/anchors/storefront-anchor-v1.png
    applicable_space_types:
      - storefront
      - entrance
    roles:
      - brand_atmosphere
      - brand_integration
      - material_and_lighting
      - decorative_density

  - id: reception-anchor-v1
    file: assets/golden/spatial/jiuzhou-aesthetics/anchors/reception-anchor-v1.png
    applicable_space_types:
      - reception
      - lobby
    roles:
      - brand_atmosphere
      - brand_integration
      - material_and_lighting
      - reception_expression

influence_caps:
  brand_atmosphere: 0.85
  brand_integration: 0.85
  material_and_lighting: 0.75
  color_relationship: 0.75
  decorative_density: 0.65
  architectural_language: 0.30
  composition: 0.20
  functional_layout: 0.10
  spatial_scale: 0.00

forbidden_overrides:
  - spatial_foundation.spatial_scale
  - spatial_foundation.functional_zoning
  - spatial_foundation.circulation
  - spatial_foundation.architecture_aesthetic
  - spatial_foundation.camera_intent.role
```

最关键的配置：

```yaml
spatial_scale: 0.00
```

这保证接待区 Anchor 不会把大空间压缩成小前台。

---

# 6. 哪些字段允许进入上游分析

上游分析层只加入下列可泛化字段：

## 6.1 可以加入

```text
vertical_archetype
feminine_expression
medical_hospitality_balance
atmosphere_axes
architectural_form_bias
material_behavior
lighting_behavior
brand_integration_strategy
palette_relation
risk_exclusions
anti_clone_policy
```

## 6.2 加入方式

分析模型不能直接输出“使用淡紫色羽瓣和水晶”，而应输出：

```yaml
vertical_style_signal:
  themes:
    - refined_feminine_wellbeing
    - premium_medical_hospitality
  confidence: 0.84

recommended_archetype:
  id: premium-medical-aesthetics
  confidence: 0.78
  match_reasons:
    - mature_feminine_expression
    - professional_and_warm_balance
    - low_noise_premium_service_space
```

Archetype 只是候选，不自动覆盖项目视觉分析。

## 6.3 只有满足条件时才启用

建议匹配条件：

```yaml
archetype_activation:
  minimum_confidence: 0.72
  required_signals: 2
  require_project_confirmation: false
  block_when:
    - pediatric_healthcare
    - mass_market_beauty_retail
    - nightlife_entertainment
    - traditional_hospital
```

---

# 7. 哪些字段必须抛弃或限制在项目层

## 7.1 不得进入上游的项目专属字段

- 九州美学
- Jointown Aesthetics
- Logo
- 因美而生
- 科学与美学相遇
- 孔雀羽
- 九瓣放射
- 虹彩羽瓣
- 紫色晶体
- 淡紫精确比例
- 同款拱门
- 同款弧形前台
- 同款灯箱
- 两张 Anchor 的具体构图

## 7.2 具体构件必须抽象化

| 项目具体元素 | 上游允许保留的抽象语义 |
|---|---|
| 拱门 | `soft_threshold_geometry` |
| 弧形前台 | `continuous_low-aggression_service_interface` |
| 水晶 | `small_scale_material_anchor` |
| 羽瓣 | `project_specific_abstract_brand_installation` |
| 紫色灯带 | `low_saturation_brand_accent_lighting` |
| 大灯箱 | `architecturally_integrated_brand_media` |

## 7.3 精确色彩比例不进入 Archetype

九州美学可以继续使用：

- 白色 65%–80%
- 紫色 10%–20%
- 虹彩不超过 5%

通用 Archetype 只保留：

```yaml
palette_relation:
  neutral_base: dominant
  brand_accent: controlled
  chromatic_saturation: low
```

---

# 8. Context Compiler 合并顺序

必须固定为：

```text
当前用户任务
>
Spatial Foundation 硬约束
>
Locked Assets
>
Project Visual Canon
>
Vertical Spatial Archetype
>
Golden Anchor 授权维度
>
通用默认值
```

## 8.1 合并语义

| 类型 | 行为 |
|---|---|
| `lock` | 禁止任何下游覆盖 |
| `constrain` | 允许优化表现，但不得改变结论 |
| `bias` | 提供倾向，可被项目 Canon 覆盖 |
| `suggest` | 仅作低权重建议 |
| `exclude` | 编译为 Negative / Risk Guard |

## 8.2 伪代码

```ts
function compileSpatialContext(input: SpatialCompileInput) {
  const result = createEmptySpatialContext();

  applyUserTask(result, input.task);
  applyLocked(result, input.spatialFoundation);
  applyLockedAssets(result, input.projectCanon.lockedAssets);
  applyConstraints(result, input.projectCanon);
  applyBiases(result, input.verticalArchetype);

  const authorizedAnchorSignals = resolveAnchorInfluence({
    anchors: input.anchors,
    manifest: input.anchorManifest,
    protectedPaths: input.spatialFoundation.preservation
  });

  applySuggestions(result, authorizedAnchorSignals);
  applyDefaults(result, input.defaults);

  assertProtectedFieldsUnchanged(
    input.spatialFoundation,
    result
  );

  return result;
}
```

## 8.3 编译后的 Prompt 分区

最终 Prompt 不再是一段混合文本，而应按以下顺序构建：

```text
[CURRENT TASK]
本次空间类型、镜头、画幅、交付职责

[SPATIAL FOUNDATION — DO NOT OVERRIDE]
建筑美学、大空间尺度、层高、纵深、功能与动线

[LOCKED BRAND ASSETS]
品牌名称、Logo、必须出现的文案

[PROJECT VISUAL CANON]
九州美学色彩、羽瓣图形、项目材质与排除项

[VERTICAL ARCHETYPE BIAS]
成熟女性、医美可信与私享温度、低噪音等

[ANCHOR CALIBRATION]
只描述授权维度：材质、灯光、品牌整合、装饰密度

[NEGATIVE / RISK GUARDS]
夜店、婚庆、泛美容院、奇幻装置、廉价材质等

[OUTPUT CONTRACT]
真实可落地、提案级效果图
```

---

# 9. Anchor 处理方式

## 9.1 不做像素级复刻

不要把 Anchor 使用目标定义为：

- 构图相似度
- 拱门位置相似度
- 前台形状相似度
- 装置位置相似度

应定义为：

- 品牌表达是否融入建筑
- 白与品牌色关系是否克制
- 灯光是否柔和
- 材质是否细腻
- 装饰密度是否低
- 医美可信与女性美感是否平衡

## 9.2 按场景选择 Anchor

```ts
selectAnchors(spaceType) {
  if (spaceType === "storefront" || spaceType === "entrance") {
    return ["storefront-anchor-v1"];
  }

  if (spaceType === "reception") {
    return ["reception-anchor-v1"];
  }

  if (spaceType === "large_lobby") {
    return [
      {
        id: "reception-anchor-v1",
        allowedRoles: [
          "brand_atmosphere",
          "material_and_lighting",
          "brand_integration"
        ],
        deniedRoles: [
          "spatial_scale",
          "functional_layout",
          "composition"
        ]
      }
    ];
  }
}
```

## 9.3 防止小空间 Anchor 污染大空间

编译时必须强制加入：

```text
The reference reception image calibrates only material, lighting,
brand integration and decorative restraint.
Do not inherit its room size, ceiling height, spatial depth,
functional layout or compact reception scale.
Preserve the locked large-space intention.
```

中文等价约束：

```text
接待区参考图只负责校准材质、灯光、品牌整合和装饰克制度。
不得继承其房间大小、层高、纵深、紧凑前台尺度和功能布局。
必须保留已锁定的大空间意图。
```

---

# 10. Acceptance Standard 接入方式

## 10.1 拆分为两个评估器

### Global Space Quality Evaluator

跨项目通用：

- 空间真实性
- 可建性
- 透视
- 功能识别
- 材质
- 灯光
- 构图
- 商业成熟度

### Jiuzhou Project Golden Evaluator

只用于九州美学：

- 中文名
- 英文名
- Logo
- 九州美学色彩关系
- 羽瓣 / 九瓣图形
- 与包装、VI 和 Golden Anchor 的一致性
- 项目专属排除项

## 10.2 运行时输入

```yaml
evaluation_request:
  image: generated-image
  task_context: compiled-task-context
  global_profile: global-space-quality-v1
  project_profile: jiuzhou-aesthetics-acceptance-v1
  foundation_snapshot: original-spatial-foundation
```

## 10.3 新增 Foundation Preservation 检查

Acceptance Standard 现有评分外，必须新增：

```yaml
foundation_preservation:
  architecture_aesthetic_preserved: true
  spatial_scale_preserved: true
  large_space_intent_preserved: true
  functional_zoning_preserved: true
  camera_role_preserved: true
```

任意 `lock` 字段被破坏，应直接返回：

```json
{
  "final_decision": "fail",
  "failure_tags": [
    "spatial_foundation_overridden"
  ]
}
```

---

# 11. Anti-Clone 防复制机制

同类型新项目启用 Archetype 时，必须建立自己的 `project_signature`。

```yaml
project_signature:
  palette_signature: project_generated
  motif_signature: project_generated
  architectural_signature: project_generated
  material_signature: project_generated
  narrative_signature: project_generated
```

## 11.1 最少差异规则

以下五个维度中，至少三个必须与九州美学明显不同：

1. 主色关系
2. 核心图形母题
3. 建筑几何主导方式
4. 标志性材料
5. 品牌装置或空间叙事

## 11.2 禁止跨项目加载

Anchor Loader 必须验证：

```ts
if (anchor.projectId !== currentProject.id) {
  throw new CrossProjectAnchorAccessError();
}
```

除非用户明确选择“以九州美学为参考项目”，否则其他项目不允许加载两张 Golden Anchor。

## 11.3 Archetype 输出禁词检查

通用 Archetype 运行结果不得无来源出现：

```text
九州美学
Jointown Aesthetics
孔雀
九瓣
紫色水晶
虹彩羽瓣
```

---

# 12. 开发实施步骤

## Phase 0｜冻结当前基线

执行：

1. 记录当前空间分析输出样本。
2. 保存当前大空间生成结果。
3. 保存现有 Prompt Compiler 快照。
4. 建立回归样本目录。

建议：

```text
tests/
└─ fixtures/
   └─ spatial/
      └─ jiuzhou-baseline/
         ├─ analysis-output.json
         ├─ spatial-foundation.json
         ├─ compiled-prompt.txt
         └─ README.md
```

完成标准：

- 后续可以比较改造前后是否破坏大空间意图。

## Phase 1｜放置 Golden 资产

执行：

1. 将两份 MD 放入 `docs/golden/...`。
2. 将两张图重命名并放入 `assets/golden/.../anchors/`。
3. 创建 `README.md` 解释资产职责。
4. 创建 `anchor-manifest-v1.yaml`。
5. 为所有文件记录版本与 checksum。

完成标准：

- 四份资产都有稳定路径和可读 ID。
- 不再通过随机 UUID 文件名引用。

## Phase 2｜新增 Schema

执行：

- 增加 `SpatialFoundation`
- 增加 `VerticalSpatialArchetype`
- 增加 `ProjectVisualCanon`
- 增加 `AnchorManifest`
- 增加 `SpatialEvaluationProfile`
- 增加 `PreservationMode`

完成标准：

- 所有 YAML / JSON 可通过 Schema 校验。
- `spatial_scale` 的 preservation 默认为 `lock`，而不是可覆盖。

## Phase 3｜建立通用垂直原型

执行：

1. 新增 `premium-medical-aesthetics-v1.yaml`。
2. 只写入可泛化字段。
3. 建立禁用项目词的静态检查。
4. 新增 Archetype Matcher。

完成标准：

- 新项目可以匹配该 Archetype。
- Archetype 中不包含九州美学专属颜色、图形、道具和名称。

## Phase 4｜建立九州美学 Project Canon

执行：

1. 将 Golden Prompt 提取为结构化项目配置。
2. 建立项目色彩、图形、材质、品牌规则。
3. 建立项目排除项。
4. 建立 Anchor Manifest。
5. 不从 Acceptance Standard 提取生成指令。

完成标准：

- 只加载 Project Canon，也能描述九州美学空间视觉系统。
- 不需要运行时全文读取 Markdown。

## Phase 5｜改造 Context Compiler

执行：

1. 新增合并优先级。
2. 新增字段级保护。
3. 新增冲突日志。
4. 新增 `assertProtectedFieldsUnchanged()`。
5. 将 Anchor 信号限制到授权维度。

完成标准：

- Anchor 尝试覆盖大空间时被阻止。
- 编译日志能说明某字段由哪一层提供。
- Prompt 中明确写出“不继承 Anchor 的空间尺度”。

## Phase 6｜改造 Anchor Loader

执行：

1. 按项目 ID 加载。
2. 按空间类型选择。
3. 按职责裁剪影响。
4. 防跨项目加载。
5. 支持 Anchor 版本更新。

完成标准：

- 外立面任务默认使用外立面 Anchor。
- 前台任务默认使用前台 Anchor。
- 大厅任务使用前台 Anchor 时，空间尺度与构图权重被禁止。

## Phase 7｜拆分评估器

执行：

1. 创建全局空间质量评估器。
2. 创建九州美学项目评估器。
3. 新增 Foundation Preservation 检查。
4. 合并两类评分。
5. 输出 failure tags 与 revision actions。

完成标准：

- 评估器不会把九州美学专属规则应用到其他项目。
- 大空间被压缩时直接标记 `spatial_foundation_overridden`。

## Phase 8｜回归测试

执行测试集：

### Case A｜九州美学大空间大厅

预期：

- 继承材质、灯光、品牌整合。
- 保留大空间、层高与纵深。
- 不复制小型前台构图。

### Case B｜九州美学外立面

预期：

- 使用外立面 Anchor。
- 门头、入口与灯箱统一。
- 不过度紫光、不过度海报化。

### Case C｜其他女性医美品牌

输入：

- 自有绿色 / 米白色板
- 自有植物细胞图形
- 同样匹配 `premium-medical-aesthetics`

预期：

- 继承成熟女性、医美可信、柔和材质和间接灯光。
- 不出现淡紫、孔雀羽、水晶、九州美学构图。

### Case D｜高档会所

预期：

- 可继承私享温度与低噪音空间气质。
- 医疗可信权重降低。
- 不自动生成医美前台与产品陈列。

### Case E｜普通医院

预期：

- 不激活该 Archetype，或匹配置信度低于阈值。

---

# 13. 必须新增的自动化测试

## 13.1 单元测试

```text
spatial-foundation-lock.test.ts
anchor-influence-cap.test.ts
cross-project-anchor-access.test.ts
archetype-no-project-signature.test.ts
project-canon-priority.test.ts
acceptance-evaluator-separation.test.ts
```

## 13.2 关键断言

```ts
expect(compiled.spatialScale).toEqual(original.spatialScale);
expect(anchorImpact.spatialScale).toBe(0);
expect(genericArchetype).not.toContain("九州美学");
expect(genericArchetype).not.toContain("孔雀");
expect(genericArchetype).not.toContain("紫色水晶");
expect(otherProject.loadedAnchors).not.toContain("jiuzhou");
```

## 13.3 Prompt Snapshot

每类任务保存编译后的 Prompt 快照，检查：

- Foundation 是否在 Prompt 前部。
- 是否存在 `DO NOT OVERRIDE`。
- Anchor 是否只描述授权维度。
- 是否没有把 Acceptance Standard 全文注入。
- 是否没有重复项目语义。

---

# 14. 调试与可观察性

建议编译结果增加 `provenance`：

```json
{
  "field": "lighting_behavior.ambient_mode",
  "value": "soft_indirect",
  "source": "vertical_archetype:premium-medical-aesthetics-v1",
  "merge_mode": "bias",
  "overridden_by": null
}
```

冲突示例：

```json
{
  "field": "spatial_foundation.spatial_scale.class",
  "attempted_value": "compact",
  "attempted_source": "anchor:reception-anchor-v1",
  "result": "rejected",
  "reason": "protected_by_lock"
}
```

开发模式 UI 或日志中，应能查看：

- 当前加载了哪些层
- 每个字段来自哪里
- 哪些 Anchor 影响被拒绝
- 哪些字段被项目 Canon 覆盖
- 最终使用了哪个 Archetype

---

# 15. UI 层建议

当前阶段不需要增加复杂用户选项。

可在空间任务的开发调试面板中增加只读信息：

```text
空间基础：Large Space / Locked
垂直原型：Premium Medical Aesthetics
项目 Canon：Jiuzhou Aesthetics v1
Golden Anchor：Reception v1
Anchor 空间尺度影响：Disabled
项目评估器：Jiuzhou Acceptance v1
```

正式用户界面暂不暴露复杂权重，避免用户将全部开关打开导致失控。

---

# 16. 数据迁移与兼容策略

## 16.1 旧项目

旧项目没有 `vertical_style_archetype` 时：

```yaml
vertical_style_archetype: null
```

继续走原有链路，不得报错。

## 16.2 旧空间分析输出

如果没有 `preservation` 字段，则迁移默认值：

```yaml
architecture_aesthetic: constrain
spatial_scale: lock
functional_zoning: lock
circulation: lock
camera_intent: constrain
```

## 16.3 Feature Flag

建议新增：

```text
SPATIAL_VERTICAL_ARCHETYPE_V1
SPATIAL_PROJECT_GOLDEN_CANON_V1
SPATIAL_ANCHOR_DIMENSIONAL_INFLUENCE_V1
SPATIAL_SPLIT_EVALUATOR_V1
```

先对九州美学启用，确认稳定后再逐步扩展。

---

# 17. 交付验收标准

本开发任务完成时必须满足：

## 17.1 资产层

- [ ] 两份 Golden MD 已进入文档目录。
- [ ] 两张 Anchor 已重命名并进入资产目录。
- [ ] Anchor Manifest 已创建。
- [ ] 所有 Golden 资产都有版本号。

## 17.2 数据层

- [ ] Spatial Foundation 支持 `lock / constrain / bias / suggest / exclude`。
- [ ] Premium Medical Aesthetics Archetype 已建立。
- [ ] 九州美学 Project Visual Canon 已建立。
- [ ] 项目专属与通用字段完全分离。

## 17.3 编译层

- [ ] Anchor 无法覆盖大空间尺度。
- [ ] Golden Prompt 不再全文注入。
- [ ] Acceptance Standard 不进入生成 Prompt。
- [ ] 编译器可输出字段来源与冲突记录。

## 17.4 评估层

- [ ] 通用空间评估器与项目 Golden 评估器已拆分。
- [ ] Foundation Preservation 已加入硬失败检查。
- [ ] 九州美学项目规则不会影响其他项目。

## 17.5 结果层

- [ ] 九州美学新图明显接近 Golden 气质。
- [ ] 已确定的大空间与建筑美学未被破坏。
- [ ] 其他医美项目可以继承气质但不会复制九州美学。
- [ ] 回归测试全部通过。

---

# 18. 推荐实施顺序

不要一次性重构全部空间链路。推荐顺序：

```text
第一步：放置并版本化四份 Golden 资产
第二步：建立 Spatial Foundation 字段保护
第三步：建立九州美学 Project Visual Canon
第四步：加入 Anchor 维度权重和 spatial_scale = 0
第五步：先修正九州美学空间生图
第六步：拆分项目验收器
第七步：再抽取 Premium Medical Aesthetics Archetype
第八步：用第二个不同品牌验证 Anti-Clone
```

原因：

- 先解决当前九州美学项目的稳定性。
- 再抽象行业原型，避免在样本只有一个项目时过早泛化。
- 必须用第二个不同品牌证明“继承的是精神，不是皮肤”。

---

# 19. 给 Codex 的执行指令

可将以下内容连同本开发文档交给 Codex：

```text
请先审计当前 Masterpiece OS 空间分析、空间上下文编译、参考图加载和空间验收链路，再按照《Masterpiece OS｜九州美学空间 Golden 资产接入与上游风格原型化开发文档》实施改造。

必须遵守：

1. 不要将两份 Golden Markdown 全文拼进运行时 Prompt。
2. 不要将 Golden Acceptance Standard 作为生成提示词。
3. 不要用两张 Golden Anchor 覆盖既有 Spatial Foundation。
4. 建筑美学、空间尺度、功能分区、动线属于高优先级保护字段。
5. 两张 Anchor 的 spatial_scale 影响必须为 0。
6. 九州美学专属色彩、羽瓣、水晶、Logo 和构图不得进入通用 Archetype。
7. 通用 Archetype 只能继承语义、气质、材质行为、灯光行为和品牌整合策略。
8. 其他项目不得默认加载九州美学 Anchor。
9. 所有配置必须通过 Schema 校验。
10. 必须补充单元测试、Prompt Snapshot 和跨项目 Anti-Clone 测试。

开发前先输出：
- 当前代码链路审计
- 现有目录映射
- 需要新增或修改的文件清单
- 风险点
- 分阶段实施计划

然后再开始写代码。不要先大范围重构。
```

---

# 20. 最终结论

这次不应该把 Golden Prompt、Golden Acceptance Standard 和两张 Anchor 当成四个“更强的提示词素材”。

它们应被系统化为：

```text
两份 MD
→ 人类可读源标准

两张 Anchor
→ 九州美学项目级视觉校准资产

结构化 Project Canon
→ 九州美学运行时生成约束

Vertical Spatial Archetype
→ 可跨项目继承的抽象空间语义

Spatial Foundation Lock
→ 保护建筑美学、大空间和功能结论

双评估器
→ 通用空间质量 + 项目专属验收
```

最重要的开发判断是：

> **Golden Anchor 负责告诉系统“九州美学应该以什么气质被表达”，而不是告诉系统“空间应该有多大、建筑应该怎么长”。**

只有完成这种职责分离，九州美学才能被定向修正，同时又不会把 Masterpiece OS 训练成“淡紫羽瓣医美空间复制机”。

---

**End of Development Document v1.0**
