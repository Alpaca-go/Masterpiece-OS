# Space Role Context (Phase 9C.1: 空间角色约束, 大堂 / Lobby)

> 这一层在 architecture_dna 之后, brand_translation 之前.
> 它**不**修改 brand_translation 也不**修改** architecture_dna, 只给当前空间加 role-specific 约束.
> 原则: 同一品牌保持语言统一, 不同空间有真实功能差异.

**Role**:
- primary: spatial_transition_hub
- secondary: brand_atmosphere_dissemination

**Priority** (0-1, 决定空间行为倾向):
- privacy: 0.2
- comfort: 0.5
- brand_display: 0.7
- circulation: 0.85

**Visual Rules**:
- lighting: natural_indirect
- material: open_architectural
- density: low

**Functional Constraints**:
- must_include: open_lounge, circulation_path, subtle_brand_signage
- must_exclude: treatment_bed, consultation_desk, enclosed_capsule
- key_equipment: 开敞休息区 / 通行动线 / 品牌软装 / 可选茶水吧
- human_traffic: high_mixed_traffic

**Narrative Focus**: 空间枢纽. 引导客户从街边到目标空间. 大面积留白 + 自然光 + 低密度, 让品牌气质自然渗透, 不强制销售.

**Usage**: 把上面 role / priority / visual_rules / functional_constraints 当作该空间的硬约束.
brand_translation 跟 architecture_dna 仍然按 Phase 9C 模式输出, 不变.
模型需要在保持品牌语言统一的前提下, 表达这个空间的功能差异化 (privacy / comfort / brand_display / circulation 倾向).