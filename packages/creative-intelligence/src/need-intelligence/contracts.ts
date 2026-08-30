/**
 * Need Intelligence contracts.
 *
 * Spec #11: NeedType / NeedStatus / NeedItem.
 * Spec #17: Need without upstream trace is invalid.
 *
 * Deterministic, no model calls. Pure functions over UnderstandingContext.
 */

export type NeedType =
  | 'communication'
  | 'identity'
  | 'business'
  | 'audience'
  | 'differentiation'
  | 'constraint'
  | 'preservation'
  | 'clarification'
  | 'risk';

export type NeedStatus =
  | 'required'
  | 'important'
  | 'conditional'
  | 'blocked';

export type NeedPriority = 1 | 2 | 3; // 3 = critical, 2 = important, 1 = supporting

export interface NeedItem {
  id: string;
  type: NeedType;
  statement: string;
  whyItMatters: string;
  status: NeedStatus;
  priority: NeedPriority;
  /**
   * CI-W1B.2: how this Need must be honored by downstream Concept /
   * Direction gates. Distinct from priority (which is importance) and
   * from status (which is readiness).
   *
   *   - `required`         — Concept must reference this Need in its
   *                         trace to be considered valid. This is
   *                         the only NeedRole the value-coverage
   *                         gate blocks on.
   *   - `constraint_only`  — Concept must RESPECT this Need, not
   *                         cover it as a topic. Validation lives
   *                         in the relevant constraint gate
   *                         (preservation / asset-authorization /
   *                         etc.). The value-coverage gate MUST
   *                         NOT count it as a coverage target.
   *   - `not_applicable`   — Need is a pre-blocking signal
   *                         (clarification / conflict-risk) and is
   *                         already projected as `status=blocked`,
   *                         which filters it out of coverage
   *                         evaluation entirely.
   *
   * Defaults to `required` for backward compatibility (older Need
   * items built by lab/external code paths); new rules emitted by
   * `derive-needs.ts` set it explicitly.
   */
  coverageRequirement?: 'required' | 'constraint_only' | 'not_applicable';
  /** Stable fact ids from ProjectTruthModel. */
  factRefs: string[];
  /** Stable evidence ids from EvidenceLedgerSnapshot. */
  evidenceRefs: string[];
  /** Project truth conflict ids that constrain this need. */
  conflictRefs: string[];
  /** Source carrier kinds. */
  sourceKinds: string[];
  /** Confidence if the source carrier provided one. Never invented. */
  confidence?: number;
  /** CI-4 only emits 'deterministic_rule'. 'model_assisted' is a reserved enum value. */
  generatedBy: 'deterministic_rule' | 'model_assisted';
  /** Semantic version stamp of the derivation rule. */
  traceVersion: string;
}

export interface NeedDerivationContext {
  /** All facts in current project truth. */
  facts: import('../truth/contracts.ts').ProjectTruthFact[];
  /** All evidence entries. */
  evidenceIds: Set<string>;
  /** All open conflict ids. */
  conflictIds: Set<string>;
  /** All truthClass='unknown' facts grouped by canonical key. */
  unknownKeys: Set<string>;
  /** Source carrier kinds present. */
  sourceKinds: Set<string>;
  /** Carriers carrying LOCKED facts. */
  lockedKeys: Set<string>;
  /** Carriers carrying USER_CONFIRMED facts on identity keys. */
  userConfirmedIdentity: Set<string>;
  /** Reference-derived fact ids. */
  referenceFactIds: Set<string>;
}

export interface NeedRule {
  id: string;
  applies(context: NeedDerivationContext): boolean;
  derive(context: NeedDerivationContext): NeedItem[];
}

export type NeedDiagnosticCode =
  | 'NEED_WITHOUT_FACT_TRACE'
  | 'NEED_WITHOUT_EVIDENCE'
  | 'DUPLICATE_NEED'
  | 'CONFLICT_BLOCKS_NEED'
  | 'UNKNOWN_BLOCKS_NEED'
  | 'UNSUPPORTED_NEED_TYPE';

export interface NeedDiagnostic {
  code: NeedDiagnosticCode;
  message: string;
  needId?: string;
  key?: string;
}

export const NEED_TRACE_VERSION = 'need-intelligence-v0.1';
export const NEED_DIAGNOSTIC_CODES: readonly NeedDiagnosticCode[] = [
  'NEED_WITHOUT_FACT_TRACE',
  'NEED_WITHOUT_EVIDENCE',
  'DUPLICATE_NEED',
  'CONFLICT_BLOCKS_NEED',
  'UNKNOWN_BLOCKS_NEED',
  'UNSUPPORTED_NEED_TYPE',
] as const;
