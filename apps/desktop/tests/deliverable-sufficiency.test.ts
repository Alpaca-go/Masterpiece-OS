import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateDeliverableSufficiency } from '../../../packages/analysis-runtime/src/index.ts';
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
