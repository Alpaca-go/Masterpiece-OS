# Task

Generate a single premium-grade space image for **九州美学** (medical_aesthetics).
Scene: `reception` (flagship_clinic_reception).
Context: street_store | Scale: medium.

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
