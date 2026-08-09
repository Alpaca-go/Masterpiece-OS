// R11.1 Continuation Context (ephemeral IR).
//
// Like spatialMechanisms, the continuation context is a compile-time /
// runtime ephemeral IR — it is NOT a new V5 analysis field or a project
// source of truth. It feeds a small "Continuation Intent" block placed
// right after the Task block (before Spatial Intent), expressing only:
//   source scene, target scene, preserve grammar, change functional program.
// It never re-runs V5 analysis and never reopens brand understanding.

export const CONTINUATION_CONTEXT_VERSION = 'space-continuation-context@1.0.0';

// Same spatial grammar, different spatial application (R11 §19).
export const CONTINUATION_PRESERVE = Object.freeze([
  'brand world',
  'architecture language',
  'material system',
  'lighting temperament',
  'boundary logic',
  'spatial rhythm',
  'visual DNA',
  'color roles',
]);

export const CONTINUATION_CHANGE = Object.freeze([
  'functional program',
  'layout',
  'privacy',
  'scene-specific operational needs',
]);

/**
 * Build the ephemeral continuation context from a validated contract.
 * @returns {object} { continuation: { ... } }
 */
export function buildContinuationContext(contract = {}) {
  return {
    continuation: {
      sourceAssetId: contract.confirmedSourceAssetId ?? null,
      sourceRunId: contract.sourceRunId ?? null,
      sourceScene: contract.sourceScene ?? '',
      targetScene: contract.targetScene ?? '',
      preserve: [...CONTINUATION_PRESERVE],
      change: [...CONTINUATION_CHANGE],
      referenceSource: 'confirmed_generated_output',
    },
  };
}

/**
 * Render the small Continuation Intent block (no brand re-analysis).
 * Returns the block text, or null when no continuation context is present.
 * Kept deliberately compact (R11 §29/§31) so the frozen prompt budget is not
 * inflated beyond +10% — it states only source/target scene and the
 * keep-grammar/change-program principle, never re-explaining the frozen blocks.
 */
export function renderContinuationIntentBlock(contract = {}) {
  if (!contract || contract.generationBasis !== 'continuation') return null;
  const sourceScene = contract.sourceScene;
  const targetScene = contract.targetScene;
  const targetLabel = contract.targetSceneLabel;
  if (!sourceScene || !targetScene) return null;

  const lines = [
    '# Continuation Intent',
    '',
    `Continue the confirmed ${sourceScene} world into a **${targetLabel || targetScene}** scene.`,
    'Keep the same spatial grammar and material/lighting temperament. Change only the functional program for the new scene; do not copy the source composition.',
  ];
  if (contract.userRequirement) lines.push(`Requirement: ${contract.userRequirement}`);
  if (contract.customSceneDescription) lines.push(`Custom scene: ${contract.customSceneDescription}`);
  return lines.join('\n');
}
