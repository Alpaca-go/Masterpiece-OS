import test from 'node:test';
import assert from 'node:assert/strict';
import {
  orchestrateGenerationReadiness,
  validateCrossArtifactConsistency
} from '../src/main/reference-first/index.ts';
import type {
  GenerationOutputType,
  ProjectGraphicAnchor,
  ProjectRuntimeContext,
  SystemAnchor
} from '../src/shared/types.ts';

const runtime: ProjectRuntimeContext = {
  projectId: 'proj-readiness',
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
    jobId: 'job-readiness',
    runtime,
    assetDecisions: [],
    facts: [],
    observedCopy: [],
    styleCarriers: [],
    referenceSignatureGraphics: [],
    requestedTaskOutputTypes: ['anchor_vi_system'] as GenerationOutputType[],
    taskReferenceSubsets: [],
    systemAnchor,
    projectGraphicAnchor,
    auditReport: '# 审计报告',
    generationBrief: '# 执行文档\n生成任务定义\n输出类型：anchor_vi_system',
    briefStatesTaskDefinition: true
  };
}

test('§14 编排器在缺少身份包与任务子集时判为 blocked 且不抛错', () => {
  const result = orchestrateGenerationReadiness({ ...baseOrchestratorInput() });
  assert.equal(result.generationReadiness.status, 'blocked');
  assert.ok(result.generationReadiness.blockingReasons.includes('GENERATION_IDENTITY_PACK_EMPTY'));
  assert.ok(result.generationReadiness.blockingReasons.includes('REQUESTED_TASK_SUBSET_MISSING'));
  // manifest 校验状态必须与闭环 gate 状态一致，供客户端展示。
  assert.equal(result.generationContextManifest.validationStatus, result.generationReadiness.status);
});

test('§13 编排器透传 briefStatesTaskDefinition：执行文档缺任务定义时交叉校验不通过', () => {
  const missing = orchestrateGenerationReadiness({
    ...baseOrchestratorInput(),
    briefStatesTaskDefinition: false
  });
  assert.equal(missing.crossArtifactConsistency.taskDefinitionMatches, false);
  assert.ok(missing.crossArtifactConsistency.contradictions.includes('AUDIT_BRIEF_TASK_DEFINITION_MISMATCH'));
  // 交叉不一致必须作为阻断原因冒泡到 readiness gate。
  assert.ok(missing.generationReadiness.blockingReasons.includes('AUDIT_BRIEF_TASK_MISMATCH'));

  const present = orchestrateGenerationReadiness({
    ...baseOrchestratorInput(),
    briefStatesTaskDefinition: true
  });
  assert.equal(present.crossArtifactConsistency.taskDefinitionMatches, true);
});

test('§13 Generation Task Definition 双侧存在性交叉校验', () => {
  const briefMissing = validateCrossArtifactConsistency({
    auditOutputType: 'anchor_vi_system',
    briefOutputType: 'anchor_vi_system',
    auditTaskDefinitionPresent: true,
    briefTaskDefinitionPresent: false
  });
  assert.equal(briefMissing.taskDefinitionMatches, false);
  assert.equal(briefMissing.passed, false);
  assert.ok(briefMissing.contradictions.includes('AUDIT_BRIEF_TASK_DEFINITION_MISMATCH'));

  const auditMissing = validateCrossArtifactConsistency({
    auditOutputType: 'anchor_vi_system',
    briefOutputType: 'anchor_vi_system',
    auditTaskDefinitionPresent: false,
    briefTaskDefinitionPresent: true
  });
  assert.equal(auditMissing.taskDefinitionMatches, false);
  assert.ok(auditMissing.contradictions.includes('AUDIT_BRIEF_TASK_DEFINITION_MISMATCH'));

  const bothPresent = validateCrossArtifactConsistency({
    auditOutputType: 'anchor_vi_system',
    briefOutputType: 'anchor_vi_system',
    auditTaskDefinitionPresent: true,
    briefTaskDefinitionPresent: true
  });
  assert.equal(bothPresent.taskDefinitionMatches, true);
  assert.equal(bothPresent.passed, true);

  // 向后兼容：未声明任务定义存在性时视为一致，不产生新阻断。
  const unspecified = validateCrossArtifactConsistency({
    auditOutputType: 'anchor_vi_system',
    briefOutputType: 'anchor_vi_system'
  });
  assert.equal(unspecified.taskDefinitionMatches, true);
  assert.equal(unspecified.passed, true);
});
