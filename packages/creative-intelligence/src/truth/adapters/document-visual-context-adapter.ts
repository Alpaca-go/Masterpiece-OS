/**
 * Adapter: DocumentVisualContext → ProjectTruthFact[] + EvidenceEntry[].
 *
 * Spec #35: high-priority adapter. Map:
 *   brandName, industry, products, services, targetAudience, pricePositioning,
 *   businessModel, brandPersonality, visualPreferences, requiredTouchpoints,
 *   lockedFacts, prohibitedDirections, unknownFields, evidence[].
 *
 * Human confirmation (where available) must influence truth status.
 */

import type { ProjectTruthAdapter } from './adapter-types.ts';
import { factId, evidenceId, isUnknown } from '../normalization.ts';
import { PROJECT_TRUTH_KEYS } from '../key-registry.ts';
import type {
  ProjectTruthFact,
  TruthAuthority,
  TruthStatus,
  SourceType,
  EvidenceEntry,
  ProjectTruthWarning,
} from '../truth/contracts.ts';

interface DocumentEvidence {
  evidenceId?: string;
  excerpt?: string;
  sourceSection?: string;
  pageNumber?: number;
  documentId?: string;
  isUserConfirmation?: boolean;
}

interface DocumentVisualContextShape {
  sourceRunId?: string;
  generatedAt?: string;
  brandName?: string;
  industry?: string;
  products?: string[];
  services?: string[];
  targetAudience?: string[];
  pricePositioning?: string | null;
  businessModel?: string | null;
  brandPersonality?: string[];
  visualPreferences?: string[];
  requiredTouchpoints?: string[];
  lockedFacts?: string[];
  prohibitedDirections?: string[];
  unknownFields?: string[];
  evidence?: DocumentEvidence[];
  sourceDocuments?: Array<{
    documentId: string;
    filename: string;
    sourceType?: string;
    characterCount?: number;
    pageCount?: number;
  }>;
}

export const adaptDocumentVisualContext: ProjectTruthAdapter<DocumentVisualContextShape> = (input, ctx) => {
  const facts: ProjectTruthFact[] = [];
  const evidence: EvidenceEntry[] = [];
  const warnings: ProjectTruthWarning[] = [];

  if (!input || !input.sourceRunId) {
    warnings.push({
      code: 'CI_TRUTH_ADAPTER_INVALID_INPUT',
      message: 'DocumentVisualContext missing sourceRunId.',
      carrierId: ctx.projectId,
    });
    return { facts, evidence, warnings };
  }

  const sourceId = input.sourceRunId;
  const isRef = false; // DocumentVisualContext is current project only.

  // Build evidence for the document_section entries first.
  for (const ev of input.evidence ?? []) {
    if (!ev.documentId) continue;
    const id = ev.evidenceId ?? evidenceId('doc', ev.documentId, ev.sourceSection ?? 'general');
    evidence.push({
      id,
      type: 'document_section',
      sourceType: 'document_visual_context',
      sourceId,
      documentId: ev.documentId,
      content: ev.excerpt?.slice(0, 200),
      section: ev.sourceSection,
      page: ev.pageNumber,
      createdAt: ctx.generatedAt,
      isReferenceEvidence: false,
    });
  }

  // brand.name
  pushFact({
    facts,
    key: PROJECT_TRUTH_KEYS.BRAND_NAME,
    value: input.brandName,
    sourceId,
    ctx,
    sourceType: 'document_visual_context',
    authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    truthClass: 'fact',
    isRef,
  });

  // business.industry
  pushFact({
    facts,
    key: PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY,
    value: input.industry,
    sourceId,
    ctx,
    sourceType: 'document_visual_context',
    authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    truthClass: 'fact',
    isRef,
  });

  // business.model
  pushFact({
    facts,
    key: PROJECT_TRUTH_KEYS.BUSINESS_MODEL,
    value: input.businessModel ?? null,
    sourceId,
    ctx,
    sourceType: 'document_visual_context',
    authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    truthClass: 'fact',
    isRef,
  });

  // business.price_positioning
  pushFact({
    facts,
    key: PROJECT_TRUTH_KEYS.PRICE_POSITIONING,
    value: input.pricePositioning ?? null,
    sourceId,
    ctx,
    sourceType: 'document_visual_context',
    authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    truthClass: 'fact',
    isRef,
  });

  // product.core_products
  pushFact({
    facts,
    key: PROJECT_TRUTH_KEYS.PRODUCT_CORE_PRODUCTS,
    value: input.products ?? null,
    sourceId,
    ctx,
    sourceType: 'document_visual_context',
    authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    truthClass: 'fact',
    isRef,
  });

  // product.services
  pushFact({
    facts,
    key: PROJECT_TRUTH_KEYS.PRODUCT_SERVICES,
    value: input.services ?? null,
    sourceId,
    ctx,
    sourceType: 'document_visual_context',
    authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    truthClass: 'fact',
    isRef,
  });

  // audience.primary
  pushFact({
    facts,
    key: PROJECT_TRUTH_KEYS.AUDIENCE_PRIMARY,
    value: input.targetAudience ?? null,
    sourceId,
    ctx,
    sourceType: 'document_visual_context',
    authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    truthClass: 'fact',
    isRef,
  });

  // brand.personality
  pushFact({
    facts,
    key: PROJECT_TRUTH_KEYS.BRAND_PERSONALITY,
    value: input.brandPersonality ?? null,
    sourceId,
    ctx,
    sourceType: 'document_visual_context',
    authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    truthClass: 'fact',
    isRef,
  });

  // visual.preferences
  pushFact({
    facts,
    key: PROJECT_TRUTH_KEYS.VISUAL_PREFERENCES,
    value: input.visualPreferences ?? null,
    sourceId,
    ctx,
    sourceType: 'document_visual_context',
    authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    truthClass: 'fact',
    isRef,
  });

  // product.touchpoints
  pushFact({
    facts,
    key: PROJECT_TRUTH_KEYS.PRODUCT_TOUCHPOINTS,
    value: input.requiredTouchpoints ?? null,
    sourceId,
    ctx,
    sourceType: 'document_visual_context',
    authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    truthClass: 'fact',
    isRef,
  });

  // locked.facts
  pushFact({
    facts,
    key: PROJECT_TRUTH_KEYS.LOCKED_FACTS,
    value: input.lockedFacts ?? null,
    sourceId,
    ctx,
    sourceType: 'document_visual_context',
    authority: 'LOCKED',
    truthClass: 'user_requirement',
    isRef,
  });

  // constraint.prohibited_directions
  pushFact({
    facts,
    key: PROJECT_TRUTH_KEYS.CONSTRAINT_PROHIBITED_DIRECTIONS,
    value: input.prohibitedDirections ?? null,
    sourceId,
    ctx,
    sourceType: 'document_visual_context',
    authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    truthClass: 'fact',
    isRef,
  });

  // unknown.fields
  pushFact({
    facts,
    key: PROJECT_TRUTH_KEYS.UNKNOWN_FIELDS,
    value: input.unknownFields ?? null,
    sourceId,
    ctx,
    sourceType: 'document_visual_context',
    authority: 'UNKNOWN',
    truthClass: 'unknown',
    isRef,
  });

  return { facts, evidence, warnings };
};

interface PushOpts {
  facts: ProjectTruthFact[];
  key: string;
  value: unknown;
  sourceId: string;
  ctx: { projectId: string; generatedAt: string };
  sourceType: SourceType;
  authority: TruthAuthority;
  truthClass: 'fact' | 'user_requirement' | 'inference' | 'creative_hypothesis' | 'unknown';
  isRef: boolean;
}

function pushFact(o: PushOpts): void {
  const evRef = evidenceId('doc', o.sourceId, o.key);
  const status: TruthStatus = isUnknown(o.value) ? 'unknown' : 'observed';
  const truthClass = isUnknown(o.value) ? 'unknown' : o.truthClass;
  const authority = isUnknown(o.value) ? 'UNKNOWN' as TruthAuthority : o.authority;
  o.facts.push({
    id: factId(o.sourceType, o.sourceId, o.key),
    key: o.key,
    value: isUnknown(o.value) ? null : o.value,
    truthClass,
    status,
    authority,
    sourceType: o.sourceType,
    sourceId: o.sourceId,
    createdAt: o.ctx.generatedAt,
    evidenceRefs: [evRef],
    isReferenceFact: o.isRef,
  });
}
