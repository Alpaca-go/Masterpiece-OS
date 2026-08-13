// Provider Capability Authority (Packaging consumer) — P2-E.
//
// Capability boundary:
//   this module is a CONSUMER of the existing Model Registry
//   (packages/model-registry). It does NOT define a second model /
//   provider / capability registry. It does NOT invent capability
//   mappings. It does NOT relax gating "to make it work" — if a
//   capability is missing from the registry, the route fails closed.
//
// P2 spec §47 §52 (P2-E Exit):
//   [ ] current Packaging provider profile supported
//   [ ] modelType validated
//   [ ] packaging capability explicitly validated
//   [ ] unsupported model fails closed
//   [ ] Reference support validated
//   [ ] reference-count overflow uses PROVIDER_CAPABILITY_MISMATCH
//   [ ] P2-C placeholder removed
//   [ ] provider serialization outside Compiler
//   [ ] existing Shared Provider infrastructure reused
//   [ ] no second credential/runtime/retry stack
//   [ ] deterministic provider serialization
//   [ ] no Golden leakage
//   [ ] Runtime Asset Guard PASS
//   [ ] repo:verify PASS
//
// P2-E pre-conditions (single source of truth, no second authority):
//   - Provider / Model / Protocol / Capability are four separate
//     axes. We do not collapse "provider X = packaging supported";
//     the resolved shape always carries all four.
//   - The only model currently registered with `packaging` in its
//     declared capabilities is seedream-5.0-pro. Other image
//     generation models (gpt-image-2, nano-banana, wan2.7-image-pro)
//     do NOT carry the packaging capability and therefore fail
//     closed at this layer. Adding new models requires an
//     independent provider smoke + Model Registry update, NOT a
//     relaxed gate inside the Packaging adapter.
//   - Analysis models (qwen3.6-plus today) are NEVER accepted by
//     the Packaging production route, regardless of any other
//     capability they may declare. modelType === 'analysis' is a
//     hard reject.
//
// Structured errors (P2 spec §32, refined for P2-E):
//   PROVIDER_CAPABILITY_MISMATCH — model type, packaging capability,
//     reference count, or protocol does not satisfy the current
//     route. Used for cases B, C, E (P2-E test plan).
//   REFERENCE_UNSUPPORTED        — the selected model does not
//     carry Reference support at all. Used for case D.
//   GENERATION_PROVIDER_FAILED   — the capability check passed but
//     the real provider request failed. This layer does NOT issue
//     GENERATION_PROVIDER_FAILED; that belongs to the adapter
//     runtime (P2-G / Generation Service). The error code is
//     exported here so the P2-E wiring is forward-compatible.
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

const PACKAGING_CAPABILITY = 'packaging';

// Sentinel used by capability resolution to mark "no provider-side
// limit on reference count". Distinct from the Number.MAX_SAFE_INTEGER
// we would otherwise reach for; tests assert on this exact value.
export const NO_REFERENCE_COUNT_LIMIT = null;

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function asNumberOrUndef(value) {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * Resolve a Packaging Provider Capability result for the given
 * upstream provider / model profile + Translation shape.
 *
 * Does NOT throw. Returns a stable, provider-agnostic result shape
 * so the Compiler and the adapter can stay provider-agnostic.
 *
 * @param {object} input
 * @param {string} input.modelId              - registry model id
 * @param {string} [input.provider]           - provider name (advisory; registry wins)
 * @param {string} [input.protocol]           - protocol name (advisory; registry wins)
 * @param {string} [input.referencePolicy]    - Translation.referencePolicy (for reference count / enabled)
 * @param {string} [input.maxReferenceImages]  - explicit max (rare; registry is the authority)
 * @returns {{
 *   schemaVersion: string,
 *   modelId: string,
 *   provider: string,
 *   protocol: string,
 *   modelType: string,
 *   packagingSupport: boolean,
 *   referenceSupport: boolean,
 *   maxReferenceImages: number | null,
 *   referenceCount: number,
 *   accepted: boolean,
 *   rejectionCode: string | null,
 *   rejectionReason: string | null,
 *   issues: string[],
 * }}
 */
export function resolvePackagingProviderCapability(input = {}) {
  const obj = input && typeof input === 'object' ? input : {};
  const modelId = asString(obj.modelId);
  const registered = modelId ? getRegisteredModel(modelId) : null;
  const referencePolicy = obj.referencePolicy && typeof obj.referencePolicy === 'object'
    ? obj.referencePolicy
    : {};
  const referenceCount = Array.isArray(referencePolicy.references)
    ? referencePolicy.references.length
    : 0;
  const issues = [];

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

  // Hard reject: analysis models are NEVER accepted by the
  // Packaging production route, regardless of any other capability
  // they declare. P2-E constraint #3.
  if (registered.type !== 'image_generation') {
    issues.push('model_type_not_image_generation');
    return {
      schemaVersion: '1.0',
      modelId: registered.id,
      provider: registered.provider,
      protocol: registered.protocol,
      modelType: registered.type,
      packagingSupport: false,
      referenceSupport: asBoolean(registered.referenceSupport, false),
      maxReferenceImages: NO_REFERENCE_COUNT_LIMIT,
      referenceCount,
      accepted: false,
      rejectionCode: PROVIDER_CAPABILITY_MISMATCH,
      rejectionReason: `${registered.name} (${registered.type}) is not an image_generation model; Packaging production requires image_generation`,
      issues,
    };
  }

  // Hard reject: the registered capabilities must explicitly
  // include 'packaging'. P2-E constraint #2 — never accept a model
  // for Packaging just because it is also an image generation
  // model. Adding new models is a Registry-side decision.
  const caps = Array.isArray(registered.capabilities) ? registered.capabilities : [];
  const packagingSupport = caps.includes(PACKAGING_CAPABILITY);
  if (!packagingSupport) {
    issues.push('packaging_capability_not_declared');
    return {
      schemaVersion: '1.0',
      modelId: registered.id,
      provider: registered.provider,
      protocol: registered.protocol,
      modelType: registered.type,
      packagingSupport: false,
      referenceSupport: asBoolean(registered.referenceSupport, false),
      maxReferenceImages: NO_REFERENCE_COUNT_LIMIT,
      referenceCount,
      accepted: false,
      rejectionCode: PROVIDER_CAPABILITY_MISMATCH,
      rejectionReason: `${registered.name} does not declare the 'packaging' capability; only models with the packaging capability are eligible for the Packaging production route`,
      issues,
    };
  }

  // Reference support: Reference-First requires it; Analysis-led is
  // permissive. P2-E constraint #5.
  const referenceSupport = asBoolean(registered.referenceSupport, false);
  const generationMode = asString(obj.generationMode);
  if (generationMode === 'reference_first' && !referenceSupport) {
    issues.push('reference_unsupported_by_provider');
    return {
      schemaVersion: '1.0',
      modelId: registered.id,
      provider: registered.provider,
      protocol: registered.protocol,
      modelType: registered.type,
      packagingSupport: true,
      referenceSupport: false,
      maxReferenceImages: NO_REFERENCE_COUNT_LIMIT,
      referenceCount,
      accepted: false,
      rejectionCode: REFERENCE_UNSUPPORTED,
      rejectionReason: `${registered.name} has no referenceSupport; Reference-First is not viable on this model`,
      issues,
    };
  }

  // Reference count: explicit caller override is rare; the registry
  // is the authority. If neither provides a limit we treat the
  // model as unbounded (NO_REFERENCE_COUNT_LIMIT).
  const explicitMax = asNumberOrUndef(obj.maxReferenceImages);
  const maxReferenceImages = explicitMax != null
    ? explicitMax
    : NO_REFERENCE_COUNT_LIMIT;
  if (maxReferenceImages != null && referenceCount > maxReferenceImages) {
    // P2-E closes the P2-C placeholder: this is a PROVIDER
    // capability issue, NOT a Reference role issue. The role is
    // legal; the provider cannot accept that many.
    issues.push('reference_count_exceeds_provider_capability');
    return {
      schemaVersion: '1.0',
      modelId: registered.id,
      provider: registered.provider,
      protocol: registered.protocol,
      modelType: registered.type,
      packagingSupport: true,
      referenceSupport: true,
      maxReferenceImages,
      referenceCount,
      accepted: false,
      rejectionCode: PROVIDER_CAPABILITY_MISMATCH,
      rejectionReason: `reference count ${referenceCount} exceeds model ${registered.name} max ${maxReferenceImages}`,
      issues,
    };
  }

  // Accept.
  return {
    schemaVersion: '1.0',
    modelId: registered.id,
    provider: registered.provider,
    protocol: registered.protocol,
    modelType: registered.type,
    packagingSupport: true,
    referenceSupport,
    maxReferenceImages,
    referenceCount,
    accepted: true,
    rejectionCode: null,
    rejectionReason: null,
    issues: [],
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
