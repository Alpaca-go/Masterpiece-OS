import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileShortChainImageGeneration,
  validateShortChainDeliverableEvidence,
} from '@masterpiece/image-generation-runtime/short-chain/index.js';
import { phase1Context } from '../fixtures/phase1.js';
import {
  buildPackagingStructuredAnalysis,
  validatePackagingStructuredAnalysis,
} from '@masterpiece/creative-production-runtime/packaging-analysis.js';
import { evaluatePackagingEvidence } from '@masterpiece/image-generation-runtime/task-families/packaging';

test('Phase 1 builds evidence-backed Packaging Structured Analysis', () => {
  const context = phase1Context();
  const analysis = buildPackagingStructuredAnalysis({
    visualDecisionPacket: context.visualDecisionPacket,
    shotId: 'PKG-HERO-SINGLE',
    shotDefinition: { purpose: 'single_packaging_hero' },
  });
  assert.equal(analysis.status, 'ready');
  assert.equal(analysis.packageStructure[0].structure, '天地盖硬盒');
  assert.deepEqual(analysis.provenance.structureEvidenceRefs, ['asset:box']);
  assert.equal(analysis.confidence.overall, 1);
  assert.deepEqual(validatePackagingStructuredAnalysis(analysis), {
    status: 'ready',
    missingRequiredFields: [],
  });
});

test('Phase 1 routes PKG-HERO-SINGLE through analysis, translation, contract and the existing adapter', () => {
  const context = phase1Context();
  context.sourceAssetRefs = [{ assetId: 'logo-1', name: 'Confirmed Logo', role: 'logo' }];
  const result = compileShortChainImageGeneration({
    projectContext: context,
    task: {
      projectId: context.projectId,
      deliverableFamily: 'packaging',
      subtype: 'lid_and_base_box',
      shot: 'PKG-HERO-SINGLE',
      packagingProductCount: 1,
      count: 1,
      aspectRatio: '4:3',
      currentInstruction: 'Generate one finished hero image of the confirmed package.',
      referenceAssetIds: ['logo-1'],
    },
  });
  assert.equal(result.compiledPrompt.packagingStructuredAnalysis.status, 'ready');
  assert.equal(result.compiledPrompt.packagingTranslation.status, 'ready');
  assert.equal(result.compiledPrompt.blocks.length, 14);
  assert.equal(result.compiledPrompt.preflightReport.status, 'pass');
  assert.equal(result.payload.adapterId, 'seedream-5.0-pro');
  assert.deepEqual(result.payload.referenceAssetIds, ['logo-1']);
  assert.match(result.payload.prompt, /Faithfully apply the selected locked identity reference/u);
  assert.doesNotMatch(result.payload.prompt, /real, enterable|reception desk|space circulation/iu);
});

test('Phase 1 evaluates PKG-HERO-SINGLE with Packaging-specific visible criteria', () => {
  const result = evaluatePackagingEvidence({
    shotId: 'PKG-HERO-SINGLE',
    evidence: { packagingQa: {
      logoFidelity: 0.96,
      structureMatch: true,
      materialMatch: true,
      commercialPhotography: true,
    } },
  });
  assert.equal(result.status, 'passed');
  assert.equal(result.criteria.length, 4);
  assert.equal(evaluatePackagingEvidence({
    shotId: 'PKG-HERO-SINGLE',
    evidence: { packagingQa: {
      logoFidelity: 0.7,
      structureMatch: true,
      materialMatch: false,
      commercialPhotography: true,
    } },
  }).status, 'failed');

  const validation = validateShortChainDeliverableEvidence({
    projectId: 'packaging-project',
    runId: 'run-1',
    imageId: 'image-1',
    taskContract: {
      taskId: 'task-1',
      deliverableFamily: 'packaging',
      subtype: 'lid_and_base_box',
      shot: 'PKG-HERO-SINGLE',
      referenceAssetIds: [],
    },
    evidence: {
      detectedFamily: 'packaging',
      detectedSubtype: 'lid_and_base_box',
      visibleEvidence: ['one finished rigid box in a commercial three-quarter view'],
      brandMatch: 'matched',
      brandToneMatch: 'matched',
      sceneCompleteness: 'complete',
      logoTextStatus: 'correct',
      packagingQa: {
        logoFidelity: 0.96,
        structureMatch: true,
        materialMatch: true,
        commercialPhotography: true,
      },
    },
  });
  assert.equal(validation.status, 'passed');
  assert.equal(validation.packagingEvaluation.status, 'passed');
});

test('Jiuzhou spatial decisions compile into a fourteen-block packaging contract', () => {
  const result = compileShortChainImageGeneration({
    projectContext: phase1Context(),
    task: {
      projectId: 'phase1-project',
      deliverableFamily: 'packaging',
      subtype: 'lid_and_base_box',
      shot: 'open_box',
      count: 1,
      aspectRatio: '4:3',
      currentInstruction: '生成一张完整的品牌产品礼盒开盒主视觉。',
      logoUsageMode: 'post_composite',
    },
    now: '2026-07-30T00:00:00.000Z',
  });
  assert.equal(result.compiledPrompt.blocks.length, 14);
  assert.equal(result.compiledPrompt.preflightReport.status, 'pass');
  assert.equal(result.compiledPrompt.completeness.coverage.packagingStructure, 1);
  assert.match(result.compiledPrompt.finalPrompt, /半透明套封/u);
  assert.doesNotMatch(result.compiledPrompt.finalPrompt, /接待台|空间动线|天花|35mm/u);
  assert.equal(result.payload.prompt, result.compiledPrompt.finalPrompt);
});

test('formal packaging compilation blocks when package structure is unconfirmed', () => {
  const context = phase1Context();
  context.visualDecisionPacket.lockedAssets = context.visualDecisionPacket.lockedAssets
    .filter((item) => item.type !== 'packaging_structure');
  context.visualDecisionPacket.mediaTranslations.packaging.structureStrategy = [];
  assert.throws(() => compileShortChainImageGeneration({
    projectContext: context,
    task: {
      projectId: 'phase1-project',
      deliverableFamily: 'packaging',
      subtype: 'lid_and_base_box',
      shot: 'open_box',
      currentInstruction: '生成正式包装。',
      logoUsageMode: 'post_composite',
    },
  }), (error) => error.code === 'PACKAGING_STRUCTURE_EVIDENCE_MISSING');
});
