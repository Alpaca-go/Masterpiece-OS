// A3-C / A3-D / A3-E Provenance Shape — offline contract tests
//
// Per A3 spec §15 / §16 / §17 / §18 / §19: every canonical
// Analysis Provider result carries a `provenance` object with
// { startedAt, latencyMs, status, retryCount, fallback, usage }.
// Additive — does NOT change the assertCanonicalAnalysisResult
// contract (which requires only runId / provider / model /
// completedAt / reportMarkdown).

import test from 'node:test';
import assert from 'node:assert/strict';
import { createQwenReasoner } from '@masterpiece/model-runtime/qwen-reasoner.js';
import { createVolcengineReasoner } from '@masterpiece/model-runtime/volcengine-reasoner.js';

function assertProvenanceShape(provenance, provider) {
  assert.ok(provenance, `provenance missing on ${provider} result`);
  assert.equal(typeof provenance.startedAt, 'string');
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(provenance.startedAt), `startedAt not ISO: ${provenance.startedAt}`);
  assert.equal(typeof provenance.latencyMs, 'number');
  assert.ok(provenance.latencyMs >= 0, `latencyMs < 0: ${provenance.latencyMs}`);
  assert.equal(provenance.status, 'ok');
  assert.equal(provenance.retryCount, 0);
  assert.equal(provenance.fallback, null);
  // usage may be null (provider did not return a usage block) or an
  // object with the canonical fields. If present, cost must be
  // 'UNKNOWN' (A2 spec §56) when no explicit pricing source exists.
  if (provenance.usage !== null) {
    assert.equal(typeof provenance.usage, 'object');
    assert.ok('inputTokens' in provenance.usage);
    assert.ok('outputTokens' in provenance.usage);
    assert.ok('totalTokens' in provenance.usage);
    assert.ok('raw' in provenance.usage);
    assert.equal(provenance.usage.cost, 'UNKNOWN');
  }
}

test('A3-C Qwen reasoner emits provenance with timing + status fields', async () => {
  let observedBody = null;
  const reasoner = createQwenReasoner({
    apiKey: 'test-key',
    model: 'qwen-vl-provenance-test',
    client: async (request) => {
      observedBody = request.body;
      return {
        id: 'qwen-provenance-run-1',
        model: 'qwen-vl-provenance-test',
        outputText: '# Visual Plan Upgrade Report\n\nOK',
      };
    },
  });
  const result = await reasoner({
    prompt: {
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'analyze' },
      ],
      attachments: [],
    },
  });
  assertProvenanceShape(result.provenance, 'qwen');
  assert.ok(observedBody, 'request body should have been sent');
  assert.equal(result.provenance.status, 'ok');
  assert.equal(result.provider, 'qwen');
  assert.ok(typeof result.runId === 'string' && result.runId.length > 0);
});

test('A3-C Volcengine reasoner emits provenance with timing + status fields', async () => {
  const reasoner = createVolcengineReasoner({
    apiKey: 'test-key',
    model: 'doubao-seed-2.1-turbo',
    client: async () => ({
      id: 'volcengine-provenance-run-1',
      model: 'doubao-seed-2.1-turbo',
      outputText: '# Visual Plan Upgrade Report\n\nOK',
    }),
  });
  const result = await reasoner({
    prompt: {
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'analyze' },
      ],
      attachments: [],
    },
  });
  assertProvenanceShape(result.provenance, 'volcengine');
  assert.equal(result.provenance.status, 'ok');
  assert.equal(result.provider, 'volcengine');
});

test('A3-E Qwen reasoner parses upstream usage block when present', async () => {
  const reasoner = createQwenReasoner({
    apiKey: 'test-key',
    model: 'qwen-vl-provenance-test',
    client: async () => ({
      id: 'qwen-usage-run-1',
      model: 'qwen-vl-provenance-test',
      outputText: '# OK',
      usage: {
        prompt_tokens: 123,
        completion_tokens: 45,
        total_tokens: 168,
        extra_field: 'preserved-in-raw',
      },
    }),
  });
  const result = await reasoner({
    prompt: {
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'analyze' },
      ],
      attachments: [],
    },
  });
  assert.ok(result.provenance.usage, 'usage should be populated when upstream returns it');
  assert.equal(result.provenance.usage.inputTokens, 123);
  assert.equal(result.provenance.usage.outputTokens, 45);
  assert.equal(result.provenance.usage.totalTokens, 168);
  assert.equal(result.provenance.usage.cost, 'UNKNOWN');
  assert.equal(result.provenance.usage.raw.extra_field, 'preserved-in-raw');
  assert.ok(Object.isFrozen(result.provenance.usage));
});

test('A3-E Volcengine reasoner parses upstream usage block when present', async () => {
  const reasoner = createVolcengineReasoner({
    apiKey: 'test-key',
    model: 'doubao-seed-2.1-turbo',
    client: async () => ({
      id: 'volcengine-usage-run-1',
      model: 'doubao-seed-2.1-turbo',
      outputText: '# OK',
      usage: {
        prompt_tokens: 99,
        completion_tokens: 11,
        total_tokens: 110,
      },
    }),
  });
  const result = await reasoner({
    prompt: {
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'analyze' },
      ],
      attachments: [],
    },
  });
  assert.ok(result.provenance.usage);
  assert.equal(result.provenance.usage.inputTokens, 99);
  assert.equal(result.provenance.usage.outputTokens, 11);
  assert.equal(result.provenance.usage.totalTokens, 110);
  assert.equal(result.provenance.usage.cost, 'UNKNOWN');
});

test('A3-E usage is null when the upstream does not return a usage block', async () => {
  const reasoner = createVolcengineReasoner({
    apiKey: 'test-key',
    model: 'doubao-seed-2.1-turbo',
    client: async () => ({
      id: 'volcengine-no-usage',
      model: 'doubao-seed-2.1-turbo',
      outputText: '# OK',
    }),
  });
  const result = await reasoner({
    prompt: {
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'analyze' },
      ],
      attachments: [],
    },
  });
  assert.equal(result.provenance.usage, null);
});

test('A3-D latencyMs is monotonic and non-negative', async () => {
  let observedStarted = null;
  const reasoner = createVolcengineReasoner({
    apiKey: 'test-key',
    model: 'doubao-seed-2.1-turbo',
    client: async () => {
      // Simulate a 30 ms upstream response
      await new Promise((resolve) => setTimeout(resolve, 30));
      return {
        id: 'volcengine-latency-1',
        model: 'doubao-seed-2.1-turbo',
        outputText: '# OK',
      };
    },
  });
  const startedAt = Date.now();
  const result = await reasoner({
    prompt: {
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'analyze' },
      ],
      attachments: [],
    },
  });
  const total = Date.now() - startedAt;
  observedStarted = result.provenance.startedAt;
  assert.ok(result.provenance.latencyMs >= 30, `latencyMs < 30: ${result.provenance.latencyMs}`);
  assert.ok(result.provenance.latencyMs <= total, `latencyMs > total: ${result.provenance.latencyMs} > ${total}`);
  // startedAt is captured BEFORE the client call; verify it is
  // strictly before the result's completedAt
  assert.ok(observedStarted <= result.completedAt, `startedAt > completedAt: ${observedStarted} > ${result.completedAt}`);
});
