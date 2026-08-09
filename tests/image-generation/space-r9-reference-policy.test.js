// Historical R9 compatibility: the frozen compiler remains available while
// R10.4 owns the current formal Reference Policy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSpaceReferences } from '@masterpiece/image-generation-runtime/space/index.js';

test('R9 compiler context anchors remain traceable but do not enter Standard payloads', () => {
  const { references, trace } = resolveSpaceReferences({
    generationBasis: 'standard',
    implicitAnchor: { imageId: 'implicit', projectRelativePath: 'old.png' },
    architectureAnchorImages: [{ anchorId: 'arch', imagePath: 'arch.png' }],
  });
  assert.deepEqual(references, []);
  assert.equal(trace.implicitAnchorId, 'implicit');
  assert.deepEqual(trace.architectureAnchorIds, ['arch']);
  assert.equal(trace.providerReferenceCount, 0);
});

test('R9 High Fidelity capability is retained through explicit Reference-First', () => {
  const { references } = resolveSpaceReferences({
    generationBasis: 'reference_first',
    explicitAssets: [{ assetId: 'ref-user', role: 'reference', relativePath: 'ref.jpg' }],
  });
  assert.equal(references[0].id, 'ref-user');
  assert.equal(references[0].source, 'user_explicit');
});
