import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectRecord } from '../src/shared/types.ts';
import {
  buildUnifiedVisualUnderstandingPrompt,
  normalizeUnifiedVisualUnderstanding,
} from '../src/main/unified-visual-understanding.ts';
import { compileVisualDecisionReport } from '../src/main/visual-decision-report-compiler.ts';

function project(): ProjectRecord {
  return {
    id: 'unified-project',
    projectName: '测试品牌',
    detectedProjectName: '测试品牌',
    projectNameSource: 'visual-content',
    projectNameConfidence: 1,
    brandName: '测试品牌',
    industry: '专业服务',
    detectedBrandName: '测试品牌',
    detectedIndustry: '专业服务',
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
    lastReportFilename: null,
    lastError: null,
    assetCount: 1,
    imageCount: 1,
    logoFiles: ['logo.png'],
    briefFiles: [],
    assets: [{
      id: 'logo',
      batchId: 'batch',
      sourceType: 'file',
      originalName: 'logo.png',
      relativePath: 'logo.png',
      mimeType: 'image/png',
      sizeBytes: 1,
      sha256: 'logo',
      status: 'ready',
    }],
  };
}

const extracted = {
  projectFacts: {
    brandRole: {
      value: '跨区域专业服务平台',
      source: 'source_document',
      evidenceRefs: ['asset:brief'],
      confidence: 0.95,
      status: 'confirmed',
    },
  },
  diagnosis: {
    valuableAssets: [{
      target: '层叠符号',
      observation: '具有连续与协作的语义',
      whyItMatters: '可形成跨媒介识别',
      evidenceRefs: ['asset:1'],
      confidence: 0.9,
    }],
    brandMisreadRisks: [{
      target: '普通办公室',
      observation: '通用办公表达会削弱平台身份',
      whyItMatters: '失去专业差异',
      evidenceRefs: ['asset:2'],
      confidence: 0.9,
    }],
  },
  creativeDecision: {
    brandRoleStatement: '跨区域专业服务平台',
    upgradeFrom: ['通用企业蓝'],
    preserveCore: ['层叠协作'],
    upgradeTo: ['稳定而开放的专业网络'],
    uniqueUpgradeThesis: '从通用企业蓝升级为以层叠协作和开放秩序构成的专业服务网络。',
    targetWorldview: ['稳定', '开放', '专业'],
    toneBoundaries: [{ target: '专业', avoid: ['普通办公室'] }],
    strategicNegatives: ['廉价科技蓝'],
  },
  abstractions: [{
    sourceAsset: '层叠符号',
    semanticMeaning: ['协作'],
    formalProperties: ['柔性层叠'],
    rhythmProperties: ['有序重复'],
    materialPotential: ['半透明复合材料'],
    lightingPotential: ['透射'],
    forbiddenLiteralUse: ['直接放大符号'],
    evidenceRefs: ['asset:1'],
    confidence: 0.9,
  }],
  mediaTranslations: {
    sharedBrandCore: ['协作', '专业'],
    spatial: {
      spatialConcept: '以层叠界面构成开放而稳定的专业服务空间。',
      structureLanguage: ['层叠半透明界面'],
      materialLanguage: [{
        material: '磨砂玻璃',
        behavior: ['漫反射'],
        brandRole: '开放与边界并存',
        forbidden: ['廉价塑料'],
      }],
      lightingLanguage: {
        source: ['自然侧光'],
        contrast: '低对比',
        interactionWithMaterials: ['透射'],
        forbidden: ['霓虹'],
      },
      colorBehavior: {
        primary: [{ name: '暖灰', ratio: 70, role: '稳定基底' }],
        secondary: [{ name: '半透明灰', ratio: 20, role: '层次' }],
        accent: [{ name: '低饱和蓝', ratio: 10, role: '识别' }],
        forbidden: ['科技蓝满版'],
      },
      brandIntegration: ['小面积 Logo'],
      functionalExperience: ['清晰接待动线'],
      sceneMisreadRisks: ['普通办公室'],
    },
  },
};

extracted.creativeDecision.toneBoundaries.push(
  { target: '当代', avoid: ['廉价科技蓝'] },
  { target: '人文温度', avoid: ['柔弱甜美'] },
  { target: '文化语义', avoid: ['符号堆砌'] },
);
extracted.mediaTranslations.spatial.sceneMisreadRisks.push(
  '科技展厅',
  '生活方式店',
  '售楼处',
  '文化会所',
);
extracted.mediaTranslations.spatial.brandIntegration = [
  '核心抽象分散进入半透明隔断与曲面墙体',
  '小面积 Logo 位于后方内部服务节点',
];
extracted.mediaTranslations.spatial.functionalExperience = [
  '前景为到达与等候，中景为咨询和半透明分区，背景为接待与后方服务空间',
  '动线从入口进入、停留咨询并前往后方',
];

test('unified prompt requests evidence-rich A-F modules without embedding Jiuzhou answers', () => {
  const prompt = buildUnifiedVisualUnderstandingPrompt(project(), ['asset:1']);
  assert.match(prompt, /assetInventory/u);
  assert.match(prompt, /creativeDecision/u);
  assert.match(prompt, /abstractions/u);
  assert.match(prompt, /mediaTranslations/u);
  assert.doesNotMatch(prompt, /珍珠白|孔雀羽毛|矿物紫|医美全链/u);
});

test('formal unified output fails closed when execution data is incomplete', () => {
  assert.throws(
    () => normalizeUnifiedVisualUnderstanding({ project: project(), extracted: { ...extracted, abstractions: [] } }),
    (error: Error & { code?: string }) => error.code === 'PROMPT_SOURCE_INSUFFICIENT',
  );
});

test('human report is deterministically rendered from the same packet with explicit tags', () => {
  const { packet } = normalizeUnifiedVisualUnderstanding({
    project: project(),
    extracted,
    generatedAt: '2026-07-30T00:00:00.000Z',
    modelId: 'test-model',
    sourceRefs: ['asset:1', 'asset:brief'],
  });
  const report = compileVisualDecisionReport(packet);
  assert.match(report, /\[Source Fact\]/u);
  assert.match(report, /\[AI Diagnosis\]/u);
  assert.match(report, /\[Creative Proposal\]/u);
  assert.match(report, /\[Unknown\]/u);
  assert.match(report, /从通用企业蓝升级/u);
  assert.match(report, /磨砂玻璃/u);
  assert.doesNotMatch(report, /最终锁定项/u);
});
