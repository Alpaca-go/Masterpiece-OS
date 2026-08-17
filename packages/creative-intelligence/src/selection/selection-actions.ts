/**
 * Selection Actions.
 *
 * CI-7 Step 23: explicit user action contract.
 *
 * ONLY this action may transition unselected → selected.
 * No inferred selection. No evaluation-triggered selection.
 */

import type { SelectDirectionAction } from './contracts.ts';

export function makeSelectAction(
  projectId: string,
  directionId: string,
  options: { occurredAt?: string; reason?: string } = {},
): SelectDirectionAction {
  return {
    type: 'select_direction',
    projectId,
    directionId,
    actor: 'user',
    occurredAt: options.occurredAt ?? new Date().toISOString(),
    reason: options.reason,
  };
}

/**
 * Build a recommendation snapshot from a recommendation result.
 * This is what gets recorded in selection state at the time of selection.
 */
export function buildRecommendationSnapshot(
  recommendedIds: string[],
  primaryId?: string,
): { recommendedDirectionIds: string[]; primaryDirectionId?: string } {
  return {
    recommendedDirectionIds: [...recommendedIds],
    primaryDirectionId: primaryId,
  };
}
