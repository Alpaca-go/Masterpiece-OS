// R11.1 v1.1 Continuation Context (ephemeral IR).
//
// Like spatialMechanisms, the continuation context is a compile-time /
// runtime ephemeral IR — it is NOT a new V5 analysis field or a project
// source of truth. It feeds the "Continuation Intent" block placed right after
// the Task block, expressing:
//   source scene, target scene, reference role (world_consistency),
//   preserve grammar, regenerate program, target functional program,
//   source program elements to drop.
//
// v1.1 revision (after the first continuation smoke): the confirmed generated
// image is a WORLD-CONSISTENCY reference, NOT a layout/composition reference.
// The target scene compiles into a Target Functional Program that OVERRIDES
// the source program (R11.1 §4-§9, §22). It never re-runs V5 analysis.

export const CONTINUATION_CONTEXT_VERSION = 'space-continuation-context@1.1.0';

// Same spatial world, new functional space (R11.1 §3).
export const CONTINUATION_PRESERVE = Object.freeze([
  'brand world',
  'architecture language',
  'material palette',
  'lighting temperament',
  'boundary language',
  'spatial rhythm',
  'color roles',
  'visual DNA',
]);

export const CONTINUATION_REGENERATE = Object.freeze([
  'functional program',
  'floor plan',
  'furniture layout',
  'circulation',
  'privacy level',
  'equipment',
  'room scale',
  'composition',
  'camera relationship',
  'operational objects',
]);

// R11.1 §4-§5: continuation references are world_consistency only. They must
// never be read as composition / layout / scene / furniture preservation.
export const CONTINUATION_REFERENCE_ROLE = 'world_consistency';

const FORBIDDEN_REFERENCE_ROLES = new Set([
  'composition_preservation',
  'layout_preservation',
  'scene_preservation',
  'exact_furniture_preservation',
  'exact_ceiling_preservation',
  'exact_reception_desk_preservation',
  'high_fidelity_visual_reference',
]);

/**
 * Build the ephemeral continuation context from a validated contract.
 * @returns {object} { continuation: { ... } }
 */
export function buildContinuationContext(contract = {}) {
  const targetProgram = contract.targetFunctionalProgram ?? {};
  return {
    continuation: {
      sourceAssetId: contract.confirmedSourceAssetId ?? null,
      sourceRunId: contract.sourceRunId ?? null,
      sourceScene: contract.sourceScene ?? '',
      targetScene: contract.targetScene ?? '',
      referenceRole: CONTINUATION_REFERENCE_ROLE,
      referenceSource: 'confirmed_generated_output',
      preserve: [...CONTINUATION_PRESERVE],
      regenerate: [...CONTINUATION_REGENERATE],
      targetFunctionalProgramId: targetProgram.sceneId ?? null,
      targetFunctionalProgram: targetProgram,
    },
    continuationBoundary: {
      preserve: [...CONTINUATION_PRESERVE],
      regenerate: [...CONTINUATION_REGENERATE],
    },
  };
}

/**
 * Render the Continuation Intent block (v1.1). Carries the Target Functional
 * Program and source elements to drop, but is kept COMPACT so the frozen
 * prompt budget (+10% / 7500 adapter) is respected (R11.1 §16). It never
 * re-explains the frozen blocks or the brand.
 */
export function renderContinuationIntentBlock(contract = {}) {
  if (!contract || contract.generationBasis !== 'continuation') return null;
  const sourceScene = contract.sourceScene;
  const targetScene = contract.targetScene;
  const targetLabel = contract.targetSceneLabel;
  if (!sourceScene || !targetScene) return null;

  const program = contract.targetFunctionalProgram ?? {};
  const drop = Array.isArray(program.sourceProgramElementsToDrop) ? program.sourceProgramElementsToDrop : [];

  const lines = [
    `# Continuation Intent`,
    `Continue the confirmed ${sourceScene} world into a **${targetLabel || targetScene}** scene.`,
    'Reference = WORLD-CONSISTENCY only (keep architecture language, materials, light, boundaries, rhythm, color, brand).',
    'REGENERATE for the new scene: program, layout, circulation, privacy, scale, furniture, composition.',
  ];
  if (program.requiredFunctions?.length) {
    lines.push(`Target program: ${program.requiredFunctions.slice(0, 4).join('；')}`);
  }
  if (drop.length) {
    lines.push(`Do not carry over: ${drop.slice(0, 4).join('；')}`);
  }
  if (contract.userRequirement) lines.push(`Requirement: ${contract.userRequirement}`);
  return lines.join('\n');
}

export function isForbiddenContinuationReferenceRole(role) {
  return FORBIDDEN_REFERENCE_ROLES.has(String(role ?? ''));
}
