/**
 * Adapter: PromptSourceObject → ProjectTruthFact[] + EvidenceEntry[].
 *
 * Spec #37: treat as a derived / compatibility carrier.
 *           Lower authority than the upstream source it was derived from.
 *           Avoid duplicate promotion when equivalent upstream facts already exist.
 *
 * We mark this carrier with a unique `prompt-source-object` source fingerprint
 * and use `SYSTEM_DEFAULT`-adjacent authority (or `MODEL_INFERENCE` when
 * provenance kinds include structured_analysis).
 */

import type { AdapterOutput, ProjectTruthAdapter } from './adapter-types.ts';
import { factId, evidenceId, isUnknown } from '../normalization.ts';
import { PROJECT_TRUTH_KEYS } from '../key-registry.ts';
import type {
  ProjectTruthFact,
  TruthAuthority,
  SourceType,
} from '../contracts.ts';

interface PromptSourceObjectShape {
  projectId?: string;
  generatedAt?: string;
  projectFacts?: {
    brandName?: string;
    industry?: string;
    brandRole?: string;
    businessModel?: string | null;
    primaryOfferings?: string[];
  };
  lockedAssets?: {
    logoAssetIds?: string[];
    preferredLogoAssetId?: string | null;
    confirmedColors?: string[];
    mustPreserve?: string[];
    immutableStructures?: string[];
  };
  provenance?: {
    sourceKinds?: string[];
    structuredAnalysisRunId?: string;
    sourceFingerprint?: string;
  };
}

export const adaptPromptSourceObject: ProjectTruthAdapter<PromptSourceObjectShape> = (input, ctx) => {
  const facts: ProjectTruthFact[] = [];
  const evidence: AdapterOutput['evidence'] = [];
  const warnings: AdapterOutput['warnings'] = [];

  if (!input || !input.projectId) {
    warnings.push({
      code: 'CI_TRUTH_ADAPTER_INVALID_INPUT',
      message: 'PromptSourceObject missing projectId.',
      carrierId: ctx.projectId,
    });
    return { facts, evidence, warnings };
  }

  const sourceId = input.provenance?.structuredAnalysisRunId ?? input.projectId;
  const isRef = false;
  const authority: TruthAuthority = 'SYSTEM_DEFAULT';
  const sourceType: SourceType = 'prompt_source_object';

  const push = (key: string, value: unknown, refId: string) => {
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
        evidenceRefs: [refId],
        isReferenceFact: isRef,
      });
    }
  };

  if (input.projectFacts) {
    push(PROJECT_TRUTH_KEYS.BRAND_NAME, input.projectFacts.brandName, evidenceId('project', sourceId, 'pso_brand_name'));
    push(PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY, input.projectFacts.industry, evidenceId('project', sourceId, 'pso_industry'));
    push(PROJECT_TRUTH_KEYS.BRAND_ROLE, input.projectFacts.brandRole, evidenceId('project', sourceId, 'pso_brand_role'));
    push(PROJECT_TRUTH_KEYS.BUSINESS_MODEL, input.projectFacts.businessModel ?? null, evidenceId('project', sourceId, 'pso_business_model'));
    push(PROJECT_TRUTH_KEYS.PRODUCT_CORE_PRODUCTS, input.projectFacts.primaryOfferings ?? null, evidenceId('project', sourceId, 'pso_primary_offerings'));
  }

  if (input.lockedAssets) {
    if (Array.isArray(input.lockedAssets.logoAssetIds) && input.lockedAssets.logoAssetIds.length > 0) {
      push(PROJECT_TRUTH_KEYS.LOCKED_LOGO, true, evidenceId('project', sourceId, 'pso_logo_locked'));
    }
    if (Array.isArray(input.lockedAssets.confirmedColors) && input.lockedAssets.confirmedColors.length > 0) {
      push(PROJECT_TRUTH_KEYS.LOCKED_FACTS, [...input.lockedAssets.confirmedColors], evidenceId('project', sourceId, 'pso_confirmed_colors'));
    }
  }

  // Mark the carrier as derived (lower precedence).
  if (input.provenance?.sourceKinds?.includes('structured_analysis')) {
    evidence.push({
      id: evidenceId('model', sourceId, 'pso_provenance'),
      type: 'model_inference' as const,
      sourceType,
      sourceId,
      content: 'PromptSourceObject derived from structured_analysis run.',
      sourceFingerprint: input.provenance.sourceFingerprint,
      createdAt: ctx.generatedAt,
      isReferenceEvidence: false,
    });
    warnings.push({
      code: 'CI_TRUTH_PSO_DERIVED',
      message: 'PromptSourceObject is derived — downstream assembler treats it as lower authority.',
      carrierId: sourceId,
    });
  }

  return { facts, evidence, warnings };
};
