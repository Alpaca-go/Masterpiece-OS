import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildBriefReview } from '../src/brief-review.js';
import { runPipeline } from '../src/pipeline.js';

function completeFixture() {
  const approvedBrandDNA = {
    logo: '授权标志', color: '深红与米白', typography: '清晰层级', composition: '非对称网格', whitespace: '稳定留白',
    photography: '真实生活摄影', materials: '真实纸张', packaging: '已确认盒型', craft: '压凹工艺'
  };
  const creativeBrief = {
    creativeVision: { statement: '以真实日常建立关系。', direction: '建立跨触点品牌体验。' },
    brandPersonality: { statement: '温暖而可信。', desired: ['温暖'], avoid: ['浮夸'] },
    approvedBrandDNA,
    creativePrinciples: { statement: '克制、温暖、清晰。', principles: ['单一重心'], avoidRules: ['避免模板化'] },
    mustKeep: ['授权标志', '深红主色', '已确认盒型'],
    canExplore: ['摄影场景', '空间尺度'],
    photographyDirection: { lighting: '柔和侧光', framing: '平视', depth: '中景深', materials: '真实纸张', atmosphere: '温暖可信' },
    designGoal: '建立跨触点一致的品牌体验。',
    compilation: { source: 'Analysis' },
    runtimeGptBrief: 'runtime only'
  };
  const analysis = {
    evidence: { assets: { visualInspectionVerified: true, inspectedImageCount: 3, imageCount: 3 } },
    competitorAnalysis: [{}, {}, {}]
  };
  return { creativeBrief, analysis };
}

test('Brief Review 检查八部分并确认 Analysis 分离', () => {
  const review = buildBriefReview(completeFixture());
  assert.equal(review.checks.length, 8);
  assert.equal(review.completeness, 100);
  assert.equal(review.readiness, 'Ready for Creative Development');
  assert.equal(review.separationReady, true);
  assert.deepEqual(review.forbiddenTerms, []);
});

test('Brief Review 对待确认内容与分析语言标记未就绪', () => {
  const fixture = completeFixture();
  fixture.creativeBrief.approvedBrandDNA.photography = '摄影方向待确认';
  fixture.creativeBrief.brandPersonality.avoid = [];
  fixture.creativeBrief.creativeVision.direction = 'Industry Benchmark 表明需要升级。';
  const review = buildBriefReview(fixture);
  assert.ok(review.completeness < 100);
  assert.equal(review.separationReady, false);
  assert.ok(review.forbiddenTerms.includes('Industry Benchmark'));
  assert.equal(review.checks.find((item) => item.section === 'Approved Brand DNA').status, 'Needs Evidence');
});

test('Brief Review 将竞品简称视为信息架构泄漏', () => {
  const fixture = completeFixture();
  fixture.analysis.competitorAnalysis = [{ name: '案例 A 品牌升级' }, {}, {}];
  fixture.creativeBrief.brandPersonality.avoid = ['避免案例 A风格'];
  const review = buildBriefReview(fixture);
  assert.equal(review.separationReady, false);
  assert.ok(review.forbiddenTerms.includes('Competitor:案例 A'));
});

test('v3.3 流水线不写成长历史或 Knowledge Review', async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'brief-review-output-'));
  const historyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'brief-review-history-'));
  const { result } = await runPipeline(path.resolve('examples', '匿名文创Demo'), { output, historyDir });
  assert.equal(result.growth, undefined);
  assert.equal(result.thinkingReview, undefined);
  assert.equal(result.briefReview.checks.length, 8);
  assert.deepEqual(await fs.readdir(historyDir), []);
  await assert.rejects(fs.access(path.join(output, '03-Knowledge-Review.md')), { code: 'ENOENT' });
});
