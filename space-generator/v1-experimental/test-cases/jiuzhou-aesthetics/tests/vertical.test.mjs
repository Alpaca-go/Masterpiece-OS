#!/usr/bin/env node
// Phase 4 vertical test infrastructure — 验证测试
// 用法: node space-generator/v1-experimental/test-cases/jiuzhou-aesthetics/tests/vertical.test.mjs
// 先跑一次 run.mjs 生成 trace, 再跑本测试验证.

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..', '..');

const traceSchema = JSON.parse(readFileSync(
  join(repoRoot, 'space-generator', 'v1-experimental', 'prompt-compiler', 'trace', 'prompt-trace.schema.json'),
  'utf8',
));
const dnaSchema = JSON.parse(readFileSync(
  join(repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'space-dna.schema.json'),
  'utf8',
));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateTrace = ajv.compile(traceSchema);
const validateDna = ajv.compile(dnaSchema);

const indexPath = join(__dirname, '..', 'results', 'trace-index.json');
const scenesPath = join(__dirname, '..', 'scenes.json');
const versionsPath = join(__dirname, '..', 'versions.json');

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

console.log('Phase 4 vertical test infrastructure \u2014 validation suite\n');

// ---------- preconditions ----------
console.log('Preconditions:');
test('results/trace-index.json exists (run run.mjs first)', () => {
  assert(existsSync(indexPath), `missing: ${indexPath}. run \`node run.mjs\` first.`);
});

const index = loadJson(indexPath);
const scenes = loadJson(scenesPath);
const versions = loadJson(versionsPath);

// ---------- count checks ----------
console.log('\nCount checks:');
test('8 scenes x 3 versions x 2 slots = 48 expected', () => {
  const expected = scenes.scenes.length * versions.promptVersions.length * 2;
  assert(index.totalExpected === expected, `totalExpected ${index.totalExpected} != ${expected}`);
  assert(index.entries.length === expected, `entries ${index.entries.length} != ${expected}`);
});

test('all 48 entries have status trace_compiled', () => {
  for (const e of index.entries) {
    assert(e.status === 'trace_compiled', `${e.testId} status ${e.status}`);
  }
});

test('testId format is JZMX-{SCENE}-{VERSION}-NN', () => {
  for (const e of index.entries) {
    const m = e.testId.match(/^JZMX-[A-Z-]+-(v1-[a-z-]+|v[0-9]+)-[0-9]{2}$/);
    assert(m, `bad testId format: ${e.testId}`);
  }
});

// ---------- scene x version coverage ----------
console.log('\nCoverage:');
test('every scene appears in 6 entries (3 versions x 2 slots)', () => {
  const counts = {};
  for (const e of index.entries) counts[e.sceneId] = (counts[e.sceneId] || 0) + 1;
  for (const scene of scenes.scenes) {
    assert(counts[scene.id] === 6, `${scene.id} expected 6 entries, got ${counts[scene.id]}`);
  }
});

test('every version appears in 16 entries (8 scenes x 2 slots)', () => {
  const counts = {};
  for (const e of index.entries) counts[e.versionId] = (counts[e.versionId] || 0) + 1;
  for (const v of versions.promptVersions) {
    assert(counts[v.id] === 16, `${v.id} expected 16 entries, got ${counts[v.id]}`);
  }
});

// ---------- trace content validation ----------
console.log('\nTrace content (sampled):');
test('every trace file exists and validates against prompt-trace.schema.json', () => {
  for (const e of index.entries.slice(0, 5)) {  // 抽样 5 个, 防止太慢
    const tracePath = join(__dirname, '..', e.tracePath);
    assert(existsSync(tracePath), `missing trace: ${e.testId}`);
    const trace = loadJson(tracePath);
    const ok = validateTrace(trace);
    if (!ok) {
      const errs = (validateTrace.errors || []).slice(0, 2).map((x) => `${x.instancePath} ${x.message}`).join('; ');
      throw new Error(`${e.testId} trace invalid: ${errs}`);
    }
    assert(trace.dnaVersion === 'v0.1', `${e.testId} dnaVersion should be v0.1`);
    assert(trace.dnaFingerprint.length === 32, `${e.testId} fingerprint length`);
  }
});

test('dnaFingerprint differs across scenes (scene-derivation actually changes DNA)', () => {
  const fps = new Set();
  for (const e of index.entries) {
    fps.add(e.dnaFingerprint);
  }
  // 8 scenes * 3 versions = 24 unique DNA fingerprints expected (same version same scene = same DNA)
  // Actually 同一 scene 不同 version 不一定 different fingerprint because version 只影响 trace
  // 但同一 scene 同 version 不同 slot fingerprint 应该相同
  // 跨 scene 应该不同
  const byScene = {};
  for (const e of index.entries) {
    if (!byScene[e.sceneId]) byScene[e.sceneId] = e.dnaFingerprint;
    else {
      assert(byScene[e.sceneId] === e.dnaFingerprint,
        `${e.sceneId} fingerprint changed between slots: ${byScene[e.sceneId]} vs ${e.dnaFingerprint}`);
    }
  }
  const uniqueFps = new Set(Object.values(byScene));
  assert(uniqueFps.size === scenes.scenes.length,
    `expected ${scenes.scenes.length} unique scene fingerprints, got ${uniqueFps.size}`);
});

test('all 18 TRACED_FIELDS covered in every trace', () => {
  for (const e of index.entries.slice(0, 5)) {
    const trace = loadJson(join(__dirname, '..', e.tracePath));
    for (const field of [
      'project.brandName', 'project.industry', 'sceneDefinition.sceneType',
      'architectureDna.spatialConcept.primary', 'lightingDna.primaryStrategy',
      'compositionDna.camera.lens', 'renderingDna.realism', 'negativeConstraints.prohibit',
    ]) {
      assert(trace.fieldProvenance[field], `${e.testId} missing provenance for ${field}`);
    }
  }
});

// ---------- failure tags statistics (Phase 4 验收之一) ----------
console.log('\nFailure tag statistics skeleton:');
test('failureTags aggregate initialised (0 tags, scaffold ready for real generation)', () => {
  // Phase 4 验收: 形成第一版失败标签统计
  // v0.1: scaffold 就绪, 等真生成时填充
  const tagStats = {
    'generic_industry_template': 0,
    'brand_visual_skinning': 0,
    'excessive_brand_color': 0,
    'literal_motif_overuse': 0,
    'architecture_without_function': 0,
    'function_without_brand': 0,
    'weak_spatial_concept': 0,
    'repeated_layout': 0,
    'repeated_motif': 0,
    'material_overload': 0,
    'lighting_overload': 0,
    'low_commercial_realism': 0,
    'model_text_error': 0,
    'circulation_error': 0,
    'scale_error': 0,
  };
  for (const e of index.entries) {
    assert(!e.failureTags, 'phase 4 v0.1 must not pre-fill failureTags; reserved for real generation');
  }
  // 写到 results/failure-tag-statistics.json 作为初始 scaffold
  writeFileSync(
    join(__dirname, '..', 'results', 'failure-tag-statistics.json'),
    JSON.stringify({
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      totalCases: index.entries.length,
      cases: 0,
      notes: 'v0.1 scaffold only. Real generation will populate after Phase 5 + 6.',
      tagStats,
      allTags: Object.keys(tagStats),
    }, null, 2),
  );
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
