export const EVALUATION_LOOP_CONTRACT_VERSION = '1.0.0';

export const EVALUATION_LOOP_CAPABILITIES = Object.freeze({
  contractVersion: EVALUATION_LOOP_CONTRACT_VERSION,
  humanEvaluation: true,
  automaticEvaluation: false,
  automaticRanking: false,
  automaticModelSelection: false,
  promptOptimization: false,
});

const DIMENSIONS = Object.freeze([
  'brandAlignment',
  'visualQuality',
  'referenceCompliance',
  'commercialUsability',
]);

function required(value, field) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw Object.assign(new Error(`${field} is required for Evaluation Loop traceability.`), {
      code: 'EVALUATION_LOOP_TRACE_INVALID',
      field,
    });
  }
  return normalized;
}

export function validateEvaluationLoopSubmission(input) {
  if (input?.evaluator?.type !== 'human') {
    throw Object.assign(new Error('Only explicit human evaluation is enabled in v1.'), {
      code: 'AUTOMATIC_EVALUATION_DISABLED',
    });
  }
  const scores = {};
  for (const dimension of DIMENSIONS) {
    const score = Number(input?.scores?.[dimension]);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw Object.assign(new Error(`${dimension} must be an integer from 1 to 5.`), {
        code: 'EVALUATION_LOOP_SCORE_INVALID',
        field: dimension,
      });
    }
    scores[dimension] = score;
  }
  return {
    schemaVersion: EVALUATION_LOOP_CONTRACT_VERSION,
    evaluator: { type: 'human' },
    trace: {
      projectId: required(input?.trace?.projectId, 'projectId'),
      benchmarkId: required(input?.trace?.benchmarkId, 'benchmarkId'),
      visualCanonId: required(input?.trace?.visualCanonId, 'visualCanonId'),
      visualCanonVersion: required(input?.trace?.visualCanonVersion, 'visualCanonVersion'),
      promptSnapshotId: required(input?.trace?.promptSnapshotId, 'promptSnapshotId'),
      generationRunId: required(input?.trace?.generationRunId, 'generationRunId'),
      imageId: required(input?.trace?.imageId, 'imageId'),
    },
    scores,
    notes: String(input?.notes ?? '').trim(),
    evaluatedAt: required(input?.evaluatedAt, 'evaluatedAt'),
  };
}
