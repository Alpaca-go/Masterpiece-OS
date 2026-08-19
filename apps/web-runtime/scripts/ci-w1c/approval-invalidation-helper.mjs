// CI-W1C.4 Resume — Approval Invalidation Helper
// Spec: PART G / spec §19-§20
//
// Harness-side helper for the approval invalidation qualification gap.
// Production flow:
//   Approve Anchor A
//   ↓ change Direction (selectionRevision +1)
//   ↓ old approval invalid
//   ↓ history preserved (superseded entry with reason='direction_change')
//   ↓ new Canon generated from Direction B
//
// This helper drives the existing production RPC channels (select-direction,
// approve-anchor-candidate) and verifies the cascade. Output is written
// to approval-invalidation-evidence.json under the run root.

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

async function rpc(rendererUrl, channel, args) {
  const response = await fetch(
    new URL(`/_masterpiece/rpc/${encodeURIComponent(channel)}`, rendererUrl),
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ args }),
    },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(`${channel} failed: ${body.error || response.status}`);
  return body.result;
}

export async function runApprovalInvalidation(rendererUrl, runId, evidenceRoot, opts = {}) {
  const { candidateId, differentDirectionId, reason } = opts;
  if (!candidateId) throw new Error('candidateId is required for approve step');
  if (!differentDirectionId) throw new Error('differentDirectionId is required for reselect step');

  // Step 1: read pre-approval state
  const pre = await rpc(rendererUrl, 'creative-intelligence:get-anchor-production', [runId]);
  const preApprovalRevision = pre?.approvalRevision ?? 0;
  const preSelectionRevision = pre?.selectionRevision ?? 0;
  const preCanonVersion = pre?.canonVersion ?? null;

  // Step 2: approve candidate A
  const approved = await rpc(rendererUrl, 'creative-intelligence:approve-anchor-candidate', [
    runId,
    candidateId,
    reason || 'CI-W1C.4 Resume manual approval for invalidation test',
  ]);

  // Step 3: reselect a different direction (selectionRevision +1)
  const selectAction = {
    type: 'select_direction',
    actor: 'user',
    directionId: differentDirectionId,
    rationale: 'CI-W1C.4 Resume approval invalidation test',
  };
  const reselected = await rpc(rendererUrl, 'creative-intelligence:select-direction', [
    runId,
    selectAction,
  ]);

  // Step 4: re-read post-reselect state
  const post = await rpc(rendererUrl, 'creative-intelligence:get-anchor-production', [runId]);

  // Step 5: build evidence
  const evidence = {
    runId,
    pre: {
      approvalRevision: preApprovalRevision,
      selectionRevision: preSelectionRevision,
      canonVersion: preCanonVersion,
    },
    approve: {
      candidateId,
      approvalRevision: approved?.approvalRevision,
      canonVersion: approved?.canonVersion,
    },
    reselect: {
      differentDirectionId,
      newSelectionRevision: reselected?.selectionRevision,
      newApprovedAnchor: reselected?.approvedAnchor ?? null,
    },
    post: {
      approvalRevision: post?.approvalRevision,
      selectionRevision: post?.selectionRevision,
      approvedAnchor: post?.approvedAnchor ?? null,
      canonVersion: post?.canonVersion,
      approvalHistory: post?.approvalHistory ?? [],
    },
    expectedOutcomes: {
      selectionRevisionIncremented: post?.selectionRevision > preSelectionRevision,
      oldApprovalSuperseded: (post?.approvalHistory || []).some(
        (h) => h.supersededBy === 'direction_change' || h.supersededBy === 'canon_change',
      ),
      historyRetainsCandidateA: (post?.approvalHistory || []).some(
        (h) => h.candidateId === candidateId,
      ),
    },
  };

  const evidenceFile = path.join(evidenceRoot, 'approval-invalidation-evidence.json');
  await fs.mkdir(evidenceRoot, { recursive: true });
  await fs.writeFile(evidenceFile, JSON.stringify(evidence, null, 2));
  return { evidence, evidenceFile };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const [rendererUrl, runId, evidenceRoot, candidateId, differentDirectionId] = process.argv.slice(2);
  if (!rendererUrl || !runId || !evidenceRoot || !candidateId || !differentDirectionId) {
    console.error(
      'usage: approval-invalidation-helper.mjs <rendererUrl> <runId> <evidenceRoot> <candidateId> <differentDirectionId>',
    );
    process.exit(1);
  }
  try {
    const { evidence, evidenceFile } = await runApprovalInvalidation(
      rendererUrl,
      runId,
      evidenceRoot,
      { candidateId, differentDirectionId },
    );
    console.log(`OK approval-invalidation ${evidenceFile}`);
    console.log(JSON.stringify(evidence, null, 2));
    if (!evidence.expectedOutcomes.selectionRevisionIncremented) {
      console.error('FAIL: selectionRevision did not increment');
      process.exit(1);
    }
  } catch (error) {
    console.error(`FAIL approval-invalidation: ${error.message}`);
    process.exit(1);
  }
}
