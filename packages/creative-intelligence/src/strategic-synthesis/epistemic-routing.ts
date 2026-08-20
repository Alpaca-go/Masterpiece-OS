/**
 * CI-W1C.7.4 — Epistemic Routing for Planning Strategic Claims.
 *
 * Routes a PlanningStrategicClaim to the appropriate downstream
 * carrier. NEVER auto-promotes. NEVER replaces epistemic class.
 *
 * Spec rules (PART E / PART G / PART H):
 *
 *   sourceRole != epistemicClass.
 *   A planning brief may contain FACT / USER_REQUIREMENT /
 *   MODEL_INFERENCE / UNKNOWN claims. Do not blanket-promote.
 *
 *   FACT:            eligible for Truth contribution if key is
 *                    supported and source refs are resolvable.
 *                    Otherwise keep in PlanningStrategicEvidence.
 *   USER_REQUIREMENT: goes to user requirement carrier. Do NOT
 *                    convert to FACT.
 *   MODEL_INFERENCE:  stays as inference / strategic evidence.
 *                    Do NOT promote to Truth.
 *   UNKNOWN:          stays unresolved. Do NOT fabricate.
 *
 * This module performs NO model call.
 */

import type { PlanningStrategicClaim, PlanningClaimKey } from './planning-strategic-evidence.ts';

/**
 * Truth key candidates per planning claim key.
 * A claim is eligible for Truth promotion only if its key has
 * a corresponding Truth key in this registry.
 *
 * This is the CI-W1C.7.4 minimal mapping. CI-W1C.7.5+ may extend
 * this registry to all PLANNING_CLAIM_KEYS.
 */
export const PLANNING_TO_TRUTH_KEY: Partial<Record<PlanningClaimKey, string>> = {
  industry: 'business.industry',
  brand_role: 'brand.role',
  // Other keys (brand_positioning, target_audience, etc.) are NOT
  // auto-mapped. They stay in PlanningStrategicEvidence.
};

/**
 * Routing decision.
 */
export type RoutingDestination =
  | 'TRUTH'         // promoted to Truth as AUTHORITATIVE_DOCUMENT_FACT
  | 'USER_REQ'      // carried as user_requirement (locked-style)
  | 'INFERENCE'     // stays in PlanningStrategicEvidence, epistemicClass=MODEL_INFERENCE
  | 'UNKNOWN'       // stays in PlanningStrategicEvidence, epistemicClass=UNKNOWN
  | 'EVIDENCE_ONLY' // eligible for Evidence but not Truth (no Truth key mapping)
  ;

export interface RoutingDecision {
  destination: RoutingDestination;
  /** Truth key, if destination=TRUTH. */
  truthKey?: string;
  /** Stable id for the routed fact. */
  routedId: string;
  /** Reason for the routing decision (for audit trail). */
  reason: string;
}

/**
 * Determine where to route a planning claim.
 *
 * Hard rules:
 *  - If epistemicClass=USER_REQUIREMENT → USER_REQ (never FACT).
 *  - If epistemicClass=MODEL_INFERENCE → INFERENCE (never Truth).
 *  - If epistemicClass=UNKNOWN → UNKNOWN (never fabricated).
 *  - If epistemicClass=FACT AND key has Truth mapping → TRUTH.
 *  - If epistemicClass=FACT AND no Truth mapping → EVIDENCE_ONLY.
 *
 * Returns a decision but does NOT mutate any state. The caller
 * is responsible for writing to the appropriate carrier.
 */
export function routePlanningClaim(claim: PlanningStrategicClaim): RoutingDecision {
  const { key, epistemicClass, claimId } = claim;
  switch (epistemicClass) {
    case 'USER_REQUIREMENT':
      return {
        destination: 'USER_REQ',
        routedId: `planning-req:${claimId}`,
        reason: 'planning USER_REQUIREMENT routed to user requirement carrier (no Truth promotion)'
      };
    case 'MODEL_INFERENCE':
      return {
        destination: 'INFERENCE',
        routedId: `planning-inference:${claimId}`,
        reason: 'planning MODEL_INFERENCE stays in PlanningStrategicEvidence (no Truth promotion)'
      };
    case 'UNKNOWN':
      return {
        destination: 'UNKNOWN',
        routedId: `planning-unknown:${claimId}`,
        reason: 'planning UNKNOWN stays unresolved (no fabrication)'
      };
    case 'FACT': {
      const truthKey = PLANNING_TO_TRUTH_KEY[key];
      if (truthKey) {
        return {
          destination: 'TRUTH',
          truthKey,
          routedId: `planning-fact:${claimId}`,
          reason: `planning FACT for key=${key} mapped to Truth key=${truthKey}`
        };
      }
      return {
        destination: 'EVIDENCE_ONLY',
        routedId: `planning-evidence:${claimId}`,
        reason: `planning FACT for key=${key} has no Truth mapping; stays in PlanningStrategicEvidence`
      };
    }
    default: {
      // Exhaustive switch — should never reach here.
      const _exhaustive: never = epistemicClass;
      throw new Error(`PLANNING-EPISTEMIC-ROUTING-UNHANDLED: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Assert that a planning claim satisfies the hard rule:
 * sourceRole != epistemicClass, and sourceRole is not overridden.
 */
export function assertEpistemicClassPreserved(
  sourceRole: string,
  epistemicClass: PlanningStrategicClaim['epistemicClass']
): void {
  if (sourceRole === 'PLANNING_STRATEGIC_SOURCE' && epistemicClass === 'USER_REQUIREMENT') {
    // Allowed: a planning brief can state a USER_REQUIREMENT.
    // (e.g., "All deliverables must be in Simplified Chinese.")
    return;
  }
  if (sourceRole === 'PLANNING_STRATEGIC_SOURCE') {
    // Allowed for any epistemic class.
    return;
  }
  // Defensive: a non-planning source role should not be in this artifact.
  throw new Error(
    `PLANNING-SOURCE-ROLE-MISMATCH: sourceRole=${sourceRole} epistemicClass=${epistemicClass}`
  );
}
