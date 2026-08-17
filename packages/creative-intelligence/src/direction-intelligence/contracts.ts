/**
 * Direction Intelligence contracts.
 *
 * CI-6: transforms validated Concept Candidates into structurally distinct
 * Creative Directions with explicit Visual Mechanisms, System Hypotheses,
 * and Direction-level gates.
 *
 * Direction is the FIRST CI phase that may produce visual-system hypotheses.
 * Still forbidden: anchor, prompt, production execution, user selection.
 *
 * Deterministic first. Model-assisted contract prepared but NOT enabled.
 */

export type DirectionStatus = 'grounded' | 'provisional' | 'blocked';

/**
 * DirectionFamily represents system logic, NOT style labels.
 * 8 families, each with a distinct structural hypothesis.
 */
export type DirectionFamily =
  | 'structural-system'
  | 'relational-network'
  | 'narrative-sequence'
  | 'symbolic-abstraction'
  | 'material-expression'
  | 'editorial-system'
  | 'modular-identity'
  | 'spatial-extension';

export type CrossMediaTouchpoint =
  | 'brand/VI'
  | 'editorial'
  | 'digital/UI'
  | 'space'
  | 'packaging'
  | 'campaign/poster';

export interface CreativeDirectionCandidate {
  id: string;

  title: string;
  thesis: string;

  /** Required: at least 1 for a valid Direction. */
  conceptRefs: string[];

  /** Required: a concrete visual-system hypothesis. */
  visualMechanism: string;
  /** Required: what the brand IS expressed as through this mechanism. */
  systemHypothesis: string;
  /** Required: one of 8 system-logic families. */
  directionFamily: DirectionFamily;

  /** Optional system dimensions. At least one required for grounded status. */
  colorRelationship?: string;
  materialRelationship?: string;
  compositionLogic?: string;
  typographyBehavior?: string;
  graphicBehavior?: string;
  imageBehavior?: string;

  /** Required: must describe at least 2 touchpoint classes when multiple exist. */
  crossMediaBehavior: CrossMediaTouchpoint[];

  /** Optional high-level applicability (conceptual only, never production). */
  spaceApplicability?: string;
  packagingApplicability?: string;

  /** Required trace refs. */
  opportunityRefs: string[];
  insightRefs: string[];
  needRefs: string[];
  factRefs: string[];
  evidenceRefs: string[];

  strengths: string[];
  risks: string[];
  blockers: string[];

  status: DirectionStatus;

  generatedBy: 'deterministic_synthesis' | 'model_assisted';

  traceVersion: string;
}

export interface DirectionSet {
  schemaVersion: '0.1';

  projectId: string;

  directions: CreativeDirectionCandidate[];

  evaluations: DirectionEvaluationResult[];

  familyDifference: DirectionFamilyDifferenceResult;

  blockedDirectionIds: string[];

  diagnostics: string[];

  provenance: {
    conceptSetVersion: string;
    truthSchemaVersion: string;
    generatedAt: string;
    mode: 'shadow';
  };
}

// --- Gate contracts ---

export type DirectionGateName =
  | 'trace'
  | 'brand-identity'
  | 'asset-authorization'
  | 'business-coverage'
  | 'consumer-coverage'
  | 'group-visual-authorization'
  | 'family-difference'
  | 'spatial-drift'
  | 'aesthetic'
  | 'execution-readiness'
  | 'anchor-prompt-leakage';

export type DirectionGateStatus = 'pass' | 'pass_with_warnings' | 'blocked';

export interface DirectionGateIssue {
  code: string;
  severity: 'warning' | 'block';
  message: string;
  directionId: string;
  gate: DirectionGateName;
  factRefs?: string[];
  evidenceRefs?: string[];
}

export interface DirectionGateResult {
  directionId: string;
  gate: DirectionGateName;
  status: DirectionGateStatus;
  issues: DirectionGateIssue[];
}

export interface DirectionEvaluationResult {
  directionId: string;
  status: DirectionGateStatus;
  gateResults: DirectionGateResult[];
  issues: DirectionGateIssue[];
}

// --- Family Difference contracts ---

export interface DirectionPairDifference {
  directionA: string;
  directionB: string;

  differentVisualMechanism: boolean;
  differentSystemHypothesis: boolean;
  differentFamily: boolean;
  differentCompositionLogic: boolean;
  differentCrossMediaBehavior: boolean;

  /** 0..N — number of structural dimensions that differ. */
  structuralDifferenceScore: number;
  /** True if >= 2 structural dimensions differ AND family differs. */
  isMeaningfullyDistinct: boolean;
  /** Cosmetic-only difference (color/material/mood only). */
  isFakeDiversity: boolean;
}

export interface DirectionFamilyDifferenceResult {
  pairs: DirectionPairDifference[];
  allMeaningfullyDistinct: boolean;
  hasFakeDiversity: boolean;
  diagnostics: string[];
}

// --- Diagnostics ---

export type DirectionDiagnosticCode =
  | 'DIRECTION_TRACE_MISSING'
  | 'DIRECTION_DANGLING_REF'
  | 'DIRECTION_REFERENCE_CONTAMINATION'
  | 'DIRECTION_IDENTITY_VIOLATION'
  | 'DIRECTION_UNAUTHORIZED_ASSET'
  | 'DIRECTION_UNSUPPORTED_CLAIM'
  | 'DIRECTION_UNKNOWN_DEPENDENCY'
  | 'DIRECTION_CONFLICT_BLOCKED'
  | 'DIRECTION_FAKE_DIVERSITY'
  | 'DIRECTION_ANCHOR_LEAKAGE'
  | 'DIRECTION_PROMPT_LEAKAGE'
  | 'DIRECTION_PRODUCTION_TRANSLATION'
  | 'DIRECTION_UNGROUNDED';

export interface DirectionDiagnostic {
  code: DirectionDiagnosticCode;
  message: string;
  directionId?: string;
}

export const DIRECTION_TRACE_VERSION = 'direction-intelligence-v0.1';
