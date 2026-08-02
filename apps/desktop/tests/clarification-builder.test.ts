import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildClarificationQuestions,
  evaluateDeliverableSufficiency,
} from '@masterpiece/analysis-runtime/index.ts';
import { structuredAnalysisPacketFixture } from './analysis-runtime-fixtures.ts';

test('clarification builder turns packaging field failures into natural language options', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.packaging.productAndCategoryRole = [];
  packet.mediaTranslations.packaging.structureStrategy = [];
  packet.mediaTranslations.packaging.productArrangement = [];
  const result = evaluateDeliverableSufficiency({
    packet,
    deliverable: 'packaging',
    execution: { outputLanguage: 'zh-CN', aspectRatio: '3:4' },
  });

  const questions = buildClarificationQuestions(result.issues);

  assert.equal(questions.length, 3);
  assert.match(questions[0]?.question ?? '', /包装内实际放置的产品/u);
  assert.equal(questions[0]?.options?.length, 3);
  assert.ok(questions.every((question) => (
    !question.question.includes('mediaTranslations')
    && !question.question.includes(question.code)
  )));
});

test('clarification builder limits normal user interruptions to at most three questions', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.projectFacts.brandName.value = 'unknown';
  packet.projectFacts.industry.value = 'unknown';
  packet.projectFacts.brandRole.value = 'unknown';
  packet.mediaTranslations.packaging.productAndCategoryRole = [];
  const result = evaluateDeliverableSufficiency({
    packet,
    deliverable: 'packaging',
    execution: { outputLanguage: 'zh-CN', aspectRatio: '3:4' },
  });

  assert.equal(buildClarificationQuestions(result.issues, 20).length, 3);
});

test('repairable fields without current-project evidence become user clarification instead of AI guessing', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.spatial.mustBeVisible = [];
  packet.lockedAssets = [];
  packet.assetInventory = {
    logoAssets: [], colorAssets: [], typographyAssets: [], graphicMotifs: [],
    imageryAssets: [], layoutPatterns: [], materialCues: [],
    packagingStructures: [], spatialCues: [], copyAssets: [],
  };
  packet.projectFacts.brandRole.evidenceRefs = [];
  packet.mediaTranslations.spatial.brandIntegration = [];

  const result = evaluateDeliverableSufficiency({
    packet,
    deliverable: 'space',
    execution: {
      camera: { focalLength: '24-28mm' },
      outputLanguage: 'zh-CN',
      aspectRatio: '16:9',
    },
  });
  const issue = result.issues.find((candidate) => (
    candidate.path === 'mediaTranslations.spatial.mustBeVisible'
  ));

  assert.equal(result.status, 'requires_confirmation');
  assert.equal(issue?.repairStrategy, 'ask_user');
  assert.deepEqual(issue?.availableEvidenceRefs, []);
  assert.match(buildClarificationQuestions(result.issues)[0]?.question ?? '', /补充或确认/u);
});
