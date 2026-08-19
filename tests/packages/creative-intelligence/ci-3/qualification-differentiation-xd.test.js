/**
 * CI-W1C.4 Resume — Differentiation Smoke Contract (XD01-XD06)
 *
 * Spec: PART H / spec §22-§25
 *   XD01 Need semantics not identical
 *   XD02 Insight semantics not identical
 *   XD03 Opportunity semantics not identical
 *   XD04 Concept semantics not identical
 *   XD05 Direction set not identical
 *   XD06 Canon fingerprint or canonical content not identical
 *
 * Strategy: this test file documents the contract that a real-model
 * differentiation smoke must satisfy. The smoke run is performed by
 * the drive script (apps/web-runtime/scripts/ci-w1c.4-resume/) using
 * the production Web Host + Vite + Chrome + analysis provider/model.
 * The evidence is written to
 * .codex-smoke/ci-w1c.4-resume/<run-alias>/differentiation-smoke-evidence.json
 * and validated by this contract test.
 *
 * If the smoke evidence file exists, this test asserts each XD01-XD06
 * acceptance gate. If the evidence file does not exist, the test
 * reports SKIP with a clear "real-model smoke required" message and
 * the verdict escalates to HOLD.
 *
 * Frozen surfaces: unchanged.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const smokeRoot = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.codex-smoke',
  'ci-w1c.4-resume',
);

function findSmokeEvidence() {
  if (!fs.existsSync(smokeRoot)) return null;
  // Look for any differentiation-smoke-evidence.json under ci-w1c.4-resume/
  const candidates = [];
  for (const entry of fs.readdirSync(smokeRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const evidence = path.join(smokeRoot, entry.name, 'differentiation-smoke-evidence.json');
      if (fs.existsSync(evidence)) candidates.push(evidence);
    }
  }
  return candidates[0] || null;
}

function loadEvidence() {
  const file = findSmokeEvidence();
  if (!file) return null;
  return { file, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
}

function isSemanticallyDifferent(a, b) {
  if (a == null || b == null) return false;
  if (typeof a === 'string' && typeof b === 'string') {
    return a.trim() !== b.trim();
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return true;
    return a.some((item, i) => isSemanticallyDifferent(item, b[i]));
  }
  return a !== b;
}

const smokeEvidence = loadEvidence();
const skipMessage = smokeEvidence
  ? null
  : 'real-model differentiation smoke not yet run; this test will be re-run after smoke is captured at .codex-smoke/ci-w1c.4-resume/';

// =====================================================================
// XD01: Need semantics differ between G01 and G02
// =====================================================================

test('XD01: Need semantics differ between G01 and G02', (t) => {
  if (!smokeEvidence) return t.skip(skipMessage);
  const { g01, g02 } = smokeEvidence.data;
  const g01Needs = g01?.needs || [];
  const g02Needs = g02?.needs || [];
  assert.ok(g01Needs.length > 0, 'G01 must have Need items');
  assert.ok(g02Needs.length > 0, 'G02 must have Need items');
  // The semantic content must differ (at least one Need differs)
  const differs = g01Needs.some((n1, i) => {
    const n2 = g02Needs[i];
    if (!n2) return true;
    return isSemanticallyDifferent(n1.statement || n1.text, n2.statement || n2.text);
  });
  assert.ok(differs, 'XD01: Need semantics must differ between G01 and G02');
});

// =====================================================================
// XD02: Insight semantics differ
// =====================================================================

test('XD02: Insight semantics differ between G01 and G02', (t) => {
  if (!smokeEvidence) return t.skip(skipMessage);
  const { g01, g02 } = smokeEvidence.data;
  const g01Insights = g01?.insights || [];
  const g02Insights = g02?.insights || [];
  assert.ok(g01Insights.length > 0, 'G01 must have Insight items');
  assert.ok(g02Insights.length > 0, 'G02 must have Insight items');
  const differs = g01Insights.some((i1, idx) => {
    const i2 = g02Insights[idx];
    if (!i2) return true;
    return isSemanticallyDifferent(i1.statement || i1.text, i2.statement || i2.text);
  });
  assert.ok(differs, 'XD02: Insight semantics must differ between G01 and G02');
});

// =====================================================================
// XD03: Opportunity semantics differ
// =====================================================================

test('XD03: Opportunity semantics differ between G01 and G02', (t) => {
  if (!smokeEvidence) return t.skip(skipMessage);
  const { g01, g02 } = smokeEvidence.data;
  const g01Opps = g01?.opportunities || [];
  const g02Opps = g02?.opportunities || [];
  assert.ok(g01Opps.length > 0, 'G01 must have Opportunity items');
  assert.ok(g02Opps.length > 0, 'G02 must have Opportunity items');
  const differs = g01Opps.some((o1, idx) => {
    const o2 = g02Opps[idx];
    if (!o2) return true;
    return isSemanticallyDifferent(o1.statement || o1.text, o2.statement || o2.text);
  });
  assert.ok(differs, 'XD03: Opportunity semantics must differ between G01 and G02');
});

// =====================================================================
// XD04: Concept semantics differ
// =====================================================================

test('XD04: Concept semantics differ between G01 and G02', (t) => {
  if (!smokeEvidence) return t.skip(skipMessage);
  const { g01, g02 } = smokeEvidence.data;
  const g01Concepts = g01?.concepts || [];
  const g02Concepts = g02?.concepts || [];
  assert.ok(g01Concepts.length > 0, 'G01 must have Concept items');
  assert.ok(g02Concepts.length > 0, 'G02 must have Concept items');
  const differs = g01Concepts.some((c1, idx) => {
    const c2 = g02Concepts[idx];
    if (!c2) return true;
    return isSemanticallyDifferent(
      c1.title || c1.thesis || c1.text,
      c2.title || c2.thesis || c2.text,
    );
  });
  assert.ok(differs, 'XD04: Concept semantics must differ between G01 and G02');
});

// =====================================================================
// XD05: Direction set semantics differ
// =====================================================================

test('XD05: Direction set semantics differ between G01 and G02', (t) => {
  if (!smokeEvidence) return t.skip(skipMessage);
  const { g01, g02 } = smokeEvidence.data;
  const g01Dirs = g01?.directions || [];
  const g02Dirs = g02?.directions || [];
  assert.ok(g01Dirs.length > 0, 'G01 must have Direction items');
  assert.ok(g02Dirs.length > 0, 'G02 must have Direction items');
  // Direction sets may overlap structurally but the semantic content
  // (thesis + visualMechanism) must differ
  const differs = g01Dirs.some((d1, idx) => {
    const d2 = g02Dirs[idx];
    if (!d2) return true;
    const d1Text = `${d1.thesis || ''} ${d1.visualMechanism || ''}`;
    const d2Text = `${d2.thesis || ''} ${d2.visualMechanism || ''}`;
    return isSemanticallyDifferent(d1Text, d2Text);
  });
  assert.ok(differs, 'XD05: Direction set semantics must differ between G01 and G02');
});

// =====================================================================
// XD06: Canon fingerprint differs
// =====================================================================

test('XD06: Canon fingerprint differs between G01 and G02', (t) => {
  if (!smokeEvidence) return t.skip(skipMessage);
  const { g01, g02 } = smokeEvidence.data;
  const g1CanonVersion = g01?.canon?.canonVersion || g01?.canonVersion;
  const g2CanonVersion = g02?.canon?.canonVersion || g02?.canonVersion;
  assert.ok(g1CanonVersion, 'G01 must have a canonVersion');
  assert.ok(g2CanonVersion, 'G02 must have a canonVersion');
  // Canon fingerprint should differ (because selectedDirectionId differs)
  assert.notEqual(
    g1CanonVersion,
    g2CanonVersion,
    'XD06: canonVersion / fingerprint must differ between G01 and G02',
  );
});

// =====================================================================
// Helper: smoke evidence structure contract
// =====================================================================

test('Smoke evidence structure (when present) must include g01 + g02 with required keys', (t) => {
  if (!smokeEvidence) return t.skip(skipMessage);
  const { data } = smokeEvidence;
  for (const which of ['g01', 'g02']) {
    assert.ok(data[which], `${which} must be present in evidence`);
    const ev = data[which];
    // Required keys for XD checks
    assert.ok('ciRunId' in ev || ev.ciRunId, `${which}.ciRunId must be present`);
    assert.ok('sourceRunId' in ev || ev.sourceRunId, `${which}.sourceRunId must be present`);
    assert.ok('analysisProvider' in ev || ev.analysisProvider, `${which}.analysisProvider must be present (PART I)`);
    assert.ok('analysisModel' in ev || ev.analysisModel, `${which}.analysisModel must be present (PART I)`);
    assert.ok('latencyMs' in ev || 'latencyMs' in ev, `${which}.latencyMs must be present (PART I)`);
  }
});
