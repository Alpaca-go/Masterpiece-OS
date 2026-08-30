/**
 * Adapter: CurrentProjectProfile → ProjectTruthFact[] + EvidenceEntry[].
 *
 * Spec #39: preserve source project / source asset / permission state / inheritance role.
 *           Reference-derived facts must never be confused with current-project
 *           authoritative facts.
 */

import type { AdapterOutput, ProjectTruthAdapter } from './adapter-types.ts';
import { factId, evidenceId, isUnknown } from '../normalization.ts';
import { PROJECT_TRUTH_KEYS } from '../key-registry.ts';
import type {
  ProjectTruthFact,
  TruthAuthority,
  SourceType,
} from '../contracts.ts';

interface CurrentProjectProfileShape {
  projectId?: string;
  projectName?: string;
  brandName?: string;
  industry?: string;
  coreProducts?: string[];
  targetAudience?: string[];
  targetAudienceDetails?: Array<{ label?: string; status?: string; sources?: unknown[] }>;
  pricePositioning?: string;
  brandPositioning?: string;
  usageScenarios?: string[];
  businessTouchpoints?: string[];
  lockedAssets?: string[];
  packagingStructures?: string[];
  confirmedFacts?: string[];
  sourceArtifactIds?: string[];
  currentVisualAssets?: string[];
  existingBrandCopy?: string[];
  visualSources?: Record<string, unknown>;
  touchpointInventory?: unknown;
  schemaVersion?: string;
}

export const adaptCurrentProjectProfile: ProjectTruthAdapter<CurrentProjectProfileShape> = (input, ctx) => {
  const facts: ProjectTruthFact[] = [];
  const evidence: AdapterOutput['evidence'] = [];
  const warnings: AdapterOutput['warnings'] = [];

  if (!input || !input.projectId) {
    warnings.push({
      code: 'CI_TRUTH_ADAPTER_INVALID_INPUT',
      message: 'CurrentProjectProfile missing projectId.',
      carrierId: ctx.projectId,
    });
    return { facts, evidence, warnings };
  }

  const sourceId = input.projectId;
  const sourceType: SourceType = 'current_project_profile';
  const isRef = false;
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
        evidenceRefs: [evidenceId('project', sourceId, `cpp:${key}`)],
        isReferenceFact: isRef,
      });
    }
  };

  push(PROJECT_TRUTH_KEYS.BRAND_NAME, input.brandName);
  push(PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY, input.industry);
  push(PROJECT_TRUTH_KEYS.PRODUCT_CORE_PRODUCTS, input.coreProducts);
  push(PROJECT_TRUTH_KEYS.AUDIENCE_PRIMARY, input.targetAudience);
  push(PROJECT_TRUTH_KEYS.AUDIENCE_USAGE_SCENARIOS, input.usageScenarios);
  push(PROJECT_TRUTH_KEYS.PRICE_POSITIONING, input.pricePositioning);
  push(PROJECT_TRUTH_KEYS.BRAND_ROLE, input.brandPositioning);
  push(PROJECT_TRUTH_KEYS.PRODUCT_BUSINESS_TOUCHPOINTS, input.businessTouchpoints);
  push(PROJECT_TRUTH_KEYS.PRODUCT_PACKAGING_STRUCTURES, input.packagingStructures);
  push(PROJECT_TRUTH_KEYS.LOCKED_ASSETS, input.lockedAssets);
  push(PROJECT_TRUTH_KEYS.LOCKED_FACTS, input.confirmedFacts);

  return { facts, evidence, warnings };
};
