# Space Role Context (Phase 9C.1: 空间角色约束, 咨询区 / Consultation)

> 这一层在 architecture_dna 之后, brand_translation 之前.
> 它**不**修改 brand_translation 也不**修改** architecture_dna, 只给当前空间加 role-specific 约束.
> 原则: 同一品牌保持语言统一, 不同空间有真实功能差异.

**Role**:
- primary: trust_building_zone
- secondary: information_exchange_dialogue

**Priority** (0-1, 决定空间行为倾向):
- privacy: 0.8
- comfort: 0.7
- brand_display: 0.4
- circulation: 0.2

**Visual Rules**:
- lighting: focused_warm
- material: professional_neutral
- density: low

**Functional Constraints**:
- must_include: consultation_seating, display_screen, sample_table
- must_exclude: treatment_bed, open_public_traffic, checkout_counter
- key_equipment: 咨询桌椅 / 信息屏 / 样品台 / 可选品牌物料
- human_traffic: low_dyadic_flow

**Narrative Focus**: 专业可信空间. 客户跟咨询师一对一深度对话. 中性专业材质 + 聚焦光, 让信息交换主导空间. 品牌表达克制, 通过'专业感'传递品牌信任度.

**Usage**: 把上面 role / priority / visual_rules / functional_constraints 当作该空间的硬约束.
brand_translation 跟 architecture_dna 仍然按 Phase 9C 模式输出, 不变.
模型需要在保持品牌语言统一的前提下, 表达这个空间的功能差异化 (privacy / comfort / brand_display / circulation 倾向).