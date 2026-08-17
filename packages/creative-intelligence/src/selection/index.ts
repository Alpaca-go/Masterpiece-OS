/**
 * Direction Selection — CI-7.
 *
 * Explicit user-controlled selection state.
 *
 * Hard invariants:
 *   - recommendation may exist without selection
 *   - selection requires explicit user action
 *   - selection may differ from recommendation
 *   - no user action → selectedDirectionId = null
 *   - re-evaluation MUST NOT select
 */

export * from './contracts.ts';
export { createUnselectedState, applySelectionAction, invalidateSelection, getEmptyHistory, appendHistory } from './selection-state.ts';
export { validateSelection } from './selection-validator.ts';
export { makeSelectAction, buildRecommendationSnapshot } from './selection-actions.ts';
export { getEmptySelectionHistory, appendHistoryEntry, getHistoryForDirection } from './selection-history.ts';
export { SELECTION_DIAGNOSTIC_CODES } from './diagnostics.ts';
