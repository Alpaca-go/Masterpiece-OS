import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertArchetypeHasNoProjectSignature,
  loadPremiumMedicalAestheticsArchetype,
  loadSpatialProjectBundle,
} from '@masterpiece/image-generation-runtime';

test('structured project bundle describes the project without reading Golden Markdown', () => {
  const bundle = loadSpatialProjectBundle('jiuzhou-aesthetics');
  assert.equal(bundle.projectCanon.lockedAssets.brandNameZh, '九州美学');
  assert.equal(bundle.projectCanon.projectRules.architectureFirst, true);
  assert.equal(bundle.anchorManifest.influenceCaps.spatialScale, 0);
  assert.equal(bundle.generationProfile.runtimeSourcePolicy.loadGoldenMarkdown, false);
  assert.equal(bundle.generationProfile.runtimeSourcePolicy.loadAcceptanceAsGenerationPrompt, false);
  assert.ok(bundle.projectExclusions.generationExclusions.includes('generic beauty salon'));
});

test('project-specific signatures stay out of the reusable archetype', () => {
  const bundle = loadSpatialProjectBundle('jiuzhou-aesthetics');
  const archetype = loadPremiumMedicalAestheticsArchetype();
  assert.doesNotThrow(() => assertArchetypeHasNoProjectSignature(
    archetype,
    bundle.projectSignatureTerms,
  ));
});

test('runtime Anchor Manifest has stable project ownership and versions', () => {
  const { anchorManifest } = loadSpatialProjectBundle('jiuzhou-aesthetics');
  assert.equal(anchorManifest.projectId, 'jiuzhou-aesthetics');
  assert.deepEqual(anchorManifest.anchors.map((anchor) => anchor.id), [
    'JZMX-SGR-01-Exterior',
    'JZMX-SGR-02-Reception',
  ]);
  assert.ok(anchorManifest.anchors.every((anchor) => anchor.projectId === anchorManifest.projectId));
  assert.ok(anchorManifest.anchors.every((anchor) => anchor.version === 1.1));
});

test('project config loader blocks path traversal', () => {
  assert.throws(() => loadSpatialProjectBundle('../other-project'),
    (error) => error.code === 'SPATIAL_CONFIG_ID_INVALID');
});
