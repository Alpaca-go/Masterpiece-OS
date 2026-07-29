import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectRecord } from '../src/shared/types.ts';
import {
  buildPromptSourceExtractionPrompt,
  normalizePromptSourceExtraction,
  validatePromptSourceExtraction,
} from '../src/main/prompt-source-extraction.ts';

const project = {
  id: 'jiuzhou',
  projectName: '九州美学',
  brandName: '九州美学',
  industry: '高端医美全链生态平台',
  logoLocked: true,
  lockedFacts: ['真实 Logo 不得重绘'],
} as ProjectRecord;

const rawExtraction = {
  projectFacts: {
    brandName: '九州美学',
    industry: '高端医美全链生态平台',
    brandRole: '专业医美产业生态品牌',
    businessModel: '全链生态平台',
    primaryOfferings: ['医美产业服务'],
  },
  lockedAssets: {
    confirmedColors: ['紫色品牌识别'],
    mustPreserve: ['真实 Logo', '生命生长含义'],
    immutableStructures: [],
  },
  sourceVisualState: {
    valuableAssets: ['紫色身份', '羽翼的层叠秩序'],
    overusedElements: ['大面积高饱和紫色'],
    outdatedExpressions: ['具象孔雀广告画面'],
    genericIndustryCliches: ['紫色美容院'],
    brandMisreadRisks: ['日式茶空间', '普通美容院'],
  },
  upgradeTranslation: {
    preserve: ['紫色身份', '生命生长含义'],
    weaken: ['具象孔雀'],
    remove: ['发光渐变'],
    targetWorldview: ['东方生命美学', '现代医疗专业感', '未来材料科技感'],
    toneBoundaries: [
      { target: '东方生命美学', avoid: ['木格栅茶室', '古典中式'] },
    ],
    transformations: [{
      sourceAsset: '孔雀羽毛',
      abstractProperties: ['层叠曲线', '精密秩序', '生命生长'],
      newExpression: ['半透明曲面隔断', '光线穿透的层叠结构'],
      forbiddenLiteralUse: ['直接粘贴孔雀或羽毛图案'],
    }],
  },
  renderLanguage: {
    colorBehavior: {
      primary: [{ name: '珍珠白与暖灰', ratio: 70, role: '专业与可信赖的空间基底' }],
      secondary: [{ name: '浅矿物色', ratio: 20, role: '半透明材料层次' }],
      accent: [{ name: '低饱和矿物紫', ratio: 10, role: '克制品牌识别' }],
      forbidden: ['大面积亮紫'],
    },
    materialBehavior: [{
      material: '磨砂玻璃',
      behavior: ['半透明', '柔和漫反射'],
      brandRole: '生命感与未来材料感',
      forbidden: ['廉价塑料感'],
    }],
    lightingBehavior: {
      source: ['柔和自然侧光'],
      contrast: '低对比',
      interactionWithMaterials: ['穿过半透明结构形成细腻光泽'],
      forbidden: ['紫色霓虹灯'],
    },
    graphicBehavior: ['将羽翼节奏转为连续空间结构'],
  },
  negativeRules: {
    project: ['普通美容院', '日式茶空间'],
    model: ['随机中文', '错误英文品牌名'],
  },
  confidence: {
    projectFacts: 0.95,
    lockedAssets: 0.9,
    sourceVisualState: 0.85,
    upgradeTranslation: 0.8,
  },
};

test('Prompt Source extraction prompt uses ProjectRecord and original asset ids without Golden answers', () => {
  const prompt = buildPromptSourceExtractionPrompt(project, ['asset-logo', 'asset-plan-01']);
  assert.match(prompt, /九州美学/u);
  assert.match(prompt, /asset-plan-01/u);
  assert.match(prompt, /原始视觉素材/u);
  assert.doesNotMatch(prompt, /珍珠白/u);
  assert.doesNotMatch(prompt, /矿物紫/u);
  assert.doesNotMatch(prompt, /孔雀羽毛/u);
});

test('Prompt Source extraction normalizes and validates project-specific translation evidence', () => {
  const normalized = normalizePromptSourceExtraction(rawExtraction);
  assert.equal(validatePromptSourceExtraction(normalized), normalized);
  assert.equal(normalized.upgradeTranslation.transformations[0]?.sourceAsset, '孔雀羽毛');
  assert.equal(normalized.renderLanguage.colorBehavior.primary[0]?.ratio, 70);
  assert.deepEqual(normalized.sourceVisualState.brandMisreadRisks, ['日式茶空间', '普通美容院']);
});

test('Prompt Source extraction fails closed when translation evidence is missing', () => {
  const normalized = normalizePromptSourceExtraction({
    ...rawExtraction,
    upgradeTranslation: { ...rawExtraction.upgradeTranslation, transformations: [] },
  });
  assert.throws(
    () => validatePromptSourceExtraction(normalized),
    /upgradeTranslation\.transformations/u,
  );
});
