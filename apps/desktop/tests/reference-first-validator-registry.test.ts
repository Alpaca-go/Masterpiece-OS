import test from 'node:test';
import assert from 'node:assert/strict';
import {
  orchestrateGenerationReadiness,
  runAllValidators,
  REFERENCE_FIRST_VALIDATORS,
  VALIDATOR_IDS,
  validateValidatorRegistry,
  assertValidatorRegistry,
  resolveGenerationReadinessResult,
  buildReadinessIssue
} from '../src/main/reference-first/index.ts';
import type {
  GenerationValidationContext,
  ReferenceFirstValidator
} from '../src/main/reference-first/validators/validator-registry.ts';
import type {
  GenerationOutputType,
  GenerationReadinessGate,
  ProjectGraphicAnchor,
  ProjectRuntimeContext,
  ReadinessValidationIssue,
  SystemAnchor,
  ValidatorExecutionManifest
} from '../src/shared/types.ts';

// 说明：本文件覆盖「Validator Registry 与 Generation Readiness 单一状态源修复」文档 §18 回归要求。
// 项目样例只出现在测试内（tests/），不进入生产判断。

const runtime: ProjectRuntimeContext = {
  projectId: 'proj-registry',
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

/** 用于编排机制测试的桩 Validator（跳过 / 异常 / 阻断可控）。 */
function makeStub(
  id: string,
  opts: {
    skipped?: boolean;
    issues?: ReadinessValidationIssue[];
    throwError?: boolean;
    required?: boolean;
  } = {}
): ReferenceFirstValidator {
  return {
    id,
    stage: 'reference_sanitization',
    required: opts.required ?? true,
    validate() {
      if (opts.throwError) throw new Error(`boom:${id}`);
      const issues = opts.issues ?? [];
      return {
        passed: issues.every((issue) => issue.severity !== 'blocking'),
        skipped: opts.skipped ?? false,
        issues,
        artifactPaths: []
      };
    }
  };
}

const stubContext = { jobId: 'job-stub' } as unknown as GenerationValidationContext;

function minimalOrchestratorInput() {
  return {
    jobId: 'job-registry',
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

// §18-1 Registry 完整性：9 个必需 Validator 全部登记，无重复 / 无缺失 / 无未登记。
test('registry registers all required validators with unique ids', () => {
  const validation = validateValidatorRegistry();
  assert.equal(validation.passed, true);
  assert.equal(validation.duplicateIds.length, 0);
  assert.equal(validation.missingRequiredIds.length, 0);
  assert.equal(validation.unknownIds.length, 0);
  assert.equal(REFERENCE_FIRST_VALIDATORS.length, Object.keys(VALIDATOR_IDS).length);
  const ids = REFERENCE_FIRST_VALIDATORS.map((validator) => validator.id);
  assert.equal(new Set(ids).size, ids.length, 'Validator ID 必须唯一');
  assert.doesNotThrow(() => assertValidatorRegistry());
});

// §18-1b Registry 非法：重复 ID / 缺失必需 Validator 必须被检测并抛错。
test('registry validation detects duplicates and missing required validators', () => {
  const first = REFERENCE_FIRST_VALIDATORS[0]!;
  const duplicated = validateValidatorRegistry([first, first]);
  assert.ok(duplicated.duplicateIds.includes(first.id), '应检测重复 ID');
  assert.equal(duplicated.passed, false);

  const missingOne = REFERENCE_FIRST_VALIDATORS.slice(1);
  const missing = validateValidatorRegistry(missingOne);
  assert.ok(missing.missingRequiredIds.includes(first.id), '应检测缺失的必需 Validator');
  assert.equal(missing.passed, false);

  assert.throws(() => assertValidatorRegistry([first, first]));
});

// §18-2 runAllValidators 执行全部 Validator：manifest.complete 为真、执行数量等于注册数量。
test('runAllValidators executes every registered validator and reports complete', () => {
  const { results, manifest } = runAllValidators(buildValidContext());
  assert.equal(results.length, REFERENCE_FIRST_VALIDATORS.length);
  assert.equal(manifest.expectedValidatorCount, REFERENCE_FIRST_VALIDATORS.length);
  assert.equal(manifest.executedValidatorCount, REFERENCE_FIRST_VALIDATORS.length);
  assert.equal(manifest.skippedValidatorIds.length, 0);
  assert.equal(manifest.failedValidatorIds.length, 0);
  assert.equal(manifest.complete, true);
  for (const result of results) {
    assert.ok(result.startedAt, '每个结果必须记录 startedAt');
    assert.ok(result.completedAt, '每个结果必须记录 completedAt');
  }
});

// §18-3 异常隔离：某个 Validator 抛异常 → VALIDATOR_EXECUTION_FAILED，其余 Validator 仍继续执行。
test('runAllValidators isolates validator exceptions without aborting others', () => {
  const validators = [makeStub('good'), makeStub('bad', { throwError: true }), makeStub('good2')];
  const { results, manifest, orchestrationIssues } = runAllValidators(stubContext, validators);
  assert.equal(results.length, 3, '所有 Validator 都必须产出结果');
  assert.ok(manifest.failedValidatorIds.includes('bad'));
  assert.ok(manifest.executedValidatorIds.includes('good2'), '异常后续 Validator 仍需执行');
  assert.ok(
    orchestrationIssues.some((issue) => issue.code.startsWith('VALIDATOR_EXECUTION_FAILED')),
    '必须产出 VALIDATOR_EXECUTION_FAILED'
  );
  assert.equal(manifest.complete, false);
});

// §18-4a 禁止静默跳过：缺少 Resolved Project Facts 时 Runtime Fact Validator 必须显式阻断。
test('runtime fact validator blocks (not silently skips) when resolved facts missing', () => {
  const runtimeValidator = REFERENCE_FIRST_VALIDATORS.find(
    (validator) => validator.id === VALIDATOR_IDS.RUNTIME_FACT
  )!;
  const { results, manifest } = runAllValidators(
    { jobId: 'job-missing-facts' } as unknown as GenerationValidationContext,
    [runtimeValidator]
  );
  assert.equal(results[0]!.skipped, true);
  assert.ok(
    results[0]!.issues.some(
      (issue) => issue.code.startsWith('DEPENDENCY_ARTIFACT_MISSING') && issue.severity === 'blocking'
    ),
    '缺少依赖产物必须阻断'
  );
  assert.ok(manifest.skippedValidatorIds.includes(VALIDATOR_IDS.RUNTIME_FACT));
  assert.equal(manifest.complete, false);
});

// §18-4b required Validator 若被跳过且未自带阻断，编排器必须补 VALIDATOR_SKIPPED_REQUIRED_DEPENDENCY。
test('required validator skipped without blocking is escalated to blocking', () => {
  const { results, manifest } = runAllValidators(stubContext, [
    makeStub('skip-stub', { skipped: true, required: true, issues: [] })
  ]);
  assert.ok(
    results[0]!.issues.some(
      (issue) => issue.code.startsWith('VALIDATOR_SKIPPED_REQUIRED_DEPENDENCY') && issue.severity === 'blocking'
    ),
    'required Validator 跳过必须升级为 blocking'
  );
  assert.ok(manifest.skippedValidatorIds.includes('skip-stub'));
  assert.equal(manifest.complete, false);
});

// §18-5 单一事实源：validatorExecution 反映 manifest，编排级问题进入 rootIssues。
test('resolveGenerationReadinessResult exposes manifest execution and orchestration issues', () => {
  const manifest: ValidatorExecutionManifest = {
    jobId: 'job-single',
    registeredValidatorIds: Object.values(VALIDATOR_IDS),
    executedValidatorIds: Object.values(VALIDATOR_IDS).slice(0, 7),
    skippedValidatorIds: [VALIDATOR_IDS.RUNTIME_FACT],
    failedValidatorIds: ['cross-artifact-consistency'],
    expectedValidatorCount: 9,
    executedValidatorCount: 7,
    complete: false
  };
  const gate = {
    status: 'blocked',
    blockingReasons: [],
    warnings: []
  } as unknown as GenerationReadinessGate;
  const result = resolveGenerationReadinessResult({
    gate,
    jobId: 'job-single',
    outputType: 'anchor_vi_system',
    manifest,
    orchestrationIssues: [buildReadinessIssue('VALIDATOR_EXECUTION_FAILED:cross-artifact-consistency', 'blocking')]
  });
  assert.deepEqual(result.validatorExecution, { expected: 9, executed: 7, complete: false });
  assert.ok(
    result.rootIssues.some((issue) => issue.code.startsWith('VALIDATOR_EXECUTION_FAILED')),
    '编排级失败必须作为根因进入单一事实源'
  );
});

// §18-6 端到端：编排器落盘的执行清单完整，单一事实源含 validatorExecution。
test('orchestrator wires runAllValidators into the single source of truth', () => {
  const orchestration = orchestrateGenerationReadiness(minimalOrchestratorInput());
  assert.equal(orchestration.validatorResults.length, REFERENCE_FIRST_VALIDATORS.length);
  assert.equal(orchestration.validatorExecutionManifest.expectedValidatorCount, REFERENCE_FIRST_VALIDATORS.length);
  assert.equal(orchestration.validatorExecutionManifest.complete, true, '正常输入下每个 Validator 都应执行');
  assert.equal(
    orchestration.generationReadinessResult.validatorExecution.expected,
    REFERENCE_FIRST_VALIDATORS.length
  );
  assert.ok(orchestration.resolvedProjectFacts, '必须产出 Resolved Project Facts 单一来源');
  assert.equal(orchestration.resolvedProjectFacts.brandName?.value, '当前项目品牌');
});

/** 构建一个不触发跳过 / 异常的完整校验上下文（仅用于测试执行完整性）。 */
function buildValidContext(): GenerationValidationContext {
  return {
    jobId: 'job-happy',
    outputType: 'anchor_vi_system',
    runtime,
    resolvedProjectFacts: {
      brandName: { value: '当前项目品牌', source: 'project_metadata', status: 'confirmed' },
      resolvedAt: new Date().toISOString()
    },
    identityPack: {
      assets: [{ assetId: 'a1' }],
      structurePolicy: { status: 'user_confirmed', confirmedAssetIds: [] }
    },
    identityPackGranularity: {
      fullPageAssetIds: [],
      broadLockedAssetIds: [],
      legacyStyleContaminatedAssetIds: [],
      missingRequiredIdentityUsages: [],
      passed: true
    },
    authenticityDecisions: [],
    structurePolicy: { status: 'user_confirmed', confirmedAssetIds: [] },
    styleCarriers: [],
    signatureGraphics: [],
    taskReferenceSubsets: [],
    requiredTaskOutputTypes: [],
    taskScopedStyleCarriers: [],
    primaryTaskReference: {
      outputType: 'anchor_vi_system',
      selectedAssetIds: ['x'],
      matchLevel: 'exact'
    },
    generationTaskDefinition: { outputType: 'anchor_vi_system' },
    generationBrief: '输出类型：anchor_vi_system'
  } as unknown as GenerationValidationContext;
}
