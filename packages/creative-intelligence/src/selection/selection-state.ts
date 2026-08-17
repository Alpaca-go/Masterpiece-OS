/**
 * Selection State primitives.
 *
 * CI-7 Step 21-29: explicit user-controlled selection state.
 *
 * Hard invariants:
 *   - recommendation may exist without selection
 *   - selection may differ from recommendation
 *   - selection requires explicit user action
 *   - no user action → selectedDirectionId = null
 *   - recommendation change MUST NOT overwrite selection
 *   - re-evaluation MUST NOT select
 */

import type {
  DirectionSelectionState,
  DirectionSelectionHistory,
  DirectionSelectionHistoryEntry,
  SelectDirectionAction,
  SelectionDiagnostic,
  SelectionStatus,
} from './contracts.ts';
import { SELECTION_TRACE_VERSION } from './contracts.ts';

export function createUnselectedState(
  projectId: string,
  now: string = new Date().toISOString(),
): DirectionSelectionState {
  return {
    schemaVersion: '0.1',
    projectId,
    selectedDirectionId: null,
    selectedAt: null,
    selectedBy: null,
    selectionSource: null,
    revision: 0,
    previousSelectionIds: [],
    status: 'unselected',
    authoritative: false,
    mode: 'shadow',
  };
}

export function getEmptyHistory(): DirectionSelectionHistory {
  return { entries: [], currentRevision: 0 };
}

export function applySelectionAction(
  state: DirectionSelectionState,
  action: SelectDirectionAction,
  options: {
    directionExists: (directionId: string) => boolean;
    isDirectionBlocked: (directionId: string) => boolean;
    recommendationSnapshot?: string[];
  },
): { state: DirectionSelectionState; diagnostics: SelectionDiagnostic[] } {
  const diagnostics: SelectionDiagnostic[] = [];

  // Validate action
  if (action.type !== 'select_direction') {
    diagnostics.push({
      code: 'SELECTION_ACTION_REQUIRED',
      message: `action.type 必须为 'select_direction'，收到 '${action.type}'`,
    });
    return { state, diagnostics };
  }

  if (action.actor !== 'user') {
    diagnostics.push({
      code: 'SELECTION_ACTION_REQUIRED',
      message: `action.actor 必须为 'user'，收到 '${action.actor}'`,
    });
    return { state, diagnostics };
  }

  if (action.projectId !== state.projectId) {
    diagnostics.push({
      code: 'SELECTION_PROJECT_MISMATCH',
      message: `action.projectId ${action.projectId} 与 state.projectId ${state.projectId} 不匹配`,
    });
    return { state, diagnostics };
  }

  if (!options.directionExists(action.directionId)) {
    diagnostics.push({
      code: 'SELECTION_DIRECTION_NOT_FOUND',
      message: `Direction ${action.directionId} 不存在`,
    });
    return { state, diagnostics };
  }

  if (options.isDirectionBlocked(action.directionId)) {
    diagnostics.push({
      code: 'SELECTION_DIRECTION_BLOCKED',
      message: `Direction ${action.directionId} 被 gate 阻断，不能被选择`,
    });
    return { state, diagnostics };
  }

  // Detect already-selected (same direction)
  if (state.selectedDirectionId === action.directionId && state.status === 'selected') {
    diagnostics.push({
      code: 'SELECTION_ALREADY_SELECTED',
      message: `Direction ${action.directionId} 已经处于 selected 状态`,
    });
    return { state, diagnostics };
  }

  // Apply: increment revision, push previous to history
  const newRevision = state.revision + 1;
  const newPrevious = state.selectedDirectionId
    ? [...state.previousSelectionIds, state.selectedDirectionId]
    : [...state.previousSelectionIds];

  const newState: DirectionSelectionState = {
    schemaVersion: '0.1',
    projectId: state.projectId,
    selectedDirectionId: action.directionId,
    selectedAt: action.occurredAt,
    selectedBy: 'user',
    selectionSource: 'explicit_user_action',
    recommendationAtSelection: options.recommendationSnapshot
      ? { recommendedDirectionIds: options.recommendationSnapshot }
      : state.recommendationAtSelection,
    revision: newRevision,
    previousSelectionIds: newPrevious,
    status: 'selected',
    reason: action.reason,
    authoritative: false,
    mode: 'shadow',
  };

  return { state: newState, diagnostics };
}

export function invalidateSelection(
  state: DirectionSelectionState,
  reason: string,
): DirectionSelectionState {
  if (state.status === 'unselected') return state;

  return {
    ...state,
    status: 'selection_invalidated',
    reason,
    // Keep selectedDirectionId for audit, but mark as invalidated
  };
}

export function appendHistory(
  history: DirectionSelectionHistory,
  state: DirectionSelectionState,
): DirectionSelectionHistory {
  if (state.selectedDirectionId === null || state.selectedAt === null) {
    return history;
  }
  const entry: DirectionSelectionHistoryEntry = {
    revision: state.revision,
    selectedDirectionId: state.selectedDirectionId,
    selectedAt: state.selectedAt,
    selectedBy: 'user',
    recommendationSnapshot: state.recommendationAtSelection?.recommendedDirectionIds,
    reason: state.reason,
  };
  return {
    entries: [...history.entries, entry],
    currentRevision: state.revision,
  };
}
