// A3-D / A3-E Observability Fields — offline contract tests
//
// Per A3 spec §16 / §17 / §18 / §19: the reasoner layer must
// expose `providerInvocationMs` (via provenance.latencyMs) and
// `usage` (inputTokens / outputTokens / totalTokens / raw / cost)
// in a way that consumers can aggregate downstream.
//
// These tests pin the observability fields' SHAPE on the canonical
// result so future reasoner implementations cannot silently drop
// them. They do NOT exercise the network.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createQwenReasoner } from '@masterpiece/model-runtime/qwen-reasoner.js';
import { createVolcengineReasoner } from '@masterpiece/model-runtime/volcengine-reasoner.js';
import { createDefaultAnalysisProviderRegistry } from '@masterpiece/model-runtime/analysis-provider-registry.js';

test('A3-D providerInvocationMs (latencyMs) is a non-negative integer-ish number', async () => {
  const reasoner = createVolcengineReasoner({
    apiKey: 'k',
    model: 'doubao-seed-2.1-turbo',
    client: async () => ({ id: 'r', model: 'doubao-seed-2.1-turbo', outputText: '# OK' }),
  });
  const result = await reasoner({
    prompt: { messages: [{ role: 'user', content: 'x' }], attachments: [] },
  });
  assert.equal(typeof result.provenance.latencyMs, 'number');
  assert.ok(Number.isFinite(result.provenance.latencyMs));
  assert.ok(result.provenance.latencyMs >= 0);
});

test('A3-E usage fields are null when upstream omits usage (cost=UNKNOWN honored)', async () => {
  const reasoner = createQwenReasoner({
    apiKey: 'k',
    model: 'qwen-vl-obs',
    client: async () => ({ id: 'r', model: 'qwen-vl-obs', outputText: '# OK' }),
  });
  const result = await reasoner({
    prompt: { messages: [{ role: 'user', content: 'x' }], attachments: [] },
  });
  assert.equal(result.provenance.usage, null);
});

test('A3-E usage.cost is the literal string "UNKNOWN" when usage is present', async () => {
  const reasoner = createQwenReasoner({
    apiKey: 'k',
    model: 'qwen-vl-obs',
    client: async () => ({
      id: 'r',
      model: 'qwen-vl-obs',
      outputText: '# OK',
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
  });
  const result = await reasoner({
    prompt: { messages: [{ role: 'user', content: 'x' }], attachments: [] },
  });
  assert.ok(result.provenance.usage);
  assert.equal(result.provenance.usage.cost, 'UNKNOWN');
});

test('A3-E usage.totalTokens is computed as prompt+completion when upstream omits total_tokens', async () => {
  const reasoner = createVolcengineReasoner({
    apiKey: 'k',
    model: 'doubao-seed-2.1-turbo',
    client: async () => ({
      id: 'r',
      model: 'doubao-seed-2.1-turbo',
      outputText: '# OK',
      usage: { prompt_tokens: 7, completion_tokens: 3 },  // no total_tokens
    }),
  });
  const result = await reasoner({
    prompt: { messages: [{ role: 'user', content: 'x' }], attachments: [] },
  });
  assert.ok(result.provenance.usage);
  assert.equal(result.provenance.usage.inputTokens, 7);
  assert.equal(result.provenance.usage.outputTokens, 3);
  assert.equal(result.provenance.usage.totalTokens, 10);
  assert.equal(result.provenance.usage.cost, 'UNKNOWN');
});

test('A3-E usage handles partial / weird upstream shapes without crashing', async () => {
  const reasoner = createVolcengineReasoner({
    apiKey: 'k',
    model: 'doubao-seed-2.1-turbo',
    client: async () => ({
      id: 'r',
      model: 'doubao-seed-2.1-turbo',
      outputText: '# OK',
      usage: { foo: 'bar', not_a_number: 'oops' },  // no recognized fields
    }),
  });
  const result = await reasoner({
    prompt: { messages: [{ role: 'user', content: 'x' }], attachments: [] },
  });
  assert.ok(result.provenance.usage);
  assert.equal(result.provenance.usage.inputTokens, null);
  assert.equal(result.provenance.usage.outputTokens, null);
  assert.equal(result.provenance.usage.totalTokens, null);
  assert.equal(result.provenance.usage.cost, 'UNKNOWN');
  assert.equal(result.provenance.usage.raw.foo, 'bar');
  assert.ok(Object.isFrozen(result.provenance.usage));
});

test('A3-C provenance object is frozen on the canonical result (both providers)', async () => {
  const qwen = createQwenReasoner({
    apiKey: 'k', model: 'qwen-vl-obs',
    client: async () => ({ id: 'r', model: 'qwen-vl-obs', outputText: '# OK' }),
  });
  const volcengine = createVolcengineReasoner({
    apiKey: 'k', model: 'doubao-seed-2.1-turbo',
    client: async () => ({ id: 'r', model: 'doubao-seed-2.1-turbo', outputText: '# OK' }),
  });
  const qwenResult = await qwen({ prompt: { messages: [{ role: 'user', content: 'x' }], attachments: [] } });
  const volcengineResult = await volcengine({ prompt: { messages: [{ role: 'user', content: 'x' }], attachments: [] } });
  assert.ok(Object.isFrozen(qwenResult.provenance));
  assert.ok(Object.isFrozen(volcengineResult.provenance));
});

test('A3-C provenance is preserved by the registry wrapper', async () => {
  const mockClient = async () => ({
    id: 'volcengine-registry-wrapper',
    model: 'doubao-seed-2.1-turbo',
    outputText: '# OK',
  });
  const registry = createDefaultAnalysisProviderRegistry();
  const provider = registry.resolve({ provider: 'volcengine', model: 'doubao-seed-2.1-turbo' });
  const reasoner = provider.createReasoner({
    provider: 'volcengine',
    model: 'doubao-seed-2.1-turbo',
    apiKey: 'test-key',
    client: mockClient,
  });
  const result = await reasoner({
    prompt: { messages: [{ role: 'user', content: 'x' }], attachments: [] },
  });
  assert.ok(result.provenance);
  assert.equal(result.provenance.status, 'ok');
  assert.equal(typeof result.provenance.latencyMs, 'number');
  assert.equal(result.provenance.retryCount, 0);
  assert.equal(result.provenance.fallback, null);
});
