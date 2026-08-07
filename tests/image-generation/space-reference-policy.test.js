// Space reference policy tests (Recovery R4).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveSpaceReferences,
  assertSpaceReferenceAvailable,
  SPACE_REFERENCE_POLICY_VERSION,
} from '@masterpiece/image-generation-runtime/vnext/space-quality/index.js';

test('priority 1: user explicit reference wins and is core_reference', () => {
  const { references, trace } = resolveSpaceReferences({
    explicitAssets: [{ assetId: 'a1', role: 'reference', relativePath: 'ref/sketch.jpg' }],
    implicitAnchor: { imageId: 'img-old', projectRelativePath: 'image-generation/x/y.png' },
    architectureAnchorImages: [{ anchorId: 'JZMX-ARCH-01', imagePath: 'space-generator/.../JZMX-ARCH-01.png' }],
  });
  assert.equal(references.length, 2);
  assert.equal(references[0].id, 'a1');
  assert.equal(references[0].role, 'core_reference');
  assert.equal(references[0].source, 'user_explicit');
  assert.equal(trace.providerReferenceCount, 2);
  assert.equal(trace.referencePolicyVersion, SPACE_REFERENCE_POLICY_VERSION);
});

test('priority 2: implicit anchor used when no explicit reference', () => {
  const { references } = resolveSpaceReferences({
    explicitAssets: [],
    implicitAnchor: { imageId: 'img-anc', projectRelativePath: 'image-generation/x/y.png' },
    architectureAnchorImages: [],
  });
  assert.equal(references.length, 1);
  assert.equal(references[0].source, 'implicit_anchor');
  assert.equal(references[0].role, 'core_reference');
});

test('priority 3: architecture anchor fallback provides a reference', () => {
  const { references, trace } = resolveSpaceReferences({
    explicitAssets: [],
    implicitAnchor: null,
    architectureAnchorImages: [{ anchorId: 'JZMX-ARCH-01', imagePath: 'space-generator/.../JZMX-ARCH-01.png' }],
  });
  assert.equal(references.length, 1);
  assert.equal(references[0].source, 'architecture_anchor');
  assert.equal(trace.architectureAnchorIds[0], 'JZMX-ARCH-01');
});

test('logo and packaging assets never become space references', () => {
  const { references } = resolveSpaceReferences({
    explicitAssets: [
      { assetId: 'logo1', role: 'logo', relativePath: 'logo.png' },
      { assetId: 'pkg1', role: 'package_structure', relativePath: 'dieline.pdf' },
      { assetId: 'ref1', role: 'reference', relativePath: 'space.jpg' },
    ],
  });
  assert.equal(references.length, 1);
  assert.equal(references[0].id, 'ref1');
});

test('pdf explicit references are skipped', () => {
  const { references } = resolveSpaceReferences({
    explicitAssets: [{ assetId: 'd1', role: 'reference', relativePath: 'doc.pdf' }],
  });
  assert.equal(references.length, 0);
});

test('no reference fails closed with SPACE_REFERENCE_REQUIRED', () => {
  const { references } = resolveSpaceReferences({ explicitAssets: [], implicitAnchor: null, architectureAnchorImages: [] });
  assert.equal(references.length, 0);
  assert.throws(() => assertSpaceReferenceAvailable(references), /SPACE_REFERENCE_REQUIRED/);
});

test('bypass suppresses the fail-closed error (reference-first explicit override only)', () => {
  assert.doesNotThrow(() => assertSpaceReferenceAvailable([], { bypass: true }));
});
