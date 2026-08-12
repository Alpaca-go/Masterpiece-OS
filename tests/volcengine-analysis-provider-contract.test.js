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
import { createVolcengineReasoner } from '@masterpiece/model-runtime/volcengine-reasoner.js';
import { createVolcengineAnalysisProvider } from '@masterpiece/model-runtime/volcengine-analysis-provider.js';

const baseline = JSON.parse(readFileSync(new URL('./provider-contract-fixtures/volcengine-baseline.json', import.meta.url), 'utf8'));

const configuration = {
  provider: baseline.profileProvider,
  protocol: baseline.protocol,
  model: baseline.modelId,
  apiKey: 'fixture-secret',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/plan/v3',
};

test('Volcengine adapter resolves the configured Profile and stays out of the default registry', () => {
  const defaultRegistry = createDefaultAnalysisProviderRegistry();
  assert.equal(defaultRegistry.list().length, 1);
  assert.equal(defaultRegistry.list()[0].id, 'qwen');

  const a2Registry = createDefaultAnalysisProviderRegistry({
    additionalProviders: [createVolcengineAnalysisProvider()],
  });
  const ids = a2Registry.list().map((entry) => entry.id);
  assert.deepEqual(ids, ['qwen', 'volcengine']);
  assert.equal(a2Registry.resolve(configuration).id, baseline.providerId);
});

for (const matcher of baseline.supportsMatchers) {
  test(`Volcengine supports() ${matcher.expected ? 'matches' : 'rejects'} ${matcher.provider}/${matcher.model} on ${matcher.protocol}`, () => {
    const provider = createVolcengineAnalysisProvider();
    const input = { provider: matcher.provider, model: matcher.model, protocol: matcher.protocol };
    assert.equal(provider.supports(input), matcher.expected);
  });
}

test('Volcengine adapter preserves the request envelope baseline', async () => {
  const requests = [];
  const provider = createVolcengineAnalysisProvider({
    reasonerFactory: (options) => createVolcengineReasoner({
      ...options,
      client: async (request) => {
        requests.push(request);
        return { id: 'fixture-volcengine-run', model: options.model, outputText: '# Volcengine fixture' };
      },
    }),
  });
  const result = await provider.createReasoner(configuration)({
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
  assert.equal(requests[0].headers.Authorization, 'Bearer fixture-secret');
  assert.equal(result.provider, baseline.providerId);
  assert.equal(result.model, baseline.modelId);
  assert.equal(result.reportMarkdown, '# Volcengine fixture');
});

test('Volcengine adapter redacts the API key from error messages via the registry', async () => {
  const provider = createVolcengineAnalysisProvider({
    reasonerFactory: (options) => createVolcengineReasoner({
      ...options,
      client: async () => {
        throw new Error(`Upstream failed: API key=fixture-secret was rejected`);
      },
    }),
  });
  const registry = createAnalysisProviderRegistry([provider]);
  await assert.rejects(
    () => registry.createReasoner(configuration)({ prompt: { messages: [], attachments: [] } }),
    (error) => {
      assert.equal(error instanceof AnalysisProviderError, true);
      assert.equal(error.code, 'REQUEST_FAILED');
      assert.equal(error.message.includes('fixture-secret'), false);
      return true;
    },
  );
});

test('Volcengine adapter rejects missing API key and missing model', () => {
  assert.throws(
    () => createVolcengineReasoner({ apiKey: '', model: 'doubao-seed-2.1-turbo' }),
    (error) => error.code === 'VOLCENGINE_API_KEY_MISSING',
  );
  assert.throws(
    () => createVolcengineReasoner({ apiKey: 'fixture-secret', model: '' }),
    (error) => error.code === 'VOLCENGINE_MODEL_MISSING',
  );
});

test('Volcengine adapter rejects unsupported profiles explicitly', () => {
  const provider = createVolcengineAnalysisProvider();
  assert.equal(provider.supports({ provider: 'volcengine', model: 'doubao-seed-2.1-turbo', protocol: 'seedream-image' }), false);
  assert.equal(provider.supports({ provider: 'qwen', model: 'qwen3.6-plus', protocol: 'openai-chat-multimodal' }), false);
  assert.throws(
    () => createDefaultAnalysisProviderRegistry({ additionalProviders: [provider] }).resolve({ provider: 'unknown', protocol: 'openai-chat-multimodal', model: 'unknown' }),
    (error) => error instanceof AnalysisProviderError && error.code === 'MODEL_UNAVAILABLE',
  );
});

for (const [source, expected] of [
  [{ code: 'VOLCENGINE_API_ERROR', message: 'HTTP 401 unauthorized' }, 'AUTHENTICATION_FAILED'],
  [{ code: 'VOLCENGINE_REQUEST_TIMEOUT', message: 'timeout' }, 'TIMEOUT'],
  [{ code: 'VOLCENGINE_API_ERROR', message: 'HTTP 429 rate limit' }, 'RATE_LIMITED'],
  [{ code: 'VOLCENGINE_RESPONSE_INVALID', message: 'invalid response' }, 'MALFORMED_RESPONSE'],
  [{ code: 'VOLCENGINE_API_ERROR', message: 'HTTP 404 model not found' }, 'MODEL_UNAVAILABLE'],
]) {
  test(`Volcengine error normalizes to ${expected}`, () => {
    assert.equal(normalizeAnalysisProviderError(source, 'volcengine').code, expected);
  });
}

test('Qwen baseline registry is preserved when Volcengine is added via additionalProviders', () => {
  // Same-Profile resolution must still pick Qwen for qwen credentials.
  const qwenConfiguration = {
    provider: 'qwen',
    protocol: 'openai-chat-multimodal',
    model: 'qwen3.6-plus',
    apiKey: 'fixture-secret',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  };
  const a2Registry = createDefaultAnalysisProviderRegistry({
    additionalProviders: [createVolcengineAnalysisProvider()],
  });
  assert.equal(a2Registry.resolve(qwenConfiguration).id, 'qwen');
  assert.equal(a2Registry.resolve(configuration).id, 'volcengine');
});

test('A2 production downstream does not import or branch on Volcengine Provider identity', () => {
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
        if (/from\s+['"]@masterpiece\/model-runtime\/volcengine-(?:reasoner|analysis-provider)/gu.test(source)
          || /provider\s*={2,3}\s*['"]volcengine['"]/gu.test(source)) {
          violations.push(path.relative(root, target).replaceAll('\\', '/'));
        }
      }
    }
  };
  scanRoots.forEach((relativeRoot) => visit(path.join(root, relativeRoot)));
  assert.deepEqual(violations, []);
});
