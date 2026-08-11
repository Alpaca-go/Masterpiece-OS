import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateDeliverableSufficiency } from '@masterpiece/analysis-runtime/index.ts';
import { structuredAnalysisPacketFixture } from './analysis-runtime-fixtures.ts';

const execution = {
  camera: { focalLength: '24-28mm' },
  outputLanguage: 'zh-CN',
  aspectRatio: '16:9',
};

test('space sufficiency ignores absent packaging translation', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.packaging = {
    ...packet.mediaTranslations.packaging,
    status: 'insufficient',
    packagingConcept: '',
    productAndCategoryRole: [],
    structureStrategy: [],
    openingExperience: [],
    productArrangement: [],
    missingRequiredFields: ['productAndCategoryRole', 'structureStrategy'],
  };

  const result = evaluateDeliverableSufficiency({
    packet,
    deliverable: 'space',
    execution,
  });

  assert.equal(result.status, 'ready');
  assert.equal(
    result.issues.some((issue) => issue.path.startsWith('mediaTranslations.packaging')),
    false,
  );
});

test('packaging sufficiency requires confirmation for missing real product and structure', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.packaging.productAndCategoryRole = [];
  packet.mediaTranslations.packaging.structureStrategy = [];

  const result = evaluateDeliverableSufficiency({
    packet,
    deliverable: 'packaging',
    execution: {
      outputLanguage: 'zh-CN',
      aspectRatio: '3:4',
    },
  });

  assert.equal(result.status, 'requires_confirmation');
  assert.deepEqual(
    result.issues
      .filter((issue) => issue.severity === 'requires_confirmation')
      .map((issue) => issue.code)
      .sort(),
    ['PACKAGING_PRODUCT_ROLE_MISSING', 'PACKAGING_STRUCTURE_EVIDENCE_MISSING'],
  );
  assert.ok(result.issues.every((issue) => issue.repairStrategy !== 'ai_from_evidence'));
});

test('space execution parameters are defaultable rather than fatal', () => {
  const result = evaluateDeliverableSufficiency({
    packet: structuredAnalysisPacketFixture(),
    deliverable: 'space',
  });

  assert.equal(result.status, 'repairable');
  assert.deepEqual(
    result.issues
      .filter((issue) => issue.severity === 'defaultable')
      .map((issue) => issue.code)
      .sort(),
    [
      'ASPECT_RATIO_DEFAULT_APPLIED',
      'CAMERA_DEFAULT_APPLIED',
      'OUTPUT_LANGUAGE_DEFAULT_APPLIED',
    ],
  );
});

test('space retains the pre-existing structure, material, lighting, and color gate', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.spatial.structureLanguage = [];
  packet.mediaTranslations.spatial.materialLanguage = [];
  packet.mediaTranslations.spatial.lightingLanguage.source = [];
  packet.mediaTranslations.spatial.colorBehavior.accent = [];

  const result = evaluateDeliverableSufficiency({
    packet,
    deliverable: 'space',
    execution,
  });

  assert.equal(result.status, 'repairable');
  assert.deepEqual(
    result.issues.map((issue) => issue.code).sort(),
    [
      'SPATIAL_ACCENT_COLOR_MISSING',
      'SPATIAL_LIGHTING_LANGUAGE_MISSING',
      'SPATIAL_MATERIAL_LANGUAGE_MISSING',
      'SPATIAL_STRUCTURE_LANGUAGE_MISSING',
    ],
  );
});

test('unknown brand facts require confirmation instead of AI invention', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.projectFacts.brandRole.value = 'unknown';

  const result = evaluateDeliverableSufficiency({
    packet,
    deliverable: 'space',
    execution,
  });

  assert.equal(result.status, 'requires_confirmation');
  assert.ok(result.issues.some((issue) => (
    issue.code === 'BRAND_ROLE_FACT_MISSING'
    && issue.repairStrategy === 'ask_user'
  )));
});

// v2-space-generator 2026-08-08: covers the JZMX bug where
// `mediaTranslations.spatial.functionalNetwork` shipped empty (0 items)
// while sceneProgram had 4 items, and the desktop preflight gate blocked
// image generation with `BRAND_ROLE_NOT_SPATIALLY_MANIFESTED` and
// `FLAGSHIP_PROGRAM_TOO_GENERIC`. The sufficiency check now flags this
// gap at 3+ items to match the preflight gate's `>= 3` requirement, and
// the field-repair-policy registers FUNCTIONAL_NETWORK_INCOMPLETE so the
// AI repair path populates the field on the next V5 analysis run.
test('empty functional network is flagged with FUNCTIONAL_NETWORK_INCOMPLETE (3+ items required)', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.spatial.functionalNetwork = [];

  const result = evaluateDeliverableSufficiency({
    packet,
    deliverable: 'space',
    execution,
  });

  assert.ok(result.issues.some((issue) => (
    issue.code === 'FUNCTIONAL_NETWORK_INCOMPLETE'
    && issue.severity === 'repairable'
    && issue.repairStrategy === 'ai_from_evidence'
  )));
});

test('short functional network (<3 items) is also flagged for repair', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.spatial.functionalNetwork = [
    'arrival to consultation',
  ];

  const result = evaluateDeliverableSufficiency({
    packet,
    deliverable: 'space',
    execution,
  });

  assert.ok(result.issues.some((issue) => (
    issue.code === 'FUNCTIONAL_NETWORK_INCOMPLETE'
  )));
});

test('missing brandRoleManifestation and mustBeVisible are flagged for the preflight gate sync', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.spatial.brandRoleManifestation = [];
  packet.mediaTranslations.spatial.mustBeVisible = [];

  const result = evaluateDeliverableSufficiency({
    packet,
    deliverable: 'space',
    execution,
  });

  assert.ok(result.issues.some((issue) => (
    issue.code === 'BRAND_ROLE_MANIFESTATION_MISSING'
  )));
  assert.ok(result.issues.some((issue) => (
    issue.code === 'MUST_BE_VISIBLE_MISSING'
  )));
});
