/**
 * Direction Recommendation.
 *
 * CI-7 Step 15-17: deterministic recommendation.
 *
 * Rules:
 *   - Blocked Directions can NEVER be recommended.
 *   - If all blocked: recommendedDirectionIds = [], status = 'all_blocked'
 *   - If insufficient evidence: status = 'insufficient_evidence', primaryDirectionId = undefined
 *   - Confidence: high / medium / low (deterministic)
 *
 * Recommendation is NOT selection. Selection requires explicit user action.
 */

import type {
  DirectionEvaluationItem,
  DirectionRanking,
  DirectionRecommendation,
  RecommendationConfidence,
  RecommendationStatus,
} from './contracts.ts';
import { EVALUATION_TRACE_VERSION } from './contracts.ts';

function determineConfidence(
  evaluations: DirectionEvaluationItem[],
  ranking: DirectionRanking,
): RecommendationConfidence {
  const validEvals = evaluations.filter((e) => !e.blocked);
  if (validEvals.length === 0) return 'low';
  if (validEvals.length === 1) return 'medium';

  // If top is grounded and clearly leads, high
  const top = validEvals.find((e) => e.directionId === ranking.rankedDirectionIds[0]);
  const second = validEvals.find((e) => e.directionId === ranking.rankedDirectionIds[1]);
  if (!top || !second) return 'medium';

  const scoreDiff = top.totalScore - second.totalScore;
  const topHasWarning = top.warnings.length > 0;

  if (scoreDiff >= 4 && !topHasWarning) return 'high';
  if (scoreDiff >= 2) return 'medium';
  return 'low';
}

export function recommend(
  evaluations: DirectionEvaluationItem[],
  ranking: DirectionRanking,
): DirectionRecommendation {
  const validEvals = evaluations.filter((e) => !e.blocked);

  // All blocked
  if (validEvals.length === 0) {
    return {
      recommendedDirectionIds: [],
      primaryDirectionId: undefined,
      rationale: ['所有 Direction 都被 gate 阻断，无可推荐项'],
      tradeoffs: ['需要先解决上游问题（truth/evidence/concept/方向）'],
      confidence: 'low',
      status: 'all_blocked',
      generatedBy: 'deterministic_evaluation',
      traceVersion: EVALUATION_TRACE_VERSION,
    };
  }

  // Insufficient evidence: e.g. all valid evaluations have grounding = 0
  const allGroundingZero = validEvals.every((e) => e.dimensions.grounding.score === 0);
  if (allGroundingZero) {
    return {
      recommendedDirectionIds: [],
      primaryDirectionId: undefined,
      rationale: ['无 grounding 充分的 Direction'],
      tradeoffs: ['证据链可能不完整'],
      confidence: 'low',
      status: 'insufficient_evidence',
      generatedBy: 'deterministic_evaluation',
      traceVersion: EVALUATION_TRACE_VERSION,
    };
  }

  // All other cases: recommend top 1-3 from the ranking
  const top3 = ranking.rankedDirectionIds.slice(0, 3).filter((id) =>
    validEvals.some((e) => e.directionId === id),
  );

  const topEval = validEvals.find((e) => e.directionId === ranking.rankedDirectionIds[0]);
  const rationale: string[] = [];
  const tradeoffs: string[] = [];

  if (topEval) {
    rationale.push(`首选 ${topEval.directionId}：总分 ${topEval.totalScore}/30`);
    if (topEval.strengths.length > 0) {
      rationale.push(`强项: ${topEval.strengths.slice(0, 3).join('; ')}`);
    }
    if (topEval.tradeoffs.length > 0) {
      tradeoffs.push(`权衡: ${topEval.tradeoffs.slice(0, 3).join('; ')}`);
    }
  }

  const confidence = determineConfidence(validEvals, ranking);

  return {
    recommendedDirectionIds: top3,
    primaryDirectionId: ranking.rankedDirectionIds[0],
    rationale,
    tradeoffs,
    confidence,
    status: 'available',
    generatedBy: 'deterministic_evaluation',
    traceVersion: EVALUATION_TRACE_VERSION,
  };
}
