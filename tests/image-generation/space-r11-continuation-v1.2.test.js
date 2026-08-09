// R11.1 v1.2 — continuation source program leakage + functional override tests.
//
// The latest smoke proved the target program reached the Continuation Intent
// but the high-weight blocks (Architecture-Function Bridge, Functional
// Requirement, Composition/View) re-leaked the source / project program
// (CONTINUATION_SOURCE_PROGRAM_LEAKAGE). v1.2 fixes the OVERRIDE ARCHITECTURE:
//   - referenceRole=world_consistency threaded through resolver/trace
//   - applyContinuationProgramOverride replaces functional layers with target
//   - filterSourceSceneConstraintsForContinuation drops incompatible source
//     hard constraints
//   - target view strategy overrides source view
//   - source-program-leakage-gate fails closed when dropped elements resurface
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSpaceContinuationContract,
  assertSpaceContinuationContract,
  applyContinuationProgramOverride,
  filterSourceSceneConstraintsForContinuation,
  resolveContinuationReference,
  assertNoSourceProgramLeakage,
  enforceNoSourceProgramLeakage,
  viewStrategyForScene,
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

test('v1.2 reference resolver carries semanticRole world_consistency', () => {
  const { references, trace } = resolveContinuationReference({
    confirmed: {
      assetId: 'asset-1', projectId: 'proj-1', sourceRunId: 'run-1', sourceScene: 'reception',
      confirmationState: 'confirmed', confirmedAt: '2026-08-09T10:00:00.000Z', confirmationSource: 'user_explicit',
    },
    projectRelativePath: 'img.png',
    targetScene: 'consultation',
    viewStrategy: 'human_scale_consultation_view',
  });
  assert.equal(references[0].semanticRole, 'world_consistency');
  assert.equal(references[0].referenceRole, 'world_consistency');
  assert.equal(trace.referenceRole, 'world_consistency');
  assert.equal(trace.targetScene, 'consultation');
  assert.equal(trace.targetViewStrategy, 'human_scale_consultation_view');
});

test('v1.2 applyContinuationProgramOverride replaces source functional program', () => {
  const contract = baseContract('consultation');
  const override = applyContinuationProgramOverride({
    targetProgram: contract.targetFunctionalProgram,
    sourceBridge: {
      commercialPurpose: '品牌角色',
      spatialTranslation: ['源空间翻译'],
      operationConstraints: ['接待台正对入口，建立清晰入口视觉焦点和空间导向'],
      humanExperience: ['迎宾动线'],
      commercialReality: ['大堂气质'],
    },
    sourceScene: 'reception',
  });
  const bridge = override.architectureFunctionBridge;
  // Source reception hard constraint is filtered out.
  assert.ok(!bridge.operationConstraints.some((c) => /接待台正对入口/.test(c)), 'reception hard constraint dropped');
  // Target program functions appear.
  assert.ok(override.functionalRequirement.sceneProgram.some((f) => /咨询/.test(f)), 'consultation function');
  // View strategy is human_scale_consultation_view.
  assert.equal(override.composition.viewStrategy, 'human_scale_consultation_view');
});

test('v1.2 filterSourceSceneConstraintsForContinuation removes incompatible hard constraints', () => {
  const contract = baseContract('consultation');
  const filtered = filterSourceSceneConstraintsForContinuation({
    sourceConstraints: [
      '接待台正对入口，建立清晰入口视觉焦点和空间导向',
      '咨询室保持安静',
    ],
    sourceScene: 'reception',
    targetProgram: contract.targetFunctionalProgram,
  });
  assert.ok(!filtered.some((c) => /接待台正对入口/.test(c)), 'reception constraint removed');
  assert.ok(filtered.some((c) => /咨询室保持安静/.test(c)), 'target-compatible constraint kept');
});

test('v1.2 view strategy overrides source view per scene', () => {
  assert.equal(viewStrategyForScene('consultation'), 'human_scale_consultation_view');
  assert.equal(viewStrategyForScene('entrance'), 'threshold_arrival_view');
  assert.equal(viewStrategyForScene('treatment_room'), 'private_treatment_view');
  assert.equal(viewStrategyForScene('reception'), 'reception_arrival_view');
});

test('v1.2 leakage gate passes a clean continuation prompt (no source program resurfaced)', () => {
  const contract = baseContract('consultation');
  // Simulate the compiled prompt AFTER the intent block: only target content.
  const cleanPrompt = [
    '# Spatial Intent',
    'Continue the reception world into a consultation scene.',
    'Target program: 1 对 1 咨询；咨询桌；半私密边界',
    'Regenerate program, layout, privacy, scale.',
  ].join('\n');
  const result = assertNoSourceProgramLeakage({ contract, finalPrompt: cleanPrompt });
  assert.equal(result.status, 'pass', JSON.stringify(result.findings));
});

test('v1.2 leakage gate fails closed when a dropped source element resurfaces', () => {
  const contract = baseContract('consultation');
  const leakedPrompt = [
    '# Spatial Intent',
    'Architecture-Function Bridge',
    'hard must hold: 接待台正对入口，建立清晰入口视觉焦点',
    'Functional Requirement: 迎宾 / 治疗 / 术后休憩 must be legible',
  ].join('\n');
  const result = assertNoSourceProgramLeakage({ contract, finalPrompt: leakedPrompt });
  assert.equal(result.status, 'block');
  assert.ok(result.leaked.length >= 1);
  assert.throws(() => enforceNoSourceProgramLeakage({ contract, finalPrompt: leakedPrompt }), /SPACE_CONTINUATION_SOURCE_PROGRAM_LEAK/);
});

test('v1.2 leakage gate ignores the intent block drop instructions themselves', () => {
  const contract = baseContract('consultation');
  // The intent block legitimately lists the drop elements.
  const promptWithIntent = [
    '# Continuation Intent',
    'Do not carry over: 大型公共接待台；前厅式迎宾轴线',
    '',
    '# Spatial Intent',
    'Continue the reception world into a consultation scene.',
    'Target program: 1 对 1 咨询；半私密边界',
  ].join('\n');
  const result = assertNoSourceProgramLeakage({ contract, finalPrompt: promptWithIntent });
  assert.equal(result.status, 'pass', JSON.stringify(result.findings));
});

test('v1.2 continuation contract requires target functional program + boundary + world role', () => {
  const contract = baseContract('consultation');
  assertSpaceContinuationContract(contract);
  assert.throws(() => assertSpaceContinuationContract({ ...contract, targetFunctionalProgram: null }), /SPACE_CONTINUATION_TARGET_PROGRAM_REQUIRED/);
  assert.throws(() => assertSpaceContinuationContract({ ...contract, referenceRole: 'high_fidelity_visual_reference' }), /SPACE_CONTINUATION_REFERENCE_ROLE_INVALID/);
});
