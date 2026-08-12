// R10.2 Reference-First UI state helper tests.
//
// These are pure-logic tests for the shared state module used by the
// ShortChainGenerationWorkspace (Generation Basis, reference selection, remove /
// replace, light validation). No React, no Electron, no provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const stateUrl = pathToFileURL(path.join(
  repoRoot,
  'apps/web/src/reference-first/state.js',
)).href;

const {
  MAX_SPACE_REFERENCE_IMAGES,
  validateReferenceHard,
  validateReferenceSoft,
  canUseGenerationBasis,
  toggleReferenceId,
  removeReferenceId,
  replaceReferenceIds,
  mergeUploadedReferenceIds,
  isSupportedReferenceFile,
} = await import(stateUrl);

function asset(id, overrides = {}) {
  return { id, kind: 'image', name: `${id}.png`, bytes: 100_000, extension: '.png', ...overrides };
}

test('R10.2 max reference images constant is 4', () => {
  assert.equal(MAX_SPACE_REFERENCE_IMAGES, 4);
});

test('R10.2 Standard basis enables with a valid scene and no reference', () => {
  assert.equal(canUseGenerationBasis('standard', [], true), true);
  assert.equal(canUseGenerationBasis('standard', [], false), false);
});

test('R10.2 Reference basis requires at least 1 reference', () => {
  assert.equal(canUseGenerationBasis('reference', [], true), false);
  assert.equal(canUseGenerationBasis('reference', ['r1'], true), true);
  assert.equal(canUseGenerationBasis('reference', ['r1'], false), false);
});

test('R10.2 hard validation: refs=0 blocks, refs=1..4 passes, refs>4 blocks', () => {
  const assets = [asset('a1'), asset('a2'), asset('a3'), asset('a4'), asset('a5')];
  assert.ok(validateReferenceHard(assets, []).length >= 1, 'refs=0 -> hard error');
  assert.deepEqual(validateReferenceHard(assets, ['a1']), []);
  assert.deepEqual(validateReferenceHard(assets, ['a1', 'a2', 'a3', 'a4']), []);
  assert.ok(validateReferenceHard(assets, ['a1', 'a2', 'a3', 'a4', 'a5']).length >= 1, 'refs=5 -> hard error');
});

test('R10.2 hard validation: missing asset is fail-closed', () => {
  const assets = [asset('a1')];
  const errors = validateReferenceHard(assets, ['a1', 'missing']);
  assert.ok(errors.some((e) => /不可用/.test(e)), 'missing asset -> hard error');
});

test('R10.2 hard validation: unsupported kind blocks', () => {
  const assets = [asset('pdf1', { kind: 'pdf' })];
  assert.ok(validateReferenceHard(assets, ['pdf1']).some((e) => /格式不支持/.test(e)));
});

test('R10.2 soft validation warns but never blocks', () => {
  const assets = [asset('tiny', { bytes: 10 * 1024 })];
  const warnings = validateReferenceSoft(assets, ['tiny']);
  assert.ok(warnings.some((w) => /尺寸偏小/.test(w)), 'small file warns');
  // Even with warnings, hard validation still passes (soft never blocks).
  assert.deepEqual(validateReferenceHard(assets, ['tiny']), []);
});

test('R10.2 soft validation gives the generic space-image guidance when clean', () => {
  const assets = [asset('ok')];
  const warnings = validateReferenceSoft(assets, ['ok']);
  assert.ok(warnings.some((w) => /室内|空间图片/.test(w)), 'generic guidance present');
});

test('R10.2 toggle adds and removes a reference (task-only)', () => {
  assert.deepEqual(toggleReferenceId([], 'r1'), ['r1']);
  assert.deepEqual(toggleReferenceId(['r1'], 'r1'), []);
  // Cap at MAX_SPACE_REFERENCE_IMAGES.
  const many = toggleReferenceId(['r1', 'r2', 'r3', 'r4'], 'r5');
  assert.ok(many.length <= MAX_SPACE_REFERENCE_IMAGES, 'capped at 4');
});

test('R10.2 remove only drops the current task selection', () => {
  assert.deepEqual(removeReferenceId(['r1', 'r2'], 'r1'), ['r2']);
  assert.deepEqual(removeReferenceId([], 'r1'), []);
});

test('R10.2 replace swaps the old id for new ids without touching files', () => {
  const next = replaceReferenceIds(['old'], 'old', ['new1', 'new2']);
  assert.deepEqual(next, ['new1', 'new2']);
  // Cap applied.
  const capped = replaceReferenceIds(['a1', 'a2', 'a3'], 'a1', ['b1', 'b2', 'b3', 'b4']);
  assert.ok(capped.length <= MAX_SPACE_REFERENCE_IMAGES);
  assert.ok(!capped.includes('a1'), 'old id removed');
});

test('R10.2 supported reference file check', () => {
  assert.equal(isSupportedReferenceFile('ref.png'), true);
  assert.equal(isSupportedReferenceFile('ref.jpg'), true);
  assert.equal(isSupportedReferenceFile('ref.webp'), true);
  assert.equal(isSupportedReferenceFile('ref.tiff'), false);
  assert.equal(isSupportedReferenceFile('ref.pdf'), false);
});

test('R11.2.1 upload merge adds newly imported ids and dedupes against current selection', () => {
  const next = mergeUploadedReferenceIds([], ['new1'], []);
  assert.deepEqual(next, ['new1']);
  // A duplicate existing asset is added too, and already-selected ids never repeat.
  const mixed = mergeUploadedReferenceIds(['new1'], ['new2'], ['existing1']);
  assert.deepEqual(mixed, ['new1', 'new2', 'existing1']);
  const noRepeat = mergeUploadedReferenceIds(['a'], ['b', 'a'], ['c']);
  assert.deepEqual(noRepeat, ['a', 'b', 'c']);
});

test('R11.2.1 upload merge is capped at MAX_SPACE_REFERENCE_IMAGES', () => {
  const next = mergeUploadedReferenceIds(
    ['a1', 'a2', 'a3'],
    ['new1', 'new2', 'new3'],
    ['dup1', 'dup2'],
  );
  assert.ok(next.length <= MAX_SPACE_REFERENCE_IMAGES);
});

test('R11.2.1 upload merge ignores empty ids and non-array current', () => {
  assert.deepEqual(mergeUploadedReferenceIds(undefined, [null, '', 'ok'], []), ['ok']);
});
