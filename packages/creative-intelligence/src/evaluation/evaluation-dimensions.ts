/**
 * Evaluation dimensions and scoring rules.
 *
 * CI-7 Step 9-13: deterministic scoring across 10 dimensions.
 * Each dimension's score derives from validated upstream data
 * (Direction state, gate results, trace closure, family difference).
 *
 * No freeform scorer. No 0-100 pseudo precision. Discrete 0-3 scale.
 */

import type {
  CreativeDirectionCandidate,
  DirectionEvaluationResult,
  DirectionGateResult,
  DirectionFamilyDifferenceResult,
} from '../direction-intelligence/contracts.ts';
import type {
  EvaluationDimension,
  EvaluationScore,
  DimensionScore,
  DirectionEvaluationItem,
} from './contracts.ts';
import { EVALUATION_TRACE_VERSION } from './contracts.ts';

export interface EvaluationInput {
  direction: CreativeDirectionCandidate;
  /** CI-6 evaluation result for this direction (all gate results). */
  directionEvaluation: DirectionEvaluationResult;
  /** CI-6 family difference result for the set. */
  familyDifference: DirectionFamilyDifferenceResult;
  /** All evaluated directions, for cross-direction scoring. */
  allEvaluations: DirectionEvaluationItem[];
  /** Total number of valid (non-blocked) directions. */
  validDirectionCount: number;
}

function findGateResult(
  evaluation: DirectionEvaluationResult,
  gate: string,
): DirectionGateResult | undefined {
  return evaluation.gateResults.find((r) => r.gate === gate);
}

function gateBlocked(evaluation: DirectionEvaluationResult, gate: string): boolean {
  return findGateResult(evaluation, gate)?.status === 'blocked';
}

function gateHasWarning(evaluation: DirectionEvaluationResult, gate: string): boolean {
  return findGateResult(evaluation, gate)?.status === 'pass_with_warnings';
}

function scoreReason(score: EvaluationScore, base: string): string {
  return `${base}: ${score === 0 ? 'fail' : score === 1 ? 'weak' : score === 2 ? 'acceptable' : 'strong'}`;
}

// 1. grounding: trace closure + evidence completeness + status
function scoreGrounding(input: EvaluationInput): DimensionScore {
  const d = input.direction;
  const e = input.directionEvaluation;

  const isBlocked = d.status === 'blocked';
  const hasFactRefs = d.factRefs.length > 0;
  const hasEvidenceRefs = d.evidenceRefs.length > 0;
  const traceGateBlocked = gateBlocked(e, 'trace');
  const traceGateWarning = gateHasWarning(e, 'trace');

  let score: EvaluationScore = 3;
  if (isBlocked) score = 0;
  else if (traceGateBlocked) score = 0;
  else if (traceGateWarning) score = 1;
  else if (!hasFactRefs) score = 1;
  else if (!hasEvidenceRefs) score = 2;

  return {
    score,
    reason: scoreReason(score, 'trace closure + evidence completeness'),
    factRefs: d.factRefs.slice(0, 3),
    evidenceRefs: d.evidenceRefs.slice(0, 3),
    gateRefs: ['trace'],
  };
}

// 2. strategic_fit: how strongly the direction aligns with the concept's strategicMechanism
function scoreStrategicFit(input: EvaluationInput): DimensionScore {
  const d = input.direction;
  // Heuristic: if the direction's visualMechanism is non-empty and references
  // the concept's strategic pattern, fit is strong.
  // We don't have direct concept here; use systemHypothesis length + crossMedia
  // completeness as proxy.
  const hasVisualMechanism = !!d.visualMechanism && d.visualMechanism.length > 20;
  const hasSystemHypothesis = !!d.systemHypothesis && d.systemHypothesis.length > 20;
  const hasCrossMedia = d.crossMediaBehavior.length >= 2;

  let score: EvaluationScore = 2;
  if (!hasVisualMechanism || !hasSystemHypothesis) score = 1;
  if (hasVisualMechanism && hasSystemHypothesis && hasCrossMedia) score = 3;

  return {
    score,
    reason: scoreReason(score, 'strategic alignment with concept mechanism'),
    factRefs: d.factRefs.slice(0, 3),
  };
}

// 3. need_coverage: critical need refs covered
function scoreNeedCoverage(input: EvaluationInput): DimensionScore {
  const d = input.direction;
  const e = input.directionEvaluation;

  const businessGateBlocked = gateBlocked(e, 'business-coverage');
  const consumerGateBlocked = gateBlocked(e, 'consumer-coverage');
  const businessWarning = gateHasWarning(e, 'business-coverage');
  const consumerWarning = gateHasWarning(e, 'consumer-coverage');

  let score: EvaluationScore = 3;
  if (businessGateBlocked || consumerGateBlocked) score = 0;
  else if (businessWarning && consumerWarning) score = 1;
  else if (businessWarning || consumerWarning) score = 2;

  return {
    score,
    reason: scoreReason(score, 'critical need coverage (business + consumer)'),
    factRefs: d.factRefs.slice(0, 3),
    gateRefs: ['business-coverage', 'consumer-coverage'],
  };
}

// 4. concept_fit: derived from concept trace propagation (proxy: conceptRefs + needRefs + factRefs)
function scoreConceptFit(input: EvaluationInput): DimensionScore {
  const d = input.direction;
  const conceptRefsCount = d.conceptRefs.length;
  const needRefsCount = d.needRefs.length;
  const factRefsCount = d.factRefs.length;

  let score: EvaluationScore = 2;
  if (conceptRefsCount === 0) score = 0;
  else if (conceptRefsCount >= 1 && needRefsCount >= 1 && factRefsCount >= 1) {
    if (factRefsCount >= 3) score = 3;
  } else if (conceptRefsCount >= 1) score = 1;

  return {
    score,
    reason: scoreReason(score, 'concept trace propagation (refs depth)'),
    factRefs: d.factRefs.slice(0, 3),
  };
}

// 5. direction_distinctness: family difference result
function scoreDirectionDistinctness(input: EvaluationInput): DimensionScore {
  const fd = input.familyDifference;
  if (fd.hasFakeDiversity) {
    return {
      score: 0,
      reason: 'fake-diversity detected upstream — must be filtered',
      gateRefs: ['family-difference'],
    };
  }
  if (fd.pairs.length === 0) {
    return { score: 2, reason: 'single direction in set, distinctness trivially satisfied' };
  }
  const allDistinct = fd.pairs.every((p) => p.isMeaningfullyDistinct);
  if (allDistinct) {
    return { score: 3, reason: 'all pairs meaningfully distinct' };
  }
  return {
    score: 1,
    reason: 'some pairs not meaningfully distinct',
    gateRefs: ['family-difference'],
  };
}

// 6. identity_safety: brand identity gate + reference guard
function scoreIdentitySafety(input: EvaluationInput): DimensionScore {
  const e = input.directionEvaluation;
  const brandGateBlocked = gateBlocked(e, 'brand-identity');

  if (brandGateBlocked) {
    return {
      score: 0,
      reason: 'brand identity gate blocked',
      gateRefs: ['brand-identity'],
    };
  }
  const brandWarning = gateHasWarning(e, 'brand-identity');
  if (brandWarning) {
    return {
      score: 2,
      reason: 'brand identity has warnings but no block',
      gateRefs: ['brand-identity'],
    };
  }
  return { score: 3, reason: 'identity safe' };
}

// 7. asset_safety: asset authorization gate
function scoreAssetSafety(input: EvaluationInput): DimensionScore {
  const e = input.directionEvaluation;
  const assetGateBlocked = gateBlocked(e, 'asset-authorization');

  if (assetGateBlocked) {
    return {
      score: 0,
      reason: 'asset authorization gate blocked',
      gateRefs: ['asset-authorization'],
    };
  }
  const assetWarning = gateHasWarning(e, 'asset-authorization');
  if (assetWarning) {
    return {
      score: 2,
      reason: 'asset authorization has warnings',
      gateRefs: ['asset-authorization'],
    };
  }
  return { score: 3, reason: 'asset safe' };
}

// 8. cross_media_coherence: number of touchpoint classes
function scoreCrossMediaCoherence(input: EvaluationInput): DimensionScore {
  const d = input.direction;
  const count = d.crossMediaBehavior.length;
  if (count === 0) return { score: 0, reason: 'no crossMedia defined' };
  if (count === 1) return { score: 1, reason: 'single touchpoint class' };
  if (count >= 2 && count <= 4) return { score: 3, reason: `${count} touchpoint classes — coherent` };
  return { score: 2, reason: `${count} touchpoint classes — broad coverage` };
}

// 9. execution_readiness: execution readiness gate
function scoreExecutionReadiness(input: EvaluationInput): DimensionScore {
  const e = input.directionEvaluation;
  if (gateBlocked(e, 'execution-readiness')) {
    return {
      score: 0,
      reason: 'execution readiness gate blocked',
      gateRefs: ['execution-readiness'],
    };
  }
  if (gateHasWarning(e, 'execution-readiness')) {
    return {
      score: 2,
      reason: 'execution readiness has warnings',
      gateRefs: ['execution-readiness'],
    };
  }
  return { score: 3, reason: 'execution ready' };
}

// 10. risk_load: warnings + provisional state + non-critical conflicts
function scoreRiskLoad(input: EvaluationInput): DimensionScore {
  const d = input.direction;
  const e = input.directionEvaluation;

  const warningCount = e.gateResults.filter((r) => r.status === 'pass_with_warnings').length;
  const blockCount = e.gateResults.filter((r) => r.status === 'blocked').length;

  let score: EvaluationScore = 3;
  if (d.status === 'blocked') score = 0;
  else if (d.status === 'provisional') score = 1;
  else if (warningCount >= 4) score = 1;
  else if (warningCount >= 2) score = 2;

  return {
    score,
    reason: scoreReason(score, `risk load (warnings=${warningCount}, blocks=${blockCount}, status=${d.status})`),
  };
}

export function evaluateDirection(input: EvaluationInput): DirectionEvaluationItem {
  const dimensions: Record<EvaluationDimension, DimensionScore> = {
    grounding: scoreGrounding(input),
    strategic_fit: scoreStrategicFit(input),
    need_coverage: scoreNeedCoverage(input),
    concept_fit: scoreConceptFit(input),
    direction_distinctness: scoreDirectionDistinctness(input),
    identity_safety: scoreIdentitySafety(input),
    asset_safety: scoreAssetSafety(input),
    cross_media_coherence: scoreCrossMediaCoherence(input),
    execution_readiness: scoreExecutionReadiness(input),
    risk_load: scoreRiskLoad(input),
  };

  // Total score: sum of all 10 dimensions (max 30)
  const totalScore = Object.values(dimensions).reduce((sum, d) => sum + d.score, 0);

  const blocked = input.direction.status === 'blocked'
    || Object.values(dimensions).some((d) => d.score === 0);

  const warnings: string[] = [];
  const strengths: string[] = [];
  const tradeoffs: string[] = [];

  for (const [name, dim] of Object.entries(dimensions)) {
    if (dim.score === 0) warnings.push(`${name}: ${dim.reason}`);
    if (dim.score === 3) strengths.push(`${name}: ${dim.reason}`);
    if (dim.score === 1) tradeoffs.push(`${name}: ${dim.reason}`);
  }

  return {
    directionId: input.direction.id,
    dimensions,
    totalScore,
    blocked,
    warnings,
    strengths,
    tradeoffs,
    traceVersion: EVALUATION_TRACE_VERSION,
  };
}
