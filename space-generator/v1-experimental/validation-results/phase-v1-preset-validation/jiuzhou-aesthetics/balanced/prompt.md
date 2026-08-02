# Task

Generate a single premium-grade space image for **九州美学** (medical_aesthetics).
Scene: `reception` (flagship_clinic_reception).
Context: street_store | Scale: medium.


# Spatial Intent (Phase 9A.2: 为什么需要这样的空间体验)

> 这次生成的空间要传递的核心体验目标 + spatial strategy 关键词.
> 这一层在 architecture function bridge 之前, 给整个空间先定"体验基调".
> 注意: 不指定具体 anchor / material / decoration (Phase 9A.2 §9 Layer Boundary).

**Experience Goal**: 创造低压力、高信任的专业医疗体验

**Spatial Strategy** (用以下策略实现体验目标, 不要直接复制具体元素):
- soft boundary
- balanced openness
- low stimulation lighting

**Usage**: 把上面 experienceGoal + spatialStrategy 当作这次空间生成的"先验". architectural_concept / architecture_dna / material / lighting 等块需要为这个体验目标服务, 不是反过来.


# Architecture Language (Phase 9A.3: 什么建筑原则支持这种体验)

> 由 spatial intent 推导出的 high-level architecture language 方向.
> 这一层是"建筑机制先验", 给 architectural_concept / architecture_dna 提供方向.
> 注意: 不指定具体 anchor / 装饰元素 / 参考图 (Phase 9A.3 §9 Layer Boundary).

**Spatial Principles** (空间原则):
- gradual transition
- controlled openness
- balanced privacy
- continuous space
- soft boundary
- controlled transparency

**Architectural Characteristics** (建筑特征):
- continuous spatial flow
- soft boundary
- quiet hierarchy

**Material Direction** (材料方向, 高层):
- calm mineral texture
- natural translucent surface

**Light Direction** (光环境逻辑):
- indirect illumination
- soft natural transition

**Spatial Organization** (空间组织):
- gradual privacy transition
- clear user circulation

**Usage**: 上面 5 个维度是这次空间要遵循的 high-level architecture language 方向. material / lighting 块可以更具体, 但要遵循上面的方向, 不是反过来. architecture function bridge 仍然提供商业功能约束, 这一层不重复其内容.


# Spatial Reality Constraint (Phase 9B.1: 什么商业现实约束这个空间)

> 商业空间真实性是硬约束. 这次生成的空间必须在以下商业现实里站住脚, 不能偏向
> exhibition / installation / concept architecture / pure art space.
> 这一层在 spatial_intent + architecture_language 之后, 在 architecture_context
> 之前, 给建筑语言加商业现实护栏.
> 注意: 不指定具体 anchor / 装饰元素 (Phase 9A.3 §9 Layer Boundary).

**Space Type** (空间类型): medical_aesthetics_clinic

**Commercial Scale** (商业规模): 200 sqm flagship street_store clinic, single tenant

**Required Zones** (必备功能区, 必须全部出现, staff 可见):
- reception_desk
- waiting_area
- brand_wall
- consultation_room
- consultation_guidance
- vip_lounge

**Operation Logic** (运营逻辑): patient flow + VIP appointment system; staff 在前台 / 咨询室 / 治疗室轮转, 必须随时可见

**User Flow** (用户动线): street -> reception -> waiting -> consultation -> treatment -> checkout, 同一用户 90-120 分钟内完成, 路径上 staff 3-5 人可见

**Privacy Requirement** (隐私要求): open public zone (reception/waiting) + filtered semi-private (consultation_guidance) + enclosed treatment, 不可出现 hospital corridor 风格硬门硬隔

**Material Reality** (材料现实, 真实材料而非概念): real medical-grade materials: mineral_plaster, frosted_glass, brushed metal, fine_textured_stone, matte_white_surface, 4-5 类内, 不可出现花岗岩 / 大理石 / 亚克力发光

**Forbidden Spatial Types** (反漂移, 以下空间类型**绝对不能**出现, 出现任何一个视为失败):
- ❌ hospital corridor (硬墙 + 顶灯 + 排椅)
- ❌ art gallery (空墙 + 射灯 + 单件艺术品)
- ❌ modern museum (白盒 + 离散雕塑)
- ❌ nightclub lighting (深色 + 紫红 + 镭射)
- ❌ exhibition hall (中心展示台 + 巡游动线)
- ❌ art installation (装饰性雕塑 / 装置为主)
- ❌ spa retreat (无 staff / 纯冥想空间)
- ❌ fine art gallery (无 staff 纯展示)

**Usage**:
- 上面 8 字段是这次空间的硬约束, architecture / material / lighting / composition 块必须为这些约束服务, 不是反过来.
- 必备功能区 (requiredZones) 必须在图里全部出现, staff 必须可见 (非 0 staff 纯展示).
- forbidden spatial types 是**反漂移**硬护栏, 出现任何一个视为该 mode 失败.
- 商业真实性优先于建筑美学: 真实材料 > 概念材料, 真实功能 > 概念空间, 真实 staff > 纯展示.


# Architecture Context (in-context reference, Phase 8A)

> 建筑机制先验 (anchor 先于 DNA 的 architectural_concept, 强化建筑美学).
> 以下机制是当前品牌已通过 S 级验收的建筑语言样本, 不得直接复刻其具体物 (v1.0 §34 规则一/五).

## Anchor 1: JZMX-ARCH-02-EntranceGlass (role=entrance_corridor_through_glass_facade)

- **Primary Mechanism**: 窄框整面玻璃幕墙 + 短走廊缓冲, 街道与室内形成视觉连续
- **Secondary Mechanism**: 弧形连续天花 + 浅木流线形接待台, 由低向高的空间序列

## Anchor 2: JZMX-ARCH-01-ReceptionMembrane (role=interior_reception_with_membrane_ceiling)

- **Primary Mechanism**: 层叠半透明介质从天花垂落, 在中心汇合形成夹层光, 边缘缓慢过渡为墙, 无硬收边
- **Secondary Mechanism**: 金属长方体接待台配顶底发光缝, 与暖色环境形成对比

## Anchor 3: JZMX-ARCH-03-ConsultationFacade (role=wide_consultation_floor_with_full_glass)

- **Primary Mechanism**: 单层大跨膜天花 + 中心天窗, 跨工位连续覆盖, 自然光通过半透明介质柔化后落下
- **Secondary Mechanism**: 整面 3 大格落地玻璃 + 弧形膜切分工位, 维持视觉连续 + 听觉弱屏蔽

## Usage in this prompt

把上述 anchor 提供的建筑机制作为 **先验** (priority), 在 architectural_concept 块之前.
DNA 字段描述的空间概念必须与 anchor 的建筑机制 **一致**, 不冲突.
禁止把 anchor 中的具体物 (具体天花曲线 / 具体玻璃分格 / 具体膜形态) 复刻到生成图里.

# Architecture Preservation (Phase 9B.2: 什么建筑机制必须被保护)

> Phase 9B 给了 Architecture Anchor 提供的建筑美感, Phase 9B.1 通过 Reality Constraint 提升了
> 商业真实性, 但可能削弱了 anchor 的空间记忆点. 这一层在 architecture_context (Phase 8A) 之后,
> 在 architecture_function_bridge 之前, 显式保护 anchor 提供的关键建筑机制.
> 设计原则: **mechanism not object** (Phase 9B.2 §6).

**Weight** (保护强度): 0.70 (0.3 弱保护 / 0.5 平衡 / 0.7 强保护 / 0.9 概念优先)

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

**Commercial Purpose**: 让首次到店的医美客户在进门 3 秒内感到被接住, 5 分钟内建立对九州美学专业度的信任, 同时让 staff 在前场高效完成接待-咨询-分流.

**Spatial Translation (architecture mechanism -> commercial action)**:
- soft_continuity (spatialConcept.primary) + guided_flow circulation -> 入口到等候区的视觉引导, 让客户在进门时无意识地把视线落到接待台
- layered_biomorphic_flow (spatialConcept.secondary) + open visibility -> 街道与室内的视觉连续, 让街上的潜在客户能看到内部, 服务品牌可见性
- low boundary hardness + soft enclosure -> 接待与等候区之间的听觉弱屏蔽, staff 可以在接待台小声确认客户信息, 同时不破坏空间开放感
- high spatial continuity (wallToCeiling/roomToRoom) -> 视觉与功能上 '一个空间', 让 staff 可以快速横穿

**Operation Constraints (硬约束, 商业运营必须满足)**:
- 接待台后方必须保留 1.5m staff 通道, 满足 1 位 staff 在台后转身 + 1 位 staff 通过
- 等候区主通道宽度 >= 1.8m, 满足轮椅通过 (medical_aesthetics 商业无障碍)
- consultation 区工位之间用软边界做弱屏蔽, 工位之间声压差 >= 10dB
- 玻璃幕墙入口必须保留 >= 1.5m 净宽, 满足紧急疏散 + 客户带陪同者进入
- 必须显示 visibleButNotHospitalLike 的医疗合规表达: 接待台附近有可识别的消毒 / 急救 / 隐私标识, 但不放病床或手术灯

**Human Experience (用户路径与体验节奏)**:
- 进门 3 秒内视线落到接待台 (利用天花中心汇合作为视觉焦点引导)
- 等候区必须有可坐的沙发 + 茶几 + 至少 1 株真植物, 不能纯装饰膜或光墙
- consultation 区在视觉上从 public 渐变到 semi-private, 不出现硬门 + 锁
- staff 必须可见, 至少 1 位在接待台, 1 位在 consultation 区 (纯建筑渲染 + 0 staff = 展览馆, 不是医美)
- 光线在 client 眼睛高度 = 柔和, 不出现强光斑 / 射灯直射 / 紫色色块

**Commercial Reality (防止空间变展览馆)**:
- 接待台必须有功能性储物 (抽屉/柜门可见), 不是纯雕塑
- 沙发可坐 (有座深, 靠背), 数量 >= 3 人位
- consultation 工位有桌面 + 椅子 + 1-2 件办公用品, 不是纯装置
- 必须出现 1 处品牌内容物 (logo / 品牌墙 / 品牌物料), 但面积比例 <= 5% (品牌不压制空间)
- 至少 1 处产品 / 服务展示 (展示架 / 咨询桌 / 数字屏), 不是纯建筑
- 可以出现 0-3 个客户 (sparse), 不出现 0 staff + 0 客户的纯展示

**Concept Drift Guards (Phase 8B.1 §7 fail-closed, 出现必须避开)**:
- pure exhibition-only architecture without functional anchors
- soft boundary as decorative-only without spatial routing function
- reception desk as pure sculpture without storage / staff access
- consultation space without desks / chairs / staff
- empty gallery-like space (no staff, no clients, no product display)
- architecture language dominates and weakens commercial operation logic

**Bridge Weight Boost**: 0.25 (0=不强调, 1=最强; v1.1 + Phase 8B.1 推荐 0.25)

**Usage**: 上面列出的 5 个维度 (spatialTranslation / operationConstraints / humanExperience / commercialReality / conceptDriftGuards) 必须被生成图遵守. 建筑语言服从商业现实, 不是反过来.


# Architectural Concept (空间概念优先于品牌表达, v1.1 §6)

**Primary Spatial Concept**: soft_continuity
**Secondary**: layered_biomorphic_flow

空间概念 / 建筑机制 必须先于 品牌元素 被建立. 品牌附着在建筑语言之上, 不是反过来.


# Architecture DNA

**Geometry**:
- Dominant: continuous_curves, rounded_openings, soft_transitions
- Limited: rigid_grid, sharp_corners

**Spatial Continuity**:
- Wall ↔ Ceiling: high
- Floor ↔ Furniture: medium
- Room ↔ Room: high

**Boundary Language**:
- Hardness: low | Transparency: medium | Enclosure: soft

**Circulation**: type=guided_flow | visibility=open | rhythm=calm

**Boundary Hardness**: low
**Statement Strength**: high


# Spatial Intent Preset (Phase v1.0: 用户选择的设计意图, 均衡模式 / Balanced)

> 这一层在 architecture_dna 之后, space_role_context 之前.
> 用户选择的设计意图 preset = **balanced**, 转换成 4 维 intent expression:
> - brandExpression: **balanced**
> - architectureExpression: **balanced**
> - referenceInfluence: **balanced**
> - industryConstraint: **maintain**

> 原则 (Phase v1.0 §3): 不暴露 weight 数字, 用文字 emphasis 表达用户设计意图.
> preset 单选 (§8), 不允许组合. Masterpiece OS 负责理解并执行.

**Runtime Tendency — Balance (均衡)**:
- Brand
- Industry
- Architecture
- Material

**Prompt Emphasis (per §7, text-based, no weight numbers)**:

> Balance brand identity, industry logic, architecture quality, and material expression equally (当前 brand: jiuzhou-aesthetics) (当前 industry: 医疗美容与医美生态服务).
> Maintain all 4 dimensions; no single axis dominates.
> Suitable for most commercial space projects without strong directional preference.

**Usage**:
- 把上面 4 维 intent 当作 prompt 编译时的硬约束.
- brand_translation / architecture_dna / space_role_context 仍然按各自 phase 输出, 不变.
- 当 brandExpression=dominant 时, 强化 brand identity 字段 (logo / IP / brandLight hue / literalAssetUsage).
- 当 architectureExpression=dominant 时, 强化 architecture_dna 字段 (spatial structure / material hierarchy / lighting behavior).
- 当 referenceInfluence=dominant 时, 强化 reference image 提供的 composition / spatial grammar / lighting / material 4 维机制.
- industryConstraint=maintain 永远保持 industry rules (Phase 9C.0.5 brand identity validation gate 通过).

# Space Role Context (Phase 9C.1: 空间角色约束, 外立面 / Exterior)

> 这一层在 architecture_dna 之后, brand_translation 之前.
> 它**不**修改 brand_translation 也不**修改** architecture_dna, 只给当前空间加 role-specific 约束.
> 原则: 同一品牌保持语言统一, 不同空间有真实功能差异.

**Role**:
- primary: street_brand_signal
- secondary: first_brand_impression

**Priority** (0-1, 决定空间行为倾向):
- privacy: 0.1
- comfort: 0.2
- brand_display: 0.95
- circulation: 0.7

**Visual Rules**:
- lighting: day_natural_lit
- material: architectural_facade
- density: medium

**Functional Constraints**:
- must_include: facade, entrance, signage_area
- must_exclude: interior_furniture, treatment_equipment
- key_equipment: 建筑立面 / 入口 / 品牌招牌 / 可选橱窗 / 可选外摆
- human_traffic: street_passby

**Narrative Focus**: 品牌第一街边信号. 路人 3-5 秒内识别品牌身份 + 入口位置. 强品牌立面 + 自然光主导 + 视觉穿透性. 内部隐私完全屏蔽.

**Usage**: 把上面 role / priority / visual_rules / functional_constraints 当作该空间的硬约束.
brand_translation 跟 architecture_dna 仍然按 Phase 9C 模式输出, 不变.
模型需要在保持品牌语言统一的前提下, 表达这个空间的功能差异化 (privacy / comfort / brand_display / circulation 倾向).

# Brand Translation (v1.1 §5 翻译层, 品牌不是装饰)

**Brand**: 九州美学
**Industry**: 医疗美容与医美生态服务
**Audience**: 医美消费者, 合作机构, 医疗从业者

**Brand Spirit (high-weight >= 0.7)**:
- scientific (weight >= 0.7)
- elegant (weight >= 0.7)
- healing (weight >= 0.7)
- futuristic (weight >= 0.7)
- premium (weight >= 0.7)

**Brand Grammar**:
- organicGrowth: high
- visualLightness: high
- controlledGlow: high
- refinedOrder: high
- decorativeDensity: low

**Motif Family (all optional, no required literal)**: feather_like_flow, petal_like_expansion, optical_crystal, translucent_fiber, flowing_membrane

**Literal Asset Usage**:
- Logo visibility: medium
- Direct peacock: low
- Flower sculpture: optional
- Crystal object: optional

**Injection Strength**: 0.55 (0 = no injection, 1 = all literal assets)


# Functional & Commercial Requirement (v1.1 §6 合并 v0.1 function+functional)

**Required Zones**: reception_desk, waiting_area, brand_wall, consultation_guidance
**Optional Zones**: product_display, art_installation
**Operational Realism**: high

**Customer Flow**:
- Entrance → Reception: clear
- Reception → Waiting: clear
- Waiting → Consultation: readable

**Privacy Zones**:
- Public: open
- Semi-private: filtered
- Treatment: enclosed

**Furniture**: ergonomic commercial-grade accessible

**Medical Compliance**:
- Visible but not hospital-like: true


# Material System

**Material Count Limit**: 5 (v1.0 §16 hard constraint: 5 for medical_aesthetics)

**Primary Materials**: mineral_plaster, fine_textured_stone, matte_white_surface
**Secondary Materials**: frosted_glass
**Accent Materials**: brushed_metal

**Finish**: gloss=low | reflectivity=controlled | tactile=refined


# Lighting System

**Primary Strategy**: architectural_indirect_light

**Ambient**: softness=high | brightness=medium | contrast=low

**Integrated Light**:
- Ceiling cove: high
- Wall edge: medium
- Furniture base: low

**Brand Light**: hueFamily=soft_lavender,neutral_white | saturation=low | areaRatio=limited

**Spotlight Usage**: low
**Decorative Fixture Visibility**: low
**Architectural Glow**: high


# Composition & Photography

**Focal Hierarchy**:
- Primary: architecture_or_brand_wall
- Secondary: reception_or_display
- Tertiary: brand_motif

**Visual Balance**: symmetry=medium | negativeSpace=high | density=low

**Camera**: lens=28mm_to_40mm | height=human_eye_level | distortion=controlled

**Framing**: depthLayers=3 | foregroundUsage=optional | clearEntryView=true


# Rendering Requirements

**Realism**: commercial_archviz
**Visual Finish**: refined
**Exposure**: soft_bright
**White Balance**: neutral_warm
**Shadow**: soft
**Texture Visibility**: controlled
**People**: amount=sparse | motionBlur=optional
**Cleanliness**: high
**Post-Processing**: restrained


# Prohibited (fail-closed)

The following MUST NOT appear in the generated image:
- generic_beauty_salon
- excessive_purple
- literal_peacock_theme_park
- repeated_flower_sculptures
- random_crystal_decorations
- nightclub_lighting
- cheap_acrylic_glow
- overdecorated_reception
- hospital_corridor
- empty_art_gallery
- impossible_circulation
- unusable_furniture
