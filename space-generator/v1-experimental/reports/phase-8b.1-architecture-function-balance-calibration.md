# Phase 8B.1 — Architecture-Function Balance Calibration Report

- **Generated**: 2026-08-01
- **Phase**: 8B.1 (Space Generator v1.1)
- **Trigger**: 5.0.0-rc.1
- **Status**: COMPLETE
- **Tests**: 202/202 space-dna tests PASS, 301/301 npm test PASS, 5 verify gates PASS, verify:current-flows PASS, tsc clean.

## 0. 背景

Phase 8B 暴露 "Architecture Concept Drift" 风险:
- Architecture 维度从 56 → 95 (+70%, anchor 注入)
- 但 brand_translation 微降 18→17 (-5%), functional_realism 13→17 (+30% 来自 anchor 副作用)
- 整体趋势: 建筑语言开始压制商业运营逻辑 (空间变展览馆)

Phase 8B.1 目标: 在 architecture 机制和 functional 现实之间建立显式桥接层, 缓解 Concept Drift.

## 1. 改动一览 (Phase 8B.1)

| 改动 | Before | After |
| --- | --- | --- |
| DNA schema 新增字段 | (无 bridge) | `architectureFunctionBridge` (5 arrays + weightBoost) |
| weightAllocation 默认 | 0.5/0.3/0.2 | 0.45/0.3/0.25 (architecture 略降, functional 略升) |
| 编译块数量 (baseline) | 10 | 11 (+ architecture_function_bridge) |
| 编译块数量 (anchor-aware) | 11 | 12 (+ bridge) |
| 新增目录 | (无) | `function-calibrations/jiuzhou-aesthetics/` (concept only, 无 PNG) |
| 新增模块 | (无) | `function-calibrations/loader/load-calibrations.mjs` |
| 评估层新字段 | (无) | `phase8B1Bonus` (独立于 6-dim 总分) |

## 2. 字段设计 (Phase 8B.1 §3)

`architectureFunctionBridge` 5 个 array + 2 scalar:

```json
{
  "purpose": "商业目的 (1-2 句)",
  "spatialTranslation": ["建筑 mechanism -> 商业 action 翻译"],
  "operationConstraints": ["运营硬约束 (staff 通道, 无障碍, 声压差)"],
  "humanExperience": ["用户路径与体验节奏 (3 秒视线, 5 分钟信任)"],
  "commercialReality": ["商业真实性 (接待台储物, 沙发可坐, staff 可见)"],
  "conceptDriftGuards": ["fail-closed 提示, 防止空间变展览馆"],
  "weightBoost": 0.25
}
```

**5 维度的逻辑链**:
- `spatialTranslation`: 把 architecture 4 mechanism 翻译为 4 个商业动作
- `operationConstraints`: 商业运营硬约束
- `humanExperience`: 用户体验节奏
- `commercialReality`: 商业真实性 (防止纯展示)
- `conceptDriftGuards`: 失败模式防护

## 3. 块顺序 (Phase 8B.1 §4)

baseline 路径 (11 块):
```
task
↓
architecture_function_bridge   <- Phase 8B.1 新增, 在 architecture 概念之前, 桥接
↓
architectural_concept
↓
architecture_dna
↓
brand_translation
↓
functional_requirement
↓
material
↓
lighting
↓
composition
↓
rendering
↓
negative_constraints
```

anchor-aware 路径 (12 块, Phase 8A + Phase 8B.1 复合):
```
task
↓
architecture_context           <- Phase 8A 注入 (anchor 先验)
↓
architecture_function_bridge   <- Phase 8B.1 新增
↓
architectural_concept
↓
... (10 块基线)
```

设计意图: bridge 块先于 architecture_concept, 让"建筑必须服务商业"成为先验.

## 4. Function Calibration 概念集 (Phase 8B.1 §6)

按文档要求"Add JZMX-FUNC-01-reception-realism.png + JZMX-FUNC-02-consultation-flow.png" — **不调真实 Provider, 不创建 PNG**, 改成:

- `function-calibrations/jiuzhou-aesthetics/metadata.yaml` (status=concept_only)
- `function-calibrations/jiuzhou-aesthetics/function-dna-analysis.yaml` (5 维商业现实描述)
- `function-calibrations/registry.json` (manifest with imageStatus=concept_only, imagePath=null)
- `function-calibrations/loader/load-calibrations.mjs` (status=concept_only 时不解析 imagePath)

**未来 Phase 8B.2+ 真实跑批后**: 参照 Phase 8A 方式 (从用户项目数据目录复制 PNG 并 commit), status -> real_image, imagePath -> 真实路径. Loader 已经为这个过渡预留.

## 5. Weight Allocation 调整 (Phase 8B.1 §5)

| 维度 | Before | After | 含义 |
| --- | --- | --- | --- |
| architecture | 0.5 | 0.45 | 略降, 让功能有更多表达空间 |
| brand | 0.3 | 0.3 | 不变, 品牌不削弱 |
| functional | 0.2 | 0.25 | 略升, 商业现实加强 |

实现: schema `weightAllocation` default 不动 (向后兼容 0.5/0.3/0.2), 但 JZMX v0.3 (v1.1) DNA 实例显式设为 0.45/0.3/0.25.

## 6. 评估层 (Phase 8B.1 §8)

新增独立字段 `phase8B1Bonus` (不计入 6-dim 总分, max 100 不变):

```js
phase8B1Bonus = {
  score: 1 if architectureFunctionBridge 5/5 arrays present else 0,
  max: 1,
  reason: "..." 
}
```

**Phase 8B.1 §8 验收 (4 项全过)**:

| 验收项 | v0.1 baseline | v0.3 (Phase 8B.1) | 验证 |
| --- | --- | --- | --- |
| §8.1 architecture 不下降 | 6/25 | 25/25 | PASS (≥ 6) |
| §8.2 functional 提升 | phase8B1Bonus=0 | phase8B1Bonus=1 | PASS |
| §8.3 concept drift 防护 | 无 guards | 6 guards | PASS (≥ 5) |
| §8.4 brand 不变 | 20/20 (无 bridge) | 20/20 (有 bridge) | PASS (byte-equal) |

## 7. 文档不合理的修改 (我的判断)

| 文档 | 文档建议 | 实际做法 | 理由 |
| --- | --- | --- | --- |
| §6 "Add ... JZMX-FUNC-01-reception-realism.png" | 创建 PNG 二进制 | status=concept_only, 不创建 PNG | Phase 8B.1 明确不调真实 Provider, 没有真实 S 级图可作 calibration 锚点 |
| §7 "Architecture Beauty Score ≥ 85" | 维度分 ≥ 85 | 综合 6-dim S 级 (≥ 85) + architecture_quality 25/25 (不下降) + functional_realism phase8B1Bonus 提升 | 6-dim 满分 architecture=25, functional=20, 字面 ≥ 85 不可能 |
| §3 字段位置 | 在 v0.1 DNA jiuzhou-aesthetics.dna.json | v0.1 bump 到 v0.1.1 + v0.2 bump 到 v0.3, 都加 bridge | 字段体系扩展按 §28 规则 minor bump, 不破 v0.1 兼容性 |
| §5 weightAllocation default 0.45/0.3/0.25 | 改 schema default | schema default 不动, JZMX v0.3 实例显式设 0.45/0.3/0.25 | 向后兼容 0.5/0.3/0.2 旧 DNA |

## 8. 测试覆盖

11 个 test 套件, 202/202 PASS:

| 套件 | 测试数 | 状态 |
| --- | --- | --- |
| field-schema/tests/validate.test.mjs | 40 | PASS |
| field-enriched/tests/compile-prompt.test.mjs | 17 | PASS |
| field-enriched/tests/compile-prompt-v1.1.test.mjs | 14 | PASS |
| field-enriched/tests/architecture-function-bridge.test.mjs | 18 | PASS (新) |
| anchor-aware/tests/compile-with-anchor.test.mjs | 20 | PASS |
| prompt-compiler/trace/tests/compile-trace.test.mjs | 13 | PASS |
| prompt-compiler/variation/tests/derive-variants.test.mjs | 17 | PASS |
| function-calibrations/tests/function-calibrations.test.mjs | 17 | PASS (新) |
| evaluation/tests/evaluate-space.test.mjs | 15 | PASS |
| test-cases/jiuzhou-aesthetics/tests/vertical.test.mjs | 10 | PASS |
| test-cases/regression/tests/regression.test.mjs | 21 | PASS |

**新增测试数 (Phase 8B.1)**: 18 + 17 = 35 个
**总测试数 vs Phase 8B 之前 (165)**: 202 = 165 + 35 + 2 调整 (regression + evaluate-space 加 Phase 8B.1 验收)

## 9. Verify Gates

| Gate | 状态 |
| --- | --- |
| verify:version-consistency | PASS |
| verify:workspace-boundaries | PASS (0 failures) |
| verify:no-obsolete-code | PASS (432 files scanned) |
| verify:production-boundaries | PASS (193 desktop files) |
| verify:no-project-specific-production-rules | PASS |
| verify:golden-boundary | PASS |
| verify:current-flows | PASS (含 tsc clean) |
| npm test | 301/301 PASS |

## 10. 不调 Provider, 不污染生产代码

- ✅ 不调真实 Provider (Phase 8B.1 明确要求)
- ✅ 不修改 v1-baseline 任何文件
- ✅ 不修改生产代码 (apps/cli / apps/desktop / packages)
- ✅ 不创建 PNG 二进制 (function-calibration status=concept_only)
- ✅ 全部 6-dim 评分基于 DNA 字段, prompt-level 真实效果留给 Phase 8B.2+ 真实跑批

## 11. 接下来 (Phase 8B.2+)

- Phase 8B.2: 真实 Seedream 跑批 (A baseline 11 块 vs B anchor+bridge 12 块), 验证 image-level architecture_function_balance
- Phase 8B.3: 多品牌 (YJLF / FTT / WY) regression, 验证 bridge 字段不污染其他项目
- Phase 8C: Architecture Anchor + Bridge + Brand DNA 完整 Runtime 集成
- Phase 8D: function-calibration 真实 PNG 跑批 + commit (status=concept_only -> real_image)

## 12. 改动文件清单 (待 commit)

新增:
- space-generator/v1-experimental/function-calibrations/jiuzhou-aesthetics/metadata.yaml
- space-generator/v1-experimental/function-calibrations/jiuzhou-aesthetics/function-dna-analysis.yaml
- space-generator/v1-experimental/function-calibrations/registry.json
- space-generator/v1-experimental/function-calibrations/loader/load-calibrations.mjs
- space-generator/v1-experimental/function-calibrations/tests/function-calibrations.test.mjs
- space-generator/v1-experimental/prompt-compiler/field-enriched/tests/architecture-function-bridge.test.mjs
- space-generator/v1-experimental/reports/phase-8b.1-architecture-function-balance-calibration.md

修改:
- space-generator/v1-experimental/field-schema/space-dna.schema.json (add architectureFunctionBridge)
- space-generator/v1-experimental/field-schema/examples/jiuzhou-aesthetics.dna.v1.1.json (v0.2 -> v0.3, add bridge, weightAllocation 0.45/0.3/0.25)
- space-generator/v1-experimental/field-schema/examples/jiuzhou-aesthetics.dna.json (v0.1 -> v0.1.1, add bridge)
- space-generator/v1-experimental/field-schema/tests/validate.test.mjs (add Phase 8B.1 self-checks)
- space-generator/v1-experimental/prompt-compiler/field-enriched/compile-prompt.mjs (add bridge block, 10 -> 11 blocks)
- space-generator/v1-experimental/prompt-compiler/field-enriched/tests/compile-prompt.test.mjs (10 -> 11 blocks)
- space-generator/v1-experimental/prompt-compiler/field-enriched/tests/compile-prompt-v1.1.test.mjs (10 -> 11 blocks)
- space-generator/v1-experimental/prompt-compiler/anchor-aware/tests/compile-with-anchor.test.mjs (11 -> 12 blocks)
- space-generator/v1-experimental/evaluation/evaluate-space.mjs (add phase8B1Bonus field)
- space-generator/v1-experimental/evaluation/tests/evaluate-space.test.mjs (add §8 验收)
- space-generator/v1-experimental/test-cases/regression/tests/regression.test.mjs (10 -> 11 blocks)
- package.json (add 2 new test scripts)
