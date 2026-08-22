import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DOCUMENT_ROLE_CLASSIFIER_VERSION,
  DOCUMENT_ROLE_TAXONOMY,
  classifyDocumentRole,
  prepareDocumentSet,
  resolvePlanningSourcePolicy
} from '@masterpiece/document-ingestion/document-preparation.js';
import {
  G02_ANCHOR_EPISTEMIC_CONTRACT,
  G02_ANCHOR_EPISTEMIC_EXPECTATIONS
} from '../../../scripts/lib/g02-qualification-contract.mjs';

const strategyRichBusinessPlan = {
  filename: 'regional-health-business-plan.docx',
  title: 'Regional Health Commercial Plan',
  sectionHeadings: ['市场分析', '商业模式', '目标客户', '服务体系', '推广策略', '融资计划', '未来发展战略'],
  tableHeadings: ['渠道', '收入来源'],
  rawText: '目标客户与消费者需求。商业模式采用会员和加盟。战略目标是全国扩张。通过竞争分析形成差异化。产品与核心服务形成解决方案。推广策略覆盖渠道和营销。增长与转型规划延伸至全球。融资计划、资金需求、利润和退出机制。'
};

function role(document) {
  return classifyDocumentRole(document);
}

test('ROLE-01 visual-guideline remains classified', () => {
  assert.equal(role({ filename: 'Brand-VI视觉规范.pdf', rawText: '标准色与品牌字体' }).role, 'visual-guideline');
});

test('ROLE-02 creative-brief remains classified', () => {
  assert.equal(role({ filename: 'campaign-creative-brief.docx', rawText: '传播任务与创意目标' }).role, 'creative-brief');
});

test('ROLE-03 market-research remains classified', () => {
  assert.equal(role({ filename: '品牌市场调研报告.docx', rawText: '市场规模、行业趋势、数据来源与消费者调研' }).role, 'market-research');
});

test('ROLE-04 brand-strategy remains classified', () => {
  assert.equal(role({ filename: '品牌定位策略.docx', rawText: '品牌愿景、价值主张与品牌人格' }).role, 'brand-strategy');
});

test('ROLE-05 product-information remains classified', () => {
  assert.equal(role({ filename: '产品说明手册.docx', rawText: '产品功能、产品参数和产品规格' }).role, 'product-information');
});

test('ROLE-06 reference remains classified', () => {
  assert.equal(role({ filename: '参考案例集.pdf', rawText: '参考案例与灵感来源' }).role, 'reference');
});

test('ROLE-07 business-plan is a first-class role', () => {
  assert.equal(role(strategyRichBusinessPlan).role, 'business-plan');
});

test('ROLE-08 sparse unsupported content remains unknown', () => {
  const result = role({ filename: 'notes.txt', rawText: '电话记录和待办事项。' });
  assert.equal(result.role, 'unknown');
  assert.equal(result.planningStrategicEvidenceEligible, false);
});

test('BP-01 clear strategy-rich business plan qualifies', () => {
  const result = role(strategyRichBusinessPlan);
  assert.equal(result.role, 'business-plan');
  assert.equal(result.planningStrategicEvidenceEligible, true);
  assert.ok(result.strategicDomains.length >= 4);
});

test('BP-02 brand-heavy business plan keeps business-plan primary', () => {
  const result = role({
    ...strategyRichBusinessPlan,
    title: '商业计划书与品牌定位',
    rawText: `${strategyRichBusinessPlan.rawText} 品牌定位、品牌愿景、品牌使命、价值主张、品牌人格。`
  });
  assert.equal(result.role, 'business-plan');
  assert.ok(result.secondaryRoles.includes('brand-strategy'));
});

test('BP-03 research-heavy business plan keeps business-plan primary', () => {
  const result = role({
    ...strategyRichBusinessPlan,
    title: '商业计划书与市场研究',
    rawText: `${strategyRichBusinessPlan.rawText} 市场规模、行业趋势、数据来源、消费者调研、竞品分析、PEST、SWOT。`
  });
  assert.equal(result.role, 'business-plan');
  assert.ok(result.secondaryRoles.includes('market-research'));
});

test('BP-04 product-heavy business plan keeps business-plan primary', () => {
  const result = role({
    ...strategyRichBusinessPlan,
    title: '商业计划书与产品资料',
    rawText: `${strategyRichBusinessPlan.rawText} 产品功能、产品参数、产品规格、服务内容、核心服务和产品体系。`
  });
  assert.equal(result.role, 'business-plan');
  assert.ok(result.secondaryRoles.includes('product-information'));
});

test('BP-05 tied planning roles expose mixed ambiguity', () => {
  const result = role({ filename: '品牌策略与市场研究.docx', rawText: '' });
  assert.equal(result.role, 'mixed-planning');
  assert.equal(result.ambiguity, true);
  assert.equal(result.planningStrategicEvidenceEligible, false);
});

test('BP-06 BP filename alone cannot create a planning role', () => {
  const result = role({ filename: 'generic-BP.docx', title: 'Notes', rawText: 'Contact list and meeting logistics.' });
  assert.equal(result.role, 'unknown');
  assert.equal(result.planningStrategicEvidenceEligible, false);
});

test('ELIG-01 brand-strategy is eligible', () => {
  assert.equal(role({ filename: '品牌战略.docx' }).planningStrategicEvidenceEligible, true);
});

test('ELIG-02 qualifying business-plan is eligible', () => {
  assert.equal(role(strategyRichBusinessPlan).planningStrategicEvidenceEligible, true);
});

test('ELIG-03 filename-only BP is insufficient', () => {
  assert.equal(role({ filename: 'empty-BP.docx', rawText: 'minutes' }).planningStrategicEvidenceEligible, false);
});

test('ELIG-04 product-information is not automatically eligible', () => {
  const result = role({ filename: '产品说明手册.docx', rawText: '产品参数与规格' });
  assert.equal(result.role, 'product-information');
  assert.equal(result.planningStrategicEvidenceEligible, false);
});

test('ELIG-05 visual-guideline is ineligible', () => {
  assert.equal(role({ filename: '视觉规范.pdf' }).planningStrategicEvidenceEligible, false);
});

test('ELIG-06 unknown is ineligible', () => {
  assert.equal(resolvePlanningSourcePolicy({ role: 'unknown' }).planningStrategicEvidenceEligible, false);
});

test('ELIG-07 unresolved ambiguity fails closed', () => {
  const policy = resolvePlanningSourcePolicy({ role: 'business-plan', ambiguity: true, strategicDomains: Object.keys({ a: 1, b: 1, c: 1, d: 1 }) });
  assert.equal(policy.sourceRole, 'UNKNOWN_SOURCE');
  assert.equal(policy.planningStrategicEvidenceEligible, false);
});

test('ELIG-08 production classifier and policy contain no project-specific rule', () => {
  const production = `${readFileSync('packages/document-ingestion/src/document-preparation.js', 'utf8')}\n${readFileSync('packages/creative-intelligence/src/strategic-synthesis/planning-strategic-evidence.ts', 'utf8')}`;
  for (const forbidden of ['一剂良方', 'D7BE0AF', '中医综合BP']) assert.equal(production.includes(forbidden), false);
});

test('MIXED-01 brand strategy can carry market research as secondary', () => {
  const result = role({ filename: '品牌策略方案.docx', rawText: '品牌定位。市场规模、行业趋势、数据来源、消费者调研。' });
  assert.equal(result.role, 'brand-strategy');
  assert.ok(result.secondaryRoles.includes('market-research'));
  assert.equal(result.ambiguity, false);
});

test('MIXED-02 business plan can carry product information as secondary', () => {
  const result = role({ ...strategyRichBusinessPlan, title: '商业计划书 产品资料', rawText: `${strategyRichBusinessPlan.rawText} 产品功能、产品参数、产品规格、核心服务。` });
  assert.equal(result.role, 'business-plan');
  assert.ok(result.secondaryRoles.includes('product-information'));
});

test('MIXED-03 creative brief can carry brand strategy as secondary', () => {
  const result = role({ filename: '创意简报.docx', rawText: '传播任务。品牌定位、品牌愿景、品牌使命、价值主张。' });
  assert.equal(result.role, 'creative-brief');
  assert.ok(result.secondaryRoles.includes('brand-strategy'));
});

test('MIXED-04 tied scores are ambiguity and input-order independent', () => {
  const first = role({ filename: '品牌策略与市场研究.docx', sectionHeadings: ['品牌定位', '市场规模'] });
  const second = role({ filename: '品牌策略与市场研究.docx', sectionHeadings: ['市场规模', '品牌定位'] });
  assert.equal(first.role, 'mixed-planning');
  assert.equal(second.role, first.role);
  assert.deepEqual(second.scores, first.scores);
});

test('G01ROLE-01 frozen G01 remains brand-strategy and eligible', () => {
  const result = role({ filename: '九州美学品牌定位提案-1.1(1).docx' });
  assert.equal(result.role, 'brand-strategy');
  assert.equal(result.sourceRole, 'PLANNING_STRATEGIC_SOURCE');
  assert.equal(result.planningStrategicEvidenceEligible, true);
});

test('ANCHOR-EPI-01 canonical enum is exact', () => {
  assert.deepEqual(G02_ANCHOR_EPISTEMIC_EXPECTATIONS, ['FACT', 'USER_REQUIREMENT', 'MIXED', 'OPEN']);
});

test('ANCHOR-EPI-02 generic contract exposes the same enum', () => {
  assert.equal(G02_ANCHOR_EPISTEMIC_CONTRACT.values, G02_ANCHOR_EPISTEMIC_EXPECTATIONS);
});

test('ANCHOR-EPI-03 OPEN and UNKNOWN ambiguity is eliminated', () => {
  assert.equal(G02_ANCHOR_EPISTEMIC_EXPECTATIONS.includes('OPEN'), true);
  assert.equal(G02_ANCHOR_EPISTEMIC_EXPECTATIONS.includes('UNKNOWN'), false);
  assert.equal(G02_ANCHOR_EPISTEMIC_CONTRACT.unknownIsExpectationValue, false);
});

test('ANCHOR-EPI-04 anchor expectation cannot override runtime authority', () => {
  assert.equal(G02_ANCHOR_EPISTEMIC_CONTRACT.expectationAuthority, 'NON_AUTHORITATIVE');
  assert.equal(G02_ANCHOR_EPISTEMIC_CONTRACT.runtimeAuthority, 'deterministic Planning epistemic classifier');
});

test('classifier version and taxonomy are explicit and additive', () => {
  const result = role(strategyRichBusinessPlan);
  assert.equal(DOCUMENT_ROLE_CLASSIFIER_VERSION, 'document-role-classifier-v2');
  assert.ok(DOCUMENT_ROLE_TAXONOMY.includes('business-plan'));
  assert.equal(typeof result.role, 'string');
  assert.ok(['high', 'medium', 'low'].includes(result.confidence));
  const prepared = prepareDocumentSet({
    projectId: 'generic-role-contract',
    corpus: {
      documents: [{
        id: 'doc-1',
        filename: 'generic-brand-strategy.md',
        sourceType: 'markdown',
        rawText: 'Brand strategy and positioning.',
        sections: [{ heading: 'Strategy', content: 'Brand strategy and positioning.' }]
      }]
    }
  });
  assert.equal(prepared.sourceDocuments[0].documentRole, 'brand-strategy');
  assert.equal(prepared.sourceDocuments[0].sourceRole, 'PLANNING_STRATEGIC_SOURCE');
  assert.equal(prepared.sourceDocuments[0].planningStrategicEvidenceEligible, true);
  assert.ok(Array.isArray(prepared.sourceDocuments[0].secondaryRoles));
});
