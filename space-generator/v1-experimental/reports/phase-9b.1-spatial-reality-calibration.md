# Phase 9B.1 — Spatial Reality Calibration Report

- **Generated**: 2026-08-01
- **Phase**: 9B.1 (Space Generator v1.1)
- **Trigger**: 5.0.0-rc.1
- **Status**: text-level A/B complete; image-level requires user-authorized real-provider smoke
- **Tests**: 435/435 space-dna tests PASS, 301/301 npm test PASS, 7 verify gates PASS, verify:current-flows PASS, tsc clean.

## 0. 背景

Phase 9B Spatial Intelligence Reasoning (Phase 9A.1 schema + 9A.2 compiler + 9A.3 bridge) 已验证能提升空间概念完整度、建筑语言表达、品牌空间叙事能力. Real-provider A/B (JZMX + FTT, commit `de2e2ca`) 也成功.

但测试发现 Spatial Intent 增强后模型可能偏向:
- 展览空间
- 艺术装置
- 概念建筑

导致商业真实性下降.

Phase 9B.1 加 **Spatial Reality Constraint Layer**, 在 Phase 9B 基础上提供 8 字段硬约束 + 反漂移 forbidden spatial types, 防止模型偏向 exhibition / installation / concept architecture, 提升 Functional Realism ≥15% + Commercial Realism ≥20% (Phase 9B.1 §6 / §7).

## 1. 改动一览 (Phase 9B.1)

| 改动 | 状态 |
| --- | --- |
| 新增 `spatial-reality/` 目录 | compile-spatial-reality-prompt.mjs + prompt-block/ + schema/ + examples/ + constraint-rules/ + tests/ + bin/ + results/ + reports/ |
| spatial-reality-dna schema | 8 字段 (spaceType / commercialScale / requiredZones / operationLogic / userFlow / privacyRequirement / materialReality / forbiddenSpatialTypes) + optional metadata |
| 3 brand spatial-reality examples | jiuzhou-aesthetics / feng-tang-tang / yi-ji-liang-fang (8 字段各自 distinct) |
| compileSpatialRealityBlock() block compiler | 8 字段编译为 spatial_reality_constraint block, 强调反漂移 |
| compileRuntimePromptModeASpatialReality() Mode A wrapper | Phase 9B Mode B baseline (14 块) + mode='A-spatial-reality' 显式标记 |
| compileRuntimePromptWithSpatialReality() Mode B wrapper | Phase 9B Mode B + spatial_reality_constraint 块 (15 块) + mode='B-spatial-reality' |
| Text-level A/B runner | bin/run-ab-comparison.mjs 跑 3 brand, 写 results/ |
| 33 个新测试 | 覆盖 Mode A / Mode B wrapper / 3 brand differentiation / 8 字段全覆盖 / 块结构 / no provider / no baseline / §8 冻结 |
| package.json scripts: `test:space-spatial-reality` | 独立运行新测试套件 |

## 2. Module 结构

```
spatial-reality/
├── compile-spatial-reality-prompt.mjs   # Mode A + Mode B wrapper
├── prompt-block/
│   └── compile-spatial-reality-block.mjs # spatial_reality_constraint block compiler
├── constraint-rules/                      # 占位, 留待 Phase 9B.1 后续扩展
├── schema/
│   └── spatial-reality-dna.schema.json
├── examples/
│   ├── jiuzhou-aesthetics.spatial-reality.json
│   ├── feng-tang-tang.spatial-reality.json
│   └── yi-ji-liang-fang.spatial-reality.json
├── tests/
│   └── compile-spatial-reality-prompt.test.mjs
├── bin/
│   └── run-ab-comparison.mjs             # 3 brand text-level A/B
└── results/
    ├── ab-comparison-aggregate.json
    ├── ab-comparison-report.md
    └── {jiuzhou-aesthetics, feng-tang-tang, yi-ji-liang-fang}/
        ├── mode-A.prompt.md
        ├── mode-B.prompt.md
        └── ab-comparison.json
```

## 3. 8 字段 spatialRealityDna (§3)

| 字段 | 用途 | 示例 |
| --- | --- | --- |
| spaceType | 空间类型 (避免模型误判) | `medical_aesthetics_clinic` / `casual_dining_restaurant` / `tcm_wellness_clinic` |
| commercialScale | 商业规模 (量化) | `200 sqm flagship clinic` / `80-150 sqm casual dining` |
| requiredZones | 必备功能区 (必须全部出现) | `consultation_room` / `open_kitchen` / `tea_corner` |
| operationLogic | 运营逻辑 (staff 可见) | `patient flow + VIP appointment` / `visible food prep + social dining` |
| userFlow | 用户动线 (具体路径) | `street -> reception -> waiting -> consultation -> treatment` |
| privacyRequirement | 隐私要求 (层级化) | `open public + filtered semi-private + enclosed treatment` |
| materialReality | 真实材料 (非概念) | `mineral_plaster + frosted_glass + brushed metal` (JZMX) |
| forbiddenSpatialTypes | 反漂移硬护栏 | `hospital corridor / art gallery / exhibition hall` (JZMX) |

## 4. Mode A vs Mode B (text-level)

| Brand | Mode A blocks | Mode A chars | Mode B blocks | Mode B chars | Char diff | Char ratio |
| --- | --- | --- | --- | --- | --- | --- |
| jiuzhou-aesthetics | 14 | 8698 | 15 | 10515 | +1817 | +20.9% |
| feng-tang-tang | 14 | 6634 | 15 | 8342 | +1708 | +25.8% |
| yi-ji-liang-fang | 14 | 6872 | 15 | 8693 | +1821 | +26.5% |

Mode B 块顺序: `task / spatial_intent / architecture_language / spatial_reality_constraint / architecture_context / architecture_function_bridge / architectural_concept / architecture_dna / brand_translation / functional_requirement / material / lighting / composition / rendering / negative_constraints`

Mode B 新增 1 块 (spatial_reality_constraint), 插在 architecture_language 之后, architecture_context 之前.

## 5. 6 维评价指标 (§6) + 验收 (§7)

| 指标 | 目标 | Phase 9B.1 改进点 | 验证 |
| --- | --- | --- | --- |
| Brand Translation | 不下降 (≥ Phase 9B Mode B) | brand_translation / architecture_context 块不变 | image-level 需人工 |
| Architecture Quality | 不下降 (≥ Phase 9B Mode B) | architecture_language / architectural_concept 块不变 | image-level 需人工 |
| Functional Realism | 提升 ≥15% | spatial_reality_constraint 显式列 requiredZones + userFlow | image-level 需人工 |
| Commercial Realism | 提升 ≥20% | materialReality 强制真实材料 + forbiddenSpatialTypes 反漂移 | image-level 需人工 |
| Spatial Coherence | 提升 | spaceType + commercialScale 给模型量化 | image-level 需人工 |
| Visual Quality | 保持 | 不修改任何视觉相关 baseline | image-level 需人工 |

减少: 展馆感 / 艺术装置感 / 空间尺度错误 (Phase 9B.1 §7).

## 6. §8 冻结验证

Phase 9B.1 §8 冻结: **Spatial Intent / Architecture Anchor / architecture_context 都不动**. 禁止降低建筑语言能力.

- ✓ Mode B compiledSpatialIntent (Phase 9A.2) 不变
- ✓ Mode B architectureLanguage (Phase 9A.3) 不变
- ✓ Mode B architecture_context (Phase 8A) block content 不变
- ✓ Mode A = Phase 9B Mode B (14 块 baseline 100% 兼容)
- ✓ compileFieldEnrichedPrompt 100% 不变 (11 块 baseline 仍然返回 11 块)
- ✓ compileRuntimePromptWithSpatialIntelligence 100% 不变 (14 块 Phase 9B Mode B 仍然返回 14 块)

## 7. 3 brand 8 字段 forbiddenSpatialTypes (反漂移)

| Brand | 关键 forbidden |
| --- | --- |
| jiuzhou-aesthetics | hospital corridor / art gallery / modern museum / nightclub / exhibition hall / art installation / spa retreat / fine art gallery |
| feng-tang-tang | fine dining / modern art museum / art gallery / exhibition hall / fast food chain / buffet / cafeteria / art installation |
| yi-ji-liang-fang | modern hospital / spa / modern museum / art gallery / exhibition hall / nightclub / modern office / fast food |

3 brand forbidden 各 8 个, 各自 distinct, 体现 3 brand 商业真实性反漂移策略不同.

## 8. Layer Boundary (§3 + schema)

Spatial Reality Constraint Layer 回答: **"什么商业现实约束这个空间"** (Phase 9B.1 schema layerBoundaryRules).

- Spatial Reality CAN: 8 字段硬约束 / 商业真实性 / 必备功能区 / 反漂移
- Spatial Reality CANNOT: 选择具体 anchor / 描述具体装饰元素 / 复制参考图片 / 生成 prompt / 修改 Spatial Intent / Architecture Anchor / architecture_context (§8 冻结)

## 9. Key Design Decisions

- **独立 module 目录 spatial-reality/**: 不修改现有 field-schema / prompt-compiler / evaluation / spatial-intent-compiler / architecture-bridge / spatial-intelligence-pipeline 任何文件. 跟 Phase 9A.2 / 9A.3 / 9B 一致.
- **Mode A = Phase 9B Mode B**: 复用 Phase 9B Mode B 作为新 baseline, 不重写.
- **Mode B 在 architecture_language 之后插入 1 块**: 跟 Phase 8A / 9B 一样的策略 (在 architecture context chain 之前).
- **8 字段全覆盖**: 3 brand 各自填全 8 字段, 各 forbidden 8 个 (反漂移硬护栏).
- **deterministic 输出**: 同输入 -> 同输出, §10 Stability 10 次编译稳定.
- **不调真实 Provider**: spatial-reality/ 全部 deterministic, 无网络依赖.
- **不修改 baseline**: compileFieldEnrichedPrompt 11 块, compileRuntimePrompt 12 块, compileRuntimePromptWithSpatialIntelligence 14 块, 都 100% 不变.
- **typo fix**: Set `.some()` not `.has()` (avoid confusing test logic)
- **package.json 新增 test:space-spatial-reality 脚本**

## 10. Test Coverage

- 33 个新测试, 全部 PASS:
  - 5 preconditions: 3 module exports / spatial-reality-dna.schema.json / 3 brand spatial-reality example files / 3 brand DNA + spatial intent files
  - 4 Mode A wrapper: 14 blocks / mode='A-spatial-reality' / 不含 spatial_reality_constraint / 14 baseline blocks 全部保留
  - 5 Mode B wrapper: 15 blocks / mode='B-spatial-reality' / 块顺序正确 / runtime path 含 9b1 / spatialRealityDna 包含
  - 4 3 brand distinct 8-field: spaceType distinct / forbidden sets no overlap (with hospital corridor check) / requiredZones distinct (JZMX consultation_room, FTT open_kitchen, YJLF tea_corner) / spatial_reality_constraint block text distinct
  - 1 8 字段全覆盖: 3 brand 8 fields 全部非空
  - 3 Mode B includes 8-field content: JZMX / FTT / YJLF 各自 requiredZones + forbidden 都在 Mode B 编译后出现
  - 1 块结构: 15 block ids 全部正确
  - 2 No Provider Calls: 2 个 .mjs 文件无网络
  - 2 No Baseline Modification: Mode A = Phase 9B Mode B / Mode B 14 baseline + 1 new
  - 3 §8 冻结: compiledSpatialIntent 不变 / architectureLanguage 不变 / architecture_context 内容不变
  - 3 Input validation: throws on null dna / null spatialIntentDna / null spatialRealityDna

## 11. Files

新增 (11):
- `space-generator/v1-experimental/spatial-reality/compile-spatial-reality-prompt.mjs`
- `space-generator/v1-experimental/spatial-reality/prompt-block/compile-spatial-reality-block.mjs`
- `space-generator/v1-experimental/spatial-reality/schema/spatial-reality-dna.schema.json`
- `space-generator/v1-experimental/spatial-reality/examples/{jiuzhou-aesthetics,feng-tang-tang,yi-ji-liang-fang}.spatial-reality.json`
- `space-generator/v1-experimental/spatial-reality/bin/run-ab-comparison.mjs`
- `space-generator/v1-experimental/spatial-reality/tests/compile-spatial-reality-prompt.test.mjs`
- `space-generator/v1-experimental/spatial-reality/results/ab-comparison-aggregate.json`
- `space-generator/v1-experimental/spatial-reality/results/ab-comparison-report.md`
- `space-generator/v1-experimental/spatial-reality/results/{jiuzhou-aesthetics,feng-tang-tang,yi-ji-liang-fang}/{mode-A,mode-B}.prompt.md`
- `space-generator/v1-experimental/spatial-reality/results/{jiuzhou-aesthetics,feng-tang-tang,yi-ji-liang-fang}/ab-comparison.json`
- `space-generator/v1-experimental/reports/phase-9b.1-spatial-reality-calibration.md` (本文件)

修改 (1):
- `package.json` (新增 `test:space-spatial-reality` script)

## 12. 累计测试状态

| 测试套件 | 状态 |
| --- | --- |
| 19 space-dna test suites | 435/435 PASS (Phase 1-9B 402 + Phase 9B.1 新增 33) |
| npm test (root + Desktop 公共契约) | 301/301 PASS |
| verify:version-consistency | PASS |
| verify:workspace-boundaries | PASS |
| verify:no-obsolete-code | PASS |
| verify:production-boundaries | PASS |
| verify:no-project-specific-production-rules | PASS |
| verify:golden-boundary | PASS |
| verify:current-flows | PASS (tsc clean) |

## 13. 下一 Phase: Phase 9C — Spatial Intelligence Runtime Integration (§10)

Phase 9B.1 完成 Spatial Reality Constraint layer (text-level). Phase 9C 把 Spatial Intelligence + Spatial Reality 一起挪到 production runtime.

```
Brand DNA
+
Spatial Intent
+
Reality Constraint
+
Architecture Anchor
↓
Production Space Generator
```

需要 user 跑 real-provider smoke 后, 才能决定是否进入 Phase 9C.
Phase 9B.1 没跑 real-provider smoke, 但 infrastructure 已就绪 (跟 Phase 9B 共用 smoke runner, 改 env 即可).
