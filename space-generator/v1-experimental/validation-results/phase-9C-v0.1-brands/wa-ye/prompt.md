# Task

Generate a single premium-grade space image for **蛙耶** (retail).
Scene: `product_display` (sporting_goods_floor).
Context: mall_store | Scale: medium.

# Architecture-Function Bridge (Phase 8B.1 §3: 建筑机制 -> 商业功能桥接)

> 建筑语言必须服务于商业现实, 不是反过来. 本块把 architecture 翻译为 functional action,
> 缓解 Phase 8B 暴露的 Architecture Concept Drift (空间变展览馆, 商业运营逻辑被压制).

**Fallback Mode (no explicit architectureFunctionBridge field, Phase 8B.1 §3 fallback)**:

**Operational Realism**: high
**Required Zones (must appear in image)**: product_wall, trial_zone, fitting_room, checkout_counter
**Customer Flow**: entrance->reception=unclear | reception->waiting=unclear | waiting->consultation=unreadable

**Usage**: 商业功能约束从 functionalDna + sceneDefinition 推导, 缺省时按 v0.1 baseline 处理. 推荐补充 architectureFunctionBridge 字段以获得 Phase 8B.1 完整桥接效果.

# Architectural Concept (空间概念优先于品牌表达, v1.1 §6)

**Primary Spatial Concept**: raw_industrial_grid
**Secondary**: open_flex_with_brand_mural

空间概念 / 建筑机制 必须先于 品牌元素 被建立. 品牌附着在建筑语言之上, 不是反过来.

# Architecture DNA

**Geometry**:
- Dominant: exposed_concrete, metal_grid, open_floor
- Limited: soft_curves, wood_panel, dome_or_ceiling_arch

**Spatial Continuity**:
- Wall ↔ Ceiling: low
- Floor ↔ Furniture: medium
- Room ↔ Room: high

**Boundary Language**:
- Hardness: high | Transparency: medium | Enclosure: hard

**Circulation**: type=open_plan | visibility=open | rhythm=active

**Boundary Hardness**: high
**Statement Strength**: medium

# Brand Translation (v1.1 §5 翻译层, 品牌不是装饰)

**Brand**: 蛙耶
**Industry**: 体育用品零售 / 运动品牌
**Audience**: 运动爱好者, 年轻消费者, 装备升级需求

**Brand Spirit (high-weight >= 0.7)**:
- (no spirit weight above 0.7)

**Brand Grammar**:
- organicGrowth: low
- visualLightness: medium
- controlledGlow: low
- refinedOrder: medium
- decorativeDensity: low

**Motif Family (all optional, no required literal)**: feather_like_flow

**Literal Asset Usage**:
- Logo visibility: high
- Direct peacock: low
- Flower sculpture: avoid
- Crystal object: avoid

**Injection Strength**: 0.5 (0 = no injection, 1 = all literal assets)

# Functional & Commercial Requirement (v1.1 §6 合并 v0.1 function+functional)

**Required Zones**: product_wall, trial_zone, fitting_room, checkout_counter
**Optional Zones**: community_gathering_area, service_desk
**Operational Realism**: high

**Customer Flow**:
- Entrance → Reception: unclear
- Reception → Waiting: unclear
- Waiting → Consultation: unreadable

**Privacy Zones**:
- Public: open
- Semi-private: open
- Treatment: open

**Furniture**: ergonomic commercial-grade accessible

# Material System

**Material Count Limit**: 5 (v1.0 §16 hard constraint: 5 for medical_aesthetics)

**Primary Materials**: exposed_concrete, metal_grid, rubber_floor
**Secondary Materials**: brand_mural_paint
**Accent Materials**: neon_signage_tube

**Finish**: gloss=low | reflectivity=matte | tactile=industrial

# Lighting System

**Primary Strategy**: direct_lighting

**Ambient**: softness=low | brightness=high | contrast=medium

**Integrated Light**:
- Ceiling cove: low
- Wall edge: low
- Furniture base: low

**Brand Light**: hueFamily=neon_brand_color,neutral_white | saturation=high | areaRatio=moderate

**Spotlight Usage**: medium
**Decorative Fixture Visibility**: high
**Architectural Glow**: low

# Composition & Photography

**Focal Hierarchy**:
- Primary: product_wall_with_brand_mural
- Secondary: trial_zone
- Tertiary: neon_signage

**Visual Balance**: symmetry=low | negativeSpace=low | density=high

**Camera**: lens=wide | height=human_eye_level | distortion=controlled

**Framing**: depthLayers=3 | foregroundUsage=required | clearEntryView=true

# Rendering Requirements

**Realism**: photo_realistic
**Visual Finish**: raw
**Exposure**: balanced
**White Balance**: neutral_warm
**Shadow**: controlled
**Texture Visibility**: pronounced
**People**: amount=sparse | motionBlur=optional
**Cleanliness**: high
**Post-Processing**: restrained

# Prohibited (fail-closed)

The following MUST NOT appear in the generated image:
- white_curved_walls
- high_end_clinic_lighting
- feather_like_flow_overuse
- translucent_fiber_decoration
- optical_crystal_centerpiece
- petal_sculpture_motif
- purple_lavender_glow
- elegant_lobby_seating
- spa_atmosphere
- hospital_corridor
- silent_meditation_room
- fine_dining_dinnerware
