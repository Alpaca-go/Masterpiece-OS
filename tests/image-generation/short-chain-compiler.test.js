import assert from 'node:assert/strict';
import test from 'node:test';
import { compileShortChainImageGeneration } from '@masterpiece/image-generation-runtime/short-chain/index.js';

function context({ projectId, brand, industry, promptSourceObject }) {
  return {
    schemaVersion: '2.0',
    projectId,
    version: 2,
    generatedAt: '2026-07-30T00:00:00.000Z',
    brandCore: { name: brand, industry, brandRole: null, audience: [] },
    lockedAssets: {
      logoAssetIds: promptSourceObject.lockedAssets.logoAssetIds,
      brandNameLocked: true,
      confirmedColors: promptSourceObject.lockedAssets.confirmedColors,
      packageStructures: [],
      productAssetIds: [],
      lockedAssetIds: promptSourceObject.lockedAssets.logoAssetIds,
      mustPreserve: promptSourceObject.lockedAssets.mustPreserve,
    },
    visualIdentity: {
      tone: [],
      colorBehavior: [],
      graphicBehavior: [],
      materialBehavior: [],
      compositionBehavior: [],
      lightingBehavior: [],
    },
    styleBoundaries: { mustAvoid: [], uncertainItems: [] },
    confirmedDecisions: [],
    sourceAssetRefs: [],
    provenance: {
      builderId: 'golden-calibration',
      builderVersion: '1',
      sourceKinds: ['project_record', 'original_asset', 'structured_analysis'],
      sourceFingerprint: `${projectId}-context`,
    },
    promptSourceObject,
  };
}

function promptSource({
  projectId,
  brand,
  industry,
  logoAssetIds = [],
  color,
  motif,
  material,
  worldview,
  toneAvoid = ['generic category styling'],
  abstractProperties = ['rhythm', 'proportion', 'precision'],
  newExpression = ['layered structure', 'continuous interface'],
  forbiddenLiteralUse = ['oversized icon sculpture', 'repeated wallpaper'],
  baseColor = 'warm neutral',
  accentColor = 'restrained metal',
  materialBehavior = ['credible thickness', 'controlled texture', 'natural response'],
  materialRole = 'establish a distinctive but restrained atmosphere',
  materialForbidden = ['cheap synthetic appearance'],
  lightSources = ['natural diffuse light', 'concealed linear light'],
  lightInteraction = ['reveal material depth without glare'],
  lightForbidden = ['colored neon wash'],
}) {
  return {
    schemaVersion: '1.0',
    projectId,
    generatedAt: '2026-07-30T00:00:00.000Z',
    projectFacts: {
      brandName: brand,
      industry,
      brandRole: '',
      businessModel: null,
      primaryOfferings: [],
    },
    lockedAssets: {
      logoAssetIds,
      preferredLogoAssetId: logoAssetIds[0] ?? null,
      logoUsageMode: logoAssetIds.length ? 'reference' : 'blank_area',
      confirmedColors: [color],
      mustPreserve: [motif],
      immutableStructures: [],
    },
    sourceVisualState: {
      valuableAssets: [motif],
      overusedElements: [],
      outdatedExpressions: [],
      genericIndustryCliches: [],
      brandMisreadRisks: [],
    },
    upgradeTranslation: {
      preserve: [motif],
      weaken: ['overused high-saturation brand color'],
      remove: ['flat design-board presentation'],
      targetWorldview: [worldview],
      toneBoundaries: [{ target: 'restrained, clear, warm and professional', avoid: toneAvoid }],
      transformations: [{
        sourceAsset: motif,
        abstractProperties,
        newExpression,
        forbiddenLiteralUse,
      }],
    },
    renderLanguage: {
      colorBehavior: {
        primary: [{ name: baseColor, ratio: 75, role: 'environmental base' }],
        secondary: [{ name: color, ratio: 18, role: 'structural hierarchy' }],
        accent: [{ name: accentColor, ratio: 7, role: 'detail punctuation' }],
        forbidden: ['large high-saturation gradients'],
      },
      materialBehavior: [{
        material,
        behavior: materialBehavior,
        brandRole: materialRole,
        forbidden: materialForbidden,
      }],
      lightingBehavior: {
        source: lightSources,
        contrast: 'low to medium contrast',
        interactionWithMaterials: lightInteraction,
        forbidden: lightForbidden,
      },
      graphicBehavior: ['fine lines and negative space create order'],
    },
    negativeRules: {
      project: ['错误品牌文字', '重复 Logo'],
      model: ['moodboard', 'VI board', 'collage'],
    },
    confidence: {
      projectFacts: 0.95,
      lockedAssets: 1,
      sourceVisualState: 0.9,
      upgradeTranslation: 0.9,
    },
    provenance: {
      sourceKinds: ['project_record', 'original_asset', 'structured_analysis'],
      sourceFingerprint: `${projectId}-prompt-source`,
    },
  };
}

function compileSpace(projectContext, overrides = {}) {
  return compileShortChainImageGeneration({
    projectContext,
    task: {
      projectId: projectContext.projectId,
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_three_quarter_wide',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: '生成旗舰店入口接待空间，明确前台、入口与后场动线。',
      ...overrides,
    },
  });
}

test('Golden calibration compiles thirteen traceable blocks from Jiuzhou project evidence', () => {
  const source = promptSource({
    projectId: 'jiuzhou',
    brand: '九州美学',
    industry: '医疗美容',
    logoAssetIds: ['real-logo'],
    color: '低饱和矿物紫',
    motif: '孔雀羽翼的层叠与生长秩序',
    material: '半透明树脂与细腻矿物涂料',
    worldview: '从传统符号展示升级为当代东方、轻盈而精密的空间世界',
    toneAvoid: ['廉价科技感', '模板化医美空间'],
    abstractProperties: ['层叠', '生长', '精密'],
    newExpression: ['半透明层片结构', '连续弧形界面'],
    forbiddenLiteralUse: ['巨型图标雕塑', '重复壁纸'],
    baseColor: '珍珠白与暖灰',
    accentColor: '低饱和金属色',
    materialBehavior: ['半透明', '柔和漫反射', '真实厚度'],
    materialRole: '建立轻盈但有精度的层次',
    materialForbidden: ['塑料玩具感'],
    lightSources: ['自然漫射光', '隐藏式线性光'],
    lightInteraction: ['让半透明层片出现柔和层次'],
    lightForbidden: ['紫色霓虹灯带'],
  });
  const result = compileSpace(context({
    projectId: 'jiuzhou',
    brand: '九州美学',
    industry: '医疗美容',
    promptSourceObject: source,
  }));

  assert.equal(result.compiledPrompt.blocks.length, 13);
  assert.equal(result.compiledPrompt.completeness.complete, true);
  assert.deepEqual(result.compiledPrompt.completeness.missingBlockIds, []);
  assert.equal(Object.keys(result.compiledPrompt.sourceMap).length, 13);
  for (const signal of [
    '九州美学',
    '低饱和矿物紫',
    '珍珠白与暖灰',
    '半透明层片结构',
    '连续弧形界面',
    'foreground, middle ground, and background',
    'VI display board',
  ]) {
    assert.match(result.compiledPrompt.finalPrompt, new RegExp(signal, 'u'));
  }
  assert.equal(result.compiledPrompt.trace.compilerVersion, '4.6.0');
  assert.equal(result.compiledPrompt.trace.promptCharacters <= 7_500, true);
});

test('public compiler does not leak Jiuzhou answers into another project', () => {
  const source = promptSource({
    projectId: 'coffee',
    brand: 'Northbank Coffee',
    industry: 'specialty coffee',
    color: 'charcoal green',
    motif: 'topographic contour rhythm',
    material: 'dark timber and brushed steel',
    worldview: 'quiet workshop hospitality',
  });
  const result = compileSpace(context({
    projectId: 'coffee',
    brand: 'Northbank Coffee',
    industry: 'specialty coffee',
    promptSourceObject: source,
  }));
  assert.match(result.compiledPrompt.finalPrompt, /Northbank Coffee|charcoal green|topographic contour rhythm/u);
  assert.doesNotMatch(result.compiledPrompt.finalPrompt, /九州美学|医美|孔雀|羽翼|矿物紫/u);
});

test('compiler fits evidence-heavy prompts to the active adapter budget without dropping task identity', () => {
  const source = promptSource({
    projectId: 'budget-heavy',
    brand: 'Budget Heavy Brand',
    industry: 'hospitality',
    color: 'signal green',
    motif: 'confirmed identity motif',
    material: 'brushed metal',
    worldview: 'a highly specific social hospitality experience',
    toneAvoid: Array.from({ length: 80 }, (_, index) => `generic tone prohibition ${index} ${'x'.repeat(80)}`),
    abstractProperties: Array.from({ length: 50 }, (_, index) => `abstract property ${index} ${'y'.repeat(60)}`),
    newExpression: Array.from({ length: 50 }, (_, index) => `new expression ${index} ${'z'.repeat(60)}`),
  });
  const result = compileSpace(context({
    projectId: 'budget-heavy',
    brand: 'Budget Heavy Brand',
    industry: 'hospitality',
    promptSourceObject: source,
  }));

  assert.equal(result.compiledPrompt.trace.promptCharacters <= 7_500, true);
  assert.match(result.compiledPrompt.finalPrompt, /Budget Heavy Brand/u);
  assert.match(result.compiledPrompt.finalPrompt, /生成旗舰店入口接待空间/u);
  assert.ok(result.compiledPrompt.trace.promptCompaction.removedItemCount > 0
    || result.compiledPrompt.trace.promptCompaction.truncatedItemCount > 0);
});

test('compiler fails closed on contradictory task include and avoid rules', () => {
  const source = promptSource({
    projectId: 'conflict',
    brand: 'Conflict',
    industry: 'retail',
    color: 'blue',
    motif: 'grid',
    material: 'stone',
    worldview: 'clear retail system',
  });
  const projectContext = context({
    projectId: 'conflict',
    brand: 'Conflict',
    industry: 'retail',
    promptSourceObject: source,
  });
  assert.throws(() => compileSpace(projectContext, {
    mustInclude: ['central display island'],
    mustAvoid: ['central display island'],
  }), /same requirement/u);
});
