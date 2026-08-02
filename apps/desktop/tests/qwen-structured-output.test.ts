import assert from 'node:assert/strict';
import test from 'node:test';

// JavaScript runtime adapter intentionally has no declaration file.
// @ts-ignore
import { createQwenReasoner } from '@masterpiece/model-runtime/qwen-reasoner.js';

test('Qwen reasoner forwards strict JSON Schema for targeted repair calls', async () => {
  let capturedBody: Record<string, unknown> | undefined;
  const reasoner = createQwenReasoner({
    apiKey: 'test-key',
    model: 'test-model',
    baseUrl: 'https://example.invalid/v1',
    client: async (request: { body: Record<string, unknown> }) => {
      capturedBody = request.body;
      return {
        id: 'repair-response-1',
        model: 'test-model',
        choices: [{
          message: {
            content: JSON.stringify({
              repairs: [{
                path: 'creativeDecision.toneBoundaries',
                value: [
                  { target: 'clear', avoid: ['generic'] },
                  { target: 'warm', avoid: ['decorative'] },
                ],
                status: 'proposed',
                confidence: 0.8,
                evidenceRefs: ['asset:1'],
              }],
            }),
          },
        }],
      };
    },
  });
  const schema = {
    type: 'object',
    required: ['repairs'],
    properties: { repairs: { type: 'array' } },
  };

  await reasoner({
    prompt: {
      messages: [
        { role: 'system', content: 'Return JSON.' },
        { role: 'user', content: 'Repair one field.' },
      ],
      attachments: [],
    },
    responseSchema: schema,
    responseSchemaName: 'analysis_repair',
  });

  assert.deepEqual(capturedBody?.response_format, {
    type: 'json_schema',
    json_schema: {
      name: 'analysis_repair',
      strict: true,
      schema,
    },
  });
});

test('Qwen reasoner automatically retries transient provider failures', async () => {
  let calls = 0;
  const diagnostics: Array<Record<string, unknown>> = [];
  const reasoner = createQwenReasoner({
    apiKey: 'test-key', model: 'test-model', baseUrl: 'https://example.invalid/v1',
    retryBaseDelayMs: 1,
    sleep: async () => undefined,
    onDiagnostic: (value: Record<string, unknown>) => diagnostics.push(value),
    client: async () => {
      calls += 1;
      if (calls < 3) throw Object.assign(new Error('HTTP 503 temporarily unavailable'), { code: 'QWEN_API_TRANSIENT' });
      return { id: 'ok', model: 'test-model', choices: [{ message: { content: '{}' } }] };
    },
  });
  const result = await reasoner({
    prompt: { messages: [{ role: 'system', content: '' }, { role: 'user', content: '' }], attachments: [] },
    signal: new AbortController().signal,
  });
  assert.equal(result.reportMarkdown, '{}');
  assert.equal(calls, 3);
  assert.deepEqual(diagnostics.filter((item) => item.type === 'request-retry').map((item) => item.nextAttempt), [2, 3]);
});

test('Qwen reasoner does not retry authentication or configuration failures', async () => {
  let calls = 0;
  const reasoner = createQwenReasoner({
    apiKey: 'test-key', model: 'test-model', baseUrl: 'https://example.invalid/v1',
    sleep: async () => undefined,
    client: async () => {
      calls += 1;
      throw Object.assign(new Error('HTTP 401 unauthorized'), { code: 'QWEN_AUTH_FAILED' });
    },
  });
  await assert.rejects(reasoner({
    prompt: { messages: [{ role: 'system', content: '' }, { role: 'user', content: '' }], attachments: [] },
    signal: new AbortController().signal,
  }), /401/u);
  assert.equal(calls, 1);
});
