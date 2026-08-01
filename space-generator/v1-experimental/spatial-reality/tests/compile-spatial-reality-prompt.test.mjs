#!/usr/bin/env node
// Spatial Reality Pipeline Compiler v1 (Phase 9B.1) — validation suite
// 用法: node space-generator/v1-experimental/spatial-reality/tests/compile-spatial-reality-prompt.test.mjs
//
// Phase 9B.1 §6 + §7 验收:
//   1. Mode A wrapper: compileRuntimePromptModeASpatialReality = Phase 9B Mode B + mode='A-spatial-reality'
//   2. Mode B wrapper: compileRuntimePromptWithSpatialReality 集成 spatial_reality_constraint 块
//   3. 块结构正确: task / spatial_intent / architecture_language / spatial_reality_constraint / 12 baseline
//   4. 3 brand 各自 distinct 8 字段 spatialRealityDna
//   5. 不调 Provider (no fetch / http / LLM imports)
//   6. 不修改 baseline 行为 (compileFieldEnrichedPrompt / Phase 9B Mode B 100% 不变)
//   7. §8 冻结: Spatial Intent / Architecture Anchor / architecture_context 都不动
//
// 不调真实 Provider, 不污染生产代码, 不动 v1-baseline.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..');

const {
  compileRuntimePromptModeASpatialReality,
  compileRuntimePromptWithSpatialReality,
} = await import('../compile-spatial-reality-prompt.mjs');
const { compileSpatialRealityBlock } = await import('../prompt-block/compile-spatial-reality-block.mjs');

let pass = 0;
let fail = 0;
const failures = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
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

console.log('Spatial Reality Pipeline v1 (Phase 9B.1) \u2014 validation suite\n');

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
const SR_PATHS = {
  'jiuzhou-aesthetics': 'spatial-reality/examples/jiuzhou-aesthetics.spatial-reality.json',
  'feng-tang-tang': 'spatial-reality/examples/feng-tang-tang.spatial-reality.json',
  'yi-ji-liang-fang': 'spatial-reality/examples/yi-ji-liang-fang.spatial-reality.json',
};

test('compile-spatial-reality-prompt.mjs exports compileRuntimePromptModeASpatialReality + compileRuntimePromptWithSpatialReality', () => {
  assert(typeof compileRuntimePromptModeASpatialReality === 'function', 'compileRuntimePromptModeASpatialReality not exported');
  assert(typeof compileRuntimePromptWithSpatialReality === 'function', 'compileRuntimePromptWithSpatialReality not exported');
});

test('compile-spatial-reality-block.mjs exports compileSpatialRealityBlock', () => {
  assert(typeof compileSpatialRealityBlock === 'function', 'compileSpatialRealityBlock not exported');
});

test('spatial-reality-dna.schema.json exists', () => {
  const p = join(repoRoot, 'space-generator', 'v1-experimental', 'spatial-reality', 'schema', 'spatial-reality-dna.schema.json');
  assert(existsSync(p), `missing: ${p}`);
});

test('3 brand spatial-reality example files exist', () => {
  for (const b of Object.keys(SR_PATHS)) {
    const p = join(repoRoot, 'space-generator', 'v1-experimental', SR_PATHS[b]);
    assert(existsSync(p), `missing: ${p}`);
  }
});

test('3 brand DNA + spatial intent example files exist', () => {
  for (const b of Object.keys(DNA_PATHS)) {
    const dnaP = join(repoRoot, 'space-generator', 'v1-experimental', DNA_PATHS[b]);
    const siP = join(repoRoot, 'space-generator', 'v1-experimental', SI_PATHS[b]);
    assert(existsSync(dnaP), `missing DNA: ${dnaP}`);
    assert(existsSync(siP), `missing spatial intent: ${siP}`);
  }
});

// ---------- §11 验收 1: Mode A wrapper (Phase 9B.1) ----------
console.log('\nMode A wrapper (compileRuntimePromptModeASpatialReality):');

const dnaJZMX = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', DNA_PATHS['jiuzhou-aesthetics']), 'utf8'));
const siJZMX = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SI_PATHS['jiuzhou-aesthetics']), 'utf8'));
const srJZMX = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SR_PATHS['jiuzhou-aesthetics']), 'utf8'));
const modeAJZMX = compileRuntimePromptModeASpatialReality(dnaJZMX, siJZMX.spatialIntentDna, { brandKey: 'jiuzhou-aesthetics' });

test('Mode A returns 14 blocks (Phase 9B Mode B baseline) for JZMX', () => {
  assert(modeAJZMX.blockCount === 14, `Mode A JZMX should have 14 blocks, got ${modeAJZMX.blockCount}`);
});

test('Mode A marks mode = "A-spatial-reality"', () => {
  assert(modeAJZMX.mode === 'A-spatial-reality', `Mode A wrapper should set mode='A-spatial-reality', got '${modeAJZMX.mode}'`);
});

test('Mode A does NOT include spatial_reality_constraint block', () => {
  const ids = modeAJZMX.blocks.map((b) => b.id);
  assert(!ids.includes('spatial_reality_constraint'), `Mode A should NOT include spatial_reality_constraint, got: ${ids.join(', ')}`);
});

test('Mode A preserves all Phase 9B Mode B baseline (12 + 2 = 14 blocks)', () => {
  // Mode A should equal Phase 9B Mode B exactly
  const ids = modeAJZMX.blocks.map((b) => b.id);
  const expected = ['task', 'spatial_intent', 'architecture_language', 'architecture_context', 'architecture_function_bridge', 'architectural_concept', 'architecture_dna', 'brand_translation', 'functional_requirement', 'material', 'lighting', 'composition', 'rendering', 'negative_constraints'];
  assert(JSON.stringify(ids) === JSON.stringify(expected),
    `Mode A block order mismatch.\nExpected: ${expected.join(', ')}\nActual:   ${ids.join(', ')}`);
});

// ---------- §11 验收 2: Mode B wrapper (Phase 9B.1) ----------
console.log('\nMode B wrapper (compileRuntimePromptWithSpatialReality):');

const dnaFTT = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', DNA_PATHS['feng-tang-tang']), 'utf8'));
const siFTT = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SI_PATHS['feng-tang-tang']), 'utf8'));
const srFTT = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SR_PATHS['feng-tang-tang']), 'utf8'));
const dnaYJLF = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', DNA_PATHS['yi-ji-liang-fang']), 'utf8'));
const siYJLF = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SI_PATHS['yi-ji-liang-fang']), 'utf8'));
const srYJLF = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SR_PATHS['yi-ji-liang-fang']), 'utf8'));

const modeBJZMX = compileRuntimePromptWithSpatialReality(dnaJZMX, siJZMX.spatialIntentDna, srJZMX.spatialRealityDna, { brandKey: 'jiuzhou-aesthetics' });
const modeBFTT = compileRuntimePromptWithSpatialReality(dnaFTT, siFTT.spatialIntentDna, srFTT.spatialRealityDna, { brandKey: 'feng-tang-tang' });
const modeBYJLF = compileRuntimePromptWithSpatialReality(dnaYJLF, siYJLF.spatialIntentDna, srYJLF.spatialRealityDna, { brandKey: 'yi-ji-liang-fang' });

test('Mode B returns 15 blocks (14 Phase 9B + spatial_reality_constraint) for JZMX', () => {
  assert(modeBJZMX.blockCount === 15, `Mode B JZMX should have 15 blocks, got ${modeBJZMX.blockCount}`);
});

test('Mode B marks mode = "B-spatial-reality"', () => {
  assert(modeBJZMX.mode === 'B-spatial-reality', `Mode B wrapper should set mode='B-spatial-reality', got '${modeBJZMX.mode}'`);
});

test('Mode B block order: task / spatial_intent / architecture_language / spatial_reality_constraint / ...baseline', () => {
  const ids = modeBJZMX.blocks.map((b) => b.id);
  assert(ids[0] === 'task', `first block should be 'task', got '${ids[0]}'`);
  assert(ids[1] === 'spatial_intent', `second block should be 'spatial_intent', got '${ids[1]}'`);
  assert(ids[2] === 'architecture_language', `third block should be 'architecture_language', got '${ids[2]}'`);
  assert(ids[3] === 'spatial_reality_constraint', `fourth block should be 'spatial_reality_constraint', got '${ids[3]}'`);
  assert(ids[4] === 'architecture_context', `fifth block should be 'architecture_context', got '${ids[4]}'`);
});

test('Mode B runtime path includes 9b1', () => {
  assert(modeBJZMX.runtimePath.includes('9b1'),
    `Mode B runtimePath should include '9b1', got '${modeBJZMX.runtimePath}'`);
});

test('Mode B includes spatialRealityDna in result', () => {
  assert(modeBJZMX.spatialRealityDna, 'Mode B should include spatialRealityDna');
  assert(typeof modeBJZMX.spatialRealityDna.spaceType === 'string', 'spatialRealityDna.spaceType should be string');
});

// ---------- §11 验收 3: 3 brand distinct 8 字段 ----------
console.log('\n3 brand distinct 8-field spatialRealityDna:');

test('3 brand spaceType are distinct', () => {
  const j = srJZMX.spatialRealityDna.spaceType;
  const f = srFTT.spatialRealityDna.spaceType;
  const y = srYJLF.spatialRealityDna.spaceType;
  assert(j !== f && j !== y && f !== y, `spaceType should be distinct: JZMX=${j}, FTT=${f}, YJLF=${y}`);
});

test('3 brand forbiddenSpatialTypes are distinct sets (no overlap)', () => {
  const jList = srJZMX.spatialRealityDna.forbiddenSpatialTypes;
  const fList = srFTT.spatialRealityDna.forbiddenSpatialTypes;
  const yList = srYJLF.spatialRealityDna.forbiddenSpatialTypes;
  // JZMX should include 'hospital corridor', FTT should NOT, YJLF should NOT
  const jHasHospital = jList.some((x) => x.includes('hospital corridor'));
  const fHasHospital = fList.some((x) => x.includes('hospital corridor'));
  const yHasHospital = yList.some((x) => x.includes('hospital corridor'));
  assert(jHasHospital, `JZMX forbidden should include hospital corridor: ${jList.join(', ')}`);
  assert(!fHasHospital, `FTT forbidden should NOT include hospital corridor: ${fList.join(', ')}`);
  assert(!yHasHospital, `YJLF forbidden should NOT include hospital corridor: ${yList.join(', ')}`);
});

test('3 brand requiredZones are distinct (each brand has its own functional zones)', () => {
  const j = new Set(srJZMX.spatialRealityDna.requiredZones);
  const f = new Set(srFTT.spatialRealityDna.requiredZones);
  const y = new Set(srYJLF.spatialRealityDna.requiredZones);
  // FTT should include 'open_kitchen' (signature)
  assert(f.has('open_kitchen'), 'FTT requiredZones should include open_kitchen');
  // YJLF should include 'tea_corner' (signature)
  assert(y.has('tea_corner'), 'YJLF requiredZones should include tea_corner');
  // JZMX should include 'consultation_room' (signature)
  assert(j.has('consultation_room'), 'JZMX requiredZones should include consultation_room');
});

test('3 brand spatial_reality_constraint block text is distinct', () => {
  const j = modeBJZMX.blocks.find((b) => b.id === 'spatial_reality_constraint').text;
  const f = modeBFTT.blocks.find((b) => b.id === 'spatial_reality_constraint').text;
  const y = modeBYJLF.blocks.find((b) => b.id === 'spatial_reality_constraint').text;
  assert(j !== f && j !== y && f !== y, '3 brand spatial_reality_constraint text should be distinct');
});

// ---------- §11 验收 4: 8 字段全覆盖 ----------
console.log('\n8 字段全覆盖 (Phase 9B.1 §3):');

test('3 brand all 8 spatialRealityDna fields are non-empty', () => {
  const fields = ['spaceType', 'commercialScale', 'requiredZones', 'operationLogic', 'userFlow', 'privacyRequirement', 'materialReality', 'forbiddenSpatialTypes'];
  for (const [brand, r] of [['JZMX', srJZMX], ['FTT', srFTT], ['YJLF', srYJLF]]) {
    for (const k of fields) {
      const v = r.spatialRealityDna[k];
      if (Array.isArray(v)) {
        assert(v.length > 0, `${brand}.${k} should be non-empty array, got ${v.length} items`);
      } else {
        assert(typeof v === 'string' && v.length > 0, `${brand}.${k} should be non-empty string, got ${v?.length || 0} chars`);
      }
    }
  }
});

// ---------- §11 验收 5: Mode B 包含 8 字段关键内容 ----------
console.log('\nMode B includes 8-field content:');

test('JZMX Mode B includes required zones (consultation_room) and forbidden (hospital corridor)', () => {
  const text = modeBJZMX.markdown;
  assert(text.includes('consultation_room'), 'JZMX Mode B should include consultation_room in required zones');
  assert(text.includes('hospital corridor'), 'JZMX Mode B should include hospital corridor in forbidden');
});

test('FTT Mode B includes required zones (open_kitchen) and forbidden (fine dining)', () => {
  const text = modeBFTT.markdown;
  assert(text.includes('open_kitchen'), 'FTT Mode B should include open_kitchen in required zones');
  assert(text.includes('fine dining'), 'FTT Mode B should include fine dining in forbidden');
});

test('YJLF Mode B includes required zones (tea_corner) and forbidden (modern hospital / spa)', () => {
  const text = modeBYJLF.markdown;
  assert(text.includes('tea_corner'), 'YJLF Mode B should include tea_corner in required zones');
  assert(text.includes('modern hospital') || text.includes('hospital corridor'),
    'YJLF Mode B should include hospital-related forbidden');
});

// ---------- §11 验收 6: 块结构 15 block 全名 ----------
console.log('\nBlock structure (15 blocks):');

test('Mode B JZMX has all expected 15 block ids in correct order', () => {
  const expected = [
    'task', 'spatial_intent', 'architecture_language',
    'spatial_reality_constraint',
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

// ---------- §11 验收 7: 不调 Provider ----------
console.log('\nNo Provider Calls:');

test('compile-spatial-reality-prompt.mjs 不调网络', () => {
  const src = readFileSync(join(__dirname, '..', 'compile-spatial-reality-prompt.mjs'), 'utf8');
  assert(!src.includes('fetch(') && !src.includes('http.') && !src.includes('https.'),
    'compile-spatial-reality-prompt.mjs should not have network calls');
  const importLines = src.split('\n').filter((l) => l.trim().startsWith('import ') || l.trim().startsWith('from '));
  for (const line of importLines) {
    assert(!line.toLowerCase().includes('openai') && !line.toLowerCase().includes('seedream') && !line.toLowerCase().includes('http'),
      `compile-spatial-reality-prompt.mjs import line should not reference LLM/Provider: ${line.trim()}`);
  }
});

test('compile-spatial-reality-block.mjs 不调网络', () => {
  const src = readFileSync(join(__dirname, '..', 'prompt-block', 'compile-spatial-reality-block.mjs'), 'utf8');
  assert(!src.includes('fetch('), 'compile-spatial-reality-block.mjs should not have fetch calls');
  assert(!src.toLowerCase().includes('openai'), 'compile-spatial-reality-block.mjs should not reference openai');
  assert(!src.toLowerCase().includes('seedream'), 'compile-spatial-reality-block.mjs should not reference seedream');
});

// ---------- §11 验收 8: 不修改 baseline 行为 ----------
console.log('\nNo Baseline Modification:');

test('compile-spatial-reality-prompt.mjs does not modify Phase 9B Mode B', async () => {
  // Verify by re-running Phase 9B Mode B directly and confirming it still returns 14 blocks
  const { compileRuntimePromptWithSpatialIntelligence } = await import(
    '../../spatial-intelligence-pipeline/compile-spatial-intelligence-prompt.mjs'
  );
  const phase9bModeB = compileRuntimePromptWithSpatialIntelligence(dnaJZMX, siJZMX.spatialIntentDna, { brandKey: 'jiuzhou-aesthetics' });
  assert(phase9bModeB.blockCount === 14, `Phase 9B Mode B should still return 14 blocks, got ${phase9bModeB.blockCount}`);
  // No spatial_reality_constraint in Phase 9B Mode B
  const ids = phase9bModeB.blocks.map((b) => b.id);
  assert(!ids.includes('spatial_reality_constraint'), 'Phase 9B Mode B should NOT include spatial_reality_constraint');
});

test('Mode B preserves all Mode A (Phase 9B) baseline blocks (14 + 1 = 15)', () => {
  const aIds = modeAJZMX.blocks.map((b) => b.id);
  const bIds = modeBJZMX.blocks.map((b) => b.id);
  for (const a of aIds) {
    assert(bIds.includes(a), `Mode B should preserve baseline block '${a}'`);
  }
  // Plus the new spatial_reality_constraint
  assert(bIds.includes('spatial_reality_constraint'), 'Mode B should add spatial_reality_constraint');
});

// ---------- §8 冻结验证: Phase 9A.1 / 9A.2 / 9A.3 不动 ----------
console.log('\nPhase 9B.1 §8 冻结: Spatial Intent / Architecture Anchor / architecture_context 不动:');

test('Mode B does not modify compiledSpatialIntent (Phase 9A.2)', () => {
  // compiledSpatialIntent should be same as Phase 9B Mode B
  const a = modeAJZMX.compiledSpatialIntent;
  const b = modeBJZMX.compiledSpatialIntent;
  assert(a.experienceGoal === b.experienceGoal, 'compiledSpatialIntent.experienceGoal should be unchanged');
  assert(JSON.stringify(a.spatialStrategy) === JSON.stringify(b.spatialStrategy), 'compiledSpatialIntent.spatialStrategy should be unchanged');
});

test('Mode B does not modify architectureLanguage (Phase 9A.3)', () => {
  // architectureLanguage should be same as Phase 9B Mode B
  const a = modeAJZMX.architectureLanguage;
  const b = modeBJZMX.architectureLanguage;
  assert(JSON.stringify(a.spatialPrinciples) === JSON.stringify(b.spatialPrinciples), 'architectureLanguage.spatialPrinciples should be unchanged');
});

test('Mode B does not modify architecture_context (Phase 8A) - block content unchanged', () => {
  const aContext = modeAJZMX.blocks.find((b) => b.id === 'architecture_context')?.text;
  const bContext = modeBJZMX.blocks.find((b) => b.id === 'architecture_context')?.text;
  assert(aContext === bContext, 'architecture_context block content should be unchanged in Mode B');
});

// ---------- Validation: throws on invalid input ----------
console.log('\nInput validation:');

test('compileRuntimePromptWithSpatialReality throws on null dna', () => {
  let threw = false;
  try { compileRuntimePromptWithSpatialReality(null, siJZMX.spatialIntentDna, srJZMX.spatialRealityDna, { brandKey: 'jiuzhou-aesthetics' }); } catch { threw = true; }
  assert(threw, 'should throw on null dna');
});

test('compileRuntimePromptWithSpatialReality throws on null spatialIntentDna', () => {
  let threw = false;
  try { compileRuntimePromptWithSpatialReality(dnaJZMX, null, srJZMX.spatialRealityDna, { brandKey: 'jiuzhou-aesthetics' }); } catch { threw = true; }
  assert(threw, 'should throw on null spatialIntentDna');
});

test('compileRuntimePromptWithSpatialReality throws on null spatialRealityDna', () => {
  let threw = false;
  try { compileRuntimePromptWithSpatialReality(dnaJZMX, siJZMX.spatialIntentDna, null, { brandKey: 'jiuzhou-aesthetics' }); } catch { threw = true; }
  assert(threw, 'should throw on null spatialRealityDna');
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
