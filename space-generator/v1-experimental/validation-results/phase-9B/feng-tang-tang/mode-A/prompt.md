# Task

Generate a single premium-grade space image for **冯烫烫** (restaurant).
Scene: `reception` (casual_dining_entrance).
Context: street_store | Scale: small.

# Architecture Context (in-context reference, Phase 8A)

> 建筑机制先验 (anchor 先于 DNA 的 architectural_concept, 强化建筑美学).
> 以下机制是当前品牌已通过 S 级验收的建筑语言样本, 不得直接复刻其具体物 (v1.0 §34 规则一/五).

## Anchor 1: FTT-ARCH-01-KitchenAnchor (role=open_kitchen_as_visual_anchor)

- **Primary Mechanism**: 开放厨房窗口 + 厨师动作可见, 客人面朝厨房, warm_amber 灯光暖色
- **Secondary Mechanism**: 餐桌围绕厨房排布, 主通道 1.5m+, 商业客流循环

## Anchor 2: FTT-ARCH-02-WarmCommercialGrid (role=warm_material_commercial_grid)

- **Primary Mechanism**: 红砖墙 + 暖色木 + 赤陶瓦 三元组, 自然光 + warm_amber 暖色筒灯
- **Secondary Mechanism**: 网格状 booth 布局, 人尺度, 不用紫色 / 不用冷光

## Anchor 3: FTT-ARCH-03-HumanScaleBooth (role=wooden_booth_with_human_proportion)

- **Primary Mechanism**: 木 booth + 人尺度 (座高 45cm, 桌高 75cm), booth 之间 1.2m 间距
- **Secondary Mechanism**: 菜单板可见 + 实物感 + 烟火气, 不用 medical 标志

## Usage in this prompt

把上述 anchor 提供的建筑机制作为 **先验** (priority), 在 architectural_concept 块之前.
DNA 字段描述的空间概念必须与 anchor 的建筑机制 **一致**, 不冲突.
禁止把 anchor 中的具体物 (具体天花曲线 / 具体玻璃分格 / 具体膜形态) 复刻到生成图里.
# Architecture-Function Bridge (Phase 8B.1 §3: 建筑机制 -> 商业功能桥接)

> 建筑语言必须服务于商业现实, 不是反过来. 本块把 architecture 翻译为 functional action,
> 缓解 Phase 8B 暴露的 Architecture Concept Drift (空间变展览馆, 商业运营逻辑被压制).

**Fallback Mode (no explicit architectureFunctionBridge field, Phase 8B.1 §3 fallback)**:

**Operational Realism**: high
**Required Zones (must appear in image)**: reception_counter, waiting_bench, menu_board, kitchen_pass_visible
**Customer Flow**: entrance->reception=clear | reception->waiting=clear | waiting->consultation=unreadable

**Usage**: 商业功能约束从 functionalDna + sceneDefinition 推导, 缺省时按 v0.1 baseline 处理. 推荐补充 architectureFunctionBridge 字段以获得 Phase 8B.1 完整桥接效果.

# Architectural Concept (空间概念优先于品牌表达, v1.1 §6)

**Primary Spatial Concept**: warm_commercial_grid
**Secondary**: kitchen_as_anchor

空间概念 / 建筑机制 必须先于 品牌元素 被建立. 品牌附着在建筑语言之上, 不是反过来.

# Architecture DNA

**Geometry**:
- Dominant: warm_tile_grid, wooden_booth, open_kitchen_window
- Limited: smooth_curves, all_glass_facade, extreme_dimming

**Spatial Continuity**:
- Wall ↔ Ceiling: medium
- Floor ↔ Furniture: high
- Room ↔ Room: medium

**Boundary Language**:
- Hardness: medium | Transparency: medium | Enclosure: hard

**Circulation**: type=guided_flow | visibility=open | rhythm=active

**Boundary Hardness**: medium
**Statement Strength**: medium

# Brand Translation (v1.1 §5 翻译层, 品牌不是装饰)

**Brand**: 冯烫烫
**Industry**: 餐饮 / 川菜 / 跷脚牛肉
**Audience**: 川菜消费者, 周边居民, 午餐客流

**Brand Spirit (high-weight >= 0.7)**:
- (no spirit weight above 0.7)

**Brand Grammar**:
- organicGrowth: low
- visualLightness: medium
- controlledGlow: low
- refinedOrder: medium
- decorativeDensity: medium

**Motif Family (all optional, no required literal)**: feather_like_flow

**Literal Asset Usage**:
- Logo visibility: high
- Direct peacock: low
- Flower sculpture: avoid
- Crystal object: avoid

**Injection Strength**: 0.5 (0 = no injection, 1 = all literal assets)

# Functional & Commercial Requirement (v1.1 §6 合并 v0.1 function+functional)

**Required Zones**: reception_counter, waiting_bench, menu_board, kitchen_pass_visible
**Optional Zones**: spice_display, beverage_cooler
**Operational Realism**: high

**Customer Flow**:
- Entrance → Reception: clear
- Reception → Waiting: clear
- Waiting → Consultation: unreadable

**Privacy Zones**:
- Public: open
- Semi-private: open
- Treatment: open

**Furniture**: ergonomic commercial-grade accessible

# Material System

**Material Count Limit**: 5 (v1.0 §16 hard constraint: 5 for medical_aesthetics)

**Primary Materials**: warm_wood_booth, red_brick_wall, terracotta_tile
**Secondary Materials**: bamboo_screen
**Accent Materials**: brass_kitchen_fixture

**Finish**: gloss=medium | reflectivity=controlled | tactile=natural

# Lighting System

**Primary Strategy**: natural_lighting

**Ambient**: softness=medium | brightness=high | contrast=medium

**Integrated Light**:
- Ceiling cove: low
- Wall edge: low
- Furniture base: low

**Brand Light**: hueFamily=warm_amber,red_glow | saturation=low | areaRatio=limited

**Spotlight Usage**: low
**Decorative Fixture Visibility**: low
**Architectural Glow**: low

# Composition & Photography

**Focal Hierarchy**:
- Primary: kitchen_pass_with_chef
- Secondary: wooden_booth_seating
- Tertiary: menu_board

**Visual Balance**: symmetry=low | negativeSpace=low | density=high

**Camera**: lens=28mm_to_40mm | height=human_eye_level | distortion=controlled

**Framing**: depthLayers=3 | foregroundUsage=required | clearEntryView=true

# Rendering Requirements

**Realism**: commercial_archviz
**Visual Finish**: natural
**Exposure**: balanced
**White Balance**: warm
**Shadow**: controlled
**Texture Visibility**: pronounced
**People**: amount=moderate | motionBlur=preferred
**Cleanliness**: high
**Post-Processing**: restrained

# Prohibited (fail-closed)

The following MUST NOT appear in the generated image:
- fine_dining
- crystal_chandelier
- purple_lavender_glow
- white_curved_walls
- optical_fiber_installation
- translucent_fiber_decoration
- feather_like_flow_motif
- petal_like_expansion
- silent_atmosphere
- luxury_lounge
- high_end_clinic
- fashion_boutique
