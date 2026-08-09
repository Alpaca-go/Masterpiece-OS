// R11.1 Continuation Reference Resolution.
//
// Binds ONE confirmed generated output as the continuation core reference.
// The provider receives exactly one image reference with source
// confirmed_generated_output. Implicit anchors, architecture anchor images and
// other generated outputs are never auto-attached (R11 §32).

export const CONTINUATION_REFERENCE_VERSION = 'space-continuation-reference@1.0.0';

/**
 * @param {object} input
 * @param {object} input.confirmed     VNextConfirmedGeneratedOutput
 * @param {string} input.projectRelativePath  path of the source image on disk
 * @returns {{ references: object[], trace: object }}
 */
export function resolveContinuationReference({ confirmed, projectRelativePath } = {}) {
  if (!confirmed) throw Object.assign(new Error('SPACE_CONTINUATION_REFERENCE_REQUIRED: confirmed output missing'), {
    code: 'SPACE_CONTINUATION_REFERENCE_REQUIRED',
  });
  const reference = {
    id: confirmed.assetId,
    assetId: confirmed.assetId,
    role: 'core_reference',
    source: 'confirmed_generated_output',
    sourceRunId: confirmed.sourceRunId,
    sourceScene: confirmed.sourceScene,
    confirmedAt: confirmed.confirmedAt,
    confirmationSource: confirmed.confirmationSource,
    projectRelativePath,
  };
  const trace = {
    referencePolicyVersion: 'space-reference-policy@2.0.0',
    referenceMode: 'reference_assisted',
    referenceCount: 1,
    referenceSource: 'confirmed_generated_output',
    references: [{ ...reference }],
    implicitAnchorId: null,
    architectureAnchorIds: [],
    providerReferences: [{ id: confirmed.assetId, role: 'core_reference', source: 'confirmed_generated_output', projectRelativePath }],
  };
  return { references: [reference], trace };
}
