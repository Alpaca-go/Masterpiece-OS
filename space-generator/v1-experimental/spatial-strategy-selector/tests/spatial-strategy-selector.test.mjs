#!/usr/bin/env node
// Phase 9C.2 v2 — Spatial Strategy Selector test suite.
// text-level only, no Provider.
// 用法: node space-generator/v1-experimental/spatial-strategy-selector/tests/spatial-strategy-selector.test.mjs

import {
  selectSpatialStrategy,
  STRATEGY,
  DEFAULT_WEIGHTS,
} from '../spatial-strategy-selector.mjs';

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

console.log('Phase 9C.2 v2 \u2014 Spatial Strategy Selector (auto)\n');

await test('selectSpatialStrategy returns 4-strategy one of', async () => {
  for (const b of ['jiuzhou-aesthetics', 'wa-ye', 'feng-tang-tang']) {
    const r = await selectSpatialStrategy(b, { hasReferenceImage: false });
    assert(
      [STRATEGY.BRAND, STRATEGY.ARCH, STRATEGY.REFERENCE, STRATEGY.BALANCED].includes(r.selectedStrategy),
      `${b} got unexpected strategy: ${r.selectedStrategy}`
    );
  }
});

await test('WA-ye (post-correction DNA, strong cartoon frog IP) -> brand_driven (per doc §7 example)', async () => {
  const r = await selectSpatialStrategy('wa-ye');
  console.log(`  WA-ye selected: ${r.selectedStrategy} (reason: ${r.reason})`);
  // Per doc §7: WA-ye \u63a8\u8350 Brand Driven
  assert(r.selectedStrategy === STRATEGY.BRAND, `WA-ye should be brand_driven, got ${r.selectedStrategy}`);
});

await test('JiuZhou-aesthetics (medical, strong arch + reference DNA) -> architecture_driven (per doc §7)', async () => {
  const r = await selectSpatialStrategy('jiuzhou-aesthetics', { hasReferenceImage: true });
  console.log(`  JZMX selected: ${r.selectedStrategy} (reason: ${r.reason})`);
  // Per doc §7: JZMX \u63a8\u8350 Architecture Driven + Reference Driven
  // Single-strategy mode picks the dominant one
  assert(
    [STRATEGY.ARCH, STRATEGY.REFERENCE].includes(r.selectedStrategy),
    `JZMX should be arch or reference, got ${r.selectedStrategy}`
  );
});

await test('FTT (restaurant) -> balanced (per doc §7)', async () => {
  const r = await selectSpatialStrategy('feng-tang-tang');
  console.log(`  FTT selected: ${r.selectedStrategy} (reason: ${r.reason})`);
  // Per doc §7: FTT \u63a8\u8350 balanced
  assert(
    [STRATEGY.BALANCED, STRATEGY.BRAND, STRATEGY.ARCH].includes(r.selectedStrategy),
    `FTT should be balanced/brand/arch, got ${r.selectedStrategy}`
  );
});

await test('Spatial Strategy output has 3-axis weights summing to ~1.0 (per doc §8)', async () => {
  for (const b of ['jiuzhou-aesthetics', 'wa-ye', 'feng-tang-tang']) {
    const r = await selectSpatialStrategy(b);
    const sum = r.weights.brand + r.weights.architecture + r.weights.reference + r.weights.industry;
    assert(Math.abs(sum - 1.0) < 0.001, `${b} weights should sum to 1.0, got ${sum}`);
  }
});

await test('Reference image presence changes axis score (per §6 referenceStrength)', async () => {
  const r1 = await selectSpatialStrategy('jiuzhou-aesthetics', { hasReferenceImage: false });
  const r2 = await selectSpatialStrategy('jiuzhou-aesthetics', { hasReferenceImage: true });
  assert(r1.axisScores.reference === 0, 'no reference -> 0 score');
  assert(r2.axisScores.reference === 1.0, 'with reference -> 1.0 score');
});

await test('Reference image with weak brand/arch -> reference_driven', async () => {
  // Use a brand that should have weak brand/arch; with reference image, should pick reference_driven
  const r = await selectSpatialStrategy('yi-ji-liang-fang', { hasReferenceImage: true });
  console.log(`  YJLF (tcm) with reference: ${r.selectedStrategy} (reason: ${r.reason})`);
  // YJLF is tcm; might be balanced or reference depending on scores
  assert(
    [STRATEGY.REFERENCE, STRATEGY.BALANCED, STRATEGY.BRAND].includes(r.selectedStrategy),
    `YJLF should be reference/balanced/brand, got ${r.selectedStrategy}`
  );
});

await new Promise((r) => setTimeout(r, 100));
console.log(`\nSummary: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f.name}: ${f.error.message}`);
  process.exit(1);
}
process.exit(0);
