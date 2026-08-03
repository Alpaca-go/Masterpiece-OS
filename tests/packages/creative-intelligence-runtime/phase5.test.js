import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileCreativeDecisionProductionBridge,
  lockedAssetOverridesFromProductionBridge
} from '@masterpiece/creative-intelligence-runtime';
import { compileStyleProfile } from '@masterpiece/creative-production-runtime/style-profile.js';
import { compileProjectSpecificGenerationContract } from '@masterpiece/creative-production-runtime/project-generation-contract.js';

const decision = {
  schemaVersion: '2.0', projectId: 'phase5-project', decisionId: 'CD2-phase5', version: '2.0.0',
  strategicDirection: { proposition: 'Turn daily service into a visible welcoming sequence.', rationale: 'Selected by the designer.', brandRole: 'Neighborhood service brand' },
  brandPerceptionGoal: ['Warm, direct, and dependable'],
  coreVisualMechanism: {
    concept: 'The welcoming threshold', sourceMechanisms: ['service_process: arrival to participation'],
    languageNail: 'Come right in.', visualHammer: 'One expanding threshold frame.',
    generationLogic: 'Generate an expanding frame from each step of the service journey.',
    validationStatus: 'direction_confirmed_anchor_pending'
  },
  visualPriorities: [
    'composition: One clear threshold with an asymmetric reading path.',
    'color: Use the confirmed accent only as an orientation signal.',
    'typography: Direct headline with compact service annotations.',
    'image_material: Honest surfaces with close, warm directional light.'
  ],
  lockedAssetDecisions: [{ assetId: 'OP-logo', decision: 'locked', rationale: 'Preserve the confirmed wordmark geometry.', evidenceRefs: ['EV-logo'] }],
  allowedVariations: ['Scale may adapt by touchpoint.'],
  prohibitedExpressions: ['Do not use generic ornamental luxury cues.'],
  touchpointPriorities: ['Packaging', 'Space'], knownRisks: ['May become too editorial.'],
  decisionSource: { mode: 'guided_direction', selectedDirectionId: 'D01', userDecisionRef: 'user-direction-decision.json', traceAvailability: 'complete' },
  decisionStatus: 'confirmed', evidenceRefs: ['EV-logo'], generatedAt: '2026-08-03T10:00:00.000Z'
};

const userDecision = {
  status: 'confirmed', selectedDirectionId: 'D01', confirmedAt: '2026-08-03T10:00:00.000Z',
  acceptedElements: ['Keep the expanding frame.'], rejectedElements: ['Avoid dense borders.'],
  mergedElements: [{ fromDirectionId: 'D02', elementType: 'imageMaterialLogic', content: 'Use tactile paper.' }]
};

test('Phase 5 bridge projects one confirmed decision into provisional style, two-stage locks, and Anchor inheritance', () => {
  const bridge = compileCreativeDecisionProductionBridge({
    creativeDecision: decision,
    userDecision,
    evidenceLedger: { evidence: [{ id: 'EV-logo', status: 'confirmed' }] },
    generatedAt: '2026-08-03T10:01:00.000Z'
  });
  assert.equal(bridge.targetStyleProfile.status, 'provisional');
  assert.equal(bridge.targetStyleProfile.anchorValidationStatus, 'pending');
  assert.equal(bridge.lockedAssets.candidates[0].stage, 'candidate');
  assert.equal(bridge.lockedAssets.confirmed[0].stage, 'confirmed');
  assert.ok(bridge.anchorBriefInheritance.acceptedMechanisms.includes('Keep the expanding frame.'));
  assert.ok(bridge.anchorBriefInheritance.rejectedMechanisms.includes('Avoid dense borders.'));
  assert.equal(bridge.runtime.directionRegenerationRequired, false);
  assert.equal(lockedAssetOverridesFromProductionBridge(bridge).length, 1);
});

test('Creative Decision V2 compiles through the existing Style Profile and project generation contract', () => {
  const style = compileStyleProfile({ creativeDecision: decision, version: '1.0.0' }, '2026-08-03T10:02:00.000Z');
  assert.equal(style.status, 'draft');
  assert.deepEqual(style.colorSystem.distributionRules, ['Use the confirmed accent only as an orientation signal.']);
  assert.deepEqual(style.typographyCompatibility, ['Direct headline with compact service annotations.']);
  assert.ok(style.forbiddenVariations.includes('Do not use generic ornamental luxury cues.'));

  const contract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: {
      projectId: 'phase5-project',
      projectFacts: { brandName: 'Example', industry: 'Service', brandRole: 'Neighborhood service brand' },
      creativeDecision: { upgradeFrom: ['remote'], upgradeTo: ['welcoming'], uniqueUpgradeThesis: 'Become more welcoming', preserveCore: ['wordmark'], toneBoundaries: [] },
      mediaTranslations: { sharedBrandCore: ['clear service sequence'] },
      provenance: { createdFrom: ['EV-logo'] }, validation: { conflicts: [] }
    },
    approvedCreativeDecision: decision,
    deliverable: 'poster'
  });
  assert.equal(contract.projectSpecificDecisions.decisionId, 'CD2-phase5');
  assert.equal(contract.projectSpecificDecisions.specificity.status, 'ready');
  assert.deepEqual(contract.sharedVisualRules.compositionBehavior, ['One clear threshold with an asymmetric reading path.']);
  assert.ok(contract.projectSpecificDecisions.prohibitedExpressions.includes('Do not use generic ornamental luxury cues.'));
});
