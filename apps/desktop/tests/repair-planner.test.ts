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

// Regression: `mediaTranslations.spatial.functionalRelationships` previously
// only referenced sibling fields (`functionalNetwork`, `sceneProgram`) which
// are themselves new creative output and never carry `evidenceRefs`. That made
// the resulting AI batch unsatisfiable (`REPAIR_EVIDENCE_UNAVAILABLE`) for
// every `deliverable: 'space'` run, so the orchestrator fast-failed without
// ever calling the model. The policy now anchors on the upstream
// `projectFacts.brandRole`, which always carries evidence refs by the time a
// project reaches the decision-refinement stage.
test('repair planner attaches current-project evidence to the spatial functional-relationships batch', () => {
  const packet = structuredAnalysisPacketFixture();
  // Force the missing-field issue into the active plan.
  packet.mediaTranslations.spatial.functionalRelationships = [];
  const sufficiency = evaluateDeliverableSufficiency({
    packet,
    deliverable: 'space',
    execution,
  });
  const issues = sufficiency.issues.filter(
    (issue) => issue.path === 'mediaTranslations.spatial.functionalRelationships',
  );
  assert.equal(issues.length, 1);

  const plan = createRepairPlan({
    deliverable: 'space',
    attempt: 1,
    issues,
  });
  assert.equal(plan.aiBatches.length, 1);
  const batch = plan.aiBatches[0];
  assert.deepEqual(batch?.fieldPaths, [
    'mediaTranslations.spatial.functionalRelationships',
  ]);
  // The batch must expose at least one current-project evidence ref so the
  // structured-repair runner will actually invoke the model. If this
  // assertion ever fires again, it means a policy was added or changed that
  // only references paths without `evidenceRefs`, which re-introduces the
  // 2026-07-31 fast-fail regression.
  assert.ok(
    (batch?.evidenceRefs?.length ?? 0) > 0,
    'functional-relationships AI batch must carry at least one evidence ref',
  );
  // And those refs must trace back to a current-project fact (brandRole),
  // not to the sibling `sceneProgram` (which only stores string values).
  assert.ok(
    (batch?.evidenceRefs ?? []).some((ref) => ref === 'document:brand-role'),
    'expected the brand-role evidence ref to anchor the batch',
  );
});
