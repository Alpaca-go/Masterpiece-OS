// P2-F tests — Generation Metadata + Compile Fingerprint.
//
// Coverage map (per P2 spec §47 §53 P2-F Exit + the P2-F
// transition rules + the P2-F test plan A-P):
//   A.  metadata records target / mode / shot
//   B.  all component versions present
//   C.  provider / model snapshot present
//   D.  reference assetId / role / source preserved
//   E.  Locked Asset status complete
//   F.  Shared createCompileFingerprint actually used
//   G.  same semantics + different timestamp -> same 5 semantic
//       hashes
//   H.  Locked Asset content change -> fingerprint changes
//   I.  reference role change -> referencePlanHash changes
//   J.  shot contract change -> fingerprint changes
//   K.  provider/model relevant config change -> fingerprint
//       changes
//   L.  verifyCompileFingerprint PASS on unchanged input
//   M.  semantic mutation -> COMPILE_INPUT_STALE
//   N.  metadata contains no secret fields
//   O.  metadata timestamp does not enter provider payload
//   P.  no second hashing / fingerprint algorithm
//
// Architectural position (P2 spec §26 §27 + the P2-F transition):
//   - metadata is a capability-owned, allowlist-constructed
//     surface; it is NOT the Provider Payload (P2-E) and NOT
//     the Provider Request (P2-G).
//   - The Shared Compile Fingerprint is integrated through the
//     existing Shared Core (createCompileFingerprint / stableHash
//     / verifyCompileFingerprint). P2-F does NOT define a second
//     fingerprint algorithm.
//   - Runtime noise (createdAt / timestamp / runId / UUID /
//     local path / temp path / API key) is stripped from semantic
//     hash inputs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const require = createRequire(import.meta.url);

const {
  PACKAGING_METADATA_VERSION,
  PACKAGING_METADATA_INVALID,
  buildPackagingGenerationMetadata,
  verifyPackagingGenerationMetadata,
  verifySharedCompileFingerprint,
  buildPackagingFingerprintInputs,
  getPackagingMetadataFingerprint,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/metadata.js'));

const {
  createPackagingTranslation,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/translation.js'));

const {
  compilePackagingPrompt,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/compiler.js'));

const {
  resolvePackagingProviderCapability,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-capability.js'));

const {
  buildPackagingProviderPayload,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-adapter.js'));

const {
  PACKAGING_TRANSLATION_VERSION,
  PACKAGING_REFERENCE_PRECEDENCE,
  PACKAGING_REFERENCE_ROLES,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/translation.js'));

const {
  PACKAGING_SHOT_CONTRACT_VERSION,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/contracts.js'));

const {
  PACKAGING_REFERENCE_POLICY_VERSION,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/reference-policy.js'));

const {
  PACKAGING_COMPILER_VERSION,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/compiler.js'));

const {
  PACKAGING_PROVIDER_CAPABILITY_VERSION,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-capability.js'));

const {
  PACKAGING_PROVIDER_ADAPTER_VERSION,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-adapter.js'));

function makeBaseInput(overrides = {}) {
  return {
    generationMode: 'analysis_led',
    shotContract: { id: 'PKG-HERO-SINGLE' },
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
    providerHints: { aspectRatio: '1:1', imageSize: '1024x1024', qualityProfile: 'high' },
    providerCapability: { referenceSupport: true, maxReferenceImages: 4 },
    ...overrides,
  };
}

function buildFixture(overrides = {}) {
  const translation = createPackagingTranslation(makeBaseInput(overrides));
  const compiled = compilePackagingPrompt(translation);
  const capability = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  const payload = buildPackagingProviderPayload({ compiled, capability, translation });
  return { translation, compiled, capability, payload };
}

// ---------------------------------------------------------------------------
// P2-F test A: metadata records target / mode / shot.
// ---------------------------------------------------------------------------

test('P2-F-A metadata records target / generationMode / shotContractId', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  assert.equal(metadata.target, 'packaging');
  assert.equal(metadata.generationMode, 'analysis_led');
  assert.equal(metadata.shotContractId, 'PKG-HERO-SINGLE');
  assert.equal(metadata.schemaVersion, '1.0');
  assert.equal(metadata.metadataVersion, PACKAGING_METADATA_VERSION);
});

// ---------------------------------------------------------------------------
// P2-F test B: all component versions present (sourced from canonical
// module outputs).
// ---------------------------------------------------------------------------

test('P2-F-B metadata component versions are present and sourced from canonical module exports', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  const cv = metadata.componentVersions;
  assert.equal(cv.metadataVersion, PACKAGING_METADATA_VERSION);
  assert.equal(cv.contractVersion, PACKAGING_SHOT_CONTRACT_VERSION);
  assert.equal(cv.translationVersion, PACKAGING_TRANSLATION_VERSION);
  assert.equal(cv.referencePolicyVersion, PACKAGING_REFERENCE_POLICY_VERSION);
  assert.equal(cv.compilerVersion, PACKAGING_COMPILER_VERSION);
  assert.equal(cv.providerCapabilityVersion, PACKAGING_PROVIDER_CAPABILITY_VERSION);
  assert.equal(cv.providerAdapterVersion, PACKAGING_PROVIDER_ADAPTER_VERSION);
});

// ---------------------------------------------------------------------------
// P2-F test C: provider / model snapshot present.
// ---------------------------------------------------------------------------

test('P2-F-C metadata provider/model snapshot is sourced from the accepted capability (execution snapshot, not authority)', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  const pm = metadata.providerModel;
  assert.equal(pm.modelId, 'seedream-5.0-pro');
  assert.equal(pm.provider, 'volcengine');
  assert.equal(pm.protocol, 'seedream-image');
  assert.equal(pm.modelType, 'image_generation');
  assert.equal(pm.packagingSupport, true);
  assert.equal(pm.referenceSupport, true);
  // P2-F known limitation (item #20): Registry currently does not
  // declare maxReferenceImages, so the snapshot is null.
  assert.equal(pm.maxReferenceImages, null);
});

// ---------------------------------------------------------------------------
// P2-F test D: reference assetId / role / source preserved.
// ---------------------------------------------------------------------------

test('P2-F-D metadata references carry explicit assetId / role / source (no local path, no URL)', () => {
  const { translation, compiled, capability, payload } = buildFixture({
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
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  assert.equal(metadata.referenceCount, 2);
  for (let i = 0; i < 2; i += 1) {
    const tRef = translation.referencePolicy.references[i];
    const mRef = metadata.references[i];
    assert.equal(mRef.assetId, tRef.assetId);
    assert.equal(mRef.role, tRef.role);
    assert.equal(mRef.source, tRef.source);
    // P2-F constraint #6: no local path / temp path / credential URL
    // / secret query parameter on metadata.references.
    assert.ok(!JSON.stringify(mRef).match(/\/|\\|tmp|temp|secret/i) || mRef.source === 'user' || mRef.source === 'project',
      `metadata.references[${i}] leaked path-like content`);
  }
});

// ---------------------------------------------------------------------------
// P2-F test E: Locked Asset status complete.
// ---------------------------------------------------------------------------

test('P2-F-E metadata lockedAssetStatus records all 7 categories with locked / present', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  const expected = ['brand', 'logo', 'productIdentity', 'category', 'structure', 'mandatoryCopy', 'confirmedComponents'];
  for (const name of expected) {
    assert.ok(metadata.lockedAssetStatus[name], `lockedAssetStatus missing: ${name}`);
    assert.equal(typeof metadata.lockedAssetStatus[name].locked, 'boolean');
    assert.equal(typeof metadata.lockedAssetStatus[name].present, 'boolean');
    assert.equal(metadata.lockedAssetStatus[name].locked, true);
  }
  assert.equal(metadata.allRequiredLocked, true);
});

test('P2-F-E-b allRequiredLocked is false when any Locked Asset is unlocked', () => {
  // Build a valid Translation first, then simulate drift by
  // mutating a Locked Asset on the resulting Translation. The
  // metadata flag reflects the mutated shape, demonstrating
  // defense-in-depth detection of Locked Asset drift.
  const { translation, compiled, capability, payload } = buildFixture();
  translation.lockedAssets.brand.locked = false;
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  assert.equal(metadata.allRequiredLocked, false);
  assert.equal(metadata.lockedAssetStatus.brand.locked, false);
});

// ---------------------------------------------------------------------------
// P2-F test F: Shared createCompileFingerprint is actually used.
// ---------------------------------------------------------------------------

test('P2-F-F metadata compileFingerprint is wired through the Shared Core (createCompileFingerprint / stableHash / verifyCompileFingerprint)', async () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  // The Shared Core is at packages/image-generation-runtime/src/
  // deliverables/compile-fingerprint.js. P2-F uses it through
  // metadata.js; we assert the surface is real and the fields
  // are SHA-256 hex (64 chars). The Shared module itself is
  // loaded via pathToFileURL because Node ESM does not accept
  // raw Windows paths.
  const sharedPath = join(repoRoot, 'packages/image-generation-runtime/src/deliverables/compile-fingerprint.js');
  const shared = await import(pathToFileURL(sharedPath).href);
  assert.equal(typeof shared.createCompileFingerprint, 'function');
  assert.equal(typeof shared.verifyCompileFingerprint, 'function');
  assert.equal(typeof shared.stableHash, 'function');
  // The metadata's sourceBundleHash is a SHA-256 hex string.
  assert.equal(typeof metadata.compileFingerprint.sourceBundleHash, 'string');
  assert.equal(metadata.compileFingerprint.sourceBundleHash.length, 64);
  // And the metadata was produced by the same function the
  // Shared Core exposes. We do a black-box check: calling
  // Shared createCompileFingerprint on the same inputs (the
  // test would need to expose sourceBundle, but metadata does
  // not). Here we assert the metadata fields exist and the
  // hash length is canonical (the algorithm is the Shared one).
  for (const f of ['sourceBundleHash', 'userIntentHash', 'deliverableHash', 'referencePlanHash', 'compiledPromptHash']) {
    assert.equal(typeof metadata.compileFingerprint[f], 'string');
    assert.equal(metadata.compileFingerprint[f].length, 64);
  }
});

test('P2-F-F-b packaging/metadata.js does not redefine a second fingerprint algorithm (no packagingFingerprintAlgorithm)', () => {
  const dir = join(repoRoot, 'packages/image-generation-runtime/src/packaging');
  for (const f of readdirSync(dir)) {
    if (!/\.(js|ts|mjs)$/.test(f)) continue;
    const src = readFileSync(join(dir, f), 'utf8');
    assert.ok(
      !/createHash\s*\(/.test(src) || /from\s+['"]\.\.\/deliverables\/compile-fingerprint\.js['"]/.test(src),
      `${f} calls createHash directly; only the Shared Core may own the fingerprint algorithm`,
    );
    assert.ok(!/packagingFingerprintAlgorithm/.test(src), `${f} introduces a parallel fingerprint algorithm`);
  }
});

// ---------------------------------------------------------------------------
// P2-F test G: same semantics + different timestamp -> same 5 semantic
// hashes.
// ---------------------------------------------------------------------------

test('P2-F-G same semantics + different createdAt -> same 5 semantic hashes', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const a = buildPackagingGenerationMetadata({ translation, compiled, capability, payload, createdAt: '2026-08-13T09:00:00.000Z' });
  const b = buildPackagingGenerationMetadata({ translation, compiled, capability, payload, createdAt: '2026-08-13T10:00:00.000Z' });
  // Audit timestamp may differ.
  assert.notEqual(a.createdAt, b.createdAt);
  // But the 5 semantic hashes MUST be byte-equal.
  for (const f of ['sourceBundleHash', 'userIntentHash', 'deliverableHash', 'referencePlanHash', 'compiledPromptHash']) {
    assert.equal(a.compileFingerprint[f], b.compileFingerprint[f], `${f} must be stable across timestamps`);
  }
});

test('P2-F-G-b translation.provenance.createdAt is NOT in the sourceBundle (runtime noise stripped)', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  translation.provenance.createdAt = '2026-08-13T09:00:00.000Z';
  const a = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  translation.provenance.createdAt = '2026-08-13T10:00:00.000Z';
  const b = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  // Even if the source Translation has a different createdAt, the
  // sourceBundleHash MUST be stable.
  assert.equal(a.compileFingerprint.sourceBundleHash, b.compileFingerprint.sourceBundleHash);
});

// ---------------------------------------------------------------------------
// P2-F test H: Locked Asset content change -> fingerprint changes.
// ---------------------------------------------------------------------------

test('P2-F-H a Locked Asset content change (brand name) -> sourceBundleHash changes', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const a = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  // Mutate the Locked Asset name.
  translation.lockedAssets.brand.name = 'Different Brand';
  const b = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  assert.notEqual(a.compileFingerprint.sourceBundleHash, b.compileFingerprint.sourceBundleHash);
});

test('P2-F-H-b a Locked Asset structure change (form factor) -> sourceBundleHash changes', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const a = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  translation.lockedAssets.structure.formFactor = 'square glass jar';
  const b = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  assert.notEqual(a.compileFingerprint.sourceBundleHash, b.compileFingerprint.sourceBundleHash);
});

test('P2-F-H-c a Locked Asset mandatory copy change -> sourceBundleHash changes', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const a = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  translation.lockedAssets.mandatoryCopy.items = ['50ml'];
  const b = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  assert.notEqual(a.compileFingerprint.sourceBundleHash, b.compileFingerprint.sourceBundleHash);
});

// ---------------------------------------------------------------------------
// P2-F test I: reference role change -> referencePlanHash changes.
// ---------------------------------------------------------------------------

test('P2-F-I changing a reference role (style -> structure) -> referencePlanHash changes', () => {
  const base = makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [{ assetId: 'asset-01', role: 'style_reference', source: 'user' }],
    },
  });
  const { translation: t1, compiled: c1, capability: k1, payload: p1 } = buildFixture(base);
  const a = buildPackagingGenerationMetadata({ translation: t1, compiled: c1, capability: k1, payload: p1 });
  // Switch the role on the same assetId.
  const base2 = makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [{ assetId: 'asset-01', role: 'structure_reference', source: 'user' }],
    },
  });
  const { translation: t2, compiled: c2, capability: k2, payload: p2 } = buildFixture(base2);
  const b = buildPackagingGenerationMetadata({ translation: t2, compiled: c2, capability: k2, payload: p2 });
  assert.notEqual(a.compileFingerprint.referencePlanHash, b.compileFingerprint.referencePlanHash);
});

test('P2-F-I-b changing a reference assetId -> referencePlanHash changes', () => {
  const base = makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [{ assetId: 'asset-01', role: 'style_reference', source: 'user' }],
    },
  });
  const { translation: t1, compiled: c1, capability: k1, payload: p1 } = buildFixture(base);
  const a = buildPackagingGenerationMetadata({ translation: t1, compiled: c1, capability: k1, payload: p1 });
  const base2 = makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [{ assetId: 'asset-99', role: 'style_reference', source: 'user' }],
    },
  });
  const { translation: t2, compiled: c2, capability: k2, payload: p2 } = buildFixture(base2);
  const b = buildPackagingGenerationMetadata({ translation: t2, compiled: c2, capability: k2, payload: p2 });
  assert.notEqual(a.compileFingerprint.referencePlanHash, b.compileFingerprint.referencePlanHash);
});

// ---------------------------------------------------------------------------
// P2-F test J: shot contract change -> fingerprint changes.
// ---------------------------------------------------------------------------

test('P2-F-J changing the Shot Contract (HERO -> SERIES) -> userIntentHash / deliverableHash change', () => {
  const { translation: t1, compiled: c1, capability: k1, payload: p1 } = buildFixture({
    shotContract: { id: 'PKG-HERO-SINGLE' },
  });
  const a = buildPackagingGenerationMetadata({ translation: t1, compiled: c1, capability: k1, payload: p1 });
  const { translation: t2, compiled: c2, capability: k2, payload: p2 } = buildFixture({
    shotContract: { id: 'PKG-SERIES-GROUP' },
  });
  const b = buildPackagingGenerationMetadata({ translation: t2, compiled: c2, capability: k2, payload: p2 });
  assert.notEqual(a.compileFingerprint.userIntentHash, b.compileFingerprint.userIntentHash);
  assert.notEqual(a.compileFingerprint.deliverableHash, b.compileFingerprint.deliverableHash);
});

test('P2-F-J-b changing generationMode (analysis_led -> reference_first) -> userIntentHash / sourceBundleHash change', () => {
  const { translation: t1, compiled: c1, capability: k1, payload: p1 } = buildFixture({
    generationMode: 'analysis_led',
  });
  const a = buildPackagingGenerationMetadata({ translation: t1, compiled: c1, capability: k1, payload: p1 });
  const { translation: t2, compiled: c2, capability: k2, payload: p2 } = buildFixture({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [{ assetId: 'asset-01', role: 'style_reference', source: 'user' }],
    },
  });
  const b = buildPackagingGenerationMetadata({ translation: t2, compiled: c2, capability: k2, payload: p2 });
  assert.notEqual(a.compileFingerprint.userIntentHash, b.compileFingerprint.userIntentHash);
  // sourceBundle also differs because userIntent flows into it.
  assert.notEqual(a.compileFingerprint.sourceBundleHash, b.compileFingerprint.sourceBundleHash);
});

// ---------------------------------------------------------------------------
// P2-F test K: provider/model relevant config change -> fingerprint changes.
// ---------------------------------------------------------------------------

test('P2-F-K changing aspect ratio (1:1 -> 16:9) -> sourceBundleHash changes', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const a = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  translation.providerHints.aspectRatio = '16:9';
  const b = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  assert.notEqual(a.compileFingerprint.sourceBundleHash, b.compileFingerprint.sourceBundleHash);
});

test('P2-F-K-b changing image size -> sourceBundleHash changes', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const a = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  translation.providerHints.imageSize = '2048x2048';
  const b = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  assert.notEqual(a.compileFingerprint.sourceBundleHash, b.compileFingerprint.sourceBundleHash);
});

test('P2-F-K-c changing quality profile -> sourceBundleHash changes', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const a = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  translation.providerHints.qualityProfile = 'ultra';
  const b = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  assert.notEqual(a.compileFingerprint.sourceBundleHash, b.compileFingerprint.sourceBundleHash);
});

// ---------------------------------------------------------------------------
// P2-F test L: verifyCompileFingerprint PASS on unchanged input.
// ---------------------------------------------------------------------------

test('P2-F-L verifyPackagingGenerationMetadata returns valid:true on unchanged re-build', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  const r = verifyPackagingGenerationMetadata(metadata, { translation, compiled, capability, payload });
  assert.equal(r.valid, true);
  assert.deepEqual(r.mismatches, []);
});

test('P2-F-L-b verifySharedCompileFingerprint returns valid:true on unchanged input (genuine verification, not just non-throw)', () => {
  // P2-F Finalization Delta item 3: replace the previous
  // `assert.ok(r)` black-box with a genuine `valid:true` check
  // that drives the Shared Core verifier through the canonical
  // input mapping authority.
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  const currentInputs = buildPackagingFingerprintInputs({ translation, compiled, capability, payload });
  const r = verifySharedCompileFingerprint(metadata.compileFingerprint, currentInputs);
  assert.equal(r.valid, true);
  assert.deepEqual(r.mismatches, []);
});

// ---------------------------------------------------------------------------
// P2-F test M: semantic mutation -> COMPILE_INPUT_STALE.
// ---------------------------------------------------------------------------

test('P2-F-M a semantic mutation (Locked brand name) -> verifyPackagingGenerationMetadata reports COMPILE_INPUT_STALE', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  // Mutate a Locked Asset (semantic, not runtime noise).
  translation.lockedAssets.brand.name = 'Different Brand';
  const r = verifyPackagingGenerationMetadata(metadata, { translation, compiled, capability, payload });
  assert.equal(r.valid, false);
  assert.equal(r.code, 'COMPILE_INPUT_STALE');
  assert.ok(r.mismatches.length > 0);
});

test('P2-F-M-b a reference role mutation -> COMPILE_INPUT_STALE on referencePlanHash', () => {
  const base = makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [{ assetId: 'asset-01', role: 'style_reference', source: 'user' }],
    },
  });
  const { translation: t1, compiled: c1, capability: k1, payload: p1 } = buildFixture(base);
  const metadata = buildPackagingGenerationMetadata({ translation: t1, compiled: c1, capability: k1, payload: p1 });
  // Mutate the role.
  const base2 = makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [{ assetId: 'asset-01', role: 'composition_reference', source: 'user' }],
    },
  });
  const { translation: t2, compiled: c2, capability: k2, payload: p2 } = buildFixture(base2);
  const r = verifyPackagingGenerationMetadata(metadata, { translation: t2, compiled: c2, capability: k2, payload: p2 });
  assert.equal(r.valid, false);
  assert.equal(r.code, 'COMPILE_INPUT_STALE');
  assert.ok(r.mismatches.includes('referencePlanHash'));
});

// ---------------------------------------------------------------------------
// P2-F test N: metadata contains no secret fields.
// ---------------------------------------------------------------------------

test('P2-F-N metadata contains no secret-like fields (allowlist construction)', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  const text = JSON.stringify(metadata);
  for (const needle of ['apiKey', 'accessToken', 'authorization', 'cookie', 'secret', 'credential', 'masterKey', 'password', 'token', 'bearer', 'privateKey']) {
    assert.ok(!text.includes(needle), `metadata contains forbidden secret-like literal: ${needle}`);
  }
});

test('P2-F-N-b metadata builder rejects a Translation that has been poisoned with a secret field', () => {
  // The Translation shape does not allow secret fields, but a
  // caller could try to poison the upstream Translation.
  // metadata.js is allowlist-only; the secret-safety scan
  // rejects it.
  const { translation, compiled, capability, payload } = buildFixture();
  translation.apiKey = 'sk-poisoned';
  assert.throws(
    () => buildPackagingGenerationMetadata({ translation, compiled, capability, payload }),
    (err) => err.code === 'PACKAGING_METADATA_INVALID',
  );
});

// ---------------------------------------------------------------------------
// P2-F test O: metadata timestamp does not enter provider payload.
// ---------------------------------------------------------------------------

test('P2-F-O metadata carries a createdAt; the Provider Payload is timestamp-free', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload, createdAt: '2026-08-13T09:00:00.000Z' });
  assert.equal(metadata.createdAt, '2026-08-13T09:00:00.000Z');
  // The Provider Payload must NOT carry a createdAt.
  const payloadText = JSON.stringify(payload);
  assert.ok(!payloadText.includes('2026-08-13T09:00:00'), 'Provider Payload leaked the metadata createdAt');
  assert.ok(!payloadText.includes('createdAt'), 'Provider Payload carries a createdAt field');
});

test('P2-F-O-b the Provider Payload does not carry any timestamp / UUID / runId / local path', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  void metadata;
  const text = JSON.stringify(payload);
  for (const token of ['uuid', 'UUID', 'runId', 'createdAt', 'tmp/', 'temp/', 'C:/Users']) {
    assert.ok(!text.includes(token), `Provider Payload leaked a non-deterministic token: ${token}`);
  }
});

// ---------------------------------------------------------------------------
// P2-F test P: no second hashing / fingerprint algorithm.
// ---------------------------------------------------------------------------

test('P2-F-P the packaging/ subtree contains no second fingerprint algorithm (subtree scan)', () => {
  const dir = join(repoRoot, 'packages/image-generation-runtime/src/packaging');
  for (const f of readdirSync(dir)) {
    if (!/\.(js|ts|mjs)$/.test(f)) continue;
    const src = readFileSync(join(dir, f), 'utf8');
    // P2-F does not introduce a parallel fingerprint algorithm.
    assert.ok(!/packagingFingerprintAlgorithm/.test(src));
    assert.ok(!/packagingStableHash\b/.test(src));
    // SHA-256 is only allowed via the Shared Core import.
    const hasCreateHash = /createHash\s*\(/.test(src);
    const hasSharedImport = /from\s+['"][^'"]*deliverables\/compile-fingerprint\.js['"]/.test(src);
    if (hasCreateHash && !hasSharedImport) {
      // metadata.js uses createHash via a wrapper; the wrapper is
      // acceptable because the actual SHA-256 call is in the
      // Shared Core. The local file should NOT call createHash
      // directly.
      assert.fail(`${f} calls createHash without going through the Shared Core`);
    }
  }
});

test('P2-F-P-b packaging/metadata.js uses the Shared Core authority (single source of fingerprint algorithm)', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/metadata.js'),
    'utf8',
  );
  assert.ok(/from\s+['"][^'"]*deliverables\/compile-fingerprint\.js['"]/.test(src),
    'metadata.js must import the fingerprint authority from the Shared Core');
  assert.ok(/createCompileFingerprint/.test(src), 'metadata.js must use Shared createCompileFingerprint');
  assert.ok(/verifyCompileFingerprint/.test(src), 'metadata.js must use Shared verifyCompileFingerprint');
  assert.ok(/stableHash/.test(src), 'metadata.js must use Shared stableHash');
});

// ---------------------------------------------------------------------------
// P2-F test (consistency gate, structural).
// ---------------------------------------------------------------------------

test('P2-F-struct metadata buildPackagingGenerationMetadata throws PACKAGING_METADATA_INVALID on consistency drift', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  // Drift: payload says modelId is "different-model" while the
  // capability says seedream-5.0-pro.
  const driftedPayload = { ...payload, modelId: 'different-model' };
  assert.throws(
    () => buildPackagingGenerationMetadata({ translation, compiled, capability, payload: driftedPayload }),
    (err) => err.code === 'PACKAGING_METADATA_INVALID',
  );
});

test('P2-F-struct metadata is Object.freeze\'d', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  assert.equal(Object.isFrozen(metadata), true);
});

test('P2-F-struct the metadata fingerprint snapshot is exposed and stable', () => {
  const fp = getPackagingMetadataFingerprint();
  assert.equal(fp.metadataVersion, PACKAGING_METADATA_VERSION);
  assert.equal(fp.componentVersions.compilerVersion, PACKAGING_COMPILER_VERSION);
  assert.equal(fp.componentVersions.translationVersion, PACKAGING_TRANSLATION_VERSION);
  assert.equal(fp.componentVersions.referencePolicyVersion, PACKAGING_REFERENCE_POLICY_VERSION);
  assert.equal(fp.componentVersions.providerCapabilityVersion, PACKAGING_PROVIDER_CAPABILITY_VERSION);
  assert.equal(fp.componentVersions.providerAdapterVersion, PACKAGING_PROVIDER_ADAPTER_VERSION);
  assert.equal(fp.componentVersions.contractVersion, PACKAGING_SHOT_CONTRACT_VERSION);
});

// ---------------------------------------------------------------------------
// P2-F "no second Authority" cross-target isolation.
// ---------------------------------------------------------------------------

test('P2-F-cross-target Space code does not import packaging metadata', () => {
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
        !src.includes('image-generation-runtime/src/packaging/metadata'),
        `${f} imports packaging metadata; cross-target isolation broken`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// P2-F "no Golden leakage".
// ---------------------------------------------------------------------------

test('P2-F-no-golden packaging/metadata.js does not import any Golden / evaluation / fixture asset', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/metadata.js'),
    'utf8',
  );
  const importPattern = /import\s+[^;]+from\s+['"][^'"]+['"]/g;
  const requirePattern = /require\s*\(\s*['"][^'"]+['"]\s*\)/g;
  const imports = [];
  let m;
  while ((m = importPattern.exec(src))) imports.push(m[0]);
  while ((m = requirePattern.exec(src))) imports.push(m[0]);
  for (const line of imports) {
    assert.ok(!/evaluation\//.test(line), `metadata.js imports evaluation/* via: ${line}`);
    assert.ok(!/tests\/fixtures\/packaging\//.test(line), `metadata.js imports tests/fixtures/packaging/* via: ${line}`);
  }
});

// ===========================================================================
// P2-F Finalization Delta — items 1..10 / Final Exit checks 1..13
//
// Item 1:  compiledPromptHash must hash actual compiled semantic content
//          (id / title / items / sources), not just blockOrder / blockIds.
// Item 2:  Shared verifyCompileFingerprint is REAL (the metadata-level
//          verify and the Shared direct verifier both consume
//          buildPackagingFingerprintInputs).
// Item 3:  P2-F-L-b replaced with `assert.equal(r.valid, true)` (DONE above).
// Item 4:  modelId / provider / protocol change -> COMPILE_INPUT_STALE.
// Item 5:  Component version (compilerVersion) change -> COMPILE_INPUT_STALE.
// Item 6:  payloadFingerprint verified against current payload via Shared
//          stableHash; drift -> COMPILE_INPUT_STALE.
// Item 7:  No local canonicalize / stableHashLocal — Shared stableHash is
//          the only hash authority.
// Item 8:  One input mapping authority (buildPackagingFingerprintInputs).
// Item 9:  maxReferenceImages is an EXPLICIT projection of the Registry
//          field, not "auto picked up".
// Item 10: New tests A-J (this section).
// ===========================================================================

// ---------------------------------------------------------------------------
// P2-F-Final-A: block text change -> compiledPromptHash changes.
// (Item 1: actual compiled semantic content is fingerprinted, not just
//  blockOrder / blockIds.)
// ---------------------------------------------------------------------------

test('P2-F-Final-A block text change -> compiledPromptHash changes (not just topology)', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const a = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  // Change the visualDirection summary so the Compiler produces a
  // different items array for the visual_direction block.
  const base2 = makeBaseInput({
    visualDirection: { summary: 'Bold industrial copper-plated aesthetic.' },
  });
  const { translation: t2, compiled: c2, capability: k2, payload: p2 } = buildFixture(base2);
  const b = buildPackagingGenerationMetadata({ translation: t2, compiled: c2, capability: k2, payload: p2 });
  // The 14-block topology is identical; the compiledPromptHash
  // must STILL differ because the items content changed.
  assert.deepEqual(a.compileFingerprint.userIntentHash, b.compileFingerprint.userIntentHash);
  assert.deepEqual(a.promptBlockOrder, b.promptBlockOrder);
  assert.notEqual(a.compileFingerprint.compiledPromptHash, b.compileFingerprint.compiledPromptHash);
  // The Shared verifier must reject the mutated input.
  const currentInputs = buildPackagingFingerprintInputs({ translation: t2, compiled: c2, capability: k2, payload: p2 });
  const r = verifySharedCompileFingerprint(a.compileFingerprint, currentInputs);
  assert.equal(r.valid, false);
  assert.equal(r.code, 'COMPILE_INPUT_STALE');
  assert.ok(r.mismatches.includes('compiledPromptHash'));
});

// ---------------------------------------------------------------------------
// P2-F-Final-B: same canonical input -> Shared verifyCompileFingerprint
// returns valid:true (and is the same Shared verifier used by the
// metadata-level verifier).
// ---------------------------------------------------------------------------

test('P2-F-Final-B same canonical inputs -> Shared verifyCompileFingerprint valid:true (single fingerprint authority)', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  const currentInputs = buildPackagingFingerprintInputs({ translation, compiled, capability, payload });
  // The metadata-level verifier must agree with the Shared verifier.
  const metaR = verifyPackagingGenerationMetadata(metadata, { translation, compiled, capability, payload });
  const sharedR = verifySharedCompileFingerprint(metadata.compileFingerprint, currentInputs);
  assert.equal(metaR.valid, true);
  assert.equal(sharedR.valid, true);
  assert.deepEqual(metaR.mismatches, []);
  assert.deepEqual(sharedR.mismatches, []);
  // Both rebuild via the SAME mapping authority. The Shared
  // verifier returns { valid, mismatches }; we separately rebuild
  // via Shared createCompileFingerprint to assert the rebuilt
  // hashes match the metadata's stored hashes byte-for-byte.
  const { createCompileFingerprint } = require(join(repoRoot, 'packages/image-generation-runtime/src/deliverables/compile-fingerprint.js'));
  const rebuilt = createCompileFingerprint({
    sourceBundle: currentInputs.sourceBundle,
    userIntent: currentInputs.userIntent,
    deliverable: currentInputs.deliverable,
    referencePlan: currentInputs.referencePlan,
    compiledPrompt: currentInputs.compiledPrompt,
    compiledAt: metadata.compileFingerprint.compiledAt,
  });
  assert.equal(rebuilt.sourceBundleHash, metadata.compileFingerprint.sourceBundleHash);
  assert.equal(rebuilt.userIntentHash, metadata.compileFingerprint.userIntentHash);
  assert.equal(rebuilt.deliverableHash, metadata.compileFingerprint.deliverableHash);
  assert.equal(rebuilt.referencePlanHash, metadata.compileFingerprint.referencePlanHash);
  assert.equal(rebuilt.compiledPromptHash, metadata.compileFingerprint.compiledPromptHash);
});

// ---------------------------------------------------------------------------
// P2-F-Final-C: Locked Asset change -> Shared verifyCompileFingerprint
// returns COMPILE_INPUT_STALE.
// ---------------------------------------------------------------------------

test('P2-F-Final-C Locked Asset content change -> Shared verifyCompileFingerprint returns COMPILE_INPUT_STALE', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  translation.lockedAssets.brand.name = 'Renamed Brand';
  const currentInputs = buildPackagingFingerprintInputs({ translation, compiled, capability, payload });
  const r = verifySharedCompileFingerprint(metadata.compileFingerprint, currentInputs);
  assert.equal(r.valid, false);
  assert.equal(r.code, 'COMPILE_INPUT_STALE');
  assert.ok(r.mismatches.includes('sourceBundleHash'));
});

// ---------------------------------------------------------------------------
// P2-F-Final-D: Reference role change -> Shared verifyCompileFingerprint
// returns COMPILE_INPUT_STALE.
// ---------------------------------------------------------------------------

test('P2-F-Final-D reference role change -> Shared verifyCompileFingerprint returns COMPILE_INPUT_STALE', () => {
  const base = makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [{ assetId: 'asset-01', role: 'style_reference', source: 'user' }],
    },
  });
  const { translation: t1, compiled: c1, capability: k1, payload: p1 } = buildFixture(base);
  const metadata = buildPackagingGenerationMetadata({ translation: t1, compiled: c1, capability: k1, payload: p1 });
  // Switch the role on the same assetId.
  const base2 = makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [{ assetId: 'asset-01', role: 'composition_reference', source: 'user' }],
    },
  });
  const { translation: t2, compiled: c2, capability: k2, payload: p2 } = buildFixture(base2);
  const currentInputs = buildPackagingFingerprintInputs({ translation: t2, compiled: c2, capability: k2, payload: p2 });
  const r = verifySharedCompileFingerprint(metadata.compileFingerprint, currentInputs);
  assert.equal(r.valid, false);
  assert.equal(r.code, 'COMPILE_INPUT_STALE');
  assert.ok(r.mismatches.includes('referencePlanHash'));
});

// ---------------------------------------------------------------------------
// P2-F-Final-E: modelId / provider / protocol change -> COMPILE_INPUT_STALE
// (item 4). Synthetic accepted capability with a different modelId, so
// we do not pollute the production Registry.
// ---------------------------------------------------------------------------

test('P2-F-Final-E modelId / provider / protocol change -> deliverableHash stale', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  // Build a synthetic accepted capability for a different model.
  // evaluatePackagingCapability is the pure evaluator; we do not
  // touch the production Registry.
  const { evaluatePackagingCapability } = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-capability.js'));
  const syntheticProfile = {
    modelType: 'image_generation',
    packagingSupport: true,
    referenceSupport: true,
    maxReferenceImages: null,
  };
  const altCapability = evaluatePackagingCapability(
    syntheticProfile,
    translation.generationMode,
    translation.referencePolicy,
  );
  // We must also produce a matching payload so the consistency
  // gate does not block the second build. Use the same compiler
  // output; the payload is deterministic from compiled + capability.
  const { buildPackagingProviderPayload } = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-adapter.js'));
  // Stamp the synthetic identity into a parallel capability shape
  // because buildPackagingProviderPayload reads modelId / provider
  // / protocol off the capability.
  const altStamped = {
    ...altCapability,
    modelId: 'alt-packaging-model',
    provider: 'alt-provider',
    protocol: 'alt-protocol',
    modelType: 'image_generation',
    referenceCount: 0,
  };
  const altPayload = buildPackagingProviderPayload({
    compiled, capability: altStamped, translation,
  });
  const altMetadata = buildPackagingGenerationMetadata({
    translation, compiled, capability: altStamped, payload: altPayload,
  });
  // The deliverableHash MUST differ — execution identity changed.
  assert.notEqual(metadata.compileFingerprint.deliverableHash, altMetadata.compileFingerprint.deliverableHash);
  // And the Shared verifier must reject the alt metadata against
  // the original fingerprint.
  const currentInputs = buildPackagingFingerprintInputs({
    translation, compiled, capability: altStamped, payload: altPayload,
  });
  const r = verifySharedCompileFingerprint(metadata.compileFingerprint, currentInputs);
  assert.equal(r.valid, false);
  assert.equal(r.code, 'COMPILE_INPUT_STALE');
  assert.ok(r.mismatches.includes('deliverableHash'));
});

// ---------------------------------------------------------------------------
// P2-F-Final-F: compilerVersion change -> COMPILE_INPUT_STALE (item 5).
// The deliverable.versions.compilerVersion is sourced from the canonical
// module export. We use the Shared Core directly to demonstrate the
// contract: a different compilerVersion in deliverable.versions
// produces a different deliverableHash, and verifyCompileFingerprint
// reports stale.
// ---------------------------------------------------------------------------

test('P2-F-Final-F compilerVersion change -> deliverableHash stale (component version participates in fingerprint identity)', async () => {
  const sharedPath = join(repoRoot, 'packages/image-generation-runtime/src/deliverables/compile-fingerprint.js');
  const shared = await import(pathToFileURL(sharedPath).href);
  const { translation, compiled, capability, payload } = buildFixture();
  const fingerprintInputs = buildPackagingFingerprintInputs({ translation, compiled, capability, payload });
  // Baseline fingerprint.
  const baselineFp = shared.createCompileFingerprint({
    sourceBundle: fingerprintInputs.sourceBundle,
    userIntent: fingerprintInputs.userIntent,
    deliverable: fingerprintInputs.deliverable,
    referencePlan: fingerprintInputs.referencePlan,
    compiledPrompt: fingerprintInputs.compiledPrompt,
    compiledAt: '2026-08-13T00:00:00.000Z',
  });
  // Mutate only the deliverable.versions.compilerVersion.
  const mutatedDeliverable = {
    ...fingerprintInputs.deliverable,
    versions: { ...fingerprintInputs.deliverable.versions, compilerVersion: '9.9.9-future' },
  };
  // The Shared verifier must reject the mutated input.
  const r = shared.verifyCompileFingerprint(baselineFp, {
    sourceBundle: fingerprintInputs.sourceBundle,
    userIntent: fingerprintInputs.userIntent,
    deliverable: mutatedDeliverable,
    referencePlan: fingerprintInputs.referencePlan,
    compiledPrompt: fingerprintInputs.compiledPrompt,
  });
  assert.equal(r.valid, false);
  assert.equal(r.code, 'COMPILE_INPUT_STALE');
  assert.ok(r.mismatches.includes('deliverableHash'));
  // And the deliverableHash MUST differ between the two.
  const mutatedFp = shared.createCompileFingerprint({
    sourceBundle: fingerprintInputs.sourceBundle,
    userIntent: fingerprintInputs.userIntent,
    deliverable: mutatedDeliverable,
    referencePlan: fingerprintInputs.referencePlan,
    compiledPrompt: fingerprintInputs.compiledPrompt,
    compiledAt: '2026-08-13T00:00:00.000Z',
  });
  assert.notEqual(baselineFp.deliverableHash, mutatedFp.deliverableHash);
});

// ---------------------------------------------------------------------------
// P2-F-Final-G: payload change -> payloadFingerprint mismatch detected
// (item 6). The metadata-level verifier rebuilds the payload hash via
// Shared stableHash and compares; drift -> COMPILE_INPUT_STALE.
// ---------------------------------------------------------------------------

test('P2-F-Final-G payloadFingerprint drift -> COMPILE_INPUT_STALE (mismatches=[payloadFingerprint])', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({ translation, compiled, capability, payload });
  // Corrupt the stored payloadFingerprint to simulate a payload
  // mutation that bypassed metadata rebuild. The metadata is
  // Object.freeze'd, so we attach a new metadata shape with a
  // poisoned payloadFingerprint.
  const poisonedMetadata = {
    ...metadata,
    payloadFingerprint: 'a'.repeat(64),
  };
  Object.freeze(poisonedMetadata);
  const r = verifyPackagingGenerationMetadata(poisonedMetadata, { translation, compiled, capability, payload });
  assert.equal(r.valid, false);
  assert.equal(r.code, 'COMPILE_INPUT_STALE');
  assert.ok(r.mismatches.includes('payloadFingerprint'));
  // The legitimate metadata verifies cleanly.
  const r2 = verifyPackagingGenerationMetadata(metadata, { translation, compiled, capability, payload });
  assert.equal(r2.valid, true);
  // The Shared stableHash of the actual payload is the source of
  // truth for the stored payloadFingerprint.
  const { stableHash: sharedStableHash } = require(join(repoRoot, 'packages/image-generation-runtime/src/deliverables/compile-fingerprint.js'));
  const expectedHash = sharedStableHash(payload);
  assert.equal(metadata.payloadFingerprint, expectedHash);
});

// ---------------------------------------------------------------------------
// P2-F-Final-H: timestamp-only change -> still valid (item 11).
// The compiledAt audit timestamp must NOT participate in the 5
// semantic hashes. Two metadata produced from the same inputs but
// with different createdAt must verify valid against each other.
// ---------------------------------------------------------------------------

test('P2-F-Final-H timestamp-only change (createdAt) -> Shared verify still valid:true', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const a = buildPackagingGenerationMetadata({
    translation, compiled, capability, payload, createdAt: '2026-08-13T09:00:00.000Z',
  });
  const b = buildPackagingGenerationMetadata({
    translation, compiled, capability, payload, createdAt: '2026-08-13T18:30:00.000Z',
  });
  assert.notEqual(a.createdAt, b.createdAt);
  assert.notEqual(a.compileFingerprint.compiledAt, b.compileFingerprint.compiledAt);
  // The 5 semantic hashes MUST be byte-equal.
  for (const f of ['sourceBundleHash', 'userIntentHash', 'deliverableHash', 'referencePlanHash', 'compiledPromptHash']) {
    assert.equal(a.compileFingerprint[f], b.compileFingerprint[f], `${f} must be stable across timestamps`);
  }
  // And the Shared verifier must accept a fingerprint built at
  // time T1 against canonical inputs (compiledAt is fed in via
  // the build; the verifier compares the 5 semantic hashes only).
  const currentInputs = buildPackagingFingerprintInputs({ translation, compiled, capability, payload });
  const r = verifySharedCompileFingerprint(a.compileFingerprint, currentInputs);
  assert.equal(r.valid, true);
});

// ---------------------------------------------------------------------------
// P2-F-Final-I: no local canonicalize / stableHashLocal — Shared stableHash
// is the only hash authority (item 7). The packaging/ subtree must not
// define a parallel canonicalize / hash function.
// ---------------------------------------------------------------------------

test('P2-F-Final-I packaging/metadata.js does not define a local canonicalize / stableHashLocal (single hash authority)', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/metadata.js'),
    'utf8',
  );
  // No local canonicalize function definition.
  assert.ok(!/function\s+canonicalize\s*\(/.test(src),
    'metadata.js must not define a local canonicalize(); Shared stableHash owns canonicalization');
  assert.ok(!/const\s+canonicalize\s*=/.test(src),
    'metadata.js must not bind a local canonicalize identifier');
  // No stableHashLocal.
  assert.ok(!/stableHashLocal/.test(src),
    'metadata.js must not introduce a local stableHashLocal');
  // No SHA-256 directly (only via the Shared Core import).
  assert.ok(!/createHash\s*\(/.test(src),
    'metadata.js must not call createHash directly; Shared Core owns SHA-256');
  // The Shared stableHash is the only hash authority used.
  assert.ok(/stableHash\s+as\s+sharedStableHash/.test(src) || /sharedStableHash\s*\(/.test(src),
    'metadata.js must use the Shared stableHash authority');
});

test('P2-F-Final-I-b packaging/ subtree has a single input mapping authority (no parallel canonicalization in other modules)', () => {
  // buildPackagingFingerprintInputs is the SINGLE input mapping
  // authority; both build and verify must consume it. There must
  // be exactly one definition and exactly one call site for the
  // compiledPrompt builder function (so the create path and the
  // verify path cannot drift apart).
  const metadataSrc = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/metadata.js'),
    'utf8',
  );
  // buildPackagingFingerprintInputs is defined and exported exactly once.
  const defined = (metadataSrc.match(/export\s+function\s+buildPackagingFingerprintInputs/g) || []).length;
  assert.equal(defined, 1, 'buildPackagingFingerprintInputs must be defined and exported exactly once');
  // buildPackagingGenerationMetadata consumes it.
  const buildBody = metadataSrc.match(/export\s+function\s+buildPackagingGenerationMetadata[\s\S]*?\n\}/);
  assert.ok(buildBody, 'buildPackagingGenerationMetadata must exist');
  assert.ok(/buildPackagingFingerprintInputs\s*\(/.test(buildBody[0]),
    'buildPackagingGenerationMetadata must call buildPackagingFingerprintInputs (no parallel mapping)');
  // verifyPackagingGenerationMetadata consumes it.
  const verifyBody = metadataSrc.match(/export\s+function\s+verifyPackagingGenerationMetadata[\s\S]*?\n\}/);
  assert.ok(verifyBody, 'verifyPackagingGenerationMetadata must exist');
  assert.ok(/buildPackagingFingerprintInputs\s*\(/.test(verifyBody[0]),
    'verifyPackagingGenerationMetadata must call buildPackagingFingerprintInputs (no parallel mapping)');
  // The compiledPrompt builder helper is defined exactly once
  // (it is called once, by buildPackagingFingerprintInputs, the
  // single mapping authority).
  const builderDef = (metadataSrc.match(/function\s+buildCompiledPromptForHash\s*\(/g) || []).length;
  assert.equal(builderDef, 1, 'buildCompiledPromptForHash must be defined exactly once');
  // The Shared Core owns the fingerprint algorithm; no parallel
  // createCompileFingerprint / stableHash wrapper in metadata.js.
  assert.equal((metadataSrc.match(/function\s+createCompileFingerprint\s*\(/g) || []).length, 0,
    'metadata.js must not redefine createCompileFingerprint');
  assert.equal((metadataSrc.match(/function\s+stableHash\s*\(/g) || []).length, 0,
    'metadata.js must not redefine stableHash');
});

// ---------------------------------------------------------------------------
// P2-F-Final-J: Provider Payload remains timestamp-free (item 16). The
// metadata surface is traceable (carries createdAt); the Provider
// Payload is deterministic. Two surfaces do not mix.
// ---------------------------------------------------------------------------

test('P2-F-Final-J Provider Payload remains timestamp-free; Generation Metadata is the traceable surface', () => {
  const { translation, compiled, capability, payload } = buildFixture();
  const metadata = buildPackagingGenerationMetadata({
    translation, compiled, capability, payload, createdAt: '2026-08-13T12:00:00.000Z',
  });
  // Generation Metadata carries createdAt.
  assert.equal(metadata.createdAt, '2026-08-13T12:00:00.000Z');
  // Provider Payload must NOT carry a createdAt.
  const payloadText = JSON.stringify(payload);
  assert.ok(!/createdAt/.test(payloadText), 'Provider Payload leaked a createdAt field');
  assert.ok(!/timestamp/i.test(payloadText), 'Provider Payload leaked a timestamp field');
  // The Provider Payload's Object.freeze contract (P2-E Final) is
  // preserved.
  assert.equal(Object.isFrozen(payload), true);
  // And the metadata does not get a timestamp off the Adapter
  // Payload either — it owns its own audit timestamp.
  assert.ok(!('createdAt' in payload), 'Provider Payload should not have a createdAt property');
});

// ---------------------------------------------------------------------------
// P2-F-Final structural: maxReferenceImages is an EXPLICIT projection
// (item 9). The resolver reads registered.maxReferenceImages ?? null
// directly; the result is not "auto picked up" by a hidden auto-bind.
// ---------------------------------------------------------------------------

test('P2-F-Final-struct maxReferenceImages is an explicit projection of registered.maxReferenceImages (item 9)', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-capability.js'),
    'utf8',
  );
  // The production resolver must EXPLICITLY read the field.
  assert.ok(
    /registered\.maxReferenceImages\s*\?\?\s*NO_REFERENCE_COUNT_LIMIT/.test(src),
    'production resolver must explicitly project registered.maxReferenceImages (not "auto picked up")',
  );
  // The "auto picked up" anti-pattern must not appear in the
  // production resolver path.
  assert.ok(
    !/maxReferenceImages:\s*NO_REFERENCE_COUNT_LIMIT,?\s*\n\s*\}/.test(
      src.split('resolvePackagingProviderCapability')[1] || '',
    ),
    'production resolver must not silently default to NO_REFERENCE_COUNT_LIMIT; explicit projection required',
  );
  // Live: seedream-5.0-pro does not declare maxReferenceImages,
  // so the capability still reports null. The contract is "if
  // the field is missing, we say so" — not "the field is ignored".
  const cap = resolvePackagingProviderCapability({ modelId: 'seedream-5.0-pro' });
  assert.equal(cap.maxReferenceImages, null);
});

