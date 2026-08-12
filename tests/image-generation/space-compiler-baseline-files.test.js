// Phase 9B Space Quality Baseline — file existence test (Recovery R1).
//
// Mirrors scripts/verify-space-compiler-baseline.mjs in the test suite so a
// deleted/renamed baseline module fails `npm test`, not just the release gate.
// These files are the Golden Source for the production space-quality compiler
// and the real-provider A/B parity runner.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const base = 'space-generator/v1-experimental';

const REQUIRED_FILES = [
  'prompt-compiler/field-enriched/compile-prompt.mjs',
  'prompt-compiler/anchor-aware/compile-with-anchor.mjs',
  'prompt-compiler/runtime/compile-runtime.mjs',
  'spatial-intent-compiler/compile-spatial-intent.mjs',
  'spatial-intelligence-pipeline/compile-spatial-intelligence-prompt.mjs',
  'spatial-intelligence-pipeline/compile-spatial-intent-block.mjs',
  'spatial-intelligence-pipeline/compile-architecture-language-block.mjs',
  'architecture-bridge/compile-architecture-bridge.mjs',
  'architecture-anchors/registry.json',
  'architecture-anchors/loader/load-anchors.mjs',
];

const REQUIRED_DIRS = [
  'architecture-bridge/bridge-rules',
  'architecture-bridge/schemas',
];

const BRAND_ANCHORS = [
  { brand: 'jiuzhou-aesthetics', files: ['JZMX-ARCH-01.png', 'JZMX-ARCH-02.png', 'JZMX-ARCH-03.png', 'metadata.yaml', 'architecture-dna-analysis.yaml'] },
  { brand: 'feng-tang-tang', files: ['metadata.yaml', 'architecture-dna-analysis.yaml'] },
  { brand: 'yi-ji-liang-fang', files: ['metadata.yaml', 'architecture-dna-analysis.yaml'] },
];

test('Phase 9B baseline compiler modules exist and are non-empty', () => {
  for (const rel of REQUIRED_FILES) {
    const full = path.join(repoRoot, base, rel);
    assert.ok(fs.existsSync(full), `missing baseline file: ${rel}`);
    assert.ok(fs.statSync(full).size > 0, `empty baseline file: ${rel}`);
  }
});

test('Phase 9B bridge rule/schema directories are non-empty', () => {
  for (const rel of REQUIRED_DIRS) {
    const full = path.join(repoRoot, base, rel);
    assert.ok(fs.existsSync(full), `missing baseline dir: ${rel}`);
    assert.ok(fs.readdirSync(full).length > 0, `empty baseline dir: ${rel}`);
  }
});

test('Phase 9B architecture anchor brand assets exist', () => {
  for (const { brand, files } of BRAND_ANCHORS) {
    for (const f of files) {
      const full = path.join(repoRoot, base, 'architecture-anchors', brand, f);
      assert.ok(fs.existsSync(full), `missing anchor asset: ${brand}/${f}`);
      assert.ok(fs.statSync(full).size > 0, `empty anchor asset: ${brand}/${f}`);
    }
  }
});

test('Phase 9B anchor registry is valid JSON covering all 3 baseline brands', () => {
  const registryPath = path.join(repoRoot, base, 'architecture-anchors', 'registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  assert.ok(registry.brands && typeof registry.brands === 'object', 'registry must have a brands map');
  for (const brand of ['jiuzhou-aesthetics', 'feng-tang-tang', 'yi-ji-liang-fang']) {
    const entry = registry.brands[brand];
    assert.ok(entry, `registry missing brand: ${brand}`);
    assert.ok(Array.isArray(entry.anchors) && entry.anchors.length > 0, `${brand} must declare anchors`);
    for (const anchor of entry.anchors) {
      assert.ok(anchor.id, `${brand} anchor missing id`);
      assert.ok(anchor.primaryMechanism, `${brand}/${anchor.id} missing primaryMechanism`);
    }
  }
});

test('JZMX anchor images exist on disk (the only brand with real reference PNGs at baseline)', () => {
  const jzmxDir = path.join(repoRoot, base, 'architecture-anchors', 'jiuzhou-aesthetics');
  for (const png of ['JZMX-ARCH-01.png', 'JZMX-ARCH-02.png', 'JZMX-ARCH-03.png']) {
    const full = path.join(jzmxDir, png);
    assert.ok(fs.existsSync(full), `missing JZMX anchor image: ${png}`);
    assert.ok(fs.statSync(full).size > 0, `empty JZMX anchor image: ${png}`);
  }
});
