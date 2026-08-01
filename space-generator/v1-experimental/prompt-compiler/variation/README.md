# Variation Controller v0.1

按 v1.0 文档 §30 Phase 6 / §20 variation_control 推进。

## 内容

| 文件 | 用途 |
|---|---|
| `derive-variants.mjs` | `deriveVariants(baseDna, count)` 派生 N 个变体 DNA |
| `examples/jzex-reception-6-variants.json` | JZMX reception DNA 派生 6 个变体 sample |
| `tests/derive-variants.test.mjs` | 17 项验证 (含 Phase 6 验收) |

## 派生规则 (v1.0 §20 preserve / vary)

**preserve (不变)** — 这些是 JZMX 品牌语义的硬约束：
- `brandSpaceDna.brandSpirit` 5 维 (>= 0.7)
- `architectureDna.boundaryHardness` / `statementStrength`
- `functionalDna.operationalRealism`
- `materialDna.materialCountLimit` (5)
- `lightingDna.primaryStrategy` / `architecturalGlow`
- `renderingDna.realism`

**vary (派生控制)** — v1.0 §20 列出的 7 个维度：
- `room_layout` / `focal_object` / `motif_expression` → 母题轮换 (1 of 5 pool per slot)
- `transparency_level` → metadata.variationChoice.transparency (DNA schema v0.1 无字段, 记录)
- `curve_scale` → metadata.variationChoice.curveScale
- `camera_position` → compositionDna.camera.lens (5 pool) + height (4 pool)
- `material_ratio` → compositionDna.visualBalance.density + negativeSpace

**brand_injection_strength** — preserve 范围, v0.1 保持 baseline 0.55, v0.2 评估微调。

## choice pool

| 维度 | pool | size |
|---|---|---|
| motif | 5 (从 baseDna.brandSpaceDna.motifFamily 取) | 5 |
| camera.lens | ultra_wide / wide / 28mm_to_40mm / normal / telephoto | 5 |
| camera.height | low_angle / human_eye_level / elevated / overhead | 4 |
| visualBalance.density | low / low / medium / medium / high | 5 (weighted toward low) |
| visualBalance.negativeSpace | low / medium / high / high | 4 (weighted toward high) |
| curveScale (metadata) | tight / medium / wide | 3 |
| transparency (metadata) | low / medium / high | 3 |

## variant 标识

不在 `dnaVersion` 字段标识 variant（DNA schema 严格匹配 `^v0\.[0-9]+$`，留给 major/minor 版本），
改用 `metadata.variantIndex` (1..N) + `metadata.parentDnaVersion` (派生自哪个 baseline)。

```json
{
  "schemaVersion": "1.0",
  "dnaVersion": "v0.1",          // 与 base 相同
  ...
  "metadata": {
    "variantIndex": 1,
    "parentDnaVersion": "v0.1",
    "variationChoice": { "motif": "...", "lens": "...", ... }
  }
}
```

## 跑法

```bash
node space-generator/v1-experimental/prompt-compiler/variation/derive-variants.mjs \
  space-generator/v1-experimental/field-schema/examples/jiuzhou-aesthetics.dna.json \
  /tmp/jzex-6-variants.json
```

或程序化：
```js
import { deriveVariants } from './derive-variants.mjs';
const variants = deriveVariants(baseDna, 6);
```

## 验证 (17/17)

- 6 variants / slotIndex 1..6
- 6 variant DNA 全部 schema valid
- dnaVersion = base (无污染)
- metadata.variantIndex = slotIndex
- metadata.parentDnaVersion = base

### Phase 6 验收 (v1.0 §30)

- ✓ 不出现六张同构 (motif diversity 5/6)
- ✓ 不出现每张都有同一种花瓣 (motif 唯一性, no motif > 3/6)
- ✓ 仍保持九州美学气质 (brand_spirit 5 维 >= 0.7 不变)
- ✓ 不退化为通用白色医美空间 (7 preserve 字段不修改)
- ✓ materialCountLimit = 5 (restrained_material_palette 不变)
- ✓ camera lens 5/6 多样, height 4/6 多样

### 错误 cases

- ✓ null baseDna 拒绝
- ✓ count=0 拒绝
- ✓ count=13 拒绝
- ✓ motifFamily 缺失拒绝

## 边界

- 不动 v1-baseline
- 不污染 apps/cli / apps/desktop / packages/*
- 不调 Provider
- 输出 DNA 实例, 后续可喂给 Phase 5 compileFieldEnrichedPrompt 编译 prompt
- 派生确定性 (同 input 同 output), 未来可换 RNG seed

## 后续 (Phase 7+)

- Phase 7: 4 项目回归测试 (JZMX / 一剂良方 / 冯烫烫 / 蛙耶)
- 真生成: deriveVariants(JZMX-reception, 6) → compile-prompt × 6 → 验证 motif/camera 多样性
