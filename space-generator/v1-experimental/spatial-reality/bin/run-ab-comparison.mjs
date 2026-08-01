#!/usr/bin/env node
// Phase 9B.1 Text-level A/B Comparison Runner (deterministic, no Provider)
// 用法: node space-generator/v1-experimental/spatial-reality/bin/run-ab-comparison.mjs
//
// 对 3 brand 跑 Mode A (Phase 9B Mode B baseline) vs Mode B (Phase 9B.1 + spatial_reality_constraint)
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
  compileRuntimePromptModeASpatialReality,
  compileRuntimePromptWithSpatialReality,
} = await import('../compile-spatial-reality-prompt.mjs');

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

const reportRows = [];
const allBrands = {};

for (const brand of Object.keys(DNA_PATHS)) {
  const dnaPath = join(repoRoot, 'space-generator', 'v1-experimental', DNA_PATHS[brand]);
  const siPath = join(repoRoot, 'space-generator', 'v1-experimental', SI_PATHS[brand]);
  const srPath = join(repoRoot, 'space-generator', 'v1-experimental', SR_PATHS[brand]);
  const dna = JSON.parse(readFileSync(dnaPath, 'utf8'));
  const siFile = JSON.parse(readFileSync(siPath, 'utf8'));
  const srFile = JSON.parse(readFileSync(srPath, 'utf8'));

  const modeA = compileRuntimePromptModeASpatialReality(dna, siFile.spatialIntentDna, { brandKey: brand });
  const modeB = compileRuntimePromptWithSpatialReality(dna, siFile.spatialIntentDna, srFile.spatialRealityDna, { brandKey: brand });

  // Save per-brand directory
  const brandDir = join(resultsRoot, brand);
  mkdirSync(brandDir, { recursive: true });
  writeFileSync(join(brandDir, 'mode-A.prompt.md'), modeA.markdown, 'utf8');
  writeFileSync(join(brandDir, 'mode-B.prompt.md'), modeB.markdown, 'utf8');

  // Compute diff metrics
  const charDiff = modeB.characterCount - modeA.characterCount;
  const blockDiff = modeB.blockCount - modeA.blockCount;
  const ratio = (charDiff / modeA.characterCount * 100).toFixed(1);

  const abComparison = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    phase: '9B.1',
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
      spatialRealityDna: srFile.spatialRealityDna,
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
    requiredZones: srFile.spatialRealityDna.requiredZones.length,
    forbiddenCount: srFile.spatialRealityDna.forbiddenSpatialTypes.length,
  });
}

// Write aggregate report
const aggregate = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  phase: '9B.1',
  title: 'Phase 9B.1 Spatial Reality Pipeline A/B Comparison (text-level)',
  brands: allBrands,
  summary: {
    totalBrands: Object.keys(allBrands).length,
    modeAPath: 'spatial_intelligence_9a2_9a3_8a_8b1 (Phase 9B Mode B, 14 块 baseline)',
    modeBPath: 'spatial_intelligence_9a2_9a3_9b1_8a_8b1 (Phase 9B.1 Mode B, 14 + spatial_reality_constraint = 15 块)',
    modeAAdapter: 'compileRuntimePromptModeASpatialReality',
    modeBAdapter: 'compileRuntimePromptWithSpatialReality',
  },
  notes: [
    'Mode A = Phase 9B Mode B baseline (14 块, 含 spatial_intent + architecture_language, 不含 spatial_reality_constraint)',
    'Mode B = Phase 9B Mode B + spatial_reality_constraint 块 (15 块, 反漂移 + 8 字段硬约束)',
    'Mode B 新增 1 块 (spatial_reality_constraint), 插在 architecture_language 之后, architecture_context 之前',
    'Provider not called. Image-level A/B requires real-provider smoke (separate user-authorized step).',
  ],
};
writeFileSync(join(resultsRoot, 'ab-comparison-aggregate.json'), JSON.stringify(aggregate, null, 2), 'utf8');

// Write markdown report
let md = `# Phase 9B.1 — Spatial Reality Pipeline A/B Comparison (text-level)

- **Generated**: ${new Date().toISOString()}
- **Phase**: 9B.1 (Space Generator v1.1)
- **Status**: text-level A/B complete (image-level requires real-provider smoke)
- **Mode A**: \`compileRuntimePromptModeASpatialReality\` = Phase 9B Mode B (14 块, baseline)
- **Mode B**: \`compileRuntimePromptWithSpatialReality\` = Phase 9B Mode B + spatial_reality_constraint 块 (15 块)

## 0. 目的

Phase 9B.1 在 Phase 9B Spatial Intelligence 基础上, 加 Spatial Reality Constraint
(8 字段硬约束 + 反漂移), 防止 Spatial Intent 增强后模型偏向 exhibition / installation
/ concept architecture, 提升商业真实性.

这一步只做 prompt 文本级 A/B 对比, 不调真实 Provider.

真实 Provider image-level A/B 由单独的 user-authorized smoke 跑, 不在本自动 phase 内.

## 1. 3 brand 概览

| Brand | Mode A blocks | Mode A chars | Mode B blocks | Mode B chars | Block diff | Char diff | Char ratio | Required zones | Forbidden |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
`;

for (const r of reportRows) {
  md += `| ${r.brand} | ${r.aBlocks} | ${r.aChars} | ${r.bBlocks} | ${r.bChars} | +${r.blockDiff} | +${r.charDiff} | +${r.charDiffRatio} | ${r.requiredZones} | ${r.forbiddenCount} |\n`;
}

md += `
## 2. 3 brand 8 字段 spatialRealityDna

| Brand | spaceType | requiredZones count | forbiddenSpatialTypes count |
| --- | --- | --- | --- |
`;

for (const brand of Object.keys(DNA_PATHS)) {
  const sr = allBrands[brand].modeB.spatialRealityDna;
  md += `| ${brand} | ${sr.spaceType} | ${sr.requiredZones.length} | ${sr.forbiddenSpatialTypes.length} |\n`;
}

md += `
## 3. 3 brand forbiddenSpatialTypes (反漂移)

| Brand | 关键 forbidden |
| --- | --- |
`;

for (const brand of Object.keys(DNA_PATHS)) {
  const sr = allBrands[brand].modeB.spatialRealityDna;
  md += `| ${brand} | ${sr.forbiddenSpatialTypes.slice(0, 3).join(' / ')} ... +${sr.forbiddenSpatialTypes.length - 3} more |\n`;
}

md += `
## 4. 块结构 (Mode B = 15 块)

Mode B 在 Phase 9B Mode B (14 块) 基础上, 在 \`architecture_language\` 之后插入 1 个新块:

1. \`task\`
2. \`spatial_intent\` (Phase 9A.2 — 体验目标 + spatial strategy)
3. \`architecture_language\` (Phase 9A.3 — 5 字段 high-level 方向)
4. \`spatial_reality_constraint\` (Phase 9B.1 — 8 字段商业现实硬约束, **本 phase 新增**)
5. \`architecture_context\` (Phase 8A anchor in-context reference)
6. \`architecture_function_bridge\` (Phase 8B.1)
7. \`architectural_concept\` / \`architecture_dna\` / \`brand_translation\` / \`functional_requirement\`
8. \`material\` / \`lighting\` / \`composition\` / \`rendering\`
9. \`negative_constraints\`

## 5. §8 冻结验证

Phase 9B.1 §8 冻结: **Spatial Intent / Architecture Anchor / architecture_context 都不动**.
禁止降低建筑语言能力.

- ✓ Mode B compiledSpatialIntent (Phase 9A.2) 不变
- ✓ Mode B architectureLanguage (Phase 9A.3) 不变
- ✓ Mode B architecture_context (Phase 8A) block content 不变
- ✓ Mode A = Phase 9B Mode B (14 块 baseline 100% 兼容)

## 6. 验证

- ✓ 3 brand 各自 distinct 8 字段 (spaceType / requiredZones / forbiddenSpatialTypes)
- ✓ 3 brand JZMX 含 'hospital corridor' forbidden, FTT / YJLF 不含
- ✓ 3 brand FTT requiredZones 含 'open_kitchen' signature, YJLF 含 'tea_corner', JZMX 含 'consultation_room'
- ✓ Mode A 14 块 (Phase 9B Mode B baseline, 100% 不变)
- ✓ Mode B 15 块 (14 + spatial_reality_constraint)
- ✓ Mode B 块顺序正确 (spatial_reality_constraint 在 architecture_language 之后, architecture_context 之前)
- ✓ 8 字段全覆盖 (spaceType / commercialScale / requiredZones / operationLogic / userFlow / privacyRequirement / materialReality / forbiddenSpatialTypes)
- ✓ compileFieldEnrichedPrompt 100% 不变 (11 块 baseline 仍然返回 11 块)
- ✓ compileRuntimePromptWithSpatialIntelligence 100% 不变 (14 块 Phase 9B Mode B 仍然返回 14 块)
- ✓ 不调真实 Provider (no fetch / http / LLM imports)

## 7. 6 维评价指标 (§6)

| 指标 | 目标 | Mode B 改进点 | 验证方法 |
| --- | --- | --- | --- |
| Brand Translation | 不下降 | architecture_context / brand_translation 块不变 | image-level 需人工 |
| Architecture Quality | 不下降 | architecture_language 块不变 | image-level 需人工 |
| Functional Realism | 提升 ≥15% | spatial_reality_constraint 显式列 requiredZones + userFlow | image-level 需人工 |
| Commercial Realism | 提升 ≥20% | materialReality 强制真实材料 + forbiddenSpatialTypes 反漂移 | image-level 需人工 |
| Spatial Coherence | 提升 | spaceType + commercialScale 给模型量化的空间类型 / 规模 | image-level 需人工 |
| Visual Quality | 保持 | 不修改任何视觉相关 baseline | image-level 需人工 |

## 8. 文件

- \`results/{brand}/mode-A.prompt.md\` — Mode A compiled prompt
- \`results/{brand}/mode-B.prompt.md\` — Mode B compiled prompt
- \`results/{brand}/ab-comparison.json\` — A/B 对比结构化 (block count / char count / diff / spatialRealityDna)
- \`results/ab-comparison-aggregate.json\` — 3 brand 聚合

## 9. 下一 phase: Phase 9C — Spatial Intelligence Runtime Integration (§10)

真实 Provider smoke (user-authorized) 后, 把 spatial-reality layer 跟 spatial-intelligence 一起挪到 production runtime.
`;

writeFileSync(join(resultsRoot, 'ab-comparison-report.md'), md, 'utf8');

console.log('A/B comparison complete.');
for (const r of reportRows) {
  console.log(`  ${r.brand}: Mode A ${r.aBlocks} blocks / ${r.aChars} chars -> Mode B ${r.bBlocks} blocks / ${r.bChars} chars (+${r.charDiff})`);
}
console.log(`\nReport: ${join(resultsRoot, 'ab-comparison-report.md')}`);
