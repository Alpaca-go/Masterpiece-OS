// R8.6 Golden Baseline manifest test (Baseline Freeze & R9 Unlock).
//
// Mirrors scripts/verify-space-r8.6-golden-boundary.mjs in the test suite so a
// deleted/renamed/corrupted baseline fails `npm test`, not just the release gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const base = 'space-generator/quality-baselines/r8.6';

const BRANDS = ['jiuzhou-aesthetics', 'feng-tang-tang', 'yi-ji-liang-fang'];
const SMOKE_SCENES = [
  'jiuzhou-aesthetics/final-reception-1',
  'jiuzhou-aesthetics/final-entrance-1',
  'feng-tang-tang/final-dining-1',
  'yi-ji-liang-fang/final-reception-1',
];

function readJson(rel) {
  const full = path.join(repoRoot, rel);
  assert.ok(fs.existsSync(full), `missing baseline file: ${rel}`);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

test('R8.6 baseline manifest is frozen with provider/model/compiler recorded', () => {
  const m = readJson(`${base}/manifest.json`);
  assert.equal(m.baselineId, 'space-r8.6-golden');
  assert.equal(m.status, 'frozen');
  assert.equal(m.r9Unlocked, true);
  assert.ok(m.provider, 'provider recorded');
  assert.ok(m.model, 'model recorded');
  assert.ok(m.compilerCommit, 'compiler commit recorded');
  assert.ok(m.spaceCompilerVersion, 'compiler version recorded');
  assert.ok(Array.isArray(m.brands) && m.brands.length === 3, 'brands listed');
});

test('R8.6 baseline covers commercial + architecture golden roles with every brand having >= 1', () => {
  const allTypes = new Set();
  for (const brand of BRANDS) {
    const gs = readJson(`${base}/${brand}/golden-selection.json`);
    const types = (gs.golds ?? []).map((g) => g.type);
    assert.ok(types.length >= 1, `${brand} has at least one golden`);
    for (const t of types) allTypes.add(t);
    for (const g of gs.golds) {
      assert.ok(g.runId, `${brand} golden runId`);
      assert.ok(g.promptHash, `${brand} golden promptHash`);
      assert.ok(g.imageSha256, `${brand} golden imageSha256`);
    }
  }
  // Acceptance doc v1.0: FTT/YJLF freeze Commercial Golden only (Architecture
  // Golden deferred, not blocking R9). The baseline as a whole must still cover
  // both roles.
  assert.ok(allTypes.has('commercial'), 'baseline has commercial golden');
  assert.ok(allTypes.has('architecture'), 'baseline has architecture golden');
});

test('R8.6 final smoke scenes exist with prompt hash, image sha256 and evaluation', () => {
  for (const scene of SMOKE_SCENES) {
    const m = readJson(`${base}/${scene}/manifest.json`);
    const r = readJson(`${base}/${scene}/run.json`);
    const ev = readJson(`${base}/${scene}/evaluation.json`);
    assert.equal(m.baseline, 'r8.6-final-smoke', `${scene} baseline label`);
    assert.ok(m.promptHash && m.promptHash.length === 64, `${scene} promptHash`);
    assert.ok(m.output.imageSha256 && m.output.imageSha256.length === 64, `${scene} imageSha256`);
    assert.equal(m.promptHash, r.promptHash, `${scene} prompt hash consistent`);
    assert.ok(ev.total > 0 && ev.verdict, `${scene} evaluation complete`);
  }
});

test('R8.6 reference trace records a trackable ref count of zero', () => {
  for (const scene of SMOKE_SCENES) {
    const ref = readJson(`${base}/${scene}/reference-trace.json`);
    const m = readJson(`${base}/${scene}/manifest.json`);
    assert.equal(typeof ref.referenceCount, 'number', `${scene} ref count`);
    assert.equal(ref.referenceCount, 0, `${scene} text-only refs=0`);
    assert.deepEqual(m.referenceIds, [], `${scene} manifest referenceIds empty`);
  }
});

test('R8.6 R9-UNLOCK.json exists, is unlocked and lists parity requirements', () => {
  const u = readJson(`${base}/R9-UNLOCK.json`);
  assert.equal(u.phase, 'R9');
  assert.equal(u.unlocked, true);
  assert.equal(u.sourceBaseline, 'space-r8.6-golden');
  assert.ok(Array.isArray(u.requiredParity) && u.requiredParity.length >= 1, 'parity requirements listed');
});
