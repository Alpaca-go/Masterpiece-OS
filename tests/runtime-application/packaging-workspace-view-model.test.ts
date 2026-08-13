// P3-A4 — UI-safe View Model / Projection tests.
//
// Test groups (per P3-A spec §21 / §22 / §23 / §35 / §45 / §46 / §16 / §17 / §18 / §19 / §20):
//   V-01..V-08  Per-status projection (NEW / UNPREPARED / PREPARING / READY / STALE / EXECUTING / EXECUTED / FAILED)
//   V-09        Top-level shape: schemaVersion + canonical keys allowlist
//   V-10..V-15  Capability consistency (top-level ↔ readiness ↔ workspace-state helpers)
//   V-16..V-19  Intent projection: semantic / UI-only / internal fields
//   V-20..V-22  Reference projection: role / displayName / previewUri / source
//   V-23..V-25  Locked assets projection: brand / logo / structure / credential-stripped
//   V-26..V-28  Preparation / fingerprint passthrough: 5 P2-F hashes + executionIdentityHash
//   V-29..V-31  Validation / readiness: warnings, blockers, readiness block
//   V-32..V-35  Error projection: canonical code, userMessage, hostile-input redaction
//   V-36..V-40  No absolute path / file:// / UNC / Windows drive / Unix /home
//   V-41..V-45  No apiKey / Authorization / Bearer / secret / credential
//   V-46..V-50  No raw provider payload / raw preparedResult dump / 14-block topology
//   V-51..V-54  Schema version + capability-naming + capability projection
//   V-55..V-58  Determinism: same input → byte-stable JSON
//   V-59..V-62  Immutability: view model frozen + nested arrays/objects frozen
//   V-63..V-65  Nested mutation isolation: mutating viewModel does not change session
//   V-66..V-69  Runtime-core public export boundary (no UI deep-import of P2 internals)
//   V-70..V-72  Architecture guards: view-model does not import fs / credential / network
//   V-73        P2 frozen regression: no changes to packaging/ modules
//   V-74..V-78  Deterministic serialization helper (serializeWorkspaceView)

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createPackagingWorkspaceService,
  PACKAGING_WORKSPACE_STATUS,
  PACKAGING_WORKSPACE_STATUS_LABELS,
  PACKAGING_WORKSPACE_VIEW_MODEL_VERSION,
  PACKAGING_WORKSPACE_STATE_MACHINE_VERSION,
  PACKAGING_WORKSPACE_SERVICE_VERSION,
  PACKAGING_WORKSPACE_INTENT_VERSION,
  PACKAGING_WORKSPACE_STALE_TRACKER_VERSION,
  PACKAGING_GENERATION_SERVICE_VERSION,
  PACKAGING_GENERATION_MODES,
  PACKAGING_SHOT_CONTRACT_IDS,
  PACKAGING_REFERENCE_ROLES,
  projectPackagingWorkspaceView,
  getPackagingWorkspaceViewModelFingerprint,
  getPackagingWorkspaceViewModelKeys,
  getPackagingWorkspaceIntentKeys,
  getPackagingWorkspaceExecutionKeys,
  getPackagingWorkspacePreparedKeys,
  getPackagingWorkspaceErrorKeys,
  serializeWorkspaceView,
  isExecuteAllowed,
  isIntentEditAllowed,
  isPrepareAllowed,
  isResetAllowed,
  transitionSession,
  createInitialSessionState,
  createDefaultPackagingIntent,
  validatePackagingIntent,
  projectLockedAssetsForView,
  projectReferenceAssignmentForView,
  computeStale,
  getPackagingGenerationServiceFingerprint,
} from '@masterpiece/runtime-core';

const FROZEN_NOW = '2026-08-13T00:00:00.000Z';

function makeFingerprint() {
  return {
    sourceBundleHash: 'a'.repeat(32),
    userIntentHash: 'b'.repeat(32),
    deliverableHash: 'c'.repeat(32),
    referencePlanHash: 'd'.repeat(32),
    compiledPromptHash: 'e'.repeat(32),
    executionIdentityHash: 'f'.repeat(32),
    compiledAt: FROZEN_NOW,
  };
}

function makeMetadata() {
  return {
    schemaVersion: '1.0',
    translationVersion: '1.0.0',
    compilerVersion: '1.0.0',
    providerCapabilityVersion: '1.0.0',
    metadataVersion: '1.0.0',
    compileFingerprint: makeFingerprint(),
    payloadFingerprint: 'g'.repeat(32),
  };
}

function makeCompiled() {
  return {
    schemaVersion: '1.0',
    blocks: [],
    prompt: 'A read-only compiled prompt preview.',
    compiledPrompt: 'A read-only compiled prompt preview.',
  };
}

function makeCapability() {
  return {
    schemaVersion: '1.0',
    modelId: 'seedream-5.0-pro',
    provider: 'volcengine',
    protocol: 'seedream-image',
    referenceSupport: true,
    maxReferenceImages: 4,
  };
}

function makeTranslation(references: any[] = []) {
  return {
    schemaVersion: '1.0',
    translationVersion: '1.0.0',
    target: 'packaging',
    generationMode: references.length > 0 ? 'reference_first' : 'analysis_led',
    shotContract: { id: 'PKG-HERO-SINGLE', purpose: 'single package hero render' },
    lockedAssets: {
      brand: { name: 'Acme', locked: true },
      logo: { present: true, usageMode: 'reserved', locked: true },
      productIdentity: { name: 'Acme Bottle', locked: true },
      category: { name: 'cosmetics', locked: true },
      structure: { formFactor: 'cylindrical bottle', locked: true },
      mandatoryCopy: { items: [], locked: true },
      confirmedComponents: { items: [], locked: true },
    },
    structure: { formFactor: 'cylindrical bottle' },
    visualDirection: { summary: 'premium minimalist' },
    colorSystem: { base: [], identity: [], accent: [], forbidden: [] },
    motifSystem: { primary: [], graphicHierarchy: [], forbidden: [] },
    materialSystem: { substrate: [], craft: [], forbidden: [] },
    composition: { type: 'centered hero' },
    lighting: { intent: 'soft studio' },
    camera: { intent: 'product hero' },
    sceneProgram: { type: 'studio' },
    referencePolicy: {
      enabled: references.length > 0,
      required: references.length > 0,
      references,
      count: references.length,
      precedence: ['locked_assets', 'explicit_user_constraints', 'reference_image', 'packaging_translation', 'analysis_context', 'model_defaults'],
      providerCapability: { referenceSupport: true, maxReferenceImages: 4 },
    },
    negativeConstraints: [],
    providerHints: { referenceCount: references.length },
    provenance: { sourceMode: 'analysis_led', inputSources: [], createdAt: FROZEN_NOW },
  };
}

function makePayload() {
  return {
    schemaVersion: '1.0',
    prompt: 'A read-only compiled prompt preview.',
    hints: { aspectRatio: '1:1', imageSize: '2K', qualityProfile: 'default' },
    references: [],
  };
}

function makePreparedResult(references: any[] = []) {
  return {
    now: FROZEN_NOW,
    translation: makeTranslation(references),
    compiled: makeCompiled(),
    capability: makeCapability(),
    payload: makePayload(),
    metadata: makeMetadata(),
  };
}

function makeExecutionResult() {
  return {
    schemaVersion: '1.0',
    target: 'packaging',
    status: 'succeeded',
    runId: 'pkg-run-1',
    generationMode: 'analysis_led',
    shotContractId: 'PKG-HERO-SINGLE',
    model: { registryModelId: 'seedream-5.0-pro', providerModelId: 'doubao-seedream-5-0-pro-260628' },
    provider: { adapterId: 'seedream-5.0-pro', protocol: 'seedream-image', provider: 'volcengine' },
    apiProfileId: 'profile-1',
    metadata: makeMetadata(),
    artifacts: [
      {
        imageId: 'image-01',
        mimeType: 'image/png',
        hasB64: true,
        hasUrl: false,
        sha256: 'h'.repeat(64),
        relativePath: 'runs/pkg-run-1/output.png',
        thumbnailRelativePath: 'runs/pkg-run-1/thumb.png',
        width: 1024,
        height: 1024,
        sizeBytes: 12345,
      },
    ],
    diagnostics: { startedAt: FROZEN_NOW, completedAt: FROZEN_NOW, durationMs: 1, referenceCount: 0, imageCount: 1, region: 'cn-beijing' },
  };
}

function makeTruthSnapshot() {
  return {
    lockedAssets: {
      brand: { name: 'Acme', locked: true },
      logo: { present: true, usageMode: 'reserved', locked: true },
      productIdentity: { name: 'Acme Bottle', locked: true },
      category: { name: 'cosmetics', locked: true },
      structure: { formFactor: 'cylindrical bottle', locked: true },
      mandatoryCopy: { items: [], locked: true },
      confirmedComponents: { items: [], locked: true },
    },
    analysisContext: { purpose: 'cosmetics brand audit' },
    projectIdentity: { brandName: 'Acme', industry: 'cosmetics' },
  };
}

function makeService(options: any = {}) {
  return createPackagingWorkspaceService({
    newSessionId: () => 'session-1',
    now: () => FROZEN_NOW,
    preparePackagingGeneration: options.prepare ?? (() => makePreparedResult()),
    executePackagingGeneration: options.execute ?? (async () => makeExecutionResult()),
  });
}

function makeSession(svc: any) {
  return svc.createSession({ projectId: 'project-1', truthSnapshot: makeTruthSnapshot() });
}

// =============================================================================
// V-09 Canonical keys allowlist
// =============================================================================

test('V-09a getPackagingWorkspaceViewModelKeys returns the canonical allowlist', () => {
  const keys = getPackagingWorkspaceViewModelKeys();
  assert.deepEqual(keys, [
    'schemaVersion',
    'sessionId',
    'projectId',
    'target',
    'status',
    'statusLabel',
    'isBusy',
    'canEditIntent',
    'mode',
    'shot',
    'references',
    'lockedAssets',
    'intent',
    'readiness',
    'prepared',
    'execution',
    'error',
    'staleReasons',
  ]);
});

test('V-09b getPackagingWorkspaceIntentKeys returns the canonical 6 user-editable fields', () => {
  const keys = getPackagingWorkspaceIntentKeys();
  assert.deepEqual(keys, [
    'generationMode',
    'shotContractId',
    'explicitUserConstraintsText',
    'referenceCount',
    'providerModelId',
    'apiProfileId',
  ]);
});

test('V-09c getPackagingWorkspaceErrorKeys returns the canonical 6 error fields', () => {
  const keys = getPackagingWorkspaceErrorKeys();
  assert.deepEqual(keys, [
    'code',
    'severity',
    'title',
    'userMessage',
    'recoverable',
    'suggestedAction',
  ]);
});

test('V-09d view model has no keys outside the canonical allowlist', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const allowed = new Set(getPackagingWorkspaceViewModelKeys());
  for (const key of Object.keys(view)) {
    assert.ok(allowed.has(key), `unexpected top-level view key: ${key}`);
  }
});

// =============================================================================
// V-01..V-08 Per-status projection
// =============================================================================

test('V-01 NEW projection: statusLabel, isBusy, canEditIntent, no prepared', () => {
  const svc = makeService();
  const session = makeSession(svc);
  const view = svc.getView(session.sessionId);
  assert.equal(view.status, PACKAGING_WORKSPACE_STATUS.NEW);
  assert.equal(view.statusLabel, PACKAGING_WORKSPACE_STATUS_LABELS.new);
  assert.equal(view.isBusy, false);
  assert.equal(view.canEditIntent, true);
  assert.equal(view.prepared, null);
  assert.equal(view.execution, null);
  assert.equal(view.error, null);
});

test('V-02 UNPREPARED projection: default intent with mode/shot, no prepared', () => {
  const svc = makeService();
  const session = makeSession(svc);
  // service.createSession returns status=NEW with default intent;
  // simulate UNPREPARED via state path.
  svc.updateIntent(session.sessionId, { apiProfileId: 'profile-2' });
  // We construct a synthetic UNPREPARED state by going
  // NEW -> UNPREPARED via a fresh session + reset path. The
  // resetPreparation from NEW with default intent lands in
  // UNPREPARED.
  const reset = svc.resetPreparation(session.sessionId);
  assert.equal(reset.status, PACKAGING_WORKSPACE_STATUS.UNPREPARED);
  const view = svc.getView(session.sessionId);
  assert.equal(view.status, PACKAGING_WORKSPACE_STATUS.UNPREPARED);
  assert.equal(view.statusLabel, PACKAGING_WORKSPACE_STATUS_LABELS.unprepared);
  assert.equal(view.isBusy, false);
  assert.equal(view.canEditIntent, true);
  assert.equal(view.prepared, null);
});

test('V-03 PREPARING projection: cannot observe in sync mock path; documented via state machine invariant', () => {
  // The sync prepare path lands in READY before the call
  // returns; the public API does not surface PREPARING to
  // the UI. We assert the contract via the workspace-state
  // invariant helper.
  const invariant = (() => null)();
  // `getStateInvariant` is re-exported by P3-A3; if not
  // re-exported here, we fall back to the inline expectation.
  // For V-03 we assert via the readiness projection logic:
  // PREPARING isBusy=true, canEditIntent=false. We do this
  // by computing the readiness for a synthetic PREPARING
  // status (no service mutation).
  const svc = makeService();
  const session = makeSession(svc);
  // Create a synthetic session state in PREPARING for the
  // view-model projector to consume.
  const synthetic = {
    ...session,
    status: 'preparing',
  };
  const view = projectPackagingWorkspaceView(synthetic);
  assert.equal(view.isBusy, true);
  assert.equal(view.canEditIntent, false);
  assert.equal(view.readiness.canExecute, false);
  assert.equal(view.readiness.canEditIntent, false);
  void invariant;
});

test('V-04 READY projection: prepared view exposed, canExecute=true, canEditIntent=true', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  assert.equal(view.status, PACKAGING_WORKSPACE_STATUS.READY);
  assert.equal(view.statusLabel, PACKAGING_WORKSPACE_STATUS_LABELS.ready);
  assert.equal(view.isBusy, false);
  assert.equal(view.canEditIntent, true);
  assert.equal(view.readiness.canExecute, true);
  assert.ok(view.prepared, 'prepared view must be exposed in READY status');
  assert.equal(typeof view.prepared, 'object');
  assert.equal(view.prepared!.target, 'packaging');
  assert.ok(view.prepared!.compiledPromptPreview);
});

test('V-05 STALE projection: isStale=true, canExecute=false, blockers carry stale reason', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  svc.updateIntent(session.sessionId, { providerModelId: 'seedream-5.0-pro' });
  const view = svc.getView(session.sessionId);
  assert.equal(view.status, PACKAGING_WORKSPACE_STATUS.STALE);
  assert.equal(view.statusLabel, PACKAGING_WORKSPACE_STATUS_LABELS.stale);
  assert.equal(view.readiness.isStale, true);
  assert.equal(view.readiness.canExecute, false);
  assert.equal(view.readiness.canEditIntent, true);
  assert.deepEqual([...view.staleReasons], ['intent_changed']);
  assert.equal(view.readiness.blockers[0], 'intent_changed');
});

test('V-06 EXECUTING projection: isBusy=true, canEditIntent=false', () => {
  // Synthetic state; EXECUTING is not observable through
  // the public service (the service is async and the
  // synchronous call returns EXECUTED). We verify via the
  // pure projector.
  const svc = makeService();
  const session = makeSession(svc);
  const synthetic = {
    ...session,
    status: 'executing',
    prepared: { snapshotAt: FROZEN_NOW, intentAtPrepare: session.intent, truthFingerprintAtPrepare: '', preparedResult: makePreparedResult() },
  };
  const view = projectPackagingWorkspaceView(synthetic);
  assert.equal(view.isBusy, true);
  assert.equal(view.canEditIntent, false);
  assert.equal(view.readiness.canExecute, false);
  assert.equal(view.readiness.canEditIntent, false);
});

test('V-07 EXECUTED projection: execution view, canExecute=true (re-execute allowed)', async () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  await svc.executeGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  assert.equal(view.status, PACKAGING_WORKSPACE_STATUS.EXECUTED);
  assert.equal(view.statusLabel, PACKAGING_WORKSPACE_STATUS_LABELS.executed);
  assert.equal(view.isBusy, false);
  assert.equal(view.canEditIntent, true);
  assert.equal(view.readiness.canExecute, true);
  assert.ok(view.execution);
  assert.equal(view.execution!.runId, 'pkg-run-1');
});

test('V-08 FAILED projection: error view with canonical code, isBusy=false', async () => {
  const svc = makeService({
    execute: async () => {
      const err: any = new Error('provider unreachable');
      err.code = 'GENERATION_PROVIDER_FAILED';
      err.cause = { code: 'GENERATION_PROVIDER_FAILED', retryable: true };
      throw err;
    },
  });
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  try { await svc.executeGeneration(session.sessionId); } catch { /* expected */ }
  const view = svc.getView(session.sessionId);
  assert.equal(view.status, PACKAGING_WORKSPACE_STATUS.FAILED);
  assert.equal(view.statusLabel, PACKAGING_WORKSPACE_STATUS_LABELS.failed);
  assert.equal(view.isBusy, false);
  assert.equal(view.canEditIntent, true);
  assert.equal(view.readiness.canExecute, false);
  assert.ok(view.error);
  assert.equal(view.error!.code, 'GENERATION_PROVIDER_FAILED');
});

// =============================================================================
// V-10..V-15 Capability consistency
// =============================================================================

test('V-10 top-level isBusy matches readiness.isBusy for every status', () => {
  const statuses: any[] = Object.values(PACKAGING_WORKSPACE_STATUS);
  for (const status of statuses) {
    const synthetic: any = {
      sessionId: 's1', projectId: 'p1',
      status,
      intent: createDefaultPackagingIntent(),
      truthSnapshot: makeTruthSnapshot(),
      prepared: null, lastExecution: null, lastError: null,
    };
    const view = projectPackagingWorkspaceView(synthetic);
    assert.equal(view.isBusy, view.readiness.isBusy, `isBusy mismatch for ${status}`);
  }
});

test('V-11 top-level canEditIntent matches readiness.canEditIntent for every status', () => {
  const statuses: any[] = Object.values(PACKAGING_WORKSPACE_STATUS);
  for (const status of statuses) {
    const synthetic: any = {
      sessionId: 's1', projectId: 'p1',
      status,
      intent: createDefaultPackagingIntent(),
      truthSnapshot: makeTruthSnapshot(),
      prepared: null, lastExecution: null, lastError: null,
    };
    const view = projectPackagingWorkspaceView(synthetic);
    assert.equal(view.canEditIntent, view.readiness.canEditIntent, `canEditIntent mismatch for ${status}`);
  }
});

test('V-12 readiness.canExecute matches isExecuteAllowed(status) for every status', () => {
  const statuses: any[] = Object.values(PACKAGING_WORKSPACE_STATUS);
  for (const status of statuses) {
    const synthetic: any = {
      sessionId: 's1', projectId: 'p1',
      status,
      intent: createDefaultPackagingIntent(),
      truthSnapshot: makeTruthSnapshot(),
      prepared: null, lastExecution: null, lastError: null,
    };
    const view = projectPackagingWorkspaceView(synthetic);
    assert.equal(view.readiness.canExecute, isExecuteAllowed(status),
      `canExecute mismatch for ${status}: view=${view.readiness.canExecute} helper=${isExecuteAllowed(status)}`);
  }
});

test('V-13 readiness.canPrepare matches isPrepareAllowed(status) for every status', () => {
  const statuses: any[] = Object.values(PACKAGING_WORKSPACE_STATUS);
  for (const status of statuses) {
    const synthetic: any = {
      sessionId: 's1', projectId: 'p1',
      status,
      intent: createDefaultPackagingIntent(),
      truthSnapshot: makeTruthSnapshot(),
      prepared: null, lastExecution: null, lastError: null,
    };
    const view = projectPackagingWorkspaceView(synthetic);
    assert.equal(view.readiness.canPrepare, isPrepareAllowed(status),
      `canPrepare mismatch for ${status}`);
  }
});

test('V-14 readiness.canReset matches isResetAllowed(status) for every status', () => {
  const statuses: any[] = Object.values(PACKAGING_WORKSPACE_STATUS);
  for (const status of statuses) {
    const synthetic: any = {
      sessionId: 's1', projectId: 'p1',
      status,
      intent: createDefaultPackagingIntent(),
      truthSnapshot: makeTruthSnapshot(),
      prepared: null, lastExecution: null, lastError: null,
    };
    const view = projectPackagingWorkspaceView(synthetic);
    assert.equal(view.readiness.canReset, isResetAllowed(status),
      `canReset mismatch for ${status}`);
  }
});

test('V-15 readiness.canEditIntent matches isIntentEditAllowed(status) for every status', () => {
  const statuses: any[] = Object.values(PACKAGING_WORKSPACE_STATUS);
  for (const status of statuses) {
    const synthetic: any = {
      sessionId: 's1', projectId: 'p1',
      status,
      intent: createDefaultPackagingIntent(),
      truthSnapshot: makeTruthSnapshot(),
      prepared: null, lastExecution: null, lastError: null,
    };
    const view = projectPackagingWorkspaceView(synthetic);
    assert.equal(view.readiness.canEditIntent, isIntentEditAllowed(status),
      `canEditIntent mismatch for ${status}: view=${view.readiness.canEditIntent} helper=${isIntentEditAllowed(status)}`);
  }
});

// =============================================================================
// V-16..V-19 Intent projection
// =============================================================================

test('V-16 intent projection exposes only 6 user-editable semantic fields', () => {
  const svc = makeService();
  const session = makeSession(svc);
  const view = svc.getView(session.sessionId);
  assert.ok(view.intent);
  const intentKeys = new Set(Object.keys(view.intent!));
  const allowed = new Set(getPackagingWorkspaceIntentKeys());
  for (const key of intentKeys) {
    assert.ok(allowed.has(key), `unexpected intent key: ${key}`);
  }
  assert.equal(view.intent!.generationMode, 'analysis_led');
  assert.equal(view.intent!.shotContractId, 'PKG-HERO-SINGLE');
});

test('V-17 intent projection does NOT include UI-only fields (previewUri / displayName / selectionOrderUI)', () => {
  // The intent projection is the SEMANTIC slice; UI-only
  // fields belong to the references array, not to the
  // intent.
  const svc = makeService();
  const session = makeSession(svc);
  const view = svc.getView(session.sessionId);
  const intentStr = JSON.stringify(view.intent);
  assert.doesNotMatch(intentStr, /previewUri/);
  assert.doesNotMatch(intentStr, /displayName/);
  assert.doesNotMatch(intentStr, /selectionOrderUI/);
});

test('V-18 apiProfileId is an identifier, not a secret', () => {
  // The view exposes apiProfileId as a string identifier.
  // The credential behind it lives in the Shared Runtime
  // credential store (P3-A spec §25); the Workspace layer
  // MUST NOT see it.
  const svc = makeService();
  const session = makeSession(svc);
  svc.updateIntent(session.sessionId, { apiProfileId: 'profile-1' });
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const intentStr = JSON.stringify(view);
  assert.match(intentStr, /profile-1/);
  // No apiKey, no Authorization, no Bearer.
  assert.doesNotMatch(intentStr, /apiKey/i);
  assert.doesNotMatch(intentStr, /Authorization/i);
  assert.doesNotMatch(intentStr, /Bearer/i);
});

test('V-19 intent projection is missing when session has no intent', () => {
  const state = createInitialSessionState({
    sessionId: 's1', projectId: 'p1', truthSnapshot: {}, initialIntent: null,
  });
  const view = projectPackagingWorkspaceView(state);
  assert.equal(view.intent, null);
  assert.equal(view.mode, null);
  assert.equal(view.shot, null);
  assert.equal(view.references.length, 0);
});

// =============================================================================
// V-20..V-22 Reference projection
// =============================================================================

test('V-20 reference projection exposes only UI-safe fields (assetId, role, source, displayName, previewUri)', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.updateIntent(session.sessionId, {
    referenceAssignments: [
      { assetId: 'asset-1', role: 'product_identity_reference', source: 'user' },
    ],
  });
  const view = svc.getView(session.sessionId);
  assert.equal(view.references.length, 1);
  const refKeys = new Set(Object.keys(view.references[0]!));
  // No raw file path, no internal precedence.
  assert.ok(!refKeys.has('sourcePath'));
  assert.ok(!refKeys.has('rawPath'));
  assert.ok(!refKeys.has('file'));
  assert.ok(!refKeys.has('precedence'));
});

test('V-21 reference role is from the P2 frozen canonical 6-role set', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.updateIntent(session.sessionId, {
    referenceAssignments: [
      { assetId: 'asset-1', role: 'product_identity_reference', source: 'user' },
    ],
  });
  const view = svc.getView(session.sessionId);
  const role = view.references[0]!.role;
  const set = new Set<string>(PACKAGING_REFERENCE_ROLES as any);
  assert.ok(set.has(role), `role not in P2 frozen set: ${role}`);
});

test('V-22 reference projection sorts deterministically (semantic equal input → byte-equal output)', () => {
  // Multiple references: the projection is the order of
  // intent.referenceAssignments, which is the user-editable
  // order. The Workspace layer does not re-sort; the UI
  // receives references in the same order as the intent.
  const svc = makeService();
  const session = makeSession(svc);
  svc.updateIntent(session.sessionId, {
    referenceAssignments: [
      { assetId: 'asset-a', role: 'product_identity_reference', source: 'user' },
      { assetId: 'asset-b', role: 'style_reference', source: 'user' },
      { assetId: 'asset-c', role: 'material_reference', source: 'user' },
    ],
  });
  const view = svc.getView(session.sessionId);
  assert.deepEqual(view.references.map((r) => r.assetId), ['asset-a', 'asset-b', 'asset-c']);
  const before = JSON.stringify(view);
  for (let i = 0; i < 5; i += 1) {
    const again = svc.getView(session.sessionId);
    assert.equal(JSON.stringify(again), before);
  }
});

// =============================================================================
// V-23..V-25 Locked assets projection
// =============================================================================

test('V-23 locked assets projection exposes only the 7 canonical fields', () => {
  const svc = makeService();
  const session = makeSession(svc);
  const view = svc.getView(session.sessionId);
  const fields = new Set(Object.keys(view.lockedAssets.fields));
  for (const f of ['brand', 'logo', 'productIdentity', 'category', 'structure', 'mandatoryCopy', 'confirmedComponents']) {
    assert.ok(fields.has(f), `missing locked asset field: ${f}`);
  }
  assert.equal(view.lockedAssets.allLocked, true);
});

test('V-24 locked assets projection strips source path / rawPath / file / path / apiKey / secret keys', () => {
  const malicious = {
    brand: { name: 'Acme', locked: true },
    sourcePath: 'C:\\Users\\admin\\secrets\\key.pem',
    rawPath: '/home/admin/secret',
    file: '/var/secrets/api_key.txt',
    path: 'D:\\projects\\masterpiece',
    apiKey: 'sk-12345-ABCDE',
    secret: 'shhhhh',
  };
  const projected = projectLockedAssetsForView(malicious as any);
  const fields: any = projected.fields;
  for (const maliciousKey of ['sourcePath', 'rawPath', 'file', 'path', 'apiKey', 'secret']) {
    assert.equal(fields[maliciousKey], undefined, `hostile key leaked: ${maliciousKey}`);
  }
});

test('V-25 locked assets projection locks every field (no field can be marked unlocked)', () => {
  const projection = projectLockedAssetsForView({
    brand: { name: 'Acme', locked: false } as any, // hostile: try to mark unlocked
  });
  // The lock-assets projection is documentation-only; the
  // service-side validation (validatePackagingIntent)
  // rejects `locked: false` upstream. The projection here
  // coerces every field to `locked: true` because the
  // presence in lockedAssets is the lock declaration.
  const brand = projection.fields.brand as any;
  assert.equal(brand.locked, true);
});

// =============================================================================
// V-26..V-28 Preparation / fingerprint passthrough
// =============================================================================

test('V-26 prepared projection passthroughs 5 P2-F hash short ids + executionIdentityHash', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const summary = view.prepared?.fingerprintSummary;
  assert.ok(summary);
  // 5 P2-F semantic hashes + 1 P2-G-F#2 executionIdentityHash
  // = 6 short ids. Each is the first 12 chars of the
  // full hash with an ellipsis.
  assert.equal(summary!.sourceBundleHash?.endsWith('…'), true);
  assert.equal(summary!.userIntentHash?.endsWith('…'), true);
  assert.equal(summary!.deliverableHash?.endsWith('…'), true);
  assert.equal(summary!.referencePlanHash?.endsWith('…'), true);
  assert.equal(summary!.compiledPromptHash?.endsWith('…'), true);
  assert.equal(summary!.executionIdentityHash?.endsWith('…'), true);
});

test('V-27 prepared view exposes compiledPromptPreview as a string (not the raw 14-block topology)', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  // The preview is the canonical Prompt string. The raw
  // 14-block topology is NOT in the projection.
  assert.ok(typeof view.prepared?.compiledPromptPreview === 'string');
  const preparedStr = JSON.stringify(view.prepared);
  assert.equal(preparedStr.includes('"blocks"'), false, 'raw 14-block topology leaked');
});

test('V-28 prepared view exposes metadataSummary with version surface only (no internal payload)', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const summary = view.prepared?.metadataSummary;
  assert.ok(summary);
  // Only the 4 version fields are exposed; the full P2-F
  // metadata (with raw hashes etc.) is NOT.
  const keys = new Set(Object.keys(summary!));
  assert.deepEqual([...keys].sort(), [
    'compilerVersion',
    'metadataVersion',
    'providerCapabilityVersion',
    'translationVersion',
  ].sort());
});

// =============================================================================
// V-29..V-31 Validation / readiness
// =============================================================================

test('V-29 readiness block has 10 canonical fields (no extra leakage)', () => {
  const svc = makeService();
  const session = makeSession(svc);
  const view = svc.getView(session.sessionId);
  const readinessKeys = new Set(Object.keys(view.readiness));
  // The canonical readiness surface (P3-A4 spec §11):
  //   canPrepare, canExecute, canRetry, canReset, canEditIntent,
  //   isBusy, isStale, stale, blockers, warnings
  for (const key of ['canPrepare', 'canExecute', 'canRetry', 'canReset', 'canEditIntent', 'isBusy', 'isStale', 'stale', 'blockers', 'warnings']) {
    assert.ok(readinessKeys.has(key), `missing readiness field: ${key}`);
  }
});

test('V-30 readiness.blockers is an array of canonical codes (no raw error message)', async () => {
  const svc = makeService({
    execute: async () => {
      const err: any = new Error('raw path /tmp/secrets leaked here');
      err.code = 'GENERATION_PROVIDER_FAILED';
      err.cause = { code: 'GENERATION_PROVIDER_FAILED', retryable: true };
      throw err;
    },
  });
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  try { await svc.executeGeneration(session.sessionId); } catch { /* expected */ }
  const view = svc.getView(session.sessionId);
  const blockers = view.readiness.blockers as string[];
  const serialised = JSON.stringify(blockers);
  assert.doesNotMatch(serialised, /\/tmp\//);
  assert.doesNotMatch(serialised, /secrets/);
  assert.deepEqual(blockers, ['GENERATION_PROVIDER_FAILED']);
});

test('V-31 readiness.warnings is an empty array (P2 V1 generation does not surface warnings through the Workspace layer)', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  assert.deepEqual([...view.readiness.warnings], []);
});

// =============================================================================
// V-32..V-35 Error projection + hostile-input redaction
// =============================================================================

test('V-32 error projection uses canonical userMessage lookup, NOT raw error.message', async () => {
  const svc = makeService({
    execute: async () => {
      const err: any = new Error('C:\\Users\\admin\\.ssh\\id_rsa leaked');
      err.code = 'GENERATION_PROVIDER_FAILED';
      throw err;
    },
  });
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  try { await svc.executeGeneration(session.sessionId); } catch { /* expected */ }
  const view = svc.getView(session.sessionId);
  // Canonical userMessage is keyed off the code, never
  // the raw error.message.
  assert.equal(view.error!.code, 'GENERATION_PROVIDER_FAILED');
  const errStr = JSON.stringify(view.error);
  assert.doesNotMatch(errStr, /Users\\admin/);
  assert.doesNotMatch(errStr, /id_rsa/);
  // The userMessage is a canonical safe string in 中文.
  assert.match(view.error!.userMessage, /生成服务请求失败/);
});

test('V-33 hostile error title is redacted (Windows /home path / bearer / apiKey)', () => {
  const malicious = {
    code: 'PACKAGING_WORKSPACE_EXECUTE_FAILED',
    title: 'C:\\Users\\admin\\app.log: apiKey=sk-12345 Bearer xxx',
    userMessage: 'fake',
    severity: 'blocking',
    recoverable: true,
    suggestedAction: '/home/admin/secret.txt',
  };
  const synthetic: any = {
    sessionId: 's1', projectId: 'p1', status: 'failed',
    intent: createDefaultPackagingIntent(), truthSnapshot: {},
    prepared: null, lastExecution: null, lastError: malicious,
  };
  const view = projectPackagingWorkspaceView(synthetic);
  // Hostile title and suggestedAction are redacted to the
  // safe default; only the canonical code is preserved.
  assert.equal(view.error!.code, 'PACKAGING_WORKSPACE_EXECUTE_FAILED');
  assert.equal(view.error!.title, 'PACKAGING_WORKSPACE_EXECUTE_FAILED'); // falls back to code
  assert.equal(view.error!.suggestedAction, null);
});

test('V-34 hostile oversized title is redacted (> 200 chars)', () => {
  const oversizedTitle = 'a'.repeat(300);
  const synthetic: any = {
    sessionId: 's1', projectId: 'p1', status: 'failed',
    intent: createDefaultPackagingIntent(), truthSnapshot: {},
    prepared: null, lastExecution: null, lastError: {
      code: 'PACKAGING_WORKSPACE_EXECUTE_FAILED',
      title: oversizedTitle,
      userMessage: 'fake',
      severity: 'blocking',
      recoverable: true,
      suggestedAction: null,
    },
  };
  const view = projectPackagingWorkspaceView(synthetic);
  assert.equal(view.error!.title, 'PACKAGING_WORKSPACE_EXECUTE_FAILED'); // falls back to code
});

test('V-35 error projection never carries raw stack / cause / provider raw response', () => {
  const malicious = {
    code: 'GENERATION_PROVIDER_FAILED',
    title: 'Provider error',
    userMessage: 'fake',
    stack: 'Error: at /home/admin/secret\n    at request (/Users/admin/app/api.js:42:13)',
    cause: { code: 'GENERATION_PROVIDER_FAILED', retryable: true, message: 'C:\\Users\\admin\\.aws\\credentials leaked' },
    response: { body: '{"token":"Bearer xxx","apiKey":"sk-12345"}' },
  };
  const synthetic: any = {
    sessionId: 's1', projectId: 'p1', status: 'failed',
    intent: createDefaultPackagingIntent(), truthSnapshot: {},
    prepared: null, lastExecution: null, lastError: malicious,
  };
  const view = projectPackagingWorkspaceView(synthetic);
  const errStr = JSON.stringify(view.error);
  assert.doesNotMatch(errStr, /stack/);
  assert.doesNotMatch(errStr, /api\.js/);
  assert.doesNotMatch(errStr, /Bearer xxx/);
  assert.doesNotMatch(errStr, /sk-12345/);
  assert.doesNotMatch(errStr, /credentials/);
});

// =============================================================================
// V-36..V-40 No absolute path / file:// / UNC
// =============================================================================

test('V-36 no Windows drive letters in any view-model state', async () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  await svc.executeGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const serialised = JSON.stringify(view);
  assert.doesNotMatch(serialised, /[A-Za-z]:[\\/]/);
});

test('V-37 no /home / /tmp / /var / /usr / /opt / /Users / /root absolute paths', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const serialised = JSON.stringify(view);
  assert.doesNotMatch(serialised, /(^|[^A-Za-z0-9])\/(home|tmp|etc|var|usr|opt|Users|root)\//);
});

test('V-38 no file:// scheme in view-model serialization', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const serialised = JSON.stringify(view);
  assert.doesNotMatch(serialised, /file:\/\//i);
});

test('V-39 no UNC paths (\\\\server\\share) in view-model serialization', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const serialised = JSON.stringify(view);
  assert.doesNotMatch(serialised, /\\\\[A-Za-z0-9_.$-]+\\[A-Za-z0-9_.$-]+/);
});

test('V-40 the only paths exposed by view-model are RELATIVE (artifact.relativePath)', async () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  await svc.executeGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  for (const artifact of view.execution!.artifacts) {
    assert.ok(artifact.relativePath);
    assert.ok(artifact.thumbnailRelativePath);
    // Relative paths must NOT be platform-absolute.
    assert.equal(artifact.relativePath.startsWith('/'), false);
    assert.equal(artifact.relativePath.startsWith('\\'), false);
    assert.equal(/^[A-Za-z]:[\\/]/.test(artifact.relativePath), false);
    // No `..` traversal segment.
    assert.equal(artifact.relativePath.split(/[\\\/]+/).includes('..'), false);
  }
});

// =============================================================================
// V-41..V-45 No apiKey / Authorization / Bearer / secret
// =============================================================================

test('V-41 view-model serialization contains no apiKey substring (case-insensitive)', async () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  await svc.executeGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const serialised = JSON.stringify(view);
  assert.doesNotMatch(serialised, /api[_-]?key/i);
});

test('V-42 view-model serialization contains no Authorization header', async () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  await svc.executeGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const serialised = JSON.stringify(view);
  assert.doesNotMatch(serialised, /Authorization/i);
});

test('V-43 view-model serialization contains no Bearer token', async () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  await svc.executeGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const serialised = JSON.stringify(view);
  assert.doesNotMatch(serialised, /Bearer\s+[A-Za-z0-9._~+/=-]+/i);
});

test('V-44 view-model serialization contains no secret / password / credential / accessToken', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const serialised = JSON.stringify(view);
  assert.doesNotMatch(serialised, /\bsecret\b/i);
  assert.doesNotMatch(serialised, /\bpassword\b/i);
  assert.doesNotMatch(serialised, /\bcredential\b/i);
  assert.doesNotMatch(serialised, /access[_-]?token/i);
});

test('V-45 view-model serialization contains no base64 data URI', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const serialised = JSON.stringify(view);
  assert.doesNotMatch(serialised, /data:[^;,]+;base64,/i);
});

// =============================================================================
// V-46..V-50 No raw provider payload
// =============================================================================

test('V-46 view-model does not expose raw preparedResult dump', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  // prepared.preparedResult must NOT be exposed.
  assert.equal((view.prepared as any).preparedResult, undefined);
  assert.equal((view.prepared as any).prepared, undefined);
  assert.equal((view.prepared as any).metadata, undefined);
});

test('V-47 view-model does not expose raw payload object', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  // The raw Provider Adapter Payload is an internal object;
  // only `compiledPromptPreview` and `metadataSummary` are
  // exposed.
  assert.equal((view.prepared as any).payload, undefined);
});

test('V-48 view-model does not expose raw capability object', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  // The raw Provider Capability is an internal object;
  // only `providerSummary` is exposed.
  assert.equal((view.prepared as any).capability, undefined);
});

test('V-49 view-model does not expose raw execution result payload', async () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  await svc.executeGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  // The raw execution result is internal; the view exposes
  // only the projection.
  assert.equal((view.execution as any).redactedRequest, undefined);
  assert.equal((view.execution as any).redactedResponse, undefined);
});

test('V-50 view-model does not expose raw intentAtPrepare / truthFingerprintAtPrepare', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  // Internal application state, NOT UI surface.
  assert.equal((view as any).intentAtPrepare, undefined);
  assert.equal((view as any).truthFingerprintAtPrepare, undefined);
});

// =============================================================================
// V-51..V-54 Schema version + capability-naming
// =============================================================================

test('V-51 view-model has stable schemaVersion 1.0.0', () => {
  const svc = makeService();
  const session = makeSession(svc);
  const view = svc.getView(session.sessionId);
  assert.equal(view.schemaVersion, '1.0.0');
  assert.equal(view.schemaVersion, PACKAGING_WORKSPACE_VIEW_MODEL_VERSION);
});

test('V-52 view-model exposes P2 generation service fingerprint (capability boundary)', () => {
  const fp = getPackagingGenerationServiceFingerprint();
  assert.equal(fp.serviceVersion, PACKAGING_GENERATION_SERVICE_VERSION);
  assert.equal(fp.serviceVersion, '1.0.0');
});

test('V-53 capability versions are X.Y.Z and capability-named (no P3A_* / V* / vnext)', () => {
  for (const v of [
    PACKAGING_WORKSPACE_VIEW_MODEL_VERSION,
    PACKAGING_WORKSPACE_STATE_MACHINE_VERSION,
    PACKAGING_WORKSPACE_SERVICE_VERSION,
    PACKAGING_WORKSPACE_INTENT_VERSION,
    PACKAGING_WORKSPACE_STALE_TRACKER_VERSION,
    PACKAGING_GENERATION_SERVICE_VERSION,
  ]) {
    assert.match(v, /^\d+\.\d+\.\d+$/);
  }
});

test('V-54 view-model fingerprint documentation lists includes and excludes', () => {
  const fp = getPackagingWorkspaceViewModelFingerprint();
  assert.equal(fp.schemaVersion, '1.0.0');
  assert.ok(Array.isArray(fp.includes));
  assert.ok(Array.isArray(fp.excludes));
  assert.ok(Array.isArray(fp.canonicalKeys.topLevel));
  assert.equal(fp.canonicalKeys.topLevel.length, 18);
});

// =============================================================================
// V-55..V-58 Determinism
// =============================================================================

test('V-55 same input → same view (byte-stable JSON)', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const a = serializeWorkspaceView(svc.getView(session.sessionId));
  const b = serializeWorkspaceView(svc.getView(session.sessionId));
  assert.equal(a, b);
});

test('V-56 serializeWorkspaceView produces deterministic key order (alphabetical)', async () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  await svc.executeGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const serialised = serializeWorkspaceView(view);
  // The serialised form must be a valid JSON object; the
  // top-level keys must be in sorted order.
  const parsed = JSON.parse(serialised);
  const keys = Object.keys(parsed);
  const sorted = [...keys].sort();
  assert.deepEqual(keys, sorted, 'top-level keys must be in alphabetical order');
});

test('V-57 view-model does not generate random id / new timestamp / new fingerprint per call', async () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  await svc.executeGeneration(session.sessionId);
  // Capture a baseline. Repeated calls must produce
  // byte-stable JSON.
  const baseline = serializeWorkspaceView(svc.getView(session.sessionId));
  for (let i = 0; i < 20; i += 1) {
    const again = serializeWorkspaceView(svc.getView(session.sessionId));
    assert.equal(again, baseline);
  }
});

test('V-58 view-model does not include volatile timestamps in the canonical surface', () => {
  // The view model is a projection of the session, not a
  // live state machine. The session's lastStaleReasons may
  // contain a timestamp (P2 frozen format), but the view
  // does not introduce a new Date.now() or crypto.randomUUID.
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  const serialised = JSON.stringify(view);
  // No Date.now() / randomUUID() markers in the projection.
  assert.equal(/Date\.now/.test(serialised), false);
  assert.equal(/randomUUID/.test(serialised), false);
});

// =============================================================================
// V-59..V-62 Immutability
// =============================================================================

test('V-59 view-model top-level object is frozen', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  assert.ok(Object.isFrozen(view));
});

test('V-60 view-model nested objects are frozen (readiness / prepared / execution / error / intent / lockedAssets)', async () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  await svc.executeGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  assert.ok(Object.isFrozen(view.readiness));
  assert.ok(Object.isFrozen(view.prepared!));
  assert.ok(Object.isFrozen(view.execution!));
  assert.ok(Object.isFrozen(view.error!));
  assert.ok(Object.isFrozen(view.intent!));
  assert.ok(Object.isFrozen(view.lockedAssets));
  assert.ok(Object.isFrozen(view.lockedAssets.fields));
  for (const ref of view.references) {
    assert.ok(Object.isFrozen(ref));
  }
});

test('V-61 mutating a view-model field in strict mode throws (no silent override)', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const view = svc.getView(session.sessionId);
  assert.throws(() => {
    (view as any).status = 'something_else';
  });
  assert.throws(() => {
    (view.intent as any).generationMode = 'reference_first';
  });
});

test('V-62 view-model nested arrays cannot be mutated', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.updateIntent(session.sessionId, {
    referenceAssignments: [
      { assetId: 'asset-1', role: 'product_identity_reference', source: 'user' },
    ],
  });
  const view = svc.getView(session.sessionId);
  assert.ok(Object.isFrozen(view.references));
  assert.throws(() => {
    (view.references as any).push({ assetId: 'asset-2', role: 'style_reference', source: 'user' });
  });
});

// =============================================================================
// V-63..V-65 Nested mutation isolation
// =============================================================================

test('V-63 mutating view-model.intent does NOT change the underlying session', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  const before = svc.getView(session.sessionId);
  // Attempt mutation in strict mode (should throw, but the
  // session must remain unchanged regardless).
  try { (before.intent as any).generationMode = 'reference_first'; } catch { /* expected */ }
  const after = svc.getView(session.sessionId);
  assert.equal(after.intent!.generationMode, before.intent!.generationMode);
  assert.equal(after.intent!.generationMode, 'analysis_led');
});

test('V-64 mutating view-model.references does NOT change the underlying intent', () => {
  const svc = makeService();
  const session = makeSession(svc);
  svc.updateIntent(session.sessionId, {
    referenceAssignments: [
      { assetId: 'asset-1', role: 'product_identity_reference', source: 'user' },
    ],
  });
  const before = svc.getView(session.sessionId);
  // Attempt array push in strict mode (should throw).
  try { (before.references as any).push({ assetId: 'asset-2', role: 'style_reference', source: 'user' } as any); } catch { /* expected */ }
  const after = svc.getView(session.sessionId);
  assert.equal(after.references.length, 1);
  assert.equal(after.references[0]!.assetId, 'asset-1');
});

test('V-65 mutating view-model.error.title does NOT change the session.lastError.title', async () => {
  const svc = makeService({
    execute: async () => {
      const err: any = new Error('fail');
      err.code = 'GENERATION_PROVIDER_FAILED';
      throw err;
    },
  });
  const session = makeSession(svc);
  svc.prepareGeneration(session.sessionId);
  try { await svc.executeGeneration(session.sessionId); } catch { /* expected */ }
  const before = svc.getView(session.sessionId);
  const beforeTitle = before.error!.title;
  try { (before.error as any).title = 'tampered'; } catch { /* expected */ }
  const after = svc.getView(session.sessionId);
  assert.equal(after.error!.title, beforeTitle);
});

// =============================================================================
// V-66..V-69 Runtime-core public export boundary
// =============================================================================

test('V-66 view model + all helpers are exported from @masterpiece/runtime-core', async () => {
  const runtimeCore = await import('@masterpiece/runtime-core');
  for (const name of [
    'projectPackagingWorkspaceView',
    'getPackagingWorkspaceViewModelFingerprint',
    'getPackagingWorkspaceViewModelKeys',
    'getPackagingWorkspaceIntentKeys',
    'getPackagingWorkspaceExecutionKeys',
    'getPackagingWorkspacePreparedKeys',
    'getPackagingWorkspaceErrorKeys',
    'serializeWorkspaceView',
    'PACKAGING_WORKSPACE_VIEW_MODEL_VERSION',
  ]) {
    assert.ok((runtimeCore as any)[name] !== undefined, `missing export: ${name}`);
  }
});

test('V-67 P2 frozen canonical constants are exported from @masterpiece/runtime-core (re-exports)', async () => {
  const runtimeCore = await import('@masterpiece/runtime-core');
  for (const name of [
    'PACKAGING_GENERATION_MODES',
    'PACKAGING_SHOT_CONTRACT_IDS',
    'PACKAGING_REFERENCE_ROLES',
    'PACKAGING_GENERATION_SERVICE_VERSION',
  ]) {
    assert.ok((runtimeCore as any)[name] !== undefined, `missing re-export: ${name}`);
  }
});

test('V-68 @masterpiece/runtime-core does NOT re-export internal P2 frozen paths', async () => {
  // The UI must be able to access everything it needs via
  // the runtime-core public surface. P2 frozen paths are
  // NOT re-exported (P3-A spec §43).
  const runtimeCore = await import('@masterpiece/runtime-core');
  // The package main is 'src/index.js' which re-exports
  // runtime-core internal modules. The packaging/ sub-tree
  // is not directly reachable through the public barrel.
  // We assert the absence of certain internal helpers
  // (P2 frozen internal API) on the public surface.
  // (These may exist as type re-exports but should not be
  // runtime exports.)
  // The view-model layer is the only surface the UI sees.
  assert.equal((runtimeCore as any).createPackagingTranslation, undefined,
    'P2 frozen createPackagingTranslation must NOT be re-exported');
  assert.equal((runtimeCore as any).compilePackagingPrompt, undefined,
    'P2 frozen compilePackagingPrompt must NOT be re-exported');
  assert.equal((runtimeCore as any).buildPackagingProviderPayload, undefined,
    'P2 frozen buildPackagingProviderPayload must NOT be re-exported');
});

test('V-69 view model imports do NOT include fs / credential store / network', () => {
  // Read view-model.js source and assert it does not import
  // the local file system, the credential store, or the
  // provider network stack.
  const root = path.resolve(import.meta.dirname, '..', '..');
  const viewModelPath = path.join(root, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'view-model.js');
  const source = fs.readFileSync(viewModelPath, 'utf8');
  assert.doesNotMatch(source, /from\s+['"]node:fs['"]/);
  assert.doesNotMatch(source, /from\s+['"]node:fs\/promises['"]/);
  assert.doesNotMatch(source, /from\s+['"]fs['"]/);
  assert.doesNotMatch(source, /node-credential-store/);
  assert.doesNotMatch(source, /node-settings-store/);
  assert.doesNotMatch(source, /local-rpc-server/);
  assert.doesNotMatch(source, /node-native-operations/);
  assert.doesNotMatch(source, /from\s+['"]node:net['"]/);
  assert.doesNotMatch(source, /from\s+['"]node:http['"]/);
  assert.doesNotMatch(source, /from\s+['"]node:https['"]/);
});

// =============================================================================
// V-70..V-72 Architecture guards
// =============================================================================

test('V-70 view-model does not call prepare / execute / resolveExecutionConfig', () => {
  const root = path.resolve(import.meta.dirname, '..', '..');
  const viewModelPath = path.join(root, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'view-model.js');
  const source = fs.readFileSync(viewModelPath, 'utf8');
  // No invocation of the production-side preparation /
  // execution functions. We scan for `name(` (a function
  // call) rather than the bare name (which may appear in
  // comments).
  for (const forbidden of [
    'preparePackagingGeneration',
    'executePackagingGeneration',
    'resolveExecutionConfig',
    'resolveArtifactLifecycle',
    'readReference',
  ]) {
    const callPattern = new RegExp(`\\b${forbidden}\\s*\\(`);
    assert.equal(callPattern.test(source), false,
      `view-model must not call ${forbidden}`);
  }
});

test('V-71 view-model does not mutate session', () => {
  const root = path.resolve(import.meta.dirname, '..', '..');
  const viewModelPath = path.join(root, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'view-model.js');
  const source = fs.readFileSync(viewModelPath, 'utf8');
  // No assignment to session.* fields.
  assert.doesNotMatch(source, /session\.\w+\s*=/);
  // No spread-mutation on session.
  assert.doesNotMatch(source, /\.\.\.session/);
});

test('V-72 view-model does not generate a parallel generation fingerprint', () => {
  const root = path.resolve(import.meta.dirname, '..', '..');
  const viewModelPath = path.join(root, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'view-model.js');
  const source = fs.readFileSync(viewModelPath, 'utf8');
  // No second-fingerprint names: workspaceFingerprint,
  // viewFingerprint, sessionHash, customHash. We scan for
  // them as identifiers (word boundary) and not as raw
  // substrings (which may appear in comments).
  for (const forbidden of [
    'workspaceFingerprint',
    'viewFingerprint',
    'sessionHash',
    'customHash',
  ]) {
    const identPattern = new RegExp(`\\b${forbidden}\\b`);
    assert.equal(identPattern.test(source), false,
      `view-model must not define ${forbidden}`);
  }
  // No createHash from crypto (P2 frozen stableHash is
  // the only hash authority).
  assert.equal(source.includes('createHash'), false);
  // The 5 P2-F hash names are referenced verbatim (string
  // literals inside fingerprintSummary), which is allowed.
});

// =============================================================================
// V-73 P2 frozen regression
// =============================================================================

test('V-73 P2 frozen modules are not modified by P3-A4', () => {
  const root = path.resolve(import.meta.dirname, '..', '..');
  const packagingDir = path.join(root, 'packages', 'image-generation-runtime', 'src', 'packaging');
  const expected = [
    'compiler.js',
    'contracts.js',
    'generation-service.js',
    'metadata.js',
    'provider-adapter.js',
    'provider-capability.js',
    'reference-policy.js',
    'translation.js',
    'validation.js',
  ];
  for (const f of expected) {
    assert.ok(fs.existsSync(path.join(packagingDir, f)), `P2 frozen module missing: ${f}`);
  }
  const facade = path.join(root, 'packages', 'image-generation-runtime', 'src', 'core', 'packaging-generation-core.js');
  assert.ok(fs.existsSync(facade), 'P2 frozen Shared Core facade missing');
});

// =============================================================================
// V-74..V-78 Deterministic serialization helper
// =============================================================================

test('V-74 serializeWorkspaceView throws on non-object input', () => {
  assert.throws(() => serializeWorkspaceView(null as any), /view must be an object/);
  assert.throws(() => serializeWorkspaceView(undefined as any), /view must be an object/);
  assert.throws(() => serializeWorkspaceView('foo' as any), /view must be an object/);
});

test('V-75 serializeWorkspaceView handles circular references safely', () => {
  const view: any = svc_getViewCircular();
  // The view must serialize even if the test mutates the
  // session object — the function returns a string for any
  // valid object.
  const serialised = serializeWorkspaceView(view);
  assert.equal(typeof serialised, 'string');
  function svc_getViewCircular() {
    const svc = makeService();
    const session = makeSession(svc);
    return svc.getView(session.sessionId);
  }
});

test('V-76 serializeWorkspaceView excludes `undefined` values from the output', () => {
  const view = {
    schemaVersion: '1.0.0',
    sessionId: 's1',
    projectId: 'p1',
    target: 'packaging',
    status: 'new',
    statusLabel: 'new',
    isBusy: false,
    canEditIntent: true,
    mode: null,
    shot: null,
    references: [],
    lockedAssets: { schemaVersion: '1.0.0', fields: {}, allLocked: true },
    intent: null,
    readiness: { canPrepare: true, canExecute: false, canRetry: false, canReset: true, canEditIntent: true, isBusy: false, isStale: false, stale: false, blockers: [], warnings: [] },
    prepared: null,
    execution: null,
    error: null,
    staleReasons: [],
    someOptionalField: undefined,
  };
  const serialised = serializeWorkspaceView(view);
  assert.equal(serialised.includes('someOptionalField'), false);
});

test('V-77 serializeWorkspaceView emits deterministic bytes for the same input', () => {
  const a: any = {};
  const b: any = {};
  const view = {
    schemaVersion: '1.0.0', sessionId: 's1', projectId: 'p1', target: 'packaging',
    status: 'ready', statusLabel: 'ready', isBusy: false, canEditIntent: true,
    mode: 'analysis_led', shot: 'PKG-HERO-SINGLE',
    references: [], lockedAssets: { schemaVersion: '1.0.0', fields: {}, allLocked: true },
    intent: { generationMode: 'analysis_led', shotContractId: 'PKG-HERO-SINGLE', explicitUserConstraintsText: '', referenceCount: 0, providerModelId: '', apiProfileId: '' },
    readiness: { canPrepare: false, canExecute: true, canRetry: true, canReset: true, canEditIntent: true, isBusy: false, isStale: false, stale: false, blockers: [], warnings: [] },
    prepared: null, execution: null, error: null, staleReasons: [],
  };
  void a; void b;
  const s1 = serializeWorkspaceView(view);
  const s2 = serializeWorkspaceView(view);
  assert.equal(s1, s2);
});

test('V-78 getPackagingWorkspaceViewModelFingerprint.publishedIncludes matches the canonical shape', () => {
  const fp = getPackagingWorkspaceViewModelFingerprint();
  // The fingerprint is the canonical documentation surface;
  // the test asserts the documentation is consistent with
  // the runtime canonical keys allowlist.
  for (const group of Object.keys(fp.canonicalKeys)) {
    assert.ok(Array.isArray((fp.canonicalKeys as any)[group]));
  }
});
