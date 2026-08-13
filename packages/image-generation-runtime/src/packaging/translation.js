// Packaging Translation — P2-A.
//
// Capability boundary:
//   Shared Visual Truth (Visual Analysis / Project Context / Locked Assets /
//   Explicit User Constraints) + Shot Contract + Reference Role + Generation
//   Mode + Provider Capability Profile
//     → PackagingTranslation
//
// This module is the production translation layer for the packaging target.
// It does not reason, does not call a model, and does not import any Golden
// project fixture, Golden prompt, or evaluation asset (P2 spec §28 §29 §58).
//
// Architectural position (per P2 spec §8 §9 §48):
//   - target is fixed to 'packaging' (cannot be overridden by input)
//   - generationMode is one of 'analysis_led' | 'reference_first'
//   - shotContract.id is one of the three V1 frozen shot ids
//   - lockedAssets is the strongest precedence surface (P2 spec §16)
//   - referencePolicy declares which reference roles are active and the
//     precedence chain (P2 spec §12 §15)
//   - validation is exposed as a separate capability (validation.js) so
//     upstream callers can pre-check before the compiler runs
//
// Stop conditions honoured here (P2 spec §20 §58):
//   - does not hardcode any Golden project literal (color / motif / range)
//   - does not import evaluation assets or Golden fixtures
//   - does not clone Space runtime (zero new runtime surface)
//
// Component version follows the P2 spec §4 capability-naming discipline.

import {
  PACKAGING_SHOT_CONTRACT_IDS,
  SHOT_CONTRACT_INVALID,
  getPackagingShotContract,
} from './contracts.js';

export const PACKAGING_TRANSLATION_VERSION = '1.0.0';
export const PACKAGING_TRANSLATION_TARGET = 'packaging';

export const PACKAGING_GENERATION_MODES = Object.freeze([
  'analysis_led',
  'reference_first',
]);

// Re-exported for downstream consumers (e.g. P2-B tests, future Compiler)
// that need to enumerate the three V1 frozen shot ids without depending
// on contracts.js directly. The single source of truth lives in
// contracts.js; this re-export is a convenience, not a parallel authority.
export { PACKAGING_SHOT_CONTRACT_IDS };

// Per P2 spec §14. These six reference roles are the minimum required for
// Packaging reference assignment. Roles are capability-named; no Golden
// project wording.
export const PACKAGING_REFERENCE_ROLES = Object.freeze([
  'high_fidelity_visual_reference',
  'structure_reference',
  'material_reference',
  'composition_reference',
  'style_reference',
  'product_identity_reference',
]);

// Per P2 spec §12. The reference precedence chain is frozen. Code that
// needs to compare precedence must compare index in this array; lower
// index = stronger authority.
export const PACKAGING_REFERENCE_PRECEDENCE = Object.freeze([
  'locked_assets',
  'explicit_user_constraints',
  'reference_image',
  'packaging_translation',
  'analysis_context',
  'model_defaults',
]);

// Per P2 spec §21 §22 §23. The single source of truth for shot
// contracts lives in contracts.js. This module is a CONSUMER of that
// authority, not a parallel definition site. Re-imports above (top of
// file) bind us to the canonical ids + invalidation code.

function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return [String(value).trim()].filter(Boolean);
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function buildShotContract(input) {
  const raw = asObject(input?.shotContract);
  const id = asString(raw.id);
  // getPackagingShotContract throws SHOT_CONTRACT_INVALID for unknown ids.
  // We use a try/catch to preserve the legacy-style message prefix the
  // rest of the upstream P2 surface expects ("SHOT_CONTRACT_INVALID: ...").
  let contract;
  try {
    contract = getPackagingShotContract(id);
  } catch (err) {
    // Re-throw with the same code/structure; contracts.js already throws
    // SHOT_CONTRACT_INVALID, so this catch is mostly defensive in case
    // the canonical authority is ever swapped.
    if (err && err.code === SHOT_CONTRACT_INVALID) throw err;
    throw err;
  }
  const mustProve = asArray(raw.mustProve).length ? asArray(raw.mustProve) : Array.from(contract.mustProve);
  const compilerRequirements = asArray(raw.compilerRequirements).length
    ? asArray(raw.compilerRequirements)
    : Array.from(contract.compilerRequirements);
  return {
    id,
    purpose: asString(raw.purpose, contract.purpose),
    mustProve,
    compilerRequirements,
    // Carry the per-shot structure / opening / sku / presentation
    // strategy forward verbatim from the single source of truth so the
    // Translation shape includes the full Production Representation
    // (P2 spec §9 §21 §22 §23 §49). The Compiler is the eventual
    // consumer; today the Translation layer is the safe carrier.
    structureRequirements: contract.structureRequirements,
    presentationStrategy: contract.presentationStrategy,
    openingLayout: contract.openingLayout,
    skuStrategy: contract.skuStrategy,
  };
}

function buildLockedAssets(input) {
  const raw = asObject(input?.lockedAssets);
  const brand = asObject(raw.brand);
  const logo = asObject(raw.logo);
  const productIdentity = asObject(raw.productIdentity);
  const category = asObject(raw.category);
  const structure = asObject(raw.structure);
  const mandatoryCopy = asObject(raw.mandatoryCopy);
  const confirmedComponents = asObject(raw.confirmedComponents);

  // Fail-closed: presence inside the lockedAssets block is the act of
  // declaring the field locked. Explicit `locked: false` is logically
  // inconsistent with the structural decision and is rejected (P2 spec
  // §16 "Production code must not silently rewrite them.").
  const lockedFields = [
    ['brand', brand],
    ['logo', logo],
    ['productIdentity', productIdentity],
    ['category', category],
    ['structure', structure],
    ['mandatoryCopy', mandatoryCopy],
    ['confirmedComponents', confirmedComponents],
  ];
  for (const [field, value] of lockedFields) {
    if (value && value.locked === false) {
      const err = new Error(
        `PACKAGING_TRANSLATION_INVALID: lockedAssets.${field} cannot be marked unlocked; presence in lockedAssets is the lock declaration`,
      );
      err.code = 'PACKAGING_TRANSLATION_INVALID';
      err.issues = [`locked_assets_unlocked:${field}`];
      throw err;
    }
  }

  return {
    brand: {
      name: asString(brand.name),
      locked: true,
    },
    logo: {
      present: asBoolean(logo.present, false),
      usageMode: ['reserved', 'rendered'].includes(logo.usageMode) ? logo.usageMode : 'reserved',
      locked: true,
    },
    productIdentity: {
      name: asString(productIdentity.name),
      locked: true,
    },
    category: {
      name: asString(category.name),
      locked: true,
    },
    structure: {
      formFactor: asString(structure.formFactor),
      locked: true,
    },
    mandatoryCopy: {
      items: asArray(mandatoryCopy.items),
      locked: true,
    },
    confirmedComponents: {
      items: asArray(confirmedComponents.items),
      locked: true,
    },
  };
}

function buildProjectIdentity(input) {
  const raw = asObject(input?.projectIdentity);
  return {
    brandName: asString(raw.brandName),
    industry: asString(raw.industry),
    brandRole: asString(raw.brandRole),
    productIdentity: asString(raw.productIdentity),
  };
}

function buildStructure(input) {
  const raw = asObject(input?.structure);
  return {
    formFactor: asString(raw.formFactor),
    primaryPackage: asString(raw.primaryPackage),
    structuralFeatures: asArray(raw.structuralFeatures),
    openingLogic: asArray(raw.openingLogic),
    arrangement: asArray(raw.arrangement),
  };
}

function buildVisualDirection(input) {
  const raw = asObject(input?.visualDirection);
  return {
    summary: asString(raw.summary),
    intent: asString(raw.intent),
    keywords: asArray(raw.keywords),
  };
}

function buildColorSystem(input) {
  const raw = asObject(input?.colorSystem);
  return {
    base: asArray(raw.base),
    identity: asArray(raw.identity),
    accent: asArray(raw.accent),
    forbidden: asArray(raw.forbidden),
  };
}

function buildMotifSystem(input) {
  const raw = asObject(input?.motifSystem);
  return {
    primary: asArray(raw.primary),
    graphicHierarchy: asArray(raw.graphicHierarchy),
    forbidden: asArray(raw.forbidden),
  };
}

function buildMaterialSystem(input) {
  const raw = asObject(input?.materialSystem);
  return {
    substrate: asArray(raw.substrate),
    craft: asArray(raw.craft),
    forbidden: asArray(raw.forbidden),
  };
}

function buildComposition(input) {
  const raw = asObject(input?.composition);
  return {
    type: asString(raw.type),
    primaryFocus: asString(raw.primaryFocus),
    secondary: asArray(raw.secondary),
  };
}

function buildLighting(input) {
  const raw = asObject(input?.lighting);
  return {
    intent: asString(raw.intent),
    direction: asString(raw.direction),
    quality: asString(raw.quality),
  };
}

function buildCamera(input) {
  const raw = asObject(input?.camera);
  return {
    intent: asString(raw.intent),
    aspectRatio: asString(raw.aspectRatio),
    depthOfField: asString(raw.depthOfField),
    angle: asString(raw.angle),
  };
}

function buildSceneProgram(input) {
  const raw = asObject(input?.sceneProgram);
  return {
    type: asString(raw.type),
    elements: asArray(raw.elements),
  };
}

function buildReferencePolicy(input, generationMode) {
  const raw = asObject(input?.referencePolicy);
  // In reference_first mode the policy must be enabled and a reference is
  // required. In analysis_led mode the policy is allowed to be disabled,
  // but if enabled it must still declare a coherent role set.
  const enabled = asBoolean(raw.enabled, generationMode === 'reference_first');
  const required = asBoolean(raw.required, generationMode === 'reference_first');
  let roles = asArray(raw.roles);
  // Reject unknown roles fail-closed (P2 spec §15 / §58: no implicit fallback).
  const canonicalOrder = PACKAGING_REFERENCE_ROLES;
  const unknown = roles.filter((role) => !canonicalOrder.includes(role));
  if (unknown.length) {
    const err = new Error(
      `PACKAGING_TRANSLATION_INVALID: referencePolicy contains unknown role(s): ${unknown.join(', ')}`,
    );
    err.code = 'PACKAGING_TRANSLATION_INVALID';
    err.issues = [`reference_role_invalid:${unknown.join(',')}`];
    throw err;
  }
  // ---- P2-C TODO (known gap, slated for removal before P2-D) ----
  // P2 spec §14: "Each Reference must have an explicit role. No implicit
  // project-asset fallback."
  //
  // The block below silently fills an empty roles array with
  // ['high_fidelity_visual_reference'] when generationMode is
  // 'reference_first' and policy.enabled is true. That is exactly the
  // kind of implicit role inference §14 forbids. P2-C (Reference Policy)
  // MUST replace it with: empty roles + required=true -> fail closed
  // (REFERENCE_REQUIRED), and upstream must always pass an explicit
  // role for each reference.
  //
  // Do NOT extend this fallback. The P2-A baseline freezes the current
  // behavior so P2-B (this commit) is reversible; P2-C removes it.
  if (!roles.length) {
    roles = enabled
      ? (generationMode === 'reference_first'
        ? ['high_fidelity_visual_reference']
        : [])
      : [];
  }
  // ---- end P2-C TODO ----
  // Deduplicate and freeze role order while preserving the canonical
  // PACKAGING_REFERENCE_ROLES order.
  const roleSet = new Set(roles);
  const orderedRoles = canonicalOrder.filter((role) => roleSet.has(role));
  return {
    enabled,
    required,
    roles: orderedRoles,
    precedence: PACKAGING_REFERENCE_PRECEDENCE.slice(),
  };
}

function buildNegativeConstraints(input) {
  return asArray(input?.negativeConstraints);
}

function buildProviderHints(input) {
  const raw = asObject(input?.providerHints);
  return {
    referenceCount: Math.max(0, Math.floor(asNumber(raw.referenceCount, 0))),
    referenceRolePriority: asArray(raw.referenceRolePriority),
    imageSize: asString(raw.imageSize),
    aspectRatio: asString(raw.aspectRatio),
    qualityProfile: asString(raw.qualityProfile),
  };
}

function buildProvenance(input, generationMode) {
  const raw = asObject(input?.provenance);
  return {
    sourceMode: generationMode,
    inputSources: asArray(raw.inputSources),
    createdAt: asString(raw.createdAt, new Date().toISOString()),
  };
}

/**
 * Build a PackagingTranslation from upstream shared inputs.
 *
 * @param {object} input - shared inputs
 * @param {string} [input.generationMode] - 'analysis_led' | 'reference_first'
 * @param {object} [input.shotContract] - { id, purpose, mustProve, compilerRequirements }
 * @param {object} [input.lockedAssets] - Locked Assets block (P2 spec §16)
 * @param {object} [input.referencePolicy] - Reference Policy block (P2 spec §15)
 * @param {object} [input.projectIdentity] - { brandName, industry, brandRole, productIdentity }
 * @returns {object} PackagingTranslation
 *
 * Throws (structured, with .code) when an upstream invariant is violated.
 * The Translation layer does not perform full validation; that is delegated
 * to validation.js so callers can decide whether to validate eagerly or
 * lazily. Structural checks that would make the output unusable (target,
 * mode, shot contract id) are performed here because they cannot be
 * represented in the output shape at all.
 */
export function createPackagingTranslation(input = {}) {
  const obj = asObject(input);
  const generationMode = asString(obj.generationMode);
  if (!PACKAGING_GENERATION_MODES.includes(generationMode)) {
    const err = new Error(
      `PACKAGING_TRANSLATION_INVALID: generationMode must be one of ${PACKAGING_GENERATION_MODES.join(', ')}; got: ${generationMode || '(empty)'}`,
    );
    err.code = 'PACKAGING_TRANSLATION_INVALID';
    err.issues = [`unsupported_generation_mode:${generationMode || 'empty'}`];
    throw err;
  }

  const translation = {
    schemaVersion: '1.0',
    translationVersion: PACKAGING_TRANSLATION_VERSION,
    target: PACKAGING_TRANSLATION_TARGET, // fixed; not taken from input
    generationMode,

    shotContract: buildShotContract(obj),
    projectIdentity: buildProjectIdentity(obj),
    lockedAssets: buildLockedAssets(obj),

    structure: buildStructure(obj),
    visualDirection: buildVisualDirection(obj),
    colorSystem: buildColorSystem(obj),
    motifSystem: buildMotifSystem(obj),
    materialSystem: buildMaterialSystem(obj),
    composition: buildComposition(obj),
    lighting: buildLighting(obj),
    camera: buildCamera(obj),
    sceneProgram: buildSceneProgram(obj),

    referencePolicy: buildReferencePolicy(obj, generationMode),
    negativeConstraints: buildNegativeConstraints(obj),
    providerHints: buildProviderHints(obj),

    provenance: buildProvenance(obj, generationMode),
  };

  // Ensure the canonical order is the actual iteration order so tests and
  // downstream consumers can rely on it.
  Object.freeze(translation.referencePolicy.roles);
  Object.freeze(translation.referencePolicy.precedence);
  Object.freeze(translation.negativeConstraints);

  return translation;
}
