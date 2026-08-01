# Spatial Intent Presets (Phase v1.0)

Masterpiece OS 5.0 v1.1 — Space Generator — 用户可理解的空间生成方向选择系统 (Design Intent Controller)。

## 1. 核心目标

**不直接暴露**：prompt 权重 / 数值比例 / 内部 compiler 参数。
**而通过 4 个 user-facing preset**，让用户表达 "这一次空间设计最希望强调什么"。

## 2. 4 个 Preset (§4)

| Preset | label | 适用 | Runtime Tendency |
|---|---|---|---|
| `brand_driven` | 品牌驱动 / Brand Driven | 潮流餐饮 / 零售品牌 / IP空间 / 快闪店 | Enhance: Brand Identity / Visual Signature / Brand Story Translation. Maintain: Industry Logic / Spatial Reality / Basic Architecture Quality. |
| `architecture_driven` | 建筑驱动 / Architecture Driven | 医美 / 酒店 / 高端商业 / 展厅 | Enhance: Architecture Language / Spatial Structure / Material Expression / Lighting Behavior. Maintain: Brand Identity / Functional Reality. |
| `reference_driven` | 参考驱动 / Reference Driven | 用户拥有明确空间参考 | Learn: Composition / Spatial Grammar / Lighting Language / Material Language. Forbidden: Logo / 文案 / 原品牌资产 / 行业属性. |
| `balanced` | 均衡模式 / Balanced (默认) | 大部分商业空间项目 | Balance: Brand / Industry / Architecture / Material. |

## 3. Runtime 数据结构 (§5)

```json
{
  "preset": "architecture_driven",
  "intent": {
    "brandExpression": "balanced",
    "architectureExpression": "dominant",
    "referenceInfluence": "low",
    "industryConstraint": "maintain"
  }
}
```

## 4. 设计原则 (§3)

- **不做权重调节** — 禁止 "Brand 70% / Architecture 50% / Material 80%" (用户无法理解 / 非线性影响 / 容易形成错误调参)
- **不开放全部开关** — 禁止 "Brand ON / Architecture ON / Reference ON / Material ON" (所有目标同时最大化会导致方向冲突)
- **Preset 单选** (§8) — 只能选 1 个 preset, 不允许组合 (避免用户制造明显冲突)

## 5. Prompt 层变化 (§7)

**不直接加入**：`"architecture weight 80%"`
**而转换为**（architecture_driven example）：
```
Prioritize architectural composition, material hierarchy, spatial proportion,
lighting structure, while maintaining brand identity and functional realism.
```

## 6. 集成方式

`compileSpaceRuntime(brandKey, options)` 加 `preset` option（默认 `null` 不启用）：
- `preset: 'brand_driven' | 'architecture_driven' | 'reference_driven' | 'balanced'`
- 插入位置：`architecture_dna` 之后，`space_role_context`（9C.1）之前
- blockCount：`16 → 17 (preset only)` / `17 → 18 (9C.1 + preset)`
- runtimePath：加 `_sip` suffix

`options.preset` 必须为 `SUPPORTED_PRESETS` 之一，否则 throw。

## 7. 不破坏的层

按 doc §principles:
- `architecture_dna` block: byte-equal across 4 presets (16 cases 全过)
- `brand_translation` block: byte-equal across 4 presets (16 cases 全过)
- `space_role_context` (Phase 9C.1): byte-equal across 4 presets (16 cases 全过, Phase v1.0 + 9C.1 不冲突)
- `industryConstraint` 永远 `maintain`, 不 drop 行业逻辑

## 8. 测试

```bash
npm run test:space-spatial-intent-presets
```

测试覆盖 (§12 success criteria):
1. **§12.1 4 preset JSONs loadable** — 4 个 JSON 文件存在, loadPreset 必填字段, 4 维 intent, industryConstraint=maintain
2. **§12.2 4 preset distinct content** — 4 维 intent fingerprints 全 distinct, emphasis text 4 distinct, no weight numbers
3. **§12.3 compileSpaceRuntime integration** — 9C.1 default 16/17 blocks 不变, preset default 加 1 block, byte-equal 检查, 4×4 = 16 cases 全部跑过

## 9. Smoke runner (text-level)

```bash
node spatial-intent-presets/bin/run-preset-smoke.mjs
```

跑 4 brand × 4 preset = 16 cases, 产出 `results/preset-smoke/{brand}__{preset}/{prompt.md, spatial-intent-preset-block.md}` + `integration-summary.md`。

推荐组合 (§11):
- Brand Driven × 蛙耶 (强化 IP / 品牌色 / 年轻气质 / 视觉识别)
- Architecture Driven × 九州美学 (强化建筑秩序 / 材质高级感 / 空间仪式感)
- Balanced × 冯烫烫 / 一剂良方 (平衡 4 维)
- Reference Driven × 任意强参考图项目 (现在 brand 没强参考, 4 brand 兜底)

## 10. 后续路线 (§13)

```
Spatial Intent Presets ✓ (current commit)
        ↓
Multi-brand Validation (Phase 9D)
        ↓
Professional Design Intent Controller (Phase 10 — 弱/中/强 等级)
        ↓
Adaptive Recommendation
```

## 11. Constraints

- 不调真实 Provider, 不修改 baseline (Phase 9A.2 / 9A.3 / 9B.1 / 9B.2 / 9C / 9C.0.5 / 9C.1 行为不变)
- 不污染生产代码 (apps/cli / apps/desktop / packages unchanged)
- preset 是 opt-in (options.preset 默认 null, 不启用)
- 5.0 release gate 全过 (workspace-boundaries / no-obsolete-code / production-boundaries / no-project-specific-production-rules / golden-boundary / current-flows)
