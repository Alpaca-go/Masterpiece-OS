/**
 * SelectedDirectionSnapshot builder.
 *
 * CI-8 Step 11-13: Create immutable snapshot of the explicitly selected
 * Direction. Includes selection revision and Direction fingerprint.
 *
 * Hard entry rules:
 *   - selection.status = selected
 *   - selectedDirectionId != null
 *   - selectedBy = user
 *   - selectionSource = explicit_user_action
 *   - selection is not invalidated
 *   - Direction fingerprint is fresh
 *
 * Recommendation alone MUST NOT create Canon.
 */

import type {
  SelectedDirectionSnapshot,
  CanonTrace,
  CanonDiagnostic,
} from './contracts.ts';
import { VISUAL_CANON_TRACE_VERSION } from './contracts.ts';
import type { DirectionSelectionState } from '../selection/contracts.ts';
import type { CreativeDirectionCandidate } from '../direction-intelligence/contracts.ts';
import type { DirectionEvaluationItem, DirectionRecommendation } from '../evaluation/contracts.ts';

export interface SnapshotInput {
  projectId: string;
  selection: DirectionSelectionState;
  direction: CreativeDirectionCandidate;
  expectedFingerprint?: string;
  evaluationSnapshot?: {
    recommendation?: DirectionRecommendation;
    evaluation?: DirectionEvaluationItem;
  };
  generatedAt?: string;
}

export interface SnapshotResult {
  snapshot: SelectedDirectionSnapshot | null;
  diagnostics: CanonDiagnostic[];
}

/**
 * Deterministic Direction fingerprint.
 *
 * Built from stable identity fields. Updates to upstream (e.g. evidence
 * re-fingerprinting) would change this; the Direction object itself
 * is the source of truth.
 */
export function computeDirectionFingerprint(direction: CreativeDirectionCandidate): string {
  const stable = {
    id: direction.id,
    title: direction.title,
    visualMechanism: direction.visualMechanism,
    systemHypothesis: direction.systemHypothesis,
    directionFamily: direction.directionFamily,
    conceptRefs: [...direction.conceptRefs].sort(),
    opportunityRefs: [...direction.opportunityRefs].sort(),
    factRefs: [...direction.factRefs].sort(),
  };
  const json = JSON.stringify(stable);
  // Simple stable hash (FNV-1a 32-bit). Pure.
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return 'fp:' + (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Validate the snapshot entry rules.
 * Returns diagnostics if any hard entry rule is violated.
 */
export function validateSnapshotEntry(
  selection: DirectionSelectionState,
  direction: CreativeDirectionCandidate,
  expectedFingerprint?: string,
): { valid: boolean; diagnostics: CanonDiagnostic[] } {
  const diagnostics: CanonDiagnostic[] = [];

  // Hard entry: status
  if (selection.status === 'unselected') {
    diagnostics.push({
      code: 'CANON_SELECTION_REQUIRED',
      message: 'selection.status is unselected; CI-8 requires explicit user selection',
    });
    return { valid: false, diagnostics };
  }

  if (selection.status === 'selection_invalidated') {
    diagnostics.push({
      code: 'CANON_SELECTION_INVALIDATED',
      message: 'selection.status is selection_invalidated; CI-8 must not regenerate',
    });
    return { valid: false, diagnostics };
  }

  // Hard entry: selectedDirectionId
  if (!selection.selectedDirectionId) {
    diagnostics.push({
      code: 'CANON_SELECTION_REQUIRED',
      message: 'selectedDirectionId is null; explicit user selection required',
    });
    return { valid: false, diagnostics };
  }

  // Hard entry: selectedBy
  if (selection.selectedBy !== 'user') {
    diagnostics.push({
      code: 'CANON_SELECTION_REQUIRED',
      message: `selectedBy is '${selection.selectedBy}'; must be 'user'`,
    });
    return { valid: false, diagnostics };
  }

  // Hard entry: selectionSource
  if (selection.selectionSource !== 'explicit_user_action') {
    diagnostics.push({
      code: 'CANON_SELECTION_REQUIRED',
      message: 'selectionSource is not explicit_user_action',
    });
    return { valid: false, diagnostics };
  }

  // Hard entry: direction matches selectedDirectionId
  if (direction.id !== selection.selectedDirectionId) {
    diagnostics.push({
      code: 'CANON_DIRECTION_NOT_FOUND',
      message: `selectedDirectionId=${selection.selectedDirectionId} does not match direction.id=${direction.id}`,
    });
    return { valid: false, diagnostics };
  }

  // Hard entry: direction is not blocked
  if (direction.status === 'blocked') {
    diagnostics.push({
      code: 'CANON_DIRECTION_BLOCKED',
      message: 'selected Direction is blocked; CI-8 cannot use it',
    });
    return { valid: false, diagnostics };
  }

  // Hard entry: fingerprint freshness
  if (expectedFingerprint) {
    const currentFingerprint = computeDirectionFingerprint(direction);
    if (currentFingerprint !== expectedFingerprint) {
      diagnostics.push({
        code: 'CANON_DIRECTION_STALE',
        message: 'Direction fingerprint mismatch; selection may be stale',
      });
      return { valid: false, diagnostics };
    }
  }

  return { valid: true, diagnostics };
}

/**
 * Build the immutable SelectedDirectionSnapshot.
 *
 * The snapshot is "immutable" by convention: it captures a frozen copy
 * of the Direction at this revision, preventing downstream drift.
 */
export function buildSelectedDirectionSnapshot(input: SnapshotInput): SnapshotResult {
  const diagnostics: CanonDiagnostic[] = [];

  // Entry rules
  const entry = validateSnapshotEntry(input.selection, input.direction, input.expectedFingerprint);
  if (!entry.valid) {
    return { snapshot: null, diagnostics: [...diagnostics, ...entry.diagnostics] };
  }

  // If recommendation is present, that is just advisory context.
  // The snapshot source is the SELECTED direction, not the recommendation.
  const fingerprint = computeDirectionFingerprint(input.direction);

  const snapshot: SelectedDirectionSnapshot = {
    schemaVersion: '0.1',
    projectId: input.projectId,
    directionId: input.direction.id,
    selectionRevision: input.selection.revision,
    selectedAt: input.selection.selectedAt ?? input.generatedAt ?? new Date().toISOString(),
    selectedBy: 'user',
    directionFingerprint: fingerprint,
    direction: input.direction,
    evaluationSnapshot: input.evaluationSnapshot,
    traceVersion: VISUAL_CANON_TRACE_VERSION,
  };

  return { snapshot, diagnostics };
}

/**
 * Build CanonTrace from the snapshot.
 */
export function buildCanonTraceFromSnapshot(snapshot: SelectedDirectionSnapshot): CanonTrace {
  const d = snapshot.direction;
  return {
    selectedDirectionRef: d.id,
    conceptRefs: [...d.conceptRefs],
    opportunityRefs: [...d.opportunityRefs],
    insightRefs: [...d.insightRefs],
    needRefs: [...d.needRefs],
    factRefs: [...d.factRefs],
    evidenceRefs: [...d.evidenceRefs],
    selectionRevision: snapshot.selectionRevision,
    directionFingerprint: snapshot.directionFingerprint,
  };
}
