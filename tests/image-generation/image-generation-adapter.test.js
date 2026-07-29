import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ImageGenerationAdapterError,
  createImageGenerationAdapter,
  createWanImageGenerationAdapter,
  resolveWanSize,
} from '../../packages/image-generation-adapter/src/index.js';

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

function sampleInput(overrides = {}) {
  return {
    prompt: 'Create a disciplined flagship interior with the approved identity.',
    promptVersion: 'prompt-template-1.0.0',
    references: [],
    model: 'wan2.7-image-pro',
    ratio: '16:9',
    count: 1,
    ...overrides,
  };
}

test('Wan adapter maps explicit ratios to supported provider sizes', () => {
  assert.equal(resolveWanSize('1:1'), '1440*1440');
  assert.equal(resolveWanSize('16:9'), '2048*1152');
  assert.equal(resolveWanSize('9:16'), '1152*2048');
  assert.equal(resolveWanSize('1024*1024'), '1024*1024');
  assert.throws(
    () => resolveWanSize('4:5'),
    (error) => error instanceof ImageGenerationAdapterError && error.code === 'IMAGE_RATIO_UNSUPPORTED',
  );
});

test('generateImage returns the provider-neutral result contract for synchronous Wan output', async () => {
  const calls = [];
  const adapter = createWanImageGenerationAdapter({
    apiKey: 'test-key',
    now: () => '2026-07-29T10:00:00.000Z',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response({
        request_id: 'req-sync',
        output: {
          choices: [{
            message: { content: [{ image: 'https://cdn.example/result.png' }] },
          }],
        },
      });
    },
  });

  const result = await adapter.generateImage(sampleInput());

  assert.deepEqual(result, {
    images: [{ url: 'https://cdn.example/result.png', b64: undefined, mimeType: 'image/png' }],
    model: 'wan2.7-image-pro',
    promptVersion: 'prompt-template-1.0.0',
    timestamp: '2026-07-29T10:00:00.000Z',
  });
  const requestBody = JSON.parse(calls[0].options.body);
  assert.equal(requestBody.parameters.size, '2048*1152');
  assert.equal(requestBody.parameters.n, 1);
});

test('generateImage handles the Wan asynchronous lifecycle without leaking it to callers', async () => {
  const calls = [];
  const adapter = createWanImageGenerationAdapter({
    apiKey: 'test-key',
    pollIntervalMs: 0,
    sleep: async () => undefined,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (String(url).includes('multimodal-generation')) {
        return response({ message: 'current user api does not support synchronous calls' }, 403);
      }
      if (options.method === 'POST') {
        return response({ request_id: 'req-submit', output: { task_id: 'task-1' } });
      }
      return response({
        request_id: 'req-status',
        output: {
          task_status: 'SUCCEEDED',
          results: [{ url: 'https://cdn.example/async.png' }],
        },
      });
    },
  });

  const result = await adapter.generateImage(sampleInput({ ratio: '1:1' }));

  assert.equal(result.images[0].url, 'https://cdn.example/async.png');
  assert.equal(calls.length, 3);
});

test('adapter validates traceability and refuses implicit provider routing', async () => {
  const adapter = createImageGenerationAdapter({
    provider: 'wan',
    apiKey: 'test-key',
    fetchImpl: async () => response({}),
  });
  assert.equal(adapter.adapterId, 'wan');
  await assert.rejects(
    () => adapter.generateImage(sampleInput({ promptVersion: '' })),
    (error) => error.code === 'PROMPT_VERSION_REQUIRED',
  );
  assert.throws(
    () => createImageGenerationAdapter({ provider: 'automatic' }),
    /Unsupported image generation provider/,
  );
});
