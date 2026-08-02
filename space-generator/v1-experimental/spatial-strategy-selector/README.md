# Spatial Strategy Selector — Phase 9C.2 v2 §6 + §8

## 目的

Phase v1.0 Spatial Intent Presets 让用户从 4 个 preset 选一个 (brand_driven /
architecture_driven / reference_driven / balanced). 但实际测试发现 4 个选项对
用户来说区分度有限,容易选错。

Phase 9C.2 v2 调整: **Spatial Intent 不再是用户选项,转为系统内部策略**。
根据 brand DNA 强度 + reference image presence, 自动选 4 个 strategy 之一,
并输出 3-axis weight distribution 供下游 compiler 使用 (per doc §8).

## 决策规则 (per doc §6 + §7 例子)

| 条件 | 选中 |
|------|------|
| reference ≥ 0.9 AND brand < 0.5 AND arch < 0.5 | reference_driven |
| brand ≥ 0.7 AND brand > arch + 0.1 | brand_driven |
| arch ≥ 0.6 AND arch > brand + 0.1 | architecture_driven |
| reference ≥ 0.9 AND (brand ≥ 0.5 OR arch ≥ 0.5) | reference_driven (mixed) |
| 其它 | balanced |

## 3-axis weight distribution (per doc §8)

| strategy | brand | architecture | reference | industry |
|----------|-------|--------------|-----------|----------|
| brand_driven | 0.55 | 0.30 | 0.10 | 0.05 |
| architecture_driven | 0.30 | 0.55 | 0.10 | 0.05 |
| reference_driven | 0.30 | 0.30 | 0.35 | 0.05 |
| balanced | 0.30 | 0.30 | 0.30 | 0.10 |
| **sum** | **1.0** | | | |

(注: Phase 9C.2 v1 的 4-axis weight 包含 industry 20%, 9C.2 v2 的 3-axis 不分
industry — industry 由 9C.0.5 gate 强制 maintain, 跟 4-axis 权重不冲突)

## 入口

```
node space-generator/v1-experimental/spatial-strategy-selector/tests/spatial-strategy-selector.test.mjs
```

## 公开 API

```js
import { selectSpatialStrategy, STRATEGY, DEFAULT_WEIGHTS } from './spatial-strategy-selector.mjs';

const r = await selectSpatialStrategy('wa-ye', { hasReferenceImage: false });
// → {
//     brandKey: 'wa-ye',
//     selectedStrategy: 'brand_driven',
//     confidence: { industry, asset, color, motif, narrative, total },
//     axisScores: { brand: 1.0, architecture: 0.86, reference: 0 },
//     weights: { brand: 0.55, architecture: 0.30, reference: 0.10, industry: 0.05 },
//     reason: 'strong brand axis (1.00) > arch (0.86) → brand_driven'
//   }
```

## 轴分数 (0-1)

### Brand axis
```
brand = min(1, strongSpirit/4 * 0.4 + literalFields/3 * 0.3 + motif/3 * 0.2 + hueFamily/3 * 0.1)
```

### Architecture axis
```
arch = min(1, statementScore * 0.5 + boundaryScore * 0.3 + matCount/4 * 0.1 + hasLighting ? 0.1 : 0)
```

### Reference axis
```
reference = hasReferenceImage ? 1.0 : 0
```

## Doc §7 例子预期结果 (已通过测试)

| Brand | Expected | 实际选中 | Reason |
|-------|----------|---------|--------|
| 九州美学 (medical, JZMX-ARCH-01) | architecture_driven + reference_driven | reference_driven (with ref) | 建筑强 + 有 reference |
| 蛙耶 (Y2K cartoon frog IP) | brand_driven | brand_driven | strong brand axis 1.00 > arch 0.86 |
| 冯烫烫 (川菜餐饮) | balanced | balanced | brand=0.53, arch=0.54 — no dominant axis |

## 不开放用户 (per doc §10)

strategy 自动选, 不暴露用户 (跟 Phase v1.0 4 个 preset UI 选项不同).
后续可作为 production pipeline 的内部开关, 但不加 UI 控件.

## 不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.
