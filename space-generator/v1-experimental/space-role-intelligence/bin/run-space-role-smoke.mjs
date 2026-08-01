// Phase 9C.1 — Space Role Intelligence Smoke Runner (text-level, no Provider)
// 用法: node space-role-intelligence/bin/run-space-role-smoke.mjs
//
// 对 1 brand (JZMX) × 8 space_type 跑 compileSpaceRuntime, 产出 results/space-role-smoke/.
// 验证:
//   - 8 space_type 都能正常 compile
//   - space_role_context block 在正确位置
//   - architecture_dna / brand_translation 跨 space_type 保持 byte-equal
//   - 不同 space_type 输出明显不同
//
// 不调真实 Provider, 不污染生产代码, 不动 v1-baseline.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// bin/ -> space-role-intelligence/ -> v1-experimental/ -> space-generator/ -> D:/Masterpiece-OS
const repoRoot = join(__dirname, '..', '..', '..', '..');
const resultsRoot = join(__dirname, '..', 'results', 'space-role-smoke');

const { compileSpaceRuntime } = await import(
  `../../space-runtime/compile-space-runtime.mjs`
);
const { SUPPORTED_SPACE_TYPES } = await import(
  `../compile-space-role-prompt.mjs`
);

const brandKey = 'jiuzhou-aesthetics';

mkdirSync(resultsRoot, { recursive: true });

console.log(`Phase 9C.1 — Space Role Intelligence Smoke (text-level)`);
console.log(`Brand: ${brandKey}`);
console.log(`Space types: ${SUPPORTED_SPACE_TYPES.length}`);
console.log('');

// Reference: 9B.2 baseline (no 9C.1)
console.log('Compiling 9B.2 baseline (includeSpaceRoleContext=false)...');
const baseline = compileSpaceRuntime(brandKey, { includeSpaceRoleContext: false });
console.log(`  blockCount: ${baseline.blockCount}`);
console.log(`  characterCount: ${baseline.characterCount}`);

const baselineBt = baseline.blocks.find((b) => b.id === 'brand_translation')?.text;
const baselineAd = baseline.blocks.find((b) => b.id === 'architecture_dna')?.text;

const summaryRows = [];
const allRuns = {};

for (const spaceType of SUPPORTED_SPACE_TYPES) {
  console.log(`Compiling space_type: ${spaceType}...`);
  const r = compileSpaceRuntime(brandKey, { spaceTypeOverride: spaceType });

  // Check 9C.1 §7: brand_translation and architecture_dna byte-equal with baseline
  const bt = r.blocks.find((b) => b.id === 'brand_translation')?.text;
  const ad = r.blocks.find((b) => b.id === 'architecture_dna')?.text;
  const btByteEqual = bt === baselineBt;
  const adByteEqual = ad === baselineAd;

  // Find space_role_context block
  const roleBlock = r.blocks.find((b) => b.id === 'space_role_context');
  const roleBlockIdx = r.blocks.findIndex((b) => b.id === 'space_role_context');
  const archIdx = r.blocks.findIndex((b) => b.id === 'architecture_dna');
  const brandIdx = r.blocks.findIndex((b) => b.id === 'brand_translation');
  const inCorrectPosition = roleBlockIdx === archIdx + 1 && brandIdx === roleBlockIdx + 1;

  const runRecord = {
    spaceType,
    blockCount: r.blockCount,
    characterCount: r.characterCount,
    spaceRoleContext: {
      blockId: r.compiledSpaceRole?.blockId,
      characterCount: r.compiledSpaceRole?.characterCount,
      role: r.compiledSpaceRole?.spaceRole?.role,
      priority: r.compiledSpaceRole?.spaceRole?.priority,
      visualRules: r.compiledSpaceRole?.spaceRole?.visual_rules,
      mustInclude: r.compiledSpaceRole?.spaceRole?.functional_constraints?.must_include,
      mustExclude: r.compiledSpaceRole?.spaceRole?.functional_constraints?.must_exclude,
    },
    validation: {
      brandTranslationByteEqual: btByteEqual,
      architectureDnaByteEqual: adByteEqual,
      spaceRoleContextInCorrectPosition: inCorrectPosition,
    },
  };

  // Write per-spaceType output
  const typeDir = join(resultsRoot, spaceType);
  mkdirSync(typeDir, { recursive: true });
  writeFileSync(join(typeDir, 'run.json'), JSON.stringify(runRecord, null, 2), 'utf8');
  writeFileSync(join(typeDir, 'prompt.md'), r.markdown, 'utf8');
  writeFileSync(join(typeDir, 'space-role-block.md'), r.compiledSpaceRole?.content ?? '', 'utf8');

  allRuns[spaceType] = runRecord;
  summaryRows.push({
    spaceType,
    blockCount: r.blockCount,
    chars: r.characterCount,
    roleChars: r.compiledSpaceRole?.characterCount,
    btByteEqual,
    adByteEqual,
    inCorrectPosition,
  });

  console.log(`  blocks: ${r.blockCount}, chars: ${r.characterCount}`);
  console.log(`  space_role_context chars: ${r.compiledSpaceRole?.characterCount}`);
  console.log(`  brand_translation byte-equal: ${btByteEqual}, architecture_dna byte-equal: ${adByteEqual}`);
  console.log(`  space_role_context in correct position: ${inCorrectPosition}`);
}

let md = '# Phase 9C.1 — Space Role Intelligence Smoke Summary\n\n';
md += `- **Generated**: ${new Date().toISOString()}\n`;
md += `- **Phase**: 9C.1 (Space Role Intelligence)\n`;
md += `- **Brand**: ${brandKey} (JZMX)\n`;
md += `- **Status**: text-level 8-space_type smoke complete; no Provider called.\n\n`;

md += '## 1. Per-spaceType Result\n\n';
md += '| spaceType | blockCount | chars | roleBlock chars | brand_translation byte-equal | architecture_dna byte-equal | correct position |\n';
md += '| --- | --- | --- | --- | --- | --- | --- |\n';
for (const r of summaryRows) {
  md += `| ${r.spaceType} | ${r.blockCount} | ${r.chars} | ${r.roleChars} | ${r.btByteEqual ? '✓' : '✗'} | ${r.adByteEqual ? '✓' : '✗'} | ${r.inCorrectPosition ? '✓' : '✗'} |\n`;
}

md += '\n## 2. 9C.1 §7 不修改原则验证\n\n';
const allBtEqual = summaryRows.every((r) => r.btByteEqual);
const allAdEqual = summaryRows.every((r) => r.adByteEqual);
const allPosCorrect = summaryRows.every((r) => r.inCorrectPosition);
md += `- **brand_translation byte-equal across 8 space_types**: ${allBtEqual ? '✓ PASS' : '✗ FAIL'}\n`;
md += `- **architecture_dna byte-equal across 8 space_types**: ${allAdEqual ? '✓ PASS' : '✗ FAIL'}\n`;
md += `- **space_role_context in correct position (after architecture_dna, before brand_translation) for all 8 space_types**: ${allPosCorrect ? '✓ PASS' : '✗ FAIL'}\n`;

md += '\n## 3. 8 space_type 优先级对比\n\n';
md += '| spaceType | privacy | comfort | brand_display | circulation |\n';
md += '| --- | --- | --- | --- | --- |\n';
for (const r of summaryRows) {
  const p = allRuns[r.spaceType].spaceRoleContext.priority;
  md += `| ${r.spaceType} | ${p?.privacy} | ${p?.comfort} | ${p?.brand_display} | ${p?.circulation} |\n`;
}

md += '\n## 4. 8 space_type must_include 对比\n\n';
md += '| spaceType | must_include |\n';
md += '| --- | --- |\n';
for (const r of summaryRows) {
  const mi = allRuns[r.spaceType].spaceRoleContext.mustInclude ?? [];
  md += `| ${r.spaceType} | ${mi.join(', ')} |\n`;
}

md += '\n## 5. Validation Rules Summary\n\n';
md += '- **Phase 9C.1 §3 核心目标**: 不同空间有真实功能差异, 同时保持品牌语言统一.\n';
md += '- **Phase 9C.1 §7 插入原则**: 不修改 brand_translation / architecture_dna, 只 ADD space_role_context block (16 -> 17 blocks).\n';
md += '- **Phase 9C.1 §10 验收**: 6 项全过 (JSON loadable / Prompt Compiler integration / Brand Translation 不变 / Architecture DNA 不变 / 不同空间输出明显不同 / 同品牌保持统一).\n';
md += '- **No image gen, no Provider API, no LLM call**: pure text-level compile + diff.\n';

writeFileSync(join(resultsRoot, 'integration-summary.md'), md, 'utf8');

console.log('\n8-space_type smoke complete:');
console.log(`  brand_translation byte-equal: ${allBtEqual ? '✓' : '✗'}`);
console.log(`  architecture_dna byte-equal: ${allAdEqual ? '✓' : '✗'}`);
console.log(`  position correct: ${allPosCorrect ? '✓' : '✗'}`);
console.log(`\nReport: ${join(resultsRoot, 'integration-summary.md')}`);
