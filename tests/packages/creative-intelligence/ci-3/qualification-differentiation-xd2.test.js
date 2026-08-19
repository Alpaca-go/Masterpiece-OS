/**
 * CI-W1C.5.1 PART D — Same-model real smoke contract (XD2-01..XD2-07).
 *
 * Spec: CI-W1C.5.1 PART D
 *   XD2-01: project-specific Need
 *   XD2-02: project-specific Insight
 *   XD2-03: OpportunityMap non-empty + specific Opportunity
 *   XD2-04: Concept semantic diff
 *   XD2-05: ≥2/4 Directions materially specific
 *   XD2-06: Canon semantic diff + identity-stripped fingerprint diff
 *   XD2-07: trace completeness
 *
 * Strategy: same as XD01-XD06 — read smoke evidence file
 * `.codex-smoke/ci-w1c.4-resume/<run-alias>/differentiation-smoke-evidence.json`
 * and assert each contract. If the file is missing, SKIP and the verdict
 * escalates per the CI-W1C.5.1 spec (HOLD_FOR_REAL_SMOKE_DEFECT).
 *
 * KEY DIFFERENCE from XD01-XD06: XD2-06 strips runId / sourceRunId /
 * timestamps / revision ids from the canonVersion / fingerprint so the
 * Canon differentiation check is semantic, not identifier-based.
 *
 * Frozen surfaces: unchanged. Tests only.
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
  // Look for the most recent differentiation-smoke-evidence.json under ci-w1c.4-resume/.
  // (newest mtime first)
  const candidates = [];
  for (const entry of fs.readdirSync(smokeRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const evidence = path.join(smokeRoot, entry.name, 'differentiation-smoke-evidence.json');
      if (fs.existsSync(evidence)) candidates.push(evidence);
    }
  }
  candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return candidates[0] || null;
}

function loadEvidence() {
  const file = findSmokeEvidence();
  if (!file) return null;
  return { file, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
}

const smokeEvidence = loadEvidence();
const skipMessage = smokeEvidence
  ? null
  : 'same-model real smoke not yet captured; re-run differentiation-smoke.mjs and write evidence to .codex-smoke/ci-w1c.4-resume/<run-alias>/';

// Helper: identity-stripped fingerprint
// Strips runId / sourceRunId / timestamps / revision ids from a string
// so that semantic equivalence is tested, not identifier-based
// equivalence.
function identityStrip(s) {
  if (typeof s !== 'string') return s;
  return s
    // UUIDs (any version)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
    // ISO-8601 timestamps
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, '<TS>')
    // Revision ids like "r-123" or "v3" or "rev:5"
    .replace(/\b(?:rev(?:ision)?|r|v)\d+(?:[._-]\d+)*\b/gi, '<REV>')
    // Random ids like "id-abc123"
    .replace(/\bid-[A-Za-z0-9_-]+/gi, '<ID>')
    .trim();
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

// =====================================================================
// XD2-01: project-specific Need
// =====================================================================

test('XD2-01: project-specific Need between G01 and G02 (statement differs)', (t) => {
  if (!smokeEvidence) return t.skip(skipMessage);
  const { g01, g02 } = smokeEvidence.data;
  const g01Needs = g01?.needs || [];
  const g02Needs = g02?.needs || [];
  assert.ok(g01Needs.length > 0, 'G01 must have Need items');
  assert.ok(g02Needs.length > 0, 'G02 must have Need items');
  // At least one Need statement must differ (semantic, not identifier-based).
  const differs = g01Needs.some((n1, idx) => {
    const n2 = g02Needs[idx];
    if (!n2) return true;
    return isSemanticallyDifferent(
      identityStrip(n1.statement || n1.text || ''),
      identityStrip(n2.statement || n2.text || ''),
    );
  });
  assert.ok(differs, 'XD2-01: at least one Need statement must differ (identity-stripped)');
});

// =====================================================================
// XD2-02: project-specific Insight
// =====================================================================

test('XD2-02: project-specific Insight between G01 and G02 (statement differs)', (t) => {
  if (!smokeEvidence) return t.skip(skipMessage);
  const { g01, g02 } = smokeEvidence.data;
  const g01Insights = g01?.insights || [];
  const g02Insights = g02?.insights || [];
  assert.ok(g01Insights.length > 0, 'G01 must have Insight items');
  assert.ok(g02Insights.length > 0, 'G02 must have Insight items');
  const differs = g01Insights.some((i1, idx) => {
    const i2 = g02Insights[idx];
    if (!i2) return true;
    return isSemanticallyDifferent(
      identityStrip(i1.statement || i1.text || ''),
      identityStrip(i2.statement || i2.text || ''),
    );
  });
  assert.ok(differs, 'XD2-02: at least one Insight statement must differ (identity-stripped)');
});

// =====================================================================
// XD2-03: OpportunityMap non-empty + specific Opportunity
// =====================================================================

test('XD2-03: OpportunityMap non-empty + project-specific Opportunity', (t) => {
  if (!smokeEvidence) return t.skip(skipMessage);
  const { g01, g02 } = smokeEvidence.data;
  const g01Opps = g01?.opportunities || [];
  const g02Opps = g02?.opportunities || [];
  assert.ok(g01Opps.length > 0, 'G01 OpportunityMap non-empty');
  assert.ok(g02Opps.length > 0, 'G02 OpportunityMap non-empty');
  const differs = g01Opps.some((o1, idx) => {
    const o2 = g02Opps[idx];
    if (!o2) return true;
    return isSemanticallyDifferent(
      identityStrip(o1.statement || o1.text || ''),
      identityStrip(o2.statement || o2.text || ''),
    );
  });
  assert.ok(differs, 'XD2-03: at least one Opportunity must be project-specific (identity-stripped)');
});

// =====================================================================
// XD2-04: Concept semantic diff
// =====================================================================

test('XD2-04: Concept semantic diff (title / thesis / mechanism)', (t) => {
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
      identityStrip(c1.title || c1.thesis || c1.text || ''),
      identityStrip(c2.title || c2.thesis || c2.text || ''),
    );
  });
  assert.ok(differs, 'XD2-04: at least one Concept title/thesis must differ (identity-stripped)');
});

// =====================================================================
// XD2-05: ≥2/4 Directions materially specific
// =====================================================================

test('XD2-05: ≥2/4 Directions are materially project-specific (identity-stripped)', (t) => {
  if (!smokeEvidence) return t.skip(skipMessage);
  const { g01, g02 } = smokeEvidence.data;
  const g01Dirs = g01?.directions || [];
  const g02Dirs = g02?.directions || [];
  assert.ok(g01Dirs.length > 0, 'G01 must have Direction items');
  assert.ok(g02Dirs.length > 0, 'G02 must have Direction items');
  // Count directions whose thesis + visualMechanism differ
  // identity-stripped between G01 and G02.
  let differingCount = 0;
  for (let idx = 0; idx < Math.max(g01Dirs.length, g02Dirs.length); idx++) {
    const d1 = g01Dirs[idx];
    const d2 = g02Dirs[idx];
    if (!d1 || !d2) {
      differingCount += 1;
      continue;
    }
    const t1 = identityStrip(d1.thesis || '');
    const t2 = identityStrip(d2.thesis || '');
    const vm1 = identityStrip(d1.visualMechanism || '');
    const vm2 = identityStrip(d2.visualMechanism || '');
    if (isSemanticallyDifferent(t1, t2) || isSemanticallyDifferent(vm1, vm2)) {
      differingCount += 1;
    }
  }
  // Both projects should have ≥2 materially different directions.
  // The spec says "≥2/4 Directions materially project-specific".
  // We check that the count of differing pairs is ≥ 2.
  assert.ok(differingCount >= 2,
    `XD2-05: at least 2 directions must be materially different (got ${differingCount})`);
});

// =====================================================================
// XD2-06: Canon semantic diff + identity-stripped fingerprint diff
// =====================================================================

test('XD2-06: Canon semantic diff (identity-stripped fingerprint)', (t) => {
  if (!smokeEvidence) return t.skip(skipMessage);
  const { g01, g02 } = smokeEvidence.data;
  const g1CanonVersion = identityStrip(g01?.canon?.canonVersion || g01?.canonVersion || '');
  const g2CanonVersion = identityStrip(g02?.canon?.canonVersion || g02?.canonVersion || '');
  assert.ok(g1CanonVersion, 'G01 must have a canonVersion');
  assert.ok(g2CanonVersion, 'G02 must have a canonVersion');
  // The identity-stripped fingerprints MUST differ for semantic
  // differentiation (i.e. they cannot be identical after stripping
  // UUIDs, timestamps, runIds, revision ids).
  assert.notEqual(
    g1CanonVersion,
    g2CanonVersion,
    'XD2-06: identity-stripped canonVersion must differ between G01 and G02',
  );
});

// =====================================================================
// XD2-07: trace completeness
// =====================================================================

test('XD2-07: trace completeness (every Direction has conceptRefs + insightRefs + needRefs + factRefs)', (t) => {
  if (!smokeEvidence) return t.skip(skipMessage);
  const { g01, g02 } = smokeEvidence.data;
  for (const [label, dirs] of [['G01', g01?.directions || []], ['G02', g02?.directions || []]]) {
    assert.ok(dirs.length > 0, `${label} must have at least one direction`);
    for (const d of dirs) {
      assert.ok(d.conceptRefs && d.conceptRefs.length >= 1,
        `${label} direction ${d.id} has conceptRefs`);
      assert.ok(d.insightRefs && d.insightRefs.length >= 1,
        `${label} direction ${d.id} has insightRefs`);
      assert.ok(d.needRefs && d.needRefs.length >= 1,
        `${label} direction ${d.id} has needRefs`);
      assert.ok(d.factRefs && d.factRefs.length >= 1,
        `${label} direction ${d.id} has factRefs`);
    }
  }
});
