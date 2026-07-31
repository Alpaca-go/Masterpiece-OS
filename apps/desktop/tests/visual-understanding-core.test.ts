import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectRecord } from '../src/shared/types.ts';
import {
  buildVisualUnderstandingCore,
  validateVisualUnderstandingCore,
} from '../src/main/visual-understanding-core.ts';

function project(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: 'project-jiuzhou',
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
    logoFiles: ['assets/logo.png'],
    briefFiles: [],
    assets: [{
      id: 'logo-real',
      batchId: 'batch-1',
      sourceType: 'file',
      originalName: '九州美学-logo.png',
      relativePath: 'assets/logo.png',
      mimeType: 'image/png',
      sizeBytes: 100,
      sha256: 'abc',
      status: 'ready',
    }],
    ...overrides,
  };
}

const extracted = {
  projectFacts: {
    brandName: {
      value: '模型错误品牌',
      source: 'model_inference',
      evidenceRefs: [],
      confidence: 0.5,
      status: 'probable',
    },
    industry: {
      value: '艺术空间',
      source: 'model_inference',
      evidenceRefs: [],
      confidence: 0.4,
      status: 'probable',
    },
    brandRole: {
      value: '医美全链生态平台',
      source: 'source_document',
      evidenceRefs: ['asset:page-05'],
      confidence: 0.96,
      status: 'confirmed',
    },
  },
  assetInventory: {
    colorAssets: [{
      name: 'Mockup 木材背景',
      occurrenceRefs: ['asset:page-20'],
      visualFeatures: ['木纹'],
      possibleBrandMeaning: [],
      contextRole: 'mockup_environment',
      confidence: 0.92,
    }],
    graphicMotifs: [{
      name: '孔雀羽毛',
      occurrenceRefs: ['asset:page-08'],
      visualFeatures: ['层叠', '放射'],
      possibleBrandMeaning: ['生命生长', '精密'],
      contextRole: 'brand_asset',
      confidence: 0.95,
    }],
  },
  diagnosis: {
    valuableAssets: [{
      target: '孔雀羽毛的深层语义',
      observation: '持续表达生命、生长、精密与层叠',
      whyItMatters: '可以跨媒介建立长期品牌识别',
      evidenceRefs: ['asset:page-08'],
      confidence: 0.94,
    }],
    overusedExpressions: [{
      target: '高饱和紫',
      observation: '大面积高饱和紫与发光渐变反复出现',
      whyItMatters: '容易落入传统医美俗套',
      evidenceRefs: ['asset:page-12'],
      confidence: 0.9,
    }],
    brandMisreadRisks: [{
      code: 'consumer_salon',
      description: '不要误读为普通美容院',
      target: '普通美容院',
      observation: '甜美紫色和装饰羽毛会弱化平台角色',
      whyItMatters: '错误表达业务规模与专业可信度',
      appliesTo: { taskFamilies: ['space'], subtypes: ['reception'] },
      evidenceRefs: ['asset:page-12'],
      confidence: 0.9,
      status: 'confirmed',
    }],
  },
  creativeDecision: {
    brandRoleStatement: '面向医美产业的全链生态平台',
    upgradeFrom: ['传统紫色医美', '具象孔雀羽毛'],
    preserveCore: ['生命生长', '精密层叠', '历史紫色识别'],
    upgradeTo: ['东方生命美学', '现代医疗专业感', '未来材料科技感'],
    uniqueUpgradeThesis: '从传统紫色医美与具象羽毛表面装饰，升级为生命结构、医疗专业、未来材料与东方秩序共同构成的高端医美生态平台视觉世界。',
    targetWorldview: ['东方生命美学', '专业可信赖'],
    toneBoundaries: [{ target: '东方生命美学', avoid: ['古典中式', '木格栅茶空间'] }],
    strategicNegatives: ['普通美容院', '传统医院诊室'],
  },
};

test('ProjectRecord facts override model inference and preserve sourced evidence', () => {
  const result = buildVisualUnderstandingCore({ project: project(), extracted });
  assert.equal(result.projectFacts.brandName.value, '九州美学');
  assert.equal(result.projectFacts.brandName.source, 'project_record');
  assert.equal(result.projectFacts.industry.value, '医美');
  assert.equal(result.projectFacts.brandRole.value, '医美全链生态平台');
  assert.equal(result.validation.hardFactStatus, 'pass');
});

test('AI proposals never become Locked Assets', () => {
  const result = buildVisualUnderstandingCore({
    project: project(),
    extracted: {
      ...extracted,
      lockedAssets: [
        { value: 'Jointown Aesthetics', lockSource: 'model_inference' },
        { value: 'AI 矿物紫系统', lockSource: 'model_inference' },
      ],
    },
  });
  assert.deepEqual(
    result.lockedAssets.map((item) => item.value).sort(),
    ['九州美学', '九州美学-logo.png'].sort(),
  );
});

test('Mockup environment remains explicitly separated from brand assets', () => {
  const result = buildVisualUnderstandingCore({ project: project(), extracted });
  assert.equal(result.assetInventory.colorAssets[0]?.contextRole, 'mockup_environment');
  assert.equal(result.assetInventory.graphicMotifs[0]?.contextRole, 'brand_asset');
});

test('unknown brand role or missing locked Logo blocks formal upgrade', () => {
  const withoutLogo = project({ logoFiles: [], assets: [] });
  const result = buildVisualUnderstandingCore({
    project: withoutLogo,
    extracted: { ...extracted, projectFacts: { ...extracted.projectFacts, brandRole: {} } },
  });
  assert.equal(result.validation.hardFactStatus, 'block');
  assert.equal(result.validation.mode, 'exploration');
  assert.deepEqual(result.validation.missingRequiredFacts.sort(), ['brandRole', 'logo']);
  assert.match(result.validation.message ?? '', /仅为视觉方向探索/u);
});

test('diagnosis and unique creative thesis retain project-specific judgments', () => {
  const result = buildVisualUnderstandingCore({ project: project(), extracted });
  assert.equal(result.diagnosis.valuableAssets[0]?.target, '孔雀羽毛的深层语义');
  assert.equal(result.diagnosis.brandMisreadRisks[0]?.target, '普通美容院');
  assert.match(result.creativeDecision.uniqueUpgradeThesis, /高端医美生态平台/u);
  assert.deepEqual(validateVisualUnderstandingCore(result), { valid: true, errors: [] });
});
