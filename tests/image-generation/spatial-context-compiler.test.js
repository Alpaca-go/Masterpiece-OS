import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertProtectedFieldsUnchanged,
  compileSpatialContext,
  loadSpatialProjectBundle,
  selectProjectAnchors,
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
    anchorManifest: bundle.anchorManifest,
    anchorSignals: { materialAndLighting: ['soft indirect light'] },
    projectExclusions: bundle.projectExclusions,
  });
  const prompt = compiled.promptSections.join('\n');
  const ordered = [
    '[CURRENT TASK]',
    '[STRUCTURE FOUNDATION — PRESERVE]',
    '[VISUAL SKIN — REPLACE]',
    '[LOCKED BRAND ASSETS]',
    '[JIUZHOU PROJECT VISUAL CANON V2]',
    '[GOLDEN ANCHOR CALIBRATION]',
    '[LOGO SCALE CONTRACT]',
    '[PROJECT NEGATIVE GUARDS]',
    '[OUTPUT CONTRACT]',
  ];
  for (let index = 1; index < ordered.length; index += 1) {
    assert.ok(prompt.indexOf(ordered[index - 1]) < prompt.indexOf(ordered[index]));
  }
  assert.match(prompt, /Do not inherit room size, ceiling height, spatial depth/u);
  assert.match(prompt, /hard maximum 0\.15/u);
  assert.match(prompt, /hard maximum 0\.28/u);
  assert.doesNotMatch(prompt, /VERTICAL ARCHETYPE BIAS/u);
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

test('compiled context records only the selected versioned Anchor metadata', () => {
  const bundle = loadSpatialProjectBundle('jiuzhou-aesthetics');
  const selection = selectProjectAnchors({
    currentProjectId: 'jiuzhou-aesthetics',
    spaceType: 'large_lobby',
    manifest: bundle.anchorManifest,
  });
  const compiled = compileSpatialContext({
    task: { subtype: 'reception' },
    spatialFoundation: foundation,
    projectCanon: bundle.projectCanon,
    anchorManifest: bundle.anchorManifest,
    selectedAnchors: selection,
  });
  assert.deepEqual(compiled.selectedAnchors.map((anchor) => anchor.id), ['JZMX-SGR-02-Reception']);
  assert.equal(compiled.selectedAnchors[0].deniedRoles.includes('spatial_scale'), true);
});

test('source-space structure references have zero visual-skin authority', () => {
  const compiled = compileSpatialContext({
    task: { subtype: 'large_lobby' },
    spatialFoundation: foundation,
    structureReferences: [{
      assetId: 'structure-reference-source-1',
      sourceAssetId: 'source-1',
      projectRelativePath: 'input/structure-references/structure-reference-source-1.png',
      sha256: 'a'.repeat(64),
      preprocessing: ['colour_authority_removed', 'fine_texture_suppressed'],
    }],
  });
  const section = compiled.promptSections.find((item) =>
    item.startsWith('[STRUCTURE FOUNDATION — PRESERVE]'));
  assert.match(section, /Preserve only room envelope, spatial scale, ceiling height/u);
  assert.match(compiled.promptSections.join('\n'), /source image has zero visual-skin authority/u);
  assert.equal(compiled.structureReferences[0].responsibility, 'structure_only');
  assert.equal(compiled.conflicts.filter((item) =>
    item.reason === 'structure_reference_has_zero_visual_skin_authority').length, 6);
  assert.ok(compiled.conflicts.every((item) =>
    item.reason !== 'structure_reference_has_zero_visual_skin_authority'
      || item.overriddenBy === 'project_visual_canon'));
});
