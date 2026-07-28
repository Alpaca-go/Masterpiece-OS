import test from 'node:test';
import assert from 'node:assert/strict';
import { compileGenerationPromptSnapshot } from '../packages/creative-production-runtime/src/generation-prompt.js';

const style = {
  id: 'style-ab', version: '1.0.0', status: 'confirmed',
  promptComponents: { required: ['品牌身份清晰'], negative: ['旧 VI 平铺', '物料合集'] },
  forbiddenVariations: ['复制旧版式'],
  compositionSystem: { hierarchy: ['单一视觉焦点'], focalPointRules: ['完整主体'] },
  materialAndTexture: { materials: ['真实材质'] },
  lightingSystem: { type: '自然光', contrast: '中等对比' },
  typographyCompatibility: ['克制排版'],
  graphicLanguage: { coreMotifs: ['新视觉语言'] },
};
const canon = {
  id: 'canon-ab', version: '1.0.0', status: 'confirmed',
  primaryCanonImageId: 'canon-primary',
  sharedRules: ['统一色彩、材质与构图语言'],
  canonImages: [{
    id: 'canon-primary', type: 'brand_hero', priority: 'primary',
    role: 'Primary Canon', imagePath: 'anchors/candidates/primary/image.webp',
  }],
};
const locks = [{
  id: 'logo-lock', type: 'logo', priority: 'critical',
  sourceAssetId: 'logo', sourceFile: 'assets/logo.png',
  rule: 'Logo 原样保留', forbiddenChanges: ['不得重绘 Logo'],
}];
const direction = {
  id: 'direction-ab',
  version: '1.0.0',
  status: 'ready',
  projectTransformation: '从旧式 VI 陈列升级为真实、连贯的品牌体验',
  oldVisualProblems: ['旧物料缺少叙事'],
  designStrategy: '以单一场景叙事和真实使用关系建立新系统',
  primaryConcept: '真实品牌时刻',
  visualKeywords: ['真实', '开放', '连贯'],
  thingsToRemove: ['停止旧 VI 平铺与物料合集'],
  thingsToKeep: ['保留品牌名和 Logo'],
  colorStrategy: '重新建立身份色比例',
  materialStrategy: '使用真实材质',
  compositionStrategy: '单一焦点',
  photographyStrategy: '自然光下的真实使用情境',
  spaceStrategy: '建立新的品牌空间体验，禁止 Logo 墙加 VI 展示',
  packagingStrategy: '建立新的包装系统，禁止旧包装换材质',
  posterStrategy: '建立新的视觉叙事，禁止 Logo 加产品照片',
  generationRules: ['禁止复制旧 VI、旧海报换内容、旧包装换皮和旧空间重新排列'],
};

const cases = [
  {
    project: '冯烫烫',
    task: '生成一张升级后的店内装修效果图',
    outputType: 'interior_scene',
    required: /完整室内空间/,
    forbiddenPositive: /VI 系统展示|包含菜单、工牌、包装/u,
  },
  {
    project: '九州美学',
    task: '生成一张能建立新方向的品牌海报',
    outputType: 'brand_poster',
    required: /单一主画面/,
    forbiddenPositive: /生成一套物料|物料展示板/u,
  },
  {
    project: '简单包装项目',
    task: '生成一张升级后的包装渲染图',
    outputType: 'packaging_render',
    required: /真实包装渲染/,
    forbiddenPositive: /包装组合展示|多款包装合集/u,
  },
];

for (const item of cases) {
  test(`V18 offline A/B candidate: ${item.project} produces one task-specific result`, () => {
    const snapshot = compileGenerationPromptSnapshot({
      projectId: `project-${item.project}`,
      sessionId: `session-${item.project}`,
      userRequest: item.task,
      outputType: item.outputType,
      creativeDirection: direction,
      styleProfile: style,
      visualCanon: canon,
      lockedAssets: locks,
    }, '2026-07-28T00:00:00.000Z');
    assert.match(snapshot.instruction.outputResponsibility, item.required);
    assert.match(snapshot.instruction.finalPrompt, /禁止拼贴、禁止多格合集/);
    assert.doesNotMatch(
      snapshot.instruction.outputResponsibility,
      item.forbiddenPositive,
    );
    assert.ok(snapshot.selectedReferences.length <= 2);
    assert.deepEqual(snapshot.selectedReferences.map((reference) => reference.role), [
      'identity_reference',
    ]);
  });
}

test('offline A/B baseline exposes the legacy mismatch that the candidate blocks', () => {
  const legacyInteriorPrompt = '品牌 VI 系统展示，包含菜单、工牌、包装、墙面和导视的多格物料合集';
  const candidate = compileGenerationPromptSnapshot({
    projectId: 'project-feng',
    sessionId: 'session-feng',
    userRequest: '生成一张升级后的店内装修效果图',
    outputType: 'interior_scene',
    creativeDirection: direction,
    styleProfile: style,
    visualCanon: canon,
    lockedAssets: locks,
  });
  assert.match(legacyInteriorPrompt, /VI 系统展示|多格物料合集/);
  assert.doesNotMatch(candidate.instruction.finalPrompt, /包含菜单、工牌、包装/);
  assert.match(candidate.instruction.outputResponsibility, /完整室内空间/);
});
