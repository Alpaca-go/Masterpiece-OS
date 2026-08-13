// P2-E tests — Provider Capability Adaptation (Packaging).
//
// Coverage map (per P2 spec §47 §52 P2-E Exit + the 10-case P2-E
// test plan A-J + P2-E Finalization Delta items 1-7):
//   A. seedream-5.0-pro + packaging capability + referenceSupport
//        -> accepted
//   B. analysis model (qwen3.6-plus) -> PROVIDER_CAPABILITY_MISMATCH
//   C. image model without packaging capability
//        -> PROVIDER_CAPABILITY_MISMATCH
//   D. Reference-First + referenceSupport=false -> REFERENCE_UNSUPPORTED
//        (real behavior test via the pure evaluator, not just a
//         constant assertion)
//   E. reference count > maxReferenceImages
//        -> PROVIDER_CAPABILITY_MISMATCH (real behavior test via
//           the pure evaluator)
//   F. Analysis-led without references + packaging supported
//        -> accepted
//   G. Provider adapter serialization is deterministic
//   H. Compiler remains provider-agnostic
//   I. no second provider registry
//   J. no Golden / project-specific capability rule
//
// P2-E Finalization Delta (data-closure contract):
//   1. payload.references is sourced from translation.referencePolicy.references
//      verbatim (no compiled-prompt reverse-engineering).
//   2. payload.promptSourceMap is the compiled.sourceMap object
//      preserved verbatim (blockId -> source[]).
//   3. payload.hints is sourced from translation.providerHints
//      verbatim (no compiled-prompt reverse-engineering).
//   4. capability maxReferenceImages has one authority: the
//      Model Registry. The production resolver does NOT accept
//      caller-supplied overrides. The pure evaluator
//      `evaluatePackagingCapability` accepts a synthetic profile
//      for tests.
//   5. REFERENCE_UNSUPPORTED is exercised via the pure evaluator
//      (D case above).
//   6. Adapter consistency gate: capability.referenceCount must
//      equal translation.referencePolicy.references.length.
//   7. Determinism: deepEqual payload across calls; no
//      timestamp / local path / temp path / UUID / secret in the
//      output shape.

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
  PACKAGING_PROVIDER_CAPABILITY_VERSION,
  PROVIDER_CAPABILITY_MISMATCH,
  REFERENCE_UNSUPPORTED,
  NO_REFERENCE_COUNT_LIMIT,
  resolvePackagingProviderCapability,
  evaluatePackagingCapability,
  validatePackagingProviderCapability,
  validateRegisteredModelProfile,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-capability.js'));

const {
  PACKAGING_PROVIDER_ADAPTER_VERSION,
  buildPackagingProviderPayload,
  flattenCompiledPromptToString,
  getPackagingProviderAdapterFingerprint,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-adapter.js'));

const {
  compilePackagingPrompt,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/compiler.js'));

const {
  createPackagingTranslation,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/translation.js'));

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
      logo: { usageMode: 'reserved' },
      productIdentity: { name: 'Acme Hydrating Serum 30ml' },
      category: { name: 'premium skincare' },
      structure: { formFactor: 'cylindrical glass bottle with dropper' },
    },
    structure: {
      formFactor: 'cylindrical glass bottle with dropper',
      primaryPackage: 'glass dropper bottle',
      structuralFeatures: ['cylindrical body', 'screw cap', 'pipette dropper'],
    },
    visualDirection: { summary: 'Calm botanical apothecary aesthetic.' },
    providerHints: {
      aspectRatio: '1:1',
      imageSize: '1024x1024',
      qualityProfile: 'high',
    },
    providerCapability: { referenceSupport: true, maxReferenceImages: 4 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// P2-E test A: seedream-5.0-pro is the only registered model with
// the packaging capability, and it carries referenceSupport. The
// Packaging production route accepts it.
// ---------------------------------------------------------------------------

test('P2-E-A seedream-5.0-pro (image_generation + packaging + referenceSupport) -> accepted', () => {
  const t = makeBaseInput();
  const r = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: t.generationMode,
    referencePolicy: t.referencePolicy,
  });
  assert.equal(r.accepted, true);
  assert.equal(r.rejectionCode, null);
  assert.equal(r.modelType, 'image_generation');
  assert.equal(r.packagingSupport, true);
  assert.equal(r.referenceSupport, true);
  assert.equal(r.modelId, 'seedream-5.0-pro');
  assert.equal(r.provider, 'volcengine');
  assert.equal(r.protocol, 'seedream-image');
  // Production resolver does not accept caller-supplied
  // maxReferenceImages overrides. The Registry is the only
  // authority; the Registry currently does not declare a
  // maxReferenceImages, so the resolver reports unbounded.
  assert.equal(r.maxReferenceImages, NO_REFERENCE_COUNT_LIMIT);
});

// ---------------------------------------------------------------------------
// P2-E test B: an analysis model is NEVER accepted.
// ---------------------------------------------------------------------------

test('P2-E-B qwen3.6-plus (analysis model) -> PROVIDER_CAPABILITY_MISMATCH (modelType preserved on rejected result)', () => {
  const t = makeBaseInput({ generationMode: 'analysis_led' });
  const r = resolvePackagingProviderCapability({
    modelId: 'qwen3.6-plus',
    generationMode: t.generationMode,
    referencePolicy: t.referencePolicy,
    providerCapability: t.providerCapability,
  });
  assert.equal(r.accepted, false);
  assert.equal(r.rejectionCode, PROVIDER_CAPABILITY_MISMATCH);
  // modelType is preserved on the rejected result so the caller
  // can diagnose (e.g. "this was an analysis model, not an
  // image_generation one").
  assert.equal(r.modelType, 'analysis');
  assert.equal(r.packagingSupport, false);
  assert.ok(r.issues.includes('model_type_not_image_generation'));
  assert.throws(
    () => validatePackagingProviderCapability({
      modelId: 'qwen3.6-plus',
      generationMode: t.generationMode,
      referencePolicy: t.referencePolicy,
      providerCapability: t.providerCapability,
    }),
    (err) => err.code === PROVIDER_CAPABILITY_MISMATCH,
  );
});

// ---------------------------------------------------------------------------
// P2-E test C: image_generation without packaging capability.
// ---------------------------------------------------------------------------

test('P2-E-C gpt-image-2 (image_generation but no packaging capability) -> PROVIDER_CAPABILITY_MISMATCH', () => {
  const t = makeBaseInput();
  const r = resolvePackagingProviderCapability({
    modelId: 'gpt-image-2',
    generationMode: t.generationMode,
    referencePolicy: t.referencePolicy,
    providerCapability: t.providerCapability,
  });
  assert.equal(r.accepted, false);
  assert.equal(r.rejectionCode, PROVIDER_CAPABILITY_MISMATCH);
  assert.equal(r.modelType, 'image_generation');
  assert.equal(r.packagingSupport, false);
  assert.ok(r.issues.includes('packaging_capability_not_declared'));
});

test('P2-E-C-b nano-banana and wan2.7-image-pro are also rejected (no packaging capability)', () => {
  const t = makeBaseInput();
  for (const id of ['nano-banana', 'wan2.7-image-pro']) {
    const r = resolvePackagingProviderCapability({
      modelId: id,
      generationMode: t.generationMode,
      referencePolicy: t.referencePolicy,
      providerCapability: t.providerCapability,
    });
    assert.equal(r.accepted, false, `${id} must be rejected by the Packaging capability gate`);
    assert.equal(r.rejectionCode, PROVIDER_CAPABILITY_MISMATCH);
  }
});

// ---------------------------------------------------------------------------
// P2-E test D: REFERENCE_UNSUPPORTED via the pure evaluator with a
// synthetic profile. The production resolver is NOT used here
// because no registered model today carries referenceSupport=false
// and adding a fake model to the production Registry is forbidden
// (P2-E constraint #10: no capability invention in production).
// ---------------------------------------------------------------------------

test('P2-E-D REFERENCE_UNSUPPORTED: real behavior via the pure evaluator (synthetic profile)', () => {
  // Synthetic resolved profile: image_generation + packaging=true +
  // referenceSupport=false. Reference-First on this profile
  // fails with REFERENCE_UNSUPPORTED.
  const r = evaluatePackagingCapability(
    { modelType: 'image_generation', packagingSupport: true, referenceSupport: false, maxReferenceImages: null },
    'reference_first',
    { enabled: true, required: true, references: [{ assetId: 'asset-x', role: 'style_reference' }] },
  );
  assert.equal(r.accepted, false);
  assert.equal(r.rejectionCode, REFERENCE_UNSUPPORTED);
  assert.ok(r.issues.includes('reference_unsupported_by_provider'));
  assert.equal(r.referenceCount, 1);
  // The synthetic profile evaluator does not surface a Registry
  // identity; the production resolver does (the pure evaluator is
  // for tests + future tooling that has its own profile).
  assert.equal(r.modelId, '');
});

test('P2-E-D-b REFERENCE_UNSUPPORTED is not raised in analysis_led mode (Reference is not required)', () => {
  // Analysis-led does not require Reference; the same profile
  // (image_generation + packaging=true + referenceSupport=false)
  // is accepted in analysis_led mode.
  const r = evaluatePackagingCapability(
    { modelType: 'image_generation', packagingSupport: true, referenceSupport: false, maxReferenceImages: null },
    'analysis_led',
    { enabled: false, required: false, references: [] },
  );
  assert.equal(r.accepted, true);
  assert.equal(r.referenceSupport, false);
});

// ---------------------------------------------------------------------------
// P2-E test E: reference count > maxReferenceImages via the pure
// evaluator. The production resolver does NOT accept caller
// maxReferenceImages overrides; the evaluator accepts a
// synthetic profile for the count-fit gate.
// ---------------------------------------------------------------------------

test('P2-E-E reference count > maxReferenceImages -> PROVIDER_CAPABILITY_MISMATCH (pure evaluator)', () => {
  const r = evaluatePackagingCapability(
    { modelType: 'image_generation', packagingSupport: true, referenceSupport: true, maxReferenceImages: 1 },
    'reference_first',
    {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-a', role: 'style_reference' },
        { assetId: 'asset-b', role: 'composition_reference' },
      ],
    },
  );
  assert.equal(r.accepted, false);
  assert.equal(r.rejectionCode, PROVIDER_CAPABILITY_MISMATCH);
  assert.ok(r.issues.includes('reference_count_exceeds_provider_capability'));
});

test('P2-E-E-b the Reference Policy layer also throws PROVIDER_CAPABILITY_MISMATCH (P2-E closes the P2-C placeholder)', () => {
  // The Translation shape carries a Translation that the
  // Reference Policy resolver rejects upstream of the
  // capability gate. The error code is
  // PROVIDER_CAPABILITY_MISMATCH (P2-C placeholder closed at P2-E).
  const t = makeBaseInput({
    generationMode: 'reference_first',
    providerCapability: { referenceSupport: true, maxReferenceImages: 1 },
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-a', role: 'style_reference' },
        { assetId: 'asset-b', role: 'composition_reference' },
      ],
    },
  });
  assert.throws(
    () => createPackagingTranslation(t),
    (err) => err.code === PROVIDER_CAPABILITY_MISMATCH,
  );
});

// ---------------------------------------------------------------------------
// P2-E test F: Analysis-led + packaging supported -> accepted.
// ---------------------------------------------------------------------------

test('P2-E-F Analysis-led without references + packaging supported -> accepted', () => {
  const t = makeBaseInput({
    generationMode: 'analysis_led',
    referencePolicy: { enabled: false, required: false, references: [] },
  });
  const r = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: t.generationMode,
    referencePolicy: t.referencePolicy,
  });
  assert.equal(r.accepted, true);
  assert.equal(r.referenceCount, 0);
  assert.equal(r.referenceSupport, true);
});

// ---------------------------------------------------------------------------
// P2-E test G: provider adapter serialization is deterministic.
// ---------------------------------------------------------------------------

test('P2-E-G-a flattenCompiledPromptToString is deterministic for the same compiled input', () => {
  const translation = createPackagingTranslation(makeBaseInput());
  const compiled = compilePackagingPrompt(translation);
  const a = flattenCompiledPromptToString(compiled);
  const b = flattenCompiledPromptToString(compiled);
  assert.equal(a, b);
});

test('P2-E-G-b the prompt string preserves all 14 block titles and boundaries', () => {
  const translation = createPackagingTranslation(makeBaseInput());
  const compiled = compilePackagingPrompt(translation);
  const prompt = flattenCompiledPromptToString(compiled);
  for (const b of compiled.blocks) {
    assert.ok(prompt.includes(`## ${b.title}`), `block title missing from prompt: ${b.title}`);
  }
});

test('P2-E-G-c the prompt string does not re-author content (canonical Translation surface preserved)', () => {
  const translation = createPackagingTranslation(makeBaseInput({
    referencePolicy: { enabled: false, required: false, references: [] },
  }));
  const compiled = compilePackagingPrompt(translation);
  const prompt = flattenCompiledPromptToString(compiled);
  const occurrences = (substr) => (prompt.match(new RegExp(substr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  assert.ok(occurrences('Acme Botanicals') >= 1, 'brand name must be present');
  assert.ok(occurrences('30ml') >= 1, 'mandatory copy must be present');
  for (const forbidden of ['九州', 'Jiuzhou', '珍珠白', 'pearl white', '65-70', '20-25', '5-10']) {
    assert.ok(!prompt.includes(forbidden), `prompt string contains forbidden Golden literal: ${forbidden}`);
  }
});

// ---------------------------------------------------------------------------
// P2-E Finalization Delta item 1: payload.references is sourced from
// translation.referencePolicy.references verbatim.
// ---------------------------------------------------------------------------

test('P2-E-Final-1a payload.references is the translation.referencePolicy.references array verbatim', () => {
  const translation = createPackagingTranslation(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-style-1', role: 'style_reference', source: 'user' },
        { assetId: 'asset-composition-1', role: 'composition_reference', source: 'user' },
        { assetId: 'asset-material-1', role: 'material_reference', source: 'project' },
      ],
    },
  }));
  const compiled = compilePackagingPrompt(translation);
  const capability = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  const payload = buildPackagingProviderPayload({ compiled, capability, translation });
  assert.equal(payload.references.length, 3);
  for (let i = 0; i < 3; i += 1) {
    const tRef = translation.referencePolicy.references[i];
    const pRef = payload.references[i];
    assert.equal(pRef.assetId, tRef.assetId, `references[${i}].assetId must match`);
    assert.equal(pRef.role, tRef.role, `references[${i}].role must match`);
    assert.equal(pRef.source, tRef.source, `references[${i}].source must match`);
  }
  // Order is preserved (no reordering).
  assert.deepEqual(
    payload.references.map((r) => r.assetId),
    ['asset-style-1', 'asset-composition-1', 'asset-material-1'],
  );
});

test('P2-E-Final-1b payload.references is empty (not invented) for analysis_led with no references', () => {
  const translation = createPackagingTranslation(makeBaseInput({
    generationMode: 'analysis_led',
    referencePolicy: { enabled: false, required: false, references: [] },
  }));
  const compiled = compilePackagingPrompt(translation);
  const capability = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  const payload = buildPackagingProviderPayload({ compiled, capability, translation });
  assert.equal(payload.references.length, 0);
});

test('P2-E-Final-1c the adapter does not infer references from the compiled prompt text', () => {
  // Pass a Translation whose referencePolicy is empty, but a
  // compiled prompt that mentions "Reference" many times. The
  // payload.references must be empty (the adapter does not
  // reverse-engineer references from prompt text).
  const translation = createPackagingTranslation(makeBaseInput({
    generationMode: 'analysis_led',
    referencePolicy: { enabled: false, required: false, references: [] },
  }));
  const compiled = compilePackagingPrompt(translation);
  // Sanity: the prompt has the reference_boundary block.
  const refBlock = compiled.blocks.find((b) => b.id === 'reference_boundary');
  assert.ok(refBlock);
  const capability = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  const payload = buildPackagingProviderPayload({ compiled, capability, translation });
  assert.equal(payload.references.length, 0, 'adapter must not infer references from compiled text');
});

// ---------------------------------------------------------------------------
// P2-E Finalization Delta item 2: payload.promptSourceMap is the
// compiled.sourceMap object preserved verbatim.
// ---------------------------------------------------------------------------

test('P2-E-Final-2a payload.promptSourceMap is an object (not an array) with all 14 block ids', () => {
  const translation = createPackagingTranslation(makeBaseInput());
  const compiled = compilePackagingPrompt(translation);
  const capability = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  const payload = buildPackagingProviderPayload({ compiled, capability, translation });
  assert.ok(payload.promptSourceMap && typeof payload.promptSourceMap === 'object' && !Array.isArray(payload.promptSourceMap),
    'payload.promptSourceMap must be an object, not an array');
  for (const b of compiled.blocks) {
    assert.ok(b.id in payload.promptSourceMap, `payload.promptSourceMap missing block id: ${b.id}`);
  }
});

test('P2-E-Final-2b payload.promptSourceMap is deepEqual to compiled.sourceMap (verbatim)', () => {
  const translation = createPackagingTranslation(makeBaseInput());
  const compiled = compilePackagingPrompt(translation);
  const capability = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  const payload = buildPackagingProviderPayload({ compiled, capability, translation });
  assert.deepEqual(payload.promptSourceMap, compiled.sourceMap);
});

// ---------------------------------------------------------------------------
// P2-E Finalization Delta item 3: payload.hints is sourced from
// translation.providerHints verbatim.
// ---------------------------------------------------------------------------

test('P2-E-Final-3a payload.hints reflects translation.providerHints verbatim', () => {
  // The Translation carries 2 explicit references; the
  // providerHints.referenceCount is derived from
  // referencePolicy.references.length (single authority, P2-C
  // pre-condition #3).
  const translation = createPackagingTranslation(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-style', role: 'style_reference' },
        { assetId: 'asset-composition', role: 'composition_reference' },
      ],
    },
    providerHints: {
      aspectRatio: '16:9',
      imageSize: '1920x1080',
      qualityProfile: 'high',
      referenceRolePriority: ['style_reference', 'composition_reference'],
    },
  }));
  const compiled = compilePackagingPrompt(translation);
  const capability = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  const payload = buildPackagingProviderPayload({ compiled, capability, translation });
  assert.equal(payload.hints.aspectRatio, '16:9');
  assert.equal(payload.hints.imageSize, '1920x1080');
  assert.equal(payload.hints.qualityProfile, 'high');
  assert.deepEqual(payload.hints.referenceRolePriority, ['style_reference', 'composition_reference']);
  // referenceCount is derived from references.length (P2-C
  // single authority).
  assert.equal(payload.hints.referenceCount, 2);
});

test('P2-E-Final-3b the adapter does not infer hints from the compiled prompt text', () => {
  // The providerHints aspect ratio appears in the prompt string
  // (via the rendering_requirements block), but the adapter must
  // NOT reverse-engineer it. The payload.hints is taken from
  // translation.providerHints.
  const translation = createPackagingTranslation(makeBaseInput({
    providerHints: { aspectRatio: '4:3', imageSize: '800x600', qualityProfile: 'low' },
  }));
  const compiled = compilePackagingPrompt(translation);
  const capability = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  const payload = buildPackagingProviderPayload({ compiled, capability, translation });
  // The prompt may mention "4:3" via the rendering_requirements
  // block, but the payload hints is the Translation surface.
  assert.equal(payload.hints.aspectRatio, '4:3');
  assert.equal(payload.hints.imageSize, '800x600');
  assert.equal(payload.hints.qualityProfile, 'low');
});

// ---------------------------------------------------------------------------
// P2-E Finalization Delta item 6: consistency gate.
// ---------------------------------------------------------------------------

test('P2-E-Final-6a the adapter throws PROVIDER_CAPABILITY_MISMATCH when capability.referenceCount != translation references length', () => {
  const translation = createPackagingTranslation(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [
        { assetId: 'asset-a', role: 'style_reference' },
        { assetId: 'asset-b', role: 'composition_reference' },
      ],
    },
  }));
  const compiled = compilePackagingPrompt(translation);
  const capability = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  // Simulate drift: change capability.referenceCount.
  const drifted = { ...capability, referenceCount: capability.referenceCount + 1 };
  assert.throws(
    () => buildPackagingProviderPayload({ compiled, capability: drifted, translation }),
    (err) => err.code === PROVIDER_CAPABILITY_MISMATCH,
  );
});

test('P2-E-Final-6b the consistency gate catches a references-empty drift in capability', () => {
  const translation = createPackagingTranslation(makeBaseInput({
    generationMode: 'reference_first',
    referencePolicy: {
      enabled: true,
      required: true,
      references: [{ assetId: 'asset-a', role: 'style_reference' }],
    },
  }));
  const compiled = compilePackagingPrompt(translation);
  const capability = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  // Drift: capability says count=0 but Translation has 1.
  const drifted = { ...capability, referenceCount: 0 };
  assert.throws(
    () => buildPackagingProviderPayload({ compiled, capability: drifted, translation }),
    (err) => err.code === PROVIDER_CAPABILITY_MISMATCH,
  );
});

// ---------------------------------------------------------------------------
// P2-E Finalization Delta item 7: determinism.
// ---------------------------------------------------------------------------

test('P2-E-Final-7a same (compiled, capability, translation) -> deepEqual payload', () => {
  const translation = createPackagingTranslation(makeBaseInput());
  const compiled = compilePackagingPrompt(translation);
  const capability = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  const a = buildPackagingProviderPayload({ compiled, capability, translation });
  const b = buildPackagingProviderPayload({ compiled, capability, translation });
  assert.deepEqual(a, b);
});

test('P2-E-Final-7b the payload contains no timestamp / local path / temp path / UUID / secret', () => {
  const translation = createPackagingTranslation(makeBaseInput());
  const compiled = compilePackagingPrompt(translation);
  const capability = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  const payload = buildPackagingProviderPayload({ compiled, capability, translation });
  const text = JSON.stringify(payload);
  for (const token of ['uuid', 'UUID', 'tmp/', 'temp/', 'createdAt', 'timestamp', 'Date(']) {
    assert.ok(!text.includes(token), `payload leaked a non-deterministic token: ${token}`);
  }
});

test('P2-E-Final-7c the payload is Object.freeze\'d (no downstream mutation)', () => {
  const translation = createPackagingTranslation(makeBaseInput());
  const compiled = compilePackagingPrompt(translation);
  const capability = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: translation.generationMode,
    referencePolicy: translation.referencePolicy,
  });
  const payload = buildPackagingProviderPayload({ compiled, capability, translation });
  assert.equal(Object.isFrozen(payload), true);
});

// ---------------------------------------------------------------------------
// Capability authority cleanup (P2-E Finalization Delta item 4).
// ---------------------------------------------------------------------------

test('P2-E-Final-4a the production resolver does NOT accept a caller-supplied maxReferenceImages override', () => {
  // The production resolver must consult the Registry (and the
  // Registry currently does not declare a maxReferenceImages).
  // A caller who passes maxReferenceImages in the input MUST be
  // ignored; the resolver reports NO_REFERENCE_COUNT_LIMIT.
  const r = resolvePackagingProviderCapability({
    modelId: 'seedream-5.0-pro',
    generationMode: 'analysis_led',
    referencePolicy: { enabled: false, required: false, references: [] },
    // Caller attempt to override:
    maxReferenceImages: 99,
  });
  assert.equal(r.maxReferenceImages, NO_REFERENCE_COUNT_LIMIT);
});

test('P2-E-Final-4b the production resolver is the single capability authority (no parallel resolver)', () => {
  // Subtree scan: provider-adapter.js does not import any
  // capability-authority data source. The adapter is a pure
  // consumer of (compiled, capability, translation).
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/provider-adapter.js'),
    'utf8',
  );
  const importPattern = /^import\s+[^;]+from\s+['"][^'"]+['"];?/gm;
  const requirePattern = /^const\s+.*=\s*require\(.*\);?/gm;
  const imports = [];
  let m;
  while ((m = importPattern.exec(src))) imports.push(m[0]);
  while ((m = requirePattern.exec(src))) imports.push(m[0]);
  for (const line of imports) {
    assert.ok(
      !/model-registry/.test(line) && !/seedream|gemini|openai|qwen|volcengine|ark/i.test(line),
      `provider-adapter.js has a forbidden second authority: ${line}`,
    );
  }
});

// ---------------------------------------------------------------------------
// P2-E capability structural (consolidated).
// ---------------------------------------------------------------------------

test('P2-E the capability result shape is stable and provider-agnostic', () => {
  const r = resolvePackagingProviderCapability({ modelId: 'seedream-5.0-pro' });
  const expectedKeys = [
    'schemaVersion', 'modelId', 'provider', 'protocol', 'modelType',
    'packagingSupport', 'referenceSupport', 'maxReferenceImages',
    'referenceCount', 'accepted', 'rejectionCode', 'rejectionReason', 'issues',
  ];
  for (const k of expectedKeys) {
    assert.ok(k in r, `capability result missing key: ${k}`);
  }
  for (const forbidden of ['httpPayload', 'request', 'seed', 'modelVersion', 'temperature', 'topP']) {
    assert.ok(!(forbidden in r), `capability shape leaked provider-specific field: ${forbidden}`);
  }
});

test('P2-E PROVIDER_CAPABILITY_MISMATCH is the canonical code (exported constant)', () => {
  assert.equal(PROVIDER_CAPABILITY_MISMATCH, 'PROVIDER_CAPABILITY_MISMATCH');
});

test('P2-E validateRegisteredModelProfile delegates to the existing model-registry (no second validator)', () => {
  const r = validateRegisteredModelProfile({
    modelId: 'seedream-5.0-pro',
    modelType: 'image_generation',
    protocol: 'seedream-image',
  });
  assert.ok(r);
  assert.equal(r.modelType, 'image_generation');
  assert.equal(r.registryModelId, 'seedream-5.0-pro');
  assert.ok(Array.isArray(r.capabilities) && r.capabilities.includes('packaging'));
});

// ---------------------------------------------------------------------------
// Cross-cutting guards.
// ---------------------------------------------------------------------------

test('P2-E the adapter does NOT make the actual provider call (only emits a skeleton)', () => {
  const dir = join(repoRoot, 'packages/image-generation-runtime/src/packaging');
  for (const f of readdirSync(dir)) {
    if (!/\.(js|ts|mjs)$/.test(f)) continue;
    const src = readFileSync(join(dir, f), 'utf8');
    assert.ok(
      !/fetch\s*\(/.test(src) && !/http\.request\s*\(/.test(src) && !/https\.request\s*\(/.test(src),
      `${f} makes a network call; the Packaging adapter must not`,
    );
  }
});

test('P2-E the adapter does not invent a second credential / retry / runtime stack', () => {
  const dir = join(repoRoot, 'packages/image-generation-runtime/src/packaging');
  for (const f of readdirSync(dir)) {
    if (!/\.(js|ts|mjs)$/.test(f)) continue;
    const src = readFileSync(join(dir, f), 'utf8');
    for (const forbidden of [
      'PackagingSeedreamClient',
      'PackagingRetryRuntime',
      'PackagingCredentialStore',
      'packaging/providers.json',
      'packaging-model-registry',
    ]) {
      assert.ok(!src.includes(forbidden), `${f} references a forbidden second-authority name: ${forbidden}`);
    }
  }
});

test('P2-E no second provider registry (subtree scan)', () => {
  const dir = join(repoRoot, 'packages/image-generation-runtime/src/packaging');
  for (const f of readdirSync(dir)) {
    if (!/\.(js|ts|mjs)$/.test(f)) continue;
    const src = readFileSync(join(dir, f), 'utf8');
    assert.ok(
      !/model-registry\/src\/(?!index\.js)/.test(src),
      `${f} reaches into model-registry internals; only the public surface is allowed`,
    );
    assert.ok(!/PACKAGING_PROVIDER_LIST/.test(src));
    assert.ok(!/packaging-model-registry/.test(src));
    assert.ok(!/packaging\/providers\.json/.test(src));
  }
});

test('P2-E no Golden / project-specific capability rule (subtree scan)', () => {
  const dir = join(repoRoot, 'packages/image-generation-runtime/src/packaging');
  for (const f of readdirSync(dir)) {
    if (!/\.(js|ts|mjs)$/.test(f)) continue;
    const src = readFileSync(join(dir, f), 'utf8');
    const forbidden = [
      '九州', 'Jiuzhou', '珍珠白', 'pearl white',
      '矿物紫', 'mineral purple', '石墨黑', '虹彩', 'iridescent',
      '羽眼', 'feather eye', '65-70', '20-25', '5-10',
    ];
    for (const needle of forbidden) {
      assert.ok(!src.includes(needle), `${f} contains forbidden Golden literal: ${needle}`);
    }
  }
});

test('P2-E Compiler remains provider-agnostic (smoke)', () => {
  const src = readFileSync(
    join(repoRoot, 'packages/image-generation-runtime/src/packaging/compiler.js'),
    'utf8',
  );
  assert.ok(!/image-generation-runtime\/src\/providers/.test(src));
  assert.ok(!/seedream|gemini|openai|qwen|volcengine|ark/i.test(src));
});

// ---------------------------------------------------------------------------
// Component version constants (smoke).
// ---------------------------------------------------------------------------

test('P2-E version constants are exposed', () => {
  assert.equal(PACKAGING_PROVIDER_CAPABILITY_VERSION, '1.0.0');
  assert.equal(PACKAGING_PROVIDER_ADAPTER_VERSION, '1.0.0');
  const fp = getPackagingProviderAdapterFingerprint();
  assert.equal(fp.schemaVersion, '1.0.0');
});
