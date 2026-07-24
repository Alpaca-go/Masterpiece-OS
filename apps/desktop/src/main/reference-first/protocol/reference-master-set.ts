import type {
  ReferenceAssetDecision,
  ReferenceMasterSet,
  ReferenceSignatureGraphic
} from '../../../shared/types.ts';
import { rankStyleCarriers } from './style-carrier-ranking.ts';

const EXCLUDED_ROLES = new Set(['duplicate', 'irrelevant', 'uncertain']);

export function buildGenericReferenceMasterSet(
  decisions: ReferenceAssetDecision[],
  signatureGraphics: ReferenceSignatureGraphic[] = []
): ReferenceMasterSet {
  const sorted = decisions
    .filter((item) => item.includeInMasterSet && !EXCLUDED_ROLES.has(item.primaryRole || item.role))
    .sort((a, b) => {
      const strength = { high: 3, medium: 2, low: 1 };
      return strength[b.styleCarrierStrength] - strength[a.styleCarrierStrength]
        || b.confidence - a.confidence;
    });
  const selected: ReferenceAssetDecision[] = [];
  const duplicateGroups = new Set<string>();
  for (const decision of sorted) {
    if (decision.duplicationGroupId && duplicateGroups.has(decision.duplicationGroupId)) continue;
    selected.push(decision);
    if (decision.duplicationGroupId) duplicateGroups.add(decision.duplicationGroupId);
  }
  return {
    assetIds: selected.map((item) => item.assetId),
    decisions: selected,
    styleCarriers: rankStyleCarriers(selected, { signatureGraphics }),
    schemaVersion: 'reference-master-set-v1'
  };
}
