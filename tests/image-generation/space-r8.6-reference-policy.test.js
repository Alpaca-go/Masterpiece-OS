// R8.6 Reference Policy freeze test.
//
// R8.6 freezes: Text-only = Standard Generation, Reference-assisted =
// High Fidelity Generation; refs = 0 must NOT be blocked. This test proves
// the frozen final-smoke records honor that policy (refCount 0, no
// SPACE_REFERENCE_REQUIRED), and that the policy module still resolves
// explicit references when provided (high-fidelity path stays available).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveSpaceReferences,
  assertSpaceReferenceAvailable,
  SPACE_REFERENCE_POLICY_VERSION,
} from '@masterpiece/image-generation-runtime/vnext/space-quality/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const base = 'space-generator/quality-baselines/r8.6';

const SMOKE_SCENES = [
  'jiuzhou-aesthetics/final-reception-1',
  'jiuzhou-aesthetics/final-entrance-1',
  'feng-tang-tang/final-dining-1',
  'yi-ji-liang-fang/final-reception-1',
];

test('R8.6 final smokes are text-only with refs=0 and reference policy version recorded', () => {
  for (const scene of SMOKE_SCENES) {
    const m = JSON.parse(fs.readFileSync(path.join(repoRoot, base, scene, 'manifest.json'), 'utf8'));
    const ref = JSON.parse(fs.readFileSync(path.join(repoRoot, base, scene, 'reference-trace.json'), 'utf8'));
    assert.equal(ref.referenceCount, 0, `${scene}: refs=0`);
    assert.deepEqual(m.referenceIds, [], `${scene}: manifest referenceIds empty`);
    // Frozen policy version uses the component-version namespace.
    assert.equal(SPACE_REFERENCE_POLICY_VERSION, 'space-reference-policy@2.0.0');
  }
});

test('R8.6 text-only refs=0 remains the formal Standard path', () => {
  const { references } = resolveSpaceReferences({
    explicitAssets: [],
    implicitAnchor: null,
    architectureAnchorImages: [],
  });
  assert.equal(references.length, 0);
  assert.doesNotThrow(
    () => assertSpaceReferenceAvailable(references, { generationBasis: 'standard' }),
    'text-only Standard must not block',
  );
});

test('R8.6 reference-assisted path (high fidelity) still resolves explicit references', () => {
  const { references } = resolveSpaceReferences({
    generationBasis: 'reference_first',
    explicitAssets: [{ assetId: 'sketch-a', role: 'reference', relativePath: 'ref/sketch.jpg' }],
    implicitAnchor: null,
    architectureAnchorImages: [],
  });
  assert.equal(references.length, 1);
  assert.equal(references[0].id, 'sketch-a');
  assert.doesNotThrow(() => assertSpaceReferenceAvailable(references, { generationBasis: 'reference_first' }));
});
