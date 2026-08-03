import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileShortChainImageGeneration,
  listShortChainTemplateOptions,
  listShortChainTemplates,
} from '@masterpiece/image-generation-runtime/short-chain/index.js';

const context = (projectId) => ({
  schemaVersion: '2.0',
  projectId,
  version: 1,
  generatedAt: '2026-07-29T00:00:00.000Z',
  brandCore: { name: projectId, industry: 'test', brandRole: null, audience: [] },
  lockedAssets: {
    logoAssetIds: [],
    brandNameLocked: true,
    confirmedColors: [],
    packageStructures: [],
    productAssetIds: [],
    lockedAssetIds: [],
    mustPreserve: [],
  },
  visualIdentity: {
    tone: [],
    colorBehavior: [],
    graphicBehavior: [],
    materialBehavior: [],
    compositionBehavior: [],
    lightingBehavior: [],
  },
  styleBoundaries: { mustAvoid: [], uncertainItems: [] },
  confirmedDecisions: [],
  sourceAssetRefs: [],
  provenance: {
    builderId: 'test',
    builderVersion: '1',
    sourceKinds: ['project_record'],
    sourceFingerprint: `${projectId}-fingerprint`,
  },
});

const representativeTasks = [
  ['space', 'reception', 'entrance_view'],
  ['packaging', 'lid_and_base_box', 'open_box'],
  ['vi', 'business_card', 'front'],
  ['poster', 'brand_key_visual', 'subject_centered'],
];

test('Template routing exposes the complete MVP family, subtype, and shot matrix', () => {
  const options = listShortChainTemplateOptions();
  assert.deepEqual(Object.keys(options), ['space', 'packaging', 'vi', 'poster']);
  assert.equal(options.space.subtypes.length, 6);
  assert.equal(options.space.shots.length >= 4, true);
  assert.equal(options.packaging.subtypes.length, 6);
  assert.equal(options.packaging.shots.length, 6);
  assert.ok(options.packaging.shots.includes('PKG-HERO-SINGLE'));
  assert.ok(options.packaging.shots.includes('PKG-SERIES-GROUP'));
  assert.equal(options.vi.subtypes.length, 8);
  assert.equal(options.poster.subtypes.length, 5);
  assert.equal(options.poster.shots.length >= 3, true);
});

test('Template routing independently routes all four deliverable families', () => {
  for (const [family, subtype, shot] of representativeTasks) {
    const result = compileShortChainImageGeneration({
      projectContext: context(`project-${family}`),
      task: {
        projectId: `project-${family}`,
        deliverableFamily: family,
        subtype,
        shot,
        count: 1,
        aspectRatio: family === 'poster' ? '3:4' : '4:3',
        currentInstruction: `Create the requested ${family} deliverable.`,
      },
    });
    assert.equal(result.taskContract.deliverableFamily, family);
    assert.equal(result.compiledPrompt.route.familyTemplateId, `family.${family}`);
    assert.equal(
      Object.keys(result.compiledPrompt.route.templateVersions)
        .every((id) => id.includes(`.${family}`)),
      true,
    );
  }
});

test('Template routing rejects unknown subtype/shot combinations instead of drifting families', () => {
  assert.throws(() => compileShortChainImageGeneration({
    projectContext: context('project-space'),
    task: {
      projectId: 'project-space',
      deliverableFamily: 'space',
      subtype: 'business_card',
      shot: 'front',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Create a reception space.',
    },
  }), /No Short-Chain template registered/u);
});

test('Template routing isolates the benchmark aesthetic as a project prompt asset', () => {
  const projectPromptAsset = {
    schemaVersion: '1.0',
    id: 'aesthetic-space-v1',
    projectId: 'project-aesthetic',
    deliverableFamily: 'space',
    name: 'Confirmed reception direction',
    version: 1,
    promptFragments: ['Rational, clean, restrained but not cold; preserve generous breathing room.'],
    negativeConstraints: ['ornamental stacking'],
    source: 'migration',
    createdAt: '2026-07-29T00:00:00.000Z',
    updatedAt: '2026-07-29T00:00:00.000Z',
  };
  const result = compileShortChainImageGeneration({
    projectContext: context('project-aesthetic'),
    projectPromptAsset,
    task: {
      projectId: 'project-aesthetic',
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_three_quarter_wide',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Create a formal reception interior.',
    },
  });
  assert.match(result.compiledPrompt.finalPrompt, /restrained but not cold/u);
  assert.equal(result.compiledPrompt.trace.projectPromptAssetId, projectPromptAsset.id);
  assert.throws(() => compileShortChainImageGeneration({
    projectContext: context('project-other'),
    projectPromptAsset,
    task: {
      projectId: 'project-other',
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_view',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Create another project space.',
    },
  }), /cannot cross projects/u);
});

test('Common templates contain no benchmark-specific visual answers', () => {
  const publicTemplates = JSON.stringify(listShortChainTemplates());
  assert.doesNotMatch(publicTemplates, /九州|冯烫烫|深紫|陶红|羽翼|restrained but not cold/iu);
});
