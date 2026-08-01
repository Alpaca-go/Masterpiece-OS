# Space Role Context (Phase 9C.1: 空间角色约束, 产品陈列区 / Product Display)

> 这一层在 architecture_dna 之后, brand_translation 之前.
> 它**不**修改 brand_translation 也不**修改** architecture_dna, 只给当前空间加 role-specific 约束.
> 原则: 同一品牌保持语言统一, 不同空间有真实功能差异.

**Role**:
- primary: brand_catalog_zone
- secondary: visual_merchandising

**Priority** (0-1, 决定空间行为倾向):
- privacy: 0.2
- comfort: 0.4
- brand_display: 0.85
- circulation: 0.5

**Visual Rules**:
- lighting: focused_spotlight
- material: display_neutral
- density: medium

**Functional Constraints**:
- must_include: product_wall, counter, trial_zone_or_fitting_room
- must_exclude: treatment_bed, private_consultation_room
- key_equipment: 陈列墙 / 柜台 / 试用/试衣区 / 聚焦射灯
- human_traffic: medium_browse_flow

**Narrative Focus**: 品牌商品化. 客户浏览 + 选择 + 试用. 商品是绝对主角, 空间是衬托. 强品牌展示 + 中等密度 + 商品可触达性.

**Usage**: 把上面 role / priority / visual_rules / functional_constraints 当作该空间的硬约束.
brand_translation 跟 architecture_dna 仍然按 Phase 9C 模式输出, 不变.
模型需要在保持品牌语言统一的前提下, 表达这个空间的功能差异化 (privacy / comfort / brand_display / circulation 倾向).