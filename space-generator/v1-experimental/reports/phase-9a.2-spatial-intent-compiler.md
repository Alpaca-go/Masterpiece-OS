# Phase 9A.2 — Spatial Intent Compiler Report

- **Generated**: 2026-08-01
- **Phase**: 9A.2 (Space Generator v1.1)
- **Trigger**: 5.0.0-rc.1
- **Status**: COMPLETE (compiler layer, no Prompt Runtime modification)
- **Tests**: 342/342 space-dna tests PASS, 301/301 npm test PASS, 5 verify gates PASS, verify:current-flows PASS, tsc clean.

## 0. 背景

Phase 9A.1 定义了 Spatial Intent Schema (5 字段):
- primaryEmotion / userJourney / spaceRole / designLogic / architecturalReason

Phase 9A.2 创建 Spatial Intent Compiler: 把 spatialIntentDna 编译为 compiledSpatialIntent (5 字段):
- experienceGoal / spatialStrategy / architecturalImplications / functionRelationship / constraints

**位置 (§2)**: Brand DNA -> Brand Translation -> Spatial Intent -> **Spatial Intent Compiler** -> Architecture Language -> Architecture Anchor -> Function Bridge -> Prompt Compiler

**核心原则 (§3)**: Compiler 是 reasoning compiler, 不是 image generator / architecture selector / style matcher / reference copier.

## 1. 改动一览 (Phase 9A.2)

| 改动 | 状态 |
| --- | --- |
| 新增 `spatial-intent-compiler/` 目录 | compile-spatial-intent.mjs + intent-rules/ + schemas/ + tests/ |
| 3 个 intent rules 文件 | emotion-rules.json / journey-rules.json / space-role-rules.json |
| Compiled Spatial Intent schema | 5 字段 (required) + weight (optional, default 0.25) |
| compileSpatialIntent() 函数 | 确定性输出 (同输入 -> 同输出, §10 Stability) |
| 29 个新测试 | 覆盖 schema / differentiation / leakage / stability / custom input |

## 2. Module 结构 (§4)

```
spatial-intent-compiler/
├── compile-spatial-intent.mjs       # Compiler 入口
├── intent-rules/
│   ├── emotion-rules.json            # primaryEmotion 关键词 -> spatialStrategy / architecturalImplications / constraints
│   ├── journey-rules.json            # userJourney 关键词 -> functionRelationship / constraints
│   └── space-role-rules.json         # spaceRole 关键词 -> experienceGoal / functionRelationship / constraints
├── schemas/
│   └── compiled-spatial-intent.schema.json
└── tests/
    └── compile-spatial-intent.test.mjs
```

## 3. Compiler 输入/输出 (§5 + §6)

**Input**: spatialIntentDna (5 string 字段, Phase 9A.1)

**Output**: compiledSpatialIntent (5 字段 + optional weight):

| 字段 | 类型 | 来源 | 例子 |
| --- | --- | --- | --- |
| experienceGoal | string | space-role-rules | "创造低压力、高信任的专业医疗体验" |
| spatialStrategy | string[] | emotion-rules | ["soft boundary", "balanced openness", "low stimulation lighting"] |
| architecturalImplications | string[] | emotion-rules | ["需要连续边界和柔性空间关系", "视觉连续优先于硬隔断", "声压差弱屏蔽替代完全封闭"] |
| functionRelationship | string[] | space-role-rules + journey-rules | ["咨询区域: 需要私密性 + 可见性平衡 + 信任建立", "入口区域: 需要可见性但不侵入 (透明边界)"] |
| constraints | string[] | emotion-rules + journey-rules + space-role-rules | ["avoid excessive decoration", "avoid hospital corridor"] |
| weight | number (optional) | options.weight ?? 0.25 | 0.25 (default) |

## 4. 3 Brand Differentiation (Phase 9A.2 §10)

| Brand | experienceGoal | spatialStrategy 核心 | constraints 核心 |
| --- | --- | --- | --- |
| JZMX (medical) | 创造低压力、高信任的专业医疗体验 | soft boundary / balanced openness / low stimulation lighting | avoid hospital corridor, avoid cold clinical |
| FTT (restaurant) | 创造可信赖的、围绕食物制作的日常餐饮体验 | visible process / warm material / social interaction | avoid hidden kitchen, avoid sterile dining, avoid fine dining |
| YJLF (health) | 创造慢节奏的、可被理解的中医调理体验 | calm rhythm / soft boundary with traditional / natural diffused light | avoid medical clinical, avoid spa atmosphere, avoid modern museum cold |

**验证** (Phase 9A.2 §10):
- 3 brand experienceGoal 全部 distinct
- 3 brand spatialStrategy overlap < 50%
- 3 brand constraints 各自有 distinct forbidden directions (JZMX hospital / FTT kitchen / YJLF clinical/spa)

## 5. Layer Boundary (§9)

| ✅ CAN | ❌ CANNOT |
| --- | --- |
| Transform brand experience goal to spatial direction | select specific architecture anchor |
| Output spatial strategy | specify material combinations |
| Output architectural implications (high-level) | copy reference images |
| Output function relationship | generate prompt |

**实现验证** (Phase 9A.2 §11.5):
- compile-spatial-intent.mjs 不 import compileFieldEnrichedPrompt / compileRuntimePrompt
- module 只导出 compileSpatialIntent + compileSpatialIntentForBrand
- 3 brand compiled output 不含 anchor name / material / architecture_specific (FORBIDDEN_LEAKAGE 列表验证)

## 6. 文档不合理的修改 (我的判断)

| 文档 | 文档建议 | 实际做法 | 理由 |
| --- | --- | --- | --- |
| §4 提议 3 个 intent-rules 文件 (emotion / journey / space-role) | 3 文件 | 3 文件, 但 journey 和 space-role 规则用推断 (与 §8 Rule Engine 给的 emotion 例子保持一致风格) | §8 只举 emotion 例子 (安心/信任/烟火感), journey 和 space-role 没具体规则; 推断保持 schema 完整但规则不发明内容 |
| §6 Output 没说 weight 字段 | 不指定 | 加 optional weight (default 0.25) | 与 architectureFunctionBridge.weightBoost 对齐, 为 Phase 9A.3 集成准备 |
| §11.5 "不修改 Prompt Runtime" | 关键约束 | compile-spatial-intent.mjs 不调用 compileFieldEnrichedPrompt / compileRuntimePrompt, 测试验证 | 防止 compiler 误集成到 prompt |
| §7 architecturalImplications "不是固定形式" | 抽象 | 测试用 FORBIDDEN_LEAKAGE.architecture_specific 列表检测 | 需要可自动化验证, 否则 compiler 输出会逐渐漂移到具体形式 |

## 7. 测试覆盖

16 个 test 套件, 342/342 PASS:

| 套件 | 测试数 | 状态 |
| --- | --- | --- |
| field-schema/tests/validate.test.mjs | 40 | PASS |
| field-schema/tests/spatial-intent.test.mjs | 32 | PASS |
| spatial-intent-compiler/tests/compile-spatial-intent.test.mjs | 29 | PASS (新) |
| field-enriched/tests/compile-prompt.test.mjs | 17 | PASS |
| field-enriched/tests/compile-prompt-v1.1.test.mjs | 14 | PASS |
| field-enriched/tests/architecture-function-bridge.test.mjs | 18 | PASS |
| anchor-aware/tests/compile-with-anchor.test.mjs | 20 | PASS |
| prompt-compiler/trace/tests/compile-trace.test.mjs | 13 | PASS |
| prompt-compiler/variation/tests/derive-variants.test.mjs | 17 | PASS |
| prompt-compiler/runtime/tests/runtime-prompt.test.mjs | 17 | PASS |
| architecture-anchors/loader/tests/anchor-selection.test.mjs | 18 | PASS |
| function-calibrations/tests/function-calibrations.test.mjs | 17 | PASS |
| brand-space-examples/tests/multibrand-validation.test.mjs | 37 | PASS |
| evaluation/tests/evaluate-space.test.mjs | 22 | PASS |
| test-cases/jiuzhou-aesthetics/tests/vertical.test.mjs | 10 | PASS |
| test-cases/regression/tests/regression.test.mjs | 21 | PASS |

**新增测试数 (Phase 9A.2)**: 29 个

## 8. Phase 9A.2 §11 验收 6 项全过

| 验收项 | 验证方法 | 状态 |
| --- | --- | --- |
| 1. compiler module 完成 | compileSpatialIntent + compileSpatialIntentForBrand 导出 | PASS |
| 2. schema validation 完成 | compiled-spatial-intent.schema.json 5 required fields, validate output | PASS |
| 3. 3 品牌测试通过 | 3 brand compile, 各自 distinct spatialStrategy / constraints | PASS |
| 4. 无 Provider 调用 | compile-spatial-intent.mjs 无 fetch / http / LLM imports | PASS |
| 5. 不修改 Prompt Runtime | compile-spatial-intent.mjs 不调用 compileFieldEnrichedPrompt, 不导出 prompt 相关 | PASS |
| 6. 不污染 v1-baseline | 改动只在 v1-experimental/spatial-intent-compiler/ | PASS |

## 9. Verify Gates

| Gate | 状态 |
| --- | --- |
| verify:version-consistency | PASS |
| verify:workspace-boundaries | PASS (0 failures) |
| verify:no-obsolete-code | PASS (432 files) |
| verify:production-boundaries | PASS (193 desktop files) |
| verify:no-project-specific-production-rules | PASS |
| verify:golden-boundary | PASS |
| verify:current-flows | PASS (含 tsc clean) |
| npm test | 301/301 PASS |

## 10. 不调 Provider, 不污染生产代码, 不破 runtime

- ✅ 不调真实 Provider (compileSpatialIntent 是 deterministic rule matching, 无网络依赖)
- ✅ 不修改 v1-baseline 任何文件
- ✅ 不修改生产代码 (apps/cli / apps/desktop / packages)
- ✅ 不修改 Prompt Runtime (§11.5 关键约束, 不调用 compileFieldEnrichedPrompt)
- ✅ 现有 303/303 测试全部仍 PASS (新增 29 个 spatial-intent-compiler 测试)
- ✅ compile-spatial-intent.mjs 模块独立, Phase 9A.3 集成时才连入 runtime

## 11. 接下来 (Phase 9A.3)

Phase 9A.2 §12 提议 Phase 9A.3: Intent -> Architecture Bridge

目标: 将 compiledSpatialIntent.spatialStrategy 转换为 Architecture Language, 最终形成:

```
Brand Meaning -> Spatial Intent -> Architecture Logic -> Architecture Anchor -> Generated Space
```

Phase 9A.3 任务 (推测):
1. compileArchitectureLogic(compiledSpatialIntent) -> 桥接到 architecture-language 4 类
2. 集成到 compileRuntimePrompt 入口
3. 评估层加 Architecture Logic Score
4. 跨 brand runtime 验证 4 architecture-language 类别激活

## 12. 改动文件清单 (待 commit)

新增:
- space-generator/v1-experimental/spatial-intent-compiler/compile-spatial-intent.mjs
- space-generator/v1-experimental/spatial-intent-compiler/schemas/compiled-spatial-intent.schema.json
- space-generator/v1-experimental/spatial-intent-compiler/intent-rules/emotion-rules.json
- space-generator/v1-experimental/spatial-intent-compiler/intent-rules/journey-rules.json
- space-generator/v1-experimental/spatial-intent-compiler/intent-rules/space-role-rules.json
- space-generator/v1-experimental/spatial-intent-compiler/tests/compile-spatial-intent.test.mjs
- space-generator/v1-experimental/reports/phase-9a.2-spatial-intent-compiler.md

修改: 无 (Phase 9A.2 是独立 module, 不修改任何现有文件)
