import { SEMANTIC_CLASS, classifyPhrase, separateSpaceSemantics } from "./separate-space-semantics.js";
import { normalizeArchitectureSemantics } from "./normalize-architecture-semantics.js";
import { traceMechanism, auditMechanismSources, MECHANISM_PROVENANCE_VERSION } from "./mechanism-provenance.js";
import { compileSpatialMechanisms, compileRawPhrases, COMPILE_SPATIAL_MECHANISMS_VERSION } from "./compile-spatial-mechanisms.js";
import {
  rewriteArchitectureSemantics,
  rewriteArchitectureItem,
  REWRITE_ARCHITECTURE_SEMANTICS_VERSION
} from "./rewrite-architecture-semantics.js";
import {
  detectSignals,
  signalsToActions,
  textToActions,
  ACTION_VERB_RULE_COUNT
} from "./action-verbs.js";
import {
  sanitizeBrandItem,
  sanitizeBrandManifestation,
  sanitizeMaterials,
  sanitizeMaterial,
  sanitizeLighting,
  sanitizeDifferentiators,
  BRAND_EXPRESSION_SANITIZER_VERSION
} from "./sanitize-brand-expression.js";
import {
  validateSpatialSemantics,
  normalizeSpatialFunctionalValue,
  demoteDecorativeObjectFromFunctionalLayer,
  normalizeFunctionalHardConstraint,
  SPATIAL_SEMANTIC_GATE_VERSION
} from "./validate-spatial-semantics.js";
import {
  resolveSpatialColorRole,
  SPATIAL_COLOR_ROLE_VERSION
} from "./resolve-spatial-color-role.js";
export {
  ACTION_VERB_RULE_COUNT,
  BRAND_EXPRESSION_SANITIZER_VERSION,
  COMPILE_SPATIAL_MECHANISMS_VERSION,
  MECHANISM_PROVENANCE_VERSION,
  REWRITE_ARCHITECTURE_SEMANTICS_VERSION,
  SEMANTIC_CLASS,
  SPATIAL_COLOR_ROLE_VERSION,
  SPATIAL_SEMANTIC_GATE_VERSION,
  auditMechanismSources,
  classifyPhrase,
  compileRawPhrases,
  compileSpatialMechanisms,
  demoteDecorativeObjectFromFunctionalLayer,
  detectSignals,
  normalizeArchitectureSemantics,
  normalizeFunctionalHardConstraint,
  normalizeSpatialFunctionalValue,
  resolveSpatialColorRole,
  rewriteArchitectureItem,
  rewriteArchitectureSemantics,
  sanitizeBrandItem,
  sanitizeBrandManifestation,
  sanitizeDifferentiators,
  sanitizeLighting,
  sanitizeMaterial,
  sanitizeMaterials,
  separateSpaceSemantics,
  signalsToActions,
  textToActions,
  traceMechanism,
  validateSpatialSemantics
};
