// R11.1 v1.1 Space Continuation — contract / target program / reference / context.
//
// Continuation is NOT a new compiler. It reuses the frozen r8_6_golden Space
// Compiler with a different input contract: one confirmed generated output as
// a WORLD-CONSISTENCY reference, a target scene compiled into a Target
// Functional Program (which overrides the source program), and the same
// project world.

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
  isForbiddenContinuationReferenceRole,
  CONTINUATION_CONTEXT_VERSION,
  CONTINUATION_PRESERVE,
  CONTINUATION_REGENERATE,
  CONTINUATION_REFERENCE_ROLE,
} from './build-continuation-context.js';
export {
  resolveTargetFunctionalProgram,
  TARGET_FUNCTIONAL_PROGRAMS,
  TARGET_FUNCTIONAL_PROGRAM_VERSION,
} from './target-functional-programs.js';
export {
  evaluateContinuationSceneGate,
  SCENE_DIFFERENTIATION_GATE_VERSION,
} from './scene-differentiation-gate.js';
