import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rankStyleCarriers,
  compileTaskScopedStyleCarriers,
  validateTaskStyleCarriers,
  validateRequestedTaskCoverage,
  validateSignatureGraphicLeak,
  buildGenericReferenceMasterSet,
  selectTaskReferences
} from '../src/main/reference-first/index.ts';
import type {
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

function referenceDecision(
  outputTypes: ReferenceAssetDecision['eligibleOutputTypes'] = ['digital_campaign']
): ReferenceAssetDecision {
  return {
    assetId: 'reference-1',
    filename: 'reference-1.png',
    role: 'display_layout',
    primaryRole: 'display_layout',
    secondaryRoles: ['typography_detail', 'graphic_detail'],
    styleCarrierStrength: 'high',
    includeInMasterSet: true,
    eligibleOutputTypes: outputTypes,
    representedStyleCarriers: ['layout', 'typography', 'graphic'],
    styleCarrierRules: [
      { category: 'layout', readableRule: '主体区与信息区沿稳定网格分离，并保留明确呼吸区', confidence: 0.95 },
      { category: 'typography', readableRule: '标题、名称与说明形成三级字号和字重层级', confidence: 0.93 },
      { category: 'graphic', readableRule: '辅助图形通过重复、裁切与密度变化维持跨输出一致性', confidence: 0.91 }
    ],
    confidence: 0.94,
    reason: 'fixture visual evidence',
    requiresHumanReview: false
  };
}

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

test('参考主集选择按任务驱动，证据不足时闭合失败', () => {
  const master = buildGenericReferenceMasterSet([referenceDecision()]);
  const selected = selectTaskReferences(master, ['digital_campaign']);
  const insufficient = selectTaskReferences(master, ['spatial_scene']);

  assert.equal(selected.subsets[0]?.matchLevel, 'exact');
  assert.deepEqual(selected.subsets[0]?.selectedAssetIds, ['reference-1']);
  assert.equal(insufficient.subsets[0]?.matchLevel, 'insufficient');
  assert.deepEqual(insufficient.subsets[0]?.selectedAssetIds, []);
  assert.equal(insufficient.validations[0]?.passed, false);
});
