// R11.1 v1.2 Continuation Reference Resolution.
//
// Binds ONE confirmed generated output as the continuation core reference.
// The provider receives exactly one image reference with source
// confirmed_generated_output and semanticRole world_consistency. Implicit
// anchors, architecture anchor images and other generated outputs are never
// auto-attached (R11 §32). The legacy `role` field stays for wire/legacy
// compatibility, but the authoritative semantic role is `referenceRole`.

export const CONTINUATION_REFERENCE_VERSION = 'space-continuation-reference@1.2.0';

/**
 * @param {object} input
 * @param {object} input.confirmed     VNextConfirmedGeneratedOutput
 * @param {string} input.projectRelativePath  path of the source image on disk
 * @param {string} [input.targetScene] target scene id (for trace)
 * @param {string} [input.viewStrategy] target view strategy (for trace)
 * @returns {{ references: object[], trace: object }}
 */
export function resolveContinuationReference({ confirmed, projectRelativePath, targetScene, viewStrategy } = {}) {
  if (!confirmed) throw Object.assign(new Error('SPACE_CONTINUATION_REFERENCE_REQUIRED: confirmed output missing'), {
    code: 'SPACE_CONTINUATION_REFERENCE_REQUIRED',
  });
  const reference = {
    id: confirmed.assetId,
    assetId: confirmed.assetId,
    role: 'core_reference', // legacy wire role (kept for compatibility)
    semanticRole: 'world_consistency', // R11.1 v1.2 authoritative semantic role
    referenceRole: 'world_consistency',
    source: 'confirmed_generated_output',
    sourceRunId: confirmed.sourceRunId,
    sourceScene: confirmed.sourceScene,
    confirmedAt: confirmed.confirmedAt,
    confirmationSource: confirmed.confirmationSource,
    projectRelativePath,
    ...(targetScene ? { targetScene } : {}),
  };
  const trace = {
    referencePolicyVersion: 'space-reference-policy@2.0.0',
    referenceMode: 'reference_assisted',
    referenceRole: 'world_consistency',
    referenceSource: 'confirmed_generated_output',
    referenceCount: 1,
    references: [{ ...reference }],
    implicitAnchorId: null,
    architectureAnchorIds: [],
    providerReferences: [{
      id: confirmed.assetId,
      role: 'core_reference',
      semanticRole: 'world_consistency',
      source: 'confirmed_generated_output',
      projectRelativePath,
    }],
    ...(targetScene ? { targetScene } : {}),
    ...(viewStrategy ? { targetViewStrategy: viewStrategy } : {}),
  };
  return { references: [reference], trace };
}
