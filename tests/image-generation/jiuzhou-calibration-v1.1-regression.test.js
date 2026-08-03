import assert from 'node:assert/strict';
import test from 'node:test';
import {
  anchorSignalsFromSelection,
  compileSpatialContext,
  deriveProjectCalibrationFailureTags,
  evaluateProjectGolden,
  isVerticalSpatialArchetypeEnabled,
  loadProjectSpaceEvaluationProfile,
  loadSpatialProjectBundle,
  selectProjectAnchors,
} from '@masterpiece/image-generation-runtime';

const bundle = loadSpatialProjectBundle('jiuzhou-aesthetics');
const profile = loadProjectSpaceEvaluationProfile('jiuzhou-aesthetics');

const scenarios = [
  {
    name: 'Case A | Jiuzhou storefront',
    spaceType: 'storefront',
    expectedAnchor: 'JZMX-SGR-01-Exterior',
    foundation: {
      spaceType: 'storefront',
      architectureAesthetic: { mode: 'continuous_pearl_white_facade' },
      spatialScale: { class: 'street_facing', ceilingHeight: 'double_height_entry' },
      functionalZoning: { required: ['signage', 'entrance', 'display', 'threshold'] },
      circulation: { mode: 'clear_public_entry' },
      cameraIntent: { role: 'street_three_quarter_wide' },
    },
    requiredCalibration: ['brandAtmosphere', 'brandIntegration', 'materialAndLighting', 'architecturalSkin'],
  },
  {
    name: 'Case B | Jiuzhou large lobby',
    spaceType: 'large_lobby',
    expectedAnchor: 'JZMX-SGR-02-Reception',
    foundation: {
      spaceType: 'large_lobby',
      architectureAesthetic: { mode: 'large_continuous_envelope' },
      spatialScale: {
        class: 'large', ceilingHeight: 'generous', depthExpression: 'strong',
        breathingRoom: 'high', foregroundMidgroundBackground: true,
      },
      functionalZoning: { required: ['entrance', 'reception', 'waiting', 'circulation'] },
      circulation: { mode: 'clear_primary_route' },
      cameraIntent: { role: 'entrance_three_quarter_wide' },
    },
    requiredCalibration: ['brandIntegration', 'materialAndLighting', 'architecturalSkin', 'decorativeDensity'],
    exactAllowedRoles: ['brand_integration', 'material_and_lighting', 'architectural_skin', 'decorative_density'],
  },
  {
    name: 'Case C | Jiuzhou reception',
    spaceType: 'reception',
    expectedAnchor: 'JZMX-SGR-02-Reception',
    foundation: {
      spaceType: 'reception',
      architectureAesthetic: { mode: 'soft_continuous_service_interface' },
      spatialScale: { class: 'task_defined', ceilingHeight: 'preserve_source' },
      functionalZoning: { required: ['arrival', 'reception_desk', 'waiting', 'back_of_house'] },
      circulation: { mode: 'clear_service_and_guest_routes' },
      cameraIntent: { role: 'front_three_quarter_service_view' },
    },
    requiredCalibration: ['brandAtmosphere', 'brandIntegration', 'materialAndLighting', 'architecturalSkin'],
  },
];

test('Jiuzhou calibration keeps the Vertical Archetype disabled', () => {
  assert.equal(isVerticalSpatialArchetypeEnabled(bundle), false);
});

for (const scenario of scenarios) {
  test(`${scenario.name} compiles the v1.1 spatial contract`, () => {
    const selection = selectProjectAnchors({
      currentProjectId: 'jiuzhou-aesthetics',
      spaceType: scenario.spaceType,
      manifest: bundle.anchorManifest,
    });
    assert.deepEqual(selection.anchors.map((item) => item.id), [scenario.expectedAnchor]);
    if (scenario.exactAllowedRoles) {
      assert.deepEqual(selection.anchors[0].allowedRoles, scenario.exactAllowedRoles);
    }

    const signals = {
      ...anchorSignalsFromSelection(selection),
      spatialScale: { class: 'compact', ceilingHeight: 'low' },
      functionalLayout: ['copy anchor layout'],
      composition: ['copy anchor camera'],
    };
    const compiled = compileSpatialContext({
      task: {
        deliverableFamily: 'space', subtype: scenario.spaceType,
        shot: scenario.foundation.cameraIntent.role, aspectRatio: '16:9',
      },
      spatialFoundation: scenario.foundation,
      projectCanon: bundle.projectCanon,
      anchorManifest: bundle.anchorManifest,
      anchorSignals: signals,
      selectedAnchors: selection,
      projectExclusions: bundle.projectExclusions,
      structureReferences: [{
        assetId: `structure-${scenario.spaceType}`,
        sourceAssetId: `source-${scenario.spaceType}`,
        projectRelativePath: `input/structure-references/${scenario.spaceType}.png`,
        sha256: 'a'.repeat(64),
        preprocessing: ['colour_authority_removed'],
      }],
    });

    const prompt = compiled.promptSections.join('\n');
    for (const heading of [
      '[CURRENT TASK]', '[STRUCTURE FOUNDATION — PRESERVE]', '[VISUAL SKIN — REPLACE]',
      '[LOCKED BRAND ASSETS]', '[JIUZHOU PROJECT VISUAL CANON V2]',
      '[GOLDEN ANCHOR CALIBRATION]', '[LOGO SCALE CONTRACT]',
      '[PROJECT NEGATIVE GUARDS]', '[OUTPUT CONTRACT]',
    ]) assert.match(prompt, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));

    assert.doesNotMatch(prompt, /VERTICAL ARCHETYPE BIAS/u);
    assert.match(prompt, /generic futuristic clinic/u);
    assert.match(prompt, /technology showroom ceiling/u);
    assert.match(prompt, /large saturated purple wall/u);
    assert.match(prompt, /hard maximum 0\.15/u);
    assert.match(prompt, /hard maximum 0\.28/u);
    for (const dimension of scenario.requiredCalibration) {
      assert.ok(compiled.anchorCalibration[dimension], `${dimension} must be calibrated`);
    }
    assert.equal(compiled.anchorCalibration.spatialScale, undefined);
    assert.equal(compiled.anchorCalibration.functionalLayout, undefined);
    assert.equal(compiled.anchorCalibration.composition, undefined);
    assert.deepEqual(compiled.foundation.spatialScale, compiled.foundationSnapshot.spatialScale);
    assert.equal(compiled.conflicts.filter((item) =>
      item.reason === 'structure_reference_has_zero_visual_skin_authority').length, 6);

    const failureTags = deriveProjectCalibrationFailureTags({
      projectCanon: bundle.projectCanon,
      evidence: {
        logoScale: {
          symbolWallHeightRatio: 0.1,
          fullLockupWallWidthRatio: 0.22,
          signageDominatesFirstRead: false,
        },
        projectCalibrationChecks: {
          anchorStyleAligned: true,
          genericFuturisticClinicPresent: false,
          architectureSkinReplaced: true,
          purpleSurfaceOveruse: false,
          technologyShowroomLightingPresent: false,
          brandArchitecturallyIntegrated: true,
          largeSpaceIntentPreserved: true,
        },
      },
    });
    const scores = Object.fromEntries(profile.dimensions.map((item) => [item.id, 94]));
    const evaluation = evaluateProjectGolden({
      profile,
      currentProjectId: 'jiuzhou-aesthetics',
      scores,
      failureTags,
    });
    assert.equal(evaluation.finalDecision, 'pass');
    assert.deepEqual(evaluation.fatalFailureTags, []);
  });
}
