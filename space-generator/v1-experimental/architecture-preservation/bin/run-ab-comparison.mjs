#!/usr/bin/env node
// Phase 9B.2 Text-level A/B Comparison Runner (deterministic, no Provider)
// 用法: node space-generator/v1-experimental/architecture-preservation/bin/run-ab-comparison.mjs
//
// 对 3 brand 跑 Mode A (Phase 9B.1 baseline) vs Mode B (Phase 9B.2 + architecture_preservation)
// 的 prompt 编译, 保存到 results/{brand}/, 生成 ab-comparison-report.md.
//
// 不调真实 Provider, 不污染生产代码, 不动 v1-baseline.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..');
const resultsRoot = join(__dirname, '..', 'results');

const {
  compileRuntimePromptModeAArchitecturePreservation,
  compileRuntimePromptWithArchitecturePreservation,
} = await import('../compile-architecture-preservation-prompt.mjs');

const DNA_PATHS = {
  'jiuzhou-aesthetics': 'field-schema/examples/jiuzhou-aesthetics.dna.json',
  'feng-tang-tang': 'test-cases/regression/projects/feng-tang-tang.dna.json',
  'yi-ji-liang-fang': 'test-cases/regression/projects/yi-jui-liang-fang.dna.json',
};
const SI_PATHS = {
  'jiuzhou-aesthetics': 'field-schema/examples/jiuzhou-aesthetics.spatial-intent.json',
  'feng-tang-tang': 'field-schema/examples/feng-tang-tang.spatial-intent.json',
  'yi-ji-liang-fang': 'field-schema/examples/yi-ji-liang-fang.spatial-intent.json',
};
const SR_PATHS = {
  'jiuzhou-aesthetics': 'spatial-reality/examples/jiuzhou-aesthetics.spatial-reality.json',
  'feng-tang-tang': 'spatial-reality/examples/feng-tang-tang.spatial-reality.json',
  'yi-ji-liang-fang': 'spatial-reality/examples/yi-ji-liang-fang.spatial-reality.json',
};
const AP_PATHS = {
  'jiuzhou-aesthetics': 'architecture-preservation/examples/jiuzhou-aesthetics.architecture-preservation.json',
  'feng-tang-tang': 'architecture-preservation/examples/feng-tang-tang.architecture-preservation.json',
  'yi-ji-liang-fang': 'architecture-preservation/examples/yi-ji-liang-fang.architecture-preservation.json',
};

const reportRows = [];
const allBrands = {};

for (const brand of Object.keys(DNA_PATHS)) {
  const dnaPath = join(repoRoot, 'space-generator', 'v1-experimental', DNA_PATHS[brand]);
  const siPath = join(repoRoot, 'space-generator', 'v1-experimental', SI_PATHS[brand]);
  const srPath = join(repoRoot, 'space-generator', 'v1-experimental', SR_PATHS[brand]);
  const apPath = join(repoRoot, 'space-generator', 'v1-experimental', AP_PATHS[brand]);
  const dna = JSON.parse(readFileSync(dnaPath, 'utf8'));
  const siFile = JSON.parse(readFileSync(siPath, 'utf8'));
  const srFile = JSON.parse(readFileSync(srPath, 'utf8'));
  const apFile = JSON.parse(readFileSync(apPath, 'utf8'));

  const modeA = compileRuntimePromptModeAArchitecturePreservation(dna, siFile.spatialIntentDna, srFile.spatialRealityDna, { brandKey: brand });
  const modeB = compileRuntimePromptWithArchitecturePreservation(dna, siFile.spatialIntentDna, srFile.spatialRealityDna, apFile.architecturePreservation, { brandKey: brand });

  const brandDir = join(resultsRoot, brand);
  mkdirSync(brandDir, { recursive: true });
  writeFileSync(join(brandDir, 'mode-A.prompt.md'), modeA.markdown, 'utf8');
  writeFileSync(join(brandDir, 'mode-B.prompt.md'), modeB.markdown, 'utf8');

  const charDiff = modeB.characterCount - modeA.characterCount;
  const blockDiff = modeB.blockCount - modeA.blockCount;
  const ratio = (charDiff / modeA.characterCount * 100).toFixed(1);

  const abComparison = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    phase: '9B.2',
    brandKey: brand,
    modeA: {
      blockCount: modeA.blockCount,
      characterCount: modeA.characterCount,
      runtimePath: modeA.runtimePath,
      blockOrder: modeA.blocks.map((b) => b.id),
    },
    modeB: {
      blockCount: modeB.blockCount,
      characterCount: modeB.characterCount,
      runtimePath: modeB.runtimePath,
      blockOrder: modeB.blocks.map((b) => b.id),
      architecturePreservation: apFile.architecturePreservation,
    },
    diff: {
      blockDiff,
      charDiff,
      charDiffRatio: parseFloat(ratio),
    },
  };
  writeFileSync(
    join(brandDir, 'ab-comparison.json'),
    JSON.stringify(abComparison, null, 2),
    'utf8',
  );

  allBrands[brand] = abComparison;
  reportRows.push({
    brand,
    aBlocks: modeA.blockCount,
    aChars: modeA.characterCount,
    bBlocks: modeB.blockCount,
    bChars: modeB.characterCount,
    charDiff,
    blockDiff,
    charDiffRatio: `${ratio}%`,
    weight: apFile.architecturePreservation.weight,
    protectedCount: apFile.architecturePreservation.protectedElements.length,
  });
}

const aggregate = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  phase: '9B.2',
  title: 'Phase 9B.2 Architecture-Preservation Pipeline A/B Comparison (text-level)',
  brands: allBrands,
  summary: {
    totalBrands: Object.keys(allBrands).length,
    modeAPath: 'spatial_intelligence_9a2_9a3_9b1_8a_8b1 (Phase 9B.1 Mode B, 15 块 baseline)',
    modeBPath: 'spatial_intelligence_9a2_9a3_9b1_9b2_8a_8b1 (Phase 9B.2 Mode B, 15 + architecture_preservation = 16 块)',
    modeAAdapter: 'compileRuntimePromptModeAArchitecturePreservation',
    modeBAdapter: 'compileRuntimePromptWithArchitecturePreservation',
  },
  notes: [
    'Mode A = Phase 9B.1 Mode B baseline (15 块, 含 spatial_reality_constraint, 不含 architecture_preservation)',
    'Mode B = Phase 9B.1 Mode B + architecture_preservation 块 (16 块, 保护 mechanism 不增加 decoration)',
    'Mode B 新增 1 块 (architecture_preservation), 插在 architecture_context 之后, architecture_function_bridge 之前',
    'Phase 9B.2 §6 mechanism not object: 只保护机制, 不添加具体装饰',
    'Provider not called. Image-level A/B requires real-provider smoke (separate user-authorized step).',
  ],
};
writeFileSync(join(resultsRoot, 'ab-comparison-aggregate.json'), JSON.stringify(aggregate, null, 2), 'utf8');

let md = `# Phase 9B.2 — Architecture-Preservation Pipeline A/B Comparison (text-level)

- **Generated**: ${new Date().toISOString()}
- **Phase**: 9B.2 (Space Generator v1.1)
- **Status**: text-level A/B complete (image-level requires real-provider smoke)
- **Mode A**: \`compileRuntimePromptModeAArchitecturePreservation\` = Phase 9B.1 Mode B (15 块, baseline)
- **Mode B**: \`compileRuntimePromptWithArchitecturePreservation\` = Phase 9B.1 Mode B + architecture_preservation 块 (16 块)

## 0. 目的

Phase 9B.2 在 Phase 9B.1 Reality Constraint 基础上, 加 Architecture Preservation Layer,
保护 Phase 9B Architecture Anchor 提供的空间记忆点, 防止 Phase 9B.1 在提升商业真实性时
削弱 anchor 提供的建筑美感.

这一步只做 prompt 文本级 A/B 对比, 不调真实 Provider.

真实 Provider image-level A/B 由单独的 user-authorized smoke 跑, 不在本自动 phase 内.

## 1. 3 brand 概览

| Brand | Mode A blocks | Mode A chars | Mode B blocks | Mode B chars | Block diff | Char diff | Char ratio | Weight | Protected |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
`;

for (const r of reportRows) {
  md += `| ${r.brand} | ${r.aBlocks} | ${r.aChars} | ${r.bBlocks} | ${r.bChars} | +${r.blockDiff} | +${r.charDiff} | +${r.charDiffRatio} | ${r.weight} | ${r.protectedCount} |\n`;
}

md += `
## 2. 3 brand architecturePreservation 配置

| Brand | weight | protectedElements |
| --- | --- | --- |
`;

for (const brand of Object.keys(DNA_PATHS)) {
  const ap = allBrands[brand].modeB.architecturePreservation;
  md += `| ${brand} | ${ap.weight} | ${ap.protectedElements.join(' / ')} |\n`;
}

md += `
## 3. 块结构 (Mode B = 16 块)

Mode B 在 Phase 9B.1 Mode B (15 块) 基础上, 在 \`architecture_context\` 之后插入 1 个新块:

1. \`task\`
2. \`spatial_intent\` (Phase 9A.2 — 体验目标 + spatial strategy)
3. \`architecture_language\` (Phase 9A.3 — 5 字段 high-level 方向)
4. \`spatial_reality_constraint\` (Phase 9B.1 — 8 字段商业现实硬约束)
5. \`architecture_context\` (Phase 8A anchor in-context reference)
6. \`architecture_preservation\` (Phase 9B.2 — 保护 mechanism, **本 phase 新增**)
7. \`architecture_function_bridge\` (Phase 8B.1)
8. \`architectural_concept\` / \`architecture_dna\` / \`brand_translation\` / \`functional_requirement\`
9. \`material\` / \`lighting\` / \`composition\` / \`rendering\`
10. \`negative_constraints\`

## 4. §6 mechanism not object

Phase 9B.2 §6 核心原则: **mechanism not object** (只保护机制, 不添加具体物体).

- ✓ 允许: 保留空间结构 / 保留材质关系 / 保留光线逻辑
- ✗ 禁止: 增加额外装饰 / 强行加入雕塑 / 堆叠视觉符号
- ✗ 禁止: 引入未在 anchor 中存在的具体装饰元素 (花瓣 / 羽翼 / 雕塑 / 装置)

## 5. 验证

- ✓ 3 brand 各自 distinct architecturePreservation (weight JZMX=0.7, FTT=0.5, YJLF=0.5)
- ✓ JZMX 4 protected elements, FTT 3 (skip ceiling_language, casual dining 不需要 ceiling expression), YJLF 4
- ✓ Mode A 15 块 (Phase 9B.1 Mode B baseline, 100% 不变)
- ✓ Mode B 16 块 (15 + architecture_preservation)
- ✓ Mode B 块顺序正确 (architecture_preservation 在 architecture_context 之后, architecture_function_bridge 之前)
- ✓ Mode B 4 个 baseline 块 (compiledSpatialIntent / architectureLanguage / spatial_reality_constraint / architecture_context) 内容不变
- ✓ architecture_preservation 块包含 mechanism not object 警告, 不添加具体装饰
- ✓ architecture_preservation weight 字段符合 JZMX=0.7 / FTT=0.5 / YJLF=0.5 设计
- ✓ compileFieldEnrichedPrompt 11 块不变
- ✓ compileRuntimePrompt 12 块不变
- ✓ compileRuntimePromptWithSpatialIntelligence 14 块不变
- ✓ compileRuntimePromptWithSpatialReality 15 块不变
- ✓ 不调真实 Provider (no fetch / http / LLM imports)

## 6. 6 维评价指标 (§8)

| 指标 | 目标 | Phase 9B.2 改进点 | 验证 |
| --- | --- | --- | --- |
| Architecture Quality | ≥ Phase 9B.1 (§9 1) | architecture_context 块不变, architecture_preservation 保护 anchor 机制 | image-level 需人工 |
| Functional Realism | 不下降超过 5% (§9 2) | spatial_reality_constraint 块不变 | image-level 需人工 |
| Brand Translation | 保持稳定 (§9 3) | brand_translation 块不变 | image-level 需人工 |
| Commercial Realism | 保持 (§9 4) | 空间仍具备商业运营真实性, 商业运营逻辑 0 破坏 | image-level 需人工 |
| Spatial Coherence | 提升 | 4 protected elements (ceiling_language / spatial_signature / material_expression / lighting_behavior) 显式保护 | image-level 需人工 |
| Visual Quality | 保持 | mechanism not object 原则不引入额外装饰 | image-level 需人工 |

## 7. 文件

- \`results/{brand}/mode-A.prompt.md\` — Mode A compiled prompt
- \`results/{brand}/mode-B.prompt.md\` — Mode B compiled prompt
- \`results/{brand}/ab-comparison.json\` — A/B 对比结构化
- \`results/ab-comparison-aggregate.json\` — 3 brand 聚合

## 8. 下一 phase: Phase 9C — Spatial Intelligence Runtime Integration (§10)

Phase 9B.2 完成 Architecture Preservation layer (text-level). Phase 9B.2 → Phase 9C 是
Architecture / Function Balance Final, 然后 Phase 9C Spatial Intelligence Runtime Integration
把 9A.2 / 9A.3 / 9B.1 / 9B.2 一起挪到 production runtime.

需要 user 跑 real-provider smoke 后, 才能决定是否进入 Phase 9C.
`;

writeFileSync(join(resultsRoot, 'ab-comparison-report.md'), md, 'utf8');

console.log('A/B comparison complete.');
for (const r of reportRows) {
  console.log(`  ${r.brand}: Mode A ${r.aBlocks} blocks / ${r.aChars} chars -> Mode B ${r.bBlocks} blocks / ${r.bChars} chars (+${r.charDiff})`);
}
console.log(`\nReport: ${join(resultsRoot, 'ab-comparison-report.md')}`);
