// P3-A2 — Packaging Workspace Service.
//
// Capability boundary:
//   The Workspace service is the single application-facing
//   entry point for the P3 Packaging Workspace. It exposes the
//   5 P3-A spec §8 API functions (createSession / updateIntent /
//   prepare / execute / reset) plus a `getView` accessor for the
//   future P3-B UI.
//
//   The service is a thin orchestrator. It composes the
//   pure-data helpers (intent-schema, workspace-state,
//   stale-tracker, reference-assignments, lock-assets-projection,
//   view-model) and delegates the actual preparation /
//   execution to the FROZEN P2 generation service. It does NOT
//   reimplement provider capability, reference precedence,
//   reference roles, prompt serialization, fingerprint
//   hashing, or any other P2 frozen authority.
//
// Architectural position (P3-A spec §3, §5, §6, §8, §43, §44):
//   UI / controller
//     ↓
//   workspace-service  (this file)
//     ↓
//   P2 frozen packaging/generation-service
//     ↓
//   Shared Core
//
// Stop conditions honoured (P3-A spec §55):
//   - STOP-P3-A-01: the service does NOT deep-import the P2
//     frozen internals; it imports only `preparePackagingGeneration`
//     and `executePackagingGeneration` from the
//     `packaging/generation-service` surface, plus a small
//     number of canonical error-code constants.
//   - STOP-P3-A-02: the service does NOT construct the
//     Provider payload; the payload is opaque to the Workspace
//     layer.
//   - STOP-P3-A-03: the service does NOT read credential
//     secrets; the production Shared runtime wires the
//     `resolveExecutionConfig` seam.
//   - STOP-P3-A-04: the service does NOT modify the P2 frozen
//     semantic contract.
//   - STOP-P3-A-05: the service does NOT introduce a second
//     Reference role authority; the role list is imported
//     from `reference-policy.js`.
//   - STOP-P3-A-06: the service does NOT introduce a second
//     precedence engine; `resolveReferencePolicy` is the only
//     authority.
//   - STOP-P3-A-07: the service does NOT silently recompile.
//     Intent edits mark STALE; execute from STALE is rejected.
//   - STOP-P3-A-08: the service does NOT persist absolute
//     paths; the Generation Result's `relativePath` /
//     `thumbnailRelativePath` are passed through verbatim from
//     the P2 frozen artifact lifecycle.

import {
  preparePackagingGeneration,
  executePackagingGeneration,
  getPackagingGenerationServiceFingerprint,
  PACKAGING_GENERATION_SERVICE_VERSION,
  GENERATION_PROVIDER_FAILED,
  GENERATION_PERSISTENCE_FAILED,
  REFERENCE_ASSET_UNRESOLVED,
  ARTIFACT_LIFECYCLE_REQUIRED,
  EXECUTION_PROVIDER_MODEL_REQUIRED,
  GENERATION_EXECUTION_STALE,
} from '@masterpiece/image-generation-runtime/packaging/generation-service.js';

import { PACKAGING_GENERATION_MODES } from '@masterpiece/image-generation-runtime/packaging/translation.js';
import {
  PACKAGING_SHOT_CONTRACT_IDS,
  getPackagingShotContract,
} from '@masterpiece/image-generation-runtime/packaging/contracts.js';
import { PACKAGING_REFERENCE_ROLES } from '@masterpiece/image-generation-runtime/packaging/reference-policy.js';
import { resolvePackagingProviderCapability } from '@masterpiece/image-generation-runtime/packaging/provider-capability.js';

import {
  PACKAGING_WORKSPACE_STATUS,
  PACKAGING_WORKSPACE_STATUS_LABELS,
  createInitialSessionState,
  transitionSession,
  isExecuteAllowed,
  isIntentEditAllowed,
  isPrepareAllowed,
  isResetAllowed,
} from './workspace-state.js';
import {
  computeStale,
  STALE_REASON,
} from './stale-tracker.js';
import {
  validatePackagingIntent,
  createDefaultPackagingIntent,
  packagingIntentsEqual,
  computeTruthFingerprint,
  validateReferenceAssignment,
} from './intent-schema.js';
import {
  projectReferenceAssignmentsToPolicy,
  PACKAGING_WORKSPACE_REFERENCE_ASSIGNMENTS_VERSION,
  REFERENCE_VIEW_KEYS,
  getPackagingReferenceAssignmentsViewKeys,
} from './reference-assignments.js';
import {
  projectPackagingWorkspaceView,
  PACKAGING_WORKSPACE_VIEW_MODEL_VERSION,
} from './view-model.js';
import {
  projectLockedAssetsForView,
  computeLockedAssetsFingerprint,
  PACKAGING_WORKSPACE_LOCK_ASSETS_PROJECTION_VERSION,
  getPackagingLockedAssetsProjectionKeys,
  getPackagingLockedAssetsRedactedKeys,
} from './lock-assets-projection.js';

export {
  PACKAGING_WORKSPACE_STATUS,
  PACKAGING_WORKSPACE_STATUS_LABELS,
  PACKAGING_WORKSPACE_REFERENCE_ASSIGNMENTS_VERSION,
  PACKAGING_WORKSPACE_VIEW_MODEL_VERSION,
  PACKAGING_WORKSPACE_LOCK_ASSETS_PROJECTION_VERSION,
  PACKAGING_GENERATION_SERVICE_VERSION,
  PACKAGING_GENERATION_MODES,
  PACKAGING_SHOT_CONTRACT_IDS,
  PACKAGING_REFERENCE_ROLES,
  STALE_REASON,
  REFERENCE_VIEW_KEYS,
  validateReferenceAssignment,
  projectReferenceAssignmentsToPolicy,
  getPackagingReferenceAssignmentsViewKeys,
  projectLockedAssetsForView,
  getPackagingLockedAssetsProjectionKeys,
  getPackagingLockedAssetsRedactedKeys,
  computeLockedAssetsFingerprint,
  projectPackagingWorkspaceView,
  getPackagingGenerationServiceFingerprint,
};

export const PACKAGING_WORKSPACE_SERVICE_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Session storage
//
// P3-A2 sessions are in-memory. P3-A6 / Save Contract (P3-A spec
// §29, §30) is the future owner of persistence; the storage
// interface is `Map<sessionId, state>` so a persistence adapter
// can be plugged in later without changing the public API.
// ---------------------------------------------------------------------------

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function newSessionId() {
  return `pkg-ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeStructuredClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function freezeState(state) {
  return Object.freeze({
    ...state,
    truthSnapshot: state.truthSnapshot ? Object.freeze({ ...state.truthSnapshot }) : state.truthSnapshot,
  });
}

function withError(state, error) {
  return Object.freeze({
    ...state,
    status: PACKAGING_WORKSPACE_STATUS.FAILED,
    lastError: Object.freeze({
      code: isPlainObject(error) && typeof error.code === 'string' ? error.code : 'PACKAGING_WORKSPACE_UNKNOWN_ERROR',
      severity: 'blocking',
      title: typeof error?.code === 'string' ? error.code : 'unknown_error',
      userMessage: typeof error?.message === 'string' ? error.message : String(error?.message ?? 'unknown error'),
      recoverable: true,
      suggestedAction: 'review_workspace_state',
    }),
  });
}

// Canonical P2 frozen error codes that the Workspace must
// surface as-is (no rewording of the canonical source code,
// per P3-A spec §35).
const SURFACED_GENERATION_ERROR_CODES = new Set([
  GENERATION_PROVIDER_FAILED,
  GENERATION_PERSISTENCE_FAILED,
  REFERENCE_ASSET_UNRESOLVED,
  ARTIFACT_LIFECYCLE_REQUIRED,
  EXECUTION_PROVIDER_MODEL_REQUIRED,
  GENERATION_EXECUTION_STALE,
  'PACKAGING_METADATA_INVALID',
  'PACKAGING_TRANSLATION_INVALID',
  'SHOT_CONTRACT_INVALID',
  'PACKAGING_COMPILE_FAILED',
  'COMPILE_INPUT_STALE',
  'REFERENCE_REQUIRED',
  'REFERENCE_ROLE_INVALID',
  'REFERENCE_UNSUPPORTED',
  'PROVIDER_CAPABILITY_MISMATCH',
]);

function canonicalErrorCode(error) {
  const code = isPlainObject(error) && typeof error.code === 'string' ? error.code : '';
  return SURFACED_GENERATION_ERROR_CODES.has(code) ? code : 'PACKAGING_WORKSPACE_UNKNOWN_ERROR';
}

// ---------------------------------------------------------------------------
// Translation input projection
//
// The Workspace intent is a thin user-editable surface; the
// actual P2 frozen Translation input also needs a few derived
// fields (negative constraints, provider hints, provenance).
// This function projects the Workspace intent + truth surface
// into the P2 frozen `createPackagingTranslation` input shape.
//
// The Workspace layer is the OWNER of:
//   - user-editable fields (intent)
//   - negative constraints (empty by contract; P3-A spec §22)
//   - provenance timestamps
//
// The Workspace layer is NOT the owner of:
//   - the prompt 14-block (the P2 frozen Compiler is)
//   - the Provider Capability (the Registry is)
//   - the Reference Policy resolution (reference-policy.js is)
// ---------------------------------------------------------------------------

function projectIntentToTranslationInput({ intent, truthSnapshot, now }) {
  const selectedModelId = intent.providerModelId;
  // Resolve the registered model through the existing P2 capability
  // authority so Reference-First validation sees the same capability that
  // P2 will gate after compilation. The Workspace does not author a support
  // flag or reference limit.
  const providerCapability = resolvePackagingProviderCapability({
    modelId: selectedModelId,
    generationMode: intent.generationMode,
    referencePolicy: { references: intent.referenceAssignments },
  });
  const policy = projectReferenceAssignmentsToPolicy({
    generationMode: intent.generationMode,
    assignments: intent.referenceAssignments,
    providerCapability,
  });
  // P3-A11 consumes, but never redefines, the P2 Shot Contract geometry.
  // An invalid id or incomplete canonical contract fails through the existing
  // P2 authority; there is no Workspace-owned ratio or fallback.
  const shotContract = getPackagingShotContract(intent.shotContractId);
  const lockedAssets = isPlainObject(truthSnapshot?.lockedAssets)
    ? truthSnapshot.lockedAssets
    : {};
  const projectVisualContext = isPlainObject(truthSnapshot?.projectVisualContext)
    ? truthSnapshot.projectVisualContext
    : {};
  return {
    schemaVersion: '1.0',
    target: 'packaging', // fixed; P2 frozen ignores caller-supplied target
    // P3-A10 corrective mapping: the Workspace's historical
    // `providerModelId` field carries the user-selected registry
    // model identity. P2 calls that same capability-lookup identity
    // `modelId`; the concrete Provider API model is resolved later
    // from `apiProfileId` by the execution-config seam.
    modelId: selectedModelId,
    generationMode: intent.generationMode,
    shotContract: { id: intent.shotContractId },
    lockedAssets,
    // The same canonical Locked Asset structure truth serves the P2 locked
    // surface and its structural formFactor. Structural features remain
    // distinct evidence from Project Visual Context packageStructures.
    structure: {
      formFactor: lockedAssets?.structure?.formFactor,
      structuralFeatures: Array.isArray(projectVisualContext.packageStructures)
        ? projectVisualContext.packageStructures
        : [],
    },
    visualDirection: {
      summary: projectVisualContext.packagingConcept,
    },
    referencePolicy: {
      enabled: policy.enabled,
      required: policy.required,
      references: policy.references,
    },
    providerCapability: {
      referenceSupport: providerCapability.referenceSupport,
      maxReferenceImages: providerCapability.maxReferenceImages,
    },
    userConstraints: {
      text: intent.explicitUserConstraints?.text ?? '',
    },
    // The Workspace layer supplies a few projection-only fields
    // the P2 frozen Translation layer accepts but does not own
    // (P3-A spec §22 / §26 — the negative rules are empty by
    // contract; the 14-block Prompt already carries
    // negative_constraints).
    negativeConstraints: [],
    providerHints: {
      referenceRolePriority: intent.referenceAssignments.map((r) => r.role),
      aspectRatio: shotContract.aspectRatio,
    },
    projectIdentity: isPlainObject(truthSnapshot?.projectIdentity)
      ? truthSnapshot.projectIdentity
      : {},
    analysisContext: isPlainObject(truthSnapshot?.analysisContext)
      ? truthSnapshot.analysisContext
      : {},
    provenance: {
      sourceMode: intent.generationMode,
      inputSources: ['workspace-session'],
      createdAt: now,
    },
  };
}

// ---------------------------------------------------------------------------
// Session store + factory
// ---------------------------------------------------------------------------

/**
 * Create a Packaging Workspace Service.
 *
 * @param {object} [options]
 * @param {Function} [options.preparePackagingGeneration] - the
 *   P2 frozen preparation function. Defaults to the real
 *   `preparePackagingGeneration` from
 *   `@masterpiece/image-generation-runtime/packaging/generation-service`.
 *   Tests can inject a mock.
 * @param {Function} [options.executePackagingGeneration] - the
 *   P2 frozen execution function. Defaults to the real one.
 * @param {Function} [options.newSessionId] - the session id
 *   factory. Defaults to a deterministic timestamp+random id.
 * @param {Function} [options.now] - the timestamp factory.
 *   Defaults to `() => new Date().toISOString()`.
 */
export function createPackagingWorkspaceService(options = {}) {
  const prepareFn = typeof options.preparePackagingGeneration === 'function'
    ? options.preparePackagingGeneration
    : preparePackagingGeneration;
  const executeFn = typeof options.executePackagingGeneration === 'function'
    ? options.executePackagingGeneration
    : executePackagingGeneration;
  const sessionIdFactory = typeof options.newSessionId === 'function'
    ? options.newSessionId
    : newSessionId;
  const now = typeof options.now === 'function' ? options.now : (() => new Date().toISOString());

  /** @type {Map<string, object>} */
  const sessions = new Map();

  function getSessionOrThrow(sessionId) {
    const state = sessions.get(sessionId);
    if (!state) {
      const err = new Error(`PACKAGING_WORKSPACE_UNKNOWN_SESSION: ${sessionId}`);
      err.code = 'PACKAGING_WORKSPACE_UNKNOWN_SESSION';
      err.sessionId = sessionId;
      throw err;
    }
    return state;
  }

  function freezeAndStore(nextState) {
    const frozen = freezeState(nextState);
    sessions.set(frozen.sessionId, frozen);
    return frozen;
  }

  function withStaleStatusIfNeeded(state) {
    if (!state.prepared) return state;
    if (state.status !== PACKAGING_WORKSPACE_STATUS.READY
        && state.status !== PACKAGING_WORKSPACE_STATUS.EXECUTED) {
      return state;
    }
    const stale = computeStale({
      currentIntent: state.intent,
      prepared: state.prepared,
      truthSnapshot: state.truthSnapshot,
    });
    if (!stale.stale) {
      return state;
    }
    let nextStatus = state.status;
    if (state.status === PACKAGING_WORKSPACE_STATUS.READY
        || state.status === PACKAGING_WORKSPACE_STATUS.EXECUTED) {
      nextStatus = PACKAGING_WORKSPACE_STATUS.STALE;
    }
    return Object.freeze({
      ...state,
      status: nextStatus,
      lastStaleReasons: stale.reasons,
      lastStaleReason: stale.reasons[0] ?? null,
    });
  }

  // -----------------------------------------------------------------------
  // 1) createPackagingWorkspaceSession
  // -----------------------------------------------------------------------

  function createSession(input) {
    if (!isPlainObject(input)) {
      const err = new Error('PACKAGING_WORKSPACE_INVALID_INPUT: input must be an object');
      err.code = 'PACKAGING_WORKSPACE_INVALID_INPUT';
      throw err;
    }
    const projectId = typeof input.projectId === 'string' ? input.projectId : '';
    if (!projectId) {
      const err = new Error('PACKAGING_WORKSPACE_INVALID_INPUT: projectId is required');
      err.code = 'PACKAGING_WORKSPACE_INVALID_INPUT';
      throw err;
    }
    const truthSnapshot = isPlainObject(input.truthSnapshot) ? input.truthSnapshot : {};
    const initialIntent = isPlainObject(input.initialIntent) ? input.initialIntent : null;
    let normalizedIntent = null;
    if (initialIntent) {
      const validation = validatePackagingIntent(initialIntent);
      if (!validation.valid) {
        const err = new Error(`PACKAGING_WORKSPACE_INVALID_INTENT: ${validation.issues.join(', ')}`);
        err.code = validation.code;
        err.issues = validation.issues.slice();
        throw err;
      }
      normalizedIntent = validation.intent;
    } else {
      normalizedIntent = createDefaultPackagingIntent();
    }
    const sessionId = sessionIdFactory();
    const state = createInitialSessionState({
      sessionId,
      projectId,
      truthSnapshot: {
        lockedAssets: truthSnapshot.lockedAssets || {},
        analysisContext: truthSnapshot.analysisContext || {},
        projectIdentity: truthSnapshot.projectIdentity || {},
        ...(isPlainObject(truthSnapshot.projectVisualContext)
          ? { projectVisualContext: truthSnapshot.projectVisualContext }
          : {}),
      },
      initialIntent: normalizedIntent,
    });
    return freezeAndStore(state);
  }

  // -----------------------------------------------------------------------
  // 2) updatePackagingWorkspaceIntent
  // -----------------------------------------------------------------------

  function updateIntent(sessionId, patch) {
    const state = getSessionOrThrow(sessionId);
    if (!isIntentEditAllowed(state.status)) {
      const err = new Error(
        `PACKAGING_WORKSPACE_INTENT_EDIT_REJECTED: status=${state.status}; intent edits are not allowed during async work`,
      );
      err.code = 'PACKAGING_WORKSPACE_INTENT_EDIT_REJECTED';
      err.status = state.status;
      throw err;
    }
    if (!isPlainObject(patch)) {
      const err = new Error('PACKAGING_WORKSPACE_INVALID_PATCH: patch must be an object');
      err.code = 'PACKAGING_WORKSPACE_INVALID_PATCH';
      throw err;
    }
    // Only the 6 user-editable semantic fields (P3-A spec §8.2 / §10)
    // are accepted. UI-only fields (previewUri / displayName /
    // selectionOrderUI) are not part of the Workspace intent and
    // are silently ignored (spec §15 / §37).
    const allowedKeys = new Set([
      'generationMode',
      'shotContractId',
      'explicitUserConstraints',
      'referenceAssignments',
      'providerModelId',
      'apiProfileId',
    ]);
    const next = { ...state.intent };
    for (const key of Object.keys(patch)) {
      if (!allowedKeys.has(key)) continue;
      next[key] = patch[key];
    }
    const validation = validatePackagingIntent(next);
    if (!validation.valid) {
      const err = new Error(`PACKAGING_WORKSPACE_INVALID_INTENT: ${validation.issues.join(', ')}`);
      err.code = validation.code;
      err.issues = validation.issues.slice();
      throw err;
    }
    const normalized = validation.intent;
    const unchanged = state.intent && packagingIntentsEqual(state.intent, normalized);
    let nextState = {
      ...state,
      intent: normalized,
      lastError: null,
    };
    if (unchanged) {
      return freezeAndStore(nextState);
    }
    nextState = withStaleStatusIfNeeded(nextState);
    return freezeAndStore(nextState);
  }

  // -----------------------------------------------------------------------
  // 2.5) setTruthSnapshot — P3-A5 §30 Project Restore Contract.
  //
  // The truth surface (Locked Assets + Analysis Context) is
  // read-only on the Workspace side, but upstream the
  // project may have changed (e.g. the user updated the
  // locked brand name through the upstream project
  // authority). P3-A spec §30 mandates that a truth drift
  // invalidates the current preparation; the caller is the
  // sole owner of the truth surface (no second truth store).
  //
  // This API is the single canonical way to update truth
  // within the same session:
  //   - Caller-controlled (no implicit refresh, no automatic
  //     upstream sync)
  //   - Triggers the existing `withStaleStatusIfNeeded`
  //     helper; if the saved `truthFingerprintAtPrepare` no
  //     longer matches the new truth, the session transitions
  //     to STALE with reason `truth_surface_changed`
  //   - Gated by the same intent-edit gate as
  //     `updatePackagingWorkspaceIntent` (no mutation during
  //     PREPARING / EXECUTING)
  //   - Preserves intent, projectId, lastExecution, and any
  //     other session fields
  //   - Does NOT silently recompile (STOP-P3-A-07): the
  //     caller must explicitly re-prepare.
  // -----------------------------------------------------------------------

  function setTruthSnapshot(sessionId, newTruth) {
    const state = getSessionOrThrow(sessionId);
    if (!isIntentEditAllowed(state.status)) {
      const err = new Error(
        `PACKAGING_WORKSPACE_TRUTH_UPDATE_REJECTED: status=${state.status}; truth update is not allowed during async work`,
      );
      err.code = 'PACKAGING_WORKSPACE_TRUTH_UPDATE_REJECTED';
      err.status = state.status;
      throw err;
    }
    if (!isPlainObject(newTruth)) {
      const err = new Error('PACKAGING_WORKSPACE_INVALID_INPUT: newTruth must be an object');
      err.code = 'PACKAGING_WORKSPACE_INVALID_INPUT';
      throw err;
    }
    const truthSnapshot = {
      lockedAssets: newTruth.lockedAssets || {},
      analysisContext: newTruth.analysisContext || {},
      projectIdentity: newTruth.projectIdentity || {},
      ...(isPlainObject(newTruth.projectVisualContext)
        ? { projectVisualContext: newTruth.projectVisualContext }
        : {}),
    };
    let nextState = {
      ...state,
      truthSnapshot,
      lastError: null,
    };
    nextState = withStaleStatusIfNeeded(nextState);
    return freezeAndStore(nextState);
  }

  // -----------------------------------------------------------------------
  // 3) preparePackagingWorkspaceGeneration
  // -----------------------------------------------------------------------

  function prepareGeneration(sessionId, deps = null) {
    const state = getSessionOrThrow(sessionId);
    if (!isPrepareAllowed(state.status)) {
      const err = new Error(
        `PACKAGING_WORKSPACE_PREPARE_REJECTED: status=${state.status}; prepare is not allowed during async work`,
      );
      err.code = 'PACKAGING_WORKSPACE_PREPARE_REJECTED';
      err.status = state.status;
      throw err;
    }
    if (!state.intent) {
      const err = new Error('PACKAGING_WORKSPACE_PREPARE_REJECTED: no intent set on session');
      err.code = 'PACKAGING_WORKSPACE_PREPARE_REJECTED';
      err.issues = ['intent_missing'];
      throw err;
    }
    const transitional = transitionSession(state, PACKAGING_WORKSPACE_STATUS.PREPARING);
    freezeAndStore(transitional);
    const ts = now();
    const input = projectIntentToTranslationInput({
      intent: state.intent,
      truthSnapshot: state.truthSnapshot,
      now: ts,
    });
    let preparedResult;
    try {
      preparedResult = prepareFn(input, deps || null);
    } catch (error) {
      const err = new Error(
        `PACKAGING_WORKSPACE_PREPARE_FAILED: ${error?.message ?? 'unknown'}`,
      );
      err.code = canonicalErrorCode(error);
      err.cause = error;
      err.issues = Array.isArray(error?.issues) ? error.issues.slice() : [];
      const failed = withError(state, err);
      freezeAndStore(failed);
      throw err;
    }
    const intentAtPrepare = safeStructuredClone(state.intent);
    const truthFingerprintAtPrepare = computeTruthFingerprint(state.truthSnapshot);
    const preparedSnapshot = Object.freeze({
      snapshotAt: ts,
      intentAtPrepare,
      truthFingerprintAtPrepare,
      preparedResult,
    });
    const nextState = Object.freeze({
      ...transitional,
      status: PACKAGING_WORKSPACE_STATUS.READY,
      prepared: preparedSnapshot,
      lastError: null,
      // P3-A spec §11 "no silent recompile" + §30: a
      // successful re-prepare establishes a fresh
      // identity, so the previous stale reasons are no
      // longer relevant. The new prepared snapshot is
      // anchored to the new intentAtPrepare and
      // truthFingerprintAtPrepare; computeStale on the
      // new snapshot returns `stale: false`.
      lastStaleReasons: Object.freeze([]),
      lastStaleReason: null,
    });
    return freezeAndStore(nextState);
  }

  // -----------------------------------------------------------------------
  // 4) executePackagingWorkspaceGeneration
  // -----------------------------------------------------------------------

  async function executeGeneration(sessionId, deps = null) {
    const state = getSessionOrThrow(sessionId);
    if (!isExecuteAllowed(state.status)) {
      // P3-A5.1 — STALE execute must remain distinguishable
      // from a plain "not yet ready" rejection. The early
      // gate projects the canonical STALE issues
      // ['stale', ...lastStaleReasons] (deterministic
      // canonical order inherited from `detectStaleChange`
      // / `computeStale`); non-STALE rejections keep
      // ['not_ready']. This is the single source of truth;
      // we do NOT introduce a second stale detector.
      let issues = ['not_ready'];
      if (state.status === PACKAGING_WORKSPACE_STATUS.STALE) {
        const stale = computeStale({
          currentIntent: state.intent,
          prepared: state.prepared,
          truthSnapshot: state.truthSnapshot,
        });
        // Defense in depth: if computeStale returns no
        // reasons (e.g. prepared was cleared), fall back
        // to the saved lastStaleReasons.
        const reasons = stale.reasons.length > 0
          ? stale.reasons
          : (Array.isArray(state.lastStaleReasons) ? Array.from(state.lastStaleReasons) : []);
        issues = reasons.length > 0
          ? ['stale', ...reasons]
          : ['stale'];
      }
      const err = new Error(
        `PACKAGING_WORKSPACE_EXECUTE_REJECTED: status=${state.status}; execute requires status=ready|executed`,
      );
      err.code = 'PACKAGING_WORKSPACE_EXECUTE_REJECTED';
      err.status = state.status;
      err.issues = Object.freeze(issues);
      throw err;
    }
    if (!state.prepared) {
      const err = new Error('PACKAGING_WORKSPACE_EXECUTE_REJECTED: no prepared snapshot');
      err.code = 'PACKAGING_WORKSPACE_EXECUTE_REJECTED';
      err.issues = ['prepared_missing'];
      throw err;
    }
    const stale = computeStale({
      currentIntent: state.intent,
      prepared: state.prepared,
      truthSnapshot: state.truthSnapshot,
    });
    if (stale.stale) {
      const err = new Error(
        `PACKAGING_WORKSPACE_EXECUTE_REJECTED: stale; reasons=${stale.reasons.join(',')}`,
      );
      err.code = 'PACKAGING_WORKSPACE_EXECUTE_REJECTED';
      err.issues = ['stale', ...stale.reasons];
      throw err;
    }
    const transitional = transitionSession(state, PACKAGING_WORKSPACE_STATUS.EXECUTING);
    freezeAndStore(transitional);
    let executionResult;
    try {
      executionResult = await executeFn(state.prepared.preparedResult, deps || null);
    } catch (error) {
      const code = canonicalErrorCode(error);
      const err = new Error(
        `PACKAGING_WORKSPACE_EXECUTE_FAILED: ${error?.message ?? 'unknown'}`,
      );
      err.code = code;
      err.cause = error;
      err.issues = Array.isArray(error?.issues) ? error.issues.slice() : [];
      const failed = withError(state, err);
      freezeAndStore(failed);
      throw err;
    }
    const nextState = Object.freeze({
      ...transitional,
      status: PACKAGING_WORKSPACE_STATUS.EXECUTED,
      lastExecution: executionResult,
      lastError: null,
    });
    return freezeAndStore(nextState);
  }

  // -----------------------------------------------------------------------
  // 5) resetPackagingWorkspacePreparation
  // -----------------------------------------------------------------------

  function resetPreparation(sessionId) {
    const state = getSessionOrThrow(sessionId);
    if (!isResetAllowed(state.status)) {
      const err = new Error(
        `PACKAGING_WORKSPACE_RESET_REJECTED: status=${state.status}`,
      );
      err.code = 'PACKAGING_WORKSPACE_RESET_REJECTED';
      err.status = state.status;
      throw err;
    }
    const nextStatus = state.intent
      ? PACKAGING_WORKSPACE_STATUS.UNPREPARED
      : PACKAGING_WORKSPACE_STATUS.NEW;
    const nextState = Object.freeze({
      ...state,
      status: nextStatus,
      prepared: null,
      lastError: null,
      lastStaleReasons: Object.freeze([]),
      lastStaleReason: null,
      // P3-A spec §29: reset MUST NOT clear the truth surface,
      // the project id, the historical run records, the API
      // profile, or the credentials (those belong to the
      // existing authority). We only clear the Workspace
      // preparation-related transient state.
      truthSnapshot: state.truthSnapshot,
      lastExecution: state.lastExecution, // run history preserved
    });
    return freezeAndStore(nextState);
  }

  // -----------------------------------------------------------------------
  // getView (P3-A2: the future UI's only view surface)
  // -----------------------------------------------------------------------

  function getView(sessionId) {
    const state = getSessionOrThrow(sessionId);
    return projectPackagingWorkspaceView(state);
  }

  // -----------------------------------------------------------------------
  // checkStale (P3-C4.2.1: fresh STALE recheck for ops-layer preflight)
  //
  // Returns the fresh `{ stale, reasons }` view as computed by
  // `computeStale` against the current state, NOT the snapshot
  // carried by `state.lastStaleReasons`. The operations layer
  // uses this to enforce the canonical STALE-first ordering at
  // the `execute-generation` boundary so an already-STALE
  // session never reaches the execution-preflight
  // identity-mismatch check in `buildExecutionDeps`.
  // -----------------------------------------------------------------------

  function checkStale(sessionId) {
    const state = getSessionOrThrow(sessionId);
    const fresh = computeStale({
      currentIntent: state.intent,
      prepared: state.prepared,
      truthSnapshot: state.truthSnapshot,
    });
    return Object.freeze({
      stale: fresh.stale === true,
      reasons: Object.freeze(Array.isArray(fresh.reasons) ? Array.from(fresh.reasons) : []),
    });
  }

  // -----------------------------------------------------------------------
  // removeSession (test/utility helper; not part of the P3-A2 public API)
  // -----------------------------------------------------------------------

  function _removeSession(sessionId) {
    sessions.delete(sessionId);
  }

  return Object.freeze({
    version: PACKAGING_WORKSPACE_SERVICE_VERSION,
    schemaVersion: PACKAGING_WORKSPACE_SERVICE_VERSION,
    createSession,
    updateIntent,
    setTruthSnapshot,
    prepareGeneration,
    executeGeneration,
    resetPreparation,
    getView,
    checkStale,
    _removeSession,
  });
}
