# Spatial Intent Preset (Phase v1.0: 用户选择的设计意图, 品牌驱动 / Brand Driven)

> 这一层在 architecture_dna 之后, space_role_context 之前.
> 用户选择的设计意图 preset = **brand_driven**, 转换成 4 维 intent expression:
> - brandExpression: **dominant**
> - architectureExpression: **balanced**
> - referenceInfluence: **low**
> - industryConstraint: **maintain**

> 原则 (Phase v1.0 §3): 不暴露 weight 数字, 用文字 emphasis 表达用户设计意图.
> preset 单选 (§8), 不允许组合. Masterpiece OS 负责理解并执行.

**Runtime Tendency — Enhance (强化)**:
- Brand Identity
- Visual Signature
- Brand Story Translation

**Runtime Tendency — Maintain (保持)**:
- Industry Logic
- Spatial Reality
- Basic Architecture Quality

**Prompt Emphasis (per §7, text-based, no weight numbers)**:

> Prioritize brand identity, visual signature, and brand story translation (当前 brand: feng-tang-tang) (当前 industry: 餐饮 / 川菜 / 跷脚牛肉).
> Strengthen logo / IP / brand color / signature motifs / visual recognition.
> Maintain industry logic, spatial reality, and basic architecture quality.
> Avoid generic / templated outputs that ignore brand specificity.

**Usage**:
- 把上面 4 维 intent 当作 prompt 编译时的硬约束.
- brand_translation / architecture_dna / space_role_context 仍然按各自 phase 输出, 不变.
- 当 brandExpression=dominant 时, 强化 brand identity 字段 (logo / IP / brandLight hue / literalAssetUsage).
- 当 architectureExpression=dominant 时, 强化 architecture_dna 字段 (spatial structure / material hierarchy / lighting behavior).
- 当 referenceInfluence=dominant 时, 强化 reference image 提供的 composition / spatial grammar / lighting / material 4 维机制.
- industryConstraint=maintain 永远保持 industry rules (Phase 9C.0.5 brand identity validation gate 通过).