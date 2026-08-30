/**
 * NICE N+I+O pipeline — top-level pure orchestrator.
 *
 * Spec #2, #40: combines ProjectTruthModel + EvidenceLedgerSnapshot + (optional)
 *                Document Intelligence diagnostics + (optional) Visual diagnosis refs
 *                into a Need set, Insight set, and OpportunityMap.
 *
 * Pure function: same input → same output. No IO. No model calls.
 *
 * Used by runtime-core to write shadow artifacts (need-intelligence.json,
 * insight-intelligence.json, opportunity-map.json).
 */

import type { ProjectTruthModel, ProjectTruthFact, ProjectTruthConflict } from '../truth/contracts.ts';
import type { EvidenceLedgerSnapshot } from '../evidence/contracts.ts';
import type { NeedItem, NeedDiagnostic } from '../need-intelligence/contracts.ts';
import type { InsightItem, InsightDiagnostic } from '../insight-intelligence/contracts.ts';
import type { OpportunityMap, OpportunityDiagnostic } from '../opportunity/contracts.ts';
import { PROJECT_TRUTH_KEYS } from '../truth/key-registry.ts';
import { buildDerivationContext, deriveNeeds, NEED_RULES } from '../need-intelligence/derive-needs.ts';
import { dedupeAndSortNeeds } from '../need-intelligence/need-deduper.ts';
import { deriveInsights, dedupeAndSortInsights } from '../insight-intelligence/derive-insights.ts';
import { buildOpportunityMap } from '../opportunity/build-opportunity-map.ts';
import { validateOpportunityMap } from '../opportunity/opportunity-validator.ts';
import { hasDirectionLeakage } from '../opportunity/direction-leakage.ts';
import type { DocumentIntelligenceResult } from '../document-intelligence/contracts.ts';
import { buildVisualEvidenceContribution, contributionToTruthFacts } from '../visual-evidence/index.ts';

export interface NiceInput {
  projectId: string;
  truth: ProjectTruthModel;
  evidence: EvidenceLedgerSnapshot;
  document?: DocumentIntelligenceResult;
  visual?: {
    diagnosisRefs?: string[];
    assetRefs?: string[];
    warnings?: string[];
  };
  /**
   * CI-W1C.5 PART E: optional vnext (project-visual-context.vnext.json)
   * payload. When provided, the pipeline reads its
   * `visualDecisionPacket.assetInventory` directly (bypassing DVC's
   * flattened `visualPreferences` string) and injects per-item
   * `visualAsset.*` facts (VISUAL_SOURCE_FACT authority) into the
   * derivation context. These facts are in-memory only; they are NOT
   * persisted to truth.json.
   */
  vnext?: unknown;
  generatedAt?: string;
}

export interface NiceResult {
  needs: NeedItem[];
  insights: InsightItem[];
  opportunityMap: OpportunityMap;
  needDiagnostics: NeedDiagnostic[];
  insightDiagnostics: InsightDiagnostic[];
  opportunityDiagnostics: OpportunityDiagnostic[];
  /** Total diagnostics (any layer). */
  diagnostics: NiceDiagnostic[];
  /** Trace validation report (spec #29). */
  traceValidation: ReturnType<typeof validateOpportunityMap>;
  /** Direction leakage report (spec #52). */
  directionLeakage: { field: string | null; text: string | null };
}

export type NiceDiagnosticKind = 'need' | 'insight' | 'opportunity';
export interface NiceDiagnostic {
  kind: NiceDiagnosticKind;
  code: NeedDiagnostic['code'] | InsightDiagnostic['code'] | OpportunityDiagnostic['code'] | 'DOCUMENT_WARNING';
  message: string;
  needId?: string;
  insightId?: string;
  opportunityId?: string;
  key?: string;
}

function factIdsForKey(facts: ProjectTruthFact[], key: string): string[] {
  return facts.filter((f) => f.key === key && !f.isReferenceFact).map((f) => f.id);
}

export function runNicePipeline(input: NiceInput): NiceResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  // If a Document Intelligence result is provided, surface its diagnostics.
  // We do NOT create a new truth model from it; we just observe.
  const documentFacts: ProjectTruthFact[] = [];
  // (Intentionally empty: we only contribute diagnostics, not facts, to avoid
  // duplicating the CI-2 truth-adapter path. Spec #5 / #13.)
  const documentWarnings: string[] = input.document?.warnings.map((w) => w.message) ?? [];

  // CI-W1C.5 PART E: if vnext payload is provided, build visual evidence
  // contribution (per-item observed facts + inferred meanings) and merge
  // into the local fact set. These facts are in-memory only — they are
  // NOT written back to truth.json.
  const visualFacts: ProjectTruthFact[] = input.vnext
    ? contributionToTruthFacts(
      buildVisualEvidenceContribution(input.projectId, input.vnext as Parameters<typeof buildVisualEvidenceContribution>[1]),
    )
    : [];

  const facts = [...input.truth.facts, ...documentFacts, ...visualFacts];
  const evidenceIds = new Set(input.evidence.entries.map((e) => e.id));
  const conflictIds = new Set(input.truth.conflicts.map((c) => c.id));
  const unknownKeys = new Set<string>(input.truth.unknowns);
  const sourceKinds = new Set<string>(facts.map((f) => f.sourceType));
  const lockedKeys = new Set<string>(facts.filter((f) => f.authority === 'LOCKED').map((f) => f.key));
  const userConfirmedIdentity = new Set<string>(facts
    .filter((f) =>
      f.value !== null
      && f.truthClass !== 'unknown'
      && (f.authority === 'USER_CONFIRMED'
        || f.authority === 'LOCKED'
        || f.authority === 'AUTHORITATIVE_DOCUMENT_FACT'
        || f.authority === 'AUTHORITATIVE_PROJECT_METADATA'),
    )
    .filter((f) => f.key === PROJECT_TRUTH_KEYS.BRAND_NAME || f.key === PROJECT_TRUTH_KEYS.BRAND_ROLE)
    .map((f) => f.key));
  const referenceFactIds = new Set<string>(facts.filter((f) => f.isReferenceFact).map((f) => f.id));

  const derivationContext = buildDerivationContext(
    facts,
    evidenceIds,
    conflictIds,
    unknownKeys,
    sourceKinds,
    lockedKeys,
    userConfirmedIdentity,
    referenceFactIds,
  );

  const { needs: rawNeeds, diagnostics: needDiags1 } = deriveNeeds(derivationContext);
  const { needs, diagnostics: needDiags2 } = dedupeAndSortNeeds(rawNeeds);

  const blockedNeedIds = new Set(
    needs.filter((n) => n.status === 'blocked').map((n) => n.id),
  );
  const { insights: rawInsights, diagnostics: insightDiags1 } = deriveInsights({
    needs,
    facts,
    evidenceIds,
    referenceFactIds,
    blockedNeedIds,
  });
  const { insights, diagnostics: insightDiags2 } = dedupeAndSortInsights(rawInsights);

  const { map: opportunityMap, diagnostics: oppDiags } = buildOpportunityMap({
    projectId: input.projectId,
    needs,
    insights,
    truthSchemaVersion: input.truth.schemaVersion,
    generatedAt,
    unknownKeys: [...unknownKeys],
    unresolvedConflictIds: [...conflictIds],
  });

  const traceValidation = validateOpportunityMap({
    map: opportunityMap,
    needs,
    insights,
    facts,
    evidenceIds,
  });

  const allDiagnostics: NiceDiagnostic[] = [
    ...needDiags1.map((d) => ({ ...d, kind: 'need' as const })),
    ...needDiags2.map((d) => ({ ...d, kind: 'need' as const })),
    ...insightDiags1.map((d) => ({ ...d, kind: 'insight' as const })),
    ...insightDiags2.map((d) => ({ ...d, kind: 'insight' as const })),
    ...oppDiags.map((d) => ({ ...d, kind: 'opportunity' as const })),
    ...documentWarnings.map((w) => ({
      code: 'DOCUMENT_WARNING' as const,
      message: w,
      kind: 'need' as const,
    })),
  ];

  // Direction leakage check (defense-in-depth; CI-4 contracts already prohibit).
  const directionLeakage = hasDirectionLeakage({
    needs,
    insights,
    opportunityMap,
  });

  return {
    needs,
    insights,
    opportunityMap,
    needDiagnostics: [...needDiags1, ...needDiags2],
    insightDiagnostics: [...insightDiags1, ...insightDiags2],
    opportunityDiagnostics: oppDiags,
    diagnostics: allDiagnostics,
    traceValidation,
    directionLeakage,
  };
}
