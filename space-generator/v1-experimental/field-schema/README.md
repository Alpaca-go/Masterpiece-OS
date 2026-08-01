# Space DNA Schema v0.1

按 v1.0 文档 §30 Phase 2 / §33 技术实现建议推进。

## 内容

| 文件 | 用途 |
|---|---|
| `space-dna.schema.json` | 顶层 + 10 字段 JSON Schema (draft 2020-12) |
| `examples/jiuzhou-aesthetics.dna.json` | JZMX 初版实例 (v0.1) |
| `tests/validate.test.mjs` | ajv 验证测试 (含 negative cases) |

## 10 字段清单

按 v1.0 §30 Phase 2 列表：

1. `sceneDefinition` (v1.0 §12) — 必填, 明确此次生成什么空间
2. `architectureDna` (v1.0 §13) — 必填, 空间结构与建筑机制
3. `functionalDna` (v1.0 §14) — 必填, 保证图片不是纯艺术装置
4. `brandSpaceDna` (v1.0 §15) — 必填, 品牌注入层
5. `materialDna` (v1.0 §16) — 必填, 含 `materialCountLimit` 强约束
6. `lightingDna` (v1.0 §17) — 必填, 建筑发光 vs 装饰灯带
7. `compositionDna` (v1.0 §18) — 必填, focal hierarchy + camera
8. `renderingDna` (v1.0 §19) — 必填, realism + visual_finish
9. `variationControl` (v1.0 §20) — 必填, 防同质化
10. `negativeConstraints` (v1.0 §21) — 必填, prohibit 至少 1 项

外加顶层：
- `schemaVersion` — 固定 `"1.0"`
- `dnaVersion` — 实例版本, v0.1 起步
- `project` — 项目身份, 不直接描述画面
- `metadata` — 元数据, 推荐填 (frozenAt / sourceBenchmarkIds)

## 关键约束 (v1.0 §16/§20/§34)

- `materialDna.materialCountLimit`: 1-12 整数, JZMX 默认 5
- `variationControl.motifRepetitionLimit.sameMotifAcrossBatchRatio`: 0-1, JZMX 默认 0.5
- `variationControl.motifRepetitionLimit.sameLiteralMotifPerImage`: 0-5, JZMX 默认 1
- `brandSpaceDna.motifFamily`: 5 个 enum 候选, 全部默认 optional (v1.0 §34 规则二)
- `negativeConstraints.prohibit`: 必填非空数组
- `additionalProperties: false` 在顶层和所有字段 (防模型返回任意结构)

## 验证

```bash
node space-generator/v1-experimental/field-schema/tests/validate.test.mjs
```

测试覆盖：
- Schema self-checks (6 项)
- JZMX 实例加载 + 5 个字段检查 (5 项)
- Negative cases (7 项: 缺字段 / materialCountLimit 边界 / motif enum / ratio 边界 / unauthorized field / spirit 越界)
- 总计 ~18 项 assertion

## 边界

- **不动 v1-baseline 任何文件** (Phase 1 规则)
- **不污染生产代码** (apps/cli, apps/desktop, packages/*)
- v0.1 是 experimental, 字段升级必须满足 v1.0 §28 晋升规则
- environmental_dna (v1.0 §10 提到, §30 Phase 2 列表无) 暂不实现

## 依赖

- `ajv@^8` (root devDep) + `ajv-formats` (v0.1 当前未用 formats, 但留作 v0.2 date-time 校验)

## 后续 (Phase 3 起)

- Phase 3: Prompt Trace — 在 DNA 编译时记录每个字段来源
- Phase 5: Field-Enriched Prompt — DNA Schema 编译成自然语言 prompt
- Phase 6: Variation Controller — DNA 实例批量生成时控制多样性
