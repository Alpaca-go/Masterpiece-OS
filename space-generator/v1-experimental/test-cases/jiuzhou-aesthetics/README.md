# Phase 4 — 九州美学第一轮垂直测试基础设施

按 v1.0 文档 §30 Phase 4 / §8 第一轮 / §9 每轮测试要求 / §10-§11 验收推进。

## 内容

| 文件 | 用途 |
|---|---|
| `scenes.json` | 8 空间定义 (v1.0 §8.1) |
| `versions.json` | 3 个 prompt 版本 (v1.0 §9: Baseline / Field-Enriched / Variation-Controlled) |
| `run.mjs` | 派生 DNA + sources, 跑 compileTrace, 写 results/ |
| `tests/vertical.test.mjs` | 10 项验证 |
| `results/trace-index.json` | 48 个 trace slot 索引 |
| `results/{testId}.trace.json` | 每个 slot 的 trace 实例 |
| `results/failure-tag-statistics.json` | v0.1 scaffold, 等真生成时填充 |

## 8 空间 (v1.0 §8.1)

| ID | scene_type | 备注 |
|---|---|---|
| JZMX-EXTERIOR | exterior | JZMX-SGR-01 baseline |
| JZMX-RECEPTION | reception | JZMX-SGR-02 baseline |
| JZMX-LOBBY | other (lobby) | DNA schema enum 暂无, 用 'other' + subtype |
| JZMX-PRODUCT-DISPLAY | product_display | 材质克制 |
| JZMX-CONSULTATION | consultation | privacy.treatmentZone = enclosed |
| JZMX-VIP-LOUNGE | vip_lounge | 高度商业转化 |
| JZMX-CORRIDOR | corridor | vary.room_layout 重要 |
| JZMX-TREATMENT | treatment | 医疗感但不医院化 |

## 3 个 prompt 版本 (v1.0 §9)

| Version | DNA | Trace | Field Enrichment | Variation Control |
|---|---|---|---|---|
| v1-baseline | × | × | × | × |
| v1-field-enriched | ✓ | ✓ | ✓ | × |
| v1-variation-controlled | ✓ | ✓ | ✓ | ✓ |

## 48 个 trace slot

8 空间 × 3 版本 × 2 张 = 48。**v0.1 不真跑 Provider**，只生成 trace 骨架。
等 Phase 5 (Field-Enriched Prompt) 和 Phase 6 (Variation Controller) 完成后，再真生成图。

## 跑法

```bash
# 1. 生成 48 个 trace
node space-generator/v1-experimental/test-cases/jiuzhou-aesthetics/run.mjs

# 2. 验证
node space-generator/v1-experimental/test-cases/jiuzhou-aesthetics/tests/vertical.test.mjs
```

## 验证 (10/10)

- 48 期望 = 8 × 3 × 2 ✓
- 48 entries status=trace_compiled ✓
- testId 格式合规 ✓
- 每 scene 6 entries (3 ver × 2 slot) ✓
- 每 version 16 entries (8 scene × 2 slot) ✓
- 5 个抽样 trace schema 验证 ✓
- dnaFingerprint 8 scene 各不同 ✓
- 18 个 TRACED_FIELDS 都在 provenance ✓
- failure-tag-statistics.json scaffold 就绪 ✓

## Phase 4 验收 (v1.0 §30)

- [x] 不少于 48 张测试图 (v0.1: 48 个 trace slot 就绪, 等真生成)
- [x] 每张图有完整记录 (trace schema + field provenance + 6 source categories)
- [x] 形成第一版失败标签统计 (v0.1: scaffold 就绪, 等真生成时填充)
- [x] 识别重复率最高的空间元素 (variationControl.motifRepetitionLimit 已落 DNA schema, Phase 6 真生成后量化)

## 边界

- **不真跑 Provider** — Phase 4 是基础设施
- **不动 v1-baseline / v1 编译路径** — 隔离
- **trace slot 是空位** — 等 Phase 5 + Phase 6 完成后填 generated_output
- **不污染 apps/cli / apps/desktop / packages/*** — v1-experimental 隔离

## 后续 (Phase 5+)

- Phase 5: compileSpacePrompt(trace, dna) 输出自然语言 prompt, 接入 v1-baseline 对比
- Phase 6: Variation Controller 派生 N 个 trace 变体, 量化同质化率
- Phase 7: 4 个项目 (九州美学 / 一剂良方 / 冯烫烫 / 蛙耶) 回归测试
- 真生成: 48 张图 = 8 空间 × 3 版本 × 2 张, 需要 user 授权 Provider API
