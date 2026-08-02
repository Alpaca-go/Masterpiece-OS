# Phase 9D — Multi-brand / Multi-industry Spatial Regression Validation

Phase 9D 跨品牌 / 跨行业 / 跨 Spatial Intent Preset 的泛化验证。
text-level, 不调用 Provider, 不修改 v1-baseline, 不污染生产代码。

## 目的

验证 Space Generator 是否具备跨品牌、跨行业、跨设计意图的稳定能力。
从「单项目优化」升级为「系统级泛化验证」。

参考文档: `Phase 9D Multi-brand Multi-industry Spatial Regression Validation`

## 5 brand × 4 preset = 20 cases

| Brand        | Industry          | Recommended Preset     |
| ------------ | ----------------- | --------------------- |
| 九州美学     | medical_aesthetics| architecture_driven   |
| 冯烫烫       | restaurant        | balanced              |
| 一剂良方     | tcm_wellness      | balanced              |
| 蛙耶         | casual_dining     | brand_driven          |
| 锦绣         | fashion_retail    | architecture_driven   |

4 preset: `brand_driven` / `architecture_driven` / `reference_driven` / `balanced`

## 6 维 Spatial Regression Score (每维 0-100, 总分 100 = 平均)

1. Industry Accuracy         — DNA industry / category / sceneType 跟 9C.0.5 gate 一致
2. Brand Translation         — brand_translation 块覆盖 brand key 关键 DNA 字段
3. Architecture Quality      — architecture_dna 块覆盖 material / lighting / boundary
4. Functional Reality        — spatial_reality_constraint 块覆盖 requiredZones / scale
5. Intent Alignment          — preset 4 维 intent 跟 9C.0.5 / DNA 行业特征一致
6. Cross-space Consistency   — 同一 brand 不同 preset byte-equal (Phase v1.0 §principles)

## 完成标准 (§11)

- 至少 5 行业验证
- 4 种 Spatial Intent Preset 均测试
- Cross Industry Gate 有效
- 无重大品牌污染
- 不同 brand 保持差异
- 同 brand 空间保持一致

## 运行

```bash
# 1. 单元测试 (text-level, no Provider)
npm run test:space-spatial-regression-score

# 2. Smoke runner (5 brand × 4 preset = 20 cases, 写 reports/)
npm run smoke:space-regression
```

## 输出

- `reports/per-case/{brand}__{preset}.json` — 每 case 完整 score + evidence
- `reports/integration-summary.json` — 汇总 (5 brand × 4 preset + acceptance)
- `reports/integration-summary.md` — 人类可读汇总

## Failure Case Database

`failures/*.json` — 记录回归测试捕获的 5+ 已知问题:

- `waye-001-cross-industry-contamination` (fixed, by Phase 9C.0.5 + commit 65252fd DNA 修正)
- `waye-002-architecture-context-missing` (documented, Phase 8A.1 out-of-scope per §4)
- `waye-003-scene-type-fallback` (documented, casual_dining 用 reception 兜底 per 9C.1 §11)
- `phase-9d-001-spatial-regression-score-fuzzy` (documented, text-level 评估限制)
- `phase-9d-002-jin-xiu-new-industry` (fixed, this commit 加 jin-xiu 5 行业第 5 brand 配套)

## 后续路线 (§12)

- Phase 9D ✓ (current)
- Phase 9E Spatial Intelligence Knowledge Layer
- Phase 10 Decision Consistency Validator
- Phase 11 Professional Design Intent Controller

## 约束

- No image gen, no Provider API, no LLM call: 纯 text-level compile + score
- No 5.0 production code pollution (`apps/cli` / `apps/desktop` / `packages` 不动)
- v1-baseline (9A.2 / 9A.3 / 9B.1 / 9B.2 / 9C / 9C.0.5 / 9C.1 / v1.0 Spatial Intent Presets) 全部 byte-equal 保留
- 5.0 release gate 全过 (workspace-boundaries / no-obsolete-code / production-boundaries / no-project-specific-production-rules / golden-boundary / current-flows)
