import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyMissingFields } from '@masterpiece/analysis-runtime/index.ts';
import { structuredAnalysisPacketFixture } from './analysis-runtime-fixtures.ts';

test('classifier maps repairable fields to current-project evidence only', () => {
  const packet = structuredAnalysisPacketFixture();
  const [issue] = classifyMissingFields({
    packet,
    deliverable: 'space',
    issues: [{
      path: 'creativeDecision.toneBoundaries',
      code: 'TONE_BOUNDARIES_MISSING',
      kind: 'missing',
      message: 'tone boundaries missing',
    }],
  });

  assert.equal(issue?.severity, 'repairable');
  assert.equal(issue?.repairStrategy, 'ai_from_evidence');
  assert.ok(issue?.requiredEvidencePaths.includes('diagnosis.brandMisreadRisks'));
  assert.deepEqual(issue?.availableEvidenceRefs, ['diagnosis:risk-1']);
});

test('classifier marks another deliverable field optional for the current task', () => {
  const [issue] = classifyMissingFields({
    packet: structuredAnalysisPacketFixture(),
    deliverable: 'space',
    issues: [{
      path: 'mediaTranslations.packaging.productAndCategoryRole',
      code: 'PACKAGING_PRODUCT_ROLE_MISSING',
      kind: 'missing',
      message: 'packaging product role missing',
    }],
  });

  assert.equal(issue?.severity, 'optional');
  assert.equal(issue?.repairStrategy, 'ignore_for_current_task');
  assert.equal(issue?.code, 'OPTIONAL_FIELD_SKIPPED_FOR_DELIVERABLE');
});

test('classifier fails closed for an unknown field policy', () => {
  const [issue] = classifyMissingFields({
    packet: structuredAnalysisPacketFixture(),
    deliverable: 'space',
    issues: [{
      path: 'unknown.contract.field',
      code: 'UNKNOWN_FIELD',
      kind: 'invalid',
      message: 'unknown field',
    }],
  });

  assert.equal(issue?.severity, 'fatal');
  assert.equal(issue?.repairStrategy, 'none');
});
