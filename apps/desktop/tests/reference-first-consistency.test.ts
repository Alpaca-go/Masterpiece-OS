import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rankStyleCarriers,
  compileTaskScopedStyleCarriers,
  validateTaskStyleCarriers,
  compileAnchorSection,
  validateAnchorContradiction,
  buildStructurePolicy,
  resolveStructureStatus,
  validateStructurePolicy,
  buildGenerationIdentityPack,
  validateIdentityPackGranularity,
  validateRequestedTaskCoverage,
  validateSignatureGraphicLeak,
  validateCrossArtifactConsistency
} from '../src/main/reference-first/index.ts';
import type {
  GenerationIdentityUsage,
  GenerationOutputType,
  ReferenceAssetDecision,
  ReferenceSignatureGraphic,
  RequestedGenerationTaskManifest,
  TaskReferenceSubsetManifest
} from '../src/shared/types.ts';

const signature: ReferenceSignatureGraphic = {
  id: 'signature-1',
  description: '专属徽章轮廓',
  forbiddenToCopy: true,
  evidenceAssetIds: ['asset-banned']
};

test('§17.1 禁止复制的参考专属图形不得进入 Style Carrier', () => {
  const decisions: ReferenceAssetDecision[] = [{
    assetId: 'asset-banned',
    filename: 'banned.png',
    role: 'system_overview',
    primaryRole: 'system_overview',
    styleCarrierStrength: 'high',
    includeInMasterSet: true,
    eligibleOutputTypes: ['anchor_vi_system'],
    representedStyleCarriers: ['layout'],
    styleCarrierRules: [{ category: 'layout', readableRule: '稳定网格', confidence: 0.9 }],
    confidence: 0.9,
    reason: '参考专属图形',
    requiresHumanReview: false
  }];
  const carriers = rankStyleCarriers(decisions, { signatureGraphics: [signature] });
  assert.equal(carriers.length, 0, '被禁止资产贡献的载体必须被排除');
  const leak = validateSignatureGraphicLeak({ signatures: [signature], carriers });
  assert.equal(leak.primaryStyleCarrierLeakIds.length, 0);
  assert.equal(leak.passed, true);
});

test('§17.2 Reference-First 模式不编译 legacy Anchor', () => {
  const legacyText = '这是旧版闭合轮廓超级符号描述';
  const report = compileAnchorSection('reference_first', {
    referenceFirst: {
      systemAnchor: {
        colorRelationship: '受控对比',
        layoutGrammar: '稳定网格',
        typographyHierarchy: '三级层级',
        materialLanguage: '真实表面',
        crossTouchpointConsistency: '跨触点一致',
        primaryStyleCarrierIds: []
      },
      referenceSignatureGraphics: [signature]
    },
    legacy: legacyText
  });
  assert.equal(report.mode, 'reference_first');
  assert.ok(!report.text.includes(legacyText), '不得拼接 legacy 字段');
  const contradiction = validateAnchorContradiction({
    legacyAnchorText: legacyText,
    systemAnchor: {
      colorRelationship: '受控对比',
      layoutGrammar: '稳定网格',
      typographyHierarchy: '三级层级',
      materialLanguage: '真实表面',
      crossTouchpointConsistency: '跨触点一致',
      primaryStyleCarrierIds: []
    },
    signatureGraphics: [signature]
  });
  assert.equal(contradiction.passed, false);
  assert.ok(contradiction.conflictingSourceFields.includes('legacy_anchor_still_active'));
});

test('§17.3 请求任务缺少参考子集时阻断', () => {
  const requested: RequestedGenerationTaskManifest = {
    tasks: [{ outputType: 'anchor_vi_system', requestedBy: 'system', required: true }]
  };
  const issues = validateRequestedTaskCoverage(requested, { subsets: [] } as TaskReferenceSubsetManifest);
  assert.equal(issues.length, 1);
  assert.equal(issues[0]!.severity, 'blocking');
});

test('§17.4 任务级 Style Carrier 排除不兼容载体', () => {
  const global = [
    {
      id: 'carrier-space',
      category: 'layout' as const,
      description: '空间陈列规则',
      priority: 'primary' as const,
      supportingAssetIds: ['a'],
      mustBeVisibleInOutput: true,
      confidence: 0.9,
      compatibleOutputTypes: ['spatial_scene'] as GenerationOutputType[]
    },
    {
      id: 'carrier-anchor',
      category: 'layout' as const,
      description: 'VI 系统规则',
      priority: 'primary' as const,
      supportingAssetIds: ['b'],
      mustBeVisibleInOutput: true,
      confidence: 0.9,
      compatibleOutputTypes: ['anchor_vi_system'] as GenerationOutputType[]
    },
    {
      id: 'carrier-anchor-2',
      category: 'color' as const,
      description: '色彩关系规则',
      priority: 'primary' as const,
      supportingAssetIds: ['c'],
      mustBeVisibleInOutput: true,
      confidence: 0.9,
      compatibleOutputTypes: ['anchor_vi_system'] as GenerationOutputType[]
    },
    {
      id: 'carrier-anchor-3',
      category: 'typography' as const,
      description: '字体层级规则',
      priority: 'primary' as const,
      supportingAssetIds: ['d'],
      mustBeVisibleInOutput: true,
      confidence: 0.9,
      compatibleOutputTypes: ['anchor_vi_system'] as GenerationOutputType[]
    }
  ];
  const set = compileTaskScopedStyleCarriers(global, 'anchor_vi_system');
  assert.ok(!set.requiredPrimary.some((item) => item.id === 'carrier-space'));
  assert.ok(set.excludedForTask.some((item) => item.carrierId === 'carrier-space'));
  const validation = validateTaskStyleCarriers(set);
  assert.equal(validation.incompatibleCarrierIds.length, 0);
  assert.equal(validation.passed, true);
});

test('§17.5 推断结构不得视为锁定', () => {
  const policy = buildStructurePolicy([], undefined, ['observed-shape']);
  assert.equal(policy.status, 'open_for_redesign');
  assert.equal(resolveStructureStatus([], undefined, ['observed-shape']), 'open_for_redesign');
  assert.deepEqual(policy.inferredStructureObservations, ['observed-shape']);
  const validation = validateStructurePolicy(policy);
  assert.equal(validation.passed, true);
});

test('§17.6 Identity Pack 拒绝整页旧视觉', () => {
  const usage: GenerationIdentityUsage = 'user_locked_asset';
  const result = validateIdentityPackGranularity({
    identityFacts: [],
    productOrServiceFacts: [],
    logoAssets: [],
    logoTypographyAssets: [],
    confirmedStructureAssets: [],
    lockedAssets: [],
    retainedCopy: [],
    structurePolicy: { domain: 'other', status: 'open_for_redesign', confirmedAssetIds: [], excludedUnverifiedAssetIds: [], redesignAllowed: true, requiresHumanConfirmation: true },
    assets: [{ assetId: 'full-page', usage, reason: '整页旧方案锁定', containsLegacyStyle: true, confidence: 1 }]
  });
  assert.equal(result.passed, false);
  assert.ok(result.fullPageAssetIds.includes('full-page'));
});

test('§17.7 审计与 Brief 任务不一致时阻断', () => {
  const result = validateCrossArtifactConsistency({
    auditOutputType: 'vi_application',
    briefOutputType: 'anchor_vi_system'
  });
  assert.equal(result.passed, false);
  assert.ok(result.contradictions.includes('AUDIT_BRIEF_TASK_MISMATCH'));
});
