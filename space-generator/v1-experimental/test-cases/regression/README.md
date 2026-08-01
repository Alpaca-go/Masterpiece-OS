# Phase 7 4-Project Regression Test Set

> v1.0 §30 Phase 7: 验证 JZMX 新增字段不污染其他项目.

## 用途

Phase 2-6 引入的 Space DNA / Trace / Field-Enriched Prompt / Variation Controller 都以
JZMX（医疗美容）为样例开发. 真正上线前必须验证 4 个差异化项目（医美 / 中医养生 / 川菜
餐厅 / 体育用品零售）之间的字段不串台、品牌 spirit 不被 JZMX 模板强行拉高、negative
constraints 不会被 JZMX 的内容物污染.

## 测试覆盖（21 项）

| 区段 | 项目数 | 说明 |
| --- | --- | --- |
| Schema validation | 5 | index.json 4 project 声明 + 4 DNA 校验 |
| Prompt compile | 4 | 4 个项目各自走通 `compileFieldEnrichedPrompt` |
| Pollution checks (v1.0 §30) | 5 | JZMX 自身 12 个 negative 还在；YJLF/FTT/WY 不被 JZMX marker 污染；brand_spirit 维度不被强加 |
| Preservation sanity | 5 | 4 个 lighting.primaryStrategy + 1 个 distinct spatial concept |
| Report | 1 | 写入 `results/regression-report.json` |
| **合计** | **21** | |

## 4 个项目

| ID | 品牌 | Category | 关键特征 |
| --- | --- | --- | --- |
| JZMX | 九州美学 | medical_aesthetics | architectural_indirect_light, scientific brand_spirit 0.92 |
| YJLF | 一剂良方 | health_management | natural_lighting, warm wood + paper (中医/养生) |
| FTT | 冯烫烫 | restaurant | natural_lighting, warm_commercial_grid, kitchen_as_anchor (川菜/跷脚牛肉) |
| WY | 蛙耶 | retail | direct_lighting, raw_industrial_grid, exposed_concrete (体育用品零售) |

## 运行

```bash
npm run test:space-dna-regression
```

输出报告：`results/regression-report.json`（gitignored，每次运行重生成）.

## 设计原则

1. **不调 Provider** — 全部本地字段级校验，零网络 / 零 LLM 调用.
2. **不污染生产代码** — 仅在 `space-generator/v1-experimental/test-cases/regression/` 范围内.
3. **pollution 检查作用域** — YJLF/FTT/WY 的污染检查使用 `md.split('# Prohibited')[0]`
   排除 `negativeConstraints` 块，因为该块本应列出 JZMX 的 prohibit marker，是正确设计.
4. **可重跑** — DNA 都是 frozen metadata，无 Provider 副作用，可重复运行.

## 已知边界

- JZMX DNA 在 `space-generator/v1-experimental/field-schema/examples/jiuzhou-aesthetics.dna.json`，
  其他 3 个在 `space-generator/v1-experimental/test-cases/regression/projects/*.dna.json` —
  JZMX 共用 Phase 2 schema example，回归测试只读取不修改.
- `regression-report.json` 不入库（results/ 目录 gitignored），仅作为本轮回归的快照.
