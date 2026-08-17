/**
 * Concept Status Authority — CI-W1A P0 fix.
 *
 * Concept Gate produces a `blockedConceptIds` list and per-concept gate
 * status (pass | pass_with_warnings | blocked), but `ConceptCandidate.status`
 * is set during generation and may not reflect gate results. The Direction
 * pipeline previously only checked `concept.status !== 'blocked'`, which
 * let gate-blocked Concepts through.
 *
 * This module establishes the single source of truth for "effective
 * Concept status" that downstream stages (Direction, Evaluation, etc.)
 * MUST consult.
 *
 * Rules (Spec §4.2):
 *   - gate blocked               → effective blocked
 *   - candidate blocked          → effective blocked
 *   - gate warning + grounded    → effective provisional
 *   - candidate provisional      → max provisional
 *   - grounded + pass only       → effective grounded
 *
 * Downstream certainty may NEVER increase.
 *
 * Pure. No IO. No model call.
 */

import type { ConceptCandidate, ConceptSet, ConceptStatus, ConceptGateStatus } from './contracts.ts';

/**
 * Compute the effective status of a single Concept by combining:
 *   - the Concept's own status (from generation)
 *   - the gate status (from validation)
 *   - whether the Concept appears in `conceptSet.blockedConceptIds`
 *
 * Spec §4.2: effective status is the LOWER bound of the two signals.
 */
export function resolveEffectiveConceptStatus(
  concept: ConceptCandidate,
  conceptSet: ConceptSet,
  gateStatusByConceptId?: Record<string, ConceptGateStatus>,
): ConceptStatus {
  // 1. If the ConceptSet explicitly marks the id as blocked, that wins.
  if (conceptSet.blockedConceptIds.includes(concept.id)) {
    return 'blocked';
  }
  // 2. If the gate summary marks the id as blocked, that wins.
  const gateStatus = gateStatusByConceptId?.[concept.id];
  if (gateStatus === 'blocked') {
    return 'blocked';
  }
  // 3. If the candidate itself is blocked, that wins.
  if (concept.status === 'blocked') {
    return 'blocked';
  }
  // 4. If the candidate is provisional, downstream may at most be provisional.
  if (concept.status === 'provisional') {
    return 'provisional';
  }
  // 5. If the gate emitted a warning on an otherwise grounded candidate, downgrade.
  if (gateStatus === 'pass_with_warnings' && concept.status === 'grounded') {
    return 'provisional';
  }
  // 6. Default: grounded.
  return concept.status;
}

/**
 * Filter a ConceptSet down to Concepts whose effective status allows them
 * to be consumed by the Direction pipeline. A Concept is "valid for
 * Direction generation" iff its effective status is NOT blocked.
 *
 * Spec §4.2: this is the authoritative filter — Direction MUST use it.
 */
export function filterValidConceptsForDirection(
  conceptSet: ConceptSet,
  gateStatusByConceptId?: Record<string, ConceptGateStatus>,
): ConceptCandidate[] {
  return conceptSet.concepts.filter(
    (concept) =>
      resolveEffectiveConceptStatus(concept, conceptSet, gateStatusByConceptId) !== 'blocked',
  );
}

/**
 * Compute the effective-status map for an entire ConceptSet.
 * Useful for diagnostics + WorkspaceView projections.
 */
export function computeEffectiveConceptStatusMap(
  conceptSet: ConceptSet,
  gateStatusByConceptId?: Record<string, ConceptGateStatus>,
): Record<string, ConceptStatus> {
  const out: Record<string, ConceptStatus> = {};
  for (const concept of conceptSet.concepts) {
    out[concept.id] = resolveEffectiveConceptStatus(
      concept,
      conceptSet,
      gateStatusByConceptId,
    );
  }
  return out;
}

/**
 * Map an effective Concept status to a maximum Direction status.
 * Spec §4.2: downstream certainty may NEVER increase.
 *
 *   effective blocked     → Direction may not exist (Direction count = 0)
 *   effective provisional  → Direction max provisional
 *   effective grounded     → Direction may be grounded
 */
export function maxDirectionStatusFromConcept(effective: ConceptStatus):
  | 'grounded'
  | 'provisional'
  | 'none' {
  if (effective === 'blocked') return 'none';
  if (effective === 'provisional') return 'provisional';
  return 'grounded';
}
