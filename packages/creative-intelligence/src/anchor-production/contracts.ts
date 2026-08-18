/**
 * Anchor Production contracts.
 *
 * CI-W2: Anchor Production is the post-completion visual confirmation
 * sub-run. The user has already selected a Creative Direction and the
 * CI main run has built Visual Canon + Anchor Contract (the SEMANTIC
 * contracts from CI-8). CI-W2 turns that semantic authority into
 * Anchor Candidates through the existing image-generation runtime,
 * then waits for an EXPLICIT human "设为视觉基准" action to create
 * an Approved Visual Anchor.
 *
 * Hard rules (mirrors the spec):
 *
 *   - Generated Anchor != Approved Anchor. `approvedVisualAnchor` is
 *     ALWAYS null until the user clicks "设为视觉基准" and confirms.
 *   - Anchor Production is a SUB-RUN of a CI run. It does NOT mutate
 *     the CI main run's `status` / `selectedDirectionId` /
 *     `selectionRevision` / `canonVersion` / `anchorContract`.
 *   - Direction / Canon change → previous approval is stale, no
 *     auto-migration. The Web must surface the invalidation.
 *   - Reference brand / logo / copy / product identity is forbidden
 *     in the candidate prompt (it would contaminate the current
 *     project).
 *   - Locked Assets are PRESERVED in the candidate prompt and
 *     post-validated after generation.
 *   - The CI package NEVER imports provider / image-generation code.
 *     All orchestration lives in runtime-core.
 *
 * Schema:
 *   - `AnchorProductionContract.schemaVersion = '0.1'`
 *   - `AnchorProductionRun.schemaVersion = 'anchor-production-run-v0.1'`
 *   - `AnchorCandidate.schemaVersion = 'anchor-candidate-v0.1'`
 *   - `ApprovedVisualAnchor.schemaVersion = '0.1'`
 *
 * No prompt / negativePrompt / provider / model / seed / aspectRatio
 * fields here — those are the COMPILED OUTPUT of the runtime-core
 * compiler and live in the image-generation task record, not in the
 * CI semantic contract.
 */

import type { InvariantLevel } from '../visual-canon/contracts.ts';

export const ANCHOR_PRODUCTION_TRACE_VERSION = 'anchor-production-v0.1';

// ---------------------------------------------------------------------------
// AnchorProductionContract
// ---------------------------------------------------------------------------

export type AnchorProductionContractStatus = 'ready' | 'blocked';

export interface AnchorProductionContract {
  schemaVersion: '0.1';

  /** Project id (forwarded from the parent CI run; may be null). */
  projectId: string | null;

  /** Parent CI run id. */
  creativeIntelligenceRunId: string;

  /** Selected Direction the Anchor must prove. */
  selectedDirectionId: string;

  /** Selection revision bound at compile time. */
  selectionRevision: number;

  /** Visual Canon version bound at compile time. */
  canonVersion: string;

  /** Anchor Contract version bound at compile time. */
  anchorContractVersion: string;

  /** Number of candidates the run will produce (1..4). */
  candidateCount: number;

  /** What the Anchor must demonstrate visually. Mirrors AnchorContract.mustDemonstrate. */
  mustDemonstrate: string[];

  /** What the Anchor must preserve. */
  mustPreserve: string[];

  /** What the Anchor may explore. */
  mayExplore: string[];

  /** What the Anchor must not change. */
  mustNotChange: string[];

  /** Evaluation criteria for the post-generation review. */
  evaluationCriteria: Array<{
    id: string;
    criterion: string;
    severity: InvariantLevel;
    sourceRefs: string[];
  }>;

  /** Visual DNA element ids the Anchor must demonstrate. */
  requiredDNARefs: string[];

  /** Visual Grammar rule ids the Anchor must follow. */
  requiredGrammarRefs: string[];

  /** Locked Asset rule ids the Anchor must preserve. */
  lockedAssetRuleRefs: string[];

  /** Stable fingerprint of the SOURCE input (Direction + Canon + Anchor Contract). */
  sourceFingerprint: string;

  /** Stable fingerprint of the COMPILED contract. Must equal sourceFingerprint when no extensions. */
  productionFingerprint: string;

  /** Compile result. */
  status: AnchorProductionContractStatus;

  /** Diagnostic codes when status = 'blocked'. */
  blockedReasonCodes: string[];

  /**
   * Authority: this contract is a shadow of the parent CI run. It is
   * NEVER an authoritative source for downstream consumer
   * production. The Space / Packaging consumers must not consume
   * it until CI-10.
   */
  authoritative: false;
  mode: 'shadow';
}

// ---------------------------------------------------------------------------
// AnchorProductionRun
// ---------------------------------------------------------------------------

export type AnchorProductionRunStatus =
  | 'pending'
  | 'compiling'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AnchorProductionRun {
  schemaVersion: 'anchor-production-run-v0.1';

  /** Unique sub-run id. */
  id: string;

  /** Parent CI run id. */
  creativeIntelligenceRunId: string;

  /** Project id (forwarded from parent run; may be null). */
  projectId: string | null;

  /** Selected direction id the sub-run is bound to. */
  selectedDirectionId: string;

  /** Selection revision the sub-run is bound to. */
  selectionRevision: number;

  /** Canon version the sub-run is bound to. */
  canonVersion: string;

  /** Anchor Contract version the sub-run is bound to. */
  anchorContractVersion: string;

  /** Current status. */
  status: AnchorProductionRunStatus;

  /** Candidate ids in display order. */
  candidateIds: string[];

  /**
   * The image-generation run id the candidates were generated under.
   * Present only after `compiling` transitions through. May be reused
   * across retries of the same candidates.
   */
  imageGenerationRunId: string | null;

  /** Provider id resolved at start. */
  providerId: string | null;

  /** Model id resolved at start. */
  modelId: string | null;

  /** apiProfileId used for the run (forwarded from parent CI run). */
  apiProfileId: string | null;

  /** ISO timestamps. */
  createdAt: string;
  startedAt?: string;
  completedAt?: string;

  /** Last error code if status = 'failed'. */
  errorCode?: string | null;
  lastError?: string | null;
}

// ---------------------------------------------------------------------------
// AnchorCandidate
// ---------------------------------------------------------------------------

export type AnchorCandidateStatus = 'generated' | 'rejected' | 'superseded';

export interface AnchorCandidate {
  schemaVersion: 'anchor-candidate-v0.1';

  id: string;
  anchorRunId: string;
  creativeIntelligenceRunId: string;

  /** Provider-side image id. */
  imageId: string;

  /** Project-relative image path (lives in the image-runtime folder). */
  imagePath: string;

  /** Provider-side thumbnail path, when available. */
  thumbnailPath?: string | null;

  /** Stable fingerprint of the candidate (imageSha256 when available). */
  imageFingerprint: string;

  /** Deterministic source fingerprint (Direction + Canon + Anchor Contract). */
  sourceFingerprint: string;

  status: AnchorCandidateStatus;

  /**
   * Deterministic post-generation evaluation. Computed from the
   * compiled prompt + Canon + Locked Asset rules; never a model
   * judgement. The Web MAY render this as a "验收摘要" but it does
   * NOT auto-approve any candidate.
   */
  evaluation: AnchorCandidateEvaluation;

  createdAt: string;
}

export interface AnchorCandidateEvaluation {
  /** Per-criterion verdict: 'pass' | 'warning' | 'fail'. */
  visualMechanism: 'pass' | 'warning' | 'fail';
  composition: 'pass' | 'warning' | 'fail';
  colorRelationship: 'pass' | 'warning' | 'fail';
  materialRelationship: 'pass' | 'warning' | 'fail';
  identitySafety: 'pass' | 'warning' | 'fail';
  lockedAssetSafety: 'pass' | 'warning' | 'fail';
  prohibitedMutation: 'pass' | 'warning' | 'fail';

  /**
   * Structured warnings. Empty when the candidate compiled cleanly
   * and the post-eval found no risk. Warnings are non-blocking by
   * definition; 'fail' verdicts are surfaced as `blockedReasonCodes`
   * on the candidate record instead.
   */
  warnings: string[];

  /** Block codes when one of the 'fail' verdicts is true. */
  blockedReasonCodes: string[];
}

// ---------------------------------------------------------------------------
// ApprovedVisualAnchor
// ---------------------------------------------------------------------------

export interface ApprovedVisualAnchor {
  schemaVersion: '0.1';

  projectId: string | null;
  creativeIntelligenceRunId: string;
  anchorRunId: string;
  candidateId: string;
  imageId: string;

  selectedDirectionId: string;
  selectionRevision: number;
  canonVersion: string;

  /**
   * Always 'user' in CI-W2. There is no system-auto-approval path.
   * If a future phase needs programmatic approval, it must
   * add a distinct code (e.g. 'user+system' / 'admin') and a new
   * audit field — never silently bypass this field.
   */
  approvedBy: 'user';
  approvedAt: string;

  /**
   * Monotonically increasing approval revision. Starts at 1 on the
   * first user approval. Each subsequent explicit re-approval of a
   * different candidate (with the same canonVersion / selectionRevision)
   * increments by 1. Resets to 1 when the selection or canon is
   * re-derived (the previous approval is invalidated).
   */
  approvalRevision: number;

  /** Source fingerprint at approval time. Must match the candidate.sourceFingerprint. */
  sourceFingerprint: string;

  /** Always false in CI-W2 (shadow-only). The Space / Packaging consumers must NOT consume until CI-10. */
  authoritative: false;
}

export interface AnchorApprovalHistoryEntry {
  /** Mirrors ApprovedVisualAnchor.approvalRevision. */
  revision: number;
  candidateId: string;
  imageId: string;
  selectedDirectionId: string;
  selectionRevision: number;
  canonVersion: string;
  approvedAt: string;
  approvedBy: 'user';

  /**
   * The reason the previous approval stopped being authoritative
   * (only set on entries that REPLACED a previous approval). When
   * the previous approval was invalidated by a direction / canon
   * change, the new entry carries `supersededBy: 'canon_change'` /
   * `supersededBy: 'direction_change'` / `supersededBy: 're_approval'`.
   */
  supersededBy?: 're_approval' | 'canon_change' | 'direction_change' | 'manual';
}

// ---------------------------------------------------------------------------
// Workspace projection
// ---------------------------------------------------------------------------

export interface AnchorProductionWorkspace {
  /** Sub-run state. Null when no Anchor Production has started. */
  run: AnchorProductionRun | null;
  /** The compiled contract, or null if not yet compiled. */
  contract: AnchorProductionContract | null;
  /** Candidate list in display order. */
  candidates: AnchorCandidate[];
  /** Current approval. Null until the user explicitly approves. */
  approvedAnchor: ApprovedVisualAnchor | null;
  /** Append-only history (most recent last). */
  approvalHistory: AnchorApprovalHistoryEntry[];
  /** Hard blockers (no anchor possible). */
  blockers: string[];
  /** Soft warnings. */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export type AnchorProductionDiagnosticCode =
  // Contract compile-time
  | 'ANCHOR_PRODUCTION_SELECTION_REQUIRED'
  | 'ANCHOR_PRODUCTION_SELECTION_INVALIDATED'
  | 'ANCHOR_PRODUCTION_CANON_MISSING'
  | 'ANCHOR_PRODUCTION_CANON_STALE'
  | 'ANCHOR_PRODUCTION_ANCHOR_CONTRACT_BLOCKED'
  | 'ANCHOR_PRODUCTION_LOCKED_ASSET_CONFLICT'
  | 'ANCHOR_PRODUCTION_CANDIDATE_COUNT_INVALID'
  // Runtime
  | 'ANCHOR_PRODUCTION_COMPILE_FAILED'
  | 'ANCHOR_PRODUCTION_GENERATION_FAILED'
  | 'ANCHOR_PRODUCTION_CANDIDATE_NOT_FOUND'
  | 'ANCHOR_PRODUCTION_APPROVAL_INVALID'
  | 'ANCHOR_PRODUCTION_APPROVAL_STALE'
  | 'ANCHOR_PRODUCTION_RUN_NOT_FOUND'
  // Authority
  | 'ANCHOR_PRODUCTION_REFERENCE_IDENTITY_LEAK'
  | 'ANCHOR_PRODUCTION_PROHIBITED_MUTATION';

export interface AnchorProductionDiagnostic {
  code: AnchorProductionDiagnosticCode;
  message: string;
  field?: string;
}

// ---------------------------------------------------------------------------
// Application error codes (Part N) — string constants for the Web boundary.
// ---------------------------------------------------------------------------

export const ANCHOR_PRODUCTION_ERROR_CODES = {
  SELECTION_REQUIRED: 'CI_ANCHOR_SELECTION_REQUIRED',
  CANON_REQUIRED: 'CI_ANCHOR_CANON_REQUIRED',
  CANON_STALE: 'CI_ANCHOR_CANON_STALE',
  CONTRACT_BLOCKED: 'CI_ANCHOR_CONTRACT_BLOCKED',
  LOCKED_ASSET_CONFLICT: 'CI_ANCHOR_LOCKED_ASSET_CONFLICT',
  COMPILE_FAILED: 'CI_ANCHOR_COMPILE_FAILED',
  GENERATION_FAILED: 'CI_ANCHOR_GENERATION_FAILED',
  CANDIDATE_NOT_FOUND: 'CI_ANCHOR_CANDIDATE_NOT_FOUND',
  APPROVAL_INVALID: 'CI_ANCHOR_APPROVAL_INVALID',
  APPROVAL_STALE: 'CI_ANCHOR_APPROVAL_STALE',
  RUN_NOT_FOUND: 'CI_ANCHOR_RUN_NOT_FOUND',
} as const;

export type AnchorProductionErrorCode = typeof ANCHOR_PRODUCTION_ERROR_CODES[keyof typeof ANCHOR_PRODUCTION_ERROR_CODES];
