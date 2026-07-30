import assert from 'node:assert/strict';
import test from 'node:test';
import { compileVNextImageGeneration } from '../../packages/image-generation-runtime/src/vnext/index.js';

function packet(overrides = {}) {
  return {
    schemaVersion: '1.0',
    projectId: 'jiuzhou-packet',
    projectFacts: {
      brandName: { value: '九州美学', source: 'project_record', evidenceRefs: ['project_record:brandName'], confidence: 1, status: 'confirmed' },
      industry: { value: '医美', source: 'project_record', evidenceRefs: ['project_record:industry'], confidence: 1, status: 'confirmed' },
      brandRole: { value: '医美全链生态平台', source: 'source_document', evidenceRefs: ['asset:05'], confidence: 0.98, status: 'confirmed' },
    },
    lockedAssets: [
      { assetId: 'real-logo', type: 'logo', value: '真实logo.png', lockSource: 'user_confirmed', evidenceRefs: ['asset:logo'] },
      { assetId: 'brand-name', type: 'brand_name', value: '九州美学', lockSource: 'source_fact', evidenceRefs: ['project_record:brandName'] },
    ],
    assetInventory: {},
    diagnosis: {
      valuableAssets: [{ target: '孔雀羽毛', observation: '生命、生长、精密与层叠具有长期价值', whyItMatters: '形成跨媒介识别', evidenceRefs: ['asset:08'], confidence: 0.95 }],
      overusedExpressions: [],
      outdatedExpressions: [],
      weakSystemAreas: [],
      categoryCliches: [],
      brandMisreadRisks: [
        { target: '普通美容院', observation: '甜美装饰导致误读', whyItMatters: '削弱平台角色', evidenceRefs: ['asset:12'], confidence: 0.9 },
        { target: '传统医院诊室', observation: '只强调医疗会过冷', whyItMatters: '失去品牌生命美学', evidenceRefs: ['asset:05'], confidence: 0.9 },
      ],
      crossMediaGaps: [],
    },
    creativeDecision: {
      brandRoleStatement: '高端医美全链生态平台',
      upgradeFrom: ['传统紫色医美', '具象孔雀羽毛', '发光渐变'],
      preserveCore: ['生命生长', '精密层叠', '历史紫色识别'],
      upgradeTo: ['东方生命美学', '现代医疗专业感', '未来材料科技感'],
      uniqueUpgradeThesis: '从传统紫色医美、具象孔雀羽毛和发光渐变的表面装饰，升级为生命结构、医疗专业、未来材料与东方秩序共同构成的高端医美生态平台视觉世界。',
      targetWorldview: ['东方生命美学', '现代医疗专业感', '未来材料科技感'],
      toneBoundaries: [
        { target: '东方生命美学', avoid: ['古典中式', '木格栅茶空间'] },
        { target: '未来材料科技感', avoid: ['科幻实验室', '科技蓝', '霓虹夜店'] },
        { target: '专业可信赖', avoid: ['普通办公室', '售楼处'] },
      ],
      strategicNegatives: ['生活方式零售'],
    },
    abstractions: [{
      sourceAsset: '孔雀羽毛',
      semanticMeaning: ['生命生长', '精密', '层叠'],
      formalProperties: ['柔性曲线', '放射', '渐进尺度'],
      rhythmProperties: ['有序重复', '由密到疏'],
      materialPotential: ['半透明树脂', '磨砂玻璃'],
      lightingPotential: ['透射', '漫反射'],
      forbiddenLiteralUse: ['直接贴孔雀图', '满墙羽毛壁纸'],
      evidenceRefs: ['asset:08'],
      confidence: 0.95,
    }],
    mediaTranslations: {
      sharedBrandCore: ['生命生长', '医疗专业', '未来材料', '东方秩序'],
      spatial: {
        status: 'ready',
        spatialConcept: '将羽毛的层叠、生长、精密和轻盈转化为可进入的半透明生物组织空间。',
        structureLanguage: ['柔性层叠曲面隔断', '渐进尺度天花节奏'],
        materialLanguage: [{
          material: '微水泥、哑光石材、磨砂玻璃与半透明树脂',
          behavior: ['低反射', '透射', '漫反射', '真实厚度'],
          brandRole: '建立医疗专业基底与生命结构层次',
          forbidden: ['廉价塑料感', '过度镜面'],
        }],
        lightingLanguage: {
          source: ['柔和自然侧光'],
          contrast: '低对比',
          interactionWithMaterials: ['穿过半透明结构形成细腻生物光泽', '大面积漫反射'],
          forbidden: ['霓虹灯', '舞台灯', '强紫色灯带'],
        },
        colorBehavior: {
          primary: [{ name: '珍珠白与暖灰', ratio: 70, role: '专业稳定主体' }],
          secondary: [{ name: '浅矿物灰与半透明材质', ratio: 20, role: '材料层次' }],
          accent: [{ name: '低饱和矿物紫与冷银', ratio: 10, role: '品牌识别点缀' }],
          forbidden: ['大面积亮紫', '霓虹紫', '高饱和渐变'],
        },
        brandIntegration: ['Logo 小面积位于后方识别墙或保留干净识别位'],
        functionalExperience: ['入口到接待、等候与后场的清晰动线'],
        sceneMisreadRisks: ['茶空间', '生活方式零售', '售楼处', '普通办公室', '霓虹空间'],
      },
      packaging: { status: 'interface_only', concept: '', expressionLanguage: [], misreadRisks: [] },
      poster: { status: 'interface_only', concept: '', expressionLanguage: [], misreadRisks: [] },
      vi: { status: 'interface_only', concept: '', expressionLanguage: [], misreadRisks: [] },
    },
    colorSystem: {
      primary: [{ name: '珍珠白与暖灰', ratio: 70, role: '专业稳定主体' }],
      secondary: [{ name: '浅矿物灰与半透明材质', ratio: 20, role: '材料层次' }],
      accent: [{ name: '低饱和矿物紫与冷银', ratio: 10, role: '品牌识别点缀' }],
      forbidden: ['大面积亮紫', '霓虹紫', '高饱和渐变'],
    },
    materialSystem: [{
      material: '微水泥、哑光石材、磨砂玻璃与半透明树脂',
      behavior: ['低反射', '透射', '漫反射', '真实厚度'],
      brandRole: '建立医疗专业基底与生命结构层次',
      forbidden: ['廉价塑料感', '过度镜面'],
    }],
    lightingSystem: {
      source: ['柔和自然侧光'],
      contrast: '低对比',
      interactionWithMaterials: ['穿过半透明结构形成细腻生物光泽', '大面积漫反射'],
      forbidden: ['霓虹灯', '舞台灯', '强紫色灯带'],
    },
    provenance: {
      createdFrom: ['asset:05', 'asset:08'],
      generatedAt: '2026-07-30T00:00:00.000Z',
      modelId: 'test',
      sourceFingerprint: 'jiuzhou-packet-fingerprint',
    },
    validation: {
      hardFactStatus: 'pass',
      mode: 'formal_upgrade',
      missingRequiredFacts: [],
      conflicts: [],
      executionDataStatus: 'ready',
      missingExecutionFields: [],
    },
    ...overrides,
  };
}

function context(packetValue = packet()) {
  return {
    schemaVersion: '2.0',
    projectId: 'jiuzhou-packet',
    version: 1,
    generatedAt: '2026-07-30T00:00:00.000Z',
    brandCore: { name: '九州美学', industry: '医美', brandRole: null, audience: [] },
    lockedAssets: {
      logoAssetIds: ['real-logo'],
      brandNameLocked: true,
      confirmedColors: [],
      packageStructures: [],
      productAssetIds: [],
      lockedAssetIds: ['real-logo'],
      mustPreserve: [],
    },
    visualIdentity: {
      tone: ['POISONED LEGACY TONE'],
      colorBehavior: ['POISONED LEGACY COLOR'],
      graphicBehavior: ['POISONED LEGACY GRAPHIC'],
      materialBehavior: ['POISONED LEGACY MATERIAL'],
      compositionBehavior: [],
      lightingBehavior: ['POISONED LEGACY LIGHT'],
    },
    styleBoundaries: { mustAvoid: ['POISONED LEGACY NEGATIVE'], uncertainItems: [] },
    confirmedDecisions: [],
    sourceAssetRefs: [],
    provenance: {
      builderId: 'test',
      builderVersion: '1',
      sourceKinds: ['project_record', 'original_asset', 'structured_analysis'],
      sourceFingerprint: 'context-fingerprint',
    },
    visualDecisionPacket: packetValue,
    promptSourceObject: {
      schemaVersion: '1.0',
      projectId: 'jiuzhou-packet',
      generatedAt: '',
      projectFacts: { brandName: 'WRONG', industry: 'WRONG', brandRole: 'WRONG', businessModel: null, primaryOfferings: [] },
      lockedAssets: { logoAssetIds: [], preferredLogoAssetId: null, logoUsageMode: 'blank_area', confirmedColors: [], mustPreserve: ['WRONG'], immutableStructures: [] },
      sourceVisualState: { valuableAssets: [], overusedElements: [], outdatedExpressions: [], genericIndustryCliches: [], brandMisreadRisks: [] },
      upgradeTranslation: { preserve: ['WRONG'], weaken: [], remove: [], targetWorldview: [], toneBoundaries: [], transformations: [] },
      renderLanguage: { colorBehavior: { primary: [], secondary: [], accent: [], forbidden: [] }, materialBehavior: [], lightingBehavior: { source: [], contrast: '', interactionWithMaterials: [], forbidden: [] }, graphicBehavior: [] },
      negativeRules: { project: ['WRONG'], model: [] },
      confidence: { projectFacts: 0, lockedAssets: 0, sourceVisualState: 0, upgradeTranslation: 0 },
      provenance: { sourceKinds: ['legacy_migration'], sourceFingerprint: 'wrong' },
    },
  };
}

function compile(overrides = {}) {
  const projectContext = context(overrides.packet || packet());
  return compileVNextImageGeneration({
    projectContext,
    task: {
      projectId: projectContext.projectId,
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_three_quarter_wide',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: '生成旗舰店入口接待空间，明确前台、入口与后场动线。',
      ...overrides.task,
    },
  });
}

test('compiler reads Visual Decision Packet directly and covers all project blocks', () => {
  const result = compile();
  for (const signal of [
    '医美全链生态平台',
    'Unique upgrade thesis',
    '东方生命美学',
    '柔性曲线',
    '半透明生物组织空间',
    '珍珠白与暖灰',
    '建议占比 70%',
    '微水泥、哑光石材、磨砂玻璃与半透明树脂',
    '柔和自然侧光',
    '茶空间',
    'Use the supplied logo asset',
  ]) assert.match(result.compiledPrompt.finalPrompt, new RegExp(signal, 'u'));
  assert.doesNotMatch(result.compiledPrompt.finalPrompt, /WRONG|POISONED LEGACY/u);
  assert.equal(result.compiledPrompt.trace.compilerVersion, '3.0.0');
  assert.deepEqual(result.compiledPrompt.completeness.coverage, {
    hardFacts: 1,
    upgradeThesis: 1,
    brandTranslation: 1,
    toneBoundaries: 1,
    colorMaterialLighting: 1,
    taskContract: 1,
  });
});

test('formal Packet blocks compilation when execution data is insufficient', () => {
  const incomplete = packet({
    validation: {
      ...packet().validation,
      executionDataStatus: 'insufficient',
      missingExecutionFields: ['abstractions'],
    },
  });
  assert.throws(() => compile({ packet: incomplete }), /PROMPT_SOURCE_INSUFFICIENT/u);
});

test('compiler detects Logo, text and saturation conflicts', () => {
  assert.throws(
    () => compile({ task: { mustAvoid: ['禁止任何 Logo'] } }),
    /PROMPT_CONFLICT.*no-Logo/iu,
  );
  assert.throws(
    () => compile({ task: { logoUsageMode: 'blank_area', mustInclude: ['准确标题文字'] } }),
    /PROMPT_CONFLICT.*requires text/iu,
  );
  assert.throws(
    () => compile({ task: { mustInclude: ['高饱和霓虹紫'] } }),
    /PROMPT_CONFLICT.*high-saturation/iu,
  );
});

test('interface-only media translation cannot enter formal generation', () => {
  const projectContext = context();
  assert.throws(
    () => compileVNextImageGeneration({
      projectContext,
      task: {
        projectId: projectContext.projectId,
        deliverableFamily: 'poster',
        subtype: 'brand_key_visual',
        shot: 'subject_centered',
        count: 1,
        aspectRatio: '16:9',
        currentInstruction: '生成品牌海报',
      },
    }),
    /PROMPT_SOURCE_INSUFFICIENT.*interface-only/u,
  );
});
