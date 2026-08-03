import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PACKAGING_SHOT_IDS,
  bindPackagingLockedAssets,
  listPackagingShotDefinitions,
  validatePackagingLockedAssetBindings,
  validatePackagingShotSelection,
} from '@masterpiece/image-generation-runtime/task-families/packaging';

test('Phase 0 registers exactly the three canonical Packaging shots', () => {
  assert.deepEqual(PACKAGING_SHOT_IDS, [
    'PKG-HERO-SINGLE',
    'PKG-SERIES-GROUP',
    'PKG-GIFT-OPEN',
  ]);
  assert.equal(listPackagingShotDefinitions().length, 3);
  assert.deepEqual(validatePackagingShotSelection({
    shotId: 'PKG-GIFT-OPEN',
    subtype: 'gift_set',
    productCount: 4,
    openingState: 'open',
  }), { valid: true, errors: [] });
  assert.deepEqual(validatePackagingShotSelection({
    shotId: 'PKG-GIFT-OPEN',
    subtype: 'paper_bag',
    productCount: 1,
    openingState: 'closed',
  }).errors, ['PACKAGING_SHOT_SUBTYPE_MISMATCH', 'PACKAGING_SHOT_OPENING_STATE_REQUIRED']);
});

test('Phase 0 binds Packaging Locked Assets by confirmed type without filename inference', () => {
  const result = bindPackagingLockedAssets([
    { id: 'identity-1', type: 'logo', sourceAssetId: 'source-logo' },
    { id: 'structure-1', type: 'packaging_structure', evidenceRefs: ['evidence-structure'] },
    { id: 'art-1', type: 'packaging_artwork', evidenceRefs: ['evidence-art'] },
  ]);
  assert.deepEqual(result.bindings.map((item) => item.role), [
    'package_surface_identity',
    'package_structure',
    'package_surface_graphic',
  ]);
  assert.equal(result.bindings.every((item) => item.mayAffectScene === false), true);
  assert.deepEqual(validatePackagingLockedAssetBindings(result), { valid: true, errors: [] });

  const filenameOnly = bindPackagingLockedAssets([
    { id: 'looks-like-logo.png', type: 'unknown', evidenceRefs: ['asset-1'] },
  ]);
  assert.equal(filenameOnly.bindings.length, 0);
  assert.equal(validatePackagingLockedAssetBindings(filenameOnly).valid, false);
});
