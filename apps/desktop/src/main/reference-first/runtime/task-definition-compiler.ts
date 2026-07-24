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
  styleCarriers: StyleCarrier[];
}): GenerationTaskDefinition {
  const taskMetadata = (
    input.runtime.projectMetadata.taskDefinitions as Record<string, Record<string, unknown>> | undefined
  )?.[input.outputType] || {};
  const readableRules = input.styleCarriers
    .filter((item) => item.priority === 'primary')
    .map((item) => item.readableRule || item.description)
    .filter(Boolean);
  return {
    outputType: input.outputType,
    taskPurpose: typeof taskMetadata.taskPurpose === 'string'
      ? taskMetadata.taskPurpose
      : `完成 ${input.outputType} 输出任务`,
    primarySubjectTypes: strings(taskMetadata.primarySubjectTypes),
    requiredObjects: strings(taskMetadata.requiredObjects),
    optionalObjects: strings(taskMetadata.optionalObjects),
    compositionRules: [...strings(taskMetadata.compositionRules), ...readableRules],
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
