// Packaging Translation Validator — P2-A (refined in P2-C).
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
// P2-C update: the Reference surface is now driven by reference-policy.js
// (the single source of truth for roles, precedence, and the canonical
// REFERENCE_REQUIRED / REFERENCE_ROLE_INVALID / REFERENCE_UNSUPPORTED
// error codes). The validator still inspects the Translation shape for
// defense-in-depth, but fatal reference-policy failures are now thrown
// by translation.js (via resolveReferencePolicy + validateReferencePolicy)
// before the Translation object is returned. The inspect path here
// therefore surfaces advisory issues, not the primary fatal errors.
//
// Structured error code (P2 spec §32): PACKAGING_TRANSLATION_INVALID
// for translation-shape issues. P2-B aligned the shot-id error code
// to the canonical SHOT_CONTRACT_INVALID (no prefixed alias). P2-C
// reference-policy fatal errors use REFERENCE_REQUIRED /
// REFERENCE_ROLE_INVALID / REFERENCE_UNSUPPORTED directly.
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
  if (!isString(translation.shotContract?.aspectRatio)) {
    issues.push('shot_contract_aspect_ratio_missing');
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

  // Reference policy (P2 spec §15 §25, refined in P2-C).
  // The Translation now carries:
  //   - references: [{ assetId, role, source, includeReason? }]
  //   - count: derived from references.length (single authority)
  //   - precedence: frozen 6-layer chain (single source of truth in
  //     reference-policy.js)
  //   - providerCapability: pass-through shape
  // Fatal reference-policy failures (REFERENCE_REQUIRED /
  // REFERENCE_ROLE_INVALID / REFERENCE_UNSUPPORTED) are thrown by
  // translation.js buildReferencePolicy; this inspect is a
  // defense-in-depth check on the resulting shape.
  const refPolicy = translation.referencePolicy;
  if (!isPlainObject(refPolicy)) {
    issues.push('reference_policy_missing');
  } else {
    if (translation.generationMode === 'reference_first') {
      if (refPolicy.enabled !== true) issues.push('reference_policy_disabled_in_reference_first');
      if (refPolicy.required !== true) issues.push('reference_policy_not_required_in_reference_first');
      if (!Array.isArray(refPolicy.references) || refPolicy.references.length === 0) {
        issues.push('reference_policy_references_empty_in_reference_first');
      }
    }
    if (Array.isArray(refPolicy.references)) {
      for (const r of refPolicy.references) {
        if (!isString(r?.assetId)) {
          issues.push('reference_policy_reference_asset_id_missing');
          break;
        }
        if (!isString(r?.role) || !PACKAGING_REFERENCE_ROLES.includes(r.role)) {
          issues.push(`reference_policy_reference_role_invalid:${r?.role ?? 'missing'}`);
          break;
        }
      }
      // Single authority: count MUST equal references.length. If these
      // drift the Translation has been mutated by something other than
      // buildReferencePolicy.
      if (typeof refPolicy.count === 'number'
          && refPolicy.count !== refPolicy.references.length) {
        issues.push(`reference_policy_count_mismatch:count_${refPolicy.count}_references_${refPolicy.references.length}`);
      }
    }
    if (Array.isArray(refPolicy.precedence)) {
      const expected = PACKAGING_REFERENCE_PRECEDENCE;
      if (refPolicy.precedence.length !== expected.length
          || refPolicy.precedence.some((value, idx) => value !== expected[idx])) {
        issues.push('reference_policy_precedence_must_match_frozen_chain');
      }
    }
    if (!isPlainObject(refPolicy.providerCapability)) {
      issues.push('reference_policy_provider_capability_missing');
    }
  }

  // providerHints minimum: aspectRatio is required for any provider
  // adapter to serialize correctly.
  const hints = translation.providerHints;
  if (!isPlainObject(hints)) {
    issues.push('provider_hints_missing');
  } else if (!isString(hints.aspectRatio)) {
    issues.push('provider_hints_aspect_ratio_missing');
  } else if (isString(translation.shotContract?.aspectRatio)
      && hints.aspectRatio !== translation.shotContract.aspectRatio) {
    issues.push(
      `provider_hints_aspect_ratio_mismatch:expected_${translation.shotContract.aspectRatio}_got_${hints.aspectRatio}`,
    );
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
