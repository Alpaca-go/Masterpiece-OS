#!/usr/bin/env node
// Phase 9C.2 v2 — Brand Identity Confidence test suite.
// text-level only, no Provider.
// 用法: node space-generator/v1-experimental/brand-identity-confidence/tests/brand-identity-confidence.test.mjs

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  computeBrandIdentityConfidence,
  WEIGHTS,
  TOTAL_WEIGHT,
} from '../brand-identity-confidence.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..', '..');

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

console.log('Phase 9C.2 v2 \u2014 Brand Identity Confidence (5 indicators)\n');

const brands = [
  { key: 'jiuzhou-aesthetics', industry: 'medical_aesthetics' },
  { key: 'wa-ye', industry: 'casual_dining' },
  { key: 'feng-tang-tang', industry: 'restaurant' },
  { key: 'jin-xiu', industry: 'fashion_retail' },
  { key: 'yi-ji-liang-fang', industry: 'tcm_wellness' },
];

console.log('Brand Identity Confidence Score (0-100):');

const results = {};
for (const b of brands) {
  await test(`computeBrandIdentityConfidence(${b.key}) returns valid result`, async () => {
    const r = await computeBrandIdentityConfidence(b.key);
    assert(r.brandKey === b.key, 'brandKey mismatch');
    assert(r.phase === '9C.2', 'phase mismatch');
    assert(r.schemaVersion === '1.0', 'schemaVersion mismatch');
    assert(typeof r.total === 'number' && r.total >= 0 && r.total <= 100, `total out of range: ${r.total}`);
    assert(r.weights.industry === 30, 'industry weight should be 30');
    assert(r.weights.asset === 25, 'asset weight should be 25');
    assert(r.weights.color === 15, 'color weight should be 15');
    assert(r.weights.motif === 15, 'motif weight should be 15');
    assert(r.weights.narrative === 15, 'narrative weight should be 15');
    assert(TOTAL_WEIGHT === 100, 'total weight should be 100');
    for (const k of ['industry', 'asset', 'color', 'motif', 'narrative']) {
      const s = r.scores[k];
      assert(typeof s === 'number' && s >= 0 && s <= 1, `${k} score out of range: ${s}`);
    }
    results[b.key] = r;
  });
}

console.log('\nPer-indicator score profiles:');

await test('5 indicators are computed independently (score variance across brands)', () => {
  const allScores = Object.values(results).map((r) => ({
    industry: r.scores.industry,
    asset: r.scores.asset,
    color: r.scores.color,
    motif: r.scores.motif,
    narrative: r.scores.narrative,
  }));
  // At least one indicator has variance across brands (otherwise scoring is broken)
  let hasVariance = false;
  for (const k of ['industry', 'asset', 'color', 'motif', 'narrative']) {
    const values = allScores.map((s) => s[k]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max - min > 0.2) hasVariance = true;
  }
  assert(hasVariance, 'expected at least one indicator to vary > 0.2 across 5 brands');
});

await test('Weighted total matches manual sum of (score * weight)', () => {
  for (const b of brands) {
    const r = results[b.key];
    const expected = Math.round(
      r.scores.industry * 30 +
      r.scores.asset * 25 +
      r.scores.color * 15 +
      r.scores.motif * 15 +
      r.scores.narrative * 15
    );
    assert(r.total === expected, `${b.key} total ${r.total} != expected ${expected}`);
  }
});

await test('JiuZhou-aesthetics scores high on arch (medical_aesthetics strong lighting/material)', () => {
  // JZMX is a 医疗品牌; expected: industry >= 0.8, color / motif / asset moderate
  const r = results['jiuzhou-aesthetics'];
  assert(r.scores.industry >= 0.8, `JZMX industry should be high, got ${r.scores.industry}`);
  assert(r.total >= 50, `JZMX total should be moderate+, got ${r.total}`);
});

await test('WA-ye scores high on asset/motif (Y2K cartoon frog IP) but NOT on arch (WAYE v0.3 DNA kept as 餐饮)', () => {
  const r = results['wa-ye'];
  // WA-ye has literalAssetUsage (cartoon_frog_gesture) + brandSpirit (per DNA)
  // Per doc §7 \u4f8b\u5b50: WA-ye \u63a8\u8350 brand_driven
  assert(r.scores.asset >= 0.4, `WA-ye asset should be moderate+, got ${r.scores.asset}`);
  // industry should be pass (9C.0.5 gate pass)
  assert(r.scores.industry >= 0.7, `WA-ye industry should be high (post-correction), got ${r.scores.industry}`);
});

await test('FTT (restaurant) scores reasonable across all 5 indicators', () => {
  const r = results['feng-tang-tang'];
  // Per doc §7: FTT \u63a8\u8350 balanced
  assert(r.total >= 30, `FTT total should be at least baseline, got ${r.total}`);
  // industry should be reasonable
  assert(r.scores.industry >= 0.5, `FTT industry should be at least 0.5, got ${r.scores.industry}`);
});

await test('All 5 brands return total > 0 (no zero scores)', () => {
  for (const b of brands) {
    assert(results[b.key].total > 0, `${b.key} total is 0`);
  }
});

await new Promise((r) => setTimeout(r, 100));
console.log(`\nSummary: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f.name}: ${f.error.message}`);
  process.exit(1);
}
process.exit(0);
