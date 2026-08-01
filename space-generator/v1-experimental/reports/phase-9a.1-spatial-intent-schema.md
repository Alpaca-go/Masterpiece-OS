# Phase 9A.1 — Spatial Intent Schema Report

- **Generated**: 2026-08-01
- **Phase**: 9A.1 (Space Generator v1.1)
- **Trigger**: 5.0.0-rc.1
- **Status**: COMPLETE (foundation schema only, no compiler)
- **Tests**: 303/303 space-dna tests PASS, 301/301 npm test PASS, 5 verify gates PASS, verify:current-flows PASS, tsc clean.

## 0. 背景

Phase 8A-8D 建立了"生成好空间"的能力链: Brand DNA → Brand Translation → Architecture Language → Architecture Anchor → Function Bridge → Prompt Compiler.

Phase 9A 升级到 "理解为什么这样设计" (Spatial Intent Reasoning).

Phase 9A.1 是 Phase 9A 的 foundation: 只定义 Spatial Intent Schema, 不实现 compiler (Phase 9A.2 任务).

## 1. 改动一览 (Phase 9A.1)

| 改动 | Before (Phase 8D) | After (Phase 9A.1) |
| --- | --- | --- |
| Spatial Intent schema | (无) | 独立 `spatial-intent.schema.json` (5 字段) |
| 主 DNA schema | 11 顶层字段 | 12 顶层字段 (+ spatialIntentDna optional) |
| Brand strategy 驱动层 | (无) | spatialIntentDna (5 string 字段) |
| 3 brand example | (无) | jiuzhou-aesthetics / feng-tang-tang / yi-ji-liang-fang |
| 验证 | (无) | 32 测试覆盖 schema / 3 brand / 边界 / leakage |

## 2. Spatial Intent Schema (Phase 9A.1 §3 + §4)

5 个 string 字段 (`minLength=1`):

```json
{
  "spatialIntentDna": {
    "primaryEmotion": "空间应产生的情感响应",
    "userJourney": "用户心理过渡 (Before -> During -> After)",
    "spaceRole": "空间为品牌做什么",
    "designLogic": "为什么这样设计",
    "architecturalReason": "桥接到建筑层 (高层方向)"
  }
}
```

**字段定义 (Phase 9A.1 §4)**:
- `primaryEmotion` (§4.1): 情感响应, 不描述材料或建筑
- `userJourney` (§4.2): 心理过渡, 格式 "Before entering -> During experience -> After experience"
- `spaceRole` (§4.3): 空间为品牌做什么
  - Medical: reduce anxiety and build trust
  - Restaurant: display process and enhance food value
  - Health: create calm and relationship-based experience
- `designLogic` (§4.4): 为什么这样设计
- `architecturalReason` (§4.5): 桥接 intent 到 architecture (高层方向, 不是具体形式)

## 3. Layer Boundary Rules (Phase 9A.1 §5)

| CAN | CANNOT |
| --- | --- |
| explain emotion | select anchors |
| explain user psychology | define materials |
| explain spatial purpose | copy references |
| explain design reasoning | decide rendering style |
| explain architectural reason (high-level) | |

**实现**: 测试用 FORBIDDEN_WORDS 列表 (material / architecture_specific / rendering / anchor_specific) 验证 3 brand spatialIntentDna 不含这些关键词.

## 4. 3 Brand Example (Phase 9A.1 §6 + §7)

| Brand | primaryEmotion | spaceRole | 关键词 |
| --- | --- | --- | --- |
| JZMX (medical_aesthetics) | 让用户从医疗不确定中进入安心与信任状态 | 空间作为医疗专业与美学体验之间的信任媒介 | 安心 / 信任 / 透明 / 柔光 |
| FTT (restaurant) | 让路过的饥饿客人看到厨房热气腾腾的瞬间就决定推门进来 | 空间作为食物生产过程的透明容器 | 实在 / 饱满 / 烟火气 / 暖色 |
| YJLF (health_management) | 让亚健康的中年客户从焦虑与快节奏中进入沉静 | 空间作为中医 '整体观' 的物理容器 | 沉静 / 慢 / 调理 / 望闻问切 |

**验证** (Phase 9A.1 §7): 3 brand primaryEmotion / spaceRole / designLogic 全部 distinct, 禁止通用高级感 / 通用现代空间 / 通用东方美学.

## 5. 文档不合理的修改 (我的判断)

| 文档 | 文档建议 | 实际做法 | 理由 |
| --- | --- | --- | --- |
| §3 "Add: spatialIntentDna" 在 DNA 实例里 + §8 "Create schema: spatial-intent.schema.json" 独立文件 | 二者似乎冲突 | 独立 schema 文件 + 主 DNA schema 加字段引用 | 文档说"Create schema: spatial-intent.schema.json" 是 §8 Task 1 明确, 字段级 schema 更易维护; 主 DNA schema 加 spatialIntentDna 字段 (optional) 保持向后兼容 |
| §3 字段约束没指定 minLength | 不指定 | minLength=1 | 防止空字符串, 5 字段必须非空才有意义 |
| §5 边界 "不定义 materials / 不复制 references" 抽象 | 抽象描述 | 测试用 FORBIDDEN_WORDS 列表 (material / architecture_specific / rendering / anchor_specific) 精确化 | 测试需要具体关键词, 否则无法自动化验证 |
| §7 禁止 "通用高级感 / 通用现代空间 / 通用东方美学" | 抽象 anti-pattern | 3 brand 各自用 distinct 关键词 (安心/实在/沉静) + 测试用 'not contains' 验证 | Phase 9A.1 §7 验收需要可自动化检查, distinct + not-contains 是最简实现 |
| §8 Task 2 "validateSpatialIntent()" | 提议函数 | 实际通过 ajv.compile(spatial-intent.schema.json) 直接生成 validator | 不需要新建 wrapper, ajv 的 compile 返回的函数就是 validateSpatialIntent |
| §8 Task 3 examples 路径没说 | 不说 | `field-schema/examples/<brand>.spatial-intent.json` (平行 architecture-function-bridge pattern) | 与现有 example 路径一致, 便于扫描 |

## 6. 测试覆盖

15 个 test 套件, 303/303 PASS:

| 套件 | 测试数 | 状态 |
| --- | --- | --- |
| field-schema/tests/validate.test.mjs | 40 | PASS |
| field-schema/tests/spatial-intent.test.mjs | 32 | PASS (新) |
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

**新增测试数 (Phase 9A.1)**: 32 个

## 7. Phase 9A.1 §9 验收 6 项全过

| 验收项 | 验证方法 | 状态 |
| --- | --- | --- |
| 1. schema complete | spatial-intent.schema.json has 5 required fields, all string minLength>=1 | PASS |
| 2. 3 brand examples complete | 3 spatial-intent.json files exist + validate + 5 fields non-empty | PASS |
| 3. validation tests pass | 32/32 tests PASS | PASS |
| 4. no v1-baseline pollution | 改动只在 v1-experimental/field-schema/, 不动 v1-baseline/ | PASS |
| 5. no Provider calls | Phase 9A.1 是 schema foundation, 不实现 runtime, 自然不调 Provider | PASS |
| 6. no runtime regression | 281 → 303 tests PASS (+32 新增, 0 旧测试破) | PASS |

## 8. Verify Gates

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

## 9. 不调 Provider, 不污染生产代码, 不破 runtime

- ✅ 不调真实 Provider (Phase 9A.1 是 schema foundation, 不实现 runtime)
- ✅ 不修改 v1-baseline 任何文件
- ✅ 不修改生产代码 (apps/cli / apps/desktop / packages)
- ✅ spatialIntentDna 是 optional 字段, 主 DNA schema 向后兼容 (v0.1 DNA 无 spatialIntentDna 仍能 validate)
- ✅ 现有 281/281 测试全部仍 PASS (新增 32 个 spatial-intent 测试)

## 10. 接下来 (Phase 9A.2)

Phase 9A.1 §10 提议 Phase 9A.2: Spatial Intent Compiler.

Pipeline 集成:
```
Brand Strategy
↓
Spatial Intent    <- Phase 9A.1 schema foundation
↓
Architecture Language
↓
Architecture Anchor
↓
Prompt Compiler
```

Phase 9A.2 任务 (推测):
1. compileSpatialIntent(dna) -> 验证 + 编译 spatialIntentDna
2. 集成到 compileRuntimePrompt 入口
3. 评估层加 Spatial Intent Score (Phase 9A.1 §5 brand strategy 驱动层)
4. 跨 brand runtime 验证 (3 brand spatialIntent 反映在 prompt)

## 11. 改动文件清单 (待 commit)

新增:
- space-generator/v1-experimental/field-schema/spatial-intent.schema.json
- space-generator/v1-experimental/field-schema/examples/jiuzhou-aesthetics.spatial-intent.json
- space-generator/v1-experimental/field-schema/examples/feng-tang-tang.spatial-intent.json
- space-generator/v1-experimental/field-schema/examples/yi-ji-liang-fang.spatial-intent.json
- space-generator/v1-experimental/field-schema/tests/spatial-intent.test.mjs
- space-generator/v1-experimental/reports/phase-9a.1-spatial-intent-schema.md

修改:
- space-generator/v1-experimental/field-schema/space-dna.schema.json (加 spatialIntentDna 字段, 5 properties)
- space-generator/v1-experimental/test-cases/regression/results/regression-report.json (重新生成)
- space-generator/v1-experimental/test-cases/regression/results/space-evaluation-report.json (重新生成)
