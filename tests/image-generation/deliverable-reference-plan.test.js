import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeliverableReferencePlan,
  materializeDeliverableReferences,
} from '@masterpiece/image-generation-runtime/deliverables/index.js';

function reference(assetId, role, name) {
  return {
    assetId,
    role,
    name,
    localPath: `/assets/${assetId}.png`,
    sha256: `hash-${assetId}`,
    source: 'project_visual_context',
    includeReason: name,
  };
}

const REFERENCES = [
  reference('logo', 'current_project_logo', 'brand logo'),
  reference('menu', 'current_project_identity', '菜单册平铺 mockup'),
  reference('apron', 'current_project_identity', '围裙样机'),
  reference('cards', 'current_project_identity', '名片合集 grid'),
  reference('bags', 'current_project_identity', '包装袋排列'),
  reference('interior-a', 'reference_style', 'restaurant interior space'),
  reference('interior-b', 'reference_style', '店内装修参考'),
  reference('color', 'reference_style', '品牌色彩参考'),
];

test('interior plan never sends the VI collection and prioritizes spatial references', () => {
  const plan = buildDeliverableReferencePlan({
    deliverable: 'interior_scene',
    references: REFERENCES,
    capabilities: { maxReferenceImages: 6, supportsMultiImageReference: true },
  });
  assert.deepEqual(plan.selected.map((item) => item.assetId), ['logo', 'interior-a', 'interior-b', 'color']);
  assert.deepEqual(plan.analysisOnly.map((item) => item.assetId).sort(), ['apron', 'bags', 'cards', 'menu']);
  assert.equal(plan.selected.filter((item) => item.role === 'identity_reference').length, 1);
  assert.ok(plan.warnings.includes('VI_COLLECTIONS_MOVED_TO_ANALYSIS_ONLY'));
  const materialized = materializeDeliverableReferences(plan, REFERENCES);
  assert.ok(materialized.every((item) => !['menu', 'apron', 'cards', 'bags'].includes(item.assetId)));
});

test('interior trimming is deterministic and keeps identity before spatial/style', () => {
  const input = {
    deliverable: 'interior_scene',
    references: REFERENCES,
    capabilities: { maxReferenceImages: 2, supportsMultiImageReference: true },
  };
  const first = buildDeliverableReferencePlan(input);
  const second = buildDeliverableReferencePlan(input);
  assert.deepEqual(first, second);
  assert.deepEqual(first.selected.map((item) => item.assetId), ['logo', 'interior-a']);
  assert.ok(first.warnings.includes('REFERENCE_PLAN_AUTO_REDUCED'));
});

test('VI application keeps VI assets instead of globally banning them', () => {
  const plan = buildDeliverableReferencePlan({
    deliverable: 'vi_application',
    references: REFERENCES,
    capabilities: { maxReferenceImages: 6, supportsMultiImageReference: true },
  });
  assert.ok(plan.selected.some((item) => ['menu', 'apron', 'cards', 'bags'].includes(item.assetId)));
});

test('packaging render prioritizes a structure reference', () => {
  const packaging = reference('box', 'current_project_product', '真实包装盒型 structure');
  const plan = buildDeliverableReferencePlan({
    deliverable: 'packaging_render',
    references: [REFERENCES[0], packaging, REFERENCES[7]],
    capabilities: { maxReferenceImages: 3, supportsMultiImageReference: true },
  });
  assert.deepEqual(plan.selected.map((item) => item.role), ['identity_reference', 'structure_reference', 'style_reference']);
  assert.deepEqual(plan.missingRequiredRoles, []);
});
