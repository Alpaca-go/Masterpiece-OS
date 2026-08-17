import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * CI-7 Evaluation & Selection — unit tests.
 *
 * Layer 1: Evaluation contract
 * Layer 2: scoring
 * Layer 3: ranking
 * Layer 4: recommendation
 * Layer 5: tradeoff
 * Layer 6: selection contract
 * Layer 7: explicit action
 * Layer 8: revision/history
 * Layer 9: invalidation
 * Layer 10: recommendation != selection
 */

import {
  evaluateDirection,
  rankEvaluations,
  recommend,
  buildTradeoffAnalysis,
  evaluateDirections,
  EVALUATION_TRACE_VERSION,
} from '@masterpiece/creative-intelligence/evaluation/index.ts';
import {
  createUnselectedState,
  applySelectionAction,
  validateSelection,
  makeSelectAction,
  getEmptySelectionHistory,
  appendHistoryEntry,
  getHistoryForDirection,
  SELECTION_TRACE_VERSION,
} from '@masterpiece/creative-intelligence/selection/index.ts';

// ========== Fixtures ==========

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

function makeDirEval(dirId, status = 'pass', issues = []) {
  return {
    directionId: dirId,
    status,
    gateResults: [
      { directionId: dirId, gate: 'trace', status: 'pass', issues: [] },
      { directionId: dirId, gate: 'brand-identity', status: 'pass', issues: [] },
      { directionId: dirId, gate: 'asset-authorization', status: 'pass', issues: [] },
      { directionId: dirId, gate: 'business-coverage', status: 'pass', issues: [] },
      { directionId: dirId, gate: 'consumer-coverage', status: 'pass', issues: [] },
      { directionId: dirId, gate: 'group-visual-authorization', status: 'pass', issues: [] },
      { directionId: dirId, gate: 'family-difference', status: 'pass', issues: [] },
      { directionId: dirId, gate: 'spatial-drift', status: 'pass', issues: [] },
      { directionId: dirId, gate: 'aesthetic', status: 'pass', issues: [] },
      { directionId: dirId, gate: 'execution-readiness', status: 'pass', issues: [] },
      { directionId: dirId, gate: 'anchor-prompt-leakage', status: 'pass', issues: [] },
    ],
    issues,
  };
}

function makeDirectionSet(directions, extra = {}) {
  return {
    schemaVersion: '0.1',
    projectId: 'p1',
    directions,
    evaluations: directions.map((d) => makeDirEval(d.id)),
    familyDifference: {
      pairs: [],
      allMeaningfullyDistinct: true,
      hasFakeDiversity: false,
      diagnostics: [],
    },
    blockedDirectionIds: [],
    diagnostics: [],
    provenance: {
      conceptSetVersion: '0.1',
      truthSchemaVersion: '0.2',
      generatedAt: '2026-01-01T00:00:00.000Z',
      mode: 'shadow',
    },
    ...extra,
  };
}

const EMPTY_FAMILY_DIFF = {
  pairs: [],
  allMeaningfullyDistinct: true,
  hasFakeDiversity: false,
  diagnostics: [],
};

// ========== Layer 1: Evaluation contract ==========

test('CI-7 L1: evaluateDirection returns 10-dimension score', () => {
  const dir = makeDir('d1');
  const result = evaluateDirection({
    direction: dir,
    directionEvaluation: makeDirEval('d1'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 1,
  });
  const dimNames = Object.keys(result.dimensions);
  assert.equal(dimNames.length, 10);
  for (const name of [
    'grounding', 'strategic_fit', 'need_coverage', 'concept_fit',
    'direction_distinctness', 'identity_safety', 'asset_safety',
    'cross_media_coherence', 'execution_readiness', 'risk_load',
  ]) {
    assert.ok(result.dimensions[name], `must have ${name}`);
    assert.ok([0, 1, 2, 3].includes(result.dimensions[name].score));
  }
  assert.ok(typeof result.totalScore === 'number');
  assert.equal(result.traceVersion, EVALUATION_TRACE_VERSION);
});

test('CI-7 L1: totalScore = sum of dimension scores', () => {
  const dir = makeDir('d1');
  const result = evaluateDirection({
    direction: dir,
    directionEvaluation: makeDirEval('d1'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 1,
  });
  const expected = Object.values(result.dimensions).reduce((s, d) => s + d.score, 0);
  assert.equal(result.totalScore, expected);
});

test('CI-7 L1: blocked direction → evaluation blocked', () => {
  const dir = makeDir('d1', { status: 'blocked' });
  const result = evaluateDirection({
    direction: dir,
    directionEvaluation: makeDirEval('d1', 'blocked'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 1,
  });
  assert.equal(result.blocked, true);
});

// ========== Layer 2: scoring ==========

test('CI-7 L2: score 3 (strong) for clean grounded direction', () => {
  const dir = makeDir('d1');
  const result = evaluateDirection({
    direction: dir,
    directionEvaluation: makeDirEval('d1'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 1,
  });
  // Most dimensions should be 3 for a clean grounded direction
  const threes = Object.values(result.dimensions).filter((d) => d.score === 3).length;
  assert.ok(threes >= 5, `expected ≥5 strong dimensions, got ${threes}`);
});

test('CI-7 L2: score 0 for fake-diversity', () => {
  const dir = makeDir('d1');
  const result = evaluateDirection({
    direction: dir,
    directionEvaluation: makeDirEval('d1'),
    familyDifference: { ...EMPTY_FAMILY_DIFF, hasFakeDiversity: true },
    allEvaluations: [],
    validDirectionCount: 1,
  });
  assert.equal(result.dimensions.direction_distinctness.score, 0);
});

test('CI-7 L2: score 0 for blocked brand identity', () => {
  const dir = makeDir('d1');
  const eval_ = makeDirEval('d1');
  eval_.gateResults.find((g) => g.gate === 'brand-identity').status = 'blocked';
  const result = evaluateDirection({
    direction: dir,
    directionEvaluation: eval_,
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 1,
  });
  assert.equal(result.dimensions.identity_safety.score, 0);
});

// ========== Layer 3: ranking ==========

test('CI-7 L3: rankEvaluations — non-blocked first, higher score first', () => {
  const e1 = evaluateDirection({
    direction: makeDir('d1', { status: 'blocked' }),
    directionEvaluation: makeDirEval('d1', 'blocked'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 2,
  });
  const e2 = evaluateDirection({
    direction: makeDir('d2'),
    directionEvaluation: makeDirEval('d2'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 2,
  });
  const ranking = rankEvaluations([e1, e2]);
  assert.deepEqual(ranking.rankedDirectionIds, ['d2', 'd1']);
});

test('CI-7 L3: rankEvaluations — stable id tiebreak', () => {
  // Both directions have similar profiles → alphabetical
  const e1 = evaluateDirection({
    direction: makeDir('d-zebra'),
    directionEvaluation: makeDirEval('d-zebra'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 2,
  });
  const e2 = evaluateDirection({
    direction: makeDir('d-alpha'),
    directionEvaluation: makeDirEval('d-alpha'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 2,
  });
  const ranking = rankEvaluations([e1, e2]);
  assert.deepEqual(ranking.rankedDirectionIds, ['d-alpha', 'd-zebra']);
});

// ========== Layer 4: recommendation ==========

test('CI-7 L4: recommend — all_blocked when no valid directions', () => {
  const e1 = evaluateDirection({
    direction: makeDir('d1', { status: 'blocked' }),
    directionEvaluation: makeDirEval('d1', 'blocked'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 1,
  });
  const ranking = rankEvaluations([e1]);
  const rec = recommend([e1], ranking);
  assert.equal(rec.status, 'all_blocked');
  assert.equal(rec.recommendedDirectionIds.length, 0);
});

test('CI-7 L4: recommend — available when grounded', () => {
  const e1 = evaluateDirection({
    direction: makeDir('d1'),
    directionEvaluation: makeDirEval('d1'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 1,
  });
  const ranking = rankEvaluations([e1]);
  const rec = recommend([e1], ranking);
  assert.equal(rec.status, 'available');
  assert.equal(rec.primaryDirectionId, 'd1');
  assert.ok(rec.recommendedDirectionIds.includes('d1'));
});

test('CI-7 L4: recommend — never recommends blocked direction', () => {
  const e1 = evaluateDirection({
    direction: makeDir('d1', { status: 'blocked' }),
    directionEvaluation: makeDirEval('d1', 'blocked'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 2,
  });
  const e2 = evaluateDirection({
    direction: makeDir('d2'),
    directionEvaluation: makeDirEval('d2'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 2,
  });
  const ranking = rankEvaluations([e1, e2]);
  const rec = recommend([e1, e2], ranking);
  assert.ok(!rec.recommendedDirectionIds.includes('d1'));
  assert.ok(rec.recommendedDirectionIds.includes('d2'));
});

test('CI-7 L4: recommend — confidence high when clear leader', () => {
  // d1 = strong, d2 = weak
  const e1 = evaluateDirection({
    direction: makeDir('d1'),
    directionEvaluation: makeDirEval('d1'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 2,
  });
  const e2 = evaluateDirection({
    direction: makeDir('d2'),
    directionEvaluation: makeDirEval('d2', 'pass_with_warnings', [{
      code: 'BRAND_NAME_NOT_PRESERVED', severity: 'warning', message: 'm',
    }]),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 2,
  });
  // Force d2 to be weaker
  e2.dimensions.risk_load.score = 1;
  e2.dimensions.identity_safety.score = 1;
  e2.totalScore = e2.totalScore - 5;
  const ranking = rankEvaluations([e1, e2]);
  const rec = recommend([e1, e2], ranking);
  assert.equal(rec.confidence, 'high');
});

// ========== Layer 5: tradeoff ==========

test('CI-7 L5: buildTradeoffAnalysis — identifies advantages and disadvantages', () => {
  const e1 = evaluateDirection({
    direction: makeDir('d1'),
    directionEvaluation: makeDirEval('d1'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 1,
  });
  const tradeoffs = buildTradeoffAnalysis([e1]);
  assert.equal(tradeoffs.length, 1);
  assert.equal(tradeoffs[0].directionId, 'd1');
  assert.equal(tradeoffs[0].advisoryOnly, true);
  assert.ok(Array.isArray(tradeoffs[0].advantages));
  assert.ok(Array.isArray(tradeoffs[0].disadvantages));
});

// ========== Layer 6: selection contract ==========

test('CI-7 L6: createUnselectedState — all defaults', () => {
  const state = createUnselectedState('p1', '2026-01-01T00:00:00.000Z');
  assert.equal(state.schemaVersion, '0.1');
  assert.equal(state.projectId, 'p1');
  assert.equal(state.selectedDirectionId, null);
  assert.equal(state.selectedAt, null);
  assert.equal(state.selectedBy, null);
  assert.equal(state.selectionSource, null);
  assert.equal(state.revision, 0);
  assert.deepEqual(state.previousSelectionIds, []);
  assert.equal(state.status, 'unselected');
  assert.equal(state.authoritative, false);
  assert.equal(state.mode, 'shadow');
});

test('CI-7 L6: SELECTION_TRACE_VERSION is set', () => {
  assert.equal(SELECTION_TRACE_VERSION, 'selection-v0.1');
});

// ========== Layer 7: explicit action ==========

test('CI-7 L7: applySelectionAction — user action transitions to selected', () => {
  let state = createUnselectedState('p1', '2026-01-01T00:00:00.000Z');
  const action = makeSelectAction('p1', 'd1', { occurredAt: '2026-01-02T00:00:00.000Z' });
  const { state: newState, diagnostics } = applySelectionAction(state, action, {
    directionExists: () => true,
    isDirectionBlocked: () => false,
  });
  assert.equal(diagnostics.length, 0);
  assert.equal(newState.selectedDirectionId, 'd1');
  assert.equal(newState.status, 'selected');
  assert.equal(newState.selectedBy, 'user');
  assert.equal(newState.selectionSource, 'explicit_user_action');
  assert.equal(newState.revision, 1);
});

test('CI-7 L7: applySelectionAction — non-user actor rejected', () => {
  let state = createUnselectedState('p1');
  const action = { ...makeSelectAction('p1', 'd1'), actor: 'system' };
  const { diagnostics } = applySelectionAction(state, action, {
    directionExists: () => true,
    isDirectionBlocked: () => false,
  });
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, 'SELECTION_ACTION_REQUIRED');
});

test('CI-7 L7: applySelectionAction — wrong projectId rejected', () => {
  let state = createUnselectedState('p1');
  const action = makeSelectAction('p2', 'd1');
  const { diagnostics } = applySelectionAction(state, action, {
    directionExists: () => true,
    isDirectionBlocked: () => false,
  });
  assert.equal(diagnostics.some((d) => d.code === 'SELECTION_PROJECT_MISMATCH'), true);
});

test('CI-7 L7: applySelectionAction — non-existent direction rejected', () => {
  let state = createUnselectedState('p1');
  const action = makeSelectAction('p1', 'd-nonexistent');
  const { diagnostics } = applySelectionAction(state, action, {
    directionExists: (id) => id === 'd1',
    isDirectionBlocked: () => false,
  });
  assert.equal(diagnostics.some((d) => d.code === 'SELECTION_DIRECTION_NOT_FOUND'), true);
});

test('CI-7 L7: applySelectionAction — blocked direction rejected', () => {
  let state = createUnselectedState('p1');
  const action = makeSelectAction('p1', 'd1');
  const { diagnostics } = applySelectionAction(state, action, {
    directionExists: () => true,
    isDirectionBlocked: () => true,
  });
  assert.equal(diagnostics.some((d) => d.code === 'SELECTION_DIRECTION_BLOCKED'), true);
});

// ========== Layer 8: revision/history ==========

test('CI-7 L8: changing selection increments revision and preserves history', () => {
  let state = createUnselectedState('p1', '2026-01-01T00:00:00.000Z');

  // First selection
  const r1 = applySelectionAction(state, makeSelectAction('p1', 'd1', { occurredAt: 't1' }), {
    directionExists: () => true, isDirectionBlocked: () => false,
  });
  state = r1.state;
  assert.equal(state.revision, 1);
  assert.equal(state.selectedDirectionId, 'd1');

  // Second selection
  const r2 = applySelectionAction(state, makeSelectAction('p1', 'd2', { occurredAt: 't2' }), {
    directionExists: () => true, isDirectionBlocked: () => false,
  });
  state = r2.state;
  assert.equal(state.revision, 2);
  assert.equal(state.selectedDirectionId, 'd2');
  assert.deepEqual(state.previousSelectionIds, ['d1']);
});

test('CI-7 L8: history preserves entries with revision and timestamp', () => {
  let history = getEmptySelectionHistory();
  history = appendHistoryEntry(history, {
    revision: 1, selectedDirectionId: 'd1', selectedAt: 't1', selectedBy: 'user',
  });
  history = appendHistoryEntry(history, {
    revision: 2, selectedDirectionId: 'd2', selectedAt: 't2', selectedBy: 'user',
  });
  assert.equal(history.entries.length, 2);
  assert.equal(history.currentRevision, 2);
  const d1History = getHistoryForDirection(history, 'd1');
  assert.equal(d1History.length, 1);
});

// ========== Layer 9: invalidation ==========

test('CI-7 L9: validateSelection — selected direction missing in set → invalidated', () => {
  let state = createUnselectedState('p1');
  const r1 = applySelectionAction(state, makeSelectAction('p1', 'd1', { occurredAt: 't1' }), {
    directionExists: () => true, isDirectionBlocked: () => false,
  });
  state = r1.state;
  const dirSet = makeDirectionSet([makeDir('d2')]); // d1 is not in this set
  const result = validateSelection(state, dirSet);
  assert.equal(result.valid, false);
  assert.equal(result.state.status, 'selection_invalidated');
});

test('CI-7 L9: validateSelection — selected direction now blocked → invalidated', () => {
  let state = createUnselectedState('p1');
  const r1 = applySelectionAction(state, makeSelectAction('p1', 'd1', { occurredAt: 't1' }), {
    directionExists: () => true, isDirectionBlocked: () => false,
  });
  state = r1.state;
  const dirSet = makeDirectionSet([makeDir('d1', { status: 'blocked' })]);
  const result = validateSelection(state, dirSet);
  assert.equal(result.valid, false);
  assert.equal(result.state.status, 'selection_invalidated');
});

test('CI-7 L9: validateSelection — selected direction still valid → ok', () => {
  let state = createUnselectedState('p1');
  const r1 = applySelectionAction(state, makeSelectAction('p1', 'd1', { occurredAt: 't1' }), {
    directionExists: () => true, isDirectionBlocked: () => false,
  });
  state = r1.state;
  const dirSet = makeDirectionSet([makeDir('d1')]);
  const result = validateSelection(state, dirSet);
  assert.equal(result.valid, true);
  assert.equal(result.state.status, 'selected');
});

// ========== Layer 10: recommendation != selection ==========

test('CI-7 L10: recommendation can exist without selection (initial state)', () => {
  // This is the "Golden fixture" — at any time when no user action has
  // been taken, selectedDirectionId MUST be null even if a recommendation
  // exists.
  const state = createUnselectedState('p1');
  assert.equal(state.selectedDirectionId, null);
  assert.equal(state.status, 'unselected');
});

test('CI-7 L10: selection may differ from recommendation', () => {
  let state = createUnselectedState('p1', '2026-01-01T00:00:00.000Z');
  // Suppose recommendation is d1, but user picks d2
  const { state: newState } = applySelectionAction(
    state,
    makeSelectAction('p1', 'd2', { occurredAt: 't1' }),
    {
      directionExists: () => true,
      isDirectionBlocked: () => false,
      recommendationSnapshot: ['d1'], // d1 was recommended
    },
  );
  assert.equal(newState.selectedDirectionId, 'd2');
  assert.equal(newState.recommendationAtSelection?.recommendedDirectionIds[0], 'd1');
  // User rejected the recommendation
  assert.notEqual(newState.selectedDirectionId, newState.recommendationAtSelection?.recommendedDirectionIds[0]);
});

test('CI-7 L10: re-evaluation MUST NOT select', () => {
  // Simulate: re-running evaluation does not touch the selection state.
  // The selection state is independent of evaluation.
  let state = createUnselectedState('p1');
  // Re-evaluate (this should not change state)
  const e1 = evaluateDirection({
    direction: makeDir('d1'),
    directionEvaluation: makeDirEval('d1'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [],
    validDirectionCount: 1,
  });
  const e2 = evaluateDirection({
    direction: makeDir('d2'),
    directionEvaluation: makeDirEval('d2'),
    familyDifference: EMPTY_FAMILY_DIFF,
    allEvaluations: [e1],
    validDirectionCount: 1,
  });
  const ranking = rankEvaluations([e1, e2]);
  const rec = recommend([e1, e2], ranking);
  // State remains unselected — recommendation cannot auto-select
  assert.equal(state.status, 'unselected');
  assert.equal(state.selectedDirectionId, null);
  // Recommendation is independent
  assert.ok(rec.recommendedDirectionIds.length > 0);
});

// ========== Full evaluateDirections ==========

test('CI-7 full: evaluateDirections — top-level orchestrator', () => {
  const directions = [makeDir('d1'), makeDir('d2')];
  const result = evaluateDirections({
    projectId: 'p1',
    directionSet: makeDirectionSet(directions),
    familyDifference: EMPTY_FAMILY_DIFF,
  });
  assert.equal(result.schemaVersion, '0.1');
  assert.equal(result.projectId, 'p1');
  assert.equal(result.evaluations.length, 2);
  assert.ok(result.ranking);
  assert.ok(result.recommendation);
  assert.equal(result.provenance.mode, 'shadow');
});
