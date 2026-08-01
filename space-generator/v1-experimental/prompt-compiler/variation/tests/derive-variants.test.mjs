#!/usr/bin/env node
// Variation Controller v0.1 — 验证测试
// 用法: node space-generator/v1-experimental/prompt-compiler/variation/tests/derive-variants.test.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..', '..');

const { deriveVariants } = await import('../derive-variants.mjs');

const dnaPath = join(
  repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'examples', 'jiuzhou-aesthetics.dna.json',
);
const dnaSchema = JSON.parse(readFileSync(
  join(repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'space-dna.schema.json'),
  'utf8',
));

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

console.log('Variation Controller v0.1 \u2014 validation suite\n');

const baseDna = loadJson(dnaPath);
const dnaValid = validateDna(baseDna);
assert(dnaValid, 'JZMX DNA must validate against schema');

// ---------- derive 6 variants ----------
console.log('Derive 6 variants:');
const variants = deriveVariants(baseDna, 6);

test('derives exactly 6 variants', () => {
  assert(variants.length === 6, `variants.length ${variants.length} != 6`);
});

test('each variant has slotIndex 1..6', () => {
  for (let i = 0; i < 6; i++) {
    assert(variants[i].slotIndex === i + 1, `variants[${i}].slotIndex ${variants[i].slotIndex} != ${i + 1}`);
  }
});

test('each variant DNA validates against DNA schema', () => {
  for (const v of variants) {
    const ok = validateDna(v.dna);
    if (!ok) {
      const errs = (validateDna.errors || []).slice(0, 2).map((e) => `${e.instancePath} ${e.message}`).join('; ');
      throw new Error(`slot ${v.slotIndex} DNA invalid: ${errs}`);
    }
  }
});

test('each variant dnaVersion equals base (no pollution), metadata.variantIndex tracks slot', () => {
  for (const v of variants) {
    assert(v.dna.dnaVersion === baseDna.dnaVersion,
      `slot ${v.slotIndex} dnaVersion ${v.dna.dnaVersion} != base ${baseDna.dnaVersion} (DNA schema reserves dnaVersion for major/minor)`);
    assert(v.dna.metadata.variantIndex === v.slotIndex,
      `slot ${v.slotIndex} metadata.variantIndex ${v.dna.metadata.variantIndex} != ${v.slotIndex}`);
    assert(v.dna.metadata.parentDnaVersion === baseDna.dnaVersion,
      `slot ${v.slotIndex} metadata.parentDnaVersion mismatch`);
  }
});

// ---------- Phase 6 验收 (v1.0 §30) ----------
console.log('\nPhase 6 验收 (v1.0 \u00a730):');

test('不出现六张同构 (motif 多样性 >= 4/6)', () => {
  const motifs = new Set(variants.map((v) => v.choices.motif));
  assert(motifs.size >= 4, `motif diversity ${motifs.size}/6 < 4. 同一具体母题在 6 张里不能 > 50% (v1.0 \u00a734 \u89c4\u5219\u4e09).`);
});

test('不出现每张都有同一种花瓣 (motif 唯一性)', () => {
  const counts = {};
  for (const v of variants) counts[v.choices.motif] = (counts[v.choices.motif] || 0) + 1;
  for (const [m, c] of Object.entries(counts)) {
    assert(c <= 3, `motif ${m} appears ${c} times in 6 variants > 3 (50%)`);
  }
});

test('仍保持九州美学气质 (brand_spirit 5 维度 >= 0.7 不变)', () => {
  for (const v of variants) {
    for (const [k, val] of Object.entries(v.dna.brandSpaceDna.brandSpirit)) {
      if (typeof val === 'number') {
        assert(val >= 0.7, `slot ${v.slotIndex} brand_spirit.${k} = ${val} dropped below 0.7`);
      }
    }
  }
});

test('不退化为通用白色医美空间 (preserve 字段不修改)', () => {
  const preserveFields = [
    'architectureDna.boundaryHardness',
    'architectureDna.statementStrength',
    'functionalDna.operationalRealism',
    'materialDna.materialCountLimit',
    'lightingDna.primaryStrategy',
    'lightingDna.architecturalGlow',
    'renderingDna.realism',
  ];
  for (const f of preserveFields) {
    const parts = f.split('.');
    let vBase = baseDna, vVar = variants[0].dna;
    for (const p of parts) { vBase = vBase[p]; vVar = vVar[p]; }
    assert(vBase === vVar, `preserve field ${f} changed: ${vBase} -> ${vVar}`);
  }
});

test('restrained_material_palette (materialCountLimit = 5) 不变', () => {
  for (const v of variants) {
    assert(v.dna.materialDna.materialCountLimit === 5,
      `slot ${v.slotIndex} materialCountLimit ${v.dna.materialDna.materialCountLimit} != 5`);
  }
});

test('同 motif 不固化 (variant 间 motif 不同)', () => {
  // 6 个 slot 用 5 个 motif pool, 至少 4 unique
  const motifs = variants.map((v) => v.choices.motif);
  const unique = new Set(motifs);
  assert(unique.size >= 4, `expected >= 4 unique motifs in 6 variants, got ${unique.size}: ${[...unique].join(',')}`);
});

test('camera lens 多样性 (>= 3 different in 6 variants)', () => {
  const lenses = new Set(variants.map((v) => v.choices.lens));
  assert(lenses.size >= 3, `lens diversity ${lenses.size} < 3`);
});

test('camera height 多样性 (>= 2 different in 6 variants)', () => {
  const heights = new Set(variants.map((v) => v.choices.height));
  assert(heights.size >= 2, `height diversity ${heights.size} < 2`);
});

// ---------- output example ----------
console.log('\nOutput example:');
test('writes 6-variant example to examples/', () => {
  const outPath = join(__dirname, '..', 'examples', 'jzex-reception-6-variants.json');
  writeFileSync(outPath, JSON.stringify(variants, null, 2));
  assert(existsSync(outPath), 'failed to write example');
});

// ---------- error cases ----------
console.log('\nError cases:');
test('rejects null baseDna', () => {
  let threw = false;
  try { deriveVariants(null, 6); } catch { threw = true; }
  assert(threw, 'should reject null');
});

test('rejects count = 0', () => {
  let threw = false;
  try { deriveVariants(baseDna, 0); } catch { threw = true; }
  assert(threw, 'should reject count=0');
});

test('rejects count = 13 (over max 12)', () => {
  let threw = false;
  try { deriveVariants(baseDna, 13); } catch { threw = true; }
  assert(threw, 'should reject count=13');
});

test('rejects baseDna without motifFamily', () => {
  const bad = JSON.parse(JSON.stringify(baseDna));
  delete bad.brandSpaceDna.motifFamily;
  let threw = false;
  try { deriveVariants(bad, 6); } catch { threw = true; }
  assert(threw, 'should reject baseDna without motifFamily');
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
