import type {
  GenerationOutputType,
  GenerationTaskDefinition,
  ProjectRuntimeContext,
  StructurePolicy,
  StyleCarrier
} from '../../../shared/types.ts';

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function compileTaskDefinition(input: {
  outputType: GenerationOutputType;
  runtime: ProjectRuntimeContext;
  structurePolicy: StructurePolicy;
  /** 全局 Style Carrier Ranking（仅作兜底，禁止直接作为 Required Object）。 */
  styleCarriers: StyleCarrier[];
  /** §3 当前任务筛选后的 Primary 载体（优先来源，Style Rule 与 Required Object 分离）。 */
  taskScopedPrimary?: StyleCarrier[];
  /** §3 当前任务筛选后的 Secondary 载体。 */
  taskScopedSupporting?: StyleCarrier[];
}): GenerationTaskDefinition {
  const taskMetadata = (
    input.runtime.projectMetadata.taskDefinitions as Record<string, Record<string, unknown>> | undefined
  )?.[input.outputType] || {};
  const toRules = (carriers: StyleCarrier[] | undefined): string[] =>
    (carriers || []).map((item) => item.readableRule || item.description).filter(Boolean);
  const globalPrimaryRules = toRules(input.styleCarriers.filter((item) => item.priority === 'primary'));
  // §3 Style Rule 只能来自 Task-Scoped Set；无 Task-Scoped 时以全局 Primary 兜底。
  const requiredStyleRules = input.taskScopedPrimary && input.taskScopedPrimary.length
    ? toRules(input.taskScopedPrimary)
    : globalPrimaryRules;
  const supportingStyleRules = toRules(input.taskScopedSupporting);
  return {
    outputType: input.outputType,
    taskPurpose: typeof taskMetadata.taskPurpose === 'string'
      ? taskMetadata.taskPurpose
      : `完成 ${input.outputType} 输出任务`,
    primarySubjectTypes: strings(taskMetadata.primarySubjectTypes),
    requiredObjects: strings(taskMetadata.requiredObjects),
    optionalObjects: strings(taskMetadata.optionalObjects),
    requiredStyleRules,
    supportingStyleRules,
    compositionRules: [...strings(taskMetadata.compositionRules), ...requiredStyleRules],
    typographyRules: strings(taskMetadata.typographyRules),
    materialRules: strings(taskMetadata.materialRules),
    photographyRules: strings(taskMetadata.photographyRules),
    logoUsageRules: strings(taskMetadata.logoUsageRules),
    forbiddenOutputPatterns: [
      ...strings(taskMetadata.forbiddenOutputPatterns),
      '不得复制参考身份、文案或专属图形',
      ...(input.structurePolicy.redesignAllowed ? [] : ['不得改变已确认结构'])
    ]
  };
}
