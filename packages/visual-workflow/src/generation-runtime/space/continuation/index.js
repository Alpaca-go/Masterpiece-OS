import {
  createSpaceContinuationContract,
  assertSpaceContinuationContract,
  isKnownContinuationScene,
  CONTINUATION_CONTRACT_VERSION,
  CONTINUATION_SCENES
} from "./create-continuation-contract.js";
import {
  validateContinuationSource,
  CONTINUATION_SOURCE_VALIDATION_VERSION
} from "./validate-continuation-source.js";
import {
  resolveContinuationReference,
  CONTINUATION_REFERENCE_VERSION
} from "./resolve-continuation-reference.js";
import {
  buildContinuationContext,
  renderContinuationIntentBlock,
  isForbiddenContinuationReferenceRole,
  CONTINUATION_CONTEXT_VERSION,
  CONTINUATION_PRESERVE,
  CONTINUATION_REGENERATE,
  CONTINUATION_REFERENCE_ROLE
} from "./build-continuation-context.js";
import {
  resolveTargetFunctionalProgram,
  TARGET_FUNCTIONAL_PROGRAMS,
  TARGET_FUNCTIONAL_PROGRAM_VERSION,
  TARGET_VIEW_STRATEGIES,
  viewStrategyForScene
} from "./target-functional-programs.js";
import {
  evaluateContinuationSceneGate,
  SCENE_DIFFERENTIATION_GATE_VERSION
} from "./scene-differentiation-gate.js";
import {
  applyContinuationProgramOverride,
  filterSourceSceneConstraintsForContinuation,
  CONTINUATION_OVERRIDE_VERSION
} from "./apply-continuation-program-override.js";
import {
  assertNoSourceProgramLeakage,
  enforceNoSourceProgramLeakage,
  SOURCE_PROGRAM_LEAKAGE_GATE_VERSION
} from "./source-program-leakage-gate.js";
export {
  CONTINUATION_CONTEXT_VERSION,
  CONTINUATION_CONTRACT_VERSION,
  CONTINUATION_OVERRIDE_VERSION,
  CONTINUATION_PRESERVE,
  CONTINUATION_REFERENCE_ROLE,
  CONTINUATION_REFERENCE_VERSION,
  CONTINUATION_REGENERATE,
  CONTINUATION_SCENES,
  CONTINUATION_SOURCE_VALIDATION_VERSION,
  SCENE_DIFFERENTIATION_GATE_VERSION,
  SOURCE_PROGRAM_LEAKAGE_GATE_VERSION,
  TARGET_FUNCTIONAL_PROGRAMS,
  TARGET_FUNCTIONAL_PROGRAM_VERSION,
  TARGET_VIEW_STRATEGIES,
  applyContinuationProgramOverride,
  assertNoSourceProgramLeakage,
  assertSpaceContinuationContract,
  buildContinuationContext,
  createSpaceContinuationContract,
  enforceNoSourceProgramLeakage,
  evaluateContinuationSceneGate,
  filterSourceSceneConstraintsForContinuation,
  isForbiddenContinuationReferenceRole,
  isKnownContinuationScene,
  renderContinuationIntentBlock,
  resolveContinuationReference,
  resolveTargetFunctionalProgram,
  validateContinuationSource,
  viewStrategyForScene
};
