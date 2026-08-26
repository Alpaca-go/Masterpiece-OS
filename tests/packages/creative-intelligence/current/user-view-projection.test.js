/**
 * CI-W1B.1 User View Projection — progressive disclosure golden scenarios.
 *
 * UX scenarios (Spec §44):
 *   UX01 initial page shows upload as primary action
 *   UX05 fact review becomes primary view at checkpoint A
 *   UX06 internal reasoning becomes one Thinking view
 *   UX07 Direction + Evaluation + Selection merged into one decision view
 *   UX08 recommendation never auto-selects
 *   UX09 completed run shows Visual System
 *
 * The controller is a pure module (no DOM, no React, no side effects).
 * Every assertion verifies one projection rule of the Web side; the
 * internal 9-stage state machine (STAGES / activeStageForStatus) stays
 * untouched and is covered by the CI-W1B tests.
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

const { THINKING_PROGRESS_LABELS } = types;

// ---------------------------------------------------------------------------
// UX01 — initial page is upload-first ('input')
// ---------------------------------------------------------------------------

test('CI-W1B.1 UX01: no active run — user view is input (upload-first page)', () => {
  assert.equal(controller.deriveCreativeIntelligenceUserView(null), 'input');
  assert.equal(controller.deriveCreativeIntelligenceUserView(undefined), 'input');
  assert.equal(controller.deriveCreativeIntelligenceUserView(''), 'input');
});

test('CI-W1B.1 UX01: failed / cancelled runs fall back to input so error + recovery are visible', () => {
  assert.equal(controller.deriveCreativeIntelligenceUserView('failed'), 'input');
  assert.equal(controller.deriveCreativeIntelligenceUserView('cancelled'), 'input');
});

// ---------------------------------------------------------------------------
// User view mapping table (Spec §14)
// ---------------------------------------------------------------------------

test('CI-W1B.1 MAPPING: every RunStatus projects onto one of the user views', () => {
  const validViews = new Set(types.USER_VIEWS);
  assert.deepEqual([...types.USER_VIEWS], ['input', 'fact-review', 'thinking', 'direction-decision', 'all-blocked', 'visual-system']);
  const allStatuses = [
    'pending', 'preparing_documents', 'extracting_facts',
    'awaiting_fact_confirmation', 'building_truth', 'building_understanding',
    'building_concepts', 'building_directions', 'evaluating',
    'awaiting_direction_selection', 'direction_blocked',
    'building_canon', 'building_translation',
    'completed', 'failed', 'cancelled'
  ];
  for (const status of allStatuses) {
    const view = controller.deriveCreativeIntelligenceUserView(status);
    assert.equal(validViews.has(view), true, `status ${status} must map to a valid user view; got ${view}`);
  }
});

test('CI-W1B.1 MAPPING: intake statuses project to thinking', () => {
  for (const status of ['pending', 'preparing_documents', 'extracting_facts']) {
    assert.equal(controller.deriveCreativeIntelligenceUserView(status), 'thinking', status);
  }
});

test('CI-W1B.1 MAPPING: internal reasoning statuses all project to the single thinking view', () => {
  for (const status of ['building_truth', 'building_understanding', 'building_concepts', 'building_directions', 'evaluating', 'building_canon', 'building_translation']) {
    assert.equal(controller.deriveCreativeIntelligenceUserView(status), 'thinking', status);
  }
});

// ---------------------------------------------------------------------------
// UX05 — fact review is the primary view at Checkpoint A
// ---------------------------------------------------------------------------

test('CI-W1B.1 UX05: awaiting_fact_confirmation projects to fact-review', () => {
  assert.equal(controller.deriveCreativeIntelligenceUserView('awaiting_fact_confirmation'), 'fact-review');
});

test('CI-W1B.1 UX05: groupFactRows partitions into the user-facing groups', () => {
  const rows = [
    { field: 'brandName', value: 'Brand', authority: 'extracted', sourceRef: null, evidenceRefs: [], userAction: 'confirm', editedValue: 'Brand', hasEdited: false },
    { field: 'industry', value: 'Retail', authority: 'extracted', sourceRef: null, evidenceRefs: [], userAction: 'confirm', editedValue: 'Retail', hasEdited: false },
    { field: 'productLine', value: 'Snacks', authority: 'extracted', sourceRef: null, evidenceRefs: [], userAction: 'confirm', editedValue: 'Snacks', hasEdited: false },
    { field: 'targetAudience', value: 'B2B', authority: 'extracted', sourceRef: null, evidenceRefs: [], userAction: 'confirm', editedValue: 'B2B', hasEdited: false },
    { field: 'outputConstraints', value: 'x', authority: 'extracted', sourceRef: null, evidenceRefs: [], userAction: 'confirm', editedValue: 'x', hasEdited: false },
    { field: 'lockedTrademark', value: 'TM', authority: 'locked', sourceRef: null, evidenceRefs: [], userAction: 'confirm', editedValue: 'TM', hasEdited: false },
    { field: 'distributor', value: '—', authority: 'extracted', sourceRef: null, evidenceRefs: [], userAction: 'unknown', editedValue: null, hasEdited: false }
  ];
  const groups = controller.groupFactRows(rows);
  const byKey = Object.fromEntries(groups.map((group) => [group.key, group]));
  assert.equal(byKey.brand.rows.length, 1);
  assert.equal(byKey.brand.label, '品牌');
  assert.equal(byKey.business.rows.length, 1);
  assert.equal(byKey.product.rows.length, 1);
  assert.equal(byKey.audience.rows.length, 1);
  assert.equal(byKey.requirements.rows.length, 1);
  assert.equal(byKey.locked.rows.length, 1);
  assert.equal(byKey.locked.label, 'Locked Facts');
  assert.equal(byKey.unconfirmed.rows.length, 1);
  assert.equal(byKey.unconfirmed.label, '尚未确认');
  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  assert.equal(total, rows.length, 'grouping must not drop rows');
});

// ---------------------------------------------------------------------------
// UX06 — reasoning maps to one thinking state
// ---------------------------------------------------------------------------

test('CI-W1B.1 UX06: Truth / Need / Insight / Opportunity / Concept / Evaluation phases share one thinking view', () => {
  const reasoningStatuses = ['building_truth', 'building_understanding', 'building_concepts', 'building_directions', 'evaluating'];
  const views = new Set(reasoningStatuses.map((status) => controller.deriveCreativeIntelligenceUserView(status)));
  assert.equal(views.size, 1);
  assert.equal(views.has('thinking'), true);
});

test('CI-W1B.1 UX06: deriveThinkingProgress maps internal phases onto friendly copy', () => {
  assert.equal(THINKING_PROGRESS_LABELS[controller.deriveThinkingProgress('building_truth')], '理解项目核心信息');
  assert.equal(THINKING_PROGRESS_LABELS[controller.deriveThinkingProgress('building_understanding')], '理解项目核心信息');
  assert.equal(THINKING_PROGRESS_LABELS[controller.deriveThinkingProgress('building_concepts')], '梳理创意机会');
  assert.equal(THINKING_PROGRESS_LABELS[controller.deriveThinkingProgress('building_directions')], '生成并评估创意方向');
  assert.equal(THINKING_PROGRESS_LABELS[controller.deriveThinkingProgress('evaluating')], '生成并评估创意方向');
  assert.equal(THINKING_PROGRESS_LABELS[controller.deriveThinkingProgress('preparing_documents')], '准备项目资料');
  assert.equal(THINKING_PROGRESS_LABELS[controller.deriveThinkingProgress('building_canon')], '生成视觉系统与适配方案');
});

test('CI-W1B.1 UX06: checkpoints and terminal states have no thinking progress step', () => {
  for (const status of ['awaiting_fact_confirmation', 'awaiting_direction_selection', 'completed', 'failed', 'cancelled']) {
    assert.equal(controller.deriveThinkingProgress(status), null, status);
  }
});

// ---------------------------------------------------------------------------
// UX07 — Direction + Evaluation + Selection merged
// ---------------------------------------------------------------------------

test('CI-W1B.1 UX07: awaiting_direction_selection projects to a single direction-decision view', () => {
  assert.equal(controller.deriveCreativeIntelligenceUserView('awaiting_direction_selection'), 'direction-decision');
  assert.equal(types.USER_VIEWS.includes('evaluation'), false, 'no standalone evaluation user view');
  assert.equal(types.USER_VIEWS.includes('selection'), false, 'no standalone selection user view');
});

// ---------------------------------------------------------------------------
// UX08 — recommendation never auto-selects
// ---------------------------------------------------------------------------

test('CI-W1B.1 UX08: recommended direction stays advisory — proposal requires confirmation', () => {
  const run = { status: 'awaiting_direction_selection', selectedDirectionId: null, selectionRevision: 0 };
  const recommendation = { primaryDirectionId: 'd-a', recommendedDirectionIds: ['d-a'] };
  const proposal = controller.buildSelectionProposal({
    direction: { id: 'd-a', title: 'Direction Alpha' },
    selectedDirectionId: run.selectedDirectionId,
    selectionRevision: run.selectionRevision,
    recommendation
  });
  assert.equal(proposal.recommended, true);
  assert.equal(proposal.requiresConfirmation, true);
  assert.equal(run.selectedDirectionId, null, 'recommendation must not mutate selection');
});

test('CI-W1B.1 UX08: user may select a non-recommended direction — recommendation unchanged', () => {
  const run = { status: 'awaiting_direction_selection', selectedDirectionId: null, selectionRevision: 0 };
  const recommendation = { primaryDirectionId: 'd-a', recommendedDirectionIds: ['d-a'] };
  const availability = controller.evaluateSelectionAvailability(
    { id: 'd-a', status: 'grounded' },
    { directions: [{ id: 'd-a', status: 'grounded' }], blockedDirectionIds: [] },
    null,
    recommendation
  );
  assert.equal(availability.isRecommended, true);
  assert.equal(availability.isAlreadySelected, false);
  const proposal = controller.buildSelectionProposal({
    direction: { id: 'd-b', title: 'Direction Beta' },
    selectedDirectionId: null,
    selectionRevision: 0,
    recommendation
  });
  assert.equal(proposal.directionId, 'd-b');
  assert.equal(recommendation.primaryDirectionId, 'd-a', 'recommendation must stay on A');
});

test('CI-W1B.1 UX08: blocked direction is never selectable even when recommended', () => {
  const recommendation = { primaryDirectionId: 'd-x', recommendedDirectionIds: ['d-x'] };
  const availability = controller.evaluateSelectionAvailability(
    { id: 'd-x', status: 'blocked' },
    { directions: [{ id: 'd-x', status: 'blocked' }], blockedDirectionIds: ['d-x'] },
    null,
    recommendation
  );
  assert.equal(availability.isBlocked, true);
  assert.equal(availability.selectable, false);
  assert.equal(availability.isRecommended, false, 'blocked direction carries no recommendation badge');
});

// ---------------------------------------------------------------------------
// UX09 — completed run shows the visual system
// ---------------------------------------------------------------------------

test('CI-W1B.1 UX09: completed run projects to visual-system', () => {
  assert.equal(controller.deriveCreativeIntelligenceUserView('completed'), 'visual-system');
});

// ---------------------------------------------------------------------------
// Internal mapping retained (Spec §12) — regression against CI-W1B
// ---------------------------------------------------------------------------

test('CI-W1B.1 RETAIN: STAGES stays exported with exactly 9 entries for tests / resume / advanced analysis', () => {
  assert.equal(types.STAGES.length, 9);
  const ids = types.STAGES.map((stage) => stage.id);
  assert.deepEqual(ids, ['01-input', '02-facts', '03-understanding', '04-concepts', '05-directions', '06-evaluation', '07-selection', '08-canon', '09-translation']);
});

test('CI-W1B.1 RETAIN: activeStageForStatus still resolves the internal stage for every status', () => {
  const stages = new Set(types.STAGES.map((stage) => stage.id));
  const allStatuses = [
    'pending', 'preparing_documents', 'extracting_facts',
    'awaiting_fact_confirmation', 'building_truth', 'building_understanding',
    'building_concepts', 'building_directions', 'evaluating',
    'awaiting_direction_selection', 'building_canon', 'building_translation',
    'completed', 'failed', 'cancelled'
  ];
  for (const status of allStatuses) {
    assert.equal(stages.has(controller.activeStageForStatus(status)), true, status);
  }
});

test('CI-W1B.1 RETAIN: canonical run lifecycle derivation unchanged', () => {
  const awaiting = controller.deriveRunLifecycle({ id: 'r', status: 'awaiting_fact_confirmation' });
  assert.equal(awaiting.resumable, true);
  assert.equal(awaiting.activeStage, '02-facts');
  const completed = controller.deriveRunLifecycle({ id: 'r', status: 'completed' });
  assert.equal(completed.completable, true);
  assert.equal(completed.resumable, false);
  assert.equal(completed.activeStage, '09-translation');
});
