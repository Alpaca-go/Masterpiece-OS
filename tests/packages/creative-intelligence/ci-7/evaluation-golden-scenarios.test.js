import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * CI-7 golden evaluation scenarios.
 *
 * 8 scenarios (Spec #36):
 *   1. clear winner
 *   2. two close Directions
 *   3. all blocked
 *   4. provisional-only
 *   5. fake-diversity filtered upstream
 *   6. reference-heavy
 *   7. sparse DirectionSet
 *   8. balanced multi-direction
 */

import { evaluateDirections } from '@masterpiece/creative-intelligence/evaluation/index.ts';

function makeDir(id, overrides = {}) {
  return {
    id,
    title: `Direction ${id}`,
    thesis: 't',
    conceptRefs: ['c1'],
    visualMechanism: 'A repeatable visual mechanism that organizes the system logic structurally.',
    systemHypothesis: 'A system expresses identity through structural logic.',
    directionFamily: 'structural-system',
    crossMediaBehavior: ['brand/VI', 'editorial', 'digital/UI'],
    opportunityRefs: ['o1'], insightRefs: ['i1'], needRefs: ['n1'],
    factRefs: ['f-brand', 'f-role'], evidenceRefs: ['ev-f-brand'],
    strengths: [], risks: [], blockers: [],
    status: 'grounded',
    generatedBy: 'deterministic_synthesis',
    traceVersion: 'direction-intelligence-v0.1',
    ...overrides,
  };
}

function makeDirEval(dirId, status = 'pass', gateStatusMap = {}) {
  const gateNames = [
    'trace', 'brand-identity', 'asset-authorization', 'business-coverage',
    'consumer-coverage', 'group-visual-authorization', 'family-difference',
    'spatial-drift', 'aesthetic', 'execution-readiness', 'anchor-prompt-leakage',
  ];
  return {
    directionId: dirId,
    status,
    gateResults: gateNames.map((gate) => ({
      directionId: dirId,
      gate,
      status: gateStatusMap[gate] || 'pass',
      issues: [],
    })),
    issues: [],
  };
}

function makeDirectionSet(directions, familyDifference, extra = {}) {
  return {
    schemaVersion: '0.1',
    projectId: 'p1',
    directions,
    evaluations: directions.map((d) => makeDirEval(d.id)),
    familyDifference: familyDifference || {
      pairs: [], allMeaningfullyDistinct: true, hasFakeDiversity: false, diagnostics: [],
    },
    blockedDirectionIds: directions.filter((d) => d.status === 'blocked').map((d) => d.id),
    diagnostics: [],
    provenance: {
      conceptSetVersion: '0.1', truthSchemaVersion: '0.2',
      generatedAt: '2026-01-01T00:00:00.000Z', mode: 'shadow',
    },
    ...extra,
  };
}

const EMPTY_FAMILY_DIFF = {
  pairs: [], allMeaningfullyDistinct: true, hasFakeDiversity: false, diagnostics: [],
};

// ── 1. clear winner ──

test('CI-7 golden 1: clear winner — one direction leads', () => {
  const d1 = makeDir('d-strong', {
    visualMechanism: 'A well-defined structural system that organizes the brand identity across all touchpoints.',
    systemHypothesis: 'The brand is expressed through a clear structural logic.',
    crossMediaBehavior: ['brand/VI', 'editorial', 'digital/UI', 'campaign/poster'],
  });
  const d2 = makeDir('d-weak', {
    visualMechanism: 'minimal',
    systemHypothesis: 'minimal',
    crossMediaBehavior: ['brand/VI'],
    factRefs: ['f-brand'], evidenceRefs: [],
  });
  const result = evaluateDirections({
    projectId: 'p1', directionSet: makeDirectionSet([d1, d2]), familyDifference: EMPTY_FAMILY_DIFF,
  });
  assert.equal(result.recommendation.status, 'available');
  assert.equal(result.recommendation.primaryDirectionId, 'd-strong');
  assert.equal(result.recommendation.confidence, 'high');
  assert.deepEqual(result.ranking.rankedDirectionIds, ['d-strong', 'd-weak']);
});

// ── 2. two close Directions ──

test('CI-7 golden 2: two close Directions — confidence medium/low', () => {
  const d1 = makeDir('d-a');
  const d2 = makeDir('d-b');
  const result = evaluateDirections({
    projectId: 'p1', directionSet: makeDirectionSet([d1, d2]), familyDifference: EMPTY_FAMILY_DIFF,
  });
  assert.equal(result.recommendation.status, 'available');
  assert.ok(['medium', 'low'].includes(result.recommendation.confidence),
    `expected medium or low confidence, got ${result.recommendation.confidence}`);
});

// ── 3. all blocked ──

test('CI-7 golden 3: all blocked — status all_blocked', () => {
  const d1 = makeDir('d-bad1', { status: 'blocked' });
  const d2 = makeDir('d-bad2', { status: 'blocked' });
  const result = evaluateDirections({
    projectId: 'p1', directionSet: makeDirectionSet([d1, d2]), familyDifference: EMPTY_FAMILY_DIFF,
  });
  assert.equal(result.recommendation.status, 'all_blocked');
  assert.equal(result.recommendation.recommendedDirectionIds.length, 0);
  assert.equal(result.recommendation.primaryDirectionId, undefined);
});

// ── 4. provisional-only ──

test('CI-7 golden 4: provisional-only — all are provisional, recommendation available but with warning', () => {
  const d1 = makeDir('d-p1', { status: 'provisional' });
  const d2 = makeDir('d-p2', { status: 'provisional' });
  const result = evaluateDirections({
    projectId: 'p1', directionSet: makeDirectionSet([d1, d2]), familyDifference: EMPTY_FAMILY_DIFF,
  });
  // provisional may still be evaluated
  assert.ok(['available', 'insufficient_evidence'].includes(result.recommendation.status));
  if (result.recommendation.status === 'available') {
    assert.ok(result.recommendation.primaryDirectionId);
  }
});

// ── 5. fake-diversity filtered upstream ──

test('CI-7 golden 5: fake-diversity — evaluation reflects upstream filter', () => {
  const d1 = makeDir('d1');
  const d2 = makeDir('d2');
  const fd = { ...EMPTY_FAMILY_DIFF, hasFakeDiversity: true };
  const result = evaluateDirections({
    projectId: 'p1', directionSet: makeDirectionSet([d1, d2], fd), familyDifference: fd,
  });
  // Both directions should score 0 on direction_distinctness
  for (const e of result.evaluations) {
    assert.equal(e.dimensions.direction_distinctness.score, 0);
    assert.equal(e.dimensions.direction_distinctness.reason,
      'fake-diversity detected upstream — must be filtered');
  }
});

// ── 6. reference-heavy ──

test('CI-7 golden 6: reference-heavy — recommendation can still be made', () => {
  const d1 = makeDir('d-ref1');
  const d2 = makeDir('d-ref2');
  const result = evaluateDirections({
    projectId: 'p1', directionSet: makeDirectionSet([d1, d2]), familyDifference: EMPTY_FAMILY_DIFF,
  });
  // Even with no specific reference handling at evaluation level, evaluation runs
  // Reference guard is at the gate level (CI-6); evaluation respects upstream status
  assert.equal(result.evaluations.length, 2);
  assert.ok(result.recommendation);
});

// ── 7. sparse DirectionSet ──

test('CI-7 golden 7: sparse — single direction, evaluation works', () => {
  const d1 = makeDir('d-only');
  const result = evaluateDirections({
    projectId: 'p1', directionSet: makeDirectionSet([d1]), familyDifference: EMPTY_FAMILY_DIFF,
  });
  assert.equal(result.evaluations.length, 1);
  assert.equal(result.recommendation.status, 'available');
  assert.equal(result.recommendation.primaryDirectionId, 'd-only');
  // Single-direction sets get medium confidence (no second to compare)
  assert.equal(result.recommendation.confidence, 'medium');
});

// ── 8. balanced multi-direction ──

test('CI-7 golden 8: balanced multi-direction — ranking produces deterministic order', () => {
  const dirs = ['d-a', 'd-b', 'd-c', 'd-d'].map((id) => makeDir(id));
  const result = evaluateDirections({
    projectId: 'p1', directionSet: makeDirectionSet(dirs), familyDifference: EMPTY_FAMILY_DIFF,
  });
  assert.equal(result.evaluations.length, 4);
  assert.equal(result.ranking.rankedDirectionIds.length, 4);
  // top 3 should be recommended
  assert.ok(result.recommendation.recommendedDirectionIds.length <= 3);
  // ranking is deterministic — re-run should give same order
  const result2 = evaluateDirections({
    projectId: 'p1', directionSet: makeDirectionSet(dirs), familyDifference: EMPTY_FAMILY_DIFF,
  });
  assert.deepEqual(result.ranking.rankedDirectionIds, result2.ranking.rankedDirectionIds);
});
