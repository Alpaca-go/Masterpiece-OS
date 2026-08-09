// R11.1 v1.1 Continuation Contract.
//
// A continuation task binds ONE confirmed generated output as the source
// reference (referenceRole = world_consistency) and targets a NEW scene in the
// SAME project world, using the same frozen r8_6_golden Space Compiler
// (reference_assisted). The target scene compiles into a Target Functional
// Program that OVERRIDES the source program. Pure / deterministic / offline.
//
// generationBasis = 'continuation' is a product-level basis, NOT a new
// compiler. It is the same compiler with a different reference input.

import {
  resolveTargetFunctionalProgram,
  TARGET_FUNCTIONAL_PROGRAM_VERSION,
} from './target-functional-programs.js';
import {
  CONTINUATION_PRESERVE,
  CONTINUATION_REGENERATE,
  CONTINUATION_REFERENCE_ROLE,
} from './build-continuation-context.js';

export const CONTINUATION_CONTRACT_VERSION = 'space-continuation-contract@1.1.0';

// Scene taxonomy reused from the space runtime (R11 §18).
export const CONTINUATION_SCENES = Object.freeze([
  'entrance',
  'lobby',
  'reception',
  'consultation',
  'treatment_room',
  'private_room',
  'display',
  'retail',
  'dining',
  'custom',
]);

const KNOWN_SCENES = new Set(CONTINUATION_SCENES);

/**
 * Create a validated continuation contract from user intent.
 *
 * @param {object} input
 * @param {string} input.projectId
 * @param {string} input.confirmedSourceAssetId
 * @param {string} input.sourceRunId
 * @param {string} input.sourceScene
 * @param {string} input.targetScene
 * @param {string} [input.targetSceneLabel]
 * @param {string} [input.userRequirement]
 * @param {string} [input.confirmedAt]
 * @param {string} [input.customSceneDescription] required when targetScene==='custom'
 * @returns {object} normalized continuation contract
 */
export function createSpaceContinuationContract(input = {}) {
  const {
    projectId,
    confirmedSourceAssetId,
    sourceRunId,
    sourceScene,
    targetScene,
    targetSceneLabel,
    userRequirement,
    confirmedAt,
    customSceneDescription,
  } = input;

  if (!projectId) throw err('SPACE_CONTINUATION_PROJECT_REQUIRED', 'projectId is required');
  if (!confirmedSourceAssetId) throw err('SPACE_CONTINUATION_SOURCE_INVALID', 'confirmedSourceAssetId is required');
  if (!sourceRunId) throw err('SPACE_CONTINUATION_SOURCE_INVALID', 'sourceRunId is required');
  if (!sourceScene || !String(sourceScene).trim()) throw err('SPACE_CONTINUATION_SOURCE_INVALID', 'sourceScene is required');
  const target = String(targetScene ?? '').trim().toLowerCase();
  if (!target) throw err('SPACE_CONTINUATION_TARGET_SCENE_EMPTY', 'target scene is required');
  if (target === String(sourceScene).trim().toLowerCase()) {
    throw err('SPACE_CONTINUATION_SAME_SCENE_NOT_SUPPORTED', 'target scene must differ from source scene');
  }
  // R11.1 v1.1: compile the target functional program (overrides source).
  const targetFunctionalProgram = resolveTargetFunctionalProgram(target, customSceneDescription);

  return {
    schemaVersion: '1.0',
    version: CONTINUATION_CONTRACT_VERSION,
    mode: 'continuation',
    projectId,
    sourceReferenceAssetIds: [confirmedSourceAssetId],
    confirmedSourceAssetId,
    sourceRunId,
    sourceScene: String(sourceScene).trim(),
    targetScene: target,
    ...(targetSceneLabel ? { targetSceneLabel } : {}),
    ...(userRequirement ? { userRequirement: String(userRequirement).trim() } : {}),
    ...(customSceneDescription ? { customSceneDescription: String(customSceneDescription).trim() } : {}),
    generationBasis: 'continuation',
    referenceMode: 'reference_assisted',
    // R11.1 §4-§5: continuation references preserve the WORLD, not the layout.
    referenceRole: CONTINUATION_REFERENCE_ROLE,
    referenceSource: 'confirmed_generated_output',
    referenceCount: 1,
    // R11.1 §7: the target functional program IR (override).
    targetFunctionalProgram,
    // R11.1 §12: preserve / regenerate boundary.
    continuationBoundary: {
      preserve: [...CONTINUATION_PRESERVE],
      regenerate: [...CONTINUATION_REGENERATE],
    },
    targetFunctionalProgramVersion: TARGET_FUNCTIONAL_PROGRAM_VERSION,
    // R11 §7: confirmationSource is always user_explicit (auto-confirmation is
    // forbidden); the confirmed output itself carries it, and the contract
    // mirrors it for trace.
    confirmationSource: 'user_explicit',
    confirmedAt: confirmedAt || new Date().toISOString(),
  };
}

/**
 * Validate an existing contract object (used by the runtime before compile).
 * Returns the contract when valid; throws SPACE_* codes otherwise.
 */
export function assertSpaceContinuationContract(contract = {}) {
  if (contract.mode !== 'continuation') {
    throw err('SPACE_CONTINUATION_CONTRACT_INVALID', 'contract mode must be continuation');
  }
  if (contract.generationBasis !== 'continuation') {
    throw err('SPACE_CONTINUATION_CONTRACT_INVALID', 'generationBasis must be continuation');
  }
  if (contract.referenceMode !== 'reference_assisted') {
    throw err('SPACE_CONTINUATION_CONTRACT_INVALID', 'referenceMode must be reference_assisted');
  }
  if (contract.referenceSource !== 'confirmed_generated_output') {
    throw err('SPACE_CONTINUATION_REFERENCE_SOURCE_INVALID', 'referenceSource must be confirmed_generated_output');
  }
  // R11.1 §4-§5/§33: continuation references must be world_consistency.
  if (contract.referenceRole !== CONTINUATION_REFERENCE_ROLE) {
    throw err('SPACE_CONTINUATION_REFERENCE_ROLE_INVALID',
      `continuation referenceRole must be ${CONTINUATION_REFERENCE_ROLE} (got ${contract.referenceRole})`);
  }
  // R11.1 §7/§33: a continuation MUST carry a target functional program.
  if (!contract.targetFunctionalProgram || !contract.targetFunctionalProgram.sceneId) {
    throw err('SPACE_CONTINUATION_TARGET_PROGRAM_REQUIRED', 'targetFunctionalProgram is required for continuation');
  }
  // R11.1 §12/§33: preserve/regenerate boundary must be present.
  if (!contract.continuationBoundary
    || !Array.isArray(contract.continuationBoundary.preserve)
    || !Array.isArray(contract.continuationBoundary.regenerate)) {
    throw err('SPACE_CONTINUATION_BOUNDARY_REQUIRED', 'continuationBoundary preserve/regenerate is required');
  }
  if (contract.referenceCount !== 1 || (contract.sourceReferenceAssetIds?.length ?? 0) !== 1) {
    throw err('SPACE_CONTINUATION_REFERENCE_REQUIRED', 'continuation requires exactly one confirmed source reference');
  }
  if (!contract.confirmedSourceAssetId || !contract.sourceRunId || !contract.sourceScene || !contract.targetScene) {
    throw err('SPACE_CONTINUATION_CONTRACT_INVALID', 'confirmedSourceAssetId/sourceRunId/sourceScene/targetScene are required');
  }
  if (contract.targetScene === String(contract.sourceScene).trim().toLowerCase()) {
    throw err('SPACE_CONTINUATION_SAME_SCENE_NOT_SUPPORTED', 'target scene must differ from source scene');
  }
  if (contract.targetScene === 'custom' && !String(contract.customSceneDescription ?? '').trim()) {
    throw err('SPACE_CONTINUATION_CUSTOM_SCENE_DESCRIPTION_REQUIRED', 'custom scene requires a description');
  }
  return contract;
}

export function isKnownContinuationScene(scene) {
  return KNOWN_SCENES.has(String(scene ?? '').toLowerCase());
}

function err(code, message) {
  return Object.assign(new Error(`${code}: ${message}`), { code });
}
