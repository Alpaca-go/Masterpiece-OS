// R11.2.1 Reference-First explicit-only routing tests.
//
// Reference-First is USER EXPLICIT ONLY (R11.2.1 §13-§17):
//   explicitReferenceAssetIds.length >= 1
//   resolvedReferenceAssetIds == explicitReferenceAssetIds
//   no implicit fallback (project visual assets / anchors / previous refs)
//   empty refs -> fail closed
//
// Tests B/C/D/E from the doc:
//   B: upload local-test.png -> resolved = [uploaded], assetOrigin=user_upload
//   C: project asset explicit selection -> resolved = [asset-05]
//   D: upload + project asset mixed explicit
//   E: remove all -> fail closed (no fallback)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveSpaceReferences,
  assertSpaceReferenceAvailable,
} from '@masterpiece/image-generation-runtime/space/index.js';

test('Test B: reference-first explicit upload resolves exactly the uploaded asset', () => {
  const explicitAssets = [
    { assetId: 'asset-uploaded-1', role: 'reference', relativePath: 'local-test.png' },
  ];
  const { references, trace } = resolveSpaceReferences({
    generationBasis: 'reference_first',
    explicitAssets,
    // Project visual assets are NOT in explicitAssets — the resolver must not
    // pull them in.
    implicitAnchor: { imageId: 'img-implicit', projectRelativePath: 'x/y.png' },
    architectureAnchorImages: [{ anchorId: 'JZMX-ARCH-01', imagePath: 'a.png' }],
    maxReferences: 4,
  });
  assert.deepEqual(references.map((r) => r.id), ['asset-uploaded-1'], 'resolved == explicit only');
  assert.equal(references[0].source, 'user_explicit');
  assert.equal(trace.providerReferenceCount, 1);
  // Project visual assets (implicit/anchor) must not appear.
  assert.deepEqual(trace.implicitAnchorId, 'img-implicit', 'implicit recorded but not used');
  assert.deepEqual(trace.architectureAnchorIds, ['JZMX-ARCH-01'], 'anchors recorded but not used');
  assert.ok(!references.some((r) => r.id === 'img-implicit' || r.id === 'JZMX-ARCH-01'), 'no implicit/anchor in resolved refs');
});

// R11.2.2 §27: Reference-First is HIGH FIDELITY. The legacy role stays
// core_reference for wire compatibility, but the authoritative semanticRole is
// high_fidelity_visual_reference.
test('R11.2.2 reference-first references carry the high-fidelity semantic role', () => {
  const { references, trace } = resolveSpaceReferences({
    generationBasis: 'reference_first',
    explicitAssets: [{ assetId: 'asset-ref', role: 'reference', relativePath: 'ref.png' }],
    maxReferences: 4,
  });
  assert.equal(references[0].role, 'core_reference', 'legacy wire role preserved');
  assert.equal(references[0].semanticRole, 'high_fidelity_visual_reference');
  assert.equal(references[0].referenceRole, 'high_fidelity_visual_reference');
  assert.equal(trace.providerReferences[0]?.semanticRole, 'high_fidelity_visual_reference');
});

test('R11.2.2 continuation references carry the world-consistency semantic role', () => {
  const { references, trace } = resolveSpaceReferences({
    generationBasis: 'continuation',
    explicitAssets: [{ assetId: 'asset-cont', role: 'reference', relativePath: 'confirmed.png' }],
    maxReferences: 4,
  });
  assert.equal(references[0].semanticRole, 'world_consistency');
  assert.equal(references[0].referenceRole, 'world_consistency');
  assert.equal(references[0].source, 'confirmed_generated_output');
  assert.equal(trace.providerReferences[0]?.semanticRole, 'world_consistency');
});

test('Test C: project asset explicit selection resolves exactly the selected asset', () => {
  const { references } = resolveSpaceReferences({
    generationBasis: 'reference_first',
    explicitAssets: [{ assetId: 'asset-05', role: 'reference', relativePath: 'input/05.png' }],
    maxReferences: 4,
  });
  assert.deepEqual(references.map((r) => r.id), ['asset-05'], 'explicit project selection allowed');
  assert.equal(references[0].source, 'user_explicit');
});

test('Test D: upload + project asset mixed explicit (all user-selected)', () => {
  const { references } = resolveSpaceReferences({
    generationBasis: 'reference_first',
    explicitAssets: [
      { assetId: 'asset-uploaded-1', role: 'reference', relativePath: 'local-test.png' },
      { assetId: 'asset-05', role: 'reference', relativePath: 'input/05.png' },
    ],
    maxReferences: 4,
  });
  assert.deepEqual(references.map((r) => r.id).sort(), ['asset-05', 'asset-uploaded-1']);
});

test('Test E: empty reference-first fails closed (no implicit fallback)', () => {
  const { references } = resolveSpaceReferences({
    generationBasis: 'reference_first',
    explicitAssets: [],
    implicitAnchor: { imageId: 'img-implicit', projectRelativePath: 'x/y.png' },
    architectureAnchorImages: [{ anchorId: 'JZMX-ARCH-01', imagePath: 'a.png' }],
    maxReferences: 4,
  });
  assert.equal(references.length, 0, 'no fallback');
  assert.throws(
    () => assertSpaceReferenceAvailable(references, { generationBasis: 'reference_first' }),
    /SPACE_REFERENCE_FIRST_REFERENCE_REQUIRED/,
  );
});

test('R11.2.1 reference-first max 4 refs is enforced by the resolver', () => {
  const explicitAssets = Array.from({ length: 5 }, (_, i) => ({
    assetId: `asset-${i}`,
    role: 'reference',
    relativePath: `ref/${i}.png`,
  }));
  const { references } = resolveSpaceReferences({
    generationBasis: 'reference_first',
    explicitAssets,
    maxReferences: 4,
  });
  assert.ok(references.length <= 4, `capped at 4 (got ${references.length})`);
});

test('R11.2.1 reference-first origin labels are user_explicit only', () => {
  const { references } = resolveSpaceReferences({
    generationBasis: 'reference_first',
    explicitAssets: [
      { assetId: 'uploaded', role: 'reference', relativePath: 'local.png' },
      { assetId: 'project', role: 'reference', relativePath: 'input/project.png' },
    ],
    maxReferences: 4,
  });
  for (const r of references) assert.equal(r.source, 'user_explicit', 'explicit source label');
});
