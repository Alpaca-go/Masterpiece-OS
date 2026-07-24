import type {
  GenerationOutputType,
  ReferenceMasterSet,
  RequestedGenerationTask,
  RequestedGenerationTaskManifest,
  TaskReferenceSubset,
  TaskReferenceSubsetManifest,
  TaskSubsetValidation
} from '../../../shared/types.ts';

function scoreForTask(
  decision: ReferenceMasterSet['decisions'][number],
  outputType: GenerationOutputType
): number {
  const eligible = decision.eligibleOutputTypes.includes(outputType) ? 1 : 0;
  const strength = { high: 0.3, medium: 0.2, low: 0.1 }[decision.styleCarrierStrength];
  return eligible + strength + decision.confidence;
}

export function selectTaskReferences(
  master: ReferenceMasterSet,
  outputTasks: GenerationOutputType[]
): { subsets: TaskReferenceSubset[]; validations: TaskSubsetValidation[] } {
  const primaryCarriers = master.styleCarriers.filter((item) => item.priority === 'primary');
  const subsets = [...new Set(outputTasks)].map((outputType) => {
    const exact = master.decisions.filter((item) =>
      item.eligibleOutputTypes.includes(outputType)
      && item.primaryRole !== 'uncertain'
      && item.styleCarrierStrength === 'high'
    );
    const compatible = master.decisions.filter((item) =>
      !exact.includes(item)
      && item.eligibleOutputTypes.includes(outputType)
    );
    const candidates = (exact.length ? exact : compatible)
      .sort((a, b) => scoreForTask(b, outputType) - scoreForTask(a, outputType));
    const selected = candidates.slice(0, Math.min(4, candidates.length));
    const covered = primaryCarriers.filter((carrier) =>
      selected.some((item) => carrier.supportingAssetIds.includes(item.assetId))
    );
    const matchLevel = exact.length ? 'exact' : compatible.length ? 'compatible' : 'insufficient';
    const confidence = selected.length
      ? selected.reduce((sum, item) => sum + item.confidence, 0) / selected.length
      : 0;
    const primary = selected[0];
    return {
      outputType,
      selectedAssetIds: selected.map((item) => item.assetId),
      primaryReferenceAssetId: primary?.assetId || '',
      supportingReferenceAssetIds: selected.slice(1).map((item) => item.assetId),
      coveredPrimaryStyleCarrierIds: covered.map((item) => item.id),
      missingStyleCarrierIds: primaryCarriers.filter((item) => !covered.includes(item)).map((item) => item.id),
      selectionReason: matchLevel === 'exact'
        ? '参考的主角色、可用任务和风格载体与当前任务精确匹配'
        : matchLevel === 'compatible'
          ? '选择可用任务一致、并由辅助视觉角色提供支持的兼容参考'
          : '没有足够的任务匹配参考，需要补充证据或人工确认',
      confidence,
      matchLevel,
      requiresHumanReview: matchLevel === 'insufficient' || confidence < 0.8,
      coveredStyleCarrierIds: covered.map((item) => item.id),
      missingEvidence: matchLevel === 'insufficient' ? ['缺少当前任务可用的参考资产'] : []
    } satisfies TaskReferenceSubset;
  });
  const validations = subsets.map((subset) => {
    const selected = master.decisions.filter((item) => subset.selectedAssetIds.includes(item.assetId));
    const groups = selected.map((item) => item.duplicationGroupId).filter(Boolean);
    const matchesOutputType = selected.some((item) => item.eligibleOutputTypes.includes(subset.outputType));
    const validation: TaskSubsetValidation = {
      matchesOutputType,
      hasHighStrengthPrimaryReference: selected.some((item) => item.styleCarrierStrength === 'high'),
      coversPrimaryStyleCarriers: subset.missingStyleCarrierIds.length === 0,
      avoidsCrossTypeNoise: selected.every((item) => item.eligibleOutputTypes.includes(subset.outputType)),
      avoidsNearDuplicates: new Set(groups).size === groups.length,
      assetCountValid: selected.length >= 1 && selected.length <= 4,
      passed: false
    };
    validation.passed = validation.matchesOutputType
      && validation.avoidsCrossTypeNoise
      && validation.avoidsNearDuplicates
      && validation.assetCountValid;
    return validation;
  });
  return { subsets, validations };
}

/**
 * §6.2 请求任务覆盖校验。
 * 所有 required 的请求任务都必须有真实生成的 Task Subset（artifactPath 非空），
 * 且不得用固定路径伪造。
 */
export function validateRequestedTaskCoverage(
  requested: RequestedGenerationTaskManifest,
  subsets: TaskReferenceSubsetManifest
): Array<{ path: string; issueType: string; message: string; repairInstruction: string; severity: 'blocking' }> {
  return requested.tasks
    .filter((task) => task.required)
    .filter((task) =>
      !subsets.subsets.some(
        (subset) => subset.outputType === task.outputType && Boolean(subset.artifactPath)
      )
    )
    .map((task) => ({
      path: `taskReferenceSubsets.${task.outputType}`,
      issueType: 'missing_required',
      message: `缺少请求任务 ${task.outputType} 的参考子集。`,
      repairInstruction: '重新执行任务参考筛选，不得用固定路径代替实际产物。',
      severity: 'blocking'
    }));
}
