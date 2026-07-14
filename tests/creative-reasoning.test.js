import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCreativeReasoning } from '../src/creative-reasoning.js';

const inventory = { imageCount: 2, totalFiles: 2, items: [] };
const brand = {
  brandName: '匿名品牌', logo: { files: ['logo.svg'] }, primaryColor: '#112233', secondaryColors: ['#FFFFFF'],
  fonts: [], fontTemperament: '克制、现代', packaging: ['纸盒'], coreVisualAssets: ['圆形符号']
};
const benchmarks = { projectType: { value: '品牌视觉升级' }, industry: { value: '文化生活' } };

test('Creative Reasoning 保留人工逐张核验后的品牌视觉 DNA', () => {
  const result = buildCreativeReasoning(inventory, brand, benchmarks, {
    visualInspection: { verified: true, inspectedImageCount: 2, findings: ['两张画面均采用大面积留白'] },
    creativeReasoning: {
      positioning: { summary: '当代文化生活品牌', evidence: ['来自两张实景与包装画面'] },
      keywords: [{ keyword: '克制', reason: '画面元素少且层级稳定' }],
      temperament: { summary: '温和、理性', evidence: ['低饱和摄影与稳定网格'] },
      visualDNA: {
        color: '深蓝为主、白色为底', composition: '单一主体居中', whitespace: '保留 40% 以上呼吸区',
        photography: '自然侧光与真实阴影', packaging: '纸盒结构不变', craft: '无涂布纸与压凹',
        mustKeep: ['圆形符号'], mustAvoid: ['霓虹渐变']
      },
      photographyLanguage: { lighting: '柔和侧光', lens: '50mm 平视', materials: '纸张与木材', atmosphere: '安静温和' },
      creativeDirection: '用克制留白和真实材质表达当代文化感。',
      designRisks: [{ problem: '主体容易过小', reason: '留白比例较高', prevention: '主体占画面 45% 以上' }]
    }
  });
  assert.equal(result.visualInspection.verified, true);
  assert.equal(result.positioning.summary, '当代文化生活品牌');
  assert.equal(result.visualDNA.whitespace, '保留 40% 以上呼吸区');
  assert.equal(result.photographyLanguage.lighting, '柔和侧光');
  assert.equal(result.creativeDirection, '用克制留白和真实材质表达当代文化感。');
  assert.deepEqual(result.designRisks[0], { problem: '主体容易过小', reason: '留白比例较高', prevention: '主体占画面 45% 以上' });
});

test('缺少逐张视觉核验时明确待确认且不伪造画面事实', () => {
  const result = buildCreativeReasoning(inventory, brand, benchmarks, {});
  assert.equal(result.visualInspection.verified, false);
  assert.match(result.evidenceStatus, /视觉核验未闭环/);
  assert.match(result.visualDNA.composition, /待逐张视觉确认/);
  assert.match(result.visualDNA.photography, /待逐张视觉确认/);
  assert.equal(result.designRisks[0].problem, 'Creative Reasoning 缺少完整逐张视觉核验');
});

