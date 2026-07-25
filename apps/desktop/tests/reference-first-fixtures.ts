// 共享测试夹具：供 Reference-First 生产主链路接线与阻断状态修复（§16）回归测试复用。
// 本文件不以 *.test.ts 结尾，不会被 `tsx --test` 作为测试入口执行。
import type {
  GenerationOutputType,
  ProjectGraphicAnchor,
  ProjectRuntimeContext,
  ReadinessValidationIssue,
  SystemAnchor,
  TaskReferenceSubset
} from '../src/shared/types.ts';
import type {
  GenerationValidationContext,
  ReferenceFirstValidator
} from '../src/main/reference-first/validators/validator-registry.ts';

export const runtime: ProjectRuntimeContext = {
  projectId: 'proj-fixtures',
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

export const systemAnchor: SystemAnchor = {
  colorRelationship: '受控对比',
  layoutGrammar: '稳定网格',
  typographyHierarchy: '三级层级',
  materialLanguage: '真实表面',
  crossTouchpointConsistency: '跨触点一致',
  primaryStyleCarrierIds: []
};

export const projectGraphicAnchor: ProjectGraphicAnchor = {
  sourceElements: ['真实来源元素'],
  reconstructedForm: '重构后的图形形态',
  usageRole: 'primary',
  extensionTouchpoints: ['名片', '主视觉']
};

/** 桩 Validator：跳过 / 异常 / 阻断可控。 */
export function makeStub(
  id: string,
  opts: {
    skipped?: boolean;
    issues?: ReadinessValidationIssue[];
    throwError?: boolean;
    required?: boolean;
    stage?: string;
  } = {}
): ReferenceFirstValidator {
  return {
    id,
    stage: (opts.stage as ReferenceFirstValidator['stage']) ?? 'reference_sanitization',
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

/** 完整且通过上游校验的 Validator 上下文（用于 runAllValidators 执行完整性）。 */
export function buildValidContext(): GenerationValidationContext {
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

/** 构建一个有效的 Task Reference Subset（exact 匹配，含资产）。 */
export function validTaskSubset(outputType: GenerationOutputType = 'anchor_vi_system'): TaskReferenceSubset {
  return {
    outputType,
    selectedAssetIds: ['asset-1', 'asset-2', 'asset-3'],
    matchLevel: 'exact',
    artifactPath: `tasks/${outputType}/task-reference-subset.json`
  } as unknown as TaskReferenceSubset;
}

/** 生产编排器输入（与真实 production entry 同源）。 */
export function minimalOrchestratorInput() {
  return {
    jobId: 'job-fixtures',
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
