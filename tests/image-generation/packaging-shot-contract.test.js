// P1-2 — Packaging Shot Contract offline test
//
// V1 frozen at 3 shot contracts (PKG-HERO-SINGLE / PKG-SERIES-GROUP
// / PKG-GIFT-OPEN). No more in V1. This test pins:
//   - The frozen array's contents + length
//   - The version constant
//   - The isPackagingShotContract type guard
//   - The labels map (one label per contract)
//   - The contracts' surface (no method/function in the export;
//     the type is data-only)

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PACKAGING_SHOT_CONTRACTS,
  PACKAGING_SHOT_CONTRACT_LABELS,
  PACKAGING_SHOT_CONTRACT_VERSION,
  isPackagingShotContract,
} from '@masterpiece/image-generation-contracts';
import {
  PACKAGING_FAILURE_CODES,
  PACKAGING_FAILURE_CODES_VERSION,
  PACKAGING_AUTO_FAIL_CODES,
  isPackagingFailureCode,
} from '@masterpiece/image-generation-contracts';

test('P1 PACKAGING_SHOT_CONTRACT_VERSION is 1.0.0', () => {
  assert.equal(PACKAGING_SHOT_CONTRACT_VERSION, '1.0.0');
});

test('P1 PACKAGING_SHOT_CONTRACTS is Object.freeze of exactly 3 contracts', () => {
  assert.ok(Object.isFrozen(PACKAGING_SHOT_CONTRACTS));
  assert.equal(PACKAGING_SHOT_CONTRACTS.length, 3);
  assert.deepEqual(
    [...PACKAGING_SHOT_CONTRACTS],
    ['PKG-HERO-SINGLE', 'PKG-SERIES-GROUP', 'PKG-GIFT-OPEN'],
  );
});

test('P1 each contract has a label entry', () => {
  for (const contract of PACKAGING_SHOT_CONTRACTS) {
    const label = PACKAGING_SHOT_CONTRACT_LABELS[contract];
    assert.equal(typeof label, 'string');
    assert.ok(label.length > 0, `label for ${contract} is empty`);
  }
  assert.equal(
    Object.keys(PACKAGING_SHOT_CONTRACT_LABELS).length,
    PACKAGING_SHOT_CONTRACTS.length,
  );
});

test('P1 isPackagingShotContract accepts every contract; rejects the rest', () => {
  for (const contract of PACKAGING_SHOT_CONTRACTS) {
    assert.equal(isPackagingShotContract(contract), true);
  }
  for (const rejected of [
    'PKG-DETAIL-CLOSEUP',
    'PKG-LIFESTYLE-CONTEXT',
    'PKG-CROSS-BRAND-COMPARE',
    'PKG-MICRO-PATTERN-FABRIC',
    'hero',
    'series',
    'open',
    '',
    null,
    undefined,
    42,
    {},
  ]) {
    assert.equal(isPackagingShotContract(rejected), false, `should reject ${JSON.stringify(rejected)}`);
  }
});

test('P1 PACKAGING_SHOT_CONTRACTS labels are unique', () => {
  const labels = PACKAGING_SHOT_CONTRACTS.map((c) => PACKAGING_SHOT_CONTRACT_LABELS[c]);
  assert.equal(new Set(labels).size, labels.length);
});

test('P1 PACKAGING_FAILURE_CODES is Object.freeze of exactly 12 codes', () => {
  assert.ok(Object.isFrozen(PACKAGING_FAILURE_CODES));
  assert.equal(PACKAGING_FAILURE_CODES.length, 12);
  for (let i = 1; i <= 12; i += 1) {
    const code = `PKG-F${i.toString().padStart(2, '0')}`;
    assert.ok(PACKAGING_FAILURE_CODES.includes(code), `missing ${code}`);
  }
});

test('P1 PACKAGING_FAILURE_CODES_VERSION is 1.0.0', () => {
  assert.equal(PACKAGING_FAILURE_CODES_VERSION, '1.0.0');
});

test('P1 PACKAGING_AUTO_FAIL_CODES is F01 + F02 + F11', () => {
  assert.deepEqual([...PACKAGING_AUTO_FAIL_CODES].sort(), ['PKG-F01', 'PKG-F02', 'PKG-F11']);
});

test('P1 isPackagingFailureCode accepts every code; rejects the rest', () => {
  for (const code of PACKAGING_FAILURE_CODES) {
    assert.equal(isPackagingFailureCode(code), true);
  }
  for (const rejected of [
    'PKG-F00', 'PKG-F13', 'PKG-99', 'F01', 'pkg-f01', 'pKg-F01', '', null, undefined, 0,
  ]) {
    assert.equal(isPackagingFailureCode(rejected), false, `should reject ${JSON.stringify(rejected)}`);
  }
});

test('P1 PACKAGING_AUTO_FAIL_CODES is a subset of PACKAGING_FAILURE_CODES', () => {
  for (const code of PACKAGING_AUTO_FAIL_CODES) {
    assert.ok(PACKAGING_FAILURE_CODES.includes(code), `auto-fail code ${code} not in failure codes`);
  }
});
