import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSpatialBrandOrchestration,
  resolveSpatialSceneRole,
} from '@masterpiece/image-generation-runtime/short-chain/index.js';

test('Phase 1 resolves scene roles without a model call and preserves explicit precedence', () => {
  assert.deepEqual(resolveSpatialSceneRole({ sceneRole: 'corridor', subtype: 'lobby' }), {
    sceneRole: 'corridor', source: 'user',
  });
  assert.deepEqual(resolveSpatialSceneRole({ subtype: 'reception', shot: 'entrance_wide' }), {
    sceneRole: 'reception', source: 'task_subtype',
  });
  assert.deepEqual(resolveSpatialSceneRole({ subtype: 'space', shot: 'entrance_wide' }), {
    sceneRole: 'entrance', source: 'auto_resolved',
  });
});

test('Phase 1 gives an expressive entrance one IP hero and one non-repeating Logo', () => {
  const result = buildSpatialBrandOrchestration({
    task: { subtype: 'space', shot: 'entrance_three_quarter_wide' },
    projectContext: { brandCore: { industry: 'restaurant' }, visualIdentity: { tone: ['playful', 'energetic'] } },
    selectedAssets: [
      { assetId: 'primary-logo', type: 'logo' },
      { assetId: 'main-ip', type: 'ip_character' },
    ],
  });
  assert.equal(result.sceneRole, 'entrance');
  assert.equal(result.brandIntensity, 'expressive');
  assert.equal(result.assetBudget.primaryAsset.assetId, 'main-ip');
  assert.equal(result.assetBudget.secondaryAssets[0].assetId, 'primary-logo');
  assert.equal(result.assetBudget.textBudget.smallTextAllowed, false);
  assert.equal(result.textSafetyZones.at(-1).policy, 'no_text');
});

test('Phase 1 gives a restrained lobby subtle style inheritance instead of another Logo', () => {
  const result = buildSpatialBrandOrchestration({
    task: { subtype: 'lobby', shot: 'three_quarter_wide' },
    projectContext: { brandCore: { industry: 'healthcare' }, visualIdentity: { tone: ['restrained', 'quiet', 'professional'] } },
    selectedAssets: [{ assetId: 'primary-logo', type: 'logo' }],
  });
  assert.equal(result.sceneRole, 'lobby');
  assert.equal(result.brandIntensity, 'subtle');
  assert.equal(result.assetBudget.primaryAsset.assetId, 'primary-logo');
  assert.equal(result.assetBudget.secondaryAssets.length, 0);
  assert.equal(result.assetBudget.styleInheritance.spatialOrder, true);
  assert.ok(result.textSafetyZones.some((zone) => zone.zoneId === 'glass_partition'));
});

test('Phase 1 keeps old projects operational when no Locked Assets exist', () => {
  const result = buildSpatialBrandOrchestration({
    task: { subtype: 'unknown-space', shot: 'unknown-shot' },
    projectContext: {},
    selectedAssets: [],
  });
  assert.equal(result.sceneRole, 'overview');
  assert.equal(result.brandIntensity, 'subtle');
  assert.equal(result.assetBudget.primaryAsset, undefined);
  assert.deepEqual(result.textSafetyZones, [{
    zoneId: 'all_unplanned_surfaces',
    zoneDescription: 'Every wall, floor, ceiling, furnishing and distant surface not explicitly listed above',
    policy: 'no_text',
    maxTextGroups: 0,
  }]);
});
