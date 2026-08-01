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