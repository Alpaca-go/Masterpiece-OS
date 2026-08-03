import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSpatialBrandOrchestration,
  compileSpatialBrandOrchestrationRules,
  guardSpatialBrandDensity,
} from '@masterpiece/image-generation-runtime/short-chain/index.js';

const PROJECTS = Object.freeze({
  playfulIp: { industry: 'restaurant', tone: ['playful', 'energetic'], assets: [
    { assetId: 'playful-logo', type: 'logo' }, { assetId: 'playful-ip', type: 'ip_character' },
  ] },
  restrainedHealth: { industry: 'healthcare', tone: ['restrained', 'quiet', 'professional'], assets: [
    { assetId: 'health-logo', type: 'logo' }, { assetId: 'health-seal', type: 'icon' },
  ] },
  rationalBeauty: { industry: 'medical aesthetics', tone: ['professional', 'precise'], assets: [
    { assetId: 'beauty-logo', type: 'logo' }, { assetId: 'beauty-symbol', type: 'icon' },
  ] },
  minimal: { industry: 'hospitality', tone: ['minimal', 'quiet'], assets: [
    { assetId: 'minimal-logo', type: 'logo' },
  ] },
  strongIp: { industry: 'retail', tone: ['bold', 'youth'], assets: [
    { assetId: 'strong-ip', type: 'ip_character' }, { assetId: 'strong-logo', type: 'logo' },
  ] },
});

const CASES = [
  { id: 'T01', project: 'playfulIp', role: 'entrance', subtype: 'space', shot: 'entrance_wide', intensity: 'expressive', primary: 'playful-ip' },
  { id: 'T02', project: 'playfulIp', role: 'dining_area', subtype: 'dining_area', shot: 'wide', intensity: 'balanced' },
  { id: 'T03', project: 'playfulIp', role: 'private_room', subtype: 'private_room', shot: 'medium', intensity: 'subtle' },
  { id: 'T04', project: 'restrainedHealth', role: 'lobby', subtype: 'lobby', shot: 'wide', intensity: 'subtle', primary: 'health-logo' },
  { id: 'T05', project: 'restrainedHealth', role: 'reception', subtype: 'reception', shot: 'front', intensity: 'balanced' },
  { id: 'T06', project: 'restrainedHealth', role: 'corridor', subtype: 'corridor', shot: 'wide', intensity: 'subtle' },
  { id: 'T07', project: 'rationalBeauty', role: 'reception', subtype: 'reception', shot: 'front', intensity: 'balanced' },
  { id: 'T08', project: 'rationalBeauty', role: 'display_area', subtype: 'display_area', shot: 'medium', intensity: 'balanced' },
  { id: 'T09', project: 'strongIp', role: 'brand_wall', subtype: 'brand_wall', shot: 'front', intensity: 'expressive', primary: 'strong-ip' },
  { id: 'T10', project: 'minimal', role: 'lobby', subtype: 'lobby', shot: 'wide', intensity: 'subtle', primary: 'minimal-logo' },
];

function compileCase(item) {
  const project = PROJECTS[item.project];
  let orchestration = buildSpatialBrandOrchestration({
    task: { sceneRole: item.role, subtype: item.subtype, shot: item.shot },
    projectContext: {
      brandCore: { industry: project.industry },
      visualIdentity: { tone: project.tone },
    },
    selectedAssets: project.assets,
  });
  orchestration = guardSpatialBrandDensity(orchestration);
  orchestration.compiledRules = compileSpatialBrandOrchestrationRules(orchestration);
  return orchestration;
}

test('Phase 4 offline vertical matrix resolves all ten scene strategies deterministically', () => {
  for (const item of CASES) {
    const result = compileCase(item);
    assert.equal(result.sceneRole, item.role, `${item.id}: scene role`);
    assert.equal(result.brandIntensity, item.intensity, `${item.id}: intensity`);
    if (item.primary) assert.equal(result.assetBudget.primaryAsset?.assetId, item.primary, `${item.id}: primary`);
    assert.ok(result.assetBudget.primaryAsset || result.assetBudget.secondaryAssets.length === 0, `${item.id}: unique or absent primary`);
    assert.ok(result.assetBudget.secondaryAssets.length <= 1, `${item.id}: secondary budget`);
    assert.equal(result.assetBudget.textBudget.smallTextAllowed, false, `${item.id}: no small text`);
    assert.equal(result.assetBudget.textBudget.microTextAllowed, false, `${item.id}: no micro text`);
    assert.ok(result.textSafetyZones.some((zone) => zone.zoneId === 'all_unplanned_surfaces' && zone.policy === 'no_text'), `${item.id}: fail-closed zones`);
    assert.ok(result.compiledRules.negative.some((rule) => rule.includes('additional logos')), `${item.id}: no extra Logo`);
    assert.ok(result.compiledRules.negative.some((rule) => rule.includes('pseudo typography')), `${item.id}: no pseudo text`);
  }
});

test('Phase 4 series roles vary intensity and asset leadership without changing brand identity rules', () => {
  const entrance = compileCase(CASES.find((item) => item.id === 'T01'));
  const dining = compileCase(CASES.find((item) => item.id === 'T02'));
  const privateRoom = compileCase(CASES.find((item) => item.id === 'T03'));
  assert.deepEqual(
    [entrance.brandIntensity, dining.brandIntensity, privateRoom.brandIntensity],
    ['expressive', 'balanced', 'subtle'],
  );
  for (const result of [entrance, dining, privateRoom]) {
    assert.equal(result.assetBudget.styleInheritance.palette, true);
    assert.equal(result.assetBudget.styleInheritance.shapeLanguage, true);
    assert.equal(result.assetBudget.styleInheritance.patternRhythm, true);
    assert.equal(result.assetBudget.styleInheritance.spatialOrder, true);
  }
  assert.equal(entrance.assetBudget.primaryAsset.assetId, 'playful-ip');
  assert.equal(privateRoom.assetBudget.primaryAsset.assetId, 'playful-logo');
});

test('Phase 4 subtle health and minimal scenes gain brand order without duplicate signage', () => {
  for (const id of ['T04', 'T06', 'T10']) {
    const result = compileCase(CASES.find((item) => item.id === id));
    const literalLogos = [result.assetBudget.primaryAsset, ...result.assetBudget.secondaryAssets]
      .filter((asset) => asset?.assetType === 'logo');
    assert.ok(literalLogos.length <= 1, `${id}: one Logo maximum`);
    assert.equal(result.assetBudget.styleInheritance.patternRhythm, true, `${id}: patterned brand order`);
    assert.equal(result.assetBudget.styleInheritance.spatialOrder, true, `${id}: spatial brand order`);
  }
});
