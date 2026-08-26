// A3-A Provider Policy — offline contract tests
//
// Per A3 spec §5 / §6 / §7: getCurrentProviderPolicy() is the
// single source of truth for the default / alternative / fallback
// / manual-override semantics. The Web Runtime Host, the CLI, and
// any future consumer must NOT hardcode their own default.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCurrentProviderPolicy,
} from '@masterpiece/runtime-core/application/provider-policy.js';

test('A3-A getCurrentProviderPolicy returns an immutable object', () => {
  const policy = getCurrentProviderPolicy();
  assert.equal(typeof policy, 'object');
  assert.ok(Object.isFrozen(policy));
  assert.ok(Object.isFrozen(policy.default));
  assert.ok(Object.isFrozen(policy.alternative));
  assert.ok(Object.isFrozen(policy.fallback));
  assert.ok(Object.isFrozen(policy.fallback.eligibleCategories));
  assert.ok(Object.isFrozen(policy.fallback.excludedCategories));
  assert.ok(Object.isFrozen(policy.manualOverride));
  assert.ok(Object.isFrozen(policy.manualOverride.precedence));
});

test('A3-A default = Volcengine / doubao-seed-2.1-turbo (A2-G decision)', () => {
  const policy = getCurrentProviderPolicy();
  assert.equal(policy.version, '1.0.0');
  assert.equal(policy.default.provider, 'volcengine');
  assert.equal(policy.default.model, 'doubao-seed-2.1-turbo');
});

test('A3-A alternative = Qwen / qwen3.6-plus (A2-H preservation)', () => {
  const policy = getCurrentProviderPolicy();
  assert.equal(policy.alternative.length, 1);
  assert.equal(policy.alternative[0].provider, 'qwen');
  assert.equal(policy.alternative[0].model, 'qwen3.6-plus');
});

test('A3-A fallback policy has 4 eligible + 6 excluded categories', () => {
  const policy = getCurrentProviderPolicy();
  assert.equal(policy.fallback.eligibleCategories.length, 4);
  assert.deepEqual(
    [...policy.fallback.eligibleCategories].sort(),
    ['RATE_LIMIT', 'TEMPORARY_PROVIDER_UNAVAILABLE', 'TIMEOUT', 'TRANSPORT_FAILURE'],
  );
  assert.equal(policy.fallback.excludedCategories.length, 6);
  assert.deepEqual(
    [...policy.fallback.excludedCategories].sort(),
    [
      'AUTH_ERROR',
      'CONTRACT_VALIDATION_FAILED',
      'MODEL_NOT_FOUND',
      'REQUEST_INVALID',
      'RESPONSE_INVALID',
      'USER_CANCELLED',
    ],
  );
  assert.equal(policy.fallback.maxAttempts, 2);
});

test('A3-A manual override precedence is explicit-run > user-profile > system-default', () => {
  const policy = getCurrentProviderPolicy();
  assert.deepEqual(
    [...policy.manualOverride.precedence],
    ['explicit-run', 'user-profile', 'system-default'],
  );
  assert.equal(policy.manualOverride.unknownProvider, 'error');
});

test('A3-A getCurrentProviderPolicy returns the SAME frozen reference on each call', () => {
  const a = getCurrentProviderPolicy();
  const b = getCurrentProviderPolicy();
  assert.equal(a, b);
});
