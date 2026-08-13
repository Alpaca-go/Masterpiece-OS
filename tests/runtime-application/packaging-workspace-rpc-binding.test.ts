// P3-B2 — Packaging Workspace RPC binding tests.
//
// Test groups (per P3-B2 spec §24):
//   R-01 packaging namespace is registered in the operation registry
//   R-02 create-session returns { sessionId, view } via RPC
//   R-03 get-view returns the UI-safe view via RPC
//   R-04 session persists across multiple RPC calls
//   R-05 update-intent mutates intent via RPC
//   R-06 get-view reflects the updated intent
//   R-07 unknown sessionId in get-view / update-intent / prepare /
//         execute / reset is rejected with canonical safe error
//   R-08 prepare RPC reaches the frozen application service
//         (status transitions NEW → PREPARING → READY)
//   R-09 execute RPC reaches the frozen application service
//         (status transitions READY → EXECUTING → EXECUTED)
//   R-10 reset RPC reaches the frozen application service
//         (status transitions READY → UNPREPARED)
//   R-11 execute with explicit deps reaches the P2 frozen
//         executePackagingGeneration (mock injection)
//   R-12 canonical error code is preserved (no RPC_FAILED collapse)
//   R-13 STALE execute preserves the STALE-specific issue envelope
//         (per P3-A5.1)
//   R-14 RPC response carries no raw session (only the UI-safe view)
//   R-15 RPC response carries no raw preparedResult
//   R-16 RPC response carries no raw Provider payload
//   R-17 RPC response carries no absolute path
//   R-18 RPC response carries no credential / Authorization / Bearer
//   R-19 the same Workspace service instance is reused across RPC
//         calls (no per-call service recreation)
//   R-20 the operations layer does NOT construct a Provider payload
//         (no `buildPackagingProviderPayload` import)
//   R-21 the operations layer does NOT call crypto.createHash or any
//         second hash algorithm (no parallel fingerprint)
//   R-22 the operations layer is thin: it only composes
//         service.createSession / getView / updateIntent /
//         setTruthSnapshot / prepareGeneration / executeGeneration /
//         resetPreparation
//   R-23 RPC operations channel IDs follow the
//         `packaging:<verb-noun>` pattern
//   R-24 _removeSession is NOT exposed as a public RPC channel
//   R-25 the public Runtime barrel exposes createPackagingOperations
//         (so the Web feature / runtime can wire it)
//   R-26 the public Runtime barrel does NOT expose the
//         packaging-operations file path (only the named exports)
//
// Cross-suite invariant:
//   The P3-A7 architecture guards (71/71) must continue to PASS
//   when this test file is present. They are exercised by a
//   separate file (`packaging-workspace-architecture-guards.test.ts`)
//   and are NOT duplicated here.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPackagingWorkspaceService,
  createPackagingOperations,
  PACKAGING_OPERATION_VERSION,
  type createOperationRegistry,
  type createSharedRuntime,
} from '@masterpiece/runtime-core';

// ---------------------------------------------------------------------------
// Local test helpers
// ---------------------------------------------------------------------------

function makeStubs() {
  let prepareCalls = 0;
  let executeCalls = 0;
  const prepareFn = (input) => {
    prepareCalls += 1;
    return {
      now: new Date('2026-08-13T00:00:00.000Z').toISOString(),
      translation: {
        target: 'packaging',
        generationMode: input?.generationMode,
        shotContract: { id: input?.shotContractId },
        referencePolicy: { enabled: false, required: false, references: [] },
        userConstraints: { text: input?.explicitUserConstraints?.text ?? '' },
        lockedAssets: {},
        analysisContext: {},
        projectIdentity: {},
        negativeConstraints: [],
        providerHints: {},
        provenance: { sourceMode: input?.generationMode, inputSources: ['test'], createdAt: '2026-08-13T00:00:00.000Z' },
      },
      compiled: { prompt: 'compiled prompt', compiledPrompt: 'compiled prompt' },
      capability: {
        modelId: 'mock-model',
        provider: 'mock',
        protocol: 'mock',
        referenceSupport: false,
        maxReferenceImages: null,
        version: '1.0.0',
        supportedShotContracts: [],
      },
      payload: { prompt: 'compiled prompt', hints: {} },
      metadata: {
        translationVersion: '1.0.0',
        compilerVersion: '1.0.0',
        providerCapabilityVersion: '1.0.0',
        metadataVersion: '1.0.0',
        compileFingerprint: {
          sourceBundleHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          userIntentHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          deliverableHash: 'cccccccccccccccccccccccccccccccc',
          referencePlanHash: 'dddddddddddddddddddddddddddddddd',
          compiledPromptHash: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          executionIdentityHash: 'ffffffffffffffffffffffffffffffff',
          compiledAt: '2026-08-13T00:00:00.000Z',
        },
        warnings: [],
        blockers: [],
        gate: { warnings: [], blockers: [] },
      },
    };
  };
  const executeFn = async (prepared, deps) => {
    executeCalls += 1;
    return {
      runId: 'mock-run-001',
      status: 'completed',
      generationMode: prepared?.translation?.generationMode,
      shotContractId: prepared?.translation?.shotContract?.id,
      apiProfileId: deps?.apiProfileId,
      artifacts: [
        {
          imageId: 'img-1',
          mimeType: 'image/png',
          hasB64: true,
          hasUrl: false,
          relativePath: 'output/result-001.png',
          thumbnailRelativePath: 'output/result-001.thumb.png',
          width: 1024,
          height: 1024,
          sizeBytes: 12345,
        },
      ],
      diagnostics: {
        startedAt: '2026-08-13T00:00:00.000Z',
        completedAt: '2026-08-13T00:00:01.000Z',
        durationMs: 1000,
        referenceCount: 0,
        imageCount: 1,
        region: 'cn-hangzhou',
      },
    };
  };
  return { prepareFn, executeFn, getPrepareCalls: () => prepareCalls, getExecuteCalls: () => executeCalls };
}

function makeReadSettings() {
  return async () => ({
    profiles: [
      {
        id: 'profile-test-1',
        provider: 'mock',
        protocol: 'mock',
        modelId: 'mock-model',
        isDefault: true,
        isEnabled: true,
      },
    ],
    defaultDataPath: '/mock',
  });
}

function makeReadCredentials() {
  return async (profileId) => ({
    profileId: profileId ?? 'profile-test-1',
    provider: 'mock',
    protocol: 'mock',
    baseUrl: 'https://mock.invalid',
    model: 'mock-model',
    apiKey: 'sk-mock-secret-key-DO-NOT-LEAK',
  });
}

function makeResolveTruthSnapshot() {
  return async (projectId) => ({
    lockedAssets: {
      brand: { name: '', locked: true },
      logo: { present: false, usageMode: 'reserved', locked: true },
      productIdentity: { name: '', locked: true },
      category: { name: '', locked: true },
      structure: { formFactor: '', locked: true },
      mandatoryCopy: { items: [], locked: true },
      confirmedComponents: { items: [], locked: true },
    },
    analysisContext: { detectedIndustry: '', detectedProjectName: '', confidence: 0 },
    projectIdentity: { projectId: projectId || 'mock-project', projectName: '' },
  });
}

function makeBundle(overrides: { resolveTruthSnapshot?: (id: string) => Promise<unknown> } = {}) {
  const stubs = makeStubs();
  const service = createPackagingWorkspaceService({
    preparePackagingGeneration: stubs.prepareFn,
    executePackagingGeneration: stubs.executeFn,
  });
  const ops = createPackagingOperations({
    service,
    readSettings: makeReadSettings(),
    readCredentials: makeReadCredentials(),
    resolveTruthSnapshot: overrides.resolveTruthSnapshot ?? makeResolveTruthSnapshot(),
  });
  return { service, ops, stubs };
}

// ---------------------------------------------------------------------------
// R-01 — namespace is registered
// ---------------------------------------------------------------------------

test('R-01 the packaging operations factory exposes 7 RPC channels under the `packaging:` prefix', () => {
  const { ops } = makeBundle();
  const ids = Object.keys(ops.operations).sort();
  assert.deepEqual(
    ids,
    [
      'packaging:create-session',
      'packaging:execute-generation',
      'packaging:get-view',
      'packaging:prepare-generation',
      'packaging:reset-preparation',
      'packaging:set-truth-snapshot',
      'packaging:update-intent',
    ],
    'packaging operations factory must register exactly 7 channels (no more, no less)',
  );
  assert.equal(typeof ops.ids, 'object', 'ops.ids must expose the channel-id constants');
  assert.equal(ops.ids.CREATE_SESSION, 'packaging:create-session');
  assert.equal(ops.ids.GET_VIEW, 'packaging:get-view');
  assert.equal(ops.ids.PREPARE_GENERATION, 'packaging:prepare-generation');
  assert.equal(ops.ids.EXECUTE_GENERATION, 'packaging:execute-generation');
  assert.equal(ops.ids.RESET_PREPARATION, 'packaging:reset-preparation');
});

test('R-01b PACKAGING_OPERATION_VERSION is exported and pinned to 1.0.0', () => {
  assert.equal(PACKAGING_OPERATION_VERSION, '1.0.0');
});

// ---------------------------------------------------------------------------
// R-02..R-06 — create / get / persist / update
// ---------------------------------------------------------------------------

test('R-02 create-session returns { sessionId, view } and the view has the canonical 18 top-level keys', async () => {
  const { ops } = makeBundle();
  const out = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-2' },
  );
  assert.equal(typeof out.sessionId, 'string');
  assert.ok(out.sessionId.startsWith('pkg-ws-'), 'sessionId must come from the canonical factory');
  assert.equal(typeof out.view, 'object');
  for (const key of [
    'schemaVersion', 'sessionId', 'projectId', 'target', 'status', 'statusLabel',
    'isBusy', 'canEditIntent', 'mode', 'shot', 'references', 'lockedAssets',
    'intent', 'readiness', 'prepared', 'execution', 'error', 'staleReasons',
  ]) {
    assert.ok(key in out.view, `view must include canonical key ${key}`);
  }
  assert.equal(out.view.target, 'packaging');
  assert.equal(out.view.projectId, 'pkg-rpc-2');
});

test('R-02b create-session rejects when projectId is missing', async () => {
  const { ops } = makeBundle();
  await assert.rejects(
    () => ops.operations['packaging:create-session']({ host: 'node-web' }, {}),
    /projectId is required/,
  );
});

test('R-02c create-session uses the resolveTruthSnapshot authority when no truthSnapshot is supplied', async () => {
  let capturedProjectId = null;
  const resolveTruthSnapshot = async (projectId) => {
    capturedProjectId = projectId;
    return {
      lockedAssets: {
        brand: { name: 'test-brand', locked: true },
        logo: { present: true, usageMode: 'rendered', locked: true },
        productIdentity: { name: '', locked: true },
        category: { name: '', locked: true },
        structure: { formFactor: '', locked: true },
        mandatoryCopy: { items: [], locked: true },
        confirmedComponents: { items: [], locked: true },
      },
      analysisContext: { detectedIndustry: '', detectedProjectName: '', confidence: 0 },
      projectIdentity: { projectId, projectName: '' },
    };
  };
  const { ops } = makeBundle({ resolveTruthSnapshot });
  const out = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-2c' },
  );
  assert.equal(capturedProjectId, 'pkg-rpc-2c', 'runtime must invoke resolveTruthSnapshot(projectId)');
  assert.equal(out.view.lockedAssets.fields.brand.name, 'test-brand');
  assert.equal(out.view.lockedAssets.fields.logo.present, true);
  assert.equal(out.view.lockedAssets.fields.logo.usageMode, 'rendered');
});

test('R-03 get-view returns the same session view (no transformation)', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-3' },
  );
  const fetched = await ops.operations['packaging:get-view'](
    { host: 'node-web' },
    created.sessionId,
  );
  assert.equal(fetched.sessionId, created.sessionId);
  assert.equal(fetched.projectId, 'pkg-rpc-3');
  assert.equal(fetched.status, created.view.status);
});

test('R-04 session persists across multiple RPC calls (no per-call service recreation)', async () => {
  const { service, ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-4' },
  );
  const v1 = await ops.operations['packaging:get-view']({ host: 'node-web' }, created.sessionId);
  const v2 = await ops.operations['packaging:get-view']({ host: 'node-web' }, created.sessionId);
  const v3 = await ops.operations['packaging:get-view']({ host: 'node-web' }, created.sessionId);
  assert.equal(v1.sessionId, created.sessionId);
  assert.equal(v2.sessionId, created.sessionId);
  assert.equal(v3.sessionId, created.sessionId);
  // The same service instance must be the authority:
  // calling getView directly on the service must return the
  // same view shape.
  const direct = service.getView(created.sessionId);
  assert.equal(direct.sessionId, created.sessionId);
});

test('R-05 update-intent mutates the intent and returns the new view', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-5' },
  );
  const result = await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    { sessionId: created.sessionId, patch: { apiProfileId: 'profile-test-1' } },
  );
  assert.equal(result.view.intent.apiProfileId, 'profile-test-1');
});

test('R-06 get-view reflects the updated intent', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-6' },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    { sessionId: created.sessionId, patch: { providerModelId: 'mock-model-2' } },
  );
  const fetched = await ops.operations['packaging:get-view'](
    { host: 'node-web' },
    created.sessionId,
  );
  assert.equal(fetched.intent.providerModelId, 'mock-model-2');
});

// ---------------------------------------------------------------------------
// R-07 — unknown session safe rejection
// ---------------------------------------------------------------------------

test('R-07a get-view with unknown sessionId throws canonical PACKAGING_WORKSPACE_UNKNOWN_SESSION', async () => {
  const { ops } = makeBundle();
  await assert.rejects(
    () => ops.operations['packaging:get-view']({ host: 'node-web' }, 'no-such-session'),
    (err) => {
      assert.equal(err.code, 'PACKAGING_WORKSPACE_UNKNOWN_SESSION');
      assert.equal(err.sessionId, 'no-such-session');
      return true;
    },
  );
});

test('R-07b update-intent with unknown sessionId fails closed (does NOT auto-create)', async () => {
  const { ops } = makeBundle();
  await assert.rejects(
    () => ops.operations['packaging:update-intent'](
      { host: 'node-web' },
      { sessionId: 'no-such-session', patch: { apiProfileId: 'x' } },
    ),
    (err) => {
      assert.equal(err.code, 'PACKAGING_WORKSPACE_UNKNOWN_SESSION');
      return true;
    },
  );
});

test('R-07c prepare / execute / reset with unknown sessionId all fail closed', async () => {
  const { ops } = makeBundle();
  await assert.rejects(
    () => ops.operations['packaging:prepare-generation']({ host: 'node-web' }, 'no-such-session'),
    (err) => err.code === 'PACKAGING_WORKSPACE_UNKNOWN_SESSION',
  );
  await assert.rejects(
    () => ops.operations['packaging:execute-generation'](
      { host: 'node-web' },
      { sessionId: 'no-such-session' },
    ),
    (err) => err.code === 'PACKAGING_WORKSPACE_UNKNOWN_SESSION',
  );
  await assert.rejects(
    () => ops.operations['packaging:reset-preparation']({ host: 'node-web' }, 'no-such-session'),
    (err) => err.code === 'PACKAGING_WORKSPACE_UNKNOWN_SESSION',
  );
  await assert.rejects(
    () => ops.operations['packaging:set-truth-snapshot'](
      { host: 'node-web' },
      { sessionId: 'no-such-session', truthSnapshot: {} },
    ),
    (err) => err.code === 'PACKAGING_WORKSPACE_UNKNOWN_SESSION',
  );
});

// ---------------------------------------------------------------------------
// R-08..R-10 — prepare / execute / reset reach the frozen application service
// ---------------------------------------------------------------------------

test('R-08 prepare RPC reaches the frozen application service (NEW → PREPARING → READY)', async () => {
  const { ops, stubs } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-8' },
  );
  const result = await ops.operations['packaging:prepare-generation'](
    { host: 'node-web' },
    created.sessionId,
  );
  assert.equal(result.view.status, 'ready');
  assert.equal(stubs.getPrepareCalls(), 1, 'frozen prepare must be called exactly once');
  assert.ok(result.view.prepared, 'prepared view must be present after prepare');
  // The view carries fingerprint short-ids (12 chars + ellipsis), NOT the full 32-char hash.
  assert.equal(result.view.prepared.fingerprintSummary.sourceBundleHash.length <= 13, true);
});

test('R-09 execute RPC reaches the frozen application service (READY → EXECUTING → EXECUTED)', async () => {
  const { ops, stubs } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-9' },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    { sessionId: created.sessionId, patch: { apiProfileId: 'profile-test-1' } },
  );
  await ops.operations['packaging:prepare-generation'](
    { host: 'node-web' },
    created.sessionId,
  );
  const result = await ops.operations['packaging:execute-generation'](
    { host: 'node-web' },
    { sessionId: created.sessionId },
  );
  assert.equal(result.view.status, 'executed');
  assert.equal(stubs.getExecuteCalls(), 1, 'frozen execute must be called exactly once');
  assert.ok(result.view.execution, 'execution view must be present after execute');
  assert.equal(result.view.execution.runId, 'mock-run-001');
});

test('R-10 reset RPC reaches the frozen application service (READY → UNPREPARED)', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-10' },
  );
  await ops.operations['packaging:prepare-generation'](
    { host: 'node-web' },
    created.sessionId,
  );
  const result = await ops.operations['packaging:reset-preparation'](
    { host: 'node-web' },
    created.sessionId,
  );
  assert.equal(result.view.status, 'unprepared');
  assert.equal(result.view.prepared, null, 'prepared view must be cleared after reset');
});

// ---------------------------------------------------------------------------
// R-11 — execute deps reach the P2 frozen executePackagingGeneration
// ---------------------------------------------------------------------------

test('R-11 execute RPC builds deps from the canonical credential + settings authorities (no Web-side credential)', async () => {
  let receivedDeps = null;
  const service = createPackagingWorkspaceService({
    preparePackagingGeneration: () => ({
      now: '2026-08-13T00:00:00.000Z',
      translation: {
        target: 'packaging',
        generationMode: 'analysis_led',
        shotContract: { id: 'pkg_shot_hero' },
        referencePolicy: { enabled: false, required: false, references: [] },
        userConstraints: { text: '' },
        lockedAssets: {},
        analysisContext: {},
        projectIdentity: {},
        negativeConstraints: [],
        providerHints: {},
        provenance: { sourceMode: 'analysis_led', inputSources: ['test'], createdAt: '2026-08-13T00:00:00.000Z' },
      },
      compiled: { prompt: 'p', compiledPrompt: 'p' },
      capability: {
        modelId: 'mock-model',
        provider: 'mock',
        protocol: 'mock',
        referenceSupport: false,
        maxReferenceImages: null,
        version: '1.0.0',
        supportedShotContracts: [],
      },
      payload: { prompt: 'p', hints: {} },
      metadata: {
        translationVersion: '1.0.0',
        compilerVersion: '1.0.0',
        providerCapabilityVersion: '1.0.0',
        metadataVersion: '1.0.0',
        compileFingerprint: {
          sourceBundleHash: 'a'.repeat(32),
          userIntentHash: 'b'.repeat(32),
          deliverableHash: 'c'.repeat(32),
          referencePlanHash: 'd'.repeat(32),
          compiledPromptHash: 'e'.repeat(32),
          executionIdentityHash: 'f'.repeat(32),
          compiledAt: '2026-08-13T00:00:00.000Z',
        },
        warnings: [],
        blockers: [],
        gate: { warnings: [], blockers: [] },
      },
    }),
    executePackagingGeneration: async (_prepared, deps) => {
      receivedDeps = deps;
      return {
        runId: 'mock-run',
        status: 'completed',
        generationMode: 'analysis_led',
        shotContractId: 'pkg_shot_hero',
        apiProfileId: deps?.apiProfileId,
        artifacts: [],
        diagnostics: {
          startedAt: '2026-08-13T00:00:00.000Z',
          completedAt: '2026-08-13T00:00:00.000Z',
          durationMs: 0,
          referenceCount: 0,
          imageCount: 0,
          region: deps?.region,
        },
      };
    },
  });
  const ops = createPackagingOperations({
    service,
    readSettings: async () => ({
      profiles: [
        {
          id: 'profile-test-1',
          provider: 'mock',
          protocol: 'mock',
          modelId: 'mock-model',
          isDefault: true,
          isEnabled: true,
        },
      ],
    }),
    readCredentials: async (profileId) => ({
      profileId: profileId || 'profile-test-1',
      provider: 'mock',
      protocol: 'mock',
      baseUrl: 'https://mock.invalid',
      model: 'mock-model',
      apiKey: 'sk-mock-secret',
      region: 'cn-hangzhou',
    }),
    resolveTruthSnapshot: makeResolveTruthSnapshot(),
  });
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-11' },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    { sessionId: created.sessionId, patch: { apiProfileId: 'profile-test-1' } },
  );
  await ops.operations['packaging:prepare-generation'](
    { host: 'node-web' },
    created.sessionId,
  );
  await ops.operations['packaging:execute-generation'](
    { host: 'node-web' },
    { sessionId: created.sessionId },
  );
  assert.ok(receivedDeps, 'frozen execute must receive deps');
  assert.equal(receivedDeps.apiProfileId, 'profile-test-1');
  assert.equal(receivedDeps.providerModelId, 'mock-model');
  assert.equal(receivedDeps.apiKey, 'sk-mock-secret');
  assert.equal(receivedDeps.region, 'cn-hangzhou');
  // The deps stay on the runtime side — they MUST NOT
  // appear in the Web-visible view. The view MAY include
  // the audit region (which is part of the frozen P3-A
  // `execution.diagnostics.region` projection by design),
  // but it MUST NOT include the API key, Authorization,
  // Bearer, password, or secret.
  const view = await ops.operations['packaging:get-view'](
    { host: 'node-web' },
    created.sessionId,
  );
  const viewText = JSON.stringify(view);
  for (const forbidden of [
    'sk-mock-secret',
    'apiKey',
    'api_key',
    'Authorization',
    'Bearer',
    'password',
    'secret',
    'credential',
  ]) {
    assert.equal(
      viewText.includes(forbidden),
      false,
      `Web view must not contain credential substring ${forbidden}`,
    );
  }
});

// ---------------------------------------------------------------------------
// R-12 — canonical error code preserved
// ---------------------------------------------------------------------------

test('R-12 prepare failure preserves the canonical error code on the view', async () => {
  const service = createPackagingWorkspaceService({
    preparePackagingGeneration: () => {
      const err = new Error('prepared fail');
      err.code = 'PACKAGING_COMPILE_FAILED';
      throw err;
    },
    executePackagingGeneration: async () => ({}),
  });
  const ops = createPackagingOperations({
    service,
    readSettings: makeReadSettings(),
    readCredentials: makeReadCredentials(),
    resolveTruthSnapshot: makeResolveTruthSnapshot(),
  });
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-12' },
  );
  await assert.rejects(
    () => ops.operations['packaging:prepare-generation']({ host: 'node-web' }, created.sessionId),
    (err) => err.code === 'PACKAGING_COMPILE_FAILED',
  );
  const view = await ops.operations['packaging:get-view']({ host: 'node-web' }, created.sessionId);
  assert.equal(view.status, 'failed');
  assert.ok(view.error, 'view.error must be populated after a prepare failure');
  assert.equal(view.error.code, 'PACKAGING_COMPILE_FAILED');
  // Raw error.message / stack / cause MUST NOT appear in the view.
  const viewText = JSON.stringify(view);
  assert.equal(viewText.includes('prepared fail'), false, 'view must not leak raw error.message');
});

// ---------------------------------------------------------------------------
// R-13 — STALE execute preserves the STALE-specific issue envelope
// ---------------------------------------------------------------------------

test('R-13 STALE execute preserves the STALE-specific issue envelope (not generic not_ready)', async () => {
  const { ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-13' },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    { sessionId: created.sessionId, patch: { apiProfileId: 'profile-test-1' } },
  );
  await ops.operations['packaging:prepare-generation'](
    { host: 'node-web' },
    created.sessionId,
  );
  // Drift the intent → READY → STALE
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    { sessionId: created.sessionId, patch: { providerModelId: 'different-model' } },
  );
  const view = await ops.operations['packaging:get-view']({ host: 'node-web' }, created.sessionId);
  assert.equal(view.status, 'stale');
  await assert.rejects(
    () => ops.operations['packaging:execute-generation'](
      { host: 'node-web' },
      { sessionId: created.sessionId },
    ),
    (err) => {
      assert.equal(err.code, 'PACKAGING_WORKSPACE_EXECUTE_REJECTED');
      assert.deepEqual(
        Array.from(err.issues),
        ['stale', 'intent_changed'],
        'STALE execute must surface the STALE-specific issue envelope',
      );
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// R-14..R-18 — RPC response never carries raw session / preparedResult / Provider
// payload / absolute path / credential
// ---------------------------------------------------------------------------

test('R-14 RPC response carries only the UI-safe view (no raw session / no preparedResult / no Provider payload)', async () => {
  const { ops, service } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-14' },
  );
  await ops.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: { apiProfileId: 'profile-test-1', providerModelId: 'mock-model' },
    },
  );
  await ops.operations['packaging:prepare-generation'](
    { host: 'node-web' },
    created.sessionId,
  );
  const result = await ops.operations['packaging:execute-generation'](
    { host: 'node-web' },
    { sessionId: created.sessionId },
  );
  const view = result.view;
  const viewText = JSON.stringify(view);
  // The raw session Map is internal to the service — verify
  // by looking for keys that the frozen view forbids.
  for (const forbidden of [
    'preparedResult',
    'rawSession',
    'rawProviderPayload',
    'providerRequestBody',
    'providerResponseBody',
    'absolutePath',
    'sourcePath',
    'rawPath',
  ]) {
    assert.equal(viewText.includes(forbidden), false, `view must not include raw key ${forbidden}`);
  }
  // Internal session state keys must not appear on the view.
  for (const forbidden of [
    'lastStaleReasons',
    'lastStaleReason',
    'intentAtPrepare',
    'truthFingerprintAtPrepare',
  ]) {
    assert.equal(viewText.includes(forbidden), false, `view must not include internal session key ${forbidden}`);
  }
  // Sanity: the service is the only owner of the session Map.
  const direct = service.getView(created.sessionId);
  assert.notEqual(direct, view, 'getView must return a fresh frozen projection each call');
  assert.equal(direct.sessionId, view.sessionId);
});

// ---------------------------------------------------------------------------
// R-19 — same Workspace service instance is reused across RPC calls
// ---------------------------------------------------------------------------

test('R-19 a single Workspace service instance is the sole session authority across many RPC calls', async () => {
  const { service, ops } = makeBundle();
  const created = await ops.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-19' },
  );
  // Read the session via the service directly (proves the
  // service is the source of truth and the ops layer is a
  // thin bridge).
  const direct1 = service.getView(created.sessionId);
  assert.equal(direct1.sessionId, created.sessionId);
  assert.equal(direct1.projectId, 'pkg-rpc-19');
  // Multiple RPC calls all hit the same underlying state.
  for (let i = 0; i < 5; i += 1) {
    const result = await ops.operations['packaging:get-view'](
      { host: 'node-web' },
      created.sessionId,
    );
    // get-view RPC contract: returns the view directly.
    assert.equal(result.sessionId, created.sessionId);
    assert.equal(result.projectId, 'pkg-rpc-19');
  }
});

// ---------------------------------------------------------------------------
// R-20..R-22 — operations layer is thin: no Provider payload / no parallel
// fingerprint / only composes the frozen service API
// ---------------------------------------------------------------------------

test('R-20 the operations layer does NOT import or call buildPackagingProviderPayload / compilePackagingPrompt', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const opsSrc = await fs.readFile(
    path.resolve(process.cwd(), 'packages/runtime-core/src/operations/packaging-operations.js'),
    'utf8',
  );
  for (const forbidden of [
    'buildPackagingProviderPayload',
    'compilePackagingPrompt',
    'createPackagingTranslation',
    'validatePackagingTranslation',
    'createPackagingMetadata',
    'createCompileFingerprint',
    'resolvePackagingProviderCapability',
    'PACKAGING_REFERENCE_PRECEDENCE',
  ]) {
    assert.equal(
      opsSrc.includes(forbidden),
      false,
      `packaging-operations.js must not import or call the P2 frozen internals (${forbidden})`,
    );
  }
});

test('R-21 the operations layer does NOT call crypto.createHash or implement any parallel fingerprint', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const opsSrc = await fs.readFile(
    path.resolve(process.cwd(), 'packages/runtime-core/src/operations/packaging-operations.js'),
    'utf8',
  );
  for (const forbidden of ['crypto', 'createHash', 'createHmac', 'hash(', 'hash.update']) {
    assert.equal(
      opsSrc.includes(forbidden),
      false,
      `packaging-operations.js must not implement a parallel fingerprint (${forbidden})`,
    );
  }
});

test('R-22 the operations layer only composes the canonical Workspace service API', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const opsSrc = await fs.readFile(
    path.resolve(process.cwd(), 'packages/runtime-core/src/operations/packaging-operations.js'),
    'utf8',
  );
  for (const required of [
    'service.createSession',
    'service.getView',
    'service.updateIntent',
    'service.setTruthSnapshot',
    'service.prepareGeneration',
    'service.executeGeneration',
    'service.resetPreparation',
  ]) {
    assert.ok(
      opsSrc.includes(required),
      `packaging-operations.js must compose ${required}`,
    );
  }
});

// ---------------------------------------------------------------------------
// R-23..R-24 — channel ID pattern + no _removeSession
// ---------------------------------------------------------------------------

test('R-23 the registered channel IDs follow the `packaging:<verb-noun>` pattern', () => {
  const { ops } = makeBundle();
  for (const id of Object.keys(ops.operations)) {
    assert.match(id, /^packaging:[a-z]+(-[a-z]+)*$/u, `channel id ${id} must match the canonical pattern`);
  }
});

test('R-24 _removeSession is NOT exposed as a public RPC channel', () => {
  const { ops } = makeBundle();
  for (const id of Object.keys(ops.operations)) {
    assert.equal(
      id.includes('remove-session') || id.includes('removeSession') || id.includes('_removeSession'),
      false,
      `channel id ${id} must not expose the internal _removeSession helper`,
    );
  }
});

// ---------------------------------------------------------------------------
// R-25..R-26 — public Runtime barrel wires the operations factory
// ---------------------------------------------------------------------------

test('R-25 the public Runtime barrel re-exports createPackagingOperations (so the runtime / web can wire it)', () => {
  // We can't statically resolve a barrel re-export from a
  // .js file in node --test without evaluating it; instead
  // we just import the symbol through the public entry and
  // assert it is callable with the canonical signature.
  assert.equal(typeof createPackagingOperations, 'function');
});

test('R-26 the public Runtime barrel does NOT expose the packaging-operations.js file path (only the named exports)', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const barrel = await fs.readFile(
    path.resolve(process.cwd(), 'packages/runtime-core/src/index.js'),
    'utf8',
  );
  // The barrel re-exports the operations file but the file
  // path must not be a string literal that other consumers
  // could depend on.
  assert.ok(barrel.includes('./operations/packaging-operations.js'));
  // And it must NOT expose a path-level string that would
  // let a deep-importer bypass the barrel.
  assert.equal(
    barrel.includes("'./operations/packaging-operations'"),
    false,
    'public barrel must not expose the un-suffixed operations file path',
  );
});

// ---------------------------------------------------------------------------
// R-27 — operations layer does not read credentials directly (it only
// receives them through the readCredentials adapter)
// ---------------------------------------------------------------------------

test('R-27 the operations layer does NOT import process.env / readCredentials directly; it only accepts the readCredentials adapter', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const opsSrc = await fs.readFile(
    path.resolve(process.cwd(), 'packages/runtime-core/src/operations/packaging-operations.js'),
    'utf8',
  );
  for (const forbidden of ['process.env', 'fs.readFile', 'fs.writeFile', 'require(\'node:fs\')']) {
    assert.equal(
      opsSrc.includes(forbidden),
      false,
      `packaging-operations.js must not access credentials via the forbidden surface (${forbidden})`,
    );
  }
});

// ---------------------------------------------------------------------------
// R-28 — operations layer is fail-closed when readSettings/readCredentials throw
// ---------------------------------------------------------------------------

test('R-28 execute RPC fails closed when readCredentials rejects', async () => {
  // Reuse makeBundle()'s successful prepare stub so the
  // session can reach READY; then break the credential
  // resolver and verify execute fails closed.
  const stubs = makeStubs();
  const service = createPackagingWorkspaceService({
    preparePackagingGeneration: stubs.prepareFn,
    executePackagingGeneration: stubs.executeFn,
  });
  const failingOps = createPackagingOperations({
    service,
    readSettings: makeReadSettings(),
    readCredentials: async () => {
      throw new Error('CREDENTIAL_STORE_OFFLINE');
    },
    resolveTruthSnapshot: makeResolveTruthSnapshot(),
  });
  const created = await failingOps.operations['packaging:create-session'](
    { host: 'node-web' },
    { projectId: 'pkg-rpc-28' },
  );
  await failingOps.operations['packaging:update-intent'](
    { host: 'node-web' },
    {
      sessionId: created.sessionId,
      patch: { apiProfileId: 'profile-test-1', providerModelId: 'mock-model' },
    },
  );
  await failingOps.operations['packaging:prepare-generation'](
    { host: 'node-web' },
    created.sessionId,
  );
  await assert.rejects(
    () => failingOps.operations['packaging:execute-generation'](
      { host: 'node-web' },
      { sessionId: created.sessionId },
    ),
    (err) => {
      assert.equal(err.code, 'PACKAGING_WORKSPACE_EXECUTE_REJECTED');
      assert.match(err.message, /CREDENTIAL_STORE_OFFLINE/);
      return true;
    },
  );
});
