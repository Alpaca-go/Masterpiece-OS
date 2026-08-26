// A3-B Fallback Classification — offline contract tests
//
// Per A3 spec §13 / §14: isFallbackEligible(error) and
// classifyFallbackReason(error) map existing reasoner error
// codes to the 4 A3 eligible categories. They do NOT invent
// new reasoner error codes; they classify what already exists.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isFallbackEligible,
  classifyFallbackReason,
} from '@masterpiece/runtime-core/application/provider-policy.js';

function withCode(code, message = 'x') {
  const err = new Error(message);
  err.code = code;
  return err;
}

test('A3-B TIMEOUT code is eligible + classified as TIMEOUT', () => {
  const err = withCode('TIMEOUT', 'request timed out');
  assert.equal(isFallbackEligible(err), true);
  assert.equal(classifyFallbackReason(err), 'TIMEOUT');
});

test('A3-B RATE_LIMITED code is eligible + classified as RATE_LIMIT', () => {
  const err = withCode('RATE_LIMITED', 'rate limit');
  assert.equal(isFallbackEligible(err), true);
  assert.equal(classifyFallbackReason(err), 'RATE_LIMIT');
});

test('A3-B MODEL_UNAVAILABLE code is eligible + classified as TEMPORARY_PROVIDER_UNAVAILABLE', () => {
  const err = withCode('MODEL_UNAVAILABLE', 'upstream 503');
  assert.equal(isFallbackEligible(err), true);
  assert.equal(classifyFallbackReason(err), 'TEMPORARY_PROVIDER_UNAVAILABLE');
});

test('A3-B HTTP 429 is eligible + classified as RATE_LIMIT', () => {
  const err = new Error('Too Many Requests');
  err.status = 429;
  assert.equal(isFallbackEligible(err), true);
  assert.equal(classifyFallbackReason(err), 'RATE_LIMIT');
});

test('A3-B HTTP 5xx is eligible + classified as TRANSPORT_FAILURE', () => {
  for (const status of [500, 502, 503, 504]) {
    const err = new Error('upstream error');
    err.status = status;
    assert.equal(isFallbackEligible(err), true, `status=${status} should be eligible`);
    assert.equal(classifyFallbackReason(err), 'TRANSPORT_FAILURE', `status=${status} should be TRANSPORT_FAILURE`);
  }
});

test('A3-B network error indicators classify as TRANSPORT_FAILURE', () => {
  const indicators = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'fetch failed'];
  for (const indicator of indicators) {
    const err = new Error(`connection failed: ${indicator}`);
    assert.equal(isFallbackEligible(err), true, `indicator=${indicator} should be eligible`);
    assert.equal(classifyFallbackReason(err), 'TRANSPORT_FAILURE', `indicator=${indicator} should be TRANSPORT_FAILURE`);
  }
});

test('A3-B error with cause.status is honored', () => {
  const cause = new Error('inner');
  cause.status = 502;
  const err = new Error('outer');
  err.cause = cause;
  assert.equal(isFallbackEligible(err), true);
  assert.equal(classifyFallbackReason(err), 'TRANSPORT_FAILURE');
});

test('A3-B AUTH_ERROR / MODEL_NOT_FOUND / REQUEST_INVALID / RESPONSE_INVALID are NOT eligible', () => {
  for (const code of [
    'AUTHENTICATION_FAILED',
    'MALFORMED_RESPONSE',
    'REQUEST_INVALID',
    'QWEN_API_ERROR',
  ]) {
    const err = withCode(code, 'some message');
    assert.equal(isFallbackEligible(err), false, `code=${code} should NOT be eligible`);
    assert.equal(classifyFallbackReason(err), 'UNKNOWN', `code=${code} should classify as UNKNOWN`);
  }
});

test('A3-B 4xx (non-429) is NOT eligible (REQUEST_INVALID class)', () => {
  for (const status of [400, 401, 403, 404]) {
    const err = new Error('bad request');
    err.status = status;
    assert.equal(isFallbackEligible(err), false, `status=${status} should NOT be eligible`);
  }
});

test('A3-B null / undefined / non-error are NOT eligible + UNKNOWN', () => {
  assert.equal(isFallbackEligible(null), false);
  assert.equal(isFallbackEligible(undefined), false);
  assert.equal(isFallbackEligible({}), false);
  assert.equal(isFallbackEligible({ code: '' }), false);
  assert.equal(classifyFallbackReason(null), 'UNKNOWN');
  assert.equal(classifyFallbackReason(undefined), 'UNKNOWN');
});
