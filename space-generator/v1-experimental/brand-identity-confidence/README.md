# Brand Identity Confidence — Phase 9C.2 v2 §5

## 目的

将品牌 DNA 的"理解质量"量化为一个 0-100 的连续 confidence score。
跟 Phase 9C.0.5 的 binary gate (pass / blocked) 互补: 9C.0.5 是 hard gate,
9C.2 v2 是 continuous score,可用于 strategy selection 跟 calibration 排序。

## 评分体系 (per doc §5)

| 指标 | 权重 | 来源 |
|------|------|------|
| Industry Match | 30 | 9C.0.5 gate industry 信心 (matchedIndustry + overallConfidence) |
| Asset Preservation | 25 | brandSpirit 强度 + literalAssetUsage 密度 |
| Color Match | 15 | lightingDna.brandLight.hueFamily specificity |
| Motif Match | 15 | brandSpaceDna.motifFamily specificity (防 cross-industry generic 抗模式) |
| Narrative Match | 15 | architectureFunctionBridge.spatialTranslation / operationConstraints 密度 |
| **Total** | **100** | weighted sum (round 0-100) |

## 入口

```
node space-generator/v1-experimental/brand-identity-confidence/tests/brand-identity-confidence.test.mjs
```

## 公开 API

```js
import { computeBrandIdentityConfidence, WEIGHTS, TOTAL_WEIGHT } from './brand-identity-confidence.mjs';

const r = await computeBrandIdentityConfidence('wa-ye');
// → {
//     schemaVersion: '1.0',
//     phase: '9C.2',
//     brandKey: 'wa-ye',
//     industry: 'casual_dining',
//     scores: { industry, asset, color, motif, narrative }, // 0-1
//     weights: { industry: 30, asset: 25, color: 15, motif: 15, narrative: 15 },
//     total: 78,                  // 0-100
//     gateStatus, gateRiskLevel,  // 9C.0.5 binary gate 状态
//     computedAt: ISO timestamp
//   }
```

## 5 指标评分规则 (0-1)

### Industry Match
- matched + confidence ≥ 0.85 → 1.0
- matched + confidence ≥ 0.6 → 0.6 - 1.0 linear
- matched + confidence < 0.6 → 0.3 - 0.6
- unmatched → 0

### Asset Preservation
- brandSpirit ≥ 3 strong dims (>=0.6) AND literalAssetUsage ≥ 2 fields → 1.0
- brandSpirit ≥ 2 AND literal ≥ 1 → 0.7
- 任一存在 → 0.4
- 都没有 → 0.1

### Color Match
- hueFamily ≥ 3 + specific count ≥ 2 (含 #hex / brand_ 前缀) → 1.0
- hueFamily ≥ 3 OR specific ≥ 2 → 0.7
- 2 colors → 0.5
- 1 color → 0.3
- 0 → 0.1

### Motif Match
- motifFamily ≥ 2 specific motifs (含 frog / cartoon / tcm / sichuan 等行业关键字) → 1.0
- 1 specific → 0.7
- 仅 generic cross-industry motifs (e.g. "feather_like_flow" — WAYE v0.1 抗模式) → 0.2
- 其它 → 0.4
- 无 → 0.1

### Narrative Match
- spatialTranslation + operationConstraints 总数 ≥ 5 → 1.0
- 3-4 → 0.7
- 1-2 → 0.5
- 仅有 brandGrammar (≥ 2 fields) → 0.3
- 无 → 0.1

## 不开放用户 (per doc §1 + §10)

score 内部使用, 不暴露到 UI, 仅供 Spatial Strategy Selector / regression
scoring / calibration 排序使用。

## 不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.
