import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileGenerationBlueprint,
  compileGenerationBlueprintPrompt,
  validateGenerationBlueprint,
} from '../packages/creative-production-runtime/src/generation-blueprint.js';
import { normalizeCreativeDirection } from '../packages/creative-production-runtime/src/creative-direction.js';

function direction() {
  return normalizeCreativeDirection({
    brandReposition: '从传统餐饮门店升级为城市共享厨房体验品牌',
    creativeConcept: '晨间共享厨房',
    visualWorld: '自然晨光、开放后厨、真实顾客活动构成温暖而克制的城市日常',
    visualMechanism: '以共享长桌、暖白留白和少量品牌红形成跨触点识别',
    keepAssets: ['品牌名称与注册 Logo'],
    removeAssets: ['Logo 墙和旧 VI 拼贴'],
    transformAssets: ['将旧红色转译为动线与服务节点上的少量识别信号'],
    projectTransformation: '从旧式 VI 陈列升级为共享餐桌驱动的品牌体验',
    oldVisualProblems: ['旧方案依赖 Logo 墙和物料拼贴'],
    designStrategy: '以共享餐桌、开放后厨和晨光建立可跨触点延展的新系统',
    primaryConcept: '晨间共享厨房',
    visualKeywords: ['开放', '温暖', '通透'],
    thingsToRemove: ['停止旧 VI 拼贴和 Logo 墙主导'],
    thingsToKeep: ['保留品牌名称与注册 Logo'],
    colorStrategy: '暖白与原木为主，品牌红只作为少量路径信号',
    materialStrategy: '真实木材、亚光金属与可触摸纸材',
    compositionStrategy: '单一叙事焦点和真实空间纵深',
    photographyStrategy: '自然晨光、真实使用情境、克制对比',
    spaceStrategy: '围绕开放后厨与共享餐桌组织顾客动线',
    packagingStrategy: '以结构开合和信息带建立新包装系统',
    posterStrategy: '以单一城市日常事件替代 Logo 加产品照片',
    generationRules: ['禁止复制旧 VI、旧海报换内容、旧包装换皮或旧空间重新排列'],
  }, {
    id: 'direction-1',
    projectId: 'project-1',
    sessionId: 'session-1',
    version: '1.0.0',
    understandingGeneratedAt: '2026-07-28T00:00:00.000Z',
    reportPath: 'outputs/report.md',
  }, '2026-07-28T01:00:00.000Z');
}

test('Generation Blueprint compiles a single execution plan from approved Creative Direction', () => {
  const blueprint = compileGenerationBlueprint({
    projectId: 'project-1',
    sessionId: 'session-1',
    creativeDirection: direction(),
    imagePurpose: 'interior_scene',
    userRequest: '生成一张升级后的品牌店铺空间',
    brandAssetRules: ['Logo 只能作为少量身份标识'],
  }, '2026-07-28T02:00:00.000Z');

  assert.equal(blueprint.imagePurpose, 'interior_scene');
  assert.equal(blueprint.creativeDirectionId, 'direction-1');
  assert.ok(blueprint.creativeDirectionSummary.includes(direction().projectTransformation));
  assert.match(blueprint.sceneDescription, /地面、墙面、顶面、纵深、动线/);
  assert.match(blueprint.camera, /24–28mm/);
  assert.ok(blueprint.avoid.includes('VI 展示板'));
  assert.equal(validateGenerationBlueprint(blueprint), blueprint);

  const prompt = compileGenerationBlueprintPrompt(blueprint);
  assert.match(prompt, /Role:/);
  assert.match(prompt, /Creative Direction — defines the new visual language:/);
  assert.match(prompt, /Camera:/);
  assert.match(prompt, /Materials:/);
  assert.doesNotMatch(prompt, /视觉分析报告|Original Visual Project/);
});

test('Generation Blueprint rejects unknown purposes and missing execution arrays', () => {
  assert.throws(() => compileGenerationBlueprint({
    projectId: 'project-1',
    sessionId: 'session-1',
    creativeDirection: direction(),
    imagePurpose: 'moodboard',
    userRequest: '生成 moodboard',
  }), /imagePurpose 无效/);

  const valid = compileGenerationBlueprint({
    projectId: 'project-1',
    sessionId: 'session-1',
    creativeDirection: direction(),
    imagePurpose: 'packaging_render',
    userRequest: '生成新包装',
  });
  assert.throws(() => validateGenerationBlueprint({ ...valid, materials: [] }), /缺少 materials/);
});
