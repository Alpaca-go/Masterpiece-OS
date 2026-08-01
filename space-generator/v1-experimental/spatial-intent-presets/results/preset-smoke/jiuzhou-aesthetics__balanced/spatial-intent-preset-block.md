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