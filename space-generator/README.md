# Space Generator 工程目录

> Masterpiece OS 空间效果图垂直测试与 Space DNA 字段工程
> 依据两份文档:
>   - v1.0 `Masterpiece OS 空间效果图垂直测试与 Space DNA 字段工程开发文档 v1.0`
>   - v1.1 `Masterpiece OS Space Generator v1.1 Architecture-Brand Fusion 开发文档`
> 创建时间：2026-08-01 / 触发版本：5.0.0-rc.1 / HEAD `eec4fee` (v1.1 Step 6 完成)
> 累计测试：127/127 PASS (Phase 2-7 + v1.1 Step 1-6)
> 5 verify gates + npm test 301/301 + tsc clean

## Space Generator v1 是什么

`v1` 代表 **当前 Masterpiece 空间生图模块的一个稳定版本**。它由以下 v1 资产共同构成：

- `apps/cli/prompts/v5/` — 4 个 prompt 模板
- `apps/cli/src/v5/creative-director/` — Creative Director 编译引擎
- `packages/creative-production-runtime/` — 创意生产运行时（18 个模块）
- `packages/image-generation-runtime/` — 图像生成运行时（vnext/ + gates/ + prompt/）
- `packages/image-generation-adapter/` — 适配 volcengine / wan 等 provider

**Phase 1 不重写 v1**，只冻结现状、登记 Space Benchmark 图像、记录元数据。

## 目录结构

```
space-generator/
├── v1-baseline/                  ← 冻结的 v1 现状
│   ├── system-prompt.md          ← 拷贝自 apps/cli/prompts/v5/deep-creative-director.md
│   ├── execution-core-template.md
│   ├── report-schema.md
│   ├── benchmark-instructions.md
│   ├── prompt-template.yaml      ← v1 编译顺序冻结
│   ├── model-config.json         ← 实际模型 / 参数冻结
│   ├── brand-analysis/
│   │   └── jiuzhou-aesthetics/   ← 引用 JZMX v1 输入（不复制）
│   ├── benchmarks/               ← 空间生成验收基准（原 golden-references/, 2026-08-01 改）
│   │   └── jiuzhou-aesthetics/
│   │       ├── JZMX-SGR-01-Exterior.png
│   │       ├── JZMX-SGR-02-Reception.png
│   │       ├── metadata.yaml
│   │       ├── space-dna-analysis.yaml
│   │       └── evaluation-report.md
│   └── regression-samples/       ← 引用 v1 历史样本（不复制）
└── v1-experimental/              ← 所有新开发进这里
    ├── field-schema/             ← Phase 2 (Space DNA Schema v0.1, 10 fields)
    ├── prompt-compiler/
    │   ├── trace/                ← Phase 3 (Prompt Trace v0.1, 18 TRACED_FIELDS)
    │   ├── field-enriched/       ← Phase 5 (Field-Enriched Prompt Compiler, 12 blocks)
    │   └── variation/            ← Phase 6 (Variation Controller, 6 variants)
    ├── test-cases/
    │   ├── jiuzhou-aesthetics/   ← Phase 4 (48 trace slots: 8 scenes × 3 versions × 2 slots)
    │   └── regression/           ← Phase 7 (4-project regression: JZMX/YJLF/FTT/WY)
    └── ... (后续 phase 在此新增)
```

## 命名变化说明

`benchmarks/` 是原 v1.0 文档 §3 建议的 `golden-references/` 的同义改名。改名原因：

1. v1.0 文档建议目录 `space-generator/v1-baseline/golden-references/` 与 Masterpiece-OS 仓库治理硬规则（栅格图只允许 `examples/` `tests/` `templates/`）冲突
2. 用户决定（2026-08-01）：Golden Reference 作为 baseline 的 validation assets 处理，改用 `benchmarks/` 名称
3. 仓库治理白名单同步扩展，详见 `tests/repository-policy.test.js`

文件语义保持不变：仍是 S 级空间生成验收基准、Space DNA 提取样本、Regression Test 基准。

## 三条硬性规则

1. **v1-baseline 永远只读**。任何对 v1 prompt / config / metadata 的修改必须走 v1-experimental/，并在阶段末 review 后才能进入 v1-baseline 下一个 minor 版本（v1.1）。
2. **不在仓库内复制用户数据**。项目数据根在 `%USERPROFILE%\Documents\Masterpiece OS Data\projects\`，用引用 + metadata 描述，不直接 commit 大图（空间图例外，按白名单）。
3. **不污染生产代码**。v1 编译路径在 `apps/cli/prompts/v5/` + `apps/cli/src/v5/creative-director/` + `packages/creative-production-runtime/` + `packages/image-generation-runtime/`，这些是 v1-baseline 冻结的源，**严禁在 v1-experimental 阶段修改**。所有新逻辑通过 `@masterpiece/space-dna-runtime` 之类的独立包承载（Phase 2 决定包名）。

## Phase 进度

### v1.0 §30 Phase 1-7 (v0.1 实例)

| Phase | 内容 | 状态 | Commit | Tests |
|---|---|---|---|---|
| 1 | Baseline Freeze + JZMX Space Benchmark v1 | done | `2147ff3` (+`1fdd7eb` PNG) | n/a |
| 2 | Space DNA Schema v0.1 (10 fields) | done | `ef8985f` | 20/20 |
| 3 | Prompt Trace v0.1 (18 TRACED_FIELDS) | done | `e226084` | 13/13 |
| 4 | JZMX 8×3×2=48 trace slots | done | `dab1473` | 10/10 |
| 5 | Field-Enriched Prompt Compiler (12 blocks) | done | `e9a48c8` | 16/16 |
| 6 | Variation Controller (6 variants / base) | done | `6701ac1` | 17/17 |
| 7 | 4-Project Regression Test (JZMX/YJLF/FTT/WY) | done | `b1e3d77` | 21/21 |

### v1.1 Architecture-Brand Fusion Step 1-6 (v0.2 实例)

| Step | 内容 | 状态 | Commit | Tests |
|---|---|---|---|---|
| 1+2 | Architecture Anchor (3 张 JZMX-ARCH 图 + DNA analysis) | done | `272e36d` | n/a (assets) |
| 3 | Field Schema 扩展 (brandTranslationRules + weightAllocation + 4 mechanism) | done | `88c5204` | 38/38 |
| 4 | Prompt Compiler 重构 (10 blocks, 空间概念优先于品牌表达) | done | `9ba65e6` | 17/17 (v0.1) + 17/17 (v1.1) |
| 5 | JZMX 多空间测试 (8 空间类型 × v1.1 compiler) | done | `ed02b76` | 13/13 |
| 6 | Space Evaluation Layer (v1.0 §25 6-dim scoring) | done | `eec4fee` | 11/11 |

详见 `v1-baseline/benchmarks/jiuzhou-aesthetics/evaluation-report.md` 和 v1.0 文档 §30 / §37。
