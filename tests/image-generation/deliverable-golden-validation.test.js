import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileImageGenerationTask } from '../../packages/image-generation-runtime/src/task-builder.js';

const fixture = JSON.parse(await readFile(
  new URL('./fixtures/deliverable-golden/fengtangtang.json', import.meta.url),
  'utf8',
));

const BASE_CONTEXT = {
  visualContext: {
    identity: fixture.identity,
    lockedAssets: fixture.lockedAssets,
    currentVisualSystem: { primaryColors: ['#e85d32'] },
  },
  resolvedContext: {
    identity: fixture.identity,
    lockedAssets: fixture.lockedAssets,
    conflicts: [],
  },
  references: fixture.references,
  warnings: [],
  sourceMetadata: { visualRunId: 'visual-golden-v17' },
};

const PROMPTS = {
  interior_scene: '生成一张冯烫烫品牌的店内装修图',
  vi_application: '生成冯烫烫围裙、菜单和名片等 VI 应用图',
  storefront_scene: '生成冯烫烫店面门头效果图',
  packaging_render: '生成冯烫烫包装礼盒渲染图',
};

function compileGolden(deliverable) {
  const sources = {
    schemaVersion: '3.0',
    sourcePreset: 'visual_analysis',
    deliverable,
    purpose: 'production',
    projectId: fixture.projectId,
    visual: { projectId: fixture.projectId, visualRunId: 'visual-golden-v17' },
    userIntent: { prompt: PROMPTS[deliverable], aspectRatio: '16:9' },
  };
  return compileImageGenerationTask({
    sources,
    context: BASE_CONTEXT,
    runId: `golden-${deliverable}`,
    taskId: `task-${deliverable}`,
    capabilities: {
      providerId: 'dashscope',
      modelId: 'wan2.7-image-pro',
      supportsTextToImage: true,
      supportsMultiImageReference: true,
      supportsNegativePrompt: false,
      supportsRemoteCancel: false,
      maxReferenceImages: 6,
      maxOutputCount: 1,
      supportedSizes: ['1024*1024'],
      outputMimeTypes: ['image/png'],
    },
    providerConfig: { apiKey: 'OFFLINE_GOLDEN', baseUrl: 'https://offline.invalid' },
    parameters: { size: '1024*1024', region: 'beijing' },
    createdAt: '2026-07-27T00:00:00.000Z',
  });
}

test('golden: 冯烫烫 interior scene is a complete space and excludes VI collections', () => {
  const result = compileGolden('interior_scene');
  const prompt = result.compiledPromptMarkdown;
  for (const phrase of [
    '完整室内空间', '墙面', '地面', '天花', '收银台或点餐区',
    '顾客用餐区', '家具', '动线', '灯光', '材质', '空间纵深', '广角视角',
    'VI 物料平铺', '多格拼贴',
  ]) {
    assert.ok(prompt.includes(phrase), `interior prompt must include ${phrase}`);
  }
  assert.equal(result.gate.blocked, false, JSON.stringify(result.gate.errors));
  assert.deepEqual(
    result.referencePlan.selected.map((item) => item.assetId),
    ['logo-current', 'restaurant-space', 'brand-color'],
  );
  assert.deepEqual(
    result.referencePlan.analysisOnly.map((item) => item.assetId).sort(),
    ['apron-mockup', 'menu-flatlay', 'packaging-box'].sort(),
  );
  assert.equal(result.referencePlan.selected.filter((item) => item.role === 'identity_reference').length, 1);
  assert.ok(result.providerPayloadPreview.references.every(
    (item) => !['menu-flatlay', 'apron-mockup'].includes(item.assetId),
  ));
});

test('golden: VI control group still permits application materials', () => {
  const result = compileGolden('vi_application');
  assert.equal(result.gate.blocked, false, JSON.stringify(result.gate.errors));
  assert.ok(result.compiledPromptMarkdown.includes('明确的 VI 应用展示'));
  assert.ok(result.referencePlan.selected.some(
    (item) => ['menu-flatlay', 'apron-mockup'].includes(item.assetId),
  ));
});

test('golden: storefront is a complete facade rather than a flat logo mockup', () => {
  const result = compileGolden('storefront_scene');
  for (const phrase of ['完整门头', '店铺入口', '招牌', '门窗', '外立面材质', '街道关系', '人行尺度', '平面 Logo 展示']) {
    assert.ok(result.compiledPromptMarkdown.includes(phrase), phrase);
  }
  assert.equal(result.gate.blocked, false, JSON.stringify(result.gate.errors));
});

test('golden: packaging render requires and selects physical structure', () => {
  const result = compileGolden('packaging_render');
  for (const phrase of ['真实包装结构', '包装材质', '盒型', '开合关系', '真实比例']) {
    assert.ok(result.compiledPromptMarkdown.includes(phrase), phrase);
  }
  assert.equal(result.gate.blocked, false, JSON.stringify(result.gate.errors));
  assert.ok(result.referencePlan.selected.some(
    (item) => item.assetId === 'packaging-box' && item.role === 'structure_reference',
  ));
});
