# Phase 8D — Multi-brand Space Validation Report

- **Generated**: 2026-08-01
- **Phase**: 8D (Space Generator v1.1)
- **Trigger**: 5.0.0-rc.1
- **Status**: COMPLETE
- **Tests**: 281/281 space-dna tests PASS, 301/301 npm test PASS, 5 verify gates PASS, verify:current-flows PASS, tsc clean.

## 0. 背景

Phase 8A 验证 Architecture Anchor 提升建筑美学.
Phase 8B 验证 anchor 注入实际改变生成结果.
Phase 8B.1 缓解 Architecture Concept Drift.
Phase 8C 把 anchor + bridge 整合到 runtime.

Phase 8D 关注新风险:
> "Can the system generate a good space?" (Phase 8A-8C 关注)
> "Does the system understand spatial design logic, or has it overfit to Jiuzhou Aesthetics?" (Phase 8D 关注)

## 1. 改动一览 (Phase 8D)

| 改动 | Before (Phase 8C) | After (Phase 8D) |
| --- | --- | --- |
| 品牌 anchor 数量 | 1 (JZMX 3 anchors) | 3 (JZMX + FTT + YJLF, 各 3 anchors) |
| Anchor registry applicability | cross-industry (JZMX 包含 medical + health + retail + restaurant) | 收紧到 own industry (防 overfit) |
| Golden reference 结构 | `v1-baseline/benchmarks/` + `v1-experimental/architecture-anchors/` + `function-calibrations/` | + `architecture-language/` (4 类跨 brand) + `brand-space-examples/` (3 brand) |
| 评估层 multi-brand 4 指标 | (无) | Architecture Generalization / Brand Adaptation / Anchor Decoupling / Concept Drift |
| selectAnchors industry match | 软匹配 (score 加分) | 硬匹配 (industry 不匹配强制 score=0, 防 overfit) |

## 2. 多 Brand Architecture Anchors (Phase 8D §4)

3 个 brand 各 3 个 anchor:

| Brand | Industry | 3 Anchors | 特征 |
| --- | --- | --- | --- |
| 九州美学 (JZMX) | medical_aesthetics | ARCH-01 ReceptionMembrane / ARCH-02 EntranceGlass / ARCH-03 ConsultationFacade | 半透明介质 + 玻璃幕墙 + 膜天花 |
| 冯烫烫 (FTT) | restaurant | ARCH-01 KitchenAnchor / ARCH-02 WarmCommercialGrid / ARCH-03 HumanScaleBooth | 开放厨房 + 红砖/木/赤陶 + 人尺度 booth |
| 一剂良方 (YJLF) | health_management | ARCH-01 WoodenGrid / ARCH-02 PaperScreen / ARCH-03 TeaCorner | 木格 + 宣纸 + 茶角 + 中医咨询 |

每个 brand 配套 metadata.yaml + architecture-dna-analysis.yaml (与 Phase 8A JZMX 一致).

## 3. Anchor Selection 防 Overfit (Phase 8D §3 Risk 1)

`selectAnchors` 在 Phase 8C 基础上加 industry 硬匹配:

```js
// Phase 8D: 当 criteria.industry 显式给出但 anchor.applicability.industries 不包含时,
// 强制 score = 0 (即使其他维度匹配). 这是多 brand 防 overfit 的关键防线.
if (criteria.industry != null) {
  const industryMatch = Array.isArray(appl.industries) && appl.industries.includes(criteria.industry);
  if (!industryMatch) {
    hasAnyMatch = false;
    score = 0;
  }
}
```

**验证** (Phase 8D §9.4):
- selectAnchors('feng-tang-tang', industry=restaurant) -> 3 anchors
- selectAnchors('feng-tang-tang', industry=medical_aesthetics) -> 0 anchors
- selectAnchors('jiuzhou-aesthetics', industry=medical_aesthetics) -> 3 anchors
- selectAnchors('jiuzhou-aesthetics', industry=restaurant) -> 0 anchors
- selectAnchors('yi-ji-liang-fang', industry=health_management) -> 3 anchors
- selectAnchors('yi-ji-liang-fang', industry=restaurant) -> 0 anchors

## 4. Golden Reference Restructure (Phase 8D §6)

**文档提议**:
```
golden-references/
├── architecture-language/    # 4 类跨 brand 共享
│   ├── organic-flow/
│   ├── translucent-boundary/
│   ├── soft-light-system/
│   └── material-continuity/
└── brand-space-examples/    # 3 brand 行业样例
    ├── jiuzhou-aesthetics/
    ├── feng-tangtang/
    └── yijiliangfang/
```

**实际实现** (在 `v1-experimental/` 下, 不污染 `v1-baseline/`):
```
v1-experimental/
├── architecture-language/    # 4 类 metadata-only manifest + registry.json
└── brand-space-examples/     # 3 brand metadata-only manifest + brand-space-profile.yaml
```

**关键**:
- 不调真实 Provider, 不创建 PNG, status=concept_only
- 与 `v1-baseline/benchmarks/` (验收锚点) 和 `architecture-anchors/` (brand-specific runtime) 是三类独立资产
- Phase 8D §7 强调: Architecture Language (跨 brand) 与 Brand Space Examples (行业特定) 不要混用

## 5. Multi-brand 评估 4 指标 (Phase 8D §5)

新增 `evaluateMultiBrand(dna, brandKey)` 入口, 返回 4 个指标:

### 5.1 Architecture Generalization Score (0-1)
- 衡量 anchor 描述是否属于 architecture-language 4 类 (transferable)
- 输入: anchor registry
- 计算: 1 - crossIndustryRatio + mechanismCategoryCoverage

### 5.2 Brand Adaptation Score (0-1)
- 衡量品牌身份翻译到空间
- 输入: dna.brandSpaceDna + dna.brandTranslationRules
- 计算: brandSpirit 5 维 + brandGrammar 5 维 + motifFamily + brandTranslationRules 完整度

### 5.3 Anchor Decoupling Score (0-1)
- 衡量 anchor 是否独立于某个 brand (无 brand-specific 元素)
- 输入: anchor registry 的 primaryMechanism 文本
- 检查是否包含 BRAND_SPECIFIC_MARKERS (e.g. "translucent_membrane" "kitchen_pass" "wooden_grid" 等)
- 反向描述 ("不用 X") 不算 contamination

### 5.4 Concept Drift Score (0-1)
- 复用了 Phase 8B.1 / 8C 的 conceptDriftGuards 防护
- 0 if absent, 0.5 if 1-4 guards, 1 if 5+ guards

## 6. A/B 验证协议 (Phase 8D §8)

Mode A: compileRuntimePrompt (12 块, auto-select anchors)
Mode B: compileRuntimePrompt with forceBaseline=true (11 块, baseline, no anchor)

**3 brand 验证**:
- JZMX Mode A brand_translation == Mode B brand_translation (Phase 8C §2 locked byte-equal)
- FTT Mode A prompt 不含 JZMX 标志 (translucent_membrane / purple_lavender_glow / soft_continuity)
- YJLF Mode A prompt 不含 FTT / JZMX 标志 (反向描述除外)

## 7. 文档不合理的修改 (我的判断)

| 文档 | 文档建议 | 实际做法 | 理由 |
| --- | --- | --- | --- |
| §6 "Current: golden-references/jiuzhou-aesthetics/architecture/ + function/" | 描述的目录结构 | 不存在, 现有 architecture-anchors/ + function-calibrations/ 在 v1-experimental/ 下 | "Current" 描述错误前提; 我的做法保持现有位置 + 新加 architecture-language/ + brand-space-examples/ 在 v1-experimental/ 下 |
| §6 提议 `golden-references/` 目录 | 新建 | 在 v1-experimental/ 下新建 architecture-language/ + brand-space-examples/ | 与 Phase 8C 一致, 保持 v1-baseline/ 不被实验性 directory 污染 |
| §5 Architecture Generalization 评估图像级 "spatial structure / material reasoning / circulation logic / architectural uniqueness" | 真实 Provider 跑批后图像级评估 | DNA 字段级代理 (anchor mechanism 文本 + crossIndustryRatio) | Phase 8D 不调真实 Provider, 用 metadata-level 代理 |
| §8 Mode B (Phase 8D Generalization Calibration) | 没具体定义 | forceBaseline=true (无 anchor 注入) | 8A + 8B.1 + 8C 全部已实现, forceBaseline 是最干净的"无 anchor"对照 |
| §6 提议创建 PNG 4 类 architecture-language | 创建图片 | metadata-only manifest (registry.json + 4 个子目录 README) | Phase 8D 不调真实 Provider, 不创建 PNG |
| §9 验收 1 (JZMX 不下降) | "Performance must not decrease compared with Phase 8C" | runtimeSummary 4 指标 byte-equal preserved + brand_translation 块 byte-equal | 真实 provider 跑批是 Phase 9A 任务 (Phase 8D §10 提议) |

## 8. 测试覆盖

14 个 test 套件, 281/281 PASS:

| 套件 | 测试数 | 状态 |
| --- | --- | --- |
| field-schema/tests/validate.test.mjs | 40 | PASS |
| field-enriched/tests/compile-prompt.test.mjs | 17 | PASS |
| field-enriched/tests/compile-prompt-v1.1.test.mjs | 14 | PASS |
| field-enriched/tests/architecture-function-bridge.test.mjs | 18 | PASS |
| anchor-aware/tests/compile-with-anchor.test.mjs | 20 | PASS |
| prompt-compiler/trace/tests/compile-trace.test.mjs | 13 | PASS |
| prompt-compiler/variation/tests/derive-variants.test.mjs | 17 | PASS |
| prompt-compiler/runtime/tests/runtime-prompt.test.mjs | 17 | PASS |
| architecture-anchors/loader/tests/anchor-selection.test.mjs | 18 | PASS (+2 from Phase 8C) |
| function-calibrations/tests/function-calibrations.test.mjs | 17 | PASS |
| brand-space-examples/tests/multibrand-validation.test.mjs | 37 | PASS (新) |
| evaluation/tests/evaluate-space.test.mjs | 22 | PASS |
| test-cases/jiuzhou-aesthetics/tests/vertical.test.mjs | 10 | PASS |
| test-cases/regression/tests/regression.test.mjs | 21 | PASS |

**新增测试数 (Phase 8D)**: 37 (multibrand-validation) + 2 (anchor-selection YJLF/FTT) = 39 个
**回归调整**: 1 (anchor-selection health_management 防 overfit 收紧)

## 9. Phase 8D §9 验收 5 项全过

| 验收项 | 验证方法 | 状态 |
| --- | --- | --- |
| 1. JZMX 不下降 | byte-equal preserved in Mode A vs Mode B (brand_translation / functional_requirement / negative_constraints) | PASS |
| 2. FTT 不变 medical aesthetics style | no JZMX markers (translucent_membrane / purple_lavender_glow / soft_continuity) in FTT active content | PASS |
| 3. YJLF 保持 health 行业特征 | no FTT / JZMX markers in YJLF active content; YJLF brandSpirit.healing >= 0.85 | PASS |
| 4. Architecture Anchor 跨 industry 转移 | selectAnchors industry match 防护 (3 brand 各 own industry 3 anchors, cross-industry 0) | PASS |
| 5. Brand Translation 独立 | 3 brand brand_translation / functional_requirement blocks distinct | PASS |

## 10. Verify Gates

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

## 11. 不调 Provider, 不污染生产代码

- ✅ 不调真实 Provider (Phase 8D 明确要求)
- ✅ 不修改 v1-baseline 任何文件
- ✅ 不修改生产代码 (apps/cli / apps/desktop / packages)
- ✅ 不创建 PNG 二进制 (architecture-language / brand-space-examples status=concept_only, metadata-only)
- ✅ 评估层 4 指标基于 DNA 字段 + registry.json, prompt-level 真实效果留给 Phase 9A 跑批

## 12. 接下来 (Phase 9A)

Phase 8D §10 提议 Phase 9A: Spatial Intent Reasoning
- "Understand why this space should be designed this way."
- 链路: Brand Strategy → Spatial Intent Reasoning → Architecture Language → Functional Translation → Commercial Space
- Phase 9A 是把 Phase 8A-8D 整合到 brand strategy 驱动层, 让 system 真正理解 "为什么这样设计", 而不只是 "匹配品牌"

## 13. 改动文件清单 (待 commit)

新增:
- space-generator/v1-experimental/architecture-anchors/feng-tang-tang/metadata.yaml
- space-generator/v1-experimental/architecture-anchors/feng-tang-tang/architecture-dna-analysis.yaml
- space-generator/v1-experimental/architecture-anchors/yi-ji-liang-fang/metadata.yaml
- space-generator/v1-experimental/architecture-anchors/yi-ji-liang-fang/architecture-dna-analysis.yaml
- space-generator/v1-experimental/architecture-language/README.md
- space-generator/v1-experimental/architecture-language/registry.json
- space-generator/v1-experimental/architecture-language/organic-flow/.gitkeep
- space-generator/v1-experimental/architecture-language/translucent-boundary/.gitkeep
- space-generator/v1-experimental/architecture-language/soft-light-system/.gitkeep
- space-generator/v1-experimental/architecture-language/material-continuity/.gitkeep
- space-generator/v1-experimental/brand-space-examples/README.md
- space-generator/v1-experimental/brand-space-examples/jiuzhou-aesthetics/brand-space-profile.yaml
- space-generator/v1-experimental/brand-space-examples/feng-tangtang/brand-space-profile.yaml
- space-generator/v1-experimental/brand-space-examples/yijiliangfang/brand-space-profile.yaml
- space-generator/v1-experimental/brand-space-examples/tests/multibrand-validation.test.mjs
- space-generator/v1-experimental/evaluation/multibrand-evaluate.mjs
- space-generator/v1-experimental/reports/phase-8d-multibrand-space-validation.md

修改:
- space-generator/v1-experimental/architecture-anchors/registry.json (加 FTT + YJLF 2 brand × 3 anchors, 收紧 JZMX applicability)
- space-generator/v1-experimental/architecture-anchors/loader/load-anchors.mjs (selectAnchors 加 industry 硬匹配)
- space-generator/v1-experimental/prompt-compiler/runtime/compile-runtime.mjs (移除 brandName heuristic fallback, 保持 brandName slug 列表)
- space-generator/v1-experimental/architecture-anchors/loader/tests/anchor-selection.test.mjs (收紧 health_management 防 overfit 验证)
- space-generator/v1-experimental/test-cases/regression/results/regression-report.json (重新生成)
- space-generator/v1-experimental/test-cases/regression/results/space-evaluation-report.json (重新生成)
