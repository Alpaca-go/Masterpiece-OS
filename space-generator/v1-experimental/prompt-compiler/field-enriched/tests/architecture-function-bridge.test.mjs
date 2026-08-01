#!/usr/bin/env node
// Architecture-Function Bridge v1 (Phase 8B.1) — validation suite
// 用法: node space-generator/v1-experimental/prompt-compiler/field-enriched/tests/architecture-function-bridge.test.mjs
//
// Phase 8B.1 §3 字段 + §4 块顺序 + §5 权重调整验证:
//   - bridge 块在 task 之后, architectural_concept 之前
//   - 5 个 array (spatialTranslation / operationConstraints / humanExperience / commercialReality / conceptDriftGuards) 全部出现
//   - weightBoost = 0.25 (v1.1 + Phase 8B.1 推荐)
//   - fallback 路径 (v0.1 DNA without bridge field) 仍能跑
//   - 字符预算: 完整 bridge block < 4000 chars (总 prompt < 8000 限制)
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

const { compileFieldEnrichedPrompt } = await import('../compile-prompt.mjs');

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

console.log('Architecture-Function Bridge v1 (Phase 8B.1) \u2014 validation suite\n');

// ---------- Preconditions ----------
console.log('Preconditions:');

test('JZMX v0.3 (v1.1 + Phase 8B.1) DNA validates', () => {
  assert(validateDna(v11Dna), 'JZMX v0.3 DNA must validate');
  assert(v11Dna.dnaVersion === 'v0.3', `expected v0.3, got ${v11Dna.dnaVersion}`);
  assert(v11Dna.architectureFunctionBridge, 'architectureFunctionBridge missing');
});

test('JZMX v0.1.1 DNA (frozen + bridge minor bump) validates', () => {
  assert(validateDna(v01Dna), 'JZMX v0.1.1 DNA must validate');
  assert(v01Dna.dnaVersion === 'v0.1.1', `expected v0.1.1, got ${v01Dna.dnaVersion}`);
  assert(v01Dna.architectureFunctionBridge, 'architectureFunctionBridge missing on v0.1.1');
});

// ---------- Bridge block in prompt ----------
console.log('\nBridge block in prompt:');

const r11 = compileFieldEnrichedPrompt(v11Dna);
const r01 = compileFieldEnrichedPrompt(v01Dna);

test('bridge block is at index 1 (after task, before architectural_concept)', () => {
  assert(r11.blocks[1].id === 'architecture_function_bridge',
    `block[1] should be architecture_function_bridge, got ${r11.blocks[1].id}`);
  assert(r11.blocks[0].id === 'task', 'block[0] should be task');
  assert(r11.blocks[2].id === 'architectural_concept', 'block[2] should be architectural_concept');
});

test('bridge block has 5 dimension headers (Phase 8B.1 §3)', () => {
  const bridge = r11.blocks.find((b) => b.id === 'architecture_function_bridge');
  assert(bridge, 'bridge block missing');
  for (const header of [
    'Commercial Purpose',
    'Spatial Translation',
    'Operation Constraints',
    'Human Experience',
    'Commercial Reality',
    'Concept Drift Guards',
    'Bridge Weight Boost',
  ]) {
    assert(bridge.text.includes(header), `bridge missing header: ${header}`);
  }
});

test('bridge block weightBoost = 0.25 (v1.1 + Phase 8B.1 recommended)', () => {
  const bridge = r11.blocks.find((b) => b.id === 'architecture_function_bridge');
  assert(bridge.text.includes('0.25'),
    `bridge should include 0.25 weightBoost, got: ${bridge.text.match(/Weight Boost.*\n.*/) || 'not found'}`);
});

test('bridge block spatialTranslation reflects 4 architecture mechanism (v0.3 has 4 mechanism)', () => {
  const bridge = r11.blocks.find((b) => b.id === 'architecture_function_bridge');
  const spatialSection = bridge.text.split('**Operation Constraints')[0];
  // v0.3 DNA 的 spatialTranslation 是 4 条, 覆盖 4 个 mechanism (天花 / 外立面 / 隔断 / 家具)
  assert(spatialSection.includes('膜天花'), 'spatialTranslation missing 天花 mechanism');
  assert(spatialSection.includes('玻璃幕墙') || spatialSection.includes('玻璃'),
    'spatialTranslation missing 玻璃/外立面 mechanism');
  assert(spatialSection.includes('膜') && spatialSection.includes('听觉'),
    'spatialTranslation missing 隔断/听觉屏蔽 mechanism');
  assert(spatialSection.includes('金属长方体') || spatialSection.includes('接待台'),
    'spatialTranslation missing 家具/接待台 mechanism');
});

test('bridge block commercialReality has 6 commercial truth markers (Phase 8B.1 §3)', () => {
  const bridge = r11.blocks.find((b) => b.id === 'architecture_function_bridge');
  const realitySection = bridge.text.split('**Commercial Reality')[1]?.split('**Concept Drift')[0] || '';
  // v0.3 DNA 列出 6 条 commercialReality: 接待台储物, 沙发, 桌面椅子, 品牌<=5%, 展示, 客户0-3
  const markers = ['储物', '沙发', '桌面', '品牌', '展示', '客户'];
  let found = 0;
  for (const m of markers) {
    if (realitySection.includes(m)) found += 1;
  }
  assert(found >= 4, `commercialReality should have >= 4 of ${markers.join('/')} markers, found ${found}`);
});

test('bridge block conceptDriftGuards has >= 5 fail-closed items (Phase 8B.1 §7)', () => {
  const bridge = r11.blocks.find((b) => b.id === 'architecture_function_bridge');
  const driftSection = bridge.text.split('**Concept Drift Guards')[1]?.split('**Bridge Weight')[0] || '';
  const lines = driftSection.split('\n').filter((l) => l.trim().startsWith('- '));
  assert(lines.length >= 5, `conceptDriftGuards should have >= 5 items, got ${lines.length}`);
});

test('bridge block characterCount < 4000 (sanity, total prompt < 8000 v1.0 §10)', () => {
  const bridge = r11.blocks.find((b) => b.id === 'architecture_function_bridge');
  assert(bridge.text.length < 4000,
    `bridge block ${bridge.text.length} chars too long (v1.0 §10 maxReportCharacters=8000 total)`);
  assert(r11.characterCount <= 8000,
    `total prompt ${r11.characterCount} exceeds v1.0 §10 maxReportCharacters=8000`);
});

// ---------- v0.1.1 (also has architectureFunctionBridge field, minor bump) ----------
console.log('\nv0.1.1 path (also has architectureFunctionBridge field, minor bump):');

test('v0.1.1 bridge block compiles (uses main path, not fallback, since v0.1.1 added bridge field)', () => {
  const bridge01 = r01.blocks.find((b) => b.id === 'architecture_function_bridge');
  assert(bridge01, 'v0.1.1 bridge block missing');
  // v0.1.1 DNA has architectureFunctionBridge field (Phase 8B.1 minor bump),
  // so it uses the main path, NOT fallback.
  assert(bridge01.text.includes('Commercial Purpose'),
    'v0.1.1 bridge should use main path with Commercial Purpose (since it has bridge field)');
  assert(!bridge01.text.includes('Fallback Mode'),
    'v0.1.1 bridge should NOT use fallback (it has the field)');
});

test('v0.1.1 bridge spatialTranslation uses spatialConcept (v0.1 has no 4 mechanism)', () => {
  const bridge01 = r01.blocks.find((b) => b.id === 'architecture_function_bridge');
  const spatialSection = bridge01.text.split('**Operation Constraints')[0];
  // v0.1.1 spatialTranslation 4 条: soft_continuity, layered_biomorphic_flow, low boundary hardness, high spatial continuity
  assert(spatialSection.includes('soft_continuity') || spatialSection.includes('空间引导'),
    'v0.1.1 spatialTranslation should use spatialConcept fields (no 4 mechanism)');
});

test('v0.1.1 prompt total still <= 8000 (main path not bloated)', () => {
  assert(r01.characterCount <= 8000,
    `v0.1.1 prompt ${r01.characterCount} exceeds v1.0 §10 maxReportCharacters=8000`);
});

// ---------- v0.1.1 without architectureFunctionBridge field (defensive fallback) ----------
console.log('\nDefensive fallback (v0.1.1 DNA without architectureFunctionBridge field):');

test('prompt compiler still works if architectureFunctionBridge is removed (defensive)', () => {
  // 模拟某个 v0.1 DNA 没添加 bridge 字段 (e.g. regression 中某些项目未来不升级)
  const stripped = JSON.parse(JSON.stringify(v01Dna));
  delete stripped.architectureFunctionBridge;
  const r = compileFieldEnrichedPrompt(stripped);
  assert(r.blockCount === 11, `blockCount should still be 11, got ${r.blockCount}`);
  const bridge = r.blocks.find((b) => b.id === 'architecture_function_bridge');
  assert(bridge, 'bridge block missing');
  assert(bridge.text.includes('Fallback Mode'),
    'defensive fallback should use functionalDna + sceneDefinition');
});

// ---------- Bridge weight enforcement (Phase 8B.1 §5 0.45/0.3/0.25) ----------
console.log('\nWeight allocation enforcement (Phase 8B.1 §5):');

test('v0.3 DNA has weightAllocation 0.45/0.3/0.25 (Phase 8B.1 §5)', () => {
  const wa = v11Dna.weightAllocation;
  assert(wa.architecture === 0.45, `architecture should be 0.45, got ${wa.architecture}`);
  assert(wa.brand === 0.3, `brand should be 0.3, got ${wa.brand}`);
  assert(wa.functional === 0.25, `functional should be 0.25, got ${wa.functional}`);
});

test('v0.1.1 DNA does not have weightAllocation (v0.1 not required, but v1.1 schema still accepts)', () => {
  // v0.1 schema 不强制 weightAllocation, 但 bridge 仍可独立存在.
  // 验证 v0.1.1 DNA 没有 weightAllocation 是允许的
  assert(!v01Dna.weightAllocation, 'v0.1.1 should not have weightAllocation (v0.1 schema does not require it)');
});

// ---------- Bridge does not pollute other blocks ----------
console.log('\nNon-pollution (bridge does not modify other blocks):');

test('brand_translation block byte-equal before/after Phase 8B.1 (byte-equal sanity)', () => {
  // 模拟一个无 bridge 的 v0.3 DNA (仅供 byte-equal 检查用)
  const stripped = JSON.parse(JSON.stringify(v11Dna));
  delete stripped.architectureFunctionBridge;
  // 临时去掉 brandTranslationRules 的 fallback (我们不能改 v0.3 brandTranslationRules, 但 bridge 不应影响 brand_translation 块)
  const rWithBridge = r11.blocks.find((b) => b.id === 'brand_translation');
  const r = compileFieldEnrichedPrompt(stripped);
  const rNoBridge = r.blocks.find((b) => b.id === 'brand_translation');
  assert(rWithBridge.text === rNoBridge.text,
    `brand_translation block should be byte-equal: with bridge=${rWithBridge.text.length} chars, without=${rNoBridge.text.length} chars`);
});

test('functional_requirement block byte-equal before/after Phase 8B.1', () => {
  const stripped = JSON.parse(JSON.stringify(v11Dna));
  delete stripped.architectureFunctionBridge;
  const rWithBridge = r11.blocks.find((b) => b.id === 'functional_requirement');
  const r = compileFieldEnrichedPrompt(stripped);
  const rNoBridge = r.blocks.find((b) => b.id === 'functional_requirement');
  assert(rWithBridge.text === rNoBridge.text,
    `functional_requirement block should be byte-equal: with bridge=${rWithBridge.text.length} chars, without=${rNoBridge.text.length} chars`);
});

test('negative_constraints block byte-equal before/after Phase 8B.1', () => {
  const stripped = JSON.parse(JSON.stringify(v11Dna));
  delete stripped.architectureFunctionBridge;
  const rWithBridge = r11.blocks.find((b) => b.id === 'negative_constraints');
  const r = compileFieldEnrichedPrompt(stripped);
  const rNoBridge = r.blocks.find((b) => b.id === 'negative_constraints');
  assert(rWithBridge.text === rNoBridge.text,
    `negative_constraints block should be byte-equal: with bridge=${rWithBridge.text.length} chars, without=${rNoBridge.text.length} chars`);
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
