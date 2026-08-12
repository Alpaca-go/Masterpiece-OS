import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  AnalysisProviderError,
  createAnalysisProviderRegistry,
  normalizeAnalysisProviderError,
} from '@masterpiece/model-runtime/analysis-provider.js';
import { createDefaultAnalysisProviderRegistry } from '@masterpiece/model-runtime/analysis-provider-registry.js';
import { createQwenReasoner } from '@masterpiece/model-runtime/qwen-reasoner.js';

const baseline = JSON.parse(readFileSync(new URL('./provider-contract-fixtures/qwen-baseline.json', import.meta.url), 'utf8'));
const configuration = {
  provider: baseline.profileProvider,
  protocol: baseline.protocol,
  model: baseline.modelId,
  apiKey: 'fixture-secret',
  baseUrl: 'https://example.test/compatible-mode/v1',
};

test('default registry resolves the Qwen production baseline independently from model identity', () => {
  const registry = createDefaultAnalysisProviderRegistry();
  assert.equal(registry.resolve(configuration).id, baseline.providerId);
  assert.equal(registry.list().length, 1);
});

test('Qwen adapter preserves the request envelope baseline', async () => {
  const requests = [];
  const registry = createDefaultAnalysisProviderRegistry({
    qwen: {
      reasonerFactory: (options) => createQwenReasoner({
        ...options,
        client: async (request) => {
          requests.push(request);
          return { id: 'fixture-run', model: options.model, outputText: '# Fixture' };
        },
      }),
    },
  });
  const result = await registry.createReasoner(configuration)({
    prompt: {
      messages: [
        { role: 'system', content: 'System contract' },
        { role: 'user', content: 'User contract' },
      ],
      attachments: [],
    },
    responseSchemaName: 'analysis_result',
    responseSchema: { type: 'object', required: ['status'], properties: { status: { type: 'string' } } },
  });
  assert.equal(new URL(requests[0].url).pathname.endsWith(baseline.request.pathSuffix), true);
  assert.deepEqual(requests[0].body.messages.map((message) => message.role), baseline.request.messageRoles);
  assert.equal(requests[0].body.stream, baseline.request.stream);
  assert.equal(requests[0].body.response_format.type, baseline.request.structuredOutputType);
  assert.equal(result.provider, baseline.providerId);
  assert.equal(result.model, baseline.modelId);
});

test('unset provider with the baseline Qwen model resolves to Qwen', () => {
  const registry = createDefaultAnalysisProviderRegistry();
  assert.equal(registry.resolve({ protocol: baseline.protocol, model: baseline.modelId }).id, 'qwen');
});

test('fake second provider proves pluggability through the canonical result contract', async () => {
  const fake = {
    id: 'fixture-provider',
    capabilities: ['multimodal-analysis'],
    supports: (input) => input.provider === 'fixture-provider',
    createReasoner: (input) => async () => ({
      runId: 'fixture-provider-run', provider: 'fixture-provider', model: input.model,
      completedAt: '2026-08-12T00:00:00.000Z', reportMarkdown: '# Canonical result',
    }),
  };
  const registry = createAnalysisProviderRegistry([fake]);
  const result = await registry.createReasoner({ provider: 'fixture-provider', model: 'fixture-model' })({});
  assert.equal(result.reportMarkdown, '# Canonical result');
});

test('unknown providers fail explicitly without Qwen fallback', () => {
  const registry = createDefaultAnalysisProviderRegistry();
  for (const input of [
    { provider: 'unknown-provider', protocol: 'unknown', model: 'unknown-model' },
    { provider: 'unknown-provider', protocol: baseline.protocol, model: baseline.modelId },
    { provider: 'openai-compatible', protocol: baseline.protocol, model: 'non-qwen-model' },
  ]) {
    assert.throws(
      () => registry.resolve(input),
      (error) => error instanceof AnalysisProviderError && error.code === 'MODEL_UNAVAILABLE',
    );
  }
});

for (const [source, expected] of [
  [{ code: 'QWEN_API_ERROR', message: 'HTTP 401 unauthorized' }, 'AUTHENTICATION_FAILED'],
  [{ code: 'QWEN_REQUEST_TIMEOUT', message: 'timeout' }, 'TIMEOUT'],
  [{ code: 'QWEN_API_ERROR', message: 'HTTP 429 rate limit' }, 'RATE_LIMITED'],
  [{ code: 'QWEN_RESPONSE_INVALID', message: 'invalid response' }, 'MALFORMED_RESPONSE'],
  [{ code: 'QWEN_API_ERROR', message: 'HTTP 404 model not found' }, 'MODEL_UNAVAILABLE'],
]) {
  test(`provider error normalizes to ${expected}`, () => {
    assert.equal(normalizeAnalysisProviderError(source, 'qwen').code, expected);
  });
}

test('downstream production capabilities do not import or branch on provider implementations', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const scanRoots = [
    'packages/runtime-core/src/application',
    'packages/image-generation-runtime/src',
  ];
  const violations = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (/\.(?:js|ts)$/u.test(entry.name)) {
        const source = readFileSync(target, 'utf8');
        if (/from\s+['"]@masterpiece\/model-runtime\/qwen-reasoner/gu.test(source)
          || /provider\s*={2,3}\s*['"]qwen['"]/gu.test(source)) {
          violations.push(path.relative(root, target).replaceAll('\\', '/'));
        }
      }
    }
  };
  scanRoots.forEach((relativeRoot) => visit(path.join(root, relativeRoot)));
  assert.deepEqual(violations, []);
});
