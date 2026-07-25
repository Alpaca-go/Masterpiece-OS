import type {
  AnchorContradictionValidation,
  AssetAuthenticityDecision,
  CrossArtifactConsistencyValidation,
  GenerationContextManifest,
  GenerationIdentityPack,
  GenerationOutputType,
  GenerationTaskDefinition,
  IdentityPackGranularityValidation,
  ProjectGraphicAnchor,
  ProjectRuntimeContext,
  ReadinessValidationIssue,
  ReferenceFirstValidatorStage,
  ReferenceSignatureGraphic,
  ResolvedProjectFacts,
  SignatureGraphicLeakValidation,
  StructurePolicy,
  StyleCarrier,
  TaskReferenceSubset,
  TaskScopedStyleCarrierSet
} from '../../../shared/types.ts';
import { validateStyleCarriers } from '../protocol/style-carrier-ranking.ts';
import { validateGraphicReconstruction } from '../protocol/graphic-reconstruction.ts';
import { validateAuthenticityDecisions } from '../protocol/asset-authenticity.ts';
import { validateStructureOnlyAssets } from '../protocol/structure-policy.ts';
import { buildReadinessIssue } from '../readiness/generation-readiness-resolver.ts';
import { validateRuntimeFacts } from '../runtime/resolved-project-facts.ts';

/**
 * §3.1 Validator 执行上下文。
 * 由 Generation Readiness Orchestrator 统一构建，所有 Validator 只读该上下文，
 * 禁止各 Validator 自行读取模型原始结果或散落的文件。
 */
export interface GenerationValidationContext {
  jobId: string;
  outputType: GenerationOutputType;
  runtime: ProjectRuntimeContext;
  /** §15 Resolved Project Facts 单一来源；缺失时 Runtime Fact Validator 必须阻断（禁止静默跳过）。 */
  resolvedProjectFacts?: ResolvedProjectFacts;
  identityPack: GenerationIdentityPack;
  identityPackGranularity: IdentityPackGranularityValidation;
  authenticityDecisions: AssetAuthenticityDecision[];
  structurePolicy: StructurePolicy;
  styleCarriers: StyleCarrier[];
  signatureGraphics: ReferenceSignatureGraphic[];
  signatureGraphicLeak?: SignatureGraphicLeakValidation;
  taskReferenceSubsets: TaskReferenceSubset[];
  requiredTaskOutputTypes: GenerationOutputType[];
  primaryTaskReference?: TaskReferenceSubset;
  taskScopedStyleCarriers: TaskScopedStyleCarrierSet[];
  generationTaskDefinition?: GenerationTaskDefinition;
  anchor?: ProjectGraphicAnchor;
  anchorContradiction?: AnchorContradictionValidation;
  crossArtifact?: CrossArtifactConsistencyValidation;
  generationBrief: string;
  generationContextManifest?: GenerationContextManifest;
}

/** §3.2 单个 Validator 的产出（validatorId / stage / 时间戳由编排器补齐）。 */
export interface ValidatorOutcome {
  passed: boolean;
  skipped: boolean;
  issues: ReadinessValidationIssue[];
  artifactPaths: string[];
}

/** §3.1 统一 Validator 接口。validate 为同步实现（编排器兼容 Promise 返回）。 */
export interface ReferenceFirstValidator<
  TContext = GenerationValidationContext
> {
  id: string;
  stage: ReferenceFirstValidatorStage;
  required: boolean;
  validate(context: TContext): ValidatorOutcome;
}

/** §4.1 唯一 ID（禁止临时字符串或重复 ID）。 */
export const VALIDATOR_IDS = {
  STYLE_CARRIER_SANITIZATION: 'style-carrier-sanitization',
  REQUESTED_TASK_COVERAGE: 'requested-task-coverage',
  TASK_SCOPED_STYLE_CARRIER: 'task-scoped-style-carrier',
  STRUCTURE_POLICY: 'structure-policy',
  IDENTITY_PACK: 'identity-pack',
  RUNTIME_FACT: 'runtime-fact',
  ANCHOR_SINGLE_SOURCE: 'anchor-single-source',
  CROSS_ARTIFACT: 'cross-artifact-consistency',
  GENERATION_BRIEF: 'generation-brief'
} as const;

function outcome(
  issues: ReadinessValidationIssue[],
  artifactPaths: string[]
): ValidatorOutcome {
  return {
    passed: issues.every((issue) => issue.severity !== 'blocking'),
    skipped: false,
    issues,
    artifactPaths
  };
}

/** 1. Style Carrier Sanitization Validator：参考身份 / 文案 / 专属图形不得进入 Style Carrier。 */
const styleCarrierSanitizationValidator: ReferenceFirstValidator = {
  id: VALIDATOR_IDS.STYLE_CARRIER_SANITIZATION,
  stage: 'reference_sanitization',
  required: true,
  validate(context) {
    const issues: ReadinessValidationIssue[] = [];
    for (const code of validateStyleCarriers(context.styleCarriers)) {
      issues.push(buildReadinessIssue(code, 'blocking'));
    }
    if (context.signatureGraphicLeak && !context.signatureGraphicLeak.passed) {
      issues.push(buildReadinessIssue('REFERENCE_SIGNATURE_GRAPHIC_IN_STYLE_CARRIERS', 'blocking', {
        receivedValue: context.signatureGraphicLeak.primaryStyleCarrierLeakIds
      }));
    }
    return outcome(issues, [
      'reference/global-style-carrier-ranking.json',
      'reference/reference-signature-graphics.json'
    ]);
  }
};

/** 2. Requested Task Coverage Validator：请求任务必须有真实 Task Reference Subset。 */
const requestedTaskCoverageValidator: ReferenceFirstValidator = {
  id: VALIDATOR_IDS.REQUESTED_TASK_COVERAGE,
  stage: 'task_reference',
  required: true,
  validate(context) {
    const issues: ReadinessValidationIssue[] = [];
    const missingTypes = context.requiredTaskOutputTypes.filter((outputType) => {
      const subset = context.taskReferenceSubsets.find((item) => item.outputType === outputType);
      return !(subset && subset.matchLevel !== 'insufficient' && subset.selectedAssetIds.length);
    });
    if (missingTypes.length > 0) {
      issues.push(buildReadinessIssue('REQUESTED_TASK_SUBSET_MISSING', 'blocking', {
        receivedValue: missingTypes
      }));
    }
    const primaryReady = Boolean(
      context.primaryTaskReference
      && context.primaryTaskReference.matchLevel !== 'insufficient'
      && context.primaryTaskReference.selectedAssetIds.length
    );
    if (!primaryReady) {
      issues.push(buildReadinessIssue('TASK_REFERENCE_MATCH_CONTRADICTION', 'blocking', {
        receivedValue: context.primaryTaskReference?.matchLevel ?? 'missing'
      }));
    }
    return outcome(issues, ['tasks/task-reference-subset.json']);
  }
};

/** 3. Task-Scoped Style Carrier Validator：每个任务的主载体必须 3~6 个且按约束筛选。 */
const taskScopedStyleCarrierValidator: ReferenceFirstValidator = {
  id: VALIDATOR_IDS.TASK_SCOPED_STYLE_CARRIER,
  stage: 'task_style_carrier',
  required: true,
  validate(context) {
    const issues: ReadinessValidationIssue[] = [];
    const offending = context.taskScopedStyleCarriers
      .filter((set) => set.requiredPrimary.length < 3 || set.requiredPrimary.length > 6)
      .map((set) => set.outputType);
    if (offending.length > 0) {
      issues.push(buildReadinessIssue('TASK_STYLE_CARRIER_INCOMPATIBLE', 'blocking', {
        receivedValue: offending
      }));
    }
    return outcome(issues, ['tasks/task-scoped-style-carriers.json']);
  }
};

/** 4. Structure Policy Validator：结构策略必须被解析，未确认资产不得作为结构证据。 */
const structurePolicyValidator: ReferenceFirstValidator = {
  id: VALIDATOR_IDS.STRUCTURE_POLICY,
  stage: 'structure_policy',
  required: true,
  validate(context) {
    const issues: ReadinessValidationIssue[] = [];
    if (!context.structurePolicy.status) {
      issues.push(buildReadinessIssue('STRUCTURE_STATUS_UNRESOLVED', 'blocking'));
    }
    for (const code of validateStructureOnlyAssets(
      context.authenticityDecisions,
      context.identityPack.structurePolicy
    )) {
      issues.push(buildReadinessIssue(code, 'blocking'));
    }
    return outcome(issues, ['current-project/structure-policy.json']);
  }
};

/** 5. Identity Pack Validator：身份包非空、粒度合法、无未核验资产泄漏。 */
const identityPackValidator: ReferenceFirstValidator = {
  id: VALIDATOR_IDS.IDENTITY_PACK,
  stage: 'identity_pack',
  required: true,
  validate(context) {
    const issues: ReadinessValidationIssue[] = [];
    if (context.identityPack.assets.length === 0) {
      issues.push(buildReadinessIssue('GENERATION_IDENTITY_PACK_EMPTY', 'blocking'));
    }
    if (!context.identityPackGranularity.passed) {
      issues.push(buildReadinessIssue('GENERATION_IDENTITY_PACK_GRANULARITY_INVALID', 'blocking', {
        receivedValue: {
          fullPageAssetIds: context.identityPackGranularity.fullPageAssetIds,
          broadLockedAssetIds: context.identityPackGranularity.broadLockedAssetIds,
          legacyStyleContaminatedAssetIds:
            context.identityPackGranularity.legacyStyleContaminatedAssetIds,
          missingRequiredIdentityUsages:
            context.identityPackGranularity.missingRequiredIdentityUsages
        }
      }));
    }
    for (const code of validateAuthenticityDecisions(context.authenticityDecisions)) {
      issues.push(buildReadinessIssue(code, 'blocking'));
    }
    return outcome(issues, ['current-project/generation-identity-pack.json']);
  }
};

/** 6. Runtime Fact Validator：只读取 Resolved Project Facts（§15 单一来源）。 */
const runtimeFactValidator: ReferenceFirstValidator = {
  id: VALIDATOR_IDS.RUNTIME_FACT,
  stage: 'runtime_fact',
  required: true,
  validate(context) {
    // §5.2 禁止静默跳过：缺少依赖产物必须显式阻断。
    if (!context.resolvedProjectFacts) {
      return {
        passed: false,
        skipped: true,
        issues: [buildReadinessIssue('DEPENDENCY_ARTIFACT_MISSING:resolved-project-facts', 'blocking', {
          path: 'runtime/resolved-project-facts.json',
          artifactPath: 'runtime/resolved-project-facts.json'
        })],
        artifactPaths: ['runtime/resolved-project-facts.json']
      };
    }
    const issues: ReadinessValidationIssue[] = [];
    const runtimeFacts = validateRuntimeFacts(context.resolvedProjectFacts);
    if (!runtimeFacts.targetAudienceAvailable) {
      issues.push(buildReadinessIssue('TARGET_AUDIENCE_UNAVAILABLE_NON_BLOCKING', 'warning'));
    }
    return outcome(issues, ['runtime/resolved-project-facts.json']);
  }
};

/** 7. Anchor Single Source Validator：Anchor 单一来源，无参考专属图形泄漏。 */
const anchorSingleSourceValidator: ReferenceFirstValidator = {
  id: VALIDATOR_IDS.ANCHOR_SINGLE_SOURCE,
  stage: 'anchor',
  required: true,
  validate(context) {
    const issues: ReadinessValidationIssue[] = [];
    if (context.anchorContradiction && !context.anchorContradiction.passed) {
      issues.push(buildReadinessIssue('ANCHOR_SINGLE_SOURCE_VIOLATION', 'blocking', {
        receivedValue: context.anchorContradiction.conflictingSourceFields
      }));
    }
    for (const code of validateGraphicReconstruction(context.anchor, context.signatureGraphics)) {
      issues.push(buildReadinessIssue(code, 'blocking'));
    }
    return outcome(issues, ['anchors/project-graphic-anchor.json']);
  }
};

/** 8. Cross-Artifact Consistency Validator：审计报告与执行文档必须一致。 */
const crossArtifactConsistencyValidator: ReferenceFirstValidator = {
  id: VALIDATOR_IDS.CROSS_ARTIFACT,
  stage: 'cross_artifact',
  required: true,
  validate(context) {
    const issues: ReadinessValidationIssue[] = [];
    if (context.crossArtifact && !context.crossArtifact.passed) {
      issues.push(buildReadinessIssue('AUDIT_BRIEF_TASK_MISMATCH', 'blocking', {
        receivedValue: context.crossArtifact.contradictions
      }));
    }
    return outcome(issues, ['generation/generation-context-manifest.json']);
  }
};

/** 9. Generation Brief Validator：Brief 必须声明请求任务详情。 */
const generationBriefValidator: ReferenceFirstValidator = {
  id: VALIDATOR_IDS.GENERATION_BRIEF,
  stage: 'brief_compilation',
  required: true,
  validate(context) {
    const issues: ReadinessValidationIssue[] = [];
    const briefReady = Boolean(
      context.generationBrief.trim()
      && context.primaryTaskReference
      && context.generationBrief.includes(context.primaryTaskReference.outputType)
    );
    if (!briefReady) {
      issues.push(buildReadinessIssue('GENERATION_BRIEF_MISSING_TASK_DETAILS', 'blocking', {
        receivedValue: context.primaryTaskReference
          ? `brief 未声明 outputType=${context.primaryTaskReference.outputType}`
          : 'primary task reference subset missing'
      }));
    }
    const taskDefinitionReady = context.generationTaskDefinition
      ? Boolean(context.generationTaskDefinition.outputType)
      : true;
    if (!taskDefinitionReady) {
      issues.push(buildReadinessIssue('GENERATION_TASK_DEFINITION_INCOMPLETE', 'blocking'));
    }
    return outcome(issues, ['generation/generation-brief.md']);
  }
};

/**
 * §3.3 唯一 Registry。
 * 禁止在不同文件中手工维护不同 Validator 列表；新增 Validator 必须注册在这里，
 * 并在 VALIDATOR_IDS 中登记唯一 ID。
 */
export const REFERENCE_FIRST_VALIDATORS: ReferenceFirstValidator[] = [
  styleCarrierSanitizationValidator,
  requestedTaskCoverageValidator,
  taskScopedStyleCarrierValidator,
  structurePolicyValidator,
  identityPackValidator,
  runtimeFactValidator,
  anchorSingleSourceValidator,
  crossArtifactConsistencyValidator,
  generationBriefValidator
];
