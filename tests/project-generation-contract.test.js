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
  assert.equal(contract.provenance.compilerVersion, '1.0.0');
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

test('project generation contract derives tone boundaries only from project decisions', () => {
  const packet = phase1Packet();
  packet.creativeDecision.toneBoundaries = [];
  const contract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: packet,
    deliverable: 'packaging',
  });

  assert.deepEqual(contract.toneBoundaries, [
    { target: '专业可信赖', avoid: ['廉价装饰', '具象羽毛装饰', '旧式发光渐变'] },
    { target: '东方但不古典', avoid: ['廉价装饰', '具象羽毛装饰', '旧式发光渐变'] },
    { target: '未来但不科幻', avoid: ['廉价装饰', '具象羽毛装饰', '旧式发光渐变'] },
  ]);
  assert.equal(contract.validation.status, 'ready');
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
