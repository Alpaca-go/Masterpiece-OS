/**
 * Concept Intelligence contracts.
 *
 * CI-5: first grounded creative output — Concept Candidates.
 *
 * A Concept is a strategic creative thesis that transforms one or more
 * validated Opportunities into a coherent creative idea, WITHOUT yet
 * prescribing a final visual mechanism or execution language.
 *
 * Concept is NOT: direction, visualMechanism, visualDNA, anchor, prompt,
 * style, color, composition.
 *
 * Deterministic first. Model-assisted contract prepared but NOT enabled.
 */

import type { OpportunityCluster } from '../opportunity/contracts.ts';

export type ConceptStatus = 'grounded' | 'provisional' | 'blocked';

/**
 * Strategic synthesis families used for deterministic Concept generation.
 * These are strategic patterns — NOT visual styles.
 *
 * Spec #21: identity-preservation, system-reframing, value-flow,
 * asset-activation, risk-inversion, clarity-through-structure,
 * relationship-as-value, cross-media-unification.
 */
export type StrategicPattern =
  | 'identity-preservation'
  | 'system-reframing'
  | 'value-flow'
  | 'asset-activation'
  | 'risk-inversion'
  | 'clarity-through-structure'
  | 'relationship-as-value'
  | 'cross-media-unification';

export interface ConceptCandidate {
  id: string;

  /** Short human-readable concept title. */
  title: string;

  /** Core creative thesis in one sentence. */
  thesis: string;

  /** What problem this concept solves. */
  problemStatement: string;

  /**
   * Non-visual strategic mechanism.
   * NEVER a visual mechanism — that belongs to CI-6 Direction.
   */
  strategicMechanism: string;

  /** Why this mechanism is the right approach for the opportunity. */
  rationale: string;

  /** Must have >= 1 for a valid Concept. */
  opportunityRefs: string[];
  insightRefs: string[];
  needRefs: string[];
  factRefs: string[];
  evidenceRefs: string[];

  strategicPattern: StrategicPattern;

  /** Deterministic strengths list. */
  strengths: string[];
  risks: string[];
  blockers: string[];

  status: ConceptStatus;

  generatedBy: 'deterministic_synthesis' | 'model_assisted';

  traceVersion: string;
}

export interface ConceptSet {
  schemaVersion: '0.1';

  projectId: string;

  concepts: ConceptCandidate[];

  gateResults: ConceptGateResult[];

  blockedConceptIds: string[];

  diagnostics: string[];

  provenance: {
    opportunityMapVersion: string;
    truthSchemaVersion: string;
    generatedAt: string;
    mode: 'shadow';
  };
}

// --- Gate contracts ---

export type ConceptGateName =
  | 'trace'
  | 'brand-identity'
  | 'asset-authorization'
  | 'unsupported-claim'
  | 'value-coverage'
  | 'reference-guard'
  | 'unknown-conflict'
  | 'direction-leakage';

export type ConceptGateStatus = 'pass' | 'pass_with_warnings' | 'blocked';

export interface ConceptGateIssue {
  code: string;
  severity: 'warning' | 'block';
  message: string;
  conceptId: string;
  gate: ConceptGateName;
  factRefs?: string[];
  evidenceRefs?: string[];
}

export interface ConceptGateResult {
  conceptId: string;
  gate: ConceptGateName;
  status: ConceptGateStatus;
  issues: ConceptGateIssue[];
}

// --- Diagnostics ---

export type ConceptDiagnosticCode =
  | 'CONCEPT_TRACE_MISSING'
  | 'CONCEPT_UNGROUNDED'
  | 'CONCEPT_DUPLICATE'
  | 'CONCEPT_REFERENCE_CONTAMINATION'
  | 'CONCEPT_IDENTITY_VIOLATION'
  | 'CONCEPT_UNAUTHORIZED_ASSET'
  | 'CONCEPT_UNSUPPORTED_CLAIM'
  | 'CONCEPT_UNKNOWN_DEPENDENCY'
  | 'CONCEPT_CONFLICT_BLOCKED'
  | 'CONCEPT_DIRECTION_LEAKAGE'
  | 'CONCEPT_VISUAL_MECHANISM_LEAKAGE';

export interface ConceptDiagnostic {
  code: ConceptDiagnosticCode;
  message: string;
  conceptId?: string;
}

export const CONCEPT_TRACE_VERSION = 'concept-intelligence-v0.1';
