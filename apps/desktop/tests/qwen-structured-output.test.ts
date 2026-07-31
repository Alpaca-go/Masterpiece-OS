import assert from 'node:assert/strict';
import test from 'node:test';

// JavaScript runtime adapter intentionally has no declaration file.
// @ts-ignore
import { createQwenReasoner } from '../../../packages/model-runtime/src/qwen-reasoner.js';

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
