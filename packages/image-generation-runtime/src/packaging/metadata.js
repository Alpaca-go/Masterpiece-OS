// Packaging Generation Metadata — P2-F.
//
// Capability boundary:
//   this module is the SINGLE source of truth for the Packaging
//   Generation Metadata surface. It is an independent surface
//   from the Provider Payload (P2-E) and the Provider Request
//   (P2-G). It does NOT enter the Provider Request.
//
// P2 spec §47 §53 (P2-F Exit) + the P2-F transition rules:
//
//   - Metadata records decisions; Metadata does not make
//     decisions. Every field on the metadata surface is sourced
//     from a canonical upstream output (Translation / Compiled /
//     Capability / Adapter Payload). The metadata module does NOT
//     re-parse raw Visual Analysis / raw project assets / raw
//     references / raw model config.
//
//   - The Shared Compile Fingerprint is integrated through the
//     existing Shared Core (packages/image-generation-runtime/src/
//     deliverables/compile-fingerprint.js). P2-F does NOT define
//     a second fingerprint algorithm; it reuses createCompileFingerprint
//     / stableHash / verifyCompileFingerprint and documents the
//     Packaging -> Shared sourceBundle mapping.
//
//   - Provider Payload is timestamp-free and deterministic
//     (P2-E Finalization). Generation Metadata is traceable and
//     carries an audit timestamp (`createdAt`). The two surfaces
//     do not mix.
//
//   - Runtime noise (createdAt / timestamp / runId / UUID / local
//     path / temp path / cache path / API key / access token) is
//     stripped from semantic hash inputs during sourceBundle
//     normalization. `provenance.createdAt` on the Translation
//     is NOT in the sourceBundle; the same semantic input at
//     09:00 and 10:00 produces the same 5 semantic hashes.
//
// Stop conditions honoured (P2 spec §20 §58 §59):
//   - does not call a model
//   - does not import any Golden project asset
//   - does not invent a second fingerprint algorithm
//   - does not silently rewrite Locked Assets
//   - does not enter the Provider Request
//   - does not leak secret fields (allowlist construction)
//
// Component version (P2 spec §4 capability-naming discipline).

import { PACKAGING_TRANSLATION_VERSION } from './translation.js';
import { PACKAGING_SHOT_CONTRACT_VERSION } from './contracts.js';
import { PACKAGING_REFERENCE_POLICY_VERSION } from './reference-policy.js';
import { PACKAGING_COMPILER_VERSION } from './compiler.js';
import {
  PACKAGING_PROVIDER_CAPABILITY_VERSION,
} from './provider-capability.js';
import {
  PACKAGING_PROVIDER_ADAPTER_VERSION,
} from './provider-adapter.js';
import {
  createCompileFingerprint,
  verifyCompileFingerprint,
  stableHash as sharedStableHash,
} from '../deliverables/compile-fingerprint.js';

export const PACKAGING_METADATA_VERSION = '1.0.0';
export const PACKAGING_METADATA_INVALID = 'PACKAGING_METADATA_INVALID';

// Component-version manifest. Sourced from the canonical module
// output; the caller cannot override these (P2-F constraint #4:
// "不要让 caller 自己随便传 ... 造成版本 spoof").
const COMPONENT_VERSION_MANIFEST = Object.freeze({
  schemaVersion: '1.0',
  metadataVersion: PACKAGING_METADATA_VERSION,
  contractVersion: PACKAGING_SHOT_CONTRACT_VERSION,
  translationVersion: PACKAGING_TRANSLATION_VERSION,
  referencePolicyVersion: PACKAGING_REFERENCE_POLICY_VERSION,
  compilerVersion: PACKAGING_COMPILER_VERSION,
  providerCapabilityVersion: PACKAGING_PROVIDER_CAPABILITY_VERSION,
  providerAdapterVersion: PACKAGING_PROVIDER_ADAPTER_VERSION,
});

// Secret field deny-list (P2-F constraint #15). The metadata
// builder is allowlist-only; the deny-list is a defense in depth
// for runtime / upstream regression.
const SECRET_FIELD_DENY_LIST = Object.freeze([
  'apiKey', 'accessToken', 'authorization', 'cookie', 'secret',
  'credential', 'masterKey', 'password', 'token', 'bearer',
  'privateKey', 'api_key', 'access_token',
]);

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function asString(v, fallback = '') {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function asArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.slice();
  return [v];
}

// ---------------------------------------------------------------------------
// sourceBundle normalization (P2-F constraints #9, #10, #11, #12, #13)
// ---------------------------------------------------------------------------

/**
 * Build the Shared sourceBundle from the Translation. Strips
 * runtime noise (createdAt / timestamp / local path / UUID /
 * runId) and only carries semantic fields. The same semantic
 * Translation at 09:00 and 10:00 produces the same sourceBundle
 * (and therefore the same sourceBundleHash).
 */
function buildSharedSourceBundle(translation) {
  if (!isPlainObject(translation)) {
    throw newError('translation is not an object');
  }
  const la = isPlainObject(translation.lockedAssets) ? translation.lockedAssets : {};
  // Note: we carry Locked Asset NAME / FORMFACTOR / COPY etc.
  // because the spec requires fingerprint to react to Locked
  // Asset content changes. We do NOT carry createdAt, runId, or
  // local path noise.
  return {
    target: asString(translation.target),
    generationMode: asString(translation.generationMode),
    shotContractId: asString(translation.shotContract?.id),
    projectIdentity: pickProjectIdentity(translation.projectIdentity),
    lockedAssets: pickLockedAssetsForHash(la),
    structure: pickStructure(translation.structure),
    visualDirection: pickVisualDirection(translation.visualDirection),
    colorSystem: pickColorSystem(translation.colorSystem),
    motifSystem: pickMotifSystem(translation.motifSystem),
    materialSystem: pickMaterialSystem(translation.materialSystem),
    composition: pickComposition(translation.composition),
    lighting: pickLighting(translation.lighting),
    camera: pickCamera(translation.camera),
    sceneProgram: pickSceneProgram(translation.sceneProgram),
    negativeConstraints: asArray(translation.negativeConstraints),
    providerHints: pickProviderHints(translation.providerHints),
    // EXCLUDED: provenance.createdAt, provenance.inputSources,
    // any local path / temp / UUID / runId.
  };
}

function pickProjectIdentity(pi) {
  if (!isPlainObject(pi)) return {};
  return {
    brandName: asString(pi.brandName),
    industry: asString(pi.industry),
    brandRole: asString(pi.brandRole),
    productIdentity: asString(pi.productIdentity),
  };
}

function pickLockedAssetsForHash(la) {
  if (!isPlainObject(la)) return {};
  return {
    brand: la.brand?.locked === true ? { name: asString(la.brand.name), locked: true } : { locked: false },
    logo: la.logo?.locked === true
      ? { usageMode: asString(la.logo.usageMode), present: la.logo.present === true, locked: true }
      : { locked: false },
    productIdentity: la.productIdentity?.locked === true
      ? { name: asString(la.productIdentity.name), locked: true }
      : { locked: false },
    category: la.category?.locked === true
      ? { name: asString(la.category.name), locked: true }
      : { locked: false },
    structure: la.structure?.locked === true
      ? { formFactor: asString(la.structure.formFactor), locked: true }
      : { locked: false },
    mandatoryCopy: la.mandatoryCopy?.locked === true
      ? { items: asArray(la.mandatoryCopy.items), locked: true }
      : { locked: false },
    confirmedComponents: la.confirmedComponents?.locked === true
      ? { items: asArray(la.confirmedComponents.items), locked: true }
      : { locked: false },
  };
}

function pickStructure(s) {
  if (!isPlainObject(s)) return {};
  return {
    formFactor: asString(s.formFactor),
    primaryPackage: asString(s.primaryPackage),
    structuralFeatures: asArray(s.structuralFeatures),
    openingLogic: asArray(s.openingLogic),
    arrangement: asArray(s.arrangement),
  };
}

function pickVisualDirection(vd) {
  if (!isPlainObject(vd)) return {};
  return {
    summary: asString(vd.summary),
    intent: asString(vd.intent),
    keywords: asArray(vd.keywords),
  };
}

function pickColorSystem(cs) {
  if (!isPlainObject(cs)) return {};
  return {
    base: asArray(cs.base),
    identity: asArray(cs.identity),
    accent: asArray(cs.accent),
    forbidden: asArray(cs.forbidden),
  };
}

function pickMotifSystem(ms) {
  if (!isPlainObject(ms)) return {};
  return {
    primary: asArray(ms.primary),
    graphicHierarchy: asArray(ms.graphicHierarchy),
    forbidden: asArray(ms.forbidden),
  };
}

function pickMaterialSystem(ms) {
  if (!isPlainObject(ms)) return {};
  return {
    substrate: asArray(ms.substrate),
    craft: asArray(ms.craft),
    forbidden: asArray(ms.forbidden),
  };
}

function pickComposition(c) {
  if (!isPlainObject(c)) return {};
  return { type: asString(c.type), primaryFocus: asString(c.primaryFocus), secondary: asArray(c.secondary) };
}

function pickLighting(l) {
  if (!isPlainObject(l)) return {};
  return { intent: asString(l.intent), direction: asString(l.direction), quality: asString(l.quality) };
}

function pickCamera(c) {
  if (!isPlainObject(c)) return {};
  return {
    intent: asString(c.intent),
    aspectRatio: asString(c.aspectRatio),
    depthOfField: asString(c.depthOfField),
    angle: asString(c.angle),
  };
}

function pickSceneProgram(sp) {
  if (!isPlainObject(sp)) return {};
  return { type: asString(sp.type), elements: asArray(sp.elements) };
}

function pickProviderHints(ph) {
  if (!isPlainObject(ph)) return {};
  return {
    aspectRatio: asString(ph.aspectRatio),
    imageSize: asString(ph.imageSize),
    qualityProfile: asString(ph.qualityProfile),
  };
}

// ---------------------------------------------------------------------------
// referencePlanIdentity (Shared Core's helper uses
// { selected, analysisOnly, excluded }; P2-F feeds the Translation's
// resolved referencePolicy with explicit assetId+role identity)
// ---------------------------------------------------------------------------

function buildReferencePlanForHash(translation) {
  const rp = isPlainObject(translation.referencePolicy) ? translation.referencePolicy : {};
  return {
    selected: asArray(rp.references).map((r) => ({
      assetId: asString(r.assetId),
      role: asString(r.role),
    })),
    analysisOnly: [],
    excluded: [],
  };
}

// ---------------------------------------------------------------------------
// Locked Asset status (P2-F constraint #7)
// ---------------------------------------------------------------------------

function buildLockedAssetStatus(translation) {
  const la = isPlainObject(translation.lockedAssets) ? translation.lockedAssets : {};
  const fields = [
    ['brand', la.brand],
    ['logo', la.logo],
    ['productIdentity', la.productIdentity],
    ['category', la.category],
    ['structure', la.structure],
    ['mandatoryCopy', la.mandatoryCopy],
    ['confirmedComponents', la.confirmedComponents],
  ];
  const out = {};
  let allRequiredLocked = true;
  for (const [name, value] of fields) {
    const locked = isPlainObject(value) && value.locked === true;
    out[name] = {
      locked,
      present: isPlainObject(value) ? (value.present !== false) : false,
    };
    if (!locked) allRequiredLocked = false;
  }
  return { status: out, allRequiredLocked };
}

// ---------------------------------------------------------------------------
// Secret-safety scan (P2-F constraint #15)
// ---------------------------------------------------------------------------

function scanForSecretFields(value, path = '') {
  const hits = [];
  if (value == null) return hits;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      hits.push(...scanForSecretFields(value[i], `${path}[${i}]`));
    }
    return hits;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const lower = k.toLowerCase();
      // Case-insensitive substring match. The deny-list already
      // contains both 'apiKey' and 'api_key' spellings; matching
      // is case-insensitive so 'APIKEY' / 'apikey' / 'apiKey' all
      // hit.
      if (SECRET_FIELD_DENY_LIST.some((needle) => lower.includes(needle.toLowerCase()))) {
        hits.push(`${path}.${k}`);
      }
      hits.push(...scanForSecretFields(v, `${path}.${k}`));
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the canonical Packaging Generation Metadata. The metadata
 * is an allowlist construction sourced from the canonical
 * upstream outputs (Translation / Compiled / Capability / Adapter
 * Payload). The metadata carries:
 *
 *   - Identity block (target / generationMode / shotContractId /
 *     schemaVersion / metadataVersion)
 *   - Component-version manifest (6 component versions +
 *     metadataVersion; all sourced from canonical module output)
 *   - Provider/Model snapshot (modelId / provider / protocol /
 *     modelType / packagingSupport / referenceSupport /
 *     maxReferenceImages)
 *   - Reference identity (assetId + role + source; assetId + role
 *     are the semantic identity; source is metadata-only)
 *   - Locked Asset status (7 categories; allRequiredLocked)
 *   - Source map (promptSourceMap + promptBlockOrder; 14 block
 *     ids complete)
 *   - Shared Compile Fingerprint (5 semantic hashes + compiledAt
 *     audit timestamp; createdAt == compiledAt; semantic hashes
 *     are timestamp-free)
 *
 * @param {object} input
 * @param {object} input.translation - the validated PackagingTranslation
 * @param {object} input.compiled    - the output of compilePackagingPrompt
 * @param {object} input.capability  - the accepted capability result
 * @param {object} input.payload     - the output of buildPackagingProviderPayload
 * @param {string} [input.createdAt]  - audit timestamp; defaults to Date.now().toISOString()
 * @returns {object} the metadata surface
 *
 * Throws PACKAGING_METADATA_INVALID on consistency drift.
 */
export function buildPackagingGenerationMetadata(input = {}) {
  const obj = isPlainObject(input) ? input : {};
  const { translation, compiled, capability, payload } = obj;
  if (!isPlainObject(translation)) throw newError('translation is not an object');
  if (!isPlainObject(compiled)) throw newError('compiled is not an object');
  if (!isPlainObject(capability)) throw newError('capability is not an object');
  if (!isPlainObject(payload)) throw newError('payload is not an object');

  // Secret-safety scan on ALL inputs (P2-F constraint #15: "Metadata
  // 根本不接触 secret input"). The metadata is allowlist-built;
  // the safest policy is to refuse any input that carries a
  // secret-like field at all.
  const inputSecretHits = [
    ...scanForSecretFields(translation, 'translation'),
    ...scanForSecretFields(compiled, 'compiled'),
    ...scanForSecretFields(capability, 'capability'),
    ...scanForSecretFields(payload, 'payload'),
  ];
  if (inputSecretHits.length) {
    throw newError(`upstream input contains secret-like fields: ${inputSecretHits.join(', ')}`);
  }

  // Consistency gate (P2-F constraint #18).
  const drift = consistencyGate(translation, compiled, capability, payload);
  if (drift.length) {
    throw newError(`metadata consistency drift: ${drift.join(', ')}`);
  }

  // Identity block.
  const target = asString(translation.target);
  const generationMode = asString(translation.generationMode);
  const shotContractId = asString(translation.shotContract?.id);
  if (target !== 'packaging') throw newError('metadata.target must be "packaging"');
  if (!shotContractId) throw newError('metadata.shotContractId is required');

  // Locked Asset status.
  const lockedAsset = buildLockedAssetStatus(translation);

  // Reference identity (assetId + role + source; source is
  // metadata-only, assetId + role are the semantic identity).
  const references = asArray(translation.referencePolicy?.references).map((r) => ({
    assetId: asString(r.assetId),
    role: asString(r.role),
    source: asString(r.source),
  }));

  // Provider/Model snapshot.
  const providerModel = {
    modelId: asString(capability.modelId),
    provider: asString(capability.provider),
    protocol: asString(capability.protocol),
    modelType: asString(capability.modelType),
    packagingSupport: capability.packagingSupport === true,
    referenceSupport: capability.referenceSupport === true,
    maxReferenceImages: capability.maxReferenceImages ?? null,
    referenceCount: references.length,
  };

  // Source map.
  const promptSourceMap = isPlainObject(compiled.sourceMap) ? compiled.sourceMap : {};
  const promptBlockOrder = Array.isArray(compiled.blockOrder) ? compiled.blockOrder.slice() : [];

  // Shared Compile Fingerprint.
  const sourceBundle = buildSharedSourceBundle(translation);
  const referencePlan = buildReferencePlanForHash(translation);
  const userIntent = { generationMode, shotContractId };
  const deliverable = { target, shotContractId, contractVersion: COMPONENT_VERSION_MANIFEST.contractVersion };
  const compiledPrompt = {
    blockOrder: promptBlockOrder,
    // The compiled prompt is rendered as the canonical 14-block
    // topology; we do not include the prompt string here because
    // the Adapter owns the flattened string and the Metadata does
    // not duplicate it.
    blockIds: promptBlockOrder,
  };
  const createdAt = asString(obj.createdAt, new Date().toISOString());
  const sharedFingerprint = createCompileFingerprint({
    sourceBundle,
    userIntent,
    deliverable,
    referencePlan,
    compiledPrompt,
    compiledAt: createdAt,
  });

  const metadata = {
    schemaVersion: '1.0',
    metadataVersion: PACKAGING_METADATA_VERSION,

    target,
    generationMode,
    shotContractId,

    componentVersions: { ...COMPONENT_VERSION_MANIFEST },

    providerModel,

    references,
    referenceCount: references.length,

    lockedAssetStatus: lockedAsset.status,
    allRequiredLocked: lockedAsset.allRequiredLocked,

    promptSourceMap,
    promptBlockOrder,
    promptBlockCount: promptBlockOrder.length,

    compileFingerprint: {
      sourceBundleHash: sharedFingerprint.sourceBundleHash,
      userIntentHash: sharedFingerprint.userIntentHash,
      deliverableHash: sharedFingerprint.deliverableHash,
      referencePlanHash: sharedFingerprint.referencePlanHash,
      compiledPromptHash: sharedFingerprint.compiledPromptHash,
      compiledAt: sharedFingerprint.compiledAt,
    },

    // Audit timestamp. NOT in the semantic hash inputs; carries
    // only the most recent compileAt.
    createdAt,

    // Provider payload fingerprint (for the audit trail; does
    // NOT leak the payload content). The payload itself is
    // timestamp-free (P2-E Finalization), so this hash is
    // deterministic across calls given the same inputs.
    payloadFingerprint: computePayloadFingerprint(payload),
  };

  // Secret-safety scan (P2-F constraint #15). Allowlist
  // construction should already prevent secrets, but we run a
  // final scan as defense in depth.
  const secretHits = scanForSecretFields(metadata);
  if (secretHits.length) {
    throw newError(`metadata contains secret-like fields: ${secretHits.join(', ')}`);
  }

  return Object.freeze(metadata);
}

// ---------------------------------------------------------------------------
// Consistency gate (P2-F constraint #18)
// ---------------------------------------------------------------------------

function consistencyGate(translation, compiled, capability, payload) {
  const drift = [];
  if (payload.modelId !== asString(capability.modelId)) drift.push('payload.modelId != capability.modelId');
  if (payload.provider !== asString(capability.provider)) drift.push('payload.provider != capability.provider');
  if (payload.protocol !== asString(capability.protocol)) drift.push('payload.protocol != capability.protocol');
  if (payload.referenceCount !== referencesLength(translation)) {
    drift.push(`payload.referenceCount (${payload.referenceCount}) != translation.referencePolicy.references.length (${referencesLength(translation)})`);
  }
  if (payload.adapterVersion !== PACKAGING_PROVIDER_ADAPTER_VERSION) {
    drift.push(`payload.adapterVersion (${payload.adapterVersion}) != ${PACKAGING_PROVIDER_ADAPTER_VERSION}`);
  }
  if (compiled.compilerVersion !== PACKAGING_COMPILER_VERSION) {
    drift.push(`compiled.compilerVersion (${compiled.compilerVersion}) != ${PACKAGING_COMPILER_VERSION}`);
  }
  if (compiled.shotContractId !== asString(translation.shotContract?.id)) {
    drift.push('compiled.shotContractId != translation.shotContract.id');
  }
  if (compiled.generationMode !== asString(translation.generationMode)) {
    drift.push('compiled.generationMode != translation.generationMode');
  }
  if (compiled.target !== asString(translation.target)) {
    drift.push('compiled.target != translation.target');
  }
  if (capability.referenceCount !== referencesLength(translation)) {
    drift.push(`capability.referenceCount (${capability.referenceCount}) != translation.referencePolicy.references.length (${referencesLength(translation)})`);
  }
  if (payload.references.length !== referencesLength(translation)) {
    drift.push(`payload.references.length (${payload.references.length}) != translation.referencePolicy.references.length (${referencesLength(translation)})`);
  }
  return drift;
}

function referencesLength(translation) {
  return Array.isArray(translation?.referencePolicy?.references)
    ? translation.referencePolicy.references.length
    : 0;
}

function computePayloadFingerprint(payload) {
  // Deterministic hash of the Adapter Payload. The payload is
  // already Object.freeze'd and timestamp-free (P2-E
  // Finalization), so this is stable across calls.
  // We reuse the Shared stableHash via a tiny inline
  // canonicalization (the same JSON canonical sort order the
  // Shared Core uses) without duplicating the algorithm.
  return stableHashLocal(payload);
}

function stableHashLocal(value) {
  // The Shared Core exposes `stableHash` (SHA-256 over the
  // canonicalized JSON). We import it via the public surface to
  // avoid duplicating the algorithm. The local helper is just
  // a thin wrapper that ensures we call the Shared authority
  // rather than re-implement.
  return sharedStableHash(canonicalize(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((k) => [k, canonicalize(value[k])]),
    );
  }
  return value;
}

// We import stableHash from the Shared Core. To avoid duplicating
// the algorithm, we call the Shared function via the public
// surface. The local canonicalize helper is a private
// normaliser (the same shape the Shared Core uses); the actual
// SHA-256 + canonicalization is done by the Shared authority.
//
// (The stableHash import is hoisted to the top of the file with
// the other Shared Core imports.)

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

/**
 * Verify the metadata against a fresh translation / compiled /
 * capability / payload. Returns the Shared verify result
 * ({ valid, code: 'COMPILE_INPUT_STALE' | undefined, mismatches })
 * PLUS a metadata consistency check.
 */
export function verifyPackagingGenerationMetadata(metadata, current) {
  if (!isPlainObject(metadata)) {
    return { valid: false, code: PACKAGING_METADATA_INVALID, mismatches: ['metadata_not_object'] };
  }
  if (!isPlainObject(current)) {
    return { valid: false, code: PACKAGING_METADATA_INVALID, mismatches: ['current_not_object'] };
  }
  const drift = consistencyGate(
    current.translation,
    current.compiled,
    current.capability,
    current.payload,
  );
  if (drift.length) {
    return { valid: false, code: PACKAGING_METADATA_INVALID, mismatches: drift };
  }
  const rebuilt = buildPackagingGenerationMetadata(current);
  const fields = [
    'sourceBundleHash', 'userIntentHash', 'deliverableHash',
    'referencePlanHash', 'compiledPromptHash',
  ];
  const mismatches = [];
  for (const f of fields) {
    if (rebuilt.compileFingerprint[f] !== metadata.compileFingerprint?.[f]) {
      mismatches.push(f);
    }
  }
  if (mismatches.length) {
    return { valid: false, code: 'COMPILE_INPUT_STALE', mismatches };
  }
  return { valid: true, mismatches: [] };
}

/**
 * Direct Shared Core verifier (exposed for tests + future
 * tooling). Re-uses verifyCompileFingerprint verbatim.
 */
export function verifySharedCompileFingerprint(fingerprint, current) {
  return verifyCompileFingerprint(fingerprint, current);
}

function newError(message) {
  const err = new Error(`${PACKAGING_METADATA_INVALID}: ${message}`);
  err.code = PACKAGING_METADATA_INVALID;
  err.issues = ['metadata_invalid'];
  return err;
}

/**
 * Snapshot helper for tests: returns a structural fingerprint of
 * the metadata module's canonical component version manifest.
 */
export function getPackagingMetadataFingerprint() {
  return Object.freeze({
    schemaVersion: '1.0',
    metadataVersion: PACKAGING_METADATA_VERSION,
    componentVersions: { ...COMPONENT_VERSION_MANIFEST },
  });
}
