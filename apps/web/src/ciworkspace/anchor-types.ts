// CI-W2: Anchor Production view-model types.
//
// The Web side NEVER imports from the CI domain package directly.
// The structural types come from @masterpiece/runtime-core
// application-contracts (re-declared there from the CI package).
// This file is a thin re-export layer for the React component and
// the pure controller.

import type {
  AnchorApprovalHistoryEntry,
  CiAnchorCandidate,
  CiAnchorCandidateEvaluation,
  AnchorProductionContract,
  AnchorProductionRun,
  AnchorProductionRunStatus,
  ApprovedVisualAnchor,
  AnchorProductionWorkspace,
} from '@masterpiece/runtime-core/application-contracts.ts';

export type Run = AnchorProductionRun;
export type Status = AnchorProductionRunStatus;
export type Contract = AnchorProductionContract;
export type Candidate = CiAnchorCandidate;
export type Approval = ApprovedVisualAnchor;
export type HistoryEntry = AnchorApprovalHistoryEntry;
export type Workspace = AnchorProductionWorkspace;
export { AnchorProductionWorkspace, CiAnchorCandidate, CiAnchorCandidateEvaluation };
export type Evaluation = CiAnchorCandidateEvaluation;

// ---------------------------------------------------------------------------
// Progressive sub-views under the visual-system parent view.
// Spec §42:
//   visual-system:unvisualized    – no Anchor Production has started
//   visual-system:generating-anchor – sub-run is compiling or generating
//   visual-system:anchor-review    – 3 candidates ready, awaiting user click
//   visual-system:anchor-approved  – an Approved Visual Anchor exists
// ---------------------------------------------------------------------------

export type AnchorProductionUserView =
  | 'unvisualized'
  | 'generating-anchor'
  | 'anchor-review'
  | 'anchor-approved';

export const ANCHOR_USER_VIEWS: readonly AnchorProductionUserView[] = [
  'unvisualized',
  'generating-anchor',
  'anchor-review',
  'anchor-approved',
] as const;

// ---------------------------------------------------------------------------
// Approval proposal — view-layer mirror of the "设为视觉基准" CTA.
// The component MUST go through `confirmAnchorApproval` before calling
// the runtime. auto-approval is forbidden.
// ---------------------------------------------------------------------------

export interface AnchorApprovalProposal {
  candidateId: string;
  candidateIndex: number;
  imageId: string;
  requiresConfirmation: true;
}

export type AnchorBlockerReason =
  | 'no-selection'
  | 'no-canon'
  | 'no-contract'
  | 'contract-blocked'
  | 'locked-asset-conflict'
  | 'generation-failed'
  | 'run-not-found';

export interface AnchorAvailability {
  /** Whether the user can start Anchor Production. */
  canStart: boolean;
  /** Whether the user can approve at least one candidate. */
  canApprove: boolean;
  /** Whether the user can retry (all or single). */
  canRetry: boolean;
  /** Whether the user can cancel the sub-run. */
  canCancel: boolean;
  /** Human-readable blocker list (empty when no blockers). */
  blockers: AnchorBlockerReason[];
  /** Soft warnings. */
  warnings: string[];
}
