// Execution-oriented Visual Direction v2 — public surface.
//
// Experimental branch `experiment/execution-oriented-directions-v2`. Coexists
// with the frozen conceptual_v1 baseline; the production pipeline keeps using
// v1. Nothing here modifies v1, Evidence, Asset Authorization, Audience
// Boundary, Direction Score v1, Difference Matrix v1 or the v1.3.3 Report
// Compiler.

export {
  DIRECTION_GENERATION_MODES,
  PRODUCTION_BASELINE_MODE,
  EXPERIMENT_MODE,
  isExecutionMode,
  normalizeDirectionGenerationMode,
  DIRECTION_GENERATION_MODE_VERSIONS
} from './config/direction-generation-mode.js';

export {
  VISUAL_DIRECTION_V2_CONTRACT_VERSION,
  REUSABLE_ASSET_TYPES,
  REQUIRED_REUSABLE_ASSET_TYPES,
  COMPOSITION_TOUCHPOINTS,
  EXECUTION_EXAMPLE_CATEGORIES,
  ANTI_CONCEPT_ART_CONSTRAINTS,
  ANTI_CONCEPT_ART_CONSTRAINT_IDS,
  validateExecutionDirectionV2,
  validateReusableAsset,
  validateCompositionTemplate
} from './schemas/direction-contract-v2.js';

export {
  ANCHOR_V2_CONTRACT_VERSION,
  ANCHOR_IMAGE_EXPECTED_TOUCHPOINTS,
  validateAnchorCandidateV2
} from './schemas/anchor-contract-v2.js';

export {
  EXECUTION_READINESS_EVALUATOR_VERSION,
  EXECUTION_READINESS_PASS_CRITERIA,
  evaluateExecutionReadiness
} from './runtime/execution-readiness-evaluator.js';

export {
  checkAntiConceptArtConstraints,
  detectRealEstateDrift,
  detectAbstractOnlyDependency,
  detectRealEstateDriftFromText,
  detectAbstractOnlyFromText
} from './runtime/anti-concept-art-constraints.js';

export {
  guardAssetAuthorization,
  guardEvidencePreservation,
  guardAudienceBoundary
} from './runtime/regression-guards.js';

export { compileExecutionDirectionV2 } from './runtime/compile-execution-direction-v2.js';

export {
  evaluateConceptualDirectionV1,
  runABComparison,
  runABRunner
} from './runtime/ab-runner.js';

export { buildExecutionDirectionV2Prompt, VISUAL_DIRECTIONS_PROMPT_V2_VERSION } from './prompts/direction-generation-prompt-v2.js';
export { buildAnchorCandidateV2Prompt, ANCHOR_CANDIDATE_PROMPT_V2_VERSION } from './prompts/anchor-candidate-prompt-v2.js';

export { compileExecutionDirectionsReportV2 } from './report/compile-execution-directions-report-v2.js';
