import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectRecord } from '../src/shared/types.ts';
import { buildVisualUnderstandingCore } from '../src/main/visual-understanding-core.ts';
import {
  buildVisualDecisionPacket,
  validateVisualDecisionPacket,
  visualDecisionPacketToPromptSourceObject,
} from '../src/main/visual-decision-packet.ts';

const project = {
  id: 'jiuzhou-packet',
  projectName: '九州美学',
  detectedProjectName: '九州美学',
  projectNameSource: 'visual-content',
  projectNameConfidence: 1,
  brandName: '九州美学',
  industry: '医美',
  detectedBrandName: '九州美学',
  detectedIndustry: '医美',
  factConfidence: { brandName: 1, industry: 1 },
  description: '',
  logoLocked: true,
  lockedFacts: [],
  outputLanguage: 'zh-CN',
  provider: 'test',
  model: 'test',
  apiProfileId: null,
  analysisProfile: 'fusion-enhanced',
  status: 'completed',
  createdAt: '',
  updatedAt: '',
  lastRunAt: null,
  lastDurationMs: null,
  assetCount: 1,
  imageCount: 1,
  lastReportFilename: null,
  lastError: null,
  logoFiles: ['logo.png'],
  briefFiles: [],
  assets: [{
    id: 'real-logo',
    batchId: 'batch',
    sourceType: 'file',
    originalName: 'logo.png',
    relativePath: 'logo.png',
    mimeType: 'image/png',
    sizeBytes: 10,
    sha256: 'logo',
    status: 'ready',
  }],
} as ProjectRecord;

const core = buildVisualUnderstandingCore({
  project,
  generatedAt: '2026-07-30T00:00:00.000Z',
  modelId: 'qwen-test',
  sourceRefs: ['asset:page-05', 'asset:page-08'],
  extracted: {
    projectFacts: {
      brandRole: {
        value: '医美全链生态平台',
        source: 'source_document',
        evidenceRefs: ['asset:page-05'],
        confidence: 0.98,
        status: 'confirmed',
      },
    },
    diagnosis: {
      valuableAssets: [{
        target: '孔雀羽毛',
        observation: '生命、生长、精密与层叠具有长期识别价值',
        whyItMatters: '可形成跨媒介品牌机制',
        evidenceRefs: ['asset:page-08'],
        confidence: 0.95,
      }],
      overusedExpressions: [{
        target: '高饱和紫',
        observation: '被大面积用于传统医美表达',
        whyItMatters: '削弱平台专业度',
        evidenceRefs: ['asset:page-12'],
        confidence: 0.9,
      }],
      brandMisreadRisks: [
        {
          target: '普通美容院',
          observation: '甜美紫色与羽毛贴图容易误读',
          whyItMatters: '错误表达商业角色',
          evidenceRefs: ['asset:page-12'],
          confidence: 0.9,
        },
        {
          target: '传统医院诊室',
          observation: '只强调医疗会失去品牌生命美学',
          whyItMatters: '空间变得冰冷同质',
          evidenceRefs: ['asset:page-05'],
          confidence: 0.88,
        },
      ],
    },
    creativeDecision: {
      brandRoleStatement: '高端医美全链生态平台',
      upgradeFrom: ['传统紫色医美', '具象孔雀羽毛', '发光渐变'],
      preserveCore: ['生命生长', '精密层叠', '历史紫色识别'],
      upgradeTo: ['东方生命美学', '现代医疗专业感', '未来材料科技感'],
      uniqueUpgradeThesis: '从传统紫色医美、具象羽毛和发光渐变的表面装饰，升级为生命结构、医疗专业、未来材料与东方秩序共同构成的高端医美生态平台视觉世界。',
      targetWorldview: ['东方生命美学', '现代医疗专业感', '未来材料科技感'],
      toneBoundaries: [
        { target: '东方生命美学', avoid: ['古典中式', '木格栅茶空间', '日式侘寂'] },
        { target: '未来材料科技感', avoid: ['科幻实验室', '科技蓝', '霓虹夜店'] },
      ],
      strategicNegatives: ['生活方式零售', '售楼处'],
    },
  },
});

const extracted = {
  abstractions: [{
    sourceAsset: '孔雀羽毛',
    semanticMeaning: ['生命生长', '精密', '层叠', '细节雕琢'],
    formalProperties: ['柔性曲线', '放射', '渐进尺度', '轻盈边界'],
    rhythmProperties: ['有序重复', '由密到疏', '中心向外扩散', '柔性连续'],
    materialPotential: ['半透明树脂', '磨砂玻璃', '珍珠涂层'],
    lightingPotential: ['透射', '漫反射', '边缘微光', '低饱和色散'],
    forbiddenLiteralUse: ['直接贴孔雀图', '满墙羽毛壁纸'],
    evidenceRefs: ['asset:page-08'],
    confidence: 0.95,
  }],
  mediaTranslations: {
    sharedBrandCore: ['生命生长', '医疗专业', '未来材料', '东方秩序'],
    spatial: {
      spatialConcept: '将羽毛的层叠、生长、精密和轻盈转化为可进入的半透明生物组织空间。',
      structureLanguage: ['柔性层叠曲面隔断', '渐进尺度天花节奏', '墙面由密到疏层级'],
      materialLanguage: [
        {
          material: '微水泥与哑光石材',
          behavior: ['低反射', '细腻触感'],
          brandRole: '建立医疗专业与稳定基底',
          forbidden: ['商业综合体亮面石材'],
        },
        {
          material: '磨砂玻璃与半透明树脂',
          behavior: ['透射', '漫反射', '真实厚度'],
          brandRole: '表达生命结构与未来材料',
          forbidden: ['廉价塑料感'],
        },
      ],
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
  },
};

test('feather abstraction covers semantics, form, rhythm, materials and light', () => {
  const packet = buildVisualDecisionPacket({ core, extracted });
  const feather = packet.abstractions[0];
  assert.ok(feather?.formalProperties.includes('柔性曲线'));
  assert.ok(feather?.rhythmProperties.includes('由密到疏'));
  assert.ok(feather?.materialPotential.includes('半透明树脂'));
  assert.ok(feather?.lightingPotential.includes('透射'));
  assert.notDeepEqual(feather?.formalProperties, ['几何纹理']);
});

test('spatial translation compiles project-specific color, material and light behavior', () => {
  const packet = buildVisualDecisionPacket({ core, extracted });
  assert.equal(packet.mediaTranslations.spatial.status, 'ready');
  assert.equal(packet.colorSystem.primary[0]?.ratio, 70);
  assert.match(packet.materialSystem[1]?.brandRole ?? '', /生命结构/u);
  assert.equal(packet.lightingSystem.contrast, '低对比');
  assert.equal(packet.validation.executionDataStatus, 'ready');
  assert.deepEqual(packet.validation.missingExecutionFields, []);
  assert.deepEqual(validateVisualDecisionPacket(packet), { valid: true, errors: [] });
});

test('other media retain explicit interfaces without pretending to be implemented', () => {
  const packet = buildVisualDecisionPacket({ core, extracted });
  assert.equal(packet.mediaTranslations.packaging.status, 'interface_only');
  assert.equal(packet.mediaTranslations.poster.status, 'interface_only');
  assert.equal(packet.mediaTranslations.vi.status, 'interface_only');
});

test('missing spatial behavior fails closed as PROMPT source insufficiency data', () => {
  const packet = buildVisualDecisionPacket({ core, extracted: {} });
  assert.equal(packet.validation.executionDataStatus, 'insufficient');
  assert.ok(packet.validation.missingExecutionFields.includes('abstractions'));
  assert.equal(packet.mediaTranslations.spatial.status, 'insufficient');
});

test('compatibility adapter preserves the causal translation and strict scene risks', () => {
  const source = visualDecisionPacketToPromptSourceObject(buildVisualDecisionPacket({ core, extracted }));
  assert.ok(source.upgradeTranslation.transformations[0]?.abstractProperties.includes('柔性曲线'));
  assert.ok(source.upgradeTranslation.transformations[0]?.newExpression.includes('半透明树脂'));
  assert.ok(source.negativeRules.project.includes('茶空间'));
  assert.equal(source.renderLanguage.colorBehavior.primary[0]?.ratio, 70);
});
