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
  resolveArchitectureAnchorBrandKey,
  normalizeAnchorIndustry,
  ARCHITECTURE_CONTEXT_VERSION,
} from './architecture-context.js';

export {
  resolveSpaceReferences,
  assertSpaceReferenceAvailable,
  SPACE_REFERENCE_POLICY_VERSION,
} from './space-reference-policy.js';

export { measurePromptBudget, assertPromptBudget } from './prompt-budget.js';
export { buildTrace, fingerprint } from './trace.js';
export { runSpaceQualityGate } from './space-quality-gate.js';
export {
  assertSpaceGenerationRouteIntegrity,
  SPACE_ROUTE_INTEGRITY_GATE_VERSION,
  CANONICAL_SPACE_COMPILER_MODE,
} from './gates/generation-route-integrity-gate.js';
export { ACTIVE_SPACE_ROUTE_BASELINE } from './quality-baselines/active-space-route-baseline.js';

// r2.0 §4.10 / B-2: Product Policy + Adapter Capability. The Product Policy
// is the BUSINESS rule for "how many references per basis"; the Adapter
// Capability is what the model can accept. The effective max is the min
// of the two. See product-policy.js for the seam.
export {
  PRODUCT_POLICY_VERSION,
  PRODUCT_POLICY_DEFAULT_MAX_REFERENCES,
  resolveProductPolicyMaxReferences,
  resolveEffectiveMaxReferences,
} from './product-policy.js';

// R11.2.2 mode boundary — the frozen product semantics and the route semantic
// gate that keeps Reference-First (high fidelity) and Continuation
// (world consistency + program transformation) apart.
export {
  SPACE_MODE_BOUNDARY_VERSION,
  SPACE_GENERATION_MODES,
  LEGACY_CORE_REFERENCE_ROLE,
  CONTINUATION_COMPOSITION_PRESERVATION_PATTERNS,
  evaluateSpaceModeBoundary,
  isHighFidelityReferenceRole,
  detectCompositionPreservationLeak,
  validateSpaceGenerationModeSemantics,
} from './mode-boundary/mode-boundary-semantics.js';

// R11.2.3 target scene projection — the shared Space scene layer that gives
// Standard / Reference-First / Continuation target-scene functional authority.
export {
  TARGET_SCENE_PROJECTION_VERSION,
  TARGET_SCENE_AUTHORITY_GATE_VERSION,
  isKnownTargetScene,
  filterProjectWideConstraintsForTargetScene,
  buildTargetSceneProjection,
  resolveTargetViewStrategy,
  validateTargetSceneAuthority,
} from './scene-projection/target-scene-projection.js';

// R8.5.1 — semantic separation (architecture vs brand motif, color-geometry
// coupling guard, mechanism provenance). Production module, no LLM.
export {
  SEMANTIC_CLASS,
  classifyPhrase,
  separateSpaceSemantics,
  normalizeArchitectureSemantics,
  traceMechanism,
  auditMechanismSources,
  compileSpatialMechanisms,
  compileRawPhrases,
  MECHANISM_PROVENANCE_VERSION,
  COMPILE_SPATIAL_MECHANISMS_VERSION,
  validateSpatialSemantics,
  normalizeSpatialFunctionalValue,
  demoteDecorativeObjectFromFunctionalLayer,
  normalizeFunctionalHardConstraint,
  SPATIAL_SEMANTIC_GATE_VERSION,
  resolveSpatialColorRole,
  SPATIAL_COLOR_ROLE_VERSION,
} from './semantic/index.js';

// R8.5 redirected — action-verb architecture IR rewrite (P9B-B register).
export {
  detectSignals,
  signalsToActions,
  textToActions,
  rewriteArchitectureItems,
  ACTION_VERB_RULE_COUNT,
} from './semantic/action-verbs.js';
export {
  rewriteArchitectureSemantics,
  rewriteArchitectureItem,
  REWRITE_ARCHITECTURE_SEMANTICS_VERSION,
} from './semantic/rewrite-architecture-semantics.js';
export {
  sanitizeBrandItem,
  sanitizeBrandManifestation,
  sanitizeMaterials,
  sanitizeMaterial,
  sanitizeLighting,
  sanitizeDifferentiators,
  BRAND_EXPRESSION_SANITIZER_VERSION,
} from './semantic/sanitize-brand-expression.js';

// R11.1 Space Continuation (contract / source / reference / context).
// Continuation reuses the frozen r8_6_golden compiler; it is NOT a new compiler.
export * from './continuation/index.js';

