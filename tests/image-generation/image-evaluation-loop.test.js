import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  compileEvaluationPromptAdjustment,
  compileImageEvaluation,
} from '../../packages/image-generation-runtime/src/evaluation.js';

test('image evaluation compiles four decision dimensions into deterministic prompt adjustments', () => {
  const evaluation = compileImageEvaluation({
    brandAlignment: { score: 2, notes: 'Restore the approved brand color hierarchy.' },
    visualConsistency: { score: 3, notes: 'Use the Canon lighting and material rules.' },
    assetUsability: { score: 4, notes: 'The composition remains usable.' },
    deviationDetection: {
      severity: 'major',
      findings: ['The primary logo has been replaced.', 'The background is outside the Canon palette.'],
    },
    visualCanonId: 'canon-1',
    visualCanonVersion: '2.0.0',
  });

  assert.equal(evaluation.overallScore, 3);
  assert.equal(evaluation.deviationDetection.severity, 'major');
  assert.deepEqual(evaluation.evaluatedAgainst, {
    visualCanonId: 'canon-1',
    visualCanonVersion: '2.0.0',
  });
  assert.equal(evaluation.promptAdjustments.length, 4);
  const adjustment = compileEvaluationPromptAdjustment(evaluation);
  assert.match(adjustment, /Restore the approved brand color hierarchy/);
  assert.match(adjustment, /primary logo has been replaced/);
  assert.match(adjustment, /Visual Canon/);
});

test('image evaluation rejects incomplete deviations and out-of-range scores', () => {
  const base = {
    brandAlignment: { score: 4, notes: 'Aligned.' },
    visualConsistency: { score: 4, notes: 'Consistent.' },
    assetUsability: { score: 4, notes: 'Usable.' },
    visualCanonId: 'canon-1',
    visualCanonVersion: '1.0.0',
  };
  assert.throws(
    () => compileImageEvaluation({
      ...base,
      deviationDetection: { severity: 'minor', findings: [] },
    }),
    (error) => error.code === 'IMAGE_EVALUATION_INVALID',
  );
  assert.throws(
    () => compileImageEvaluation({
      ...base,
      brandAlignment: { score: 6, notes: 'Invalid.' },
      deviationDetection: { severity: 'none', findings: [] },
    }),
    (error) => error.code === 'IMAGE_EVALUATION_INVALID',
  );
});

test('image review schema persists evaluation dimensions and Canon traceability', () => {
  const schema = JSON.parse(fs.readFileSync(
    path.resolve('schemas/image-generation/image-generation-review.schema.json'),
    'utf8',
  ));
  assert.ok(schema.properties.evaluation);
  const evaluation = schema.properties.evaluation;
  assert.equal(evaluation.additionalProperties, false);
  assert.deepEqual(
    evaluation.required,
    [
      'schemaVersion',
      'brandAlignment',
      'visualConsistency',
      'assetUsability',
      'deviationDetection',
      'overallScore',
      'promptAdjustments',
      'evaluatedAgainst',
    ],
  );
});
