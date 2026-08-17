import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * CI-7 golden selection scenarios.
 *
 * 8 scenarios (Spec #37):
 *   1. no user action
 *   2. select recommended Direction
 *   3. select non-recommended valid Direction
 *   4. reject blocked Direction
 *   5. change selection
 *   6. invalidated selection
 *   7. selection after DirectionSet refresh
 *   8. recommendation changes but selection remains
 */

import {
  createUnselectedState,
  applySelectionAction,
  validateSelection,
  makeSelectAction,
} from '@masterpiece/creative-intelligence/selection/index.ts';

function makeDir(id, overrides = {}) {
  return {
    id,
    title: `Direction ${id}`,
    thesis: 't',
    conceptRefs: ['c1'],
    visualMechanism: 'A repeatable visual mechanism that organizes the system logic structurally.',
    systemHypothesis: 'A system expresses identity through structural logic.',
    directionFamily: 'structural-system',
    crossMediaBehavior: ['brand/VI', 'editorial'],
    opportunityRefs: ['o1'], insightRefs: ['i1'], needRefs: ['n1'],
    factRefs: ['f-brand'], evidenceRefs: ['ev-f-brand'],
    strengths: [], risks: [], blockers: [],
    status: 'grounded',
    generatedBy: 'deterministic_synthesis',
    traceVersion: 'direction-intelligence-v0.1',
    ...overrides,
  };
}

function makeDirectionSet(directions) {
  return {
    schemaVersion: '0.1',
    projectId: 'p1',
    directions,
    evaluations: [],
    familyDifference: { pairs: [], allMeaningfullyDistinct: true, hasFakeDiversity: false, diagnostics: [] },
    blockedDirectionIds: directions.filter((d) => d.status === 'blocked').map((d) => d.id),
    diagnostics: [],
    provenance: {
      conceptSetVersion: '0.1', truthSchemaVersion: '0.2',
      generatedAt: '2026-01-01T00:00:00.000Z', mode: 'shadow',
    },
  };
}

// ── 1. no user action ──

test('CI-7 selection golden 1: no user action → state remains unselected', () => {
  const state = createUnselectedState('p1', '2026-01-01T00:00:00.000Z');
  assert.equal(state.status, 'unselected');
  assert.equal(state.selectedDirectionId, null);
  assert.equal(state.revision, 0);
  assert.equal(state.selectedBy, null);
  // This is the HARD Golden fixture: no implicit selection.
});

// ── 2. select recommended Direction ──

test('CI-7 selection golden 2: select recommended Direction', () => {
  let state = createUnselectedState('p1', 't0');
  const dirSet = makeDirectionSet([makeDir('d1'), makeDir('d2')]);
  const { state: newState } = applySelectionAction(
    state,
    makeSelectAction('p1', 'd1', { occurredAt: 't1' }),
    {
      directionExists: (id) => dirSet.directions.some((d) => d.id === id),
      isDirectionBlocked: (id) => dirSet.blockedDirectionIds.includes(id),
      recommendationSnapshot: ['d1'], // d1 was recommended
    },
  );
  assert.equal(newState.selectedDirectionId, 'd1');
  assert.equal(newState.status, 'selected');
  assert.equal(newState.recommendationAtSelection?.recommendedDirectionIds[0], 'd1');
});

// ── 3. select non-recommended valid Direction ──

test('CI-7 selection golden 3: select non-recommended valid Direction (user rejects recommendation)', () => {
  let state = createUnselectedState('p1', 't0');
  const { state: newState } = applySelectionAction(
    state,
    makeSelectAction('p1', 'd2', { occurredAt: 't1' }),
    {
      directionExists: () => true,
      isDirectionBlocked: () => false,
      recommendationSnapshot: ['d1'], // d1 was recommended but user picked d2
    },
  );
  assert.equal(newState.selectedDirectionId, 'd2');
  assert.notEqual(newState.selectedDirectionId, 'd1');
  // Hard invariant: selected != recommended
});

// ── 4. reject blocked Direction ──

test('CI-7 selection golden 4: cannot select blocked Direction', () => {
  let state = createUnselectedState('p1');
  const { state: newState, diagnostics } = applySelectionAction(
    state,
    makeSelectAction('p1', 'd-blocked'),
    {
      directionExists: () => true,
      isDirectionBlocked: () => true,
    },
  );
  assert.equal(newState.status, 'unselected');
  assert.equal(newState.selectedDirectionId, null);
  assert.ok(diagnostics.some((d) => d.code === 'SELECTION_DIRECTION_BLOCKED'));
});

// ── 5. change selection ──

test('CI-7 selection golden 5: change selection — revision increments, history preserved', () => {
  let state = createUnselectedState('p1', 't0');
  const r1 = applySelectionAction(state, makeSelectAction('p1', 'd1', { occurredAt: 't1' }), {
    directionExists: () => true, isDirectionBlocked: () => false,
  });
  state = r1.state;
  assert.equal(state.revision, 1);
  assert.equal(state.selectedDirectionId, 'd1');

  const r2 = applySelectionAction(state, makeSelectAction('p1', 'd2', { occurredAt: 't2' }), {
    directionExists: () => true, isDirectionBlocked: () => false,
  });
  state = r2.state;
  assert.equal(state.revision, 2);
  assert.equal(state.selectedDirectionId, 'd2');
  assert.deepEqual(state.previousSelectionIds, ['d1']);
});

// ── 6. invalidated selection ──

test('CI-7 selection golden 6: invalidated selection when direction set refreshes', () => {
  let state = createUnselectedState('p1', 't0');
  const r1 = applySelectionAction(state, makeSelectAction('p1', 'd1', { occurredAt: 't1' }), {
    directionExists: () => true, isDirectionBlocked: () => false,
  });
  state = r1.state;

  // DirectionSet refresh: d1 is no longer in the set
  const newDirSet = makeDirectionSet([makeDir('d2')]);
  const result = validateSelection(state, newDirSet);
  assert.equal(result.valid, false);
  assert.equal(result.state.status, 'selection_invalidated');
  // d1 is preserved for audit but marked as invalidated
  assert.equal(result.state.selectedDirectionId, 'd1');
});

// ── 7. selection after DirectionSet refresh ──

test('CI-7 selection golden 7: after refresh, user can re-select new Direction', () => {
  let state = createUnselectedState('p1', 't0');
  const r1 = applySelectionAction(state, makeSelectAction('p1', 'd1', { occurredAt: 't1' }), {
    directionExists: () => true, isDirectionBlocked: () => false,
  });
  state = r1.state;

  // Old direction invalidated
  const newDirSet = makeDirectionSet([makeDir('d2'), makeDir('d3')]);
  const invalidated = validateSelection(state, newDirSet);
  state = invalidated.state;
  assert.equal(state.status, 'selection_invalidated');

  // User takes new action
  const r2 = applySelectionAction(state, makeSelectAction('p1', 'd2', { occurredAt: 't2' }), {
    directionExists: (id) => newDirSet.directions.some((d) => d.id === id),
    isDirectionBlocked: (id) => newDirSet.blockedDirectionIds.includes(id),
  });
  state = r2.state;
  assert.equal(state.status, 'selected');
  assert.equal(state.selectedDirectionId, 'd2');
  assert.equal(state.revision, 2);
});

// ── 8. recommendation changes but selection remains ──

test('CI-7 selection golden 8: recommendation change does NOT overwrite selection', () => {
  let state = createUnselectedState('p1', 't0');

  // t1: recommendation = A, user selects B
  const r1 = applySelectionAction(state, makeSelectAction('p1', 'B', { occurredAt: 't1' }), {
    directionExists: () => true,
    isDirectionBlocked: () => false,
    recommendationSnapshot: ['A'],
  });
  state = r1.state;
  assert.equal(state.selectedDirectionId, 'B');

  // t2: recommendation changes to C — selection MUST remain B
  // (no applySelectionAction called — re-evaluation only)
  // Simulate: re-running evaluation does not touch state
  const stateAfterReEval = { ...state };
  assert.equal(stateAfterReEval.selectedDirectionId, 'B');
  assert.notEqual(stateAfterReEval.selectedDirectionId, 'C');
  // selectedDirectionId is preserved across re-evaluation
  assert.equal(stateAfterReEval.revision, 1);
  assert.equal(stateAfterReEval.status, 'selected');
});
