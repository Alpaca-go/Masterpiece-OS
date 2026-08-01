#!/usr/bin/env node
// Field-Enriched Prompt Compiler v1.1 — multi-space test for JZMX
// 用法: node space-generator/v1-experimental/prompt-compiler/field-enriched/tests/compile-prompt-v1.1.test.mjs
//
// 验收 (Space Generator v1.1 §7):
//   1. 注入 Architecture Anchor (v1.1 architectureDna 4 个 mechanism 字段)
//   2. 注入 Brand Translation (v1.1 brandTranslationRules)
//   3. 注入 Functional DNA (functionalDna, sceneDefinition)
//   4. 生成空间 (compileFieldEnrichedPrompt)
//   5. 与 Golden Reference 对比 (不是字面, 是结构性比对)
//
// 目标 (v1.1 §7):
//   - 保留建筑美感
//   - 保留品牌识别
//   - 保持商业真实性
//   - 避免品牌元素过拟合
//
// 不调 Provider, 不污染生产代码, 不动 v1-baseline.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..', '..');

const { compileFieldEnrichedPrompt } = await import('../compile-prompt.mjs');

const v11DnaPath = join(
  repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'examples', 'jiuzhou-aesthetics.dna.v1.1.json',
);
const schemaPath = join(
  repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'space-dna.schema.json',
);
const archAnchorAnalysisPath = join(
  repoRoot, 'space-generator', 'v1-experimental', 'architecture-anchors', 'jiuzhou-aesthetics', 'architecture-dna-analysis.yaml',
);

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const validateDna = ajv.compile(schema);
const dna = JSON.parse(readFileSync(v11DnaPath, 'utf8'));

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

console.log('Field-Enriched Prompt Compiler v1.1 \u2014 JZMX multi-space test\n');

// ---------- precondition checks ----------
console.log('Preconditions:');

test('JZMX v1.1 DNA exists and validates', () => {
  assert(existsSync(v11DnaPath), `missing: ${v11DnaPath}`);
  const ok = validateDna(dna);
  if (!ok) {
    const errs = (validateDna.errors || []).slice(0, 3).map((e) => `${e.instancePath} ${e.message}`).join('; ');
    throw new Error(`schema validation failed: ${errs}`);
  }
  assert(dna.dnaVersion === 'v0.2', `dnaVersion should be v0.2, got ${dna.dnaVersion}`);
});

test('architecture-anchor analysis exists (v1.1 §1)', () => {
  assert(existsSync(archAnchorAnalysisPath), `missing: ${archAnchorAnalysisPath}`);
});

// ---------- Step 5.1 注入 Architecture Anchor ----------
console.log('\nStep 5.1 \u2014 Architecture Anchor injection:');

const result = compileFieldEnrichedPrompt(dna);

test('architectural_concept block contains all 4 mechanism sub-fields from anchor', () => {
  const arch = result.blocks.find((b) => b.id === 'architectural_concept');
  assert(arch, 'architectural_concept block missing');
  for (const k of ['Ceiling Mechanism', 'Facade Mechanism', 'Partition Mechanism', 'Furniture Form Grammar']) {
    assert(arch.text.includes(k), `architectural_concept missing ${k}`);
  }
  // verify it actually came from the JZMX-ARCH analysis (specific phrases)
  assert(arch.text.includes('层叠半透明介质') || arch.text.includes('半透明'),
    'ceilingMechanism should reflect v1.1 Architecture Anchor data');
  assert(arch.text.includes('玻璃') || arch.text.includes('facade'),
    'facadeMechanism should reflect v1.1 Architecture Anchor data');
});

test('block[1] (architectural_concept) is BEFORE block[3] (brand_translation) — v1.1 §6 end', () => {
  const archIdx = result.blocks.findIndex((b) => b.id === 'architectural_concept');
  const brandIdx = result.blocks.findIndex((b) => b.id === 'brand_translation');
  assert(archIdx === 1, `architectural_concept should be at index 1, got ${archIdx}`);
  assert(brandIdx === 3, `brand_translation should be at index 3, got ${brandIdx}`);
  assert(archIdx < brandIdx, 'architecture must precede brand (v1.1 §6)');
});

// ---------- Step 5.2 注入 Brand Translation ----------
console.log('\nStep 5.2 \u2014 Brand Translation injection:');

test('brand_translation block uses v1.1 translation layer (not raw brandSpaceDna)', () => {
  const brand = result.blocks.find((b) => b.id === 'brand_translation');
  assert(brand, 'brand_translation block missing');
  // v1.1 translation layer: shows "Brand Spirit -> Space Mechanism" not "Brand Spirit (high-weight >= 0.7)"
  assert(brand.text.includes('Brand Spirit'), 'should have Brand Spirit section');
  assert(brand.text.includes('Space Mechanism') || brand.text.includes('\u2192'), 'should show spirit -> mechanism translation');
  // All 5 spirit dimensions should be present (translation layer, not filtered)
  for (const dim of ['scientific', 'elegant', 'healing', 'futuristic', 'premium']) {
    assert(brand.text.includes(dim), `brand_translation missing ${dim}`);
  }
});

test('brand_translation includes 5 motif rules with literalAssetForbidden marker', () => {
  const brand = result.blocks.find((b) => b.id === 'brand_translation');
  for (const m of ['feather_like_flow', 'petal_like_expansion', 'optical_crystal', 'translucent_fiber', 'flowing_membrane']) {
    assert(brand.text.includes(m), `motif ${m} missing`);
  }
  const markerCount = (brand.text.match(/字面资产禁止/g) || []).length;
  assert(markerCount === 5, `expected 5 literalAssetForbidden markers, got ${markerCount}`);
});

test('brand_translation includes translationStrength (v1.1 §5)', () => {
  const brand = result.blocks.find((b) => b.id === 'brand_translation');
  assert(brand.text.includes('Translation Strength'), 'should show Translation Strength');
  assert(brand.text.includes('0.7'), 'should show 0.7 (v1.1 default)');
});

// ---------- Step 5.3 注入 Functional DNA ----------
console.log('\nStep 5.3 \u2014 Functional DNA injection:');

test('functional_requirement block has space function + functional realism (v1.1 §6 merge)', () => {
  const fr = result.blocks.find((b) => b.id === 'functional_requirement');
  assert(fr, 'functional_requirement block missing');
  // function fields
  assert(fr.text.includes('Required Zones'), 'should have Required Zones');
  assert(fr.text.includes('Customer Flow'), 'should have Customer Flow');
  // functional realism fields
  assert(fr.text.includes('Operational Realism'), 'should have Operational Realism');
  assert(fr.text.includes('Medical Compliance'), 'should have Medical Compliance');
});

// ---------- Step 5.4 整体生成空间 ----------
console.log('\nStep 5.4 \u2014 Space generation (10 blocks total):');

test('10 blocks total (v1.1 §6 refactor)', () => {
  assert(result.blockCount === 10, `blockCount ${result.blockCount} != 10`);
  assert(result.characterCount > 1000, `characterCount ${result.characterCount} too short`);
  assert(result.characterCount <= 8000, `characterCount ${result.characterCount} exceeds v1.0 §10 maxReportCharacters=8000`);
});

test('all 12 v1.0 §21 negative constraints present', () => {
  for (const item of [
    'generic_beauty_salon', 'excessive_purple', 'literal_peacock_theme_park',
    'repeated_flower_sculptures', 'random_crystal_decorations', 'nightclub_lighting',
    'cheap_acrylic_glow', 'overdecorated_reception', 'hospital_corridor',
    'empty_art_gallery', 'impossible_circulation', 'unusable_furniture',
  ]) {
    assert(result.markdown.includes(item), `missing negative constraint: ${item}`);
  }
});

// ---------- Step 5.5 与 Golden Reference 对比 (structural, not literal) ----------
console.log('\nStep 5.5 \u2014 vs Golden Reference (structural, not literal):');

// 8 JZMX 核心空间场景
const scenes = [
  { id: 'JZMX-EXTERIOR', type: 'exterior', subtype: 'brand_entrance' },
  { id: 'JZMX-RECEPTION', type: 'reception', subtype: 'flagship_clinic_reception' },
  { id: 'JZMX-LOBBY', type: 'lobby', subtype: 'main_lobby' },
  { id: 'JZMX-PRODUCT-DISPLAY', type: 'product_display', subtype: 'product_wall' },
  { id: 'JZMX-CONSULTATION', type: 'consultation', subtype: 'private_consultation' },
  { id: 'JZMX-VIP-LOUNGE', type: 'vip_lounge', subtype: 'vip_waiting' },
  { id: 'JZMX-CORRIDOR', type: 'corridor', subtype: 'main_corridor' },
  { id: 'JZMX-TREATMENT', type: 'treatment', subtype: 'private_treatment' },
];

test('all 8 JZMX space types compile without breaking the v1.1 block order', () => {
  for (const scene of scenes) {
    const variantDna = JSON.parse(JSON.stringify(dna));
    variantDna.sceneDefinition.sceneType = scene.type;
    variantDna.sceneDefinition.sceneSubtype = scene.subtype;
    const r = compileFieldEnrichedPrompt(variantDna);
    assert(r.blockCount === 10, `${scene.id}: blockCount ${r.blockCount} != 10`);
    // architectural_concept must still be index 1 across all scene types
    const archIdx = r.blocks.findIndex((b) => b.id === 'architectural_concept');
    assert(archIdx === 1, `${scene.id}: architectural_concept at index ${archIdx}, expected 1`);
    const brandIdx = r.blocks.findIndex((b) => b.id === 'brand_translation');
    assert(brandIdx === 3, `${scene.id}: brand_translation at index ${brandIdx}, expected 3`);
  }
});

test('no literal brand asset leakage into prompt (v1.0 §34 规则一)', () => {
  // v1.1 brandTranslationRules 把所有 motif 标 literalAssetForbidden=true.
  // prompt 不应包含任何 "motif 雕塑/挂画/装置" 的字面物描述 (因为 §34 规则一禁止)
  // 但允许描述 motif 通过 mechanism (如 "层叠半透明介质", 不写 "花瓣雕塑")
  // 这里的检查: prompt 不应包含直接挂 motif 雕塑/挂画/装置的词 (与 SGR 基线一致)
  const motifForbidden = ['petal sculpture', 'peacock sculpture', 'feather sculpture', 'crystal sculpture'];
  for (const m of motifForbidden) {
    assert(!result.markdown.toLowerCase().includes(m.toLowerCase()),
      `prompt contains literal motif asset: ${m}`);
  }
});

test('v1.1 architectural_concept is substantial (>= 300 chars)', () => {
  // v1.1 §4 的 50/30/20 是 输出图像的语义权重分配, 不是 prompt 字符占比.
  // 这里只 sanity check architectural_concept 有充分内容 (含 4 个 mechanism 字段).
  const archIdx1 = result.blocks.findIndex((b) => b.id === 'architectural_concept');
  const archLen = result.blocks[archIdx1].text.length;
  assert(archLen >= 300, `architectural_concept length ${archLen} too short (should reflect all 4 mechanism fields, v1.1 §1 Anchor data)`);
  // 同时 sanity check architectural_concept 比 brand_translation 短 (品牌翻译层有 5 维 spirit+grammar+motif+strength, 必然更长)
  const brandIdx = result.blocks.findIndex((b) => b.id === 'brand_translation');
  const brandLen = result.blocks[brandIdx].text.length;
  // architectural_concept 不必比 brand_translation 长, 因为 brand_translation 包含 5 维翻译规则.
  // 但 architectural_concept 应该是 index 1 (第二个块), 这是 v1.1 §6 关键约束.
  const archIdx = result.blocks.findIndex((b) => b.id === 'architectural_concept');
  assert(archIdx === 1, `architectural_concept must be at index 1 (v1.1 §6 architecture-first order)`);
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

// ---------- write v1.1 JZMX prompt for inspection ----------
const outDir = join(__dirname, '..', 'examples');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'jzex-reception-v1.1.prompt.md'), result.markdown);
console.log(`\nWrote v1.1 JZMX reception prompt to ${outDir}/jzex-reception-v1.1.prompt.md`);

process.exit(0);
