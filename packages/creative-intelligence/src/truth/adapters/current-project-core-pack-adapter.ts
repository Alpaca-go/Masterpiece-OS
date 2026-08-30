/**
 * Adapter: CurrentProjectCorePack → ProjectTruthFact[] + EvidenceEntry[].
 *
 * Spec #39: especially important around Reference-First flows.
 *           Reference-derived facts must never be confused with current-project
 *           authoritative facts.
 *           Preserve: source project / source asset / permission state / inheritance role.
 *
 * CurrentProjectCorePack is the assembled "current project only" pack — it must
 * not include reference assets. If the pack exposes reference metadata, we
 * tag facts accordingly and the assembler applies the reference guard.
 */

import type { AdapterOutput, ProjectTruthAdapter } from './adapter-types.ts';
import { factId, evidenceId, isUnknown } from '../normalization.ts';
import { PROJECT_TRUTH_KEYS } from '../key-registry.ts';
import type {
  ProjectTruthFact,
  TruthAuthority,
  SourceType,
} from '../contracts.ts';

interface LockedAssetEvidence {
  assetId?: string;
  role?: string;
  source?: 'current_project' | 'reference_project';
}

interface CurrentProjectCorePackShape {
  projectId?: string;
  brandName?: string;
  industry?: string;
  productFacts?: string[];
  targetAudience?: string[];
  brandPositioning?: string;
  logoAssetIds?: string[];
  logoTypographyAssetIds?: string[];
  packagingStructures?: Array<{ structureId?: string; label?: string }>;
  productAssets?: string[];
  touchpoints?: unknown;
  confirmedBrandCopy?: string[];
  lockedAssets?: LockedAssetEvidence[];
  excludedLegacyStyleAssetIds?: string[];
  uncertainAssetIds?: string[];
  sourceAssetIds?: string[];
  schemaVersion?: string;
  // Reference contamination guard
  noReferenceAssetsMixedIn?: boolean;
}

export const adaptCurrentProjectCorePack: ProjectTruthAdapter<CurrentProjectCorePackShape> = (input, ctx) => {
  const facts: ProjectTruthFact[] = [];
  const evidence: AdapterOutput['evidence'] = [];
  const warnings: AdapterOutput['warnings'] = [];

  if (!input || !input.projectId) {
    warnings.push({
      code: 'CI_TRUTH_ADAPTER_INVALID_INPUT',
      message: 'CurrentProjectCorePack missing projectId.',
      carrierId: ctx.projectId,
    });
    return { facts, evidence, warnings };
  }

  const sourceId = input.projectId;
  const sourceType: SourceType = 'current_project_core_pack';
  const isRef = false; // CurrentProjectCorePack MUST be current-only by contract.
  const authority: TruthAuthority = 'AUTHORITATIVE_PROJECT_METADATA';

  const push = (key: string, value: unknown) => {
    if (isUnknown(value)) {
      facts.push({
        id: factId(sourceType, sourceId, key),
        key,
        value: null,
        truthClass: 'unknown',
        status: 'unknown',
        authority: 'UNKNOWN' as TruthAuthority,
        sourceType,
        sourceId,
        createdAt: ctx.generatedAt,
        evidenceRefs: [],
        isReferenceFact: isRef,
      });
    } else {
      facts.push({
        id: factId(sourceType, sourceId, key),
        key,
        value,
        truthClass: 'fact',
        status: 'observed',
        authority,
        sourceType,
        sourceId,
        createdAt: ctx.generatedAt,
        evidenceRefs: [evidenceId('project', sourceId, `cpcp:${key}`)],
        isReferenceFact: isRef,
      });
    }
  };

  push(PROJECT_TRUTH_KEYS.BRAND_NAME, input.brandName);
  push(PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY, input.industry);
  push(PROJECT_TRUTH_KEYS.PRODUCT_CORE_PRODUCTS, input.productFacts);
  push(PROJECT_TRUTH_KEYS.AUDIENCE_PRIMARY, input.targetAudience);
  push(PROJECT_TRUTH_KEYS.BRAND_ROLE, input.brandPositioning);

  if (Array.isArray(input.logoAssetIds) && input.logoAssetIds.length > 0) {
    push(PROJECT_TRUTH_KEYS.LOCKED_LOGO, true);
  }

  if (Array.isArray(input.lockedAssets) && input.lockedAssets.length > 0) {
    const currentLocked = input.lockedAssets
      .filter((la) => la?.assetId && (la.source === 'current_project' || !la.source))
      .map((la) => la.assetId)
      .filter((id): id is string => typeof id === 'string');
    const refLocked = input.lockedAssets
      .filter((la) => la?.assetId && la.source === 'reference_project')
      .map((la) => la.assetId)
      .filter((id): id is string => typeof id === 'string');

    if (currentLocked.length > 0) {
      push(PROJECT_TRUTH_KEYS.LOCKED_ASSETS, currentLocked);
    }
    if (refLocked.length > 0) {
      // Reference-only locked assets: tag with isReferenceFact so the
      // assembler applies the reference-contamination guard.
      facts.push({
        id: factId(sourceType, sourceId, 'reference_locked_assets'),
        key: PROJECT_TRUTH_KEYS.LOCKED_ASSETS,
        value: refLocked,
        truthClass: 'fact',
        status: 'observed',
        authority: 'VISUAL_SOURCE_FACT',
        sourceType,
        sourceId,
        createdAt: ctx.generatedAt,
        evidenceRefs: refLocked.map((id) => evidenceId('locked', id)),
        isReferenceFact: true, // ← CRITICAL: do not let reference assets become current.
      });
      warnings.push({
        code: 'CI_TRUTH_REFERENCE_LOCKED_ASSETS',
        message: `CurrentProjectCorePack contains ${refLocked.length} reference-derived locked assets. They are tagged isReferenceFact=true.`,
        carrierId: sourceId,
      });
    }
  }

  if (input.noReferenceAssetsMixedIn === false) {
    warnings.push({
      code: 'CI_TRUTH_REFERENCE_CONTAMINATION_RISK',
      message: 'CurrentProjectCorePack.noReferenceAssetsMixedIn === false — reference contamination risk detected.',
      carrierId: sourceId,
    });
  }

  return { facts, evidence, warnings };
};
