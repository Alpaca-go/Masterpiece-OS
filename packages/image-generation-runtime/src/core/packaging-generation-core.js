// Shared Packaging Generation capability boundary.
//
// The V1/V2/V3 migration chain and existing deliverable implementation stay
// untouched. This facade prevents runtime hosts from depending on the
// compiler's internal file topology.

export const PACKAGING_GENERATION_CORE_ID = 'packaging-generation-core@1.0.0';

export {
  compileImageGenerationTask,
  migrateImageGenerationSourcesV2,
} from '../task-builder.js';

export {
  createCompileFingerprint,
  stableHash,
  verifyCompileFingerprint,
} from '../deliverables/compile-fingerprint.js';

export { evaluateDeliverableGate } from '../gates/deliverable-gate.js';
export { evaluateArtifactGate, evaluateIdentityGate } from '../gates.js';
export { downloadAndVerifyImage } from '../download-verify.js';
export { redactProviderRequest, redactProviderResponse } from '../redact.js';
export { IMAGE_GENERATION_PRESET_CAPABILITIES } from '../policies.js';
