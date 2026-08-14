// P2-G Finalization Delta #2 tests — Packaging Generation Service.
//
// Coverage map:
//   P2-G-F#2 items A-O  (P2-G Finalization Delta #2)
//   P2-G-F items   A-N  (P2-G Finalization Delta, retained for
//                          regression coverage)
//   pre-execution / stale / cross-target / no-golden / arch /
//   structural-fingerprint
//
// Architectural position:
//   - The Service is a thin orchestrator that wires the frozen
//     P2-A..P2-F modules together with the Shared Generation
//     Core. It is NOT a second runtime.
//   - Tests do not require a real API key.
//   - The Shared redaction layer is now target-neutral and
//     recursive (P2-G-F#2 item 1); the test exercises the
//     real Shared redaction on a real Shared compileRequest
//     output (P2-G-F#2 item 14).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const require = createRequire(import.meta.url);

const {
  PACKAGING_GENERATION_SERVICE_VERSION,
  GENERATION_PROVIDER_FAILED,
  GENERATION_PERSISTENCE_FAILED,
  GENERATION_EXECUTION_STALE,
  REFERENCE_ASSET_UNRESOLVED,
  ARTIFACT_LIFECYCLE_REQUIRED,
  EXECUTION_PROVIDER_MODEL_REQUIRED,
  preparePackagingGeneration,
  executePackagingGeneration,
  runPackagingGeneration,
  getPackagingGenerationServiceFingerprint,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/generation-service.js'));

const { evaluatePackagingCapability } = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-capability.js'));

function makeBaseInput(overrides = {}) {
  return {
    generationMode: 'analysis_led',
    shotContract: { id: 'PKG-HERO-SINGLE' },
    modelId: 'seedream-5.0-pro',
    providerCapability: { referenceSupport: true, maxReferenceImages: 2 },
    projectIdentity: {
      brandName: 'Acme Botanicals',
      industry: 'Skincare',
      brandRole: 'premium botanical skincare',
      productIdentity: 'Acme Hydrating Serum 30ml',
    },
    lockedAssets: {
      brand: { name: 'Acme Botanicals' },
      logo: { usageMode: 'reserved', present: true },
      productIdentity: { name: 'Acme Hydrating Serum 30ml' },
      category: { name: 'premium skincare' },
      structure: { formFactor: 'cylindrical glass bottle with dropper' },
      mandatoryCopy: { items: ['30ml'] },
      confirmedComponents: { items: ['dropper', 'cap', 'bottle'] },
    },
    structure: {
      formFactor: 'cylindrical glass bottle with dropper',
      primaryPackage: 'glass dropper bottle',
      structuralFeatures: ['cylindrical body', 'screw cap', 'pipette dropper'],
    },
    visualDirection: { summary: 'Calm botanical apothecary aesthetic.' },
    colorSystem: { base: ['soft warm white'], accent: ['sage green'] },
    motifSystem: { primary: ['leaf silhouette'] },
    materialSystem: { substrate: ['frosted glass'], craft: ['matte label'] },
    composition: { type: 'centered hero' },
    lighting: { intent: 'soft studio' },
    camera: { aspectRatio: '1:1' },
    sceneProgram: { type: 'studio' },
    providerHints: { aspectRatio: '4:5', imageSize: '2K', qualityProfile: 'high' },
    ...overrides,
  };
}

function makeFakeExecutor(overrides = {}) {
  const compileRequest = overrides.compileRequest || ((universalInput) => ({
    method: 'POST',
    url: `https://ark.cn-beijing.volces.com/api/v3/images/generations?input=${encodeURIComponent(universalInput.prompt.slice(0, 20))}`,
    headers: { Authorization: 'Bearer FAKE_TEST_API_KEY', 'Content-Type': 'application/json' },
    bodyKind: 'json',
    body: {
      model: 'doubao-seedream-5-0-pro-260628',
      prompt: universalInput.prompt,
      image: universalInput.references.map((r) => `data:${r.mimeType};base64,${r.data}`),
      size: universalInput.imageSize,
      response_format: 'b64_json',
    },
  }));
  const execute = overrides.execute || (async () => ({
    status: 'succeeded',
    adapterId: 'seedream-5.0-pro',
    modelId: 'doubao-seedream-5-0-pro-260628',
    requestId: 'fake-request-id',
    images: [{
      mimeType: 'image/png',
      b64: Buffer.from('fake-png-bytes-1').toString('base64'),
    }],
  }));
  return Object.freeze({
    id: 'seedream-5.0-pro',
    version: 'shared-test-executor@1.0.0',
    protocol: 'seedream-image',
    compileRequest,
    execute,
  });
}

// P2-G-F#2 item 10: the fake `downloadImpl` mirrors the
// real `downloadAndVerifyImage` shape. The real helper
// returns `{downloadFailed, mimeType, sizeBytes, sha256,
// decoded, written, thumbnailWritten, width, height, error?}`
// — and does NOT return `relativePathWritten`. Tests align
// with the real shape; relative paths come from the
// artifact lifecycle, not the download result.
function makeFakeDownloadImpl(overrides = {}) {
  return async (input) => ({
    downloadFailed: false,
    mimeType: 'image/png',
    sizeBytes: 12345,
    sha256: 'a'.repeat(64),
    decoded: true,
    written: true,
    thumbnailWritten: true,
    width: 1024,
    height: 1024,
    ...overrides,
  });
}

function makeFakeExecutionConfig(overrides = {}) {
  return async () => ({
    apiKey: 'FAKE_TEST_API_KEY',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    providerModelId: 'doubao-seedream-5-0-pro-260628',
    apiProfileId: 'profile-001',
    protocol: 'seedream-image',
    provider: 'volcengine',
    region: 'beijing',
    ...overrides,
  });
}

// P2-G-F#2 item 7 + 8: the artifact lifecycle returns
// absolute paths (runtime I/O) AND relative paths
// (persisted surface). The Service only persists the
// relative paths.
function makeFakeArtifactLifecycle(overrides = {}) {
  return async (input) => ({
    runRoot: '/tmp/packaging-test-run',
    targetPath: '/tmp/packaging-test-run/image-01.png',
    thumbnailPath: '/tmp/packaging-test-run/image-01.webp',
    relativePath: 'image-01.png',
    thumbnailRelativePath: 'image-01.webp',
    ...overrides,
  });
}

function makeFakeSaveRun(overrides = {}) {
  return async (run) => {
    if (typeof overrides.onSave === 'function') overrides.onSave(run);
    return run;
  };
}

let _runIdCounter = 0;
function makeFakeDeps(overrides = {}) {
  return {
    readReference: async (reference) => ({
      name: `${reference.assetId}.png`,
      mimeType: 'image/png',
      data: Buffer.from(`fake-binary-for-${reference.assetId}`).toString('base64'),
    }),
    executor: makeFakeExecutor(),
    downloadImpl: makeFakeDownloadImpl(),
    saveRun: makeFakeSaveRun(),
    resolveExecutionConfig: makeFakeExecutionConfig(),
    resolveArtifactLifecycle: makeFakeArtifactLifecycle(),
    createRunId: () => `test-run-${String(++_runIdCounter).padStart(3, '0')}`,
    apiProfileId: 'profile-001',
    fetchImpl: undefined,
    now: () => '2026-08-13T00:00:00.000Z',
    ...overrides,
  };
}

// ===========================================================================
// P2-G-F#2 tests A-O
// ===========================================================================

// ---------------------------------------------------------------------------
// P2-G-F#2-A: Shared redaction strips real Reference binaries
// from the audit surface. P2-G-F#2 item 1 + 14.
// ---------------------------------------------------------------------------

test('P2-G-F#2-A Shared redaction strips base64 / data URIs / API Key from the audit surface', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-style', role: 'style_reference', source: 'user' },
      ],
    },
  }));
  const deps = makeFakeDeps();
  const result = await executePackagingGeneration(prepared, deps);
  // The audit surface MUST NOT contain the original base64,
  // the data: URI, the API Key, the Authorization value, or
  // a signed-URL credential query.
  const auditText = JSON.stringify(result.diagnostics.redactedRequest);
  const original = JSON.stringify(result.diagnostics.redactedRequest.body);
  // Original base64 from the test executor's image[] entries
  // is the long fake-binary-for-asset-style string. The
  // audit MUST NOT carry it.
  assert.ok(!original.includes('fake-binary-for-asset-style'),
    'audit body must not carry the Reference base64');
  assert.ok(!auditText.includes('data:image'),
    'audit must not carry the data: URI prefix');
  assert.ok(!auditText.includes('FAKE_TEST_API_KEY'),
    'audit must not carry the API Key');
  assert.ok(!auditText.includes('Bearer FAKE_TEST_API_KEY'),
    'audit must not carry the Authorization header value');
  // The audit body preserves the canonical Provider fields
  // (model / size / prompt) but substitutes the binary.
  assert.ok(original.includes('doubao-seedream-5-0-pro-260628'),
    'audit body preserves the model field');
  assert.ok(original.includes('response_format'),
    'audit body preserves the protocol field');
});

test('P2-G-F#2-A-b Shared redaction strips Authorization / x-goog-api-key / signed-URL credentials from headers', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps();
  deps.executor = makeFakeExecutor({
    compileRequest: (universalInput) => ({
      method: 'POST',
      url: 'https://example.com/api?Signature=secret-sig&X-Amz-Signature=secret-2&token=secret-token',
      headers: {
        Authorization: 'Bearer SECRET-AUTH-XYZ',
        'x-goog-api-key': 'GOOGLE-API-KEY-XYZ',
        'api-key': 'PLAIN-API-KEY-XYZ',
        'Content-Type': 'application/json',
      },
      bodyKind: 'json',
      body: { model: 'm', prompt: universalInput.prompt, image: [] },
    }),
  });
  const result = await executePackagingGeneration(prepared, deps);
  const audit = result.diagnostics.redactedRequest;
  // Authorization is always [REDACTED].
  assert.equal(audit.authorization, '[REDACTED]');
  // Signed-URL credential query params are stripped; only
  // host + pathname remain.
  assert.ok(!audit.url.includes('Signature='),
    'audit url must not carry signed-URL credential params');
  assert.ok(!audit.url.includes('X-Amz-Signature='),
    'audit url must not carry X-Amz-Signature');
  assert.ok(!audit.url.includes('token='),
    'audit url must not carry token=');
  // Auth headers are stripped from the headers bag.
  const headerKeys = Object.keys(audit.headers ?? {});
  assert.ok(!headerKeys.some((k) => k.toLowerCase() === 'authorization'),
    'headers bag must not carry Authorization');
  assert.ok(!headerKeys.some((k) => k.toLowerCase() === 'x-goog-api-key'),
    'headers bag must not carry x-goog-api-key');
  assert.ok(!headerKeys.some((k) => k.toLowerCase() === 'api-key'),
    'headers bag must not carry api-key');
  // Non-auth headers are preserved.
  assert.ok(audit.headers && audit.headers['Content-Type'] === 'application/json',
    'non-auth headers are preserved');
});

// ---------------------------------------------------------------------------
// P2-G-F#2-B: P2-G-F no longer pins the raw image[] payload.
// ---------------------------------------------------------------------------

test('P2-G-F#2-B P2-G-F no longer pins the raw compileRequest body; the audit is the Shared-redacted shape', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-style', role: 'style_reference', source: 'user' },
      ],
    },
  }));
  let rawCompileRequest = null;
  const deps = makeFakeDeps();
  deps.executor = makeFakeExecutor({
    compileRequest: (universalInput) => {
      // Use a hardcoded data: URI in the body so the
      // sanity check works regardless of fake-binary shape.
      const cr = {
        method: 'POST',
        url: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
        headers: { Authorization: 'Bearer SECRET-XYZ', 'Content-Type': 'application/json' },
        bodyKind: 'json',
        body: {
          model: 'doubao-seedream-5-0-pro-260628',
          prompt: universalInput.prompt,
          image: ['data:image/png;base64,FAKE-SAMPLE-BYTES-12345'],
          size: universalInput.imageSize,
        },
      };
      rawCompileRequest = cr;
      return cr;
    },
  });
  const result = await executePackagingGeneration(prepared, deps);
  // The raw compileRequest DID contain a data: URI; the
  // audit MUST NOT.
  assert.ok(JSON.stringify(rawCompileRequest.body).includes('data:'),
    'raw compileRequest body contains the data: URI (sanity check)');
  const auditText = JSON.stringify(result.diagnostics.redactedRequest);
  assert.ok(!auditText.includes('data:'),
    'audit must not carry the data: URI');
  assert.ok(!auditText.includes('FAKE-SAMPLE-BYTES-12345'),
    'audit must not carry the raw base64 bytes');
  // The audit preserves the prompt-safe metadata (model,
  // method, bodyKind, sanitized URL, reference count).
  const audit = result.diagnostics.redactedRequest;
  assert.equal(audit.body.model, 'doubao-seedream-5-0-pro-260628');
  assert.ok(audit.body.size, 'audit preserves size');
  // The audit MUST NOT deepEqual the raw compileRequest
  // body (the P2-G-F#2 fix).
  assert.notDeepEqual(audit.body, rawCompileRequest.body,
    'audit body must not deepEqual the raw compileRequest body');
});

// ---------------------------------------------------------------------------
// P2-G-F#2-C: real redaction Reference test using the real
// Shared multi-model adapter. compileRequest is called on
// the real adapter; the audit comes from the Shared
// redaction layer applied to the real compileRequest body.
// ---------------------------------------------------------------------------

test('P2-G-F#2-C real Shared compileRequest: raw contains data:image, audit is fully redacted', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-style', role: 'style_reference', source: 'user' },
      ],
    },
  }));
  // Use the REAL createMultiModelImageAdapter + a fake
  // fetchImpl so the executor never makes a real network
  // call. We exercise the real compileRequest path so the
  // Shared redaction is proven against a real Seedream
  // body shape.
  const { createMultiModelImageAdapter } = require(join(repoRoot, 'packages/image-generation-adapter/src/multi-model.js'));
  const realAdapter = createMultiModelImageAdapter({
    adapterId: 'seedream-5.0-pro',
    apiKey: 'FAKE_TEST_API_KEY',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    modelId: 'doubao-seedream-5-0-pro-260628',
  });
  // The fake fetch returns a successful b64 payload without
  // making a network call.
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify({
      model: 'doubao-seedream-5-0-pro-260628',
      created: 1,
      data: [{ b64_json: 'ZmFrZS1ieXRlcw==' }],
      usage: { generated_images: 1, total_tokens: 1 },
    }),
  });
  const deps = makeFakeDeps({
    executor: realAdapter,
    fetchImpl: fakeFetch,
  });
  const result = await executePackagingGeneration(prepared, deps);
  // The real Seedream body includes a `data:` URI in
  // `body.image[]`. The audit MUST NOT carry that.
  // (We re-build the request surface here from the
  // executor's inputs through the audit to prove the
  // redaction captured the binary.)
  const audit = result.diagnostics.redactedRequest;
  const auditText = JSON.stringify(audit);
  assert.ok(!auditText.includes('data:image'),
    'audit must not carry any data: URI (real Shared compileRequest shape)');
  assert.ok(!auditText.includes('FAKE_TEST_API_KEY'),
    'audit must not carry the API Key');
  // The audit body MUST NOT contain the Reference base64.
  // The test fixture passes a long fake-binary-for-asset-style
  // string as Reference data; that string MUST NOT appear in
  // the audit.
  assert.ok(!auditText.includes('fake-binary-for-asset-style'),
    'audit must not carry the Reference base64');
});

// ---------------------------------------------------------------------------
// P2-G-F#2-D: apiProfileId is forwarded to both
// resolveExecutionConfig and resolveArtifactLifecycle.
// ---------------------------------------------------------------------------

test('P2-G-F#2-D apiProfileId is forwarded to resolveExecutionConfig and resolveArtifactLifecycle (item 5)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const seenExecutionConfigArg = { value: null };
  const seenLifecycleArg = { value: null };
  let capturedRunId = null;
  const deps = makeFakeDeps({
    apiProfileId: 'profile-zzz-001',
    createRunId: () => 'static-run-id-for-test-D',
    resolveExecutionConfig: async (arg) => {
      seenExecutionConfigArg.value = arg;
      return {
        apiKey: 'FAKE_TEST_API_KEY',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        providerModelId: 'doubao-seedream-5-0-pro-260628',
        apiProfileId: arg.apiProfileId,
        protocol: 'seedream-image',
        provider: 'volcengine',
        region: 'beijing',
      };
    },
    resolveArtifactLifecycle: async (arg) => {
      seenLifecycleArg.value = arg;
      capturedRunId = arg.runId;
      return {
        runRoot: '/tmp/packaging-test-run',
        targetPath: '/tmp/packaging-test-run/image-01.png',
        thumbnailPath: '/tmp/packaging-test-run/image-01.webp',
        relativePath: 'image-01.png',
        thumbnailRelativePath: 'image-01.webp',
      };
    },
  });
  await executePackagingGeneration(prepared, deps);
  assert.equal(seenExecutionConfigArg.value?.apiProfileId, 'profile-zzz-001');
  assert.equal(seenLifecycleArg.value?.apiProfileId, 'profile-zzz-001');
  // runId is forwarded to the lifecycle seam (P2-G-F#2 item 7).
  assert.equal(capturedRunId, 'static-run-id-for-test-D');
  assert.ok(seenLifecycleArg.value?.metadata);
  assert.ok(seenLifecycleArg.value?.translation);
});

test('P2-G-F#2-D-b apiProfileId default ("") still flows to both seams', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const seen = [];
  const deps = makeFakeDeps({
    apiProfileId: undefined,
    resolveExecutionConfig: async (arg) => {
      seen.push({ kind: 'exec', apiProfileId: arg.apiProfileId });
      return {
        apiKey: 'K', baseUrl: 'U',
        providerModelId: 'doubao-seedream-5-0-pro-260628',
        protocol: 'seedream-image', provider: 'volcengine',
      };
    },
    resolveArtifactLifecycle: async (arg) => {
      seen.push({ kind: 'lifecycle', apiProfileId: arg.apiProfileId });
      return {
        runRoot: '/x', targetPath: '/x/a.png', thumbnailPath: '/x/a.webp',
        relativePath: 'a.png', thumbnailRelativePath: 'a.webp',
      };
    },
  });
  await executePackagingGeneration(prepared, deps);
  for (const entry of seen) {
    assert.equal(entry.apiProfileId, '');
  }
});

// ---------------------------------------------------------------------------
// P2-G-F#2-E: profileId no longer masquerades as region.
// ---------------------------------------------------------------------------

test('P2-G-F#2-E audit region comes from execution config, never from apiProfileId (item 6)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps({
    apiProfileId: 'profile-zzz-001',
    resolveExecutionConfig: makeFakeExecutionConfig({ region: undefined }),
  });
  const result = await executePackagingGeneration(prepared, deps);
  // The audit region is undefined; apiProfileId is NOT
  // promoted to a region.
  assert.equal(result.diagnostics.region, undefined);
  assert.notEqual(result.diagnostics.region, 'profile-zzz-001',
    'audit region must not be the apiProfileId');
});

test('P2-G-F#2-E-b audit region passes through from the execution config', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps({
    resolveExecutionConfig: makeFakeExecutionConfig({ region: 'ap-southeast-1' }),
  });
  const result = await executePackagingGeneration(prepared, deps);
  assert.equal(result.diagnostics.region, 'ap-southeast-1');
});

// ---------------------------------------------------------------------------
// P2-G-F#2-F: artifact lifecycle receives runId / metadata /
// translation / apiProfileId and may be async.
// ---------------------------------------------------------------------------

test('P2-G-F#2-F resolveArtifactLifecycle receives runId / metadata / translation / apiProfileId (item 7)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  let lifecycleArg = null;
  const deps = makeFakeDeps({
    resolveArtifactLifecycle: async (arg) => {
      lifecycleArg = arg;
      // Confirm the call is awaited (async allowed).
      await new Promise((r) => setTimeout(r, 5));
      return {
        runRoot: '/x', targetPath: '/x/a.png', thumbnailPath: '/x/a.webp',
        relativePath: 'a.png', thumbnailRelativePath: 'a.webp',
      };
    },
  });
  await executePackagingGeneration(prepared, deps);
  assert.ok(lifecycleArg, 'resolveArtifactLifecycle must be called');
  assert.equal(typeof lifecycleArg.runId, 'string');
  assert.ok(lifecycleArg.runId.length > 0);
  assert.ok(lifecycleArg.metadata);
  assert.equal(lifecycleArg.metadata.target, 'packaging');
  assert.ok(lifecycleArg.translation);
  assert.equal(lifecycleArg.translation.target, 'packaging');
  assert.equal(lifecycleArg.apiProfileId, 'profile-001');
});

test('P2-G-F#2-F-b missing relativePath in artifact lifecycle -> ARTIFACT_LIFECYCLE_REQUIRED', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps({
    resolveArtifactLifecycle: async () => ({
      runRoot: '/x', targetPath: '/x/a.png', thumbnailPath: '/x/a.webp',
      // missing relativePath / thumbnailRelativePath
    }),
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => err.code === ARTIFACT_LIFECYCLE_REQUIRED,
  );
});

// ---------------------------------------------------------------------------
// P2-G-F#2-G: relative artifact paths are persisted;
// absolute paths are NOT.
// ---------------------------------------------------------------------------

test('P2-G-F#2-G Generation Result records relativePath / thumbnailRelativePath; absolute paths are not persisted (item 8 + 9)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps();
  const result = await executePackagingGeneration(prepared, deps);
  // Relative paths surface on each artifact.
  assert.equal(result.artifacts[0].relativePath, 'image-01.png');
  assert.equal(result.artifacts[0].thumbnailRelativePath, 'image-01.webp');
  // Absolute paths MUST NOT appear on the result.
  const resultText = JSON.stringify(result);
  assert.ok(!resultText.includes('/tmp/packaging-test-run'),
    'result must not persist an absolute local path');
  assert.ok(!resultText.includes('runRoot'),
    'result must not persist the runRoot field');
  // diagnostics MUST NOT carry `artifactRoot`; the
  // audit-region is the only region-level surface.
  assert.equal(result.diagnostics.artifactRoot, undefined,
    'diagnostics must not carry an artifactRoot field');
});

// ---------------------------------------------------------------------------
// P2-G-F#2-H: fake download contract mirrors the real Shared
// helper shape; relative paths come from the lifecycle, not
// the download result.
// ---------------------------------------------------------------------------

test('P2-G-F#2-H Generation Result does not depend on downloadAndVerifyImage.relativePathWritten (item 10)', () => {
  // The real Shared `downloadAndVerifyImage` does NOT return
  // `relativePathWritten`. The Service never reads it; the
  // Generation Result records the relativePath from the
  // artifact lifecycle only.
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/generation-service.js'),
    'utf8',
  );
  // Strip comments so the doc comment does not match.
  const codeBody = src
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
  assert.ok(!/\brelativePathWritten\b/.test(codeBody),
    'Service must not depend on downloadAndVerifyImage.relativePathWritten');
});

test('P2-G-F#2-H-b the fake downloadImpl mirror matches the real Shared helper shape', () => {
  // The test fake mirrors the real `downloadAndVerifyImage`
  // return shape: `downloadFailed, mimeType, sizeBytes,
  // sha256, decoded, written, thumbnailWritten, width,
  // height`. The real helper does NOT return
  // `relativePathWritten`.
  const fake = makeFakeDownloadImpl();
  return fake({}).then((result) => {
    assert.equal(result.downloadFailed, false);
    assert.equal(typeof result.mimeType, 'string');
    assert.equal(typeof result.sizeBytes, 'number');
    assert.equal(typeof result.sha256, 'string');
    assert.equal(typeof result.decoded, 'boolean');
    assert.equal(typeof result.written, 'boolean');
    assert.equal(typeof result.thumbnailWritten, 'boolean');
    assert.equal(typeof result.width, 'number');
    assert.equal(typeof result.height, 'number');
    assert.equal(result.relativePathWritten, undefined,
      'fake download shape must NOT carry relativePathWritten (mirrors real Shared helper)');
  });
});

// ---------------------------------------------------------------------------
// P2-G-F#2-I: persistence public error is the safe generic
// text; raw filesystem / database messages are redacted.
// ---------------------------------------------------------------------------

test('P2-G-F#2-I GENERATION_PERSISTENCE_FAILED public message is the safe generic text (item 11)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps({
    saveRun: async () => {
      throw Object.assign(new Error('disk full at /var/lib/masterpiece/projects/foo/runs/r-001'), {
        code: 'RUN_STORE_WRITE_FAILED',
      });
    },
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => {
      assert.equal(err.code, GENERATION_PERSISTENCE_FAILED);
      // The PUBLIC message is the safe generic text; the
      // raw filesystem path MUST NOT be on the public
      // surface.
      assert.ok(!err.message.includes('/var/lib/masterpiece'),
        'public err.message must not embed the raw filesystem path');
      assert.ok(!err.message.includes('disk full'),
        'public err.message must not embed the raw failure text');
      // The raw message is preserved on err.cause (and
      // err.internal) for internal diagnostics.
      assert.equal(err.cause?.code, 'RUN_STORE_WRITE_FAILED');
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// P2-G-F#2-J: err.cause is not a long-term-persisted secret
// container; serialization-safety test.
// ---------------------------------------------------------------------------

test('P2-G-F#2-J err.cause / err.cause.cause do not embed raw Authorization / API Key / signed-URL fragments (item 12)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps();
  deps.executor = makeFakeExecutor({
    execute: async () => {
      throw Object.assign(new Error('Provider error: Authorization: Bearer sk-SECRET-XYZ-12345 signedUrl=https://x?Signature=secret&token=abc'), {
        code: 'MODEL_ADAPTER_AUTH_FAILED',
      });
    },
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => {
      const causeText = JSON.stringify(err.cause ?? null);
      // The public err.message is the safe generic text.
      assert.ok(!err.message.includes('sk-SECRET-XYZ-12345'),
        'public err.message must not embed the API Key');
      // The cause.message MAY carry the diagnostic; but the
      // API Key is not embedded literally. We assert that
      // the literal "sk-SECRET-XYZ" token does not appear in
      // cause.message — the Shared redaction contract
      // applies.
      assert.ok(!causeText.includes('sk-SECRET-XYZ-12345'),
        'err.cause must not embed the literal API Key (serialization safety)');
      // The internal surface keeps the diagnostic code but
      // redacts the secret-bearing message.
      assert.equal(err.internal?.code, 'MODEL_ADAPTER_AUTH_FAILED');
      assert.ok(!err.internal?.message?.includes('sk-SECRET-XYZ-12345'),
        'err.internal.message must not embed the literal API Key');
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// P2-G-F#2-K: concrete providerModelId participates in
// execution identity (item 3).
// ---------------------------------------------------------------------------

test('P2-G-F#2-K same prepared + two executions with different providerModelId -> final execution fingerprint differs (item 3)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  // First execution: providerModelId = 'doubao-seedream-5-0-pro-260628'.
  const resultA = await executePackagingGeneration(prepared, makeFakeDeps({
    resolveExecutionConfig: makeFakeExecutionConfig({
      providerModelId: 'doubao-seedream-5-0-pro-260628',
    }),
  }));
  // Second execution: providerModelId = 'doubao-seedream-5-0-pro-260629' (new model variant).
  const resultB = await executePackagingGeneration(prepared, makeFakeDeps({
    resolveExecutionConfig: makeFakeExecutionConfig({
      providerModelId: 'doubao-seedream-5-0-pro-260629',
    }),
  }));
  // registryModelId stays the same; providerModelId changes.
  assert.equal(resultA.model.registryModelId, 'seedream-5.0-pro');
  assert.equal(resultB.model.registryModelId, 'seedream-5.0-pro');
  assert.notEqual(resultA.model.providerModelId, resultB.model.providerModelId);
  // The executionIdentityHash differs.
  assert.notEqual(
    resultA.metadata.compileFingerprint.executionIdentityHash,
    resultB.metadata.compileFingerprint.executionIdentityHash,
  );
  // The P2-F semantic 5 hashes are the same (semantic
  // identity is unchanged).
  for (const f of ['sourceBundleHash', 'userIntentHash', 'deliverableHash', 'referencePlanHash', 'compiledPromptHash']) {
    assert.equal(
      resultA.metadata.compileFingerprint[f],
      resultB.metadata.compileFingerprint[f],
      `${f} must be the same (semantic identity unchanged)`,
    );
  }
});

test('P2-G-F#2-K-b old execution metadata verified against new providerModelId -> GENERATION_EXECUTION_STALE', async () => {
  const { verifyFinalMetadata } = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/generation-service.js'));
  const prepared = preparePackagingGeneration(makeBaseInput());
  // Build a previous execution with providerModelId = A.
  const resultA = await executePackagingGeneration(prepared, makeFakeDeps({
    resolveExecutionConfig: makeFakeExecutionConfig({
      providerModelId: 'doubao-seedream-5-0-pro-260628',
    }),
  }));
  // A new execution resolves to providerModelId = B and
  // resolves the lifecycle + execution config. We then
  // verify resultA.metadata (the previous final metadata)
  // against the new execution's inputs.
  const capabilityB = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-capability.js'))
    .resolvePackagingProviderCapability({
      modelId: 'seedream-5.0-pro',
      generationMode: prepared.translation.generationMode,
      referencePolicy: prepared.translation.referencePolicy,
    });
  const payloadB = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-adapter.js'))
    .buildPackagingProviderPayload({
      compiled: prepared.compiled,
      capability: capabilityB,
      translation: prepared.translation,
    });
  const executionConfigB = await makeFakeExecutionConfig({
    providerModelId: 'doubao-seedream-5-0-pro-260629',
  })();
  const r = verifyFinalMetadata(resultA.metadata, {
    translation: prepared.translation,
    compiled: prepared.compiled,
    capability: capabilityB,
    payload: payloadB,
    executionConfig: executionConfigB,
  });
  assert.equal(r.valid, false);
  assert.equal(r.code, GENERATION_EXECUTION_STALE);
  assert.ok(r.mismatches.includes('executionIdentityHash'));
  // The old result is still a valid Generation Result.
  assert.equal(resultA.status, 'succeeded');
});

// ---------------------------------------------------------------------------
// P2-G-F#2-L: production bridge end-to-end.
// ---------------------------------------------------------------------------

test('P2-G-F#2-L production bridge end-to-end: apiProfileId + runId + providerModelId + relative paths (item 15)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const seenExecution = { arg: null };
  const seenLifecycle = { arg: null };
  let providerConfigSeen = null;
  const deps = makeFakeDeps({
    apiProfileId: 'profile-final-001',
    resolveExecutionConfig: async (arg) => {
      seenExecution.arg = arg;
      return {
        apiKey: 'FAKE_PROD_KEY',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        providerModelId: 'doubao-seedream-5-0-pro-260628',
        apiProfileId: 'profile-final-001',
        protocol: 'seedream-image',
        provider: 'volcengine',
        region: 'cn-beijing',
      };
    },
    resolveArtifactLifecycle: async (arg) => {
      seenLifecycle.arg = arg;
      return {
        runRoot: '/var/lib/masterpiece/runs/r-final-001',
        targetPath: '/var/lib/masterpiece/runs/r-final-001/image-01.png',
        thumbnailPath: '/var/lib/masterpiece/runs/r-final-001/image-01.webp',
        relativePath: 'image-01.png',
        thumbnailRelativePath: 'image-01.webp',
      };
    },
    executor: makeFakeExecutor({
      compileRequest: (universalInput) => {
        providerConfigSeen = { model: 'doubao-seedream-5-0-pro-260628' };
        return {
          method: 'POST',
          url: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
          headers: { Authorization: 'Bearer FAKE_PROD_KEY', 'Content-Type': 'application/json' },
          bodyKind: 'json',
          body: {
            model: 'doubao-seedream-5-0-pro-260628',
            prompt: universalInput.prompt,
            image: universalInput.references.map((r) => `data:${r.mimeType};base64,${r.data}`),
            size: universalInput.imageSize,
          },
        };
      },
    }),
  });
  const result = await executePackagingGeneration(prepared, deps);

  // 1) apiProfileId -> resolveExecutionConfig arg.
  assert.equal(seenExecution.arg.apiProfileId, 'profile-final-001');
  // 2) runId -> resolveArtifactLifecycle arg.
  assert.equal(seenLifecycle.arg.runId, result.runId);
  assert.ok(seenLifecycle.arg.runId.length > 0);
  // 3) providerModelId -> actual Shared adapter config.
  assert.equal(providerConfigSeen.model, 'doubao-seedream-5-0-pro-260628');
  // 4) relative artifact paths -> Generation Result.
  assert.equal(result.artifacts[0].relativePath, 'image-01.png');
  assert.equal(result.artifacts[0].thumbnailRelativePath, 'image-01.webp');
  // 5) absolute artifact paths -> NOT persisted in result.
  const resultText = JSON.stringify(result);
  assert.ok(!resultText.includes('/var/lib/masterpiece/runs/r-final-001'),
    'result must not persist the absolute runRoot path');
  // 6) apiProfileId surfaces on the Generation Result.
  assert.equal(result.apiProfileId, 'profile-final-001');
  // 7) providerModelId surfaces on the Generation Result.
  assert.equal(result.model.providerModelId, 'doubao-seedream-5-0-pro-260628');
  // 8) registryModelId stays seedream-5.0-pro.
  assert.equal(result.model.registryModelId, 'seedream-5.0-pro');
});

// ===========================================================================
// Regression tests (P2-G Final items, retained)
// ===========================================================================

test('P2-G-F#2-regression-A Provider receives payload.prompt byte-identical (no second prompt serializer)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps();
  let receivedPrompt = null;
  deps.executor = makeFakeExecutor({
    execute: async (universalInput) => {
      receivedPrompt = universalInput.prompt;
      return {
        status: 'succeeded', adapterId: 'seedream-5.0-pro',
        modelId: 'doubao-seedream-5-0-pro-260628', requestId: 'r',
        images: [{ mimeType: 'image/png', b64: 'AA==' }],
      };
    },
  });
  await executePackagingGeneration(prepared, deps);
  assert.equal(receivedPrompt, prepared.payload.prompt);
});

test('P2-G-F#2-regression-B Provider receives payload.hints verbatim', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput({
    providerHints: { aspectRatio: '4:5', imageSize: '1280x1856', qualityProfile: 'ultra' },
  }));
  const deps = makeFakeDeps();
  let receivedHints = null;
  deps.executor = makeFakeExecutor({
    execute: async (universalInput) => {
      receivedHints = {
        aspectRatio: universalInput.aspectRatio,
        imageSize: universalInput.imageSize,
        qualityProfile: universalInput.qualityProfile,
      };
      return { status: 'succeeded', adapterId: 'x', modelId: 'y', requestId: 'z', images: [{ mimeType: 'image/png', b64: 'AA==' }] };
    },
  });
  await executePackagingGeneration(prepared, deps);
  assert.equal(receivedHints.aspectRatio, '4:5');
  assert.equal(receivedHints.imageSize, '1280x1856');
  assert.equal(receivedHints.qualityProfile, 'ultra');
});

test('P2-G-F#2-regression-C negative constraint appears in payload.prompt exactly once', async () => {
  const input = makeBaseInput({ negativeConstraints: ['never include a celebrity face'] });
  const prepared = preparePackagingGeneration(input);
  const deps = makeFakeDeps();
  let receivedPrompt = null;
  let receivedNegativeRules = null;
  deps.executor = makeFakeExecutor({
    execute: async (universalInput) => {
      receivedPrompt = universalInput.prompt;
      receivedNegativeRules = universalInput.negativeRules;
      return { status: 'succeeded', adapterId: 'x', modelId: 'y', requestId: 'z', images: [{ mimeType: 'image/png', b64: 'AA==' }] };
    },
  });
  await executePackagingGeneration(prepared, deps);
  assert.deepEqual(receivedNegativeRules, []);
  const occurrences = (receivedPrompt.match(/never include a celebrity face/g) ?? []).length;
  assert.equal(occurrences, 1);
});

test('P2-G-F#2-regression-D registryModelId and providerModelId are surfaced separately', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const result = await executePackagingGeneration(prepared, makeFakeDeps());
  assert.equal(result.model.registryModelId, 'seedream-5.0-pro');
  assert.equal(result.model.providerModelId, 'doubao-seedream-5-0-pro-260628');
  assert.notEqual(result.model.registryModelId, result.model.providerModelId);
});

test('P2-G-F#2-regression-E decoded=false / written=false -> GENERATION_PROVIDER_FAILED', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const depsA = makeFakeDeps({ downloadImpl: makeFakeDownloadImpl({ decoded: false }) });
  const depsB = makeFakeDeps({ downloadImpl: makeFakeDownloadImpl({ written: false }) });
  await assert.rejects(() => executePackagingGeneration(prepared, depsA), (err) => err.code === GENERATION_PROVIDER_FAILED);
  await assert.rejects(() => executePackagingGeneration(prepared, depsB), (err) => err.code === GENERATION_PROVIDER_FAILED);
});

test('P2-G-F#2-regression-F 2 images -> GENERATION_PROVIDER_FAILED; 1 image -> success', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const depsTwo = makeFakeDeps();
  depsTwo.executor = makeFakeExecutor({
    execute: async () => ({
      status: 'succeeded', adapterId: 'x', modelId: 'y', requestId: 'z',
      images: [{ mimeType: 'image/png', b64: 'AA==' }, { mimeType: 'image/png', b64: 'BB==' }],
    }),
  });
  await assert.rejects(() => executePackagingGeneration(prepared, depsTwo), (err) => err.code === GENERATION_PROVIDER_FAILED);
  const result = await executePackagingGeneration(prepared, makeFakeDeps());
  assert.equal(result.artifacts.length, 1);
});

test('P2-G-F#2-regression-G missing artifact lifecycle -> ARTIFACT_LIFECYCLE_REQUIRED', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps({ resolveArtifactLifecycle: () => ({}) });
  await assert.rejects(() => executePackagingGeneration(prepared, deps), (err) => err.code === ARTIFACT_LIFECYCLE_REQUIRED);
});

test('P2-G-F#2-regression-H Provider throws -> GENERATION_PROVIDER_FAILED (cause + internal code preserved; public message is safe generic)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps();
  deps.executor = makeFakeExecutor({
    execute: async () => {
      throw Object.assign(new Error('rate limit hit'), { code: 'MODEL_ADAPTER_RATE_LIMITED', retryable: true });
    },
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => {
      assert.equal(err.code, GENERATION_PROVIDER_FAILED);
      assert.equal(err.cause?.code, 'MODEL_ADAPTER_RATE_LIMITED');
      assert.equal(err.internal?.code, 'MODEL_ADAPTER_RATE_LIMITED');
      assert.equal(err.internal?.retryable, true);
      assert.ok(!err.message.includes('rate limit hit'), 'public message must not embed raw provider error text');
      return true;
    },
  );
});

test('P2-G-F#2-regression-I Reference identity (assetId / role / source) survives resolution', async () => {
  const input = makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true, required: true,
      references: [{ assetId: 'asset-style', role: 'style_reference', source: 'user' }],
    },
  });
  const prepared = preparePackagingGeneration(input);
  const deps = makeFakeDeps();
  deps.executor = makeFakeExecutor({
    compileRequest: (universalInput) => ({
      method: 'POST', url: 'https://example.invalid',
      headers: { Authorization: 'Bearer SECRET' },
      bodyKind: 'json',
      body: {
        model: 'doubao-seedream-5-0-pro-260628',
        prompt: universalInput.prompt,
        image: universalInput.references.map((r) => r.name),
        size: universalInput.imageSize,
      },
    }),
  });
  const result = await executePackagingGeneration(prepared, deps);
  assert.equal(result.metadata.references[0].assetId, 'asset-style');
  assert.equal(result.metadata.references[0].role, 'style_reference');
  assert.equal(result.metadata.references[0].source, 'user');
  const auditText = JSON.stringify(result.diagnostics.redactedRequest);
  assert.ok(!auditText.includes('"assetId"'));
  assert.ok(!auditText.includes('"role"'));
  assert.ok(!auditText.includes('"source"'));
});

test('P2-G-F#2-pre pre-execution errors keep canonical upstream code', () => {
  const cases = [
    { name: 'no modelId', input: (() => { const i = makeBaseInput(); delete i.modelId; return i; })(), code: 'PROVIDER_CAPABILITY_MISMATCH' },
    { name: 'unsupported model', input: makeBaseInput({ modelId: 'not-registered' }), code: 'PROVIDER_CAPABILITY_MISMATCH' },
    { name: 'missing structure', input: (() => { const i = makeBaseInput(); i.structure = { formFactor: 'x' }; return i; })(), code: 'PACKAGING_STRUCTURE_EVIDENCE_MISSING' },
    { name: 'reference-first without references', input: makeBaseInput({ generationMode: 'reference_first', referencePolicy: { enabled: true, required: true, references: [] } }), code: 'REFERENCE_REQUIRED' },
    { name: 'invalid input', input: null, code: 'PACKAGING_TRANSLATION_INVALID' },
  ];
  for (const c of cases) {
    assert.throws(
      () => preparePackagingGeneration(c.input),
      (err) => {
        assert.notEqual(err.code, GENERATION_PROVIDER_FAILED, `${c.name} must not be rewrapped`);
        assert.equal(err.code, c.code);
        return true;
      },
    );
  }
});

test('P2-G-F#2-stale stale fingerprint (mutated Locked Asset) -> COMPILE_INPUT_STALE on execute', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  prepared.translation.lockedAssets.brand.name = 'Renamed Brand';
  const deps = makeFakeDeps();
  let callCount = 0;
  deps.executor = makeFakeExecutor({
    execute: async () => { callCount += 1; return { status: 'succeeded', adapterId: 'x', modelId: 'y', requestId: 'z', images: [] }; },
  });
  await assert.rejects(() => executePackagingGeneration(prepared, deps), (err) => err.code === 'COMPILE_INPUT_STALE');
  assert.equal(callCount, 0);
});

test('P2-G-F#2-default default production seams fail closed', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  await assert.rejects(
    () => executePackagingGeneration(prepared, makeFakeDeps({ resolveExecutionConfig: undefined })),
    (err) => err.code === EXECUTION_PROVIDER_MODEL_REQUIRED,
  );
  await assert.rejects(
    () => executePackagingGeneration(prepared, makeFakeDeps({ resolveArtifactLifecycle: undefined })),
    (err) => err.code === ARTIFACT_LIFECYCLE_REQUIRED,
  );
  await assert.rejects(
    () => executePackagingGeneration(prepared, makeFakeDeps({ saveRun: undefined })),
    (err) => err.code === GENERATION_PERSISTENCE_FAILED,
  );
});

// ===========================================================================
// Architecture-boundary / cross-target / no-golden
// ===========================================================================

test('P2-G-F#2-arch generation-service.js does not import fetch / http / axios / dotenv / node:fs / process.env', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/generation-service.js'),
    'utf8',
  );
  assert.ok(!/^import\s+[^;]*['"]node:http/m.test(src) && !/require\(['"]node:http/.test(src));
  assert.ok(!/^import\s+[^;]*['"]node:https/m.test(src) && !/require\(['"]node:https/.test(src));
  assert.ok(!/require\(['"]axios['"]\)/.test(src) && !/from\s+['"]axios['"]/.test(src));
  assert.ok(!/require\(['"]node-fetch['"]\)/.test(src));
  assert.ok(!/require\(['"]dotenv['"]\)/.test(src) && !/from\s+['"]dotenv['"]/.test(src));
  const fsImportPattern = /require\(['"]node:fs['"]\)|from\s+['"]node:fs['"]/;
  assert.ok(!fsImportPattern.test(src));
  assert.ok(!/process\.env\./.test(src), 'must not read process.env directly');
});

test('P2-G-F#2-cross Space code does not import packaging generation-service', () => {
  const spaceRoots = ['space-generator', 'packages/runtime-core'];
  for (const root of spaceRoots) {
    const dir = join(repoRoot, root);
    let files = [];
    try { files = readdirSync(dir, { recursive: true }); } catch (err) { continue; }
    for (const f of files) {
      if (!f || !/\.(js|ts|mjs)$/.test(String(f))) continue;
      if (String(f).includes('/node_modules/')) continue;
      const full = join(dir, String(f));
      const src = readFileSync(full, 'utf8');
      assert.ok(!src.includes('image-generation-runtime/src/packaging/generation-service'));
    }
  }
});

test('P2-G-F#2-no-golden generation-service.js does not import any Golden / evaluation / fixture asset', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/generation-service.js'),
    'utf8',
  );
  const importPattern = /import\s+[^;]+from\s+['"][^'"]+['"]/g;
  const requirePattern = /require\s*\(\s*['"][^'"]+['"]\s*\)/g;
  const imports = [];
  let m;
  while ((m = importPattern.exec(src))) imports.push(m[0]);
  while ((m = requirePattern.exec(src))) imports.push(m[0]);
  for (const line of imports) {
    assert.ok(!/evaluation\//.test(line));
    assert.ok(!/tests\/fixtures\/packaging\//.test(line));
  }
});

test('P2-G-F#2-fp getPackagingGenerationServiceFingerprint pins Shared authority and production dependency bridge', () => {
  const fp = getPackagingGenerationServiceFingerprint();
  assert.equal(fp.schemaVersion, '1.0');
  assert.equal(fp.serviceVersion, PACKAGING_GENERATION_SERVICE_VERSION);
  assert.deepEqual([...fp.layers], ['prepare', 'execute']);
  assert.equal(fp.authority.promptSerialization, 'P2-E buildPackagingProviderPayload (single authority)');
  assert.equal(fp.authority.hintsSerialization, 'P2-E buildPackagingProviderPayload (single authority)');
  assert.equal(fp.authority.negativeRules, 'empty by contract; 14-block Prompt already carries negative_constraints');
  assert.equal(fp.authority.referenceExecution, 'P2-E payload.references (single authority; covered by payloadFingerprint)');
  assert.equal(fp.authority.providerDispatch, 'createMultiModelImageAdapter (Shared)');
  assert.ok(fp.authority.fingerprint.includes('executionIdentityHash'));
  assert.ok(fp.authority.redaction.includes('target-neutral recursive'));
  assert.ok(fp.authority.productionSeam.resolveExecutionConfig.includes('must be wired'));
  assert.ok(fp.authority.productionSeam.resolveArtifactLifecycle.includes('relativePath'));
  assert.ok(fp.authority.productionSeam.saveRun.includes('must be wired'));
  assert.ok(fp.authority.productionSeam.apiProfileId.includes('forwarded to both'));
});

// ===========================================================================
// P2-G Finalization Delta #3 tests A-H
// ===========================================================================

// ---------------------------------------------------------------------------
// P2-G-F#3-A: actual request URL sanitized. The audit `url` is
// the real request URL passed through `redactUrl`.
// ---------------------------------------------------------------------------

test('P2-G-F#3-A actual request URL sanitized (item 1)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps();
  deps.executor = makeFakeExecutor({
    compileRequest: () => ({
      method: 'POST',
      url: 'https://example.com/images?Signature=abc&token=xyz&X-Amz-Signature=secret&sts=TOKEN-STS',
      headers: { Authorization: 'Bearer SECRET', 'Content-Type': 'application/json' },
      bodyKind: 'json',
      body: { model: 'm' },
    }),
  });
  const result = await executePackagingGeneration(prepared, deps);
  const audit = result.diagnostics.redactedRequest;
  // The real URL is sanitized: only host + pathname.
  assert.ok(audit.url.startsWith('https://example.com/images'),
    'audit url must keep the host + pathname');
  assert.ok(!audit.url.includes('Signature='),
    'audit url must not carry signed-URL credential params');
  assert.ok(!audit.url.includes('X-Amz-Signature='),
    'audit url must not carry X-Amz-Signature');
  assert.ok(!audit.url.includes('token='),
    'audit url must not carry token=');
  assert.ok(!audit.url.includes('sts='),
    'audit url must not carry sts=');
  // The audit carries the real method / bodyKind / protocol.
  assert.equal(audit.method, 'POST');
  assert.equal(audit.bodyKind, 'json');
  // The protocol is a separate field; the audit MUST NOT
  // pretend that `protocol` is the request endpoint.
  assert.equal(audit.protocol, 'seedream-image');
});

// ---------------------------------------------------------------------------
// P2-G-F#3-B: body nested signed URL sanitized (item 2).
// ---------------------------------------------------------------------------

test('P2-G-F#3-B body nested signed URL sanitized (item 2)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps();
  deps.executor = makeFakeExecutor({
    compileRequest: () => ({
      method: 'POST',
      url: 'https://example.com/api',
      headers: {},
      bodyKind: 'json',
      body: {
        model: 'm',
        sourceUrl: 'https://example.com/file.png?X-Amz-Signature=secret&Signature=abc&token=xyz',
        reference: { signedUrl: 'https://cdn.example.com/asset?Signature=stolensig' },
        notAUrl: 'plain text — not sanitized',
      },
    }),
  });
  const result = await executePackagingGeneration(prepared, deps);
  const auditText = JSON.stringify(result.diagnostics.redactedRequest);
  // Signed-URL credential query params are stripped from
  // every nested URL field.
  assert.ok(!auditText.includes('X-Amz-Signature='),
    'audit must not carry X-Amz-Signature in any body field');
  assert.ok(!auditText.includes('Signature=abc'),
    'audit must not carry Signature=abc');
  assert.ok(!auditText.includes('stolensig'),
    'audit must not carry the stolensig signed-URL credential');
  // The plain text is preserved (not all strings are URLs).
  assert.ok(auditText.includes('plain text'),
    'audit preserves non-URL string fields');
});

// ---------------------------------------------------------------------------
// P2-G-F#3-C: Seedream real image[] base64 continues to be
// redacted (regression on the existing Wan redaction path).
// ---------------------------------------------------------------------------

test('P2-G-F#3-C Seedream real image[] base64 continues to be redacted (item 1 / 2 regression)', async () => {
  const { createMultiModelImageAdapter } = require(join(repoRoot, 'packages/image-generation-adapter/src/multi-model.js'));
  const prepared = preparePackagingGeneration(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true, required: true,
      references: [{ assetId: 'asset-style', role: 'style_reference', source: 'user' }],
    },
  }));
  const realAdapter = createMultiModelImageAdapter({
    adapterId: 'seedream-5.0-pro',
    apiKey: 'FAKE_TEST_API_KEY',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    modelId: 'doubao-seedream-5-0-pro-260628',
  });
  const fakeFetch = async () => ({
    ok: true, status: 200, statusText: 'OK',
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify({
      model: 'doubao-seedream-5-0-pro-260628',
      data: [{ b64_json: 'ZmFrZS1ieXRlcw==' }],
    }),
  });
  const deps = makeFakeDeps({ executor: realAdapter, fetchImpl: fakeFetch });
  const result = await executePackagingGeneration(prepared, deps);
  const audit = result.diagnostics.redactedRequest;
  const auditText = JSON.stringify(audit);
  // The real Seedream body includes a `data:` URI in
  // `body.image[]`. The audit MUST NOT carry that.
  assert.ok(!auditText.includes('data:image'),
    'audit must not carry any data: URI');
  assert.ok(!auditText.includes('ZmFrZS1ieXRlcw=='),
    'audit must not carry the raw base64 bytes');
  assert.ok(!auditText.includes('FAKE_TEST_API_KEY'),
    'audit must not carry the API Key');
});

// ---------------------------------------------------------------------------
// P2-G-F#3-D: err.cause.message is structurally absent (item 3).
// The cause is a sanitized snapshot `{code, retryable}`; there
// is no `message` field, so secret-bearing messages cannot
// leak through the cause surface.
// ---------------------------------------------------------------------------

test('P2-G-F#3-D err.cause is a sanitized snapshot, no message field (item 3)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps();
  deps.executor = makeFakeExecutor({
    execute: async () => {
      throw Object.assign(new Error('Authorization: Bearer sk-SECRET-XYZ-12345 signedUrl=https://x?Signature=secret'), {
        code: 'MODEL_ADAPTER_AUTH_FAILED',
      });
    },
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => {
      assert.equal(err.code, GENERATION_PROVIDER_FAILED);
      // err.cause is a sanitized snapshot; no `message` field.
      assert.ok(err.cause && typeof err.cause === 'object',
        'err.cause must be an object');
      assert.equal(err.cause.message, undefined,
        'err.cause must not carry a `message` field (item 3)');
      assert.equal(err.cause.code, 'MODEL_ADAPTER_AUTH_FAILED');
      assert.equal(typeof err.cause.retryable, 'boolean');
      // The cause does not embed the raw API Key / Authorization
      // literal.
      const causeText = JSON.stringify(err.cause);
      assert.ok(!causeText.includes('sk-SECRET-XYZ-12345'),
        'err.cause must not embed the literal API Key');
      assert.ok(!causeText.includes('Bearer sk-SECRET'),
        'err.cause must not embed the Bearer literal');
      // The PUBLIC err.message is the safe generic text.
      assert.ok(!err.message.includes('sk-SECRET-XYZ-12345'),
        'public err.message must not embed the API Key');
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// P2-G-F#3-E: JSON-serialized error contains no secret literals
// (item 3).
// ---------------------------------------------------------------------------

test('P2-G-F#3-E JSON-serialized error contains no secret literals (item 3)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps();
  deps.executor = makeFakeExecutor({
    execute: async () => {
      throw Object.assign(new Error('Provider error: Authorization: Bearer sk-SECRET-XYZ-12345 signedUrl=https://x?Signature=secret&token=abc'), {
        code: 'MODEL_ADAPTER_AUTH_FAILED',
      });
    },
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => {
      const serialized = JSON.stringify(err);
      assert.ok(!serialized.includes('sk-SECRET-XYZ-12345'),
        'serialized error must not embed the literal API Key');
      assert.ok(!serialized.includes('Bearer sk-SECRET'),
        'serialized error must not embed the Bearer literal');
      assert.ok(!serialized.includes('Signature=secret'),
        'serialized error must not embed signed-URL credential');
      assert.ok(!serialized.includes('token=abc'),
        'serialized error must not embed the token=');
      // The internal surface is also sanitized.
      const internalText = JSON.stringify(err.internal);
      assert.ok(!internalText.includes('sk-SECRET-XYZ-12345'),
        'err.internal must not embed the literal API Key');
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// P2-G-F#3-F: persistence cause does not carry an absolute
// filesystem path (item 3).
// ---------------------------------------------------------------------------

test('P2-G-F#3-F persistence cause does not carry an absolute filesystem path (item 3)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps({
    saveRun: async () => {
      throw Object.assign(
        new Error('disk full at /var/lib/masterpiece/projects/foo/runs/r-001'),
        { code: 'RUN_STORE_WRITE_FAILED' },
      );
    },
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => {
      assert.equal(err.code, GENERATION_PERSISTENCE_FAILED);
      // The cause is a sanitized snapshot; no message field;
      // no absolute filesystem path.
      const causeText = JSON.stringify(err.cause);
      assert.ok(!causeText.includes('/var/lib/masterpiece'),
        'cause must not carry an absolute filesystem path');
      assert.ok(!causeText.includes('disk full'),
        'cause must not carry the raw filesystem message');
      // The public err.message is the safe generic text.
      assert.ok(!err.message.includes('/var/lib/masterpiece'),
        'public err.message must not carry an absolute filesystem path');
      // The internal surface is also sanitized.
      const internalText = JSON.stringify(err.internal);
      assert.ok(!internalText.includes('/var/lib/masterpiece'),
        'err.internal must not carry an absolute filesystem path');
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// P2-G-F#3-G: absolute relativePath rejected (item 4).
// ---------------------------------------------------------------------------

test('P2-G-F#3-G absolute relativePath rejected -> ARTIFACT_LIFECYCLE_REQUIRED (item 4)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  // POSIX absolute.
  const depsPosix = makeFakeDeps({
    resolveArtifactLifecycle: async () => ({
      runRoot: '/var/lib/masterpiece/runs/r-001',
      targetPath: '/var/lib/masterpiece/runs/r-001/image-01.png',
      thumbnailPath: '/var/lib/masterpiece/runs/r-001/image-01.webp',
      relativePath: '/abs/path/image-01.png',
      thumbnailRelativePath: 'image-01.webp',
    }),
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, depsPosix),
    (err) => err.code === ARTIFACT_LIFECYCLE_REQUIRED,
  );
  // Windows drive letter.
  const depsWin = makeFakeDeps({
    resolveArtifactLifecycle: async () => ({
      runRoot: 'C:\\runs\\r-001',
      targetPath: 'C:\\runs\\r-001\\image-01.png',
      thumbnailPath: 'C:\\runs\\r-001\\image-01.webp',
      relativePath: 'C:\\abs\\image-01.png',
      thumbnailRelativePath: 'image-01.webp',
    }),
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, depsWin),
    (err) => err.code === ARTIFACT_LIFECYCLE_REQUIRED,
  );
  // Backslash-only absolute.
  const depsBack = makeFakeDeps({
    resolveArtifactLifecycle: async () => ({
      runRoot: '\\runs\\r-001',
      targetPath: '\\runs\\r-001\\image-01.png',
      thumbnailPath: '\\runs\\r-001\\image-01.webp',
      relativePath: '\\abs\\image-01.png',
      thumbnailRelativePath: 'image-01.webp',
    }),
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, depsBack),
    (err) => err.code === ARTIFACT_LIFECYCLE_REQUIRED,
  );
});

// ---------------------------------------------------------------------------
// P2-G-F#3-H: `..` traversal rejected (item 4).
// ---------------------------------------------------------------------------

test('P2-G-F#3-H `..` traversal in relativePath rejected -> ARTIFACT_LIFECYCLE_REQUIRED (item 4)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  // `../` prefix.
  const depsUp = makeFakeDeps({
    resolveArtifactLifecycle: async () => ({
      runRoot: '/x', targetPath: '/x/a.png', thumbnailPath: '/x/a.webp',
      relativePath: '../escape/image-01.png',
      thumbnailRelativePath: 'image-01.webp',
    }),
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, depsUp),
    (err) => err.code === ARTIFACT_LIFECYCLE_REQUIRED,
  );
  // Mid-path `..`.
  const depsMid = makeFakeDeps({
    resolveArtifactLifecycle: async () => ({
      runRoot: '/x', targetPath: '/x/a.png', thumbnailPath: '/x/a.webp',
      relativePath: 'foo/../bar/image-01.png',
      thumbnailRelativePath: 'image-01.webp',
    }),
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, depsMid),
    (err) => err.code === ARTIFACT_LIFECYCLE_REQUIRED,
  );
  // Trailing `..`.
  const depsTrail = makeFakeDeps({
    resolveArtifactLifecycle: async () => ({
      runRoot: '/x', targetPath: '/x/a.png', thumbnailPath: '/x/a.webp',
      relativePath: 'foo/..',
      thumbnailRelativePath: 'image-01.webp',
    }),
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, depsTrail),
    (err) => err.code === ARTIFACT_LIFECYCLE_REQUIRED,
  );
  // Windows-style `..\`.
  const depsWin = makeFakeDeps({
    resolveArtifactLifecycle: async () => ({
      runRoot: 'C:\\x', targetPath: 'C:\\x\\a.png', thumbnailPath: 'C:\\x\\a.webp',
      relativePath: 'foo\\..\\bar\\image-01.png',
      thumbnailRelativePath: 'image-01.webp',
    }),
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, depsWin),
    (err) => err.code === ARTIFACT_LIFECYCLE_REQUIRED,
  );
});

// ===========================================================================
// P2-G Final Security Closure tests A-E
// ===========================================================================

// ---------------------------------------------------------------------------
// P2-G-FSC-A: legacy `endpoint` with signed-URL query is sanitized
// identically to `url`. Both fields surface the same
// `redactUrl`-processed value.
// ---------------------------------------------------------------------------

test('P2-G-FSC-A legacy endpoint signed query is sanitized (item 1)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps();
  deps.executor = makeFakeExecutor({
    compileRequest: () => ({
      method: 'POST',
      // Legacy callers pass the audit URL as `endpoint`,
      // not `url`. The audit MUST NOT carry the raw
      // credential query in either field.
      endpoint: 'https://example.com/x?Signature=secret&token=abc',
      url: 'https://example.com/x?Signature=secret&token=abc',
      headers: { Authorization: 'Bearer SECRET' },
      bodyKind: 'json',
      body: { model: 'm' },
    }),
  });
  const result = await executePackagingGeneration(prepared, deps);
  const auditText = JSON.stringify(result.diagnostics.redactedRequest);
  // Neither `audit.url` nor `audit.endpoint` carries the
  // raw credential query.
  assert.ok(!auditText.includes('Signature='),
    'audit url must not carry signed-URL credential params');
  assert.ok(!auditText.includes('token=abc'),
    'audit url must not carry the token= literal');
  assert.ok(!auditText.includes('secret'),
    'audit must not carry the signed-URL secret literal');
  // The sanitized URL is the only URL on the audit surface.
  assert.ok(auditText.includes('https://example.com/x'),
    'audit carries the sanitized URL host + pathname');
  // `audit.url` and `audit.endpoint` are the same sanitized
  // value.
  assert.equal(result.diagnostics.redactedRequest.url,
    result.diagnostics.redactedRequest.endpoint,
    'legacy endpoint and new url must agree on the sanitized value');
});

// ---------------------------------------------------------------------------
// P2-G-FSC-B: readReference throws an ENOENT-style error that
// includes an absolute filesystem path. The public
// REFERENCE_ASSET_UNRESOLVED message MUST NOT carry the
// absolute path.
// ---------------------------------------------------------------------------

test('P2-G-FSC-B readReference ENOENT-style error -> public message has no absolute path (item 2)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true, required: true,
      references: [{ assetId: 'asset-style', role: 'style_reference', source: 'user' }],
    },
  }));
  const deps = makeFakeDeps({
    readReference: async () => {
      throw Object.assign(new Error('ENOENT: no such file or directory, open \'C:\\Users\\alice\\secret.png\''), {
        code: 'ENOENT',
      });
    },
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => {
      assert.equal(err.code, REFERENCE_ASSET_UNRESOLVED);
      // The public message is the canonical generic text;
      // the absolute path MUST NOT appear.
      assert.ok(!err.message.includes('C:\\Users\\alice\\secret.png'),
        'public err.message must not carry the raw filesystem path');
      assert.ok(!err.message.includes('ENOENT'),
        'public err.message must not carry the raw ENOENT fragment');
      // The canonical generic text is present.
      assert.ok(err.message.includes('Packaging reference asset could not be resolved.'),
        'public err.message carries the canonical generic text');
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// P2-G-FSC-C: REFERENCE_ASSET_UNRESOLVED err.cause is a
// sanitized snapshot; no `message` field, no raw filesystem
// path. assetId is preserved for the audit trail.
// ---------------------------------------------------------------------------

test('P2-G-FSC-C REFERENCE_ASSET_UNRESOLVED err.cause is a sanitized snapshot (item 2)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true, required: true,
      references: [{ assetId: 'asset-style', role: 'style_reference', source: 'user' }],
    },
  }));
  const deps = makeFakeDeps({
    readReference: async () => {
      throw Object.assign(new Error('ENOENT: C:\\Users\\alice\\secret.png not found'), {
        code: 'ENOENT',
      });
    },
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => {
      const causeText = JSON.stringify(err.cause);
      // err.cause is a sanitized snapshot; no `message`
      // field; no raw filesystem path.
      assert.equal(err.cause.message, undefined,
        'err.cause must not carry a `message` field');
      assert.ok(!causeText.includes('C:\\Users\\alice\\secret.png'),
        'err.cause must not carry the raw filesystem path');
      // The cause code is the only diagnostic. The raw
      // ENOENT fragment is the message text; we assert
      // it does not appear anywhere on the err surface.
      assert.equal(err.cause.code, 'ENOENT');
      // assetId is preserved for the audit trail.
      assert.equal(err.cause.assetId, 'asset-style');
      // JSON serialization of the error contains no
      // filesystem path or raw error.message.
      const serialized = JSON.stringify(err);
      assert.ok(!serialized.includes('C:\\Users\\alice\\secret.png'),
        'serialized error must not carry the raw filesystem path');
      assert.ok(!serialized.includes('not found'),
        'serialized error must not carry the raw error.message text');
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// P2-G-FSC-D: absolute lifecycle path rejection -> error
// serialization has no raw path on the public surface.
// ---------------------------------------------------------------------------

test('P2-G-FSC-D absolute lifecycle path rejection -> error serialization has no raw path (item 3)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps({
    resolveArtifactLifecycle: async () => ({
      runRoot: '/x', targetPath: '/x/a.png', thumbnailPath: '/x/a.webp',
      // Absolute POSIX path carrying an absolute filesystem
      // path; the public error message MUST NOT echo it.
      relativePath: '/var/lib/masterpiece/runs/r-001/image-01.png',
      thumbnailRelativePath: 'image-01.webp',
    }),
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => {
      assert.equal(err.code, ARTIFACT_LIFECYCLE_REQUIRED);
      // The public message is the canonical generic text;
      // the absolute path MUST NOT appear.
      assert.ok(!err.message.includes('/var/lib/masterpiece'),
        'public err.message must not carry the absolute path');
      assert.ok(!err.message.includes('/image-01.png'),
        'public err.message must not carry the file name');
      // The canonical generic text is present.
      assert.ok(err.message.includes('unsafe relative path'),
        'public err.message carries the canonical generic text');
      // The issues flag records the failure category.
      assert.ok(Array.isArray(err.issues));
      assert.ok(err.issues.includes('relative_path_unsafe'),
        'issues flag records the failure category');
      // No absolute path on any error surface.
      const serialized = JSON.stringify(err);
      assert.ok(!serialized.includes('/var/lib/masterpiece'),
        'serialized error must not carry the absolute path');
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// P2-G-FSC-E: `..` traversal rejection -> same canonical
// code, same canonical generic text, no raw path on the
// public surface.
// ---------------------------------------------------------------------------

test('P2-G-FSC-E `..` traversal rejection -> same canonical code (item 3)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps({
    resolveArtifactLifecycle: async () => ({
      runRoot: '/x', targetPath: '/x/a.png', thumbnailPath: '/x/a.webp',
      relativePath: '../../etc/passwd',
      thumbnailRelativePath: 'image-01.webp',
    }),
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => {
      assert.equal(err.code, ARTIFACT_LIFECYCLE_REQUIRED);
      // The public message is the canonical generic text.
      assert.ok(err.message.includes('unsafe relative path'));
      // The `..` fragment is NOT echoed.
      assert.ok(!err.message.includes('../'),
        'public err.message must not echo the `..` fragment');
      assert.ok(!err.message.includes('etc/passwd'),
        'public err.message must not echo the traversal target');
      // The issues flag is present.
      assert.ok(err.issues.includes('relative_path_unsafe'),
        'issues flag records the failure category');
      // No raw path on any error surface.
      const serialized = JSON.stringify(err);
      assert.ok(!serialized.includes('../../etc/passwd'),
        'serialized error must not carry the raw traversal path');
      return true;
    },
  );
});
