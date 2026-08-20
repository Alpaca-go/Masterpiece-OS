/**
 * Project Truth Model types — CI-2 contract (schemaVersion 0.2).
 *
 * CI-1 (0.1) defined the skeleton. CI-2 extends with:
 * - explicit authority / confidence / recency distinction
 * - precedence + conflict metadata
 * - carrier provenance
 * - shadow mode marker
 *
 * CI-2 NEVER promotes inference to fact without explicit authority.
 * Unknowns are preserved as legitimate values.
 */

export type TruthClass =
  | 'fact'
  | 'user_requirement'
  | 'inference'
  | 'creative_hypothesis'
  | 'unknown';

/**
 * Authority class — semantic precedence of a fact's source.
 * Baseline semantic precedence (top wins):
 *   USER_CONFIRMED
 *     > LOCKED
 *     > AUTHORITATIVE_DOCUMENT_FACT
 *     > AUTHORITATIVE_PROJECT_METADATA
 *     > VISUAL_SOURCE_FACT
 *     > MODEL_INFERENCE
 *     > CREATIVE_HYPOTHESIS
 *     > SYSTEM_DEFAULT
 *     > UNKNOWN
 *
 * Authority is separate from confidence. A high-confidence model
 * inference does not outrank a user-confirmed value.
 */
export type TruthAuthority =
  | 'USER_CONFIRMED'
  | 'LOCKED'
  | 'AUTHORITATIVE_DOCUMENT_FACT'
  | 'AUTHORITATIVE_PROJECT_METADATA'
  | 'VISUAL_SOURCE_FACT'
  | 'MODEL_INFERENCE'
  | 'CREATIVE_HYPOTHESIS'
  | 'SYSTEM_DEFAULT'
  | 'UNKNOWN';

/**
 * CI-2 added evidence type for project metadata authority.
 * CI-1 had project_metadata as a hypothetical; CI-2 promotes it to a real type
 * only because ProjectRecord / CurrentProjectProfile adapters require it.
 * No speculative types.
 */
export type SourceType =
  | 'project_record'
  | 'document_visual_context'
  | 'visual_understanding_core'
  | 'prompt_source_object'
  | 'normalized_project_facts'
  | 'resolved_project_context'
  | 'current_project_core_pack'
  | 'current_project_profile'
  | 'reference_project'
  | 'user_input'
  | 'system_default'
  | 'planning_document'
  | 'unknown';

export type TruthStatus =
  | 'observed'
  | 'verified'
  | 'confirmed'
  | 'conflicted'
  | 'stale'
  | 'unknown';

export interface ProjectTruthFact<T = unknown> {
  /** Stable id: `<sourceType>:<carrierId>:<key>` */
  id: string;
  /** Canonical key from the PROJECT_TRUTH_KEYS registry. */
  key: string;
  /** Value. May be null when the carrier reported unknown. */
  value: T | null;
  /** Semantic class. Never auto-promoted across classes. */
  truthClass: TruthClass;
  /** Lifecycle status. */
  status: TruthStatus;
  /** Authority rank — the precedence signal. Separate from confidence. */
  authority: TruthAuthority;
  /** Confidence score if and only if the source carrier provided one. */
  confidence?: number;
  /** Source carrier origin. */
  sourceType: SourceType;
  /** Source-specific id (projectId, runId, etc.) — may be empty. */
  sourceId?: string;
  /** Generated-at timestamp in ISO 8601. */
  createdAt?: string;
  /** Updated-at timestamp in ISO 8601. */
  updatedAt?: string;
  /** Reference to evidence entries. Stable ids. */
  evidenceRefs: string[];
  /** True iff the fact came from a reference (not current) project. */
  isReferenceFact: boolean;
}

export interface TruthResolution {
  key: string;
  candidateFactIds: string[];
  selectedFactId?: string;
  status: 'resolved' | 'conflicted' | 'insufficient_evidence' | 'unknown';
  reasonCode: string;
}

export type ProjectTruthConflictType =
  | 'value_mismatch'
  | 'scope_mismatch'
  | 'source_authority_mismatch'
  | 'stale_source'
  | 'locked_value_violation'
  | 'identity_mismatch'
  | 'reference_contamination';

export interface ProjectTruthConflict {
  id: string;
  key: string;
  type: ProjectTruthConflictType;
  factIds: string[];
  status: 'open' | 'resolved';
  resolutionFactId?: string;
  notes?: string[];
}

export interface ProjectTruthWarning {
  code: string;
  message: string;
  carrierId?: string;
  factId?: string;
  key?: string;
}

export interface ProjectTruthProvenance {
  carrierIds: string[];
  sourceFingerprints: string[];
  generatedAt: string;
  mode: 'shadow';
}

export interface ProjectTruthModel {
  schemaVersion: '0.2';
  projectId: string;
  facts: ProjectTruthFact[];
  assumptions: string[];
  unknowns: string[];
  conflicts: ProjectTruthConflict[];
  resolutions: TruthResolution[];
  warnings: ProjectTruthWarning[];
  provenance: ProjectTruthProvenance;
}
