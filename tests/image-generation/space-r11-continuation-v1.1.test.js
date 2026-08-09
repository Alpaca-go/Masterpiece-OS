// R11.1 v1.1 — continuation scene override, target program, boundary tests.
//
// After the first continuation smoke (world kept too strongly, scene changed
// too little), v1.1 adds:
//   - referenceRole = world_consistency (never layout/composition preservation)
//   - a Target Functional Program per scene that OVERRIDES the source program
//   - a Preserve / Regenerate boundary
//   - source program elements to drop (never via negative prompts)
//   - a Scene Differentiation / Copy Risk offline gate
//
// Cases (R11.1 §36):
//   PASS: Reception -> Consultation target program overrides Reception
//   FAIL: continuation without targetFunctionalProgram
//   FAIL: referenceRole = high_fidelity_visual_reference for continuation
//   PASS: source architecture grammar preserved, source layout not preserved
//   PASS: Dining -> Entrance drops dining program, entrance program active
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSpaceContinuationContract,
  assertSpaceContinuationContract,
  resolveTargetFunctionalProgram,
  buildContinuationContext,
  renderContinuationIntentBlock,
  isForbiddenContinuationReferenceRole,
  evaluateContinuationSceneGate,
  CONTINUATION_REFERENCE_ROLE,
  TARGET_FUNCTIONAL_PROGRAMS,
} from '@masterpiece/image-generation-runtime/space/index.js';

function baseContract(targetScene = 'consultation') {
  return createSpaceContinuationContract({
    projectId: 'proj-1',
    confirmedSourceAssetId: 'asset-1',
    sourceRunId: 'run-1',
    sourceScene: 'reception',
    targetScene,
    userRequirement: '更强调咨询私密性',
    confirmedAt: '2026-08-09T10:00:00.000Z',
  });
}

test('v1.1 referenceRole is world_consistency (not layout/composition)', () => {
  assert.equal(CONTINUATION_REFERENCE_ROLE, 'world_consistency');
  const contract = baseContract('consultation');
  assert.equal(contract.referenceRole, 'world_consistency');
  assert.ok(isForbiddenContinuationReferenceRole('composition_preservation'));
  assert.ok(isForbiddenContinuationReferenceRole('high_fidelity_visual_reference'));
  assert.ok(!isForbiddenContinuationReferenceRole('world_consistency'));
});

test('v1.1 target functional program overrides the source (reception -> consultation)', () => {
  const contract = baseContract('consultation');
  const program = contract.targetFunctionalProgram;
  assert.equal(program.sceneId, 'consultation');
  assert.ok(program.requiredFunctions.some((f) => /咨询/.test(f)), 'consultation function');
  assert.ok(program.requiredSpatialElements.some((e) => /咨询桌|低桌/.test(e)), 'consultation elements');
  assert.ok(program.privacyRequirements.some((p) => /私密/.test(p)), 'privacy');
  assert.ok(program.sourceProgramElementsToDrop.some((d) => /接待台|Lobby|大厅/.test(d)), 'drops source reception/lobby');
  // The target program is compiled, so a continuation contract must carry it.
  assert.ok(contract.targetFunctionalProgram.sceneId, 'target program present');
  assertSpaceContinuationContract(contract);
});

test('v1.1 FAIL: continuation without targetFunctionalProgram is rejected', () => {
  const contract = baseContract('consultation');
  const broken = { ...contract, targetFunctionalProgram: null, continuationBoundary: null };
  assert.throws(() => assertSpaceContinuationContract(broken), /SPACE_CONTINUATION_TARGET_PROGRAM_REQUIRED/);
});

test('v1.1 FAIL: referenceRole must be world_consistency', () => {
  const contract = baseContract('consultation');
  const broken = { ...contract, referenceRole: 'high_fidelity_visual_reference' };
  assert.throws(() => assertSpaceContinuationContract(broken), /SPACE_CONTINUATION_REFERENCE_ROLE_INVALID/);
});

test('v1.1 PASS: dining -> entrance drops dining program, entrance active', () => {
  const contract = createSpaceContinuationContract({
    projectId: 'proj-1',
    confirmedSourceAssetId: 'asset-ftt',
    sourceRunId: 'run-ftt',
    sourceScene: 'dining',
    targetScene: 'entrance',
    confirmedAt: '2026-08-09T10:00:00.000Z',
  });
  assert.equal(contract.targetScene, 'entrance');
  assert.equal(contract.targetFunctionalProgram.sceneId, 'entrance');
  const drop = contract.targetFunctionalProgram.sourceProgramElementsToDrop;
  assert.ok(drop.some((d) => /开放厨房|堂食|餐桌|出餐/.test(d)), 'drops dining program');
  const req = contract.targetFunctionalProgram.requiredSpatialElements;
  assert.ok(req.some((e) => /storefront|threshold|到达|迎宾/.test(e)), 'entrance elements active');
});

test('v1.1 scene program registry covers the first-batch scenes', () => {
  for (const id of ['entrance', 'lobby', 'reception', 'consultation', 'treatment_room', 'private_room', 'display', 'retail', 'dining']) {
    assert.ok(TARGET_FUNCTIONAL_PROGRAMS[id], `program for ${id}`);
    assert.ok(TARGET_FUNCTIONAL_PROGRAMS[id].requiredFunctions.length > 0, `${id} functions`);
    assert.ok(Array.isArray(TARGET_FUNCTIONAL_PROGRAMS[id].sourceProgramElementsToDrop), `${id} drop rules`);
  }
});

test('v1.1 continuation intent carries target program + drop, never via negative prompt', () => {
  const contract = baseContract('consultation');
  const block = renderContinuationIntentBlock(contract);
  assert.ok(block, 'block');
  assert.ok(/REGENERATE/iu.test(block), 'regenerate directive');
  assert.ok(/Do not carry over/.test(block), 'source drop directive');
  assert.ok(/咨询/.test(block), 'target program in block');
  // No negative-prompt-style bans (no "no reception desk").
  assert.doesNotMatch(block, /\bno\s+(reception desk|kitchen|lobby)\b/iu, 'no negative-prompt bans');
});

test('v1.1 scene differentiation / copy risk gate scores a regeneration-directed contract high', () => {
  const contract = baseContract('consultation');
  const ctx = buildContinuationContext(contract);
  const block = renderContinuationIntentBlock(contract);
  const gate = evaluateContinuationSceneGate({ contract, compiledPromptText: block });
  assert.ok(gate.sceneDifferentiation >= 4, `differentiation ${gate.sceneDifferentiation} >= 4`);
  assert.ok(gate.copyRisk <= 2, `copy risk ${gate.copyRisk} <= 2`);
  assert.equal(gate.gatePass, true);
});
