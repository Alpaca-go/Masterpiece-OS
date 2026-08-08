# Space Generator R8.6 Golden Baseline — Baseline Freeze & R9 Unlock

> 阶段文档：`Masterpiece-OS-Space-Generator-Phase-R8.6-Baseline-Freeze-and-R9-Unlock-v1.0.md`
> 分支：`v2-space-generator`　日期：2026-08-08

## 本阶段目标

R8.5.2 已通过真实 Provider 稳定性与泛化门禁（见
`../r85-redirect-text-only-smokes/GATE-REPORT.md`）。从本阶段开始**停止修改生成审美**，
把当前通过真实 Provider 验证的 Space Generation Core 冻结为正式 Golden Baseline。

- 冻结 = 记录、补 Smoke、评分、建立 Baseline、打 Tag、Release Gate
- 禁止：新 Prompt Rule / 新 Negative / 修改 spatialMechanisms / 修改 Semantic
  Separation / Brand Motif Abstraction 实验 / 项目硬编码 / 修改 Architecture Anchor
  / 修改 V5 Analysis / 修改 ProjectGenerationContract / 提前做 R9 Productionization
- 只有**重复性结构回归**且多 run 复现且能定位到 compiler/data/reference policy
  才允许重新进入生成核心修复。

## 当前冻结版本（R8.5.2-rc1）

| 项 | 值 |
|---|---|
| RC tag | `space-generator-r8.5.2-rc1`（`fd785a9`） |
| Compiler | `phase9b-quality-compiler` v1.1.0 |
| Source Adapter | v1.4.0 |
| Semantic Separation | rewrite=1.0.0; mechanisms=1.1.0; provenance=1.0.0; normalize=1.0.0 |
| Spatial Mechanism | v1.1.0 |
| Architecture Anchor Registry | schemaVersion 1.0 |
| Reference Policy | `phase9b-recovery-1.0` |
| Provider / Model | volcengine / `doubao-seedream-5-0-pro-260628` |
| Size / Ratio | 2K / 16:9 |
| Reference Policy 冻结 | text-only=Standard；reference-assisted=High Fidelity；refs=0 不 Block |

## 目录结构

```
quality-baselines/r8.6/
├── manifest.json               # 本 Baseline 的 manifest（唯一版本来源）
├── README.md                   # 本文件
├── jiuzhou-aesthetics/         # 九州美学 golden + final smoke
├── feng-tang-tang/             # 冯烫烫 golden + final smoke
├── yi-ji-liang-fang/           # 一剂良方 golden + final smoke
└── R9-UNLOCK.json              # Final Smoke PASS 后创建
```

每张 Baseline 记录：image 或 image-manifest、compiled-prompt.md、
provider-payload.redacted.json、run.json、reference-trace.json、evaluation.json、
prompt-hash、image-sha256（输出图本身按仓库约定 gitignore，靠 hash + runId 追溯）。

## Final Smoke 规模（4 张，text-only，refs=0）

| # | 品牌 | 场景 | 门禁 |
|---|---|---|---|
| 1 | 九州美学 | reception | Arch >= 4, Motif <= 2, Generic <= 2.5, Functional >= 16/20 |
| 2 | 九州美学 | entrance | 同上 |
| 3 | 冯烫烫 | dining / open-kitchen | Functional >= 17/20, Generic <= 2.5 |
| 4 | 一剂良方 | reception / consultation | Functional >= 16/20, Generic <= 3 |

## Golden 类型

每品牌区分 **Commercial Golden** 与 **Architecture Golden**，不只要“最好看的一张图”。

- 九州美学：Architecture Golden（ceiling→boundary→circulation→function 最清楚、
  Literal Motif 最低、半透明/软边界/空间连续性最完整）；Commercial Golden
  （reception/waiting/consultation 功能最真实）
- 冯烫烫：Commercial Golden（open kitchen / food display / customer flow /
  staff operation）；Architecture Golden（中央厨房 / 周边就餐 / 木构 / 明档组织）
- 一剂良方：Commercial Golden（reception / herbal display / waiting /
  consultation）；Architecture Golden（wood framework / semi-private boundary /
  cabinet system / calm circulation）

## 评分（100 分）

| 维度 | 分值 |
|---|---:|
| Architecture Quality | 25 |
| Brand Translation | 20 |
| Functional Realism | 20 |
| Material & Lighting | 15 |
| Composition | 10 |
| Rendering | 10 |

额外记录：Architecture Expressiveness 1–5、Generic AI Space Risk 1–5、
Literal Motif Risk 1–5、Reference Alignment 1–5（仅 Reference 时）。

## Hard Fail / Soft Variance

- **Hard Fail**：严重 literal motif architecture、明显跨品牌污染、空间类型错误、
  商业功能崩坏、Prompt/compiler crash、reference policy 异常 → R8.6 FAIL
- **Soft Variance**：构图一般、家具普通、局部材质不如 Golden → 不阻塞 R8.6，
  且**不允许**因此继续改 Compiler。

## 完成定义

- [ ] R8.5.2-rc1 已冻结（tag 已打）
- [ ] JZMX ×2 Final Smoke PASS
- [ ] FTT ×1 PASS
- [ ] YJLF ×1 PASS
- [ ] evaluation 完成
- [ ] baseline manifest 完整
- [ ] failed diagnostics 已归档
- [ ] anti-regression samples 已建立
- [ ] Golden tag `space-generator-r8.6-golden-baseline` 已创建
- [ ] `R9-UNLOCK.json` 已创建
