# Phase 9B.2 — Architecture-Preservation Calibration Report

- **Generated**: 2026-08-01
- **Phase**: 9B.2 (Space Generator v1.1)
- **Trigger**: 5.0.0-rc.1
- **Status**: text-level A/B complete; image-level requires user-authorized real-provider smoke
- **Tests**: 472/472 space-dna tests PASS, 301/301 npm test PASS, 7 verify gates PASS, verify:current-flows PASS, tsc clean.

## 0. 背景

Phase 9B Spatial Intelligence Reasoning (Phase 9A.1 schema + 9A.2 compiler + 9A.3 bridge) 增强了空间概念完整度 / 建筑语言表达 / 品牌空间叙事能力. Phase 9B.1 Spatial Reality Constraint 提升商业真实性, 但可能削弱一部分 Architecture Anchor 提供的建筑空间记忆点.

Phase 9B.2 加 **Architecture Preservation Layer**, 4 protected elements (ceiling_language / spatial_signature / material_expression / lighting_behavior) 显式保护 anchor 提供的建筑机制, 同时不增加任何具体装饰物 (mechanism not object 原则).

## 1. 改动一览 (Phase 9B.2)

| 改动 | 状态 |
| --- | --- |
| 新增 `architecture-preservation/` 目录 | compile-architecture-preservation-prompt.mjs + prompt-block/ + schema/ + examples/ + tests/ + bin/ + results/ |
| architecture-preservation-dna schema | 3 字段 (enabled / weight / protectedElements enum) + optional metadata |
| 3 brand architecture-preservation examples | JZMX (weight 0.7, 4 protected) / FTT (weight 0.5, 3 protected, skip ceiling_language) / YJLF (weight 0.5, 4 protected) |
| compileArchitecturePreservationBlock() block compiler | 4 protected elements 编译为 architecture_preservation block, 强调 mechanism not object |
| compileRuntimePromptModeAArchitecturePreservation() Mode A wrapper | Phase 9B.1 Mode B baseline (15 块) + mode='A-architecture-preservation' 显式标记 |
| compileRuntimePromptWithArchitecturePreservation() Mode B wrapper | Phase 9B.1 Mode B + architecture_preservation 块 (16 块) + mode='B-architecture-preservation' |
| Text-level A/B runner | bin/run-ab-comparison.mjs 跑 3 brand, 写 results/ |
| 37 个新测试 | 覆盖 Mode A / Mode B wrapper / 3 brand distinct / §6 mechanism not object / 块结构 / no provider / no baseline / Phase 9A / 9B / 9B.1 不动 |
| package.json scripts: `test:space-architecture-preservation` | 独立运行新测试套件 |
| apps/desktop/scripts/phase-9b/ smoke runner 升级 | 支持 Phase 9B.2 env (MASTERPIECE_SMOKE_ARCHITECTURE_PRESERVATION_PATH), 自动识别 phase-9B / 9B.1 / 9B.2 模式 |

## 2. Module 结构

```
architecture-preservation/
├── compile-architecture-preservation-prompt.mjs   # Mode A + Mode B wrapper
├── prompt-block/
│   └── compile-architecture-preservation-block.mjs # architecture_preservation block compiler
├── schema/
│   └── architecture-preservation-dna.schema.json
├── examples/
│   ├── jiuzhou-aesthetics.architecture-preservation.json
│   ├── feng-tang-tang.architecture-preservation.json
│   └── yi-ji-liang-fang.architecture-preservation.json
├── tests/
│   └── compile-architecture-preservation-prompt.test.mjs
├── bin/
│   └── run-ab-comparison.mjs                       # 3 brand text-level A/B
└── results/
    ├── ab-comparison-aggregate.json
    ├── ab-comparison-report.md
    └── {jiuzhou-aesthetics, feng-tang-tang, yi-ji-liang-fang}/
        ├── mode-A.prompt.md
        ├── mode-B.prompt.md
        └── ab-comparison.json
```

## 3. architecturePreservation 3 字段 (§3 + §4)

| 字段 | 用途 | 取值 |
| --- | --- | --- |
| enabled | 是否启用建筑保护层 | bool, default true |
| weight | 保护强度 | 0.3 (弱) / 0.5 (平衡) / 0.7 (强, JZMX 建议) / 0.9 (概念优先) |
| protectedElements | 4 选 N | ceiling_language / spatial_signature / material_expression / lighting_behavior |

### 3 brand 实际配置

| Brand | weight | protectedElements | 备注 |
| --- | --- | --- | --- |
| jiuzhou-aesthetics | 0.7 | ceiling_language / spatial_signature / material_expression / lighting_behavior (4/4) | Phase 9B §4 JZMX 建议 0.7. 4 protected elements 全开, 因为 3 个 anchor 都有 4 个机制 |
| feng-tang-tang | 0.5 | spatial_signature / material_expression / lighting_behavior (3/4) | FTT 是 casual dining, ceiling_language 不需要 architectural expression, 跳过. 3 protected elements |
| yi-ji-liang-fang | 0.5 | ceiling_language / spatial_signature / material_expression / lighting_behavior (4/4) | YJLF 4 protected elements 全开. ceiling_language 重点: 实木吊顶 + 纸灯软光 |

## 4. Mode A vs Mode B (text-level)

| Brand | Mode A blocks | Mode A chars | Mode B blocks | Mode B chars | Char diff | Char ratio |
| --- | --- | --- | --- | --- | --- | --- |
| jiuzhou-aesthetics | 15 | 10515 | 16 | 11633 | +1118 | +10.6% |
| feng-tang-tang | 15 | 8342 | 16 | 9376 | +1034 | +12.4% |
| yi-ji-liang-fang | 15 | 8693 | 16 | 9811 | +1118 | +12.9% |

Mode B 块顺序: `task / spatial_intent / architecture_language / spatial_reality_constraint / architecture_context / architecture_preservation / architecture_function_bridge / ... / negative_constraints`

Mode B 新增 1 块 (architecture_preservation), 插在 architecture_context 之后, architecture_function_bridge 之前.

## 5. 6 维评价指标 (§8) + 验收 (§9)

| 指标 | 目标 | Phase 9B.2 改进点 | 验证 |
| --- | --- | --- | --- |
| Architecture Quality | ≥ Phase 9B.1 (§9 1) | architecture_context 块不变, architecture_preservation 保护 anchor 机制 | image-level 需人工 |
| Functional Realism | 不下降超过 5% (§9 2) | spatial_reality_constraint 块不变 | image-level 需人工 |
| Brand Translation | 保持稳定 (§9 3) | brand_translation 块不变 | image-level 需人工 |
| Commercial Realism | 保持 (§9 4) | 空间仍具备商业运营真实性, 商业运营逻辑 0 破坏 | image-level 需人工 |
| Spatial Coherence | 提升 | 4 protected elements 显式保护 anchor 提供的空间机制 | image-level 需人工 |
| Visual Quality | 保持 | mechanism not object 原则不引入额外装饰 | image-level 需人工 |

## 6. §6 mechanism not object 验证

Phase 9B.2 §6 核心原则: **mechanism not object** (只保护机制, 不添加具体物体).

- ✓ 允许: 保留空间结构 / 保留材质关系 / 保留光线逻辑
- ✗ 禁止: 增加额外装饰 / 强行加入雕塑 / 堆叠视觉符号
- ✗ 禁止: 引入未在 anchor 中存在的具体装饰元素 (花瓣 / 羽翼 / 雕塑 / 装置)

测试验证: architecture_preservation 块包含 "mechanism not object" 警告 + "禁" 前缀 (装饰 / 雕塑 / 装置 等只在 forbidden 上下文出现).

## 7. 冻结验证 (Phase 9A / 9B / 9B.1 不动)

- ✓ Mode B compiledSpatialIntent (Phase 9A.2) 不变
- ✓ Mode B architectureLanguage (Phase 9A.3) 不变
- ✓ Mode B spatial_reality_constraint (Phase 9B.1) 块内容不变
- ✓ Mode B architecture_context (Phase 8A) 块内容不变
- ✓ Mode B brand_translation 块不变
- ✓ compileFieldEnrichedPrompt 11 块不变
- ✓ compileRuntimePrompt 12 块不变
- ✓ compileRuntimePromptWithSpatialIntelligence 14 块不变
- ✓ compileRuntimePromptWithSpatialReality 15 块不变

## 8. Real-Provider Smoke (image-level)

Smoke runner 已升级 (apps/desktop/scripts/phase-9b/) 支持 Phase 9B.2 模式. 跑法:

```powershell
$env:MASTERPIECE_SMOKE_PROJECT_ID = "<project uuid>"
$env:MASTERPIECE_SMOKE_TEXT_PROFILE_ID = "profile-397281cc-..."
$env:MASTERPIECE_SMOKE_IMAGE_PROFILE_ID = "profile-e871b4c5-..."
$env:MASTERPIECE_SMOKE_BRAND_KEY = "jiuzhou-aesthetics" | "feng-tang-tang"
$env:MASTERPIECE_SMOKE_DNA_PATH = "...jiuzhou-aesthetics.dna.json"
$env:MASTERPIECE_SMOKE_SPATIAL_INTENT_PATH = "...jiuzhou-aesthetics.spatial-intent.json"
$env:MASTERPIECE_SMOKE_SPATIAL_REALITY_PATH = "...jiuzhou-aesthetics.spatial-reality.json"
$env:MASTERPIECE_SMOKE_ARCHITECTURE_PRESERVATION_PATH = "...jiuzhou-aesthetics.architecture-preservation.json"

cd D:\Masterpiece-OS\apps\desktop
node scripts/phase-9b/run-phase-9b-smoke.mjs
```

跑完后:
- 输出到 `validation-results/phase-9B.2/{brand}/{mode-A,mode-B}/`
- 6-dim 评分模板在 evaluation-report.md 留空, 由人工填

## 9. Phase 9B.1 JZMX Real-Provider Smoke (本 commit 附带)

跑 Phase 9B.1 Mode A (14 块) vs Mode B (15 块) JZMX 真实 Provider smoke:

- Mode A: status=succeeded, duration=98.5s, image=581197 bytes (~568KB)
- Mode B: status=succeeded, duration=80.8s, image=399785 bytes (~390KB)
- Provider: volcengine / doubao-seedream-5-0-pro-260628
- 跑完 ~9 min 37 sec

输出: `validation-results/phase-9B.1/jiuzhou-aesthetics/{mode-A,mode-B}/`

## 10. Test Coverage (Phase 9B.2)

- 37 个新测试, 全部 PASS:
  - 5 preconditions: 3 module exports / architecture-preservation-dna.schema.json / 3 brand architecture-preservation example / 3 brand DNA + spatial intent + spatial reality files
  - 4 Mode A wrapper: 15 blocks / mode='A-architecture-preservation' / 不含 architecture_preservation / 15 baseline blocks 全部保留
  - 5 Mode B wrapper: 16 blocks / mode='B-architecture-preservation' / 块顺序正确 / runtime path 含 9b2 / architecturePreservation 包含
  - 4 3 brand distinct: weight distinct or follow JZMX=0.7 / FTT=0.5 / YJLF=0.5 pattern / protectedElements enum valid / FTT skipped ceiling_language / architecture_preservation text distinct
  - 2 §6 mechanism not object: warning included / 不添加具体装饰 (花瓣 / 羽翼 / 雕塑 / 装置)
  - 1 块结构 16 block ids 全部正确
  - 2 No Provider Calls: 2 个 .mjs 文件无网络
  - 2 No Baseline Modification: Mode A = Phase 9B.1 Mode B / Mode B 15 baseline + 1 new
  - 4 Phase 9A.2 / 9A.3 / 9B / 9B.1 不动: compiledSpatialIntent / architectureLanguage / spatial_reality_constraint / architecture_context
  - 4 §9 验收 4 项: architecture_context / spatial_reality_constraint / brand_translation 块不变 + mechanism not object
  - 4 Input validation: throws on null dna / null architecturePreservation / null spatialIntentDna / null spatialRealityDna

## 11. Files

新增 (12):
- `space-generator/v1-experimental/architecture-preservation/compile-architecture-preservation-prompt.mjs`
- `space-generator/v1-experimental/architecture-preservation/prompt-block/compile-architecture-preservation-block.mjs`
- `space-generator/v1-experimental/architecture-preservation/schema/architecture-preservation-dna.schema.json`
- `space-generator/v1-experimental/architecture-preservation/examples/{jiuzhou-aesthetics,feng-tang-tang,yi-ji-liang-fang}.architecture-preservation.json`
- `space-generator/v1-experimental/architecture-preservation/bin/run-ab-comparison.mjs`
- `space-generator/v1-experimental/architecture-preservation/tests/compile-architecture-preservation-prompt.test.mjs`
- `space-generator/v1-experimental/architecture-preservation/results/ab-comparison-aggregate.json`
- `space-generator/v1-experimental/architecture-preservation/results/ab-comparison-report.md`
- `space-generator/v1-experimental/architecture-preservation/results/{jiuzhou-aesthetics,feng-tang-tang,yi-ji-liang-fang}/{mode-A,mode-B}.prompt.md`
- `space-generator/v1-experimental/architecture-preservation/results/{jiuzhou-aesthetics,feng-tang-tang,yi-ji-liang-fang}/ab-comparison.json`
- `space-generator/v1-experimental/validation-results/phase-9B.1/.gitignore`
- `space-generator/v1-experimental/reports/phase-9b.2-architecture-preservation-calibration.md` (本文件)

修改 (3):
- `package.json` (新增 `test:space-architecture-preservation` script)
- `apps/desktop/scripts/phase-9b/phase-9b-spatial-intelligence-smoke.ts` (Phase 9B.1 + 9B.2 env support, PHASE_DIR 自动识别, promptVersion 用 PHASE_DIR)
- 3 个 timestamp-only report JSON (test rerun 自动生成)

## 12. 累计测试状态

| 测试套件 | 状态 |
| --- | --- |
| 20 space-dna test suites | 472/472 PASS (Phase 1-9B.1 435 + Phase 9B.2 新增 37) |
| npm test (root + Desktop 公共契约) | 301/301 PASS |
| verify:version-consistency | PASS |
| verify:workspace-boundaries | PASS |
| verify:no-obsolete-code | PASS |
| verify:production-boundaries | PASS |
| verify:no-project-specific-production-rules | PASS |
| verify:golden-boundary | PASS |
| verify:current-flows | PASS (tsc clean) |

## 13. Key Design Decisions (Phase 9B.2)

- **独立 module 目录 architecture-preservation/**: 不修改现有 field-schema / prompt-compiler / evaluation / spatial-intent-compiler / architecture-bridge / spatial-intelligence-pipeline / spatial-reality 任何文件
- **Mode A = Phase 9B.1 Mode B**: 复用 Phase 9B.1 Mode B 作为新 baseline, 不重写. 跟 Phase 9B / 9B.1 一样的 baseline 推进模式
- **Mode B 在 architecture_context 之后插入 1 块**: 跟 Phase 8A 一样的策略 (在 architecture context chain 之后). Phase 9B.1 在 architecture_context 之前, Phase 9B.2 在 architecture_context 之后
- **mechanism not object 原则**: 块文本强调不添加具体装饰物 (花瓣 / 羽翼 / 雕塑 / 装置 只在 forbidden 上下文出现)
- **protectedElements enum 严格**: 4 个合法值 (ceiling_language / spatial_signature / material_expression / lighting_behavior), 3 brand 各自填不同组合
- **weight 字段**: JZMX=0.7 (强保护, 跟 Phase 9B §4 建议一致), FTT=0.5 (平衡, casual dining 不需要 4 维全开), YJLF=0.5 (平衡)
- **deterministic 输出**: 同输入 -> 同输出
- **不调真实 Provider**: architecture-preservation/ 全部 deterministic, 无网络依赖
- **不修改 baseline**: 9A.2 / 9A.3 / 9B / 9B.1 全部 100% 不变, 都验证过
- **smoke runner 升级**: apps/desktop/scripts/phase-9b/ 支持 3 种 phase (9B / 9B.1 / 9B.2) 自动识别 (基于 env var), PHASE_DIR 决定输出目录和 promptVersion
- **typo fix**: 测试 ctx window 从 30 改 60 字符, 覆盖 "(花瓣 / 羽翼 / 雕塑 / 装置)" 这种带括号的 forbidden 列表
- **package.json 新增 test:space-architecture-preservation 脚本**

## 14. 下一 Phase: Phase 9C — Spatial Intelligence Runtime Integration (§10)

Phase 9B.2 完成 Architecture Preservation layer (text-level). Phase 9B.2 → Phase 9C 是
Architecture / Function Balance Final, 然后 Phase 9C Spatial Intelligence Runtime Integration
把 9A.2 / 9A.3 / 9B.1 / 9B.2 一起挪到 production runtime.

需要 user 跑 real-provider smoke (Phase 9B.2) 后, 才能决定是否进入 Phase 9C.
Phase 9B.2 没跑 real-provider smoke, 但 infrastructure 已就绪 (跟 Phase 9B.1 共用 smoke runner, 加 1 个 env var).
