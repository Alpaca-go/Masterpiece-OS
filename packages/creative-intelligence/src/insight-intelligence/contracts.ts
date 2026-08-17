/**
 * Insight Intelligence contracts.
 *
 * Spec #19: InsightType / InsightItem.
 * Spec #20: hard rule — every Insight must have needRefs.length > 0 AND
 *           factRefs.length > 0; evidenceRefs.length > 0 if evidence-eligible.
 *
 * Deterministic, no model calls.
 */

export type InsightType =
  | 'strategic'
  | 'audience'
  | 'business'
  | 'identity'
  | 'differentiation'
  | 'risk'
  | 'asset'
  | 'system';

export type InsightStatus = 'grounded' | 'provisional' | 'blocked';

export interface InsightItem {
  id: string;
  type: InsightType;
  statement: string;
  implication: string;
  /** Optional forward hint for Opportunity clustering; never prescriptive. */
  opportunityHint?: string;
  needRefs: string[];
  factRefs: string[];
  evidenceRefs: string[];
  confidence?: number;
  status: InsightStatus;
  generatedBy: 'deterministic_rule' | 'model_assisted';
  traceVersion: string;
}

export type InsightDiagnosticCode =
  | 'INSIGHT_WITHOUT_NEED_TRACE'
  | 'INSIGHT_WITHOUT_FACT_TRACE'
  | 'INSIGHT_UNGROUNDED'
  | 'INSIGHT_REFERENCE_CONTAMINATION'
  | 'DUPLICATE_INSIGHT'
  | 'CONFLICT_BLOCKS_INSIGHT'
  | 'UNKNOWN_BLOCKS_INSIGHT';

export interface InsightDiagnostic {
  code: InsightDiagnosticCode;
  message: string;
  insightId?: string;
  needId?: string;
}

export const INSIGHT_TRACE_VERSION = 'insight-intelligence-v0.1';
export const INSIGHT_DIAGNOSTIC_CODES: readonly InsightDiagnosticCode[] = [
  'INSIGHT_WITHOUT_NEED_TRACE',
  'INSIGHT_WITHOUT_FACT_TRACE',
  'INSIGHT_UNGROUNDED',
  'INSIGHT_REFERENCE_CONTAMINATION',
  'DUPLICATE_INSIGHT',
  'CONFLICT_BLOCKS_INSIGHT',
  'UNKNOWN_BLOCKS_INSIGHT',
] as const;
