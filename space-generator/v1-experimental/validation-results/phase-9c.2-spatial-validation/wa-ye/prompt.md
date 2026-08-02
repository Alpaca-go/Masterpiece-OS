# Task

Generate a single premium-grade space image for **蛙耶** (casual_dining_chain).
Scene: `reception` (charcoal_grill_specialty).
Context: mall_dining_zone | Scale: small_to_medium.


# Spatial Intent (Phase 9A.2: 为什么需要这样的空间体验)

> 这次生成的空间要传递的核心体验目标 + spatial strategy 关键词.
> 这一层在 architecture function bridge 之前, 给整个空间先定"体验基调".
> 注意: 不指定具体 anchor / material / decoration (Phase 9A.2 §9 Layer Boundary).

**Experience Goal**: 创造符合品牌的、有功能支撑的空间体验

**Spatial Strategy** (用以下策略实现体验目标, 不要直接复制具体元素):
- balanced visibility
- calm circulation
- visible process
- warm material
- social interaction

**Usage**: 把上面 experienceGoal + spatialStrategy 当作这次空间生成的"先验". architectural_concept / architecture_dna / material / lighting 等块需要为这个体验目标服务, 不是反过来.


# Architecture Language (Phase 9A.3: 什么建筑原则支持这种体验)

> 由 spatial intent 推导出的 high-level architecture language 方向.
> 这一层是"建筑机制先验", 给 architectural_concept / architecture_dna 提供方向.
> 注意: 不指定具体 anchor / 装饰元素 / 参考图 (Phase 9A.3 §9 Layer Boundary).

**Spatial Principles** (空间原则):

**Architectural Characteristics** (建筑特征):
- controlled visual access
- clear spatial axis

**Material Direction** (材料方向, 高层):
- calm surface treatment

**Light Direction** (光环境逻辑):
- soft natural transition

**Spatial Organization** (空间组织):
- clear user circulation
- subtle privacy gradient

**Usage**: 上面 5 个维度是这次空间要遵循的 high-level architecture language 方向. material / lighting 块可以更具体, 但要遵循上面的方向, 不是反过来. architecture function bridge 仍然提供商业功能约束, 这一层不重复其内容.


# Spatial Reality Constraint (Phase 9B.1: 什么商业现实约束这个空间)

> 商业空间真实性是硬约束. 这次生成的空间必须在以下商业现实里站住脚, 不能偏向
> exhibition / installation / concept architecture / pure art space.
> 这一层在 spatial_intent + architecture_language 之后, 在 architecture_context
> 之前, 给建筑语言加商业现实护栏.
> 注意: 不指定具体 anchor / 装饰元素 (Phase 9A.3 §9 Layer Boundary).

**Space Type** (空间类型): casual_dining_chain_specialty

**Commercial Scale** (商业规模): 80-150 sqm 商场餐饮店面, 30-50 seat, 翻台率 2-3 轮 / 晚, 主打炭烧牛蛙 1 个核心菜 + 6-8 个配菜

**Required Zones** (必备功能区, 必须全部出现, staff 可见):
- 点单 counter
- 堂食 seating_area (40-60 seat)
- 出餐 pass
- 招牌菜灯箱 menu_lightbox
- 蛙 IP 形象墙 logo_wall
- 拍照打卡位 photo_spot
- 洗手间 access

**Operation Logic** (运营逻辑): visible open kitchen (明档) + 黑色铸铁锅炭烧 + 高峰期 staff 6-10 人 + 商场中庭悬挂灯箱做高可见度 marketing

**User Flow** (用户动线): 商场中庭 -> 灯箱吸引 -> 门口点单 counter -> 堂食 seating -> 上炭烧牛蛙 -> 拍照 -> 离开 (可外带)

**Privacy Requirement** (隐私要求): mostly open dining, 桌椅间距 ≥ 0.8m staff 通行, 无 enclosed private room, 偶有 1-2 个 semi-private booth 4-6 人

**Material Reality** (材料现实, 真实材料而非概念): 漆面金属板 (lacquered metal panel) + 亚克力灯箱 (acrylic lightbox) + LED 灯带 (LED strip) + 不锈钢台面 (stainless steel counter) + 防水布周边 (printed tote / T 恤). 不可出现: 传统红木 / 中式屏风 / 民俗装饰 / 婚礼主题 / 高端日式枯山水 / 怀旧风

**Forbidden Spatial Types** (反漂移, 以下空间类型**绝对不能**出现, 出现任何一个视为失败):
- ❌ fine dining (无桌布 / 无水晶灯)
- ❌ 传统中餐包间 (无红木屏风)
- ❌ 高端日式 (无枯山水 / 无原木格栅)
- ❌ 怀旧国风 (无 80 年代感)
- ❌ 婚礼主题 (无大红 / 无喜字)
- ❌ spa / 医美 / 医院 (无白墙曲线 / 无 SPA 灯)
- ❌ 现代艺术馆 (白盒+雕塑)

**Usage**:
- 上面 8 字段是这次空间的硬约束, architecture / material / lighting / composition 块必须为这些约束服务, 不是反过来.
- 必备功能区 (requiredZones) 必须在图里全部出现, staff 必须可见 (非 0 staff 纯展示).
- forbidden spatial types 是**反漂移**硬护栏, 出现任何一个视为该 mode 失败.
- 商业真实性优先于建筑美学: 真实材料 > 概念材料, 真实功能 > 概念空间, 真实 staff > 纯展示.


# Architecture-Function Bridge (Phase 8B.1 §3: 建筑机制 -> 商业功能桥接)

> 建筑语言必须服务于商业现实, 不是反过来. 本块把 architecture 翻译为 functional action,
> 缓解 Phase 8B 暴露的 Architecture Concept Drift (空间变展览馆, 商业运营逻辑被压制).

**Fallback Mode (no explicit architectureFunctionBridge field, Phase 8B.1 §3 fallback)**:

**Operational Realism**: high
**Required Zones (must appear in image)**: 点单_counter, 堂食_seating_area, 出餐_pass, 招牌菜灯箱_menu_lightbox, 蛙_IP_形象墙_logo_wall, 拍照打卡位_photo_spot, 洗手间_access
**Customer Flow**: entrance->reception=mall_atrium -> lightbox_attraction -> 门口点单 counter | reception->waiting=点单后 -> 堂食 seating 区等待上菜 | waiting->consultation=上炭烧牛蛙 -> 拍照 -> 用餐 -> 离开 (可外带)

**Usage**: 商业功能约束从 functionalDna + sceneDefinition 推导, 缺省时按 v0.1 baseline 处理. 推荐补充 architectureFunctionBridge 字段以获得 Phase 8B.1 完整桥接效果.


# Architecture Preservation (Phase 9B.2: 什么建筑机制必须被保护)

> Phase 9B 给了 Architecture Anchor 提供的建筑美感, Phase 9B.1 通过 Reality Constraint 提升了
> 商业真实性, 但可能削弱了 anchor 的空间记忆点. 这一层在 architecture_context (Phase 8A) 之后,
> 在 architecture_function_bridge 之前, 显式保护 anchor 提供的关键建筑机制.
> 设计原则: **mechanism not object** (Phase 9B.2 §6).

**Weight** (保护强度): 0.60 (0.3 弱保护 / 0.5 平衡 / 0.7 强保护 / 0.9 概念优先)

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


# Architectural Concept (空间概念优先于品牌表达, v1.1 §6)

**Primary Spatial Concept**: y2k_street_market
**Secondary**: pop_casual_dining

空间概念 / 建筑机制 必须先于 品牌元素 被建立. 品牌附着在建筑语言之上, 不是反过来.


# Architecture DNA

**Geometry**:
- Dominant: lacquered_panel, acrylic_lighting, stainless_steel_display
- Limited: raw_exposed_concrete, wood_panel, soft_curves

**Spatial Continuity**:
- Wall ↔ Ceiling: medium
- Floor ↔ Furniture: high
- Room ↔ Room: low

**Boundary Language**:
- Hardness: medium | Transparency: high | Enclosure: soft_to_medium

**Circulation**: type=visible_open_kitchen | visibility=open | rhythm=active

**Boundary Hardness**: medium
**Statement Strength**: high


# Spatial Intent Preset (Phase v1.0: 用户选择的设计意图, 品牌驱动 / Brand Driven)

> 这一层在 architecture_dna 之后, space_role_context 之前.
> 用户选择的设计意图 preset = **brand_driven**, 转换成 4 维 intent expression:
> - brandExpression: **dominant**
> - architectureExpression: **balanced**
> - referenceInfluence: **low**
> - industryConstraint: **maintain**

> 原则 (Phase v1.0 §3): 不暴露 weight 数字, 用文字 emphasis 表达用户设计意图.
> preset 单选 (§8), 不允许组合. Masterpiece OS 负责理解并执行.

**Runtime Tendency — Enhance (强化)**:
- Brand Identity
- Visual Signature
- Brand Story Translation

**Runtime Tendency — Maintain (保持)**:
- Industry Logic
- Spatial Reality
- Basic Architecture Quality

**Prompt Emphasis (per §7, text-based, no weight numbers)**:

> Prioritize brand identity, visual signature, and brand story translation (当前 brand: wa-ye) (当前 industry: 餐饮 / 炭烧牛蛙 / 潮流快餐).
> Strengthen logo / IP / brand color / signature motifs / visual recognition.
> Maintain industry logic, spatial reality, and basic architecture quality.
> Avoid generic / templated outputs that ignore brand specificity.

**Usage**:
- 把上面 4 维 intent 当作 prompt 编译时的硬约束.
- brand_translation / architecture_dna / space_role_context 仍然按各自 phase 输出, 不变.
- 当 brandExpression=dominant 时, 强化 brand identity 字段 (logo / IP / brandLight hue / literalAssetUsage).
- 当 architectureExpression=dominant 时, 强化 architecture_dna 字段 (spatial structure / material hierarchy / lighting behavior).
- 当 referenceInfluence=dominant 时, 强化 reference image 提供的 composition / spatial grammar / lighting / material 4 维机制.
- industryConstraint=maintain 永远保持 industry rules (Phase 9C.0.5 brand identity validation gate 通过).

# Space Role Context (Phase 9C.1: 空间角色约束, 接待区 / Reception)

> 这一层在 architecture_dna 之后, brand_translation 之前.
> 它**不**修改 brand_translation 也不**修改** architecture_dna, 只给当前空间加 role-specific 约束.
> 原则: 同一品牌保持语言统一, 不同空间有真实功能差异.

**Role**:
- primary: first_impression_zone
- secondary: brand_disclosure

**Priority** (0-1, 决定空间行为倾向):
- privacy: 0.3
- comfort: 0.6
- brand_display: 0.85
- circulation: 0.5

**Visual Rules**:
- lighting: bright_welcoming
- material: signature_brand_surface
- density: medium

**Functional Constraints**:
- must_include: reception_desk, brand_wall, waiting_area
- must_exclude: treatment_bed, private_consultation_room, enclosed_capsule
- key_equipment: 接待台 / 品牌展示墙 / 等候座椅 / 引导动线
- human_traffic: high_reception_flow

**Narrative Focus**: 客户第一接触点. 5 秒内理解品牌身份 + 接待节奏. 信息密度中等, 强调品牌空间表达 + 高效接待.

**Usage**: 把上面 role / priority / visual_rules / functional_constraints 当作该空间的硬约束.
brand_translation 跟 architecture_dna 仍然按 Phase 9C 模式输出, 不变.
模型需要在保持品牌语言统一的前提下, 表达这个空间的功能差异化 (privacy / comfort / brand_display / circulation 倾向).

# Brand Translation (v1.1 §5 翻译层, 品牌不是装饰)

**Brand**: 蛙耶
**Industry**: 餐饮 / 炭烧牛蛙 / 潮流快餐
**Audience**: 18-30 岁年轻食客, 打卡 / 拍照 / 尝鲜 / 性价比, 朋友聚餐 / 情侣约会

**Brand Spirit (high-weight >= 0.7)**:
- playful (weight >= 0.7)
- youthful (weight >= 0.7)
- energetic (weight >= 0.7)

**Brand Grammar**:
- highSaturationCollision: high
- ipRepetitionDensity: high
- controlledGlow: high
- cartoonGestureEcho: high
- decorativeDensity: high

**Motif Family (all optional, no required literal)**: cartoon_frog_gesture

**Literal Asset Usage**:
- Logo visibility: high
- Direct peacock: undefined
- Flower sculpture: undefined
- Crystal object: undefined

**Injection Strength**: 0.8 (0 = no injection, 1 = all literal assets)


# Functional & Commercial Requirement (v1.1 §6 合并 v0.1 function+functional)

**Required Zones**: 点单_counter, 堂食_seating_area, 出餐_pass, 招牌菜灯箱_menu_lightbox, 蛙_IP_形象墙_logo_wall, 拍照打卡位_photo_spot, 洗手间_access
**Optional Zones**: semi_private_booth_4_6_seat, 外带_pickup_window
**Operational Realism**: high

**Customer Flow**:
- Entrance → Reception: mall_atrium -> lightbox_attraction -> 门口点单 counter
- Reception → Waiting: 点单后 -> 堂食 seating 区等待上菜
- Waiting → Consultation: 上炭烧牛蛙 -> 拍照 -> 用餐 -> 离开 (可外带)

**Privacy Zones**:
- Public: open
- Semi-private: semi_open_booth
- Treatment: n_a

**Furniture**: ergonomic commercial-grade accessible


# Material System

**Material Count Limit**: 7 (v1.0 §16 hard constraint: 5 for medical_aesthetics)

**Primary Materials**: lacquered_panel, acrylic_lightbox, stainless_steel, printed_graphics
**Secondary Materials**: led_strip, rgb_color_light, printed_poster
**Accent Materials**: neon_signage_tube, ip_merchandise_display

**Finish**: gloss=high | reflectivity=semi_gloss | tactile=lacquered


# Lighting System

**Primary Strategy**: direct_color_lighting

**Ambient**: softness=low | brightness=high | contrast=high

**Integrated Light**:
- Ceiling cove: medium
- Wall edge: high
- Furniture base: medium

**Brand Light**: hueFamily=brand_purple_#4116B7,brand_green_#56CE00,brand_yellow_#FFC000 | saturation=high | areaRatio=large

**Spotlight Usage**: high
**Decorative Fixture Visibility**: high
**Architectural Glow**: medium


# Composition & Photography

**Focal Hierarchy**:
- Primary: brand_logo_wall_with_frog_ip_and_signature_dish_lightbox
- Secondary: 点单_counter_with_neon_signage
- Tertiary: seating_area_with_photo_spot

**Visual Balance**: symmetry=medium | negativeSpace=low | density=high

**Camera**: lens=wide | height=human_eye_level | distortion=controlled

**Framing**: depthLayers=3 | foregroundUsage=required | clearEntryView=true


# Rendering Requirements

**Realism**: photo_realistic
**Visual Finish**: polished_printed
**Exposure**: balanced
**White Balance**: neutral_cool
**Shadow**: controlled
**Texture Visibility**: pronounced
**People**: amount=sparse | motionBlur=optional
**Cleanliness**: high
**Post-Processing**: color_grade_saturated


# Prohibited (fail-closed)

The following MUST NOT appear in the generated image:
- 传统中式中餐包间
- 中式红木屏风
- 怀旧国风
- 民俗装饰
- 婚礼主题
- 高端日式枯山水
- 原木格栅禅意
- fine_dining_pretension
- hospital_pretension
- spa_pretension
- white_curved_medical_walls
- elegant_lobby_seating
