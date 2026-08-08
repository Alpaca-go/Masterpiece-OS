# Architecture Expressiveness Golden — 九州美学

> **本目录是 R8.5 §3 定义的评估基准。**  
> **不是生成模板。** 不挂回 Reference 选择路径，Production 编译器读不到这里任何东西。

## 用途

这 3 张图（旧链路 S 级）冻结后只用于：

1. **R8.5.2 prompt audit** — 衡量新 candidate 的 prompt 字符预算分配
2. **R8.5.6 人工评分** — 给 R8.5 candidate 评分时，对照 historicalScore 看差距
3. **R8.5.7 baseline freeze** — 达标后 frozen 成 `text-only-expressiveness-baseline`

## 不允许的用法

- 不在 prompt 中写"参考 JZMX-ARCH-XX"
- 不把 3 张图挂回 anchor registry 的 `imagePath` 字段（已挂，但 R8.5 阶段明确不进入 production Reference 选择路径——imageStatus/provenance 已设 `available` 仅作元数据完整性）
- 不在新 candidate 评估时，把"形似这 3 张"作为加分项（`useAsReleaseGate: true` 仅作用于 historicalScore 比较）

## 三个机制的关系

| 场景 | 层数 | 核心载体 |
|---|---|---|
| reception-membrane | 5 | ceiling → boundary → reception → circulation |
| entrance-glass | 5 | exterior → glass transition → reception → interior |
| consultation-facade | 4 | translucent envelope → privacy gradient → staff/customer |

R8.5.4 新增的 `compile-spatial-mechanisms.js` 必须能为新 candidate 输出**等价层数**的机制描述（不要求相同载体，但要求同层数 + 同影响范围）。

## R8 baseline 状态（frozen 前对照）

| 场景 | R8 prompt chars | architectureBlock chars | 抽象词占比（待 R8.5.2 测量） |
|---|---|---|---|
| reception | 5901 | TBD | TBD |
| entrance | 5904 | TBD | TBD |
| consultation | 5907 | TBD | TBD |
