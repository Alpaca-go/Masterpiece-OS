// Reference Policy — P2-C.
//
// Capability boundary:
//   this module is the SINGLE source of truth for the Packaging Reference
//   Policy: roles, precedence chain, error codes, and the resolution /
//   validation rules that govern how a translation's reference surface
//   is built and validated.
//
// P2 spec §15 §50 (P2-C Exit):
//   [ ] reference roles formalized
//   [ ] each Reference has explicit role
//   [ ] precedence single-source and frozen
//   [ ] missing Reference-First reference fails closed
//   [ ] missing role fails closed
//   [ ] unknown role fails closed
//   [ ] reference count has one authority
//   [ ] provider reference support validated
//   [ ] no implicit project asset fallback
//
// Architectural position (P2 spec §46 §47 + P2-C pre-conditions):
//   reference-policy.js  (owner)
//     -> translation.js   (consumer; carries resolved policy into the
//                          Translation shape)
//     -> future P2-D compiler (consumer; reads count, references, role)
//
// Reference Policy responsibilities (P2 spec §15):
//   - role validation
//   - precedence
//   - count policy
//   - compatibility
//   - fallback behavior
//   - provenance
//   - provider capability check
//
// Stop conditions honoured here (P2 spec §20 §58 §59 STOP-P2-07):
//   - no implicit role fill (each Reference MUST have an explicit role)
//   - no implicit project asset fallback (Reference-First with no
//     references fails closed; no auto-pick from project assets /
//     Golden / Anchor / previous output)
//   - no second runtime
//   - no project-specific literal
//   - no Golden fixture import
//   - referenceCount is DERIVED from resolvedReferences.length;
//     upstream input may not pre-declare it as a parallel authority

export const PACKAGING_REFERENCE_POLICY_VERSION = '1.0.0';

// P2 spec §32 (canonical Reference-Policy error codes; P2-C aligns the
// production code to these and the previous PACKAGING_TRANSLATION_INVALID
// prefix is NOT carried forward for the reference surface).
export const REFERENCE_REQUIRED = 'REFERENCE_REQUIRED';
export const REFERENCE_ROLE_INVALID = 'REFERENCE_ROLE_INVALID';
export const REFERENCE_UNSUPPORTED = 'REFERENCE_UNSUPPORTED';

// P2 spec §14. The six canonical Reference roles. Roles are
// capability-named; no project-specific wording.
export const PACKAGING_REFERENCE_ROLES = Object.freeze([
  'high_fidelity_visual_reference',
  'structure_reference',
  'material_reference',
  'composition_reference',
  'style_reference',
  'product_identity_reference',
]);

const REFERENCE_ROLE_SET = new Set(PACKAGING_REFERENCE_ROLES);

// P2 spec §12. Frozen 6-layer precedence chain. Lower index = stronger
// authority. This is the ONLY definition site for the chain.
export const PACKAGING_REFERENCE_PRECEDENCE = Object.freeze([
  'locked_assets',
  'explicit_user_constraints',
  'reference_image',
  'packaging_translation',
  'analysis_context',
  'model_defaults',
]);

// P2 spec §15 + P2-C pre-condition #3: referenceCount has one authority.
// The policy is the SOLE producer; consumer code MUST read count from
// here (translation.policy.count) and MUST NOT maintain a parallel
// count field on providerHints or anywhere else.
function deriveCount(resolvedReferences) {
  return resolvedReferences.length;
}

// ---- helpers ---------------------------------------------------------------

function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((item) => item).filter((item) => item != null);
  return [value];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asNumberOrUndefined(value) {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function asBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

// ---- resolve + validate ----------------------------------------------------

/**
 * Resolve a Reference Policy from upstream inputs.
 *
 * Does NOT throw on most issues. The returned `issues` array is the full
 * set of human-readable issue codes, and `fatal` is the subset that
 * validateReferencePolicy() will throw. Non-fatal issues are advisory
 * (e.g. duplicate assetId is fatal; a missing provenance source is not).
 *
 * The P2-C pre-conditions on the input surface are:
 *   - `referencePolicy.references` MUST be a list of { assetId, role, ... }
 *   - `referencePolicy.roles` (P2-A's role-list shape) is NO LONGER
 *     accepted. An empty / missing references array in reference_first
 *     mode is a hard fail (REFERENCE_REQUIRED).
 *   - `referencePolicy.enabled` defaults to true in reference_first and
 *     false in analysis_led, but upstream may override.
 *   - `referencePolicy.required` defaults to enabled.
 *   - `providerCapability.referenceSupport` (bool) and optional
 *     `providerCapability.maxReferenceImages` (positive integer) are
 *     the only provider-affecting inputs P2-C validates. Provider-
 *     specific payload serialization is P2-E.
 *
 * @param {object} input
 * @param {string} input.generationMode
 * @param {object} [input.referencePolicy]
 * @param {object} [input.providerCapability]
 * @returns {{
 *   schemaVersion: string,
 *   policyVersion: string,
 *   enabled: boolean,
 *   required: boolean,
 *   references: Array<{assetId: string, role: string, source: string, includeReason?: string}>,
 *   count: number,
 *   precedence: string[],
 *   providerCapability: { referenceSupport: boolean, maxReferenceImages?: number },
 *   issues: string[],
 *   fatal: string[],
 * }}
 */
export function resolveReferencePolicy(input, options = {}) {
  const obj = asObject(input);
  const generationMode = asString(obj.generationMode);
  const raw = asObject(obj.referencePolicy);
  const providerCapabilityRaw = asObject(obj.providerCapability);
  const providerCapability = {
    referenceSupport: asBoolean(providerCapabilityRaw.referenceSupport, false),
    maxReferenceImages: asNumberOrUndefined(providerCapabilityRaw.maxReferenceImages),
  };

  const enabled = asBoolean(raw.enabled, generationMode === 'reference_first');
  const required = asBoolean(raw.required, enabled);

  // Per P2-C pre-condition #2: each Reference must have an explicit role.
  // We DO NOT accept a bare roles[] list anymore. The references array
  // is the only accepted shape and every entry must carry {assetId, role}.
  const rawReferences = Array.isArray(raw.references) ? raw.references : [];
  const issues = [];
  const fatal = [];

  const references = [];
  const seenAssetIds = new Set();
  for (let idx = 0; idx < rawReferences.length; idx += 1) {
    const r = asObject(rawReferences[idx]);
    const assetId = asString(r.assetId);
    const role = asString(r.role);
    if (!assetId) {
      const issue = `reference_asset_id_missing:at_index_${idx}`;
      issues.push(issue);
      fatal.push(issue);
      continue;
    }
    if (seenAssetIds.has(assetId)) {
      const issue = `reference_asset_id_duplicate:${assetId}`;
      issues.push(issue);
      fatal.push(issue);
      continue;
    }
    if (!role) {
      const issue = `reference_role_missing:asset_${assetId}`;
      issues.push(issue);
      fatal.push(issue);
      continue;
    }
    if (!REFERENCE_ROLE_SET.has(role)) {
      const issue = `reference_role_invalid:asset_${assetId}_role_${role}`;
      issues.push(issue);
      fatal.push(issue);
      continue;
    }
    seenAssetIds.add(assetId);
    const ref = {
      assetId,
      role,
      source: asString(r.source, 'user'),
    };
    const includeReason = asString(r.includeReason);
    if (includeReason) ref.includeReason = includeReason;
    references.push(ref);
  }

  // P2 spec §15 + P2-C: missing reference in reference_first + required
  // is a hard fail-closed (REFERENCE_REQUIRED). No implicit fallback to
  // project assets / Golden / Anchor / previous output.
  if (enabled && required && generationMode === 'reference_first' && references.length === 0) {
    const issue = 'reference_required_in_reference_first';
    issues.push(issue);
    fatal.push(issue);
  }

  // P2 spec §15 / §25: provider capability check. P2-C validates the
  // capability; provider-specific payload serialization is P2-E.
  if (enabled && generationMode === 'reference_first' && providerCapability.referenceSupport === false) {
    const issue = 'reference_unsupported_by_provider';
    issues.push(issue);
    fatal.push(issue);
  }
  if (providerCapability.maxReferenceImages != null
      && references.length > providerCapability.maxReferenceImages) {
    const issue = `reference_count_exceeds_provider_capability:count_${references.length}_max_${providerCapability.maxReferenceImages}`;
    issues.push(issue);
    fatal.push(issue);
  }

  return {
    schemaVersion: '1.0',
    policyVersion: PACKAGING_REFERENCE_POLICY_VERSION,
    enabled,
    required,
    references,
    // Single source of truth for count (P2-C pre-condition #3).
    count: deriveCount(references),
    precedence: PACKAGING_REFERENCE_PRECEDENCE.slice(),
    providerCapability: Object.freeze({
      referenceSupport: providerCapability.referenceSupport,
      maxReferenceImages: providerCapability.maxReferenceImages,
    }),
    issues,
    fatal,
  };
}

/**
 * Validate a resolved Reference Policy. Throws the canonical
 * P2 spec §32 code (REFERENCE_REQUIRED / REFERENCE_ROLE_INVALID /
 * REFERENCE_UNSUPPORTED) on the first fatal issue, with .code,
 * .issues, and .policy attached for upstream debug.
 *
 * Returns the resolved policy unchanged on success.
 */
export function validateReferencePolicy(resolved) {
  if (!resolved || resolved.fatal.length === 0) {
    // Either no policy (legacy / disabled) or no fatal issues.
    return resolved;
  }
  const first = resolved.fatal[0];
  let code = REFERENCE_ROLE_INVALID;
  if (first === 'reference_required_in_reference_first') code = REFERENCE_REQUIRED;
  else if (first === 'reference_unsupported_by_provider') code = REFERENCE_UNSUPPORTED;
  const err = new Error(`${code}: ${resolved.fatal.join(', ')}`);
  err.code = code;
  err.issues = resolved.issues.slice();
  err.fatal = resolved.fatal.slice();
  err.policy = resolved;
  throw err;
}

/**
 * Snapshot helper for tests: returns a structural fingerprint of the
 * canonical Reference Policy so a test can pin the production shape.
 */
export function getReferencePolicyFingerprint() {
  return Object.freeze({
    schemaVersion: PACKAGING_REFERENCE_POLICY_VERSION,
    roleCount: PACKAGING_REFERENCE_ROLES.length,
    precedenceDepth: PACKAGING_REFERENCE_PRECEDENCE.length,
    roles: PACKAGING_REFERENCE_ROLES.slice(),
    precedence: PACKAGING_REFERENCE_PRECEDENCE.slice(),
  });
}

// Convenience re-export for downstream consumers that prefer to import
// the canonical roles / precedence from this module directly. P2-A's
// translation.js re-exports these names as well; both surfaces point
// at the same memory (no parallel authority).
export {
  // Marked as re-export so static analyzers do not flag the
  // duplicate identifier; runtime behaviour is single source of
  // truth either way.
};
