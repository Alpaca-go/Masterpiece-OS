// P1-4 — Packaging Failure Taxonomy offline test
//
// Jiuzhou Golden 12 failure codes (PKG-F01..F12) are loaded from
// `tests/fixtures/packaging/jiuzhou/failure-taxonomy.json` and
// pinned here. The codes are **Evaluation Criteria**, NOT a
// production rule (per docs/packaging/golden-vs-production-boundary.md).

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

const taxonomy = readJson('tests/fixtures/packaging/jiuzhou/failure-taxonomy.json');
const contract = readJson('config/repository-contract/compatibility-registry.json');

test('P1 failure-taxonomy.json schemaVersion + taxonomyVersion + appliesTo', () => {
  assert.equal(taxonomy.schemaVersion, '1.0');
  assert.equal(taxonomy.taxonomyVersion, '1.0.0');
  assert.equal(taxonomy.appliesTo, 'golden-jiuzhou');
});

test('P1 failure-taxonomy.json has exactly 12 codes PKG-F01..F12', () => {
  assert.equal(taxonomy.codes.length, 12);
  for (let i = 1; i <= 12; i += 1) {
    const code = `PKG-F${i.toString().padStart(2, '0')}`;
    const entry = taxonomy.codes.find((c) => c.code === code);
    assert.ok(entry, `missing ${code}`);
    assert.equal(typeof entry.name, 'string');
    assert.equal(typeof entry.autoFail, 'boolean');
  }
});

test('P1 auto-fail codes are exactly F01 + F02 + F11', () => {
  const autoFailCodes = taxonomy.codes.filter((c) => c.autoFail).map((c) => c.code).sort();
  assert.deepEqual(autoFailCodes, ['PKG-F01', 'PKG-F02', 'PKG-F11']);
});

test('P1 non-auto-fail codes are F03..F10 + F12', () => {
  const nonAutoFail = taxonomy.codes.filter((c) => !c.autoFail).map((c) => c.code).sort();
  assert.deepEqual(nonAutoFail, [
    'PKG-F03', 'PKG-F04', 'PKG-F05', 'PKG-F06',
    'PKG-F07', 'PKG-F08', 'PKG-F09', 'PKG-F10',
    'PKG-F12',
  ]);
});

test('P1 F09 is shot-scoped to PKG-SERIES-GROUP', () => {
  const f09 = taxonomy.codes.find((c) => c.code === 'PKG-F09');
  assert.equal(f09.appliesTo, 'PKG-SERIES-GROUP');
});

test('P1 F10 is shot-scoped to PKG-GIFT-OPEN', () => {
  const f10 = taxonomy.codes.find((c) => c.code === 'PKG-F10');
  assert.equal(f10.appliesTo, 'PKG-GIFT-OPEN');
});

test('P1 F12 (provider / runtime) has axis=null (not a Golden scoring code)', () => {
  const f12 = taxonomy.codes.find((c) => c.code === 'PKG-F12');
  assert.equal(f12.axis, null);
  assert.equal(f12.autoFail, false);
});

test('P1 per-code axis mapping matches the rubric', () => {
  const rubric = readJson('tests/fixtures/packaging/jiuzhou/acceptance-rubric.json');
  for (const code of taxonomy.codes) {
    if (code.code === 'PKG-F12') continue;  // F12 is runtime, no axis
    const axisKey = code.axis;
    const axis = rubric.axes[axisKey];
    assert.ok(axis, `code ${code.code} references unknown axis ${axisKey}`);
  }
});

test('P1 F12 names match (no Golden interpretation)', () => {
  const f12 = taxonomy.codes.find((c) => c.code === 'PKG-F12');
  assert.match(f12.name, /provider|runtime/i);
});

test('P1 failure-taxonomy.md doc is consistent with the JSON', () => {
  const doc = readFileSync(
    path.join(repoRoot, 'docs/packaging/failure-taxonomy.md'),
    'utf8',
  );
  for (let i = 1; i <= 12; i += 1) {
    const code = `PKG-F${i.toString().padStart(2, '0')}`;
    assert.ok(doc.includes(code), `${code} missing from failure-taxonomy.md`);
  }
  assert.ok(doc.includes('auto-fail'));
});

test('P1 failure-taxonomy namespace is NOT registered as a global Packaging error code', () => {
  // The Golden's 12 codes are Jiuzhou-specific evaluation codes;
  // the global Packaging error namespace (per A4-2) remains
  // REQUEST_FAILED / MALFORMED_RESPONSE / MODEL_UNAVAILABLE /
  // TIMEOUT / RATE_LIMITED / AUTHENTICATION_FAILED. The
  // compatibility-registry.json MUST NOT have an entry that
  // promotes PKG-F01..F12 to a global namespace.
  for (const entry of contract.entries) {
    const locations = entry.locations || [];
    for (const loc of locations) {
      assert.doesNotMatch(loc, /packaging-failure-code|PKG-F01/u);
    }
  }
});
