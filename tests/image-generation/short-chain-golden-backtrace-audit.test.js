import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateGoldenBacktraceAudit,
  renderGoldenBacktraceAuditMarkdown,
} from '@masterpiece/image-generation-runtime/generation/index.js';

const items = [
  {
    id: 'A-01',
    goldenContent: '高端专业平台',
    matchGroups: [['高端专业平台', '专业服务平台']],
    contentType: 'source_fact',
    expectedProducer: 'Source Fact Extractor',
    sourceEvidence: ['brief:1'],
  },
  {
    id: 'A-02',
    goldenContent: '层叠结构与透射光',
    matchGroups: [['层叠结构'], ['透射光', '透射']],
    contentType: 'media_translation',
    expectedProducer: 'Spatial Translation',
    sourceEvidence: ['asset:1'],
  },
  {
    id: 'A-03',
    goldenContent: '禁止普通办公室',
    matchGroups: [['普通办公室']],
    contentType: 'diagnosis',
    expectedProducer: 'Visual Diagnosis',
    sourceEvidence: ['brief:1'],
  },
];

test('backtrace audit reports packet/prompt coverage and first failure stage', () => {
  const audit = generateGoldenBacktraceAudit({
    items,
    currentAnalysis: '旧报告只有通用艺术空间。',
    packet: {
      projectFacts: { brandRole: { value: '专业服务平台' } },
      diagnosis: { brandMisreadRisks: [{ target: '普通办公室' }] },
      mediaTranslations: { spatial: { structureLanguage: ['层叠结构'] } },
      validation: { conflicts: [] },
    },
    finalPrompt: '品牌角色：高端专业平台。使用层叠结构。禁止普通办公室。',
  });
  assert.equal(audit.summary.decisionPacketCoverage, 0.6667);
  assert.equal(audit.summary.finalPromptCoverage, 0.6667);
  assert.equal(audit.items[1].firstFailureStage, 'media_translation');
  assert.equal(audit.summary.conflictCount, 0);
});

test('backtrace audit renders portable Markdown output', () => {
  const audit = generateGoldenBacktraceAudit({
    items,
    packet: {
      projectFacts: { brandRole: { value: '高端专业平台' } },
      diagnosis: { brandMisreadRisks: [{ target: '普通办公室' }] },
      mediaTranslations: { spatial: { spatialConcept: '层叠结构与透射' } },
      validation: { conflicts: [] },
    },
    finalPrompt: '高端专业平台；层叠结构与透射光；禁止普通办公室。',
  });
  const markdown = renderGoldenBacktraceAuditMarkdown(audit);
  assert.match(markdown, /Decision Packet 覆盖：100%/u);
  assert.match(markdown, /\| A-03 \|/u);
});
