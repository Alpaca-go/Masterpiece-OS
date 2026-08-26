/**
 * CI-W1B.2 Part I: Web controller tests for the All-Blocked view
 * (W01..W08).
 *
 * These tests verify:
 *   - the user-view projection maps direction_blocked -> 'all-blocked'
 *     (W01, W02);
 *   - the blocker summary is sorted and counted correctly (W03, W04);
 *   - no fake "return to fact review" CTA is exposed (W05);
 *   - the recompute / delete lifecycle still works (W06, W07);
 *   - there is no Direction selection CTA in the blocked state (W08).
 *
 * The controller is a pure module; we exercise it through the Web
 * helpers in apps/web/src/ciworkspace/controller.ts.
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..', '..');
const controllerUrl = pathToFileURL(path.join(repoRoot, 'apps', 'web', 'src', 'ciworkspace', 'controller.ts')).href;
const typesUrl = pathToFileURL(path.join(repoRoot, 'apps', 'web', 'src', 'ciworkspace', 'types.ts')).href;
const formatUrl = pathToFileURL(path.join(repoRoot, 'apps', 'web', 'src', 'ciworkspace', 'format.ts')).href;

const controller = await import(controllerUrl);
const types = await import(typesUrl);
const format = await import(formatUrl);

const { RUN_STATUS_LABELS, STATUS_TONE } = format;

// ---------------------------------------------------------------------------
// W01: direction_blocked projects to 'all-blocked' view
// ---------------------------------------------------------------------------
test('W01 direction_blocked projects onto the all-blocked user view', () => {
  assert.equal(controller.deriveCreativeIntelligenceUserView('direction_blocked'), 'all-blocked');
  // The all-blocked view is part of USER_VIEWS.
  assert.ok(types.USER_VIEWS.includes('all-blocked'));
});

// ---------------------------------------------------------------------------
// W02: no empty selection screen — direction_blocked is NOT direction-decision
// ---------------------------------------------------------------------------
test('W02 direction_blocked is NOT a direction-decision view (no empty selection screen)', () => {
  const view = controller.deriveCreativeIntelligenceUserView('direction_blocked');
  assert.notEqual(view, 'direction-decision', 'direction_blocked must NOT project to direction-decision');
  assert.notEqual(view, 'thinking', 'direction_blocked must NOT project to thinking (pipeline is finished)');
});

// ---------------------------------------------------------------------------
// W03: blocker summary is sorted by count (largest first), counted, and stable
// ---------------------------------------------------------------------------
test('W03 deriveAllBlockedView sorts blockers by count desc and counts concepts', () => {
  const workspace = {
    run: {
      schemaVersion: 'creative-intelligence-run-v0.1',
      id: 'r-1', projectId: 'p', projectName: 'P', status: 'direction_blocked',
      apiProfileId: 'a', provider: 'q', model: 'm',
      createdAt: '2026-01-01', startedAt: '2026-01-01', selectionRevision: 0,
      selectedDirectionId: null, warnings: [], diagnostics: [],
      blockerCode: 'CI_APP_DIRECTION_BLOCKED_ALL',
    },
    conceptSet: {
      concepts: [{ id: 'c-1' }, { id: 'c-2' }, { id: 'c-3' }, { id: 'c-4' }],
      blockedConceptIds: ['c-1', 'c-2', 'c-3', 'c-4'],
    },
    blockerSummaries: [
      { code: 'OFFICIAL_CERTIFICATION_CLAIM', title: '...', category: 'asset_authorization',
        affectedConceptIds: ['c-2', 'c-3', 'c-4'], issueCodes: ['OFFICIAL_CERTIFICATION_CLAIM'], count: 3, recoverable: false },
      { code: 'MISSING_CRITICAL_NEED_COVERAGE', title: '...', category: 'need_coverage',
        affectedConceptIds: ['c-1', 'c-2'], issueCodes: ['MISSING_CRITICAL_NEED_COVERAGE'], count: 2, recoverable: false },
    ],
  };
  const abv = controller.deriveAllBlockedView(workspace);
  assert.ok(abv, 'deriveAllBlockedView must return non-null for direction_blocked');
  assert.equal(abv.run.id, 'r-1');
  assert.equal(abv.totalConceptCount, 4);
  assert.equal(abv.blockedConceptCount, 4);
  assert.equal(abv.fallbackOnly, false);
  assert.equal(abv.blockers.length, 2);
  // Largest first.
  assert.equal(abv.blockers[0].code, 'OFFICIAL_CERTIFICATION_CLAIM');
  assert.equal(abv.blockers[0].count, 3);
  assert.equal(abv.blockers[1].code, 'MISSING_CRITICAL_NEED_COVERAGE');
  assert.equal(abv.blockers[1].count, 2);
});

// ---------------------------------------------------------------------------
// W04: details row is expandable; raw codes / ids are preserved
// ---------------------------------------------------------------------------
test('W04 deriveAllBlockedView preserves affected concept ids + issue codes for the details drawer', () => {
  const workspace = {
    run: { id: 'r', projectId: 'p', projectName: 'P', status: 'direction_blocked',
      apiProfileId: 'a', provider: 'q', model: 'm',
      createdAt: '2026-01-01', startedAt: '2026-01-01', selectionRevision: 0,
      selectedDirectionId: null, warnings: [], diagnostics: [],
      blockerCode: 'CI_APP_DIRECTION_BLOCKED_ALL' },
    conceptSet: { concepts: [], blockedConceptIds: [] },
    blockerSummaries: [
      { code: 'CRITICAL_CONFLICT_DEPENDENCY', title: '...', category: 'identity_conflict',
        affectedConceptIds: ['c-1', 'c-2', 'c-3'], issueCodes: ['CRITICAL_CONFLICT_DEPENDENCY'], count: 3, recoverable: false },
    ],
  };
  const abv = controller.deriveAllBlockedView(workspace);
  assert.equal(abv.blockers[0].category, 'identity_conflict');
  assert.deepEqual(abv.blockers[0].affectedConceptIds, ['c-1', 'c-2', 'c-3']);
  assert.deepEqual(abv.blockers[0].issueCodes, ['CRITICAL_CONFLICT_DEPENDENCY']);
});

// ---------------------------------------------------------------------------
// W05: no fake "return to fact review" — the controller never returns a
// fact-review view for direction_blocked
// ---------------------------------------------------------------------------
test('W05 direction_blocked does NOT project to fact-review (no fake reconfirm)', () => {
  const view = controller.deriveCreativeIntelligenceUserView('direction_blocked');
  assert.notEqual(view, 'fact-review', 'direction_blocked must NOT project to fact-review');
});

// ---------------------------------------------------------------------------
// W06: recompute / W07: delete are still valid lifecycles
// ---------------------------------------------------------------------------
test('W06 direction_blocked run is removable (re-create is the user recovery path)', () => {
  const run = {
    id: 'r', projectId: 'p', projectName: 'P', status: 'direction_blocked',
    apiProfileId: 'a', provider: 'q', model: 'm',
    createdAt: '2026-01-01', startedAt: '2026-01-01', selectionRevision: 0,
    selectedDirectionId: null, warnings: [], diagnostics: [],
    blockerCode: 'CI_APP_DIRECTION_BLOCKED_ALL',
  };
  const lifecycle = controller.deriveRunLifecycle(run);
  assert.equal(lifecycle.removable, true, 'direction_blocked must be removable');
  assert.equal(lifecycle.cancellable, false, 'direction_blocked must NOT be cancellable (not executing)');
  assert.equal(lifecycle.completable, false, 'direction_blocked must NOT be completable');
  assert.equal(lifecycle.resumable, false, 'direction_blocked must NOT be resumable (no revision capability yet)');
});

test('W07 direction_blocked run has stable stage label and label tone', () => {
  const run = {
    id: 'r', projectId: 'p', projectName: 'P', status: 'direction_blocked',
    apiProfileId: 'a', provider: 'q', model: 'm',
    createdAt: '2026-01-01', startedAt: '2026-01-01', selectionRevision: 0,
    selectedDirectionId: null, warnings: [], diagnostics: [],
    blockerCode: 'CI_APP_DIRECTION_BLOCKED_ALL',
  };
  const lifecycle = controller.deriveRunLifecycle(run);
  assert.equal(lifecycle.activeStage, '07-selection');
  assert.ok(lifecycle.stageLabel.includes('没有可选择的创意方向'));
  assert.equal(RUN_STATUS_LABELS['direction_blocked'], '当前没有可选择的创意方向');
  assert.equal(STATUS_TONE['direction_blocked'], 'failed');
});

// ---------------------------------------------------------------------------
// W08: no selection CTA in blocked state
// ---------------------------------------------------------------------------
test('W08 direction_blocked has no selectable Direction candidates', () => {
  const workspace = {
    run: { id: 'r', status: 'direction_blocked', selectionRevision: 0,
      apiProfileId: 'a', provider: 'q', model: 'm', projectName: 'P', projectId: 'p',
      createdAt: '2026-01-01', startedAt: '2026-01-01',
      selectedDirectionId: null, warnings: [], diagnostics: [],
      blockerCode: 'CI_APP_DIRECTION_BLOCKED_ALL' },
    directionSet: { directions: [], blockedDirectionIds: [], evaluations: [] },
    conceptSet: { concepts: [], blockedConceptIds: [], gateResults: [] },
    blockerSummaries: [],
  };
  const abv = controller.deriveAllBlockedView(workspace);
  assert.ok(abv, 'all-blocked view must be present');
  // No directions to evaluate selection against.
  assert.equal((workspace.directionSet.directions ?? []).length, 0);
});

// ---------------------------------------------------------------------------
// Fallback row when no blocker summaries are present
// ---------------------------------------------------------------------------
test('W-FALLBACK direction_blocked with no blockerSummaries still renders a single fallback row', () => {
  const workspace = {
    run: { id: 'r', status: 'direction_blocked', selectionRevision: 0,
      apiProfileId: 'a', provider: 'q', model: 'm', projectName: 'P', projectId: 'p',
      createdAt: '2026-01-01', startedAt: '2026-01-01',
      selectedDirectionId: null, warnings: [], diagnostics: [],
      blockerCode: 'CI_APP_DIRECTION_BLOCKED_ALL' },
    conceptSet: { concepts: [], blockedConceptIds: [], gateResults: [] },
    directionSet: { directions: [], blockedDirectionIds: [], evaluations: [] },
    blockerSummaries: [],
  };
  const abv = controller.deriveAllBlockedView(workspace);
  assert.ok(abv);
  assert.equal(abv.fallbackOnly, true);
  assert.equal(abv.blockers.length, 1);
  assert.equal(abv.blockers[0].code, 'CI_APP_DIRECTION_BLOCKED_ALL');
});

// ---------------------------------------------------------------------------
// Non-blocked runs do NOT project to all-blocked
// ---------------------------------------------------------------------------
test('W-OTHER awaiting_direction_selection does NOT project to all-blocked', () => {
  assert.notEqual(controller.deriveCreativeIntelligenceUserView('awaiting_direction_selection'), 'all-blocked');
  assert.equal(controller.deriveAllBlockedView({
    run: { status: 'awaiting_direction_selection' },
    conceptSet: { concepts: [], blockedConceptIds: [] },
  }), null, 'deriveAllBlockedView must return null for non-blocked status');
});
