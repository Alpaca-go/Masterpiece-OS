// Shared Space Generation capability boundary.
//
// Historical implementation names remain internal during S4 so behavior and
// Golden parity stay unchanged. Current consumers import this facade instead
// of depending on the vNext / Phase9B / R8.6-R11 topology directly.

export const SPACE_GENERATION_CORE_ID = 'space-generation-core@1.0.0';

export {
  compileVNextCorrectionPrompt,
  compileVNextImageGeneration,
  listVNextTemplateOptions,
  deriveGenerationFlowState,
  validateVNextDeliverableEvidence,
} from '../vnext/index.js';

export {
  assertSpaceGenerationRouteGateA,
  assertProviderPromptGateB,
  resolveSpaceReferences,
  assertSpaceReferenceAvailable,
  resolveContinuationReference,
  runSpaceQualityGate,
  validateSpatialSemantics,
  resolveEffectiveMaxReferences,
} from '../vnext/space-quality/index.js';

export { createSeedreamVNextAdapter } from '../vnext/seedream-adapter.js';

export {
  normalizeSpatialFunctionalValue,
  validateVNextEvidenceIntegrity,
} from '../space/index.js';
