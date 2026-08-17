/**
 * Direction dedupe and diversity validation.
 *
 * Layer 4 (CI-6 test layers).
 *
 * Detect near-duplicate Directions by:
 *   - same directionFamily
 *   - same concept
 *   - high visualMechanism / systemHypothesis overlap
 *
 * Diversity is enforced by the Family Difference Evaluator
 * (direction-family.ts) at the gate level. This module handles
 * pre-gate dedupe.
 */

import type { CreativeDirectionCandidate } from './contracts.ts';

export interface DirectionDedupeResult {
  directions: CreativeDirectionCandidate[];
  duplicates: { kept: string; removed: string; reason: string }[];
  diagnostics: string[];
}

function buildKey(d: CreativeDirectionCandidate): string {
  return `${d.directionFamily}|${[...d.conceptRefs].sort().join(',')}`;
}

function tokenOverlap(a: string, b: string): number {
  const aTokens = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const bTokens = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let intersection = 0;
  for (const t of aTokens) if (bTokens.has(t)) intersection++;
  return intersection / Math.min(aTokens.size, bTokens.size);
}

export function dedupeDirections(directions: CreativeDirectionCandidate[]): DirectionDedupeResult {
  const result: CreativeDirectionCandidate[] = [];
  const duplicates: { kept: string; removed: string; reason: string }[] = [];
  const diagnostics: string[] = [];
  const seen = new Map<string, CreativeDirectionCandidate>();

  for (const direction of directions) {
    const key = buildKey(direction);

    // Same family + same concept set → potential duplicate
    if (seen.has(key)) {
      const existing = seen.get(key)!;
      const overlap = tokenOverlap(existing.visualMechanism, direction.visualMechanism);
      if (overlap >= 0.7) {
        duplicates.push({
          kept: existing.id,
          removed: direction.id,
          reason: '同 family + 同 concept set，mechanism 高度重叠',
        });
        continue;
      }
    }

    seen.set(key, direction);
    result.push(direction);
  }

  if (duplicates.length > 0) {
    diagnostics.push(`DEDUPE_REMOVED: 去除了 ${duplicates.length} 个重复方向`);
  }

  return { directions: result, duplicates, diagnostics };
}
