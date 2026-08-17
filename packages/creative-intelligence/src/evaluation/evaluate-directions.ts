/**
 * Top-level evaluation orchestrator.
 *
 * Combines:
 *   1. Per-direction evaluation (10 dimensions)
 *   2. Ranking
 *   3. Recommendation
 *   4. Tradeoff analysis (advisory)
 *
 * Pure function. No IO. No model call.
 */

import type {
  DirectionEvaluationSet,
  DirectionEvaluationItem,
  EvaluationDiagnostic,
} from './contracts.ts';
import type {
  CreativeDirectionCandidate,
  DirectionSet,
  DirectionFamilyDifferenceResult,
} from '../direction-intelligence/contracts.ts';
import { evaluateDirection } from './evaluation-dimensions.ts';
import { rankEvaluations } from './ranking.ts';
import { recommend } from './recommendation.ts';
import { buildTradeoffAnalysis } from './tradeoff-analysis.ts';
import { EVALUATION_TRACE_VERSION } from './contracts.ts';

export interface EvaluateDirectionsInput {
  projectId: string;
  directionSet: DirectionSet;
  familyDifference: DirectionFamilyDifferenceResult;
  generatedAt?: string;
}

export function evaluateDirections(input: EvaluateDirectionsInput): DirectionEvaluationSet {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const directions = input.directionSet.directions;
  const diagnostics: EvaluationDiagnostic[] = [];

  // Build per-direction evaluation items. We need to do this in two passes:
  //   Pass 1: evaluate each direction (with empty allEvaluations for distinctness)
  //   Pass 2: re-evaluate direction_distinctness with all items
  //
  // For simplicity, we pass allEvaluations=[] on pass 1 (it doesn't affect
  // direction_distinctness which uses familyDifference). Then we re-score
  // direction_distinctness with the full set.

  const pass1: DirectionEvaluationItem[] = directions.map((direction) => {
    const directionEvaluation = input.directionSet.evaluations.find(
      (e) => e.directionId === direction.id,
    );
    if (!directionEvaluation) {
      diagnostics.push({
        code: 'EVAL_DIRECTION_MISSING',
        message: `Direction ${direction.id} 没有 CI-6 评估结果`,
        directionId: direction.id,
      });
    }
    return evaluateDirection({
      direction,
      directionEvaluation: directionEvaluation ?? {
        directionId: direction.id,
        status: 'blocked',
        gateResults: [],
        issues: [],
      },
      familyDifference: input.familyDifference,
      allEvaluations: [],
      validDirectionCount: directions.filter((d) => d.status !== 'blocked').length,
    });
  });

  // Pass 2: re-evaluate direction_distinctness with full set (for context)
  // For now, since direction_distinctness only uses familyDifference (not allEvaluations),
  // pass 1 results are sufficient. But we recompute to be safe.
  const finalEvaluations: DirectionEvaluationItem[] = directions.map((direction) => {
    const directionEvaluation = input.directionSet.evaluations.find(
      (e) => e.directionId === direction.id,
    );
    return evaluateDirection({
      direction,
      directionEvaluation: directionEvaluation ?? {
        directionId: direction.id,
        status: 'blocked',
        gateResults: [],
        issues: [],
      },
      familyDifference: input.familyDifference,
      allEvaluations: pass1,
      validDirectionCount: directions.filter((d) => d.status !== 'blocked').length,
    });
  });

  // Ranking
  const ranking = rankEvaluations(finalEvaluations);

  // Recommendation
  const recommendation = recommend(finalEvaluations, ranking);

  // Diagnostics: emit low-confidence warning
  if (recommendation.confidence === 'low' && recommendation.status === 'available') {
    diagnostics.push({
      code: 'EVAL_LOW_CONFIDENCE',
      message: '推荐置信度低（首选项之间分数接近或存在警告）',
    });
  }

  // Diagnostics: detect ties (multiple directions with same totalScore at top)
  if (finalEvaluations.length >= 2) {
    const top = finalEvaluations.find((e) => e.directionId === ranking.rankedDirectionIds[0]);
    if (top) {
      const ties = finalEvaluations.filter(
        (e) => !e.blocked && e.directionId !== top.directionId && e.totalScore === top.totalScore,
      );
      if (ties.length > 0) {
        diagnostics.push({
          code: 'EVAL_TIE',
          message: `Top 出现平局：${[top.directionId, ...ties.map((t) => t.directionId)].join(', ')}`,
        });
      }
    }
  }

  // Diagnostics: no valid directions
  if (finalEvaluations.filter((e) => !e.blocked).length === 0) {
    diagnostics.push({
      code: 'EVAL_NO_VALID_DIRECTIONS',
      message: '所有 Direction 都被评估为 blocked',
    });
  }

  return {
    schemaVersion: '0.1',
    projectId: input.projectId,
    evaluations: finalEvaluations,
    ranking,
    recommendation,
    diagnostics: diagnostics.map((d) => d.code + ': ' + d.message),
    provenance: {
      directionSetVersion: input.directionSet.schemaVersion,
      truthSchemaVersion: input.directionSet.provenance.truthSchemaVersion,
      generatedAt,
      mode: 'shadow',
    },
  };
}

export { EVALUATION_TRACE_VERSION };
export { buildTradeoffAnalysis };
