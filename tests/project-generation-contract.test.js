import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileProjectSpecificGenerationContract,
  validateProjectSpecificGenerationContract,
} from '../packages/creative-production-runtime/src/project-generation-contract.js';
import { phase1Packet } from './phase1-fixtures.js';

test('project generation contract compiles grounded identity, upgrade and provenance', () => {
  const contract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: phase1Packet(),
    deliverable: 'packaging',
  });
  assert.equal(contract.validation.status, 'ready');
  assert.equal(contract.projectIdentity.brandRole, '高端医美全链生态平台');
  assert.equal(contract.provenance.compilerVersion, '1.3.0');
  assert.ok(contract.mustTransform[0].targetExpression.includes('半透明套封'));
});

test('project generation contract blocks a missing brand role', () => {
  const packet = phase1Packet();
  packet.projectFacts.brandRole.value = 'unknown';
  const contract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: packet,
    deliverable: 'packaging',
  });
  assert.equal(contract.validation.status, 'insufficient');
  assert.ok(contract.validation.missingRequiredFields.includes('projectIdentity.brandRole'));
});

test('project generation contract blocks a missing upgrade thesis', () => {
  const packet = phase1Packet();
  packet.creativeDecision.uniqueUpgradeThesis = '';
  const contract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: packet,
    deliverable: 'packaging',
  });
  assert.equal(contract.validation.status, 'insufficient');
  assert.ok(contract.validation.missingRequiredFields.includes('upgradeThesis'));
});

test('project generation contract does not invent tone boundaries from generic worldview fields', () => {
  // When explicit `toneBoundaries` are cleared, the compiler must not
  // invent a fallback from generic worldview fields such as
  // `targetWorldview` or from the synthesised approved decision. The
  // synthesiser intentionally leaves `visual_direction.recommended`
  // empty so the `toneBoundaries` fallback chain in
  // `compileProjectSpecificGenerationContract` returns an empty list,
  // matching the original contract behaviour and keeping the
  // "insufficient" validation signal intact.
  const packet = phase1Packet();
  packet.creativeDecision.toneBoundaries = [];
  const contract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: packet,
    deliverable: 'packaging',
  });

  assert.deepEqual(contract.toneBoundaries, []);
  assert.equal(contract.validation.status, 'insufficient');
});

test('project generation contract reports project conflicts', () => {
  const packet = phase1Packet();
  packet.validation.conflicts = ['locked color conflicts with confirmed removal'];
  const contract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: packet,
    deliverable: 'packaging',
  });
  assert.equal(contract.validation.status, 'conflicted');
});

test('contract validation never fills missing fields with industry defaults', () => {
  const contract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: phase1Packet(),
    deliverable: 'packaging',
  });
  contract.toneBoundaries = [];
  assert.equal(validateProjectSpecificGenerationContract(contract).status, 'insufficient');
});

// Regression: the v18 desktop pipeline used to block every vNext compile
// call with `PROJECT_SPECIFICITY_TOO_LOW` whenever the project had not
// gone through the separate `creative_decision.json` step. That step
// has no production path in the current surface (the reference-first
// pipeline is pure functions, the `creative-direction-service` is never
// exposed over IPC, and `user-confirmed-visual-decision.json` has no
// writer anywhere in the repository). The contract compiler now
// synthesises a minimum-viable approved decision from the
// `visualDecisionPacket` itself so the preflight gate's
// `specificity.status === 'ready'` requirement can be met without a
// separate artifact, while still forwarding a real
// `approvedCreativeDecision` untouched when one is supplied.
test('contract synthesises a project-specific decision from the packet when none is supplied', () => {
  const contract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: phase1Packet(),
    deliverable: 'packaging',
  });
  assert.equal(
    contract.projectSpecificDecisions.specificity.status,
    'ready',
    'projectSpecificDecisions.specificity.status must be ready when the packet alone has enough structured content',
  );
  assert.ok(contract.projectSpecificDecisions.specificity.populatedCategories >= 4);
  assert.match(contract.projectSpecificDecisions.decisionId, /^packet-derived:/u);
});

test('contract forwards a real approvedCreativeDecision unchanged', () => {
  const supplied = {
    direction_id: 'real-decision-1',
    direction_version: '2.0.0',
    visual_direction: {
      recommended: 'curated direction',
      rationale: 'user-confirmed via reference-first closure',
    },
    color_system: ['brand navy'],
    material_system: ['matte brass'],
    composition_rule: ['one axis of restraint'],
    generation_goal: ['hold restraint'],
    avoid_assets: ['ornamental clutter'],
  };
  const contract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: phase1Packet(),
    approvedCreativeDecision: supplied,
    deliverable: 'packaging',
  });
  assert.equal(contract.projectSpecificDecisions.decisionId, 'real-decision-1');
  assert.equal(contract.projectSpecificDecisions.decisionVersion, '2.0.0');
  assert.equal(
    contract.projectSpecificDecisions.recommendedDirection,
    'curated direction',
  );
});
