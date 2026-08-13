// Packaging Generation Metadata — P2-F Final.
//
// Capability boundary:
//   this module is the SINGLE source of truth for the Packaging
//   Generation Metadata surface. It is an independent surface
//   from the Provider Payload (P2-E) and the Provider Request
//   (P2-G). It does NOT enter the Provider Request.
//
// P2 spec §47 §53 (P2-F Exit) + the P2-F transition rules +
// P2-F Finalization Delta (items 1-9):
//
//   - Metadata records decisions; Metadata does not make
//     decisions. Every field on the metadata surface is sourced
//     from a canonical upstream output (Translation / Compiled /
//     Capability / Adapter Payload).
//
//   - The Shared Compile Fingerprint is integrated through the
//     existing Shared Core (packages/image-generation-runtime/src/
//     deliverables/compile-fingerprint.js). P2-F does NOT define
//     a second fingerprint algorithm. The canonical input mapping
//     is the function `buildPackagingFingerprintInputs`; both
//     create and verify consume it.
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
//   - Component versions (contractVersion / translationVersion /
//     referencePolicyVersion / compilerVersion / providerCapability
//     Version / providerAdapterVersion) enter the `deliverable`
//     semantic input so a runtime component upgrade produces
//     `COMPILE_INPUT_STALE` against the older fingerprint.
//
//   - Provider / Model (modelId / provider / protocol / modelType)
//     enters the `deliverable` semantic input. A model swap
//     against an otherwise unchanged Translation produces
//     `COMPILE_INPUT_STALE`.
//
// Stop conditions honoured (P2 spec §20 §58 §59):
//   - does not call a model
//   - does not import any Golden project asset
//   - does not invent a second fingerprint algorithm
//   - does not silently rewrite Locked Assets
//   - does not enter the Provider Request
//   - does not leak secret fields (allowlist construction)

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
// output; the caller cannot override these (P2-F constraint #4).
// All six component versions enter the `deliverable` semantic
// input (P2-F Finalization Delta item 5); they are also exposed
// on the metadata surface as `componentVersions` for the audit
// trail.
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

// Secret field deny-list (P2-F constraint #15). Case-insensitive
// substring match.
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
// sourceBundle normalization (semantic inputs only; runtime noise
// stripped; Locked Asset content carried for fingerprint reactivity)
// ---------------------------------------------------------------------------

function buildSharedSourceBundle(translation) {
  if (!isPlainObject(translation)) {
    throw newError('translation is not an object');
  }
  const la = isPlainObject(translation.lockedAssets) ? translation.lockedAssets : {};
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
    // any local path / temp / UUID / runId / secret.
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
// referencePlanForHash (explicit assetId + role identity; source is
// metadata-only and not in the semantic hash)
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
// compiledPromptForHash (P2-F Finalization Delta item 1):
//   hash the actual compiled semantic content. The 14-block
//   topology alone is NOT enough; a Compiler that produces a
//   different `items` array for a block MUST change the hash.
//
//   Sources are included for audit-trail completeness; the
//   canonicalization order is deterministic (blockOrder first,
//   then per-block id / title / items / sources).
// ---------------------------------------------------------------------------

function buildCompiledPromptForHash(compiled) {
  if (!isPlainObject(compiled)) return {};
  const blocks = Array.isArray(compiled.blocks) ? compiled.blocks : [];
  return {
    blockOrder: Array.isArray(compiled.blockOrder) ? compiled.blockOrder.slice() : [],
    blocks: blocks.map((b) => ({
      id: asString(b.id),
      title: asString(b.title),
      items: asArray(b.items),
      sources: Array.isArray(b.sources) ? b.sources.slice() : [],
    })),
  };
}

// ---------------------------------------------------------------------------
// deliverableForHash (P2-F Finalization Delta items 4 + 5):
//   the canonical deliverable carries the Shot Contract id, the
//   target, the generation mode, the execution identity
//   (modelId / provider / protocol / modelType) and the six
//   component versions. A component version upgrade or a model
//   swap both produce COMPILE_INPUT_STALE against the older
//   fingerprint.
// ---------------------------------------------------------------------------

function buildDeliverableForHash({ target, shotContractId, generationMode, capability, versions }) {
  return {
    target: asString(target),
    shotContractId: asString(shotContractId),
    generationMode: asString(generationMode),
    execution: {
      modelId: asString(capability.modelId),
      provider: asString(capability.provider),
      protocol: asString(capability.protocol),
      modelType: asString(capability.modelType),
    },
    versions: { ...versions },
  };
}

// ---------------------------------------------------------------------------
// buildPackagingFingerprintInputs (P2-F Finalization Delta item 2 + 8):
//   the SINGLE canonical input-mapping authority. Both create
//   (buildPackagingGenerationMetadata) and verify
//   (verifyPackagingGenerationMetadata) consume it. No second
//   field set; no second canonicalization.
// ---------------------------------------------------------------------------

export function buildPackagingFingerprintInputs({ translation, compiled, capability, payload } = {}) {
  if (!isPlainObject(translation)) throw newError('translation is not an object');
  if (!isPlainObject(compiled)) throw newError('compiled is not an object');
  if (!isPlainObject(capability)) throw newError('capability is not an object');
  if (!isPlainObject(payload)) throw newError('payload is not an object');
  const target = asString(translation.target);
  const generationMode = asString(translation.generationMode);
  const shotContractId = asString(translation.shotContract?.id);
  return {
    sourceBundle: buildSharedSourceBundle(translation),
    userIntent: { generationMode, shotContractId },
    deliverable: buildDeliverableForHash({
      target,
      shotContractId,
      generationMode,
      capability,
      versions: { ...COMPONENT_VERSION_MANIFEST },
    }),
    referencePlan: buildReferencePlanForHash(translation),
    compiledPrompt: buildCompiledPromptForHash(compiled),
    payload: deepFreezeForHash(payload),
  };
}

// Helper for the payloadHash side. The Adapter Payload is
// already Object.freeze'd (P2-E Finalization). We re-freeze in
// case the caller passes a fresh shape. The Shared stableHash
// does the canonicalization; we do not duplicate it here.
function deepFreezeForHash(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;
  return Object.freeze(value);
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
 * is allowlist-built from canonical upstream outputs.
 *
 * @param {object} input
 * @param {object} input.translation - the validated PackagingTranslation
 * @param {object} input.compiled    - the output of compilePackagingPrompt
 * @param {object} input.capability  - the accepted capability result
 * @param {object} input.payload     - the output of buildPackagingProviderPayload
 * @param {string} [input.createdAt]  - audit timestamp; defaults to Date.now().toISOString()
 * @returns {object} the metadata surface
 */
export function buildPackagingGenerationMetadata(input = {}) {
  const obj = isPlainObject(input) ? input : {};
  const { translation, compiled, capability, payload } = obj;
  if (!isPlainObject(translation)) throw newError('translation is not an object');
  if (!isPlainObject(compiled)) throw newError('compiled is not an object');
  if (!isPlainObject(capability)) throw newError('capability is not an object');
  if (!isPlainObject(payload)) throw newError('payload is not an object');

  // Secret-safety scan on ALL inputs (P2-F constraint #15: "Metadata
  // 根本不接触 secret input"). Allowlist + deny-list on input.
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

  // Shared Compile Fingerprint. The single canonical input
  // mapping feeds both create and verify.
  const fingerprintInputs = buildPackagingFingerprintInputs({
    translation, compiled, capability, payload,
  });
  const createdAt = asString(obj.createdAt, new Date().toISOString());
  const sharedFingerprint = createCompileFingerprint({
    sourceBundle: fingerprintInputs.sourceBundle,
    userIntent: fingerprintInputs.userIntent,
    deliverable: fingerprintInputs.deliverable,
    referencePlan: fingerprintInputs.referencePlan,
    compiledPrompt: fingerprintInputs.compiledPrompt,
    compiledAt: createdAt,
  });
  // The payload hash is a Shared stableHash of the Adapter
  // Payload. The Shared Core owns canonicalization; we do not
  // re-implement it (P2-F Finalization Delta item 7).
  const payloadHash = sharedStableHash(fingerprintInputs.payload);

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

    payloadFingerprint: payloadHash,

    createdAt,
  };

  // Secret-safety scan on the OUTPUT metadata (defense in depth).
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

// ---------------------------------------------------------------------------
// Verify (P2-F Finalization Delta item 2 + 3 + 6)
//
// verifyPackagingGenerationMetadata uses the SAME canonical
// input mapping as build (buildPackagingFingerprintInputs) and
// the Shared Core verifyCompileFingerprint. There is exactly one
// mapping authority; the verifier is the Shared Core.
// ---------------------------------------------------------------------------

export function verifyPackagingGenerationMetadata(metadata, current) {
  if (!isPlainObject(metadata)) {
    return { valid: false, code: PACKAGING_METADATA_INVALID, mismatches: ['metadata_not_object'] };
  }
  if (!isPlainObject(current)) {
    return { valid: false, code: PACKAGING_METADATA_INVALID, mismatches: ['current_not_object'] };
  }
  const { translation, compiled, capability, payload } = current;
  if (!isPlainObject(translation) || !isPlainObject(compiled) || !isPlainObject(capability) || !isPlainObject(payload)) {
    return { valid: false, code: PACKAGING_METADATA_INVALID, mismatches: ['current_inputs_not_objects'] };
  }
  // 1) Consistency gate.
  const drift = consistencyGate(translation, compiled, capability, payload);
  if (drift.length) {
    return { valid: false, code: PACKAGING_METADATA_INVALID, mismatches: drift };
  }
  // 2) Shared compile fingerprint. We rebuild the canonical
  //    inputs via the SINGLE mapping authority and feed the
  //    Shared verifier verbatim. We pass the previous compiledAt
  //    so the Shared verifier does not compare timestamps; only
  //    the 5 semantic hashes are compared.
  const currentInputs = buildPackagingFingerprintInputs({ translation, compiled, capability, payload });
  const rebuilt = createCompileFingerprint({
    sourceBundle: currentInputs.sourceBundle,
    userIntent: currentInputs.userIntent,
    deliverable: currentInputs.deliverable,
    referencePlan: currentInputs.referencePlan,
    compiledPrompt: currentInputs.compiledPrompt,
    compiledAt: metadata.compileFingerprint?.compiledAt,
  });
  const fields = ['sourceBundleHash', 'userIntentHash', 'deliverableHash', 'referencePlanHash', 'compiledPromptHash'];
  const mismatches = fields.filter((f) => rebuilt[f] !== metadata.compileFingerprint?.[f]);
  if (mismatches.length) {
    return { valid: false, code: 'COMPILE_INPUT_STALE', mismatches };
  }
  // 3) payloadFingerprint verification (Shared stableHash).
  //    The Adapter Payload is supposed to be deterministic from
  //    the same inputs (P2-E Finalization). A drift here is
  //    either:
  //      - a compile semantic identity drift (e.g. model swap
  //        without re-running the Compiler, or a different
  //        provider serialization), classified as
  //        COMPILE_INPUT_STALE; or
  //      - a metadata shape corruption (e.g. someone hand-edited
  //        the payload), classified as PACKAGING_METADATA_INVALID.
  //    We default to COMPILE_INPUT_STALE because the only
  //    legitimate way for a payload to differ given the same
  //    Translation / Compiled / Capability is an upstream
  //    semantic mutation; the test suite pins the boundary.
  const currentPayloadHash = sharedStableHash(currentInputs.payload);
  if (currentPayloadHash !== metadata.payloadFingerprint) {
    return { valid: false, code: 'COMPILE_INPUT_STALE', mismatches: ['payloadFingerprint'] };
  }
  return { valid: true, mismatches: [] };
}

/**
 * Direct Shared Core verifier (exposed for tests + future
 * tooling). Re-uses verifyCompileFingerprint verbatim; metadata
 * does not wrap it.
 */
export function verifySharedCompileFingerprint(fingerprint, currentInputs) {
  return verifyCompileFingerprint(fingerprint, currentInputs);
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
