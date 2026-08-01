#!/usr/bin/env node
// Spatial Intelligence Pipeline Compiler v1 (Phase 9B) — validation suite
// 用法: node space-generator/v1-experimental/spatial-intelligence-pipeline/tests/compile-spatial-intelligence-prompt.test.mjs
//
// Phase 9B §5 + §11 验收:
//   1. Mode A wrapper: compileRuntimePromptModeA = compileRuntimePrompt + mode='A'
//   2. Mode B wrapper: compileRuntimePromptWithSpatialIntelligence 集成 spatial_intent + architecture_language 块
//   3. 块结构正确: task / spatial_intent / architecture_language / 12 baseline
//   4. 3 brand 各自 distinct spatial_intent / architecture_language
//   5. 不调 Provider (no fetch / http / LLM imports)
//   6. 不修改 baseline 行为 (compileFieldEnrichedPrompt 不被修改)
//
// 不调真实 Provider, 不污染生产代码, 不动 v1-baseline.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..');

const {
  compileRuntimePromptModeA,
  compileRuntimePromptWithSpatialIntelligence,
} = await import('../compile-spatial-intelligence-prompt.mjs');
const { compileSpatialIntentBlock } = await import('../compile-spatial-intent-block.mjs');
const { compileArchitectureLanguageBlock } = await import('../compile-architecture-language-block.mjs');

let pass = 0;
let fail = 0;
const failures = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      // async function
      return result.then(
        () => { pass += 1; console.log(`  \u2713 ${name}`); },
        (err) => { fail += 1; failures.push({ name, error: err }); console.log(`  \u2717 ${name}\n      ${err.message}`); },
      );
    }
    pass += 1;
    console.log(`  \u2713 ${name}`);
  } catch (err) {
    fail += 1;
    failures.push({ name, error: err });
    console.log(`  \u2717 ${name}\n      ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log('Spatial Intelligence Pipeline v1 (Phase 9B) \u2014 validation suite\n');

// ---------- Preconditions ----------
console.log('Preconditions:');

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

test('compile-spatial-intelligence-prompt.mjs exports compileRuntimePromptModeA + compileRuntimePromptWithSpatialIntelligence', () => {
  assert(typeof compileRuntimePromptModeA === 'function', 'compileRuntimePromptModeA not exported');
  assert(typeof compileRuntimePromptWithSpatialIntelligence === 'function', 'compileRuntimePromptWithSpatialIntelligence not exported');
});

test('compile-spatial-intent-block.mjs exports compileSpatialIntentBlock', () => {
  assert(typeof compileSpatialIntentBlock === 'function', 'compileSpatialIntentBlock not exported');
});

test('compile-architecture-language-block.mjs exports compileArchitectureLanguageBlock', () => {
  assert(typeof compileArchitectureLanguageBlock === 'function', 'compileArchitectureLanguageBlock not exported');
});

test('3 brand DNA + spatial intent example files exist', () => {
  for (const b of Object.keys(DNA_PATHS)) {
    const dnaP = join(repoRoot, 'space-generator', 'v1-experimental', DNA_PATHS[b]);
    const siP = join(repoRoot, 'space-generator', 'v1-experimental', SI_PATHS[b]);
    assert(existsSync(dnaP), `missing DNA: ${dnaP}`);
    assert(existsSync(siP), `missing spatial intent: ${siP}`);
  }
});

// ---------- §11 验收 1: Mode A wrapper ----------
console.log('\nMode A wrapper (compileRuntimePromptModeA):');

const dnaA = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', DNA_PATHS['jiuzhou-aesthetics']), 'utf8'));
const modeAJZMX = compileRuntimePromptModeA(dnaA, { brandKey: 'jiuzhou-aesthetics' });

test('Mode A returns 12 blocks (anchor-aware) for JZMX', () => {
  assert(modeAJZMX.blockCount === 12, `Mode A JZMX should have 12 blocks, got ${modeAJZMX.blockCount}`);
});

test('Mode A marks mode = "A"', () => {
  assert(modeAJZMX.mode === 'A', `Mode A wrapper should set mode='A', got '${modeAJZMX.mode}'`);
});

test('Mode A does NOT include spatial_intent / architecture_language blocks', () => {
  const ids = modeAJZMX.blocks.map((b) => b.id);
  assert(!ids.includes('spatial_intent'), `Mode A should NOT include spatial_intent, got: ${ids.join(', ')}`);
  assert(!ids.includes('architecture_language'), `Mode A should NOT include architecture_language, got: ${ids.join(', ')}`);
});

// ---------- §11 验收 2: Mode B wrapper ----------
console.log('\nMode B wrapper (compileRuntimePromptWithSpatialIntelligence):');

const siA = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SI_PATHS['jiuzhou-aesthetics']), 'utf8'));
const siF = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SI_PATHS['feng-tang-tang']), 'utf8'));
const siY = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SI_PATHS['yi-ji-liang-fang']), 'utf8'));

const dnaF = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', DNA_PATHS['feng-tang-tang']), 'utf8'));
const dnaY = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', DNA_PATHS['yi-ji-liang-fang']), 'utf8'));

const modeBJZMX = compileRuntimePromptWithSpatialIntelligence(dnaA, siA.spatialIntentDna, { brandKey: 'jiuzhou-aesthetics' });
const modeBFTT = compileRuntimePromptWithSpatialIntelligence(dnaF, siF.spatialIntentDna, { brandKey: 'feng-tang-tang' });
const modeBYJLF = compileRuntimePromptWithSpatialIntelligence(dnaY, siY.spatialIntentDna, { brandKey: 'yi-ji-liang-fang' });

test('Mode B returns 14 blocks (12 baseline + spatial_intent + architecture_language) for JZMX', () => {
  assert(modeBJZMX.blockCount === 14, `Mode B JZMX should have 14 blocks, got ${modeBJZMX.blockCount}`);
});

test('Mode B marks mode = "B"', () => {
  assert(modeBJZMX.mode === 'B', `Mode B wrapper should set mode='B', got '${modeBJZMX.mode}'`);
});

test('Mode B block order: task / spatial_intent / architecture_language / ...baseline', () => {
  const ids = modeBJZMX.blocks.map((b) => b.id);
  assert(ids[0] === 'task', `first block should be 'task', got '${ids[0]}'`);
  assert(ids[1] === 'spatial_intent', `second block should be 'spatial_intent', got '${ids[1]}'`);
  assert(ids[2] === 'architecture_language', `third block should be 'architecture_language', got '${ids[2]}'`);
});

test('Mode B runtime path includes spatial_intelligence_9a2_9a3', () => {
  assert(modeBJZMX.runtimePath.includes('spatial_intelligence_9a2_9a3'),
    `Mode B runtimePath should include 'spatial_intelligence_9a2_9a3', got '${modeBJZMX.runtimePath}'`);
});

test('Mode B includes compiledSpatialIntent + architectureLanguage in result', () => {
  assert(modeBJZMX.compiledSpatialIntent, 'Mode B should include compiledSpatialIntent');
  assert(modeBJZMX.architectureLanguage, 'Mode B should include architectureLanguage');
  assert(typeof modeBJZMX.compiledSpatialIntent.experienceGoal === 'string', 'compiledSpatialIntent.experienceGoal should be string');
  assert(Array.isArray(modeBJZMX.architectureLanguage.spatialPrinciples), 'architectureLanguage.spatialPrinciples should be array');
});

// ---------- §11 验收 3: 3 brand distinct ----------
console.log('\n3 brand independence:');

test('3 brand experienceGoal are distinct', () => {
  assert(modeBJZMX.compiledSpatialIntent.experienceGoal !== modeBFTT.compiledSpatialIntent.experienceGoal, 'JZMX == FTT');
  assert(modeBJZMX.compiledSpatialIntent.experienceGoal !== modeBYJLF.compiledSpatialIntent.experienceGoal, 'JZMX == YJLF');
  assert(modeBFTT.compiledSpatialIntent.experienceGoal !== modeBYJLF.compiledSpatialIntent.experienceGoal, 'FTT == YJLF');
});

test('3 brand spatialPrinciples are distinct (no overlap)', () => {
  const jz = new Set(modeBJZMX.architectureLanguage.spatialPrinciples);
  const ft = new Set(modeBFTT.architectureLanguage.spatialPrinciples);
  const yj = new Set(modeBYJLF.architectureLanguage.spatialPrinciples);
  // JZMX 包含 continuous space, FTT 包含 human scale, YJLF 包含 layered privacy
  for (const s of jz) {
    assert(!ft.has(s), `JZMX spatialPrinciples should not overlap with FTT: '${s}' is in both`);
  }
  for (const s of ft) {
    assert(!yj.has(s), `FTT spatialPrinciples should not overlap with YJLF: '${s}' is in both`);
  }
  for (const s of yj) {
    assert(!jz.has(s), `YJLF spatialPrinciples should not overlap with JZMX: '${s}' is in both`);
  }
});

test('3 brand spatial_intent block text is distinct', () => {
  const jzText = modeBJZMX.blocks.find((b) => b.id === 'spatial_intent').text;
  const ftText = modeBFTT.blocks.find((b) => b.id === 'spatial_intent').text;
  const yjText = modeBYJLF.blocks.find((b) => b.id === 'spatial_intent').text;
  assert(jzText !== ftText, 'JZMX spatial_intent text should differ from FTT');
  assert(jzText !== yjText, 'JZMX spatial_intent text should differ from YJLF');
  assert(ftText !== yjText, 'FTT spatial_intent text should differ from YJLF');
});

test('3 brand architecture_language block text is distinct', () => {
  const jzText = modeBJZMX.blocks.find((b) => b.id === 'architecture_language').text;
  const ftText = modeBFTT.blocks.find((b) => b.id === 'architecture_language').text;
  const yjText = modeBYJLF.blocks.find((b) => b.id === 'architecture_language').text;
  assert(jzText !== ftText, 'JZMX architecture_language text should differ from FTT');
  assert(jzText !== yjText, 'JZMX architecture_language text should differ from YJLF');
  assert(ftText !== yjText, 'FTT architecture_language text should differ from YJLF');
});

// ---------- §11 验收 4: §10 Multi-brand expected keywords ----------
console.log('\n§10 Multi-brand Validation (expected keywords in Mode B):');

test('JZMX Mode B includes §10 expected: continuous space / soft boundary / controlled transparency', () => {
  const allText = modeBJZMX.markdown.toLowerCase();
  assert(allText.includes('continuous space'), `JZMX Mode B should include 'continuous space'`);
  assert(allText.includes('soft boundary'), `JZMX Mode B should include 'soft boundary'`);
  assert(allText.includes('controlled transparency'), `JZMX Mode B should include 'controlled transparency'`);
});

test('FTT Mode B includes §10 expected: human scale / visible process / warm interaction', () => {
  const allText = modeBFTT.markdown.toLowerCase();
  assert(allText.includes('human scale'), `FTT Mode B should include 'human scale'`);
  assert(allText.includes('visible process'), `FTT Mode B should include 'visible process'`);
  assert(allText.includes('warm interaction'), `FTT Mode B should include 'warm interaction'`);
});

test('YJLF Mode B includes §10 expected: layered privacy / natural materials / calm circulation', () => {
  const allText = modeBYJLF.markdown.toLowerCase();
  assert(allText.includes('layered privacy'), `YJLF Mode B should include 'layered privacy'`);
  assert(allText.includes('natural material') || allText.includes('natural materials'),
    `YJLF Mode B should include 'natural material(s)'`);
  assert(allText.includes('calm circulation') || allText.includes('quiet circulation'),
    `YJLF Mode B should include 'calm/quiet circulation'`);
});

// ---------- §11 验收 5: 块结构 14 block 全名 ----------
console.log('\nBlock structure (14 blocks):');

test('Mode B JZMX has all expected 14 block ids in correct order', () => {
  const expected = [
    'task', 'spatial_intent', 'architecture_language',
    'architecture_context', 'architecture_function_bridge',
    'architectural_concept', 'architecture_dna',
    'brand_translation', 'functional_requirement',
    'material', 'lighting', 'composition', 'rendering',
    'negative_constraints',
  ];
  const actual = modeBJZMX.blocks.map((b) => b.id);
  assert(JSON.stringify(actual) === JSON.stringify(expected),
    `Mode B block order mismatch.\nExpected: ${expected.join(', ')}\nActual:   ${actual.join(', ')}`);
});

// ---------- §11 验收 6: 不调 Provider ----------
console.log('\nNo Provider Calls:');

test('compile-spatial-intelligence-prompt.mjs 不调网络 (no fetch / http / LLM imports)', () => {
  const src = readFileSync(join(__dirname, '..', 'compile-spatial-intelligence-prompt.mjs'), 'utf8');
  assert(!src.includes('fetch(') && !src.includes('http.') && !src.includes('https.'),
    'compile-spatial-intelligence-prompt.mjs should not have network calls');
  const importLines = src.split('\n').filter((l) => l.trim().startsWith('import ') || l.trim().startsWith('from '));
  for (const line of importLines) {
    assert(!line.toLowerCase().includes('openai') && !line.toLowerCase().includes('seedream') && !line.toLowerCase().includes('http'),
      `compile-spatial-intelligence-prompt.mjs import line should not reference LLM/Provider: ${line.trim()}`);
  }
});

test('compile-spatial-intent-block.mjs 不调网络', () => {
  const src = readFileSync(join(__dirname, '..', 'compile-spatial-intent-block.mjs'), 'utf8');
  assert(!src.includes('fetch('), 'compile-spatial-intent-block.mjs should not have fetch calls');
  assert(!src.toLowerCase().includes('openai'), 'compile-spatial-intent-block.mjs should not reference openai');
  assert(!src.toLowerCase().includes('seedream'), 'compile-spatial-intent-block.mjs should not reference seedream');
});

test('compile-architecture-language-block.mjs 不调网络', () => {
  const src = readFileSync(join(__dirname, '..', 'compile-architecture-language-block.mjs'), 'utf8');
  assert(!src.includes('fetch('), 'compile-architecture-language-block.mjs should not have fetch calls');
  assert(!src.toLowerCase().includes('openai'), 'compile-architecture-language-block.mjs should not reference openai');
  assert(!src.toLowerCase().includes('seedream'), 'compile-architecture-language-block.mjs should not reference seedream');
});

// ---------- §11 验收 7: 不修改 baseline 行为 ----------
console.log('\nNo Baseline Modification:');

test('compile-spatial-intelligence-prompt.mjs does not modify compileFieldEnrichedPrompt', async () => {
  // Verify by re-importing compileFieldEnrichedPrompt directly and confirming it works without spatial intent
  const { compileFieldEnrichedPrompt } = await import('../../prompt-compiler/field-enriched/compile-prompt.mjs');
  const baselinePrompt = compileFieldEnrichedPrompt(dnaA);
  assert(baselinePrompt.blockCount === 11, `baseline compileFieldEnrichedPrompt should still return 11 blocks, got ${baselinePrompt.blockCount}`);
  // No spatial_intent / architecture_language in baseline
  const ids = baselinePrompt.blocks.map((b) => b.id);
  assert(!ids.includes('spatial_intent'), 'baseline should not include spatial_intent');
  assert(!ids.includes('architecture_language'), 'baseline should not include architecture_language');
});

test('Mode B preserves all baseline blocks (12 + 2 new = 14)', () => {
  // mode A = 12 blocks (with anchor)
  // mode B should be 12 + 2 = 14
  const aIds = modeAJZMX.blocks.map((b) => b.id);
  const bIds = modeBJZMX.blocks.map((b) => b.id);
  // every baseline block should still be in mode B
  for (const a of aIds) {
    assert(bIds.includes(a), `Mode B should preserve baseline block '${a}'`);
  }
});

// ---------- Validation: throws on invalid input ----------
console.log('\nInput validation:');

test('compileRuntimePromptWithSpatialIntelligence throws on null dna', () => {
  let threw = false;
  try { compileRuntimePromptWithSpatialIntelligence(null, siA.spatialIntentDna, { brandKey: 'jiuzhou-aesthetics' }); } catch { threw = true; }
  assert(threw, 'should throw on null dna');
});

test('compileRuntimePromptWithSpatialIntelligence throws on null spatialIntentDna', () => {
  let threw = false;
  try { compileRuntimePromptWithSpatialIntelligence(dnaA, null, { brandKey: 'jiuzhou-aesthetics' }); } catch { threw = true; }
  assert(threw, 'should throw on null spatialIntentDna');
});

// ---------- summary ----------
await new Promise((r) => setTimeout(r, 100));
console.log(`\nSummary: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.error.message}`);
  }
  process.exit(1);
}
process.exit(0);
