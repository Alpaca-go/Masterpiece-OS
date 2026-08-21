import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateQualificationReview,
} from '@masterpiece/creative-intelligence/strategic-synthesis';

const STRATEGIC_ONLY = { conceptAuthorized: false, directionAuthorized: false };

function fiveScores(values) {
  const [planningFidelity, strategicSpecificity, semanticRetention, insightQuality, traceability] = values;
  return { planningFidelity, strategicSpecificity, semanticRetention, insightQuality, traceability };
}

test('QR-01: strategic-only marks Conceptual Distinctness and Visual Discussability N/A', () => {
  const result = evaluateQualificationReview({ scope: STRATEGIC_ONLY, scores: fiveScores([3, 3, 3, 3, 3]) });
  assert.deepEqual(result.notApplicableDimensions, ['conceptualDistinctness', 'visualDiscussability']);
  assert.equal(result.applicableDimensions.length, 5);
});

test('QR-02: five applicable scores of 3 pass at average 3.0', () => {
  const result = evaluateQualificationReview({ scope: STRATEGIC_ONLY, scores: fiveScores([3, 3, 3, 3, 3]) });
  assert.equal(result.applicableAverage, 3);
  assert.equal(result.passed, true);
});

test('QR-03: applicable scores 3,2,2,2,2 fail average 2.2', () => {
  const result = evaluateQualificationReview({ scope: STRATEGIC_ONLY, scores: fiveScores([3, 2, 2, 2, 2]) });
  assert.equal(result.applicableAverage, 2.2);
  assert.equal(result.passed, false);
  assert.ok(result.failures.some((failure) => failure.includes('average below 2.4')));
});

test('QR-04: any applicable score of 1 fails the hard minimum', () => {
  const result = evaluateQualificationReview({ scope: STRATEGIC_ONLY, scores: fiveScores([3, 3, 3, 1, 3]) });
  assert.equal(result.passed, false);
  assert.ok(result.failures.some((failure) => failure.includes('insightQuality=1')));
});

test('QR-05: authorized Concept and Direction make deferred dimensions applicable', () => {
  const result = evaluateQualificationReview({
    scope: { conceptAuthorized: true, directionAuthorized: true },
    scores: {
      ...fiveScores([3, 3, 3, 3, 3]),
      conceptualDistinctness: 3,
      visualDiscussability: 3,
    },
  });
  assert.deepEqual(result.notApplicableDimensions, []);
  assert.ok(result.applicableDimensions.includes('conceptualDistinctness'));
  assert.ok(result.applicableDimensions.includes('visualDiscussability'));
  assert.equal(result.passed, true);
});
