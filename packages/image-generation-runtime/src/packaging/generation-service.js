// Packaging Generation Service — P2-G.
//
// Capability boundary:
//   this module is the FIRST real Packaging production service route.
//   It is a thin orchestrator that wires the frozen P2-A..P2-F
//   modules together with the existing Shared Generation Core
//   (image-generation-adapter / image-generation-runtime download+
//   redaction). It is NOT a second runtime: there is no second
//   credential stack, no second retry stack, no Packaging-specific
//   provider HTTP client, no second reasoning call.
//
// P2 spec §47 §54 (P2-G Exit) + the P2-G transition rules:
//
//   - The service is split into two layers (P2 spec §3):
//       preparePackagingGeneration(...) — deterministic, no network
//       executePackagingGeneration(prepared) — network + persistence
//     Tests can drive prepare end-to-end without API keys.
//
//   - The Shared Provider dispatch is
//     `createMultiModelImageAdapter({...}).execute(input, {fetchImpl})`
//     (packages/image-generation-adapter/src/multi-model.js). The
//     Service does NOT import provider internals; it does NOT
//     construct provider-specific HTTP endpoints; it does NOT
//     call `fetch` or `http.request` directly.
//
//   - The Shared Run persistence, the Shared download/verify, the
//     Shared redaction and the Shared fingerprint verifier are the
//     only authorities for the corresponding surface. The Service
//     only orchestrates them.
//
//   - References are resolved through an injected `readReference`
//     dependency. The Service does NOT scan local directories, does
//     NOT build an assetId-to-path registry, and does NOT inspect
//     project state. A missing reference fails closed with
//     `REFERENCE_ASSET_UNRESOLVED`.
//
//   - The pre-execution stale gate is
//     `verifyPackagingGenerationMetadata`. A stale fingerprint
//     fails closed with `COMPILE_INPUT_STALE`; the Service does
//     NOT silently re-compile and re-try.
//
// Stop conditions honoured (P2 spec §20 §58 §59):
//   - does not call a model directly
//   - does not import any Golden project asset
//   - does not invent a second fingerprint algorithm
//   - does not silently rewrite Locked Assets
//   - does not introduce a second credential or retry stack
//   - does not introduce Packaging-specific provider HTTP client
//   - does not branch on a specific provider identity at the
//     Service layer; provider-specific serialization belongs to
//     the Shared Provider Adapter. The capability layer is the
//     single authority on which provider is eligible for
//     Packaging, and the Shared multi-model adapter owns the
//     protocol-specific request shape.

import { createPackagingTranslation } from './translation.js';
import { validatePackagingTranslation } from './validation.js';
import { compilePackagingPrompt } from './compiler.js';
import {
  resolvePackagingProviderCapability,
  validatePackagingProviderCapability,
  PROVIDER_CAPABILITY_MISMATCH,
  REFERENCE_UNSUPPORTED,
} from './provider-capability.js';
import { buildPackagingProviderPayload } from './provider-adapter.js';
import {
  buildPackagingGenerationMetadata,
  verifyPackagingGenerationMetadata,
  PACKAGING_METADATA_INVALID,
} from './metadata.js';
import { createMultiModelImageAdapter } from '../../../image-generation-adapter/src/multi-model.js';
import { downloadAndVerifyImage } from '../download-verify.js';
import { redactProviderRequest, redactProviderResponse } from '../redact.js';

export const PACKAGING_GENERATION_SERVICE_VERSION = '1.0.0';

// Canonical error code (P2 spec §32): the only post-execution
// Packaging code is GENERATION_PROVIDER_FAILED. Pre-execution
// failure codes (PACKAGING_TRANSLATION_INVALID,
// PACKAGING_STRUCTURE_EVIDENCE_MISSING, REFERENCE_REQUIRED,
// REFERENCE_ROLE_INVALID, PROVIDER_CAPABILITY_MISMATCH,
// REFERENCE_UNSUPPORTED, SHOT_CONTRACT_INVALID,
// PACKAGING_METADATA_INVALID, COMPILE_INPUT_STALE) keep their
// canonical upstream identity and are NOT rewrapped as
// GENERATION_PROVIDER_FAILED (P2 spec §12).
export const GENERATION_PROVIDER_FAILED = 'GENERATION_PROVIDER_FAILED';
export const REFERENCE_ASSET_UNRESOLVED = 'REFERENCE_ASSET_UNRESOLVED';

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
// P2-G: Pinned structured error codes surfaced verbatim to the caller.
// Pre-execution errors keep their canonical upstream code; only the
// post-execution (Provider / network / download) bucket is mapped
// to GENERATION_PROVIDER_FAILED.
// ---------------------------------------------------------------------------

function newError(code, message, extras = {}) {
  const err = new Error(`${code}: ${message}`);
  err.code = code;
  err.issues = [code, ...(extras.issues ?? [])];
  if (extras.cause) err.cause = extras.cause;
  if (extras.internal !== undefined) err.internal = extras.internal;
  return err;
}

// Map a Shared provider / network error to a normalized
// GENERATION_PROVIDER_FAILED. The original error is preserved on
// `err.cause` and on `err.internal.code` so the audit trail is
// intact; the user-facing surface is redacted to the canonical
// code (P2 spec §12).
function toGenerationProviderFailed(error) {
  const code = asString(error?.code, GENERATION_PROVIDER_FAILED);
  const message = asString(error?.message, 'Packaging provider request failed.');
  return newError(GENERATION_PROVIDER_FAILED, message, {
    cause: error,
    internal: { code, message, retryable: Boolean(error?.retryable) },
  });
}

// Map a download/verify error to GENERATION_PROVIDER_FAILED. The
// download/verify layer is a Shared concern; the Service only
// owns the canonical code surface.
function toDownloadProviderFailed(error) {
  const code = asString(error?.code, 'IMAGE_DOWNLOAD_FAILED');
  const message = asString(error?.message, 'Packaging image download failed.');
  return newError(GENERATION_PROVIDER_FAILED, message, {
    cause: error,
    internal: { code, message },
  });
}

// ---------------------------------------------------------------------------
// P2-G input authority: the Service accepts a Packaging Translation
// input (P2-A shape) + a selected modelId. It does NOT re-interpret
// Visual Analysis, Reference Roles, Shot semantics, Locked Assets
// or Provider capability. Those are owned by their canonical
// upstream modules (P2 spec §4).
// ---------------------------------------------------------------------------

function validateServiceInput(input) {
  if (!isPlainObject(input)) {
    throw newError('PACKAGING_TRANSLATION_INVALID', 'input is not an object');
  }
  const { modelId } = input;
  if (!asString(modelId)) {
    throw newError(PROVIDER_CAPABILITY_MISMATCH, 'modelId is required');
  }
}

// ---------------------------------------------------------------------------
// Default dependency set. Tests inject a custom `deps` object so
// the Service can run end-to-end with a fake Shared Provider
// dispatch, a fake file reader and a fake Run store (P2 spec §17).
// Production callers supply the real Shared infrastructure
// (image-generation-adapter multi-model + the Shared Run store).
// ---------------------------------------------------------------------------

const DEFAULT_DEPS = Object.freeze({
  // eslint-disable-next-line no-unused-vars
  readReference: async (_reference) => {
    throw newError(
      REFERENCE_ASSET_UNRESOLVED,
      'No readReference dependency was provided; reference assets cannot be resolved.',
    );
  },
  fetchImpl: undefined,
  // eslint-disable-next-line no-unused-vars
  saveRun: async (_run) => undefined,
  // eslint-disable-next-line no-unused-vars
  now: () => new Date().toISOString(),
  // Test / shared-executor seam (P2 spec §17). When provided, the
  // Service dispatches through this executor instead of building
  // the real Shared multi-model adapter. The executor MUST honour
  // the Shared dispatch shape (`{ execute(universalInput, options) }`
  // returning `{ status, modelId, requestId, images: [...] }`).
  executor: undefined,
});

function resolveDeps(deps) {
  if (deps == null) return DEFAULT_DEPS;
  return Object.freeze({
    readReference: typeof deps.readReference === 'function' ? deps.readReference : DEFAULT_DEPS.readReference,
    fetchImpl: typeof deps.fetchImpl === 'function' ? deps.fetchImpl : DEFAULT_DEPS.fetchImpl,
    saveRun: typeof deps.saveRun === 'function' ? deps.saveRun : DEFAULT_DEPS.saveRun,
    now: typeof deps.now === 'function' ? deps.now : DEFAULT_DEPS.now,
    executor: isPlainObject(deps.executor) ? deps.executor : DEFAULT_DEPS.executor,
    apiKey: typeof deps.apiKey === 'string' ? deps.apiKey : undefined,
    baseUrl: typeof deps.baseUrl === 'string' ? deps.baseUrl : undefined,
    region: typeof deps.region === 'string' ? deps.region : undefined,
    runRoot: typeof deps.runRoot === 'string' ? deps.runRoot : undefined,
    targetPath: typeof deps.targetPath === 'string' ? deps.targetPath : undefined,
    thumbnailPath: typeof deps.thumbnailPath === 'string' ? deps.thumbnailPath : undefined,
  });
}

// ---------------------------------------------------------------------------
// P2-G layer 1: preparePackagingGeneration
//
//   input + deps -> { translation, compiled, capability, payload,
//                    metadata, fingerprintInputs, runId, references }
//
//   - No network call. No Provider dispatch. No run persistence.
//   - The metadata is the audit-trail surface; it is BUILT here
//     (P2 spec §5 step 7) so the pre-execution stale gate can
//     validate the canonical inputs at execute time.
//   - Returns the runId + the universal input the Shared Provider
//     Adapter expects at execute time, so the execute layer does
//     not have to re-derive anything that already decided.
// ---------------------------------------------------------------------------

export function preparePackagingGeneration(input, deps = null) {
  validateServiceInput(input);
  const resolvedDeps = resolveDeps(deps);
  const now = resolvedDeps.now();

  // 1) Translation (P2-A).
  const translation = createPackagingTranslation(input);
  // 2) Validate the translation shape (P2-A / P2 spec §32).
  validatePackagingTranslation(translation);

  // 3) Compiler (P2-D) — deterministic 14-block topology.
  const compiled = compilePackagingPrompt(translation);
  if (!isPlainObject(compiled)) {
    // compilePackagingPrompt is fail-closed; this is a defense-in-depth
    // check that the canonical upstream returned a usable shape.
    throw newError('PACKAGING_COMPILE_FAILED', 'compiled output is not an object');
  }

  // 4) Provider Capability gate (P2-E).
  const capability = resolvePackagingProviderCapability({
    modelId: input.modelId,
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  // 5) Canonical upstream validate. The capability layer accepts
  //    the same input shape (modelId + generationMode +
  //    referencePolicy) and emits PROVIDER_CAPABILITY_MISMATCH or
  //    REFERENCE_UNSUPPORTED on gate failure; we re-throw verbatim.
  validatePackagingProviderCapability({
    modelId: input.modelId,
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });

  // 6) Provider Adapter Payload (P2-E Finalization).
  const payload = buildPackagingProviderPayload({ compiled, capability, translation });

  // 7) Generation Metadata + Compile Fingerprint (P2-F).
  const metadata = buildPackagingGenerationMetadata({
    translation,
    compiled,
    capability,
    payload,
    createdAt: now,
  });

  // References for the execute layer. The assetId list comes from
  // the Translation's reference policy verbatim; the Service does
  // NOT scan any local directory or registry. Resolution to binary
  // / file / URL happens at execute time via the injected
  // readReference dependency.
  const references = asArray(translation.referencePolicy?.references).map((r) => ({
    assetId: asString(r.assetId),
    role: asString(r.role),
    source: asString(r.source),
  }));

  // Deterministic runId derived from the fingerprint inputs (not
  // from a fresh UUID). This keeps prepare + execute reproducible
  // for the same canonical input.
  const runId = `pkg-${metadata.compileFingerprint.sourceBundleHash.slice(0, 12)}`;

  return Object.freeze({
    runId,
    now,
    translation,
    compiled,
    capability,
    payload,
    metadata,
    references,
  });
}

// ---------------------------------------------------------------------------
// P2-G helper: build the universal input the Shared Provider
// Adapter expects from the prepared generation. Lives in this
// module (not in the Adapter) so the Adapter stays
// target-agnostic and the Service is the single authority on how
// a Packaging prepared state becomes a Provider request.
//
// We serialize the 14 blocks (id / title / items / sources) into
// a single prompt string. The block-by-block shape is preserved
// in `payload.promptSourceMap` for audit; the serialized string
// is what the Shared Adapter actually sends to the Provider.
// ---------------------------------------------------------------------------

function buildPackagingProviderPrompt(compiled) {
  const blocks = Array.isArray(compiled?.blocks) ? compiled.blocks : [];
  return blocks
    .map((block) => {
      const id = asString(block.id);
      const title = asString(block.title, id);
      const items = asArray(block.items)
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);
      if (!items.length) return null;
      return `## ${title}\n${items.join('\n')}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

function buildUniversalInput({ prepared, adapterReferences, prompt }) {
  const hints = isPlainObject(prepared.compiled?.providerHints)
    ? prepared.compiled.providerHints
    : (isPlainObject(prepared.translation?.providerHints) ? prepared.translation.providerHints : {});
  return Object.freeze({
    prompt,
    aspectRatio: asString(hints.aspectRatio, '1:1'),
    imageSize: asString(hints.imageSize, '2K'),
    outputCount: 1,
    negativeRules: asArray(prepared.translation?.negativeConstraints),
    references: adapterReferences,
  });
}

// ---------------------------------------------------------------------------
// P2-G layer 2: executePackagingGeneration
//
//   prepared + deps -> Generation Result
//
//   - Pre-execution stale gate (P2 spec §6) is run BEFORE Provider
//     dispatch. Stale -> COMPILE_INPUT_STALE; metadata drift ->
//     PACKAGING_METADATA_INVALID. NO silent re-compile.
//   - Reference resolution uses the injected readReference
//     dependency. Missing -> REFERENCE_ASSET_UNRESOLVED (fail
//     closed).
//   - Provider dispatch uses the Shared multi-model adapter
//     (the same one Wan / gpt-image-2 / nano-banana / seedream
//     share). The Service does NOT call `fetch` directly.
//   - Provider response is normalized through Shared redaction.
//   - The final Result is frozen and never carries the raw
//     Provider response (P2 spec §13).
// ---------------------------------------------------------------------------

export async function executePackagingGeneration(prepared, deps = null) {
  if (!isPlainObject(prepared) || !isPlainObject(prepared.metadata)) {
    throw newError(PACKAGING_METADATA_INVALID, 'prepared generation is not a valid prepared state');
  }
  const resolvedDeps = resolveDeps(deps);
  const { runId, now, translation, compiled, capability, payload, metadata, references } = prepared;
  const startedAt = resolvedDeps.now();

  // 8) Pre-execution stale gate. The verifier rebuilds the
  //    canonical fingerprint inputs and compares. The Prepared
  //    state was produced by the same canonical inputs builder
  //    (P2-F); the verify MUST pass before any Provider dispatch.
  const stale = verifyPackagingGenerationMetadata(metadata, {
    translation, compiled, capability, payload,
  });
  if (!stale.valid) {
    // Stale gate failure keeps the canonical upstream code
    // (COMPILE_INPUT_STALE or PACKAGING_METADATA_INVALID). The
    // Service does NOT silently re-prepare.
    const code = asString(stale.code, PACKAGING_METADATA_INVALID);
    throw newError(code, `pre-execution stale gate failed: ${(stale.mismatches ?? []).join(', ') || 'unknown'}`, {
      issues: asArray(stale.mismatches),
    });
  }

  // 9) Reference asset resolution. We do NOT scan local paths.
  //    The injected readReference must return a normalized
  //    `{ name, mimeType, data }` shape that the Shared Adapter
  //    accepts. A failure here is fail-closed.
  const adapterReferences = [];
  for (const reference of references) {
    let resolved;
    try {
      resolved = await resolvedDeps.readReference(reference);
    } catch (error) {
      if (asString(error?.code) === REFERENCE_ASSET_UNRESOLVED) {
        throw error;
      }
      throw newError(
        REFERENCE_ASSET_UNRESOLVED,
        `reference ${reference.assetId || 'unknown'} could not be resolved: ${asString(error?.message, 'unknown')}`,
        { cause: error },
      );
    }
    if (!isPlainObject(resolved) || !asString(resolved.mimeType) || !asString(resolved.data)) {
      throw newError(
        REFERENCE_ASSET_UNRESOLVED,
        `reference ${reference.assetId || 'unknown'} returned an invalid shape`,
      );
    }
    adapterReferences.push({
      name: asString(resolved.name, reference.assetId),
      mimeType: asString(resolved.mimeType),
      data: asString(resolved.data),
    });
  }

  // 10) Provider dispatch through the Shared multi-model adapter.
  //     The Service does NOT branch on a specific provider
  //     identity. All registered image-generation models share
  //     the same Shared dispatch surface; capability + protocol
  //     determine the actual HTTP route.
  //
  //     Tests inject `deps.executor` (P2 spec §17) to drive the
  //     same Shared dispatch shape with a fake / shared executor.
  //     Production callers fall through to the real Shared
  //     multi-model adapter.
  const adapterId = asString(capability.modelId);
  if (!adapterId) {
    throw newError(PROVIDER_CAPABILITY_MISMATCH, 'capability.modelId is empty; cannot dispatch');
  }
  let adapter;
  if (isPlainObject(resolvedDeps.executor) && typeof resolvedDeps.executor.execute === 'function') {
    // Test / shared-executor seam. The fake executor MUST honour
    // the same return shape as the real Shared adapter
    // (`{ status, adapterId, modelId, requestId, images: [...] }`).
    adapter = {
      id: asString(resolvedDeps.executor.id, adapterId),
      version: asString(resolvedDeps.executor.version, 'shared-test-executor@1.0.0'),
      protocol: asString(resolvedDeps.executor.protocol, capability.protocol),
      execute: resolvedDeps.executor.execute,
    };
  } else {
    adapter = createMultiModelImageAdapter({
      adapterId,
      apiKey: asString(resolvedDeps.apiKey),
      baseUrl: asString(resolvedDeps.baseUrl),
      modelId: asString(capability.modelId),
    });
  }
  const prompt = buildPackagingProviderPrompt(compiled);
  const universalInput = buildUniversalInput({ prepared, adapterReferences, prompt });

  // 11) Normalize the Provider request (Shared redaction) before
  //     any audit-trail write. The Service records the redacted
  //     shape; the raw request (with API key / base64 references)
  //     never leaves the Shared Adapter.
  const redactedRequest = redactProviderRequest({
    endpoint: asString(adapter.protocol),
    region: asString(resolvedDeps.region),
    modelId: asString(capability.modelId),
    body: {
      input: {
        prompt: universalInput.prompt,
        aspect_ratio: universalInput.aspectRatio,
        image_size: universalInput.imageSize,
        references: universalInput.references.map((ref) => ({
          name: ref.name,
          mimeType: ref.mimeType,
          hasData: Boolean(ref.data),
        })),
      },
    },
  });

  // 12) Real Provider dispatch. The Shared adapter is the
  //     single network authority; the Service never calls
  //     `fetch` directly.
  let providerResponse;
  try {
    providerResponse = await adapter.execute(universalInput, {
      fetchImpl: resolvedDeps.fetchImpl,
    });
  } catch (error) {
    throw toGenerationProviderFailed(error);
  }

  if (!isPlainObject(providerResponse) || providerResponse.status !== 'succeeded' || !Array.isArray(providerResponse.images) || !providerResponse.images.length) {
    throw toGenerationProviderFailed(new Error('Provider response did not contain a successful image payload.'));
  }

  // 13) Normalize the Provider response (Shared redaction).
  const redactedResponse = redactProviderResponse({
    requestId: providerResponse.requestId,
    providerTaskId: providerResponse.requestId,
    state: 'succeeded',
    taskStatus: 'succeeded',
    model: asString(providerResponse.modelId),
    parameters: {
      aspectRatio: universalInput.aspectRatio,
      imageSize: universalInput.imageSize,
    },
    images: providerResponse.images,
  });

  // 14) Download / verify (Shared). The Service does NOT
  //     implement its own download. A download failure is
  //     bucketed under GENERATION_PROVIDER_FAILED (Provider-side
  //     problem).
  const firstImage = providerResponse.images[0];
  const rootDir = asString(resolvedDeps.runRoot, '');
  let downloaded = null;
  if (rootDir) {
    try {
      downloaded = await downloadAndVerifyImage({
        url: firstImage?.url,
        b64: firstImage?.b64,
        targetPath: resolvedDeps.targetPath
          ? asString(resolvedDeps.targetPath)
          : `${rootDir.replace(/[\\/]+$/u, '')}/image-01.png`,
        thumbnailPath: resolvedDeps.thumbnailPath
          ? asString(resolvedDeps.thumbnailPath)
          : `${rootDir.replace(/[\\/]+$/u, '')}/image-01.webp`,
        fetchImpl: resolvedDeps.fetchImpl,
      });
    } catch (error) {
      throw toDownloadProviderFailed(error);
    }
    if (downloaded?.downloadFailed || !downloaded?.written) {
      throw toDownloadProviderFailed(new Error(asString(downloaded?.error, 'download failed')));
    }
  }

  // 15) Build the canonical Generation Result (P2 spec §13).
  const completedAt = resolvedDeps.now();
  const result = {
    schemaVersion: '1.0',
    target: 'packaging',
    status: 'succeeded',
    runId,
    generationMode: asString(translation.generationMode),
    shotContractId: asString(translation.shotContract?.id),
    provider: Object.freeze({
      adapterId: asString(adapterId),
      modelId: asString(providerResponse.modelId || capability.modelId),
      provider: asString(capability.provider),
      protocol: asString(capability.protocol),
      requestId: asString(providerResponse.requestId) || null,
    }),
    metadata,
    artifacts: Object.freeze(providerResponse.images.map((image, index) => ({
      imageId: `image-${String(index + 1).padStart(2, '0')}`,
      mimeType: asString(image.mimeType, 'image/png'),
      hasB64: Boolean(image.b64),
      hasUrl: Boolean(image.url),
      sha256: asString(downloaded?.sha256) || null,
      relativePath: downloaded?.relativePathWritten || null,
    }))),
    diagnostics: Object.freeze({
      startedAt,
      completedAt,
      durationMs: Number.isFinite(Date.parse(completedAt) - Date.parse(startedAt))
        ? Date.parse(completedAt) - Date.parse(startedAt)
        : null,
      referenceCount: references.length,
      imageCount: providerResponse.images.length,
      redactedRequest,
      redactedResponse,
      ...(downloaded ? {
        downloaded: {
          mimeType: asString(downloaded.mimeType) || null,
          sizeBytes: Number.isFinite(downloaded.sizeBytes) ? downloaded.sizeBytes : null,
          width: Number.isFinite(downloaded.width) ? downloaded.width : null,
          height: Number.isFinite(downloaded.height) ? downloaded.height : null,
          decoded: Boolean(downloaded.decoded),
        },
      } : {}),
    }),
  };

  // 16) Persist / return. The Service does NOT define a
  //     Packaging-specific Run store; it calls the Shared
  //     persistence seam through the injected saveRun
  //     dependency. Production wires the Shared Run store
  //     (packages/runtime-core/src/application/image-generation/
  //     run-store.ts) through this seam.
  try {
    await resolvedDeps.saveRun(result);
  } catch (error) {
    // Persistence failure is also a Provider-side bucket; the
    // Service has produced a valid Result but the Shared
    // persistence seam rejected it.
    throw toGenerationProviderFailed(error);
  }

  return Object.freeze(result);
}

// ---------------------------------------------------------------------------
// P2-G single-call wrapper. Tests + UI use this; it composes
// prepare + execute. Tests that want to inspect prepared state
// can call prepare / execute separately (P2 spec §3).
// ---------------------------------------------------------------------------

export async function runPackagingGeneration(input, deps = null) {
  const prepared = preparePackagingGeneration(input, deps);
  return executePackagingGeneration(prepared, deps);
}

// ---------------------------------------------------------------------------
// Structural fingerprint. Used by the architecture-boundary
// tests to assert: no fetch / no http.request / no axios / no
// API key loader / no retry loop / no download implementation /
// no provider-specific HTTP endpoint inside this module.
// ---------------------------------------------------------------------------

export function getPackagingGenerationServiceFingerprint() {
  return Object.freeze({
    schemaVersion: '1.0',
    serviceVersion: PACKAGING_GENERATION_SERVICE_VERSION,
    layers: Object.freeze(['prepare', 'execute']),
    sharedAuthority: Object.freeze({
      providerDispatch: 'createMultiModelImageAdapter',
      downloadVerify: 'downloadAndVerifyImage',
      redaction: 'redactProviderRequest / redactProviderResponse',
      fingerprint: 'buildPackagingGenerationMetadata / verifyPackagingGenerationMetadata',
    }),
  });
}
