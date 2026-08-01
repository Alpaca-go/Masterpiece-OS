#!/usr/bin/env node
// Space DNA Schema v0.1 — 验证测试
// 用法: node space-generator/v1-experimental/field-schema/tests/validate.test.mjs
// 验收 (v1.0 §30 Phase 2):
//   - 字段可以序列化为 JSON/YAML ✓ (本测试用 JSON, JSON Schema 也覆盖 YAML 字段约束)
//   - 不影响 Baseline ✓ (本测试不读不写 v1-baseline 任何文件)
//   - 可以人工编辑 ✓ (实例 examples/*.dna.json 是手写 JSON)
//   - 可以记录字段来源 ✓ (metadata.sourceBenchmarkIds 字段)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..', '..', '..', '..');

const schemaPath = join(__dirname, '..', 'space-dna.schema.json');
const examplesDir = join(__dirname, '..', 'examples');

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

console.log('Space DNA Schema v0.1 \u2014 validation suite\n');

const schema = loadJson(schemaPath);
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

// ---------- schema self-checks ----------
console.log('Schema self-checks:');
test('schema file is valid JSON', () => {
  assert(typeof schema === 'object' && schema !== null, 'schema not parsed');
  assert(schema.$id, 'schema.$id missing');
  assert(schema.required.includes('sceneDefinition'), 'sceneDefinition not in required');
  assert(schema.properties.sceneDefinition, 'sceneDefinition not in properties');
});

test('schema has all 10 v1.0 \u00a730 Phase 2 fields', () => {
  const required = [
    'sceneDefinition', 'architectureDna', 'functionalDna', 'brandSpaceDna',
    'materialDna', 'lightingDna', 'compositionDna', 'renderingDna',
    'variationControl', 'negativeConstraints',
  ];
  for (const f of required) {
    assert(schema.properties[f], `field ${f} missing in properties`);
  }
  // 11 required total (10 fields + project); all must be in top-level required
  for (const f of required) {
    assert(schema.required.includes(f), `field ${f} not in top-level required`);
  }
});

test('schema enforces v1.0 \u00a716 materialCountLimit (1-12)', () => {
  const mat = schema.properties.materialDna;
  assert(mat.required.includes('materialCountLimit'), 'materialCountLimit not required');
  const limit = mat.properties.materialCountLimit;
  assert(limit.maximum === 12, `materialCountLimit max should be 12, got ${limit.maximum}`);
  assert(limit.minimum === 1, `materialCountLimit min should be 1, got ${limit.minimum}`);
});

test('schema enforces v1.0 \u00a720 motifRepetitionLimit (0.5 default cap)', () => {
  const vc = schema.properties.variationControl;
  const motif = vc.properties.motifRepetitionLimit;
  assert(motif.required.includes('sameMotifAcrossBatchRatio'), 'sameMotifAcrossBatchRatio required');
  assert(motif.properties.sameMotifAcrossBatchRatio.maximum === 1, 'ratio max should be 1');
});

test('schema enforces v1.0 \u00a734 motif family enum (all 5 entries)', () => {
  const motif = schema.properties.brandSpaceDna.properties.motifFamily;
  assert(motif.items.enum.includes('feather_like_flow'), 'feather_like_flow missing');
  assert(motif.items.enum.includes('petal_like_expansion'), 'petal_like_expansion missing');
  assert(motif.items.enum.includes('optical_crystal'), 'optical_crystal missing');
  assert(motif.items.enum.includes('translucent_fiber'), 'translucent_fiber missing');
  assert(motif.items.enum.includes('flowing_membrane'), 'flowing_membrane missing');
});

test('schema enforces v1.0 \u00a721 negativeConstraints.prohibit minItems 1', () => {
  const nc = schema.properties.negativeConstraints;
  assert(nc.required.includes('prohibit'), 'prohibit not required');
  assert(nc.properties.prohibit.minItems === 1, 'prohibit should require at least 1 entry');
});

test('schema uses JSON Schema draft 2020-12', () => {
  assert(schema.$schema.includes('2020-12'), 'schema should be draft 2020-12');
});


// ---------- examples validation ----------
console.log('\nExamples validation:');

const examples = [
  { name: 'JZMX v0.1 instance', path: join(examplesDir, 'jiuzhou-aesthetics.dna.json') },
];

for (const ex of examples) {
  test(`${ex.name} loads`, () => {
    const data = loadJson(ex.path);
    const ok = validate(data);
    if (!ok) {
      const errs = (validate.errors || []).slice(0, 3).map((e) => `${e.instancePath} ${e.message}`).join('; ');
      throw new Error(`schema validation failed: ${errs}`);
    }
    assert(data.schemaVersion === '1.0', 'schemaVersion must be 1.0');
    assert(/^v0\./.test(data.dnaVersion), 'dnaVersion must be v0.x');
  });

  test(`${ex.name} has 5 brandSpirit fields (v1.0 \u00a715)`, () => {
    const data = loadJson(ex.path);
    const spirit = data.brandSpaceDna.brandSpirit;
    const required = ['scientific', 'elegant', 'healing', 'futuristic', 'premium'];
    for (const k of required) {
      assert(typeof spirit[k] === 'number', `brandSpirit.${k} missing or not number`);
      assert(spirit[k] >= 0 && spirit[k] <= 1, `brandSpirit.${k} out of [0,1] range`);
    }
  });

  test(`${ex.name} materialCountLimit is 5 (v1.0 \u00a716 JZMX default)`, () => {
    const data = loadJson(ex.path);
    assert(data.materialDna.materialCountLimit === 5, 'should default to 5');
    const total = (data.materialDna.primaryMaterials || []).length
      + (data.materialDna.secondaryMaterials || []).length
      + (data.materialDna.accentMaterials || []).length;
    assert(total <= 5, `material count ${total} exceeds limit 5`);
  });

  test(`${ex.name} motif family contains 5 candidates (v1.0 \u00a715)`, () => {
    const data = loadJson(ex.path);
    const mf = data.brandSpaceDna.motifFamily;
    assert(Array.isArray(mf) && mf.length === 5, 'should have 5 motif family candidates');
  });

  test(`${ex.name} negativeConstraints.prohibit has \u2265 1 entry (v1.0 \u00a721)`, () => {
    const data = loadJson(ex.path);
    const p = data.negativeConstraints.prohibit;
    assert(Array.isArray(p) && p.length >= 1, 'prohibit must be non-empty array');
  });

  test(`${ex.name} metadata.sourceBenchmarkIds is JZMX-SGR-01/02`, () => {
    const data = loadJson(ex.path);
    const sb = data.metadata?.sourceBenchmarkIds || [];
    assert(sb.includes('JZMX-SGR-01-Exterior'), 'must include JZMX-SGR-01-Exterior');
    assert(sb.includes('JZMX-SGR-02-Reception'), 'must include JZMX-SGR-02-Reception');
  });
}

// ---------- negative cases ----------
console.log('\nNegative cases (should be rejected):');

test('rejects instance missing required field sceneDefinition', () => {
  const data = loadJson(join(examplesDir, 'jiuzhou-aesthetics.dna.json'));
  delete data.sceneDefinition;
  const ok = validate(data);
  assert(!ok, 'should reject');
});

test('rejects materialCountLimit = 0 (below min 1)', () => {
  const data = loadJson(join(examplesDir, 'jiuzhou-aesthetics.dna.json'));
  data.materialDna.materialCountLimit = 0;
  const ok = validate(data);
  assert(!ok, 'should reject materialCountLimit = 0');
});

test('rejects materialCountLimit = 13 (above max 12)', () => {
  const data = loadJson(join(examplesDir, 'jiuzhou-aesthetics.dna.json'));
  data.materialDna.materialCountLimit = 13;
  const ok = validate(data);
  assert(!ok, 'should reject materialCountLimit = 13');
});

test('rejects motif outside enum', () => {
  const data = loadJson(join(examplesDir, 'jiuzhou-aesthetics.dna.json'));
  data.brandSpaceDna.motifFamily = ['random_garbage_motif'];
  const ok = validate(data);
  assert(!ok, 'should reject unknown motif');
});

test('rejects sameMotifAcrossBatchRatio > 1', () => {
  const data = loadJson(join(examplesDir, 'jiuzhou-aesthetics.dna.json'));
  data.variationControl.motifRepetitionLimit.sameMotifAcrossBatchRatio = 1.5;
  const ok = validate(data);
  assert(!ok, 'should reject ratio > 1');
});

test('rejects additional top-level field (additionalProperties:false)', () => {
  const data = loadJson(join(examplesDir, 'jiuzhou-aesthetics.dna.json'));
  data.unauthorizedField = 'should not be allowed';
  const ok = validate(data);
  assert(!ok, 'should reject unauthorized top-level field');
});

test('rejects brandSpirit.scientific out of [0,1]', () => {
  const data = loadJson(join(examplesDir, 'jiuzhou-aesthetics.dna.json'));
  data.brandSpaceDna.brandSpirit.scientific = 1.5;
  const ok = validate(data);
  assert(!ok, 'should reject scientific > 1');
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
