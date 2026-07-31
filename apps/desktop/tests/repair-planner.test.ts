import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRepairPlan,
  evaluateDeliverableSufficiency,
  MAX_REPAIR_ATTEMPTS,
} from '../../../packages/analysis-runtime/src/index.ts';
import { structuredAnalysisPacketFixture } from './analysis-runtime-fixtures.ts';

const execution = {
  camera: { focalLength: '24-28mm' },
  outputLanguage: 'zh-CN',
  aspectRatio: '16:9',
};

test('repair planner combines AI fields that share current-project evidence', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.creativeDecision.toneBoundaries = [];
  packet.diagnosis.brandMisreadRisks = [];
  packet.mediaTranslations.spatial.positiveDifferentiators = [];
  const sufficiency = evaluateDeliverableSufficiency({
    packet,
    deliverable: 'space',
    execution,
  });

  const plan = createRepairPlan({
    deliverable: 'space',
    attempt: 1,
    issues: sufficiency.issues,
  });

  assert.equal(plan.aiBatches.length, 1);
  assert.deepEqual(
    plan.aiBatches[0]?.fieldPaths.sort(),
    [
      'creativeDecision.toneBoundaries',
      'diagnosis.brandMisreadRisks',
      'mediaTranslations.spatial.positiveDifferentiators',
    ],
  );
  assert.deepEqual(plan.requiresConfirmation, []);
});

test('repair planner isolates packaging facts from AI repair', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.packaging.productAndCategoryRole = [];
  packet.mediaTranslations.packaging.structureStrategy = [];
  const sufficiency = evaluateDeliverableSufficiency({
    packet,
    deliverable: 'packaging',
    execution: { outputLanguage: 'zh-CN', aspectRatio: '3:4' },
  });

  const plan = createRepairPlan({
    deliverable: 'packaging',
    attempt: 1,
    issues: sufficiency.issues,
  });

  assert.equal(plan.aiBatches.length, 0);
  assert.deepEqual(
    plan.requiresConfirmation.map((issue) => issue.code).sort(),
    ['PACKAGING_PRODUCT_ROLE_MISSING', 'PACKAGING_STRUCTURE_EVIDENCE_MISSING'],
  );
});

test('repair planner enforces the two-attempt limit', () => {
  assert.throws(
    () => createRepairPlan({
      deliverable: 'space',
      attempt: MAX_REPAIR_ATTEMPTS + 1,
      issues: [],
    }),
    (error: Error & { code?: string }) => error.code === 'REPAIR_ATTEMPTS_EXHAUSTED',
  );
});
