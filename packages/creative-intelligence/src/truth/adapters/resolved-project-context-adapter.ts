/**
 * Adapter: ResolvedProjectContext → ProjectTruthFact[] + EvidenceEntry[].
 *
 * Spec #38: ResolvedProjectContext may already represent merged data.
 *           Do not automatically treat "resolved" as authoritative.
 *           Retain derived/merge provenance metadata.
 *
 * We treat it as `AUTHORITATIVE_PROJECT_METADATA` only when explicitly
 * confirmed upstream; otherwise SYSTEM_DEFAULT. The carrier is allowed
 * to override `authority` via the `sourceFingerprint` semantics.
 */

import type { AdapterOutput, ProjectTruthAdapter } from './adapter-types.ts';
import { factId, evidenceId, isUnknown } from '../normalization.ts';
import { PROJECT_TRUTH_KEYS } from '../key-registry.ts';
import type {
  ProjectTruthFact,
  TruthAuthority,
  SourceType,
} from '../contracts.ts';

interface ResolvedProjectContextShape {
  projectId?: string;
  generatedAt?: string;
  identity?: {
    projectName?: string;
    brandName?: string;
    industry?: string;
  };
  lockedAssets?: {
    logoLocked?: boolean;
    logoAssetIds?: string[];
    lockedFacts?: string[];
  };
  products?: string[];
  services?: string[];
  targetAudience?: string[];
  pricePositioning?: string | null;
  businessModel?: string | null;
  brandPersonality?: string[];
  visualPreferences?: string[];
  prohibitedDirections?: string[];
  uncertainties?: string[];
  conflicts?: unknown[];
}

export const adaptResolvedProjectContext: ProjectTruthAdapter<ResolvedProjectContextShape> = (input, ctx) => {
  const facts: ProjectTruthFact[] = [];
  const evidence: AdapterOutput['evidence'] = [];
  const warnings: AdapterOutput['warnings'] = [];

  if (!input || !input.projectId) {
    warnings.push({
      code: 'CI_TRUTH_ADAPTER_INVALID_INPUT',
      message: 'ResolvedProjectContext missing projectId.',
      carrierId: ctx.projectId,
    });
    return { facts, evidence, warnings };
  }

  const sourceId = input.projectId;
  const isRef = false;
  const sourceType: SourceType = 'resolved_project_context';
  // Resolved is a merge, not source-of-truth; default to SYSTEM_DEFAULT.
  const baseAuthority: TruthAuthority = 'SYSTEM_DEFAULT';

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
        authority: baseAuthority,
        sourceType,
        sourceId,
        createdAt: ctx.generatedAt,
        evidenceRefs: [evidenceId('project', sourceId, `rpc:${key}`)],
        isReferenceFact: isRef,
      });
    }
  };

  if (input.identity) {
    push(PROJECT_TRUTH_KEYS.BRAND_NAME, input.identity.brandName);
    push(PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY, input.identity.industry);
  }
  push(PROJECT_TRUTH_KEYS.PRODUCT_CORE_PRODUCTS, input.products);
  push(PROJECT_TRUTH_KEYS.PRODUCT_SERVICES, input.services);
  push(PROJECT_TRUTH_KEYS.AUDIENCE_PRIMARY, input.targetAudience);
  push(PROJECT_TRUTH_KEYS.BUSINESS_MODEL, input.businessModel ?? null);
  push(PROJECT_TRUTH_KEYS.PRICE_POSITIONING, input.pricePositioning ?? null);
  push(PROJECT_TRUTH_KEYS.BRAND_PERSONALITY, input.brandPersonality);
  push(PROJECT_TRUTH_KEYS.VISUAL_PREFERENCES, input.visualPreferences);
  push(PROJECT_TRUTH_KEYS.CONSTRAINT_PROHIBITED_DIRECTIONS, input.prohibitedDirections);
  push(PROJECT_TRUTH_KEYS.UNKNOWN_FIELDS, input.uncertainties);

  if (input.lockedAssets) {
    if (input.lockedAssets.logoLocked) {
      push(PROJECT_TRUTH_KEYS.LOCKED_LOGO, true);
    }
    if (Array.isArray(input.lockedAssets.lockedFacts) && input.lockedAssets.lockedFacts.length > 0) {
      push(PROJECT_TRUTH_KEYS.LOCKED_FACTS, [...input.lockedAssets.lockedFacts]);
    }
  }

  if (Array.isArray(input.conflicts) && input.conflicts.length > 0) {
    warnings.push({
      code: 'CI_TRUTH_RPC_HAS_CONFLICTS',
      message: `ResolvedProjectContext reports ${input.conflicts.length} upstream conflicts. Shadow truth will detect them independently.`,
      carrierId: sourceId,
    });
  }

  return { facts, evidence, warnings };
};
