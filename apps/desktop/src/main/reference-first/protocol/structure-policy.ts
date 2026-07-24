import type {
  AssetAuthenticityDecision,
  StructurePolicy,
  StructurePolicyValidation,
  StructureStatus,
  UserStructureDecision
} from '../../../shared/types.ts';

export function resolveStructureStatus(
  decisions: AssetAuthenticityDecision[],
  userDecision?: UserStructureDecision,
  inferredObservations: string[] = []
): StructureStatus {
  if (userDecision?.notApplicable) return 'not_applicable';
  if (userDecision?.locked) return 'locked';
  if (userDecision?.confirmed) return 'user_confirmed';
  if (decisions.some((asset) =>
    asset.canProveStructure
    && (asset.authenticity === 'brand_original' || asset.authenticity === 'user_confirmed_real')
  )) {
    return 'real_structure_detected';
  }
  if (inferredObservations.length) return 'open_for_redesign';
  return 'open_for_redesign';
}

export function buildStructurePolicy(
  decisions: AssetAuthenticityDecision[],
  userDecision?: UserStructureDecision,
  inferredObservations: string[] = []
): StructurePolicy {
  const status = resolveStructureStatus(decisions, userDecision, inferredObservations);
  const confirmed = decisions.filter((item) => item.canProveStructure);
  return {
    domain: userDecision?.domain || 'other',
    status,
    confirmedAssetIds: [
      ...new Set([...(userDecision?.confirmedAssetIds || []), ...confirmed.map((item) => item.assetId)])
    ],
    inferredStructureObservations: [...new Set(inferredObservations.filter(Boolean))],
    excludedUnverifiedAssetIds: decisions
      .filter((item) => !item.canProveStructure)
      .map((item) => item.assetId),
    redesignAllowed: status === 'open_for_redesign',
    requiresHumanConfirmation: status === 'open_for_redesign'
  };
}

/**
 * §8.3 结构策略条件编译。
 * 只有 locked / user_confirmed / real_structure_detected 可写结构约束；
 * open_for_redesign 与 not_applicable 不得描述成真实结构。
 */
export function compileStructurePrompt(policy: StructurePolicy): string {
  switch (policy.status) {
    case 'locked':
    case 'user_confirmed':
    case 'real_structure_detected':
      return '必须保留 Structure Policy 中已确认的结构资产。';
    case 'open_for_redesign':
      return '当前没有经确认的结构约束；不得从旧素材或未确认样机继承结构，可根据任务需求重新设计。';
    case 'not_applicable':
      return '当前任务不涉及结构约束。';
  }
}

/**
 * §8.4 结构策略校验。
 * 推断结构只进审计区，不得进入 Locked Info / Identity Pack / Prompt 真实结构说明。
 */
export function validateStructurePolicy(policy: StructurePolicy): StructurePolicyValidation {
  const confirmedStatuses = ['locked', 'user_confirmed', 'real_structure_detected'];
  const hasConfirmed = policy.confirmedAssetIds.length > 0
    || confirmedStatuses.includes(policy.status);
  const inferredEnteredLocked = !hasConfirmed
    && policy.status === 'open_for_redesign'
    && policy.confirmedAssetIds.length > 0;
  const inferredEnteredIdentityPack = policy.status === 'open_for_redesign'
    && Boolean(policy.inferredStructureObservations?.length)
    && policy.confirmedAssetIds.length > 0
    && !confirmedStatuses.includes(policy.status);
  const promptMatches = compileStructurePrompt(policy).includes(
    confirmedStatuses.includes(policy.status) ? '必须保留' : '重新设计'
  );
  return {
    inferredStructureEnteredLockedInfo: inferredEnteredLocked,
    inferredStructureEnteredIdentityPack: inferredEnteredIdentityPack,
    promptStructureStatementMatchesPolicy: promptMatches,
    passed: !inferredEnteredLocked && !inferredEnteredIdentityPack && promptMatches
  };
}
