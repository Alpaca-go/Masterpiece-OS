# Architecture Language Reference (Phase 8D §6 Golden Reference Restructure)

## Phase 8D §7 Reference Classification Rules

> Architecture Language: 跨 brand 共享的"建筑机制 / 空间语法 / 设计原理".
> Brand Space Examples: 行业特定的"商业场景 / 业务实例 / 输出对比".
> 不要混用两类.

## Categories (Phase 8D §6 提议 4 类)

```
architecture-language/
├── organic-flow/                # 流动曲线 / 软边界 / 曲面代替直角
├── translucent-boundary/        # 半透明材质 / 软边界 / 视觉连续
├── soft-light-system/           # 嵌入光 / 建筑发光 / 不用直接射灯
└── material-continuity/         # 材质连续 / 跨表面流动 / 受控材质数
```

## 4 类 Architecture Language 与现有 architecture-anchors/ 的映射

| Architecture Language 类别 | 现有 anchor 例子 | 用途 |
| --- | --- | --- |
| organic-flow | JZMX-ARCH-01 (ReceptionMembrane) | soft_continuity / 流动曲线 |
| translucent-boundary | JZMX-ARCH-01/03 (Membrane) | 半透明介质切分空间 |
| soft-light-system | JZMX-ARCH-01/02 (Membrane + Glass) | 嵌入光 + 顶底缝光 |
| material-continuity | (跨 brand 共享) | warm_material 三元组 |

## 与 architecture-anchors/ 的区别

- `architecture-anchors/`: brand-specific, 每个 anchor 属于某个 brand. 选 anchor 时按 brandKey.
- `architecture-language/`: brand-agnostic, 4 类跨 brand 共享. 用于 Phase 8D §5.3 Anchor Decoupling Score:
  - 高分: anchor 描述的机制属于 architecture-language 类别 (reusable).
  - 低分: anchor 描述 brand-specific 视觉元素 (not reusable).

## Phase 8D §3 Risk 2 防护

Architecture Language 类别的存在, 让 anchor 的"建筑机制"和"品牌标志"分离:
- 一个 anchor 的 primaryMechanism 应该是 architecture-language 描述 (e.g. "层叠半透明介质")
- 而不是 brand-specific 描述 (e.g. "九州美学 logo 浅浮雕")

这是 Phase 8D §3 Risk 2 "Architecture Anchor Leakage" 的防泄漏设计.

## Status

Phase 8D 当前不创建 PNG (不调真实 Provider). 4 个 category 目录是 metadata-only:
- `organic-flow/`: architectural grammar 描述, 不创建 anchor 实体
- `translucent-boundary/`: 同上
- `soft-light-system/`: 同上
- `material-continuity/`: 同上

未来 Phase 8D 后续跑批后, 可以为每个 architecture-language 类别提供示例 PNG (跨 brand 共享的建筑语言样本).

## Frozen Record

- frozen_at: 2026-08-01
- frozen_by: Space Generator v1.1 Phase 8D Multi-brand Space Validation
- related_doc: 'Space Generator v1.1 Phase 8D Multi-brand Space Validation 开发文档'
- directory_decision: |
  按 Phase 8D §6 提议结构, architecture-language 目录是 v1-experimental 范围内的 metadata-only manifest.
  与 v1-baseline/benchmarks/ (验收锚点) 和 architecture-anchors/ (brand-specific) 是三类独立资产.
  不创建 PNG, 不污染生产代码.
