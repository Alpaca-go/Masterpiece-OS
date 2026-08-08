import assert from 'node:assert/strict';
import test from 'node:test';
// These tests assert the legacy vNext space routing; pin it because R7 made
// phase9b_quality the default.
process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'vnext_legacy';
import {
  compileVNextImageGeneration,
  createVNextTaskContract,
  listVNextTemplates,
} from '@masterpiece/image-generation-runtime/vnext/index.js';

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

test('Phase 1 locks the requested deliverable in a short Task Contract', () => {
  const task = createVNextTaskContract({
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
  assert.throws(() => createVNextTaskContract({
    ...task,
    deliverableFamily: 'vi',
    subtype: 'unspecified',
  }), /concrete material subtype/u);
});

test('Phase 1 routes reception space only through space templates', () => {
  const result = compileVNextImageGeneration({
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

test('Phase 1 public templates contain no project-specific aesthetic answer', () => {
  const serialized = JSON.stringify(listVNextTemplates());
  assert.doesNotMatch(serialized, /九州|冯烫烫|深紫|陶红|羽翼/u);
});
