/**
 * Visual Canon contracts.
 *
 * CI-8: Visual Canon, Visual DNA, Visual Grammar, CrossMediaCanon,
 * LockedAssetCanonRule.
 *
 * Visual Canon is the authoritative-for-CI-8, still shadow-only set
 * of visual-system rules derived from the selected Direction.
 *
 * It is NOT a rendered design. It is NOT a prompt.
 */

import type { DirectionFamily } from '../direction-intelligence/contracts.ts';
import type { CrossMediaTouchpoint } from '../direction-intelligence/contracts.ts';
import type { CreativeDirectionCandidate } from '../direction-intelligence/contracts.ts';
import type { DirectionEvaluationItem, DirectionRecommendation } from '../evaluation/contracts.ts';

export type InvariantLevel = 'hard' | 'strong' | 'adaptive';

export type CanonStatus = 'valid' | 'provisional' | 'blocked';

export interface SelectedDirectionSnapshot {
  schemaVersion: '0.1';

  projectId: string;
  directionId: string;
  selectionRevision: number;
  selectedAt: string;
  selectedBy: 'user';

  /** Stable fingerprint of the selected Direction. */
  directionFingerprint: string;

  /** Full selected Direction. */
  direction: CreativeDirectionCandidate;

  /** Optional advisory context. */
  evaluationSnapshot?: {
    recommendation?: DirectionRecommendation;
    evaluation?: DirectionEvaluationItem;
  };

  traceVersion: string;
}

export interface CanonRule {
  id: string;

  statement: string;

  /** Which source field of the Direction this rule derives from. */
  sourceField: string;

  invariantLevel: InvariantLevel;

  allowedVariation?: string[];
  prohibitedVariation?: string[];

  factRefs: string[];
  evidenceRefs: string[];
}

export interface VisualDNAElement {
  id: string;
  category: string;
  rule: string;
  rationale: string;
  invariantLevel: InvariantLevel;
  directionRefs: string[];
  factRefs: string[];
  evidenceRefs: string[];
}

export interface VisualDNA {
  schemaVersion: '0.1';

  structuralDNA: VisualDNAElement[];
  identityDNA: VisualDNAElement[];
  rhythmDNA: VisualDNAElement[];
  hierarchyDNA: VisualDNAElement[];
  relationDNA: VisualDNAElement[];

  colorDNA?: VisualDNAElement[];
  materialDNA?: VisualDNAElement[];
  graphicDNA?: VisualDNAElement[];

  requiredElementIds: string[];
  optionalElementIds: string[];
  forbiddenMutations: string[];
}

export interface GrammarRule {
  id: string;
  condition?: string;
  rule: string;
  allowed: string[];
  forbidden: string[];
  dnaRefs: string[];
  invariantLevel: InvariantLevel;
}

export interface VisualGrammar {
  schemaVersion: '0.1';

  compositionRules: GrammarRule[];
  hierarchyRules: GrammarRule[];
  repetitionRules: GrammarRule[];
  transformationRules: GrammarRule[];
  assetUsageRules: GrammarRule[];
  crossMediaAdaptationRules: GrammarRule[];

  forbiddenCombinations: GrammarRule[];

  invariants: string[];
}

export interface CrossMediaAdaptation {
  mustPreserve: string[];
  mayAdapt: string[];
  mustNotIntroduce: string[];
}

export interface CrossMediaCanon {
  invariants: string[];
  adaptations: Record<CrossMediaTouchpoint, CrossMediaAdaptation>;
}

export interface LockedAssetCanonRule {
  assetId?: string;
  assetType: string;

  action:
    | 'preserve'
    | 'activate'
    | 'position'
    | 'repeat'
    | 'contextualize';

  prohibitedActions: string[];

  factRefs: string[];
  evidenceRefs: string[];
}

export interface CanonTrace {
  selectedDirectionRef: string;

  conceptRefs: string[];
  opportunityRefs: string[];
  insightRefs: string[];
  needRefs: string[];
  factRefs: string[];
  evidenceRefs: string[];

  selectionRevision: number;
  directionFingerprint: string;
}

export interface VisualCanon {
  schemaVersion: '0.1';

  projectId: string;
  selectedDirectionId: string;
  selectionRevision: number;

  creativeThesis: string;
  visualMechanism: string;
  systemHypothesis: string;
  directionFamily: DirectionFamily;

  colorRelationship?: CanonRule;
  materialRelationship?: CanonRule;
  compositionLogic?: CanonRule;
  typographyBehavior?: CanonRule;
  graphicBehavior?: CanonRule;
  imageBehavior?: CanonRule;

  visualDNA: VisualDNA;
  visualGrammar: VisualGrammar;
  crossMediaCanon: CrossMediaCanon;

  lockedAssetRules: LockedAssetCanonRule[];

  prohibitedMutations: string[];

  trace: CanonTrace;

  status: CanonStatus;

  authoritative: false;
  mode: 'shadow';
}

// --- Canon Diff ---

export interface VisualCanonDiff {
  changedDirection: boolean;
  addedRules: string[];
  removedRules: string[];
  changedRules: string[];

  changedDNA: string[];
  changedGrammar: string[];

  invalidatedDownstreamArtifacts: string[];

  requiresRecompile: boolean;
}

// --- Diagnostics ---

export type CanonDiagnosticCode =
  | 'CANON_SELECTION_REQUIRED'
  | 'CANON_SELECTION_INVALIDATED'
  | 'CANON_DIRECTION_NOT_FOUND'
  | 'CANON_DIRECTION_BLOCKED'
  | 'CANON_DIRECTION_STALE'
  | 'CANON_TRACE_INCOMPLETE'
  | 'CANON_RULE_UNGROUNDED'
  | 'CANON_LOCKED_ASSET_VIOLATION'
  | 'CANON_PROMPT_LEAKAGE'
  | 'CANON_PRODUCTION_SPEC_LEAKAGE'
  | 'CANON_DRIFT_NEW_MECHANISM'
  | 'CANON_DRIFT_NEW_FAMILY'
  | 'CANON_DRIFT_NEW_BRAND'
  | 'CANON_DRIFT_LOCKED_BEHAVIOR';

export interface CanonDiagnostic {
  code: CanonDiagnosticCode;
  message: string;
  field?: string;
}

export const VISUAL_CANON_TRACE_VERSION = 'visual-canon-v0.1';
