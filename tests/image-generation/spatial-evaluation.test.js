import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateFoundationPreservation,
  evaluateFoundationPreservationChecks,
  evaluateGlobalSpaceQuality,
  evaluateProjectGolden,
  loadGlobalSpaceEvaluationProfile,
  loadProjectSpaceEvaluationProfile,
  mergeSpatialEvaluations,
} from '@masterpiece/image-generation-runtime';

const globalProfile = loadGlobalSpaceEvaluationProfile();
const projectProfile = loadProjectSpaceEvaluationProfile('jiuzhou-aesthetics');
const allScores = (profile, score) => Object.fromEntries(profile.dimensions.map((item) => [item.id, score]));
const foundation = {
  version: 1,
  spaceType: 'large_lobby',
  spatialScale: { class: 'large', preservation: 'lock' },
  architectureAesthetic: { mode: 'modern_monolithic' },
  functionalZoning: { required: ['reception', 'waiting'] },
  circulation: { mode: 'clear_primary_route' },
  cameraIntent: { role: 'entrance_three_quarter_wide' },
  preservation: {
    architecture: 'lock', spatialScale: 'lock', functionalZoning: 'lock',
    circulation: 'lock', atmosphereCore: 'constrain', cameraRole: 'lock',
  },
};

test('global evaluator scores only reusable spatial quality', () => {
  const result = evaluateGlobalSpaceQuality({ profile: globalProfile, scores: allScores(globalProfile, 92) });
  assert.equal(result.totalScore, 92);
  assert.equal(result.finalDecision, 'pass');
  assert.equal(Object.hasOwn(result.dimensions, 'brand_asset_accuracy'), false);
});

test('project evaluator is isolated to its owning project', () => {
  assert.throws(() => evaluateProjectGolden({
    profile: projectProfile,
    currentProjectId: 'other-medical-brand',
    scores: allScores(projectProfile, 95),
  }), (error) => error.code === 'CROSS_PROJECT_EVALUATION_PROFILE');
});

test('project fatal tag overrides an otherwise high score', () => {
  const result = evaluateProjectGolden({
    profile: projectProfile,
    currentProjectId: 'jiuzhou-aesthetics',
    scores: allScores(projectProfile, 95),
    failureTags: ['logo_drift'],
  });
  assert.equal(result.finalDecision, 'fail');
  assert.ok(result.revisionActions.length > 0);
});

test('large-space compression is a Foundation Preservation hard failure', () => {
  const observed = structuredClone(foundation);
  observed.spatialScale.class = 'compact';
  const result = evaluateFoundationPreservation({
    foundationSnapshot: foundation,
    observedFoundation: observed,
  });
  assert.equal(result.preserved, false);
  assert.deepEqual(result.failureTags, ['spatial_foundation_overridden']);
});

test('evaluation merger hard-fails when any locked Foundation field changes', () => {
  const global = evaluateGlobalSpaceQuality({ profile: globalProfile, scores: allScores(globalProfile, 95) });
  const project = evaluateProjectGolden({
    profile: projectProfile,
    currentProjectId: 'jiuzhou-aesthetics',
    scores: allScores(projectProfile, 95),
  });
  const observed = structuredClone(foundation);
  observed.cameraIntent.role = 'compact_front_view';
  const merged = mergeSpatialEvaluations({
    global,
    project,
    foundation: evaluateFoundationPreservation({ foundationSnapshot: foundation, observedFoundation: observed }),
  });
  assert.equal(merged.finalDecision, 'fail');
  assert.ok(merged.failureTags.includes('spatial_foundation_overridden'));
  assert.ok(merged.revisionActions.length > 0);
});

test('multimodal preservation checks fail closed on a compressed large space', () => {
  const result = evaluateFoundationPreservationChecks({
    foundationSnapshot: foundation,
    checks: {
      architectureAestheticPreserved: true,
      spatialScalePreserved: false,
      largeSpaceIntentPreserved: false,
      functionalZoningPreserved: true,
      cameraRolePreserved: true,
    },
  });
  assert.equal(result.status, 'failed');
  assert.ok(result.changedFields.includes('spatialScale'));
  assert.ok(result.changedFields.includes('largeSpaceIntent'));
});
