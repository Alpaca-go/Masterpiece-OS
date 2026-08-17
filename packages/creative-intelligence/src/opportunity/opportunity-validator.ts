/**
 * Trace Integrity Validator (spec #28-#29).
 *
 * Detects:
 *  - dangling needRef
 *  - dangling factRef
 *  - dangling evidenceRef
 *  - dangling insightRef
 *  - circular reference
 *
 * Hard target: trace integrity = 100%.
 *
 * Pure function. Same input → same output.
 */

import type { NeedItem } from '../need-intelligence/contracts.ts';
import type { InsightItem } from '../insight-intelligence/contracts.ts';
import type { OpportunityItem, OpportunityMap } from './contracts.ts';
import type { ProjectTruthFact } from '../truth/contracts.ts';

export interface TraceValidationInput {
  needs: NeedItem[];
  insights: InsightItem[];
  opportunities: OpportunityItem[];
  facts: ProjectTruthFact[];
  /** Evidence ids are the source-of-truth for EvidenceLedgerSnapshot entries. */
  evidenceIds: Set<string>;
}

export interface TraceValidationReport {
  ok: boolean;
  danglingNeedRefs: number;
  danglingFactRefs: number;
  danglingEvidenceRefs: number;
  danglingInsightRefs: number;
  circularReferences: number;
  details: string[];
}

export function validateTrace(input: TraceValidationInput): TraceValidationReport {
  const needIds = new Set(input.needs.map((n) => n.id));
  const factIds = new Set(input.facts.map((f) => f.id));
  const insightIds = new Set(input.insights.map((i) => i.id));

  let danglingNeedRefs = 0;
  let danglingFactRefs = 0;
  let danglingEvidenceRefs = 0;
  let danglingInsightRefs = 0;
  let circularReferences = 0;
  const details: string[] = [];

  // Needs → facts / evidence.
  for (const n of input.needs) {
    for (const fid of n.factRefs) {
      if (!factIds.has(fid)) {
        danglingFactRefs++;
        details.push(`Need ${n.id} has dangling factRef "${fid}".`);
      }
    }
    for (const eid of n.evidenceRefs) {
      if (!input.evidenceIds.has(eid)) {
        danglingEvidenceRefs++;
        details.push(`Need ${n.id} has dangling evidenceRef "${eid}".`);
      }
    }
  }

  // Insights → needs / facts / evidence.
  for (const ins of input.insights) {
    for (const nid of ins.needRefs) {
      if (!needIds.has(nid)) {
        danglingNeedRefs++;
        details.push(`Insight ${ins.id} has dangling needRef "${nid}".`);
      }
    }
    for (const fid of ins.factRefs) {
      if (!factIds.has(fid)) {
        danglingFactRefs++;
        details.push(`Insight ${ins.id} has dangling factRef "${fid}".`);
      }
    }
    for (const eid of ins.evidenceRefs) {
      if (!input.evidenceIds.has(eid)) {
        danglingEvidenceRefs++;
        details.push(`Insight ${ins.id} has dangling evidenceRef "${eid}".`);
      }
    }
  }

  // Opportunities → needs / insights / facts / evidence.
  for (const op of input.opportunities) {
    for (const nid of op.needRefs) {
      if (!needIds.has(nid)) {
        danglingNeedRefs++;
        details.push(`Opportunity ${op.id} has dangling needRef "${nid}".`);
      }
    }
    for (const iid of op.insightRefs) {
      if (!insightIds.has(iid)) {
        danglingInsightRefs++;
        details.push(`Opportunity ${op.id} has dangling insightRef "${iid}".`);
      }
    }
    for (const fid of op.factRefs) {
      if (!factIds.has(fid)) {
        danglingFactRefs++;
        details.push(`Opportunity ${op.id} has dangling factRef "${fid}".`);
      }
    }
    for (const eid of op.evidenceRefs) {
      if (!input.evidenceIds.has(eid)) {
        danglingEvidenceRefs++;
        details.push(`Opportunity ${op.id} has dangling evidenceRef "${eid}".`);
      }
    }
  }

  // Circular reference detection: for each item, walk forward edges.
  // An edge X→Y exists if X.factRefs contains Y.id (only same-level items
  // could be cyclic in practice, but we check all).
  // The cleanest definition for NICE: a Need cannot be in its own factRefs,
  // and a Need cannot appear in any other Need's needRefs. Since items
  // reference fact/need/insight ids, we check that no item id appears in
  // its own reference set.
  const itemIds = new Set<string>([
    ...needIds,
    ...insightIds,
    ...new Set(input.opportunities.map((o) => o.id)),
  ]);
  for (const op of input.opportunities) {
    if (itemIds.has(op.id) && (op.needRefs.includes(op.id) || op.insightRefs.includes(op.id))) {
      circularReferences++;
      details.push(`Opportunity ${op.id} references itself.`);
    }
  }
  for (const ins of input.insights) {
    if (insightIds.has(ins.id) && ins.needRefs.includes(ins.id)) {
      circularReferences++;
      details.push(`Insight ${ins.id} references itself.`);
    }
  }
  for (const n of input.needs) {
    if (needIds.has(n.id) && n.factRefs.includes(n.id)) {
      circularReferences++;
      details.push(`Need ${n.id} references itself as a fact.`);
    }
  }

  const totalDangling =
    danglingNeedRefs + danglingFactRefs + danglingEvidenceRefs + danglingInsightRefs;
  return {
    ok: totalDangling === 0 && circularReferences === 0,
    danglingNeedRefs,
    danglingFactRefs,
    danglingEvidenceRefs,
    danglingInsightRefs,
    circularReferences,
    details,
  };
}

/**
 * Convenience: validate an OpportunityMap end-to-end (need list, insight list,
 * fact list, evidence set) and return the report.
 */
export function validateOpportunityMap(input: {
  map: OpportunityMap;
  needs: NeedItem[];
  insights: InsightItem[];
  facts: ProjectTruthFact[];
  evidenceIds: Set<string>;
}): TraceValidationReport {
  return validateTrace({
    needs: input.needs,
    insights: input.insights,
    opportunities: input.map.opportunities,
    facts: input.facts,
    evidenceIds: input.evidenceIds,
  });
}
