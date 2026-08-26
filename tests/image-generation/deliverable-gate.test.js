import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileDeliverablePrompt,
  createCompileFingerprint,
  verifyCompileFingerprint,
} from '@masterpiece/image-generation-runtime/deliverables/index.js';
import { evaluateDeliverableGate } from '@masterpiece/image-generation-runtime/gates/deliverable-gate.js';
import { compileImageGenerationTask } from '@masterpiece/image-generation-runtime/task-builder.js';

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

test('document-context brand poster exploration does not require an unavailable identity image', () => {
  const result = compileDeliverablePrompt({
    sourcePreset: 'document_context',
    purpose: 'exploration',
    deliverable: 'brand_poster',
    userIntent: { prompt: '根据品牌策划文档生成一张概念海报' },
    references: [],
  });
  const errors = evaluateDeliverableGate({
    deliverable: 'brand_poster',
    sourcePreset: 'document_context',
    purpose: 'exploration',
    userIntentResolution: result.userIntentResolution,
    compiledPrompt: result.compiledPromptMarkdown,
    referencePlan: { selected: [] },
  });
  assert.equal(errors.some((item) => item.code === 'DELIVERABLE_REFERENCE_MISMATCH'), false);

  const productionErrors = evaluateDeliverableGate({
    deliverable: 'brand_poster',
    sourcePreset: 'visual_analysis',
    purpose: 'production',
    userIntentResolution: result.userIntentResolution,
    compiledPrompt: result.compiledPromptMarkdown,
    referencePlan: { selected: [] },
  });
  assert.equal(productionErrors.some((item) => item.code === 'DELIVERABLE_REFERENCE_MISMATCH'), true);
});

test('document-context poster compiles end to end without fabricating a logo', () => {
  const result = compileImageGenerationTask({
    sources: {
      schemaVersion: '3.0',
      sourcePreset: 'document_context',
      deliverable: 'brand_poster',
      purpose: 'exploration',
      document: { documentRunId: 'document-run-1' },
      userIntent: { prompt: '根据品牌策划文档生成一张概念海报', aspectRatio: '3:4' },
    },
    context: {
      documentContext: { brandName: '示例品牌', targetAudience: ['年轻用户'] },
      references: [],
      warnings: [],
      sourceMetadata: { documentRunId: 'document-run-1' },
    },
    runId: 'document-poster-run',
    taskId: 'document-poster-task',
    capabilities: {
      modelId: 'wan2.7-image-pro',
      supportsTextToImage: true,
      supportsMultiImageReference: true,
      maxReferenceImages: 6,
      supportedSizes: ['1024*1024'],
    },
    providerConfig: { apiKey: 'OFFLINE_TEST', baseUrl: 'https://offline.invalid' },
    parameters: { size: '1024*1024', region: 'beijing' },
    createdAt: '2026-08-26T00:00:00.000Z',
  });
  assert.equal(result.gate.blocked, false, JSON.stringify(result.gate.errors));
  assert.ok(result.gate.warnings.some(
    (item) => item.code === 'BRAND_IDENTITY_NOT_FULLY_BOUND',
  ));
  assert.match(result.compiledPromptMarkdown, /不得生成、临摹或猜测 Logo/u);
  assert.deepEqual(result.referencePlan.missingRequiredRoles, []);
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
