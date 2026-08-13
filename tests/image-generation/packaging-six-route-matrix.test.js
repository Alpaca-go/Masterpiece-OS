// P2-H — Six-Route Integration Matrix.
//
// P2-H is the production-preparation matrix proof for Packaging V1:
//   2 generation modes (analysis_led | reference_first)
//   ×
//   3 Shot Contracts (PKG-HERO-SINGLE | PKG-SERIES-GROUP | PKG-GIFT-OPEN)
//   = 6 canonical production preparation routes.
//
// All 6 routes MUST reach `preparePackagingGeneration(input)` and
// return a frozen, secret-free, deterministic prepared object. The
// matrix verifies:
//
//   - exact 14-block order across all 6 routes
//   - 3 Shot Contract identities remain distinct
//   - 2 generationMode identities remain distinct
//   - explicit Reference identity (assetId / role / source) is
//     preserved from translation -> payload -> metadata
//   - analysis_led routes accept references=[] without
//     falling back to Golden / project image / implicit Reference
//   - reference_first routes with references=[] fail closed
//     (REFERENCE_REQUIRED) — no implicit fallback
//   - 5 semantic hashes (sourceBundleHash / userIntentHash /
//     deliverableHash / referencePlanHash / compiledPromptHash)
//     are deterministic for the same input under a fixed `now`
//   - Shot Contract change affects userIntentHash /
//     deliverableHash / compiledPromptHash
//   - Reference change affects referencePlanHash
//   - Locked Asset truth is stable across all 6 routes
//   - Provider capability gate, Adapter Payload, Metadata /
//     Fingerprint layers are all traversed
//   - no Golden runtime dependency
//   - no Space compiler dependency
//   - no real Provider call
//
// P2-H is a TEST-ONLY phase. It does not modify any production
// module / constant. The test file is the only deliverable.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const require = createRequire(import.meta.url);

const {
  PACKAGING_GENERATION_SERVICE_VERSION,
  preparePackagingGeneration,
  getPackagingGenerationServiceFingerprint,
} = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/generation-service.js'));

const { PACKAGING_PROMPT_BLOCKS } = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/compiler.js'));

const { PACKAGING_SHOT_CONTRACT_IDS } = require(join(repoRoot, 'packages/image-generation-runtime/src/packaging/contracts.js'));

// -----------------------------------------------------------------------
// Frozen 14-block order (P2 spec §19).
//
// Per P2-H Finalization Delta item 1, this is an INDEPENDENT
// test-side literal. We do NOT derive it from
// `PACKAGING_PROMPT_BLOCKS.map(...)` — that would be a
// self-referential witness (a test that derives its expected value
// from the production constant cannot catch a drift where both
// the production and the test agree on the wrong value).
//
// Instead the test asserts BOTH:
//   1. The independent test-side literal deepEquals the
//      production `PACKAGING_PROMPT_BLOCKS` (so any future
//      reordering of the production constant is caught here).
//   2. The independent test-side literal deepEquals the compiled
//      `blockOrder` of every route (so any per-route drift is
//      also caught).
// -----------------------------------------------------------------------
const FROZEN_BLOCK_ORDER = Object.freeze([
  'task',
  'product_package_identity',
  'shot_contract',
  'structural_requirements',
  'locked_assets',
  'visual_direction',
  'color_system',
  'motif_graphic_language',
  'material_system',
  'reference_boundary',
  'composition_camera',
  'lighting',
  'rendering_requirements',
  'negative_constraints',
]);

// P2-H Finalization Delta item 1: pin the production constant to
// the independent literal so a future drift surfaces here.
assert.deepEqual(
  PACKAGING_PROMPT_BLOCKS.map(([id]) => id),
  FROZEN_BLOCK_ORDER,
  'production PACKAGING_PROMPT_BLOCKS must match the independent P2 spec §19 14-block order',
);

// -----------------------------------------------------------------------
// Target-neutral inline fixture. Acme Botanicals is a synthetic
// project — no Golden / Jiuzhou / eval-case import. Six routes share
// the same base identity; per-route differences are limited to:
//   1. shotContract.id
//   2. generationMode
//   3. referencePolicy.references (reference_first only)
//
// Locked Asset truth is constant across all 6 routes so we can
// assert cross-route equality (P2-H §16).
// -----------------------------------------------------------------------
const BASE_PROJECT_IDENTITY = Object.freeze({
  brandName: 'Acme Botanicals',
  industry: 'Skincare',
  brandRole: 'premium botanical skincare',
  productIdentity: 'Acme Hydrating Serum 30ml',
});

const BASE_LOCKED_ASSETS = Object.freeze({
  brand: { name: 'Acme Botanicals' },
  logo: { usageMode: 'reserved', present: true },
  productIdentity: { name: 'Acme Hydrating Serum 30ml' },
  category: { name: 'premium skincare' },
  structure: { formFactor: 'cylindrical glass bottle with dropper' },
  mandatoryCopy: { items: ['30ml', '0.95 fl oz'] },
  confirmedComponents: { items: ['dropper', 'cap', 'bottle'] },
});

const BASE_STRUCTURE = Object.freeze({
  formFactor: 'cylindrical glass bottle with dropper',
  primaryPackage: 'glass dropper bottle',
  structuralFeatures: ['cylindrical body', 'screw cap', 'pipette dropper'],
});

const BASE_PROVIDER_HINTS = Object.freeze({
  aspectRatio: '1:1',
  imageSize: '2K',
  qualityProfile: 'high',
});

const BASE_PROVIDER_CAPABILITY = Object.freeze({
  referenceSupport: true,
  maxReferenceImages: 2,
});

// Reference role per shot (capability-named, no project literal).
// 3 distinct roles across 3 shots — covers the §6 ask to "let the
// matrix cover multiple legal roles" without writing the role
// selection into production code.
const REFERENCE_ROLE_BY_SHOT = Object.freeze({
  'PKG-HERO-SINGLE': 'product_identity_reference',
  'PKG-SERIES-GROUP': 'style_reference',
  'PKG-GIFT-OPEN': 'structure_reference',
});

// Reference assetId per shot (target-neutral synthetic id; no
// real filesystem path; not a Golden fixture).
const REFERENCE_ASSET_ID_BY_SHOT = Object.freeze({
  'PKG-HERO-SINGLE': 'ref-acme-hero-product-identity-01',
  'PKG-SERIES-GROUP': 'ref-acme-series-style-01',
  'PKG-GIFT-OPEN': 'ref-acme-open-structure-01',
});

const SHOT_IDS = PACKAGING_SHOT_CONTRACT_IDS;
const MODES = ['analysis_led', 'reference_first'];

// -----------------------------------------------------------------------
// makeRouteInput — single inline fixture builder.
// Per §3, all 6 routes enter through preparePackagingGeneration;
// we never hand-build a translation / payload / metadata object.
// -----------------------------------------------------------------------
function makeRouteInput({ mode, shotId, includeReference = false }) {
  const input = {
    generationMode: mode,
    shotContract: { id: shotId },
    modelId: 'seedream-5.0-pro',
    providerCapability: { ...BASE_PROVIDER_CAPABILITY },
    projectIdentity: { ...BASE_PROJECT_IDENTITY },
    lockedAssets: {
      brand: { name: BASE_LOCKED_ASSETS.brand.name },
      logo: {
        usageMode: BASE_LOCKED_ASSETS.logo.usageMode,
        present: BASE_LOCKED_ASSETS.logo.present,
      },
      productIdentity: { name: BASE_LOCKED_ASSETS.productIdentity.name },
      category: { name: BASE_LOCKED_ASSETS.category.name },
      structure: { formFactor: BASE_LOCKED_ASSETS.structure.formFactor },
      mandatoryCopy: { items: BASE_LOCKED_ASSETS.mandatoryCopy.items.slice() },
      confirmedComponents: { items: BASE_LOCKED_ASSETS.confirmedComponents.items.slice() },
    },
    structure: {
      formFactor: BASE_STRUCTURE.formFactor,
      primaryPackage: BASE_STRUCTURE.primaryPackage,
      structuralFeatures: BASE_STRUCTURE.structuralFeatures.slice(),
    },
    visualDirection: { summary: 'Calm botanical apothecary aesthetic.' },
    colorSystem: { base: ['soft warm white'], accent: ['sage green'] },
    motifSystem: { primary: ['leaf silhouette'] },
    materialSystem: { substrate: ['frosted glass'], craft: ['matte label'] },
    composition: { type: 'centered hero' },
    lighting: { intent: 'soft studio' },
    camera: { aspectRatio: '1:1' },
    sceneProgram: { type: 'studio' },
    providerHints: {
      aspectRatio: BASE_PROVIDER_HINTS.aspectRatio,
      imageSize: BASE_PROVIDER_HINTS.imageSize,
      qualityProfile: BASE_PROVIDER_HINTS.qualityProfile,
    },
  };
  if (includeReference) {
    input.referencePolicy = {
      enabled: true,
      required: true,
      references: [
        {
          assetId: REFERENCE_ASSET_ID_BY_SHOT[shotId],
          role: REFERENCE_ROLE_BY_SHOT[shotId],
          source: 'user',
        },
      ],
    };
  }
  return input;
}

// Fixed `now` seam (§12). `prepare` consumes `deps.now` only to
// populate `createdAt` and `compiledAt`; the 5 semantic hashes do
// not include timestamp. Keeping `now` fixed means we can assert
// byte-identical 5 hashes across two prepare calls on the same
// input — the canonical determinism contract.
const FIXED_NOW = '2026-08-13T00:00:00.000Z';
const FIXED_DEPS = Object.freeze({ now: () => FIXED_NOW });

function prepareOnce(input) {
  return preparePackagingGeneration(input, FIXED_DEPS);
}

// -----------------------------------------------------------------------
// §1 — Service-layer sanity: 6/6 routes all reach preparePackagingGeneration
// and return a frozen, secret-free, deterministic prepared object.
// -----------------------------------------------------------------------

test('P2-H matrix 6/6 — prepare returns the canonical prepared shape for every route', () => {
  const keys = [];
  for (const mode of MODES) {
    for (const shotId of SHOT_IDS) {
      const includeReference = mode === 'reference_first';
      const input = makeRouteInput({ mode, shotId, includeReference });
      const prepared = prepareOnce(input);
      // Service layer returned without throwing.
      assert.ok(prepared && typeof prepared === 'object', `${mode} × ${shotId}: prepared missing`);
      assert.equal(prepared.generationMode, undefined, 'prepared surface should not leak generationMode at top level (it lives on translation / metadata)');
      assert.equal(prepared.shotContractId, undefined, 'prepared surface should not leak shotContractId at top level');
      // Required prepared layers present.
      assert.ok(prepared.translation, 'translation missing');
      assert.ok(prepared.compiled, 'compiled missing');
      assert.ok(prepared.capability, 'capability missing');
      assert.ok(prepared.payload, 'payload missing');
      assert.ok(prepared.metadata, 'metadata missing');
      assert.equal(prepared.now, FIXED_NOW, 'now should mirror the fixed dep');
      // The Service-level `prepared` envelope is frozen. Sub-objects
      // (translation / compiled / capability / payload / metadata)
      // have their own freezing contracts and may freeze specific
      // inner arrays; we only assert the envelope here, not the
      // inner-object freezing (P2-A / P2-D / P2-E / P2-F have their
      // own contracts).
      assert.equal(Object.isFrozen(prepared), true, 'prepared envelope must be frozen');
      keys.push({ mode, shotId });
    }
  }
  // Cross-section accounting: 6 route keys, 3 shot IDs, 2 modes.
  assert.equal(keys.length, 6);
  assert.equal(new Set(keys.map((k) => k.shotId)).size, 3);
  assert.equal(new Set(keys.map((k) => k.mode)).size, 2);
});

// -----------------------------------------------------------------------
// §5 — analysis_led 3/3: references=[] passes, no implicit Reference
// fallback. Reference Policy must be disabled; referenceCount must
// be 0; no project / Golden / Anchor fallback injected.
// -----------------------------------------------------------------------

test('P2-H analysis_led × 3 — references=[] passes and Reference Policy is disabled', () => {
  for (const shotId of SHOT_IDS) {
    const prepared = prepareOnce(makeRouteInput({ mode: 'analysis_led', shotId, includeReference: false }));
    const t = prepared.translation;
    assert.equal(t.generationMode, 'analysis_led', `${shotId}: mode mismatch`);
    assert.equal(t.referencePolicy.enabled, false, `${shotId}: reference policy must be disabled in analysis_led`);
    assert.equal(t.referencePolicy.required, false, `${shotId}: reference policy must NOT be required in analysis_led`);
    assert.equal(t.referencePolicy.count, 0, `${shotId}: referenceCount must be 0`);
    assert.equal(Array.isArray(t.referencePolicy.references) && t.referencePolicy.references.length, 0, `${shotId}: references must be empty`);
    // Payload mirrors the disabled reference surface.
    assert.equal(prepared.payload.referenceCount, 0, `${shotId}: payload.referenceCount must be 0`);
    assert.equal(Array.isArray(prepared.payload.references) && prepared.payload.references.length, 0, `${shotId}: payload.references must be empty`);
    // Metadata mirrors the same.
    assert.equal(prepared.metadata.referenceCount, 0, `${shotId}: metadata.referenceCount must be 0`);
    assert.equal(Array.isArray(prepared.metadata.references) && prepared.metadata.references.length, 0, `${shotId}: metadata.references must be empty`);
    // No implicit fallback: capability.referenceCount = 0 means the
    // Provider did not pick up a hidden project asset.
    assert.equal(prepared.capability.referenceCount, 0, `${shotId}: capability.referenceCount must be 0 (no implicit fallback)`);
  }
});

// -----------------------------------------------------------------------
// §6 — reference_first 3/3: explicit Reference identity preserved
// from translation -> payload -> metadata (assetId, role, source).
// Capability gate accepts the route (Packaging model supports
// reference, count <= maxReferenceImages).
// -----------------------------------------------------------------------

test('P2-H reference_first × 3 — explicit Reference identity preserved end-to-end', () => {
  for (const shotId of SHOT_IDS) {
    const prepared = prepareOnce(makeRouteInput({ mode: 'reference_first', shotId, includeReference: true }));
    const t = prepared.translation;
    assert.equal(t.generationMode, 'reference_first', `${shotId}: mode mismatch`);
    assert.equal(t.referencePolicy.enabled, true, `${shotId}: reference policy must be enabled`);
    assert.equal(t.referencePolicy.required, true, `${shotId}: reference policy must be required`);
    assert.equal(t.referencePolicy.count, 1, `${shotId}: referenceCount must be 1`);
    const expectedAssetId = REFERENCE_ASSET_ID_BY_SHOT[shotId];
    const expectedRole = REFERENCE_ROLE_BY_SHOT[shotId];
    const ref = t.referencePolicy.references[0];
    assert.equal(ref.assetId, expectedAssetId, `${shotId}: translation reference assetId mismatch`);
    assert.equal(ref.role, expectedRole, `${shotId}: translation reference role mismatch`);
    assert.equal(ref.source, 'user', `${shotId}: translation reference source mismatch`);
    // payload mirrors identity.
    const payloadRef = prepared.payload.references[0];
    assert.equal(payloadRef.assetId, expectedAssetId, `${shotId}: payload reference assetId mismatch`);
    assert.equal(payloadRef.role, expectedRole, `${shotId}: payload reference role mismatch`);
    assert.equal(payloadRef.source, 'user', `${shotId}: payload reference source mismatch`);
    assert.equal(prepared.payload.referenceCount, 1, `${shotId}: payload.referenceCount must be 1`);
    // metadata mirrors identity.
    const metadataRef = prepared.metadata.references[0];
    assert.equal(metadataRef.assetId, expectedAssetId, `${shotId}: metadata reference assetId mismatch`);
    assert.equal(metadataRef.role, expectedRole, `${shotId}: metadata reference role mismatch`);
    assert.equal(metadataRef.source, 'user', `${shotId}: metadata reference source mismatch`);
    assert.equal(prepared.metadata.referenceCount, 1, `${shotId}: metadata.referenceCount must be 1`);
    // Capability gate accepted the route (Packaging model supports
    // reference, count <= maxReferenceImages). The accepted shape
    // carries `rejectionCode: null` (P2-E provider-capability
    // canonical surface), not `undefined`.
    assert.equal(prepared.capability.packagingSupport, true, `${shotId}: capability.packagingSupport must be true`);
    assert.equal(prepared.capability.referenceSupport, true, `${shotId}: capability.referenceSupport must be true`);
    assert.equal(prepared.capability.accepted, true, `${shotId}: capability must accept reference_first route`);
    assert.equal(prepared.capability.rejectionCode, null, `${shotId}: capability rejectionCode must be null on accept`);
  }
});

// -----------------------------------------------------------------------
// §7 — Explicit Reference only: reference_first + references=[] must
// fail closed (REFERENCE_REQUIRED) with NO fallback. No implicit
// Reference, no Golden / project asset / Anchor pick-up.
// -----------------------------------------------------------------------

test('P2-H reference_first + referencePolicy MISSING fails closed (Case A: REFERENCE_REQUIRED, no fallback)', () => {
  // Per P2-H Finalization Delta item 2 Case A: the upstream input
  // does not declare a `referencePolicy` block at all. The
  // Translation layer must still reject the route, proving the
  // P2-C / P2-E fail-closed invariant is NOT bypassed by leaving
  // referencePolicy absent.
  for (const shotId of SHOT_IDS) {
    const input = makeRouteInput({ mode: 'reference_first', shotId, includeReference: false });
    assert.equal(input.referencePolicy, undefined, `${shotId}: precondition — referencePolicy must be absent on the input`);
    let caught = null;
    try {
      prepareOnce(input);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, `${shotId}: prepare must throw when reference_first has no referencePolicy block`);
    assert.equal(caught.code, 'REFERENCE_REQUIRED', `${shotId}: must throw REFERENCE_REQUIRED; got ${caught.code}`);
    assert.match(caught.message, /REFERENCE_REQUIRED/u);
    // The compiled / payload / metadata surface was never built.
    assert.ok(!('translation' in (caught || {})), `${shotId}: translation must not be exposed on the error`);
  }
});

test('P2-H reference_first + references=[] fails closed (Case B: REFERENCE_REQUIRED, no fallback)', () => {
  // Per P2-H Finalization Delta item 2 Case B: the upstream input
  // declares an explicit `referencePolicy` block with the
  // canonical Reference-First shape but leaves `references: []`.
  // The Translation layer must still reject the route — the
  // Reference Policy authority is the single source of truth and
  // it does not invent a Reference from a Golden Anchor / project
  // image / role guess.
  for (const shotId of SHOT_IDS) {
    const input = makeRouteInput({ mode: 'reference_first', shotId, includeReference: false });
    // Inject the explicit empty referencePolicy block on top of
    // the base input (Case A leaves it undefined; Case B makes it
    // present but empty).
    input.referencePolicy = {
      enabled: true,
      required: true,
      references: [],
    };
    assert.ok(input.referencePolicy, `${shotId}: precondition — referencePolicy must be present`);
    assert.equal(input.referencePolicy.references.length, 0, `${shotId}: precondition — references must be empty`);
    let caught = null;
    try {
      prepareOnce(input);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, `${shotId}: prepare must throw when reference_first has empty references array`);
    assert.equal(caught.code, 'REFERENCE_REQUIRED', `${shotId}: must throw REFERENCE_REQUIRED; got ${caught.code}`);
    assert.match(caught.message, /REFERENCE_REQUIRED/u);
    // The compiled / payload / metadata surface was never built.
    assert.ok(!('translation' in (caught || {})), `${shotId}: translation must not be exposed on the error`);
  }
});

// -----------------------------------------------------------------------
// §8 — exact 14-block order across all 6 routes (deepEqual order).
// -----------------------------------------------------------------------

test('P2-H 14-block order 6/6 — every route keeps the canonical block order', () => {
  for (const mode of MODES) {
    for (const shotId of SHOT_IDS) {
      const includeReference = mode === 'reference_first';
      const prepared = prepareOnce(makeRouteInput({ mode, shotId, includeReference }));
      assert.equal(prepared.compiled.blockOrder.length, 14, `${mode} × ${shotId}: blockOrder length must be 14`);
      // deepEqual order (not just count).
      assert.deepEqual(prepared.compiled.blockOrder, FROZEN_BLOCK_ORDER, `${mode} × ${shotId}: blockOrder deepEqual mismatch`);
      // Per-block ids / titles / items presence sanity.
      for (let i = 0; i < prepared.compiled.blocks.length; i += 1) {
        const block = prepared.compiled.blocks[i];
        assert.equal(block.id, FROZEN_BLOCK_ORDER[i], `${mode} × ${shotId}: block[${i}].id mismatch`);
        assert.equal(typeof block.title, 'string', `${mode} × ${shotId}: block[${i}].title must be a string`);
        assert.ok(Array.isArray(block.items), `${mode} × ${shotId}: block[${i}].items must be an array`);
        assert.ok(Array.isArray(block.sources), `${mode} × ${shotId}: block[${i}].sources must be an array`);
      }
      // payload.promptBlockOrder mirrors compiled.blockOrder.
      assert.deepEqual(prepared.payload.promptBlockOrder, FROZEN_BLOCK_ORDER, `${mode} × ${shotId}: payload.promptBlockOrder deepEqual mismatch`);
      assert.equal(prepared.metadata.promptBlockCount, 14, `${mode} × ${shotId}: metadata.promptBlockCount must be 14`);
    }
  }
});

// -----------------------------------------------------------------------
// §9 — Shot identity correctness: 3 Shot Contract ids must remain
// distinct across all 6 routes. Each route must surface the same
// shotContractId on translation / compiled / metadata.
// -----------------------------------------------------------------------

test('P2-H Shot identity — 3 Shot Contract ids distinct; consistent across translation / compiled / metadata', () => {
  const byShot = new Map();
  for (const mode of MODES) {
    for (const shotId of SHOT_IDS) {
      const includeReference = mode === 'reference_first';
      const prepared = prepareOnce(makeRouteInput({ mode, shotId, includeReference }));
      assert.equal(prepared.translation.shotContract.id, shotId, `${mode} × ${shotId}: translation.shotContract.id mismatch`);
      assert.equal(prepared.compiled.shotContractId, shotId, `${mode} × ${shotId}: compiled.shotContractId mismatch`);
      assert.equal(prepared.metadata.shotContractId, shotId, `${mode} × ${shotId}: metadata.shotContractId mismatch`);
      // 3 distinct Shot IDs across the matrix.
      byShot.set(shotId, true);
    }
  }
  assert.equal(byShot.size, 3, 'matrix must preserve 3 distinct Shot Contract ids');
  assert.deepEqual([...byShot.keys()].sort(), [...SHOT_IDS].sort(), 'matrix Shot ids must equal PACKAGING_SHOT_CONTRACT_IDS');
});

// -----------------------------------------------------------------------
// §10 — Mode identity correctness: same Shot × different mode keeps
// the boundary. translation.generationMode / metadata.generationMode
// are different; referencePlanHash differs (Reference-First carries
// explicit assetId / role identity).
// -----------------------------------------------------------------------

test('P2-H Mode identity — same Shot different mode keeps boundary (mode field + referencePlanHash)', () => {
  for (const shotId of SHOT_IDS) {
    const analysisLed = prepareOnce(makeRouteInput({ mode: 'analysis_led', shotId, includeReference: false }));
    const referenceFirst = prepareOnce(makeRouteInput({ mode: 'reference_first', shotId, includeReference: true }));
    assert.equal(analysisLed.translation.generationMode, 'analysis_led', `${shotId}: analysis_led.generationMode`);
    assert.equal(referenceFirst.translation.generationMode, 'reference_first', `${shotId}: reference_first.generationMode`);
    assert.equal(analysisLed.metadata.generationMode, 'analysis_led', `${shotId}: analysis_led.metadata.generationMode`);
    assert.equal(referenceFirst.metadata.generationMode, 'reference_first', `${shotId}: reference_first.metadata.generationMode`);
    // The referencePlan hash is mode-aware: Reference-First carries
    // explicit assetId+role identity, Analysis-Led carries an empty
    // selected list.
    assert.notEqual(
      analysisLed.metadata.compileFingerprint.referencePlanHash,
      referenceFirst.metadata.compileFingerprint.referencePlanHash,
      `${shotId}: referencePlanHash must differ between analysis_led and reference_first`,
    );
  }
});

// -----------------------------------------------------------------------
// §11 — Shot fingerprint distinction: under the same generation mode,
// the 3 Shot Contracts must NOT collapse to the same semantic
// fingerprint. At least userIntentHash or deliverableHash must
// differ per shot.
// -----------------------------------------------------------------------

test('P2-H Shot fingerprint — same mode, 3 shots do not collapse; userIntent / deliverable hash sensitive to shot', () => {
  for (const mode of MODES) {
    const includeReference = mode === 'reference_first';
    const preparedByShot = SHOT_IDS.map((shotId) => prepareOnce(makeRouteInput({ mode, shotId, includeReference })));
    // 3 distinct userIntentHash under the same mode.
    const userIntentHashes = new Set(preparedByShot.map((p) => p.metadata.compileFingerprint.userIntentHash));
    assert.equal(userIntentHashes.size, 3, `${mode}: 3 shots must produce 3 distinct userIntentHash values; got ${userIntentHashes.size}`);
    // 3 distinct deliverableHash under the same mode.
    const deliverableHashes = new Set(preparedByShot.map((p) => p.metadata.compileFingerprint.deliverableHash));
    assert.equal(deliverableHashes.size, 3, `${mode}: 3 shots must produce 3 distinct deliverableHash values; got ${deliverableHashes.size}`);
    // 3 distinct compiledPromptHash (different shot contract
    // contents -> different compiled blocks).
    const compiledPromptHashes = new Set(preparedByShot.map((p) => p.metadata.compileFingerprint.compiledPromptHash));
    assert.equal(compiledPromptHashes.size, 3, `${mode}: 3 shots must produce 3 distinct compiledPromptHash values; got ${compiledPromptHashes.size}`);
  }
});

// -----------------------------------------------------------------------
// §12 — Determinism: same input under fixed `now` produces the
// same compiled blocks (deepEqual), the same payload.prompt (byte-
// identical string), the same payload.hints (deepEqual), and the
// same 5 semantic hashes. runId belongs to execute, not prepare.
// -----------------------------------------------------------------------

test('P2-H Determinism — same input + fixed now -> 5 hashes stable; compiled blocks deepEqual; payload.prompt identical', () => {
  for (const mode of MODES) {
    for (const shotId of SHOT_IDS) {
      const includeReference = mode === 'reference_first';
      const input = makeRouteInput({ mode, shotId, includeReference });
      const a = prepareOnce(input);
      const b = prepareOnce(input);
      // compiled blocks deepEqual (not just count).
      assert.deepEqual(a.compiled.blocks, b.compiled.blocks, `${mode} × ${shotId}: compiled.blocks must deepEqual`);
      assert.deepEqual(a.compiled.blockOrder, b.compiled.blockOrder, `${mode} × ${shotId}: compiled.blockOrder must deepEqual`);
      // payload.prompt is byte-identical (string === string).
      assert.strictEqual(a.payload.prompt, b.payload.prompt, `${mode} × ${shotId}: payload.prompt must be byte-identical`);
      assert.ok(a.payload.prompt.length > 0, `${mode} × ${shotId}: payload.prompt must be non-empty`);
      // payload.hints deepEqual.
      assert.deepEqual(a.payload.hints, b.payload.hints, `${mode} × ${shotId}: payload.hints must deepEqual`);
      // 5 semantic hashes all stable.
      const fields = ['sourceBundleHash', 'userIntentHash', 'deliverableHash', 'referencePlanHash', 'compiledPromptHash'];
      for (const f of fields) {
        assert.equal(
          a.metadata.compileFingerprint[f],
          b.metadata.compileFingerprint[f],
          `${mode} × ${shotId}: ${f} must be deterministic`,
        );
        assert.ok(a.metadata.compileFingerprint[f], `${mode} × ${shotId}: ${f} must be non-empty`);
      }
      // payloadFingerprint is also stable.
      assert.equal(a.metadata.payloadFingerprint, b.metadata.payloadFingerprint, `${mode} × ${shotId}: payloadFingerprint must be deterministic`);
    }
  }
});

// -----------------------------------------------------------------------
// §13 — Provider capability gate traversed. The Production
// resolver (not a synthetic-only evaluator) is used. The Packaging
// model `seedream-5.0-pro` is a real Registry entry. The capability
// surface reflects that registry, and analysis_led + reference_first
// both pass the gate when the route is well-formed.
// -----------------------------------------------------------------------

test('P2-H Provider capability gate — all 6 routes traverse the production resolver; gate accepts well-formed routes', () => {
  for (const mode of MODES) {
    for (const shotId of SHOT_IDS) {
      const includeReference = mode === 'reference_first';
      const prepared = prepareOnce(makeRouteInput({ mode, shotId, includeReference }));
      const cap = prepared.capability;
      // Production resolver result has the canonical shape.
      assert.equal(cap.modelId, 'seedream-5.0-pro', `${mode} × ${shotId}: capability.modelId must mirror Registry entry`);
      assert.equal(typeof cap.provider, 'string', `${mode} × ${shotId}: capability.provider must be a string`);
      assert.ok(cap.provider.length > 0, `${mode} × ${shotId}: capability.provider must be non-empty`);
      assert.equal(typeof cap.protocol, 'string', `${mode} × ${shotId}: capability.protocol must be a string`);
      assert.ok(cap.protocol.length > 0, `${mode} × ${shotId}: capability.protocol must be non-empty`);
      assert.equal(typeof cap.modelType, 'string', `${mode} × ${shotId}: capability.modelType must be a string`);
      // The Registry-backed Packaging capability is the one the
      // route was accepted against.
      assert.equal(cap.packagingSupport, true, `${mode} × ${shotId}: Packaging capability must be true for seedream-5.0-pro`);
      assert.equal(cap.referenceSupport, true, `${mode} × ${shotId}: reference support must be true for seedream-5.0-pro`);
      // Gate accepted. The accepted shape carries
      // `rejectionCode: null` (P2-E canonical surface), not
      // `undefined`.
      assert.equal(cap.accepted, true, `${mode} × ${shotId}: capability gate must accept well-formed route`);
      assert.equal(cap.rejectionCode, null, `${mode} × ${shotId}: capability rejectionCode must be null on accept`);
    }
  }
});

// -----------------------------------------------------------------------
// §14 — Provider Adapter Payload integrity. payload.target, prompt
// non-empty, promptBlockOrder === compiled.blockOrder, promptSourceMap
// complete, hints complete, references per mode.
// -----------------------------------------------------------------------

test('P2-H Provider Adapter Payload — 6/6 routes pass Adapter integrity', () => {
  for (const mode of MODES) {
    for (const shotId of SHOT_IDS) {
      const includeReference = mode === 'reference_first';
      const prepared = prepareOnce(makeRouteInput({ mode, shotId, includeReference }));
      const p = prepared.payload;
      // P2-H Finalization Delta item 5: payload.target is
      // 'packaging' for every canonical route. The Adapter
      // Payload is the Provider-side surface; surfacing the
      // target here means a downstream Provider that reads
      // `payload.target` (rather than re-deriving it from the
      // compiled / metadata surfaces) gets the same canonical
      // identity the rest of the matrix already exposes on
      // compiled.target / metadata.target.
      assert.equal(p.target, 'packaging', `${mode} × ${shotId}: payload.target must be 'packaging'`);
      // payload.modelId / provider / protocol mirror the capability
      // (P2-F consistency gate).
      assert.equal(p.modelId, prepared.capability.modelId, `${mode} × ${shotId}: payload.modelId must mirror capability.modelId`);
      assert.equal(p.provider, prepared.capability.provider, `${mode} × ${shotId}: payload.provider must mirror capability.provider`);
      assert.equal(p.protocol, prepared.capability.protocol, `${mode} × ${shotId}: payload.protocol must mirror capability.protocol`);
      // payload.hints carries the canonical fields.
      assert.equal(p.hints.aspectRatio, '1:1', `${mode} × ${shotId}: hints.aspectRatio`);
      assert.equal(p.hints.imageSize, '2K', `${mode} × ${shotId}: hints.imageSize`);
      assert.equal(p.hints.qualityProfile, 'high', `${mode} × ${shotId}: hints.qualityProfile`);
      assert.equal(typeof p.hints.referenceCount, 'number', `${mode} × ${shotId}: hints.referenceCount must be a number`);
      // prompt non-empty + promptBlockOrder matches compiled.
      assert.ok(typeof p.prompt === 'string' && p.prompt.length > 0, `${mode} × ${shotId}: payload.prompt must be non-empty string`);
      assert.deepEqual(p.promptBlockOrder, prepared.compiled.blockOrder, `${mode} × ${shotId}: payload.promptBlockOrder must match compiled.blockOrder`);
      // promptSourceMap has every block id.
      for (const blockId of FROZEN_BLOCK_ORDER) {
        assert.ok(Array.isArray(p.promptSourceMap[blockId]), `${mode} × ${shotId}: promptSourceMap.${blockId} must be an array`);
        assert.ok(p.promptSourceMap[blockId].length > 0, `${mode} × ${shotId}: promptSourceMap.${blockId} must be non-empty`);
      }
      // references per mode.
      if (mode === 'analysis_led') {
        assert.equal(p.references.length, 0, `${shotId}: analysis_led payload.references must be empty`);
      } else {
        assert.equal(p.references.length, 1, `${shotId}: reference_first payload.references must be 1`);
        assert.equal(p.references[0].assetId, REFERENCE_ASSET_ID_BY_SHOT[shotId], `${shotId}: payload reference assetId`);
        assert.equal(p.references[0].role, REFERENCE_ROLE_BY_SHOT[shotId], `${shotId}: payload reference role`);
      }
    }
  }
});

// -----------------------------------------------------------------------
// §15 — Metadata integrity: target/generationMode/shotContractId /
// componentVersions / providerModel / references / referenceCount /
// 5 hash + payloadFingerprint / promptBlockCount. No secret-like
// fields (apiKey / Authorization / absolute local path / temporary
// path).
// -----------------------------------------------------------------------

test('P2-H Metadata integrity — 6/6 routes expose canonical fields and no secret-like fields', () => {
  for (const mode of MODES) {
    for (const shotId of SHOT_IDS) {
      const includeReference = mode === 'reference_first';
      const prepared = prepareOnce(makeRouteInput({ mode, shotId, includeReference }));
      const m = prepared.metadata;
      assert.equal(m.target, 'packaging', `${mode} × ${shotId}: metadata.target must be packaging`);
      assert.equal(m.generationMode, mode, `${mode} × ${shotId}: metadata.generationMode`);
      assert.equal(m.shotContractId, shotId, `${mode} × ${shotId}: metadata.shotContractId`);
      // componentVersions: every P2-A..P2-F module has a version
      // surfaced on metadata.componentVersions (the canonical
      // COMPONENT_VERSION_MANIFEST from P2-F metadata.js). The
      // generation-service version lives on the service fingerprint
      // and is asserted separately in the §18 test below.
      assert.ok(m.componentVersions, `${mode} × ${shotId}: metadata.componentVersions must exist`);
      const requiredComponents = [
        'metadataVersion',
        'contractVersion',
        'translationVersion',
        'referencePolicyVersion',
        'compilerVersion',
        'providerCapabilityVersion',
        'providerAdapterVersion',
      ];
      for (const k of requiredComponents) {
        assert.equal(typeof m.componentVersions[k], 'string', `${mode} × ${shotId}: componentVersions.${k} must be a string`);
        assert.ok(m.componentVersions[k].length > 0, `${mode} × ${shotId}: componentVersions.${k} must be non-empty`);
      }
      // providerModel snapshot is present.
      assert.ok(m.providerModel, `${mode} × ${shotId}: metadata.providerModel must exist`);
      assert.equal(typeof m.providerModel.modelId, 'string', `${mode} × ${shotId}: providerModel.modelId must be a string`);
      // 5 hash + payloadFingerprint + promptBlockCount.
      for (const f of ['sourceBundleHash', 'userIntentHash', 'deliverableHash', 'referencePlanHash', 'compiledPromptHash']) {
        assert.ok(m.compileFingerprint[f], `${mode} × ${shotId}: compileFingerprint.${f} must be present`);
      }
      assert.ok(m.payloadFingerprint, `${mode} × ${shotId}: metadata.payloadFingerprint must be present`);
      assert.equal(m.promptBlockCount, 14, `${mode} × ${shotId}: metadata.promptBlockCount must be 14`);
      // references per mode.
      if (mode === 'analysis_led') {
        assert.equal(m.referenceCount, 0, `${shotId}: analysis_led metadata.referenceCount must be 0`);
        assert.equal(m.references.length, 0, `${shotId}: analysis_led metadata.references must be empty`);
      } else {
        assert.equal(m.referenceCount, 1, `${shotId}: reference_first metadata.referenceCount must be 1`);
        assert.equal(m.references[0].assetId, REFERENCE_ASSET_ID_BY_SHOT[shotId], `${shotId}: metadata reference assetId`);
        assert.equal(m.references[0].role, REFERENCE_ROLE_BY_SHOT[shotId], `${shotId}: metadata reference role`);
      }
      // Secret-safety scan: no apiKey / Authorization / Bearer /
      // absolute local path / temporary path. JSON.stringify must
      // not surface any of these.
      //
      // Per P2-H Finalization Delta item 4, the path-shape
      // checks must be whole-string (anywhere), not just at the
      // start, so that an absolute path embedded in a longer
      // string (e.g. as a sub-component of a larger value) is
      // still caught.
      const serialized = JSON.stringify(m);
      assert.doesNotMatch(serialized, /api[-_]?key/iu, `${mode} × ${shotId}: serialized metadata must not contain apiKey`);
      assert.doesNotMatch(serialized, /Authorization/iu, `${mode} × ${shotId}: serialized metadata must not contain Authorization`);
      assert.doesNotMatch(serialized, /Bearer\s/iu, `${mode} × ${shotId}: serialized metadata must not contain Bearer`);
      // Windows drive-letter absolute path: e.g. `C:\Users\...`,
      // `D:\foo\bar`, `E:/Users/...` (mixed slashes tolerated).
      // The check is whole-string so an absolute path embedded
      // mid-value is still caught.
      assert.doesNotMatch(serialized, /[A-Za-z]:[\\/]/u, `${mode} × ${shotId}: serialized metadata must not contain absolute Windows path (drive letter)`);
      // POSIX /tmp path: anywhere in the serialized form, not
      // only at the beginning. P2-H Finalization Delta item 4
      // replaced the leading-anchor `^/tmp/` with a whole-string
      // check.
      assert.doesNotMatch(serialized, /\/tmp\//u, `${mode} × ${shotId}: serialized metadata must not contain /tmp/ path`);
      // POSIX root-anchored absolute path: a leading `/` followed
      // by a non-slash character (so the literal `/tmp` is
      // covered by the previous check; this catches `/var/...`,
      // `/home/...`, `/etc/...`, etc.).
      assert.doesNotMatch(serialized, /\/(?:var|home|etc|opt|usr)\//u, `${mode} × ${shotId}: serialized metadata must not contain absolute POSIX system path`);
    }
  }
});

// -----------------------------------------------------------------------
// §16 — Locked Asset integrity: 6 routes share the same Locked Asset
// truth. Shot / mode change does NOT mutate Locked Assets.
// -----------------------------------------------------------------------

test('P2-H Locked Asset integrity — 6 routes share the same Locked Asset truth (cross-route equality)', () => {
  // Track the diagnostic context (mode + shotId) separately from
  // the equality shape, so a per-route Locked Asset mismatch
  // surfaces with context but the cross-route equality assertion
  // does not compare mode/shotId.
  const shapes = [];
  for (const mode of MODES) {
    for (const shotId of SHOT_IDS) {
      const includeReference = mode === 'reference_first';
      const prepared = prepareOnce(makeRouteInput({ mode, shotId, includeReference }));
      const la = prepared.translation.lockedAssets;
      shapes.push({
        ctx: { mode, shotId },
        shape: {
          brandName: la.brand.name,
          brandLocked: la.brand.locked,
          logoUsageMode: la.logo.usageMode,
          logoPresent: la.logo.present,
          logoLocked: la.logo.locked,
          productIdentityName: la.productIdentity.name,
          productIdentityLocked: la.productIdentity.locked,
          categoryName: la.category.name,
          categoryLocked: la.category.locked,
          structureFormFactor: la.structure.formFactor,
          structureLocked: la.structure.locked,
          mandatoryCopy: la.mandatoryCopy.items.slice().sort(),
          mandatoryCopyLocked: la.mandatoryCopy.locked,
          confirmedComponents: la.confirmedComponents.items.slice().sort(),
          confirmedComponentsLocked: la.confirmedComponents.locked,
        },
      });
    }
  }
  // 6 routes, 1 identical shape.
  const canonical = shapes[0].shape;
  for (const { ctx, shape } of shapes) {
    assert.deepEqual(shape, canonical, `Locked Asset shape must be stable across ${ctx.mode} × ${ctx.shotId}`);
  }
  // Every locked flag is true (P2-A fail-closed invariant).
  for (const { ctx, shape } of shapes) {
    for (const k of ['brandLocked', 'logoLocked', 'productIdentityLocked', 'categoryLocked', 'structureLocked', 'mandatoryCopyLocked', 'confirmedComponentsLocked']) {
      assert.equal(shape[k], true, `lockedAssets.${k} must be true for ${ctx.mode} × ${ctx.shotId}`);
    }
  }
});

// -----------------------------------------------------------------------
// §17 — Route distinctness matrix: test-side summary. 6 route keys
// unique; 3 Shot IDs preserved; 2 modes preserved. The matrix is a
// test memory artifact only — never persisted to production runtime.
// -----------------------------------------------------------------------

test('P2-H Route distinctness matrix — 6 unique route keys, 3 shot IDs, 2 modes', () => {
  const matrix = [];
  for (const mode of MODES) {
    for (const shotId of SHOT_IDS) {
      const includeReference = mode === 'reference_first';
      const prepared = prepareOnce(makeRouteInput({ mode, shotId, includeReference }));
      matrix.push({
        routeKey: `${mode}::${shotId}`,
        generationMode: mode,
        shotContractId: shotId,
        referenceCount: prepared.metadata.referenceCount,
        referenceRoles: prepared.metadata.references.map((r) => r.role).sort(),
        compiledPromptHash: prepared.metadata.compileFingerprint.compiledPromptHash,
        referencePlanHash: prepared.metadata.compileFingerprint.referencePlanHash,
        deliverableHash: prepared.metadata.compileFingerprint.deliverableHash,
      });
    }
  }
  // 6 unique route keys.
  assert.equal(matrix.length, 6);
  assert.equal(new Set(matrix.map((m) => m.routeKey)).size, 6);
  // 3 distinct shot IDs preserved.
  assert.equal(new Set(matrix.map((m) => m.shotContractId)).size, 3);
  // 2 distinct generation modes preserved.
  assert.equal(new Set(matrix.map((m) => m.generationMode)).size, 2);
  // 6 unique compiledPromptHash (no collapse — different shot
  // contracts produce different compiled blocks; different modes
  // produce different reference_boundary block content).
  assert.equal(new Set(matrix.map((m) => m.compiledPromptHash)).size, 6, 'every route must have a distinct compiledPromptHash');
  // referencePlanHash is mode-aware: 3 reference_first routes
  // carry distinct (assetId, role) identity; 3 analysis_led routes
  // share an empty referencePlan (no implicit Reference fallback).
  // Total distinct referencePlanHash = 4 (3 ref_first + 1
  // analysis_led).
  const referencePlanHashSet = new Set(matrix.map((m) => m.referencePlanHash));
  assert.equal(referencePlanHashSet.size, 4, `expected 4 distinct referencePlanHash (3 reference_first + 1 analysis_led); got ${referencePlanHashSet.size}`);
  // 6 unique deliverableHash (shotContractId + generationMode
  // both differ per route).
  assert.equal(new Set(matrix.map((m) => m.deliverableHash)).size, 6, 'every route must have a distinct deliverableHash');
  // reference roles across the matrix.
  const allRoles = new Set();
  for (const row of matrix) for (const role of row.referenceRoles) allRoles.add(role);
  assert.equal(allRoles.size, 3, 'matrix should cover 3 distinct reference roles (one per shot)');
  // Cross-check: analysis_led has referenceCount 0 + empty role list.
  for (const row of matrix) {
    if (row.generationMode === 'analysis_led') {
      assert.equal(row.referenceCount, 0);
      assert.equal(row.referenceRoles.length, 0);
    } else {
      assert.equal(row.referenceCount, 1);
      assert.equal(row.referenceRoles.length, 1);
    }
  }
});

// -----------------------------------------------------------------------
// §20/§21 — Cross-target / Golden boundary. P2-H tests do not
// import Space compiler, and do not load Golden runtime
// dependency. The test source itself does not import any evaluation
// / Golden module.
// -----------------------------------------------------------------------

test('P2-H Cross-target / Golden boundary — no Space / Golden runtime import', () => {
  // Per P2-H Finalization Delta item 3: scan the ENTIRE test
  // file, but extract only the string-literal module specifiers
  // from:
  //   - static `import` statements
  //   - dynamic `import(...)` expressions
  //   - CommonJS `require(...)` calls
  // Comments and prose are intentionally not part of the scan
  // surface — a doc-comment that mentions a forbidden module name
  // (e.g. a "do not import" warning) is exactly the kind of
  // false-positive this hardening prevents.
  const fs = require('node:fs');
  const testSource = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  // Capture the literal that follows `from` (static import),
  // `import(` (dynamic import), or `require(` (CJS). All three
  // forms take a single string-literal specifier; we deliberately
  // do NOT match the `assert { ... }` clause of import
  // attributes (the attribute keys are not module specifiers).
  const moduleSpecifierPattern = /(?:^|\n)\s*(?:import[^`"']*?from\s*|import\(\s*|require\(\s*)['"]([^'"]+)['"]/gu;
  const specifiers = [];
  for (const m of testSource.matchAll(moduleSpecifierPattern)) {
    specifiers.push(m[1]);
  }
  assert.ok(specifiers.length > 0, 'expected the test file to declare at least one module specifier');
  const specifierBlob = specifiers.join('\n');
  // Forbidden module-specifier patterns. Each pattern is the
  // substring that must NOT appear in any extracted module
  // specifier. Case-insensitive; path separators are
  // Windows- and POSIX-tolerant.
  const forbiddenPatterns = [
    { pattern: /space[\\/]+compiler/u, label: 'Space compiler' },
    { pattern: /evaluation[\\/]+/u, label: 'evaluation assets' },
    { pattern: /golden[-_]?(?:cases|fixtures|project|anchors?|evaluation)/iu, label: 'Golden fixtures' },
    { pattern: /九[州]|jiuzhou/iu, label: 'Jiuzhou / 九州' },
  ];
  for (const { pattern, label } of forbiddenPatterns) {
    assert.doesNotMatch(specifierBlob, pattern, `P2-H module specifiers must not pull in ${label}; offending specifiers: ${specifierBlob}`);
  }
});

// -----------------------------------------------------------------------
// §18 — No fake six-route success. The matrix reaches into
// `preparePackagingGeneration`; nothing is mocked away. The Service
// fingerprint exposes the real version, not a test-only stub.
// -----------------------------------------------------------------------

test('P2-H No fake success — matrix reaches real preparePackagingGeneration; service version is the published one', () => {
  // Service fingerprint exposes the real production service version.
  const fp = getPackagingGenerationServiceFingerprint();
  assert.ok(fp && typeof fp === 'object');
  assert.equal(fp.serviceVersion, PACKAGING_GENERATION_SERVICE_VERSION);
  // The matrix must use the same module — a quick sanity
  // invocation against every route must produce the same shape
  // independently of any test seam.
  for (const mode of MODES) {
    for (const shotId of SHOT_IDS) {
      const includeReference = mode === 'reference_first';
      // No `executor` / `downloadImpl` / `saveRun` seam provided
      // (P2-G Final item 5: defaults fail closed). We never call
      // `execute` in P2-H, so this is fine.
      const prepared = preparePackagingGeneration(
        makeRouteInput({ mode, shotId, includeReference }),
        FIXED_DEPS,
      );
      assert.equal(prepared.metadata.shotContractId, shotId);
    }
  }
});
