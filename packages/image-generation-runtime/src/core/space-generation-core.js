// Shared Space Generation capability boundary.
//
// Historical implementation names remain internal during S4 so behavior and
// Golden parity stay unchanged. Current consumers import this facade instead
// of depending on the vNext / Phase9B / R8.6-R11 topology directly.

export const SPACE_GENERATION_CORE_ID = 'space-generation-core@1.0.0';

export {
  compileShortChainCorrectionPrompt,
  compileShortChainGeneration,
  listShortChainTemplateOptions,
  deriveGenerationFlowState,
  validateShortChainDeliverableEvidence,
} from '../generation/index.js';

export {
  assertSpaceGenerationRouteGateA,
  assertProviderPromptGateB,
  resolveSpaceReferences,
  assertSpaceReferenceAvailable,
  resolveContinuationReference,
  runSpaceQualityGate,
  validateSpatialSemantics,
  resolveEffectiveMaxReferences,
} from '../generation/space-quality/index.js';

export { createSeedreamShortChainAdapter } from '../generation/seedream-adapter.js';

export {
  normalizeSpatialFunctionalValue,
  validateShortChainEvidenceIntegrity,
} from '../space/index.js';
