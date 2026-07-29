import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MODEL_REGISTRY_VERSION,
  getRegisteredModel,
  inferModelType,
  listRegisteredModels,
  validateModelProfile,
} from '../packages/model-registry/src/index.js';

test('Model Registry v2 separates the analysis model from generation models', () => {
  assert.equal(MODEL_REGISTRY_VERSION, '2.0.0');
  assert.deepEqual(
    listRegisteredModels({ type: 'analysis' }).map((model) => model.id),
    ['qwen3.6-plus'],
  );
  assert.deepEqual(
    listRegisteredModels({ type: 'image_generation' })
      .filter((model) => model.enabledByDefault)
      .map((model) => model.id),
    ['gpt-image-2', 'nano-banana', 'seedream-5.0-pro'],
  );
  assert.equal(getRegisteredModel('gpt-image-2').referenceSupport, true);
});

test('Model Registry blocks analysis/generation responsibility conflicts', () => {
  assert.deepEqual(validateModelProfile({
    registryModelId: 'gpt-image-2',
    modelId: 'gpt-image-2',
    modelType: 'image_generation',
    protocol: 'openai-image-generation',
  }).capabilities, ['space', 'product', 'poster']);
  assert.throws(
    () => validateModelProfile({
      registryModelId: 'qwen3.6-plus',
      modelId: 'qwen3.6-plus',
      modelType: 'image_generation',
      protocol: 'openai-image-generation',
    }),
    (error) => error.code === 'MODEL_PROFILE_INCOMPATIBLE',
  );
  assert.equal(inferModelType({
    modelId: 'custom-image',
    protocol: 'seedream-image',
  }), 'image_generation');
});
