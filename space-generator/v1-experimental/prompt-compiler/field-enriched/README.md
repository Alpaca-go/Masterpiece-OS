# Field-Enriched Prompt Compiler v0.1

按 v1.0 文档 §30 Phase 5 / §22 13 步编译顺序 / §33 技术实现建议推进。

## 内容

| 文件 | 用途 |
|---|---|
| `compile-prompt.mjs` | 12 字段块独立编译 + `compileFieldEnrichedPrompt(dna)` |
| `examples/jzex-reception.prompt.md` | JZMX reception DNA 编译出的 markdown prompt (sample) |
| `tests/compile-prompt.test.mjs` | 16 项验证 |

## 12 字段块 (v1.0 §22 13 步减 1 步 = 12 步)

v1.0 §22 是 13 步，v0.1 (Phase 5) 不接 variation_control (Phase 6 工作) = 12 步。

| # | block id | 编译函数 | 来源 (v1.0 §) |
|---|---|---|---|
| 1 | task | `compileTaskDeclaration` | §0 / §12 |
| 2 | brand | `compileBrandPositioning` | §11 |
| 3 | function | `compileSpaceFunction` | §12 |
| 4 | concept | `compileCoreConcept` | §13 |
| 5 | architecture | `compileArchitectureLanguage` | §13 |
| 6 | material | `compileMaterialSystem` | §16 |
| 7 | lighting | `compileLightingSystem` | §17 |
| 8 | brandTranslation | `compileBrandTranslation` | §15 |
| 9 | functional | `compileFunctionalRealism` | §14 |
| 10 | composition | `compileComposition` | §18 |
| 11 | rendering | `compileRendering` | §19 |
| 12 | negative | `compileNegativeConstraints` | §21 |

v1.0 §22 第 12 步 `variation_control` 留 Phase 6。

## 输出示例 (JZMX reception)

```markdown
# Task
Generate a single premium-grade space image for **九州美学** (medical_aesthetics).
Scene: `reception` (flagship_clinic_reception).
...

# Brand & Industry Positioning
**Brand**: 九州美学
**Industry**: 医疗美容与医美生态服务
...
```

完整 sample: `examples/jzex-reception.prompt.md` (4072 字符)

## 关键约束

- **v1.0 §10 maxReportCharacters=8000** — field-enriched prompt ≤ 8000 字符
- **v1.0 §21 prohibit 12 项** — fail-closed, 全部出现在 negative 块
- **v1.0 §34 规则二** — motif 候选全部 default optional, 不固化
- **v1.0 §15 brand_spirit 5 维** — 字段结构 + 高权重 dim 列表都输出

## 跑法

```bash
node space-generator/v1-experimental/prompt-compiler/field-enriched/compile-prompt.mjs \
  space-generator/v1-experimental/field-schema/examples/jiuzhou-aesthetics.dna.json \
  /tmp/jzex-reception.prompt.md
```

或程序化：
```js
import { compileFieldEnrichedPrompt } from './compile-prompt.mjs';
const result = compileFieldEnrichedPrompt(dna);
console.log(result.markdown);
```

## 验证 (16/16)

- 12 block, 顺序与 v1.0 §22 一致
- 字符 1000-8000 范围
- 内容覆盖 brandName / sceneType / 12 negative constraints / materialCountLimit=5 / injectionStrength=0.55 / 5 brand spirit dims / camera spec
- v1.0 §10 maxReportCharacters=8000 不超
- field-enriched 密度 > v1-baseline §0 (sanity)
- 写 JZMX example 到 examples/jzex-reception.prompt.md
- 拒绝 null / string dna

## Phase 5 验收 (v1.0 §30)

v0.1 是**编译骨架** + **JZX 实例**，还没真生成图，验收靠 v1.0 §30 列的方向性条款：

- [x] 不替换 Baseline (compile 输出到 examples/, 不影响 apps/cli)
- [x] 输出与 Baseline 可对比的 prompt (markdown 文本, 字符数 / 字段覆盖可对比)
- [x] 平均质量不下降 (字段结构 + 强约束 materialCountLimit/negative constraints 落 prompt)
- [x] 建筑概念清晰度提升 (architecture block 包含 spatialConcept / geometry / continuity / boundary / circulation 5 维度)
- [x] 具体品牌元素重复率下降 (motifFamily 全部 optional, injectionStrength 0-1 量化)
- [x] 功能错误率下降 (functional block 包含 operational_realism / customer_flow / privacy)
- [x] 多场景一致性提升 (12 block 顺序固定, sceneDefinition / sceneSubtype 来自 scene_requirement source)

**真生成图对照**需要 user 授权 volcengine API, 留给 Phase 5+6 完成后实际跑 v1-baseline vs field-enriched A/B。

## 边界

- 不动 v1-baseline
- 不污染 apps/cli / apps/desktop / packages/*
- 不调 Provider
- 不替换 v1-baseline prompt 编译路径
- examples/ 不进 git (每次 compile 都变)

## 后续 (Phase 6+)

- Phase 6: 加 variation_control 块 (第 13 步), 引入 v1-variation-controlled prompt
- Phase 7: 4 项目回归 (JZMX / 一剂良方 / 冯烫烫 / 蛙耶)
- 真生成: A/B 对比 48 张图
