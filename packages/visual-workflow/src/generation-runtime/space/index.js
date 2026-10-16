import {
  compileSpacePrompt,
  SPACE_PROMPT_COMPILER_ID,
  SPACE_PROMPT_COMPILER_VERSION
} from "./compiler.js";
import {
  adaptSpaceSource,
  isSpaceSourceInsufficient,
  SPACE_QUALITY_SOURCE_ADAPTER_VERSION
} from "./source-adapter.js";
import {
  selectArchitectureAnchors,
  renderArchitectureContextBlock,
  resolveArchitectureAnchorImagePath,
  loadArchitectureAnchorRegistry,
  resolveArchitectureAnchorBrandKey,
  normalizeAnchorIndustry,
  ARCHITECTURE_CONTEXT_VERSION
} from "./architecture-context.js";
import {
  resolveSpaceReferences,
  assertSpaceReferenceAvailable,
  SPACE_REFERENCE_POLICY_VERSION
} from "./space-reference-policy.js";
import { measurePromptBudget, assertPromptBudget, resolveProviderPromptLimit } from "./prompt-budget.js";
import { buildTrace, fingerprint } from "./trace.js";
import { runSpaceQualityGate } from "./space-quality-gate.js";
import {
  assertSpaceGenerationRouteIntegrity,
  assertSpaceGenerationRouteGateA,
  SPACE_ROUTE_INTEGRITY_GATE_VERSION,
  CANONICAL_SPACE_COMPILER_MODE
} from "./gates/generation-route-integrity-gate.js";
import { SPACE_COMPILE_INTEGRITY_GATE_VERSION } from "./gates/compile-integrity-gate.js";
import {
  assertProviderPromptGateB,
  SPACE_PROVIDER_PROMPT_GATE_VERSION
} from "./gates/provider-prompt-gate.js";
import { ACTIVE_SPACE_ROUTE_BASELINE } from "./quality-baselines/active-space-route-baseline.js";
import {
  validateShortChainEvidenceIntegrity,
  extractEvidenceBindings,
  VNEXT_EVIDENCE_FILE_NAMES,
  VNEXT_EVIDENCE_INTEGRITY_GATE_VERSION
} from "./gates/evidence-integrity-gate.js";
import {
  PRODUCT_POLICY_VERSION,
  PRODUCT_POLICY_DEFAULT_MAX_REFERENCES,
  resolveProductPolicyMaxReferences,
  resolveEffectiveMaxReferences
} from "./product-policy.js";
import {
  REFERENCE_BOUNDARY_VERSION,
  renderReferenceBoundary,
  resolveProviderStrengthControlLabel
} from "./reference-boundary.js";
import {
  SPACE_MODE_BOUNDARY_VERSION,
  SPACE_GENERATION_MODES,
  LEGACY_CORE_REFERENCE_ROLE,
  CONTINUATION_COMPOSITION_PRESERVATION_PATTERNS,
  evaluateSpaceModeBoundary,
  isHighFidelityReferenceRole,
  detectCompositionPreservationLeak,
  validateSpaceGenerationModeSemantics
} from "./mode-boundary/mode-boundary-semantics.js";
import {
  TARGET_SCENE_PROJECTION_VERSION,
  TARGET_SCENE_AUTHORITY_GATE_VERSION,
  TARGET_SCENE_AUTHORITY_CHECKED_BLOCKS,
  isKnownTargetScene,
  filterProjectWideConstraintsForTargetScene,
  buildTargetSceneProjection,
  projectBrandManifestationToTargetScene,
  resolveTargetViewStrategy,
  validateTargetSceneAuthority
} from "./scene-projection/target-scene-projection.js";
import {
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
  SPATIAL_COLOR_ROLE_VERSION
} from "./semantic/index.js";
import {
  detectSignals,
  signalsToActions,
  textToActions,
  rewriteArchitectureItems,
  ACTION_VERB_RULE_COUNT
} from "./semantic/action-verbs.js";
import {
  rewriteArchitectureSemantics,
  rewriteArchitectureItem,
  REWRITE_ARCHITECTURE_SEMANTICS_VERSION
} from "./semantic/rewrite-architecture-semantics.js";
import {
  sanitizeBrandItem,
  sanitizeBrandManifestation,
  sanitizeMaterials,
  sanitizeMaterial,
  sanitizeLighting,
  sanitizeDifferentiators,
  BRAND_EXPRESSION_SANITIZER_VERSION
} from "./semantic/sanitize-brand-expression.js";
export * from "./continuation/index.js";
export {
  ACTION_VERB_RULE_COUNT,
  ACTIVE_SPACE_ROUTE_BASELINE,
  ARCHITECTURE_CONTEXT_VERSION,
  BRAND_EXPRESSION_SANITIZER_VERSION,
  CANONICAL_SPACE_COMPILER_MODE,
  COMPILE_SPATIAL_MECHANISMS_VERSION,
  CONTINUATION_COMPOSITION_PRESERVATION_PATTERNS,
  LEGACY_CORE_REFERENCE_ROLE,
  MECHANISM_PROVENANCE_VERSION,
  PRODUCT_POLICY_DEFAULT_MAX_REFERENCES,
  PRODUCT_POLICY_VERSION,
  REFERENCE_BOUNDARY_VERSION,
  REWRITE_ARCHITECTURE_SEMANTICS_VERSION,
  SEMANTIC_CLASS,
  SPACE_COMPILE_INTEGRITY_GATE_VERSION,
  SPACE_GENERATION_MODES,
  SPACE_MODE_BOUNDARY_VERSION,
  SPACE_PROMPT_COMPILER_ID,
  SPACE_PROMPT_COMPILER_VERSION,
  SPACE_PROVIDER_PROMPT_GATE_VERSION,
  SPACE_QUALITY_SOURCE_ADAPTER_VERSION,
  SPACE_REFERENCE_POLICY_VERSION,
  SPACE_ROUTE_INTEGRITY_GATE_VERSION,
  SPATIAL_COLOR_ROLE_VERSION,
  SPATIAL_SEMANTIC_GATE_VERSION,
  TARGET_SCENE_AUTHORITY_CHECKED_BLOCKS,
  TARGET_SCENE_AUTHORITY_GATE_VERSION,
  TARGET_SCENE_PROJECTION_VERSION,
  VNEXT_EVIDENCE_FILE_NAMES,
  VNEXT_EVIDENCE_INTEGRITY_GATE_VERSION,
  adaptSpaceSource,
  assertPromptBudget,
  assertProviderPromptGateB,
  assertSpaceGenerationRouteGateA,
  assertSpaceGenerationRouteIntegrity,
  assertSpaceReferenceAvailable,
  auditMechanismSources,
  buildTargetSceneProjection,
  buildTrace,
  classifyPhrase,
  compileRawPhrases,
  compileSpacePrompt,
  compileSpatialMechanisms,
  demoteDecorativeObjectFromFunctionalLayer,
  detectCompositionPreservationLeak,
  detectSignals,
  evaluateSpaceModeBoundary,
  extractEvidenceBindings,
  filterProjectWideConstraintsForTargetScene,
  fingerprint,
  isHighFidelityReferenceRole,
  isKnownTargetScene,
  isSpaceSourceInsufficient,
  loadArchitectureAnchorRegistry,
  measurePromptBudget,
  normalizeAnchorIndustry,
  normalizeArchitectureSemantics,
  normalizeFunctionalHardConstraint,
  normalizeSpatialFunctionalValue,
  projectBrandManifestationToTargetScene,
  renderArchitectureContextBlock,
  renderReferenceBoundary,
  resolveArchitectureAnchorBrandKey,
  resolveArchitectureAnchorImagePath,
  resolveEffectiveMaxReferences,
  resolveProductPolicyMaxReferences,
  resolveProviderPromptLimit,
  resolveProviderStrengthControlLabel,
  resolveSpaceReferences,
  resolveSpatialColorRole,
  resolveTargetViewStrategy,
  rewriteArchitectureItem,
  rewriteArchitectureItems,
  rewriteArchitectureSemantics,
  runSpaceQualityGate,
  sanitizeBrandItem,
  sanitizeBrandManifestation,
  sanitizeDifferentiators,
  sanitizeLighting,
  sanitizeMaterial,
  sanitizeMaterials,
  selectArchitectureAnchors,
  separateSpaceSemantics,
  signalsToActions,
  textToActions,
  traceMechanism,
  validateShortChainEvidenceIntegrity,
  validateSpaceGenerationModeSemantics,
  validateSpatialSemantics,
  validateTargetSceneAuthority
};
