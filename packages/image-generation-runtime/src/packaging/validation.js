// Packaging Translation Validator — P2-A.
//
// Capability boundary:
//   PackagingTranslation (from translation.js)
//     → { valid, issues[] }   (inspect path, no throw)
//     → PackagingTranslation (validate path, throws on issues)
//
// The validator answers the questions P2 spec §33 lists:
//   target === packaging
//   valid shot contract
//   valid generation mode
//   required structure evidence
//   locked asset consistency
//   reference requirements
//   required translation fields
//   provider capability compatibility
//
// Structured error code (P2 spec §32): PACKAGING_TRANSLATION_INVALID.
// The thrown error exposes `.code`, `.issues[]`, and `.translation` for
// upstream debug. No generic Error; the upstream contract requires a
// specific code so that production code can branch on it.
//
// Stop conditions honoured (P2 spec §20 §58):
//   - does not call a model
//   - does not mutate the input translation
//   - does not import any Golden project asset
//   - does not silently rewrite Locked Assets
//
// Component version follows the P2 spec §4 capability-naming discipline.

import {
  PACKAGING_TRANSLATION_TARGET,
  PACKAGING_GENERATION_MODES,
  PACKAGING_SHOT_CONTRACT_IDS,
  PACKAGING_REFERENCE_ROLES,
  PACKAGING_REFERENCE_PRECEDENCE,
} from './translation.js';

export const PACKAGING_VALIDATION_VERSION = '1.0.0';

const VALID_LOGO_USAGE_MODES = new Set(['reserved', 'rendered']);

function isString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Inspect a PackagingTranslation for structural and semantic issues.
 * Does NOT throw. Returns { valid, issues[] } where issues[] is the full
 * list of human-readable issue codes (one per detected problem).
 */
export function inspectPackagingTranslation(translation) {
  const issues = [];
  if (!isPlainObject(translation)) {
    issues.push('translation_not_an_object');
    return { valid: false, issues };
  }
  if (translation.target !== PACKAGING_TRANSLATION_TARGET) {
    issues.push(`target_must_be_packaging:got_${translation.target ?? 'missing'}`);
  }
  if (!PACKAGING_GENERATION_MODES.includes(translation.generationMode)) {
    issues.push(`generation_mode_invalid:got_${translation.generationMode ?? 'missing'}`);
  }
  if (!PACKAGING_SHOT_CONTRACT_IDS.includes(translation.shotContract?.id)) {
    issues.push(`shot_contract_id_invalid:got_${translation.shotContract?.id ?? 'missing'}`);
  }
  if (!Array.isArray(translation.shotContract?.mustProve) || translation.shotContract.mustProve.length === 0) {
    issues.push('shot_contract_must_prove_empty');
  }
  if (!Array.isArray(translation.shotContract?.compilerRequirements) || translation.shotContract.compilerRequirements.length === 0) {
    issues.push('shot_contract_compiler_requirements_empty');
  }

  // Locked Assets (P2 spec §16). When the field is "locked:true" the value
  // is required and must be present; otherwise the translation is unsafe to
  // consume downstream.
  const locked = translation.lockedAssets;
  if (!isPlainObject(locked)) {
    issues.push('locked_assets_missing');
  } else {
    if (!isString(locked.brand?.name)) issues.push('locked_assets_brand_name_missing');
    if (locked.brand?.locked !== true) issues.push('locked_assets_brand_not_locked');
    if (!isString(locked.productIdentity?.name)) issues.push('locked_assets_product_identity_missing');
    if (locked.productIdentity?.locked !== true) issues.push('locked_assets_product_identity_not_locked');
    if (!isString(locked.category?.name)) issues.push('locked_assets_category_missing');
    if (locked.category?.locked !== true) issues.push('locked_assets_category_not_locked');
    if (!isString(locked.structure?.formFactor)) issues.push('locked_assets_structure_form_factor_missing');
    if (locked.structure?.locked !== true) issues.push('locked_assets_structure_not_locked');
    if (!VALID_LOGO_USAGE_MODES.has(locked.logo?.usageMode)) {
      issues.push(`locked_assets_logo_usage_mode_invalid:got_${locked.logo?.usageMode ?? 'missing'}`);
    }
    if (locked.logo?.locked !== true) issues.push('locked_assets_logo_not_locked');
    // Locked Asset consistency: brand and productIdentity names must
    // agree with projectIdentity.
    if (isString(locked.brand?.name) && isString(translation.projectIdentity?.brandName)
        && locked.brand.name !== translation.projectIdentity.brandName) {
      issues.push('locked_assets_brand_conflicts_with_project_identity');
    }
    if (isString(locked.productIdentity?.name) && isString(translation.projectIdentity?.productIdentity)
        && locked.productIdentity.name !== translation.projectIdentity.productIdentity) {
      issues.push('locked_assets_product_identity_conflicts_with_project_identity');
    }
  }

  // projectIdentity minimum fields.
  const identity = translation.projectIdentity;
  if (!isPlainObject(identity)) {
    issues.push('project_identity_missing');
  } else {
    if (!isString(identity.brandName)) issues.push('project_identity_brand_name_missing');
    if (!isString(identity.industry)) issues.push('project_identity_industry_missing');
    if (!isString(identity.brandRole)) issues.push('project_identity_brand_role_missing');
  }

  // structure evidence (P2 spec §33 + §34). PACKAGING_STRUCTURE_EVIDENCE_MISSING
  // is the legacy code; here we surface it as a structured inspect issue
  // that the validate path will re-throw with the legacy code when
  // applicable.
  const structure = translation.structure;
  if (!isPlainObject(structure)) {
    issues.push('structure_missing');
  } else if (!isString(structure.formFactor)) {
    issues.push('structure_form_factor_missing');
  } else if (!Array.isArray(structure.structuralFeatures) || structure.structuralFeatures.length === 0) {
    issues.push('structure_evidence_missing');
  }

  // Reference policy (P2 spec §15 §25).
  const refPolicy = translation.referencePolicy;
  if (!isPlainObject(refPolicy)) {
    issues.push('reference_policy_missing');
  } else {
    if (translation.generationMode === 'reference_first') {
      if (refPolicy.enabled !== true) issues.push('reference_policy_disabled_in_reference_first');
      if (refPolicy.required !== true) issues.push('reference_policy_not_required_in_reference_first');
      if (!Array.isArray(refPolicy.roles) || refPolicy.roles.length === 0) {
        issues.push('reference_policy_roles_empty_in_reference_first');
      }
    }
    if (Array.isArray(refPolicy.roles)) {
      const invalid = refPolicy.roles.filter((role) => !PACKAGING_REFERENCE_ROLES.includes(role));
      if (invalid.length) {
        issues.push(`reference_policy_roles_invalid:${invalid.join(',')}`);
      }
    }
    if (Array.isArray(refPolicy.precedence)) {
      const expected = PACKAGING_REFERENCE_PRECEDENCE;
      if (refPolicy.precedence.length !== expected.length
          || refPolicy.precedence.some((value, idx) => value !== expected[idx])) {
        issues.push('reference_policy_precedence_must_match_frozen_chain');
      }
    }
  }

  // providerHints minimum: aspectRatio is required for any provider
  // adapter to serialize correctly.
  const hints = translation.providerHints;
  if (!isPlainObject(hints)) {
    issues.push('provider_hints_missing');
  } else if (!isString(hints.aspectRatio)) {
    issues.push('provider_hints_aspect_ratio_missing');
  }

  // Visual direction is a hard requirement: without it the Translation
  // layer is not actually translating anything. This is a P2-A Exit
  // condition: "the translation exists" requires at least a summary.
  const visualDirection = translation.visualDirection;
  if (!isPlainObject(visualDirection) || !isString(visualDirection.summary)) {
    issues.push('visual_direction_summary_missing');
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Validate a PackagingTranslation. Throws on issues.
 *
 * Thrown error shape:
 *   { code: 'PACKAGING_TRANSLATION_INVALID',
 *     message: 'PACKAGING_TRANSLATION_INVALID: <first issue>',
 *     issues: string[],
 *     translation: <original input reference> }
 *
 * Returns the input translation (unchanged) when valid.
 */
export function validatePackagingTranslation(translation) {
  const result = inspectPackagingTranslation(translation);
  if (result.valid) return translation;

  // For PACKAGING_STRUCTURE_EVIDENCE_MISSING the legacy code is
  // PACKAGING_STRUCTURE_EVIDENCE_MISSING (P2 spec §34). Surface it
  // separately for upstream consumers that already branch on the
  // legacy code.
  const legacy = result.issues.includes('structure_evidence_missing')
    ? 'PACKAGING_STRUCTURE_EVIDENCE_MISSING'
    : 'PACKAGING_TRANSLATION_INVALID';

  const err = new Error(`${legacy}: ${result.issues.join(', ')}`);
  err.code = legacy;
  err.issues = result.issues.slice();
  err.translation = translation;
  throw err;
}
