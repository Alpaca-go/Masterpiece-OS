// R10 final acceptance — status + archived artifacts test.
//
// Guards the frozen R10.4 final baseline so it cannot be lost or silently
// altered: R10-FINAL-STATUS.json must keep r11Ready=true and the pass flags;
// the four archived smokes must keep their complete tracked metadata set and
// image hash bindings with the correct refs and r8_6_golden compiler mode;
// provider output binaries intentionally remain untracked.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const base = 'space-generator/quality-baselines/r10-final';

const REQUIRED_ARTIFACTS = [
  'run.json',
  'task-contract.json',
  'compiled-prompt.md',
  'compiled-prompt.json',
  'trace.json',
  'reference-trace.json',
  'provider-payload.redacted.json',
  'evaluation.json',
];

const SAMPLES = [
  { id: 'JZMX-STD-01', rel: 'jiuzhou-aesthetics/standard', refs: 0 },
  { id: 'JZMX-HF-01', rel: 'jiuzhou-aesthetics/reference-first', refs: 1 },
  { id: 'FTT-STD-01', rel: 'feng-tang-tang/standard', refs: 0 },
  { id: 'YJLF-STD-01', rel: 'yi-ji-liang-fang/standard', refs: 0 },
];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, rel), 'utf8'));
}

test('R10 final status marks complete + r11Ready with pass flags', () => {
  const status = readJson(`${base}/R10-FINAL-STATUS.json`);
  assert.equal(status.phase, 'R10');
  assert.equal(status.status, 'complete');
  assert.equal(status.regressionHold, false);
  assert.equal(status.routeIntegrity, 'pass');
  assert.equal(status.spatialSemanticGate, 'pass');
  assert.equal(status.decorativeObjectSemanticGate, 'pass');
  assert.equal(status.artifactIntegrity, 'pass');
  assert.equal(status.standardGeneration, 'pass');
  assert.equal(status.referenceFirst, 'pass');
  assert.equal(status.crossBrandIsolation, 'pass');
  assert.equal(status.literalMotifControl, 'pass');
  assert.equal(status.providerAspectRatioIntegrity, 'pass');
  assert.equal(status.r11Ready, true);
  assert.equal(status.productionCompiler, 'r8_6_golden');
});

test('R10 final acceptance manifest binds 3 fresh + 1 carried-forward sample', () => {
  const manifest = readJson(`${base}/final-acceptance-manifest.json`);
  assert.equal(manifest.visualAcceptance, 'pass');
  assert.equal(manifest.artifactIntegrity, 'pass');
  const fresh = manifest.samples.filter((s) => s.fresh === true);
  const carried = manifest.samples.filter((s) => s.carriedForwardEvidence === true);
  assert.equal(fresh.length, 3, '3 fresh Standard samples');
  assert.equal(carried.length, 1, '1 carried-forward HF sample');
  for (const s of fresh) {
    assert.equal(s.result, 'pass');
    assert.ok(s.imageSha256 && s.imageSha256.length === 64, `${s.sampleId}: bound imageSha256`);
    assert.ok(s.runId, `${s.sampleId}: bound runId`);
  }
  for (const s of carried) {
    assert.equal(s.result, 'pass');
    assert.ok(s.sourceBaseline, 'carried-forward keeps source baseline');
  }
});

test('R10 final archive keeps the 8 tracked artifacts for all 4 smokes', () => {
  for (const sample of SAMPLES) {
    const dir = path.join(repoRoot, base, sample.rel);
    for (const file of REQUIRED_ARTIFACTS) {
      const full = path.join(dir, file);
      assert.ok(fs.existsSync(full), `${sample.id}: missing ${file}`);
      assert.ok(fs.statSync(full).size > 0, `${sample.id}: empty ${file}`);
    }
    const run = readJson(`${base}/${sample.rel}/run.json`);
    const ref = readJson(`${base}/${sample.rel}/reference-trace.json`);
    const trace = readJson(`${base}/${sample.rel}/trace.json`);
    const ev = readJson(`${base}/${sample.rel}/evaluation.json`);
    assert.equal(run.compilerMode, 'r8_6_golden', `${sample.id}: production compiler`);
    assert.equal(ref.referenceCount, sample.refs, `${sample.id}: refs`);
    assert.equal(trace.referenceCount, sample.refs, `${sample.id}: trace refs`);
    assert.equal(ev.result, 'pass', `${sample.id}: human pass`);
    if (sample.id === 'JZMX-HF-01') {
      // Carried-forward Reference-First evidence: keeps its original baseline
      // (r10-reference-first) and is explicitly marked carriedForwardEvidence.
      assert.equal(ev.carriedForwardEvidence, true, `${sample.id}: carried forward`);
      assert.equal(ev.baselineId, 'r10-reference-first', `${sample.id}: original baseline preserved`);
    } else {
      assert.equal(ev.baseline, 'r10-final', `${sample.id}: baseline label`);
    }
  }
});

test('R10 route-baseline freezes the safety boundaries', () => {
  const b = readJson(`${base}/route-baseline.json`);
  assert.equal(b.compilerMode, 'r8_6_golden');
  assert.ok(Array.isArray(b.requiredBlockIds) && b.requiredBlockIds.length >= 8, 'required blocks');
  assert.ok(b.requiredBlockIds.includes('architecture_language'), 'architecture language');
  assert.ok(b.requiredBlockIds.includes('architecture_context'), 'architecture context');
  assert.ok(b.requiredBlockIds.includes('negative_constraints'), 'negatives');
  assert.equal(b.architectureBeforeBrand, true);
  assert.ok(b.promptBudget.maxChars <= 7500, 'prompt budget cap');
  assert.ok(b.semanticBoundaryFreeze, 'semantic boundary freeze');
  assert.ok(b.colorRoleFreeze, 'color role freeze');
  assert.ok(b.referencePolicyFreeze.standard, 'standard policy');
  assert.ok(b.referencePolicyFreeze.referenceFirst, 'reference-first policy');
  assert.equal(b.architectureAnchorFreeze.standardAutoReference, false, 'anchor not auto-attached to standard');
});

test('R10 final acceptance report exists', () => {
  const report = path.join(repoRoot, base, 'R10-FINAL-ACCEPTANCE.md');
  assert.ok(fs.existsSync(report), 'acceptance report present');
  assert.ok(fs.statSync(report).size > 0);
});
