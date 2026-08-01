#!/usr/bin/env node
// Function Calibration v1 (Phase 8B.1) — validation suite
// 用法: node space-generator/v1-experimental/function-calibrations/tests/function-calibrations.test.mjs
//
// Phase 8B.1 §6 calibration 概念集验证:
//   - registry.json 存在且 schema 正确
//   - loader 加载 2 个 JZMX-FUNC calibrations
//   - 排序按 weight desc
//   - imagePath=null 时 loader 不报错
//   - imageStatus=concept_only 时 resolveCalibrationImagePath 返回 null
//   - 未来 status -> real_image 时, imagePath 解析正常
//   - listBrandKeys() 包含 jiuzhou-aesthetics
//   - 未知 brandKey 优雅降级返回 []
//
// 不调 Provider, 不污染生产代码, status=concept_only 不创建 PNG.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..');

const {
  loadFunctionCalibrations,
  getCalibrationsAsInContextReference,
  resolveCalibrationImagePath,
  listBrandKeys,
} = await import('../loader/load-calibrations.mjs');

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

console.log('Function Calibration v1 (Phase 8B.1) \u2014 validation suite\n');

// ---------- Preconditions ----------
console.log('Preconditions:');

const metaPath = join(__dirname, '..', 'jiuzhou-aesthetics', 'metadata.yaml');
const analysisPath = join(__dirname, '..', 'jiuzhou-aesthetics', 'function-dna-analysis.yaml');
const registryPath = join(__dirname, '..', 'registry.json');

test('metadata.yaml exists', () => {
  assert(existsSync(metaPath), `missing: ${metaPath}`);
});

test('function-dna-analysis.yaml exists', () => {
  assert(existsSync(analysisPath), `missing: ${analysisPath}`);
});

test('registry.json exists', () => {
  assert(existsSync(registryPath), `missing: ${registryPath}`);
});

// ---------- loader basic ops ----------
console.log('\nLoader basic ops:');

test('loadFunctionCalibrations returns 2 JZMX-FUNC calibrations', () => {
  const cals = loadFunctionCalibrations('jiuzhou-aesthetics');
  assert(Array.isArray(cals), 'must return array');
  assert(cals.length === 2, `expected 2 calibrations, got ${cals.length}`);
  for (const c of cals) {
    assert(c.id, `calibration missing id`);
    assert(c.role, `calibration ${c.id} missing role`);
    assert(c.primaryMechanism, `calibration ${c.id} missing primaryMechanism`);
    assert(typeof c.weight === 'number', `calibration ${c.id} missing weight`);
  }
  // 验证包含 JZMX-FUNC-01/02
  const ids = cals.map((c) => c.id);
  assert(ids.includes('JZMX-FUNC-01-reception-realism'), 'missing JZMX-FUNC-01-reception-realism');
  assert(ids.includes('JZMX-FUNC-02-consultation-flow'), 'missing JZMX-FUNC-02-consultation-flow');
});

test('all calibrations have imageStatus=concept_only (Phase 8B.1 no real image)', () => {
  const cals = loadFunctionCalibrations('jiuzhou-aesthetics');
  for (const c of cals) {
    assert(c.imageStatus === 'concept_only',
      `calibration ${c.id} imageStatus should be concept_only (Phase 8B.1 no real image), got ${c.imageStatus}`);
    assert(c.imagePath === null,
      `calibration ${c.id} imagePath should be null when imageStatus=concept_only, got ${c.imagePath}`);
  }
});

test('loader returns [] for unknown brand (graceful degradation)', () => {
  const cals = loadFunctionCalibrations('nonexistent-brand');
  assert(Array.isArray(cals), 'must return array');
  assert(cals.length === 0, 'unknown brand should return empty array');
});

test('loader throws on missing brandKey', () => {
  let threw = false;
  try { loadFunctionCalibrations(null); } catch { threw = true; }
  assert(threw, 'should throw on null brandKey');
  threw = false;
  try { loadFunctionCalibrations(''); } catch { threw = true; }
  assert(threw, 'should throw on empty brandKey');
});

test('getCalibrationsAsInContextReference returns sorted by weight desc', () => {
  const cals = getCalibrationsAsInContextReference('jiuzhou-aesthetics', 2);
  assert(cals.length === 2, `expected 2, got ${cals.length}`);
  // 验证按 weight desc 排序
  for (let i = 0; i < cals.length - 1; i++) {
    assert((cals[i].weight ?? 1) >= (cals[i + 1].weight ?? 1),
      `calibration order broken at ${i}`);
  }
});

test('getCalibrationsAsInContextReference caps at maxCount', () => {
  const cals1 = getCalibrationsAsInContextReference('jiuzhou-aesthetics', 1);
  assert(cals1.length === 1, `expected 1, got ${cals1.length}`);
  const cals0 = getCalibrationsAsInContextReference('jiuzhou-aesthetics', 0);
  assert(cals0.length === 0, `expected 0, got ${cals0.length}`);
});

test('getCalibrationsAsInContextReference default maxCount=2 (registry default)', () => {
  const cals = getCalibrationsAsInContextReference('jiuzhou-aesthetics');
  assert(cals.length === 2, `default cap should be 2, got ${cals.length}`);
});

// ---------- imagePath resolver ----------
console.log('\nImagePath resolver (status=concept_only):');

test('resolveCalibrationImagePath returns null when imageStatus=concept_only', () => {
  const p = resolveCalibrationImagePath('jiuzhou-aesthetics', 'JZMX-FUNC-01-reception-realism');
  assert(p === null, `imagePath should be null when status=concept_only, got ${p}`);
});

test('resolveCalibrationImagePath returns null for unknown calibration id', () => {
  const p = resolveCalibrationImagePath('jiuzhou-aesthetics', 'nonexistent-id');
  assert(p === null, `imagePath should be null for unknown id, got ${p}`);
});

test('resolveCalibrationImagePath returns null for unknown brand', () => {
  const p = resolveCalibrationImagePath('nonexistent-brand', 'any-id');
  assert(p === null, `imagePath should be null for unknown brand, got ${p}`);
});

// ---------- listBrandKeys ----------
console.log('\nlistBrandKeys:');

test('listBrandKeys includes jiuzhou-aesthetics', () => {
  const keys = listBrandKeys();
  assert(Array.isArray(keys), 'must return array');
  assert(keys.includes('jiuzhou-aesthetics'), 'must include jiuzhou-aesthetics');
});

// ---------- Parallel with architecture-anchors loader ----------
console.log('\nParallel with architecture-anchors loader:');

test('function-calibrations and architecture-anchors loaders are independent (no cross-import)', () => {
  // function-calibrations/loader/load-calibrations.mjs 不应 import architecture-anchors/loader/load-anchors.mjs.
  // 这是模块独立性 sanity check.
  const calLoaderSrc = readFileSync(
    join(__dirname, '..', 'loader', 'load-calibrations.mjs'),
    'utf8',
  );
  assert(!calLoaderSrc.includes("from '../architecture-anchors") &&
    !calLoaderSrc.includes("from '../../../architecture-anchors") &&
    !calLoaderSrc.includes("from '../../architecture-anchors"),
    'function-calibrations loader should not import from architecture-anchors (parallel modules)');
});

// ---------- Manifest & metadata cross-check ----------
console.log('\nManifest & metadata cross-check:');

test('registry.json imageStatus matches metadata.yaml status=concept_only', () => {
  const reg = JSON.parse(readFileSync(registryPath, 'utf8'));
  const brand = reg.brands?.['jiuzhou-aesthetics'];
  assert(brand, 'jiuzhou-aesthetics not in registry');
  assert(brand.imageStatus === 'concept_only',
    `registry.brands.jiuzhou-aesthetics.imageStatus should be concept_only, got ${brand.imageStatus}`);
});

test('registry has 2 calibrations matching metadata.yaml reference_id', () => {
  const reg = JSON.parse(readFileSync(registryPath, 'utf8'));
  const cals = reg.brands?.['jiuzhou-aesthetics']?.calibrations ?? [];
  const ids = cals.map((c) => c.id).sort();
  const expected = ['JZMX-FUNC-01-reception-realism', 'JZMX-FUNC-02-consultation-flow'];
  assert(JSON.stringify(ids) === JSON.stringify(expected),
    `registry calibrations ${ids.join(',')} != metadata reference_id ${expected.join(',')}`);
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
