# Task

Generate a single premium-grade space image for **一剂良方** (health_management).
Scene: `reception` (tcm_consultation_reception).
Context: street_store | Scale: medium.

# Spatial Intent (Phase 9A.2: 为什么需要这样的空间体验)

> 这次生成的空间要传递的核心体验目标 + spatial strategy 关键词.
> 这一层在 architecture function bridge 之前, 给整个空间先定"体验基调".
> 注意: 不指定具体 anchor / material / decoration (Phase 9A.2 §9 Layer Boundary).

**Experience Goal**: 创造慢节奏的、可被理解的中医调理体验

**Spatial Strategy** (用以下策略实现体验目标, 不要直接复制具体元素):
- calm rhythm
- soft boundary with traditional elements
- natural diffused light

**Usage**: 把上面 experienceGoal + spatialStrategy 当作这次空间生成的"先验". architectural_concept / architecture_dna / material / lighting 等块需要为这个体验目标服务, 不是反过来.

# Architecture Language (Phase 9A.3: 什么建筑原则支持这种体验)

> 由 spatial intent 推导出的 high-level architecture language 方向.
> 这一层是"建筑机制先验", 给 architectural_concept / architecture_dna 提供方向.
> 注意: 不指定具体 anchor / 装饰元素 / 参考图 (Phase 9A.3 §9 Layer Boundary).

**Spatial Principles** (空间原则):
- layered privacy
- natural material relationship
- quiet circulation
- natural materials
- calm circulation

**Architectural Characteristics** (建筑特征):
- layered privacy gradient
- diffused natural light
- quiet enclosure

**Material Direction** (材料方向, 高层):
- natural wood surface
- paper or fabric soft partition

**Light Direction** (光环境逻辑):
- soft natural transition
- diffused light through paper

**Spatial Organization** (空间组织):
- layered privacy transition
- consultation circulation

**Usage**: 上面 5 个维度是这次空间要遵循的 high-level architecture language 方向. material / lighting 块可以更具体, 但要遵循上面的方向, 不是反过来. architecture function bridge 仍然提供商业功能约束, 这一层不重复其内容.

# Spatial Reality Constraint (Phase 9B.1: 什么商业现实约束这个空间)

> 商业空间真实性是硬约束. 这次生成的空间必须在以下商业现实里站住脚, 不能偏向
> exhibition / installation / concept architecture / pure art space.
> 这一层在 spatial_intent + architecture_language 之后, 在 architecture_context
> 之前, 给建筑语言加商业现实护栏.
> 注意: 不指定具体 anchor / 装饰元素 (Phase 9A.3 §9 Layer Boundary).

**Space Type** (空间类型): tcm_wellness_clinic

**Commercial Scale** (商业规模): 100-180 sqm TCM clinic + 调养空间, 5-8 个 consultation 床位 + 2-3 个 treatment_room

**Required Zones** (必备功能区, 必须全部出现, staff 可见):
- reception_desk
- consultation_room
- tea_corner
- treatment_room
- herbal_medicine_cabinet
- waiting_area

**Operation Logic** (运营逻辑): consultation + tea + slow treatment 节奏; staff 中医师 1-3 人 + 助手 2-3 人 + 茶艺师 1 人, 客户单次 60-90 分钟, 复诊率高

**User Flow** (用户动线): street -> reception -> waiting -> consultation (中医师把脉问诊) -> tea_corner (调理方案讨论) -> treatment_room (针灸/推拿) -> checkout, 路径慢节奏可停顿

**Privacy Requirement** (隐私要求): layered privacy: open reception, semi-open tea_corner, enclosed consultation, enclosed treatment; consultation 不可见听, treatment 完全封闭

**Material Reality** (材料现实, 真实材料而非概念): natural wood (榆木/胡桃木), 宣纸或亚麻 fabric 软隔, herbal cabinet 实木, 茶具真实陶瓷, 不可出现 大理石 / 玻璃幕墙 / 亚克力 / 镜面金属 / LED 灯带

**Forbidden Spatial Types** (反漂移, 以下空间类型**绝对不能**出现, 出现任何一个视为失败):
- ❌ modern hospital (硬墙 + 顶灯 + 排椅 + 消毒水)
- ❌ spa (纯白 + 流水 + 香薰 + 慢节奏冥想)
- ❌ modern museum (白盒 + 雕塑 + 巡游)
- ❌ art gallery (空墙 + 射灯 + 离散艺术品)
- ❌ exhibition hall (中心展示台 + 巡游动线)
- ❌ nightclub (深色 + 紫红 + 镭射)
- ❌ modern office (玻璃隔断 + 工位)
- ❌ fast food / 餐饮 (喧闹 + 塑料椅)

**Usage**:
- 上面 8 字段是这次空间的硬约束, architecture / material / lighting / composition 块必须为这些约束服务, 不是反过来.
- 必备功能区 (requiredZones) 必须在图里全部出现, staff 必须可见 (非 0 staff 纯展示).
- forbidden spatial types 是**反漂移**硬护栏, 出现任何一个视为该 mode 失败.
- 商业真实性优先于建筑美学: 真实材料 > 概念材料, 真实功能 > 概念空间, 真实 staff > 纯展示.

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
# Architecture Preservation (Phase 9B.2: 什么建筑机制必须被保护)

> Phase 9B 给了 Architecture Anchor 提供的建筑美感, Phase 9B.1 通过 Reality Constraint 提升了
> 商业真实性, 但可能削弱了 anchor 的空间记忆点. 这一层在 architecture_context (Phase 8A) 之后,
> 在 architecture_function_bridge 之前, 显式保护 anchor 提供的关键建筑机制.
> 设计原则: **mechanism not object** (Phase 9B.2 §6).

**Weight** (保护强度): 0.50 (0.3 弱保护 / 0.5 平衡 / 0.7 强保护 / 0.9 概念优先)

**Protected Elements** (保护元素, 只保护机制, 不添加具体装饰物):
- **ceiling_language** — 保护顶部空间语言、吊顶结构、光环境. 膜天花 / 边缘光带 / 顶底发光缝 / 实木吊顶 / 纸灯 等机制必须保留.
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
