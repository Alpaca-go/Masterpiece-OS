/**
 * Selection History.
 *
 * CI-7 Step 25-26: revision tracking + history preservation.
 *
 * Each selection transition increments revision and preserves
 * the previous selection id.
 */

import type {
  DirectionSelectionHistory,
  DirectionSelectionHistoryEntry,
} from './contracts.ts';

export function getEmptySelectionHistory(): DirectionSelectionHistory {
  return { entries: [], currentRevision: 0 };
}

export function appendHistoryEntry(
  history: DirectionSelectionHistory,
  entry: DirectionSelectionHistoryEntry,
): DirectionSelectionHistory {
  return {
    entries: [...history.entries, entry],
    currentRevision: entry.revision,
  };
}

export function getHistoryForDirection(
  history: DirectionSelectionHistory,
  directionId: string,
): DirectionSelectionHistoryEntry[] {
  return history.entries.filter((e) => e.selectedDirectionId === directionId);
}
