import test from 'node:test';
import assert from 'node:assert/strict';
import {
  orchestrateGenerationReadiness,
  resolveGenerationReadinessResult,
  compileReadinessStatusSection,
  compileBlockedGenerationReport
} from '../src/main/reference-first/index.ts';
import type {
  GenerationOutputType,
  GenerationReadinessGate,
  GenerationReadinessResult,
  ProjectGraphicAnchor,
  ProjectRuntimeContext,
  SystemAnchor
} from '../src/shared/types.ts';

// 说明：本文件覆盖「ValidationIssue 聚合与 Readiness 单一事实源修复」文档 §18 要求的回归测试。
// 项目样例只出现在测试内（tests/），不进入生产判断。

const runtime: ProjectRuntimeContext = {
  projectId: 'proj-single-source',
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
    jobId: 'job-single-source',
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

// §18-1 上游根因（REQUESTED_TASK_SUBSET_MISSING）存在时，GENERATION_BRIEF_MISSING_TASK_DETAILS 必须被压为派生症状。
test('suppresses GENERATION_BRIEF_MISSING_TASK_DETAILS when upstream REQUESTED_TASK_SUBSET_MISSING is root', () => {
  const result = orchestrateGenerationReadiness({ ...baseOrchestratorInput(), taskReferenceSubsets: [] });
  assert.equal(result.generationReadiness.status, 'blocked');
  const rootCodes = result.generationReadinessResult.rootIssues.map((item) => item.code);
  const derivedCodes = result.generationReadinessResult.derivedIssues.map((item) => item.code);

  assert.ok(rootCodes.includes('REQUESTED_TASK_SUBSET_MISSING'), '上游根因应保留为 root');
  assert.ok(!rootCodes.includes('GENERATION_BRIEF_MISSING_TASK_DETAILS'), '下游症状不应作为 root 阻断原因');
  assert.ok(derivedCodes.includes('GENERATION_BRIEF_MISSING_TASK_DETAILS'), '下游症状应进入 derivedIssues');
});

// §18-2 单一事实源必须完整：root ∪ derived 覆盖所有 blockingReasons，且保留多个独立根因。
test('returns all blocking root causes without dropping any', () => {
  const result = orchestrateGenerationReadiness(baseOrchestratorInput());
  const allBlocking = result.generationReadiness.blockingReasons;
  const sourceCodes = [
    ...result.generationReadinessResult.rootIssues,
    ...result.generationReadinessResult.derivedIssues
  ].map((item) => item.code);

  for (const code of allBlocking) {
    assert.ok(sourceCodes.includes(code), `单一事实源必须包含阻断码 ${code}`);
  }
  // 去重：root 内不应有重复码。
  const rootCodes = result.generationReadinessResult.rootIssues.map((item) => item.code);
  assert.equal(new Set(rootCodes).size, rootCodes.length, 'rootIssues 不应含重复码');
  assert.ok(rootCodes.length >= 2, '应保留多个独立根因（不只一个）');
});

// §18-3 审计报告「生成准备状态」章节与 §6 阻断报告必须读取同一份 GenerationReadinessResult。
test('audit section and blocked report read the same readiness result', () => {
  const orchestration = orchestrateGenerationReadiness(baseOrchestratorInput());
  const gate = orchestration.generationReadiness;
  const source = orchestration.generationReadinessResult;
  const blocked = compileBlockedGenerationReport({
    identityPack: orchestration.identityPack,
    readiness: gate,
    readinessResult: source
  });
  const audit = compileReadinessStatusSection(source);

  for (const code of source.rootIssues.map((item) => item.code)) {
    assert.ok(blocked.includes(code), `阻断报告应列出根因 ${code}`);
    assert.ok(audit.includes(code), `审计报告章节应列出根因 ${code}`);
  }
  // 二者根因集合必须一致（来自同一份事实源，不得各自重新计算导致分歧）。
  const blockedRoots = source.rootIssues.map((item) => item.code).filter((code) => blocked.includes(code));
  const auditRoots = source.rootIssues.map((item) => item.code).filter((code) => audit.includes(code));
  assert.deepEqual(blockedRoots.sort(), auditRoots.sort(), '阻断报告与审计报告的根因集合必须一致');
});

// §18-4 当不存在上游根因时，GENERATION_BRIEF_MISSING_TASK_DETAILS 必须作为根因保留（不可被误压）。
test('keeps GENERATION_BRIEF_MISSING_TASK_DETAILS as root when no upstream issue', () => {
  const syntheticGate = {
    status: 'blocked' as const,
    blockingReasons: ['GENERATION_BRIEF_MISSING_TASK_DETAILS'],
    warnings: []
  } as unknown as GenerationReadinessGate;
  const source = resolveGenerationReadinessResult({
    gate: syntheticGate,
    jobId: 'job-isolated-brief',
    outputType: 'anchor_vi_system'
  });
  const rootCodes = source.rootIssues.map((item) => item.code);
  const derivedCodes = source.derivedIssues.map((item) => item.code);
  assert.ok(rootCodes.includes('GENERATION_BRIEF_MISSING_TASK_DETAILS'), '无上游根因时应保留为 root');
  assert.ok(!derivedCodes.includes('GENERATION_BRIEF_MISSING_TASK_DETAILS'), '无上游根因时不应被压为派生');
});

// §18-5 UI / 报告状态必须从单一事实源（result.status）派生，而非从产物文件存在性反推。
test('does not derive UI status from artifact existence', () => {
  const syntheticResult: GenerationReadinessResult = {
    jobId: 'job-status-source',
    outputType: 'anchor_vi_system',
    // 权威状态为 blocked，即使子状态（referenceSelection / generationContext）都已通过。
    status: 'blocked',
    rootIssues: [],
    derivedIssues: [],
    warnings: [],
    validatorExecution: { expected: 9, executed: 9, complete: true },
    referenceSelectionStatus: 'passed',
    generationContextStatus: 'ready',
    generatedAt: new Date().toISOString()
  };
  const section = compileReadinessStatusSection(syntheticResult);
  assert.ok(section.includes('Generation Readiness'), '章节必须包含 Generation Readiness 行');
  assert.ok(section.includes('blocked'), '权威状态为 blocked 时，章节必须显示 blocked，即使子状态已通过');
});
