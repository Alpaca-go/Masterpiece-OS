/**
 * Opportunity Map contracts.
 *
 * Spec #24-#25: Opportunity is a strategic territory supported by multiple
 *               compatible Insights and Needs. NOT Concept / Direction /
 *               Visual Mechanism.
 * Spec #26:    Cluster by strategic mechanism (not by style/color).
 */

export type OpportunityCluster =
  | 'identity-preservation'
  | 'business-communication'
  | 'audience-clarity'
  | 'system-coherence'
  | 'differentiation'
  | 'asset-activation'
  | 'risk-reduction'
  | 'cross-media-consistency';

export type OpportunityStatus = 'open' | 'blocked' | 'provisional';

export interface OpportunityItem {
  id: string;
  title: string;
  statement: string;
  strategicValue: string;
  needRefs: string[];
  insightRefs: string[];
  factRefs: string[];
  evidenceRefs: string[];
  priority: 1 | 2 | 3;
  status: OpportunityStatus;
  cluster: OpportunityCluster;
  blockers?: string[];
}

export interface OpportunityMap {
  schemaVersion: '0.1';
  projectId: string;
  opportunities: OpportunityItem[];
  blockedNeeds: string[];
  unresolvedConflicts: string[];
  unknowns: string[];
  provenance: {
    truthSchemaVersion: string;
    generatedAt: string;
    mode: 'shadow';
  };
}

export type OpportunityDiagnosticCode =
  | 'OPPORTUNITY_WITHOUT_INSIGHT_TRACE'
  | 'OPPORTUNITY_WITHOUT_NEED_TRACE'
  | 'OPPORTUNITY_WITHOUT_FACT_TRACE'
  | 'OPPORTUNITY_DUPLICATE'
  | 'OPPORTUNITY_DANGLING_REFERENCE';

export interface OpportunityDiagnostic {
  code: OpportunityDiagnosticCode;
  message: string;
  opportunityId?: string;
}

export const OPPORTUNITY_TRACE_VERSION = 'opportunity-v0.1';
