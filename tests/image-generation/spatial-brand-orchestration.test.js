import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSpatialBrandOrchestration,
  compileShortChainImageGeneration,
  compileShortChainCorrectionPrompt,
  guardSpatialBrandDensity,
  resolveSpatialSceneRole,
  validateShortChainDeliverableEvidence,
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

test('Phase 5 light QA detects orchestration budget, text, zone and Scene Role violations', () => {
  let orchestration = buildSpatialBrandOrchestration({
    task: { sceneRole: 'lobby', subtype: 'lobby', shot: 'wide' }, projectContext: {},
    selectedAssets: [{ assetId: 'logo', type: 'logo' }, { assetId: 'seal', type: 'icon' }],
  });
  orchestration = guardSpatialBrandDensity(orchestration);
  const taskContract = {
    taskId: 'qa-task', deliverableFamily: 'space', subtype: 'lobby', shot: 'wide',
    logoUsageMode: 'reference', referenceAssetIds: ['logo', 'seal'], mustInclude: [], mustAvoid: [],
  };
  const validation = validateShortChainDeliverableEvidence({
    projectId: 'qa-project', taskContract, runId: 'qa-run', imageId: 'qa-image',
    spatialBrandOrchestration: orchestration,
    evidence: {
      detectedFamily: 'space', detectedSubtype: 'lobby', visibleEvidence: ['continuous lobby'],
      brandMatch: 'matched', brandToneMatch: 'matched', sceneCompleteness: 'complete', logoTextStatus: 'correct',
      lockedAssetQa: [
        { assetId: 'logo', assetType: 'logo', occurrenceCount: 1, textExactMatch: true },
        { assetId: 'seal', assetType: 'icon', occurrenceCount: 1 },
      ],
      observedLogoCount: 2, observedApprovedAssetCount: 3,
      unexpectedTextBlocks: ['pseudo English on left wall'], smallTextViolation: true,
      assetZoneViolations: ['seal outside left_supporting_wall'], sceneRoleMatch: false,
    },
  });
  assert.equal(validation.status, 'failed');
  for (const code of [
    'duplicate_logo', 'brand_density_overflow', 'unexpected_brand_text',
    'small_text_violation', 'asset_zone_conflict', 'scene_role_mismatch',
  ]) assert.ok(validation.mismatchTypes.includes(code), code);
  const correction = compileShortChainCorrectionPrompt({
    originalPrompt: 'Generate the approved lobby.', taskContract, validation,
  });
  assert.match(correction, /Remove every duplicate Logo/u);
  assert.match(correction, /Remove all unapproved text/u);
  assert.match(correction, /Restore the requested Scene Role/u);
});

test('Phase 3 density guard removes duplicate Logo and text overflow by priority', () => {
  const orchestration = buildSpatialBrandOrchestration({
    task: { subtype: 'reception', shot: 'front' }, projectContext: {},
    selectedAssets: [
      { assetId: 'logo-primary', type: 'logo' },
      { assetId: 'logo-secondary', type: 'logo' },
      { assetId: 'icon', type: 'icon' },
    ],
    userBrandIntensity: 'balanced',
  });
  orchestration.assetBudget.textBudget.headlineGroups = 2;
  orchestration.assetBudget.textBudget.supportingTextGroups = 2;
  orchestration.assetBudget.textBudget.smallTextAllowed = true;
  const guarded = guardSpatialBrandDensity(orchestration);
  assert.equal(guarded.assetBudget.secondaryAssets.some((asset) => asset.assetType === 'logo'), false);
  assert.equal(guarded.assetBudget.textBudget.supportingTextGroups, 0);
  assert.equal(guarded.assetBudget.textBudget.smallTextAllowed, false);
  assert.ok(guarded.densityIssues.some((issue) => issue.code === 'DUPLICATE_LOGO'));
  assert.ok(guarded.densityIssues.some((issue) => issue.code === 'TOO_MANY_TEXT_GROUPS'));
  assert.ok(guarded.densityIssues.some((issue) => issue.code === 'SMALL_TEXT_NOT_ALLOWED'));
});

test('Phase 3 strengthens a weak subtle scene through style inheritance, never a second Logo', () => {
  const orchestration = buildSpatialBrandOrchestration({
    task: { subtype: 'lobby', shot: 'wide' }, projectContext: {},
    selectedAssets: [{ assetId: 'logo', type: 'logo' }],
  });
  Object.keys(orchestration.assetBudget.styleInheritance)
    .forEach((key) => { orchestration.assetBudget.styleInheritance[key] = false; });
  const guarded = guardSpatialBrandDensity(orchestration);
  assert.equal(guarded.assetBudget.styleInheritance.spatialOrder, true);
  assert.equal(guarded.assetBudget.secondaryAssets.length, 0);
  assert.ok(guarded.densityIssues.some((issue) => issue.code === 'BRAND_EXPRESSION_TOO_WEAK'));
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

test('Phase 2 compiles orchestration rules without changing selected Provider references', () => {
  const projectContext = {
    schemaVersion: '2.0', projectId: 'orchestration-compile', version: 2,
    brandCore: { name: 'Example', industry: 'restaurant', brandRole: null, audience: [] },
    lockedAssets: { logoAssetIds: ['logo'], confirmedColors: [], mustPreserve: [], lockedAssetIds: ['logo'] },
    visualIdentity: { tone: ['playful'], colorBehavior: [], graphicBehavior: [], materialBehavior: [], compositionBehavior: [], lightingBehavior: [] },
    styleBoundaries: { mustAvoid: [], uncertainItems: [] }, confirmedDecisions: [],
    sourceAssetRefs: [
      { assetId: 'logo', name: 'Logo', role: 'logo' },
      { assetId: 'ip', name: 'IP', role: 'identity' },
    ],
    provenance: { sourceFingerprint: 'orchestration-compile-context' },
  };
  const result = compileShortChainImageGeneration({
    projectContext,
    task: {
      projectId: projectContext.projectId, deliverableFamily: 'space', subtype: 'reception', sceneRole: 'entrance',
      shot: 'entrance_three_quarter_wide', count: 1, aspectRatio: '16:9',
      currentInstruction: 'Create a branded entrance.', referenceAssetIds: ['logo', 'ip'],
    },
  });
  assert.deepEqual(result.payload.referenceAssetIds, ['logo', 'ip']);
  assert.equal(result.compiledPrompt.spatialBrandOrchestration.sceneRole, 'entrance');
  assert.equal(result.compiledPrompt.lockedAssetPlacementPlan.placements[0].assetId, 'ip');
  assert.match(result.compiledPrompt.finalPrompt, /SCENE ROLE: entrance/u);
  assert.match(result.compiledPrompt.finalPrompt, /TEXT ZONE all_unplanned_surfaces: no_text/u);
  assert.match(result.compiledPrompt.finalPrompt, /Do not invent Chinese text, English text/u);
});
