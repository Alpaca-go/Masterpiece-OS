// R9 production reference policy test.
//
// R9 §14-§15 freeze:
//   Text-only = Standard Generation
//   Reference-assisted = High Fidelity Generation
//   refs = 0 must NOT block (at most SPACE_REFERENCE_RECOMMENDED).
//   Priority: user explicit → implicit anchor → project anchor →
//   architecture anchor image → none (text-only).
//   Logo NEVER becomes a core_reference (stays post_composite).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveSpaceReferences,
  assertSpaceReferenceAvailable,
  SPACE_REFERENCE_POLICY_VERSION,
} from '@masterpiece/image-generation-runtime/space/index.js';

test('R9 text-only refs=0 resolves empty and is not blocked', () => {
  const { references, trace } = resolveSpaceReferences({
    explicitAssets: [],
    implicitAnchor: null,
    architectureAnchorImages: [],
  });
  assert.equal(references.length, 0);
  assert.equal(trace.providerReferenceCount, 0);
  // Fail-closed guard stays for accidental refs=0, but the frozen text-only
  // standard path uses the explicit bypass (production routes text-only runs
  // through allowTextOnlySpace).
  assert.throws(() => assertSpaceReferenceAvailable(references), /SPACE_REFERENCE_REQUIRED/);
  assert.doesNotThrow(() => assertSpaceReferenceAvailable(references, { bypass: true }));
});

test('R9 reference priority: user explicit wins over anchors', () => {
  const { references, trace } = resolveSpaceReferences({
    explicitAssets: [{ assetId: 'ref-user', role: 'reference', relativePath: 'ref/sketch.jpg' }],
    implicitAnchor: { imageId: 'img-implicit', projectRelativePath: 'x/y.png' },
    architectureAnchorImages: [{ anchorId: 'JZMX-ARCH-01', imagePath: 'a.png' }],
  });
  assert.equal(references[0].id, 'ref-user');
  assert.equal(references[0].source, 'user_explicit');
  assert.equal(trace.explicitAssetIds[0], 'ref-user');
});

test('R9 implicit anchor fills in when no explicit reference', () => {
  const { references } = resolveSpaceReferences({
    explicitAssets: [],
    implicitAnchor: { imageId: 'img-implicit', projectRelativePath: 'x/y.png' },
    architectureAnchorImages: [],
  });
  assert.equal(references.length, 1);
  assert.equal(references[0].source, 'implicit_anchor');
});

test('R9 architecture anchor image is the fallback before none', () => {
  const { references } = resolveSpaceReferences({
    explicitAssets: [],
    implicitAnchor: null,
    architectureAnchorImages: [{ anchorId: 'JZMX-ARCH-01', imagePath: 'a.png' }],
  });
  assert.equal(references.length, 1);
  assert.equal(references[0].source, 'architecture_anchor');
});

test('R9 logo never becomes a core reference', () => {
  const { references } = resolveSpaceReferences({
    explicitAssets: [
      { assetId: 'logo1', role: 'logo', relativePath: 'logo.png' },
      { assetId: 'pkg1', role: 'package_structure', relativePath: 'dieline.pdf' },
      { assetId: 'ref1', role: 'reference', relativePath: 'space.jpg' },
    ],
    implicitAnchor: null,
    architectureAnchorImages: [],
  });
  assert.equal(references.length, 1);
  assert.equal(references[0].id, 'ref1');
});

test('space policy exposes a namespaced component version', () => {
  assert.equal(SPACE_REFERENCE_POLICY_VERSION, 'space-reference-policy@1.0.0');
});
