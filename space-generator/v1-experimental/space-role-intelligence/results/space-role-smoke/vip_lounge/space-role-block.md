# Space Role Context (Phase 9C.1: 空间角色约束, VIP 休息区 / VIP Lounge)

> 这一层在 architecture_dna 之后, brand_translation 之前.
> 它**不**修改 brand_translation 也不**修改** architecture_dna, 只给当前空间加 role-specific 约束.
> 原则: 同一品牌保持语言统一, 不同空间有真实功能差异.

**Role**:
- primary: premium_trust_zone
- secondary: emotional_comfort_recovery

**Priority** (0-1, 决定空间行为倾向):
- privacy: 0.9
- comfort: 0.85
- brand_display: 0.5
- circulation: 0.2

**Visual Rules**:
- lighting: soft_warm
- material: premium_soft_surface
- density: low

**Functional Constraints**:
- must_include: lounge_seating, tea_table, natural_lighting_or_warm_pendant
- must_exclude: open_public_traffic, fitting_room, product_wall, checkout_counter
- key_equipment: VIP 沙发 / 茶台 / 暖光吊灯 / 绿植/景观 / 可选艺术品
- human_traffic: low_premium_flow

**Narrative Focus**: 私密高端空间, 高度商业转化区. 客户在高隐私 + 软材质 + 暖光中建立深度信任. 品牌表达让位于客户舒适, 但通过材质选择 + 细节保持品牌语言.

**Usage**: 把上面 role / priority / visual_rules / functional_constraints 当作该空间的硬约束.
brand_translation 跟 architecture_dna 仍然按 Phase 9C 模式输出, 不变.
模型需要在保持品牌语言统一的前提下, 表达这个空间的功能差异化 (privacy / comfort / brand_display / circulation 倾向).