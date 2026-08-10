// R11.2.2 Mode Boundary Semantics (product layer).
//
// Freezes the three Space Generation modes and the rules that keep them apart:
//   Standard        = text-only, generate from project rules
//   Reference-First = high-fidelity visual reference (user-explicit only)
//   Continuation    = world-consistency reference + program transformation
//
// This module is pure (no filesystem / IPC / provider). It explains, advises
// and gates — it never rewrites the compiler, the prompt or provider
// parameters. Reference-First is NEVER weakened here, and Continuation is the
// only mode allowed to re-design the target scene.

export const SPACE_MODE_BOUNDARY_VERSION = 'space-mode-boundary@1.0.0';

export const SPACE_GENERATION_MODES = Object.freeze({
  standard: Object.freeze({
    label: '标准生成',
    generationBasis: 'standard',
    referenceMode: 'text_only',
    referenceCount: 0,
    semantic: '根据项目分析与空间规则从零生成',
  }),
  reference_first: Object.freeze({
    label: '参考优先',
    generationBasis: 'reference_first',
    referenceMode: 'reference_assisted',
    referenceRole: 'high_fidelity_visual_reference',
    referenceSource: 'user_explicit',
    semantic: '高保真继承用户明确选择的参考图',
  }),
  continuation: Object.freeze({
    label: '空间延展',
    generationBasis: 'continuation',
    referenceMode: 'reference_assisted',
    referenceRole: 'world_consistency',
    referenceSource: 'confirmed_generated_output',
    semantic: '保持已确认空间的设计世界，为另一个功能场景重新设计',
  }),
});

// Legacy wire role kept for backward compatibility. The authoritative semantic
// role for Reference-First is high_fidelity_visual_reference; for Continuation
// it is world_consistency (R11.2.2 §29).
export const LEGACY_CORE_REFERENCE_ROLE = 'core_reference';

export const CONTINUATION_COMPOSITION_PRESERVATION_PATTERNS = Object.freeze([
  /preserve the requested shot/iu,
  /preserve the requested composition/iu,
  /preserve requested shot\/composition/iu,
]);

/**
 * Evaluate the mode-boundary decision for the current task. Returns a
 * SPACE_REFERENCE_FIRST_CROSS_SCENE_ADVISORY (info only, never blocking) when
 * Reference-First is given a known generated space output of a DIFFERENT scene.
 *
 * @param {object} input
 * @param {'standard'|'reference_first'|'continuation'} [input.currentMode]
 * @param {string} [input.sourceAssetOrigin]  provenance of the reference asset
 * @param {string} [input.sourceScene]        scene of the reference (proven only)
 * @param {string} [input.targetScene]        the task's target scene
 * @returns {object} SpaceModeBoundaryDecision
 */
export function evaluateSpaceModeBoundary({
  currentMode = 'standard',
  sourceAssetOrigin,
  sourceScene,
  targetScene,
} = {}) {
  const sourceKnown = Boolean(sourceAssetOrigin)
    && sourceAssetOrigin === 'generated_output'
    && Boolean(sourceScene);
  const targetKnown = Boolean(targetScene);
  const crossSceneKnown = sourceKnown && targetKnown && String(sourceScene) !== String(targetScene);
  const advisory = currentMode === 'reference_first' && crossSceneKnown
    ? { code: 'SPACE_REFERENCE_FIRST_CROSS_SCENE_ADVISORY', severity: 'info' }
    : null;
  return {
    currentMode,
    sourceAssetOrigin: sourceAssetOrigin ?? null,
    sourceScene: sourceScene ?? null,
    targetScene: targetScene ?? null,
    crossSceneKnown,
    advisory,
    recommendedMode: advisory ? 'continuation' : undefined,
  };
}

/**
 * True when the authoritative reference role carries Reference-First high
 * fidelity semantics (used to detect continuation semantic leakage).
 */
export function isHighFidelityReferenceRole(role) {
  return String(role ?? '') === 'high_fidelity_visual_reference';
}

/**
 * Detect a composition-preservation leak in a Continuation prompt. Continuation
 * must REGENERATE composition, never preserve the source shot/composition.
 */
export function detectCompositionPreservationLeak(prompt) {
  const text = String(prompt ?? '');
  return CONTINUATION_COMPOSITION_PRESERVATION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * R11.2.2 Route Semantic Gate.
 *
 * Hard-fails on Continuation violations (reference semantics mismatch or a
 * composition-preservation instruction leaking into the prompt). Reference-First
 * cross-scene usage is advisory-only (never fail-closed).
 *
 * @param {object} input
 * @param {'standard'|'reference_first'|'continuation'} input.generationBasis
 * @param {string} [input.referenceRole]     authoritative semantic role
 * @param {string[]} [input.referenceSources]
 * @param {number} [input.referenceCount]
 * @param {string} [input.finalPrompt]       compiled prompt (continuation leak check)
 * @param {string} [input.sourceScene]
 * @param {string} [input.targetScene]
 * @returns {{ status: 'pass', advisory: object|null, mode: object }}
 */
export function validateSpaceGenerationModeSemantics(input = {}) {
  const generationBasis = input.generationBasis;
  const referenceSources = Array.isArray(input.referenceSources) ? input.referenceSources : [];
  const referenceCount = Number(input.referenceCount ?? 0);
  const referenceRole = String(input.referenceRole ?? '');

  if (generationBasis === 'standard') {
    if (referenceCount !== 0) {
      throw Object.assign(new Error('Standard space generation must remain text-only.'), {
        code: 'SPACE_STANDARD_REFERENCE_NOT_ALLOWED',
      });
    }
    return { status: 'pass', advisory: null, mode: SPACE_GENERATION_MODES.standard };
  }

  if (generationBasis === 'reference_first') {
    const modeSemantics = evaluateSpaceModeBoundary({
      currentMode: 'reference_first',
      sourceAssetOrigin: input.sourceAssetOrigin,
      sourceScene: input.sourceScene,
      targetScene: input.targetScene,
    });
    return {
      status: 'pass',
      advisory: modeSemantics.advisory,
      mode: SPACE_GENERATION_MODES.reference_first,
    };
  }

  if (generationBasis === 'continuation') {
    if (isHighFidelityReferenceRole(referenceRole)) {
      throw Object.assign(
        new Error('SPACE_CONTINUATION_REFERENCE_SEMANTIC_MISMATCH: Continuation must not carry a high-fidelity reference role.'),
        { code: 'SPACE_CONTINUATION_REFERENCE_SEMANTIC_MISMATCH' },
      );
    }
    if (detectCompositionPreservationLeak(input.finalPrompt)) {
      throw Object.assign(
        new Error('SPACE_CONTINUATION_COMPOSITION_PRESERVATION_LEAK: Continuation prompt must not preserve the source shot/composition.'),
        { code: 'SPACE_CONTINUATION_COMPOSITION_PRESERVATION_LEAK' },
      );
    }
    if (referenceRole !== 'world_consistency' && referenceRole !== LEGACY_CORE_REFERENCE_ROLE) {
      throw Object.assign(
        new Error('SPACE_CONTINUATION_REFERENCE_SEMANTIC_MISMATCH: Continuation requires the world_consistency reference role.'),
        { code: 'SPACE_CONTINUATION_REFERENCE_SEMANTIC_MISMATCH' },
      );
    }
    if (referenceSources.length !== 1 || referenceSources[0] !== 'confirmed_generated_output') {
      throw Object.assign(
        new Error('SPACE_CONTINUATION_REFERENCE_REQUIRED: Continuation requires exactly one confirmed generated output reference.'),
        { code: 'SPACE_CONTINUATION_REFERENCE_REQUIRED' },
      );
    }
    return { status: 'pass', advisory: null, mode: SPACE_GENERATION_MODES.continuation };
  }

  throw Object.assign(new Error(`SPACE_GENERATION_MODE_BOUNDARY_AMBIGUITY: unknown generationBasis ${generationBasis}`), {
    code: 'SPACE_GENERATION_MODE_BOUNDARY_AMBIGUITY',
  });
}
