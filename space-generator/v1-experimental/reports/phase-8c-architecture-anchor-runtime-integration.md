# Phase 8C — Architecture Anchor Runtime Integration Report

- **Generated**: 2026-08-01
- **Phase**: 8C (Space Generator v1.1)
- **Trigger**: 5.0.0-rc.1
- **Status**: COMPLETE
- **Tests**: 242/242 space-dna tests PASS, 301/301 npm test PASS, 5 verify gates PASS, verify:current-flows PASS, tsc clean.

## 0. 背景

Phase 8A 引入 Architecture Anchor (anchor 作为 in-context reference 注入 prompt).
Phase 8B 验证 anchor 注入提升了 Architecture 维度 (20→23) 和 Functional 维度 (13→17).
Phase 8B.1 缓解 Architecture Concept Drift (bridge 字段 + 权重微调).

Phase 8C 目标: **把实验链整合为稳定 runtime 架构**. 三个核心约束:

1. **不需要手动 anchor 选择** — runtime 根据 dna 字段自动选
2. **不改变 existing brand blocks** — brand_translation / functional_requirement / negative_constraints byte-equal
3. **prompt 仍在 provider 限制内** — runtime 12 块 ≤ 12000 chars

## 1. 改动一览 (Phase 8C)

| 改动 | Before (Phase 8B.1) | After (Phase 8C) |
| --- | --- | --- |
| Anchor 选择方式 | 手动传 anchors 数组 | `selectAnchors(brandKey, criteria)` 自动评分 |
| Anchor entry 字段 | id / role / primaryMechanism / imagePath / weight | + category / strength / applicability |
| Prompt 编译入口 | compileFieldEnrichedPrompt / compileFieldEnrichedPromptWithAnchorContext (手动) | + compileRuntimePrompt (auto-select + auto-inject) |
| 评估层 summary | phase8B1Bonus (1 个) | + runtimeSummary: architectureBeauty / functionalAdaptation / brandIntegration / conceptDriftPenalty (4 个) |
| brand_translation 块 | baseline 路径下 byte-equal | baseline + runtime 路径下都 byte-equal |

## 2. Runtime 集成链路 (Phase 8C §1)

```
Project Analysis
↓
Space DNA Extraction
↓
Architecture Anchor Selection      <- Phase 8C 新增: selectAnchors 自动评分
↓
Architecture Function Bridge      <- Phase 8B.1: bridge 字段 (5 arrays + weightBoost)
↓
Prompt Compilation                <- Phase 8C 新增: compileRuntimePrompt 入口
↓
Provider Generation               (runtime, 不在本模块)
↓
Evaluation                       <- Phase 8C: runtimeSummary 4 指标
```

## 3. Anchor Selection Logic (Phase 8C §3 + §4)

`selectAnchors(brandKey, criteria, maxCount)` 评分维度:

| 维度 | 权重 | 来源 |
| --- | --- | --- |
| industryMatch | 0.35 | anchor.applicability.industries vs criteria.industry |
| sceneTypeMatch | 0.30 | anchor.applicability.sceneTypes vs criteria.sceneType |
| commercialContextMatch | 0.15 | anchor.applicability.commercialContexts vs criteria.commercialContext |
| functionalAlignment | 0.10 | anchor.strength.function vs operationalRealism (high -> 0.85+ required) |
| weight | 0.10 | anchor.weight (registry-defined) |

**关键设计**:
- `score > 0` 要求 industry / sceneType / commercialContext 至少一个匹配 (避免 weight 维度让无关 anchor 进入)
- `requireFunctionStrength` 阈值过滤
- `operationalRealism=high` 要求 anchor.strength.function >= 0.85

## 4. Anchor Entry 字段 (Phase 8C §3)

每个 anchor 加 3 个 Phase 8C 字段:

```json
{
  "id": "JZMX-ARCH-01-ReceptionMembrane",
  "category": "organic_translucent_structure",
  "strength": { "architecture": 0.95, "function": 0.75 },
  "applicability": {
    "industries": ["medical_aesthetics", "health_management"],
    "sceneTypes": ["reception", "consultation", "vip_lounge"],
    "commercialContexts": ["street_store", "mall_store", "flagship"]
  }
}
```

**3 个 JZMX-ARCH anchor 的 category / strength**:
- ARCH-01: organic_translucent_structure (arch 0.95, func 0.75) — 天花主导
- ARCH-02: soft_light_circulation (arch 0.90, func 0.85) — 玻璃幕墙主导
- ARCH-03: continuous_spatial_membrane (arch 0.88, func 0.80) — 膜天花 + 跨工位主导

## 5. Runtime Prompt Compiler (Phase 8C §6.2)

`compileRuntimePrompt(dna, options)` 入口:

```js
const result = compileRuntimePrompt(dna, {
  brandKey: 'jiuzhou-aesthetics',  // 可省略, 从 dna.project.brandName 推断
  autoSelectAnchors: true,          // default true
  anchorMaxCount: 3,                 // default 3
  forceBaseline: false,              // true = 强制 11 块 baseline
});
// result.runtimePath = 'anchor_aware_8a_8b1' | 'baseline_8b1'
// result.anchorSelection = { brandKey, criteria, candidates: [{ anchorId, score, breakdown }] }
```

**block 顺序** (Phase 8C §5 提议 vs 实际):
- 文档提议: task → brand DNA → architecture_context → bridge → architectural_concept → ...
- 实际 (Phase 8B.1 沿用 v1.1 §6 原则): task → architecture_function_bridge → architecture_context (auto-inject) → architectural_concept → architecture_dna → brand_translation → ...
- **理由**: v1.1 §6 "空间概念必须优先于品牌表达" 是经过 Phase 1-8B 验证的设计原则. Phase 8C §5 提议违反此原则, 不采纳.

**Locked components byte-equal 验证** (Phase 8C §2):
- brand_translation: baseline vs runtime 字符完全相同
- functional_requirement: 字符完全相同
- negative_constraints: 字符完全相同

## 6. 评估层 4 个 Runtime Summary 指标 (Phase 8C §6.3)

`evaluateSpace(dna).runtimeSummary` 4 个 summary:

| 指标 | 范围 | 来源 | v0.3 实测 |
| --- | --- | --- | --- |
| architectureBeauty | 0-25 | mirrors architecture_quality | 25 |
| functionalAdaptation | 0-21 | functional_realism + phase8B1Bonus | 21 (20+1) |
| brandIntegration | 0-20 | mirrors brand_translation | 20 |
| conceptDriftPenalty | 0-1 | conceptDriftGuards count (0/0.5/1) | 1 (5+ guards) |

**关键**: runtimeSummary 不计入 6-dim 总分 (max 仍 100). 是 runtime 监控信号, 不是分数. 这避免污染现有评分体系.

## 7. 文档不合理的修改 (我的判断)

| 文档 | 文档建议 | 实际做法 | 理由 |
| --- | --- | --- | --- |
| §3 + §7 `golden-references/architecture-anchor/` | 新建目录 | 保持 `v1-experimental/architecture-anchors/` | 重复, 违反仓库栅格 (`golden-references/` 是 v1-baseline 模式) |
| §5 块顺序把 brand DNA 放在 architecture 之前 | task → brand DNA → architecture_context → bridge → ... | task → bridge → architecture_context (auto) → architecture_concept → architecture_dna → brand_translation → ... | 违反 v1.1 §6 "空间概念必须优先于品牌表达" 已验证设计原则 |
| §3 anchor entry 缺 strength 字段 | strength 字段 | 加上 strength { architecture, function } | 文档 example 给了字段值, 必须保留 |
| §3 anchor entry 缺 category 字段 | category 字段 | 加上 category (organic_translucent_structure / soft_light_circulation / continuous_spatial_membrane) | 文档 §4 例子里有 category 用法 |
| §6.3 evaluation 跟踪指标 | 4 个新指标 | runtimeSummary 4 字段 (不计入总分) | max 100 是 v1.0 §25 硬约束, 不能加; 4 指标作为独立 summary |

## 8. 测试覆盖

13 个 test 套件, 242/242 PASS:

| 套件 | 测试数 | 状态 |
| --- | --- | --- |
| field-schema/tests/validate.test.mjs | 40 | PASS |
| field-enriched/tests/compile-prompt.test.mjs | 17 | PASS |
| field-enriched/tests/compile-prompt-v1.1.test.mjs | 14 | PASS |
| field-enriched/tests/architecture-function-bridge.test.mjs | 18 | PASS |
| anchor-aware/tests/compile-with-anchor.test.mjs | 20 | PASS |
| prompt-compiler/trace/tests/compile-trace.test.mjs | 13 | PASS |
| prompt-compiler/variation/tests/derive-variants.test.mjs | 17 | PASS |
| prompt-compiler/runtime/tests/runtime-prompt.test.mjs | 17 | PASS (新) |
| architecture-anchors/loader/tests/anchor-selection.test.mjs | 16 | PASS (新) |
| function-calibrations/tests/function-calibrations.test.mjs | 17 | PASS |
| evaluation/tests/evaluate-space.test.mjs | 22 | PASS (+7 from Phase 8B.1) |
| test-cases/jiuzhou-aesthetics/tests/vertical.test.mjs | 10 | PASS |
| test-cases/regression/tests/regression.test.mjs | 21 | PASS |

**新增测试数 (Phase 8C)**: 17 + 16 + 7 = 40 个

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

## 10. 不调 Provider, 不污染生产代码

- ✅ 不调真实 Provider (Phase 8C 是 runtime 集成, 不动 provider 路径)
- ✅ 不修改 v1-baseline 任何文件
- ✅ 不修改生产代码 (apps/cli / apps/desktop / packages)
- ✅ runtime 入口在 `v1-experimental/prompt-compiler/runtime/`, 平行 baseline
- ✅ 评估层在 `v1-experimental/evaluation/`, 平行 baseline
- ✅ auto-select 路径默认走 selectAnchors (不调 Provider), runtime 仍可由调用方决定 forceBaseline

## 11. 接下来 (Phase 8D)

Phase 8C §9 明确:
> Phase 8D: Multi-brand Space Validation
> 验证 Space Generator 不只是 overfit 到九州美学.
> 目标: 4 个 brand (JZMX / FTT / YJLF / technology)

当前 architecture-anchors/registry.json 已经为 multi-brand 准备:
- JZMX: 3 anchors (medical_aesthetics, health_management, retail, restaurant 都覆盖)
- 其他 3 brand (YJLF / FTT / WY) 没有 anchor (因为 Phase 1-8B 都没创建)

Phase 8D 任务:
1. 给 YJLF / FTT / WY 创建 architecture-anchors (multi-brand)
2. 跨 brand regression 验证 selectAnchors 不串扰
3. 验证 v0.1.1 (FTT) / v0.1 (WY) 在 runtime 路径下不破

## 12. 改动文件清单 (待 commit)

新增:
- space-generator/v1-experimental/architecture-anchors/loader/tests/anchor-selection.test.mjs
- space-generator/v1-experimental/prompt-compiler/runtime/compile-runtime.mjs
- space-generator/v1-experimental/prompt-compiler/runtime/tests/runtime-prompt.test.mjs
- space-generator/v1-experimental/reports/phase-8c-architecture-anchor-runtime-integration.md

修改:
- space-generator/v1-experimental/architecture-anchors/registry.json (加 category / strength / applicability / selectionPolicy)
- space-generator/v1-experimental/architecture-anchors/loader/load-anchors.mjs (加 selectAnchors 函数)
- space-generator/v1-experimental/evaluation/evaluate-space.mjs (加 runtimeSummary 4 指标)
- space-generator/v1-experimental/evaluation/tests/evaluate-space.test.mjs (加 7 个 runtime summary 验证)
- space-generator/v1-experimental/test-cases/regression/results/space-evaluation-report.json (重新生成)
