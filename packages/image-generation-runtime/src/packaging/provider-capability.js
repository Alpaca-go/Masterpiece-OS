// Provider Capability Authority (Packaging consumer) — P2-E Final.
//
// Capability boundary:
//   this module is a CONSUMER of the existing Model Registry
//   (packages/model-registry). It does NOT define a second model /
//   provider / capability registry. It does NOT invent capability
//   mappings. It does NOT relax gating "to make it work" — if a
//   capability is missing from the registry, the route fails closed.
//
// P2 spec §47 §52 (P2-E Exit) + P2-E Finalization Delta item 4:
//
//   - The Model Registry is the SINGLE authority for
//     maxReferenceImages. The capability layer does NOT accept a
//     caller-supplied maxReferenceImages override. If the
//     Registry does not declare one, the layer reports
//     maxReferenceImages = null (unbounded). Synthetic profiles
//     are only available through the pure evaluator
//     `evaluatePackagingCapability`, which tests use to drive
//     gate behaviour without polluting the production Registry.
//
//   - Production code MUST use `resolvePackagingProviderCapability`.
//     The pure evaluator is exported for tests and for future
//     tooling that needs to validate a synthetic profile; it is
//     NOT a back door for the production call site to inject
//     ad-hoc capability data.
//
// Structured errors (P2 spec §32, refined for P2-E):
//   PROVIDER_CAPABILITY_MISMATCH — model type, packaging capability,
//     reference count, or protocol does not satisfy the current
//     route.
//   REFERENCE_UNSUPPORTED        — the selected model does not
//     carry Reference support at all.
//   GENERATION_PROVIDER_FAILED   — capability check passed but
//     the real provider request failed. P2-E exports the constant
//     for forward compatibility; the actual throw site is the
//     Shared Provider runtime (P2-G), not this layer.
//
// Stop conditions honoured (P2 spec §20 §58 §59):
//   - does not invent a second registry
//   - does not relax gating to accept unregistered models
//   - does not import any Golden project asset
//   - does not clone the existing adapter surface

import {
  getRegisteredModel,
  validateModelProfile,
} from '../../../model-registry/src/index.js';

export const PACKAGING_PROVIDER_CAPABILITY_VERSION = '1.0.0';

export const PROVIDER_CAPABILITY_MISMATCH = 'PROVIDER_CAPABILITY_MISMATCH';
export const REFERENCE_UNSUPPORTED = 'REFERENCE_UNSUPPORTED';
// Exported for forward compatibility; the Capability layer does NOT
// itself produce GENERATION_PROVIDER_FAILED. The adapter runtime
// (P2-G) owns the real failure path.
export const GENERATION_PROVIDER_FAILED = 'GENERATION_PROVIDER_FAILED';

// Sentinel: the Model Registry currently does not declare a
// maxReferenceImages for any registered model, so the production
// resolver reports null (unbounded) via the explicit projection
// in resolvePackagingProviderCapability. The synthetic evaluator
// accepts an explicit value for tests. P2-F Finalization Delta
// item 9: this is an EXPLICIT projection (registered.maxReference
// Images ?? NO_REFERENCE_COUNT_LIMIT), NOT an "auto picked up"
// behaviour — adding the field to a future Registry entry will
// be picked up because the projection is explicit, not because
// of a magic auto-bind.
export const NO_REFERENCE_COUNT_LIMIT = null;

const PACKAGING_CAPABILITY = 'packaging';

function isString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}
function isObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}
function asString(v, fallback = '') {
  return isString(v) ? v.trim() : fallback;
}
function asBoolean(v, fallback) {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

// ---------------------------------------------------------------------------
// Pure capability evaluator (synthetic profile; tests + future tooling).
// ---------------------------------------------------------------------------

/**
 * Pure capability evaluator. Accepts a synthetic resolved model
 * profile so tests can exercise gate behaviour without registering
 * a fake model in the production Registry. Production code MUST
 * use `resolvePackagingProviderCapability` instead.
 *
 * @param {object} profile - the resolved model profile
 * @param {string} profile.modelType           - 'image_generation' (any other value -> reject)
 * @param {boolean} profile.packagingSupport   - true iff the model declares the 'packaging' capability
 * @param {boolean} profile.referenceSupport   - true iff the model supports Reference image input
 * @param {number|null} profile.maxReferenceImages - explicit cap, or null (unbounded)
 * @param {string} [generationMode]            - 'analysis_led' | 'reference_first'
 * @param {object} [referencePolicy]            - { enabled, required, references: [...] }
 * @returns {{
 *   schemaVersion, modelId, provider, protocol, modelType,
 *   packagingSupport, referenceSupport, maxReferenceImages,
 *   referenceCount, accepted, rejectionCode, rejectionReason, issues,
 * }}
 */
export function evaluatePackagingCapability(profile, generationMode = '', referencePolicy = {}) {
  const issues = [];
  const referenceCount = Array.isArray(referencePolicy?.references)
    ? referencePolicy.references.length
    : 0;

  // Defensive: a missing profile is rejected fail-closed.
  if (!isObject(profile)) {
    return rejected(PROVIDER_CAPABILITY_MISMATCH, 'profile is not an object', 'profile_not_object', referenceCount, '');
  }

  // Gate 1: modelType MUST be 'image_generation'. Analysis models
  // are NEVER accepted by the Packaging production route (P2-E
  // constraint #3).
  if (profile.modelType !== 'image_generation') {
    issues.push('model_type_not_image_generation');
    return rejected(
      PROVIDER_CAPABILITY_MISMATCH,
      `modelType is ${JSON.stringify(profile.modelType ?? 'missing')}; Packaging production requires image_generation`,
      'model_type_not_image_generation',
      referenceCount,
      profile.modelType ?? '',
    );
  }

  // Gate 2: the profile must explicitly declare the 'packaging'
  // capability. P2-E constraint #2 — never accept a model for
  // Packaging just because it is also an image generation model.
  if (profile.packagingSupport !== true) {
    issues.push('packaging_capability_not_declared');
    return rejected(
      PROVIDER_CAPABILITY_MISMATCH,
      "profile does not declare packagingSupport = true; only models with the packaging capability are eligible",
      'packaging_capability_not_declared',
      referenceCount,
      profile.modelType,
    );
  }

  // Gate 3: Reference support. Reference-First requires it.
  if (generationMode === 'reference_first' && profile.referenceSupport !== true) {
    issues.push('reference_unsupported_by_provider');
    return rejected(
      REFERENCE_UNSUPPORTED,
      'profile.referenceSupport is false; Reference-First is not viable on this profile',
      'reference_unsupported_by_provider',
      referenceCount,
      profile.modelType,
    );
  }

  // Gate 4: reference count must fit the declared max (if any).
  const max = profile.maxReferenceImages;
  if (max != null && referenceCount > max) {
    issues.push('reference_count_exceeds_provider_capability');
    return rejected(
      PROVIDER_CAPABILITY_MISMATCH,
      `reference count ${referenceCount} exceeds profile maxReferenceImages ${max}`,
      'reference_count_exceeds_provider_capability',
      referenceCount,
      profile.modelType,
    );
  }

  // Accept.
  return {
    schemaVersion: '1.0',
    modelId: '',
    provider: '',
    protocol: '',
    modelType: profile.modelType,
    packagingSupport: true,
    referenceSupport: profile.referenceSupport === true,
    maxReferenceImages: max == null ? NO_REFERENCE_COUNT_LIMIT : max,
    referenceCount,
    accepted: true,
    rejectionCode: null,
    rejectionReason: null,
    issues: [],
  };
}

function rejected(rejectionCode, rejectionReason, issue, referenceCount, modelType) {
  return {
    schemaVersion: '1.0',
    modelId: '',
    provider: '',
    protocol: '',
    modelType: modelType || '',
    packagingSupport: false,
    referenceSupport: false,
    maxReferenceImages: NO_REFERENCE_COUNT_LIMIT,
    referenceCount,
    accepted: false,
    rejectionCode,
    rejectionReason,
    issues: [issue],
  };
}

// ---------------------------------------------------------------------------
// Production resolver (Registry authority).
// ---------------------------------------------------------------------------

/**
 * Production resolver. Looks up the registered model by id and
 * delegates to the pure evaluator with a profile built from the
 * Registry. The caller MUST NOT pass a maxReferenceImages override
 * — the Registry is the single authority.
 *
 * @param {object} input
 * @param {string} input.modelId
 * @param {string} [input.generationMode]
 * @param {object} [input.referencePolicy]
 * @returns {object} capability result
 */
export function resolvePackagingProviderCapability(input = {}) {
  const obj = isObject(input) ? input : {};
  const modelId = asString(obj.modelId);
  const generationMode = asString(obj.generationMode);
  const referencePolicy = isObject(obj.referencePolicy) ? obj.referencePolicy : {};
  const referenceCount = Array.isArray(referencePolicy.references)
    ? referencePolicy.references.length
    : 0;

  if (!modelId) {
    return {
      schemaVersion: '1.0',
      modelId: '',
      provider: '',
      protocol: '',
      modelType: '',
      packagingSupport: false,
      referenceSupport: false,
      maxReferenceImages: NO_REFERENCE_COUNT_LIMIT,
      referenceCount,
      accepted: false,
      rejectionCode: PROVIDER_CAPABILITY_MISMATCH,
      rejectionReason: 'modelId is required',
      issues: ['model_id_missing'],
    };
  }

  const registered = getRegisteredModel(modelId);
  if (!registered) {
    return {
      schemaVersion: '1.0',
      modelId,
      provider: '',
      protocol: '',
      modelType: '',
      packagingSupport: false,
      referenceSupport: false,
      maxReferenceImages: NO_REFERENCE_COUNT_LIMIT,
      referenceCount,
      accepted: false,
      rejectionCode: PROVIDER_CAPABILITY_MISMATCH,
      rejectionReason: `model ${modelId} is not registered`,
      issues: ['model_not_registered'],
    };
  }

  // Build the profile from the Registry. maxReferenceImages is
  // an EXPLICIT projection of the Registry field — it is NOT
  // "auto picked up" (P2-F Finalization Delta item 9). The
  // resolver deliberately reads `registered.maxReferenceImages`
  // and falls back to NO_REFERENCE_COUNT_LIMIT only when the
  // Registry does not declare the field. If a future Registry
  // entry adds `maxReferenceImages: N`, the resolver will pick
  // it up because the projection is explicit, not because of a
  // magic auto-bind.
  const profile = {
    modelType: registered.type,
    packagingSupport: Array.isArray(registered.capabilities) && registered.capabilities.includes(PACKAGING_CAPABILITY),
    referenceSupport: asBoolean(registered.referenceSupport, false),
    maxReferenceImages: registered.maxReferenceImages ?? NO_REFERENCE_COUNT_LIMIT,
  };

  const result = evaluatePackagingCapability(profile, generationMode, referencePolicy);
  // Surface the Registry identity on the accepted / rejected
  // result so the caller can branch on modelId / provider /
  // protocol.
  return {
    ...result,
    modelId: registered.id,
    provider: registered.provider,
    protocol: registered.protocol,
  };
}

/**
 * Validate a Packaging Provider Capability. Throws the canonical
 * code on the first rejection. Returns the accepted result
 * unchanged on success.
 */
export function validatePackagingProviderCapability(input) {
  const result = resolvePackagingProviderCapability(input);
  if (result.accepted) return result;
  const err = new Error(`${result.rejectionCode}: ${result.rejectionReason}`);
  err.code = result.rejectionCode;
  err.issues = result.issues.slice();
  err.capability = result;
  throw err;
}

/**
 * Lightweight shape validator for the registered model profile.
 * P2-E constraint #1 forbids a second registry; we delegate to
 * the existing model-registry validateModelProfile.
 */
export function validateRegisteredModelProfile(input) {
  return validateModelProfile(input);
}
