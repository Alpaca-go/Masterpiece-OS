import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertSpatialSchema,
  migrateSpatialFoundation,
  validateAnchorManifest,
  validateProjectVisualCanon,
  validateSpatialEvaluationProfile,
  validateSpatialFoundation,
  validateVerticalSpatialArchetype,
} from '@masterpiece/image-generation-runtime';

test('legacy Spatial Foundation migration locks spatial scale by default', () => {
  const migrated = migrateSpatialFoundation({
    spaceType: 'large_lobby',
    spatialScale: { class: 'large' },
  });
  assert.equal(migrated.preservation.architecture, 'constrain');
  assert.equal(migrated.preservation.spatialScale, 'lock');
  assert.equal(migrated.spatialScale.preservation, 'lock');
  assert.equal(validateSpatialFoundation(migrated).valid, true);
});

test('Spatial Foundation rejects an overridable spatial scale', () => {
  const result = validateSpatialFoundation({
    version: 1,
    spaceType: 'lobby',
    spatialScale: { preservation: 'bias' },
  });
  assert.equal(result.valid, false);
  assert.throws(() => assertSpatialSchema(result), /spatialScale\.preservation/u);
});

test('Vertical Archetype requires semantic anti-clone behavior', () => {
  const result = validateVerticalSpatialArchetype({
    id: 'premium-medical-aesthetics',
    version: 1,
    applicableThemes: ['female_aesthetics'],
    antiClonePolicy: { inheritSemanticsNotSignatures: true },
  });
  assert.equal(result.valid, true);
});

test('Project Visual Canon remains explicitly project scoped', () => {
  const result = validateProjectVisualCanon({
    projectId: 'jiuzhou-aesthetics',
    version: 1,
    lockedAssets: { brandNameZh: '九州美学' },
    projectRules: { architectureFirst: true },
  });
  assert.equal(result.valid, true);
});

test('Anchor Manifest requires a zero spatial-scale influence cap', () => {
  const manifest = {
    projectId: 'jiuzhou-aesthetics', version: 1,
    anchors: [{
      id: 'reception-anchor-v1',
      file: 'reception-anchor-v1.png',
      applicableSpaceTypes: ['reception'],
      roles: ['brand_atmosphere'],
    }],
    influenceCaps: { spatialScale: 0 },
  };
  assert.equal(validateAnchorManifest(manifest).valid, true);
  manifest.influenceCaps.spatialScale = 0.1;
  assert.equal(validateAnchorManifest(manifest).valid, false);
});

test('Spatial Evaluation Profile separates global and project scope', () => {
  assert.equal(validateSpatialEvaluationProfile({
    id: 'global-space-quality', version: 1, scope: 'global', dimensions: ['spatial_realism'],
  }).valid, true);
  assert.equal(validateSpatialEvaluationProfile({
    id: 'jiuzhou-acceptance', version: 1, scope: 'project', dimensions: ['brand_accuracy'],
  }).valid, false);
});
