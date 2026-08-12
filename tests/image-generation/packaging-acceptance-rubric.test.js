// P1-3 — Packaging Acceptance Rubric offline test
//
// Jiuzhou Golden is the only V1 rubric; the 7-axis thresholds
// and the auto-fail set are loaded from
// `tests/fixtures/packaging/jiuzhou/acceptance-rubric.json` and
// pinned here. The rubric is **Evaluation Criteria**, NOT a
// production rule (per docs/packaging/golden-vs-production-boundary.md).
//
// This test is offline: it reads the rubric JSON, validates the
// 7-axis thresholds and the auto-fail list, and confirms that
// the P1 docs (acceptance-rubric.md) are consistent with the
// fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');

function readJson(rel) {
  return JSON.parse(readFileSync(path.join(repoRoot, rel), 'utf8'));
}

const rubric = readJson('tests/fixtures/packaging/jiuzhou/acceptance-rubric.json');

test('P1 acceptance-rubric.json schemaVersion + rubricVersion', () => {
  assert.equal(rubric.schemaVersion, '1.0');
  assert.equal(rubric.rubricVersion, '1.0.0');
  assert.equal(rubric.appliesTo, 'golden-jiuzhou');
});

test('P1 acceptance-rubric.json has exactly 7 axes', () => {
  const axes = rubric.axes;
  assert.equal(Object.keys(axes).length, 7);
  for (const expected of [
    'brandFidelity', 'structureFidelity', 'visualDirectionFidelity',
    'compositionQuality', 'materialQuality', 'referenceFidelity',
    'seriesConsistency',
  ]) {
    assert.ok(expected in axes, `missing axis: ${expected}`);
  }
});

test('P1 acceptance-rubric.json per-axis thresholds', () => {
  const a = rubric.axes;
  assert.equal(a.brandFidelity.threshold,           0.90);
  assert.equal(a.structureFidelity.threshold,       0.85);
  assert.equal(a.visualDirectionFidelity.threshold, 0.85);
  assert.equal(a.compositionQuality.threshold,      0.80);
  assert.equal(a.materialQuality.threshold,         0.80);
  assert.equal(a.referenceFidelity.threshold,       0.85);
  assert.equal(a.seriesConsistency.threshold,       0.80);
});

test('P1 seriesConsistency is series-only', () => {
  const s = rubric.axes.seriesConsistency;
  assert.equal(s.appliesTo, 'PKG-SERIES-GROUP');
  assert.equal(s.axis, 'series-only');
});

test('P1 per-axis weights sum to 1.0 (composite weighted average)', () => {
  const a = rubric.axes;
  const total =
    a.brandFidelity.weight
    + a.structureFidelity.weight
    + a.visualDirectionFidelity.weight
    + a.compositionQuality.weight
    + a.materialQuality.weight
    + a.referenceFidelity.weight
    + a.seriesConsistency.weight;
  // For non-SERIES shots, seriesConsistency weight is 0; for
  // SERIES shots, all 7 weights sum to 1.0.
  assert.ok(Math.abs(total - 1.0) < 1e-9, `weights sum to ${total}, not 1.0`);
});

test('P1 overall composite threshold is 0.85', () => {
  assert.equal(rubric.overall.threshold, 0.85);
  assert.equal(rubric.overall.composite, 'weightedAverage');
});

test('P1 auto-fail set is exactly the 5 frozen conditions', () => {
  assert.equal(rubric.autoFail.length, 5);
  for (const expected of [
    'brand_identity_drift',
    'confirmed_package_structure_error',
    'product_substitution',
    'severe_reference_drift',
    'locked_asset_critical_violation',
  ]) {
    assert.ok(rubric.autoFail.includes(expected), `missing auto-fail: ${expected}`);
  }
});

test('P1 acceptance-rubric.md doc is consistent with the JSON', () => {
  const doc = readFileSync(
    path.join(repoRoot, 'docs/packaging/acceptance-rubric.md'),
    'utf8',
  );
  // The doc must mention every axis name (proves the doc is the
  // source of truth and the JSON is a structured projection of it).
  for (const axis of [
    'Brand Fidelity', 'Structure Fidelity', 'Visual Direction Fidelity',
    'Composition Quality', 'Material Quality', 'Reference Fidelity',
    'Series Consistency',
  ]) {
    assert.ok(doc.includes(axis), `axis ${axis} missing from acceptance-rubric.md`);
  }
  // The doc must call out the auto-fail set.
  assert.ok(doc.includes('auto-fail'));
  // The doc must NOT use the forbidden phase/version namespace
  // (the A4 verify-a4-version-namespace guard enforces this on
  // production files; we double-check the doc here for hygiene).
  assert.doesNotMatch(doc, /\bp\d-packaging-/u);
  assert.doesNotMatch(doc, /\bP\d_PACKAGING_/u);
});
