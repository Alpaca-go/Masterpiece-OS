import type {
  CrossArtifactConsistencyValidation,
  GenerationOutputType
} from '../../../shared/types.ts';

/**
 * §12 审计报告与执行文档交叉验证。
 * 任一阻断条件必须返回 passed=false：
 *  - 审计报告没有当前请求任务
 *  - 执行文档引用不存在的 Task Subset
 *  - Forbidden Graphic 出现在 Primary
 *  - Structure Policy 与 Prompt 描述不一致
 *  - 新旧 Anchor 同时出现
 *  - Identity Pack 资产清单不一致
 */
export function validateCrossArtifactConsistency(input: {
  auditOutputType?: GenerationOutputType;
  briefOutputType?: GenerationOutputType;
  taskSubsetOutputTypes?: GenerationOutputType[];
  primaryCarrierLeakIds?: string[];
  structurePolicyStatus?: string;
  promptStatesStructure?: boolean;
  legacyAnchorPresent?: boolean;
  referenceFirstAnchorPresent?: boolean;
  auditIdentityAssetIds?: string[];
  briefIdentityAssetIds?: string[];
}): CrossArtifactConsistencyValidation {
  const contradictions: string[] = [];
  const outputTypeMatches = !input.auditOutputType
    || !input.briefOutputType
    || input.auditOutputType === input.briefOutputType;
  if (!outputTypeMatches) contradictions.push('AUDIT_BRIEF_TASK_MISMATCH');

  const taskSubsetMatches = !input.briefOutputType
    || !input.taskSubsetOutputTypes
    || input.taskSubsetOutputTypes.includes(input.briefOutputType);
  if (!taskSubsetMatches) contradictions.push('AUDIT_BRIEF_TASK_MISMATCH');

  const styleCarrierIdsMatch = (input.primaryCarrierLeakIds || []).length === 0;
  if (!styleCarrierIdsMatch) contradictions.push('AUDIT_BRIEF_STYLE_CARRIER_MISMATCH');

  const structurePolicyMatches = !(input.structurePolicyStatus === 'open_for_redesign'
    && input.promptStatesStructure === true);
  if (!structurePolicyMatches) contradictions.push('AUDIT_BRIEF_STRUCTURE_POLICY_MISMATCH');

  const anchorMatches = !(input.legacyAnchorPresent && input.referenceFirstAnchorPresent);
  if (!anchorMatches) contradictions.push('AUDIT_BRIEF_ANCHOR_MISMATCH');

  const identityPackMatches = !input.auditIdentityAssetIds
    || !input.briefIdentityAssetIds
    || (input.auditIdentityAssetIds.length === input.briefIdentityAssetIds.length
      && input.auditIdentityAssetIds.every((id) => input.briefIdentityAssetIds!.includes(id)));
  if (!identityPackMatches) contradictions.push('AUDIT_BRIEF_IDENTITY_PACK_MISMATCH');

  return {
    outputTypeMatches,
    taskSubsetMatches,
    styleCarrierIdsMatch,
    systemAnchorMatches: anchorMatches,
    projectGraphicAnchorMatches: anchorMatches,
    structurePolicyMatches,
    identityPackMatches,
    contradictions,
    passed: contradictions.length === 0
  };
}
