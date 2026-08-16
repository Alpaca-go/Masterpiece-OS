/**
 * Adapter: ProjectRecord → ProjectTruthFact[] + EvidenceEntry[].
 *
 * ProjectRecord is the runtime project record (project-contracts via runtime-core).
 * Spec #34: distinguish user/project metadata from model-derived facts.
 *           Do not promote derived metadata to user-confirmed fact unless
 *           source semantics prove it.
 *
 * Source: `@masterpiece/project-contracts` + `runtime-core/application-contracts`.
 * This adapter does NOT import runtime-core — it only accepts the structural
 * shape it needs.
 */

import type { ProjectTruthAdapter } from './adapter-types.ts';
import { factId, evidenceId, isUnknown } from '../normalization.ts';
import { PROJECT_TRUTH_KEYS } from '../key-registry.ts';
import type { ProjectTruthFact, TruthAuthority, TruthClass, SourceType } from '../truth/contracts.ts';

interface ProjectRecordShape {
  id: string;
  projectName?: string;
  detectedProjectName?: string;
  brandName?: string;
  industry?: string;
  detectedBrandName?: string;
  detectedIndustry?: string;
  logoLocked?: boolean;
  lockedFacts?: string[];
  outputLanguage?: string;
  provider?: string;
  model?: string;
  apiProfileId?: string | null;
  factConfidence?: { brandName?: number; industry?: number };
  activeReferenceSource?: { projectId?: string; sourcePath?: string } | null;
}

export const adaptProjectRecord: ProjectTruthAdapter<ProjectRecordShape> = (input, ctx) => {
  const facts: ProjectTruthFact[] = [];
  const evidence = [];
  const warnings = [];

  if (!input || !input.id) {
    warnings.push({
      code: 'CI_TRUTH_ADAPTER_INVALID_INPUT',
      message: 'ProjectRecord missing required id field.',
      carrierId: ctx.projectId,
    });
    return { facts, evidence, warnings };
  }

  const sourceId = input.id;
  const isRef = Boolean(input.activeReferenceSource?.projectId);

  // brand.name — user-confirmed when logoLocked OR explicit user brandName present.
  if (isMeaningful(input.brandName)) {
    facts.push({
      id: factId('project_record', sourceId, PROJECT_TRUTH_KEYS.BRAND_NAME),
      key: PROJECT_TRUTH_KEYS.BRAND_NAME,
      value: input.brandName,
      truthClass: 'fact',
      status: 'observed',
      authority: 'AUTHORITATIVE_PROJECT_METADATA' as TruthAuthority,
      confidence: input.factConfidence?.brandName,
      sourceType: 'project_record' as SourceType,
      sourceId,
      createdAt: ctx.generatedAt,
      evidenceRefs: [evidenceId('project', sourceId, 'brand_name')],
      isReferenceFact: isRef,
    });
  } else if (isMeaningful(input.detectedBrandName)) {
    // Derived — DO NOT promote to confirmed.
    facts.push({
      id: factId('project_record', sourceId, PROJECT_TRUTH_KEYS.BRAND_NAME),
      key: PROJECT_TRUTH_KEYS.BRAND_NAME,
      value: input.detectedBrandName,
      truthClass: 'inference',
      status: 'observed',
      authority: 'AUTHORITATIVE_PROJECT_METADATA' as TruthAuthority,
      sourceType: 'project_record' as SourceType,
      sourceId,
      createdAt: ctx.generatedAt,
      evidenceRefs: [evidenceId('project', sourceId, 'detected_brand_name')],
      isReferenceFact: isRef,
    });
    warnings.push({
      code: 'CI_TRUTH_DERIVED_BRAND_NAME',
      message: 'brand.name came from detected metadata (inference, not user-confirmed).',
      carrierId: sourceId,
      key: PROJECT_TRUTH_KEYS.BRAND_NAME,
    });
  } else {
    facts.push({
      id: factId('project_record', sourceId, PROJECT_TRUTH_KEYS.BRAND_NAME),
      key: PROJECT_TRUTH_KEYS.BRAND_NAME,
      value: null,
      truthClass: 'unknown',
      status: 'unknown',
      authority: 'UNKNOWN' as TruthAuthority,
      sourceType: 'project_record' as SourceType,
      sourceId,
      createdAt: ctx.generatedAt,
      evidenceRefs: [],
      isReferenceFact: isRef,
    });
  }

  // business.industry — same semantics.
  if (isMeaningful(input.industry)) {
    facts.push({
      id: factId('project_record', sourceId, PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY),
      key: PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY,
      value: input.industry,
      truthClass: 'fact',
      status: 'observed',
      authority: 'AUTHORITATIVE_PROJECT_METADATA' as TruthAuthority,
      confidence: input.factConfidence?.industry,
      sourceType: 'project_record' as SourceType,
      sourceId,
      createdAt: ctx.generatedAt,
      evidenceRefs: [evidenceId('project', sourceId, 'industry')],
      isReferenceFact: isRef,
    });
  } else if (isMeaningful(input.detectedIndustry)) {
    facts.push({
      id: factId('project_record', sourceId, PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY),
      key: PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY,
      value: input.detectedIndustry,
      truthClass: 'inference',
      status: 'observed',
      authority: 'AUTHORITATIVE_PROJECT_METADATA' as TruthAuthority,
      sourceType: 'project_record' as SourceType,
      sourceId,
      createdAt: ctx.generatedAt,
      evidenceRefs: [evidenceId('project', sourceId, 'detected_industry')],
      isReferenceFact: isRef,
    });
  } else {
    facts.push({
      id: factId('project_record', sourceId, PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY),
      key: PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY,
      value: null,
      truthClass: 'unknown',
      status: 'unknown',
      authority: 'UNKNOWN' as TruthAuthority,
      sourceType: 'project_record' as SourceType,
      sourceId,
      createdAt: ctx.generatedAt,
      evidenceRefs: [],
      isReferenceFact: isRef,
    });
  }

  // locked.logo
  if (input.logoLocked) {
    facts.push({
      id: factId('project_record', sourceId, PROJECT_TRUTH_KEYS.LOCKED_LOGO),
      key: PROJECT_TRUTH_KEYS.LOCKED_LOGO,
      value: true,
      truthClass: 'user_requirement',
      status: 'confirmed',
      authority: 'LOCKED' as TruthAuthority,
      sourceType: 'project_record' as SourceType,
      sourceId,
      createdAt: ctx.generatedAt,
      evidenceRefs: [evidenceId('project', sourceId, 'logo_locked')],
      isReferenceFact: isRef,
    });
  }

  // locked.facts
  if (Array.isArray(input.lockedFacts) && input.lockedFacts.length > 0) {
    facts.push({
      id: factId('project_record', sourceId, PROJECT_TRUTH_KEYS.LOCKED_FACTS),
      key: PROJECT_TRUTH_KEYS.LOCKED_FACTS,
      value: [...input.lockedFacts],
      truthClass: 'user_requirement',
      status: 'confirmed',
      authority: 'LOCKED' as TruthAuthority,
      sourceType: 'project_record' as SourceType,
      sourceId,
      createdAt: ctx.generatedAt,
      evidenceRefs: [evidenceId('project', sourceId, 'locked_facts')],
      isReferenceFact: isRef,
    });
  }

  // Evidence entries
  evidence.push({
    id: evidenceId('project', sourceId, 'brand_name'),
    type: 'project_metadata' as const,
    sourceType: 'project_record',
    sourceId,
    content: 'ProjectRecord.brandName',
    confidence: input.factConfidence?.brandName,
    createdAt: ctx.generatedAt,
    isReferenceEvidence: isRef,
  });
  evidence.push({
    id: evidenceId('project', sourceId, 'industry'),
    type: 'project_metadata' as const,
    sourceType: 'project_record',
    sourceId,
    content: 'ProjectRecord.industry',
    confidence: input.factConfidence?.industry,
    createdAt: ctx.generatedAt,
    isReferenceEvidence: isRef,
  });

  // Reference contamination guard.
  if (isRef) {
    warnings.push({
      code: 'CI_TRUTH_REFERENCE_PROJECT',
      message: `ProjectRecord carries activeReferenceSource (${input.activeReferenceSource?.projectId ?? 'unknown'}). Reference facts must not contaminate current truth.`,
      carrierId: sourceId,
    });
  }

  return { facts, evidence, warnings };
};

function isMeaningful(value: unknown): boolean {
  if (isUnknown(value)) return false;
  return true;
}
