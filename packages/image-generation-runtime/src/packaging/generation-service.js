// Packaging Generation Service 鈥?P2-G Final.
//
// Capability boundary:
//   this module is the FIRST real Packaging production service
//   route. It is a thin orchestrator that wires the frozen
//   P2-A..P2-F modules together with the existing Shared
//   Generation Core (image-generation-adapter / image-generation-
//   runtime download + redaction). It is NOT a second runtime:
//   there is no second credential stack, no second retry stack,
//   no Packaging-specific provider HTTP client, no second
//   reasoning call.
//
// P2-G Finalization Delta (16 items). Key contracts:
//
//   1) No second prompt serializer. The Provider's `prompt` is
//      `prepared.payload.prompt` verbatim. The P2-E Adapter is
//      the unique serialization authority.
//
//   2) No second hints authority. `aspectRatio` / `imageSize` /
//      `qualityProfile` come from `prepared.payload.hints`.
//
//   3) Negative rules are not duplicated. The 14-block Prompt
//      already carries the canonical `negative_constraints`
//      block. The Service passes `negativeRules: []` to the
//      Shared Adapter so the Shared Adapter does not append a
//      second copy.
//
//   4) One Reference execution authority. The Service resolves
//      references from `prepared.payload.references` only. There
//      is no second `prepared.references` surface; the payload
//      is the single execution source and is also covered by
//      the Compile Fingerprint / payloadFingerprint.
//
//   5) Shared production config bridge. `resolveExecutionConfig`
//      and `resolveArtifactLifecycle` are the two production
//      seams; production wires them from the existing Shared
//      runtime / credential infrastructure. Tests inject fake
//      implementations; the Service does not read .env, dotenv,
//      or credential files directly.
//
//   6) `registryModelId` and `providerModelId` are separated.
//      The Shared multi-model `adapterId` is the registry
//      routing identity (e.g. 'seedream-5.0-pro'); the actual
//      API model field comes from the resolved execution config
//      and may differ (e.g. 'doubao-seedream-5-0-pro-260628').
//
//   7) Real Provider request audit. The redacted audit request
//      comes from `adapter.compileRequest(universalInput)`, not
//      from a hand-rolled redaction.
//
//   8) Artifact lifecycle is mandatory in production. Missing
//      `runRoot` (or `targetPath` / `thumbnailPath`) is a
//      fail-closed `ARTIFACT_LIFECYCLE_REQUIRED`. Tests inject
//      a fake lifecycle seam.
//
//   9) Decoded image required. `downloaded.decoded !== true` is
//      a fail-closed `GENERATION_PROVIDER_FAILED`.
//
//  10) Exactly one image enforced. `images.length !== 1` is a
//      fail-closed `GENERATION_PROVIDER_FAILED`.
//
//  11) Run identity is separate from fingerprint. `createRunId`
//      is a seam; same input + two executions produce different
//      runIds; tests inject deterministic runIds.
//
//  12) Persistence failure is NOT a Provider failure. The
//      canonical code for saveRun failure is
//      `GENERATION_PERSISTENCE_FAILED`; the Provider succeeded
//      and the binary is on disk, but the audit-trail write did
//      not land.
//
//  13) External error redaction. The `err.message` of a
//      `GENERATION_PROVIDER_FAILED` is a safe generic string;
//      the original `code` / `retryable` / raw message are
//      preserved on `err.internal` and `err.cause` for internal
//      diagnostics. Raw `Authorization` / `Secret` / signed-URL
//      tokens never reach the user-facing surface or the
//      persisted metadata.
//
//  14) The Service is honest about its production wiring. The
//      default `resolveExecutionConfig` and
//      `resolveArtifactLifecycle` are stubs that fail closed;
//      Shared production wiring is required.
//
// Stop conditions honoured (P2 spec 搂20 搂58 搂59):
//   - does not call a model directly
//   - does not import any Golden project asset
//   - does not invent a second fingerprint algorithm
//   - does not silently rewrite Locked Assets
//   - does not introduce a second credential or retry stack
//   - does not introduce a Packaging-specific provider HTTP
//     client
//   - does not branch on a specific provider identity at the
//     Service layer; provider-specific serialization belongs to
//     the Shared Provider Adapter.
//   - does not embed raw base64 in audit / metadata surfaces
//   - does not derive runId from a semantic fingerprint

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

// Canonical post-execution error codes (P2 spec 搂32 + the P2-G
// Finalization Delta items 12 + 13):
//   - GENERATION_PROVIDER_FAILED:     Provider request / network /
//                                    download/verify failure.
//   - GENERATION_PERSISTENCE_FAILED:  Provider succeeded but the
//                                    Run store rejected the audit
//                                    trail write.
//   - REFERENCE_ASSET_UNRESOLVED:     Reference id could not be
//                                    resolved to a binary by the
//                                    injected readReference seam.
//   - ARTIFACT_LIFECYCLE_REQUIRED:    No runRoot / targetPath /
//                                    thumbnailPath provided;
//                                    production Shared runtime
//                                    must wire the artifact
//                                    lifecycle seam.
//   - EXECUTION_PROVIDER_MODEL_REQUIRED:
//                                    No execution config seam
//                                    (apiKey + providerModelId +
//                                    baseUrl); production Shared
//                                    runtime must wire the
//                                    resolveExecutionConfig seam.
//
// Pre-execution errors keep their canonical upstream code and
// are NOT rewrapped (P2 spec 搂12).
export const GENERATION_PROVIDER_FAILED = 'GENERATION_PROVIDER_FAILED';
export const GENERATION_PERSISTENCE_FAILED = 'GENERATION_PERSISTENCE_FAILED';
export const REFERENCE_ASSET_UNRESOLVED = 'REFERENCE_ASSET_UNRESOLVED';
export const ARTIFACT_LIFECYCLE_REQUIRED = 'ARTIFACT_LIFECYCLE_REQUIRED';
export const EXECUTION_PROVIDER_MODEL_REQUIRED = 'EXECUTION_PROVIDER_MODEL_REQUIRED';

// Safe generic message for the user-facing surface of a
// Provider / network / download failure (item 13). The
// original `code` / `retryable` / raw message live on
// `err.internal` and `err.cause` for internal diagnostics.
const SAFE_GENERIC_PROVIDER_MESSAGE = 'Packaging provider request failed; see internal diagnostics for details.';

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

// asStringRaw: type guard only, no whitespace trim. Use for
// the canonical Provider prompt (P2-G Final item 1) where
// the byte sequence must be preserved verbatim — the P2-E
// payload.prompt ends with `\n` from
// `flattenCompiledPromptToString` and the Provider must
// receive the same byte sequence.
function asStringRaw(v, fallback = '') {
  if (typeof v !== 'string') return fallback;
  return v;
}

// asStringTrim: trim + fallback. Use for identifiers,
// error codes, model / provider / protocol labels, paths,
// and any other field where surrounding whitespace is not
// semantically meaningful.
function asStringTrim(v, fallback = '') {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function asArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.slice();
  return [v];
}

// Secret-like substring deny-list (defense in depth on
// `err.message` for redaction; identical to the P2-F metadata
// deny-list).
const SECRET_LITERAL_DENY = Object.freeze([
  'apiKey', 'api_key', 'accessToken', 'access_token',
  'authorization', 'Authorization',
  'bearer', 'Bearer',
  'secret', 'Secret',
  'credential', 'Credential',
  'masterKey', 'password', 'token',
  'privateKey', 'private_key',
]);

function containsSecretLiteral(value) {
  if (typeof value !== 'string' || !value) return false;
  for (const needle of SECRET_LITERAL_DENY) {
    if (value.includes(needle)) return true;
  }
  return false;
}

function newError(code, message, extras = {}) {
  const err = new Error(`${code}: ${asStringTrim(message, 'unknown error')}`);
  err.code = code;
  err.issues = [code, ...(extras.issues ?? [])];
  if (extras.cause) err.cause = extras.cause;
  if (extras.internal !== undefined) err.internal = extras.internal;
  return err;
}

// Map a Shared provider / network error to a normalized
// GENERATION_PROVIDER_FAILED. The original error is preserved
// on `err.cause` and on `err.internal`; the user-facing
// `err.message` is a safe generic string (item 13). The raw
// `error.message` is never embedded in the public surface.
function toGenerationProviderFailed(error) {
  const code = asStringTrim(error?.code, GENERATION_PROVIDER_FAILED);
  const rawMessage = asStringTrim(error?.message, 'Provider request failed.');
  // Defense in depth: if the raw message contains a secret
  // literal, drop it. The internal surface still has the raw
  // diagnostic for the audit trail; the public message is
  // always the safe generic string.
  const internalMessage = containsSecretLiteral(rawMessage)
    ? 'redacted (raw message contained a secret literal)'
    : rawMessage;
  return newError(GENERATION_PROVIDER_FAILED, SAFE_GENERIC_PROVIDER_MESSAGE, {
    cause: error,
    internal: { code, message: internalMessage, retryable: Boolean(error?.retryable) },
  });
}

function toDownloadProviderFailed(error) {
  const code = asStringTrim(error?.code, 'IMAGE_DOWNLOAD_FAILED');
  const rawMessage = asStringTrim(error?.message, 'Packaging image download failed.');
  const internalMessage = containsSecretLiteral(rawMessage)
    ? 'redacted (raw message contained a secret literal)'
    : rawMessage;
  return newError(GENERATION_PROVIDER_FAILED, SAFE_GENERIC_PROVIDER_MESSAGE, {
    cause: error,
    internal: { code, message: internalMessage },
  });
}

function toPersistenceFailed(error) {
  const code = asStringTrim(error?.code, GENERATION_PERSISTENCE_FAILED);
  const rawMessage = asStringTrim(error?.message, 'Packaging run persistence failed.');
  const internalMessage = containsSecretLiteral(rawMessage)
    ? 'redacted (raw message contained a secret literal)'
    : rawMessage;
  return newError(GENERATION_PERSISTENCE_FAILED, rawMessage, {
    cause: error,
    internal: { code, message: internalMessage },
  });
}

function validateServiceInput(input) {
  if (!isPlainObject(input)) {
    throw newError('PACKAGING_TRANSLATION_INVALID', 'input is not an object');
  }
  const { modelId } = input;
  if (!asStringTrim(modelId)) {
    throw newError(PROVIDER_CAPABILITY_MISMATCH, 'modelId is required');
  }
}

// ---------------------------------------------------------------------------
// Default production seam stubs. Each fails closed; production wires
// them from the Shared runtime / credential / persistence
// infrastructure (item 5 + item 8 + item 14).
// ---------------------------------------------------------------------------

async function defaultResolveExecutionConfig() {
  throw newError(
    EXECUTION_PROVIDER_MODEL_REQUIRED,
    'No resolveExecutionConfig seam was provided; production Shared runtime must wire the resolveExecutionConfig dependency.',
  );
}

function defaultResolveArtifactLifecycle() {
  throw newError(
    ARTIFACT_LIFECYCLE_REQUIRED,
    'No resolveArtifactLifecycle seam was provided; production Shared runtime must wire the resolveArtifactLifecycle dependency.',
  );
}

function defaultCreateRunId() {
  // Default to a crypto-backed UUID; tests inject a deterministic
  // implementation (item 11). The fingerprint does NOT seed
  // the runId; the runId is purely an execution identity.
  // crypto.randomUUID is available in Node 19+ and modern
  // browsers; the test environment is Node 24.
  // eslint-disable-next-line node/no-unsupported-features/node-builtins
  return `pkg-${(globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)}`;
}

const DEFAULT_DEPS = Object.freeze({
  // Reference resolution seam. Production wires the Shared
  // reference-asset resolver (item 5 + item 8). The default
  // fail-closed reference is provided here only to make the
  // module self-consistent in tests that do not exercise the
  // Reference path; any real Reference path must inject a
  // real readReference.
  readReference: async () => {
    throw newError(
      REFERENCE_ASSET_UNRESOLVED,
      'No readReference dependency was provided; production Shared runtime must wire the readReference dependency.',
    );
  },
  // Test seam for the Shared Provider dispatch (item 5 + item 7).
  // When provided, must expose `execute` and `compileRequest` in
  // the same shape as the real Shared adapter. Production wires
  // `createMultiModelImageAdapter` instead.
  executor: undefined,
  // Shared download/verify seam (item 8). Default uses the real
  // Shared `downloadAndVerifyImage`; tests may inject a fake.
  downloadImpl: downloadAndVerifyImage,
  // Shared persistence seam (item 5 + item 12). Default fails
  // closed; production wires the Shared Run store.
  saveRun: async () => {
    throw newError(
      GENERATION_PERSISTENCE_FAILED,
      'No saveRun dependency was provided; production Shared runtime must wire the saveRun dependency.',
    );
  },
  // Production execution config seam (item 5 + item 6). Default
  // fails closed. Production wires a function that calls the
  // Shared runtime's credential / model resolution.
  resolveExecutionConfig: defaultResolveExecutionConfig,
  // Artifact lifecycle seam (item 8). Default fails closed.
  // Production wires `{ runRoot, targetPath, thumbnailPath }`
  // resolved from the Shared Run store.
  resolveArtifactLifecycle: defaultResolveArtifactLifecycle,
  // Run identity seam (item 11). Default is crypto.randomUUID.
  createRunId: defaultCreateRunId,
  fetchImpl: undefined,
  now: () => new Date().toISOString(),
});

function resolveDeps(deps) {
  if (deps == null) return DEFAULT_DEPS;
  return Object.freeze({
    readReference: typeof deps.readReference === 'function' ? deps.readReference : DEFAULT_DEPS.readReference,
    executor: isPlainObject(deps.executor) ? deps.executor : DEFAULT_DEPS.executor,
    downloadImpl: typeof deps.downloadImpl === 'function' ? deps.downloadImpl : DEFAULT_DEPS.downloadImpl,
    saveRun: typeof deps.saveRun === 'function' ? deps.saveRun : DEFAULT_DEPS.saveRun,
    resolveExecutionConfig: typeof deps.resolveExecutionConfig === 'function' ? deps.resolveExecutionConfig : DEFAULT_DEPS.resolveExecutionConfig,
    resolveArtifactLifecycle: typeof deps.resolveArtifactLifecycle === 'function' ? deps.resolveArtifactLifecycle : DEFAULT_DEPS.resolveArtifactLifecycle,
    createRunId: typeof deps.createRunId === 'function' ? deps.createRunId : DEFAULT_DEPS.createRunId,
    fetchImpl: typeof deps.fetchImpl === 'function' ? deps.fetchImpl : DEFAULT_DEPS.fetchImpl,
    now: typeof deps.now === 'function' ? deps.now : DEFAULT_DEPS.now,
  });
}

// ---------------------------------------------------------------------------
// P2-G layer 1: preparePackagingGeneration
// ---------------------------------------------------------------------------

export function preparePackagingGeneration(input, deps = null) {
  validateServiceInput(input);
  const resolvedDeps = resolveDeps(deps);
  const now = resolvedDeps.now();

  // 1) Translation (P2-A).
  const translation = createPackagingTranslation(input);
  validatePackagingTranslation(translation);

  // 2) Compiler (P2-D) 鈥?deterministic 14-block topology.
  const compiled = compilePackagingPrompt(translation);
  if (!isPlainObject(compiled)) {
    throw newError('PACKAGING_COMPILE_FAILED', 'compiled output is not an object');
  }

  // 3) Provider Capability gate (P2-E). The registryModelId
  //    comes from the input verbatim; the actual providerModelId
  //    is resolved later in the execute layer against the Shared
  //    credential / model configuration.
  const capability = resolvePackagingProviderCapability({
    modelId: input.modelId,
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  validatePackagingProviderCapability({
    modelId: input.modelId,
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });

  // 4) Provider Adapter Payload (P2-E). This is the SINGLE
  //    execution surface for prompt / hints / references.
  const payload = buildPackagingProviderPayload({ compiled, capability, translation });

  // 5) Generation Metadata + Compile Fingerprint (P2-F).
  const metadata = buildPackagingGenerationMetadata({
    translation,
    compiled,
    capability,
    payload,
    createdAt: now,
  });

  return Object.freeze({
    now,
    translation,
    compiled,
    capability,
    payload,
    metadata,
  });
}

// ---------------------------------------------------------------------------
// buildUniversalInput: consume the P2-E payload as the single
// source of truth. No second prompt serializer. No second hints
// authority. No duplicated negative rules (item 1 + 2 + 3).
// ---------------------------------------------------------------------------

function buildUniversalInput({ prepared, adapterReferences }) {
  const payloadHints = isPlainObject(prepared.payload?.hints) ? prepared.payload.hints : {};
  return Object.freeze({
    // 1) prompt: P2-E payload verbatim.
    prompt: asStringRaw(prepared.payload?.prompt),
    // 2) hints: P2-E payload verbatim.
    aspectRatio: asStringTrim(payloadHints.aspectRatio, '1:1'),
    imageSize: asStringTrim(payloadHints.imageSize, '2K'),
    qualityProfile: asStringTrim(payloadHints.qualityProfile),
    // 3) negativeRules: empty. The 14-block Prompt already
    //    carries `negative_constraints`. The Shared Adapter
    //    must not append a second copy.
    negativeRules: [],
    // 4) references: produced by the Service from
    //    `prepared.payload.references` only (item 4).
    references: adapterReferences,
    // 5) outputCount: 1, hard-coded. The Shared universal
    //    contract is exactly one image per call (item 10).
    outputCount: 1,
  });
}

// ---------------------------------------------------------------------------
// buildAdapter: pick the Shared dispatch surface. Production falls
// through to `createMultiModelImageAdapter`; tests inject
// `deps.executor`. The two must honour the same
// `{ id, protocol, version, compileRequest, execute }` shape so
// the audit / dispatch paths share the same code (item 7).
// ---------------------------------------------------------------------------

function buildAdapter({ resolvedDeps, capability, executionConfig }) {
  // adapterId: registry-routing identity. For now, the Registry
  // id and the ADAPTERS map key coincide for the registered
  // Packaging models; if a future registry profile adds a
  // different ADAPTERS key, the routing lookup should be
  // extended here without forking the dispatch shape.
  const adapterId = asStringTrim(capability.modelId);
  if (isPlainObject(resolvedDeps.executor)
    && typeof resolvedDeps.executor.execute === 'function'
    && typeof resolvedDeps.executor.compileRequest === 'function') {
    return Object.freeze({
      id: asStringTrim(resolvedDeps.executor.id, adapterId),
      version: asStringTrim(resolvedDeps.executor.version, 'shared-test-executor@1.0.0'),
      protocol: asStringTrim(resolvedDeps.executor.protocol, capability.protocol),
      compileRequest: resolvedDeps.executor.compileRequest,
      execute: resolvedDeps.executor.execute,
    });
  }
  if (isPlainObject(resolvedDeps.executor)
    && (typeof resolvedDeps.executor.execute === 'function'
      || typeof resolvedDeps.executor.compileRequest === 'function')) {
    throw newError(
      EXECUTION_PROVIDER_MODEL_REQUIRED,
      'Test executor seam must expose BOTH execute and compileRequest in the Shared adapter shape.',
    );
  }
  return createMultiModelImageAdapter({
    adapterId,
    apiKey: asStringTrim(executionConfig.apiKey),
    baseUrl: asStringTrim(executionConfig.baseUrl),
    modelId: asStringTrim(executionConfig.providerModelId),
  });
}

// ---------------------------------------------------------------------------
// resolveExecutionConfig: production bridge. Production wires
// `deps.resolveExecutionConfig` to call the Shared runtime's
// credential / model resolver and returns
// `{ apiKey, baseUrl, providerModelId, profileId, protocol, provider }`.
// The Service validates that the resolved `provider` and
// `protocol` align with the capability's Registry identity; a
// drift is a `PROVIDER_CAPABILITY_MISMATCH` (item 6).
// ---------------------------------------------------------------------------

async function resolveProductionExecutionConfig({ resolvedDeps, capability }) {
  const cfg = await resolvedDeps.resolveExecutionConfig({
    registryModelId: asStringTrim(capability.modelId),
    profileId: resolvedDeps.profileId,
  });
  if (!isPlainObject(cfg)) {
    throw newError(EXECUTION_PROVIDER_MODEL_REQUIRED, 'resolveExecutionConfig must return an object');
  }
  if (!asStringTrim(cfg.apiKey)) {
    throw newError(EXECUTION_PROVIDER_MODEL_REQUIRED, 'resolveExecutionConfig did not return an apiKey');
  }
  if (!asStringTrim(cfg.providerModelId)) {
    throw newError(EXECUTION_PROVIDER_MODEL_REQUIRED, 'resolveExecutionConfig did not return a providerModelId');
  }
  if (asStringTrim(cfg.protocol) && asStringTrim(cfg.protocol) !== asStringTrim(capability.protocol)) {
    throw newError(
      PROVIDER_CAPABILITY_MISMATCH,
      `Execution config protocol ${asStringTrim(cfg.protocol)} does not match capability protocol ${asStringTrim(capability.protocol)}.`,
    );
  }
  if (asStringTrim(cfg.provider) && asStringTrim(cfg.provider) !== asStringTrim(capability.provider)) {
    throw newError(
      PROVIDER_CAPABILITY_MISMATCH,
      `Execution config provider ${asStringTrim(cfg.provider)} does not match capability provider ${asStringTrim(capability.provider)}.`,
    );
  }
  return {
    apiKey: asStringTrim(cfg.apiKey),
    baseUrl: asStringTrim(cfg.baseUrl),
    providerModelId: asStringTrim(cfg.providerModelId),
    profileId: asStringTrim(cfg.profileId),
    protocol: asStringTrim(cfg.protocol) || asStringTrim(capability.protocol),
    provider: asStringTrim(cfg.provider) || asStringTrim(capability.provider),
  };
}

// ---------------------------------------------------------------------------
// resolveArtifactLifecycle: production bridge. Production wires
// `deps.resolveArtifactLifecycle` to return
// `{ runRoot, targetPath, thumbnailPath }` from the Shared Run
// store. Missing or empty fields fail closed (item 8 + item 9).
// ---------------------------------------------------------------------------

function resolveProductionArtifactLifecycle({ resolvedDeps }) {
  const lifecycle = resolvedDeps.resolveArtifactLifecycle();
  if (!isPlainObject(lifecycle)) {
    throw newError(ARTIFACT_LIFECYCLE_REQUIRED, 'resolveArtifactLifecycle must return an object');
  }
  const runRoot = asStringTrim(lifecycle.runRoot);
  const targetPath = asStringTrim(lifecycle.targetPath);
  const thumbnailPath = asStringTrim(lifecycle.thumbnailPath);
  if (!runRoot) {
    throw newError(ARTIFACT_LIFECYCLE_REQUIRED, 'artifact lifecycle runRoot is required');
  }
  if (!targetPath) {
    throw newError(ARTIFACT_LIFECYCLE_REQUIRED, 'artifact lifecycle targetPath is required');
  }
  if (!thumbnailPath) {
    throw newError(ARTIFACT_LIFECYCLE_REQUIRED, 'artifact lifecycle thumbnailPath is required');
  }
  return Object.freeze({ runRoot, targetPath, thumbnailPath });
}

// ---------------------------------------------------------------------------
// P2-G layer 2: executePackagingGeneration
// ---------------------------------------------------------------------------

export async function executePackagingGeneration(prepared, deps = null) {
  if (!isPlainObject(prepared) || !isPlainObject(prepared.metadata)) {
    throw newError(PACKAGING_METADATA_INVALID, 'prepared generation is not a valid prepared state');
  }
  const resolvedDeps = resolveDeps(deps);
  const { now, translation, compiled, capability, payload, metadata } = prepared;
  const startedAt = resolvedDeps.now();

  // Item 11: runId is produced by the createRunId seam; the
  // fingerprint does NOT seed it. Two executions of the same
  // canonical input produce different runIds.
  const runId = asStringTrim(resolvedDeps.createRunId());
  if (!runId) {
    throw newError(EXECUTION_PROVIDER_MODEL_REQUIRED, 'createRunId must return a non-empty string');
  }

  // Pre-execution stale gate (P2 spec 搂6 + P2-F). Rebuild via
  // the canonical fingerprint input mapping. The Service does
  // NOT silently re-prepare; the gate is fail-closed.
  const stale = verifyPackagingGenerationMetadata(metadata, {
    translation, compiled, capability, payload,
  });
  if (!stale.valid) {
    const code = asStringTrim(stale.code, PACKAGING_METADATA_INVALID);
    throw newError(code, `pre-execution stale gate failed: ${(stale.mismatches ?? []).join(', ') || 'unknown'}`, {
      issues: asArray(stale.mismatches),
    });
  }

  // Item 5: production execution config bridge. Default
  // fail-closed.
  const executionConfig = await resolveProductionExecutionConfig({ resolvedDeps, capability });
  // Item 8: artifact lifecycle bridge. Default fail-closed.
  const artifactLifecycle = resolveProductionArtifactLifecycle({ resolvedDeps });

  // Item 4: one Reference execution authority. We resolve
  // from `prepared.payload.references` only; the payload is
  // covered by payloadFingerprint and is the single source of
  // Reference identity for the Provider dispatch.
  const payloadReferences = Array.isArray(payload?.references) ? payload.references : [];
  const adapterReferences = [];
  for (const reference of payloadReferences) {
    let resolved;
    try {
      resolved = await resolvedDeps.readReference(reference);
    } catch (error) {
      if (asStringTrim(error?.code) === REFERENCE_ASSET_UNRESOLVED) {
        throw error;
      }
      throw newError(
        REFERENCE_ASSET_UNRESOLVED,
        `reference ${reference.assetId || 'unknown'} could not be resolved: ${asStringTrim(error?.message, 'unknown')}`,
        { cause: error },
      );
    }
    if (!isPlainObject(resolved) || !asStringTrim(resolved.mimeType) || !asStringTrim(resolved.data)) {
      throw newError(
        REFERENCE_ASSET_UNRESOLVED,
        `reference ${reference.assetId || 'unknown'} returned an invalid shape`,
      );
    }
    adapterReferences.push({
      name: asStringTrim(resolved.name, reference.assetId),
      mimeType: asStringTrim(resolved.mimeType),
      data: asStringTrim(resolved.data),
    });
  }

  // Item 1 / 2 / 3: build universal input from the P2-E
  // payload verbatim. No second prompt serializer, no second
  // hints authority, no duplicated negative rules.
  const universalInput = buildUniversalInput({ prepared, adapterReferences });

  // Item 6: registryModelId (capability routing) is separate
  // from providerModelId (concrete API execution). The
  // adapterId is the registry-routing identity.
  const adapter = buildAdapter({ resolvedDeps, capability, executionConfig });
  const registryModelId = asStringTrim(capability.modelId);
  const providerModelId = asStringTrim(executionConfig.providerModelId);

  // Item 7: real Provider request audit. The redacted audit
  // request is the Shared adapter's `compileRequest(universalInput)`
  // output passed through the Shared redaction; the audit
  // request is NEVER hand-rolled.
  let request;
  try {
    request = adapter.compileRequest(universalInput);
  } catch (error) {
    throw toGenerationProviderFailed(error);
  }
  if (!isPlainObject(request)) {
    throw toGenerationProviderFailed(new Error('Shared adapter compileRequest returned a non-object.'));
  }
  const redactedRequest = redactProviderRequest({
    endpoint: asStringTrim(adapter.protocol),
    region: asStringTrim(resolvedDeps.profileId), // best-effort label; not a secret
    modelId: providerModelId,
    body: request.body ?? request,
  });

  // Item 10: real Provider dispatch. The Shared adapter is the
  // single network authority; the Service never calls
  // `fetch` directly.
  let providerResponse;
  try {
    providerResponse = await adapter.execute(universalInput, {
      fetchImpl: resolvedDeps.fetchImpl,
    });
  } catch (error) {
    throw toGenerationProviderFailed(error);
  }
  if (!isPlainObject(providerResponse) || providerResponse.status !== 'succeeded' || !Array.isArray(providerResponse.images)) {
    throw toGenerationProviderFailed(new Error('Provider response did not contain a successful image payload.'));
  }
  // Item 10: exactly one image per call. The Shared universal
  // contract is `outputCount = 1`.
  if (providerResponse.images.length !== 1) {
    throw toGenerationProviderFailed(new Error(
      `Provider returned ${providerResponse.images.length} images; expected exactly 1 (outputCount=1).`,
    ));
  }

  // Item 7: redacted Provider response from the canonical
  // Shared redaction; no hand-rolled redaction.
  const redactedResponse = redactProviderResponse({
    requestId: providerResponse.requestId,
    providerTaskId: providerResponse.requestId,
    state: 'succeeded',
    taskStatus: 'succeeded',
    model: asStringTrim(providerResponse.modelId || providerModelId),
    parameters: {
      aspectRatio: universalInput.aspectRatio,
      imageSize: universalInput.imageSize,
    },
    images: providerResponse.images,
  });

  // Item 8 + 9: download / verify (Shared). The Service does
  // NOT implement its own download. Missing artifact
  // lifecycle is fail-closed (item 8). A download failure is
  // bucketed under GENERATION_PROVIDER_FAILED; the Service
  // requires `downloaded.decoded === true` (item 9).
  const firstImage = providerResponse.images[0];
  let downloaded = null;
  try {
    downloaded = await resolvedDeps.downloadImpl({
      url: firstImage?.url,
      b64: firstImage?.b64,
      targetPath: artifactLifecycle.targetPath,
      thumbnailPath: artifactLifecycle.thumbnailPath,
      fetchImpl: resolvedDeps.fetchImpl,
    });
  } catch (error) {
    throw toDownloadProviderFailed(error);
  }
  if (!isPlainObject(downloaded) || downloaded.downloadFailed || !downloaded.written || !downloaded.decoded) {
    const reason = asStringTrim(downloaded?.error, 'image download/verify failed');
    throw toDownloadProviderFailed(new Error(reason));
  }

  // Item 13: build the canonical Generation Result. The
  // Generation Result is the audit-trail surface; raw base64
  // image bytes are NOT embedded (item 13).
  const completedAt = resolvedDeps.now();
  const result = {
    schemaVersion: '1.0',
    target: 'packaging',
    status: 'succeeded',
    runId,
    generationMode: asStringTrim(translation.generationMode),
    shotContractId: asStringTrim(translation.shotContract?.id),
    // Item 6: registryModelId / providerModelId both
    // surfaced on the audit trail. The fingerprint sees
    // registryModelId through the canonical input mapping; the
    // providerModelId is the concrete API execution identity
    // and is recorded on the result for the audit.
    model: Object.freeze({
      registryModelId,
      providerModelId,
    }),
    provider: Object.freeze({
      adapterId: asStringTrim(adapter.id),
      protocol: asStringTrim(adapter.protocol),
      provider: asStringTrim(capability.provider),
    }),
    metadata,
    artifacts: Object.freeze(providerResponse.images.map((image, index) => ({
      imageId: `image-${String(index + 1).padStart(2, '0')}`,
      mimeType: asStringTrim(image.mimeType, 'image/png'),
      hasB64: Boolean(image.b64),
      hasUrl: Boolean(image.url),
      sha256: asStringTrim(downloaded.sha256) || null,
      relativePath: asStringTrim(downloaded.relativePathWritten) || null,
      width: Number.isFinite(downloaded.width) ? downloaded.width : null,
      height: Number.isFinite(downloaded.height) ? downloaded.height : null,
      sizeBytes: Number.isFinite(downloaded.sizeBytes) ? downloaded.sizeBytes : null,
    }))),
    diagnostics: Object.freeze({
      startedAt,
      completedAt,
      durationMs: Number.isFinite(Date.parse(completedAt) - Date.parse(startedAt))
        ? Date.parse(completedAt) - Date.parse(startedAt)
        : null,
      referenceCount: payloadReferences.length,
      imageCount: providerResponse.images.length,
      artifactRoot: artifactLifecycle.runRoot,
      // Item 7: the redacted audit request is the Shared
      // adapter's compileRequest output, not a hand-rolled
      // generic shape.
      redactedRequest,
      redactedResponse,
    }),
  };

  // Item 12: persistence failure is NOT a Provider failure.
  // The Shared Run store rejected the audit-trail write; the
  // Provider succeeded and the binary is on disk. The
  // canonical code is GENERATION_PERSISTENCE_FAILED.
  try {
    await resolvedDeps.saveRun(result);
  } catch (error) {
    throw toPersistenceFailed(error);
  }

  return Object.freeze(result);
}

// ---------------------------------------------------------------------------
// P2-G single-call wrapper. Tests + UI use this; it composes
// prepare + execute. Tests that want to inspect prepared state
// can call prepare / execute separately (P2 spec 搂3).
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
    authority: Object.freeze({
      // The Service is honest about its production wiring
      // (item 14): the production Shared runtime must wire
      // the production dependency bridge; the Service does NOT
      // claim a "fully wired" production path by default.
      promptSerialization: 'P2-E buildPackagingProviderPayload (single authority)',
      hintsSerialization: 'P2-E buildPackagingProviderPayload (single authority)',
      negativeRules: 'empty by contract; 14-block Prompt already carries negative_constraints',
      referenceExecution: 'P2-E payload.references (single authority; covered by payloadFingerprint)',
      providerDispatch: 'createMultiModelImageAdapter (Shared)',
      downloadVerify: 'downloadAndVerifyImage (Shared, with decoded === true requirement)',
      redaction: 'redactProviderRequest / redactProviderResponse (Shared)',
      fingerprint: 'buildPackagingGenerationMetadata / verifyPackagingGenerationMetadata (P2-F)',
      // Item 5 + 8 + 11 + 14: production dependency bridge
      // seams. Each is a fail-closed stub by default;
      // production wires them from the Shared runtime.
      productionSeam: Object.freeze({
        resolveExecutionConfig: 'must be wired by production Shared runtime',
        resolveArtifactLifecycle: 'must be wired by production Shared runtime',
        saveRun: 'must be wired by production Shared runtime',
        createRunId: 'crypto.randomUUID default; tests inject deterministic implementation',
      }),
    }),
  });
}
