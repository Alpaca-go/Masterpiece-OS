/**
 * Truth precedence policy.
 *
 * Spec #12: explicit precedence model, NOT a single crude numeric rank.
 * Spec #13: precedence evaluation returns a TruthResolution, not just a value.
 * Spec #11: authority, confidence, recency, source type, confirmation state
 *           are all distinct signals.
 *
 * Baseline semantic order (top wins):
 *   USER_CONFIRMED
 *     > LOCKED
 *     > AUTHORITATIVE_DOCUMENT_FACT
 *     > AUTHORITATIVE_PROJECT_METADATA
 *     > VISUAL_SOURCE_FACT
 *     > MODEL_INFERENCE
 *     > CREATIVE_HYPOTHESIS
 *     > SYSTEM_DEFAULT
 *     > UNKNOWN
 */

import type {
  ProjectTruthFact,
  TruthAuthority,
  TruthResolution,
} from './contracts.ts';

const AUTHORITY_RANK: Readonly<Record<TruthAuthority, number>> = Object.freeze({
  USER_CONFIRMED: 9,
  LOCKED: 8,
  AUTHORITATIVE_DOCUMENT_FACT: 7,
  AUTHORITATIVE_PROJECT_METADATA: 6,
  VISUAL_SOURCE_FACT: 5,
  MODEL_INFERENCE: 4,
  CREATIVE_HYPOTHESIS: 3,
  SYSTEM_DEFAULT: 2,
  UNKNOWN: 1,
});

/**
 * Higher rank wins. Ties broken by:
 * 1. createdAt (newer first) when both facts carry a timestamp.
 * 2. Stable id (lexicographically larger wins) — fully deterministic.
 * 3. If neither timestamp exists, the candidate whose id sorts earlier wins.
 *
 * Recency is a tie-breaker, not the primary signal.
 * Confidence is NEVER used to override authority (spec #11).
 */
export function compareAuthority(left: ProjectTruthFact, right: ProjectTruthFact): number {
  const lr = AUTHORITY_RANK[left.authority] ?? 0;
  const rr = AUTHORITY_RANK[right.authority] ?? 0;
  if (lr !== rr) return rr - lr;

  const lt = left.createdAt ?? '';
  const rt = right.createdAt ?? '';
  if (lt && rt && lt !== rt) {
    return lt < rt ? 1 : -1; // newer first
  }
  // Stable tiebreak: lexicographic id.
  if (left.id === right.id) return 0;
  return left.id < right.id ? 1 : -1;
}

/**
 * Resolve competing facts for a single canonical key.
 * Returns a TruthResolution — never silently discards competitors.
 *
 * Reference-derived facts are never selected as the winner when at least one
 * current-project fact exists for the same key. The reference fact is still
 * recorded in candidateFactIds so callers can detect contamination.
 */
export function resolveKey(
  key: string,
  candidates: ProjectTruthFact[],
  options: { excludeReferenceWinners?: boolean } = {},
): TruthResolution {
  if (candidates.length === 0) {
    return {
      key,
      candidateFactIds: [],
      status: 'insufficient_evidence',
      reasonCode: 'NO_CANDIDATES',
    };
  }

  // Reference-guard precheck: if the highest-authority candidate is a reference
  // fact and at least one current-project fact exists, the current project
  // fact wins — the reference fact is still recorded in candidateFactIds.
  if (options.excludeReferenceWinners) {
    const sorted = [...candidates].sort(compareAuthority);
    const winner = sorted[0];
    if (winner.isReferenceFact) {
      const current = sorted.find((c) => !c.isReferenceFact);
      if (current) {
        const conflictValues = new Set(
          sorted
            .filter((c) => !isSameValue(c.value, current.value))
            .map((c) => stableStringify(c.value)),
        );
        return {
          key,
          candidateFactIds: sorted.map((c) => c.id),
          selectedFactId: current.id,
          status: conflictValues.size > 0 ? 'conflicted' : 'resolved',
          reasonCode: 'REFERENCE_GUARDED',
        };
      }
    }
  }

  const sorted = [...candidates].sort(compareAuthority);
  const winner = sorted[0];
  const conflictValues = new Set(
    candidates
      .filter((c) => !isSameValue(c.value, winner.value))
      .map((c) => stableStringify(c.value)),
  );

  if (candidates.length === 1) {
    return {
      key,
      candidateFactIds: [winner.id],
      selectedFactId: winner.id,
      status: 'resolved',
      reasonCode: 'SINGLE_FACT',
    };
  }

  if (conflictValues.size === 0) {
    // All candidates agree on value.
    return {
      key,
      candidateFactIds: candidates.map((c) => c.id),
      selectedFactId: winner.id,
      status: 'resolved',
      reasonCode: 'UNANIMOUS_VALUE',
    };
  }

  return {
    key,
    candidateFactIds: candidates.map((c) => c.id),
    selectedFactId: winner.id,
    status: 'conflicted',
    reasonCode: 'VALUE_MISMATCH',
  };
}

function isSameValue(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export { AUTHORITY_RANK };
