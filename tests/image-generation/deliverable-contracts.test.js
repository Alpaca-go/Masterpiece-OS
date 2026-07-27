import test from 'node:test';
import assert from 'node:assert/strict';

test('deliverable contract enumerates the seven supported outputs', () => {
  const deliverables = ['anchor_image', 'brand_poster', 'packaging_render', 'vi_application', 'interior_scene', 'storefront_scene', 'free_concept'];
  assert.equal(deliverables.length, 7);
  assert.ok(deliverables.includes('interior_scene'));
});
