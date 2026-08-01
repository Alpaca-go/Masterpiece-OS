# Prompt Trace v0.1

按 v1.0 文档 §30 Phase 3 / §22 字段溯源推进。

## 内容

| 文件 | 用途 |
|---|---|
| `prompt-trace.schema.json` | trace 数据结构 (JSON Schema draft 2020-12) |
| `compile-trace.mjs` | 编译工具 v0.1 (输入 DNA + sources, 输出 trace) |
| `examples/jiuzhou-aesthetics.sources.json` | JZMX 6 个 source 类别实例 |
| `tests/compile-trace.test.mjs` | ajv 验证 + 编译测试 (~13 项) |

## 6 个 source 类别 (v1.0 §30 Phase 3)

| 类别 | 来源 | 覆盖字段示例 |
|---|---|---|
| `brandAnalysis` | brand packet / 项目数据 | `project.brandName` / `brandSpaceDna.injectionStrength` |
| `sceneRequirement` | 用户显式场景要求 | `sceneDefinition.sceneType` / `commercialContext` |
| `goldenReference` | JZMX-SGR-01/02 benchmark 反推 | `architectureDna.spatialConcept.primary` / `lightingDna.primaryStrategy` |
| `genericArchitecture` | 通用建筑/视觉质量规范 | `materialDna.materialCountLimit` / `compositionDna.camera.lens` |
| `modelAdapter` | volcengine Seedream 5.0 Pro 适配 | `renderingDna.realism` / `visualFinish` |
| `negativeConstraints` | fail-closed 禁止项 | `negativeConstraints.prohibit` |

## 关键能力 (v1.0 §30 Phase 3 验收)

能回答 6 类问题：

1. **为什么使用曲线** — `architectureDna.spatialConcept.primary` → `golden_reference` (JZMX-SGR-01/02)
2. **为什么使用半透明材料** — `materialDna.materialCountLimit` → `generic_architecture` (v1.0 §16 强约束)
3. **为什么出现紫色** — `lightingDna.primaryStrategy` → `golden_reference` (建筑发光 vs 装饰灯带)
4. **为什么出现某个品牌装置** — `brandSpaceDna.injectionStrength` → `brand_analysis`
5. **哪部分来自品牌** — `brand_analysis` source category
6. **哪部分来自通用规范** — `generic_architecture` source category

## 数据结构

```ts
interface PromptTrace {
  schemaVersion: '1.0';
  traceVersion: 'v0.1';
  dnaVersion: string;
  dnaFingerprint: string;        // sha256(dna - timestamp) 32 字符
  generatedAt: string;
  sources: {                    // 6 个类别
    brandAnalysis: SourceEntry[];
    sceneRequirement: SourceEntry[];
    goldenReference: SourceEntry[];
    genericArchitecture: SourceEntry[];
    modelAdapter: SourceEntry[];
    negativeConstraints: SourceEntry[];
  };
  fieldProvenance: {            // 字段 → 来源
    [fieldPath: string]: {
      origin: 7 种类型;
      evidenceRefs: string[];   // 至少 1 项
      confidence: 0-1;
      rule: string;              // 人类可读解释
    };
  };
}
```

## 编译工具

```js
import { compileTrace } from './compile-trace.mjs';
const trace = compileTrace({ dna, sources });
```

CLI:
```bash
node compile-trace.mjs <dna.json> <sources.json> <output.json>
```

## 验证

```bash
node space-generator/v1-experimental/prompt-compiler/trace/tests/compile-trace.test.mjs
```

## 边界

- v0.1 **不输出最终 prompt** (Phase 5 工作)
- v0.1 不影响 v1-baseline
- v0.1 不调用 Provider
- v0.1 不改 apps/cli / apps/desktop / packages/*

## 已知限制

- `TRACED_FIELDS` 固定 18 个核心字段 (Phase 2 DNA 13 个顶层 + project 2 个 + 嵌套 3 个)
- `DEFAULT_FIELD_ORIGIN` 硬编码映射, 未来让用户可配置
- `rule` 模板固定 (`DEFAULT_RULE_TEMPLATES`), 未来支持自定义

## 后续 (Phase 4 起)

- Phase 4: 8 空间 × 3 版本 × 2 张 = 48 个 JZMX test cases (用 compileTrace 跑 18 字段 × 8 空间)
- Phase 5: Field-Enriched Prompt — compileTrace 输出 + DNA 编译成自然语言 prompt
- Phase 6: Variation Controller — compileTrace 输出控制品牌母题轮换
