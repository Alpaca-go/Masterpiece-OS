# Task

Generate a single premium-grade space image for **一剂良方** (health_management).
Scene: `reception` (tcm_consultation_reception).
Context: street_store | Scale: medium.

# Architecture Context (in-context reference, Phase 8A)

> 建筑机制先验 (anchor 先于 DNA 的 architectural_concept, 强化建筑美学).
> 以下机制是当前品牌已通过 S 级验收的建筑语言样本, 不得直接复刻其具体物 (v1.0 §34 规则一/五).

## Anchor 1: YJLF-ARCH-03-TeaCorner (role=tea_corner_with_consultation)

- **Primary Mechanism**: 茶几 + 椅 + 中医咨询桌, herbal_display_wall, 软边界 (纸屏风)
- **Secondary Mechanism**: 不用 medical_compliance (JZMX 标志), 不用 kitchen_pass (FTT 标志)

## Anchor 2: YJLF-ARCH-01-WoodenGrid (role=warm_wood_grid_with_paper_screen)

- **Primary Mechanism**: 木格 + 浅木色 + matte_clay_wall + linen_fabric, 暖色中等硬度
- **Secondary Mechanism**: 自然光 + warm_amber 暖色筒灯, 不用紫色 / 不用嵌入光带 (JZMX 标志)

## Anchor 3: YJLF-ARCH-02-PaperScreen (role=paper_screen_diffused_light)

- **Primary Mechanism**: 宣纸 / 棉纸窗户 + 自然光通过纸柔化, 安静氛围
- **Secondary Mechanism**: 纸屏风替代硬隔断, 不用玻璃幕墙 / 膜天花 (JZMX 标志)

## Usage in this prompt

把上述 anchor 提供的建筑机制作为 **先验** (priority), 在 architectural_concept 块之前.
DNA 字段描述的空间概念必须与 anchor 的建筑机制 **一致**, 不冲突.
禁止把 anchor 中的具体物 (具体天花曲线 / 具体玻璃分格 / 具体膜形态) 复刻到生成图里.
# Architecture-Function Bridge (Phase 8B.1 §3: 建筑机制 -> 商业功能桥接)

> 建筑语言必须服务于商业现实, 不是反过来. 本块把 architecture 翻译为 functional action,
> 缓解 Phase 8B 暴露的 Architecture Concept Drift (空间变展览馆, 商业运营逻辑被压制).

**Fallback Mode (no explicit architectureFunctionBridge field, Phase 8B.1 §3 fallback)**:

**Operational Realism**: high
**Required Zones (must appear in image)**: consultation_desk, waiting_area, tea_corner, herbal_display
**Customer Flow**: entrance->reception=clear | reception->waiting=clear | waiting->consultation=readable
**Medical Compliance**: visibleButNotHospitalLike=true

**Usage**: 商业功能约束从 functionalDna + sceneDefinition 推导, 缺省时按 v0.1 baseline 处理. 推荐补充 architectureFunctionBridge 字段以获得 Phase 8B.1 完整桥接效果.

# Architectural Concept (空间概念优先于品牌表达, v1.1 §6)

**Primary Spatial Concept**: warm_grid_with_wood_accents
**Secondary**: subtle_traditional_layers

空间概念 / 建筑机制 必须先于 品牌元素 被建立. 品牌附着在建筑语言之上, 不是反过来.

# Architecture DNA

**Geometry**:
- Dominant: wooden_grid, warm_panels, paper_screens
- Limited: extreme_curves, industrial_steel

**Spatial Continuity**:
- Wall ↔ Ceiling: medium
- Floor ↔ Furniture: high
- Room ↔ Room: medium

**Boundary Language**:
- Hardness: medium | Transparency: low | Enclosure: soft

**Circulation**: type=guided_flow | visibility=filtered | rhythm=calm

**Boundary Hardness**: medium
**Statement Strength**: medium

# Brand Translation (v1.1 §5 翻译层, 品牌不是装饰)

**Brand**: 一剂良方
**Industry**: 中医养生与健康管理
**Audience**: 养生消费者, 亚健康人群, 中老年客户

**Brand Spirit (high-weight >= 0.7)**:
- healing (weight >= 0.7)
- premium (weight >= 0.7)

**Brand Grammar**:
- organicGrowth: medium
- visualLightness: medium
- controlledGlow: low
- refinedOrder: high
- decorativeDensity: medium

**Motif Family (all optional, no required literal)**: translucent_fiber, flowing_membrane

**Literal Asset Usage**:
- Logo visibility: medium
- Direct peacock: low
- Flower sculpture: optional
- Crystal object: avoid

**Injection Strength**: 0.45 (0 = no injection, 1 = all literal assets)

# Functional & Commercial Requirement (v1.1 §6 合并 v0.1 function+functional)

**Required Zones**: consultation_desk, waiting_area, tea_corner, herbal_display
**Optional Zones**: diagnostic_room_signage, art_installation
**Operational Realism**: high

**Customer Flow**:
- Entrance → Reception: clear
- Reception → Waiting: clear
- Waiting → Consultation: readable

**Privacy Zones**:
- Public: open
- Semi-private: filtered
- Treatment: filtered

**Furniture**: ergonomic commercial-grade accessible

**Medical Compliance**:
- Visible but not hospital-like: true

# Material System

**Material Count Limit**: 5 (v1.0 §16 hard constraint: 5 for medical_aesthetics)

**Primary Materials**: light_wood, matte_clay_wall, linen_fabric
**Secondary Materials**: rice_paper
**Accent Materials**: brass_fitting

**Finish**: gloss=low | reflectivity=matte | tactile=natural

# Lighting System

**Primary Strategy**: natural_lighting

**Ambient**: softness=high | brightness=medium | contrast=low

**Integrated Light**:
- Ceiling cove: low
- Wall edge: low
- Furniture base: low

**Brand Light**: hueFamily=warm_amber,neutral_white | saturation=low | areaRatio=limited

**Spotlight Usage**: low
**Decorative Fixture Visibility**: low
**Architectural Glow**: medium

# Composition & Photography

**Focal Hierarchy**:
- Primary: consultation_desk_with_tea
- Secondary: herbal_display_wall
- Tertiary: wooden_partition

**Visual Balance**: symmetry=medium | negativeSpace=medium | density=medium

**Camera**: lens=28mm_to_40mm | height=human_eye_level | distortion=controlled

**Framing**: depthLayers=3 | foregroundUsage=optional | clearEntryView=true

# Rendering Requirements

**Realism**: commercial_archviz
**Visual Finish**: natural
**Exposure**: soft_bright
**White Balance**: warm
**Shadow**: soft
**Texture Visibility**: controlled
**People**: amount=sparse | motionBlur=optional
**Cleanliness**: high
**Post-Processing**: restrained

# Prohibited (fail-closed)

The following MUST NOT appear in the generated image:
- generic_spa
- excessive_purple
- lobby_hotel_look
- industrial_clinic_look
- western_pharmacy
- fast_food_lighting
- neon_signage
- abstract_modern_art_museum
- unusable_consultation_chair
- empty_tcm_museum
