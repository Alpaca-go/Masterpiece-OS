import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileDeliverablePrompt,
  createCompileFingerprint,
  verifyCompileFingerprint,
} from '../../packages/image-generation-runtime/src/deliverables/index.js';
import { evaluateDeliverableGate } from '../../packages/image-generation-runtime/src/gates/deliverable-gate.js';

function compiled(deliverable = 'interior_scene', prompt = '生成店内装修图') {
  return compileDeliverablePrompt({
    sourcePreset: 'visual_analysis',
    deliverable,
    userIntent: { prompt },
    references: [{ assetId: 'logo', generationRole: 'identity_reference' }],
  });
}

test('interior gate passes a complete prompt with identity reference', () => {
  const result = compiled();
  assert.deepEqual(evaluateDeliverableGate({
    deliverable: 'interior_scene',
    userIntentResolution: result.userIntentResolution,
    compiledPrompt: result.compiledPromptMarkdown,
    referencePlan: { selected: [{ assetId: 'logo', role: 'identity_reference' }] },
  }), []);
});

test('deliverable gate blocks incomplete spatial prompt and missing identity', () => {
  const errors = evaluateDeliverableGate({
    deliverable: 'interior_scene',
    userIntentResolution: { conflicts: [] },
    compiledPrompt: '空间',
    referencePlan: { selected: [] },
  });
  assert.ok(errors.some((item) => item.code === 'INTERIOR_SCENE_SPATIAL_REQUIREMENTS_MISSING'));
  assert.ok(errors.some((item) => item.code === 'DELIVERABLE_REFERENCE_MISMATCH'));
});

test('compile fingerprint becomes stale after intent, deliverable, references, or prompt changes', () => {
  const current = {
    sourceBundle: { schemaVersion: '3.0', sourcePreset: 'visual_analysis', deliverable: 'interior_scene' },
    userIntent: { prompt: '生成店内装修图' },
    deliverable: 'interior_scene',
    referencePlan: { selected: [{ assetId: 'logo', role: 'identity_reference' }] },
    compiledPrompt: 'prompt-v1',
  };
  const fingerprint = createCompileFingerprint({ ...current, compiledAt: '2026-07-27T00:00:00.000Z' });
  assert.equal(verifyCompileFingerprint(fingerprint, current).valid, true);
  for (const changed of [
    { ...current, userIntent: { prompt: '生成夜间店内装修图' } },
    { ...current, deliverable: 'storefront_scene' },
    { ...current, referencePlan: { selected: [{ assetId: 'space', role: 'spatial_reference' }] } },
    { ...current, compiledPrompt: 'prompt-v2' },
  ]) {
    const result = verifyCompileFingerprint(fingerprint, changed);
    assert.equal(result.valid, false);
    assert.equal(result.code, 'COMPILE_INPUT_STALE');
  }
});
