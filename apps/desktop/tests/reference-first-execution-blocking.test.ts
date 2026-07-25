import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rankStyleCarriers,
  validateStyleCarriers,
  compileTaskScopedStyleCarriers,
  buildStructurePolicy,
  resolveStructureStatus,
  validateStructureOnlyAssets,
  orchestrateGenerationReadiness,
  compileGenerationBrief
} from '../src/main/reference-first/index.ts';
import type {
  AssetAuthenticityDecision,
  GenerationOutputType,
  GenerationTaskDefinition,
  ProjectGraphicAnchor,
  ProjectRuntimeContext,
  ReferenceAssetDecision,
  StyleCarrier,
  SystemAnchor,
  TaskReferenceSubset
} from '../src/shared/types.ts';

// 说明：本文件覆盖执行层阻断修复文档 §10 要求的 7 个回归测试。
// 具体项目样例只出现在测试内（tests/），不进入生产判断（生产逻辑全部由数据标注驱动）。

const runtime: ProjectRuntimeContext = {
  projectId: 'proj-blocking',
  brandName: '当前项目品牌',
  industry: '示例行业',
  productFacts: ['真实产品事实'],
  userLockedAssets: [],
  userRetainedCopy: [],
  userConfirmedRealAssets: [],
  outputTasks: ['anchor_vi_system'],
  referenceAssetIds: [],
  projectMetadata: {}
};

const systemAnchor: SystemAnchor = {
  colorRelationship: '受控对比',
  layoutGrammar: '稳定网格',
  typographyHierarchy: '三级层级',
  materialLanguage: '真实表面',
  crossTouchpointConsistency: '跨触点一致',
  primaryStyleCarrierIds: []
};

const projectGraphicAnchor: ProjectGraphicAnchor = {
  sourceElements: ['当前项目来源元素'],
  reconstructedForm: '非闭合、可延展的流动线条系统',
  usageRole: 'primary',
  extensionTouchpoints: ['包装', '海报'],
  isClosed: false,
  isBadgeLike: false,
  resemblesReferenceSignatureGraphic: false
};

function baseOrchestratorInput() {
  return {
    jobId: 'job-blocking',
    runtime,
    assetDecisions: [],
    facts: [],
    observedCopy: [],
    styleCarriers: [],
    referenceSignatureGraphics: [],
    requestedTaskOutputTypes: ['anchor_vi_system'] as GenerationOutputType[],
    requiredTaskOutputTypes: ['anchor_vi_system'] as GenerationOutputType[],
    taskReferenceSubsets: [],
    systemAnchor,
    projectGraphicAnchor,
    auditReport: '# 审计报告',
    generationBrief: '# 执行文档\n生成任务定义\n输出类型：anchor_vi_system',
    briefStatesTaskDefinition: true
  };
}

const emptyTaskDefinition: GenerationTaskDefinition = {
  outputType: 'anchor_vi_system',
  taskPurpose: '占位任务',
  primarySubjectTypes: [],
  requiredObjects: [],
  optionalObjects: [],
  compositionRules: [],
  typographyRules: [],
  materialRules: [],
  photographyRules: [],
  logoUsageRules: [],
  forbiddenOutputPatterns: []
};

const emptyReferenceSubset: TaskReferenceSubset = {
  outputType: 'anchor_vi_system',
  selectedAssetIds: [],
  primaryReferenceAssetId: '',
  supportingReferenceAssetIds: [],
  coveredPrimaryStyleCarrierIds: [],
  missingStyleCarrierIds: [],
  selectionReason: '占位',
  confidence: 0,
  matchLevel: 'insufficient'
};

// §2 参考品牌身份必须在 Ranking 前被过滤。
test('rejects reference brand identity before ranking', () => {
  const decisions: ReferenceAssetDecision[] = [{
    assetId: 'asset-brand',
    filename: 'brand.png',
    role: 'system_overview',
    styleCarrierStrength: 'high',
    includeInMasterSet: true,
    eligibleOutputTypes: ['anchor_vi_system'],
    representedStyleCarriers: ['typography'],
    styleCarrierRules: [{
      category: 'typography',
      readableRule: '主标题使用参考品牌名称字标',
      confidence: 0.95,
      contaminationTypes: ['brand_name']
    }],
    confidence: 0.95,
    reason: '含参考品牌身份',
    requiresHumanReview: false
  }];
  const carriers = rankStyleCarriers(decisions);
  assert.equal(carriers.length, 0, '携带品牌身份污染的候选不得进入 Ranking');

  // Readiness 级别：污染载体必须冒泡为 blocking 错误码。
  const contaminated: StyleCarrier = {
    id: 'carrier-brand',
    category: 'typography',
    description: '参考品牌字标层级',
    priority: 'primary',
    supportingAssetIds: ['asset-brand'],
    mustBeVisibleInOutput: true,
    confidence: 0.9,
    contaminationTypes: ['brand_name']
  };
  const errors = validateStyleCarriers([contaminated]);
  assert.ok(errors.some((code) => code.startsWith('REFERENCE_IDENTITY_IN_STYLE_CARRIER')));
});

// §2 参考专属图形必须在 Ranking 前被过滤。
test('rejects signature graphic before ranking', () => {
  const decisions: ReferenceAssetDecision[] = [{
    assetId: 'asset-signature',
    filename: 'signature.png',
    role: 'system_overview',
    styleCarrierStrength: 'high',
    includeInMasterSet: true,
    eligibleOutputTypes: ['anchor_vi_system'],
    representedStyleCarriers: ['graphic'],
    styleCarrierRules: [{
      category: 'graphic',
      readableRule: '复用参考专属徽章图形',
      confidence: 0.92,
      signatureGraphicIds: ['sig-1']
    }],
    confidence: 0.92,
    reason: '含参考专属图形',
    requiresHumanReview: false
  }];
  const carriers = rankStyleCarriers(decisions);
  assert.equal(carriers.length, 0, '关联参考专属图形的候选不得进入 Ranking');

  const leaking: StyleCarrier = {
    id: 'carrier-signature',
    category: 'graphic',
    description: '专属徽章形状',
    priority: 'primary',
    supportingAssetIds: ['asset-signature'],
    mustBeVisibleInOutput: true,
    confidence: 0.9,
    referencesSignatureGraphicIds: ['sig-1']
  };
  const errors = validateStyleCarriers([leaking]);
  assert.ok(errors.some((code) => code.startsWith('REFERENCE_SIGNATURE_GRAPHIC_IN_STYLE_CARRIER')));
});

// §3 当前任务禁止摄影时，摄影类载体必须被排除。
test('excludes photography carrier when photography is forbidden', () => {
  const global: StyleCarrier[] = [
    {
      id: 'carrier-photo',
      category: 'photography',
      description: '真实产品摄影质感',
      priority: 'primary',
      supportingAssetIds: ['a'],
      mustBeVisibleInOutput: true,
      confidence: 0.9,
      compatibleOutputTypes: ['anchor_vi_system']
    },
    {
      id: 'carrier-color',
      category: 'color',
      description: '受控对比色彩关系',
      priority: 'primary',
      supportingAssetIds: ['b'],
      mustBeVisibleInOutput: true,
      confidence: 0.9,
      compatibleOutputTypes: ['anchor_vi_system']
    }
  ];
  const set = compileTaskScopedStyleCarriers(global, 'anchor_vi_system', { photographyAllowed: false });
  assert.ok(!set.requiredPrimary.some((item) => item.id === 'carrier-photo'), '禁止摄影时摄影载体不得进入任务集');
  assert.ok(set.excludedForTask.some((item) => item.carrierId === 'carrier-photo' && item.reason === 'requires_photography'));

  // 允许摄影时同一载体应保留。
  const allowed = compileTaskScopedStyleCarriers(global, 'anchor_vi_system', { photographyAllowed: true });
  assert.ok(allowed.excludedForTask.every((item) => item.carrierId !== 'carrier-photo'));
});

// §4 未确认结构默认解析为 open_for_redesign。
test('resolves unverified structures as open_for_redesign', () => {
  const decisions: AssetAuthenticityDecision[] = [{
    assetId: 'mockup-1',
    authenticity: 'stock_mockup',
    confidence: 0.8,
    reason: '第三方样机',
    canProveIdentity: false,
    canProveProductFact: false,
    canProveStructure: false,
    canProveLockedAsset: false,
    includeInAnalysisEvidencePack: true,
    includeInGenerationIdentityPack: false,
    requiresHumanReview: false
  }];
  assert.equal(resolveStructureStatus(decisions, undefined, []), 'open_for_redesign');
  const policy = buildStructurePolicy(decisions, undefined, []);
  assert.equal(policy.status, 'open_for_redesign');
  assert.equal(policy.redesignAllowed, true);
  // 未确认资产进入排除清单，不得作为确认结构。
  assert.ok(policy.excludedUnverifiedAssetIds.includes('mockup-1'));
  assert.ok(!policy.confirmedAssetIds.includes('mockup-1'));
});

// §4 未确认 structure_only 资产必须阻断。
test('blocks unverified structure_only assets', () => {
  const decisions: AssetAuthenticityDecision[] = [{
    assetId: 'mockup-structure',
    authenticity: 'stock_mockup',
    confidence: 0.8,
    reason: '样机被误当作结构证据',
    canProveIdentity: false,
    canProveProductFact: false,
    // 未经确认的样机却声称能证明结构 —— 必须被判为非法。
    canProveStructure: true,
    canProveLockedAsset: false,
    includeInAnalysisEvidencePack: true,
    includeInGenerationIdentityPack: true,
    requiresHumanReview: false
  }];
  const errors = validateStructureOnlyAssets(decisions);
  assert.ok(errors.some((code) => code.startsWith('STRUCTURE_ONLY_ASSET_INVALID')));

  // 真实结构证据（brand_original）不应触发阻断。
  const factual: AssetAuthenticityDecision[] = [{
    ...decisions[0]!,
    assetId: 'real-structure',
    authenticity: 'brand_original'
  }];
  assert.equal(validateStructureOnlyAssets(factual).length, 0);
});

// §5 缺少 Required Task Subset 时必须返回 blocked。
test('returns blocked when required task subset is missing', () => {
  const result = orchestrateGenerationReadiness({ ...baseOrchestratorInput(), taskReferenceSubsets: [] });
  assert.equal(result.generationReadiness.status, 'blocked');
  assert.ok(result.generationReadiness.blockingReasons.includes('REQUESTED_TASK_SUBSET_MISSING'));
  // manifest 状态必须与 gate 一致，供客户端阻断展示。
  assert.equal(result.generationContextManifest.validationStatus, 'blocked');
});

// §6 blocked 状态不得编译可执行 Prompt。
test('does not compile executable prompt when blocked', () => {
  const result = orchestrateGenerationReadiness({ ...baseOrchestratorInput() });
  assert.equal(result.generationReadiness.status, 'blocked');

  const brief = compileGenerationBrief({
    identityPack: result.identityPack,
    replaceableLegacyVisuals: [],
    styleCarriers: [],
    systemAnchor,
    graphicAnchor: projectGraphicAnchor,
    task: emptyTaskDefinition,
    referenceSubset: emptyReferenceSubset,
    readiness: result.generationReadiness
  });

  assert.ok(brief.includes('Generation Blocked Report'), 'blocked 时应返回阻断报告');
  assert.ok(brief.includes('阻断原因'), '阻断报告应列出阻断原因');
  // 不得包含可直接复制的 GPT Prompt / 可执行执行段落。
  assert.ok(!brief.includes('你正在执行 Reference-First'), '不得输出可执行 GPT Prompt 正文');
  assert.ok(!brief.includes('## 11. GPT Prompt'), '不得输出可执行 Prompt 段落');
  assert.ok(!brief.includes('## 4. Primary Style Carriers'), '不得输出不完整的 Primary Style Carriers');
});
