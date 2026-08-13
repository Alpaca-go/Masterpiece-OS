// P3-A2 — Packaging Workspace View Model.
//
// Capability boundary:
//   Pure UI-safe projection of the Workspace session state.
//   Strips credentials, raw Provider responses, absolute paths,
//   and other secret-bearing fields (P3-A spec §23, §46).
//
// Architectural position (P3-A spec §21, §45, §46):
//   The view model is the *only* shape the future P3-B UI sees.
//   The UI is NOT allowed to bind to the raw session state
//   (which may carry P2 frozen internal objects); the view
//   model is the seam.
//
// Secret-safe contract (P3-A spec §23, §46):
//   - no apiKey
//   - no Authorization / Bearer
//   - no signed-URL credentials
//   - no absolute local paths
//   - no raw provider request bodies
//   - no raw provider response payloads
//
// The view model intentionally DOES NOT include:
//   - sessionId-as-fingerprint (spec §38: workspaceSessionId !=
//     runId != compileFingerprint)
//   - The internal `prepared` object graph (P3-A spec §21
//     recommends `compiledPromptPreview?` only as a derived
//     read-only surface)
//   - The internal `intentAtPrepare` snapshot
//   - The internal `truthFingerprintAtPrepare`

import {
  PACKAGING_WORKSPACE_STATUS,
  PACKAGING_WORKSPACE_STATUS_LABELS,
} from './workspace-state.js';
import { projectLockedAssetsForView } from './lock-assets-projection.js';
import { projectReferenceAssignmentForView } from './reference-assignments.js';

export const PACKAGING_WORKSPACE_VIEW_MODEL_VERSION = '1.0.0';

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.slice();
  return [value];
}

// ---------------------------------------------------------------------------
// Prepared-view projection (P3-A spec §21)
// ---------------------------------------------------------------------------

/**
 * Project a prepared snapshot into a UI-safe Prepared View.
 *
 * Inputs (from P2 frozen `preparePackagingGeneration`):
 *   - prepared.translation (full P2 frozen Translation)
 *   - prepared.compiled (deterministic 14-block Compiler output)
 *   - prepared.capability (Provider Capability)
 *   - prepared.payload (Provider Adapter Payload)
 *   - prepared.metadata (P2 frozen Generation Metadata + Compile
 *     Fingerprint, 5 hashes)
 *
 * UI-safe fields exposed (P3-A spec §21):
 *   - target, generationMode, shotContractId, readiness,
 *     referenceSummary, lockedAssetSummary, providerSummary,
 *     compiledPromptPreview?, metadataSummary, fingerprintSummary,
 *     warnings, blockers
 *
 * The view model does NOT expose the raw payload / raw compiled /
 * raw provider body / raw capability. The compiled prompt preview
 * is exposed read-only (P3-A spec §22); the fingerprint summary
 * is the 5 P2-F hash short ids (NOT the full input).
 */
function projectPreparedView(prepared) {
  if (!isPlainObject(prepared)) {
    return null;
  }
  const translation = isPlainObject(prepared.translation) ? prepared.translation : {};
  const metadata = isPlainObject(prepared.metadata) ? prepared.metadata : {};
  const compiled = isPlainObject(prepared.compiled) ? prepared.compiled : {};
  const capability = isPlainObject(prepared.capability) ? prepared.capability : {};
  const referencePolicy = isPlainObject(translation.referencePolicy)
    ? translation.referencePolicy
    : {};
  const lockedAssets = isPlainObject(translation.lockedAssets)
    ? translation.lockedAssets
    : {};
  const fingerprint = isPlainObject(metadata.compileFingerprint)
    ? metadata.compileFingerprint
    : {};

  // The compiled prompt preview is the canonical Prompt string
  // produced by the deterministic Compiler. P3-A spec §22
  // mandates it is exposed read-only. We do NOT split the
  // prompt by block; the UI may show the full string.
  const compiledPromptPreview = typeof compiled.prompt === 'string'
    ? compiled.prompt
    : (typeof compiled.compiledPrompt === 'string' ? compiled.compiledPrompt : null);

  return Object.freeze({
    target: asString(translation.target, 'packaging'),
    generationMode: asString(translation.generationMode),
    shotContractId: asString(translation.shotContract?.id),
    readiness: 'ready',
    referenceSummary: Object.freeze({
      enabled: Boolean(referencePolicy.enabled),
      required: Boolean(referencePolicy.required),
      count: Number.isFinite(referencePolicy.count) ? referencePolicy.count
        : (Array.isArray(referencePolicy.references) ? referencePolicy.references.length : 0),
      roles: Object.freeze(asArray(referencePolicy.references).map((r) => asString(r?.role))),
    }),
    lockedAssetSummary: projectLockedAssetsForView(lockedAssets),
    providerSummary: Object.freeze({
      registryModelId: asString(capability.modelId),
      provider: asString(capability.provider),
      protocol: asString(capability.protocol),
      referenceSupport: Boolean(capability.referenceSupport),
      maxReferenceImages: Number.isFinite(capability.maxReferenceImages)
        ? capability.maxReferenceImages
        : null,
    }),
    compiledPromptPreview,
    metadataSummary: Object.freeze({
      translationVersion: asString(metadata.translationVersion),
      compilerVersion: asString(metadata.compilerVersion),
      providerCapabilityVersion: asString(metadata.providerCapabilityVersion),
      metadataVersion: asString(metadata.metadataVersion),
    }),
    fingerprintSummary: Object.freeze({
      sourceBundleHash: shortId(fingerprint.sourceBundleHash),
      userIntentHash: shortId(fingerprint.userIntentHash),
      deliverableHash: shortId(fingerprint.deliverableHash),
      referencePlanHash: shortId(fingerprint.referencePlanHash),
      compiledPromptHash: shortId(fingerprint.compiledPromptHash),
      executionIdentityHash: shortId(fingerprint.executionIdentityHash),
      compiledAt: asString(fingerprint.compiledAt),
    }),
    warnings: Object.freeze(asArray(metadata.warnings ?? metadata.gate?.warnings).map(asString)),
    blockers: Object.freeze(asArray(metadata.blockers ?? metadata.gate?.blockers).map(asString)),
  });
}

function shortId(value) {
  if (typeof value !== 'string') return null;
  return value.length > 12 ? `${value.slice(0, 12)}…` : value;
}

// ---------------------------------------------------------------------------
// Execution projection
// ---------------------------------------------------------------------------

function projectExecutionView(lastExecution) {
  if (!isPlainObject(lastExecution)) return null;
  const artifacts = Array.isArray(lastExecution.artifacts) ? lastExecution.artifacts : [];
  return Object.freeze({
    runId: asString(lastExecution.runId),
    status: asString(lastExecution.status),
    generationMode: asString(lastExecution.generationMode),
    shotContractId: asString(lastExecution.shotContractId),
    provider: lastExecution.provider ? Object.freeze({
      adapterId: asString(lastExecution.provider.adapterId),
      protocol: asString(lastExecution.provider.protocol),
      provider: asString(lastExecution.provider.provider),
    }) : null,
    model: lastExecution.model ? Object.freeze({
      registryModelId: asString(lastExecution.model.registryModelId),
      providerModelId: asString(lastExecution.model.providerModelId),
    }) : null,
    apiProfileId: asString(lastExecution.apiProfileId),
    artifacts: Object.freeze(artifacts.map((a) => Object.freeze({
      imageId: asString(a.imageId),
      mimeType: asString(a.mimeType, 'image/png'),
      hasB64: Boolean(a.hasB64),
      hasUrl: Boolean(a.hasUrl),
      relativePath: asString(a.relativePath),
      thumbnailRelativePath: asString(a.thumbnailRelativePath),
      width: Number.isFinite(a.width) ? a.width : null,
      height: Number.isFinite(a.height) ? a.height : null,
      sizeBytes: Number.isFinite(a.sizeBytes) ? a.sizeBytes : null,
    }))),
    diagnostics: lastExecution.diagnostics ? Object.freeze({
      startedAt: asString(lastExecution.diagnostics.startedAt),
      completedAt: asString(lastExecution.diagnostics.completedAt),
      durationMs: Number.isFinite(lastExecution.diagnostics.durationMs)
        ? lastExecution.diagnostics.durationMs
        : null,
      referenceCount: Number.isFinite(lastExecution.diagnostics.referenceCount)
        ? lastExecution.diagnostics.referenceCount
        : null,
      imageCount: Number.isFinite(lastExecution.diagnostics.imageCount)
        ? lastExecution.diagnostics.imageCount
        : null,
      region: asString(lastExecution.diagnostics.region) || null,
    }) : null,
  });
}

// ---------------------------------------------------------------------------
// Error projection (P3-A spec §35)
// ---------------------------------------------------------------------------

function projectErrorView(lastError) {
  if (!isPlainObject(lastError)) return null;
  return Object.freeze({
    code: asString(lastError.code),
    severity: asString(lastError.severity, 'blocking'),
    title: asString(lastError.title) || asString(lastError.code),
    userMessage: asString(lastError.userMessage) || asString(lastError.message),
    recoverable: Boolean(lastError.recoverable),
    suggestedAction: asString(lastError.suggestedAction) || null,
  });
}

// ---------------------------------------------------------------------------
// Read-only readiness
// ---------------------------------------------------------------------------

function projectReadiness(session, preparedView) {
  const status = asString(session.status);
  if (status === PACKAGING_WORKSPACE_STATUS.READY) {
    return Object.freeze({
      canPrepare: false,
      canExecute: true,
      canRetry: true,
      canReset: true,
      stale: false,
      blockers: Object.freeze([]),
      warnings: Object.freeze([]),
    });
  }
  if (status === PACKAGING_WORKSPACE_STATUS.EXECUTED) {
    return Object.freeze({
      canPrepare: true,
      canExecute: true,
      canRetry: true,
      canReset: true,
      stale: false,
      blockers: Object.freeze([]),
      warnings: Object.freeze([]),
    });
  }
  if (status === PACKAGING_WORKSPACE_STATUS.STALE) {
    return Object.freeze({
      canPrepare: true,
      canExecute: false,
      canRetry: false,
      canReset: true,
      stale: true,
      blockers: Object.freeze([asString(session.lastStaleReason) || 'intent_changed']),
      warnings: Object.freeze([]),
    });
  }
  if (status === PACKAGING_WORKSPACE_STATUS.FAILED) {
    return Object.freeze({
      canPrepare: true,
      canExecute: false,
      canRetry: false,
      canReset: true,
      stale: false,
      blockers: Object.freeze([asString(session.lastError?.code) || 'unknown_failure']),
      warnings: Object.freeze([]),
    });
  }
  return Object.freeze({
    canPrepare: true,
    canExecute: false,
    canRetry: false,
    canReset: status !== PACKAGING_WORKSPACE_STATUS.PREPARING
      && status !== PACKAGING_WORKSPACE_STATUS.EXECUTING,
    stale: false,
    blockers: Object.freeze([]),
    warnings: Object.freeze([]),
  });
}

// ---------------------------------------------------------------------------
// Top-level view model
// ---------------------------------------------------------------------------

/**
 * Project a session state into the UI-safe View Model.
 *
 * The future P3-B UI binds to this shape, NOT to the raw
 * session state. The view model is the only authority the
 * UI has for "is this session ready?" / "what is the prepared
 * prompt?" / "what was the last run?".
 */
export function projectPackagingWorkspaceView(session) {
  if (!isPlainObject(session)) {
    throw new TypeError('session must be an object');
  }
  const intent = isPlainObject(session.intent) ? session.intent : null;
  const truthSnapshot = isPlainObject(session.truthSnapshot) ? session.truthSnapshot : {};
  const prepared = isPlainObject(session.prepared) ? session.prepared : null;
  const lastExecution = isPlainObject(session.lastExecution) ? session.lastExecution : null;
  const lastError = isPlainObject(session.lastError) ? session.lastError : null;

  const preparedView = projectPreparedView(prepared?.preparedResult || null);
  const executionView = projectExecutionView(lastExecution);
  const errorView = projectErrorView(lastError);

  return Object.freeze({
    schemaVersion: PACKAGING_WORKSPACE_VIEW_MODEL_VERSION,
    sessionId: asString(session.sessionId),
    projectId: asString(session.projectId),
    target: 'packaging',
    status: asString(session.status),
    statusLabel: asString(PACKAGING_WORKSPACE_STATUS_LABELS[session.status] ?? session.status),
    mode: intent ? asString(intent.generationMode) : null,
    shot: intent ? asString(intent.shotContractId) : null,
    references: intent
      ? Object.freeze(asArray(intent.referenceAssignments).map(projectReferenceAssignmentForView))
      : Object.freeze([]),
    lockedAssets: projectLockedAssetsForView(truthSnapshot.lockedAssets || {}),
    intent: intent
      ? Object.freeze({
          generationMode: asString(intent.generationMode),
          shotContractId: asString(intent.shotContractId),
          explicitUserConstraintsText: asString(intent.explicitUserConstraints?.text),
          referenceCount: Array.isArray(intent.referenceAssignments)
            ? intent.referenceAssignments.length
            : 0,
          providerModelId: asString(intent.providerModelId),
          apiProfileId: asString(intent.apiProfileId),
        })
      : null,
    readiness: projectReadiness(session, preparedView),
    prepared: preparedView,
    execution: executionView,
    error: errorView,
    staleReasons: Object.freeze(asArray(session.lastStaleReasons)),
  });
}

/**
 * Snapshot helper for tests.
 */
export function getPackagingWorkspaceViewModelFingerprint() {
  return Object.freeze({
    schemaVersion: PACKAGING_WORKSPACE_VIEW_MODEL_VERSION,
    includes: Object.freeze([
      'identity',
      'status',
      'target',
      'mode',
      'shot',
      'references',
      'lockedAssets',
      'readiness',
      'prepared',
      'execution',
      'error',
    ]),
    excludes: Object.freeze([
      'apiKey',
      'Authorization',
      'Bearer',
      'raw signed URL',
      'absolute path',
      'raw provider request body',
      'raw provider response body',
    ]),
  });
}
