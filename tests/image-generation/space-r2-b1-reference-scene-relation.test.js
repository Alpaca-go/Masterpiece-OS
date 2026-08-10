// r2.0 §4.9: VNextReferenceSceneRelation is auxiliary metadata that describes
// how the reference image's scene relates to the target scene. It must NEVER
// replace Target Scene Functional Authority, and it is only meaningful for
// reference_first generations. For standard / continuation the field is
// omitted. This test pins the contract-level behavior.

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const taskContractUrl = pathToFileURL(
  path.join(repoRoot, 'packages/image-generation-runtime/src/vnext/task-contract.js'),
).href;
const { createVNextTaskContract } = await import(taskContractUrl);

function baseInput(overrides = {}) {
  return {
    projectId: 'project-r2-b1',
    deliverableFamily: 'space',
    subtype: 'consultation',
    shot: 'human_scale_consultation_view',
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: '生成咨询室',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: ['asset-ref-1'],
    logoUsageMode: 'post_composite',
    ...overrides,
  };
}

test('r2.0 B-1: reference_first + no referenceSceneRelation defaults to "unknown"', () => {
  const contract = createVNextTaskContract(baseInput({
    generationBasis: 'reference_first',
  }));
  assert.equal(contract.referenceSceneRelation, 'unknown');
});

test('r2.0 B-1: reference_first + cross_scene is preserved', () => {
  const contract = createVNextTaskContract(baseInput({
    generationBasis: 'reference_first',
    referenceSceneRelation: 'cross_scene',
  }));
  assert.equal(contract.referenceSceneRelation, 'cross_scene');
});

test('r2.0 B-1: reference_first + same_scene is preserved', () => {
  const contract = createVNextTaskContract(baseInput({
    generationBasis: 'reference_first',
    referenceSceneRelation: 'same_scene',
  }));
  assert.equal(contract.referenceSceneRelation, 'same_scene');
});

test('r2.0 B-1: reference_first + invalid value falls back to "unknown" (never throws)', () => {
  const contract = createVNextTaskContract(baseInput({
    generationBasis: 'reference_first',
    referenceSceneRelation: 'made_up_value',
  }));
  assert.equal(contract.referenceSceneRelation, 'unknown');
});

test('r2.0 B-1: reference_first + null falls back to "unknown"', () => {
  const contract = createVNextTaskContract(baseInput({
    generationBasis: 'reference_first',
    referenceSceneRelation: null,
  }));
  assert.equal(contract.referenceSceneRelation, 'unknown');
});

test('r2.0 B-1: standard omits referenceSceneRelation (not applicable)', () => {
  const contract = createVNextTaskContract(baseInput({
    generationBasis: 'standard',
    referenceAssetIds: [],
    referenceSceneRelation: 'cross_scene',
  }));
  assert.ok(!('referenceSceneRelation' in contract), 'field must be absent for standard');
});

test('r2.0 B-1: continuation omits referenceSceneRelation (world_consistency already expresses this)', () => {
  const contract = createVNextTaskContract(baseInput({
    generationBasis: 'continuation',
    referenceSceneRelation: 'cross_scene',
    continuation: {
      sourceAssetId: 'asset-confirmed',
      sourceRunId: 'run-source',
      sourceScene: 'reception',
      targetScene: 'consultation',
      confirmedAt: '2026-08-10T00:00:00.000Z',
      confirmationSource: 'user_explicit',
      referenceSource: 'confirmed_generated_output',
    },
  }));
  assert.ok(!('referenceSceneRelation' in contract), 'field must be absent for continuation');
});

test('r2.0 B-1: referenceSceneRelation never throws, even with totally bogus input', () => {
  // Sanity: the field is auxiliary. The contract must remain valid for any
  // value. This is the guarantee Reference Boundary (B-3) and Provider
  // capability detection (B-2) rely on — they read the field, they must
  // not have to wrap createVNextTaskContract in try / catch.
  const variants = [
    undefined,
    null,
    '',
    'same_scene',
    'cross_scene',
    'unknown',
    'unknown',
    42,
    {},
    [],
    'SAME_SCENE',
  ];
  for (const value of variants) {
    const contract = createVNextTaskContract(baseInput({
      generationBasis: 'reference_first',
      referenceSceneRelation: value,
    }));
    assert.ok(
      contract.referenceSceneRelation === undefined
        || ['same_scene', 'cross_scene', 'unknown'].includes(contract.referenceSceneRelation),
      `unexpected referenceSceneRelation for input ${JSON.stringify(value)}: ${contract.referenceSceneRelation}`,
    );
  }
});
