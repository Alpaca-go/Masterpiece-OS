import test from 'node:test';
import assert from 'node:assert/strict';
import { compileReferencePlan, materializeReferencePlan, validateReferencePlan } from '../../packages/image-generation-runtime/src/reference-plan/index.js';

const assets = [
  { assetId: 'logo', name: 'Logo', assetRole: 'identity', path: '/logo.png' },
  { assetId: 'pack', name: 'Package', assetRole: 'structure', path: '/pack.png' },
  { assetId: 'old-board', name: 'Legacy campaign board', assetRole: 'legacy visual', path: '/old.png' },
];

test('upgrade plan keeps identity and structure while isolating legacy visuals for analysis', () => {
  const plan = compileReferencePlan({ mode: 'upgrade', assets, brief: { imageReferencePlan: { identity_reference: ['logo'], structure_reference: ['pack'], style_reference: [], analysis_only: ['old-board'], excluded: [] } } });
  assert.deepEqual(plan.map((item) => item.role), ['identity_reference', 'structure_reference', 'analysis_only']);
  assert.equal(validateReferencePlan(plan, { mode: 'upgrade', assetCount: assets.length }).valid, true);
  const request = materializeReferencePlan(plan, assets, { maxReferenceImages: 6, supportsMultiImageReference: true });
  assert.deepEqual(request.selected.map((item) => item.assetId), ['logo', 'pack']);
  assert.ok(!request.selected.some((item) => item.assetId === 'old-board'));
});

test('rebuild defaults unspecified legacy assets to analysis only and trims deterministically', () => {
  const plan = compileReferencePlan({ mode: 'rebuild', assets, brief: { imageReferencePlan: { identity_reference: ['logo'], structure_reference: [], style_reference: [], analysis_only: [], excluded: [] } } });
  assert.equal(plan.find((item) => item.assetId === 'old-board').role, 'analysis_only');
  const request = materializeReferencePlan(plan, assets, { maxReferenceImages: 1, supportsMultiImageReference: true });
  assert.deepEqual(request.selected.map((item) => item.assetId), ['logo']);
});
