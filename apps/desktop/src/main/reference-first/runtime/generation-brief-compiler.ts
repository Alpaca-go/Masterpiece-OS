import type {
  GenerationIdentityPack,
  GenerationTaskDefinition,
  ProjectGraphicAnchor,
  StyleCarrier,
  SystemAnchor,
  TaskReferenceSubset
} from '../../../shared/types.ts';

function list(values: string[]): string {
  return values.length ? values.map((value) => `- ${value}`).join('\n') : '- 无';
}

export function compileGenerationBrief(input: {
  identityPack: GenerationIdentityPack;
  replaceableLegacyVisuals: string[];
  /** 全局 Style Carrier Ranking（用于兜底）。 */
  styleCarriers: StyleCarrier[];
  /** §5 当前任务筛选后的 Primary Style Carriers（优先使用）。 */
  taskScopedPrimaryCarriers?: StyleCarrier[];
  systemAnchor: SystemAnchor;
  graphicAnchor: ProjectGraphicAnchor;
  task: GenerationTaskDefinition;
  referenceSubset: TaskReferenceSubset;
  approvedAnchorRule?: string;
}): string {
  const identity = [
    ...input.identityPack.identityFacts.map((item) => `${item.key || item.id}: ${item.value}`),
    ...input.identityPack.productOrServiceFacts.map((item) => `${item.key || item.id}: ${item.value}`)
  ];
  const primaryRules = (input.taskScopedPrimaryCarriers && input.taskScopedPrimaryCarriers.length
    ? input.taskScopedPrimaryCarriers
    : input.styleCarriers.filter((item) => item.priority === 'primary')
  ).map((item) => item.readableRule || item.description);
  const prompt = `你正在执行 Reference-First Reconstruction。

当前项目身份、事实、Locked Assets 与结构状态以 Project Runtime Context 和 Generation Identity Pack 为准。
参考方案负责视觉系统，但不得复制参考身份、文案和专属图形。
请根据 Primary Style Carriers、System Anchor、Project Graphic Anchor、Current Task Definition 与 Task Reference Subset 完成当前输出任务。
不得继承未锁定的旧视觉。不得把未确认资产视为真实结构。
当结构状态为 open_for_redesign 时，可根据项目需求重新设计。`;

  return `# Generation Brief

## 1. Minimum Identity Core
${list(identity)}

## 2. Replaceable Legacy Visuals
${list(input.replaceableLegacyVisuals)}

## 3. Structure Policy
- domain: ${input.identityPack.structurePolicy.domain}
- status: ${input.identityPack.structurePolicy.status}
- redesignAllowed: ${input.identityPack.structurePolicy.redesignAllowed}

## 4. Primary Style Carriers
${list(primaryRules)}

## 5. System Anchor
${list([
    input.systemAnchor.colorRelationship,
    input.systemAnchor.layoutGrammar,
    input.systemAnchor.typographyHierarchy,
    input.systemAnchor.materialLanguage,
    input.systemAnchor.crossTouchpointConsistency
  ].filter(Boolean))}

## 6. Project Graphic Anchor
${list([
    input.graphicAnchor.formDescription || input.graphicAnchor.reconstructedForm,
    ...input.graphicAnchor.sourceElements
  ].filter(Boolean))}

## 7. Current Task Definition
- outputType: ${input.task.outputType}
- purpose: ${input.task.taskPurpose}
- 画面主体类型：${list(input.task.primarySubjectTypes)}
- 必需对象：${list(input.task.requiredObjects)}
- 可选对象：${list(input.task.optionalObjects)}
${list([
    ...input.task.compositionRules,
    ...input.task.typographyRules,
    ...input.task.materialRules,
    ...input.task.photographyRules,
    ...input.task.logoUsageRules
  ])}

## 8. Reference Subset
- matchLevel: ${input.referenceSubset.matchLevel || 'insufficient'}
${list(input.referenceSubset.selectedAssetIds)}

## 9. Forbidden Items
${list(input.task.forbiddenOutputPatterns)}

## 10. Approved Anchor Rule
- ${input.approvedAnchorRule || '必须在人工确认后才可锁定锚点'}

## 11. GPT Prompt
${prompt}
`;
}
