# Task

Generate a single premium-grade space image for **冯烫烫** (restaurant).
Scene: `reception` (casual_dining_entrance).
Context: street_store | Scale: small.

# Spatial Intent (Phase 9A.2: 为什么需要这样的空间体验)

> 这次生成的空间要传递的核心体验目标 + spatial strategy 关键词.
> 这一层在 architecture function bridge 之前, 给整个空间先定"体验基调".
> 注意: 不指定具体 anchor / material / decoration (Phase 9A.2 §9 Layer Boundary).

**Experience Goal**: 创造可信赖的、围绕食物制作的日常餐饮体验

**Spatial Strategy** (用以下策略实现体验目标, 不要直接复制具体元素):
- visible process
- warm material
- social interaction

**Usage**: 把上面 experienceGoal + spatialStrategy 当作这次空间生成的"先验". architectural_concept / architecture_dna / material / lighting 等块需要为这个体验目标服务, 不是反过来.

# Architecture Language (Phase 9A.3: 什么建筑原则支持这种体验)

> 由 spatial intent 推导出的 high-level architecture language 方向.
> 这一层是"建筑机制先验", 给 architectural_concept / architecture_dna 提供方向.
> 注意: 不指定具体 anchor / 装饰元素 / 参考图 (Phase 9A.3 §9 Layer Boundary).

**Spatial Principles** (空间原则):
- human scale
- visible process
- warm interaction

**Architectural Characteristics** (建筑特征):
- human scale
- process visibility
- warm enclosure

**Material Direction** (材料方向, 高层):
- warm surface
- natural texture

**Light Direction** (光环境逻辑):
- natural daylight primary
- warm ambient secondary

**Spatial Organization** (空间组织):
- process-as-anchor layout
- dining circulation around production

**Usage**: 上面 5 个维度是这次空间要遵循的 high-level architecture language 方向. material / lighting 块可以更具体, 但要遵循上面的方向, 不是反过来. architecture function bridge 仍然提供商业功能约束, 这一层不重复其内容.

# Spatial Reality Constraint (Phase 9B.1: 什么商业现实约束这个空间)

> 商业空间真实性是硬约束. 这次生成的空间必须在以下商业现实里站住脚, 不能偏向
> exhibition / installation / concept architecture / pure art space.
> 这一层在 spatial_intent + architecture_language 之后, 在 architecture_context
> 之前, 给建筑语言加商业现实护栏.
> 注意: 不指定具体 anchor / 装饰元素 (Phase 9A.3 §9 Layer Boundary).

**Space Type** (空间类型): casual_dining_restaurant

**Commercial Scale** (商业规模): 80-150 sqm casual restaurant, 30-50 seat, 翻台率 2-3 轮 / 晚

**Required Zones** (必备功能区, 必须全部出现, staff 可见):
- open_kitchen
- dining_area
- counter
- waiting_corner
- restroom_access

**Operation Logic** (运营逻辑): visible food prep + social dining; 厨房/前厅 staff 始终可见, 食材制作过程是体验核心, 高峰期 staff 8-12 人

**User Flow** (用户动线): street -> counter (点单) -> dining (15-30 分钟等餐) -> dining (30-60 分钟用餐) -> counter (结账), 周末高峰 staff 与食客互动

**Privacy Requirement** (隐私要求): mostly open dining; 2-3 个 semi-private booth (4-6 人), 无 enclosed private room; 桌椅间距 ≥ 0.8m 让 staff 通行

**Material Reality** (材料现实, 真实材料而非概念): warm wood, natural texture, 真实厨房设备 (蒸笼/锅/明火/排烟), 餐椅耐磨, 桌面可擦洗, 不可出现 大理石 / 亚克力 / 镜面金属 / 雕塑装置

**Forbidden Spatial Types** (反漂移, 以下空间类型**绝对不能**出现, 出现任何一个视为失败):
- ❌ fine dining (无桌布 / 无水晶灯 / 无 5 道菜礼仪)
- ❌ modern art museum (白盒 + 离散雕塑 + 静音)
- ❌ art gallery (空墙 + 射灯)
- ❌ exhibition hall (中心展示台 + 巡游动线)
- ❌ fast food chain (塑料椅 + 荧光灯 + 自助点餐)
- ❌ buffet / cafeteria (长条桌 + 自助台)
- ❌ modern museum (高顶 + 雕塑 + 巡游)
- ❌ art installation (装饰性雕塑 / 装置为主)

**Usage**:
- 上面 8 字段是这次空间的硬约束, architecture / material / lighting / composition 块必须为这些约束服务, 不是反过来.
- 必备功能区 (requiredZones) 必须在图里全部出现, staff 必须可见 (非 0 staff 纯展示).
- forbidden spatial types 是**反漂移**硬护栏, 出现任何一个视为该 mode 失败.
- 商业真实性优先于建筑美学: 真实材料 > 概念材料, 真实功能 > 概念空间, 真实 staff > 纯展示.

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
# Architecture Preservation (Phase 9B.2: 什么建筑机制必须被保护)

> Phase 9B 给了 Architecture Anchor 提供的建筑美感, Phase 9B.1 通过 Reality Constraint 提升了
> 商业真实性, 但可能削弱了 anchor 的空间记忆点. 这一层在 architecture_context (Phase 8A) 之后,
> 在 architecture_function_bridge 之前, 显式保护 anchor 提供的关键建筑机制.
> 设计原则: **mechanism not object** (Phase 9B.2 §6).

**Weight** (保护强度): 0.50 (0.3 弱保护 / 0.5 平衡 / 0.7 强保护 / 0.9 概念优先)

**Protected Elements** (保护元素, 只保护机制, 不添加具体装饰物):
- **spatial_signature** — 保护空间识别度和核心建筑特征. 接待台 + 沙发 + 走廊 / open_kitchen + dining / tea_corner + herbal cabinet 等空间节奏必须保留.
- **material_expression** — 保护材质关系和表面表达. 微水泥 + 木材 + 半透膜 / 暖木 + 真实厨房设备 / 天然木 + 宣纸 + 陶瓷 等材质组合必须保留.
- **lighting_behavior** — 保护品牌光环境. 主光 + 边缘光 + ambient 4 层 / 自然光 + 暖光 / 纸灯软光 + 茶艺区暖光 等光环境逻辑必须保留.

**Usage** (Phase 9B.2 §6 mechanism not object):
- ✓ 允许: 保留空间结构 / 保留材质关系 / 保留光线逻辑
- ✗ 禁止: 增加额外装饰 / 强行加入雕塑 / 堆叠视觉符号
- ✗ 禁止: 引入未在 anchor 中存在的具体装饰元素 (花瓣 / 羽翼 / 雕塑 / 装置)
- 上面列出的 protected elements 必须被生成图遵守, 强度按 weight 调整
- weight=0.7 意味着 70% 保留 anchor 机制 + 30% 自由演化, weight=0.9 几乎完全保留 anchor

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
