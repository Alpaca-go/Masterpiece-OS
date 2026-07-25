import type {
  AnchorContradictionValidation,
  AssetAuthenticityDecision,
  BrandCopyRecord,
  CrossArtifactConsistencyValidation,
  CurrentProjectAssetDecision,
  EvidenceBoundFact,
  GenerationContextManifest,
  GenerationIdentityPack,
  GenerationOutputType,
  GenerationReadinessGate,
  GenerationReadinessResult,
  GenerationTaskDefinition,
  GlobalStyleCarrierRanking,
  IdentityPackGranularityValidation,
  ProjectGraphicAnchor,
  ProjectRuntimeContext,
  ReadinessValidationIssue,
  ReferenceFirstValidatorResult,
  ReferenceSignatureGraphic,
  ResolvedProjectFacts,
  SignatureGraphicLeakValidation,
  StructurePolicy,
  StyleCarrier,
  SystemAnchor,
  TaskDefinitionSeed,
  TaskReferenceSubset,
  TaskScopedStyleCarrierSet,
  ValidatorExecutionManifest
} from '../../../shared/types.ts';
import { resolveAssetAuthenticity } from '../protocol/asset-authenticity.ts';
import { buildStructurePolicy } from '../protocol/structure-policy.ts';
import { buildGenerationIdentityPack, validateIdentityPackGranularity } from '../protocol/identity-pack.ts';
import { compileTaskScopedStyleCarriers } from '../protocol/style-carrier-ranking.ts';
import { validateAnchorContradiction } from '../protocol/anchor-section.ts';
import { validateCrossArtifactConsistency } from '../protocol/cross-artifact.ts';
import { evaluateGenerationReadiness } from '../protocol/generation-readiness.ts';
import { compileTaskDefinition } from './task-definition-compiler.ts';
import {
  buildReadinessIssue,
  resolveGenerationReadinessResult
} from '../readiness/generation-readiness-resolver.ts';
import { runAllValidators } from '../validators/run-all-validators.ts';
import { REFERENCE_FIRST_VALIDATORS } from '../validators/validator-registry.ts';
import { validateValidatorRegistry } from '../validators/validator-registry-validation.ts';
import type { GenerationValidationContext } from '../validators/validator-registry.ts';
import { resolveProjectFacts, RESOLVED_PROJECT_FACTS_PATH } from './resolved-project-facts.ts';

const STRUCTURE_CONFIRMED_STATUSES = ['locked', 'user_confirmed', 'real_structure_detected'];
const DEFAULT_PRIMARY_OUTPUT_TYPE: GenerationOutputType = 'anchor_vi_system';

/** §12 闭环产物的规范相对路径，供审计报告与执行文档共享同一 manifest。 */
export const READINESS_ARTIFACT_PATHS = {
  projectRuntimeContext: 'current-project-runtime-context.json',
  generationIdentityPack: 'current-project/generation-identity-pack.json',
  structurePolicy: 'current-project/structure-policy.json',
  referenceSignatureGraphics: 'reference/reference-signature-graphics.json',
  globalStyleCarrierRanking: 'reference/global-style-carrier-ranking.json',
  taskReferenceSubset: 'tasks/task-reference-subset.json',
  systemAnchor: 'anchors/system-anchor.json',
  projectGraphicAnchor: 'anchors/project-graphic-anchor.json',
  generationBrief: 'generation/generation-brief.md',
  analysisAuditReport: 'generation/analysis-audit-report.md',
  generationContextManifest: 'generation/generation-context-manifest.json',
  generationReadiness: 'validation/generation-readiness.json',
  generationReadinessResult: 'validation/generation-readiness-result.json',
  crossArtifactConsistency: 'validation/cross-artifact-consistency.json',
  validatorExecutionManifest: 'validation/validator-execution-manifest.json',
  resolvedProjectFacts: RESOLVED_PROJECT_FACTS_PATH
} as const;

export interface GenerationReadinessOrchestratorInput {
  jobId: string;
  runtime: ProjectRuntimeContext;
  assetDecisions: CurrentProjectAssetDecision[];
  facts: EvidenceBoundFact[];
  observedCopy: BrandCopyRecord[];
  /** 协议形态的全局 Style Carrier Ranking（reference master set 的 styleCarriers）。 */
  styleCarriers: StyleCarrier[];
  referenceSignatureGraphics: ReferenceSignatureGraphic[];
  requestedTaskOutputTypes: GenerationOutputType[];
  requiredTaskOutputTypes?: GenerationOutputType[];
  taskReferenceSubsets: TaskReferenceSubset[];
  systemAnchor: SystemAnchor;
  projectGraphicAnchor: ProjectGraphicAnchor;
  auditReport: string;
  generationBrief: string;
  briefStatesTaskDefinition: boolean;
  targetAudience?: string[];
  legacyObservations?: string[];
  fullPageAssetIds?: string[];
  signatureGraphicLeak?: SignatureGraphicLeakValidation;
  identityAssetIds?: string[];
  /** §3 每个输出类型的任务约束种子（决定摄影/空间/动效是否允许）。 */
  taskSeedsByOutputType?: Partial<Record<GenerationOutputType, TaskDefinitionSeed>>;
}

export interface GenerationReadinessOrchestratorResult {
  authenticityDecisions: AssetAuthenticityDecision[];
  structurePolicy: StructurePolicy;
  identityPack: GenerationIdentityPack;
  identityPackGranularity: IdentityPackGranularityValidation;
  globalStyleCarrierRanking: GlobalStyleCarrierRanking;
  taskScopedStyleCarriers: TaskScopedStyleCarrierSet[];
  generationTaskDefinitions: GenerationTaskDefinition[];
  anchorContradiction: AnchorContradictionValidation;
  crossArtifactConsistency: CrossArtifactConsistencyValidation;
  generationReadiness: GenerationReadinessGate;
  /** §ValidationIssue 聚合与 Readiness 单一事实源：所有报告 / UI 共用的根因与派生症状。 */
  generationReadinessResult: GenerationReadinessResult;
  generationContextManifest: GenerationContextManifest;
  /** §5/§7 Validator Registry 完整执行结果（每个 Validator 独立结果）。 */
  validatorResults: ReferenceFirstValidatorResult[];
  /** §7 执行清单：注册 / 执行 / 跳过 / 失败，供落盘证明无静默跳过。 */
  validatorExecutionManifest: ValidatorExecutionManifest;
  /** §15 Resolved Project Facts 单一来源。 */
  resolvedProjectFacts: ResolvedProjectFacts;
  primaryOutputType: GenerationOutputType;
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function buildAuthenticityDecisions(
  decisions: CurrentProjectAssetDecision[],
  runtime: ProjectRuntimeContext
): AssetAuthenticityDecision[] {
  return decisions.map((decision) => {
    const roles = unique([decision.role, ...(decision.roles || [])]);
    const locked = (decision.lockedEvidence?.length ?? 0) > 0 || roles.includes('locked_asset_evidence');
    return resolveAssetAuthenticity(
      {
        assetId: decision.assetId,
        observedAuthenticity: decision.authenticity,
        observedCapabilities: {
          canProveIdentity: decision.canProveIdentity
            ?? roles.some((role) => ['brand_identity_evidence', 'logo_evidence', 'logo_typography_evidence', 'brand_name_evidence'].includes(role)),
          canProveProductFact: decision.canProveProductFact
            ?? roles.some((role) => ['product_fact_evidence', 'service_fact_evidence'].includes(role)),
          canProveStructure: decision.canProveStructure
            ?? roles.some((role) => ['confirmed_structure_evidence', 'packaging_structure_evidence', 'product_structure_evidence'].includes(role)),
          canProveLockedAsset: locked
        },
        confidence: decision.confidence,
        reason: decision.keepReason
      },
      runtime
    );
  });
}

function pickPrimaryOutputType(
  requested: GenerationOutputType[],
  subsets: TaskReferenceSubset[]
): GenerationOutputType {
  const available = unique([...requested, ...subsets.map((item) => item.outputType)]);
  if (available.includes(DEFAULT_PRIMARY_OUTPUT_TYPE)) return DEFAULT_PRIMARY_OUTPUT_TYPE;
  return available[0] ?? DEFAULT_PRIMARY_OUTPUT_TYPE;
}

/**
 * §14 生产链路 Generation Readiness 闭环编排。
 * 将生产真实产物适配为协议输入，统一调用协议校验器，产出可落盘的 readiness / cross-artifact / manifest。
 * 该函数不抛错，也不阻断报告生成；阻断信息以 GenerationReadinessGate 形式呈现给客户端。
 */
export function orchestrateGenerationReadiness(
  input: GenerationReadinessOrchestratorInput
): GenerationReadinessOrchestratorResult {
  const authenticityDecisions = buildAuthenticityDecisions(input.assetDecisions, input.runtime);
  const structurePolicy = buildStructurePolicy(authenticityDecisions, undefined, input.legacyObservations || []);
  const identityPack = buildGenerationIdentityPack({
    runtime: input.runtime,
    assetDecisions: input.assetDecisions,
    authenticityDecisions,
    facts: input.facts,
    copy: input.observedCopy,
    structurePolicy,
    fullPageAssetIds: input.fullPageAssetIds || []
  });
  const identityPackGranularity = validateIdentityPackGranularity(identityPack);

  const outputTypes = unique([
    ...input.requestedTaskOutputTypes,
    ...input.taskReferenceSubsets.map((item) => item.outputType)
  ]);
  const taskScopedStyleCarriers = outputTypes.map((outputType) =>
    compileTaskScopedStyleCarriers(input.styleCarriers, outputType, input.taskSeedsByOutputType?.[outputType])
  );
  const generationTaskDefinitions = outputTypes.map((outputType) => {
    const scoped = taskScopedStyleCarriers.find((set) => set.outputType === outputType);
    return compileTaskDefinition({
      outputType,
      runtime: input.runtime,
      structurePolicy,
      styleCarriers: input.styleCarriers,
      taskScopedPrimary: scoped?.requiredPrimary,
      taskScopedSupporting: scoped?.supportingSecondary
    });
  });

  const globalStyleCarrierRanking: GlobalStyleCarrierRanking = {
    primary: input.styleCarriers.filter((item) => item.priority === 'primary'),
    secondary: input.styleCarriers.filter((item) => item.priority === 'secondary'),
    optional: input.styleCarriers.filter((item) => item.priority === 'optional')
  };

  const primaryOutputType = pickPrimaryOutputType(input.requestedTaskOutputTypes, input.taskReferenceSubsets);
  const primaryTaskReference = input.taskReferenceSubsets.find((item) => item.outputType === primaryOutputType)
    ?? input.taskReferenceSubsets[0];
  const primaryTaskDefinition = generationTaskDefinitions.find((item) => item.outputType === primaryOutputType)
    ?? generationTaskDefinitions[0];

  const anchorContradiction = validateAnchorContradiction({
    systemAnchor: input.systemAnchor,
    projectGraphicAnchor: input.projectGraphicAnchor,
    legacyAnchorText: undefined,
    signatureGraphics: input.referenceSignatureGraphics
  });

  const requiredOutputTypes = input.requiredTaskOutputTypes ?? input.requestedTaskOutputTypes;
  const requestedTaskSubsetReady = requiredOutputTypes.every((outputType) => {
    const subset = input.taskReferenceSubsets.find((item) => item.outputType === outputType);
    return Boolean(subset && subset.matchLevel !== 'insufficient' && subset.selectedAssetIds.length);
  });

  const promptStatesStructure = STRUCTURE_CONFIRMED_STATUSES.includes(structurePolicy.status);
  const taskDefinitionPresent = generationTaskDefinitions.length > 0;
  const crossArtifactConsistency = validateCrossArtifactConsistency({
    auditOutputType: primaryOutputType,
    briefOutputType: primaryOutputType,
    taskSubsetOutputTypes: input.taskReferenceSubsets.map((item) => item.outputType),
    primaryCarrierLeakIds: input.signatureGraphicLeak?.primaryStyleCarrierLeakIds,
    structurePolicyStatus: structurePolicy.status,
    promptStatesStructure,
    legacyAnchorPresent: false,
    referenceFirstAnchorPresent: true,
    auditIdentityAssetIds: input.identityAssetIds,
    briefIdentityAssetIds: input.identityAssetIds,
    auditTaskDefinitionPresent: taskDefinitionPresent,
    briefTaskDefinitionPresent: taskDefinitionPresent && input.briefStatesTaskDefinition
  });

  const generationContextManifest: GenerationContextManifest = {
    jobId: input.jobId,
    outputType: primaryOutputType,
    identityPackArtifactId: READINESS_ARTIFACT_PATHS.generationIdentityPack,
    generationBriefArtifactId: READINESS_ARTIFACT_PATHS.generationBrief,
    taskReferenceSubsetArtifactId: primaryTaskReference?.artifactPath || READINESS_ARTIFACT_PATHS.taskReferenceSubset,
    systemAnchorId: READINESS_ARTIFACT_PATHS.systemAnchor,
    projectGraphicAnchorId: READINESS_ARTIFACT_PATHS.projectGraphicAnchor,
    structurePolicyId: READINESS_ARTIFACT_PATHS.structurePolicy,
    taskScopedStyleCarrierIds: unique(
      taskScopedStyleCarriers.flatMap((set) => set.requiredPrimary.map((item) => item.id))
    ),
    validationStatus: 'needs_review'
  };

  const generationReadiness = evaluateGenerationReadiness({
    identityPack,
    authenticityDecisions,
    styleCarriers: input.styleCarriers,
    taskReference: primaryTaskReference,
    anchor: input.projectGraphicAnchor,
    signatureGraphics: input.referenceSignatureGraphics,
    generationBrief: input.generationBrief,
    targetAudience: input.targetAudience,
    taskScopedStyleCarriers,
    generationTaskDefinition: primaryTaskDefinition,
    generationContextManifest,
    anchorContradiction,
    crossArtifact: crossArtifactConsistency,
    signatureGraphicLeak: input.signatureGraphicLeak,
    identityPackGranularity,
    requestedTaskSubsetReady
  });

  generationContextManifest.validationStatus = generationReadiness.status;

  // §15 Resolved Project Facts 单一来源：审计报告 / Runtime Fact Validator / UI 都读取该产物。
  const resolvedProjectFacts = resolveProjectFacts({
    runtime: input.runtime,
    targetAudience: input.targetAudience
  });

  // §3 构建统一 Validator 执行上下文（所有 Validator 只读该上下文，禁止各自读取散落产物）。
  const validationContext: GenerationValidationContext = {
    jobId: input.jobId,
    outputType: primaryOutputType,
    runtime: input.runtime,
    resolvedProjectFacts,
    identityPack,
    identityPackGranularity,
    authenticityDecisions,
    structurePolicy,
    styleCarriers: input.styleCarriers,
    signatureGraphics: input.referenceSignatureGraphics,
    signatureGraphicLeak: input.signatureGraphicLeak,
    taskReferenceSubsets: input.taskReferenceSubsets,
    requiredTaskOutputTypes: requiredOutputTypes,
    primaryTaskReference,
    taskScopedStyleCarriers,
    generationTaskDefinition: primaryTaskDefinition,
    anchor: input.projectGraphicAnchor,
    anchorContradiction,
    crossArtifact: crossArtifactConsistency,
    generationBrief: input.generationBrief,
    generationContextManifest
  };

  // §6 Registry 完整性校验（重复 / 缺失 / 未登记）；不抛错，异常转为编排级阻断问题。
  const registryValidation = validateValidatorRegistry();
  // §5 执行全部 Validator，产出完整结果 + 执行清单 + 编排级问题。
  const {
    results: validatorResults,
    manifest: validatorExecutionManifest,
    orchestrationIssues
  } = runAllValidators(validationContext);

  const combinedOrchestrationIssues: ReadinessValidationIssue[] = [...orchestrationIssues];
  if (!registryValidation.passed) {
    combinedOrchestrationIssues.push(
      buildReadinessIssue('VALIDATOR_EXECUTION_INCOMPLETE', 'blocking', {
        receivedValue: registryValidation
      })
    );
  }

  // §8/§11 单一事实源：沿用已测试的 gate 聚合语义，并纳入执行清单与编排级问题，
  // 确保执行层「无静默跳过」的信息进入同一份 GenerationReadinessResult。
  const generationReadinessResult = resolveGenerationReadinessResult({
    gate: generationReadiness,
    jobId: input.jobId,
    outputType: primaryOutputType,
    manifest: validatorExecutionManifest,
    orchestrationIssues: combinedOrchestrationIssues
  });

  // §14 生产调试日志（仅 REFERENCE_FIRST_DEBUG=1 时启用），便于审计 Validator 执行完整性。
  if (process.env.REFERENCE_FIRST_DEBUG === '1') {
    console.log('[ReferenceFirst] Registered validators:', REFERENCE_FIRST_VALIDATORS.length);
    console.log('[ReferenceFirst] Registered validator IDs:', REFERENCE_FIRST_VALIDATORS.map((item) => item.id));
    console.log('[ReferenceFirst] Executed validators:', validatorResults.length);
    console.log('[ReferenceFirst] Root issues:', generationReadinessResult.rootIssues.map((item) => item.code));
    console.log('[ReferenceFirst] Derived issues:', generationReadinessResult.derivedIssues.map((item) => item.code));
    console.log('[ReferenceFirst] Warnings:', generationReadinessResult.warnings.map((item) => item.code));
    console.log('[ReferenceFirst] Job ID:', input.jobId);
    console.log(
      '[ReferenceFirst] Validator coverage:',
      validatorExecutionManifest.complete
        ? `complete (${validatorExecutionManifest.executedValidatorCount}/${validatorExecutionManifest.expectedValidatorCount})`
        : `incomplete (${validatorExecutionManifest.executedValidatorCount}/${validatorExecutionManifest.expectedValidatorCount})`
    );
  }

  return {
    authenticityDecisions,
    structurePolicy,
    identityPack,
    identityPackGranularity,
    globalStyleCarrierRanking,
    taskScopedStyleCarriers,
    generationTaskDefinitions,
    anchorContradiction,
    crossArtifactConsistency,
    generationReadiness,
    generationReadinessResult,
    generationContextManifest,
    validatorResults,
    validatorExecutionManifest,
    resolvedProjectFacts,
    primaryOutputType
  };
}
