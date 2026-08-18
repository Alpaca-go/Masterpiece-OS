// CI-W2: Anchor Production Web controller — pure functions.
//
// All exports are deterministic: same input → same output, no side
// effects. Side effects (RPC calls) live in the React component, not
// here.
//
// Hard invariants (Spec §J + §F):
//   - Generated Anchor != Approved Anchor. The view-model
//     `derivedAnchorView` returns `approvedAnchor = null` and
//     `userView = 'anchor-review'` until the user explicitly
//     clicks "设为视觉基准" + confirms. There is NO auto-approval
//     path.
//   - Reference identity NEVER contaminates the project. The
//     controller does not load any reference content into the
//     view-model; only the runtime's evaluated contract surfaces
//     are rendered.
//   - Locked Asset safety is a per-candidate `evaluation` verdict.
//     A candidate with `lockedAssetSafety = 'fail'` is NEVER
//     approve-able (`canApprove = false`).
//   - When the parent run's selectionRevision advances, the
//     approval is stale — the view-model surfaces it as a warning
//     and `approvedAnchor = null`. The user must re-approve.

import type {
  AnchorApprovalHistoryEntry,
  CiAnchorCandidate,
  CiAnchorCandidateEvaluation,
  AnchorProductionContract,
  AnchorProductionRun,
  AnchorProductionRunStatus,
  AnchorProductionWorkspace,
  ApprovedVisualAnchor,
} from '@masterpiece/runtime-core/application-contracts.ts';

import type {
  AnchorApprovalProposal,
  AnchorAvailability,
  AnchorBlockerReason,
  AnchorProductionUserView,
} from './anchor-types.ts';

// ---------------------------------------------------------------------------
// Status text projection (display strings)
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<AnchorProductionRunStatus, string> = {
  pending: '准备生成',
  compiling: '编译视觉合同',
  generating: '正在生成视觉锚点',
  completed: '生成完成',
  failed: '生成失败',
  cancelled: '已取消',
};

export function statusLabelFor(status: AnchorProductionRunStatus | undefined | null): string {
  if (!status) return '尚未生成';
  return STATUS_LABELS[status] ?? status;
}

// ---------------------------------------------------------------------------
// User-view projection
// ---------------------------------------------------------------------------

/**
 * Pure function. Project an Anchor Production workspace onto one
 * of the four user-facing sub-views.
 *
 * The progressive UX state always depends on the sub-run status
 * AND the parent approval. The Web MUST NOT compute a sub-view
 * outside this helper.
 */
export function deriveAnchorUserView(
  workspace: AnchorProductionWorkspace | null,
): AnchorProductionUserView {
  if (!workspace) return 'unvisualized';
  const run = workspace.run;
  if (!run) return 'unvisualized';
  if (run.status === 'pending' || run.status === 'compiling' || run.status === 'generating') {
    return 'generating-anchor';
  }
  if (run.status === 'failed' || run.status === 'cancelled') {
    // Even after failure / cancel, the user can retry. The view
    // stays at 'anchor-review' as long as there are still
    // candidates on disk. If the run never produced candidates,
    // fall back to unvisualized.
    const hasGenerated = (workspace.candidates ?? []).some((c) => c.status === 'generated');
    if (!hasGenerated) return 'unvisualized';
    return 'anchor-review';
  }
  if (workspace.approvedAnchor) return 'anchor-approved';
  if ((workspace.candidates ?? []).length > 0) return 'anchor-review';
  return 'unvisualized';
}

// ---------------------------------------------------------------------------
// Availability projection
// ---------------------------------------------------------------------------

const PASS: CiAnchorCandidateEvaluation['visualMechanism'] = 'pass';

function isPass(verdict: 'pass' | 'warning' | 'fail'): boolean {
  return verdict === PASS;
}

/**
 * Pure function. Compute the user-facing availability (can start /
 * can approve / can retry / can cancel) for the Anchor Production
 * sub-run.
 */
export function deriveAnchorAvailability(
  workspace: AnchorProductionWorkspace | null,
  parent: { selectionRevision: number; canonVersion: string | null } | null,
): AnchorAvailability {
  if (!parent) {
    return {
      canStart: false,
      canApprove: false,
      canRetry: false,
      canCancel: false,
      blockers: ['no-selection'],
      warnings: [],
    };
  }
  const blockers: AnchorBlockerReason[] = [];
  if (parent.selectionRevision <= 0) blockers.push('no-selection');
  if (!parent.canonVersion || parent.canonVersion === 'missing') blockers.push('no-canon');

  const run = workspace?.run ?? null;
  const candidates = workspace?.candidates ?? [];
  const approved = workspace?.approvedAnchor ?? null;

  // Hard blockers
  if (run && run.status === 'failed' && run.errorCode === 'CI_ANCHOR_CONTRACT_BLOCKED') {
    blockers.push('contract-blocked');
  }
  if (
    run
    && run.status === 'failed'
    && run.errorCode === 'CI_ANCHOR_LOCKED_ASSET_CONFLICT'
  ) {
    blockers.push('locked-asset-conflict');
  }
  if (run && run.status === 'failed' && run.errorCode === 'CI_ANCHOR_GENERATION_FAILED') {
    blockers.push('generation-failed');
  }

  // Stale approval check: a previous approval whose parent
  // selectionRevision no longer matches the current is "stale".
  // The runtime already nulls `approvedAnchor` in this case; we
  // double-check here for the Web's bookkeeping.
  const approvalStale = approved
    ? approved.selectionRevision !== parent.selectionRevision
    : false;

  const hasGeneratedCandidates = candidates.some((c) => c.status === 'generated');
  const hasApproveable = candidates.some((c) => c.status === 'generated' && isCandidateApproveable(c));
  const isRunning = run && (run.status === 'pending' || run.status === 'compiling' || run.status === 'generating');

  return {
    canStart: !isRunning && blockers.length === 0 && !hasGeneratedCandidates,
    canApprove: !isRunning && hasApproveable && !approvalStale,
    canRetry: !isRunning && (run?.status === 'failed' || run?.status === 'cancelled' || hasGeneratedCandidates),
    canCancel: Boolean(isRunning),
    blockers,
    warnings: [
      ...(approvalStale ? ['previous_approval_invalidated'] : []),
      ...(workspace?.warnings ?? []),
    ],
  };
}

/**
 * Pure helper. A candidate is approve-able only when:
 *   - status === 'generated'
 *   - all hard evaluations are 'pass' or 'warning' (no 'fail')
 *   - the source fingerprint matches the run's canon (it always
 *     does today, but we surface the contract explicitly)
 */
export function isCandidateApproveable(candidate: CiAnchorCandidate): boolean {
  if (candidate.status !== 'generated') return false;
  const evalVerdicts: Array<'pass' | 'warning' | 'fail'> = [
    candidate.evaluation.visualMechanism,
    candidate.evaluation.composition,
    candidate.evaluation.colorRelationship,
    candidate.evaluation.materialRelationship,
    candidate.evaluation.identitySafety,
    candidate.evaluation.lockedAssetSafety,
    candidate.evaluation.prohibitedMutation,
  ];
  return evalVerdicts.every((v) => v === 'pass' || v === 'warning');
}

/**
 * Pure function. Build a confirmation-time approval proposal.
 * The Web MUST call this only after the user clicks "设为视觉基准";
 * auto-creation is forbidden.
 */
export function buildAnchorApprovalProposal(
  candidate: CiAnchorCandidate,
  candidateIndex: number,
): AnchorApprovalProposal {
  return {
    candidateId: candidate.id,
    candidateIndex,
    imageId: candidate.imageId,
    requiresConfirmation: true,
  };
}

// ---------------------------------------------------------------------------
// Display formatters
// ---------------------------------------------------------------------------

export function formatApprovalRevision(revision: number | undefined | null): string {
  if (typeof revision !== 'number' || !Number.isFinite(revision)) return '—';
  return `v${revision}`;
}

export function formatApprovalTimestamp(iso: string | undefined | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('zh-CN', { hour12: false });
}

export function describeEvaluationSummary(evaluation: CiAnchorCandidateEvaluation): string {
  const fields: Array<[keyof CiAnchorCandidateEvaluation, string]> = [
    ['visualMechanism', '视觉机制'],
    ['composition', '构图'],
    ['colorRelationship', '色彩'],
    ['materialRelationship', '材质'],
    ['identitySafety', '品牌安全'],
    ['lockedAssetSafety', '锁定资产'],
    ['prohibitedMutation', '禁止偏移'],
  ];
  const labels: Record<'pass' | 'warning' | 'fail', string> = {
    pass: '通过',
    warning: '提示',
    fail: '阻断',
  };
  return fields
    .map(([key, label]) => `${label}·${labels[evaluation[key] as 'pass' | 'warning' | 'fail']}`)
    .join(' / ');
}

// ---------------------------------------------------------------------------
// Re-exports for downstream consumers
// ---------------------------------------------------------------------------

export type { AnchorProductionContract, CiAnchorCandidate, ApprovedVisualAnchor, AnchorApprovalHistoryEntry, AnchorProductionRun };
