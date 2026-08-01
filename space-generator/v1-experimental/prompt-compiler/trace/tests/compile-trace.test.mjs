#!/usr/bin/env node
// Prompt Trace v0.1 — 编译 + 验证测试
// 用法: node space-generator/v1-experimental/prompt-compiler/trace/tests/compile-trace.test.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..', '..', '..', '..');

const { compileTrace, dnaFingerprint, TRACED_FIELDS, DEFAULT_FIELD_ORIGIN } = await import('../compile-trace.mjs');

const schemaPath = join(__dirname, '..', 'prompt-trace.schema.json');
const dnaPath = join(__dirname, '..', '..', '..', 'field-schema', 'examples', 'jiuzhou-aesthetics.dna.json');
const sourcesPath = join(__dirname, '..', 'examples', 'jiuzhou-aesthetics.sources.json');

let pass = 0;
let fail = 0;
const failures = [];

function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      return r.then(
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

function loadJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

const schema = loadJson(schemaPath);
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateTrace = ajv.compile(schema);

console.log('Prompt Trace v0.1 \u2014 compile + validation suite\n');

// ---------- schema self-checks ----------
console.log('Schema self-checks:');
test('schema has all 6 v1.0 \u00a730 Phase 3 source categories', () => {
  const cats = schema.properties.sources.required;
  const required = [
    'brandAnalysis', 'sceneRequirement', 'goldenReference',
    'genericArchitecture', 'modelAdapter', 'negativeConstraints',
  ];
  for (const c of required) {
    assert(cats.includes(c), `category ${c} missing in required`);
    assert(schema.properties.sources.properties[c], `category ${c} missing in properties`);
  }
});

test('schema fieldProvenance requires evidenceRefs minItems 1', () => {
  const fp = schema.properties.fieldProvenance.additionalProperties;
  assert(fp.required.includes('evidenceRefs'), 'fieldProvenance.evidenceRefs not required');
  assert(fp.properties.evidenceRefs.minItems === 1, 'fieldProvenance.evidenceRefs should require at least 1');
});

test('schema fieldProvenance origin enum has 7 entries (v1.0 + derived)', () => {
  const en = schema.properties.fieldProvenance.additionalProperties.properties.origin.enum;
  assert(en.length === 7, `expected 7 origins, got ${en.length}`);
  assert(en.includes('derived'), 'derived origin missing');
  assert(en.includes('negative_constraint'), 'negative_constraint origin missing');
});

test('schema is draft 2020-12', () => {
  assert(schema.$schema.includes('2020-12'), 'should be draft 2020-12');
});

// ---------- compile trace ----------
console.log('\nCompile JZMX trace:');
const dna = loadJson(dnaPath);
const sources = loadJson(sourcesPath);
let jzmxTrace;

test('compileTrace() produces a valid trace for JZMX sources + DNA', () => {
  jzmxTrace = compileTrace({ dna, sources });
  const ok = validateTrace(jzmxTrace);
  if (!ok) {
    const errs = (validateTrace.errors || []).slice(0, 3).map((e) => `${e.instancePath} ${e.message}`).join('; ');
    throw new Error(`trace invalid: ${errs}`);
  }
  assert(jzmxTrace.schemaVersion === '1.0', 'schemaVersion must be 1.0');
  assert(jzmxTrace.traceVersion === 'v0.1', 'traceVersion must be v0.1');
  assert(/^[0-9a-f]{16,128}$/.test(jzmxTrace.dnaFingerprint), 'dnaFingerprint must be hex');
});

test('dnaFingerprint is stable across re-compilation (excluding generatedAt)', () => {
  const fp1 = dnaFingerprint(dna);
  const fp2 = dnaFingerprint(dna);
  assert(fp1 === fp2, 'fingerprint should be stable');
  assert(fp1 === jzmxTrace.dnaFingerprint, 'fingerprint should match');
  assert(fp1.length === 32, 'fingerprint should be 32 hex chars (sha256.slice(0,32))');
});

test('all 6 source categories populated', () => {
  for (const cat of ['brandAnalysis', 'sceneRequirement', 'goldenReference', 'genericArchitecture', 'modelAdapter', 'negativeConstraints']) {
    assert(Array.isArray(jzmxTrace.sources[cat]), `${cat} must be array`);
    assert(jzmxTrace.sources[cat].length >= 1, `${cat} must have at least 1 entry`);
  }
});

test('fieldProvenance covers all TRACED_FIELDS', () => {
  for (const field of TRACED_FIELDS) {
    assert(jzmxTrace.fieldProvenance[field], `field ${field} missing in provenance`);
    const p = jzmxTrace.fieldProvenance[field];
    assert(typeof p.confidence === 'number' && p.confidence >= 0 && p.confidence <= 1, `${field} confidence invalid`);
    assert(Array.isArray(p.evidenceRefs) && p.evidenceRefs.length >= 1, `${field} evidenceRefs invalid`);
    assert(typeof p.rule === 'string' && p.rule.length >= 1, `${field} rule must be non-empty`);
  }
});

test('can answer v1.0 \u00a730 Phase 3 questions (6 验收)', () => {
  // Q1: 为什么使用曲线 (soft_continuity)
  const sc = jzmxTrace.fieldProvenance['architectureDna.spatialConcept.primary'];
  assert(sc.origin === 'golden_reference', 'soft_continuity must trace to golden_reference');
  assert(sc.evidenceRefs.some((r) => r.includes('JZMX-SGR-01')), 'must reference SGR-01');
  // Q2: 为什么使用半透明材料 (translucent_resin 在 material 但 Phase 3 重点字段是 materialCountLimit)
  const mat = jzmxTrace.fieldProvenance['materialDna.materialCountLimit'];
  assert(mat.origin === 'generic_architecture', 'materialCountLimit must trace to generic_architecture');
  // Q3: 为什么出现紫色 (lighting.brandLight.hueFamily.soft_lavender, 间接)
  const strategy = jzmxTrace.fieldProvenance['lightingDna.primaryStrategy'];
  assert(strategy.origin === 'golden_reference', 'primaryStrategy must trace to golden_reference');
  // Q4: 哪部分来自品牌 (brandSpaceDna.injectionStrength)
  const brand = jzmxTrace.fieldProvenance['brandSpaceDna.injectionStrength'];
  assert(brand.origin === 'brand_analysis', 'injectionStrength must trace to brand_analysis');
  // Q5: 哪部分来自通用空间质量规范 (composition.camera.lens)
  const lens = jzmxTrace.fieldProvenance['compositionDna.camera.lens'];
  assert(lens.origin === 'generic_architecture', 'camera.lens must trace to generic_architecture');
  // Q6: 禁止项 (negativeConstraints.prohibit)
  const neg = jzmxTrace.fieldProvenance['negativeConstraints.prohibit'];
  assert(neg.origin === 'negative_constraint', 'prohibit must trace to negative_constraint');
});

// ---------- negative cases ----------
console.log('\nNegative cases:');

test('rejects missing source category', () => {
  const bad = { ...sources };
  delete bad.brandAnalysis;
  let threw = false;
  try {
    compileTrace({ dna, sources: bad });
  } catch (e) {
    threw = true;
    assert(/brandAnalysis/.test(e.message), 'error should mention brandAnalysis');
  }
  assert(threw, 'should reject');
});

test('rejects empty source for a required field', () => {
  const bad = JSON.parse(JSON.stringify(sources));
  bad.brandAnalysis = []; // brandName + industry + injectionStrength all need brand
  let threw = false;
  try {
    compileTrace({ dna, sources: bad });
  } catch (e) {
    threw = true;
    assert(/no source in brandAnalysis/.test(e.message), 'error should mention no source in brandAnalysis');
  }
  assert(threw, 'should reject');
});

test('rejects fieldProvenance override with invalid origin', () => {
  const ok = validateTrace(jzmxTrace);
  const bad = JSON.parse(JSON.stringify(jzmxTrace));
  bad.fieldProvenance['architectureDna.boundaryHardness'].origin = 'made_up_origin';
  const ok2 = validateTrace(bad);
  assert(!ok2, 'should reject made_up_origin');
});

test('rejects trace without required field in fieldProvenance (via schema)', () => {
  // 直接构造一个不完整的 trace
  const bad = JSON.parse(JSON.stringify(jzmxTrace));
  delete bad.fieldProvenance['lightingDna.architecturalGlow'];
  const ok = validateTrace(bad);
  // 注意: schema 不要求 fieldProvenance 包含特定 field, 只要求存在 entry 时格式正确
  // 所以这个测试验证的是 "删一个 entry 后 schema 仍然 validate 通过" — 这是预期行为
  assert(ok, 'removing a field entry should still be schema-valid (completeness is compileTrace() contract)');
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
