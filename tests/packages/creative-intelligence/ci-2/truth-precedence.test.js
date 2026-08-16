import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * CI-2 truth precedence tests.
 *
 * Spec #11-#13: authority / confidence / recency / source type / confirmation state.
 * Baseline precedence:
 *   USER_CONFIRMED > LOCKED > AUTHORITATIVE_DOCUMENT_FACT > AUTHORITATIVE_PROJECT_METADATA
 *   > VISUAL_SOURCE_FACT > MODEL_INFERENCE > CREATIVE_HYPOTHESIS > SYSTEM_DEFAULT > UNKNOWN
 *
 * Confidence is NEVER used to override authority.
 */

import {
  PROJECT_TRUTH_KEYS,
  IDENTITY_KEYS,
  LOCKED_KEYS,
} from '@masterpiece/creative-intelligence/truth/key-registry.ts';
import {
  resolveKey,
  compareAuthority,
  AUTHORITY_RANK,
} from '@masterpiece/creative-intelligence/truth/precedence.ts';

function fact(authority, value, opts = {}) {
  return {
    id: opts.id ?? `f:${authority}:${opts.key ?? 'unknown'}:${JSON.stringify(value)}`,
    key: opts.key ?? PROJECT_TRUTH_KEYS.BRAND_NAME,
    value,
    truthClass: 'fact',
    status: 'observed',
    authority,
    sourceType: opts.sourceType ?? 'project_record',
    sourceId: opts.sourceId ?? 'src',
    createdAt: opts.createdAt,
    evidenceRefs: [],
    isReferenceFact: opts.isReferenceFact ?? false,
  };
}

test('CI-2 precedence: USER_CONFIRMED beats MODEL_INFERENCE even with higher confidence', () => {
  const user = fact('USER_CONFIRMED', 'BrandX', { id: 'u1', confidence: 0.5 });
  const model = fact('MODEL_INFERENCE', 'BrandY', { id: 'm1', confidence: 0.99 });
  const result = resolveKey(PROJECT_TRUTH_KEYS.BRAND_NAME, [user, model]);
  assert.equal(result.status, 'conflicted');
  assert.equal(result.selectedFactId, 'u1'); // USER_CONFIRMED wins despite lower confidence.
});

test('CI-2 precedence: LOCKED beats VISUAL_SOURCE_FACT', () => {
  const locked = fact('LOCKED', 'LockedBrand', { id: 'l1' });
  const visual = fact('VISUAL_SOURCE_FACT', 'VisualBrand', { id: 'v1' });
  const result = resolveKey(PROJECT_TRUTH_KEYS.BRAND_NAME, [visual, locked]);
  assert.equal(result.selectedFactId, 'l1');
});

test('CI-2 precedence: AUTHORITATIVE_DOCUMENT_FACT beats AUTHORITATIVE_PROJECT_METADATA', () => {
  const doc = fact('AUTHORITATIVE_DOCUMENT_FACT', 'DocBrand', { id: 'd1', sourceType: 'document_visual_context' });
  const meta = fact('AUTHORITATIVE_PROJECT_METADATA', 'MetaBrand', { id: 'p1', sourceType: 'project_record' });
  const result = resolveKey(PROJECT_TRUTH_KEYS.BRAND_NAME, [meta, doc]);
  assert.equal(result.selectedFactId, 'd1');
});

test('CI-2 precedence: MODEL_INFERENCE beats CREATIVE_HYPOTHESIS', () => {
  const m = fact('MODEL_INFERENCE', 'A', { id: 'mi' });
  const c = fact('CREATIVE_HYPOTHESIS', 'B', { id: 'ch' });
  const result = resolveKey('some.key', [m, c]);
  assert.equal(result.selectedFactId, 'mi');
});

test('CI-2 precedence: SYSTEM_DEFAULT beats UNKNOWN', () => {
  const sd = fact('SYSTEM_DEFAULT', 'default', { id: 'sd' });
  const uk = fact('UNKNOWN', null, { id: 'uk' });
  const result = resolveKey('some.key', [uk, sd]);
  assert.equal(result.selectedFactId, 'sd');
});

test('CI-2 precedence: tiebreak uses createdAt then id', () => {
  const a = fact('USER_CONFIRMED', 'X', { id: 'aaa', createdAt: '2026-01-01T00:00:00.000Z' });
  const b = fact('USER_CONFIRMED', 'X', { id: 'bbb', createdAt: '2026-02-01T00:00:00.000Z' });
  const result = resolveKey('key', [a, b]);
  assert.equal(result.selectedFactId, 'bbb');
});

test('CI-2 precedence: tiebreak uses id when no createdAt', () => {
  const a = fact('USER_CONFIRMED', 'X', { id: 'aaa' });
  const b = fact('USER_CONFIRMED', 'X', { id: 'bbb' });
  const result = resolveKey('key', [a, b]);
  assert.equal(result.selectedFactId, 'bbb');
});

test('CI-2 precedence: identical value is resolved (UNANIMOUS_VALUE)', () => {
  const a = fact('LOCKED', 'same', { id: 'l1' });
  const b = fact('USER_CONFIRMED', 'same', { id: 'u1' });
  const result = resolveKey('key', [a, b]);
  assert.equal(result.status, 'resolved');
  assert.equal(result.reasonCode, 'UNANIMOUS_VALUE');
});

test('CI-2 precedence: empty candidates → insufficient_evidence', () => {
  const result = resolveKey('key', []);
  assert.equal(result.status, 'insufficient_evidence');
  assert.equal(result.reasonCode, 'NO_CANDIDATES');
});

test('CI-2 precedence: compareAuthority returns 0 for equal ids', () => {
  const f = fact('USER_CONFIRMED', 'X', { id: 'same' });
  assert.equal(compareAuthority(f, f), 0);
});

test('CI-2 precedence: reference-derived fact never wins when current fact exists', () => {
  // Reference fact has higher authority but must not contaminate current truth.
  const ref = fact('USER_CONFIRMED', 'RefBrand', { id: 'r1', isReferenceFact: true });
  const cur = fact('AUTHORITATIVE_DOCUMENT_FACT', 'CurBrand', { id: 'c1', isReferenceFact: false });
  const result = resolveKey(PROJECT_TRUTH_KEYS.BRAND_NAME, [ref, cur], { excludeReferenceWinners: true });
  assert.equal(result.selectedFactId, 'c1');
  assert.equal(result.reasonCode, 'REFERENCE_GUARDED');
});

test('CI-2 key registry: brand.name is in IDENTITY_KEYS', () => {
  assert.ok(IDENTITY_KEYS.includes(PROJECT_TRUTH_KEYS.BRAND_NAME));
  assert.ok(IDENTITY_KEYS.includes(PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY));
});

test('CI-2 key registry: locked.* keys are in LOCKED_KEYS', () => {
  for (const k of LOCKED_KEYS) {
    assert.ok(k.startsWith('locked.'), `Locked key ${k} must start with 'locked.'`);
  }
});

test('CI-2 key registry: authority ranks are monotonic', () => {
  const ordered = [
    'USER_CONFIRMED',
    'LOCKED',
    'AUTHORITATIVE_DOCUMENT_FACT',
    'AUTHORITATIVE_PROJECT_METADATA',
    'VISUAL_SOURCE_FACT',
    'MODEL_INFERENCE',
    'CREATIVE_HYPOTHESIS',
    'SYSTEM_DEFAULT',
    'UNKNOWN',
  ];
  for (let i = 0; i < ordered.length - 1; i++) {
    assert.ok(
      AUTHORITY_RANK[ordered[i]] > AUTHORITY_RANK[ordered[i + 1]],
      `${ordered[i]} must rank higher than ${ordered[i + 1]}`,
    );
  }
});
