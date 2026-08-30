/**
 * Adapter: NormalizedProjectFacts → ProjectTruthFact[] + EvidenceEntry[].
 *
 * Spec #36-like: derived from upstream; lower authority than its source.
 * ReferenceStyleCapsule carries projectFacts as NormalizedProjectFacts —
 * we treat the sourceId as the capsule runId.
 */

import type { AdapterOutput, ProjectTruthAdapter } from './adapter-types.ts';
import { factId, evidenceId, isUnknown } from '../normalization.ts';
import { PROJECT_TRUTH_KEYS } from '../key-registry.ts';
import type {
  ProjectTruthFact,
  TruthAuthority,
  SourceType,
} from '../contracts.ts';

interface NormalizedProjectFactsShape {
  coreProducts?: string[];
  services?: string[];
  touchpoints?: {
    packaging?: string[];
    viApplications?: string[];
    serviceMaterials?: string[];
    spatial?: string[];
    digital?: string[];
  };
  designAdvice?: string[];
  uncertainties?: string[];
}

interface NormalizedFactsCarrier {
  runId?: string;
  sourceFingerprint?: string;
  projectFacts: NormalizedProjectFactsShape;
}

export const adaptNormalizedProjectFacts: ProjectTruthAdapter<NormalizedFactsCarrier> = (input, ctx) => {
  const facts: ProjectTruthFact[] = [];
  const evidence: AdapterOutput['evidence'] = [];
  const warnings: AdapterOutput['warnings'] = [];

  if (!input || !input.projectFacts) {
    warnings.push({
      code: 'CI_TRUTH_ADAPTER_INVALID_INPUT',
      message: 'NormalizedProjectFacts missing projectFacts.',
      carrierId: ctx.projectId,
    });
    return { facts, evidence, warnings };
  }

  const sourceId = input.runId ?? 'normalized-project-facts';
  const isRef = false;
  const sourceType: SourceType = 'normalized_project_facts';
  const authority: TruthAuthority = 'SYSTEM_DEFAULT';

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
        evidenceRefs: [evidenceId('project', sourceId, key)],
        isReferenceFact: isRef,
      });
    }
  };

  const pf = input.projectFacts;
  if (Array.isArray(pf.coreProducts)) push(PROJECT_TRUTH_KEYS.PRODUCT_CORE_PRODUCTS, pf.coreProducts);
  if (Array.isArray(pf.services)) push(PROJECT_TRUTH_KEYS.PRODUCT_SERVICES, pf.services);
  if (pf.touchpoints) {
    const tp = [
      ...(pf.touchpoints.packaging ?? []),
      ...(pf.touchpoints.viApplications ?? []),
      ...(pf.touchpoints.serviceMaterials ?? []),
      ...(pf.touchpoints.spatial ?? []),
      ...(pf.touchpoints.digital ?? []),
    ];
    if (tp.length > 0) push(PROJECT_TRUTH_KEYS.PRODUCT_TOUCHPOINTS, tp);
  }
  if (Array.isArray(pf.uncertainties) && pf.uncertainties.length > 0) {
    push(PROJECT_TRUTH_KEYS.UNKNOWN_FIELDS, pf.uncertainties);
  }

  return { facts, evidence, warnings };
};
