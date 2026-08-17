/**
 * Direction Ranking.
 *
 * CI-7 Step 14: deterministic ranking of evaluated Directions.
 *
 * Priority order (project-agnostic, explicit constants):
 *   1. non-blocked before blocked
 *   2. higher totalScore
 *   3. lower risk_load
 *   4. stable id tiebreak
 */

import type { DirectionEvaluationItem } from './contracts.ts';
import type { DirectionRanking } from './contracts.ts';
import { EVALUATION_TRACE_VERSION } from './contracts.ts';

export function rankEvaluations(
  evaluations: DirectionEvaluationItem[],
): DirectionRanking {
  const reasons: string[] = [];

  const sorted = [...evaluations].sort((a, b) => {
    // 1. non-blocked first
    if (a.blocked !== b.blocked) {
      return a.blocked ? 1 : -1;
    }
    // 2. higher total score first
    if (a.totalScore !== b.totalScore) {
      return b.totalScore - a.totalScore;
    }
    // 3. lower risk_load score = higher risk. We want lower risk first.
    const aRisk = a.dimensions.risk_load.score;
    const bRisk = b.dimensions.risk_load.score;
    if (aRisk !== bRisk) {
      return bRisk - aRisk; // higher risk_load score = lower risk → first
    }
    // 4. stable id tiebreak (alphabetical)
    if (a.directionId !== b.directionId) {
      return a.directionId < b.directionId ? -1 : 1;
    }
    return 0;
  });

  reasons.push('排序规则: 未阻塞 > 总分高 > 风险低 > ID 字典序');

  return {
    rankedDirectionIds: sorted.map((e) => e.directionId),
    rankingReason: reasons,
    traceVersion: EVALUATION_TRACE_VERSION,
  };
}
