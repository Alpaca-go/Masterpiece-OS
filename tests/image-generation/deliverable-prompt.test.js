import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileDeliverablePrompt, resolveUserIntent } from '../../packages/image-generation-runtime/src/deliverables/index.js';

const EXPECTED = {
  interior_scene: ['店内空间效果图', '完整室内空间', '墙面', '地面', '天花', '顾客用餐区', '动线', '空间纵深', 'VI 物料平铺', '多格拼贴'],
  storefront_scene: ['店面 / 门头效果图', '完整门头', '店铺入口', '外立面材质', '街道关系'],
  packaging_render: ['包装渲染图', '真实包装结构', '盒型', '开合关系', '真实比例'],
  brand_poster: ['品牌海报', '单一主画面', '海报构图', '文案预留区', '整套物料合集'],
  vi_application: ['VI 应用图', '明确的 VI 应用展示', '受控的物料数量'],
};

const SNAPSHOT_NAMES = {
  interior_scene: 'interior-scene',
  storefront_scene: 'storefront-scene',
  packaging_render: 'packaging-render',
  brand_poster: 'brand-poster',
  vi_application: 'vi-application',
};

for (const [deliverable, expected] of Object.entries(EXPECTED)) {
  test(`${deliverable} compiles its own prompt contract`, async () => {
    const promptByType = {
      interior_scene: '生成店内装修图',
      storefront_scene: '生成门头效果图',
      packaging_render: '生成包装礼盒渲染',
      brand_poster: '生成品牌海报',
      vi_application: '生成菜单和围裙 VI 应用',
    };
    const result = compileDeliverablePrompt({
      sourcePreset: 'visual_analysis',
      deliverable,
      userIntent: { prompt: promptByType[deliverable] },
      lockedAssets: ['Logo 不得修改'],
      identity: ['品牌名称：冯烫烫'],
      upstreamContext: ['旧方案包含大量 VI 物料'],
      references: [{ assetId: 'logo', generationRole: 'identity_reference' }],
      textSafety: ['不生成二维码'],
      outputSpec: ['16:9', '1 张'],
    });
    const snapshot = await readFile(
      new URL(`./fixtures/deliverable-prompt-snapshots/${SNAPSHOT_NAMES[deliverable]}.prompt.md`, import.meta.url),
      'utf8',
    );
    for (const phrase of snapshot.replace(/\r\n/gu, '\n').trim().split('\n')) {
      assert.ok(result.compiledPromptMarkdown.includes(phrase), phrase);
    }
    for (const phrase of expected) assert.ok(result.compiledPromptMarkdown.includes(phrase), phrase);
    assert.equal(result.promptVersion, 3);
    assert.deepEqual(result.promptSourceMap.priorityOrder.slice(0, 2), ['deliverable', 'userIntent']);
    assert.ok(result.compiledPromptMarkdown.indexOf('本次唯一输出任务') < result.compiledPromptMarkdown.indexOf('上游上下文'));
  });
}

test('user intent conflict is explicit and never silently changes deliverable', () => {
  const resolution = resolveUserIntent({ prompt: '生成一张店内装修图', deliverable: 'vi_application' });
  assert.equal(resolution.detectedDeliverable, 'interior_scene');
  assert.equal(resolution.conflicts[0].code, 'DELIVERABLE_USER_INTENT_CONFLICT');
  assert.throws(
    () => compileDeliverablePrompt({ sourcePreset: 'visual_analysis', deliverable: 'vi_application', userIntent: { prompt: '生成店内装修图' } }),
    (error) => error.code === 'DELIVERABLE_USER_INTENT_CONFLICT',
  );
});
