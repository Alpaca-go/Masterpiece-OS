/**
 * Opportunity Map builder.
 *
 * Spec #26-#27: cluster by strategic mechanism, NOT by style/color.
 *              One cluster per canonical insight's opportunityHint.
 *              Diverse: not "A: improve brand recognition; B: strengthen
 *              brand recognition".
 * Spec #51:    every Opportunity must resolve to Insight/Need/Fact.
 */

import type {
  OpportunityItem,
  OpportunityMap,
  OpportunityCluster,
  OpportunityDiagnostic,
  OpportunityStatus,
} from './contracts.ts';
import type { InsightItem } from '../insight-intelligence/contracts.ts';
import type { NeedItem } from '../need-intelligence/contracts.ts';

function oppId(cluster: OpportunityCluster, suffix: string): string {
  return `opp:${cluster}:${suffix}`;
}

const CLUSTER_TO_TITLE: Record<OpportunityCluster, { title: string; statement: string; strategicValue: string }> = {
  'identity-preservation': {
    title: 'Identity preservation territory',
    statement: 'Strategic territory for reinforcing and protecting confirmed brand identity.',
    strategicValue: 'Prevents category misread and brand substitution risk.',
  },
  'business-communication': {
    title: 'Business communication territory',
    statement: 'Strategic territory for expressing the value chain and business model.',
    strategicValue: 'Anchors audience targeting and touchpoint selection.',
  },
  'audience-clarity': {
    title: 'Audience clarity territory',
    statement: 'Strategic territory for resolving audience uncertainty before direction.',
    strategicValue: 'Removes ambiguity that would otherwise produce provisional direction.',
  },
  'system-coherence': {
    title: 'System coherence territory',
    statement: 'Strategic territory for ensuring touchpoints, copy, and visuals agree with the business model.',
    strategicValue: 'Strengthens cross-touchpoint recognition.',
  },
  'differentiation': {
    title: 'Differentiation territory',
    statement: 'Strategic territory for escaping category clichés.',
    strategicValue: 'Provides defensible identity space against industry defaults.',
  },
  'asset-activation': {
    title: 'Asset activation territory',
    statement: 'Strategic territory for activating underused identity assets through system / context transformation.',
    strategicValue: 'Locks existing asset value while enabling downstream flexibility.',
  },
  'risk-reduction': {
    title: 'Risk reduction territory',
    statement: 'Strategic territory for resolving open conflicts before direction generation.',
    strategicValue: 'Prevents silent conflict selection that would produce confident but wrong direction.',
  },
  'cross-media-consistency': {
    title: 'Cross-media consistency territory',
    statement: 'Strategic territory for aligning Space, Packaging, and other media around the same brand statements.',
    strategicValue: 'Multiplies brand recognition across touchpoints.',
  },
};

export interface BuildOpportunityInput {
  projectId: string;
  needs: NeedItem[];
  insights: InsightItem[];
  truthSchemaVersion: string;
  generatedAt: string;
  unknownKeys: string[];
  unresolvedConflictIds: string[];
}

export function buildOpportunityMap(input: BuildOpportunityInput): {
  map: OpportunityMap;
  diagnostics: OpportunityDiagnostic[];
} {
  const diagnostics: OpportunityDiagnostic[] = [];
  const opportunities: OpportunityItem[] = [];
  const seenClusters = new Set<OpportunityCluster>();
  const needIds = new Set(input.needs.map((n) => n.id));

  // Group insights by opportunityHint → cluster.
  for (const ins of input.insights) {
    if (!ins.opportunityHint) continue;
    const cluster = ins.opportunityHint as OpportunityCluster;
    if (!(cluster in CLUSTER_TO_TITLE)) continue;
    if (seenClusters.has(cluster)) {
      // Already emitted; merge refs.
      const existing = opportunities.find((o) => o.cluster === cluster);
      if (existing) {
        existing.insightRefs = Array.from(new Set([...existing.insightRefs, ins.id])).sort();
        existing.factRefs = Array.from(new Set([...existing.factRefs, ...ins.factRefs])).sort();
        existing.evidenceRefs = Array.from(new Set([...existing.evidenceRefs, ...ins.evidenceRefs])).sort();
        existing.needRefs = Array.from(new Set([...existing.needRefs, ...ins.needRefs])).sort();
      }
      continue;
    }
    seenClusters.add(cluster);
    const meta = CLUSTER_TO_TITLE[cluster];
    const status: OpportunityStatus = ins.status === 'blocked' ? 'blocked' : ins.status === 'provisional' ? 'provisional' : 'open';
    const priority: 1 | 2 | 3 = ins.status === 'blocked' ? 1 : ins.status === 'provisional' ? 2 : 3;
    const op: OpportunityItem = {
      id: oppId(cluster, 'main'),
      title: meta.title,
      statement: meta.statement,
      strategicValue: meta.strategicValue,
      needRefs: ins.needRefs,
      insightRefs: [ins.id],
      factRefs: ins.factRefs,
      evidenceRefs: ins.evidenceRefs,
      priority,
      status,
      cluster,
      blockers: status === 'blocked' ? ins.needRefs.filter((id) => !needIds.has(id) || input.needs.find((n) => n.id === id)?.status === 'blocked') : undefined,
    };
    opportunities.push(op);
  }

  // Hard rules: every Opportunity must resolve to at least one insight & one need.
  for (const op of opportunities) {
    if (op.insightRefs.length === 0) {
      diagnostics.push({
        code: 'OPPORTUNITY_WITHOUT_INSIGHT_TRACE',
        message: `Opportunity ${op.id} has no insightRefs.`,
        opportunityId: op.id,
      });
    }
    if (op.needRefs.length === 0) {
      diagnostics.push({
        code: 'OPPORTUNITY_WITHOUT_NEED_TRACE',
        message: `Opportunity ${op.id} has no needRefs.`,
        opportunityId: op.id,
      });
    }
    if (op.factRefs.length === 0) {
      diagnostics.push({
        code: 'OPPORTUNITY_WITHOUT_FACT_TRACE',
        message: `Opportunity ${op.id} has no factRefs.`,
        opportunityId: op.id,
      });
    }
  }

  // Stable ordering: priority desc → id.
  const sortedOpps = opportunities.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.id < b.id ? -1 : 1;
  });

  const blockedNeedIds = input.needs
    .filter((n) => n.status === 'blocked')
    .map((n) => n.id);

  const map: OpportunityMap = {
    schemaVersion: '0.1',
    projectId: input.projectId,
    opportunities: sortedOpps,
    blockedNeeds: blockedNeedIds,
    unresolvedConflicts: input.unresolvedConflictIds,
    unknowns: input.unknownKeys,
    provenance: {
      truthSchemaVersion: input.truthSchemaVersion,
      generatedAt: input.generatedAt,
      mode: 'shadow',
    },
  };

  return { map, diagnostics };
}
