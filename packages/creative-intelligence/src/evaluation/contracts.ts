/**
 * Evaluation contracts.
 *
 * CI-7: Direction Evaluation, Ranking, and Recommendation.
 *
 * Evaluation is a deterministic assessment of validated Directions
 * across traceable strategic/system criteria. It is NOT user preference,
 * NOT aesthetic taste, NOT final design judgment, NOT selection.
 */

export type EvaluationDimension =
  | 'grounding'
  | 'strategic_fit'
  | 'need_coverage'
  | 'concept_fit'
  | 'direction_distinctness'
  | 'identity_safety'
  | 'asset_safety'
  | 'cross_media_coherence'
  | 'execution_readiness'
  | 'risk_load';

/** 0 = fail, 1 = weak/blocked, 2 = acceptable, 3 = strong. */
export type EvaluationScore = 0 | 1 | 2 | 3;

export interface DimensionScore {
  score: EvaluationScore;
  reason: string;
  factRefs?: string[];
  evidenceRefs?: string[];
  gateRefs?: string[];
}

export interface DirectionEvaluationItem {
  directionId: string;

  dimensions: Record<EvaluationDimension, DimensionScore>;

  totalScore: number;
  blocked: boolean;

  warnings: string[];
  strengths: string[];
  tradeoffs: string[];

  traceVersion: string;
}

export interface DirectionRanking {
  rankedDirectionIds: string[];
  rankingReason: string[];
  traceVersion: string;
}

export type RecommendationConfidence = 'high' | 'medium' | 'low';

export type RecommendationStatus =
  | 'available'
  | 'insufficient_evidence'
  | 'all_blocked';

export interface DirectionRecommendation {
  recommendedDirectionIds: string[];
  primaryDirectionId?: string;

  rationale: string[];
  tradeoffs: string[];

  confidence: RecommendationConfidence;

  status: RecommendationStatus;

  generatedBy: 'deterministic_evaluation';
  traceVersion: string;
}

export interface DirectionEvaluationSet {
  schemaVersion: '0.1';
  projectId: string;

  evaluations: DirectionEvaluationItem[];
  ranking: DirectionRanking;
  recommendation: DirectionRecommendation;
  diagnostics: string[];

  provenance: {
    directionSetVersion: string;
    truthSchemaVersion: string;
    generatedAt: string;
    mode: 'shadow';
  };
}

// --- Diagnostics ---

export type EvaluationDiagnosticCode =
  | 'EVAL_DIRECTION_MISSING'
  | 'EVAL_BLOCKED_DIRECTION'
  | 'EVAL_TRACE_INCOMPLETE'
  | 'EVAL_NO_VALID_DIRECTIONS'
  | 'EVAL_TIE'
  | 'EVAL_LOW_CONFIDENCE'
  | 'EVAL_RECOMMENDATION_EMPTY';

export interface EvaluationDiagnostic {
  code: EvaluationDiagnosticCode;
  message: string;
  directionId?: string;
}

export const EVALUATION_TRACE_VERSION = 'evaluation-v0.1';
