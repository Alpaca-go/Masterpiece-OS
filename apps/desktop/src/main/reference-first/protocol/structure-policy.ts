import type {
  AssetAuthenticityDecision,
  StructurePolicy,
  StructurePolicyValidation,
  StructureStatus,
  UserStructureDecision
} from '../../../shared/types.ts';

const FACTUAL_STRUCTURE_AUTHENTICITY = new Set([
  'brand_original',
  'user_confirmed_real',
  'user_confirmed_locked'
]);

const CONFIRMED_STRUCTURE_STATUSES: StructureStatus[] = [
  'locked',
  'user_confirmed',
  'real_structure_detected'
];

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
 * §4 结构真实性资产校验。
 * 只有 brand_original / user_confirmed_real / user_confirmed_locked 可以证明结构；
 * stock_mockup / third_party_mockup / design_concept_only / reference_only / unknown /
 * legacy_visual_only 不得证明结构。未确认资产被当作结构证据（structure_only）即为阻断。
 *
 * 返回全部为 blocking 的错误码：
 *  - STRUCTURE_ONLY_ASSET_INVALID：未确认资产被用作结构证据；
 *  - UNVERIFIED_STRUCTURE_MARKED_CONFIRMED：策略声明为 confirmed 却含未确认结构资产。
 */
export function validateStructureOnlyAssets(
  decisions: AssetAuthenticityDecision[],
  policy?: StructurePolicy
): string[] {
  const errors: string[] = [];
  const confirmedIds = new Set(policy?.confirmedAssetIds || []);
  for (const decision of decisions) {
    const factual = FACTUAL_STRUCTURE_AUTHENTICITY.has(decision.authenticity);
    if (!factual && decision.canProveStructure) {
      errors.push(`STRUCTURE_ONLY_ASSET_INVALID:${decision.assetId}`);
      if (confirmedIds.has(decision.assetId)) {
        errors.push(`UNVERIFIED_STRUCTURE_MARKED_CONFIRMED:${decision.assetId}`);
      }
    }
  }
  // 策略声明为 confirmed 型状态，但确认清单中含未确认资产。
  if (policy && CONFIRMED_STRUCTURE_STATUSES.includes(policy.status)) {
    const byId = new Map(decisions.map((item) => [item.assetId, item]));
    for (const assetId of policy.confirmedAssetIds) {
      const decision = byId.get(assetId);
      if (decision && !FACTUAL_STRUCTURE_AUTHENTICITY.has(decision.authenticity)) {
        errors.push(`UNVERIFIED_STRUCTURE_MARKED_CONFIRMED:${assetId}`);
      }
    }
  }
  return [...new Set(errors)];
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
