import test from 'node:test';
import assert from 'node:assert/strict';
import { runProviderConnectionTest } from '@masterpiece/runtime-core/application/provider-connection-test.ts';

function response(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 500 ? 'Internal Server Error' : 'OK',
    headers: new Headers(headers),
    text: async () => JSON.stringify(body),
  } as Response;
}

test('Seedream connection test posts minimal model/prompt payload to images generations', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const result = await runProviderConnectionTest({
    provider: 'volcengine-ark',
    protocol: 'seedream-image',
    modelType: 'image_generation',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    model: 'doubao-seedream-5-0-pro-260628',
    apiKey: 'sk-seedream-secret',
  }, {
    fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return response(200, {
        model: 'doubao-seedream-5-0-pro-260628',
        data: [{ url: 'https://example.test/test.jpg' }],
      });
    }) as typeof fetch,
    logFailure: () => undefined,
  });

  assert.equal(result.ok, true);
  assert.equal(result.requestInterface, 'image_generation');
  assert.equal(calls[0]!.url, 'https://ark.cn-beijing.volces.com/api/v3/images/generations');
  assert.equal(calls[0]!.init?.method, 'POST');
  const body = JSON.parse(String(calls[0]!.init?.body));
  assert.deepEqual(Object.keys(body).sort(), ['model', 'prompt']);
  assert.equal(body.model, 'doubao-seedream-5-0-pro-260628');
  assert.equal('messages' in body, false);
});

test('connection failure preserves upstream status, body, code, message and request id without leaking key', async () => {
  const logs: Record<string, unknown>[] = [];
  const secret = 'sk-never-log-this';
  const result = await runProviderConnectionTest({
    provider: 'volcengine-ark',
    protocol: 'seedream-image',
    modelType: 'image_generation',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-seedream-5-0-pro-260628',
    apiKey: secret,
  }, {
    fetchImpl: (async () => response(500, {
      error: {
        code: 'InternalServiceError',
        message: `Unexpected upstream failure; key=${secret}`,
      },
    }, { 'x-request-id': 'req-seedream-500' })) as typeof fetch,
    logFailure: (record) => logs.push(record),
  });

  assert.equal(result.ok, false);
  assert.equal(result.provider, 'volcengine-ark');
  assert.equal(result.requestInterface, 'image_generation');
  assert.equal(result.httpStatus, 500);
  assert.equal(result.upstreamErrorCode, 'InternalServiceError');
  assert.match(result.upstreamErrorMessage || '', /\[REDACTED\]/);
  assert.equal(result.requestId, 'req-seedream-500');
  assert.match(result.responseBody || '', /InternalServiceError/);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
  assert.doesNotMatch(JSON.stringify(logs), new RegExp(secret));
});

test('chat and video profiles use their own endpoint and payload families', async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init?.body)),
    });
    return response(200, { id: `request-${calls.length}` });
  }) as typeof fetch;

  await runProviderConnectionTest({
    provider: 'openai-compatible',
    protocol: 'openai-chat-multimodal',
    modelType: 'analysis',
    baseUrl: 'https://example.test/v1',
    model: 'chat-model',
    apiKey: 'chat-secret',
  }, { fetchImpl, logFailure: () => undefined });
  await runProviderConnectionTest({
    provider: 'video-provider',
    protocol: 'openai-video-generation',
    modelType: 'video_generation',
    baseUrl: 'https://video.example.test/v1/images/generations',
    model: 'video-model',
    apiKey: 'video-secret',
  }, { fetchImpl, logFailure: () => undefined });

  assert.equal(calls[0]!.url, 'https://example.test/v1/chat/completions');
  assert.equal(Array.isArray(calls[0]!.body.messages), true);
  assert.equal(calls[1]!.url, 'https://video.example.test/v1/videos');
  assert.equal('prompt' in calls[1]!.body, true);
  assert.equal('messages' in calls[1]!.body, false);
});
