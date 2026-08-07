// Phase 9B-quality space generation compiler (production).
//
// Recovery doc §5. This package re-establishes a building-led generation
// pipeline for space deliverables, equivalent to the Phase 9B Mode B golden
// baseline, while staying on top of the current V5 Analysis Intelligence
// (VisualDecisionPacket, self-healing, ProjectGenerationContract).

export {
  compilePhase9bSpacePrompt,
  SPACE_PROMPT_COMPILER_ID,
  SPACE_PROMPT_COMPILER_VERSION,
} from './phase9b-space-compiler.js';

export {
  adaptPhase9bSource,
  isSpacePhase9bInsufficient,
  SPACE_QUALITY_SOURCE_ADAPTER_VERSION,
} from './phase9b-source-adapter.js';

export {
  selectArchitectureAnchors,
  renderArchitectureContextBlock,
  resolveArchitectureAnchorImagePath,
  loadArchitectureAnchorRegistry,
  ARCHITECTURE_CONTEXT_VERSION,
} from './architecture-context.js';

export {
  resolveSpaceReferences,
  assertSpaceReferenceAvailable,
  SPACE_REFERENCE_POLICY_VERSION,
} from './space-reference-policy.js';

export { measurePromptBudget, assertPromptBudget } from './prompt-budget.js';
export { buildTrace, fingerprint } from './trace.js';
