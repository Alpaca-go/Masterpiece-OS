// R8.5.1 semantic-separation layer for Phase 9B space compilation.
// Production module (not experimental). All functions are deterministic and
// free of model calls.

export { SEMANTIC_CLASS, classifyPhrase, separateSpaceSemantics } from './separate-space-semantics.js';
export { normalizeArchitectureSemantics } from './normalize-architecture-semantics.js';
export { traceMechanism, auditMechanismSources, MECHANISM_PROVENANCE_VERSION } from './mechanism-provenance.js';
export { compileSpatialMechanisms, compileRawPhrases, COMPILE_SPATIAL_MECHANISMS_VERSION } from './compile-spatial-mechanisms.js';
export {
  rewriteArchitectureSemantics,
  rewriteArchitectureItem,
  REWRITE_ARCHITECTURE_SEMANTICS_VERSION,
} from './rewrite-architecture-semantics.js';
export {
  detectSignals,
  signalsToActions,
  textToActions,
  ACTION_VERB_RULE_COUNT,
} from './action-verbs.js';
export {
  sanitizeBrandItem,
  sanitizeBrandManifestation,
  sanitizeMaterials,
  sanitizeMaterial,
  sanitizeLighting,
  sanitizeDifferentiators,
  BRAND_EXPRESSION_SANITIZER_VERSION,
} from './sanitize-brand-expression.js';
export {
  validateSpatialSemantics,
  normalizeSpatialFunctionalValue,
  SPATIAL_SEMANTIC_GATE_VERSION,
} from './validate-spatial-semantics.js';
export {
  resolveSpatialColorRole,
  SPATIAL_COLOR_ROLE_VERSION,
} from './resolve-spatial-color-role.js';
