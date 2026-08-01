#!/usr/bin/env node
// Runtime Prompt Compiler v1 (Phase 8C) — validation suite
// 用法: node space-generator/v1-experimental/prompt-compiler/runtime/tests/runtime-prompt.test.mjs
//
// Phase 8C §6.2 Compiler Layer 验收:
//   - compileRuntimePrompt 自动选 anchors, 自动注入 architecture_context
//   - 保留 brand_translation 块 byte-equal (Phase 8C §2 locked components)
//   - baseline 行为不变 (forceBaseline 强制 11 块, 不选 anchor)
//   - 字符预算: runtime prompt <= 12000 (Phase 8A 路径扩展)
//
// 不调 Provider, 不污染生产代码.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..', '..');

const { compileRuntimePrompt } = await import('../compile-runtime.mjs');
const { compileFieldEnrichedPrompt } = await import(
  '../../field-enriched/compile-prompt.mjs',
);

const schemaPath = join(
  repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'space-dna.schema.json',
);
const v11DnaPath = join(
  repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'examples', 'jiuzhou-aesthetics.dna.v1.1.json',
);
const v01DnaPath = join(
  repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'examples', 'jiuzhou-aesthetics.dna.json',
);

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const validateDna = ajv.compile(schema);
const v11Dna = JSON.parse(readFileSync(v11DnaPath, 'utf8'));
const v01Dna = JSON.parse(readFileSync(v01DnaPath, 'utf8'));

let pass = 0;
let fail = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
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

console.log('Runtime Prompt Compiler v1 (Phase 8C) \u2014 validation suite\n');

// ---------- Preconditions ----------
console.log('Preconditions:');

test('JZMX v0.3 + v0.1.1 DNAs validate', () => {
  assert(validateDna(v11Dna), 'v0.3 DNA must validate');
  assert(validateDna(v01Dna), 'v0.1.1 DNA must validate');
});

// ---------- Auto-select anchors ----------
console.log('\nAuto-select anchors (Phase 8C §4):');

const r = compileRuntimePrompt(v11Dna, { brandKey: 'jiuzhou-aesthetics' });

test('runtime path is anchor_aware_8a_8b1 (auto-selected anchors)', () => {
  assert(r.runtimePath === 'anchor_aware_8a_8b1',
    `expected anchor_aware_8a_8b1, got ${r.runtimePath}`);
});

test('12 blocks (Phase 8A architecture_context + Phase 8B.1 bridge)', () => {
  assert(r.blockCount === 12,
    `blockCount ${r.blockCount} != 12 (Phase 8A 12 blocks)`);
});

test('anchorSelection contains 3 JZMX-ARCH anchors (auto-selected)', () => {
  assert(r.anchorSelection, 'anchorSelection missing');
  assert(r.anchorSelection.candidates.length > 0, 'no candidates');
  for (const c of r.anchorSelection.candidates) {
    assert(c.anchorId && c.anchorId.startsWith('JZMX-ARCH-'),
      `expected JZMX-ARCH anchor, got ${c.anchorId}`);
    assert(typeof c.score === 'number' && c.score > 0,
      `candidate ${c.anchorId} has invalid score ${c.score}`);
  }
});

test('block[0]=task, block[1]=architecture_context, block[2]=architecture_function_bridge (Phase 8A + 8B.1 复合)', () => {
  assert(r.blocks[0].id === 'task', `block[0] should be task, got ${r.blocks[0].id}`);
  assert(r.blocks[1].id === 'architecture_context',
    `block[1] should be architecture_context, got ${r.blocks[1].id}`);
  assert(r.blocks[2].id === 'architecture_function_bridge',
    `block[2] should be architecture_function_bridge, got ${r.blocks[2].id}`);
});

test('characterCount within 12000 (Phase 8A extended limit for runtime)', () => {
  assert(r.characterCount <= 12000,
    `characterCount ${r.characterCount} exceeds 12000 (Phase 8A extended limit)`);
});

// ---------- Locked components (Phase 8C §2) ----------
console.log('\nLocked components (Phase 8C §2):');

test('brand_translation block byte-equal before/after runtime', () => {
  const baseline = compileFieldEnrichedPrompt(v11Dna);
  const baselineBrand = baseline.blocks.find((b) => b.id === 'brand_translation');
  const runtimeBrand = r.blocks.find((b) => b.id === 'brand_translation');
  assert(baselineBrand.text === runtimeBrand.text,
    `brand_translation must be byte-equal: baseline=${baselineBrand.text.length}, runtime=${runtimeBrand.text.length}`);
});

test('functional_requirement block byte-equal before/after runtime', () => {
  const baseline = compileFieldEnrichedPrompt(v11Dna);
  const baselineFunc = baseline.blocks.find((b) => b.id === 'functional_requirement');
  const runtimeFunc = r.blocks.find((b) => b.id === 'functional_requirement');
  assert(baselineFunc.text === runtimeFunc.text,
    `functional_requirement must be byte-equal: baseline=${baselineFunc.text.length}, runtime=${runtimeFunc.text.length}`);
});

test('negative_constraints block byte-equal before/after runtime', () => {
  const baseline = compileFieldEnrichedPrompt(v11Dna);
  const baselineNeg = baseline.blocks.find((b) => b.id === 'negative_constraints');
  const runtimeNeg = r.blocks.find((b) => b.id === 'negative_constraints');
  assert(baselineNeg.text === runtimeNeg.text,
    `negative_constraints must be byte-equal: baseline=${baselineNeg.text.length}, runtime=${runtimeNeg.text.length}`);
});

// ---------- brandKey inference ----------
console.log('\nbrandKey inference:');

test('infer brandKey from dna.project.brandName when metadata.brandKey missing', () => {
  const stripped = JSON.parse(JSON.stringify(v11Dna));
  delete stripped.metadata?.brandKey;
  const r2 = compileRuntimePrompt(stripped, {});
  // 应能从 '九州美学' -> 'jiuzhou-aesthetics' 推断
  assert(r2.runtimePath === 'anchor_aware_8a_8b1',
    `expected runtime auto-select via inference, got ${r2.runtimePath}`);
});

test('throws on unknown brand (no inference possible)', () => {
  const unknownDna = JSON.parse(JSON.stringify(v11Dna));
  unknownDna.project.brandName = 'Unknown Brand XYZ';
  let threw = false;
  try { compileRuntimePrompt(unknownDna, {}); } catch { threw = true; }
  assert(threw, 'should throw when brandKey cannot be inferred');
});

// ---------- forceBaseline ----------
console.log('\nforceBaseline (Phase 8C §6.2 baseline compat):');

const rBase = compileRuntimePrompt(v11Dna, {
  brandKey: 'jiuzhou-aesthetics',
  forceBaseline: true,
});

test('forceBaseline=true: 11 blocks (Phase 8B.1 baseline, no anchor injection)', () => {
  assert(rBase.blockCount === 11,
    `forceBaseline should yield 11 blocks, got ${rBase.blockCount}`);
  assert(rBase.runtimePath === 'baseline_8b1',
    `expected baseline_8b1, got ${rBase.runtimePath}`);
});

test('forceBaseline=true: characterCount = baseline characterCount (byte-equal)', () => {
  const baseline = compileFieldEnrichedPrompt(v11Dna);
  assert(rBase.characterCount === baseline.characterCount,
    `forceBaseline characterCount ${rBase.characterCount} should equal baseline ${baseline.characterCount}`);
});

test('forceBaseline=true: no anchorSelection in output', () => {
  // forceBaseline 仍记录 anchorSelection=null (表明 runtime 主动选择 baseline)
  assert(rBase.anchorSelection === null,
    `forceBaseline should have anchorSelection=null, got ${JSON.stringify(rBase.anchorSelection)}`);
});

// ---------- v0.1.1 DNA compat ----------
console.log('\nv0.1.1 DNA backward compat:');

test('v0.1.1 DNA also auto-selects anchors (Phase 8C runtime works on v0.1.1)', () => {
  const rOld = compileRuntimePrompt(v01Dna, { brandKey: 'jiuzhou-aesthetics' });
  assert(rOld.blockCount === 12,
    `v0.1.1 should also produce 12 blocks (Phase 8A + 8B.1), got ${rOld.blockCount}`);
  assert(rOld.runtimePath === 'anchor_aware_8a_8b1',
    `v0.1.1 runtime path should be anchor_aware_8a_8b1, got ${rOld.runtimePath}`);
});

test('v0.1.1 runtime characterCount within 12000', () => {
  const rOld = compileRuntimePrompt(v01Dna, { brandKey: 'jiuzhou-aesthetics' });
  assert(rOld.characterCount <= 12000,
    `v0.1.1 runtime characterCount ${rOld.characterCount} exceeds 12000`);
});

// ---------- No-match graceful degradation ----------
console.log('\nNo-match graceful degradation:');

test('non-applicable criteria: runtime degrades to baseline (no anchor injection)', () => {
  // 改所有 3 个 industry 维度 (industry / sceneType / commercialContext) 都不匹配,
  // operationalRealism=low (function strength threshold 不触发)
  const weirdDna = JSON.parse(JSON.stringify(v11Dna));
  weirdDna.project.category = 'unknown_category_xyz';
  weirdDna.sceneDefinition.sceneType = 'unknown_scene_xyz';
  weirdDna.sceneDefinition.commercialContext = 'unknown_context_xyz';
  weirdDna.functionalDna.operationalRealism = 'low';
  const r3 = compileRuntimePrompt(weirdDna, { brandKey: 'jiuzhou-aesthetics' });
  assert(r3.runtimePath === 'baseline_8b1',
    `no-match should degrade to baseline, got ${r3.runtimePath}`);
  assert(r3.blockCount === 11,
    `no-match should yield 11 blocks, got ${r3.blockCount}`);
});

// ---------- summary ----------
console.log(`\nSummary: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.error.message}`);
  }
  process.exit(1);
}
process.exit(0);
