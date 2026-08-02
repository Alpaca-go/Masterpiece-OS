#!/usr/bin/env node
// Phase 9D — Spatial Regression Score Validation Suite
// 用法: node evaluation/regression/tests/spatial-regression-score.test.mjs
//
// 测试目标 (Phase 9D §11 acceptance):
//   1. 5 行业 brand DNA 都能 compile (industry gate pass)
//   2. 4 preset 都能 compile
//   3. 9C.0.5 cross-industry gate 有效 (5 brand 全 pass+low)
//   4. Spatial Regression Score 6 维 全在 0-100, 总分 0-100
//   5. 同 brand 不同 preset 下 architecture_dna / brand_translation byte-equal (Phase v1.0 §principles)
//   6. 5 brand 总分 至少 3 distinct (brands keep distinct)
//   7. Failure Case Database 有 5+ entries (waye-001 cross-industry 必须有)

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { computeSpatialRegressionScore, computeAllRegression, computeBrandRegression } from '../spatial-regression-score.mjs';
import { validateBrandIdentity, synthesizeAnalysisReport } from '../../../brand-identity-validation/compile-validation.mjs';
import { compileSpaceRuntime } from '../../../space-runtime/compile-space-runtime.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// tests/ -> regression/ -> evaluation/ -> v1-experimental/ -> space-generator/ -> D:/Masterpiece-OS
const repoRoot = join(__dirname, '..', '..', '..', '..', '..');

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

console.log('Phase 9D — Multi-brand / Multi-industry Spatial Regression Validation\n');

// ---------- Phase 9D §11 Acceptance: 5 行业 ----------
console.log('Phase 9D \u00a711.1 \u2014 at least 5 industries covered:');

const brands = [
  { key: 'jiuzhou-aesthetics', industry: 'medical_aesthetics' },
  { key: 'feng-tang-tang', industry: 'restaurant' },
  { key: 'yi-ji-liang-fang', industry: 'tcm_wellness' },
  { key: 'wa-ye', industry: 'casual_dining' },
  { key: 'jin-xiu', industry: 'fashion_retail' },
];

test('5 brand DNA files exist on disk (Phase 9D §6 matrix)', () => {
  for (const b of brands) {
    const dnaPath = b.key === 'jiuzhou-aesthetics'
      ? join(repoRoot, 'space-generator/v1-experimental/field-schema/examples', `${b.key}.dna.json`)
      : join(repoRoot, 'space-generator/v1-experimental/test-cases/regression/projects', `${b.key}.dna.json`);
    assert(existsSync(dnaPath), `${b.key} DNA not found at ${dnaPath}`);
  }
});

test('5 brand compileSpaceRuntime produce 17-18 blocks (preset enabled)', () => {
  for (const b of brands) {
    const r = compileSpaceRuntime(b.key, { preset: 'balanced' });
    assert(r.blockCount >= 17, `${b.key} should have >= 17 blocks with preset, got ${r.blockCount}`);
  }
});

test('5 brand 9C.0.5 brand identity gate all pass+low (5 industries clean)', () => {
  for (const b of brands) {
    const dnaPath = b.key === 'jiuzhou-aesthetics'
      ? join(repoRoot, 'space-generator/v1-experimental/field-schema/examples', `${b.key}.dna.json`)
      : join(repoRoot, 'space-generator/v1-experimental/test-cases/regression/projects', `${b.key}.dna.json`);
    const dna = JSON.parse(readFileSync(dnaPath, 'utf8'));
    const r = validateBrandIdentity({ brandDNA: dna, analysisReport: synthesizeAnalysisReport(dna) });
    assert(r.status === 'pass', `${b.key} gate should be pass, got ${r.status}`);
    assert(r.riskLevel === 'low', `${b.key} risk should be low, got ${r.riskLevel}`);
    assert(r.industry.matchedIndustry === b.industry, `${b.key} industry should match ${b.industry}, got ${r.industry.matchedIndustry}`);
  }
});

// ---------- Phase 9D §11 Acceptance: 4 preset ----------
console.log('\nPhase 9D \u00a711.2 \u2014 all 4 Spatial Intent Preset tested:');

const presets = ['brand_driven', 'architecture_driven', 'reference_driven', 'balanced'];

test('5 brand × 4 preset = 20 cases compile (text-level, no Provider)', () => {
  let count = 0;
  for (const b of brands) {
    for (const p of presets) {
      const r = computeSpatialRegressionScore(b.key, p);
      assert(r.totalScore >= 0 && r.totalScore <= 100, `${b.key}+${p} totalScore out of range: ${r.totalScore}`);
      count++;
    }
  }
  assert(count === 20, `should have 20 cases, got ${count}`);
});

// ---------- Phase 9D §11 Acceptance: Spatial Regression Score 6 维 ----------
console.log('\nPhase 9D \u00a711.3 \u2014 Spatial Regression Score 6 dimensions:');

test('Score 6 dimensions all in 0-100 range, totalScore = average', () => {
  const r = computeSpatialRegressionScore('jiuzhou-aesthetics', 'balanced');
  for (const dim of ['industryAccuracy', 'brandTranslation', 'architectureQuality', 'functionalReality', 'intentAlignment', 'crossSpaceConsistency']) {
    const v = r.scores[dim];
    assert(typeof v === 'number' && v >= 0 && v <= 100, `${dim} should be 0-100, got ${v}`);
  }
  // totalScore = average
  const sum = r.scores.industryAccuracy + r.scores.brandTranslation + r.scores.architectureQuality
    + r.scores.functionalReality + r.scores.intentAlignment + r.scores.crossSpaceConsistency;
  const expectedAvg = Math.round(sum / 6);
  assert(r.totalScore === expectedAvg, `totalScore should be average of 6 dims, got ${r.totalScore} (expected ${expectedAvg})`);
});

test('Industry Accuracy (Dimension 1) = 100 for all 5 brand (9C.0.5 gate pass)', () => {
  for (const b of brands) {
    for (const p of presets) {
      const r = computeSpatialRegressionScore(b.key, p);
      assert(r.scores.industryAccuracy === 100, `${b.key}+${p} industryAccuracy should be 100, got ${r.scores.industryAccuracy}`);
    }
  }
});

test('Cross-space Consistency (Dimension 6) = 100 for all 5 brand (Phase v1.0 §principles byte-equal)', () => {
  for (const b of brands) {
    for (const p of presets) {
      const r = computeSpatialRegressionScore(b.key, p);
      assert(r.scores.crossSpaceConsistency === 100, `${b.key}+${p} crossSpaceConsistency should be 100, got ${r.scores.crossSpaceConsistency}`);
    }
  }
});

test('Intent Alignment (Dimension 5) = 100 for all 20 cases (industryConstraint=maintain)', () => {
  for (const b of brands) {
    for (const p of presets) {
      const r = computeSpatialRegressionScore(b.key, p);
      assert(r.scores.intentAlignment === 100, `${b.key}+${p} intentAlignment should be 100, got ${r.scores.intentAlignment}`);
    }
  }
});

// ---------- Phase 9D §11 Acceptance: 无重大品牌污染 ----------
console.log('\nPhase 9D \u00a711.4 \u2014 no major brand contamination:');

test('All 20 cases industryAccuracy = 100 (no cross-industry contamination)', () => {
  const all = computeAllRegression(brands.map((b) => b.key));
  for (const r of all) {
    assert(r.scores.industryAccuracy === 100, `${r.brandKey}+${r.preset} should have industryAccuracy=100, got ${r.scores.industryAccuracy}`);
  }
});

// ---------- Phase 9D §11 Acceptance: 不同 brand 保持差异 ----------
console.log('\nPhase 9D \u00a711.5 \u2014 brands keep distinct:');

test('5 brand at least 3 distinct average score profiles', () => {
  const all = computeAllRegression(brands.map((b) => b.key));
  const brandAvg = {};
  for (const b of brands) {
    const scores = all.filter((s) => s.brandKey === b.key).map((s) => s.totalScore);
    brandAvg[b.key] = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  }
  const distinctCount = new Set(Object.values(brandAvg)).size;
  assert(distinctCount >= 3, `5 brand should have at least 3 distinct average score profiles, got ${distinctCount} (${JSON.stringify(brandAvg)})`);
});

test('5 brand architecture_dna 5 distinct (text-level content check)', () => {
  // 同一 brand 不同 preset 应该是 byte-equal (Phase v1.0 §principles)
  // 但 5 brand 之间 architecture_dna 应该不同 (不同 brand DNA 产生不同 content)
  const archDnas = new Set();
  for (const b of brands) {
    const r = compileSpaceRuntime(b.key, { preset: 'balanced' });
    archDnas.add(r.blocks.find((bl) => bl.id === 'architecture_dna')?.text);
  }
  // 至少 4 distinct (允许 JZMX/FTT/YJLF/WA-ye 共享一些 v0.1 baseline 但 jin-xiu 必 distinct)
  assert(archDnas.size >= 4, `5 brand architecture_dna should have at least 4 distinct content, got ${archDnas.size}`);
});

// ---------- Phase 9D §11 Acceptance: 同 brand 空间保持一致 ----------
console.log('\nPhase 9D \u00a711.6 \u2014 same brand space consistent:');

test('Same brand 4 preset architecture_dna byte-equal (Phase v1.0 §principles)', () => {
  for (const b of brands) {
    const archDnas = presets.map((p) => {
      const r = compileSpaceRuntime(b.key, { preset: p });
      return r.blocks.find((bl) => bl.id === 'architecture_dna')?.text;
    });
    const allEqual = archDnas.every((ad) => ad === archDnas[0]);
    assert(allEqual, `${b.key} architecture_dna should be byte-equal across 4 presets, got distinct: ${new Set(archDnas).size}`);
  }
});

test('Same brand 4 preset brand_translation byte-equal (Phase v1.0 §principles)', () => {
  for (const b of brands) {
    const brandTrans = presets.map((p) => {
      const r = compileSpaceRuntime(b.key, { preset: p });
      return r.blocks.find((bl) => bl.id === 'brand_translation')?.text;
    });
    const allEqual = brandTrans.every((bt) => bt === brandTrans[0]);
    assert(allEqual, `${b.key} brand_translation should be byte-equal across 4 presets, got distinct: ${new Set(brandTrans).size}`);
  }
});

test('Same brand 4 preset space_role_context (Phase 9C.1) byte-equal (Phase v1.0 + 9C.1 不冲突)', () => {
  for (const b of brands) {
    const spaceRoles = presets.map((p) => {
      const r = compileSpaceRuntime(b.key, { preset: p });
      return r.blocks.find((bl) => bl.id === 'space_role_context')?.text;
    });
    const allEqual = spaceRoles.every((sr) => sr === spaceRoles[0]);
    assert(allEqual, `${b.key} space_role_context should be byte-equal across 4 presets, got distinct: ${new Set(spaceRoles).size}`);
  }
});

// ---------- Phase 9D §9 Failure Case Database ----------
console.log('\nPhase 9D \u00a79 \u2014 Failure Case Database:');

test('Failure Case Database has 5+ entries on disk', () => {
  const failuresDir = join(repoRoot, 'space-generator/v1-experimental/evaluation/regression/failures');
  assert(existsSync(failuresDir), `failures dir not found at ${failuresDir}`);
  const files = readdirSync(failuresDir).filter((f) => f.endsWith('.json'));
  assert(files.length >= 5, `should have 5+ failure case files, got ${files.length}`);
});

test('WAYE-001 cross-industry contamination case exists (Phase 9C.0.5 原 case)', () => {
  const failuresDir = join(repoRoot, 'space-generator/v1-experimental/evaluation/regression/failures');
  const waye001Path = join(failuresDir, 'waye-001-cross-industry-contamination.json');
  assert(existsSync(waye001Path), `WAYE-001 case not found at ${waye001Path}`);
  const fc = JSON.parse(readFileSync(waye001Path, 'utf8'));
  assert(fc.caseId === 'waye-001-cross-industry-contamination', 'caseId mismatch');
  assert(fc.type === 'cross_industry_contamination', 'type mismatch');
  assert(fc.status === 'fixed', 'should be fixed (post 9C.0.5 + 65252fd DNA 修正)');
});

test('Phase 9D-002 jin-xiu new industry case exists (Phase 9D 新增 brand)', () => {
  const failuresDir = join(repoRoot, 'space-generator/v1-experimental/evaluation/regression/failures');
  const casePath = join(failuresDir, 'phase-9d-002-jin-xiu-new-industry.json');
  assert(existsSync(casePath), `Phase 9D-002 case not found at ${casePath}`);
  const fc = JSON.parse(readFileSync(casePath, 'utf8'));
  assert(fc.status === 'fixed', 'should be fixed (this commit adds jin-xiu)');
});

test('Failure cases have required fields (caseId / type / project / reason / fixModule / status)', () => {
  const failuresDir = join(repoRoot, 'space-generator/v1-experimental/evaluation/regression/failures');
  const files = readdirSync(failuresDir).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    const fc = JSON.parse(readFileSync(join(failuresDir, f), 'utf8'));
    assert(fc.caseId, `${f} missing caseId`);
    assert(fc.type, `${f} missing type`);
    assert(fc.project, `${f} missing project`);
    assert(fc.reason, `${f} missing reason`);
    assert(fc.fixModule, `${f} missing fixModule`);
    assert(['fixed', 'documented', 'open'].includes(fc.status), `${f} has invalid status: ${fc.status}`);
  }
});

// ---------- computeBrandRegression helper ----------
console.log('\ncomputeBrandRegression helper:');

test('computeBrandRegression returns 4 cases for 1 brand', () => {
  const r = computeBrandRegression('wa-ye');
  assert(r.length === 4, `should return 4 cases (4 presets), got ${r.length}`);
  for (const c of r) {
    assert(c.brandKey === 'wa-ye', 'brandKey should be wa-ye');
    assert(presets.includes(c.preset), `preset should be one of 4, got ${c.preset}`);
  }
});

test('computeAllRegression returns N×4 cases for N brands', () => {
  const r = computeAllRegression(brands.map((b) => b.key));
  assert(r.length === brands.length * 4, `should return ${brands.length * 4} cases, got ${r.length}`);
});

// ---------- No Provider Calls ----------
console.log('\nNo Provider Calls:');

test('spatial-regression-score.mjs does not call Provider', () => {
  const src = readFileSync(join(__dirname, '..', 'spatial-regression-score.mjs'), 'utf8');
  assert(!src.includes('fetch('), 'spatial-regression-score.mjs should not have fetch calls');
  assert(!src.toLowerCase().includes('openai') && !src.toLowerCase().includes('seedream'), 'should not reference LLM providers');
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
