import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EVALUATION_LOOP_CAPABILITIES,
  validateEvaluationLoopSubmission,
} from '../packages/evaluation-loop-contracts/src/index.js';

const submission = {
  evaluator: { type: 'human' },
  trace: {
    projectId: 'project-1',
    benchmarkId: 'benchmark-1',
    visualCanonId: 'canon-1',
    visualCanonVersion: '1.0.0',
    promptSnapshotId: 'prompt-1',
    generationRunId: 'run-1',
    imageId: 'image-1',
  },
  scores: {
    brandAlignment: 5,
    visualQuality: 4,
    referenceCompliance: 5,
    commercialUsability: 4,
  },
  notes: 'Human decision',
  evaluatedAt: '2026-07-29T00:00:00.000Z',
};

test('Evaluation Loop v1 reserves traceable human submissions only', () => {
  const normalized = validateEvaluationLoopSubmission(submission);
  assert.equal(normalized.evaluator.type, 'human');
  assert.equal(normalized.trace.promptSnapshotId, 'prompt-1');
  assert.equal(EVALUATION_LOOP_CAPABILITIES.humanEvaluation, true);
  assert.equal(EVALUATION_LOOP_CAPABILITIES.automaticEvaluation, false);
  assert.equal(EVALUATION_LOOP_CAPABILITIES.automaticRanking, false);
  assert.equal(EVALUATION_LOOP_CAPABILITIES.automaticModelSelection, false);
  assert.equal(EVALUATION_LOOP_CAPABILITIES.promptOptimization, false);
});

test('Evaluation Loop v1 rejects AI evaluators and incomplete traceability', () => {
  assert.throws(
    () => validateEvaluationLoopSubmission({
      ...submission,
      evaluator: { type: 'ai' },
    }),
    (error) => error.code === 'AUTOMATIC_EVALUATION_DISABLED',
  );
  assert.throws(
    () => validateEvaluationLoopSubmission({
      ...submission,
      trace: { ...submission.trace, visualCanonId: '' },
    }),
    (error) => error.code === 'EVALUATION_LOOP_TRACE_INVALID',
  );
});
