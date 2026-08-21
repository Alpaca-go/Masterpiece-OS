export const QUALIFICATION_REVIEW_DIMENSIONS = [
  'planningFidelity',
  'strategicSpecificity',
  'semanticRetention',
  'insightQuality',
  'conceptualDistinctness',
  'visualDiscussability',
  'traceability',
] as const;

export type QualificationReviewDimension = typeof QUALIFICATION_REVIEW_DIMENSIONS[number];
export type QualificationReviewScore = 0 | 1 | 2 | 3;

export interface QualificationReviewScope {
  conceptAuthorized: boolean;
  directionAuthorized: boolean;
}

export interface QualificationReviewResult {
  passed: boolean;
  applicableDimensions: QualificationReviewDimension[];
  notApplicableDimensions: QualificationReviewDimension[];
  applicableAverage: number;
  failures: string[];
}

const ALWAYS_APPLICABLE: readonly QualificationReviewDimension[] = [
  'planningFidelity',
  'strategicSpecificity',
  'semanticRetention',
  'insightQuality',
  'traceability',
];

/**
 * Evaluate the frozen qualification rubric against the authorized stage
 * scope. Deferred dimensions are retained as N/A and do not enter either
 * the hard minimum or average denominator.
 */
export function evaluateQualificationReview(input: {
  scope: QualificationReviewScope;
  scores: Partial<Record<QualificationReviewDimension, QualificationReviewScore>>;
}): QualificationReviewResult {
  const applicableDimensions = [...ALWAYS_APPLICABLE];
  const notApplicableDimensions: QualificationReviewDimension[] = [];

  if (input.scope.conceptAuthorized) applicableDimensions.push('conceptualDistinctness');
  else notApplicableDimensions.push('conceptualDistinctness');

  if (input.scope.directionAuthorized) applicableDimensions.push('visualDiscussability');
  else notApplicableDimensions.push('visualDiscussability');

  const failures: string[] = [];
  const values: number[] = applicableDimensions.map((dimension) => {
    const score = input.scores[dimension];
    if (score === undefined) {
      failures.push(`missing applicable score: ${dimension}`);
      return 0;
    }
    if (score < 2) failures.push(`applicable score below 2: ${dimension}=${score}`);
    return score;
  });
  const applicableAverage = values.length === 0
    ? 0
    : values.reduce((sum, score) => sum + score, 0) / values.length;

  if (applicableAverage < 2.4) {
    failures.push(`applicable average below 2.4: ${applicableAverage.toFixed(2)}`);
  }
  for (const dimension of ['planningFidelity', 'strategicSpecificity', 'traceability'] as const) {
    const score = input.scores[dimension];
    if (score === undefined || score < 2) {
      failures.push(`required dimension below 2: ${dimension}=${score ?? 'missing'}`);
    }
  }

  return {
    passed: failures.length === 0,
    applicableDimensions,
    notApplicableDimensions,
    applicableAverage,
    failures: Array.from(new Set(failures)),
  };
}
