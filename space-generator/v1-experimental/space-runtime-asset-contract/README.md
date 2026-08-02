# Space-Runtime Asset Contract — Phase 9C.2 v2 V5 Production Parity

## 目的

把 space-runtime compileSpaceRuntime 输出配上 v5 image-generation runtime 等价的
asset contract (locked assets / locked facts / references / vnext-style snapshot +
sourceMap). 让 smoke harness 跟 production v5 真实行为对齐.

## 背景

Phase 9C.2 v2 smoke 之前用 `startCompiledCreativeTask` 直接传空 references + 自定义
snapshot, 完全绕开了 V3 sourceBundle loader + vnext service 的 locked-asset
detection. 这意味着 smoke 出来的图是在 "无 logo locked / 无 asset constraints /
无 V5 sourceBundle" 条件下 baseline, 跟 production 真实行为对不齐.

本模块封装跟 production 一致的资产契约逻辑:

1. **Logo / locked asset 检测** (跟 `createFileContextLoader` / `vnext-service`
   同样的逻辑):
   - `project.json.logoFiles` → `identity_reference` (`current_project_logo`)
   - `project.json.lockedFacts` → `lockedFacts` 列表
   - `project.json.logoLocked` flag (默认 `true`)

2. **Architecture anchor** (JZMX-ARCH-01 等) → `structure_reference`
   (per vnext-service line 396 role mapping)

3. **brand DNA 约束** → `lockedAssetIds` (asset concept) + `lockedFacts` (约束文本):
   - `brandSpaceDna.literalAssetUsage` keys (logoVisibility / frogIPUsage 等)
     视为 literal asset constraints (synthetic `dna:` tokens)
   - `negativeConstraints.prohibit` (字符串数组) → `lockedFacts`
   - `variationControl.preserve` 视为 structural locks

4. **vnext-style snapshot** (per vnext-service.ts line 417-424):
   ```ts
   {
     schemaVersion: 'space-runtime-1.0',  // NOT 'vnext-1.0' (per project-rule)
     projectContextVersion: 'space-runtime-v1',
     taskContract: { taskId, deliverableFamily, subtype, shot, ... },
     route: { templateVersions: { ... } },
     trace: { sourceFingerprint, contextFingerprint, ... },
     implicitAnchor: null,
     lockedAssetIds: [...],
     lockedFacts: [...],
     brandKey, industry, strategy, axisScores, gateStatus
   }
   ```

5. **vnext-style sourceMap** (per vnext-service.ts line 425-431):
   ```ts
   {
     pipelineMode: 'space-runtime',  // NOT 'vnext'
     taskId, contextFingerprint, templateVersions, implicitAnchorRunId,
     brandKey, selectedStrategy, ...
   }
   ```

## Reference role 优先级 (per vnext-service line 396-400)

| Priority | Type | Role | 触发条件 |
|---|---|---|---|
| 1 | logo asset | `identity_reference` | `logoFiles` 第一个匹配 / `role=logo` / 名字含 "logo" |
| 2 | structure anchor | `structure_reference` | `stagedStructureAnchors` 第一个匹配 / `role=structure_anchor` / 名字含 ARCH/anchor/结构/参考/架构 |
| 3 | staged reference | `core_reference` (或自定义) | smoke harness 显式传 `hasStagedReference=true` |

上限 2 张 (per service.ts:676 强制 `references.length > 2` 抛错).

## 跟 production V3 sourceBundle 区别

| 维度 | V3 sourceBundle (production 默认) | space-runtime smoke |
|---|---|---|
| Entry | `service.start({ sources: V3 })` | `startCompiledCreativeTask({ ... })` |
| Prompt compiler | V3 `compileTask` (image-generation-runtime) | space-runtime `compileSpaceRuntime` |
| Asset loader | `createGenerationSourceLoader` (auto-scan project assets) | `buildAssetContract` (explicit 注入) |
| Logo detection | visual-source-loader 读 `selectedAssetIds` | `detectLogoAssetIds` (logoFiles / role=logo / 名字) |
| Pipeline mode | `vnext` / `visual_extension` / `integrated_anchor` | `space-runtime` |
| schemaVersion | `2.0` / `3.0` | `space-runtime-1.0` |

**不切换到 V3 sourceBundle 路径** 因为:
- V3 path 的 compileTask 生成自己的 prompt, 不能接受外部 space-runtime compiled prompt
- space-runtime 是 v1-experimental 层, 跟 production VNext runtime 是分离的产品线
- 但 asset contract (locked / refs / snapshot / sourceMap) 跟 production 完全一致

## 入口

```
node space-generator/v1-experimental/space-runtime-asset-contract/tests/space-runtime-asset-contract.test.mjs
```

## 公开 API

```js
import { buildAssetContract, SCHEMA_VERSION, PIPELINE_MODE } from './space-runtime-asset-contract.mjs';

const contract = buildAssetContract({
  projectJson,       // from projects.get(projectId)
  brandDna,          // from loadBrandDna(brandKey).dna
  compiled,          // from compileSpaceRuntime(brandKey, { preset, spaceTypeOverride })
  strategy,          // from selectSpatialStrategy(brandKey, { hasReferenceImage })
  hasStagedReference, // bool
  stagedReference,    // { id, role, projectRelativePath, includeReason } (smoke-only)
});

// → {
//     references: [{ id, role, projectRelativePath, includeReason }],
//     lockedAssetIds: { logoAssetIds, structuralAssetIds, dnaTokens, all },
//     lockedFacts: string[],
//     snapshot: { schemaVersion: 'space-runtime-1.0', taskContract, ... },
//     sourceMap: { pipelineMode: 'space-runtime', ... },
//     detection: { logoSource, structureSource, logoCount, structureCount, ... }
//   }

// 然后用:
imageGeneration.startCompiledCreativeTask({
  projectId,
  compiledPrompt: compiled.markdown,
  promptVersion: snapshot.taskContract.taskId,
  snapshot: contract.snapshot,
  sourceMap: contract.sourceMap,
  references: contract.references,
  event: 'PHASE_9C_2_SPATIAL_VALIDATION_*',
  apiProfileId,
  size,
});
```

## 不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.
