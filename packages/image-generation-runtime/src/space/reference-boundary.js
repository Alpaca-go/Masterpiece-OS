// r2.0 §4.10 / B-3: Reference Boundary text block.
//
// The v2.0-style positive expression of the Reference Boundary. The block
// tells the model:
//
//   - the reference image is a HIGH-FIDELITY VISUAL REFERENCE
//   - what to PRESERVE from the reference (design language only)
//   - what the TARGET SCENE is authoritative for (function, furniture,
//     privacy, room scale, circulation, scene-specific composition)
//   - reorganize spatial elements as needed; preserve design language,
//     not exact placement
//
// This is a SECOND-LAYER constraint on top of r2.0 §4.2-4.7 (Target Scene
// Functional Authority). It does NOT and MUST NOT replace Target Scene
// Authority. It is only injected when a reference image is actually being
// sent to the Provider. The Standard path emits no block. The Continuation
// path's reference role is already world_consistency, which is more
// specific than this generic block; we also skip the block for Continuation
// to avoid contradicting the existing role label.
//
// The block is rendered in ENGLISH because Seedream (Doubao) is trained
// primarily on English-only prompt instructions. Mixing Chinese into the
// boundary block could dilute the model attention on the design-language
// preservation list. The r8_6_golden compiler output remains in whatever
// language the user wrote the rest of the prompt in.

export const REFERENCE_BOUNDARY_VERSION = 'space-reference-boundary@1.0.0';

const PRESERVE_DESIGN_LANGUAGE = [
  'architectural language',
  'material combination',
  'lighting temperament',
  'color relationships',
  'surface behavior',
  'form rhythm',
];

const TARGET_SCENE_AUTHORITATIVE = [
  'function',
  'furniture',
  'privacy',
  'room scale',
  'circulation',
  'scene-specific composition',
];

/**
 * @param {object} input
 * @param {string} input.generationBasis        'standard' | 'reference_first' | 'continuation'
 * @param {string|null|undefined} [input.referenceSceneRelation]
 *        'same_scene' | 'cross_scene' | 'unknown' — auxiliary metadata only.
 * @param {string} [input.targetSceneLabel]     human-readable scene name (e.g. 'consultation')
 * @param {object|null|undefined} [input.adapterCapability]
 *        VNextAdapterCapability shape. When referenceStrengthControl.supported
 *        is true the block mentions the official weight parameter. When
 *        false the block is honest about it (does not pretend to control).
 * @returns {string|null} the boundary block text, or null when the block
 *         does not apply (standard, or continuation).
 */
export function renderReferenceBoundary({
  generationBasis,
  referenceSceneRelation = 'unknown',
  targetSceneLabel = '',
  adapterCapability = null,
} = {}) {
  // The block is for Reference-First only. Continuation's world_consistency
  // role is more specific; Standard is text-only.
  if (generationBasis !== 'reference_first') return null;

  const strengthSupported = Boolean(
    adapterCapability?.reference?.referenceStrengthControl?.supported,
  );
  const strengthParameter = adapterCapability?.reference?.referenceStrengthControl?.controlParameter;

  // The block is a high-priority append, so it speaks in imperative present
  // and labels itself clearly. v2.0-style positive expression; the
  // negative "do not retain X" phrasing was rejected because the
  // architectural elements (curved partitions, glazing, ceiling language)
  // may themselves be the brand's design language.
  const preserve = PRESERVE_DESIGN_LANGUAGE.map((item) => `- ${item}`).join('\n');
  const targetAuthoritative = TARGET_SCENE_AUTHORITATIVE.map((item) => `- ${item}`).join('\n');

  const sameScene = referenceSceneRelation === 'same_scene';
  const crossScene = referenceSceneRelation === 'cross_scene';

  const intentLine = crossScene
    ? 'The target scene is a different functional class from the reference; inherit design language only.'
    : sameScene
      ? 'The target scene shares the same functional class as the reference; keep the same design language but allow for legitimate variation within the scene.'
      : 'Whether the target scene shares the reference scene class is not declared; inherit design language only and let the target scene function drive the spatial program.';

  const sceneSuffix = targetSceneLabel ? `\nTarget scene: ${targetSceneLabel}.` : '';

  const strengthNote = strengthSupported && strengthParameter
    ? `\nProvider weight parameter "${strengthParameter}" is available and SHOULD be used: high for same_scene, low for cross_scene.`
    : '\nProvider weight / role controls are not available for this model. The text above is the only boundary; do not invent or assume additional controls.';

  return [
    'REFERENCE BOUNDARY (high-priority instruction):',
    '',
    intentLine,
    sceneSuffix,
    '',
    'Preserve from the reference image:',
    preserve,
    '',
    'Target scene is authoritative for:',
    targetAuthoritative,
    '',
    'Reorganize spatial elements as needed for the target scene.',
    'Preserve design language, not exact placement.',
    strengthNote,
  ].filter(Boolean).join('\n');
}

/**
 * @param {object} adapterCapability
 * @returns {'unsupported' | 'supported'}
 */
export function resolveProviderStrengthControlLabel(adapterCapability) {
  if (!adapterCapability) return 'unsupported';
  return adapterCapability.reference?.referenceStrengthControl?.supported
    ? 'supported'
    : 'unsupported';
}
