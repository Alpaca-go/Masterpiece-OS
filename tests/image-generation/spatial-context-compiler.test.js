import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertProtectedFieldsUnchanged,
  compileSpatialContext,
  loadPremiumMedicalAestheticsArchetype,
  loadSpatialProjectBundle,
} from '@masterpiece/image-generation-runtime';

const foundation = {
  version: 1,
  spaceType: 'large_lobby',
  architectureAesthetic: { mode: 'modern_monolithic' },
  spatialScale: {
    class: 'large', ceilingHeight: 'generous', depthExpression: 'strong',
    breathingRoom: 'high', foregroundMidgroundBackground: true,
  },
  functionalZoning: { required: ['entrance', 'reception', 'waiting', 'circulation'] },
  circulation: { mode: 'clear_primary_route' },
  cameraIntent: { role: 'entrance_three_quarter_wide' },
};

test('Anchor attempt to shrink a large lobby is rejected with conflict provenance', () => {
  const bundle = loadSpatialProjectBundle('jiuzhou-aesthetics');
  const compiled = compileSpatialContext({
    task: { subtype: 'large_lobby' },
    spatialFoundation: foundation,
    projectCanon: bundle.projectCanon,
    verticalArchetype: loadPremiumMedicalAestheticsArchetype(),
    anchorManifest: bundle.anchorManifest,
    anchorSignals: {
      spatialScale: { class: 'compact', ceilingHeight: 'standard' },
      materialAndLighting: ['soft indirect light', 'low-reflection mineral surface'],
      composition: ['compact frontal reception composition'],
    },
    projectExclusions: bundle.projectExclusions,
  });
  assert.equal(compiled.foundation.spatialScale.class, 'large');
  assert.equal(compiled.anchorCalibration.spatialScale, undefined);
  assert.equal(compiled.anchorCalibration.composition, undefined);
  assert.deepEqual(compiled.anchorCalibration.materialAndLighting.value,
    ['soft indirect light', 'low-reflection mineral surface']);
  assert.ok(compiled.conflicts.some((item) =>
    item.field === 'spatialScale' && item.reason === 'influence_cap_zero'));
  assert.ok(compiled.conflicts.some((item) =>
    item.field === 'cameraIntent' && item.reason === 'protected_by_lock'));
});

test('compiled prompt sections preserve fixed layer order and explicit Anchor denial', () => {
  const bundle = loadSpatialProjectBundle('jiuzhou-aesthetics');
  const compiled = compileSpatialContext({
    task: { subtype: 'large_lobby' }, spatialFoundation: foundation,
    projectCanon: bundle.projectCanon,
    verticalArchetype: loadPremiumMedicalAestheticsArchetype(),
    anchorManifest: bundle.anchorManifest,
    anchorSignals: { materialAndLighting: ['soft indirect light'] },
    projectExclusions: bundle.projectExclusions,
  });
  const prompt = compiled.promptSections.join('\n');
  const ordered = [
    '[SPATIAL FOUNDATION — DO NOT OVERRIDE]',
    '[LOCKED BRAND ASSETS]',
    '[PROJECT VISUAL CANON]',
    '[VERTICAL ARCHETYPE BIAS]',
    '[ANCHOR CALIBRATION]',
    '[NEGATIVE / RISK GUARDS]',
    '[OUTPUT CONTRACT]',
  ];
  for (let index = 1; index < ordered.length; index += 1) {
    assert.ok(prompt.indexOf(ordered[index - 1]) < prompt.indexOf(ordered[index]));
  }
  assert.match(prompt, /Do not inherit room size, ceiling height, spatial depth/u);
  assert.doesNotMatch(prompt, /Golden Acceptance Standard|八大评分维度/u);
});

test('protected field assertion fails closed when a lock changes', () => {
  const original = compileSpatialContext({ task: { subtype: 'large_lobby' }, spatialFoundation: foundation }).foundation;
  const changed = structuredClone(original);
  changed.spatialScale.class = 'compact';
  assert.throws(() => assertProtectedFieldsUnchanged(original, changed),
    (error) => error.code === 'SPATIAL_FOUNDATION_OVERRIDDEN');
});

test('legacy space compilation remains opt-in when no spatial bundle or foundation is supplied', () => {
  const compiled = compileSpatialContext({ task: { subtype: 'lobby' } });
  assert.equal(compiled.foundation.spatialScale.preservation, 'lock');
  assert.equal(compiled.projectCanon, null);
  assert.equal(compiled.verticalArchetype, null);
});
