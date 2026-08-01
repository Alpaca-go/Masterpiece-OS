#!/usr/bin/env node
// Spatial Intent Presets — Phase v1.0 validation suite
// 用法: node spatial-intent-presets/tests/compile-spatial-intent-preset.test.mjs
//
// 测试目标 (Phase v1.0 §12 success criteria):
//   1. 用户可理解 4 种模式 (brand_driven / architecture_driven / reference_driven / balanced)
//   2. 模式之间生成结果存在明显差异 (4 维 intent expression 各不同)
//   3. 不破坏 Brand DNA (compileSpaceRuntime 默认行为不变)
//   4. 不破坏 Industry Logic (industryConstraint=maintain 永远保持)
//   5. 不增加 Prompt 混乱 (text-based emphasis, no weight numbers)
//   6. 不增加大量测试成本 (4 preset × 4 brand = 16 cases, 跑一次 text-level)
//
// 不调真实 Provider, 不污染生产代码, 不动 v1-baseline.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// test file path: D:/Masterpiece-OS/space-generator/v1-experimental/spatial-intent-presets/tests/compile-spatial-intent-preset.test.mjs
// __dirname = D:/Masterpiece-OS/space-generator/v1-experimental/spatial-intent-presets
// 3 levels up to repo root D:/Masterpiece-OS
const repoRoot = join(__dirname, '..', '..', '..');

const {
  compileSpatialIntentPresetBlock,
  loadPreset,
  listAvailablePresets,
  SUPPORTED_PRESETS,
  PHASE,
  VERSION,
  MODULE_NAME,
  DATA_CONTRACT,
} = await import('../compile-spatial-intent-preset-prompt.mjs');
const { compileSpaceRuntime } = await import('../../space-runtime/compile-space-runtime.mjs');

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

console.log('Spatial Intent Presets v1.0 (Phase v1.0) \u2014 validation suite\n');

// ---------- Preconditions ----------
console.log('Preconditions:');

test('module exports compileSpatialIntentPresetBlock + loadPreset + SUPPORTED_PRESETS + DATA_CONTRACT', () => {
  assert(typeof compileSpatialIntentPresetBlock === 'function', 'compileSpatialIntentPresetBlock not exported');
  assert(typeof loadPreset === 'function', 'loadPreset not exported');
  assert(Array.isArray(SUPPORTED_PRESETS), 'SUPPORTED_PRESETS not exported');
  assert(DATA_CONTRACT, 'DATA_CONTRACT not exported');
});

test('PHASE = "spatial-intent-presets" and VERSION = "1.0.0"', () => {
  assert(PHASE === 'spatial-intent-presets', `PHASE should be 'spatial-intent-presets', got '${PHASE}'`);
  assert(VERSION === '1.0.0', `VERSION should be '1.0.0', got '${VERSION}'`);
  assert(MODULE_NAME === 'spatial-intent-presets', `MODULE_NAME should be 'spatial-intent-presets'`);
});

test('SUPPORTED_PRESETS has 4 presets (Phase v1.0 §4)', () => {
  assert(SUPPORTED_PRESETS.length === 4, `should have 4 presets, got ${SUPPORTED_PRESETS.length}`);
  for (const p of ['brand_driven', 'architecture_driven', 'reference_driven', 'balanced']) {
    assert(SUPPORTED_PRESETS.includes(p), `SUPPORTED_PRESETS should include '${p}'`);
  }
});

// ---------- §12.1 4 preset JSONs loadable ----------
console.log('\n\u00a712.1 4 preset JSONs loadable:');

test('all 4 preset JSON files exist on disk', () => {
  const dir = join(__dirname, '..');
  for (const p of SUPPORTED_PRESETS) {
    const filePath = join(dir, `${p}.json`);
    assert(existsSync(filePath), `Preset JSON not found: ${filePath}`);
  }
});

test('loadPreset returns parsed object with required fields (4 presets)', () => {
  const requiredFields = ['preset', 'label', 'runtimeTendency', 'intent'];
  for (const p of SUPPORTED_PRESETS) {
    const r = loadPreset(p);
    assert(r, `loadPreset(${p}) returned null/undefined`);
    for (const f of requiredFields) {
      assert(r[f] !== undefined, `loadPreset(${p}) missing field '${f}'`);
    }
    assert(r.preset === p, `preset mismatch: expected '${p}', got '${r.preset}'`);
  }
});

test('loadPreset: intent has 4 dimensions (brandExpression / architectureExpression / referenceInfluence / industryConstraint)', () => {
  for (const p of SUPPORTED_PRESETS) {
    const r = loadPreset(p);
    for (const dim of ['brandExpression', 'architectureExpression', 'referenceInfluence', 'industryConstraint']) {
      assert(typeof r.intent[dim] === 'string', `${p}.intent.${dim} should be string`);
      assert(['low', 'balanced', 'maintain', 'dominant'].includes(r.intent[dim]), `${p}.intent.${dim} should be one of low/balanced/maintain/dominant, got ${r.intent[dim]}`);
    }
  }
});

test('loadPreset: industryConstraint is always "maintain" (Phase v1.0 §3 永远不 drop industry logic)', () => {
  for (const p of SUPPORTED_PRESETS) {
    const r = loadPreset(p);
    assert(r.intent.industryConstraint === 'maintain', `${p}.industryConstraint should be "maintain" (never drop), got "${r.intent.industryConstraint}"`);
  }
});

test('loadPreset throws on missing or invalid preset', () => {
  let threw = false;
  try { loadPreset(null); } catch { threw = true; }
  assert(threw, 'should throw on null preset');
  threw = false;
  try { loadPreset('unknown_preset_xyz'); } catch { threw = true; }
  assert(threw, 'should throw on unsupported preset');
});

test('listAvailablePresets returns 4 preset names matching SUPPORTED_PRESETS', () => {
  const list = listAvailablePresets();
  assert(list.length === 4, `should list 4 presets, got ${list.length}`);
  for (const p of SUPPORTED_PRESETS) {
    assert(list.includes(p), `listAvailablePresets should include '${p}'`);
  }
});

// ---------- §12.2 4 preset compile distinct content ----------
console.log('\n\u00a712.2 4 preset compile distinct content:');

test('compileSpatialIntentPresetBlock returns { blockId, blockTitle, content, spatialIntentPreset, characterCount }', () => {
  const r = compileSpatialIntentPresetBlock('brand_driven');
  assert(r.blockId === 'spatial_intent_preset', `blockId should be 'spatial_intent_preset', got '${r.blockId}'`);
  assert(typeof r.blockTitle === 'string' && r.blockTitle.includes('Spatial Intent Preset'), 'blockTitle should include "Spatial Intent Preset"');
  assert(typeof r.content === 'string' && r.content.length > 0, 'content should be non-empty string');
  assert(r.spatialIntentPreset, 'spatialIntentPreset should be present');
  assert(typeof r.characterCount === 'number' && r.characterCount > 0, 'characterCount should be positive');
});

test('4 preset intent 4 dimensions are all distinct (no two presets share same fingerprint)', () => {
  const fingerprints = {};
  for (const p of SUPPORTED_PRESETS) {
    const r = loadPreset(p);
    fingerprints[p] = JSON.stringify(r.intent);
  }
  const unique = new Set(Object.values(fingerprints));
  assert(unique.size === 4, `4 presets should have 4 distinct intent fingerprints, got ${unique.size} unique`);
});

test('4 preset emphasis text is all distinct (no two presets produce same content)', () => {
  const contents = SUPPORTED_PRESETS.map((p) => compileSpatialIntentPresetBlock(p).content);
  const unique = new Set(contents);
  assert(unique.size === 4, `4 presets should produce 4 distinct content, got ${unique.size} unique`);
});

test('4 preset emphasis text does NOT contain weight numbers (Phase v1.0 §3 / §7)', () => {
  // Per §3: "禁止: Brand 70% / Architecture 50% / Material 80%" (no weight numbers)
  // Per §7: "不直接加入 'architecture weight 80%'" (no weight numbers in prompt layer)
  for (const p of SUPPORTED_PRESETS) {
    const r = compileSpatialIntentPresetBlock(p);
    // Check for percentage / weight patterns: "70%", "weight 80", "Architecture 50%" etc.
    assert(!/\d+\s*%/u.test(r.content), `${p}: should not contain percentage like "70%"`);
    assert(!/weight\s+\d+/iu.test(r.content), `${p}: should not contain "weight 80" pattern`);
    assert(!/brand\s+\d+\s*%/iu.test(r.content), `${p}: should not contain "Brand 70%" pattern`);
  }
});

test('brand_driven intent: brandExpression=dominant, architectureExpression=balanced', () => {
  const r = loadPreset('brand_driven');
  assert(r.intent.brandExpression === 'dominant', `brand_driven.brandExpression should be 'dominant'`);
  assert(r.intent.architectureExpression === 'balanced', `brand_driven.architectureExpression should be 'balanced'`);
});

test('architecture_driven intent: architectureExpression=dominant, brandExpression=balanced', () => {
  const r = loadPreset('architecture_driven');
  assert(r.intent.architectureExpression === 'dominant', `architecture_driven.architectureExpression should be 'dominant'`);
  assert(r.intent.brandExpression === 'balanced', `architecture_driven.brandExpression should be 'balanced'`);
});

test('reference_driven intent: referenceInfluence=dominant', () => {
  const r = loadPreset('reference_driven');
  assert(r.intent.referenceInfluence === 'dominant', `reference_driven.referenceInfluence should be 'dominant'`);
});

test('balanced intent: all 4 dims balanced (or maintain for industryConstraint)', () => {
  const r = loadPreset('balanced');
  assert(r.intent.brandExpression === 'balanced');
  assert(r.intent.architectureExpression === 'balanced');
  assert(r.intent.referenceInfluence === 'balanced');
  assert(r.intent.industryConstraint === 'maintain');
});

test('compileSpatialIntentPresetBlock content includes preset label and 4-dim intent', () => {
  const r = compileSpatialIntentPresetBlock('architecture_driven');
  assert(r.content.includes('architecture_driven'), 'content should include preset name');
  assert(r.content.includes('architectureExpression: **dominant**'), 'content should include dominant architecture expression');
  assert(r.content.includes('brandExpression: **balanced**'), 'content should include balanced brand expression');
  assert(r.content.includes('industryConstraint: **maintain**'), 'content should include maintain industry constraint');
  // Doc §7 verbatim text should appear
  assert(r.content.includes('Prioritize architectural composition'), 'content should include doc §7 verbatim example text');
});

test('compileSpatialIntentPresetBlock content includes brand key when provided', () => {
  const r = compileSpatialIntentPresetBlock('brand_driven', { brandKey: 'wa-ye', industry: 'casual_dining' });
  assert(r.content.includes('wa-ye'), 'content should include brand key wa-ye');
  assert(r.content.includes('casual_dining'), 'content should include industry casual_dining');
});

test('compileSpatialIntentPresetBlock throws on missing or unsupported preset', () => {
  let threw = false;
  try { compileSpatialIntentPresetBlock(null); } catch { threw = true; }
  assert(threw, 'should throw on null preset');
  threw = false;
  try { compileSpatialIntentPresetBlock('unknown_preset_xyz'); } catch { threw = true; }
  assert(threw, 'should throw on unsupported preset');
});

// ---------- §12.3 compileSpaceRuntime integration ----------
console.log('\n\u00a712.3 compileSpaceRuntime integration:');

test('compileSpaceRuntime with no preset: 9C.1 default behavior (16/17 blocks, no preset block)', () => {
  const r = compileSpaceRuntime('jiuzhou-aesthetics');
  assert(r.blockCount === 17, `JZMX 9C.1 default should be 17 blocks, got ${r.blockCount}`);
  assert(!r.compiledSpatialIntentPreset, 'should not have compiledSpatialIntentPreset when no preset');
  assert(r.preset === null, 'preset should be null when not specified');
  // block list should NOT contain spatial_intent_preset
  const ids = r.blocks.map((b) => b.id);
  assert(!ids.includes('spatial_intent_preset'), `should NOT include spatial_intent_preset block, got ${ids.join(',')}`);
  // brand_translation / architecture_dna / space_role_context byte-equal unchanged
  const r2 = compileSpaceRuntime('jiuzhou-aesthetics', { preset: 'balanced' });
  for (const layer of ['architecture_dna', 'brand_translation', 'space_role_context']) {
    const a = r.blocks.find((b) => b.id === layer)?.text;
    const b = r2.blocks.find((b) => b.id === layer)?.text;
    assert(a === b, `${layer} must be byte-equal with/without preset (preset doesn't modify 9C.1 layer)`);
  }
});

test('compileSpaceRuntime with preset=balanced: 18 blocks (JZMX/FTT/YJLF), spatial_intent_preset inserted', () => {
  const r = compileSpaceRuntime('jiuzhou-aesthetics', { preset: 'balanced' });
  assert(r.blockCount === 18, `JZMX + preset should be 18 blocks, got ${r.blockCount}`);
  assert(r.compiledSpatialIntentPreset, 'should have compiledSpatialIntentPreset');
  assert(r.preset === 'balanced', 'preset should be balanced');
  const ids = r.blocks.map((b) => b.id);
  assert(ids.includes('spatial_intent_preset'), 'should include spatial_intent_preset block');
  // spatial_intent_preset is between architecture_dna and space_role_context
  const archDnaIdx = ids.indexOf('architecture_dna');
  const presetIdx = ids.indexOf('spatial_intent_preset');
  const spaceRoleIdx = ids.indexOf('space_role_context');
  assert(presetIdx === archDnaIdx + 1, `spatial_intent_preset should follow architecture_dna (archDnaIdx=${archDnaIdx}, presetIdx=${presetIdx})`);
  assert(spaceRoleIdx === presetIdx + 1, `space_role_context should follow spatial_intent_preset (presetIdx=${presetIdx}, spaceRoleIdx=${spaceRoleIdx})`);
});

test('compileSpaceRuntime with 4 different presets produces 4 distinct spatial_intent_preset contents', () => {
  const contents = new Set();
  for (const preset of SUPPORTED_PRESETS) {
    const r = compileSpaceRuntime('wa-ye', { preset });
    assert(r.compiledSpatialIntentPreset, `should have preset block for ${preset}`);
    contents.add(r.compiledSpatialIntentPreset.content);
  }
  assert(contents.size === 4, `4 presets should produce 4 distinct preset contents, got ${contents.size}`);
});

test('compileSpaceRuntime: architecture_dna and brand_translation byte-equal across all 4 presets (Phase v1.0 §principles)', () => {
  const r0 = compileSpaceRuntime('wa-ye', { preset: 'balanced' });
  for (const preset of SUPPORTED_PRESETS) {
    const r = compileSpaceRuntime('wa-ye', { preset });
    for (const layer of ['architecture_dna', 'brand_translation']) {
      const a = r0.blocks.find((b) => b.id === layer)?.text;
      const b = r.blocks.find((b) => b.id === layer)?.text;
      assert(a === b, `${layer} must be byte-equal across presets (preset doesn't modify layer); failed for preset=${preset}`);
    }
  }
});

test('compileSpaceRuntime: space_role_context (Phase 9C.1) byte-equal across all 4 presets (Phase v1.0 + 9C.1 不冲突)', () => {
  const r0 = compileSpaceRuntime('wa-ye', { preset: 'balanced' });
  for (const preset of SUPPORTED_PRESETS) {
    const r = compileSpaceRuntime('wa-ye', { preset });
    const a = r0.blocks.find((b) => b.id === 'space_role_context')?.text;
    const b = r.blocks.find((b) => b.id === 'space_role_context')?.text;
    assert(a === b, `space_role_context must be byte-equal across presets (Phase v1.0 + 9C.1 不冲突); failed for preset=${preset}`);
  }
});

test('compileSpaceRuntime: moduleVersions includes spatialIntentPresets when preset specified', () => {
  const r = compileSpaceRuntime('wa-ye', { preset: 'brand_driven' });
  assert(r.moduleVersions.spatialIntentPresets, 'moduleVersions.spatialIntentPresets should be set when preset specified');
  assert(r.moduleVersions.spatialIntentPresets === 'spatial-intent-presets', `moduleVersions.spatialIntentPresets should be 'spatial-intent-presets', got '${r.moduleVersions.spatialIntentPresets}'`);
});

test('compileSpaceRuntime: moduleVersions does NOT include spatialIntentPresets when no preset', () => {
  const r = compileSpaceRuntime('wa-ye');
  assert(r.moduleVersions.spatialIntentPresets === undefined, 'moduleVersions.spatialIntentPresets should be undefined when no preset');
});

test('compileSpaceRuntime: runtimePath includes _sip when preset specified', () => {
  const r = compileSpaceRuntime('wa-ye', { preset: 'brand_driven' });
  assert(r.runtimePath.includes('_sip'), `runtimePath should include _sip when preset, got '${r.runtimePath}'`);
  // also check _9c1_space_role still there
  assert(r.runtimePath.includes('_9c1_space_role'), `runtimePath should also include _9c1_space_role, got '${r.runtimePath}'`);
});

test('compileSpaceRuntime: runtimePath does NOT include _sip when no preset', () => {
  const r = compileSpaceRuntime('wa-ye');
  assert(!r.runtimePath.includes('_sip'), `runtimePath should NOT include _sip when no preset, got '${r.runtimePath}'`);
});

test('compileSpaceRuntime: 4 brand × 4 preset all succeed (16 cases, text-level, no Provider)', () => {
  const brands = ['jiuzhou-aesthetics', 'feng-tang-tang', 'yi-ji-liang-fang', 'wa-ye'];
  for (const brand of brands) {
    for (const preset of SUPPORTED_PRESETS) {
      const r = compileSpaceRuntime(brand, { preset });
      assert(r.blockCount >= 17, `${brand} + ${preset} should have >= 17 blocks, got ${r.blockCount}`);
      assert(r.compiledSpatialIntentPreset, `${brand} + ${preset} should have compiledSpatialIntentPreset`);
      assert(r.preset === preset, `${brand} + ${preset} preset mismatch`);
    }
  }
});

test('compileSpaceRuntime throws on unsupported preset', () => {
  let threw = false;
  try { compileSpaceRuntime('wa-ye', { preset: 'unknown_preset_xyz' }); } catch { threw = true; }
  assert(threw, 'should throw on unsupported preset');
});

// ---------- No Provider Calls ----------
console.log('\nNo Provider Calls:');

test('compile-spatial-intent-preset-prompt.mjs 不调网络', () => {
  const src = readFileSync(join(__dirname, '..', 'compile-spatial-intent-preset-prompt.mjs'), 'utf8');
  assert(!src.includes('fetch('), 'compile-spatial-intent-preset-prompt.mjs should not have fetch calls');
  assert(!src.toLowerCase().includes('openai') && !src.toLowerCase().includes('seedream'), 'should not reference LLM providers');
});

test('data-contract.mjs 不调网络', () => {
  const src = readFileSync(join(__dirname, '..', 'data-contract.mjs'), 'utf8');
  assert(!src.includes('fetch('), 'data-contract.mjs should not have fetch calls');
  assert(!src.toLowerCase().includes('openai'), 'data-contract.mjs should not reference openai');
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
