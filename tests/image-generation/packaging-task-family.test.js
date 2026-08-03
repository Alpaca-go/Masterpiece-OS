import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PACKAGING_SHOT_IDS,
  bindPackagingLockedAssets,
  listPackagingShotDefinitions,
  validatePackagingLockedAssetBindings,
  validatePackagingShotSelection,
  validatePackagingAnalysisForShot,
  createPackagingGenerationDebug,
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

test('Phase 4 creates an auditable Packaging debug trace without Provider details', () => {
  const debug = createPackagingGenerationDebug({
    taskId: 'task-1',
    shotId: 'PKG-HERO-SINGLE',
    analysisStatus: 'ready',
    lockedAssetIds: ['logo-1', 'logo-1', 'box-1'],
    passes: [{ type: 'base_scene', durationMs: 10, inputFiles: [], outputFile: 'image.png' }],
    initialEvaluation: { status: 'failed', failures: ['PACKAGING_MATERIAL_FAILED'] },
    correctionEvaluation: { status: 'passed', failures: [] },
    selfHealingDecision: {
      schemaVersion: '1.0', action: 'regenerate_with_correction_prompt', failures: ['PACKAGING_MATERIAL_FAILED'],
      policies: [], correctionDirectives: ['restore material'], maxAutomaticRetries: 1,
    },
    terminalStatus: 'passed',
    automaticRetryCount: 1,
    createdAt: '2026-08-03T00:00:00.000Z',
  });
  assert.equal(debug.finalStatus, 'passed_after_repair');
  assert.deepEqual(debug.lockedAssetIds, ['logo-1', 'box-1']);
  assert.equal(debug.initialEvaluation.status, 'failed');
  assert.equal(debug.correctionEvaluation.status, 'passed');
  assert.equal(JSON.stringify(debug).includes('apiKey'), false);
});

test('Phase 4 validates material, craft, ownership and structure without a closed material dictionary', () => {
  const validation = validatePackagingAnalysisForShot({
    analysis: {
      packageStructure: [{ structure: 'rigid box', evidenceRefs: ['asset:box'] }],
      productArrangement: ['three products fitted into the insert'],
      openingExperience: ['lift-off lid reveals the insert'],
      material: ['molded pulp and responsibly sourced bamboo'],
      craft: [{ craft: 'spot UV', purpose: 'differentiate the product name' }],
    },
    taskContract: {
      shot: 'PKG-GIFT-OPEN',
      subtype: 'gift_set',
      packagingProductCount: 3,
      packagingOpeningState: 'open',
    },
    lockedAssetBindings: {
      bindings: [{
        assetId: 'logo-1', type: 'logo', role: 'package_surface_identity',
        lockLevel: 'hard', evidenceRefs: ['asset:logo'], mayAffectScene: false,
      }],
      errors: [],
    },
  });
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.material.items.map((item) => item.category), ['wood']);
  assert.deepEqual(validation.craft.items.map((item) => item.category), ['uv']);
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

  const selectedVisuals = bindPackagingLockedAssets([
    { id: 'front-1', type: 'packaging_front', evidenceRefs: ['front-1'] },
    { id: 'ip-1', type: 'ip_character', evidenceRefs: ['ip-1'] },
  ]);
  assert.deepEqual(selectedVisuals.bindings.map((item) => item.role), [
    'package_surface_graphic', 'package_surface_graphic',
  ]);
});
