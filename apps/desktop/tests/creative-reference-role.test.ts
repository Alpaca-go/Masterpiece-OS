import assert from 'node:assert/strict';
import test from 'node:test';
import { mapCreativeReferenceRole } from '../src/main/image-generation/service.ts';

test('Creative Production preserves core brand assets as current-project identity references', () => {
  assert.equal(mapCreativeReferenceRole('identity_reference'), 'current_project_logo');
  assert.equal(mapCreativeReferenceRole('structure_reference'), 'current_project_product');
  assert.equal(mapCreativeReferenceRole('core_reference'), 'current_project_identity');
});
