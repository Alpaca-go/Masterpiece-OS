import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * CI-2 conflict detector tests.
 *
 * Spec #6 / #14 / #49: detect identity_mismatch, brand role mismatch,
 * industry mismatch, locked value violation, reference/current identity
 * mismatch, stale source.
 */

import { detectConflicts } from '@masterpiece/creative-intelligence/truth/conflict-detector.ts';
import { PROJECT_TRUTH_KEYS } from '@masterpiece/creative-intelligence/truth/key-registry.ts';

function fact(key, value, opts = {}) {
  return {
    id: opts.id ?? `${opts.sourceType ?? 's'}:${key}:${JSON.stringify(value)}`,
    key,
    value,
    truthClass: opts.truthClass ?? 'fact',
    status: opts.status ?? 'observed',
    authority: opts.authority ?? 'AUTHORITATIVE_PROJECT_METADATA',
    sourceType: opts.sourceType ?? 'project_record',
    sourceId: opts.sourceId ?? 'src',
    evidenceRefs: [],
    isReferenceFact: opts.isReferenceFact ?? false,
  };
}

test('CI-2 conflict: identity_mismatch when brand.name differs across carriers', () => {
  const facts = [
    fact(PROJECT_TRUTH_KEYS.BRAND_NAME, 'BrandA', { sourceType: 'project_record' }),
    fact(PROJECT_TRUTH_KEYS.BRAND_NAME, 'BrandB', { sourceType: 'document_visual_context' }),
  ];
  const conflicts = detectConflicts({ facts });
  const identity = conflicts.find((c) => c.type === 'identity_mismatch');
  assert.ok(identity, 'expected identity_mismatch conflict');
  assert.equal(identity.key, PROJECT_TRUTH_KEYS.BRAND_NAME);
});

test('CI-2 conflict: industry_mismatch detected', () => {
  const facts = [
    fact(PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY, 'tech', { sourceType: 'project_record' }),
    fact(PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY, 'food', { sourceType: 'document_visual_context' }),
  ];
  const conflicts = detectConflicts({ facts });
  const identity = conflicts.find((c) => c.type === 'identity_mismatch');
  assert.ok(identity, 'expected industry identity_mismatch');
});

test('CI-2 conflict: brand role mismatch detected', () => {
  const facts = [
    fact(PROJECT_TRUTH_KEYS.BRAND_ROLE, 'innovator', { sourceType: 'project_record' }),
    fact(PROJECT_TRUTH_KEYS.BRAND_ROLE, 'craftsman', { sourceType: 'visual_understanding_core' }),
  ];
  const conflicts = detectConflicts({ facts });
  const identity = conflicts.find((c) => c.type === 'identity_mismatch');
  assert.ok(identity);
});

test('CI-2 conflict: locked_value_violation when non-LOCKED candidate contradicts LOCKED', () => {
  const facts = [
    fact(PROJECT_TRUTH_KEYS.LOCKED_FACTS, ['use-blue'], {
      id: 'l1', authority: 'LOCKED', sourceType: 'project_record',
    }),
    fact(PROJECT_TRUTH_KEYS.LOCKED_FACTS, ['use-red'], {
      id: 'v1', authority: 'AUTHORITATIVE_PROJECT_METADATA', sourceType: 'project_record',
    }),
  ];
  const conflicts = detectConflicts({ facts });
  const locked = conflicts.find((c) => c.type === 'locked_value_violation');
  assert.ok(locked);
  assert.ok(locked.factIds.includes('l1'));
  assert.ok(locked.factIds.includes('v1'));
});

test('CI-2 conflict: reference_contamination on identity key', () => {
  const facts = [
    fact(PROJECT_TRUTH_KEYS.BRAND_NAME, 'RefBrand', {
      id: 'r1', isReferenceFact: true, sourceType: 'reference_project',
    }),
    fact(PROJECT_TRUTH_KEYS.BRAND_NAME, 'CurBrand', {
      id: 'c1', isReferenceFact: false, sourceType: 'project_record',
    }),
  ];
  const conflicts = detectConflicts({ facts });
  const ref = conflicts.find((c) => c.type === 'reference_contamination');
  assert.ok(ref, 'expected reference_contamination');
  // Both identity_mismatch and reference_contamination are reported.
  const id = conflicts.find((c) => c.type === 'identity_mismatch');
  assert.ok(id);
});

test('CI-2 conflict: value_mismatch on non-identity key with distinct values', () => {
  const facts = [
    fact('product.core_products', ['rice'], { sourceType: 'project_record' }),
    fact('product.core_products', ['noodles'], { sourceType: 'document_visual_context' }),
  ];
  const conflicts = detectConflicts({ facts });
  const vm = conflicts.find((c) => c.type === 'value_mismatch');
  assert.ok(vm, 'expected value_mismatch');
});

test('CI-2 conflict: NO conflict when all values match', () => {
  const facts = [
    fact('product.core_products', ['rice'], { sourceType: 'project_record' }),
    fact('product.core_products', ['rice'], { sourceType: 'document_visual_context' }),
  ];
  const conflicts = detectConflicts({ facts });
  // No value_mismatch, no identity_mismatch, no locked_value_violation.
  // May have authority_mismatch or source_authority_mismatch; we don't assert on those here.
  const vm = conflicts.find((c) => c.type === 'value_mismatch' || c.type === 'identity_mismatch');
  assert.equal(vm, undefined);
});

test('CI-2 conflict: stale_source on single LOCKED fact marked stale', () => {
  const facts = [
    fact(PROJECT_TRUTH_KEYS.LOCKED_LOGO, true, {
      authority: 'LOCKED', status: 'stale', sourceType: 'project_record',
    }),
  ];
  const conflicts = detectConflicts({ facts });
  const stale = conflicts.find((c) => c.type === 'stale_source');
  assert.ok(stale);
});

test('CI-2 conflict: empty fact list returns no conflicts', () => {
  const conflicts = detectConflicts({ facts: [] });
  assert.equal(conflicts.length, 0);
});

test('CI-2 conflict: stable ordering by key then id', () => {
  const facts = [
    fact('product.core_products', ['a'], { id: 'p2' }),
    fact('product.core_products', ['b'], { id: 'p1' }),
    fact(PROJECT_TRUTH_KEYS.BRAND_NAME, 'x', { id: 'b1' }),
  ];
  const conflicts = detectConflicts({ facts });
  for (let i = 1; i < conflicts.length; i++) {
    const a = conflicts[i - 1];
    const b = conflicts[i];
    if (a.key === b.key) {
      assert.ok(a.id <= b.id, `conflicts out of order: ${a.id} > ${b.id}`);
    } else {
      assert.ok(a.key < b.key, `conflicts out of order: ${a.key} >= ${b.key}`);
    }
  }
});
