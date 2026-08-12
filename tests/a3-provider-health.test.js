// A3-F Provider Health — offline contract tests
//
// Per A3 spec §20 / §21: getProviderHealth / setProviderHealth
// expose a 4-state health model (configured / available / degraded
// / unavailable; + 'unknown' as initial). The actual probe is a
// manual / opt-in script in scripts/a3-provider-health-probe.mjs;
// this test only exercises the cache layer (no network).
//
// Tests:
//   1. initial state for a registered provider is 'unknown'
//   2. initial state for an unregistered provider is 'unavailable'
//   3. setProviderHealth('volcengine', 'available') -> get returns 'available'
//   4. setProviderHealth with invalid state throws TypeError
//   5. clearProviderHealth removes the cache entry
//   6. setProviderHealth('qwen', 'degraded', { error }) -> lastError recorded
//   7. listProviderHealth returns an array of cache entries

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProviderHealth,
  setProviderHealth,
  clearProviderHealth,
  listProviderHealth,
  PROVIDER_HEALTH_STATES,
} from '@masterpiece/model-runtime/provider-health.js';
import { getCurrentProviderPolicy } from '@masterpiece/runtime-core/application/provider-policy.js';

test('A3-F initial state for a registered provider is "unknown"', () => {
  clearProviderHealth('volcengine');
  clearProviderHealth('qwen');
  const policy = getCurrentProviderPolicy();
  const defaultProvider = policy.default.provider;
  const health = getProviderHealth(defaultProvider);
  assert.equal(health.state, 'unknown');
  assert.equal(health.registered, true);
  assert.equal(health.lastCheckedAt, null);
  assert.equal(health.lastError, null);
});

test('A3-F initial state for an unregistered provider is "unavailable"', () => {
  const health = getProviderHealth('not-a-real-provider-xyz');
  assert.equal(health.state, 'unavailable');
  assert.equal(health.registered, false);
});

test('A3-F setProviderHealth then get returns the cached state', () => {
  clearProviderHealth('volcengine');
  setProviderHealth('volcengine', 'available');
  const health = getProviderHealth('volcengine');
  assert.equal(health.state, 'available');
  assert.equal(health.registered, true);
  assert.ok(typeof health.lastCheckedAt === 'string' && health.lastCheckedAt.length > 0);
  assert.equal(health.lastError, null);
  clearProviderHealth('volcengine');
});

test('A3-F setProviderHealth with invalid state throws TypeError', () => {
  assert.throws(() => setProviderHealth('volcengine', 'mystery'), TypeError);
  assert.throws(() => setProviderHealth('volcengine', 'unknown'), /initial state/);
  assert.throws(() => setProviderHealth('volcengine', null), TypeError);
});

test('A3-F clearProviderHealth removes the cache entry', () => {
  setProviderHealth('qwen', 'available');
  clearProviderHealth('qwen');
  const health = getProviderHealth('qwen');
  assert.equal(health.state, 'unknown');
});

test('A3-F setProviderHealth with error records lastError', () => {
  clearProviderHealth('qwen');
  setProviderHealth('qwen', 'unavailable', { error: 'AUTH failed' });
  const health = getProviderHealth('qwen');
  assert.equal(health.state, 'unavailable');
  assert.equal(health.lastError, 'AUTH failed');
  clearProviderHealth('qwen');
});

test('A3-F setProviderHealth with explicit checkedAt overrides timestamp', () => {
  clearProviderHealth('volcengine');
  const explicit = '2026-08-12T00:00:00.000Z';
  setProviderHealth('volcengine', 'available', { checkedAt: explicit });
  const health = getProviderHealth('volcengine');
  assert.equal(health.lastCheckedAt, explicit);
  clearProviderHealth('volcengine');
});

test('A3-F listProviderHealth returns an array of cache entries', () => {
  clearProviderHealth('volcengine');
  clearProviderHealth('qwen');
  setProviderHealth('volcengine', 'available');
  setProviderHealth('qwen', 'degraded');
  const list = listProviderHealth();
  assert.ok(Array.isArray(list));
  const ids = list.map((entry) => entry.provider).sort();
  assert.deepEqual(ids, ['qwen', 'volcengine']);
  clearProviderHealth('volcengine');
  clearProviderHealth('qwen');
});

test('A3-F getProviderHealth requires a providerId', () => {
  assert.throws(() => getProviderHealth(''), TypeError);
  assert.throws(() => getProviderHealth(null), TypeError);
});

test('A3-F PROVIDER_HEALTH_STATES exports the canonical state list', () => {
  assert.ok(Array.isArray(PROVIDER_HEALTH_STATES));
  assert.ok(PROVIDER_HEALTH_STATES.includes('configured'));
  assert.ok(PROVIDER_HEALTH_STATES.includes('available'));
  assert.ok(PROVIDER_HEALTH_STATES.includes('degraded'));
  assert.ok(PROVIDER_HEALTH_STATES.includes('unavailable'));
  assert.ok(PROVIDER_HEALTH_STATES.includes('unknown'));
});
