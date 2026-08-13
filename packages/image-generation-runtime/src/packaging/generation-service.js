// Packaging Generation Service — P2-G Finalization Delta #2.
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
// P2-G Finalization Delta #2 (16 items). Key contracts:
//
//   1) No second prompt serializer. The Provider's `prompt` is
//      `prepared.payload.prompt` verbatim.
//
//   2) Consume canonical payload hints (aspectRatio / imageSize
//      / qualityProfile come from `prepared.payload.hints`).
//
//   3) Negative rules are not duplicated. The 14-block Prompt
//      already carries `negative_constraints`; the Service
//      passes `negativeRules: []`.
//
//   4) One Reference execution authority. The Service resolves
//      references from `prepared.payload.references` only.
//
//   5) Shared production config bridge. The Service exposes
//      `resolveExecutionConfig({apiProfileId, ...})` and
//      `resolveArtifactLifecycle({runId, metadata, translation,
//      apiProfileId})`. Both default to fail-closed stubs.
//
//   6) `registryModelId` and `providerModelId` are separated.
//      The Shared multi-model `adapterId` is the registry
//      routing identity; the actual API model field comes
//      from the resolved execution config.
//
//   7) Real Provider request audit. The redacted audit request
//      is `adapter.compileRequest(universalInput)` passed
//      through the Shared redaction layer (which now strips
//      base64 / data URIs / signed-URL credentials across
//      Seedream / OpenAI / Gemini / Wan / etc.).
//
//   8) Artifact lifecycle is mandatory and async. The Service
//      refuses to execute if `resolveArtifactLifecycle` is not
//      wired or returns an empty shape.
//
//   9) Decoded image required.
//
//  10) Exactly one image enforced (outputCount=1).
//
//  11) Run identity is separate from fingerprint.
//
//  12) Persistence failure is NOT a Provider failure. The
//      canonical code is `GENERATION_PERSISTENCE_FAILED`.
//      Public `err.message` is a safe generic string; raw
//      filesystem / database messages live on `err.cause` and
//      `err.internal` for internal diagnostics only.
//
//  P2-G Finalization Delta #2 (P2-G-F#2, items 1-15):
//
//  - Redact base64 / data URIs / signed-URL credentials from
//    audit: handled by the Shared redaction layer (item 1).
//    The Service consumes the redacted audit verbatim.
//
//  - P2-G-F no longer pins the raw body: the test asserts
//    the audit is the Shared-redacted shape, not the raw
//    compileRequest body.
//
//  - concrete providerModelId recorded in final metadata
//    and participates in execution identity. The P2-F
//    semantic fingerprint remains the canonical authority;
//    the final metadata adds an `executionIdentity` block
//    whose hash participates in stale verification.
//
//  - prepare remains secret-free / deterministic. The
//    semantic metadata is built in `prepare`; the final
//    metadata is built in `execute` from the resolved
//    execution config (which is the production-only
//    boundary; prepare never sees an API Key).
//
//  - explicit `apiProfileId` (not `profileId`). The
//    `apiProfileId` is forwarded to both
//    `resolveExecutionConfig` and `resolveArtifactLifecycle`
//    so production can resolve the right credentials /
//    project root.
//
//  - `region` is not `profileId`. The audit `region` comes
//    from `executionConfig.region`; if absent, it is
//    `undefined` (not a fabricated profile id).
//
//  - artifact lifecycle receives `runId` / `metadata` /
//    `translation` / `apiProfileId` and may be async; the
//    Shared Runtime's real artifact root may need async
//    project-root resolution.
//
//  - artifact lifecycle owns `relativePath` /
//    `thumbnailRelativePath`. The Service does NOT depend on
//    `downloadAndVerifyImage.relativePathWritten` (which the
//    real Shared helper does not return); the relative paths
//    come from the lifecycle shape.
//
//  - the persisted Generation Result records `relativePath`
//    and `thumbnailRelativePath` only. Absolute paths
//    (`runRoot`, `targetPath`, `thumbnailPath`) stay inside
//    the runtime I/O scope and are NEVER persisted on the
//    `artifacts[]` surface or in `diagnostics`.
//
//  - persistence public error message is the safe generic
//    text; raw filesystem / database messages live only on
//    `err.cause` / `err.internal`.
//
//  - `err.cause` is not a long-term-persisted secret
//    container: the serialization-safety test asserts that
//    `JSON.stringify(err)` and `JSON.stringify(err.cause)`
//    never leak raw Authorization / API Key / signed-URL
//    fragments.
//
// Stop conditions honoured (P2 spec §20 §58 §59):
//   - does not call a model directly
//   - does not import any Golden project asset
//   - does not invent a second fingerprint algorithm
//   - does not silently rewrite Locked Assets
//   - does not introduce a second credential or retry stack
//   - does not introduce a Packaging-specific provider HTTP
//     client
//   - does not branch on a specific provider identity at
//     the Service layer
//   - does not embed raw base64 in audit / metadata
//     surfaces
//   - does not derive runId from a semantic fingerprint
//   - does not persist absolute local paths in the
//     Generation Result

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
import { stableHash as sharedStableHash } from '../deliverables/compile-fingerprint.js';

export const PACKAGING_GENERATION_SERVICE_VERSION = '1.0.0';

// Canonical post-execution error codes (P2 spec §32 + the P2-G
// Finalization Delta items 12 + 13 + P2-G-F#2 item 11).
export const GENERATION_PROVIDER_FAILED = 'GENERATION_PROVIDER_FAILED';
export const GENERATION_PERSISTENCE_FAILED = 'GENERATION_PERSISTENCE_FAILED';
export const REFERENCE_ASSET_UNRESOLVED = 'REFERENCE_ASSET_UNRESOLVED';
export const ARTIFACT_LIFECYCLE_REQUIRED = 'ARTIFACT_LIFECYCLE_REQUIRED';
export const EXECUTION_PROVIDER_MODEL_REQUIRED = 'EXECUTION_PROVIDER_MODEL_REQUIRED';
// P2-G-F#2 item 3: the canonical code for a final metadata
// whose executionIdentity (providerModelId / apiProfileId /
// region) drifted away from the previous execution. The
// semantic fingerprint (P2-F) remains valid; the
// executionIdentityHash no longer matches. This is the
// P2-G-F#2 counterpart of the P2-F `COMPILE_INPUT_STALE`
// for the execution boundary.
export const GENERATION_EXECUTION_STALE = 'GENERATION_EXECUTION_STALE';

// Safe generic message for the user-facing surface of a
// Provider / network / download / persistence failure
// (P2-G-F#2 item 11 + 12). Raw messages are kept on
// `err.cause` and `err.internal` for internal diagnostics.
const SAFE_GENERIC_PROVIDER_MESSAGE = 'Packaging provider request failed; see internal diagnostics for details.';
const SAFE_GENERIC_PERSISTENCE_MESSAGE = 'Packaging run persistence failed; see internal diagnostics for details.';
const SAFE_GENERIC_DOWNLOAD_MESSAGE = 'Packaging image download failed; see internal diagnostics for details.';

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function asStringRaw(v, fallback = '') {
  if (typeof v !== 'string') return fallback;
  return v;
}

function asStringTrim(v, fallback = '') {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function asArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.slice();
  return [v];
}

// Secret-like substring deny-list (defense in depth on
// `err.message` and `err.cause`).
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

function newError(code, publicMessage, extras = {}) {
  const err = new Error(`${code}: ${asStringTrim(publicMessage, 'unknown error')}`);
  err.code = code;
  err.issues = [code, ...(extras.issues ?? [])];
  if (extras.cause) err.cause = extras.cause;
  if (extras.internal !== undefined) err.internal = extras.internal;
  return err;
}

function toGenerationProviderFailed(error) {
  const code = asStringTrim(error?.code, GENERATION_PROVIDER_FAILED);
  // P2-G Finalization Delta #3 item 3: `err.cause` is a
  // sanitized snapshot, NOT the raw Error. The raw Error
  // MUST NOT be attached to a public / persisted error
  // surface. Internal diagnostics keep `code` + `retryable`
  // only.
  return newError(GENERATION_PROVIDER_FAILED, SAFE_GENERIC_PROVIDER_MESSAGE, {
    cause: { code, retryable: Boolean(error?.retryable) },
    internal: { code, retryable: Boolean(error?.retryable) },
  });
}

function toDownloadProviderFailed(error) {
  const code = asStringTrim(error?.code, 'IMAGE_DOWNLOAD_FAILED');
  return newError(GENERATION_PROVIDER_FAILED, SAFE_GENERIC_DOWNLOAD_MESSAGE, {
    cause: { code },
    internal: { code },
  });
}

function toPersistenceFailed(error) {
  const code = asStringTrim(error?.code, GENERATION_PERSISTENCE_FAILED);
  // P2-G-F#2 item 11: the PUBLIC message is the safe generic
  // text; the raw filesystem / database message is NOT
  // attached to the public cause. P2-G Final #3 item 3:
  // `err.cause` is a sanitized snapshot, not a raw Error.
  return newError(GENERATION_PERSISTENCE_FAILED, SAFE_GENERIC_PERSISTENCE_MESSAGE, {
    cause: { code },
    internal: { code },
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
// infrastructure (P2-G Final item 5 + P2-G-F#2 items 5/7).
// ---------------------------------------------------------------------------

async function defaultResolveExecutionConfig() {
  throw newError(
    EXECUTION_PROVIDER_MODEL_REQUIRED,
    'No resolveExecutionConfig seam was provided; production Shared runtime must wire the resolveExecutionConfig dependency.',
  );
}

async function defaultResolveArtifactLifecycle() {
  throw newError(
    ARTIFACT_LIFECYCLE_REQUIRED,
    'No resolveArtifactLifecycle seam was provided; production Shared runtime must wire the resolveArtifactLifecycle dependency.',
  );
}

function defaultCreateRunId() {
  // Default to a crypto-backed UUID; tests inject a deterministic
  // implementation (P2-G Final item 11).
  // eslint-disable-next-line node/no-unsupported-features/node-builtins
  return `pkg-${(globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)}`;
}

const DEFAULT_DEPS = Object.freeze({
  readReference: async () => {
    throw newError(
      REFERENCE_ASSET_UNRESOLVED,
      'No readReference dependency was provided; production Shared runtime must wire the readReference dependency.',
    );
  },
  executor: undefined,
  downloadImpl: downloadAndVerifyImage,
  saveRun: async () => {
    throw newError(
      GENERATION_PERSISTENCE_FAILED,
      'No saveRun dependency was provided; production Shared runtime must wire the saveRun dependency.',
    );
  },
  resolveExecutionConfig: defaultResolveExecutionConfig,
  resolveArtifactLifecycle: defaultResolveArtifactLifecycle,
  createRunId: defaultCreateRunId,
  // P2-G-F#2 item 5: the explicit Profile selection name. It
  // is forwarded to both `resolveExecutionConfig` and
  // `resolveArtifactLifecycle`; it is NEVER a `profileId`
  // masquerading as a region.
  apiProfileId: '',
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
    apiProfileId: typeof deps.apiProfileId === 'string' ? deps.apiProfileId : DEFAULT_DEPS.apiProfileId,
    fetchImpl: typeof deps.fetchImpl === 'function' ? deps.fetchImpl : DEFAULT_DEPS.fetchImpl,
    now: typeof deps.now === 'function' ? deps.now : DEFAULT_DEPS.now,
  });
}

// ---------------------------------------------------------------------------
// P2-G layer 1: preparePackagingGeneration
//   secret-free / deterministic / no providerModelId yet.
// ---------------------------------------------------------------------------

export function preparePackagingGeneration(input, deps = null) {
  validateServiceInput(input);
  const resolvedDeps = resolveDeps(deps);
  const now = resolvedDeps.now();

  // 1) Translation (P2-A).
  const translation = createPackagingTranslation(input);
  validatePackagingTranslation(translation);

  // 2) Compiler (P2-D) — deterministic 14-block topology.
  const compiled = compilePackagingPrompt(translation);
  if (!isPlainObject(compiled)) {
    throw newError('PACKAGING_COMPILE_FAILED', 'compiled output is not an object');
  }

  // 3) Provider Capability gate (P2-E). The registryModelId
  //    comes from the input verbatim.
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

  // 4) Provider Adapter Payload (P2-E). Single execution
  //    surface for prompt / hints / references.
  const payload = buildPackagingProviderPayload({ compiled, capability, translation });

  // 5) Generation Metadata + Compile Fingerprint (P2-F).
  //    prepare builds the SEMANTIC metadata; the final
  //    EXECUTION-bound metadata is composed in `execute`
  //    once the production execution config is resolved
  //    (P2-G-F#2 item 4).
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
// authority. No duplicated negative rules.
// ---------------------------------------------------------------------------

function buildUniversalInput({ prepared, adapterReferences }) {
  const payloadHints = isPlainObject(prepared.payload?.hints) ? prepared.payload.hints : {};
  return Object.freeze({
    prompt: asStringRaw(prepared.payload?.prompt),
    aspectRatio: asStringTrim(payloadHints.aspectRatio, '1:1'),
    imageSize: asStringTrim(payloadHints.imageSize, '2K'),
    qualityProfile: asStringTrim(payloadHints.qualityProfile),
    negativeRules: [],
    references: adapterReferences,
    outputCount: 1,
  });
}

function buildAdapter({ resolvedDeps, capability, executionConfig }) {
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

async function resolveProductionExecutionConfig({ resolvedDeps, capability }) {
  // P2-G-F#2 item 5: the explicit Profile selection name is
  // forwarded to the production resolver. The
  // `apiProfileId` is the single source of the Profile
  // selection; it is NEVER a `profileId` masquerading as a
  // region.
  const cfg = await resolvedDeps.resolveExecutionConfig({
    registryModelId: asStringTrim(capability.modelId),
    apiProfileId: asStringTrim(resolvedDeps.apiProfileId),
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
    apiProfileId: asStringTrim(cfg.apiProfileId ?? resolvedDeps.apiProfileId),
    protocol: asStringTrim(cfg.protocol) || asStringTrim(capability.protocol),
    provider: asStringTrim(cfg.provider) || asStringTrim(capability.provider),
    // P2-G-F#2 item 6: `region` is the audit-region surfaced
    // by the Shared runtime's credential resolution. It is
    // NEVER derived from `profileId` (the Profile
    // selection).
    region: asStringTrim(cfg.region),
  };
}

// P2-G-F#2 item 8 + P2-G Final #3 item 4: artifact
// lifecycle owns the relative paths. The Service never
// derives `relativePath` from the download result (the
// real Shared download helper does not return
// `relativePathWritten`); the lifecycle is the single
// authority. Absolute paths stay inside the runtime I/O
// scope and are never persisted on the Generation Result.
// P2-G Final #3 item 4 enforces the contract at the code
// level (not by convention): a relative path that is
// actually absolute, or that contains a `..` traversal
// segment, is fail-closed `ARTIFACT_LIFECYCLE_REQUIRED`.
//
// The deny rules:
//   - non-empty
//   - must NOT be a platform-absolute path:
//     - POSIX: starts with `/`
//     - Windows: starts with `\` or matches `/^[A-Za-z]:[\\\/]/`
//       (drive letter) or starts with `\\` (UNC)
//   - must NOT contain a `..` segment after splitting by
//     `/` or `\` (catches `../foo`, `foo/../bar`, `foo/..`).
function isRelativePathSafe(p) {
  if (typeof p !== 'string' || !p) return false;
  if (p.startsWith('/') || p.startsWith('\\')) return false;
  if (/^[A-Za-z]:[\\\/]/.test(p)) return false;
  const segments = p.split(/[\\\/]+/u).filter((s) => s.length > 0);
  if (segments.includes('..')) return false;
  return true;
}

async function resolveProductionArtifactLifecycle({ resolvedDeps, runId, metadata, translation }) {
  const lifecycle = await resolvedDeps.resolveArtifactLifecycle({
    runId,
    metadata,
    translation,
    apiProfileId: asStringTrim(resolvedDeps.apiProfileId),
  });
  if (!isPlainObject(lifecycle)) {
    throw newError(ARTIFACT_LIFECYCLE_REQUIRED, 'resolveArtifactLifecycle must return an object');
  }
  const runRoot = asStringTrim(lifecycle.runRoot);
  const targetPath = asStringTrim(lifecycle.targetPath);
  const thumbnailPath = asStringTrim(lifecycle.thumbnailPath);
  const relativePath = asStringTrim(lifecycle.relativePath);
  const thumbnailRelativePath = asStringTrim(lifecycle.thumbnailRelativePath);
  if (!runRoot) throw newError(ARTIFACT_LIFECYCLE_REQUIRED, 'artifact lifecycle runRoot is required');
  if (!targetPath) throw newError(ARTIFACT_LIFECYCLE_REQUIRED, 'artifact lifecycle targetPath is required');
  if (!thumbnailPath) throw newError(ARTIFACT_LIFECYCLE_REQUIRED, 'artifact lifecycle thumbnailPath is required');
  if (!relativePath) throw newError(ARTIFACT_LIFECYCLE_REQUIRED, 'artifact lifecycle relativePath is required');
  if (!thumbnailRelativePath) throw newError(ARTIFACT_LIFECYCLE_REQUIRED, 'artifact lifecycle thumbnailRelativePath is required');
  if (!isRelativePathSafe(relativePath)) {
    // P2-G Final Security Closure item 3: the public
    // message MUST NOT echo the offending path. The raw
    // path may carry absolute local paths, drive letters,
    // Windows-style absolute roots, or `..` traversal
    // fragments; none of those belong on the public
    // error surface. The `issues` flag records the
    // failure category without leaking shape.
    throw newError(
      ARTIFACT_LIFECYCLE_REQUIRED,
      'artifact lifecycle returned an unsafe relative path.',
      { issues: ['relative_path_unsafe'] },
    );
  }
  if (!isRelativePathSafe(thumbnailRelativePath)) {
    throw newError(
      ARTIFACT_LIFECYCLE_REQUIRED,
      'artifact lifecycle returned an unsafe relative path.',
      { issues: ['relative_path_unsafe'] },
    );
  }
  return Object.freeze({
    runRoot,
    targetPath,
    thumbnailPath,
    relativePath,
    thumbnailRelativePath,
  });
}

// ---------------------------------------------------------------------------
// P2-G-F#2 item 3: final EXECUTION-BOUND metadata. The P2-F
// semantic metadata is the canonical identity; we extend it
// with an `executionIdentity` block whose hash participates in
// the stale verification. The Shared `stableHash` is the only
// hash authority; we do NOT introduce a second fingerprint
// algorithm.
//
// Shape of the FINAL metadata:
//   {
//     ...semanticMetadata (P2-F frozen),
//     executionIdentity: {
//       registryModelId,
//       providerModelId,
//       provider,
//       protocol,
//       apiProfileId,
//       region | undefined,
//     },
//     compileFingerprint: {
//       ...5 P2-F hashes + compiledAt,
//       executionIdentityHash: <stableHash(executionIdentity)>,
//     },
//   }
// ---------------------------------------------------------------------------

function buildExecutionIdentity({ capability, executionConfig }) {
  return Object.freeze({
    registryModelId: asStringTrim(capability.modelId),
    providerModelId: asStringTrim(executionConfig.providerModelId),
    provider: asStringTrim(executionConfig.provider),
    protocol: asStringTrim(executionConfig.protocol),
    apiProfileId: asStringTrim(executionConfig.apiProfileId),
    region: asStringTrim(executionConfig.region) || undefined,
  });
}

function buildFinalMetadata({ semanticMetadata, capability, executionConfig }) {
  const executionIdentity = buildExecutionIdentity({ capability, executionConfig });
  const executionIdentityHash = sharedStableHash(executionIdentity);
  // Freeze the executionIdentityHash as an additional
  // semantic field on the fingerprint; this is the only
  // way the concrete execution identity participates in
  // stale verification without inventing a second hash
  // algorithm.
  const extendedFingerprint = Object.freeze({
    ...semanticMetadata.compileFingerprint,
    executionIdentityHash,
  });
  return Object.freeze({
    ...semanticMetadata,
    executionIdentity,
    compileFingerprint: extendedFingerprint,
  });
}

// P2-G-F#2 item 3 + P2-G-F#2 Final Exit: stale verification
// for the final metadata. The 5 P2-F semantic hashes still
// pin the canonical identity (rebuilt via
// verifyPackagingGenerationMetadata); the
// `executionIdentityHash` is verified by direct compare on
// the rebuilt execution identity.
//
// Signature: `verifyFinalMetadata(previous, current)`. The
// caller passes the previous final metadata (typically
// loaded from disk) and the current execution inputs
// (translation, compiled, capability, payload,
// executionConfig). The function rebuilds the current
// execution's expected fingerprints and compares them
// against the previous metadata. A `null` previous means
// the first execution for a run; the result is trivially
// `valid: true`.
//
// `executePackagingGeneration` does NOT call this function
// on the freshly-built final metadata (the comparison is
// self-evident for the in-process build); stale verification
// is the caller's responsibility when replaying a previous
// run.
export function verifyFinalMetadata(previous, current) {
  if (previous == null) {
    return { valid: true, mismatches: [] };
  }
  if (!isPlainObject(previous) || !isPlainObject(previous.compileFingerprint)) {
    return { valid: false, code: PACKAGING_METADATA_INVALID, mismatches: ['previous_not_object'] };
  }
  if (!isPlainObject(current) || !isPlainObject(current.executionConfig) || !isPlainObject(current.capability)) {
    return { valid: false, code: PACKAGING_METADATA_INVALID, mismatches: ['current_not_object'] };
  }
  // First, the P2-F semantic stale gate. The previous
  // metadata preserves the P2-F shape (extended with
  // executionIdentity + executionIdentityHash, both of
  // which the P2-F verifier ignores).
  const semanticStale = verifyPackagingGenerationMetadata(previous, {
    translation: current.translation,
    compiled: current.compiled,
    capability: current.capability,
    payload: current.payload,
  });
  if (!semanticStale.valid) {
    return semanticStale;
  }
  // Then, the execution-identity stale gate. The
  // previous fingerprint carries an `executionIdentityHash`;
  // the rebuild computes the expected hash from the
  // current inputs and compares.
  const expectedExecutionIdentity = buildExecutionIdentity({
    capability: current.capability,
    executionConfig: current.executionConfig,
  });
  const expectedExecutionIdentityHash = sharedStableHash(expectedExecutionIdentity);
  if (expectedExecutionIdentityHash !== previous.compileFingerprint.executionIdentityHash) {
    return {
      valid: false,
      code: GENERATION_EXECUTION_STALE,
      mismatches: ['executionIdentityHash'],
    };
  }
  // The stored execution identity must match the rebuild
  // (defense in depth — guards against a hand-edited
  // metadata surface).
  if (expectedExecutionIdentityHash !== sharedStableHash(previous.executionIdentity)) {
    return {
      valid: false,
      code: GENERATION_EXECUTION_STALE,
      mismatches: ['executionIdentity'],
    };
  }
  return { valid: true, mismatches: [] };
}

// ---------------------------------------------------------------------------
// P2-G layer 2: executePackagingGeneration
// ---------------------------------------------------------------------------

export async function executePackagingGeneration(prepared, deps = null) {
  if (!isPlainObject(prepared) || !isPlainObject(prepared.metadata)) {
    throw newError(PACKAGING_METADATA_INVALID, 'prepared generation is not a valid prepared state');
  }
  const resolvedDeps = resolveDeps(deps);
  const { now, translation, compiled, capability, payload, metadata: semanticMetadata } = prepared;
  const startedAt = resolvedDeps.now();

  // P2-G Final item 11: runId is the execution identity; it
  // is produced by the createRunId seam and is NOT derived
  // from the semantic fingerprint.
  const runId = asStringTrim(resolvedDeps.createRunId());
  if (!runId) {
    throw newError(EXECUTION_PROVIDER_MODEL_REQUIRED, 'createRunId must return a non-empty string');
  }

  // P2-G-F#2 item 5: production execution config bridge.
  // Default fail-closed; the production Shared runtime wires
  // the seam from the existing credential / model
  // resolution.
  const executionConfig = await resolveProductionExecutionConfig({ resolvedDeps, capability });

  // P2-G-F#2 item 7: artifact lifecycle bridge. Default
  // fail-closed; the production Shared runtime wires
  // `runRoot` / `targetPath` / `thumbnailPath` /
  // `relativePath` / `thumbnailRelativePath`.
  const artifactLifecycle = await resolveProductionArtifactLifecycle({
    resolvedDeps,
    runId,
    metadata: semanticMetadata,
    translation,
  });

  // Compose the FINAL EXECUTION-BOUND metadata (P2-G-F#2
  // item 3 + 4). The final metadata is what the Generation
  // Result carries.
  const finalMetadata = buildFinalMetadata({
    semanticMetadata,
    capability,
    executionConfig,
  });

  // Pre-execution SEMANTIC stale gate (P2 spec §6 + P2-F +
  // P2-G). The 5 P2-F semantic hashes pin the canonical
  // identity; an in-process mutation of the prepared inputs
  // (e.g. a tampered Locked Asset) is detected before any
  // Provider dispatch.
  const semanticStale = verifyPackagingGenerationMetadata(finalMetadata, {
    translation, compiled, capability, payload,
  });
  if (!semanticStale.valid) {
    const code = asStringTrim(semanticStale.code, PACKAGING_METADATA_INVALID);
    throw newError(code, `pre-execution stale gate failed: ${(semanticStale.mismatches ?? []).join(', ') || 'unknown'}`, {
      issues: asArray(semanticStale.mismatches),
    });
  }

  // P2-G Final item 4: Reference resolution from
  // `prepared.payload.references` only.
  const payloadReferences = Array.isArray(payload?.references) ? payload.references : [];
  const adapterReferences = [];
  for (const reference of payloadReferences) {
    let resolved;
    try {
      resolved = await resolvedDeps.readReference(reference);
    } catch (error) {
      if (asStringTrim(error?.code) === REFERENCE_ASSET_UNRESOLVED) {
        // P2-G Final Security Closure item 2: a downstream
        // `REFERENCE_ASSET_UNRESOLVED` is a sanitized
        // snapshot (no raw Error attached). We re-throw
        // verbatim; production callers are expected to
        // surface sanitized errors. Defense in depth: if the
        // error carries a `message`, we drop it from the
        // public surface.
        throw newError(
          REFERENCE_ASSET_UNRESOLVED,
          'Packaging reference asset could not be resolved.',
          {
            issues: ['reference_unresolved'],
            cause: { code: asStringTrim(error?.code, REFERENCE_ASSET_UNRESOLVED) },
          },
        );
      }
      // P2-G Final Security Closure item 2: the public
      // message is the canonical generic text; the raw
      // `error.message` (which may carry an absolute path,
      // an ENOENT fragment, or any other secret-bearing
      // text) MUST NOT enter the public surface. The cause
      // is a sanitized snapshot; the assetId is preserved
      // for the audit trail; an `issues` flag marks the
      // failure category.
      throw newError(
        REFERENCE_ASSET_UNRESOLVED,
        'Packaging reference asset could not be resolved.',
        {
          issues: ['reference_unresolved'],
          cause: {
            code: asStringTrim(error?.code, REFERENCE_ASSET_UNRESOLVED),
            assetId: asStringTrim(reference.assetId) || null,
          },
        },
      );
    }
    if (!isPlainObject(resolved) || !asStringTrim(resolved.mimeType) || !asStringTrim(resolved.data)) {
      throw newError(
        REFERENCE_ASSET_UNRESOLVED,
        'Packaging reference asset could not be resolved.',
        {
          issues: ['reference_invalid_shape'],
          cause: {
            code: REFERENCE_ASSET_UNRESOLVED,
            assetId: asStringTrim(reference.assetId) || null,
          },
        },
      );
    }
    adapterReferences.push({
      name: asStringTrim(resolved.name, reference.assetId),
      mimeType: asStringTrim(resolved.mimeType),
      data: asStringTrim(resolved.data),
    });
  }

  // P2-G Final items 1 / 2 / 3: build universal input from
  // the P2-E payload verbatim.
  const universalInput = buildUniversalInput({ prepared, adapterReferences });

  // P2-G Final item 6 + P2-G-F#2: registryModelId /
  // providerModelId both flow into the Shared multi-model
  // adapter. The Shared adapter uses `adapterId` for routing
  // and `modelId` for the actual API field.
  const adapter = buildAdapter({ resolvedDeps, capability, executionConfig });
  const registryModelId = asStringTrim(capability.modelId);
  const providerModelId = asStringTrim(executionConfig.providerModelId);

  // P2-G Final item 7 + P2-G-F#2 + P2-G Final #3: real
  // Provider request audit. The redacted audit request is
  // the Shared adapter's `compileRequest(universalInput)`
  // output passed through the Shared redaction layer. The
  // audit `url` is the real request URL sanitized by
  // `redactUrl`; the audit `protocol` is the Shared
  // adapter's protocol identity. The audit MUST NOT
  // pretend that `protocol` is the request endpoint.
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
    protocol: asStringTrim(adapter.protocol),
    method: asStringTrim(request.method),
    url: asStringTrim(request.url),
    bodyKind: asStringTrim(request.bodyKind),
    modelId: providerModelId,
    // P2-G-F#2 item 6: `region` comes from the execution
    // config (the audit region surfaced by the Shared
    // runtime's credential resolution). It is NEVER
    // derived from `apiProfileId` (Profile selection).
    region: asStringTrim(executionConfig.region) || undefined,
    body: request.body ?? request,
    headers: isPlainObject(request.headers) ? request.headers : undefined,
  });

  // P2-G Final item 10: real Provider dispatch. The
  // Shared adapter is the single network authority.
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
  if (providerResponse.images.length !== 1) {
    throw toGenerationProviderFailed(new Error(
      `Provider returned ${providerResponse.images.length} images; expected exactly 1 (outputCount=1).`,
    ));
  }

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

  // P2-G Final items 8 + 9: download / verify. Missing
  // artifact lifecycle is fail-closed (handled above);
  // `decoded === true` is required.
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

  // P2-G-F#2 item 8 + 9: the Generation Result records the
  // RELATIVE paths from the artifact lifecycle. Absolute
  // paths stay inside the runtime I/O scope and are NEVER
  // persisted on the `artifacts[]` surface or in
  // `diagnostics`. The audit `region` is the only
  // region-level surface; absolute local paths are
  // excluded.
  const completedAt = resolvedDeps.now();
  const result = {
    schemaVersion: '1.0',
    target: 'packaging',
    status: 'succeeded',
    runId,
    generationMode: asStringTrim(translation.generationMode),
    shotContractId: asStringTrim(translation.shotContract?.id),
    model: Object.freeze({
      registryModelId,
      providerModelId,
    }),
    provider: Object.freeze({
      adapterId: asStringTrim(adapter.id),
      protocol: asStringTrim(adapter.protocol),
      provider: asStringTrim(capability.provider),
    }),
    apiProfileId: asStringTrim(executionConfig.apiProfileId),
    metadata: finalMetadata,
    artifacts: Object.freeze(providerResponse.images.map((image, index) => ({
      imageId: `image-${String(index + 1).padStart(2, '0')}`,
      mimeType: asStringTrim(image.mimeType, 'image/png'),
      hasB64: Boolean(image.b64),
      hasUrl: Boolean(image.url),
      sha256: asStringTrim(downloaded.sha256) || null,
      // P2-G-F#2 item 8: relative path comes from the
      // artifact lifecycle, NOT from the download result.
      relativePath: artifactLifecycle.relativePath,
      thumbnailRelativePath: artifactLifecycle.thumbnailRelativePath,
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
      // P2-G-F#2 item 9: the audit region is the only
      // region-level surface; absolute local paths are
      // excluded from the persisted Generation Result.
      region: asStringTrim(executionConfig.region) || undefined,
      redactedRequest,
      redactedResponse,
    }),
  };

  // P2-G Final item 12 + P2-G-F#2 item 11: persistence
  // failure is NOT a Provider failure. The public
  // `err.message` of the failure is the safe generic
  // text; the raw filesystem / database message is
  // preserved on `err.cause` and `err.internal` only.
  try {
    await resolvedDeps.saveRun(result);
  } catch (error) {
    throw toPersistenceFailed(error);
  }

  return Object.freeze(result);
}

export async function runPackagingGeneration(input, deps = null) {
  const prepared = preparePackagingGeneration(input, deps);
  return executePackagingGeneration(prepared, deps);
}

export function getPackagingGenerationServiceFingerprint() {
  return Object.freeze({
    schemaVersion: '1.0',
    serviceVersion: PACKAGING_GENERATION_SERVICE_VERSION,
    layers: Object.freeze(['prepare', 'execute']),
    authority: Object.freeze({
      promptSerialization: 'P2-E buildPackagingProviderPayload (single authority)',
      hintsSerialization: 'P2-E buildPackagingProviderPayload (single authority)',
      negativeRules: 'empty by contract; 14-block Prompt already carries negative_constraints',
      referenceExecution: 'P2-E payload.references (single authority; covered by payloadFingerprint)',
      providerDispatch: 'createMultiModelImageAdapter (Shared)',
      downloadVerify: 'downloadAndVerifyImage (Shared, with decoded === true requirement)',
      redaction: 'redactProviderRequest / redactProviderResponse (Shared, target-neutral recursive)',
      fingerprint: 'P2-F semantic metadata (5 hashes) + P2-G executionIdentityHash (Shared stableHash, no second algorithm)',
      productionSeam: Object.freeze({
        resolveExecutionConfig: 'must be wired by production Shared runtime',
        resolveArtifactLifecycle: 'must be wired by production Shared runtime (returns runRoot + relativePath)',
        saveRun: 'must be wired by production Shared runtime',
        createRunId: 'crypto.randomUUID default; tests inject deterministic implementation',
        apiProfileId: 'explicit Profile selection name; forwarded to both execution and lifecycle seams',
      }),
    }),
  });
}
