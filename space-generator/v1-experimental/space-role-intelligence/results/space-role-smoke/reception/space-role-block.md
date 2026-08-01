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