/**
 * Concept trace validation (Spec #12-#14).
 *
 * Every valid Concept requires:
 *   opportunityRefs.length >= 1
 *   insightRefs.length >= 1
 *   needRefs.length >= 1
 *   factRefs.length >= 1
 *
 * Transitive closure: Concept → Opportunity → Insight → Need → Fact → Evidence.
 *
 * Trace integrity target = 100%.
 */

import type { ConceptCandidate, ConceptDiagnostic } from './contracts.ts';
import type { OpportunityItem } from '../opportunity/contracts.ts';
import type { InsightItem } from '../insight-intelligence/contracts.ts';
import type { NeedItem } from '../need-intelligence/contracts.ts';
import type { ProjectTruthFact } from '../truth/contracts.ts';
import type { EvidenceLedgerEntry } from '../evidence/contracts.ts';

export interface TraceValidationContext {
  concepts: ConceptCandidate[];
  opportunities: OpportunityItem[];
  insights: InsightItem[];
  needs: NeedItem[];
  facts: ProjectTruthFact[];
  evidence: EvidenceLedgerEntry[];
}

export interface ConceptTraceIssue {
  conceptId: string;
  code: string;
  message: string;
  /** Which ref type has the problem. */
  refType: 'opportunity' | 'insight' | 'need' | 'fact' | 'evidence';
  /** The dangling id, if applicable. */
  refId?: string;
  severity: 'warning' | 'block';
}

export interface TraceValidationResult {
  valid: boolean;
  totalConcepts: number;
  fullyGrounded: number;
  issues: ConceptTraceIssue[];
  /** For each concept, whether it has complete trace. */
  perConcept: Record<string, { grounded: boolean; issueCount: number }>;
}

export function validateConceptTrace(ctx: TraceValidationContext): TraceValidationResult {
  const { concepts, opportunities, insights, needs, facts, evidence } = ctx;

  const oppIds = new Set(opportunities.map((o) => o.id));
  const insightIds = new Set(insights.map((i) => i.id));
  const needIds = new Set(needs.map((n) => n.id));
  const factIds = new Set(facts.map((f) => f.id));
  const evidenceIds = new Set(evidence.map((e) => e.id));

  const issues: ConceptTraceIssue[] = [];
  const perConcept: Record<string, { grounded: boolean; issueCount: number }> = {};

  for (const concept of concepts) {
    let grounded = true;
    let issueCount = 0;

    // Minimum ref counts (Spec #12)
    if (concept.opportunityRefs.length === 0) {
      issues.push({
        conceptId: concept.id,
        code: 'CONCEPT_TRACE_MISSING',
        message: `${concept.id} 缺少 opportunity 引用`,
        refType: 'opportunity',
        severity: 'block',
      });
      grounded = false;
      issueCount++;
    }
    if (concept.insightRefs.length === 0) {
      issues.push({
        conceptId: concept.id,
        code: 'CONCEPT_TRACE_MISSING',
        message: `${concept.id} 缺少 insight 引用`,
        refType: 'insight',
        severity: 'block',
      });
      grounded = false;
      issueCount++;
    }
    if (concept.needRefs.length === 0) {
      issues.push({
        conceptId: concept.id,
        code: 'CONCEPT_TRACE_MISSING',
        message: `${concept.id} 缺少 need 引用`,
        refType: 'need',
        severity: 'block',
      });
      grounded = false;
      issueCount++;
    }
    if (concept.factRefs.length === 0) {
      issues.push({
        conceptId: concept.id,
        code: 'CONCEPT_TRACE_MISSING',
        message: `${concept.id} 缺少 fact 引用`,
        refType: 'fact',
        severity: 'block',
      });
      grounded = false;
      issueCount++;
    }

    // Dangling ref checks
    for (const ref of concept.opportunityRefs) {
      if (!oppIds.has(ref)) {
        issues.push({
          conceptId: concept.id,
          code: 'CONCEPT_DANGLING_OPPORTUNITY_REF',
          message: `${concept.id} 引用了不存在的 opportunity: ${ref}`,
          refType: 'opportunity',
          refId: ref,
          severity: 'block',
        });
        grounded = false;
        issueCount++;
      }
    }
    for (const ref of concept.insightRefs) {
      if (!insightIds.has(ref)) {
        issues.push({
          conceptId: concept.id,
          code: 'CONCEPT_DANGLING_INSIGHT_REF',
          message: `${concept.id} 引用了不存在的 insight: ${ref}`,
          refType: 'insight',
          refId: ref,
          severity: 'block',
        });
        grounded = false;
        issueCount++;
      }
    }
    for (const ref of concept.needRefs) {
      if (!needIds.has(ref)) {
        issues.push({
          conceptId: concept.id,
          code: 'CONCEPT_DANGLING_NEED_REF',
          message: `${concept.id} 引用了不存在的 need: ${ref}`,
          refType: 'need',
          refId: ref,
          severity: 'block',
        });
        grounded = false;
        issueCount++;
      }
    }
    for (const ref of concept.factRefs) {
      if (!factIds.has(ref)) {
        issues.push({
          conceptId: concept.id,
          code: 'CONCEPT_DANGLING_FACT_REF',
          message: `${concept.id} 引用了不存在的 fact: ${ref}`,
          refType: 'fact',
          refId: ref,
          severity: 'block',
        });
        grounded = false;
        issueCount++;
      }
    }
    for (const ref of concept.evidenceRefs) {
      if (!evidenceIds.has(ref)) {
        issues.push({
          conceptId: concept.id,
          code: 'CONCEPT_DANGLING_EVIDENCE_REF',
          message: `${concept.id} 引用了不存在的 evidence: ${ref}`,
          refType: 'evidence',
          refId: ref,
          severity: 'warning',
        });
        issueCount++;
      }
    }

    perConcept[concept.id] = { grounded, issueCount };
  }

  const fullyGrounded = Object.values(perConcept).filter((p) => p.grounded).length;

  return {
    valid: fullyGrounded === concepts.length && concepts.length > 0,
    totalConcepts: concepts.length,
    fullyGrounded,
    issues,
    perConcept,
  };
}

/**
 * Build transitive trace set for a concept: all reachable objects
 * through opportunity → insight → need → fact → evidence.
 *
 * Used by downstream gates and diagnostics.
 */
export function buildTransitiveTrace(
  concept: ConceptCandidate,
  ctx: TraceValidationContext,
): {
  opportunityIds: Set<string>;
  insightIds: Set<string>;
  needIds: Set<string>;
  factIds: Set<string>;
  evidenceIds: Set<string>;
} {
  const oppIds = new Set(concept.opportunityRefs);
  const insightIds = new Set(concept.insightRefs);
  const needIds = new Set(concept.needRefs);
  const factIds = new Set(concept.factRefs);
  const evidenceIds = new Set(concept.evidenceRefs);

  // Add insight refs from the opportunities referenced
  for (const opp of ctx.opportunities) {
    if (oppIds.has(opp.id)) {
      for (const iid of opp.insightRefs) insightIds.add(iid);
      for (const nid of opp.needRefs) needIds.add(nid);
      for (const fid of opp.factRefs) factIds.add(fid);
      for (const eid of opp.evidenceRefs) evidenceIds.add(eid);
    }
  }

  // Add need + fact refs from insights
  for (const insight of ctx.insights) {
    if (insightIds.has(insight.id)) {
      for (const nid of insight.needRefs) needIds.add(nid);
      for (const fid of insight.factRefs) factIds.add(fid);
      for (const eid of insight.evidenceRefs) evidenceIds.add(eid);
    }
  }

  // Add fact refs from needs
  for (const need of ctx.needs) {
    if (needIds.has(need.id)) {
      for (const fid of need.factRefs) factIds.add(fid);
      for (const eid of need.evidenceRefs) evidenceIds.add(eid);
    }
  }

  return { opportunityIds: oppIds, insightIds, needIds, factIds, evidenceIds };
}
