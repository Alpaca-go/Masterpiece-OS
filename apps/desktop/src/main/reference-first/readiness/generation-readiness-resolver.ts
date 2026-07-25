import type {
  GenerationOutputType,
  GenerationReadinessGate,
  GenerationReadinessResult,
  ReadinessValidationIssue,
  ReadinessValidationIssueCategory,
  ReadinessValidationIssueSeverity,
  ReadinessValidatorResult,
  ReadinessValidationAggregation,
  ReferenceFirstValidatorResult,
  ValidatorExecutionManifest
} from '../../../shared/types.ts';
import { aggregateValidationIssues } from './validation-issue-aggregator.ts';
import { VALIDATOR_IDS } from '../validators/validator-registry.ts';
import {
  ISSUE_DEPENDENCY_GRAPH,
  categoryHasSeverity,
  codePrefix,
  statusLabel
} from './issue-dependency-graph.ts';

interface ReadinessIssueDescriptor {
  category: ReadinessValidationIssueCategory;
  path: string;
  message: string;
  repairInstruction: string;
  artifactPath: string;
  sourceValidator: string;
  autoRepairable: boolean;
  requiresHumanReview: boolean;
  causedByIssueCodes?: string[];
}

/**
 * §3 / §4 错误码 → 项目无关富信息描述（失败字段 / 产物路径 / 来源 Validator / 修复建议）。
 * 键为错误码前缀；对齐 evaluateGenerationReadiness 实际产出。
 * 仅按前缀归类，不含任何品牌 / 行业 / 资产名。
 */
const CODE_DESCRIPTORS: Record<string, ReadinessIssueDescriptor> = {
  GENERATION_IDENTITY_PACK_EMPTY: {
    category: 'identity_pack',
    path: 'generationIdentityPack.assets',
    message: '生图身份包没有任何资产（缺少可证明身份的 Logo / 字标 / 品牌名 / 产品事实）。',
    repairInstruction: '为当前项目补充可证明身份的 Logo / 字标 / 品牌名 / 产品事实资产，并重新执行资产决策。',
    artifactPath: 'current-project/generation-identity-pack.json',
    sourceValidator: 'Identity Pack Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  GENERATION_IDENTITY_PACK_GRANULARITY_INVALID: {
    category: 'identity_pack',
    path: 'generationIdentityPack.assets[].usage',
    message: '身份包粒度无效：锁定资产或旧视觉资产被错误声明为可继承风格。',
    repairInstruction: '校验身份包资产用途，锁定资产仅供身份保留，旧视觉资产仅保留结构信息。',
    artifactPath: 'current-project/generation-identity-pack.json',
    sourceValidator: 'Identity Pack Validator',
    autoRepairable: false,
    requiresHumanReview: true,
    causedByIssueCodes: ['UNVERIFIED_ASSET_ENTERED_GENERATION_PACK', 'STRUCTURE_ONLY_ASSET_INVALID', 'UNVERIFIED_STRUCTURE_MARKED_CONFIRMED']
  },
  STRUCTURE_STATUS_UNRESOLVED: {
    category: 'structure_policy',
    path: 'structurePolicy.status',
    message: '结构策略未被解析：缺少已确认 / 用户确认的结构证据。',
    repairInstruction: '提供已确认结构证据或退回 open_for_redesign，并等待用户确认。',
    artifactPath: 'current-project/structure-policy.json',
    sourceValidator: 'Structure Policy Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  REFERENCE_IDENTITY_IN_STYLE_CARRIER: {
    category: 'reference_sanitization',
    path: 'styleCarrierRanking.contaminationTypes',
    message: 'Style Carrier 继承了参考品牌身份（品牌名 / Logo / 口号）。',
    repairInstruction: '在 Ranking 前过滤参考品牌身份，仅保留抽象视觉规律。',
    artifactPath: 'reference/global-style-carrier-ranking.json',
    sourceValidator: 'Style Carrier Sanitization Validator',
    autoRepairable: false,
    requiresHumanReview: false
  },
  REFERENCE_SIGNATURE_GRAPHIC_IN_STYLE_CARRIER: {
    category: 'reference_sanitization',
    path: 'styleCarrierRanking.signatureGraphicIds',
    message: 'Style Carrier 继承了参考专属图形。',
    repairInstruction: '将参考专属图形从 Style Carrier 中移除，仅继承其重复 / 密度 / 层级规律。',
    artifactPath: 'reference/reference-signature-graphics.json',
    sourceValidator: 'Style Carrier Sanitization Validator',
    autoRepairable: false,
    requiresHumanReview: false
  },
  REFERENCE_SIGNATURE_GRAPHIC_IN_STYLE_CARRIERS: {
    category: 'reference_sanitization',
    path: 'referenceSignatureGraphics.forbiddenToCopy',
    message: '存在未被隔离的参考专属图形泄漏。',
    repairInstruction: '将所有参考专属图形标记为 forbiddenToCopy，禁止复制其形状。',
    artifactPath: 'reference/reference-signature-graphics.json',
    sourceValidator: 'Reference Identity Filter',
    autoRepairable: false,
    requiresHumanReview: false
  },
  REFERENCE_COPY_IN_STYLE_CARRIER: {
    category: 'reference_sanitization',
    path: 'styleCarrierRanking.contaminationTypes',
    message: 'Style Carrier 继承了参考文案 / 口号。',
    repairInstruction: '将参考文案 / 口号从 Style Carrier 中移除。',
    artifactPath: 'reference/global-style-carrier-ranking.json',
    sourceValidator: 'Style Carrier Sanitization Validator',
    autoRepairable: false,
    requiresHumanReview: false
  },
  ANCHOR_SINGLE_SOURCE_VIOLATION: {
    category: 'anchor',
    path: 'anchors/project-graphic-anchor.json',
    message: 'Anchor 存在多源冲突（旧 Legacy Anchor 与参考优先 Anchor 并存）。',
    repairInstruction: '移除旧 Legacy Anchor，仅保留参考优先 Project Graphic Anchor。',
    artifactPath: 'anchors/project-graphic-anchor.json',
    sourceValidator: 'Anchor Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  REQUESTED_TASK_SUBSET_MISSING: {
    category: 'task_reference',
    path: 'taskReferenceSubset.artifactPath',
    message: '请求任务的 Task Reference Subset 缺失或不足。',
    repairInstruction: '为当前请求任务重新执行任务参考筛选，生成真实 Task Reference Subset。',
    artifactPath: 'tasks/<output-type>/task-reference-subset.json',
    sourceValidator: 'Requested Task Coverage Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  TASK_STYLE_CARRIER_INCOMPATIBLE: {
    category: 'task_style_carrier',
    path: 'taskScopedStyleCarriers.requiredPrimary',
    message: 'Task-Scoped Style Carriers 数量不在 3~6 或未完成按约束筛选。',
    repairInstruction: '按 outputType 与摄影 / 空间 / 动效约束重新编译 Task-Scoped Style Carriers。',
    artifactPath: 'tasks/<output-type>/task-scoped-style-carriers.json',
    sourceValidator: 'Task-Scoped Style Carrier Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  GENERATION_TASK_DEFINITION_INCOMPLETE: {
    category: 'brief_compilation',
    path: 'generationTaskDefinition.outputType',
    message: 'Generation Task Definition 缺少 outputType。',
    repairInstruction: '确保 Generation Task Definition 声明合法的 outputType。',
    artifactPath: 'generation/generation-brief.md',
    sourceValidator: 'Generation Brief Validator',
    autoRepairable: false,
    requiresHumanReview: false
  },
  AUDIT_BRIEF_TASK_MISMATCH: {
    category: 'cross_artifact',
    path: 'generationContextManifest.outputType',
    message: '审计报告与执行文档的 outputType 不一致。',
    repairInstruction: '统一审计报告与执行文档的 outputType 与 Task Subset。',
    artifactPath: 'generation/generation-context-manifest.json',
    sourceValidator: 'Cross-Artifact Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  TASK_REFERENCE_MATCH_CONTRADICTION: {
    category: 'task_reference',
    path: 'taskReferenceSubset.matchLevel',
    message: 'Task Reference 匹配级别与资产选择矛盾。',
    repairInstruction: '重新执行任务参考筛选，使 matchLevel 与 selectedAssetIds 一致。',
    artifactPath: 'tasks/<output-type>/task-reference-subset.json',
    sourceValidator: 'Requested Task Coverage Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  UNVERIFIED_ASSET_ENTERED_GENERATION_PACK: {
    category: 'identity_pack',
    path: 'generationIdentityPack.assets',
    message: '未经核验的资产进入生图身份包。',
    repairInstruction: '移除未经核验 / 未确认结构的资产，仅保留已确认资产。',
    artifactPath: 'current-project/generation-identity-pack.json',
    sourceValidator: 'Identity Pack Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  STRUCTURE_ONLY_ASSET_INVALID: {
    category: 'structure_policy',
    path: 'structurePolicy.confirmedAssetIds',
    message: '未确认资产被用作结构证据。',
    repairInstruction: '未确认资产不得作为结构证据；解析为 open_for_redesign 或请用户确认。',
    artifactPath: 'current-project/structure-policy.json',
    sourceValidator: 'Structure Policy Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  UNVERIFIED_STRUCTURE_MARKED_CONFIRMED: {
    category: 'structure_policy',
    path: 'structurePolicy.status',
    message: '策略声明为 confirmed 却含未确认结构资产。',
    repairInstruction: '未确认结构不得标记为 confirmed；退回 open_for_redesign 或获取用户确认。',
    artifactPath: 'current-project/structure-policy.json',
    sourceValidator: 'Structure Policy Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  TARGET_AUDIENCE_UNAVAILABLE_NON_BLOCKING: {
    category: 'readiness',
    path: 'generationContextManifest.targetAudience',
    message: '缺少目标用户上下文（非阻断，仅建议补充以优化生图）。',
    repairInstruction: '补充目标用户画像，提升生图上下文质量。',
    artifactPath: 'generation/generation-context-manifest.json',
    sourceValidator: 'Runtime Fact Validator',
    autoRepairable: true,
    requiresHumanReview: false
  },
  // —— 文档示意码（当前校验器未直接产出，保留以便未来接入）——
  LEGACY_ANCHOR_COMPILER_ACTIVE: {
    category: 'anchor',
    path: 'anchors/legacy-anchor.json',
    message: '仍使用旧版 Anchor 编译器。',
    repairInstruction: '切换到参考优先 Anchor 编译器。',
    artifactPath: 'anchors/legacy-anchor.json',
    sourceValidator: 'Anchor Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  PROJECT_GRAPHIC_ANCHOR_CONTRADICTION: {
    category: 'anchor',
    path: 'anchors/project-graphic-anchor.json',
    message: 'Project Graphic Anchor 与 System Anchor 矛盾。',
    repairInstruction: '修正 Project Graphic Anchor 使其与 System Anchor 一致。',
    artifactPath: 'anchors/project-graphic-anchor.json',
    sourceValidator: 'Anchor Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  PROJECT_RUNTIME_FACTS_NOT_RESOLVED: {
    category: 'runtime_fact',
    path: 'current-project-runtime-context.json',
    message: '项目运行期事实未解析。',
    repairInstruction: '补齐项目运行期事实（资产决策 / 证据）。',
    artifactPath: 'current-project-runtime-context.json',
    sourceValidator: 'Runtime Fact Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  FULL_PAGE_ASSET_ENTERED_IDENTITY_PACK: {
    category: 'identity_pack',
    path: 'generationIdentityPack.assets',
    message: '整页资产进入身份包。',
    repairInstruction: '整页资产需拆解或仅保留结构信息。',
    artifactPath: 'current-project/generation-identity-pack.json',
    sourceValidator: 'Identity Pack Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  LOCKED_ASSET_USAGE_TOO_BROAD: {
    category: 'identity_pack',
    path: 'generationIdentityPack.assets[].usage',
    message: '锁定资产用途声明过宽。',
    repairInstruction: '收紧锁定资产用途声明，仅用于身份保留。',
    artifactPath: 'current-project/generation-identity-pack.json',
    sourceValidator: 'Identity Pack Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  AUDIT_BRIEF_STYLE_CARRIER_MISMATCH: {
    category: 'cross_artifact',
    path: 'generationContextManifest.styleCarrierIds',
    message: '审计与执行文档的 Style Carrier 不一致。',
    repairInstruction: '统一两报告的 Style Carrier 列表。',
    artifactPath: 'generation/generation-context-manifest.json',
    sourceValidator: 'Cross-Artifact Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  GENERATION_IDENTITY_PACK_INVALID: {
    category: 'identity_pack',
    path: 'generationIdentityPack',
    message: '生图身份包无效（含未确认资产）。',
    repairInstruction: '移除未确认资产后重建身份包。',
    artifactPath: 'current-project/generation-identity-pack.json',
    sourceValidator: 'Identity Pack Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  GENERATION_CONTEXT_MANIFEST_INCOMPLETE: {
    category: 'brief_compilation',
    path: 'generationContextManifest',
    message: 'Generation Context Manifest 不完整。',
    repairInstruction: '补齐 Manifest 的 Identity Pack / Brief / Task Subset 引用。',
    artifactPath: 'generation/generation-context-manifest.json',
    sourceValidator: 'Generation Brief Validator',
    autoRepairable: false,
    requiresHumanReview: true
  },
  GENERATION_BRIEF_MISSING_TASK_DETAILS: {
    category: 'brief_compilation',
    path: 'generationBrief.outputType',
    message: 'Generation Brief 缺少任务详情（未声明对应 outputType 或为空）。',
    repairInstruction: '先修复上游任务子集 / Task-Scoped Style Carriers / 结构策略 / 身份包，再重新编译 Generation Brief。',
    artifactPath: 'generation/generation-brief.md',
    sourceValidator: 'Generation Brief Validator',
    autoRepairable: false,
    requiresHumanReview: false,
    causedByIssueCodes: ISSUE_DEPENDENCY_GRAPH.GENERATION_BRIEF_MISSING_TASK_DETAILS
  },
  // —— §5/§7/§8 Validator Registry 执行编排产出的编排级错误码 ——
  VALIDATOR_EXECUTION_FAILED: {
    category: 'readiness',
    path: 'validation/validator-execution-manifest.json',
    message: 'Validator 执行失败（抛出异常）。',
    repairInstruction: '检查 Validator 依赖产物、执行顺序和异常日志。',
    artifactPath: 'validation/validator-execution-manifest.json',
    sourceValidator: 'validator-registry',
    autoRepairable: false,
    requiresHumanReview: true
  },
  VALIDATOR_EXECUTION_INCOMPLETE: {
    category: 'readiness',
    path: 'validation/validator-execution-manifest.json',
    message: 'Validator 执行不完整：已执行数量少于注册数量。',
    repairInstruction: '检查 Validator Registry 与 runAllValidators 编排，确保全部已注册 Validator 都被执行。',
    artifactPath: 'validation/validator-execution-manifest.json',
    sourceValidator: 'validator-registry',
    autoRepairable: false,
    requiresHumanReview: true
  },
  VALIDATOR_RESULT_MISSING: {
    category: 'readiness',
    path: 'validation/validator-execution-manifest.json',
    message: '缺少某个已注册 Validator 的执行结果。',
    repairInstruction: '检查 Validator Registry 和 runAllValidators 编排。',
    artifactPath: 'validation/validator-execution-manifest.json',
    sourceValidator: 'validator-registry',
    autoRepairable: false,
    requiresHumanReview: true
  },
  DEPENDENCY_ARTIFACT_MISSING: {
    category: 'readiness',
    path: 'validation/validator-execution-manifest.json',
    message: 'Validator 依赖的上游产物缺失，无法执行校验（禁止静默跳过）。',
    repairInstruction: '先生成缺失的上游产物，再重新运行闭环校验。',
    artifactPath: 'validation/validator-execution-manifest.json',
    sourceValidator: 'validator-registry',
    autoRepairable: false,
    requiresHumanReview: true
  },
  VALIDATOR_SKIPPED_REQUIRED_DEPENDENCY: {
    category: 'readiness',
    path: 'validation/validator-execution-manifest.json',
    message: '必需 Validator 因依赖缺失被跳过（required Validator 跳过视为 blocking）。',
    repairInstruction: '补齐依赖产物；required Validator 不允许静默跳过。',
    artifactPath: 'validation/validator-execution-manifest.json',
    sourceValidator: 'validator-registry',
    autoRepairable: false,
    requiresHumanReview: true
  },
  VALIDATOR_SKIPPED_UPSTREAM_BLOCKED: {
    category: 'readiness',
    path: 'validation/validator-execution-manifest.json',
    message: '上游校验未通过，Brief 校验被阶段化推迟（不阻断，待上游修复后重跑）。',
    repairInstruction: '先修复上游阻断项（Style Carrier 净化和任务子集 / 结构策略 / 身份包），再重新编译并校验 Generation Brief。',
    artifactPath: 'validation/validator-execution-manifest.json',
    sourceValidator: 'validator-registry',
    autoRepairable: false,
    requiresHumanReview: false
  },
  HUMAN_REVIEW_REQUIRED: {
    category: 'readiness',
    path: 'generationContextManifest',
    message: '存在需人工确认项。',
    repairInstruction: '复核需人工确认项后继续。',
    artifactPath: 'validation/generation-readiness-result.json',
    sourceValidator: 'Runtime Fact Validator',
    autoRepairable: false,
    requiresHumanReview: true
  }
};

const FALLBACK_DESCRIPTOR: ReadinessIssueDescriptor = {
  category: 'readiness',
  path: 'validation/generation-readiness-result.json',
  message: '存在未分类的阻断 / 警告项。',
  repairInstruction: '请查看 Generation Readiness Gate 的阻断详情并修复对应产物。',
  artifactPath: 'validation/generation-readiness-result.json',
  sourceValidator: 'Generation Readiness Gate',
  autoRepairable: false,
  requiresHumanReview: true
};

/**
 * §4 错误码 → 富信息 ValidationIssue（供 Registry 各 Validator 与 gate 回退路径共用）。
 * code 支持 `CODE:suffix` 形式，suffix 会进入 receivedValue。
 */
export function buildReadinessIssue(
  code: string,
  severity: ReadinessValidationIssueSeverity,
  overrides?: Partial<Pick<ReadinessValidationIssue, 'receivedValue' | 'path' | 'artifactPath'>>
): ReadinessValidationIssue {
  const prefix = codePrefix(code);
  const descriptor = CODE_DESCRIPTORS[prefix] ?? FALLBACK_DESCRIPTOR;
  const receivedValue = overrides?.receivedValue
    ?? (code.includes(':') ? code.slice(code.indexOf(':') + 1) : undefined);
  return {
    code,
    category: descriptor.category,
    severity,
    path: overrides?.path ?? descriptor.path,
    receivedValue,
    message: descriptor.message,
    repairInstruction: descriptor.repairInstruction,
    artifactPath: overrides?.artifactPath ?? descriptor.artifactPath,
    sourceValidator: descriptor.sourceValidator,
    dependsOnIssueCodes: descriptor.causedByIssueCodes,
    causedByIssueCodes: descriptor.causedByIssueCodes,
    autoRepairable: descriptor.autoRepairable,
    requiresHumanReview: descriptor.requiresHumanReview
  };
}

/**
 * §4 / §14 将既有 GenerationReadinessGate（已测试的权威聚合）转换为
 * 统一的 ReadinessValidatorResult[]，再交给 Aggregator 压缩派生症状。
 */
export function gateToValidatorResults(
  gate: GenerationReadinessGate,
  _jobId: string,
  _outputType: GenerationOutputType
): ReadinessValidatorResult[] {
  const issues: ReadinessValidationIssue[] = [];
  for (const code of gate.blockingReasons) {
    issues.push(buildReadinessIssue(code, 'blocking'));
  }
  for (const code of gate.warnings ?? []) {
    issues.push(buildReadinessIssue(code, 'warning'));
  }
  const byValidator = new Map<string, ReadinessValidationIssue[]>();
  for (const issue of issues) {
    const list = byValidator.get(issue.sourceValidator) ?? [];
    list.push(issue);
    byValidator.set(issue.sourceValidator, list);
  }
  return [...byValidator.entries()].map(([validatorId, validatorIssues]) => ({
    validatorId,
    passed: validatorIssues.every((item) => item.severity !== 'blocking'),
    issues: validatorIssues
  }));
}

function deriveSelectionStatus(
  agg: ReadinessValidationAggregation
): 'passed' | 'needs_review' | 'blocked' {
  const refIssues = agg.allIssues.filter((item) => item.category === 'reference_sanitization');
  if (categoryHasSeverity(refIssues, 'reference_sanitization', ['blocking'])) return 'blocked';
  if (categoryHasSeverity(refIssues, 'reference_sanitization', ['warning'])) return 'needs_review';
  return 'passed';
}

function deriveContextStatus(
  agg: ReadinessValidationAggregation
): 'ready' | 'needs_review' | 'blocked' {
  const contextCategories: ReadinessValidationIssueCategory[] = [
    'task_reference',
    'task_style_carrier',
    'structure_policy',
    'identity_pack',
    'brief_compilation',
    'cross_artifact',
    'runtime_fact'
  ];
  const ctxIssues = agg.allIssues.filter((item) => contextCategories.includes(item.category));
  if (ctxIssues.some((item) => item.severity === 'blocking')) return 'blocked';
  if (ctxIssues.some((item) => item.severity === 'warning' || item.severity === 'error')) return 'needs_review';
  return 'ready';
}

/** 注册表登记的必需 Validator 数量（单一来源，避免魔法数字）。 */
const REGISTERED_VALIDATOR_COUNT = Object.keys(VALIDATOR_IDS).length;

/**
 * §9 / §11 生成 Generation Readiness 单一事实源。
 * 所有报告（Audit / Blocked）与 UI 都必须读取此结果，禁止各自重新计算状态。
 *
 * 两种输入模式：
 * - 传入 validatorResults + manifest（编排器真实流程）：聚合器接收 runAllValidators 的完整结果，
 *   并把编排级问题（orchestrationIssues）一并纳入单一事实源；validatorExecution 反映真实执行情况。
 * - 仅传入 gate（既有权威聚合 / 单测路径）：沿用 gateToValidatorResults，validatorExecution 视为全量完成。
 */
export function resolveGenerationReadinessResult(input: {
  gate: GenerationReadinessGate;
  jobId: string;
  outputType: GenerationOutputType;
  /** §8 runAllValidators 的完整结果（禁止硬编码子集）。 */
  validatorResults?: ReferenceFirstValidatorResult[];
  /** §7 执行清单（用于填充 validatorExecution）。 */
  manifest?: ValidatorExecutionManifest;
  /** §5 编排级问题（执行失败 / 结果缺失 / 执行不完整）。 */
  orchestrationIssues?: ReadinessValidationIssue[];
}): GenerationReadinessResult {
  const results: ReadinessValidatorResult[] =
    input.validatorResults && input.validatorResults.length > 0
      ? input.validatorResults.map((result) => ({
        validatorId: result.validatorId,
        passed: result.passed,
        issues: result.issues
      }))
      : gateToValidatorResults(input.gate, input.jobId, input.outputType);

  if (input.orchestrationIssues && input.orchestrationIssues.length > 0) {
    results.push({
      validatorId: 'validator-registry',
      passed: input.orchestrationIssues.every((issue) => issue.severity !== 'blocking'),
      issues: input.orchestrationIssues
    });
  }

  const aggregation = aggregateValidationIssues({ results });

  const validatorExecution = input.manifest
    ? {
      expected: input.manifest.expectedValidatorCount,
      executed: input.manifest.executedValidatorCount,
      complete: input.manifest.complete
    }
    : {
      expected: REGISTERED_VALIDATOR_COUNT,
      executed: REGISTERED_VALIDATOR_COUNT,
      complete: true
    };

  return {
    jobId: input.jobId,
    outputType: input.outputType,
    // 权威状态来自已测试的 gate；与 resolveReadinessStatus 在常见场景下一致。
    status: input.gate.status,
    rootIssues: aggregation.rootIssues,
    derivedIssues: aggregation.derivedIssues,
    warnings: aggregation.warnings,
    validatorExecution,
    referenceSelectionStatus: deriveSelectionStatus(aggregation),
    generationContextStatus: deriveContextStatus(aggregation),
    generatedAt: new Date().toISOString()
  };
}

/**
 * §10 审计报告「生成准备状态」章节编译器。
 * 读取单一事实源（GenerationReadinessResult），不得重新计算。
 */
export function compileReadinessStatusSection(
  result: GenerationReadinessResult
): string {
  const rootLines = result.rootIssues.length
    ? result.rootIssues
      .map((issue, idx) => `${idx + 1}. ${issue.code} — ${issue.message}`)
      .join('\n')
    : '- 无（但状态非 ready，请检查校验器输入）';
  const derivedLines = result.derivedIssues.length
    ? result.derivedIssues
      .map((issue) => {
        const causes = ISSUE_DEPENDENCY_GRAPH[codePrefix(issue.code)] ?? issue.causedByIssueCodes ?? [];
        return `- ${issue.code}：由上游根因（${causes.join('、') || '未知'}）派生的下游症状，非第一阻断原因`;
      })
      .join('\n')
    : '- 无';
  return [
    '## 15. 生成准备状态',
    '',
    `- Reference Asset Selection：${statusLabel(result.referenceSelectionStatus)}`,
    `- Validator Execution：${result.validatorExecution.complete
      ? `complete (${result.validatorExecution.executed}/${result.validatorExecution.expected})`
      : `incomplete (${result.validatorExecution.executed}/${result.validatorExecution.expected})`}`,
    `- Generation Context Compilation：${statusLabel(result.generationContextStatus)}`,
    `- Generation Readiness：${statusLabel(result.status)}`,
    '',
    '### 阻断原因（根因，按优先级排序）',
    rootLines,
    '',
    '### 派生影响（下游症状，不作为唯一错误）',
    derivedLines
  ].join('\n');
}
