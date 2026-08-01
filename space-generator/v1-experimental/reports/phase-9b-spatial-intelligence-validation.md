# Phase 9B — Spatial Intelligence Pipeline Validation Report

- **Generated**: 2026-08-01
- **Phase**: 9B (Space Generator v1.1)
- **Trigger**: 5.0.0-rc.1
- **Status**: PARTIAL (text-level A/B complete; image-level requires user-authorized real-provider smoke)
- **Tests**: 402/402 space-dna tests PASS, 301/301 npm test PASS, 7 verify gates PASS, verify:current-flows PASS, tsc clean.

## 0. 背景

Phase 9A.1 / 9A.2 / 9A.3 完成 Spatial Intelligence reasoning 链路:
- 9A.1: spatialIntentDna schema (5 string 字段)
- 9A.2: Spatial Intent Compiler (5 字段编译输出, 29 tests)
- 9A.3: Architecture Bridge (5 字段 architectureLanguage, 33 tests)

Phase 9B 验证完整推理链路是否提升 brand-to-space 翻译:
- Mode A (Previous Pipeline) = compileRuntimePrompt (Phase 8C, 12 块 anchor-aware)
- Mode B (Spatial Intelligence Pipeline) = Mode A + spatial_intent + architecture_language 块

## 1. 改动一览 (Phase 9B)

| 改动 | 状态 |
| --- | --- |
| 新增 `spatial-intelligence-pipeline/` 目录 | compile-spatial-intelligence-prompt.mjs + 2 个 block compiler + tests/ + bin/ + results/ |
| Mode A wrapper | `compileRuntimePromptModeA(dna, options)` 显式声明 mode='A' |
| Mode B wrapper | `compileRuntimePromptWithSpatialIntelligence(dna, spatialIntentDna, options)` 返回 mode='B' + 14 块 prompt |
| 2 个 block compiler | `compileSpatialIntentBlock` (从 compiledSpatialIntent) + `compileArchitectureLanguageBlock` (从 architectureLanguage) |
| Text-level A/B runner | `bin/run-ab-comparison.mjs` 自动跑 3 brand, 写 results/ |
| Real-provider smoke runner | `apps/desktop/scripts/phase-9b/` (phase-9b-spatial-intelligence-smoke.ts + run-phase-9b-smoke.mjs + README) |
| 27 个新测试 | 覆盖 Mode A / Mode B wrapper / 3 brand differentiation / §10 期望关键词 / 块结构 / no provider / no baseline modification |
| package.json scripts: `test:space-spatial-intelligence-pipeline` | 独立运行新测试套件 |
| 3 brand text-level A/B results | results/{brand}/{mode-A,mode-B}.prompt.md + ab-comparison.json + ab-comparison-aggregate.json + ab-comparison-report.md |

## 2. Module 结构

```
spatial-intelligence-pipeline/
├── compile-spatial-intelligence-prompt.mjs   # Mode A + Mode B wrapper
├── compile-spatial-intent-block.mjs          # spatial_intent block compiler
├── compile-architecture-language-block.mjs   # architecture_language block compiler
├── bin/
│   └── run-ab-comparison.mjs                 # 3 brand A/B 对比 runner (text-level)
├── tests/
│   └── compile-spatial-intelligence-prompt.test.mjs  # 27 tests
├── results/
│   ├── ab-comparison-aggregate.json
│   ├── ab-comparison-report.md
│   ├── jiuzhou-aesthetics/
│   │   ├── mode-A.prompt.md
│   │   ├── mode-B.prompt.md
│   │   └── ab-comparison.json
│   ├── feng-tang-tang/...
│   └── yi-ji-liang-fang/...
```

```
apps/desktop/scripts/phase-9b/
├── phase-9b-spatial-intelligence-smoke.ts    # electron entry (real-provider)
├── run-phase-9b-smoke.mjs                    # esbuild bundle + electron runner
└── README.md                                  # usage + env vars + output
```

## 3. Mode A vs Mode B (text-level)

| Brand | Mode A blocks | Mode A chars | Mode B blocks | Mode B chars | Char diff | Char ratio |
| --- | --- | --- | --- | --- | --- | --- |
| jiuzhou-aesthetics | 12 | 7255 | 14 | 8698 | +1443 | +19.9% |
| feng-tang-tang | 12 | 5281 | 6634 | +1353 | +25.6% |
| yi-ji-liang-fang | 12 | 5401 | 14 | 6872 | +1471 | +27.2% |

Mode B 块顺序: `task / spatial_intent / architecture_language / architecture_context / architecture_function_bridge / architectural_concept / architecture_dna / brand_translation / functional_requirement / material / lighting / composition / rendering / negative_constraints`

Mode B 新增 2 块 (在 task 之后插入):
- `spatial_intent` (Phase 9A.2): experienceGoal + spatialStrategy
- `architecture_language` (Phase 9A.3): 5 字段 high-level 方向

## 4. Validation Objectives (§3)

- **Q1 (Spatial Intent → brand-to-space)**: Mode B 包含 compiledSpatialIntent (Phase 9A.2), 把 5 字段体验目标翻译给模型. Mode A 无.
- **Q2 (Architecture Bridge → architectural reasoning)**: Mode B 包含 architectureLanguage (Phase 9A.3), 5 字段 high-level 方向. Mode A 无.
- **Q3 (Function Bridge → commercial realism)**: 两者都有 architecture_function_bridge (Phase 8B.1), 一致.
- **Q4 (完整链路减少 generic AI 空间生成)**: 需 image-level smoke 人工对比两张图. 留待 user-authorized smoke.

## 5. 3 brand 期望关键词 (§10)

| Brand | Mode B 包含 | 验证 |
| --- | --- | --- |
| JZMX | continuous space / soft boundary / controlled transparency | ✓ |
| FTT | human scale / visible process / warm interaction | ✓ |
| YJLF | layered privacy / natural materials / calm circulation | ✓ |

3 brand 各自 distinct experienceGoal, spatialPrinciples 不重叠 (jz: continuous space, ft: human scale, yj: layered privacy).

## 6. Layer Boundary (§9)

- Mode B CAN: 转换 spatial intent 到 architecture language, 输出 14 块编译 prompt
- Mode B CANNOT: 调用 Provider, 选择具体 anchor, 复制参考图片

无 Provider 调用 (无 fetch / http / LLM imports).
不动 baseline (compileFieldEnrichedPrompt 100% 不变, 跟 Phase 8A/8B.1/8C 一致).
不污染 v1-baseline (改动只在 v1-experimental/spatial-intelligence-pipeline/ + apps/desktop/scripts/phase-9b/).

## 7. Success Criteria (§7)

- **Architecture**: 需 image-level smoke 人工对比两张图. 留待 user-authorized smoke.
- **Brand**: Mode B 保留 architectureFunctionBridge (Phase 8B.1), 不降低 Brand Integration 评分. 需 image-level 验证.
- **Function**: 同上, 需 image-level 验证.
- **Intent**: Mode B 显式包含 spatial_intent 块 (Phase 9A.2 编译), Intent Alignment 应提升. 需 image-level 验证.
- **Generalization**: 3 brand 各自 distinct, 验证已通过 (3 brand 期望关键词不重叠).

## 8. Real-Provider Smoke (image-level)

image-level smoke 由 `apps/desktop/scripts/phase-9b/` 提供, 跑完后保存到 `space-generator/v1-experimental/validation-results/phase-9B/{brand}/`:

```
{brand}/
├── mode-A/run.json / prompt.md / image.png
├── mode-B/run.json / prompt.md / image.png
└── evaluation-report.md (含 6-dim 评分模板)
```

**跑法**:

```powershell
$env:MASTERPIECE_SMOKE_PROJECT_ID = "..."        # 来自 Documents\Masterpiece OS Data\projects
$env:MASTERPIECE_SMOKE_TEXT_PROFILE_ID = "..."   # 来自 AppData\Roaming\masterpiece-os-desktop\credentials
$env:MASTERPIECE_SMOKE_IMAGE_PROFILE_ID = "..."  # 同上
$env:MASTERPIECE_SMOKE_BRAND_KEY = "jiuzhou-aesthetics" | "feng-tang-tang" | "yi-ji-liang-fang"
$env:MASTERPIECE_SMOKE_DNA_PATH = "D:\...\field-schema\examples\jiuzhou-aesthetics.dna.json"
$env:MASTERPIECE_SMOKE_SPATIAL_INTENT_PATH = "D:\...\field-schema\examples\jiuzhou-aesthetics.spatial-intent.json"

cd D:\Masterpiece-OS\apps\desktop
node scripts/phase-9b/run-phase-9b-smoke.mjs
```

完整说明见 `apps/desktop/scripts/phase-9b/README.md`.

## 9. Completion Criteria (§9) 状态

| Criteria | 状态 |
| --- | --- |
| Real Provider tests completed | ⏳ 需 user 跑 smoke (3 brand 至少各 1 轮) |
| Three brands validated | ⏳ text-level 完成, image-level 需 smoke |
| A/B comparison report generated | ✓ results/ab-comparison-report.md |
| Intent Alignment evaluated | ⏳ 需 smoke + 人工 6-dim 评分 |
| No regression detected | ✓ baseline 行为 100% 不变 (compileFieldEnrichedPrompt 11 块) |
| Decision made for Phase 9C | ⏳ 需 image-level smoke 结果 |

## 10. Test Coverage

- 27 个新测试, 全部 PASS:
  - 4 preconditions: 3 个 module exports / 3 brand DNA + spatial intent example files 存在
  - 3 Mode A wrapper: 12 blocks / mode='A' / 不含 spatial_intent+architecture_language
  - 5 Mode B wrapper: 14 blocks / mode='B' / 块顺序正确 / runtime path / compiledSpatialIntent+architectureLanguage
  - 4 3 brand independence: experienceGoal distinct / spatialPrinciples 不重叠 / spatial_intent block text distinct / architecture_language block text distinct
  - 3 §10 Multi-brand Validation expected keywords: JZMX/FTT/YJLF Mode B 包含期望关键词
  - 1 块结构: Mode B 14 block ids 全部正确
  - 3 No Provider Calls: 3 个 .mjs 文件无网络
  - 2 No Baseline Modification: compileFieldEnrichedPrompt 11 块不变 + Mode B 保留全部 12 baseline
  - 2 Input validation: throws on null dna / throws on null spatialIntentDna
  - 1 不修改 baseline (额外): 重新 import compileFieldEnrichedPrompt 验证 11 块

## 11. Files

新增 (3 + 3 + 6 = 12):
- `space-generator/v1-experimental/spatial-intelligence-pipeline/compile-spatial-intelligence-prompt.mjs`
- `space-generator/v1-experimental/spatial-intelligence-pipeline/compile-spatial-intent-block.mjs`
- `space-generator/v1-experimental/spatial-intelligence-pipeline/compile-architecture-language-block.mjs`
- `space-generator/v1-experimental/spatial-intelligence-pipeline/bin/run-ab-comparison.mjs`
- `space-generator/v1-experimental/spatial-intelligence-pipeline/tests/compile-spatial-intelligence-prompt.test.mjs`
- `space-generator/v1-experimental/spatial-intelligence-pipeline/results/ab-comparison-aggregate.json`
- `space-generator/v1-experimental/spatial-intelligence-pipeline/results/ab-comparison-report.md`
- `space-generator/v1-experimental/spatial-intelligence-pipeline/results/{jiuzhou-aesthetics,feng-tang-tang,yi-ji-liang-fang}/mode-{A,B}.prompt.md`
- `space-generator/v1-experimental/spatial-intelligence-pipeline/results/{jiuzhou-aesthetics,feng-tang-tang,yi-ji-liang-fang}/ab-comparison.json`
- `apps/desktop/scripts/phase-9b/phase-9b-spatial-intelligence-smoke.ts`
- `apps/desktop/scripts/phase-9b/run-phase-9b-smoke.mjs`
- `apps/desktop/scripts/phase-9b/README.md`
- `space-generator/v1-experimental/reports/phase-9b-spatial-intelligence-validation.md` (本文件)

修改 (1 + 3 timestamp reports = 4):
- `package.json` (新增 `test:space-spatial-intelligence-pipeline` script)
- 3 个 timestamp-only report JSON (test rerun 自动生成)

## 12. 累计测试状态

| 测试套件 | 状态 |
| --- | --- |
| 18 space-dna test suites | 402/402 PASS (Phase 1-9A.3 375 + Phase 9B 新增 27) |
| npm test (root + Desktop 公共契约) | 301/301 PASS |
| verify:version-consistency | PASS |
| verify:workspace-boundaries | PASS |
| verify:no-obsolete-code | PASS |
| verify:production-boundaries | PASS |
| verify:no-project-specific-production-rules | PASS |
| verify:golden-boundary | PASS |
| verify:current-flows | PASS (tsc clean) |

## 13. 关键决策 (Phase 9B)

- **独立 module 目录 spatial-intelligence-pipeline/**: 不修改现有 field-schema / prompt-compiler / evaluation / spatial-intent-compiler / architecture-bridge 任何文件.
- **Mode A wrapper 仅作显式 mode='A' 标记**: Mode A 实现仍然 = compileRuntimePrompt, 不重写 baseline.
- **Mode B 在 task 之后插入 2 个新块**: 跟 Phase 8A 一样的策略, 排在 architecture_context 之前.
- **3 brand 期望关键词覆盖**: JZMX continuous space / FTT human scale / YJLF layered privacy, 验证 Mode B 编译后都出现.
- **Text-level A/B 自动跑**: 3 brand 编译 Mode A / Mode B, 写 results/, 跑 bin/run-ab-comparison.mjs 即可.
- **Image-level smoke 单独 runner**: 必须 user-authorized + profile IDs, 在 apps/desktop/scripts/phase-9b/.
- **不调真实 Provider**: spatial-intelligence-pipeline/ 全部 deterministic, 无网络依赖.
- **不动 baseline**: compileFieldEnrichedPrompt 11 块, compileRuntimePrompt 12 块, 都 100% 不变.

## 14. 下一 Phase: Phase 9C — Spatial Intelligence Runtime Integration (§10)

Phase 9B 完成 text-level A/B 验证. Phase 9C 把 Spatial Intelligence reasoning 从 experimental pipeline
挪到 production runtime.

```
Brand Understanding
↓
Spatial Intent Reasoning
↓
Architecture Intelligence
↓
Functional Translation
↓
Prompt Compiler
↓
Generation
↓
Evaluation
```

需要 user 跑 real-provider smoke 后, 才能决定是否进入 Phase 9C.
