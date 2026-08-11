import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCreativeDirectionPrompt,
  normalizeCreativeDirection,
  parseCreativeDirectionResponse,
  validateCreativeDirection,
} from '@masterpiece/creative-production-runtime/creative-direction.js';

function validDirection() {
  return {
    projectTransformation: '从旧式 VI 陈列升级为以社区共享餐桌为核心的空间与传播系统',
    oldVisualProblems: ['旧物料依赖 Logo 墙与拼贴展示'],
    designStrategy: '用共享餐桌、开放后厨和晨间自然光建立可跨触点延展的体验系统',
    primaryConcept: '晨间共享厨房',
    visualKeywords: ['开放', '温暖', '通透'],
    thingsToRemove: ['停止旧 VI 拼贴和 Logo 墙主导'],
    thingsToKeep: ['保留品牌名与原 Logo'],
    colorStrategy: '降低旧红色面积，以暖白、原木和少量品牌红建立层级',
    materialStrategy: '使用真实木材、亚光金属和可触摸纸材',
    compositionStrategy: '单一叙事焦点，大面积留白，避免作品集式拼贴',
    photographyStrategy: '使用自然晨光和真实使用情境，避免棚拍陈列',
    spaceStrategy: '围绕开放后厨与共享餐桌组织动线',
    packagingStrategy: '建立以材质层级和信息带为核心的新包装系统',
    posterStrategy: '以单一事件叙事替代 Logo 加产品照片',
    generationRules: ['禁止复制旧 VI、旧海报换内容、旧包装换皮或旧空间重新排列'],
  };
}

test('Creative Direction runtime builds a text-only decision prompt and validates normalized output', () => {
  const prompt = buildCreativeDirectionPrompt({
    understanding: { identityLocks: ['Logo 不变'] },
    analysisReport: '当前视觉问题：旧物料缺少层级。',
  });
  assert.match(prompt, /Creative Understanding/);
  assert.match(prompt, /视觉分析升级报告/);
  assert.doesNotMatch(prompt, /assetReadingSummary.*path/);

  const parsed = parseCreativeDirectionResponse(`\`\`\`json\n${JSON.stringify(validDirection())}\n\`\`\``);
  const direction = normalizeCreativeDirection(parsed, {
    id: 'direction-1',
    projectId: 'project-1',
    sessionId: 'session-1',
    version: '1.0.0',
    understandingGeneratedAt: '2026-07-28T00:00:00.000Z',
    reportPath: 'outputs/report.md',
  }, '2026-07-28T01:00:00.000Z');
  assert.equal(direction.status, 'ready');
  assert.equal(direction.source.runtimeVersion, 'creative-direction@1.1.0');
  assert.equal(direction.brandReposition, validDirection().projectTransformation);
  assert.equal(direction.creativeConcept, validDirection().primaryConcept);
  assert.ok(direction.transformAssets.length > 0);
  assert.equal(validateCreativeDirection(direction), direction);
});

test('Creative Direction rejects conflicting keep/remove rules and missing anti-copy policy', () => {
  const base = normalizeCreativeDirection(validDirection(), {
    id: 'direction-1',
    projectId: 'project-1',
    sessionId: 'session-1',
    version: '1.0.0',
    understandingGeneratedAt: '2026-07-28T00:00:00.000Z',
    reportPath: 'outputs/report.md',
  });
  assert.throws(
    () => validateCreativeDirection({
      ...base,
      thingsToRemove: ['保留品牌名与原 Logo'],
    }),
    /保留项与删除项冲突/,
  );
  assert.throws(
    () => validateCreativeDirection({
      ...base,
      generationRules: ['画面需要清晰且完整'],
    }),
    /反复刻/,
  );
});
