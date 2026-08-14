// P3-B6.3 — final production-flow acceptance.
//
// This is one contiguous Runtime/RPC acceptance path. It uses the real
// Packaging Workspace service, the real P2 prepare + execute functions, the
// real artifact lifecycle, and the canonical image-generation run store. Only
// the external paid Provider is replaced by a sanctioned local adapter.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createPackagingArtifactStore,
  createPackagingOperations,
  createPackagingRunRegistrationAdapter,
  createPackagingWorkspaceService,
  PACKAGING_WORKSPACE_STATUS,
} from '@masterpiece/runtime-core';
import { createRunStore } from '@masterpiece/runtime-core/image-generation-run-store';
import {
  executePackagingGeneration,
  preparePackagingGeneration,
} from '@masterpiece/image-generation-runtime/packaging/generation-service.js';

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAE/wJ/lP5qVQAAAABJRU5ErkJggg==',
  'base64',
);

const PROJECT_ID = 'p3-b63-production-flow';
const PROFILE_ID = 'profile-seedream-local';
const MODEL_ID = 'seedream-5.0-pro';

function truthSnapshot() {
  return {
    lockedAssets: {
      brand: { name: 'Acme Botanicals', locked: true },
      logo: { present: true, usageMode: 'reserved', locked: true },
      productIdentity: { name: 'Hydrating Serum 30ml', locked: true },
      category: { name: 'premium skincare', locked: true },
      structure: { formFactor: 'cylindrical glass bottle with dropper', locked: true },
      mandatoryCopy: { items: ['30ml'], locked: true },
      confirmedComponents: { items: ['dropper', 'cap', 'bottle'], locked: true },
    },
    projectIdentity: {
      brandName: 'Acme Botanicals',
      industry: 'Skincare',
      brandRole: 'premium botanical skincare',
      productIdentity: 'Hydrating Serum 30ml',
    },
    analysisContext: {
      detectedIndustry: 'Skincare',
      detectedProjectName: 'Acme Botanicals',
      confidence: 1,
    },
    projectVisualContext: {
      packageStructures: ['cylindrical body', 'screw cap', 'pipette dropper'],
      packagingConcept: 'Calm botanical care expressed through restrained material contrast.',
    },
  };
}

test('AH-01 real RPC production flow reaches two canonical runs and preserves stale/reset semantics', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'p3-b63-production-'));
  const projectRoot = path.join(dataPath, 'projects', PROJECT_ID);
  const referencePath = path.join(projectRoot, 'references', 'serum-reference.png');
  await fs.mkdir(path.dirname(referencePath), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'project.json'), JSON.stringify({
    id: PROJECT_ID,
    projectName: 'Acme Botanicals',
  }));
  await fs.writeFile(referencePath, PNG_BYTES);

  let sessionId = '';
  let runCounter = 0;
  let executorCalls = 0;
  let lastPrepareInput: any = null;
  let lastPreparedResult: any = null;
  const observedPrepareStatuses: string[] = [];
  const preparedFingerprints: string[] = [];
  let releaseProvider: (() => void) | null = null;
  let providerStarted: Promise<void> = Promise.resolve();
  let signalProviderStarted: (() => void) | null = null;

  const bridge = createPackagingRunRegistrationAdapter({
    dataPath,
    createRunStore: (root: string, projectId: string) => createRunStore(root, projectId),
    resolveProjectRoot: async () => projectRoot,
    now: () => '2026-08-14T08:00:00.000Z',
  });

  const downloadImpl = bridge.wrapDownloadImpl(async (input: {
    targetPath: string;
    thumbnailPath: string;
  }) => {
    await fs.writeFile(input.targetPath, PNG_BYTES);
    await fs.writeFile(input.thumbnailPath, PNG_BYTES);
    return {
      downloadFailed: false,
      mimeType: 'image/png',
      sizeBytes: PNG_BYTES.length,
      sha256: 'a'.repeat(64),
      decoded: true,
      written: true,
      thumbnailWritten: true,
      width: 1,
      height: 1,
    };
  });

  const store = createPackagingArtifactStore({
    dataPath,
    resolveProjectRoot: async () => projectRoot,
    resolveAssetById: async (_projectId: string, assetId: string) => assetId === 'reference-01'
      ? { name: 'serum-reference.png', mimeType: 'image/png', absolutePath: referencePath }
      : null,
    readFileBytes: (absolutePath: string) => fs.readFile(absolutePath),
    writeJsonSafe: async (absolutePath: string, value: unknown) => {
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, JSON.stringify(value, null, 2));
    },
    ensureDir: (absolutePath: string) => fs.mkdir(absolutePath, { recursive: true }),
    getProjectIdForSession: () => PROJECT_ID,
    downloadImpl,
    registerCanonicalRun: async (_sessionId: string, result: unknown) => {
      await bridge.registerRun({ projectId: PROJECT_ID, packagingResult: result });
    },
    canonicalReadRun: ({ projectId, runId }: { projectId: string; runId: string }) =>
      bridge.readRun({ projectId, runId }),
  });

  const localExecutor = {
    id: MODEL_ID,
    version: 'sanctioned-local@1.0.0',
    protocol: 'seedream-image',
    compileRequest: (input: unknown) => ({
      method: 'POST',
      url: 'https://local.invalid/packaging',
      headers: { 'Content-Type': 'application/json' },
      bodyKind: 'json',
      body: { model: MODEL_ID, input },
    }),
    execute: async () => {
      executorCalls += 1;
      signalProviderStarted?.();
      if (releaseProvider) {
        await new Promise<void>((resolve) => { releaseProvider = resolve; });
      }
      return {
        status: 'succeeded',
        adapterId: MODEL_ID,
        modelId: MODEL_ID,
        requestId: `local-request-${executorCalls}`,
        images: [{ mimeType: 'image/png', b64: PNG_BYTES.toString('base64') }],
      };
    },
  };

  const service = createPackagingWorkspaceService({
    now: () => '2026-08-14T08:00:00.000Z',
    preparePackagingGeneration: (input: unknown) => {
      if (sessionId) observedPrepareStatuses.push(service.getView(sessionId).status);
      lastPrepareInput = structuredClone(input);
      lastPreparedResult = preparePackagingGeneration(input);
      preparedFingerprints.push(lastPreparedResult.metadata.compileFingerprint.userIntentHash);
      return lastPreparedResult;
    },
    executePackagingGeneration: (prepared: unknown, deps: Record<string, unknown>) =>
      executePackagingGeneration(prepared, {
        ...deps,
        executor: localExecutor,
        createRunId: () => `pkg-b63-${String(++runCounter).padStart(2, '0')}`,
      }),
  });

  const { operations } = createPackagingOperations({
    service,
    readSettings: async () => ({
      profiles: [{
        id: PROFILE_ID,
        provider: 'volcengine',
        protocol: 'seedream-image',
        modelId: MODEL_ID,
        isDefault: true,
        isEnabled: true,
      }],
    }),
    readCredentials: async () => ({
      apiKey: 'LOCAL_TEST_ONLY',
      baseUrl: 'https://local.invalid',
      region: 'beijing',
    }),
    resolveTruthSnapshot: async () => truthSnapshot(),
    packagingArtifactStore: store,
  });

  try {
    const created = await operations['packaging:create-session'](
      { host: 'node-web' },
      { projectId: PROJECT_ID },
    );
    sessionId = created.sessionId;

    await operations['packaging:update-intent']({ host: 'node-web' }, {
      sessionId,
      patch: {
        apiProfileId: PROFILE_ID,
        providerModelId: MODEL_ID,
        generationMode: 'reference_first',
        shotContractId: 'PKG-HERO-SINGLE',
        referenceAssignments: [{
          assetId: 'reference-01',
          role: 'product_identity_reference',
          source: 'user',
        }],
      },
    });

    const prepared = await operations['packaging:prepare-generation'](
      { host: 'node-web' }, sessionId,
    );
    assert.equal(prepared.view.status, PACKAGING_WORKSPACE_STATUS.READY);
    assert.equal(prepared.view.readiness.canExecute, true);
    assert.equal(prepared.view.intent.providerModelId, MODEL_ID);
    assert.deepEqual(observedPrepareStatuses, [PACKAGING_WORKSPACE_STATUS.PREPARING]);
    assert.equal(lastPrepareInput.modelId, MODEL_ID);
    assert.equal(lastPrepareInput.providerHints.aspectRatio, '4:5');
    assert.equal(lastPrepareInput.structure.formFactor, 'cylindrical glass bottle with dropper');
    assert.deepEqual(lastPrepareInput.structure.structuralFeatures, [
      'cylindrical body', 'screw cap', 'pipette dropper',
    ]);
    assert.equal(
      lastPrepareInput.visualDirection.summary,
      'Calm botanical care expressed through restrained material contrast.',
    );
    assert.equal(lastPreparedResult.capability.modelId, MODEL_ID);
    assert.equal(lastPreparedResult.translation.referencePolicy.references.length, 1);
    assert.ok(lastPreparedResult.metadata.compileFingerprint.sourceBundleHash);

    providerStarted = new Promise<void>((resolve) => { signalProviderStarted = resolve; });
    releaseProvider = () => undefined;
    const firstExecutionPromise = operations['packaging:execute-generation'](
      { host: 'node-web' }, { sessionId },
    );
    await providerStarted;
    assert.equal(service.getView(sessionId).status, PACKAGING_WORKSPACE_STATUS.EXECUTING);
    releaseProvider?.();
    releaseProvider = null;
    const firstExecution = await firstExecutionPromise;
    assert.equal(firstExecution.view.status, PACKAGING_WORKSPACE_STATUS.EXECUTED);
    const runId1 = firstExecution.view.execution.runId;
    assert.match(runId1, /^pkg-/u);

    const runStore = createRunStore(dataPath, PROJECT_ID);
    const run1 = await runStore.readRun(runId1);
    assert.ok(run1);
    assert.equal(run1.outputType, 'packaging_render');
    assert.equal(run1.providerId, 'volcengine');
    assert.equal(run1.taskId, runId1);
    assert.equal(run1.status, 'succeeded');
    assert.equal(run1.images.length, 1);
    assert.ok(run1.images[0].downloadedAt);
    assert.ok((await fs.stat(path.join(projectRoot, 'image-generation', runId1, 'run.json'))).isFile());
    assert.ok((await fs.stat(path.join(projectRoot, 'image-generation', runId1, 'packaging-generation-result.json'))).isFile());
    assert.ok((await fs.stat(path.join(projectRoot, 'image-generation', runId1, 'images', 'image-01.png'))).size > 0);

    const preview1 = await operations['packaging:get-artifact-preview'](
      { host: 'node-web' }, { sessionId, runId: runId1, imageId: 'image-01' },
    );
    assert.equal(preview1.preview.mimeType, 'image/png');
    assert.match(preview1.preview.dataUrl, /^data:image\/png;base64,/u);
    assert.doesNotMatch(JSON.stringify(preview1), /(?:file:\/\/|[A-Za-z]:\\|runRoot|relativePath)/u);

    const stale = await operations['packaging:update-intent']({ host: 'node-web' }, {
      sessionId,
      patch: { shotContractId: 'PKG-SERIES-GROUP' },
    });
    assert.equal(stale.view.status, PACKAGING_WORKSPACE_STATUS.STALE);
    assert.deepEqual([...stale.view.staleReasons], ['intent_changed']);
    assert.equal(stale.view.execution.runId, runId1);
    const stalePreview = await operations['packaging:get-artifact-preview'](
      { host: 'node-web' }, { sessionId, runId: runId1, imageId: 'image-01' },
    );
    assert.match(stalePreview.preview.dataUrl, /^data:image\/png;base64,/u);
    await assert.rejects(
      () => operations['packaging:execute-generation']({ host: 'node-web' }, { sessionId }),
      (error: any) => error?.issues?.includes('stale') && error?.issues?.includes('intent_changed'),
    );
    assert.equal(executorCalls, 1);

    const rePrepared = await operations['packaging:prepare-generation'](
      { host: 'node-web' }, sessionId,
    );
    assert.equal(rePrepared.view.status, PACKAGING_WORKSPACE_STATUS.READY);
    assert.equal(lastPreparedResult.translation.providerHints.aspectRatio, '16:9');
    assert.deepEqual(observedPrepareStatuses, [
      PACKAGING_WORKSPACE_STATUS.PREPARING,
      PACKAGING_WORKSPACE_STATUS.PREPARING,
    ]);
    assert.notEqual(preparedFingerprints[1], preparedFingerprints[0]);

    const secondExecution = await operations['packaging:execute-generation'](
      { host: 'node-web' }, { sessionId },
    );
    const runId2 = secondExecution.view.execution.runId;
    assert.equal(secondExecution.view.status, PACKAGING_WORKSPACE_STATUS.EXECUTED);
    assert.match(runId2, /^pkg-/u);
    assert.notEqual(runId2, runId1);
    assert.ok(await runStore.readRun(runId2));
    assert.equal((await runStore.listRuns()).filter((run) => [runId1, runId2].includes(run.runId)).length, 2);
    const preview2 = await operations['packaging:get-artifact-preview'](
      { host: 'node-web' }, { sessionId, runId: runId2, imageId: 'image-01' },
    );
    assert.match(preview2.preview.dataUrl, /^data:image\/png;base64,/u);

    const retry = await operations['packaging:execute-generation'](
      { host: 'node-web' }, { sessionId },
    );
    const retryRunId = retry.view.execution.runId;
    assert.notEqual(retryRunId, runId2);
    assert.ok(await runStore.readRun(retryRunId));

    const reset = await operations['packaging:reset-preparation'](
      { host: 'node-web' }, sessionId,
    );
    assert.equal(reset.view.status, PACKAGING_WORKSPACE_STATUS.UNPREPARED);
    assert.equal(reset.view.execution.runId, retryRunId);
    assert.ok(await runStore.readRun(runId1));
    assert.ok(await runStore.readRun(runId2));
    assert.ok(await runStore.readRun(retryRunId));

    const analysisSession = await operations['packaging:create-session'](
      { host: 'node-web' }, { projectId: PROJECT_ID },
    );
    await operations['packaging:update-intent']({ host: 'node-web' }, {
      sessionId: analysisSession.sessionId,
      patch: {
        apiProfileId: PROFILE_ID,
        providerModelId: MODEL_ID,
        generationMode: 'analysis_led',
        shotContractId: 'PKG-HERO-SINGLE',
      },
    });
    const analysisReady = await operations['packaging:prepare-generation'](
      { host: 'node-web' }, analysisSession.sessionId,
    );
    assert.equal(analysisReady.view.status, PACKAGING_WORKSPACE_STATUS.READY);
    assert.equal(executorCalls, 3);
  } finally {
    await fs.rm(dataPath, { recursive: true, force: true });
  }
});
