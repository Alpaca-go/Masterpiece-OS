import test from 'node:test';
import assert from 'node:assert/strict';
import { compileCreativeBrief } from '../src/creative-brief-compiler.js';

function analysisFixture() {
  return {
    competitorAnalysis: [{ name: '案例 A' }, { name: '案例 B' }, { name: '案例 C' }],
    reasoning: {
      brandIdentity: { statement: '为真实日常建立温暖关系的品牌。' },
      brandPositioning: { statement: '案例 A 的行业对标证明该方向。' },
      designLanguage: { statement: '克制的结构与真实材质共同建立信任。', principles: ['单一视觉重心', '保持稳定留白'], rationale: ['Evidence'] },
      emotionalDirection: { statement: '温暖、可信、不浮夸。', desiredFeelings: ['温暖', '可信'], avoidFeelings: ['浮夸', '案例 A风格', '促销感'] },
      photographyDirection: { lighting: '柔和侧光', framing: '平视', depth: '中景深', materials: '真实纸张', atmosphere: '安静可信' },
      designGoal: '建立跨触点一致且能长期积累的品牌体验。'
    },
    approvedBrandDNA: {
      logo: '只使用授权标志', color: '深红与米白', typography: '清晰层级', composition: '单一重心', whitespace: '稳定留白',
      photography: '真实摄影', materials: '真实纸张', packaging: '保持盒型', craft: '克制工艺'
    },
    designRisks: [
      { problem: '信息过载', reason: '内容过多', prevention: '减少层级' },
      { problem: '与案例 A高度相似', reason: '视觉机制接近', prevention: '重建原创资产' }
    ],
    mustKeep: ['授权标志', '深红主色', '稳定盒型'],
    canExplore: ['真实摄影', '空间尺度']
  };
}

test('Compiler 只重组已批准信息并生成八部分高密度 Brief', () => {
  const analysis = analysisFixture();
  const before = JSON.stringify(analysis);
  const brief = compileCreativeBrief(analysis);
  assert.equal(JSON.stringify(analysis), before);
  assert.deepEqual(Object.keys(brief).filter((key) => !['compilation', 'runtimeGptBrief'].includes(key)), [
    'creativeVision', 'brandPersonality', 'approvedBrandDNA', 'creativePrinciples',
    'mustKeep', 'canExplore', 'photographyDirection', 'designGoal'
  ]);
  assert.equal(brief.approvedBrandDNA.logo, analysis.approvedBrandDNA.logo);
  assert.equal(brief.compilation.changesDecisions, false);
  assert.ok(brief.runtimeGptBrief.length <= 1500);
});

test('Compiler 从正式 Brief 中排除竞品、Evidence 与 Reasoning', () => {
  const brief = compileCreativeBrief(analysisFixture());
  const text = JSON.stringify(brief, (key, value) => ['compilation', 'runtimeGptBrief'].includes(key) ? undefined : value);
  assert.doesNotMatch(text, /案例 A|案例 B|案例 C|Evidence|Reasoning|Industry Benchmark|Competitor|判断依据|推导过程/);
  assert.deepEqual(brief.creativePrinciples.avoidRules, ['避免信息过载']);
  assert.deepEqual(brief.brandPersonality.avoid, ['浮夸', '促销感']);
});
