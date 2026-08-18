/**
 * Anchor Production — CI-W2.
 *
 * Pure semantic module. Owns:
 *   - The AnchorProductionContract compiler (input -> contract, no I/O)
 *   - The AnchorCandidate deterministic post-evaluation
 *   - The AnchorProductionWorkspace projection types
 *
 * Does NOT own:
 *   - The AnchorProductionRun lifecycle (runtime-core)
 *   - The actual image generation call (image-generation-runtime)
 *   - Image persistence (image-generation-runtime asset authority)
 *   - Disk I/O (runtime-core)
 *
 * Web never imports from this module directly. It only consumes
 * the runtime-core `WorkspaceView.anchorProduction` projection.
 */

export * from './contracts.ts';
export {
  buildAnchorProductionContract,
  canStartAnchorProduction,
  ANCHOR_PRODUCTION_SCHEMA_VERSION,
  ANCHOR_PRODUCTION_RUN_SCHEMA_VERSION,
  ANCHOR_CANDIDATE_SCHEMA_VERSION,
  APPROVED_VISUAL_ANCHOR_SCHEMA_VERSION,
  ANCHOR_PRODUCTION_TRACE_VERSION,
} from './build-anchor-production-contract.ts';

export type {
  BuildAnchorProductionContractInput,
  BuildAnchorProductionContractResult,
} from './build-anchor-production-contract.ts';

export {
  evaluateAnchorCandidate,
} from './anchor-candidate-evaluation.ts';

export type {
  EvaluateAnchorCandidateInput,
} from './anchor-candidate-evaluation.ts';
