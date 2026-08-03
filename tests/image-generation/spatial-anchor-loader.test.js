import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CrossProjectAnchorAccessError,
  anchorSignalsFromSelection,
  loadProjectAnchors,
  loadSpatialProjectBundle,
  selectProjectAnchors,
} from '@masterpiece/image-generation-runtime';

const bundle = loadSpatialProjectBundle('jiuzhou-aesthetics');

test('storefront and reception tasks select their corresponding project Anchor', () => {
  const storefront = selectProjectAnchors({
    currentProjectId: 'jiuzhou-aesthetics',
    spaceType: 'storefront',
    manifest: bundle.anchorManifest,
  });
  const reception = selectProjectAnchors({
    currentProjectId: 'jiuzhou-aesthetics',
    spaceType: 'reception',
    manifest: bundle.anchorManifest,
  });
  assert.deepEqual(storefront.anchors.map((anchor) => anchor.id), ['storefront-anchor-v1']);
  assert.deepEqual(reception.anchors.map((anchor) => anchor.id), ['reception-anchor-v1']);
});

test('large lobby uses reception Anchor only for authorized calibration roles', () => {
  const result = selectProjectAnchors({
    currentProjectId: 'jiuzhou-aesthetics',
    spaceType: 'large_lobby',
    manifest: bundle.anchorManifest,
  });
  const [anchor] = result.anchors;
  assert.equal(anchor.id, 'reception-anchor-v1');
  assert.equal(anchor.influenceCaps.spatialScale, 0);
  assert.equal(anchor.influenceCaps.functionalLayout, 0);
  assert.equal(anchor.influenceCaps.composition, 0);
  assert.deepEqual(anchor.allowedRoles, [
    'brand_atmosphere', 'brand_integration', 'material_and_lighting',
  ]);
  assert.ok(anchor.deniedRoles.includes('reception_expression'));
});

test('other projects cannot load project Anchors by default', () => {
  assert.throws(() => selectProjectAnchors({
    currentProjectId: 'other-medical-brand',
    spaceType: 'reception',
    manifest: bundle.anchorManifest,
  }), CrossProjectAnchorAccessError);
});

test('cross-project Anchor access requires an explicit matching reference project', () => {
  const result = selectProjectAnchors({
    currentProjectId: 'other-medical-brand',
    referenceProjectId: 'jiuzhou-aesthetics',
    allowCrossProjectReference: true,
    spaceType: 'reception',
    manifest: bundle.anchorManifest,
  });
  assert.equal(result.anchors[0].id, 'reception-anchor-v1');
});

test('Anchor loader verifies the versioned image checksum', () => {
  const result = loadProjectAnchors({
    currentProjectId: 'jiuzhou-aesthetics',
    spaceType: 'storefront',
    manifest: bundle.anchorManifest,
  });
  assert.equal(result.anchors[0].asset.sha256, result.anchors[0].sha256);
  assert.ok(result.anchors[0].asset.size > 1_000_000);
});

test('selected Anchor roles become dimension-scoped compiler signals', () => {
  const selection = selectProjectAnchors({
    currentProjectId: 'jiuzhou-aesthetics',
    spaceType: 'large_lobby',
    manifest: bundle.anchorManifest,
  });
  const signals = anchorSignalsFromSelection(selection);
  assert.ok(signals.brandAtmosphere[0].includes('reception-anchor-v1'));
  assert.ok(signals.materialAndLighting[0].includes('reception-anchor-v1'));
  assert.equal(signals.receptionExpression, undefined);
  assert.equal(signals.spatialScale, undefined);
});
