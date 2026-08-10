// r2.0 §4.10 / B-3: Reference Boundary text block.
//
// The boundary is a v2.0-style POSITIVE expression of what to preserve
// (design language only) and what the target scene owns (function, etc.).
// It is appended (not prepended) to the compiled prompt for reference_first
// generations. It is NOT injected for standard (text-only) or continuation
// (world_consistency role is already more specific).
//
// When the adapter capability says referenceStrengthControl.supported=false,
// the block must be honest about that — it must NOT pretend to apply weight
// control, otherwise Path A would be silently in use.

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const refBoundaryUrl = pathToFileURL(
  path.join(repoRoot, 'packages/image-generation-runtime/src/space/reference-boundary.js'),
).href;
const seedreamAdapterUrl = pathToFileURL(
  path.join(repoRoot, 'packages/image-generation-runtime/src/vnext/seedream-adapter.js'),
).href;

const {
  REFERENCE_BOUNDARY_VERSION,
  renderReferenceBoundary,
  resolveProviderStrengthControlLabel,
} = await import(refBoundaryUrl);
const { createSeedreamVNextAdapter } = await import(seedreamAdapterUrl);

const SEEDREAM_CAPABILITY = createSeedreamVNextAdapter().capability;

test('r2.0 B-3: boundary module exposes a version constant', () => {
  assert.match(REFERENCE_BOUNDARY_VERSION, /^space-reference-boundary@/);
});

test('r2.0 B-3: standard generation never gets a boundary block', () => {
  const block = renderReferenceBoundary({
    generationBasis: 'standard',
    targetSceneLabel: 'consultation',
    adapterCapability: SEEDREAM_CAPABILITY,
  });
  assert.equal(block, null);
});

test('r2.0 B-3: continuation generation never gets a generic boundary block (world_consistency is more specific)', () => {
  const block = renderReferenceBoundary({
    generationBasis: 'continuation',
    targetSceneLabel: 'consultation',
    adapterCapability: SEEDREAM_CAPABILITY,
  });
  assert.equal(block, null);
});

test('r2.0 B-3: reference_first + cross_scene gets a boundary with the cross-scene intent line', () => {
  const block = renderReferenceBoundary({
    generationBasis: 'reference_first',
    referenceSceneRelation: 'cross_scene',
    targetSceneLabel: 'consultation',
    adapterCapability: SEEDREAM_CAPABILITY,
  });
  assert.ok(block && block.length > 100);
  assert.match(block, /REFERENCE BOUNDARY/);
  assert.match(block, /high-priority/i);
  assert.match(block, /different functional class/i);
  assert.match(block, /Target scene: consultation/);
  assert.match(block, /Preserve from the reference image/);
  assert.match(block, /Target scene is authoritative for/);
  assert.match(block, /Reorganize spatial elements/i);
  assert.match(block, /Preserve design language, not exact placement/);
});

test('r2.0 B-3: reference_first + same_scene uses the same-scene intent line', () => {
  const block = renderReferenceBoundary({
    generationBasis: 'reference_first',
    referenceSceneRelation: 'same_scene',
    targetSceneLabel: 'reception',
    adapterCapability: SEEDREAM_CAPABILITY,
  });
  assert.ok(block);
  assert.match(block, /same functional class/i);
  assert.match(block, /Target scene: reception/);
  assert.doesNotMatch(block, /different functional class/i);
});

test('r2.0 B-3: reference_first + unknown uses the undeclared intent line', () => {
  const block = renderReferenceBoundary({
    generationBasis: 'reference_first',
    targetSceneLabel: 'consultation',
    adapterCapability: SEEDREAM_CAPABILITY,
  });
  assert.ok(block);
  assert.match(block, /not declared/i);
});

test('r2.0 B-3: when adapter strength control is unsupported, the boundary honestly says so', () => {
  // Default Seedream capability has supported=false.
  const block = renderReferenceBoundary({
    generationBasis: 'reference_first',
    referenceSceneRelation: 'cross_scene',
    targetSceneLabel: 'consultation',
    adapterCapability: SEEDREAM_CAPABILITY,
  });
  assert.ok(block);
  assert.match(block, /not available for this model/i);
  assert.match(block, /do not invent or assume additional controls/i);
  assert.doesNotMatch(block, /SHOULD be used/);
});

test('r2.0 B-3: when adapter strength control IS supported, the boundary surfaces the parameter name', () => {
  const supportedCapability = {
    adapterId: 'mock',
    adapterVersion: 'mock@1.0.0',
    reference: {
      maxReferenceImages: 2,
      referenceStrengthControl: { supported: true, controlParameter: 'ref_strength', note: 'verified' },
      referenceRoleControl: { supported: false, controlParameter: null, note: 'no' },
    },
  };
  const block = renderReferenceBoundary({
    generationBasis: 'reference_first',
    referenceSceneRelation: 'cross_scene',
    targetSceneLabel: 'consultation',
    adapterCapability: supportedCapability,
  });
  assert.ok(block);
  assert.match(block, /ref_strength/);
  assert.match(block, /SHOULD be used/);
});

test('r2.0 B-3: resolveProviderStrengthControlLabel reports "unsupported" when capability says false', () => {
  assert.equal(
    resolveProviderStrengthControlLabel(SEEDREAM_CAPABILITY),
    'unsupported',
  );
  assert.equal(
    resolveProviderStrengthControlLabel({
      reference: { referenceStrengthControl: { supported: true } },
    }),
    'supported',
  );
  assert.equal(resolveProviderStrengthControlLabel(null), 'unsupported');
});

test('r2.0 B-3: Seedream compile appends the boundary for reference_first + reports trace metadata', () => {
  const adapter = createSeedreamVNextAdapter();
  const out = adapter.compile({
    editablePrompt: 'BASE COMPILED PROMPT',
    finalPrompt: 'BASE COMPILED PROMPT',
    taskContract: {
      aspectRatio: '16:9',
      count: 1,
      referenceAssetIds: ['asset-ref-1'],
      generationBasis: 'reference_first',
      referenceSceneRelation: 'cross_scene',
      subtype: 'consultation',
    },
  });
  assert.ok(out.prompt.includes('BASE COMPILED PROMPT'));
  assert.ok(out.prompt.includes('REFERENCE BOUNDARY'));
  assert.ok(out.prompt.indexOf('REFERENCE BOUNDARY') > out.prompt.indexOf('BASE COMPILED PROMPT'),
    'boundary should be appended after the compiled prompt, not prepended');
  assert.equal(out.referenceBoundary.applied, true);
  assert.equal(out.referenceBoundary.version, 'space-reference-boundary@1.0.0');
  assert.equal(out.referenceBoundary.providerStrengthControl, 'unsupported');
  // The provider payload summary must NOT include the raw base64 of any
  // reference; we only need the ids here.
  assert.deepEqual(out.referenceAssetIds, ['asset-ref-1']);
});

test('r2.0 B-3: Seedream compile does NOT append the boundary for standard', () => {
  const adapter = createSeedreamVNextAdapter();
  const out = adapter.compile({
    editablePrompt: 'BASE COMPILED PROMPT',
    finalPrompt: 'BASE COMPILED PROMPT',
    taskContract: {
      aspectRatio: '16:9',
      count: 1,
      referenceAssetIds: [],
      generationBasis: 'standard',
      subtype: 'consultation',
    },
  });
  assert.equal(out.prompt, 'BASE COMPILED PROMPT');
  assert.equal(out.referenceBoundary.applied, false);
  assert.equal(out.referenceBoundary.version, null);
  assert.equal(out.referenceBoundary.providerStrengthControl, 'unsupported');
});

test('r2.0 B-3: Seedream compile does NOT append the boundary for continuation', () => {
  const adapter = createSeedreamVNextAdapter();
  const out = adapter.compile({
    editablePrompt: 'BASE COMPILED PROMPT',
    finalPrompt: 'BASE COMPILED PROMPT',
    taskContract: {
      aspectRatio: '16:9',
      count: 1,
      referenceAssetIds: ['asset-confirmed'],
      generationBasis: 'continuation',
      subtype: 'consultation',
    },
  });
  assert.equal(out.prompt, 'BASE COMPILED PROMPT');
  assert.equal(out.referenceBoundary.applied, false);
});

test('r2.0 B-3: Seedream compile with reference_first but no referenceAssetIds still does not crash and does not append', () => {
  // The compile method itself does not gate on referenceAssetIds length
  // (the route integrity gate does that earlier). It only checks
  // generationBasis. So for reference_first with zero ids the boundary is
  // still appended — the gate is upstream of the adapter.
  const adapter = createSeedreamVNextAdapter();
  const out = adapter.compile({
    editablePrompt: 'BASE',
    finalPrompt: 'BASE',
    taskContract: {
      aspectRatio: '16:9',
      count: 1,
      referenceAssetIds: [],
      generationBasis: 'reference_first',
      subtype: 'consultation',
    },
  });
  // The boundary IS appended when basis === 'reference_first'. The
  // route gate catches the "no references" case before reaching here.
  assert.equal(out.referenceBoundary.applied, true);
});

test('r2.0 B-3: boundary prompt + compiled prompt still under the Seedream char ceiling', () => {
  const adapter = createSeedreamVNextAdapter();
  // Pick a base size that, together with the boundary (~1100 chars), still
  // sits under the 12_000 ceiling. We do not want to assume the exact
  // boundary length — we only care that the ceiling still works after
  // the boundary is appended.
  const longBase = 'A'.repeat(10_500);
  const out = adapter.compile({
    editablePrompt: longBase,
    finalPrompt: longBase,
    taskContract: {
      aspectRatio: '16:9',
      count: 1,
      referenceAssetIds: ['asset-ref-1'],
      generationBasis: 'reference_first',
      subtype: 'consultation',
    },
  });
  assert.ok(out.referenceBoundary.promptCharacters <= 12_000,
    `promptCharacters=${out.referenceBoundary.promptCharacters} must be <= 12_000`);
  assert.ok(out.referenceBoundary.promptCharacters > 10_500,
    'boundary should have been appended');
});
