import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  assertProjectSignatureDifference,
  compileSpatialContext,
  loadPremiumMedicalAestheticsArchetype,
  loadSpatialProjectBundle,
  matchVerticalSpatialArchetype,
  selectProjectAnchors,
  validateProjectSignatureDifference,
} from '@masterpiece/image-generation-runtime';

const bundle = loadSpatialProjectBundle('jiuzhou-aesthetics');
const archetype = loadPremiumMedicalAestheticsArchetype({
  projectSignatureTerms: bundle.projectSignatureTerms,
});
const foundation = {
  spaceType: 'large_lobby',
  architectureAesthetic: { mode: 'modern_monolithic' },
  spatialScale: { class: 'large', ceilingHeight: 'generous', depthExpression: 'strong' },
  functionalZoning: { required: ['reception', 'waiting', 'circulation'] },
  circulation: { mode: 'clear_primary_route' },
  cameraIntent: { role: 'entrance_three_quarter_wide' },
};

test('Case A: large lobby inherits calibration while preserving scale and depth', () => {
  const anchors = selectProjectAnchors({
    currentProjectId: 'jiuzhou-aesthetics', spaceType: 'large_lobby',
    manifest: bundle.anchorManifest,
  });
  const compiled = compileSpatialContext({
    task: { subtype: 'reception' }, spatialFoundation: foundation,
    projectCanon: bundle.projectCanon, verticalArchetype: archetype,
    anchorManifest: bundle.anchorManifest,
    selectedAnchors: anchors,
    anchorSignals: {
      materialAndLighting: ['soft indirect light', 'credible mineral material'],
      spatialScale: { class: 'compact' },
      composition: ['compact frontal desk'],
    },
    projectExclusions: bundle.projectExclusions,
  });
  assert.equal(compiled.foundation.spatialScale.class, 'large');
  assert.equal(compiled.foundation.spatialScale.depthExpression, 'strong');
  assert.equal(compiled.anchorCalibration.materialAndLighting.influenceCap, 0.75);
  assert.equal(compiled.anchorCalibration.spatialScale, undefined);
  assert.equal(compiled.anchorCalibration.composition, undefined);
});

test('Case B: storefront uses only the storefront Anchor with restrained scale authority', () => {
  const result = selectProjectAnchors({
    currentProjectId: 'jiuzhou-aesthetics', spaceType: 'storefront',
    manifest: bundle.anchorManifest,
  });
  assert.deepEqual(result.anchors.map((anchor) => anchor.id), ['storefront-anchor-v1']);
  assert.equal(result.anchors[0].influenceCaps.spatialScale, 0);
  assert.ok(result.anchors[0].allowedRoles.includes('brand_integration'));
});

test('Case C: another medical brand inherits semantics without project signatures or Anchors', () => {
  const match = matchVerticalSpatialArchetype({
    industry: 'medical aesthetics', themes: ['female_aesthetics'],
    tone: ['mature', 'professional', 'serene'],
  }, archetype);
  const otherCanon = {
    projectId: 'verdant-clinic', version: 1,
    lockedAssets: { brandNameEn: 'Verdant Clinic' },
    projectPalette: { base: ['warm_ivory'], accent: ['botanical_green'] },
    signatureMotifs: ['plant_cell_network'],
    projectMaterialAccents: ['warm_limestone'],
    projectRules: { architectureFirst: true },
  };
  const compiled = compileSpatialContext({
    task: { subtype: 'reception' }, spatialFoundation: { spaceType: 'reception' },
    projectCanon: otherCanon, verticalArchetype: match.archetype,
  });
  const prompt = compiled.promptSections.join('\n');
  assert.match(prompt, /botanical_green|plant_cell_network|warm_limestone/u);
  assert.doesNotMatch(prompt, /九州美学|Jointown|peacock|nine_petals|lavender_crystal/iu);
  assert.throws(() => selectProjectAnchors({
    currentProjectId: 'verdant-clinic', spaceType: 'reception', manifest: bundle.anchorManifest,
  }), (error) => error.code === 'CROSS_PROJECT_ANCHOR_ACCESS');
});

test('Case D: premium club reduces medical weight and does not acquire reception instructions', () => {
  const match = matchVerticalSpatialArchetype({
    industry: 'private club hospitality', themes: ['private_club_hospitality'],
    tone: ['quiet', 'warm', 'private'],
  }, archetype);
  assert.equal(match.matched, true);
  assert.ok(match.archetype.medicalHospitalityBalance.medicalCredibility < 0.5);
  assert.equal(JSON.stringify(match.archetype).includes('reception desk'), false);
});

test('Case E: ordinary hospital is blocked from the premium medical aesthetics Archetype', () => {
  const match = matchVerticalSpatialArchetype({
    industry: 'traditional_hospital', themes: ['female_health'], tone: ['professional'],
  }, archetype);
  assert.equal(match.matched, false);
  assert.deepEqual(match.blockedBy, ['traditional_hospital']);
});

test('Anti-Clone requires all signature fields and at least three distinct dimensions', () => {
  const reference = {
    paletteSignature: 'neutral_and_lavender', motifSignature: 'radial_feather',
    architecturalSignature: 'soft_monolithic_arch', materialSignature: 'pearl_and_acrylic',
    narrativeSignature: 'science_meets_aesthetics',
  };
  const valid = {
    paletteSignature: 'ivory_and_green', motifSignature: 'plant_cell_network',
    architecturalSignature: 'layered_orthogonal_planes', materialSignature: 'pearl_and_acrylic',
    narrativeSignature: 'science_meets_aesthetics',
  };
  assert.equal(validateProjectSignatureDifference({
    projectSignature: valid, referenceSignature: reference,
  }).valid, true);
  assert.throws(() => assertProjectSignatureDifference({
    projectSignature: { ...reference, paletteSignature: 'ivory_and_green' },
    referenceSignature: reference,
  }), (error) => error.code === 'PROJECT_SIGNATURE_TOO_SIMILAR');
});

test('Prompt snapshot keeps protected layer ordering and excludes Acceptance content', () => {
  const anchors = selectProjectAnchors({
    currentProjectId: 'jiuzhou-aesthetics', spaceType: 'large_lobby',
    manifest: bundle.anchorManifest,
  });
  const compiled = compileSpatialContext({
    task: { subtype: 'reception' }, spatialFoundation: foundation,
    projectCanon: bundle.projectCanon, verticalArchetype: archetype,
    anchorManifest: bundle.anchorManifest, selectedAnchors: anchors,
    anchorSignals: { materialAndLighting: ['soft indirect light'] },
    projectExclusions: bundle.projectExclusions,
  });
  const prompt = compiled.promptSections.join('\n');
  const snapshot = fs.readFileSync(new URL(
    './fixtures/spatial-golden-prompt-snapshots/jiuzhou-large-lobby.prompt.md',
    import.meta.url,
  ), 'utf8');
  let previous = -1;
  for (const line of snapshot.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean)) {
    const index = prompt.indexOf(line);
    assert.ok(index >= 0, `snapshot token missing: ${line}`);
    assert.ok(index >= previous, `snapshot token out of order: ${line}`);
    previous = index;
  }
  assert.doesNotMatch(prompt, /Golden Acceptance Standard|八大评分维度|总分 100/u);
});
