/**
 * Selection State contracts.
 *
 * CI-7: User Selection State.
 *
 * Hard invariant: recommendedDirection != selectedDirection.
 *   - recommendation may exist without selection
 *   - selection may differ from recommendation
 *   - selection requires explicit user action
 *   - no user action → selectedDirectionId = null
 *
 * Selection cannot be inferred. It cannot be triggered by evaluation
 * or recommendation. ONLY an explicit user action may transition
 * the state from unselected to selected.
 */

export type SelectionStatus =
  | 'unselected'
  | 'selected'
  | 'selection_invalidated';

export type SelectionSource = 'explicit_user_action' | null;

export type SelectionActor = 'user' | null;

export interface SelectDirectionAction {
  type: 'select_direction';
  projectId: string;
  directionId: string;
  actor: 'user';
  occurredAt: string;
  reason?: string;
}

export interface DirectionSelectionState {
  schemaVersion: '0.1';
  projectId: string;

  selectedDirectionId: string | null;
  selectedAt: string | null;
  selectedBy: SelectionActor;

  selectionSource: SelectionSource;

  recommendationAtSelection?: {
    recommendedDirectionIds: string[];
    primaryDirectionId?: string;
  };

  revision: number;
  previousSelectionIds: string[];

  status: SelectionStatus;

  reason?: string;

  authoritative: false;
  mode: 'shadow';
}

export interface DirectionSelectionHistoryEntry {
  revision: number;
  selectedDirectionId: string;
  selectedAt: string;
  selectedBy: 'user';
  recommendationSnapshot?: string[];
  reason?: string;
}

export interface DirectionSelectionHistory {
  entries: DirectionSelectionHistoryEntry[];
  currentRevision: number;
}

// --- Diagnostics ---

export type SelectionDiagnosticCode =
  | 'SELECTION_ACTION_REQUIRED'
  | 'SELECTION_DIRECTION_NOT_FOUND'
  | 'SELECTION_DIRECTION_BLOCKED'
  | 'SELECTION_PROJECT_MISMATCH'
  | 'SELECTION_ALREADY_SELECTED'
  | 'SELECTION_INVALIDATED'
  | 'SELECTION_REVISION_CONFLICT';

export interface SelectionDiagnostic {
  code: SelectionDiagnosticCode;
  message: string;
}

export const SELECTION_TRACE_VERSION = 'selection-v0.1';
