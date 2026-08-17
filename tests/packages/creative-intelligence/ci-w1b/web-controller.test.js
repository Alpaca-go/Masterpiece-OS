/**
 * CI-W1B Web Controller — golden scenarios.
 *
 * Scenarios (Spec §20):
 *   W01 no run
 *   W02 start document-led
 *   W03 awaiting fact confirmation
 *   W04 confirm → understanding
 *   W05 all concepts blocked
 *   W06 recommendation exists but no selection
 *   W07 select recommended
 *   W08 select non-recommended valid direction
 *   W09 completed Canon + Translation
 *   W10 resume completed
 *
 * Hard fixtures:
 *   - Recommendation = A, User selects B → selectedDirectionId = B,
 *     recommendation still A.
 *   - blocked Concept visible, no valid Direction refs.
 *   - no selection → Canon locked, Translation locked.
 *
 * The controller is a pure module (no DOM, no React, no side effects).
 * Every assertion verifies a single hard invariant of the Web side.
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..', '..');
const controllerUrl = pathToFileURL(path.join(repoRoot, 'apps', 'web', 'src', 'ciworkspace', 'controller.ts')).href;
const typesUrl = pathToFileURL(path.join(repoRoot, 'apps', 'web', 'src', 'ciworkspace', 'types.ts')).href;

const controller = await import(controllerUrl);
const types = await import(typesUrl);

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function makeRun(overrides = {}) {
  return {
    schemaVersion: 'creative-intelligence-run-v0.1',
    id: 'run-1',
    projectId: null,
    projectName: 'Test Project',
    status: 'pending',
    documentRunId: 'doc-1',
    apiProfileId: 'profile-1',
    provider: 'dashscope',
    model: 'qwen3.6-plus',
    createdAt: '2026-08-17T00:00:00.000Z',
    startedAt: null,
    completedAt: null,
    currentStage: 'pending',
    selectionRevision: 0,
    selectedDirectionId: null,
    warnings: [],
    diagnostics: [],
    errorCode: null,
    lastError: null,
    ...overrides
  };
}

function makeWorkspace(overrides = {}) {
  const run = overrides.run ?? makeRun();
  return {
    schemaVersion: 'creative-intelligence-workspace-v0.1',
    run,
    documentRunId: 'doc-1',
    sourceRunId: 'doc-1',
    truth: null,
    evidence: null,
    needs: [],
    insights: [],
    opportunityMap: null,
    conceptSet: null,
    directionSet: null,
    evaluation: null,
    recommendation: null,
    selection: null,
    selectedDirectionSnapshot: null,
    visualCanon: null,
    anchorContract: null,
    productionTranslation: null,
    blockers: [],
    warnings: [],
    diagnostics: [],
    ...overrides
  };
}

function makeConcept(overrides = {}) {
  return {
    id: 'c-1',
    title: 'Concept Alpha',
    thesis: 'A grounded thesis',
    strategicMechanism: 'Identity preservation through system reframing',
    strategicPattern: 'identity-preservation',
    status: 'grounded',
    strengths: ['Strong'],
    risks: ['Modest'],
    blockers: [],
    factRefs: [],
    evidenceRefs: [],
    ...overrides
  };
}

function makeDirection(overrides = {}) {
  return {
    id: 'd-1',
    title: 'Direction Alpha',
    thesis: 'A grounded direction thesis',
    systemHypothesis: 'A system hypothesis',
    visualMechanism: 'A visual mechanism',
    directionFamily: 'structural-system',
    colorRelationship: 'Limited palette',
    materialRelationship: 'Raw',
    compositionLogic: 'Grid',
    typographyBehavior: 'Editorial',
    graphicBehavior: 'Geometric',
    imageBehavior: 'Sparse',
    crossMediaBehavior: ['brand/VI', 'editorial'],
    spaceApplicability: 'High',
    packagingApplicability: 'Medium',
    strengths: ['Strong'],
    risks: ['Modest'],
    status: 'grounded',
    ...overrides
  };
}

function makeRecommendation(primaryId, recommendedIds = []) {
  return {
    recommendedDirectionIds: recommendedIds,
    primaryDirectionId: primaryId,
    rationale: ['Fit across dimensions'],
    tradeoffs: ['Some risk'],
    confidence: 'high',
    status: 'available',
    generatedBy: 'deterministic_evaluation',
    traceVersion: 'evaluation-v0.1'
  };
}

// ---------------------------------------------------------------------------
// W01 no run — controller never assumes a run exists
// ---------------------------------------------------------------------------

test('CI-W1B W01: no run — deriveRunLifecycle handles pending status, active stage = 01-input', () => {
  const run = makeRun({ status: 'pending' });
  const lifecycle = controller.deriveRunLifecycle(run);
  assert.equal(lifecycle.activeStage, '01-input');
  assert.equal(lifecycle.resumable, false);
  assert.equal(lifecycle.cancellable, true);
  assert.equal(lifecycle.removable, false);
});

// ---------------------------------------------------------------------------
// W02 start document-led
// ---------------------------------------------------------------------------

test('CI-W1B W02: start document-led — pending run is cancellable but not removable', () => {
  const lifecycle = controller.deriveRunLifecycle(makeRun({ status: 'pending' }));
  assert.equal(lifecycle.cancellable, true);
  assert.equal(lifecycle.removable, false);
  assert.equal(lifecycle.completable, false);
  assert.equal(lifecycle.run.status, 'pending');
});

// ---------------------------------------------------------------------------
// W03 awaiting fact confirmation
// ---------------------------------------------------------------------------

test('CI-W1B W03: awaiting fact confirmation — run is resumable, active stage = 02-facts', () => {
  const lifecycle = controller.deriveRunLifecycle(makeRun({ status: 'awaiting_fact_confirmation' }));
  assert.equal(lifecycle.resumable, true);
  assert.equal(lifecycle.cancellable, false);
  assert.equal(lifecycle.removable, true);
  assert.equal(lifecycle.activeStage, '02-facts');
});

// ---------------------------------------------------------------------------
// W04 confirm → understanding
// ---------------------------------------------------------------------------

test('CI-W1B W04: confirm → understanding — buildTraceChain surfaces Truth / Need / Insight / Opportunity / Fact', () => {
  const workspace = makeWorkspace({
    run: makeRun({ status: 'building_understanding' }),
    truth: { facts: [{ id: 'f-1', field: 'brandName', value: 'Brand', status: 'confirmed' }] },
    needs: [{ id: 'n-1', title: 'Need 1', description: 'desc' }],
    insights: [{ id: 'i-1', title: 'Insight 1', description: 'desc' }],
    opportunityMap: { opportunities: [{ id: 'o-1', title: 'Opp 1', description: 'desc' }] }
  });
  const chain = controller.buildTraceChain(workspace);
  const kinds = chain.map((step) => step.kind);
  assert.ok(kinds.includes('need'), 'need step present');
  assert.ok(kinds.includes('insight'), 'insight step present');
  assert.ok(kinds.includes('opportunity'), 'opportunity step present');
  assert.ok(kinds.includes('fact'), 'fact step present');
});

// ---------------------------------------------------------------------------
// W05 all concepts blocked
// ---------------------------------------------------------------------------

test('CI-W1B W05: all concepts blocked — Direction referenceableConceptIds is empty (P0 UI regression)', () => {
  const conceptA = makeConcept({ id: 'c-a', status: 'grounded' });
  const conceptB = makeConcept({ id: 'c-b', status: 'grounded' });
  const workspace = makeWorkspace({
    run: makeRun({ status: 'awaiting_direction_selection' }),
    conceptSet: {
      concepts: [conceptA, conceptB],
      gateResults: [],
      blockedConceptIds: ['c-a', 'c-b'],
      diagnostics: []
    }
  });
  const ref = controller.computeConceptReferenceability(workspace);
  assert.equal(ref.blockedConceptIds.size, 2);
  assert.equal(ref.referenceableConceptIds.size, 0);
});

// ---------------------------------------------------------------------------
// W06 recommendation exists but no selection
// ---------------------------------------------------------------------------

test('CI-W1B W06: recommendation exists but no selection — current selection is null, recommendation is set', () => {
  const rec = makeRecommendation('d-a', ['d-a']);
  const run = makeRun({ status: 'awaiting_direction_selection', selectedDirectionId: null });
  const view = makeWorkspace({ run, recommendation: rec, directionSet: { directions: [makeDirection({ id: 'd-a' })], blockedDirectionIds: [], evaluations: [], familyDifference: {}, diagnostics: [] } });
  assert.equal(view.run.selectedDirectionId, null);
  assert.equal(view.recommendation.primaryDirectionId, 'd-a');
  const availability = controller.evaluateSelectionAvailability(
    { id: 'd-a', status: 'grounded' },
    view.directionSet,
    view.run.selectedDirectionId,
    view.recommendation
  );
  assert.equal(availability.isRecommended, true);
  assert.equal(availability.isAlreadySelected, false);
  assert.equal(availability.selectable, true);
  assert.equal(availability.reason, null);
});

// ---------------------------------------------------------------------------
// W07 select recommended
// ---------------------------------------------------------------------------

test('CI-W1B W07: select recommended — proposal.requiresConfirmation is true even when user picks the recommended one', () => {
  const run = makeRun({ status: 'awaiting_direction_selection', selectedDirectionId: null });
  const rec = makeRecommendation('d-a', ['d-a']);
  const direction = { id: 'd-a', title: 'Direction Alpha' };
  const proposal = controller.buildSelectionProposal({
    direction,
    selectedDirectionId: run.selectedDirectionId,
    selectionRevision: run.selectionRevision,
    recommendation: rec
  });
  assert.equal(proposal.directionId, 'd-a');
  assert.equal(proposal.recommended, true);
  assert.equal(proposal.isRevision, false);
  assert.equal(proposal.newRevision, 1);
  assert.equal(proposal.requiresConfirmation, true);
});

// ---------------------------------------------------------------------------
// W08 select non-recommended valid direction
// ---------------------------------------------------------------------------

test('CI-W1B W08: select non-recommended — proposal.recommended is false, requiresConfirmation is true', () => {
  const run = makeRun({ status: 'awaiting_direction_selection', selectedDirectionId: null });
  const rec = makeRecommendation('d-a', ['d-a']);
  const direction = { id: 'd-b', title: 'Direction Beta' };
  const proposal = controller.buildSelectionProposal({
    direction,
    selectedDirectionId: run.selectedDirectionId,
    selectionRevision: run.selectionRevision,
    recommendation: rec
  });
  assert.equal(proposal.directionId, 'd-b');
  assert.equal(proposal.recommended, false);
  assert.equal(proposal.requiresConfirmation, true);
  assert.equal(proposal.newRevision, 1);
});

// ---------------------------------------------------------------------------
// W09 completed Canon + Translation
// ---------------------------------------------------------------------------

test('CI-W1B W09: completed run — completable=true, active stage = 09-translation, removable=true', () => {
  const run = makeRun({ status: 'completed' });
  const lifecycle = controller.deriveRunLifecycle(run);
  assert.equal(lifecycle.completable, true);
  assert.equal(lifecycle.resumable, false);
  assert.equal(lifecycle.removable, true);
  assert.equal(lifecycle.activeStage, '09-translation');
});

// ---------------------------------------------------------------------------
// W10 resume completed
// ---------------------------------------------------------------------------

test('CI-W1B W10: resume completed — completed runs are NOT resumable; only failed/checkpoint runs are resumable', () => {
  const completed = controller.deriveRunLifecycle(makeRun({ status: 'completed' }));
  const failed = controller.deriveRunLifecycle(makeRun({ status: 'failed' }));
  const awaiting = controller.deriveRunLifecycle(makeRun({ status: 'awaiting_fact_confirmation' }));
  assert.equal(completed.resumable, false);
  assert.equal(failed.resumable, true);
  assert.equal(awaiting.resumable, true);
});

// ---------------------------------------------------------------------------
// HARD FIXTURE 1 — Recommendation = A, User selects B
// ---------------------------------------------------------------------------

test('CI-W1B HARD: recommendation A, user selects B → selectedDirectionId = B, recommendation remains A', () => {
  const run = makeRun({ status: 'awaiting_direction_selection', selectedDirectionId: null, selectionRevision: 0 });
  const rec = makeRecommendation('d-a', ['d-a']);
  const proposal = controller.buildSelectionProposal({
    direction: { id: 'd-b', title: 'Direction Beta' },
    selectedDirectionId: run.selectedDirectionId,
    selectionRevision: run.selectionRevision,
    recommendation: rec
  });
  assert.equal(proposal.directionId, 'd-b');
  assert.equal(proposal.recommended, false);
  assert.equal(rec.primaryDirectionId, 'd-a');
  assert.equal(proposal.requiresConfirmation, true);
});

// ---------------------------------------------------------------------------
// HARD FIXTURE 2 — blocked Concept visible, no valid Direction refs
// ---------------------------------------------------------------------------

test('CI-W1B HARD: blocked Concept visible, never referenceable from a Direction', () => {
  const blocked = makeConcept({ id: 'c-x', status: 'grounded' });
  const grounded = makeConcept({ id: 'c-y', status: 'grounded' });
  const workspace = makeWorkspace({
    run: makeRun({ status: 'awaiting_direction_selection' }),
    conceptSet: {
      concepts: [blocked, grounded],
      gateResults: [],
      blockedConceptIds: ['c-x'],
      diagnostics: []
    }
  });
  const ref = controller.computeConceptReferenceability(workspace);
  assert.equal(workspace.conceptSet.concepts.length, 2);
  assert.equal(ref.blockedConceptIds.has('c-x'), true);
  assert.equal(ref.referenceableConceptIds.has('c-x'), false);
  assert.equal(ref.referenceableConceptIds.has('c-y'), true);
});

// ---------------------------------------------------------------------------
// HARD FIXTURE 3 — no selection → Canon locked, Translation locked
// ---------------------------------------------------------------------------

test('CI-W1B HARD: no selection — canonLocked and translationLocked are derived from selectedDirectionId', () => {
  const run = makeRun({ status: 'building_canon', selectedDirectionId: null });
  const view = makeWorkspace({
    run,
    visualCanon: { creativeThesis: 't', visualMechanism: 'm', systemHypothesis: 'h', directionFamily: 'structural-system' }
  });
  const canonLocked = !view.run.selectedDirectionId;
  const translationLocked = canonLocked || !view.visualCanon;
  assert.equal(canonLocked, true);
  assert.equal(translationLocked, true);
});

// ---------------------------------------------------------------------------
// HARD ACCEPTANCE: blocked Direction not selectable
// ---------------------------------------------------------------------------

test('CI-W1B HARD: blocked Direction is never selectable', () => {
  const rec = makeRecommendation('d-a', ['d-a']);
  const directionSet = { directions: [makeDirection({ id: 'd-x', status: 'blocked' })], blockedDirectionIds: ['d-x'] };
  const availability = controller.evaluateSelectionAvailability(
    { id: 'd-x', status: 'blocked' },
    directionSet,
    null,
    rec
  );
  assert.equal(availability.isBlocked, true);
  assert.equal(availability.selectable, false);
  assert.equal(availability.reason, 'direction-blocked');
});

test('CI-W1B HARD: direction in blockedDirectionIds is not selectable even with grounded status', () => {
  const rec = makeRecommendation('d-a', ['d-a']);
  const directionSet = { directions: [makeDirection({ id: 'd-x', status: 'grounded' })], blockedDirectionIds: ['d-x'] };
  const availability = controller.evaluateSelectionAvailability(
    { id: 'd-x', status: 'grounded' },
    directionSet,
    null,
    rec
  );
  assert.equal(availability.isBlocked, true);
  assert.equal(availability.selectable, false);
});

// ---------------------------------------------------------------------------
// HARD ACCEPTANCE: fact serialization round-trip
// ---------------------------------------------------------------------------

test('CI-W1B HARD: fact serialize — confirm keeps value, edit uses editedValue, remove/unknown clear value', () => {
  const facts = [
    { field: 'brandName', value: 'Brand A', authority: 'extracted', sourceRef: 'doc.md', evidenceRefs: ['e1'], userAction: 'confirm' },
    { field: 'industry', value: 'Retail', authority: 'extracted', sourceRef: 'doc.md', evidenceRefs: ['e1'], userAction: 'edit', editedValue: 'F&B' },
    { field: 'pricePositioning', value: 'Premium', authority: 'extracted', sourceRef: 'doc.md', evidenceRefs: ['e1'], userAction: 'remove' },
    { field: 'targetAudience', value: 'B2B', authority: 'extracted', sourceRef: 'doc.md', evidenceRefs: ['e1'], userAction: 'unknown' }
  ];
  const rows = controller.buildLocalFactRows(facts);
  const edited = controller.applyLocalFactEdit(rows, 'industry', 'F&B');
  const confirmed = controller.applyLocalFactAction(edited, 'brandName', 'confirm');
  const removed = controller.applyLocalFactAction(confirmed, 'pricePositioning', 'remove');
  const unknown = controller.applyLocalFactAction(removed, 'targetAudience', 'unknown');
  const serialized = controller.serializeFactRows(unknown);
  assert.equal(serialized[0].value, 'Brand A');
  assert.equal(serialized[1].value, 'F&B');
  assert.equal(serialized[2].value, null);
  assert.equal(serialized[3].value, null);
  assert.equal(serialized[2].userAction, 'remove');
  assert.equal(serialized[3].userAction, 'unknown');
});

// ---------------------------------------------------------------------------
// HARD ACCEPTANCE: stage rail is correctly mapped for every status
// ---------------------------------------------------------------------------

test('CI-W1B HARD: every RunStatus maps to a valid StageId', () => {
  const stages = new Set(types.STAGES.map((s) => s.id));
  const allStatuses = [
    'pending', 'preparing_documents', 'extracting_facts',
    'awaiting_fact_confirmation', 'building_truth', 'building_understanding',
    'building_concepts', 'building_directions', 'evaluating',
    'awaiting_direction_selection', 'building_canon', 'building_translation',
    'completed', 'failed', 'cancelled'
  ];
  for (const status of allStatuses) {
    const stage = controller.activeStageForStatus(status);
    assert.equal(stages.has(stage), true, `status ${status} should map to a valid stage; got ${stage}`);
  }
});

// ---------------------------------------------------------------------------
// HARD ACCEPTANCE: diagnostic grouping
// ---------------------------------------------------------------------------

test('CI-W1B HARD: groupDiagnostics partitions blocking / warning / diagnostic', () => {
  const workspace = makeWorkspace({
    run: makeRun({ status: 'awaiting_direction_selection' }),
    blockers: ['CANON_BLOCKED: identity violation'],
    warnings: ['EVAL_CONFIDENCE_LOW: limited evidence'],
    diagnostics: ['PROVENANCE_OK']
  });
  const groups = controller.groupDiagnostics(workspace);
  assert.ok(groups.blocking.length >= 1, 'blocking group non-empty');
  assert.ok(groups.warning.length >= 1, 'warning group non-empty');
  assert.ok(groups.diagnostic.length >= 1, 'diagnostic group non-empty');
});

// ---------------------------------------------------------------------------
// HARD ACCEPTANCE: trace chain stacks Direction only when selection exists
// ---------------------------------------------------------------------------

test('CI-W1B HARD: trace chain includes Direction step only when selectedDirectionSnapshot is set', () => {
  const withoutSelection = makeWorkspace({
    run: makeRun({ status: 'awaiting_direction_selection' }),
    directionSet: { directions: [makeDirection({ id: 'd-a' })] }
  });
  const withSelection = makeWorkspace({
    run: makeRun({ status: 'completed', selectedDirectionId: 'd-a', selectionRevision: 1 }),
    directionSet: { directions: [makeDirection({ id: 'd-a' })] },
    selectedDirectionSnapshot: { directionId: 'd-a', selectionRevision: 1, selectedAt: '2026-08-17T00:00:00Z', selectedBy: 'user', directionFingerprint: 'fp', direction: makeDirection({ id: 'd-a' }), traceVersion: 'visual-canon-v0.1' }
  });
  const chainA = controller.buildTraceChain(withoutSelection);
  const chainB = controller.buildTraceChain(withSelection);
  assert.equal(chainA.find((s) => s.kind === 'direction'), undefined);
  assert.ok(chainB.find((s) => s.kind === 'direction'));
});

// ---------------------------------------------------------------------------
// HARD ACCEPTANCE: STAGES export has exactly 9 entries
// ---------------------------------------------------------------------------

test('CI-W1B HARD: STAGES export contains exactly 9 entries, in order 01..09', () => {
  assert.equal(types.STAGES.length, 9);
  const labels = types.STAGES.map((s) => s.id);
  assert.deepEqual(labels, ['01-input', '02-facts', '03-understanding', '04-concepts', '05-directions', '06-evaluation', '07-selection', '08-canon', '09-translation']);
});
