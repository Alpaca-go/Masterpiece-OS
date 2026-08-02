import assert from 'node:assert/strict';
import test from 'node:test';
import { compileShortChainImageGeneration } from '@masterpiece/image-generation-runtime/short-chain/index.js';

const projectContext = {
  schemaVersion: '2.0',
  projectId: 'jiuzhou-scenes',
  version: 2,
  generatedAt: '2026-07-30T00:00:00.000Z',
  brandCore: { name: '九州美学', industry: '医疗美容', brandRole: null, audience: [] },
  lockedAssets: {
    logoAssetIds: ['real-logo'],
    brandNameLocked: true,
    confirmedColors: ['低饱和矿物紫'],
    packageStructures: [],
    productAssetIds: [],
    lockedAssetIds: ['real-logo'],
    mustPreserve: ['羽翼层叠、生长与精密秩序'],
  },
  visualIdentity: {
    tone: ['克制、温润、专业'],
    colorBehavior: [],
    graphicBehavior: [],
    materialBehavior: [],
    compositionBehavior: [],
    lightingBehavior: [],
  },
  styleBoundaries: { mustAvoid: ['模板化医美空间', '紫色霓虹灯带'], uncertainItems: [] },
  confirmedDecisions: [],
  sourceAssetRefs: [{
    assetId: 'real-logo',
    name: '真实 Logo',
    relativePath: 'logo.png',
    role: 'logo',
  }],
  provenance: {
    builderId: 'scene-regression',
    builderVersion: '1',
    sourceKinds: ['project_record', 'original_asset', 'structured_analysis'],
    sourceFingerprint: 'jiuzhou-scenes-context',
  },
  promptSourceObject: {
    schemaVersion: '1.0',
    projectId: 'jiuzhou-scenes',
    generatedAt: '2026-07-30T00:00:00.000Z',
    projectFacts: {
      brandName: '九州美学',
      industry: '医疗美容',
      brandRole: '',
      businessModel: null,
      primaryOfferings: [],
    },
    lockedAssets: {
      logoAssetIds: ['real-logo'],
      preferredLogoAssetId: 'real-logo',
      logoUsageMode: 'reference',
      confirmedColors: ['低饱和矿物紫'],
      mustPreserve: ['羽翼层叠、生长与精密秩序'],
      immutableStructures: [],
    },
    sourceVisualState: {
      valuableAssets: ['羽翼结构秩序'],
      overusedElements: ['大面积高饱和紫'],
      outdatedExpressions: ['直白孔雀图案'],
      genericIndustryCliches: ['紫色霓虹医美空间'],
      brandMisreadRisks: ['廉价科技感'],
    },
    upgradeTranslation: {
      preserve: ['羽翼的层叠、生长与精密关系'],
      weaken: ['直白符号展示'],
      remove: ['平面 VI 展板'],
      targetWorldview: ['当代东方、轻盈而精密的完整空间'],
      toneBoundaries: [{ target: '克制、温润、专业', avoid: ['模板化医美', '廉价科技感'] }],
      transformations: [{
        sourceAsset: '孔雀羽翼',
        abstractProperties: ['层叠', '生长', '精密'],
        newExpression: ['半透明层片', '连续弧形界面'],
        forbiddenLiteralUse: ['巨型孔雀雕塑', '羽毛壁纸'],
      }],
    },
    renderLanguage: {
      colorBehavior: {
        primary: [{ name: '珍珠白与暖灰', ratio: 75, role: '空间基底' }],
        secondary: [{ name: '低饱和矿物紫', ratio: 18, role: '结构层次' }],
        accent: [],
        forbidden: ['大面积高饱和紫'],
      },
      materialBehavior: [{
        material: '半透明树脂与矿物涂料',
        behavior: ['真实厚度', '柔和漫反射'],
        brandRole: '形成轻盈精密的层次',
        forbidden: ['塑料玩具感'],
      }],
      lightingBehavior: {
        source: ['自然漫射光', '隐藏式线性光'],
        contrast: '低至中等',
        interactionWithMaterials: ['显出半透明层次'],
        forbidden: ['紫色霓虹'],
      },
      graphicBehavior: ['以细线和留白建立秩序'],
    },
    negativeRules: {
      project: ['重复 Logo', '错误品牌文字'],
      model: ['VI board', 'moodboard', 'collage'],
    },
    confidence: {
      projectFacts: 1,
      lockedAssets: 1,
      sourceVisualState: 0.9,
      upgradeTranslation: 0.9,
    },
    provenance: {
      sourceKinds: ['project_record', 'original_asset', 'structured_analysis'],
      sourceFingerprint: 'jiuzhou-scenes-prompt-source',
    },
  },
};

const scenes = [
  {
    name: 'flagship entrance',
    subtype: 'reception',
    shot: 'entrance_three_quarter_wide',
    instruction: '生成旗舰店入口接待空间，建立门槛、到达、前台与后场动线。',
    mode: 'post_composite',
    mustInclude: ['完整入口', '接待前台'],
    mustAvoid: ['VI 展板'],
  },
  {
    name: 'reception front mid-shot without central device',
    subtype: 'reception',
    shot: 'front',
    instruction: '生成前台中景，保持连续空间，不要中央展示设备。',
    mode: 'post_composite',
    mustInclude: ['前台中景', '连续空间'],
    mustAvoid: ['中央展示设备'],
  },
  {
    name: 'lobby',
    subtype: 'lobby',
    shot: 'three_quarter_wide',
    instruction: '生成完整 Lobby，明确到达、等候、导向与流线。',
    mode: 'post_composite',
    mustInclude: ['等候区', '清晰导向'],
    mustAvoid: ['产品展台'],
  },
];

test('three Jiuzhou space scenes preserve task overrides and Logo mode boundaries', () => {
  for (const scene of scenes) {
    const result = compileShortChainImageGeneration({
      projectContext,
      task: {
        projectId: projectContext.projectId,
        deliverableFamily: 'space',
        subtype: scene.subtype,
        shot: scene.shot,
        count: 1,
        aspectRatio: '16:9',
        currentInstruction: scene.instruction,
        mustInclude: scene.mustInclude,
        mustAvoid: scene.mustAvoid,
        referenceAssetIds: [],
        logoUsageMode: scene.mode,
      },
    });
    assert.equal(result.compiledPrompt.blocks.length, 13, scene.name);
    assert.match(result.compiledPrompt.finalPrompt, new RegExp(scene.mustInclude[0], 'u'), scene.name);
    assert.match(result.compiledPrompt.finalPrompt, new RegExp(scene.mustAvoid[0], 'u'), scene.name);
    assert.equal(result.compiledPrompt.logoUsageMode, scene.mode, scene.name);
    assert.deepEqual(
      result.payload.referenceAssetIds,
      [],
      scene.name,
    );
    assert.equal(result.compiledPrompt.trace.promptCharacters <= 7_500, true, scene.name);
  }
});
