import type {
  AssetAuthenticityDecision,
  StructurePolicy,
  StructureStatus,
  UserStructureDecision
} from '../../../shared/types.ts';

export function resolveStructureStatus(
  decisions: AssetAuthenticityDecision[],
  userDecision?: UserStructureDecision
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
  return 'open_for_redesign';
}

export function buildStructurePolicy(
  decisions: AssetAuthenticityDecision[],
  userDecision?: UserStructureDecision
): StructurePolicy {
  const status = resolveStructureStatus(decisions, userDecision);
  const confirmed = decisions.filter((item) => item.canProveStructure);
  return {
    domain: userDecision?.domain || 'other',
    status,
    confirmedAssetIds: [
      ...new Set([...(userDecision?.confirmedAssetIds || []), ...confirmed.map((item) => item.assetId)])
    ],
    excludedUnverifiedAssetIds: decisions
      .filter((item) => !item.canProveStructure)
      .map((item) => item.assetId),
    redesignAllowed: status === 'open_for_redesign',
    requiresHumanConfirmation: status === 'open_for_redesign'
  };
}
