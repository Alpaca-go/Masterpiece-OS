import assert from 'node:assert/strict';
import test from 'node:test';
import { compileVNextImageGeneration } from '@masterpiece/image-generation-runtime/vnext/index.js';
import { phase1Context } from '../phase1-fixtures.js';

test('Jiuzhou spatial decisions compile into a fourteen-block packaging contract', () => {
  const result = compileVNextImageGeneration({
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
  assert.throws(() => compileVNextImageGeneration({
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
