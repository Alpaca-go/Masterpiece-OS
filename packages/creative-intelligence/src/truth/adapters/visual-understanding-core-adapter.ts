/**
 * Adapter: VisualUnderstandingCore → ProjectTruthFact[] + EvidenceEntry[].
 *
 * Spec #36:
 *   projectFacts      → truth candidates
 *   lockedAssets      → authoritative truth candidates
 *   diagnosis         → interpretation / evidence-linked analysis (NOT base truth)
 *   creativeDecision  → NOT base factual truth
 *
 * Do not flatten all fields into fact. Preserve evidence.
 */

import type { ProjectTruthAdapter } from './adapter-types.ts';
import { factId, evidenceId, isUnknown } from '../normalization.ts';
import { PROJECT_TRUTH_KEYS } from '../key-registry.ts';
import type {
  ProjectTruthFact,
  TruthAuthority,
  SourceType,
  TruthClass,
} from '../truth/contracts.ts';

interface SourcedFact<T> {
  value: T;
  source?: string;
  evidenceRefs?: string[];
  confidence?: number;
  status?: 'confirmed' | 'probable' | 'unknown' | 'conflict';
}

interface VisualUnderstandingCoreShape {
  projectId?: string;
  generatedAt?: string;
  sourceFingerprint?: string;
  projectFacts?: {
    brandName?: SourcedFact<string>;
    industry?: SourcedFact<string>;
    brandRole?: SourcedFact<string>;
    businessModel?: SourcedFact<string>;
    targetAudience?: SourcedFact<string[]>;
  };
  lockedAssets?: Array<{ assetId: string; reason?: string }>;
  creativeDecision?: Record<string, unknown>; // NOT base truth
  diagnosis?: Record<string, unknown>; // interpretation
}

export const adaptVisualUnderstandingCore: ProjectTruthAdapter<VisualUnderstandingCoreShape> = (input, ctx) => {
  const facts: ProjectTruthFact[] = [];
  const evidence = [];
  const warnings = [];

  if (!input || !input.projectId) {
    warnings.push({
      code: 'CI_TRUTH_ADAPTER_INVALID_INPUT',
      message: 'VisualUnderstandingCore missing projectId.',
      carrierId: ctx.projectId,
    });
    return { facts, evidence, warnings };
  }

  const sourceId = input.projectId;
  const isRef = false;

  // projectFacts.brandName
  const brandName = input.projectFacts?.brandName;
  if (brandName && !isUnknown(brandName.value)) {
    facts.push(buildFact({
      key: PROJECT_TRUTH_KEYS.BRAND_NAME,
      value: brandName.value,
      sourceId,
      sourceType: 'visual_understanding_core',
      authority: 'VISUAL_SOURCE_FACT',
      truthClass: 'fact',
      confidence: brandName.confidence,
      ctx,
      isRef,
      sourceStatus: brandName.status,
    }));
  }

  // projectFacts.industry
  const industry = input.projectFacts?.industry;
  if (industry && !isUnknown(industry.value)) {
    facts.push(buildFact({
      key: PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY,
      value: industry.value,
      sourceId,
      sourceType: 'visual_understanding_core',
      authority: 'VISUAL_SOURCE_FACT',
      truthClass: 'fact',
      confidence: industry.confidence,
      ctx,
      isRef,
      sourceStatus: industry.status,
    }));
  }

  // projectFacts.brandRole
  const brandRole = input.projectFacts?.brandRole;
  if (brandRole && !isUnknown(brandRole.value)) {
    facts.push(buildFact({
      key: PROJECT_TRUTH_KEYS.BRAND_ROLE,
      value: brandRole.value,
      sourceId,
      sourceType: 'visual_understanding_core',
      authority: 'VISUAL_SOURCE_FACT',
      truthClass: 'fact',
      confidence: brandRole.confidence,
      ctx,
      isRef,
      sourceStatus: brandRole.status,
    }));
  }

  // projectFacts.businessModel
  const businessModel = input.projectFacts?.businessModel;
  if (businessModel && !isUnknown(businessModel.value)) {
    facts.push(buildFact({
      key: PROJECT_TRUTH_KEYS.BUSINESS_MODEL,
      value: businessModel.value,
      sourceId,
      sourceType: 'visual_understanding_core',
      authority: 'VISUAL_SOURCE_FACT',
      truthClass: 'fact',
      confidence: businessModel.confidence,
      ctx,
      isRef,
      sourceStatus: businessModel.status,
    }));
  }

  // projectFacts.targetAudience
  const audience = input.projectFacts?.targetAudience;
  if (audience && Array.isArray(audience.value) && audience.value.length > 0) {
    facts.push(buildFact({
      key: PROJECT_TRUTH_KEYS.AUDIENCE_PRIMARY,
      value: [...audience.value],
      sourceId,
      sourceType: 'visual_understanding_core',
      authority: 'VISUAL_SOURCE_FACT',
      truthClass: 'fact',
      confidence: audience.confidence,
      ctx,
      isRef,
      sourceStatus: audience.status,
    }));
  }

  // lockedAssets → authority=LOCKED
  for (const la of input.lockedAssets ?? []) {
    if (!la?.assetId) continue;
    const factKey = la.assetId.startsWith('logo') || la.reason?.includes('logo')
      ? PROJECT_TRUTH_KEYS.LOCKED_LOGO
      : PROJECT_TRUTH_KEYS.LOCKED_ASSETS;
    facts.push({
      id: factId('visual_understanding_core', sourceId, `${factKey}:${la.assetId}`),
      key: factKey,
      value: la.assetId,
      truthClass: 'user_requirement',
      status: 'confirmed',
      authority: 'LOCKED' as TruthAuthority,
      sourceType: 'visual_understanding_core' as SourceType,
      sourceId,
      createdAt: ctx.generatedAt,
      evidenceRefs: [evidenceId('locked', la.assetId)],
      isReferenceFact: isRef,
    });
  }

  // evidence: at least the model-inference evidence for the model call.
  evidence.push({
    id: evidenceId('model', sourceId, 'visual_understanding_core'),
    type: 'model_inference' as const,
    sourceType: 'visual_understanding_core',
    sourceId,
    sourceFingerprint: input.sourceFingerprint,
    createdAt: ctx.generatedAt,
    isReferenceEvidence: false,
  });

  return { facts, evidence, warnings };
};

interface BuildFactOpts {
  key: string;
  value: unknown;
  sourceId: string;
  sourceType: SourceType;
  authority: TruthAuthority;
  truthClass: TruthClass;
  confidence?: number;
  ctx: { projectId: string; generatedAt: string };
  isRef: boolean;
  sourceStatus?: 'confirmed' | 'probable' | 'unknown' | 'conflict';
}

function buildFact(o: BuildFactOpts): ProjectTruthFact {
  // status mapping: source confirmed → verified; probable → observed; conflict → conflicted.
  let status: 'observed' | 'verified' | 'conflicted' = 'observed';
  if (o.sourceStatus === 'confirmed') status = 'verified';
  if (o.sourceStatus === 'conflict') status = 'conflicted';
  return {
    id: factId(o.sourceType, o.sourceId, o.key),
    key: o.key,
    value: o.value,
    truthClass: o.truthClass,
    status,
    authority: o.authority,
    confidence: o.confidence,
    sourceType: o.sourceType,
    sourceId: o.sourceId,
    createdAt: o.ctx.generatedAt,
    evidenceRefs: [evidenceId('model', o.sourceId, o.key)],
    isReferenceFact: o.isRef,
  };
}
