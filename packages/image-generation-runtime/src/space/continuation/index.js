// R11.1 Space Continuation — contract / source / reference / context.
//
// Continuation is NOT a new compiler. It reuses the frozen r8_6_golden Space
// Compiler with a different input contract: one confirmed generated output as
// the reference, a new target scene, and the same project world.

export {
  createSpaceContinuationContract,
  assertSpaceContinuationContract,
  isKnownContinuationScene,
  CONTINUATION_CONTRACT_VERSION,
  CONTINUATION_SCENES,
} from './create-continuation-contract.js';
export {
  validateContinuationSource,
  CONTINUATION_SOURCE_VALIDATION_VERSION,
} from './validate-continuation-source.js';
export {
  resolveContinuationReference,
  CONTINUATION_REFERENCE_VERSION,
} from './resolve-continuation-reference.js';
export {
  buildContinuationContext,
  renderContinuationIntentBlock,
  CONTINUATION_CONTEXT_VERSION,
  CONTINUATION_PRESERVE,
  CONTINUATION_CHANGE,
} from './build-continuation-context.js';
