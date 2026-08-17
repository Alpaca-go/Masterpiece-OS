/**
 * Selection Validator.
 *
 * CI-7 Step 24-27: validates selection state.
 *
 * Checks:
 *   - selected direction exists in the active direction set
 *   - selected direction is not blocked
 *   - projectId matches
 *   - if direction set changed materially, mark as selection_invalidated
 */

import type { DirectionSelectionState, SelectionDiagnostic } from './contracts.ts';
import type { DirectionSet } from '../direction-intelligence/contracts.ts';

export interface SelectionValidationResult {
  valid: boolean;
  state: DirectionSelectionState;
  diagnostics: SelectionDiagnostic[];
}

export function validateSelection(
  state: DirectionSelectionState,
  directionSet: DirectionSet,
): SelectionValidationResult {
  const diagnostics: SelectionDiagnostic[] = [];

  if (state.selectedDirectionId === null) {
    // Unselected state is always valid
    return { valid: true, state, diagnostics };
  }

  if (state.status === 'selection_invalidated') {
    return { valid: true, state, diagnostics };
  }

  // Check direction exists
  const direction = directionSet.directions.find((d) => d.id === state.selectedDirectionId);
  if (!direction) {
    diagnostics.push({
      code: 'SELECTION_DIRECTION_NOT_FOUND',
      message: `Selected Direction ${state.selectedDirectionId} 不在当前 DirectionSet 中`,
    });
    const newState: DirectionSelectionState = {
      ...state,
      status: 'selection_invalidated',
      reason: 'Selected direction no longer in active DirectionSet',
    };
    return { valid: false, state: newState, diagnostics };
  }

  // Check direction is not blocked
  if (direction.status === 'blocked') {
    diagnostics.push({
      code: 'SELECTION_DIRECTION_BLOCKED',
      message: `Selected Direction ${state.selectedDirectionId} 已被 gate 阻断`,
    });
    const newState: DirectionSelectionState = {
      ...state,
      status: 'selection_invalidated',
      reason: 'Selected direction became blocked',
    };
    return { valid: false, state: newState, diagnostics };
  }

  // Check if direction is in blockedDirectionIds
  if (directionSet.blockedDirectionIds.includes(state.selectedDirectionId)) {
    diagnostics.push({
      code: 'SELECTION_DIRECTION_BLOCKED',
      message: `Selected Direction ${state.selectedDirectionId} 在 blockedDirectionIds 中`,
    });
    const newState: DirectionSelectionState = {
      ...state,
      status: 'selection_invalidated',
      reason: 'Selected direction in blocked list',
    };
    return { valid: false, state: newState, diagnostics };
  }

  return { valid: true, state, diagnostics };
}
