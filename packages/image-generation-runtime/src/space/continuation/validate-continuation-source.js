// R11.1 Continuation Source Validation.
//
// A continuation source must be a CONFIRMED generated space output belonging
// to the CURRENT project. Unconfirmed / revoked sources, cross-project
// bindings, missing assets, non-image assets, and missing runs all fail closed.

export const CONTINUATION_SOURCE_VALIDATION_VERSION = 'space-continuation-source-validation@1.0.0';

/**
 * Validate a confirmed generated output as a continuation source.
 *
 * @param {object} input
 * @param {object} input.confirmed        VNextConfirmedGeneratedOutput entry
 * @param {object} [input.asset]          Project asset { id, kind, projectId }
 * @param {string} input.projectId        current task project
 * @param {object} [input.run]            source run record (optional)
 * @returns {object} { status:'pass', confirmed }
 */
export function validateContinuationSource({ confirmed, asset, projectId, run } = {}) {
  if (!confirmed) {
    throw err('SPACE_CONTINUATION_SOURCE_INVALID', 'confirmed generated output is missing');
  }
  if (confirmed.confirmationState !== 'confirmed') {
    throw err(confirmed.confirmationState === 'revoked'
      ? 'SPACE_CONTINUATION_SOURCE_REVOKED'
      : 'SPACE_CONTINUATION_SOURCE_UNCONFIRMED',
    `continuation source must be confirmed (state=${confirmed.confirmationState})`);
  }
  if (confirmed.confirmationSource !== 'user_explicit') {
    throw err('SPACE_CONTINUATION_SOURCE_INVALID', 'confirmationSource must be user_explicit');
  }
  if (!confirmed.sourceRunId) {
    throw err('SPACE_CONTINUATION_SOURCE_INVALID', 'sourceRunId is required');
  }
  if (asset) {
    if (asset.projectId && asset.projectId !== projectId) {
      throw err('SPACE_CONTINUATION_PROJECT_MISMATCH', 'confirmed asset does not belong to the current project');
    }
    if (asset.kind && asset.kind !== 'image') {
      throw err('SPACE_CONTINUATION_SOURCE_INVALID', 'continuation source must be an image asset');
    }
  }
  if (run && run.runId !== confirmed.sourceRunId) {
    throw err('SPACE_CONTINUATION_SOURCE_INVALID', 'source run does not match the confirmed output');
  }
  if (run && run.status !== 'succeeded') {
    throw err('SPACE_CONTINUATION_SOURCE_INVALID', 'source run must have succeeded');
  }
  return { status: 'pass', confirmed };
}

function err(code, message) {
  return Object.assign(new Error(`${code}: ${message}`), { code });
}
