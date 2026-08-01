# Brand Space Examples (Phase 8D §6 Golden Reference Restructure)

## Phase 8D §7 Reference Classification Rules

> Brand Space Examples: 行业特定的"商业场景 / 业务实例 / 输出对比".
> 用于 Phase 8D §5.2 Brand Adaptation Score 验证和 §5.4 Concept Drift 检测.
> **不要** 把跨 brand 共享的建筑机制放在这里 (那些应该去 architecture-language/).

## Phase 8D 3 个 brand (Phase 8D §4)

```
brand-space-examples/
├── jiuzhou-aesthetics/    # Test A: medical aesthetics (JZMX baseline regression)
├── feng-tangtang/         # Test B: Modern Chinese restaurant (Phase 8D 防 overfit 验证)
└── yijiliangfang/         # Test C: Health / traditional medicine (Phase 8D 防 overfit 验证)
```

## 与 architecture-anchors/ 的区别

- `architecture-anchors/<brand>/`: brand-specific, 选 anchor 时按 brandKey.
  - e.g. JZMX-ARCH-01 ReceptionMembrane, FTT-ARCH-01 KitchenAnchor, YJLF-ARCH-01 WoodenGrid
  - 用于 runtime 自动注入 (compileRuntimePrompt -> selectAnchors -> prompt)
- `brand-space-examples/<brand>/`: industry validation, 业务场景对比.
  - 用于 Phase 8D §5.2 Brand Adaptation Score 验证 (品牌身份翻译到空间)
  - 用于 Phase 8D §5.4 Concept Drift 检测 (商业真实感)
  - 不直接被 compileRuntimePrompt 引用, 是 Phase 8D 评估协议的输入

## Phase 8D §9 验收 5 项 与 3 brand 的关系

| 验收项 | 验证方法 | 涉及 brand |
| --- | --- | --- |
| 1. JZMX 不下降 | runtime summary 4 指标 (Phase 8C) + brand-space-examples/jiuzhou 对比 | jiuzhou-aesthetics |
| 2. FTT 不变 medical aesthetics style | brand-space-examples/feng-tangtang 与 JZMX 对比, 检查 JZMX 标志不出现 | feng-tangtang |
| 3. YJLF 保持 health 行业特征 | brand-space-examples/yijiliangfang 与 FTT / JZMX 对比, 检查 FTT 标志不出现 | yijiliangfang |
| 4. Architecture Anchor 跨 industry 转移 | architecture-language/ 4 类跨 brand 共享, 验证 anchor 的 mechanism 属于 architecture-language | (跨 3 brand) |
| 5. Brand Translation 独立 | brand-space-examples/<brand>/brand-translation 描述与 DNA 一致 | (跨 3 brand) |

## Status

Phase 8D 当前不创建 PNG (不调真实 Provider). 3 个 brand 目录是 metadata-only:
- `jiuzhou-aesthetics/`: 业务场景描述 + JZMX 行业特征 vs FTT / YJLF 的差异
- `feng-tangtang/`: 同上
- `yijiliangfang/`: 同上

未来 Phase 8D 后续跑批后, 可以为每个 brand-space-examples 添加实际生成的图像示例 (跨场景对比).

## Frozen Record

- frozen_at: 2026-08-01
- frozen_by: Space Generator v1.1 Phase 8D Multi-brand Space Validation
- related_doc: 'Space Generator v1.1 Phase 8D Multi-brand Space Validation 开发文档'
- directory_decision: |
  按 Phase 8D §6 提议结构, brand-space-examples 目录是 v1-experimental 范围内的 metadata-only manifest.
  与 v1-baseline/benchmarks/ (验收锚点) 和 architecture-anchors/ (brand-specific runtime) 是三类独立资产.
  不创建 PNG, 不污染生产代码.
