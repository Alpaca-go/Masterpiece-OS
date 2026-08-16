/**
 * Project Truth canonical key registry.
 *
 * Spec #24: small explicit registry. No freeform strings.
 * Spec #23: only keys actually present in current production carriers.
 * Spec #3: start only with what we can ground in production data.
 *
 * Key families:
 *   brand.*     brand identity facts
 *   business.*  business model facts
 *   audience.*  target audience facts
 *   product.*   product / service facts
 *   visual.*    visual system facts
 *   locked.*    locked assets (the "lock" itself is the fact)
 *   constraint.* constraints / prohibitions
 *   unknown.*   preserved unknown placeholders
 */

export const PROJECT_TRUTH_KEYS = {
  // brand.*
  BRAND_NAME: 'brand.name',
  BRAND_ROLE: 'brand.role',
  BRAND_PERSONALITY: 'brand.personality',

  // business.*
  BUSINESS_INDUSTRY: 'business.industry',
  BUSINESS_MODEL: 'business.model',
  PRICE_POSITIONING: 'business.price_positioning',

  // audience.*
  AUDIENCE_PRIMARY: 'audience.primary',
  AUDIENCE_USAGE_SCENARIOS: 'audience.usage_scenarios',

  // product.*
  PRODUCT_CORE_PRODUCTS: 'product.core_products',
  PRODUCT_SERVICES: 'product.services',
  PRODUCT_TOUCHPOINTS: 'product.touchpoints',
  PRODUCT_PACKAGING_STRUCTURES: 'product.packaging_structures',
  PRODUCT_BUSINESS_TOUCHPOINTS: 'product.business_touchpoints',

  // visual.*
  VISUAL_PREFERENCES: 'visual.preferences',
  VISUAL_SOURCE_STATE: 'visual.source_state',

  // locked.*
  LOCKED_LOGO: 'locked.logo',
  LOCKED_FACTS: 'locked.facts',
  LOCKED_ASSETS: 'locked.assets',

  // constraint.*
  CONSTRAINT_PROHIBITED_DIRECTIONS: 'constraint.prohibited_directions',
  CONSTRAINT_VISUAL_CONSTRAINTS: 'constraint.visual_constraints',

  // unknown.*
  UNKNOWN_FIELDS: 'unknown.fields',
} as const;

export type ProjectTruthKey =
  typeof PROJECT_TRUTH_KEYS[keyof typeof PROJECT_TRUTH_KEYS];

/**
 * Stable identity-critical keys — these are the keys whose loss/contamination
 * is a hard CI-2 acceptance failure.
 */
export const IDENTITY_KEYS: readonly ProjectTruthKey[] = [
  PROJECT_TRUTH_KEYS.BRAND_NAME,
  PROJECT_TRUTH_KEYS.BRAND_ROLE,
  PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY,
  PROJECT_TRUTH_KEYS.BUSINESS_MODEL,
];

export const LOCKED_KEYS: readonly ProjectTruthKey[] = [
  PROJECT_TRUTH_KEYS.LOCKED_LOGO,
  PROJECT_TRUTH_KEYS.LOCKED_FACTS,
  PROJECT_TRUTH_KEYS.LOCKED_ASSETS,
];

/**
 * Reference-derived keys — must NEVER contaminate current project truth
 * unless the current permission contracts allow it. We assume the default
 * is `do not contaminate`; reference carriers explicitly tag their facts
 * with `isReferenceFact=true` and the assembler honors the guard.
 */
export const REFERENCE_GUARDED_KEYS: readonly ProjectTruthKey[] = [
  PROJECT_TRUTH_KEYS.BRAND_NAME,
  PROJECT_TRUTH_KEYS.BRAND_ROLE,
];
