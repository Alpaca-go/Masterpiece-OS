# Space Role Context (Phase 9C.1: 空间角色约束, 治疗区 / Treatment)

> 这一层在 architecture_dna 之后, brand_translation 之前.
> 它**不**修改 brand_translation 也不**修改** architecture_dna, 只给当前空间加 role-specific 约束.
> 原则: 同一品牌保持语言统一, 不同空间有真实功能差异.

**Role**:
- primary: functional_precision_zone
- secondary: healing_restoration

**Priority** (0-1, 决定空间行为倾向):
- privacy: 0.95
- comfort: 0.7
- brand_display: 0.2
- circulation: 0.1

**Visual Rules**:
- lighting: soft_controlled
- material: clinical_premium
- density: low

**Functional Constraints**:
- must_include: treatment_bed, medical_or_professional_equipment, wash_station
- must_exclude: open_public_traffic, product_wall, brand_wall, reception_desk
- key_equipment: 治疗床 / 专业设备 / 洗手台 / 医疗级软装 / 隔音
- human_traffic: low_dyadic_flow

**Narrative Focus**: 功能核心区. 客户在最高隐私 + 设备精度 + 治愈氛围中接受服务. 品牌表达退到最弱, 通过'专业感+治愈感'建立深层品牌信任. 设备 / 卫生 / 隐私是硬约束.

**Usage**: 把上面 role / priority / visual_rules / functional_constraints 当作该空间的硬约束.
brand_translation 跟 architecture_dna 仍然按 Phase 9C 模式输出, 不变.
模型需要在保持品牌语言统一的前提下, 表达这个空间的功能差异化 (privacy / comfort / brand_display / circulation 倾向).