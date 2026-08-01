# Space Role Context (Phase 9C.1: 空间角色约束, 走廊 / Corridor)

> 这一层在 architecture_dna 之后, brand_translation 之前.
> 它**不**修改 brand_translation 也不**修改** architecture_dna, 只给当前空间加 role-specific 约束.
> 原则: 同一品牌保持语言统一, 不同空间有真实功能差异.

**Role**:
- primary: circulation_path
- secondary: spatial_narrative_pacing

**Priority** (0-1, 决定空间行为倾向):
- privacy: 0.3
- comfort: 0.4
- brand_display: 0.5
- circulation: 0.95

**Visual Rules**:
- lighting: rhythmic_guided
- material: narrative_progression
- density: low

**Functional Constraints**:
- must_include: circulation_path, rhythmic_lighting
- must_exclude: destination_seating, treatment_bed, open_lounge
- key_equipment: 节律引导灯 / 可选墙艺 / 门廊过渡 / 可选自然光井
- human_traffic: transit_flow

**Narrative Focus**: 空间叙事节奏. 引导客户从公共到私密 (或反之). 走廊是'呼吸空间', 客户在走动中潜意识准备进入下一个空间. 光线节律 + 材质过渡 + 视觉收口.

**Usage**: 把上面 role / priority / visual_rules / functional_constraints 当作该空间的硬约束.
brand_translation 跟 architecture_dna 仍然按 Phase 9C 模式输出, 不变.
模型需要在保持品牌语言统一的前提下, 表达这个空间的功能差异化 (privacy / comfort / brand_display / circulation 倾向).