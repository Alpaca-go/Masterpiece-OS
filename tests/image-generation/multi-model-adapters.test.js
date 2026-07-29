import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMultiModelImageAdapter,
  listMultiModelAdapters,
} from '../../packages/image-generation-adapter/src/multi-model.js';

const universal = {
  prompt: 'Approved Visual Canon commercial scene.',
  negativeRules: ['Do not copy anchor text.'],
  aspectRatio: '16:9',
  imageSize: '2K',
  outputCount: 1,
  references: [{
    name: 'identity.png',
    mimeType: 'image/png',
    data: Buffer.from('identity').toString('base64'),
  }],
};

test('Model Adapter Layer exposes GPT, Nano Banana and Seedream behind one contract', () => {
  assert.deepEqual(
    listMultiModelAdapters().map((adapter) => adapter.id),
    ['gpt-image-2', 'nano-banana', 'seedream-5.0-pro'],
  );
});

test('GPT Adapter maps generation and reference editing to separate official endpoints', () => {
  const adapter = createMultiModelImageAdapter({
    adapterId: 'gpt-image-2',
    apiKey: 'test-key',
  });
  const generation = adapter.compileRequest({ ...universal, references: [] });
  const edit = adapter.compileRequest(universal);
  assert.match(generation.url, /\/v1\/images\/generations$/u);
  assert.equal(generation.bodyKind, 'json');
  assert.match(edit.url, /\/v1\/images\/edits$/u);
  assert.equal(edit.bodyKind, 'multipart');
  assert.equal(edit.body.files[0].field, 'image[]');
  assert.match(edit.body.fields.prompt, /Approved Visual Canon/u);
});

test('Nano Banana Adapter maps references, ratio and image size to Interactions', () => {
  const adapter = createMultiModelImageAdapter({
    adapterId: 'nano-banana',
    apiKey: 'test-key',
  });
  const request = adapter.compileRequest(universal);
  assert.match(request.url, /\/v1beta\/interactions$/u);
  assert.equal(request.headers['x-goog-api-key'], 'test-key');
  assert.equal(request.body.model, 'gemini-3.1-flash-image');
  assert.equal(request.body.input[1].type, 'image');
  assert.equal(request.body.response_format.aspect_ratio, '16:9');
  assert.equal(request.body.response_format.image_size, '2K');
});

test('Seedream Adapter maps Chinese commercial task and references to image generations', () => {
  const adapter = createMultiModelImageAdapter({
    adapterId: 'seedream-5.0-pro',
    apiKey: 'test-key',
  });
  const request = adapter.compileRequest(universal);
  assert.match(request.url, /\/api\/v3\/images\/generations$/u);
  assert.match(request.body.prompt, /生成一张完整/u);
  assert.match(request.body.image[0], /^data:image\/png;base64,/u);
  assert.equal(request.body.size, '2K');
  assert.equal('quality' in request.body, false);
  assert.equal('sequential_image_generation' in request.body, false);
});

test('Seedream Adapter sends sequential generation only to models that support it', () => {
  const seedream4 = createMultiModelImageAdapter({
    adapterId: 'seedream-5.0-pro',
    apiKey: 'test-key',
    modelId: 'doubao-seedream-4-0-250828',
  });
  assert.equal(
    seedream4.compileRequest({ ...universal, references: [] })
      .body.sequential_image_generation,
    'disabled',
  );

  const seedream5 = createMultiModelImageAdapter({
    adapterId: 'seedream-5.0-pro',
    apiKey: 'test-key',
    modelId: 'doubao-seedream-5-0-pro-260628',
  });
  assert.equal(
    'sequential_image_generation' in seedream5.compileRequest({
      ...universal,
      references: [],
    }).body,
    false,
  );
});

test('multi-model adapters accept either an API root or a complete endpoint URL', () => {
  const seedream = createMultiModelImageAdapter({
    adapterId: 'seedream-5.0-pro',
    apiKey: 'test-key',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/images/generations/',
  });
  assert.equal(
    seedream.compileRequest({ ...universal, references: [] }).url,
    'https://ark.cn-beijing.volces.com/api/v3/images/generations',
  );
  const seedreamTextToImage = seedream.compileRequest({ ...universal, references: [] });
  assert.equal('image' in seedreamTextToImage.body, false);
  assert.equal(seedreamTextToImage.body.size, '2K');
  assert.match(seedreamTextToImage.body.prompt, /Output aspect ratio: 16:9/u);

  const gpt = createMultiModelImageAdapter({
    adapterId: 'gpt-image-2',
    apiKey: 'test-key',
    baseUrl: 'https://api.openai.com/v1/images/generations',
  });
  assert.equal(
    gpt.compileRequest({ ...universal, references: [] }).url,
    'https://api.openai.com/v1/images/generations',
  );
  assert.equal(gpt.compileRequest(universal).url, 'https://api.openai.com/v1/images/edits');
});

test('all adapters normalize base64 and URL image responses', () => {
  const gpt = createMultiModelImageAdapter({
    adapterId: 'gpt-image-2',
    apiKey: 'test-key',
  });
  assert.equal(gpt.parseResponse({ data: [{ b64_json: 'abc' }] }).images[0].b64, 'abc');
  const nano = createMultiModelImageAdapter({
    adapterId: 'nano-banana',
    apiKey: 'test-key',
  });
  assert.equal(nano.parseResponse({
    output_image: { data: 'def', mime_type: 'image/jpeg' },
  }).images[0].mimeType, 'image/jpeg');
  const seedream = createMultiModelImageAdapter({
    adapterId: 'seedream-5.0-pro',
    apiKey: 'test-key',
  });
  assert.equal(seedream.parseResponse({ data: [{ url: 'https://example.test/image.png' }] })
    .images[0].url, 'https://example.test/image.png');
});
