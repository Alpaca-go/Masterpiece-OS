import type { LockedAsset, VisualMigrationReferenceCandidateDeclarationV1 } from '@masterpiece/project-contracts/index.ts';
import { sha256Fingerprint, canonicalSerializeVisualMigrationValue } from './visual-migration-reference-pack-contract.ts';

const IDENTITY_TYPES = new Set(['logo', 'brand_name', 'packaging_artwork', 'product_color']);
const STRUCTURE_TYPES = new Set(['packaging_structure', 'product_arrangement']);

export function buildVisualMigrationProductCandidateDeclarations(
  lockedAssets: LockedAsset[],
): VisualMigrationReferenceCandidateDeclarationV1[] {
  return lockedAssets
    .filter((asset) => asset.sourceAssetId)
    .map((asset, sourceOrder) => {
      const role: VisualMigrationReferenceCandidateDeclarationV1['role'] = IDENTITY_TYPES.has(asset.type) ? 'identity_reference'
        : STRUCTURE_TYPES.has(asset.type) ? 'structure_reference' : 'analysis_only';
      const candidateId = `vmpc-${sha256Fingerprint(canonicalSerializeVisualMigrationValue({
        sourceKind: 'locked_asset', sourceId: asset.id, role,
      })).slice('sha256:'.length, 'sha256:'.length + 16)}`;
      return {
        candidateId,
        sourceKind: 'locked_asset' as const,
        sourceId: asset.id,
        imageAssetId: asset.sourceAssetId,
        role,
        sourceOrder,
        reasonCodes: [`product_authority_${role}`],
      };
    });
}
