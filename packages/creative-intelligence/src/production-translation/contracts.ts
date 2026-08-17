/**
 * Production Translation Bridge — base contracts.
 *
 * CI-9: Translate the user-selected Visual Canon into media-specific
 * execution contracts for the existing Space and Packaging production chains.
 *
 * CI-9 is a TRANSLATION layer — it does not own execution. It produces
 * semantic execution requirements that the existing Space/Packaging chains
 * may eventually consume (CI-9 does NOT switch consumers in this phase).
 *
 * Hard rules:
 *   - Canon is read-only. Translation is downstream-only.
 *   - No model call. No provider change. No prompt generation.
 *   - No consumer switch. Shadow / comparison mode only.
 */

import type { SelectedDirectionSnapshot } from '../visual-canon/contracts.ts';
import type { VisualCanon } from '../visual-canon/contracts.ts';
import type { LockedAssetCanonRule } from '../visual-canon/contracts.ts';
import type { AnchorContract } from '../anchor-contract/contracts.ts';

export type TargetMedia = 'space' | 'packaging';

export type TranslationStatus = 'ready' | 'provisional' | 'blocked';

export type ComparisonReadiness =
  | 'not_ready'
  | 'shadow_valid'
  | 'comparison_clean'
  | 'comparison_conflicted';

export interface SpaceAdaptationRule {
  id: string;
  rule: string;
  invariantLevel: 'hard' | 'strong' | 'adaptive';
  sourceRef: string;
}

export interface PackagingAdaptationRule {
  id: string;
  rule: string;
  invariantLevel: 'hard' | 'strong' | 'adaptive';
  sourceRef: string;
}

export interface SpaceTranslationContract extends MediaTranslationContract {
  media: 'space';

  spatialIdentityRules: SpaceAdaptationRule[];
  zoneRelationshipRules: SpaceAdaptationRule[];
  environmentalGraphicRules: SpaceAdaptationRule[];
  wayfindingRules: SpaceAdaptationRule[];
  materialBehaviorRules: SpaceAdaptationRule[];
  brandPresenceRules: SpaceAdaptationRule[];
  scaleAdaptationRules: SpaceAdaptationRule[];
  prohibitedSpatialDrift: string[];
}

export interface PackagingTranslationContract extends MediaTranslationContract {
  media: 'packaging';

  productIdentityRules: PackagingAdaptationRule[];
  structurePreservationRules: PackagingAdaptationRule[];
  informationHierarchyRules: PackagingAdaptationRule[];
  familySystemRules: PackagingAdaptationRule[];
  materialBehaviorRules: PackagingAdaptationRule[];
  brandPresenceRules: PackagingAdaptationRule[];
  lockedCopyRules: PackagingAdaptationRule[];
  prohibitedPackagingDrift: string[];
}

export interface ProductionTranslationContext {
  schemaVersion: '0.1';
  projectId: string;

  selectedDirectionSnapshot: SelectedDirectionSnapshot;
  visualCanon: VisualCanon;
  anchorContract: AnchorContract;

  /** From VisualCanon: derived for media translation. */
  canonVersion: string;
  lockedAssetRules: LockedAssetCanonRule[];

  targetMedia: TargetMedia;

  traceVersion: string;
}

export interface ProductionTranslationTrace {
  selectedDirectionId: string;
  canonVersion: string;

  dnaRefs: string[];
  grammarRefs: string[];
  lockedAssetRefs: string[];

  factRefs: string[];
  evidenceRefs: string[];

  /** Stable fingerprint of the inputs that produced this translation. */
  sourceFingerprint: string;
}

export interface MediaTranslationContract {
  schemaVersion: '0.1';

  projectId: string;
  media: TargetMedia;

  selectedDirectionId: string;
  selectionRevision: number;
  canonVersion: string;

  requiredDNARefs: string[];
  requiredGrammarRefs: string[];
  lockedAssetRuleRefs: string[];

  mustPreserve: string[];
  mayAdapt: string[];
  mustNotIntroduce: string[];

  trace: ProductionTranslationTrace;

  translationVersion: string;
  translationFingerprint: string;

  status: TranslationStatus;

  authoritative: false;
  mode: 'shadow';
}

export interface ProductionTranslationDiff {
  media: TargetMedia;

  addedRequirements: string[];
  removedRequirements: string[];
  changedRequirements: string[];

  missingHardDNARefs: string[];
  missingHardGrammarRefs: string[];

  canonVersionChanged: boolean;
  requiresRecompile: boolean;
}

export interface TranslationConflict {
  field: string;
  currentValue?: string;
  canonRequirement?: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface TranslationComparisonReport {
  media: TargetMedia;

  canonVersion: string;

  currentInputFingerprint?: string;
  translatedInputFingerprint?: string;

  preservedFields: string[];
  addedCanonRequirements: string[];

  conflicts: TranslationConflict[];
  warnings: string[];

  behaviorChangeRisk: 'none' | 'low' | 'medium' | 'high';
  readyForConsumerSwitch: boolean;
  comparisonReadiness: ComparisonReadiness;
}

// --- Diagnostics ---

export type ProductionTranslationDiagnosticCode =
  | 'PT_CANON_REQUIRED'
  | 'PT_CANON_BLOCKED'
  | 'PT_CANON_STALE'
  | 'PT_SELECTION_MISMATCH'
  | 'PT_TRACE_INCOMPLETE'
  | 'PT_HARD_DNA_MISSING'
  | 'PT_HARD_GRAMMAR_MISSING'
  | 'PT_LOCKED_ASSET_RULE_MISSING'
  | 'PT_REFERENCE_CONTAMINATION'
  | 'PT_NEW_VISUAL_MECHANISM'
  | 'PT_NEW_DIRECTION_FAMILY'
  | 'PT_MEDIA_RULE_UNGROUNDED'
  | 'PT_PRODUCTION_PROMPT_LEAKAGE'
  | 'PT_EXISTING_INPUT_CONFLICT'
  | 'PT_CONSUMER_SWITCH_FORBIDDEN'
  | 'PT_REFERENCE_CANON_CONFLICT';

export interface ProductionTranslationDiagnostic {
  code: ProductionTranslationDiagnosticCode;
  message: string;
  field?: string;
}

export const PRODUCTION_TRANSLATION_TRACE_VERSION = 'production-translation-v0.1';
