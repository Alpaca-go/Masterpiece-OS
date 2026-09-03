import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  MODEL_REGISTRY_VERSION,
  IMAGE_REFERENCE_CAPABILITY_SCHEMA,
  PROVIDER_CAPABILITY_CONTRACT_MISMATCH,
  PROVIDER_CAPABILITY_INCOMPLETE,
  getRegisteredModel,
  inferModelType,
  listRegisteredModels,
  resolveImageReferenceCapability,
  validateModelProfile,
} from '@masterpiece/model-registry/index.js';

test('Model Registry v3 separates the analysis model from generation models', () => {
  assert.equal(MODEL_REGISTRY_VERSION, '3.0.0');
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
  assert.equal(getRegisteredModel('seedream-5.0-pro').maxReferenceImages, 10);
});

test('image-reference capabilities are normalized, immutable and deterministic', () => {
  const seedream = resolveImageReferenceCapability({
    registryModelId: 'seedream-5.0-pro',
    provider: 'volcengine',
    protocol: 'seedream-image',
  });
  const again = resolveImageReferenceCapability({ registryModelId: 'SEEDREAM-5.0-PRO' });
  assert.equal(seedream.schema, IMAGE_REFERENCE_CAPABILITY_SCHEMA);
  assert.equal(seedream.maxReferenceImages, 10);
  assert.deepEqual(seedream.supportedReferenceMimeTypes, ['image/jpeg', 'image/png']);
  assert.equal(seedream.capabilityFingerprint, again.capabilityFingerprint);
  assert.equal(seedream.capabilityFingerprint.length, 64);
  assert.ok(Object.isFrozen(seedream));
  assert.ok(Object.isFrozen(seedream.supportedReferenceMimeTypes));

  const wan = resolveImageReferenceCapability({ registryModelId: 'wan2.7-image-pro' });
  assert.equal(wan.maxReferenceImages, 9);
  assert.deepEqual(wan.supportedReferenceMimeTypes, [
    'image/bmp', 'image/jpeg', 'image/png', 'image/webp',
  ]);
});

test('unverified and mismatched image-reference contracts fail closed', () => {
  assert.throws(
    () => resolveImageReferenceCapability({ registryModelId: 'gpt-image-2' }),
    (error) => error.code === PROVIDER_CAPABILITY_INCOMPLETE,
  );
  assert.throws(
    () => resolveImageReferenceCapability({ registryModelId: 'nano-banana' }),
    (error) => error.code === PROVIDER_CAPABILITY_INCOMPLETE,
  );
  assert.throws(
    () => resolveImageReferenceCapability({
      registryModelId: 'seedream-5.0-pro',
      provider: 'dashscope',
    }),
    (error) => error.code === PROVIDER_CAPABILITY_CONTRACT_MISMATCH,
  );
});

test('capability fingerprint is stable across Node processes', () => {
  const child = spawnSync(process.execPath, [
    '--input-type=module',
    '--eval',
    "import { resolveImageReferenceCapability as resolve } from '@masterpiece/model-registry'; process.stdout.write(resolve({ registryModelId: 'seedream-5.0-pro' }).capabilityFingerprint);",
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(
    child.stdout,
    resolveImageReferenceCapability({ registryModelId: 'seedream-5.0-pro' })
      .capabilityFingerprint,
  );
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

test('custom video profiles are isolated from chat and image protocols', () => {
  assert.equal(inferModelType({ protocol: 'openai-video-generation' }), 'video_generation');
  assert.equal(validateModelProfile({
    modelType: 'video_generation',
    protocol: 'openai-video-generation',
    modelId: 'video-model',
  }).modelType, 'video_generation');
  assert.throws(() => validateModelProfile({
    modelType: 'video_generation',
    protocol: 'openai-chat-multimodal',
    modelId: 'video-model',
  }), (error) => error.code === 'MODEL_PROFILE_INCOMPATIBLE');
});
