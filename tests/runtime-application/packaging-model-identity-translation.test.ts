// P3-A10 — AF Model Identity Translation corrective guards.
//
// The Workspace contract historically names its user-selected registry
// identity `providerModelId`. P2's prepare/capability seam names that same
// registry lookup identity `modelId`; the concrete Provider API model is
// resolved later from the API Profile during execution. These guards lock
// that translation without adding a second model authority.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  createPackagingWorkspaceService,
  validatePackagingIntent,
  PACKAGING_WORKSPACE_STATUS,
} from '@masterpiece/runtime-core';
import {
  preparePackagingGeneration,
} from '@masterpiece/image-generation-runtime/packaging/generation-service.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const WORKSPACE_SERVICE = path.join(
  ROOT,
  'packages',
  'runtime-core',
  'src',
  'application',
  'packaging',
  'workspace-service.js',
);
const INTENT_SCHEMA = path.join(
  ROOT,
  'packages',
  'runtime-core',
  'src',
  'application',
  'packaging',
  'intent-schema.js',
);
const WEB_WORKSPACE = path.join(
  ROOT,
  'apps',
  'web',
  'src',
  'features',
  'packaging',
  'PackagingWorkspace.tsx',
);
const PACKAGING_OPERATIONS = path.join(
  ROOT,
  'packages',
  'runtime-core',
  'src',
  'operations',
  'packaging-operations.js',
);
const ORIGINAL_P2_BASELINE = '335405342951fedae5d4d6816444c2b4d2402787';
const CURRENT_P2_BASELINE = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const NOW = '2026-08-14T00:00:00.000Z';

function makeTruthSnapshot() {
  return {
    lockedAssets: {
      brand: { name: 'Acme', locked: true },
      logo: { present: true, usageMode: 'reserved', locked: true },
      productIdentity: { name: 'Acme Bottle', locked: true },
      category: { name: 'cosmetics', locked: true },
      structure: { formFactor: 'bottle', locked: true },
      mandatoryCopy: { items: [], locked: true },
      confirmedComponents: { items: [], locked: true },
    },
    projectIdentity: {
      brandName: 'Acme',
      industry: 'cosmetics',
      brandRole: 'premium cosmetics',
      productIdentity: 'Acme Bottle',
    },
    analysisContext: {},
    projectVisualContext: {
      packageStructures: ['cylindrical body'],
      packagingConcept: 'Premium minimal cosmetics packaging.',
    },
  };
}

function createSession(service: any, providerModelId = 'seedream-5.0-pro', apiProfileId = 'profile-seedream') {
  const session = service.createSession({
    projectId: 'p3-a10-project',
    truthSnapshot: makeTruthSnapshot(),
  });
  if (providerModelId !== undefined || apiProfileId !== undefined) {
    service.updateIntent(session.sessionId, { providerModelId, apiProfileId });
  }
  return session;
}

function makePreparedResult(modelId = 'seedream-5.0-pro') {
  return {
    now: NOW,
    translation: {
      schemaVersion: '1.0',
      generationMode: 'analysis_led',
      shotContract: { id: 'PKG-HERO-SINGLE' },
      referencePolicy: { enabled: false, required: false, references: [], count: 0 },
    },
    compiled: { blocks: [], prompt: 'fixture' },
    capability: {
      modelId,
      provider: 'volcengine',
      protocol: 'seedream-image',
      referenceSupport: true,
      maxReferenceImages: 4,
    },
    payload: { prompt: 'fixture', hints: {}, references: [] },
    metadata: {
      compileFingerprint: {
        sourceBundleHash: 'a'.repeat(64),
        userIntentHash: 'b'.repeat(64),
        deliverableHash: 'c'.repeat(64),
        referencePlanHash: 'd'.repeat(64),
        compiledPromptHash: 'e'.repeat(64),
        compiledAt: NOW,
      },
    },
  };
}

function prepareThroughRealP2(input: any) {
  return preparePackagingGeneration(input);
}

test('AF-01 Workspace intent providerModelId reaches P2 translation input.modelId', () => {
  const service = createPackagingWorkspaceService({
    newSessionId: () => 'af-01',
    now: () => NOW,
    preparePackagingGeneration: prepareThroughRealP2,
  });
  const session = createSession(service);
  const ready = service.prepareGeneration(session.sessionId);
  assert.equal(ready.status, PACKAGING_WORKSPACE_STATUS.READY);
  assert.equal(ready.prepared.preparedResult.capability.modelId, 'seedream-5.0-pro');
  assert.ok(ready.prepared.preparedResult.metadata.compileFingerprint);
});

test('AF-02 mapping preserves the selected registry identity verbatim', () => {
  let received: any = null;
  const service = createPackagingWorkspaceService({
    newSessionId: () => 'af-02',
    now: () => NOW,
    preparePackagingGeneration(input: any) {
      received = structuredClone(input);
      return makePreparedResult(input.modelId);
    },
  });
  const session = createSession(service, 'gpt-image-2', 'profile-openai');
  service.prepareGeneration(session.sessionId);
  assert.equal(received.modelId, 'gpt-image-2');
  assert.equal(Object.hasOwn(received, 'providerModelId'), false);
  assert.equal(Object.hasOwn(received, 'registryModelId'), false);
});

test('AF-03 Web does not send a duplicate modelId authority', () => {
  const source = readFileSync(WEB_WORKSPACE, 'utf8');
  assert.match(source, /patch\.providerModelId\s*=\s*providerModelId\.trim\(\)/u);
  assert.doesNotMatch(source, /\bpatch\.modelId\b/u);
  assert.doesNotMatch(source, /\bmodelId\s*:/u);
});

test('AF-04 RPC prepare does not invent or rename model identity', () => {
  const source = readFileSync(PACKAGING_OPERATIONS, 'utf8');
  const start = source.indexOf('[PACKAGING_OPERATION_IDS.PREPARE_GENERATION]');
  const end = source.indexOf('[PACKAGING_OPERATION_IDS.EXECUTE_GENERATION]', start);
  assert.ok(start >= 0 && end > start, 'prepare RPC handler must be present');
  const handler = source.slice(start, end);
  assert.match(handler, /service\.prepareGeneration\(sessionId\)/u);
  assert.doesNotMatch(handler, /\b(?:providerModelId|registryModelId|modelId)\b/u);
});

test('AF-05 Workspace intent owns no modelId or registryModelId field', () => {
  const validated = validatePackagingIntent({
    generationMode: 'analysis_led',
    shotContractId: 'PKG-HERO-SINGLE',
    explicitUserConstraints: { text: '' },
    referenceAssignments: [],
    providerModelId: 'seedream-5.0-pro',
    apiProfileId: 'profile-seedream',
    modelId: 'duplicate-model',
    registryModelId: 'duplicate-registry-model',
  });
  assert.equal(validated.valid, true);
  assert.equal(Object.hasOwn(validated.intent, 'modelId'), false);
  assert.equal(Object.hasOwn(validated.intent, 'registryModelId'), false);
});

test('AF-06 providerModelId edit after READY still causes STALE', () => {
  const service = createPackagingWorkspaceService({
    newSessionId: () => 'af-06',
    now: () => NOW,
    preparePackagingGeneration: (input: any) => makePreparedResult(input.modelId),
  });
  const session = createSession(service);
  service.prepareGeneration(session.sessionId);
  const stale = service.updateIntent(session.sessionId, { providerModelId: 'gpt-image-2' });
  assert.equal(stale.status, PACKAGING_WORKSPACE_STATUS.STALE);
  assert.deepEqual([...stale.lastStaleReasons], ['intent_changed']);
});

test('AF-07 missing model still fails closed at the real P2 capability seam', () => {
  const service = createPackagingWorkspaceService({
    newSessionId: () => 'af-07',
    now: () => NOW,
  });
  const session = createSession(service, '', 'profile-seedream');
  assert.throws(
    () => service.prepareGeneration(session.sessionId),
    (error: any) => error?.code === 'PROVIDER_CAPABILITY_MISMATCH'
      && /modelId is required/u.test(error.message),
  );
});

test('AF-08 unsupported model delegates to the real P2 capability authority', () => {
  const service = createPackagingWorkspaceService({
    newSessionId: () => 'af-08',
    now: () => NOW,
    preparePackagingGeneration: prepareThroughRealP2,
  });
  const session = createSession(service, 'not-a-registered-model', 'profile-invalid');
  assert.throws(
    () => service.prepareGeneration(session.sessionId),
    (error: any) => error?.code === 'PROVIDER_CAPABILITY_MISMATCH'
      && /not registered/u.test(error.message),
  );
});

test('AF-09 Workspace creates no second generation fingerprint authority', () => {
  const source = readFileSync(WORKSPACE_SERVICE, 'utf8');
  assert.doesNotMatch(source, /from\s+['"]node:crypto['"]/u);
  assert.doesNotMatch(source, /\b(?:createHash|stableHash)\s*\(/u);
  assert.match(source, /getPackagingGenerationServiceFingerprint/u);
});

test('AF-10 P2 frozen production surfaces remain unchanged', () => {
  assert.equal(execFileSync('git', ['cat-file', '-t', ORIGINAL_P2_BASELINE], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim(), 'commit');
  const changed = execFileSync('git', [
    'diff',
    '--name-only',
    CURRENT_P2_BASELINE,
    '--',
    'packages/image-generation-runtime/src/packaging',
    'packages/image-generation-runtime/src/core/packaging-generation-core.js',
    'packages/image-generation-runtime/src/redact.js',
    'packages/image-generation-runtime/src/deliverables',
    'packages/image-generation-runtime/src/policies.js',
    'packages/image-generation-runtime/src/gates.js',
    'packages/image-generation-runtime/src/task-builder.js',
    'packages/image-generation-runtime/src/download-verify.js',
  ], { cwd: ROOT, encoding: 'utf8' }).trim();
  assert.equal(changed, '');
});

test('AF-11 apiProfileId remains execution-only and is not duplicated into P2 translation input', () => {
  let received: any = null;
  const service = createPackagingWorkspaceService({
    newSessionId: () => 'af-11',
    now: () => NOW,
    preparePackagingGeneration(input: any) {
      received = structuredClone(input);
      return makePreparedResult(input.modelId);
    },
  });
  const session = createSession(service, 'seedream-5.0-pro', 'profile-seedream');
  service.prepareGeneration(session.sessionId);
  assert.equal(Object.hasOwn(received, 'apiProfileId'), false);
});

test('AF-12 stale execute remains fail-closed after model identity correction', async () => {
  let executeCalls = 0;
  const service = createPackagingWorkspaceService({
    newSessionId: () => 'af-12',
    now: () => NOW,
    preparePackagingGeneration: (input: any) => makePreparedResult(input.modelId),
    executePackagingGeneration: async () => {
      executeCalls += 1;
      return {};
    },
  });
  const session = createSession(service);
  service.prepareGeneration(session.sessionId);
  service.updateIntent(session.sessionId, { providerModelId: 'gpt-image-2' });
  await assert.rejects(
    service.executeGeneration(session.sessionId),
    /PACKAGING_WORKSPACE_EXECUTE_REJECTED/u,
  );
  assert.equal(executeCalls, 0);
});

test('AF-13 whitespace-only model remains the canonical missing-model failure', () => {
  const service = createPackagingWorkspaceService({
    newSessionId: () => 'af-13',
    now: () => NOW,
  });
  const session = createSession(service, '   ', 'profile-seedream');
  assert.throws(
    () => service.prepareGeneration(session.sessionId),
    (error: any) => error?.code === 'PROVIDER_CAPABILITY_MISMATCH'
      && /modelId is required/u.test(error.message),
  );
});

test('AF-14 model translation is a single projection in the P3-A application boundary', () => {
  const serviceSource = readFileSync(WORKSPACE_SERVICE, 'utf8');
  const intentSource = readFileSync(INTENT_SCHEMA, 'utf8');
  assert.equal((serviceSource.match(/const selectedModelId\s*=\s*intent\.providerModelId/gu) || []).length, 1);
  assert.equal((serviceSource.match(/modelId:\s*selectedModelId/gu) || []).length, 2);
  assert.doesNotMatch(intentSource, /['"]modelId['"]\s*,/u);
  assert.doesNotMatch(intentSource, /['"]registryModelId['"]\s*,/u);
});
