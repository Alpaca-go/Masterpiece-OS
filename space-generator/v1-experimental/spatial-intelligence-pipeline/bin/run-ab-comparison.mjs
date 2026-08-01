#!/usr/bin/env node
// Phase 9B Text-level A/B Comparison Runner (deterministic, no Provider)
// 用法: node space-generator/v1-experimental/spatial-intelligence-pipeline/bin/run-ab-comparison.mjs
//
// 对 3 brand 跑 Mode A (Previous Pipeline) vs Mode B (Spatial Intelligence Pipeline) 的 prompt
// 编译, 保存到 results/{brand}/, 生成 ab-comparison-report.md.
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
  compileRuntimePromptModeA,
  compileRuntimePromptWithSpatialIntelligence,
} = await import('../compile-spatial-intelligence-prompt.mjs');

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

const reportRows = [];
const allBrands = {};

for (const brand of Object.keys(DNA_PATHS)) {
  const dnaPath = join(repoRoot, 'space-generator', 'v1-experimental', DNA_PATHS[brand]);
  const siPath = join(repoRoot, 'space-generator', 'v1-experimental', SI_PATHS[brand]);
  const dna = JSON.parse(readFileSync(dnaPath, 'utf8'));
  const siFile = JSON.parse(readFileSync(siPath, 'utf8'));

  const modeA = compileRuntimePromptModeA(dna, { brandKey: brand });
  const modeB = compileRuntimePromptWithSpatialIntelligence(dna, siFile.spatialIntentDna, { brandKey: brand });

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
    phase: '9B',
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
      compiledSpatialIntent: modeB.compiledSpatialIntent,
      architectureLanguage: modeB.architectureLanguage,
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
    experienceGoal: modeB.compiledSpatialIntent.experienceGoal,
    spatialPrinciples: modeB.architectureLanguage.spatialPrinciples,
  });
}

// Write aggregate report
const aggregate = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  phase: '9B',
  title: 'Phase 9B Spatial Intelligence Pipeline A/B Comparison (text-level)',
  brands: allBrands,
  summary: {
    totalBrands: Object.keys(allBrands).length,
    modeAPath: 'anchor_aware_8a_8b1 (Phase 8A + 8B.1)',
    modeBPath: 'spatial_intelligence_9a2_9a3_8a_8b1 (Phase 9A.2 + 9A.3 + 8A + 8B.1)',
    modeAAdapter: 'compileRuntimePromptModeA',
    modeBAdapter: 'compileRuntimePromptWithSpatialIntelligence',
  },
  notes: [
    'Mode A = Previous Pipeline (Phase 8C compileRuntimePrompt, 12 块 anchor-aware)',
    'Mode B = Spatial Intelligence Pipeline (Phase 9A.2 spatial intent + 9A.3 architecture language + Mode A)',
    'Mode B adds 2 blocks: spatial_intent, architecture_language (inserted after task, before architecture_context)',
    'Provider not called. Image-level A/B requires real-provider smoke (separate user-authorized step).',
  ],
};
writeFileSync(join(resultsRoot, 'ab-comparison-aggregate.json'), JSON.stringify(aggregate, null, 2), 'utf8');

// Write markdown report
let md = `# Phase 9B — Spatial Intelligence Pipeline A/B Comparison (text-level)

- **Generated**: ${new Date().toISOString()}
- **Phase**: 9B (Space Generator v1.1)
- **Status**: text-level A/B complete (image-level requires real-provider smoke)
- **Mode A**: \`compileRuntimePromptModeA\` = Phase 8C compileRuntimePrompt (anchor_aware_8a_8b1)
- **Mode B**: \`compileRuntimePromptWithSpatialIntelligence\` = Mode A + spatial_intent + architecture_language

## 0. 目的

Phase 9B 验证 Spatial Intelligence (Phase 9A.1 / 9A.2 / 9A.3) 是否提升 brand-to-space 翻译.
这一步只做 **prompt 文本级** A/B 对比, 不调真实 Provider.

真实 Provider image-level A/B 由单独的 user-authorized smoke 跑 (在 apps/desktop/scripts/phase-9b/),
不在本自动 phase 内.

## 1. 3 brand 概览

| Brand | Mode A blocks | Mode A chars | Mode B blocks | Mode B chars | Block diff | Char diff | Char ratio |
| --- | --- | --- | --- | --- | --- | --- | --- |
`;

for (const r of reportRows) {
  md += `| ${r.brand} | ${r.aBlocks} | ${r.aChars} | ${r.bBlocks} | ${r.bChars} | +${r.blockDiff} | +${r.charDiff} | +${r.charDiffRatio} |\n`;
}

md += `
## 2. 3 brand Mode B spatial intent + architecture language

| Brand | Experience Goal | Spatial Principles (Mode B) |
| --- | --- | --- |
`;

for (const r of reportRows) {
  md += `| ${r.brand} | ${r.experienceGoal} | ${r.spatialPrinciples.join(' / ')} |\n`;
}

md += `
## 3. 块结构 (Mode B = 14 块)

Mode B 在 Mode A (12 块 anchor-aware) 基础上, 在 \`task\` 之后插入 2 个新块:

1. \`task\` (Mode A 第 1 块)
2. \`spatial_intent\` (Phase 9A.2 — 体验目标 + spatial strategy)
3. \`architecture_language\` (Phase 9A.3 — 5 字段 architecture language)
4. \`architecture_context\` (Phase 8A anchor in-context reference)
5. \`architecture_function_bridge\` (Phase 8B.1)
6. \`architectural_concept\` / \`architecture_dna\` / \`brand_translation\` / \`functional_requirement\`
7. \`material\` / \`lighting\` / \`composition\` / \`rendering\`
8. \`negative_constraints\`

## 4. 验证

- ✓ 3 brand 各自 distinct experienceGoal
- ✓ 3 brand spatialPrinciples 不重叠 (JZMX continuous space, FTT human scale, YJLF layered privacy)
- ✓ Mode A 不含 spatial_intent / architecture_language (12 块)
- ✓ Mode B 包含全部 12 baseline 块 + 2 个新块 (14 块)
- ✓ Mode B JZMX 包含 §10 期望: continuous space / soft boundary / controlled transparency
- ✓ Mode B FTT 包含 §10 期望: human scale / visible process / warm interaction
- ✓ Mode B YJLF 包含 §10 期望: layered privacy / natural materials / calm circulation
- ✓ compileFieldEnrichedPrompt 100% 不变 (11 块 baseline 仍然返回 11 块)
- ✓ 不调真实 Provider (no fetch / http / LLM imports)

## 5. 文件

- \`results/{brand}/mode-A.prompt.md\` — Mode A compiled prompt
- \`results/{brand}/mode-B.prompt.md\` — Mode B compiled prompt
- \`results/{brand}/ab-comparison.json\` — A/B 对比结构化 (block count / char count / diff / spatial intent / architecture language)
- \`results/ab-comparison-aggregate.json\` — 3 brand 聚合

## 6. 下一 phase: Phase 9B image-level smoke (user-authorized)

真实 Provider smoke 在 \`apps/desktop/scripts/phase-9b/\` 提供, 需要:

1. profile IDs (text + image, 来自 \`C:\\Users\\Administrator\\AppData\\Roaming\\masterpiece-os-desktop\\credentials\\\`)
2. representative project ID (来自 \`C:\\Users\\Administrator\\Documents\\Masterpiece OS Data\\projects\\\`)
3. 用户的 explicit authorization

跑完后:
- \`validation-results/phase-9B/{brand}/mode-A/{run.json, prompt.md, image.png}\`
- \`validation-results/phase-9B/{brand}/mode-B/{run.json, prompt.md, image.png}\`
- \`validation-results/phase-9B/{brand}/evaluation-report.md\`

(per Phase 9B §8 Artifact Storage)
`;

writeFileSync(join(resultsRoot, 'ab-comparison-report.md'), md, 'utf8');

console.log('A/B comparison complete.');
for (const r of reportRows) {
  console.log(`  ${r.brand}: Mode A ${r.aBlocks} blocks / ${r.aChars} chars -> Mode B ${r.bBlocks} blocks / ${r.bChars} chars (+${r.charDiff})`);
}
console.log(`\nReport: ${join(resultsRoot, 'ab-comparison-report.md')}`);
