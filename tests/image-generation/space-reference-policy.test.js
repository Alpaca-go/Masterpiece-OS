import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveSpaceReferences,
  assertSpaceReferenceAvailable,
  SPACE_REFERENCE_POLICY_VERSION,
} from '@masterpiece/image-generation-runtime/space/index.js';

const explicitAssets = [{ assetId: 'ref1', role: 'reference', relativePath: 'space.jpg' }];

test('Standard is text-only even when implicit and architecture anchors exist', () => {
  const { references, trace } = resolveSpaceReferences({
    generationBasis: 'standard',
    explicitAssets: [],
    implicitAnchor: { imageId: 'implicit', projectRelativePath: 'old.png' },
    architectureAnchorImages: [{ anchorId: 'arch', imagePath: 'arch.png' }],
  });
  assert.deepEqual(references, []);
  assert.equal(trace.referenceMode, 'text_only');
  assert.doesNotThrow(() => assertSpaceReferenceAvailable(references, { generationBasis: 'standard' }));
});

test('Reference-First resolves only explicit usable images', () => {
  const { references, trace } = resolveSpaceReferences({
    generationBasis: 'reference_first',
    explicitAssets: [
      { assetId: 'logo', role: 'logo', relativePath: 'logo.png' },
      { assetId: 'pdf', role: 'reference', relativePath: 'document.pdf' },
      ...explicitAssets,
    ],
    implicitAnchor: { imageId: 'implicit', projectRelativePath: 'old.png' },
    architectureAnchorImages: [{ anchorId: 'arch', imagePath: 'arch.png' }],
  });
  assert.deepEqual(references.map((item) => item.id), ['ref1']);
  assert.deepEqual(references.map((item) => item.source), ['user_explicit']);
  assert.equal(trace.referenceMode, 'reference_assisted');
});

test('Reference-First without an explicit image fails closed', () => {
  assert.throws(
    () => assertSpaceReferenceAvailable([], { generationBasis: 'reference_first' }),
    { code: 'SPACE_REFERENCE_FIRST_REFERENCE_REQUIRED' },
  );
});

test('reference policy exposes the R10.4 component version', () => {
  assert.equal(SPACE_REFERENCE_POLICY_VERSION, 'space-reference-policy@2.0.0');
});
