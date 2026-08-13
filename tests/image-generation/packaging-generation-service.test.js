// P2-G tests — Packaging Generation Service Integration.
//
// Coverage map (P2 spec §47 §54 P2-G Exit + the P2-G failure matrix
// A-J + the P2-G transition rules):
//   P2-G-A  invalid Translation              -> PACKAGING_TRANSLATION_INVALID
//   P2-G-B  missing structure evidence        -> PACKAGING_STRUCTURE_EVIDENCE_MISSING
//   P2-G-C  Reference-First without Reference -> REFERENCE_REQUIRED
//   P2-G-D  unsupported model                 -> PROVIDER_CAPABILITY_MISMATCH
//   P2-G-E  reference unsupported             -> REFERENCE_UNSUPPORTED
//   P2-G-F  stale fingerprint                -> COMPILE_INPUT_STALE
//   P2-G-G  metadata drift                    -> PACKAGING_METADATA_INVALID
//   P2-G-H  reference asset cannot resolve   -> REFERENCE_ASSET_UNRESOLVED
//   P2-G-I  Provider executor throws          -> GENERATION_PROVIDER_FAILED
//   P2-G-J  Provider succeeds                 -> normalized Packaging result
//
// Plus structural tests:
//   P2-G-K  prepare is deterministic
//   P2-G-L  Reference-First HERO happy path (with mocked executor)
//   P2-G-M  architecture-boundary: no fetch / http / axios in service module
//   P2-G-N  GENERATION_PROVIDER_FAILED never wraps pre-execution errors
//   P2-G-O  Service does not branch on provider identity
//   P2-G-P  runId is derived from fingerprint (not a fresh UUID)
//   P2-G-Q  Generation Result never carries raw Provider response
//   P2-G-R  Reference identity (assetId / role / source) survives Provider
//           resolution (P2 spec §8: traceability)
//
// Architectural position (P2 spec §26 §27 + the P2-G transition):
//   - The Service is a thin orchestrator that wires the frozen
//     P2-A..P2-F modules together with the Shared Generation Core
//     (image-generation-adapter / image-generation-runtime download+
//     redaction). It is NOT a second runtime.
//   - Tests do not require a real API key; the Shared adapter is
//     reached only through the injected `deps` seam (P2 spec §17).
//   - No real Provider call is made at any point in this test
//     suite (P2 spec §18).

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
  REFERENCE_ASSET_UNRESOLVED,
  preparePackagingGeneration,
  executePackagingGeneration,
  runPackagingGeneration,
  getPackagingGenerationServiceFingerprint,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/generation-service.js'));

const { createPackagingTranslation } = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/translation.js'));
const { compilePackagingPrompt } = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/compiler.js'));
const { resolvePackagingProviderCapability } = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-capability.js'));
const { buildPackagingProviderPayload } = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-adapter.js'));
const { evaluatePackagingCapability } = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-capability.js'));

function makeBaseInput(overrides = {}) {
  return {
    generationMode: 'analysis_led',
    shotContract: { id: 'PKG-HERO-SINGLE' },
    modelId: 'seedream-5.0-pro',
    // Provider capability hint for the Translation layer (P2-C
    // requires the Translation to know whether the selected
    // model supports Reference). Production callers resolve this
    // from the Model Registry; tests declare it explicitly.
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
    providerHints: { aspectRatio: '1:1', imageSize: '2K', qualityProfile: 'high' },
    ...overrides,
  };
}

function makeFakeExecutor(overrides = {}) {
  return {
    async execute(universalInput, options) {
      if (typeof overrides.execute === 'function') {
        return overrides.execute(universalInput, options);
      }
      return {
        status: 'succeeded',
        adapterId: 'seedream-5.0-pro',
        modelId: 'seedream-5.0-pro',
        requestId: 'fake-request-id',
        images: [{
          mimeType: 'image/png',
          b64: Buffer.from('fake-png-bytes').toString('base64'),
        }],
      };
    },
  };
}

// A test-only dependency set that:
//   - provides a fake executor (no real Provider call)
//   - provides a fake reference resolver
//   - provides a fake saveRun
//   - supplies a deterministic now() and runRoot
function makeFakeDeps(overrides = {}) {
  return {
    readReference: async (reference) => ({
      name: `${reference.assetId}.png`,
      mimeType: 'image/png',
      data: Buffer.from(`fake-binary-for-${reference.assetId}`).toString('base64'),
    }),
    fetchImpl: undefined,
    saveRun: async () => undefined,
    now: () => '2026-08-13T00:00:00.000Z',
    apiKey: 'FAKE_API_KEY_FOR_TEST',
    region: 'beijing',
    runRoot: '/tmp/packaging-test-run',
    targetPath: '/tmp/packaging-test-run/image-01.png',
    thumbnailPath: '/tmp/packaging-test-run/image-01.webp',
    executor: makeFakeExecutor(),
    ...overrides,
  };
}

// Inject a fake `createMultiModelImageAdapter` shape by replacing
// the Shared adapter's `execute` via a wrapped object. We do NOT
// patch the Shared module; the Service calls
// `createMultiModelImageAdapter({...})` and uses its `.execute`.
// The fake deps supply an `executor` (which has `.execute`); we
// wire this through a tiny shim below.
function withFakeExecutor(fakeDeps) {
  const originalDeps = { ...fakeDeps };
  // The Service calls `createMultiModelImageAdapter({...}).execute(...)`.
  // We need a way for tests to inject a fake. The cleanest way is to
  // have the Service's `runPackagingGeneration` accept an `executor`
  // dep; the production shim wraps `createMultiModelImageAdapter` and
  // honours the override.
  return {
    ...originalDeps,
    // The Service's "execute" looks up `deps.executor` first, then
    // falls back to the real Shared adapter. See generation-service.js
    // executePackagingGeneration for the seam.
    executor: fakeDeps.executor,
  };
}

// ---------------------------------------------------------------------------
// P2-G-A: invalid Translation.
// ---------------------------------------------------------------------------

test('P2-G-A invalid Translation (missing modelId) -> PROVIDER_CAPABILITY_MISMATCH pre-execution', () => {
  const input = makeBaseInput();
  delete input.modelId;
  assert.throws(
    () => preparePackagingGeneration(input),
    (err) => err.code === 'PROVIDER_CAPABILITY_MISMATCH',
  );
});

test('P2-G-A-b input that is not an object -> PACKAGING_TRANSLATION_INVALID', () => {
  assert.throws(
    () => preparePackagingGeneration(null),
    (err) => err.code === 'PACKAGING_TRANSLATION_INVALID',
  );
});

// ---------------------------------------------------------------------------
// P2-G-B: missing structure evidence.
// (Canonical upstream code; the Service does NOT rewrap.)
// ---------------------------------------------------------------------------

test('P2-G-B missing structure evidence -> PACKAGING_STRUCTURE_EVIDENCE_MISSING (canonical upstream code preserved)', () => {
  const input = makeBaseInput();
  // Strip structural evidence to force the validation gate.
  input.structure = { formFactor: 'cylindrical bottle' };
  assert.throws(
    () => preparePackagingGeneration(input),
    (err) => err.code === 'PACKAGING_STRUCTURE_EVIDENCE_MISSING',
  );
});

// ---------------------------------------------------------------------------
// P2-G-C: Reference-First without Reference.
// ---------------------------------------------------------------------------

test('P2-G-C Reference-First without Reference -> REFERENCE_REQUIRED', () => {
  const input = makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [],
    },
  });
  assert.throws(
    () => preparePackagingGeneration(input),
    (err) => err.code === 'REFERENCE_REQUIRED',
  );
});

// ---------------------------------------------------------------------------
// P2-G-D: unsupported model.
// ---------------------------------------------------------------------------

test('P2-G-D unsupported model -> PROVIDER_CAPABILITY_MISMATCH', () => {
  const input = makeBaseInput({ modelId: 'not-a-registered-model' });
  // resolvePackagingProviderCapability does not throw for an
  // unregistered model — it returns accepted:false with the
  // canonical code. The Service's validatePackagingProviderCapability
  // surfaces that as a thrown error.
  assert.throws(
    () => preparePackagingGeneration(input),
    (err) => err.code === 'PROVIDER_CAPABILITY_MISMATCH',
  );
});

test('P2-G-D-b model declared but lacks packaging capability -> PROVIDER_CAPABILITY_MISMATCH', () => {
  // gpt-image-2 is registered but has no 'packaging' capability.
  const input = makeBaseInput({ modelId: 'gpt-image-2' });
  assert.throws(
    () => preparePackagingGeneration(input),
    (err) => err.code === 'PROVIDER_CAPABILITY_MISMATCH',
  );
});

// ---------------------------------------------------------------------------
// P2-G-E: reference unsupported (Reference-First on a non-reference model).
// ---------------------------------------------------------------------------

test('P2-G-E Reference-First on a model that lacks Reference support -> REFERENCE_UNSUPPORTED', () => {
  // Build a synthetic profile that has packagingSupport but
  // referenceSupport:false; the pure evaluator produces
  // REFERENCE_UNSUPPORTED without touching the production Registry.
  const profile = {
    modelType: 'image_generation',
    packagingSupport: true,
    referenceSupport: false,
    maxReferenceImages: null,
  };
  const policy = {
    enabled: true,
    required: true,
    references: [{ assetId: 'asset-01', role: 'style_reference' }],
  };
  const capability = evaluatePackagingCapability(profile, 'reference_first', policy);
  assert.equal(capability.accepted, false);
  assert.equal(capability.rejectionCode, 'REFERENCE_UNSUPPORTED');
  // The Service's canonical upstream validator surfaces
  // REFERENCE_UNSUPPORTED verbatim. We drive it through a
  // synthetic capability that the production resolver would
  // also build (P2 spec §5: the gate is fail-closed, no
  // implicit fallback to a Reference-capable model).
  const { validatePackagingProviderCapability } = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-capability.js'));
  // validatePackagingProviderCapability takes a `resolver-input`
  // shape; for an unregistered model it reports the upstream
  // "model not registered" code, which is a *different* canonical
  // code from REFERENCE_UNSUPPORTED. The Service surfaces both
  // codes verbatim (P2 spec §12). This test pins the contract
  // that REFERENCE_UNSUPPORTED is the only code emitted by the
  // evaluator for a Reference-incompatible profile.
  const capabilityEvaluatorError = (() => {
    try { validatePackagingProviderCapability({ modelId: 'unregistered-synthetic' }); } catch (e) { return e; }
  })();
  assert.ok(capabilityEvaluatorError, 'validatePackagingProviderCapability must throw on an unregistered model');
  assert.notEqual(capabilityEvaluatorError.code, 'GENERATION_PROVIDER_FAILED',
    'pre-execution errors must not be rewrapped as GENERATION_PROVIDER_FAILED');
});

// ---------------------------------------------------------------------------
// P2-G-F: stale fingerprint -> COMPILE_INPUT_STALE.
// ---------------------------------------------------------------------------

test('P2-G-F stale fingerprint (mutated Locked Asset) -> COMPILE_INPUT_STALE on execute', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  // Mutate the Translation's Locked Asset. The fingerprint was
  // built on the original shape; the verifier rebuilds and
  // compares; the pre-execution stale gate fires.
  prepared.translation.lockedAssets.brand.name = 'Renamed Brand';
  const deps = makeFakeDeps();
  let callCount = 0;
  deps.executor = {
    async execute() {
      callCount += 1;
      return {
        status: 'succeeded',
        adapterId: 'seedream-5.0-pro',
        modelId: 'seedream-5.0-pro',
        requestId: 'should-not-fire',
        images: [],
      };
    },
  };
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => err.code === 'COMPILE_INPUT_STALE',
  );
  // The Provider executor MUST NOT have been called.
  assert.equal(callCount, 0, 'executor must not be called when pre-execution stale gate fails');
});

// ---------------------------------------------------------------------------
// P2-G-G: metadata drift -> PACKAGING_METADATA_INVALID.
// ---------------------------------------------------------------------------

test('P2-G-G metadata drift (mutated compiled.compilerVersion) -> PACKAGING_METADATA_INVALID on execute', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  // The compiler's output is Object.freeze'd; we cannot mutate
  // prepared.compiled.compilerVersion directly. Instead we wrap
  // the prepared state in a shallow copy that points to a
  // drifted compiled object. The Service's
  // verifyPackagingGenerationMetadata rebuilds canonical inputs
  // and detects the drift in the consistency gate.
  const driftedCompiled = { ...prepared.compiled, compilerVersion: '0.0.0-mutated' };
  const driftedPrepared = { ...prepared, compiled: driftedCompiled };
  const deps = makeFakeDeps();
  await assert.rejects(
    () => executePackagingGeneration(driftedPrepared, deps),
    (err) => err.code === 'PACKAGING_METADATA_INVALID',
  );
});

// ---------------------------------------------------------------------------
// P2-G-H: reference asset cannot resolve.
// ---------------------------------------------------------------------------

test('P2-G-H reference asset cannot resolve -> REFERENCE_ASSET_UNRESOLVED on execute', async () => {
  const input = makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-style', role: 'style_reference', source: 'user' },
      ],
    },
  });
  const prepared = preparePackagingGeneration(input);
  const deps = makeFakeDeps({
    readReference: async () => {
      throw Object.assign(new Error('asset not on disk'), { code: 'ENOENT' });
    },
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => err.code === REFERENCE_ASSET_UNRESOLVED,
  );
});

test('P2-G-H-b readReference returns invalid shape -> REFERENCE_ASSET_UNRESOLVED', async () => {
  const input = makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-style', role: 'style_reference', source: 'user' },
      ],
    },
  });
  const prepared = preparePackagingGeneration(input);
  const deps = makeFakeDeps({
    readReference: async () => ({ name: 'asset-style.png' }), // missing mimeType + data
  });
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => err.code === REFERENCE_ASSET_UNRESOLVED,
  );
});

// ---------------------------------------------------------------------------
// P2-G-I: Provider executor throws -> GENERATION_PROVIDER_FAILED.
// ---------------------------------------------------------------------------

test('P2-G-I Provider executor throws -> GENERATION_PROVIDER_FAILED (cause preserved, internal code surfaced)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps();
  deps.executor = {
    async execute() {
      throw Object.assign(new Error('rate limit hit'), {
        code: 'MODEL_ADAPTER_RATE_LIMITED',
        retryable: true,
      });
    },
  };
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => {
      assert.equal(err.code, GENERATION_PROVIDER_FAILED);
      assert.equal(err.cause?.code, 'MODEL_ADAPTER_RATE_LIMITED');
      assert.equal(err.internal?.code, 'MODEL_ADAPTER_RATE_LIMITED');
      assert.equal(err.internal?.retryable, true);
      return true;
    },
  );
});

test('P2-G-I-b Provider returns failed status -> GENERATION_PROVIDER_FAILED', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps();
  deps.executor = {
    async execute() {
      return { status: 'failed', images: [] };
    },
  };
  await assert.rejects(
    () => executePackagingGeneration(prepared, deps),
    (err) => err.code === GENERATION_PROVIDER_FAILED,
  );
});

// ---------------------------------------------------------------------------
// P2-G-J: Provider succeeds -> normalized Packaging result.
// ---------------------------------------------------------------------------

test('P2-G-J Provider succeeds -> normalized Packaging result (Analysis-Led HERO happy path)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps();
  let executeCalls = 0;
  let receivedUniversalInput = null;
  deps.executor = {
    async execute(universalInput) {
      executeCalls += 1;
      receivedUniversalInput = universalInput;
      return {
        status: 'succeeded',
        adapterId: 'seedream-5.0-pro',
        modelId: 'seedream-5.0-pro',
        requestId: 'fake-request-1',
        images: [{
          mimeType: 'image/png',
          b64: Buffer.from('fake-bytes-1').toString('base64'),
        }, {
          mimeType: 'image/png',
          url: 'https://example.invalid/image-2.png',
        }],
      };
    },
  };
  const result = await executePackagingGeneration(prepared, deps);
  assert.equal(result.status, 'succeeded');
  assert.equal(result.target, 'packaging');
  assert.equal(result.generationMode, 'analysis_led');
  assert.equal(result.shotContractId, 'PKG-HERO-SINGLE');
  assert.equal(result.provider.adapterId, 'seedream-5.0-pro');
  assert.equal(result.provider.provider, 'volcengine');
  assert.equal(result.provider.protocol, 'seedream-image');
  assert.equal(result.artifacts.length, 2);
  assert.equal(result.artifacts[0].imageId, 'image-01');
  assert.equal(result.artifacts[0].hasB64, true);
  assert.equal(result.artifacts[1].imageId, 'image-02');
  assert.equal(result.artifacts[1].hasUrl, true);
  // The Result must carry the metadata surface (P2 spec §13).
  assert.equal(result.metadata.shotContractId, 'PKG-HERO-SINGLE');
  // The universal input must carry the prepared prompt and zero
  // references for Analysis-Led.
  assert.equal(receivedUniversalInput.outputCount, 1);
  assert.equal(receivedUniversalInput.references.length, 0);
  assert.equal(typeof receivedUniversalInput.prompt, 'string');
  assert.ok(receivedUniversalInput.prompt.length > 100);
  // Diagnostics carry redacted request + response, not the raw
  // Provider response.
  assert.ok(result.diagnostics.redactedRequest);
  assert.ok(result.diagnostics.redactedResponse);
  // The result is frozen.
  assert.equal(Object.isFrozen(result), true);
  // Single execute call.
  assert.equal(executeCalls, 1);
});

// ---------------------------------------------------------------------------
// P2-G-K: prepare is deterministic.
// ---------------------------------------------------------------------------

test('P2-G-K prepare is deterministic (same input -> same fingerprint hashes, same runId)', () => {
  const input = makeBaseInput();
  const a = preparePackagingGeneration(input);
  const b = preparePackagingGeneration(input);
  assert.equal(a.runId, b.runId);
  assert.equal(a.metadata.compileFingerprint.sourceBundleHash, b.metadata.compileFingerprint.sourceBundleHash);
  assert.equal(a.metadata.compileFingerprint.userIntentHash, b.metadata.compileFingerprint.userIntentHash);
  assert.equal(a.metadata.compileFingerprint.deliverableHash, b.metadata.compileFingerprint.deliverableHash);
  assert.equal(a.metadata.compileFingerprint.referencePlanHash, b.metadata.compileFingerprint.referencePlanHash);
  assert.equal(a.metadata.compileFingerprint.compiledPromptHash, b.metadata.compileFingerprint.compiledPromptHash);
  assert.equal(a.metadata.payloadFingerprint, b.metadata.payloadFingerprint);
});

// ---------------------------------------------------------------------------
// P2-G-L: Reference-First HERO happy path (with mocked executor).
// ---------------------------------------------------------------------------

test('P2-G-L Reference-First HERO happy path -> normalized result with reference identity preserved', async () => {
  const input = makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-style', role: 'style_reference', source: 'user' },
        { assetId: 'asset-composition', role: 'composition_reference', source: 'project' },
      ],
    },
  });
  const prepared = preparePackagingGeneration(input);
  // The metadata captures the reference identity.
  assert.equal(prepared.metadata.references.length, 2);
  assert.equal(prepared.metadata.references[0].assetId, 'asset-style');
  assert.equal(prepared.metadata.references[0].role, 'style_reference');
  assert.equal(prepared.metadata.references[0].source, 'user');
  // The fingerprint-input mapping hashed the reference identity, so
  // referencePlanHash reacts to the role.
  const deps = makeFakeDeps();
  let receivedRefs = null;
  deps.executor = {
    async execute(universalInput) {
      receivedRefs = universalInput.references;
      return {
        status: 'succeeded',
        adapterId: 'seedream-5.0-pro',
        modelId: 'seedream-5.0-pro',
        requestId: 'fake-request-ref',
        images: [{
          mimeType: 'image/png',
          b64: Buffer.from('fake-bytes').toString('base64'),
        }],
      };
    },
  };
  const result = await executePackagingGeneration(prepared, deps);
  assert.equal(result.status, 'succeeded');
  // The metadata's reference identity is preserved verbatim on the
  // Generation Result (P2 spec §8: traceability).
  assert.equal(result.metadata.references.length, 2);
  assert.equal(result.metadata.references[0].assetId, 'asset-style');
  assert.equal(result.metadata.references[0].role, 'style_reference');
  // The shared executor received two binary references.
  assert.equal(receivedRefs.length, 2);
  assert.equal(receivedRefs[0].name, 'asset-style.png');
  assert.equal(receivedRefs[0].mimeType, 'image/png');
  assert.equal(typeof receivedRefs[0].data, 'string');
  assert.ok(receivedRefs[0].data.length > 0);
});

// ---------------------------------------------------------------------------
// P2-G-M: architecture-boundary (no fetch / no http.request / no axios).
// ---------------------------------------------------------------------------

test('P2-G-M packaging/generation-service.js does not import fetch / http.request / axios / dotenv / fs', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/generation-service.js'),
    'utf8',
  );
  assert.ok(!/^import\s+[^;]*['"]node:http/.test(src) && !/require\(['"]node:http/.test(src),
    'generation-service must not import node:http directly; Provider dispatch is the Shared adapter');
  assert.ok(!/^import\s+[^;]*['"]node:https/.test(src) && !/require\(['"]node:https/.test(src),
    'generation-service must not import node:https directly');
  assert.ok(!/require\(['"]axios['"]\)/.test(src) && !/from\s+['"]axios['"]/.test(src),
    'generation-service must not use axios');
  assert.ok(!/require\(['"]node-fetch['"]\)/.test(src),
    'generation-service must not use node-fetch');
  assert.ok(!/require\(['"]dotenv['"]\)/.test(src) && !/from\s+['"]dotenv['"]/.test(src),
    'generation-service must not load dotenv directly; credentials come from the Shared seam');
  // The Service does not import node:fs directly. The Shared
  // download-verify is allowed because it owns the surface.
  const fsImportPattern = /require\(['"]node:fs['"]\)|from\s+['"]node:fs['"]/;
  assert.ok(!fsImportPattern.test(src),
    'generation-service must not import node:fs directly; persistence is the Shared Run store');
});

test('P2-G-M-b packaging/ subtree has no provider HTTP client; no apiKey loader; no retry loop', () => {
  const dir = join(repoRoot, 'packages/image-generation-runtime/src/packaging');
  for (const f of readdirSync(dir)) {
    if (!/\.(js|ts|mjs)$/.test(f)) continue;
    const src = readFileSync(join(dir, f), 'utf8');
    // No direct Provider HTTP client (the Shared adapter is allowed
    // in generation-service.js only; the other 7 modules do not
    // dispatch Providers at all).
    if (f === 'generation-service.js') continue;
    assert.ok(!/createMultiModelImageAdapter|adapter\.execute|fetch\(/.test(src),
      `${f} should not dispatch a Provider; only generation-service.js orchestrates the Shared adapter`);
    // No API Key loader.
    assert.ok(!/apiKey.*from\s+env|process\.env\.MASTERPIECE/.test(src),
      `${f} must not load API keys from process.env`);
    // No retry loop.
    assert.ok(!/for\s*\(let\s+\w+\s*=\s*0;\s*\w+\s*<\s*\w+;\s*\w+\s*\+\+/.test(src) || /maxAttempts/.test(src),
      `${f} must not implement its own retry loop`);
  }
});

// ---------------------------------------------------------------------------
// P2-G-N: GENERATION_PROVIDER_FAILED never wraps pre-execution errors.
// ---------------------------------------------------------------------------

test('P2-G-N pre-execution errors keep canonical upstream code; the Service does NOT rewrap them', () => {
  // For each of PACKAGING_TRANSLATION_INVALID, PACKAGING_STRUCTURE_EVIDENCE_MISSING,
  // REFERENCE_REQUIRED, PROVIDER_CAPABILITY_MISMATCH, the Service
  // surfaces the canonical code on the thrown error, not a generic
  // GENERATION_PROVIDER_FAILED.
  const cases = [
    {
      name: 'no modelId',
      input: (() => { const i = makeBaseInput(); delete i.modelId; return i; })(),
      code: 'PROVIDER_CAPABILITY_MISMATCH',
    },
    {
      name: 'unsupported model',
      input: makeBaseInput({ modelId: 'not-registered' }),
      code: 'PROVIDER_CAPABILITY_MISMATCH',
    },
    {
      name: 'missing structure',
      input: (() => { const i = makeBaseInput(); i.structure = { formFactor: 'x' }; return i; })(),
      code: 'PACKAGING_STRUCTURE_EVIDENCE_MISSING',
    },
    {
      name: 'reference-first without references',
      input: makeBaseInput({ generationMode: 'reference_first', referencePolicy: { enabled: true, required: true, references: [] } }),
      code: 'REFERENCE_REQUIRED',
    },
  ];
  for (const c of cases) {
    assert.throws(
      () => preparePackagingGeneration(c.input),
      (err) => {
        assert.notEqual(err.code, GENERATION_PROVIDER_FAILED,
          `${c.name} must not be rewrapped as GENERATION_PROVIDER_FAILED (P2 spec §12)`);
        assert.equal(err.code, c.code, `${c.name} expected ${c.code}, got ${err.code}`);
        return true;
      },
    );
  }
});

// ---------------------------------------------------------------------------
// P2-G-O: Service does not branch on provider identity.
// ---------------------------------------------------------------------------

test('P2-G-O generation-service.js does not branch on `provider === "volcengine"` / `google` / `openai`', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/generation-service.js'),
    'utf8',
  );
  // Strip block comments AND line comments so the doc comment
  // that documents the constraint does not match the negative
  // assertion.
  const codeBody = src
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
  assert.ok(!/provider\s*===\s*['"]volcengine['"]/.test(codeBody),
    'Service must not branch on provider identity at execute time');
  assert.ok(!/provider\s*===\s*['"]google['"]/.test(codeBody));
  assert.ok(!/provider\s*===\s*['"]openai['"]/.test(codeBody));
  // The Service uses `adapter.protocol` and `capability.modelId`
  // only as values to surface on the result; it does not branch
  // on them.
  assert.ok(/capability\.provider/.test(codeBody),
    'Service reads capability.provider but does not branch on it');
});

// ---------------------------------------------------------------------------
// P2-G-P: runId is derived from the fingerprint, not a fresh UUID.
// ---------------------------------------------------------------------------

test('P2-G-P runId is derived from sourceBundleHash; same input -> same runId; mutated input -> different runId', () => {
  const a = preparePackagingGeneration(makeBaseInput());
  const b = preparePackagingGeneration(makeBaseInput());
  assert.equal(a.runId, b.runId);
  assert.ok(a.runId.startsWith('pkg-'));
  assert.equal(a.runId.length, 'pkg-'.length + 12);

  const inputC = makeBaseInput({ shotContract: { id: 'PKG-SERIES-GROUP' } });
  const c = preparePackagingGeneration(inputC);
  assert.notEqual(a.runId, c.runId);
});

// ---------------------------------------------------------------------------
// P2-G-Q: Generation Result never carries raw Provider response.
// ---------------------------------------------------------------------------

test('P2-G-Q Generation Result does not carry raw Provider request / response (P2 spec §13)', async () => {
  const prepared = preparePackagingGeneration(makeBaseInput());
  const deps = makeFakeDeps();
  deps.executor = {
    async execute() {
      return {
        status: 'succeeded',
        adapterId: 'seedream-5.0-pro',
        modelId: 'seedream-5.0-pro',
        requestId: 'fake-request',
        images: [{
          mimeType: 'image/png',
          b64: Buffer.from('fake-bytes').toString('base64'),
        }],
      };
    },
  };
  const result = await executePackagingGeneration(prepared, deps);
  const json = JSON.stringify(result);
  // The raw base64 payload must NOT be on the result; only a
  // `hasB64: true` boolean. The base64 bytes themselves are in
  // the executor (and they are still in memory until the Shared
  // download-verify writes them; the Generation Result is the
  // audit trail, not the binary transport).
  assert.ok(!/"b64":\s*"/.test(json.replace(/redactedRequest|redactedResponse/g, '')),
    'Generation Result must not embed raw base64 image data');
  // The redactedRequest and redactedResponse are present and have
  // `authorization: '[REDACTED]'`.
  assert.equal(result.diagnostics.redactedRequest.authorization, '[REDACTED]');
  // The Result carries the metadata surface (P2 spec §13) but
  // not the raw Provider request.
  assert.ok(!('rawRequest' in result));
  assert.ok(!('rawResponse' in result));
});

// ---------------------------------------------------------------------------
// P2-G-R: Reference identity (assetId / role / source) survives Provider
//         resolution (P2 spec §8: traceability).
// ---------------------------------------------------------------------------

test('P2-G-R reference identity (assetId / role / source) survives execute (P2 spec §8)', async () => {
  const input = makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-style', role: 'style_reference', source: 'user' },
      ],
    },
  });
  const prepared = preparePackagingGeneration(input);
  const deps = makeFakeDeps();
  deps.executor = {
    async execute() {
      return {
        status: 'succeeded',
        adapterId: 'seedream-5.0-pro',
        modelId: 'seedream-5.0-pro',
        requestId: 'fake',
        images: [{
          mimeType: 'image/png',
          b64: Buffer.from('x').toString('base64'),
        }],
      };
    },
  };
  const result = await executePackagingGeneration(prepared, deps);
  // assetId / role / source are preserved on the metadata, even
  // though the Provider only saw the binary.
  assert.equal(result.metadata.references[0].assetId, 'asset-style');
  assert.equal(result.metadata.references[0].role, 'style_reference');
  assert.equal(result.metadata.references[0].source, 'user');
  // The redactedRequest has the binary removed and only carries
  // {name, mimeType, hasData}. The reference identity is NOT in
  // the Provider request (it is in the metadata).
  const refInRequest = result.diagnostics.redactedRequest.body.input.references[0];
  assert.equal(refInRequest.name, 'asset-style.png');
  assert.equal(refInRequest.mimeType, 'image/png');
  assert.equal(refInRequest.hasData, true);
  // assetId / role are NOT in the Provider request.
  assert.ok(!('assetId' in refInRequest));
  assert.ok(!('role' in refInRequest));
});

// ---------------------------------------------------------------------------
// P2-G-S: runPackagingGeneration is the single-call wrapper.
// ---------------------------------------------------------------------------

test('P2-G-S runPackagingGeneration is a thin wrapper around prepare + execute', async () => {
  const deps = makeFakeDeps();
  let executeCalls = 0;
  deps.executor = {
    async execute() {
      executeCalls += 1;
      return {
        status: 'succeeded',
        adapterId: 'seedream-5.0-pro',
        modelId: 'seedream-5.0-pro',
        requestId: 'fake',
        images: [{ mimeType: 'image/png', b64: 'aGVsbG8=' }],
      };
    },
  };
  const result = await runPackagingGeneration(makeBaseInput(), deps);
  assert.equal(result.status, 'succeeded');
  assert.equal(executeCalls, 1);
});

// ---------------------------------------------------------------------------
// P2-G-T: Service exposes a structural fingerprint.
// ---------------------------------------------------------------------------

test('P2-G-T getPackagingGenerationServiceFingerprint pins Shared authority and prepare/execute layers', () => {
  const fp = getPackagingGenerationServiceFingerprint();
  assert.equal(fp.schemaVersion, '1.0');
  assert.equal(fp.serviceVersion, PACKAGING_GENERATION_SERVICE_VERSION);
  assert.deepEqual([...fp.layers], ['prepare', 'execute']);
  assert.equal(fp.sharedAuthority.providerDispatch, 'createMultiModelImageAdapter');
  assert.equal(fp.sharedAuthority.downloadVerify, 'downloadAndVerifyImage');
  assert.equal(fp.sharedAuthority.redaction, 'redactProviderRequest / redactProviderResponse');
  assert.equal(fp.sharedAuthority.fingerprint, 'buildPackagingGenerationMetadata / verifyPackagingGenerationMetadata');
});

// ---------------------------------------------------------------------------
// P2-G cross-target isolation.
// ---------------------------------------------------------------------------

test('P2-G-cross-target Space code does not import packaging generation-service', () => {
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
      assert.ok(
        !src.includes('image-generation-runtime/src/packaging/generation-service'),
        `${f} imports packaging generation-service; cross-target isolation broken`,
      );
    }
  }
});

test('P2-G-no-golden packaging/generation-service.js does not import any Golden / evaluation / fixture asset', () => {
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
    assert.ok(!/evaluation\//.test(line), `generation-service.js imports evaluation/* via: ${line}`);
    assert.ok(!/tests\/fixtures\/packaging\//.test(line), `generation-service.js imports tests/fixtures/packaging/* via: ${line}`);
  }
});
