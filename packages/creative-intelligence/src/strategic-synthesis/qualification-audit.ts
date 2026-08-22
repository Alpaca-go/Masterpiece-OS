/**
 * Zero-network qualification audit contracts.
 *
 * These helpers expose diagnostics and acceptance decisions only. They do
 * not call a model, mutate an accepted artifact, or create source authority.
 */

import type { StrategicSynthesisArtifact } from './contracts.ts';
import type {
  PlanningClaimKey,
  PlanningEpistemicClass,
  PlanningStrategicClaim
} from './planning-strategic-evidence.ts';
import type {
  PlanningSemanticExtractionResult
} from './planning-semantic-extraction.ts';
import { classifyPlanningClaimEpistemicClass } from './epistemic-classifier.ts';
import { routePlanningClaim, type RoutingDestination } from './epistemic-routing.ts';

const MODALITY_MARKERS = [
  ['待确认', /待确认/u],
  ['未知', /未知/u],
  ['未定', /未定/u],
  ['TBD', /\bTBD\b/iu],
  ['not confirmed', /\bnot\s+confirmed\b/iu],
  ['必须', /必须/u],
  ['需要', /需要/u],
  ['应该', /应该/u],
  ['目标是', /目标是/u],
  ['希望', /希望/u],
  ['要求', /要求/u],
  ['should', /\bshould\b/iu],
  ['must', /\bmust\b/iu],
  ['need to', /\bneed(?:s|ed)?\s+to\b/iu],
  ['required', /\brequired\b/iu],
  ['建议', /建议/u],
  ['可以考虑', /可以考虑/u],
  ['推测', /推测/u],
  ['可能', /可能/u],
  ['或许', /或许/u],
  ['recommend', /\brecommend(?:ed|ation)?\b/iu],
  ['suggest', /\bsuggest(?:ed|ion)?\b/iu],
  ['could', /\bcould\b/iu],
  ['may', /\bmay\b/iu],
  ['likely', /\blikely\b/iu]
] as const;

export function findPlanningModalityMarkers(text: string): string[] {
  return MODALITY_MARKERS
    .filter(([, pattern]) => pattern.test(text))
    .map(([marker]) => marker);
}

/** Build a bounded audit-only view of source sections without exporting text. */
export function collectPlanningSourceSectionText(
  rawText: string,
  sectionRefs: readonly string[],
  windowSize = 1200
): string {
  const tokens = sectionRefs
    .flatMap((section) => section.split(/[；;/]/u))
    .map((token) => token.trim().replace(/^第[一二三四五六七八九十0-9]+章[：:]?\s*/u, ''))
    .filter((token) => token.length >= 2);
  const windows: string[] = [];
  for (const token of tokens) {
    const index = rawText.indexOf(token);
    if (index >= 0) windows.push(rawText.slice(index, index + windowSize));
  }
  return windows.join('\n');
}

export interface PlanningEpistemicAuditEntry {
  claimId: string;
  key: PlanningClaimKey;
  modelProposal: PlanningEpistemicClass;
  deterministicClass: PlanningEpistemicClass;
  finalClass: PlanningEpistemicClass;
  route: RoutingDestination;
  sourceSectionRefs: string[];
  sourceModalityMarkers: string[];
  extractedValueModalityMarkers: string[];
  evidenceSummaryModalityMarkers: string[];
}

export function buildPlanningEpistemicAudit(args: {
  extraction: PlanningSemanticExtractionResult;
  finalClaims: readonly PlanningStrategicClaim[];
  documentRole: string;
  sourceTextByKey?: Partial<Record<PlanningClaimKey, string>>;
}): PlanningEpistemicAuditEntry[] {
  return args.extraction.claims.map((extracted) => {
    const finalClaim = args.finalClaims.find(
      (claim) => claim.key === extracted.key && claim.value === extracted.value
    );
    if (!finalClaim) throw new Error(`QUALIFICATION_EPISTEMIC_FINAL_CLAIM_MISSING: ${extracted.key}`);
    const evidenceSummary = extracted.evidence.map((entry) => entry.summary).join('\n');
    const deterministicClass = classifyPlanningClaimEpistemicClass({
      value: extracted.value,
      lineText: [extracted.value, evidenceSummary].join('\n'),
      documentRole: args.documentRole
    });
    return {
      claimId: finalClaim.claimId,
      key: extracted.key,
      modelProposal: extracted.epistemicClass,
      deterministicClass,
      finalClass: finalClaim.epistemicClass,
      route: routePlanningClaim(finalClaim).destination,
      sourceSectionRefs: Array.from(new Set(
        extracted.evidence.map((entry) => entry.section).filter((section): section is string => Boolean(section))
      )).sort(),
      sourceModalityMarkers: findPlanningModalityMarkers(args.sourceTextByKey?.[extracted.key] ?? ''),
      extractedValueModalityMarkers: findPlanningModalityMarkers(extracted.value),
      evidenceSummaryModalityMarkers: findPlanningModalityMarkers(evidenceSummary)
    };
  }).sort((a, b) => a.claimId.localeCompare(b.claimId));
}

export interface StrategicPlanningUsageAudit {
  projectUnderstanding: { planningClaimRefs: string[] };
  tensions: Array<{ id: string; planningClaimRefs: string[] }>;
  insights: Array<{ id: string; planningClaimRefs: string[] }>;
  opportunities: Array<{ id: string; planningClaimRefs: string[] }>;
  usedPlanningClaimIds: string[];
  usedPlanningClaimCount: number;
  totalPlanningClaimRefOccurrences: number;
  uncitedPlanningClaimIds: string[];
  directAnchorTraceCoverage: {
    evaluatedAnchorClaimIds: string[];
    citedAnchorClaimIds: string[];
    uncitedAnchorClaimIds: string[];
    citedCount: number;
    totalCount: number;
    ratio: number;
  };
}

export function auditStrategicPlanningUsage(args: {
  artifact: StrategicSynthesisArtifact;
  allowedPlanningClaimIds: readonly string[];
  anchorClaimIds: readonly string[];
}): StrategicPlanningUsageAudit {
  const projectUnderstanding = {
    planningClaimRefs: [...args.artifact.projectUnderstanding.planningClaimRefs]
  };
  const tensions = args.artifact.tensions.map((item) => ({ id: item.id, planningClaimRefs: [...item.planningClaimRefs] }));
  const insights = args.artifact.insights.map((item) => ({ id: item.id, planningClaimRefs: [...item.planningClaimRefs] }));
  const opportunities = args.artifact.opportunities.map((item) => ({ id: item.id, planningClaimRefs: [...item.planningClaimRefs] }));
  const occurrences = [
    ...projectUnderstanding.planningClaimRefs,
    ...tensions.flatMap((item) => item.planningClaimRefs),
    ...insights.flatMap((item) => item.planningClaimRefs),
    ...opportunities.flatMap((item) => item.planningClaimRefs)
  ];
  const usedPlanningClaimIds = Array.from(new Set(occurrences)).sort();
  const allowed = Array.from(new Set(args.allowedPlanningClaimIds)).sort();
  const anchors = Array.from(new Set(args.anchorClaimIds)).sort();
  const used = new Set(usedPlanningClaimIds);
  const citedAnchorClaimIds = anchors.filter((id) => used.has(id));
  const uncitedAnchorClaimIds = anchors.filter((id) => !used.has(id));
  return {
    projectUnderstanding,
    tensions,
    insights,
    opportunities,
    usedPlanningClaimIds,
    usedPlanningClaimCount: usedPlanningClaimIds.length,
    totalPlanningClaimRefOccurrences: occurrences.length,
    uncitedPlanningClaimIds: allowed.filter((id) => !used.has(id)),
    directAnchorTraceCoverage: {
      evaluatedAnchorClaimIds: anchors,
      citedAnchorClaimIds,
      uncitedAnchorClaimIds,
      citedCount: citedAnchorClaimIds.length,
      totalCount: anchors.length,
      ratio: anchors.length === 0 ? 1 : citedAnchorClaimIds.length / anchors.length
    }
  };
}

export interface TraceabilityAcceptanceInput {
  requiredSemanticAnchorCount: number;
  semanticAnchors: Array<{ key: string; retained: boolean; contradicted?: boolean }>;
  materialSilentLossCount: number;
  gateResults: {
    SG01: boolean;
    SG11: boolean;
    SG12: boolean;
    SG13: boolean;
    SG14: boolean;
    SG15: boolean;
  };
  traceabilityScore: number;
  usage: StrategicPlanningUsageAudit;
}

export function evaluateTraceabilityAcceptance(input: TraceabilityAcceptanceInput): {
  passed: boolean;
  failures: string[];
  warnings: string[];
} {
  const failures: string[] = [];
  if (input.semanticAnchors.length !== input.requiredSemanticAnchorCount) {
    failures.push('TRACE_SEMANTIC_ANCHOR_COUNT');
  }
  if (input.semanticAnchors.some((anchor) => !anchor.retained)) failures.push('TRACE_MATERIAL_ANCHOR_ABSENT');
  if (input.materialSilentLossCount > 0) failures.push('TRACE_MATERIAL_SILENT_LOSS');
  if (input.semanticAnchors.some((anchor) => anchor.contradicted)) failures.push('TRACE_ANCHOR_CONTRADICTION');
  for (const [gate, passed] of Object.entries(input.gateResults)) {
    if (!passed) failures.push(`TRACE_${gate}_FAILED`);
  }
  if (input.traceabilityScore < 2) failures.push('TRACE_HUMAN_REVIEW_BELOW_2');
  const warnings: string[] = [];
  if (input.usage.directAnchorTraceCoverage.ratio < 1) warnings.push('TRACE_DIRECT_ANCHOR_COVERAGE_DIAGNOSTIC');
  if (input.usage.uncitedPlanningClaimIds.length > 0) warnings.push('TRACE_UNCITED_PLANNING_CLAIMS_DIAGNOSTIC');
  return { passed: failures.length === 0, failures, warnings };
}

export const QUALIFICATION_EVIDENCE_V2_SCHEMA_VERSION = 'ci-qualification-evidence-v2' as const;
export const QUALIFICATION_EVIDENCE_V2_1_SCHEMA_VERSION = 'ci-qualification-evidence-v2.1' as const;

export type QualificationAttemptKind = 'BASE' | 'TRANSPORT_RETRY' | 'SEMANTIC_REPAIR';

export interface TransportAwareCallLedgerEntry {
  stage: string;
  attemptKind: QualificationAttemptKind;
  provider: string;
  model: string;
  latencyMs: number;
  success: boolean;
  errorCode: string | null;
  causeCode: string | null;
  failureClass: string | null;
  retryable: boolean | null;
  responseHeadersReceived: boolean;
  finishReason?: string;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
}

export interface RedactedQualificationEvidenceV2 {
  schemaVersion: typeof QUALIFICATION_EVIDENCE_V2_SCHEMA_VERSION | typeof QUALIFICATION_EVIDENCE_V2_1_SCHEMA_VERSION;
  sourceHashes: { sha256: string; registeredContentHash: string };
  callLedger: Array<{
    stage: string;
    provider: string;
    model: string;
    latencyMs: number;
    finishReason?: string;
    usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  }>;
  planningClaims: Array<Pick<PlanningStrategicClaim, 'claimId' | 'key' | 'epistemicClass' | 'sourceDocumentId' | 'chunkRefs'>>;
  planningEpistemicAudit: PlanningEpistemicAuditEntry[];
  allowedSourceSets: { facts: string[]; needs: string[]; evidence: string[]; planningClaims: string[] };
  artifactMirrorSets: { planningTruth: string[]; needs: string[]; evidence: string[]; planningClaims: string[] };
  blockedCodes: { accepted: string[]; attempts: Array<{ attempt: number; blockedCodes: string[] }> };
  stageStatuses: Record<string, { status: string; attempts: number }>;
  strategicUsage: StrategicPlanningUsageAudit;
}

export function classifyStrategicQualificationFailure(input: {
  stage: { status: string };
  callLedger: Array<{ stage: string; success?: boolean; responseHeadersReceived?: boolean }>;
}): 'HOLD_FOR_PROVIDER_TRANSPORT_REPAIR' | 'HOLD_FOR_STRATEGIC_SYNTHESIS_REPAIR' | null {
  if (input.stage.status === 'PASS') return null;
  const strategicCalls = input.callLedger.filter((entry) => entry.stage === 'strategic_synthesis');
  const usableResponseReachedRuntime = strategicCalls.some((entry) => entry.success === true);
  return usableResponseReachedRuntime
    ? 'HOLD_FOR_STRATEGIC_SYNTHESIS_REPAIR'
    : 'HOLD_FOR_PROVIDER_TRANSPORT_REPAIR';
}

const FORBIDDEN_EVIDENCE_KEYS = new Set([
  'apiKey', 'credentials', 'rawText', 'rawOutputs', 'responseBody', 'baseUrl', 'fullProviderResponse',
  'stack', 'fullUrl', 'endpointUrl'
]);

export function validateRedactedQualificationEvidenceV2(input: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['evidence must be an object'] };
  }
  const root = input as Record<string, unknown>;
  if (
    root.schemaVersion !== QUALIFICATION_EVIDENCE_V2_SCHEMA_VERSION
    && root.schemaVersion !== QUALIFICATION_EVIDENCE_V2_1_SCHEMA_VERSION
  ) errors.push('invalid schemaVersion');
  for (const required of ['sourceHashes', 'callLedger', 'planningClaims', 'planningEpistemicAudit', 'allowedSourceSets', 'artifactMirrorSets', 'blockedCodes', 'stageStatuses', 'strategicUsage']) {
    if (!(required in root)) errors.push(`missing ${required}`);
  }
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_EVIDENCE_KEYS.has(key)) errors.push(`forbidden key: ${key}`);
      walk(child);
    }
  };
  walk(root);
  if (root.schemaVersion === QUALIFICATION_EVIDENCE_V2_1_SCHEMA_VERSION) {
    const ledger = root.callLedger;
    if (!Array.isArray(ledger)) {
      errors.push('callLedger must be an array');
    } else {
      ledger.forEach((entry, index) => {
        const call = entry as Partial<TransportAwareCallLedgerEntry>;
        if (!['BASE', 'TRANSPORT_RETRY', 'SEMANTIC_REPAIR'].includes(String(call.attemptKind))) errors.push(`callLedger[${index}].attemptKind invalid`);
        if (typeof call.success !== 'boolean') errors.push(`callLedger[${index}].success must be boolean`);
        if (typeof call.responseHeadersReceived !== 'boolean') errors.push(`callLedger[${index}].responseHeadersReceived must be boolean`);
        if (call.success === false) {
          if (!call.errorCode) errors.push(`callLedger[${index}].errorCode required on failure`);
          if (
            !Object.prototype.hasOwnProperty.call(call, 'causeCode')
            || (call.causeCode !== null && typeof call.causeCode !== 'string')
          ) errors.push(`callLedger[${index}].causeCode required on failure`);
          if (!call.failureClass) errors.push(`callLedger[${index}].failureClass required on failure`);
          if (typeof call.retryable !== 'boolean') errors.push(`callLedger[${index}].retryable required on failure`);
        }
      });
    }
  }
  const usage = root.strategicUsage as Partial<StrategicPlanningUsageAudit> | undefined;
  if (!usage || !Array.isArray(usage.usedPlanningClaimIds)) errors.push('strategicUsage.usedPlanningClaimIds must be an array');
  if (!usage || typeof usage.totalPlanningClaimRefOccurrences !== 'number') errors.push('strategicUsage.totalPlanningClaimRefOccurrences must be a number');
  if (!usage || !usage.directAnchorTraceCoverage) errors.push('strategicUsage.directAnchorTraceCoverage is required');
  return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
}
