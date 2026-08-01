#!/usr/bin/env node
// Architecture Preservation Pipeline Compiler v1 (Phase 9B.2) — validation suite
// 用法: node space-generator/v1-experimental/architecture-preservation/tests/compile-architecture-preservation-prompt.test.mjs
//
// Phase 9B.2 §6 + §9 验收:
//   1. Mode A wrapper: compileRuntimePromptModeAArchitecturePreservation = Phase 9B.1 Mode B + mode='A-architecture-preservation'
//   2. Mode B wrapper: compileRuntimePromptWithArchitecturePreservation 集成 architecture_preservation 块
//   3. 块结构正确: task / spatial_intent / architecture_language / spatial_reality_constraint / architecture_context / architecture_preservation / 14 baseline
//   4. 3 brand 各自 distinct architecturePreservation (weight + protectedElements)
//   5. §6 mechanism not object: 不添加具体装饰物
//   6. 不调 Provider (no fetch / http / LLM imports)
//   7. 不修改 baseline 行为 (Phase 9B.1 Mode B 100% 不变)
//   8. Phase 9B.2 §9 验收 4 项 (Architecture Quality / Functional Realism / Brand Translation / 商业运营真实性)
//
// 不调真实 Provider, 不污染生产代码, 不动 v1-baseline.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..');

const {
  compileRuntimePromptModeAArchitecturePreservation,
  compileRuntimePromptWithArchitecturePreservation,
} = await import('../compile-architecture-preservation-prompt.mjs');
const { compileArchitecturePreservationBlock } = await import('../prompt-block/compile-architecture-preservation-block.mjs');

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

console.log('Architecture Preservation Pipeline v1 (Phase 9B.2) \u2014 validation suite\n');

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
const AP_PATHS = {
  'jiuzhou-aesthetics': 'architecture-preservation/examples/jiuzhou-aesthetics.architecture-preservation.json',
  'feng-tang-tang': 'architecture-preservation/examples/feng-tang-tang.architecture-preservation.json',
  'yi-ji-liang-fang': 'architecture-preservation/examples/yi-ji-liang-fang.architecture-preservation.json',
};

test('compile-architecture-preservation-prompt.mjs exports compileRuntimePromptModeAArchitecturePreservation + compileRuntimePromptWithArchitecturePreservation', () => {
  assert(typeof compileRuntimePromptModeAArchitecturePreservation === 'function', 'compileRuntimePromptModeAArchitecturePreservation not exported');
  assert(typeof compileRuntimePromptWithArchitecturePreservation === 'function', 'compileRuntimePromptWithArchitecturePreservation not exported');
});

test('compile-architecture-preservation-block.mjs exports compileArchitecturePreservationBlock', () => {
  assert(typeof compileArchitecturePreservationBlock === 'function', 'compileArchitecturePreservationBlock not exported');
});

test('architecture-preservation-dna.schema.json exists', () => {
  const p = join(repoRoot, 'space-generator', 'v1-experimental', 'architecture-preservation', 'schema', 'architecture-preservation-dna.schema.json');
  assert(existsSync(p), `missing: ${p}`);
});

test('3 brand architecture-preservation example files exist', () => {
  for (const b of Object.keys(AP_PATHS)) {
    const p = join(repoRoot, 'space-generator', 'v1-experimental', AP_PATHS[b]);
    assert(existsSync(p), `missing: ${p}`);
  }
});

test('3 brand DNA + spatial intent + spatial reality example files exist', () => {
  for (const b of Object.keys(DNA_PATHS)) {
    for (const [name, paths] of [['DNA', DNA_PATHS], ['spatial intent', SI_PATHS], ['spatial reality', SR_PATHS]]) {
      const p = join(repoRoot, 'space-generator', 'v1-experimental', paths[b]);
      assert(existsSync(p), `missing ${name}: ${p}`);
    }
  }
});

// ---------- §11 验收 1: Mode A wrapper (Phase 9B.2) ----------
console.log('\nMode A wrapper (compileRuntimePromptModeAArchitecturePreservation):');

const dnaJZMX = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', DNA_PATHS['jiuzhou-aesthetics']), 'utf8'));
const siJZMX = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SI_PATHS['jiuzhou-aesthetics']), 'utf8'));
const srJZMX = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SR_PATHS['jiuzhou-aesthetics']), 'utf8'));
const apJZMX = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', AP_PATHS['jiuzhou-aesthetics']), 'utf8'));
const modeAJZMX = compileRuntimePromptModeAArchitecturePreservation(dnaJZMX, siJZMX.spatialIntentDna, srJZMX.spatialRealityDna, { brandKey: 'jiuzhou-aesthetics' });

test('Mode A returns 15 blocks (Phase 9B.1 Mode B baseline) for JZMX', () => {
  assert(modeAJZMX.blockCount === 15, `Mode A JZMX should have 15 blocks, got ${modeAJZMX.blockCount}`);
});

test('Mode A marks mode = "A-architecture-preservation"', () => {
  assert(modeAJZMX.mode === 'A-architecture-preservation', `Mode A wrapper should set mode='A-architecture-preservation', got '${modeAJZMX.mode}'`);
});

test('Mode A does NOT include architecture_preservation block', () => {
  const ids = modeAJZMX.blocks.map((b) => b.id);
  assert(!ids.includes('architecture_preservation'), `Mode A should NOT include architecture_preservation, got: ${ids.join(', ')}`);
});

test('Mode A preserves all Phase 9B.1 Mode B baseline (15 blocks)', () => {
  const ids = modeAJZMX.blocks.map((b) => b.id);
  const expected = ['task', 'spatial_intent', 'architecture_language', 'spatial_reality_constraint', 'architecture_context', 'architecture_function_bridge', 'architectural_concept', 'architecture_dna', 'brand_translation', 'functional_requirement', 'material', 'lighting', 'composition', 'rendering', 'negative_constraints'];
  assert(JSON.stringify(ids) === JSON.stringify(expected),
    `Mode A block order mismatch.\nExpected: ${expected.join(', ')}\nActual:   ${ids.join(', ')}`);
});

// ---------- §11 验收 2: Mode B wrapper (Phase 9B.2) ----------
console.log('\nMode B wrapper (compileRuntimePromptWithArchitecturePreservation):');

const dnaFTT = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', DNA_PATHS['feng-tang-tang']), 'utf8'));
const siFTT = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SI_PATHS['feng-tang-tang']), 'utf8'));
const srFTT = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SR_PATHS['feng-tang-tang']), 'utf8'));
const apFTT = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', AP_PATHS['feng-tang-tang']), 'utf8'));
const dnaYJLF = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', DNA_PATHS['yi-ji-liang-fang']), 'utf8'));
const siYJLF = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SI_PATHS['yi-ji-liang-fang']), 'utf8'));
const srYJLF = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', SR_PATHS['yi-ji-liang-fang']), 'utf8'));
const apYJLF = JSON.parse(readFileSync(join(repoRoot, 'space-generator', 'v1-experimental', AP_PATHS['yi-ji-liang-fang']), 'utf8'));

const modeBJZMX = compileRuntimePromptWithArchitecturePreservation(dnaJZMX, siJZMX.spatialIntentDna, srJZMX.spatialRealityDna, apJZMX.architecturePreservation, { brandKey: 'jiuzhou-aesthetics' });
const modeBFTT = compileRuntimePromptWithArchitecturePreservation(dnaFTT, siFTT.spatialIntentDna, srFTT.spatialRealityDna, apFTT.architecturePreservation, { brandKey: 'feng-tang-tang' });
const modeBYJLF = compileRuntimePromptWithArchitecturePreservation(dnaYJLF, siYJLF.spatialIntentDna, srYJLF.spatialRealityDna, apYJLF.architecturePreservation, { brandKey: 'yi-ji-liang-fang' });

test('Mode B returns 16 blocks (15 Phase 9B.1 + architecture_preservation) for JZMX', () => {
  assert(modeBJZMX.blockCount === 16, `Mode B JZMX should have 16 blocks, got ${modeBJZMX.blockCount}`);
});

test('Mode B marks mode = "B-architecture-preservation"', () => {
  assert(modeBJZMX.mode === 'B-architecture-preservation', `Mode B wrapper should set mode='B-architecture-preservation', got '${modeBJZMX.mode}'`);
});

test('Mode B block order: task / spatial_intent / architecture_language / spatial_reality_constraint / architecture_context / architecture_preservation / ...baseline', () => {
  const ids = modeBJZMX.blocks.map((b) => b.id);
  assert(ids[0] === 'task', `first block should be 'task', got '${ids[0]}'`);
  assert(ids[1] === 'spatial_intent', `second block should be 'spatial_intent', got '${ids[1]}'`);
  assert(ids[2] === 'architecture_language', `third block should be 'architecture_language', got '${ids[2]}'`);
  assert(ids[3] === 'spatial_reality_constraint', `fourth block should be 'spatial_reality_constraint', got '${ids[3]}'`);
  assert(ids[4] === 'architecture_context', `fifth block should be 'architecture_context', got '${ids[4]}'`);
  assert(ids[5] === 'architecture_preservation', `sixth block should be 'architecture_preservation', got '${ids[5]}'`);
  assert(ids[6] === 'architecture_function_bridge', `seventh block should be 'architecture_function_bridge', got '${ids[6]}'`);
});

test('Mode B runtime path includes 9b2', () => {
  assert(modeBJZMX.runtimePath.includes('9b2'),
    `Mode B runtimePath should include '9b2', got '${modeBJZMX.runtimePath}'`);
});

test('Mode B includes architecturePreservation in result', () => {
  assert(modeBJZMX.architecturePreservation, 'Mode B should include architecturePreservation');
  assert(typeof modeBJZMX.architecturePreservation.weight === 'number', 'architecturePreservation.weight should be number');
});

// ---------- §11 验收 3: 3 brand distinct architecturePreservation ----------
console.log('\n3 brand distinct architecturePreservation:');

test('3 brand weight are distinct or follow JZMX=0.7 / FTT=0.5 / YJLF=0.5 pattern', () => {
  // JZMX 建议 0.7, FTT / YJLF 用 0.5
  assert(apJZMX.architecturePreservation.weight === 0.7, `JZMX weight should be 0.7, got ${apJZMX.architecturePreservation.weight}`);
  assert(apFTT.architecturePreservation.weight === 0.5, `FTT weight should be 0.5, got ${apFTT.architecturePreservation.weight}`);
  assert(apYJLF.architecturePreservation.weight === 0.5, `YJLF weight should be 0.5, got ${apYJLF.architecturePreservation.weight}`);
});

test('3 brand protectedElements are valid enum values', () => {
  const validElements = ['ceiling_language', 'spatial_signature', 'material_expression', 'lighting_behavior'];
  for (const [brand, ap] of [['JZMX', apJZMX], ['FTT', apFTT], ['YJLF', apYJLF]]) {
    for (const elem of ap.architecturePreservation.protectedElements) {
      assert(validElements.includes(elem),
        `${brand} protectedElements contains invalid value '${elem}', must be one of: ${validElements.join(', ')}`);
    }
  }
});

test('FTT skipped ceiling_language (per Phase 9B.2 example, FTT is casual dining)', () => {
  assert(!apFTT.architecturePreservation.protectedElements.includes('ceiling_language'),
    'FTT should NOT include ceiling_language (casual dining, ceiling 不需要 architectural expression)');
  assert(apFTT.architecturePreservation.protectedElements.includes('spatial_signature'),
    'FTT should include spatial_signature');
});

test('3 brand architecture_preservation block text is distinct', () => {
  const j = modeBJZMX.blocks.find((b) => b.id === 'architecture_preservation').text;
  const f = modeBFTT.blocks.find((b) => b.id === 'architecture_preservation').text;
  const y = modeBYJLF.blocks.find((b) => b.id === 'architecture_preservation').text;
  assert(j !== f && j !== y && f !== y, '3 brand architecture_preservation text should be distinct');
});

// ---------- §6 mechanism not object 验证 ----------
console.log('\n§6 mechanism not object verification:');

test('architecture_preservation block includes mechanism not object warning', () => {
  const text = modeBJZMX.blocks.find((b) => b.id === 'architecture_preservation').text;
  assert(text.includes('mechanism not object'), 'block should include mechanism not object principle');
  assert(text.includes('禁止') || text.includes('✗'),
    'block should include forbidden actions (装饰 / 雕塑 / 视觉符号)');
});

test('architecture_preservation block does NOT add specific decoration (e.g. 花瓣 / 羽翼)', () => {
  const text = modeBJZMX.blocks.find((b) => b.id === 'architecture_preservation').text;
  // FORBIDDEN_LEAKAGE: specific decoration items
  const forbidden = ['花瓣', '羽翼', '雕塑', '装置'];
  for (const w of forbidden) {
    // Check that these only appear in forbidden list (with 禁止 / ✗), not as positive additions
    if (text.includes(w)) {
      // The word may appear but only in forbidden context. Check wider context (60 chars).
      const idx = text.indexOf(w);
      const ctx = text.substring(Math.max(0, idx - 60), Math.min(text.length, idx + 60));
      assert(ctx.includes('禁') || ctx.includes('✗') || ctx.includes('禁止') || ctx.includes('forbidden'),
        `architecture_preservation block contains '${w}' but not in forbidden context: ${ctx}`);
    }
  }
});

// ---------- §11 验收 4: 块结构 16 block 全名 ----------
console.log('\nBlock structure (16 blocks):');

test('Mode B JZMX has all expected 16 block ids in correct order', () => {
  const expected = [
    'task', 'spatial_intent', 'architecture_language',
    'spatial_reality_constraint', 'architecture_context',
    'architecture_preservation',
    'architecture_function_bridge',
    'architectural_concept', 'architecture_dna',
    'brand_translation', 'functional_requirement',
    'material', 'lighting', 'composition', 'rendering',
    'negative_constraints',
  ];
  const actual = modeBJZMX.blocks.map((b) => b.id);
  assert(JSON.stringify(actual) === JSON.stringify(expected),
    `Mode B block order mismatch.\nExpected: ${expected.join(', ')}\nActual:   ${actual.join(', ')}`);
});

// ---------- §11 验收 5: 不调 Provider ----------
console.log('\nNo Provider Calls:');

test('compile-architecture-preservation-prompt.mjs 不调网络', () => {
  const src = readFileSync(join(__dirname, '..', 'compile-architecture-preservation-prompt.mjs'), 'utf8');
  assert(!src.includes('fetch(') && !src.includes('http.') && !src.includes('https.'),
    'compile-architecture-preservation-prompt.mjs should not have network calls');
  const importLines = src.split('\n').filter((l) => l.trim().startsWith('import ') || l.trim().startsWith('from '));
  for (const line of importLines) {
    assert(!line.toLowerCase().includes('openai') && !line.toLowerCase().includes('seedream') && !line.toLowerCase().includes('http'),
      `compile-architecture-preservation-prompt.mjs import line should not reference LLM/Provider: ${line.trim()}`);
  }
});

test('compile-architecture-preservation-block.mjs 不调网络', () => {
  const src = readFileSync(join(__dirname, '..', 'prompt-block', 'compile-architecture-preservation-block.mjs'), 'utf8');
  assert(!src.includes('fetch('), 'compile-architecture-preservation-block.mjs should not have fetch calls');
  assert(!src.toLowerCase().includes('openai'), 'compile-architecture-preservation-block.mjs should not reference openai');
  assert(!src.toLowerCase().includes('seedream'), 'compile-architecture-preservation-block.mjs should not reference seedream');
});

// ---------- §11 验收 6: 不修改 baseline 行为 ----------
console.log('\nNo Baseline Modification:');

test('compile-architecture-preservation-prompt.mjs does not modify Phase 9B.1 Mode B', async () => {
  const { compileRuntimePromptWithSpatialReality } = await import(
    '../../spatial-reality/compile-spatial-reality-prompt.mjs'
  );
  const phase9b1ModeB = compileRuntimePromptWithSpatialReality(dnaJZMX, siJZMX.spatialIntentDna, srJZMX.spatialRealityDna, { brandKey: 'jiuzhou-aesthetics' });
  assert(phase9b1ModeB.blockCount === 15, `Phase 9B.1 Mode B should still return 15 blocks, got ${phase9b1ModeB.blockCount}`);
  // No architecture_preservation in Phase 9B.1 Mode B
  const ids = phase9b1ModeB.blocks.map((b) => b.id);
  assert(!ids.includes('architecture_preservation'), 'Phase 9B.1 Mode B should NOT include architecture_preservation');
});

test('Mode B preserves all Mode A (Phase 9B.1) baseline blocks (15 + 1 = 16)', () => {
  const aIds = modeAJZMX.blocks.map((b) => b.id);
  const bIds = modeBJZMX.blocks.map((b) => b.id);
  for (const a of aIds) {
    assert(bIds.includes(a), `Mode B should preserve baseline block '${a}'`);
  }
  // Plus the new architecture_preservation
  assert(bIds.includes('architecture_preservation'), 'Mode B should add architecture_preservation');
});

// ---------- 冻结验证: Phase 9A / 9B.1 不动 ----------
console.log('\nPhase 9A.2 / 9A.3 / 9B / 9B.1 不动验证:');

test('Mode B does not modify compiledSpatialIntent (Phase 9A.2)', () => {
  const a = modeAJZMX.compiledSpatialIntent;
  const b = modeBJZMX.compiledSpatialIntent;
  assert(a.experienceGoal === b.experienceGoal, 'compiledSpatialIntent.experienceGoal should be unchanged');
  assert(JSON.stringify(a.spatialStrategy) === JSON.stringify(b.spatialStrategy), 'compiledSpatialIntent.spatialStrategy should be unchanged');
});

test('Mode B does not modify architectureLanguage (Phase 9A.3)', () => {
  const a = modeAJZMX.architectureLanguage;
  const b = modeBJZMX.architectureLanguage;
  assert(JSON.stringify(a.spatialPrinciples) === JSON.stringify(b.spatialPrinciples), 'architectureLanguage.spatialPrinciples should be unchanged');
});

test('Mode B does not modify spatial_reality_constraint (Phase 9B.1)', () => {
  const aText = modeAJZMX.blocks.find((b) => b.id === 'spatial_reality_constraint')?.text;
  const bText = modeBJZMX.blocks.find((b) => b.id === 'spatial_reality_constraint')?.text;
  assert(aText === bText, 'spatial_reality_constraint block content should be unchanged in Mode B');
});

test('Mode B does not modify architecture_context (Phase 8A) - block content unchanged', () => {
  const aContext = modeAJZMX.blocks.find((b) => b.id === 'architecture_context')?.text;
  const bContext = modeBJZMX.blocks.find((b) => b.id === 'architecture_context')?.text;
  assert(aContext === bContext, 'architecture_context block content should be unchanged in Mode B');
});

// ---------- §9 验收 4 项 (text-level proxy) ----------
console.log('\n§9 验收 4 项 (text-level proxy):');

test('Architecture Quality: architecture_context block unchanged (proxy: Architecture Quality >= Phase 9B.1)', () => {
  const aContext = modeAJZMX.blocks.find((b) => b.id === 'architecture_context')?.text;
  const bContext = modeBJZMX.blocks.find((b) => b.id === 'architecture_context')?.text;
  assert(aContext === bContext, 'architecture_context should be unchanged to preserve Architecture Quality');
});

test('Functional Realism: spatial_reality_constraint block unchanged (proxy: Functional Realism not drop)', () => {
  const aReality = modeAJZMX.blocks.find((b) => b.id === 'spatial_reality_constraint')?.text;
  const bReality = modeBJZMX.blocks.find((b) => b.id === 'spatial_reality_constraint')?.text;
  assert(aReality === bReality, 'spatial_reality_constraint should be unchanged to preserve Functional Realism');
});

test('Brand Translation: brand_translation block unchanged (proxy: Brand Translation stable)', () => {
  const aBrand = modeAJZMX.blocks.find((b) => b.id === 'brand_translation')?.text;
  const bBrand = modeBJZMX.blocks.find((b) => b.id === 'brand_translation')?.text;
  assert(aBrand === bBrand, 'brand_translation should be unchanged to preserve Brand Translation');
});

test('Commercial Realism: architecture_preservation only adds mechanism protection, not specific decoration', () => {
  // architecture_preservation text should not contain any specific decoration item
  const apText = modeBJZMX.blocks.find((b) => b.id === 'architecture_preservation').text;
  const specificDecor = ['花瓣', '羽翼', '雕塑', '装置', '水晶灯', 'art installation'];
  for (const d of specificDecor) {
    if (apText.toLowerCase().includes(d.toLowerCase())) {
      const idx = apText.toLowerCase().indexOf(d.toLowerCase());
      const ctx = apText.substring(Math.max(0, idx - 60), Math.min(apText.length, idx + 60));
      assert(ctx.includes('禁') || ctx.includes('✗') || ctx.includes('禁止') || ctx.includes('forbidden'),
        `architecture_preservation should not add specific decoration '${d}': ${ctx}`);
    }
  }
});

// ---------- Validation: throws on invalid input ----------
console.log('\nInput validation:');

test('compileRuntimePromptWithArchitecturePreservation throws on null dna', () => {
  let threw = false;
  try { compileRuntimePromptWithArchitecturePreservation(null, siJZMX.spatialIntentDna, srJZMX.spatialRealityDna, apJZMX.architecturePreservation, { brandKey: 'jiuzhou-aesthetics' }); } catch { threw = true; }
  assert(threw, 'should throw on null dna');
});

test('compileRuntimePromptWithArchitecturePreservation throws on null architecturePreservation', () => {
  let threw = false;
  try { compileRuntimePromptWithArchitecturePreservation(dnaJZMX, siJZMX.spatialIntentDna, srJZMX.spatialRealityDna, null, { brandKey: 'jiuzhou-aesthetics' }); } catch { threw = true; }
  assert(threw, 'should throw on null architecturePreservation');
});

test('compileRuntimePromptWithArchitecturePreservation throws on null spatialIntentDna', () => {
  let threw = false;
  try { compileRuntimePromptWithArchitecturePreservation(dnaJZMX, null, srJZMX.spatialRealityDna, apJZMX.architecturePreservation, { brandKey: 'jiuzhou-aesthetics' }); } catch { threw = true; }
  assert(threw, 'should throw on null spatialIntentDna');
});

test('compileRuntimePromptWithArchitecturePreservation throws on null spatialRealityDna', () => {
  let threw = false;
  try { compileRuntimePromptWithArchitecturePreservation(dnaJZMX, siJZMX.spatialIntentDna, null, apJZMX.architecturePreservation, { brandKey: 'jiuzhou-aesthetics' }); } catch { threw = true; }
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
