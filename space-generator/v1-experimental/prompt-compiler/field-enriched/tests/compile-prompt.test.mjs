#!/usr/bin/env node
// Field-Enriched Prompt Compiler v0.1 — 验证测试
// 用法: node space-generator/v1-experimental/prompt-compiler/field-enriched/tests/compile-prompt.test.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..', '..');

const { compileFieldEnrichedPrompt } = await import('../compile-prompt.mjs');

const dnaPath = join(
  repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'examples', 'jiuzhou-aesthetics.dna.json',
);
const dnaSchema = JSON.parse(readFileSync(
  join(repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'space-dna.schema.json'),
  'utf8',
));
const v1BaselinePromptPath = join(
  repoRoot, 'space-generator', 'v1-baseline', 'execution-core-template.md',
);
// v1-baseline 完整 13 步 prompt 在 creative director 运行时拼接, 不在仓库里以单文件存在
// v0.1 对比: §10 maxReportCharacters=8000 (creative-production-runtime 硬约束)

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateDna = ajv.compile(dnaSchema);

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

function loadJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

console.log('Field-Enriched Prompt Compiler v1.1 + Phase 8B.1 \u2014 validation suite\n');

const dna = loadJson(dnaPath);
const dnaValid = validateDna(dna);
assert(dnaValid, 'JZMX DNA must validate against schema');

// ---------- compile ----------
console.log('Compile:');
let result;

test('compileFieldEnrichedPrompt() returns 11 blocks (Phase 8B.1 §4 + v1.1 §6 refactor)', () => {
  result = compileFieldEnrichedPrompt(dna);
  // Phase 8B.1 §4 调整为 11 块: task / architecture_function_bridge / architectural_concept /
  // architecture_dna / brand_translation / functional_requirement / material / lighting /
  // composition / rendering / negative_constraints
  assert(result.blockCount === 11, `blockCount ${result.blockCount} != 11 (Phase 8B.1 §4 11 blocks)`);
});

test('all 11 block IDs match Phase 8B.1 §4 compile order (bridge before architecture before brand)', () => {
  const expectedOrder = [
    'task', 'architecture_function_bridge', 'architectural_concept', 'architecture_dna',
    'brand_translation', 'functional_requirement', 'material', 'lighting',
    'composition', 'rendering', 'negative_constraints',
  ];
  for (let i = 0; i < expectedOrder.length; i++) {
    assert(result.blocks[i].id === expectedOrder[i],
      `block[${i}].id = ${result.blocks[i].id}, expected ${expectedOrder[i]}`);
  }
});

test('block[1] is architecture_function_bridge (Phase 8B.1 §4) and bridge precedes architectural_concept', () => {
  // Phase 8B.1 §4: bridge 在 architecture 概念之前, 桥接建筑机制与商业功能.
  assert(result.blocks[1].id === 'architecture_function_bridge',
    `block[1] should be architecture_function_bridge, got ${result.blocks[1].id}`);
  // bridge 必须在 architectural_concept 之前 (Phase 8B.1 §4)
  const bridgeIdx = result.blocks.findIndex((b) => b.id === 'architecture_function_bridge');
  const archIdx = result.blocks.findIndex((b) => b.id === 'architectural_concept');
  assert(bridgeIdx < archIdx,
    `architecture_function_bridge (${bridgeIdx}) should come before architectural_concept (${archIdx})`);
  // v1.1 §6 末尾: architectural_concept 必须在 brand_translation 之前
  const brandIdx = result.blocks.findIndex((b) => b.id === 'brand_translation');
  assert(archIdx < brandIdx,
    `architectural_concept (${archIdx}) should come before brand_translation (${brandIdx}) (v1.1 §6 end)`);
});

test('markdown length > 0 and has reasonable character count', () => {
  assert(result.characterCount > 1000, `characterCount ${result.characterCount} too short`);
  assert(result.characterCount < 8000, `characterCount ${result.characterCount} too long (v1.0 §10 maxReportCharacters=8000)`);
});

// ---------- content checks ----------
console.log('\nContent:');
test('prompt contains project brandName', () => {
  assert(result.markdown.includes('九州美学'), 'must contain 九州美学');
});

test('prompt contains scene sceneType', () => {
  assert(result.markdown.includes('reception'), 'must contain reception');
});

test('prompt contains all 12 v1.0 \u00a721 negative constraints', () => {
  for (const item of [
    'generic_beauty_salon', 'excessive_purple', 'literal_peacock_theme_park',
    'repeated_flower_sculptures', 'random_crystal_decorations', 'nightclub_lighting',
    'cheap_acrylic_glow', 'overdecorated_reception', 'hospital_corridor',
    'empty_art_gallery', 'impossible_circulation', 'unusable_furniture',
  ]) {
    assert(result.markdown.includes(item), `missing negative constraint: ${item}`);
  }
});

test('prompt contains materialCountLimit value (5)', () => {
  assert(result.markdown.includes('5'), 'must contain materialCountLimit 5');
});

test('prompt contains injectionStrength value (0.55)', () => {
  assert(result.markdown.includes('0.55'), 'must contain injectionStrength 0.55');
});

test('prompt has all 5 brand spirit dimensions (v1.0 \u00a715)', () => {
  for (const dim of ['scientific', 'elegant', 'healing', 'futuristic', 'premium']) {
    assert(result.markdown.includes(dim), `missing brand spirit dim: ${dim}`);
  }
});

test('prompt contains camera spec (lens / height)', () => {
  assert(result.markdown.includes('28mm_to_40mm'), 'must contain camera lens');
  assert(result.markdown.includes('human_eye_level'), 'must contain camera height');
});

// ---------- v1-baseline comparison ----------
console.log('\nv1-baseline comparison:');
test('v1-baseline prompt template exists (for length reference)', () => {
  assert(existsSync(v1BaselinePromptPath), `missing: ${v1BaselinePromptPath}`);
});

test('field-enriched prompt respects v1.0 \u00a710 maxReportCharacters=8000', () => {
  // v1.0 §10 maxReportCharacters: 8000 (creative-production-runtime 硬约束)
  // v1-baseline 完整 13 步 prompt 在运行时拼接, 不在仓库里以单文件形式存在
  const v1MaxChars = 8000;
  const fieldEnrichedChars = result.characterCount;
  console.log(`      v1.0 §10 max: ${v1MaxChars} | field-enriched: ${fieldEnrichedChars}`);
  assert(fieldEnrichedChars <= v1MaxChars, `field-enriched ${fieldEnrichedChars} exceeds v1.0 §10 maxReportCharacters=${v1MaxChars}`);
});

test('field-enriched prompt is denser than v1-baseline \u00a70 Execution Core (sanity check, no upper bound)', () => {
  // v1-baseline 实际只有 execution-core-template.md (§0 GPT Execution Core, 47 行)
  // 完整 13 步 prompt 在 creative director 运行时拼接 — 不直接以单文件存在
  // v0.1 只能对比 §0 部分. 验证 field-enriched 包含 §0 没覆盖的信息
  const v1Baseline = readFileSync(v1BaselinePromptPath, 'utf8');
  const v1BaselineChars = v1Baseline.length;
  const fieldEnrichedChars = result.characterCount;
  console.log(`      v1-baseline §0: ${v1BaselineChars} chars | field-enriched: ${fieldEnrichedChars} chars`);
  // field-enriched 应比 §0 长, 因为它覆盖 13 步里更多
  assert(fieldEnrichedChars > v1BaselineChars, 'field-enriched should exceed v1-baseline §0 length');
});

// ---------- write JZMX example ----------
console.log('\nWrite JZMX example:');
test('writes JZMX reception prompt to examples/ for inspection', () => {
  const outPath = join(__dirname, '..', 'examples', 'jzex-reception.prompt.md');
  writeFileSync(outPath, result.markdown);
  assert(existsSync(outPath), `failed to write ${outPath}`);
});

// ---------- error cases ----------
console.log('\nError cases:');
test('rejects null dna', () => {
  let threw = false;
  try { compileFieldEnrichedPrompt(null); } catch { threw = true; }
  assert(threw, 'should reject null dna');
});

test('rejects non-object dna', () => {
  let threw = false;
  try { compileFieldEnrichedPrompt('a string'); } catch { threw = true; }
  assert(threw, 'should reject string dna');
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
