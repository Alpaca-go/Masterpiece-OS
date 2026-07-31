import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {
  compileVisualMemory,
  compileVisualMemoryPrompt,
  validateVisualMemory,
  VISUAL_MEMORY_COMPILER_VERSION,
} from '@masterpiece/creative-production-runtime/visual-memory.js';

function fixture() {
  return {
    projectId: 'project-memory',
    visualContext: {
      generatedAt: '2026-07-28T00:00:00.000Z',
      identity: { industry: '餐饮' },
      currentVisualSystem: {
        primaryColors: ['暖红'],
        supportingColors: ['米白'],
        graphicAssets: ['旧装饰纹样'],
        materialSignals: ['牛皮纸'],
        photographySignals: ['暖调食物摄影'],
      },
      evaluation: { visualProblems: ['视觉碎片化'] },
    },
    understanding: {
      generatedAt: '2026-07-28T00:01:00.000Z',
      projectIdentity: { industry: '餐饮' },
      identityLocks: ['Logo 保持原样'],
      valuableAssets: ['产品实拍'],
      currentProblems: ['缺少统一视觉机制'],
      upgradePrinciples: ['建立一致的材质语言'],
      oldPatternsToAvoid: ['旧版作品集拼贴'],
      assetReadingSummary: [
        { assetId: 'logo', summary: '品牌 Logo', recommendedUsage: 'identity_reference' },
        { assetId: 'food', summary: '产品实拍', recommendedUsage: 'reading_only' },
        { assetId: 'bad', summary: '旧版错误应用', recommendedUsage: 'exclude' },
      ],
    },
    creativeDirection: {
      id: 'direction-1',
      version: '1.0.0',
      brandReposition: '从街边快餐升级为现代地域餐饮品牌',
      projectTransformation: '建立现代地域餐饮系统',
      visualWorld: '温暖、克制、真实',
      creativeConcept: '炉火与纸张',
      primaryConcept: '温度轨迹',
      visualKeywords: ['温暖', '克制'],
      colorStrategy: '降低红色饱和度，以米白建立呼吸',
      materialStrategy: '未涂布纸与哑光金属',
      compositionStrategy: '单一焦点与充分留白',
      photographyStrategy: '真实食物近景',
      visualMechanism: '以蒸汽轨迹形成跨触点识别',
      designStrategy: '用统一轨迹连接空间、包装与海报',
      oldVisualProblems: ['旧版元素堆叠'],
      keepAssets: ['品牌 Logo'],
      thingsToKeep: [],
      transformAssets: ['旧装饰纹样'],
      removeAssets: ['低质量 Mockup'],
      thingsToRemove: [],
      generationRules: ['禁止作品集拼贴'],
      spaceStrategy: '空间专用策略不应污染包装和海报任务',
      packagingStrategy: '包装专用策略由 Blueprint 按任务注入',
      posterStrategy: '海报专用策略由 Blueprint 按任务注入',
    },
    lockedAssets: [{
      id: 'lock-logo',
      type: 'logo',
      name: 'Logo',
      rule: 'Logo 必须保持原样',
      sourceAssetId: 'logo',
    }],
    assets: [
      { id: 'logo', relativePath: 'logo.png', mimeType: 'image/png', status: 'ready' },
      { id: 'food', relativePath: 'food.png', mimeType: 'image/png', status: 'ready' },
      { id: 'bad', relativePath: 'bad.png', mimeType: 'image/png', status: 'ready' },
    ],
  };
}

test('Visual Memory compresses analysis, direction and asset roles without losing exclusions', () => {
  const memory = compileVisualMemory(fixture(), '2026-07-28T00:02:00.000Z');
  assert.equal(validateVisualMemory(memory), memory);
  assert.equal(memory.source.compiler_version, VISUAL_MEMORY_COMPILER_VERSION);
  assert.equal(memory.reference_strategy.pack_size.min, 3);
  assert.equal(memory.reference_strategy.pack_size.max, 5);
  assert.equal(memory.reference_strategy.provider_reference_limit, 2);
  assert.equal(memory.reference_strategy.candidates.find((item) => item.asset_id === 'logo').role, 'keep_reference');
  assert.equal(memory.reference_strategy.candidates.find((item) => item.asset_id === 'bad').role, 'ignore_reference');
  assert.ok(memory.visual_problems.includes('视觉碎片化'));
  assert.ok(memory.visual_opportunities.includes('建立一致的材质语言'));
  assert.ok(memory.generation_rules.avoid.includes('旧版作品集拼贴'));
});

test('execution prompt is bounded and leaves touchpoint-specific strategy to Generation Blueprint', () => {
  const input = fixture();
  input.understanding.currentProblems = Array.from(
    { length: 20 },
    (_, index) => `问题 ${index}: 不得继承的旧视觉模式`,
  );
  const memory = compileVisualMemory(input, '2026-07-28T00:02:00.000Z');
  const prompt = compileVisualMemoryPrompt(memory);
  assert.doesNotMatch(prompt, /空间专用策略|包装专用策略|海报专用策略/);
  assert.ok((prompt.match(/^- 问题 /gmu) ?? []).length <= 8);
  assert.ok(prompt.length < 6_000);
});

test('Visual Memory schema is closed and exposes all seven required memory sections', () => {
  const schema = JSON.parse(fs.readFileSync(
    new URL('../schemas/creative-production/visual-memory.schema.json', import.meta.url),
    'utf8',
  ));
  assert.equal(schema.additionalProperties, false);
  for (const field of [
    'brand_core', 'locked_assets', 'visual_dna', 'visual_problems',
    'visual_opportunities', 'reference_strategy', 'generation_rules',
  ]) {
    assert.ok(schema.required.includes(field));
  }
});

test('Visual Memory rejects paths outside the project', () => {
  const memory = compileVisualMemory(fixture());
  assert.throws(() => validateVisualMemory({
    ...memory,
    reference_strategy: {
      ...memory.reference_strategy,
      candidates: [{
        ...memory.reference_strategy.candidates[0],
        source_path: '../outside.png',
      }],
    },
  }), { code: 'VISUAL_MEMORY_PATH_INVALID' });
});
