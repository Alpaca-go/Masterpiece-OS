# Phase 9A.3 — Architecture Bridge Report

- **Generated**: 2026-08-01
- **Phase**: 9A.3 (Space Generator v1.1)
- **Trigger**: 5.0.0-rc.1
- **Status**: COMPLETE (bridge layer, no Prompt Runtime modification)
- **Tests**: 375/375 space-dna tests PASS (Phase 1-9A.3), 301/301 npm test PASS, 7 verify gates PASS, verify:current-flows PASS, tsc clean.

## 0. 背景

Phase 9A.1 定义了 Spatial Intent Schema (5 字段). Phase 9A.2 创建了 Spatial Intent Compiler, 把 spatialIntentDna 编译为 compiledSpatialIntent (5 字段).

Phase 9A.3 创建 **Architecture Bridge**: 把 compiledSpatialIntent 编译为 architectureLanguage (5 字段 + optional weight). 这是 Brand Meaning -> Architecture Language 链路的关键一步.

**位置 (§3)**: Brand DNA -> Spatial Intent -> Spatial Intent Compiler -> **Architecture Bridge** -> Architecture Language -> Architecture Anchor -> Function Bridge -> Prompt Compiler

**核心原则 (§2)**: Architecture Bridge 是 reasoning bridge, 不是 style generator / image reference matcher / direct prompt generator / architecture asset selector.

## 1. 改动一览 (Phase 9A.3)

| 改动 | 状态 |
| --- | --- |
| 新增 `architecture-bridge/` 目录 | compile-architecture-bridge.mjs + bridge-rules/ + schemas/ + tests/ |
| 3 个 bridge rules 文件 | emotion-to-space.json / strategy-to-architecture.json / architecture-principles.json |
| Architecture Language schema | 5 字段 (required) + weight (optional, default 0.25) |
| compileArchitectureBridge() 函数 | 确定性输出 (同输入 -> 同输出) |
| compileArchitectureBridgeForBrand() 链式入口 | brandKey -> spatialIntentDna -> compiledSpatialIntent -> architectureLanguage |
| 33 个新测试 | 覆盖 schema / 3 brand differentiation / 期望关键词 / leakage / stability / custom input / no provider / no Prompt Runtime |
| package.json scripts: `test:space-architecture-bridge` | 独立运行新测试套件 |

## 2. Module 结构 (§4)

```
architecture-bridge/
├── compile-architecture-bridge.mjs       # Bridge 入口 (deterministic rule matching)
├── bridge-rules/
│   ├── emotion-to-space.json             # primaryEmotion / experienceGoal 关键词 -> spatialPrinciples
│   ├── strategy-to-architecture.json     # spatialStrategy 关键词 -> architecturalCharacteristics / materialDirection / lightDirection / spatialOrganization
│   └── architecture-principles.json      # 3 brand 期望的 spatialPrinciples 关键词 (Phase 9A.3 §10)
├── schemas/
│   └── architecture-language.schema.json
└── tests/
    └── compile-architecture-bridge.test.mjs  # 33 tests
```

## 3. Bridge 输入/输出 (§5 + §6)

**Input**: compiledSpatialIntent (5 字段, Phase 9A.2)

**Output**: architectureLanguage (5 字段 + optional weight):

```json
{
  "spatialPrinciples": [],
  "architecturalCharacteristics": [],
  "materialDirection": [],
  "lightDirection": [],
  "spatialOrganization": [],
  "weight": 0.25
}
```

## 4. Field 定义 (§7)

- **spatialPrinciples**: 空间原则, e.g. "gradual transition / controlled openness / balanced privacy". 禁止: 直接指定装饰元素.
- **architecturalCharacteristics**: 建筑特征, e.g. "continuous spatial flow / soft boundary / quiet hierarchy". 不是: 某种具体造型 / 某个参考图复制.
- **materialDirection**: 材料方向 (高层), e.g. "calm mineral texture / natural translucent surface". 错误: 使用某品牌同款石材.
- **lightDirection**: 光环境逻辑, e.g. "indirect illumination / soft natural transition". 禁止: 固定颜色灯光.
- **spatialOrganization**: 空间组织, e.g. "gradual privacy transition / clear user circulation".
- **weight** (optional): Phase 9B 集成时 architectureLanguage 对 prompt 编译的强调强度, default 0.25.

## 5. Intent → Architecture Rules (§8)

Phase 9A.3 §8 三个 example 的 mapping:

| Intent | Architecture |
| --- | --- |
| 安心 (calm) | soft boundary, controlled visibility, slow transition |
| 烟火感 (homespun) | human scale, visible process, warm spatial interaction |
| 东方调养 (eastern care) | layered privacy, natural material relationship, quiet circulation |

## 6. Layer Boundary (§9)

Bridge 回答: "什么建筑原则支持这种体验" (Phase 9A.3 §9 ArchitectureBridgeLayer)

- **Bridge CAN**: convert spatial intent to architecture principles (high-level), output 5 fields
- **Bridge CANNOT**: select specific anchor (e.g. JZMX-ARCH-01), describe specific decoration elements, copy specific reference image, generate prompt

3 brand compiled output 全部不含:
- anchor names (JZMX-ARCH- / FTT-ARCH- / YJLF-ARCH-)
- 具体 material (mineral_plaster / frosted_glass 等 10 个)
- 具体 architecture_specific (层叠半透明介质 / membrane ceiling / paper screen 等 7 个)

## 7. Multi-brand Validation (§10)

3 brand 各自生成 distinct architectureLanguage, 覆盖 §10 期望关键词:

| Brand | §10 Expected | Output 包含 |
| --- | --- | --- |
| JZMX (medical_aesthetics) | continuous space, soft boundary, controlled transparency | ✓ all 3 |
| FTT (restaurant) | human scale, visible process, warm interaction | ✓ all 3 |
| YJLF (health_management) | layered privacy, natural materials, calm circulation | ✓ all 3 |

3 brand spatialPrinciples overlap ratio < 0.5. architecturalCharacteristics / materialDirection / lightDirection / spatialOrganization 各自 distinct.

## 8. Validation Criteria (§11)

Phase 9A.3 §11 验收 4 项:

1. **Intent preservation**: Architecture Language 包含 §10 期望关键词 (3 brand 全部).
2. **Brand independence**: 3 brand 各自 distinct, overlap < 50%.
3. **No anchor leakage**: 3 brand 全部不含 anchor name / 具体 material / 具体 architecture_specific (FORBIDDEN_LEAKAGE 列表).
4. **No provider dependency**: compile-architecture-bridge.mjs 无 fetch / http / https imports, 无 LLM/Provider 引用, 不调用 compileFieldEnrichedPrompt / compileRuntimePrompt.

## 9. Position in Runtime Pipeline (§3)

```
Brand DNA
↓
Spatial Intent
↓
Spatial Intent Compiler        (Phase 9A.2)
↓
Architecture Bridge            (Phase 9A.3 — 本次新增)
↓
Architecture Language
↓
Architecture Anchor
↓
Architecture Function Bridge
↓
Prompt Compiler
```

## 10. Phase 9A.3 vs Phase 8D architecture-language

| Layer | Phase 8D architecture-language/registry.json | Phase 9A.3 architecture-bridge |
| --- | --- | --- |
| 用途 | industryIndependent 4-class 分类 (organic-flow / translucent-boundary / soft-light-system / material-continuity) | per-DNA 编译结果 (5 字段 high-level direction) |
| 输出 | 静态 4 选 1 分类 | 5 字段 dynamic 数组 |
| 输入 | brand DNA category | compiledSpatialIntent (Phase 9A.2) |
| 关系 | 并存, 不同层 | 并存, 不同层 |

两者不冲突: 4 类是 industryIndependent 分类, 5 字段是 per-DNA 编译输出, 同时存在 architecture-language layer 增强.

## 11. Key Design Decisions

- **独立 module architecture-bridge/**: 不修改现有 field-schema / prompt-compiler / evaluation / spatial-intent-compiler 任何文件, mirror Phase 9A.2 模式.
- **3 bridge rules 文件**: emotion-to-space / strategy-to-architecture / architecture-principles, 第一个匹配的 rule 胜出, fallback rule 兜底 (matchAny=true). 优先 non-fallback rule, 避免 fallback 污染 output.
- **3 brand differentiation via experienceGoal + spatialStrategy matching**: 每个 brand 的 experienceGoal 关键词唯一, 不会跨 brand 误匹配.
- **optional weight (default 0.25)**: 与 Phase 8B.1 architectureFunctionBridge.weightBoost 对齐, 为 Phase 9A.4 / Phase 9B 集成准备.
- **deterministic 输出**: 同输入 -> 同输出, §10 Stability 10 次编译稳定.
- **不调真实 Provider**: compileArchitectureBridge 是 deterministic rule matching, 无网络依赖.
- **不修改 Prompt Runtime**: module 只导出 compileArchitectureBridge + compileArchitectureBridgeForBrand, 不导出 prompt 编译相关.
- **不污染 v1-baseline**: 改动只在 v1-experimental/architecture-bridge/.

## 12. Test Coverage

- 33 个新测试, 全部 PASS:
  - 3 preconditions: schema / module exports / 3 bridge rules files 存在
  - 5 §11.1 bridge module: 5 字段 + weight / output validates / 5 array 字段非空 / weight default 0.25 / weight 可通过 options 覆盖
  - 5 §10 Brand independence: spatialPrinciples overlap<50% / architecturalCharacteristics distinct / materialDirection distinct / lightDirection distinct / spatialOrganization distinct
  - 3 §10 Multi-brand Validation expected keywords: JZMX 包含 continuous space / soft boundary / controlled transparency, FTT 包含 human scale / visible process / warm interaction, YJLF 包含 layered privacy / natural materials / calm circulation
  - 9 §10 No Architecture Leakage: 3 brand × (无 anchor name / 无 material / 无 architecture_specific)
  - 2 §10 Stability: 10 次 JZMX 编译稳定 / 3 brand 各 5 次稳定
  - 3 Custom compiledSpatialIntent: 自定义编译 / throws on null / throws on missing field
  - 1 §11.4 No Provider Calls: 无 fetch / http / https imports
  - 2 §11.5 No Prompt Runtime Modification: module 不导出 prompt 编译 / 不调用 compileFieldEnrichedPrompt

## 13. Files

新增 (3 + 4 = 7):
- `space-generator/v1-experimental/architecture-bridge/compile-architecture-bridge.mjs`
- `space-generator/v1-experimental/architecture-bridge/bridge-rules/emotion-to-space.json`
- `space-generator/v1-experimental/architecture-bridge/bridge-rules/strategy-to-architecture.json`
- `space-generator/v1-experimental/architecture-bridge/bridge-rules/architecture-principles.json`
- `space-generator/v1-experimental/architecture-bridge/schemas/architecture-language.schema.json`
- `space-generator/v1-experimental/architecture-bridge/tests/compile-architecture-bridge.test.mjs`
- `space-generator/v1-experimental/reports/phase-9a.3-architecture-bridge.md` (本文件)

修改 (1 + 3 timestamp reports = 4):
- `package.json` (新增 `test:space-architecture-bridge` script)
- 3 个 timestamp-only report JSON (test rerun 自动生成, 与 Phase 9A.2 commit 模式一致)

## 14. 累计测试状态

| 测试套件 | 状态 |
| --- | --- |
| 17 space-dna test suites | 375/375 PASS (Phase 1-9A.2 342 + Phase 9A.3 新增 33) |
| npm test (root + Desktop 公共契约) | 301/301 PASS |
| verify:version-consistency | PASS |
| verify:workspace-boundaries | PASS |
| verify:no-obsolete-code | PASS |
| verify:production-boundaries | PASS |
| verify:no-project-specific-production-rules | PASS |
| verify:golden-boundary | PASS |
| verify:current-flows | PASS (tsc clean) |

## 15. 下一 Phase: Phase 9B — Real Provider Validation (§12)

Phase 9A.3 完成 Spatial Intent -> Architecture Language 的推理链路. Phase 9B 用真实 Provider 验证:

```
Spatial Intent
↓
Architecture Bridge
↓
Architecture Anchor
↓
Image Generation
```

是否真正提升空间设计质量.

最终目标: 从 "根据品牌生成空间" 升级为 "理解品牌意图, 并推导空间设计逻辑."

不调真实 Provider, 不污染生产代码, 不动 v1-baseline.
375/375 space-dna 测试 + 301/301 npm test + 7 verify gates + verify:current-flows + tsc clean 全过.
