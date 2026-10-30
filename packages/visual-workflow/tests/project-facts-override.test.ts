import test from 'node:test';
import assert from 'node:assert/strict';
import { applyProjectFactsToPacket } from '../src/runtime/project-facts-override.js';

const FACTS = {
  floorArea: 120,
  ceilingHeight: 3.6,
  locationType: 'street',
  dineInShare: 'mostly_dine_in',
  servicePeriod: 'dinner',
  budgetBand: 'mid',
  kitchenExhaust: 'open_flame',
};

function packet() {
  return {
    schemaVersion: '1.0',
    projectId: 'demo',
    projectFacts: { brandName: { value: '潮牛帮', source: 'project_record', evidenceRefs: ['project_record:brandName'], confidence: 1, status: 'confirmed' } },
    mediaTranslations: {
      spatial: {
        designProposal: {
          sourceType: 'model_proposal',
          basis: ['品牌视觉资产中的牛角符号(asset-1)', '200㎡小店型的空间限制(asset-2)'],
          assumptions: ['空间为矩形或近似矩形布局', '有基本的水电与排烟条件', '目标客群为小镇青年与本地家庭'],
          unresolvedQuestions: ['具体空间尺寸与柱网结构', '现有设备规格与位置', '预算限制细节'],
        },
      },
    },
  };
}

test('facts become confirmed user_provided entries', () => {
  const result = applyProjectFactsToPacket(packet(), FACTS, { appliedAt: '2026-10-30T00:00:00.000Z' });
  assert.equal(result.projectFacts.floorArea.value, '120 ㎡');
  assert.equal(result.projectFacts.floorArea.unit, '㎡');
  assert.equal(result.projectFacts.floorArea.source, 'user_provided');
  assert.equal(result.projectFacts.floorArea.confidence, 1);
  assert.equal(result.projectFacts.floorArea.evidenceRefs[0], 'project_record:facts.floorArea');
  assert.equal(result.projectFacts.ceilingHeight.value, '3.6 m');
  assert.equal(result.projectFacts.kitchenExhaust.value, '可开放明火明档');
  // Existing facts are preserved.
  assert.equal(result.projectFacts.brandName.value, '潮牛帮');
});

test('assumptions and open questions about the supplied topics are replaced', () => {
  const result = applyProjectFactsToPacket(packet(), FACTS, { appliedAt: '2026-10-30T00:00:00.000Z' });
  const proposal = result.mediaTranslations.spatial.designProposal;
  assert.deepEqual(proposal.assumptions, [
    '空间为矩形或近似矩形布局',
    '目标客群为小镇青年与本地家庭',
    '面积、层高、尺寸、预算、时段与排烟条件以项目事实为准（用户提供）。',
  ]);
  assert.deepEqual(proposal.unresolvedQuestions, ['现有设备规格与位置']);
  assert.deepEqual(result.projectFactsApplied.removedAssumptions, ['有基本的水电与排烟条件']);
  assert.deepEqual(result.projectFactsApplied.removedQuestions, ['具体空间尺寸与柱网结构', '预算限制细节']);
});

test('an evidence area that contradicts the fact is annotated, not silently kept', () => {
  const result = applyProjectFactsToPacket(packet(), FACTS, { appliedAt: '2026-10-30T00:00:00.000Z' });
  const basis = result.mediaTranslations.spatial.designProposal.basis;
  assert.equal(basis[0], '品牌视觉资产中的牛角符号(asset-1)');
  assert.ok(basis[1].startsWith('200㎡小店型的空间限制(asset-2)'));
  assert.ok(basis[1].includes('与用户提供的 120 ㎡ 冲突'));
  assert.deepEqual(result.projectFactsApplied.conflicts.map((item) => item.evidenceValue), [200]);
});

test('a consistent evidence area is left untouched', () => {
  const source = packet();
  source.mediaTranslations.spatial.designProposal.basis[1] = '120㎡小店型的空间限制(asset-2)';
  const result = applyProjectFactsToPacket(source, FACTS, { appliedAt: '2026-10-30T00:00:00.000Z' });
  assert.equal(result.mediaTranslations.spatial.designProposal.basis[1], '120㎡小店型的空间限制(asset-2)');
  assert.deepEqual(result.projectFactsApplied.conflicts, []);
});

test('the override is idempotent', () => {
  const first = applyProjectFactsToPacket(packet(), FACTS, { appliedAt: '2026-10-30T00:00:00.000Z' });
  const second = applyProjectFactsToPacket(first, FACTS, { appliedAt: '2026-10-30T01:00:00.000Z' });
  assert.equal(second, first, 'a second pass must return the same object');
  assert.equal(second.mediaTranslations.spatial.designProposal.assumptions.filter((text) => text.includes('以项目事实为准')).length, 1);
});

test('projects without facts are untouched', () => {
  const source = packet();
  const before = JSON.stringify(source);
  assert.equal(applyProjectFactsToPacket(source, {}), source);
  assert.equal(applyProjectFactsToPacket(source, undefined), source);
  assert.equal(JSON.stringify(source), before);
});
