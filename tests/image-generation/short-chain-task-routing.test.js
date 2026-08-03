import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileShortChainImageGeneration,
  createShortChainTaskContract,
  listShortChainTemplates,
  planSingleLogoPlacement,
  planLockedAssetPlacements,
} from '@masterpiece/image-generation-runtime/short-chain/index.js';

const projectContext = {
  schemaVersion: '2.0',
  projectId: 'project-aesthetic',
  version: 3,
  generatedAt: '2026-07-29T00:00:00.000Z',
  brandCore: {
    name: 'Aesthetic Studio',
    industry: 'aesthetic services',
    brandRole: 'professional and humane',
    audience: ['quality-conscious clients'],
  },
  lockedAssets: {
    logoAssetIds: ['logo-1'],
    brandNameLocked: true,
    confirmedColors: [],
    packageStructures: [],
    productAssetIds: [],
    lockedAssetIds: ['lock-1'],
    mustPreserve: ['keep the approved brand name'],
  },
  visualIdentity: {
    tone: ['rational, clean, restrained but not cold'],
    colorBehavior: [],
    graphicBehavior: [],
    materialBehavior: ['honest materials with tactile contrast'],
    compositionBehavior: ['clear hierarchy and generous breathing room'],
    lightingBehavior: ['soft layered ambient lighting'],
  },
  styleBoundaries: {
    mustAvoid: ['decorative clutter'],
    uncertainItems: ['exact accent color'],
  },
  confirmedDecisions: [],
  sourceAssetRefs: [],
  provenance: {
    builderId: 'project-context-builder',
    builderVersion: '1.0.0',
    sourceKinds: ['project_record', 'original_asset'],
    sourceFingerprint: 'fixture-fingerprint',
  },
};

test('Task routing locks the requested deliverable in a short Task Contract', () => {
  const task = createShortChainTaskContract({
    projectId: projectContext.projectId,
    deliverableFamily: 'space',
    subtype: 'reception',
    shot: 'entrance_three_quarter_wide',
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: 'Create the first formal reception-space result.',
  }, { now: '2026-07-29T00:00:00.000Z' });
  assert.equal(task.deliverableFamily, 'space');
  assert.equal(task.count, 1);
  assert.equal(task.brandMarkRenderMode, 'locked_asset_render');
  assert.equal(task.materialMode, 'auto');
  assert.equal(task.brandIntensity, 'balanced');
  assert.throws(() => createShortChainTaskContract({
    ...task,
    deliverableFamily: 'vi',
    subtype: 'unspecified',
  }), /concrete material subtype/u);
});

test('Task routing migrates legacy Logo modes and lets the new locked-asset policy win', () => {
  const migrated = createShortChainTaskContract({
    projectId: projectContext.projectId,
    deliverableFamily: 'space',
    subtype: 'reception',
    shot: 'front',
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: 'Render the selected brand asset in the space.',
    referenceAssetIds: ['logo-1'],
    logoUsageMode: 'post_composite',
  });
  assert.equal(migrated.brandMarkRenderMode, 'locked_asset_render');
  assert.equal(migrated.materialMode, 'auto');
  assert.equal(migrated.brandIntensity, 'balanced');

  const explicit = createShortChainTaskContract({
    ...migrated,
    brandMarkRenderMode: 'creative_logo_interpretation',
    materialMode: 'metal_dimensional',
    brandIntensity: 'expressive',
    logoUsageMode: 'blank_area',
  });
  assert.equal(explicit.brandMarkRenderMode, 'creative_logo_interpretation');
  assert.equal(explicit.materialMode, 'metal_dimensional');
  assert.equal(explicit.brandIntensity, 'expressive');

  assert.throws(() => createShortChainTaskContract({
    ...migrated,
    materialMode: 'painted_cloud',
  }), /material mode/u);
});

test('Phase 2 planner creates one large planar primary Logo placement', () => {
  const task = createShortChainTaskContract({
    projectId: projectContext.projectId,
    deliverableFamily: 'space',
    subtype: 'reception',
    shot: 'front',
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: 'Create a large reception brand wall.',
    referenceAssetIds: ['logo-1'],
    brandMarkRenderMode: 'locked_asset_render',
    materialMode: 'halo_lit_metal',
    brandIntensity: 'balanced',
  });
  const plan = planSingleLogoPlacement({ taskContract: task, selectedLogoAssetIds: ['logo-1'] });
  assert.equal(plan.placements.length, 1);
  assert.equal(plan.placements[0].role, 'primary_signage');
  assert.equal(plan.placements[0].zone, 'reception_back_wall');
  assert.equal(plan.placements[0].material, 'halo_lit_metal');
  assert.equal(plan.placements[0].maxOccurrences, 1);
  assert.equal(plan.mvpEligible, true);
  assert.throws(
    () => planSingleLogoPlacement({ taskContract: task, selectedLogoAssetIds: ['logo-1', 'logo-2'] }),
    /not multiple Logos/u,
  );
});

test('Phase 4 planner gives Logo and IP distinct roles, surfaces and density limits', () => {
  const task = createShortChainTaskContract({
    projectId: projectContext.projectId,
    deliverableFamily: 'space',
    subtype: 'reception',
    shot: 'front',
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: 'Use the selected Logo and IP character in one balanced reception.',
    referenceAssetIds: ['logo-1', 'ip-1'],
    brandMarkRenderMode: 'locked_asset_render',
    materialMode: 'metal_dimensional',
    brandIntensity: 'balanced',
  });
  const plan = planLockedAssetPlacements({
    taskContract: task,
    selectedAssets: [
      { assetId: 'logo-1', type: 'logo' },
      { assetId: 'ip-1', type: 'ip_character' },
    ],
  });
  assert.equal(plan.placements.length, 2);
  assert.deepEqual(plan.placements.map((item) => item.role), ['primary_signage', 'hero_installation']);
  assert.deepEqual(plan.placements.map((item) => item.maxOccurrences), [1, 1]);
  assert.equal(new Set(plan.placements.map((item) => item.zone)).size, 2);
  assert.equal(plan.placements.filter((item) => item.importance === 1).length, 1);
  assert.throws(() => planLockedAssetPlacements({
    taskContract: task,
    selectedAssets: [
      { assetId: 'logo-1', type: 'logo' },
      { assetId: 'logo-2', type: 'logo' },
    ],
  }), /not multiple Logos/u);
});

test('Task routing sends reception space only through space templates', () => {
  const result = compileShortChainImageGeneration({
    projectContext,
    now: '2026-07-29T00:00:00.000Z',
    task: {
      projectId: projectContext.projectId,
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_three_quarter_wide',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Create a buildable reception interior.',
      mustInclude: ['usable reception desk'],
      mustAvoid: [],
      referenceAssetIds: [],
    },
  });
  assert.deepEqual(
    Object.keys(result.compiledPrompt.route.templateVersions),
    [
      'family.space',
      'subtype.space.reception',
      'shot.space.entrance_three_quarter_wide',
    ],
  );
  assert.match(result.compiledPrompt.finalPrompt, /real, enterable/u);
  assert.match(result.compiledPrompt.finalPrompt, /VI display board/u);
  assert.match(result.compiledPrompt.finalPrompt, /Create a buildable reception interior/u);
  assert.equal(result.payload.size, '2K');
  assert.equal(result.payload.count, 1);
  assert.equal(result.payload.aspectRatio, '16:9');
  assert.equal(result.compiledPrompt.trace.adapterId, 'seedream-5.0-pro');
});

test('Public task templates contain no project-specific aesthetic answer', () => {
  const serialized = JSON.stringify(listShortChainTemplates());
  assert.doesNotMatch(serialized, /九州|冯烫烫|深紫|陶红|羽翼/u);
});
