/**
 * CI-W1A: Creative Intelligence RPC Operations.
 *
 * Returns a flat operation map (kebab-case channel names) that the Web
 * runtime composition root merges into the operation graph. The Web
 * side does NOT import the application service directly.
 *
 * Channel mapping (auto-derived from namespace + method):
 *   creativeIntelligence.listRuns         → creative-intelligence:list-runs
 *   creativeIntelligence.start            → creative-intelligence:start
 *   creativeIntelligence.getWorkspace     → creative-intelligence:get-workspace
 *   creativeIntelligence.selectDirection  → creative-intelligence:select-direction
 *   creativeIntelligence.confirmFacts     → creative-intelligence:confirm-facts
 *   creativeIntelligence.onProgress       → creative-intelligence:on-progress
 *   creativeIntelligence.startAnchorProduction         → creative-intelligence:start-anchor-production
 *   creativeIntelligence.getAnchorProduction           → creative-intelligence:get-anchor-production
 *   creativeIntelligence.listAnchorCandidates         → creative-intelligence:list-anchor-candidates
 *   creativeIntelligence.approveAnchorCandidate       → creative-intelligence:approve-anchor-candidate
 *   creativeIntelligence.rejectAnchorCandidate        → creative-intelligence:reject-anchor-candidate
 *   creativeIntelligence.retryAnchorCandidate         → creative-intelligence:retry-anchor-candidate
 *   creativeIntelligence.cancelAnchorProduction       → creative-intelligence:cancel-anchor-production
 *   creativeIntelligence.getApprovedAnchor            → creative-intelligence:get-approved-anchor
 *   creativeIntelligence.getAnchorApprovalHistory     → creative-intelligence:get-anchor-approval-history
 *   ...
 *
 * No model call, no provider change, no consumer switch.
 */

export function createCreativeIntelligenceOperations({ creativeIntelligence }) {
  return Object.freeze({
    'creative-intelligence:list-runs': () => creativeIntelligence.listRuns(),
    'creative-intelligence:get-run': (_context, runId) => creativeIntelligence.getRun(runId),
    'creative-intelligence:start': (_context, input) => creativeIntelligence.start(input),
    'creative-intelligence:get-fact-review': (_context, runId) => creativeIntelligence.getFactReview(runId),
    'creative-intelligence:confirm-facts': (_context, runId, facts) => creativeIntelligence.confirmFacts(runId, facts),
    'creative-intelligence:get-workspace': (_context, runId) => creativeIntelligence.getWorkspace(runId),
    'creative-intelligence:select-direction': (_context, runId, action) =>
      creativeIntelligence.selectDirection(runId, action),
    'creative-intelligence:resume': (_context, runId) => creativeIntelligence.resume(runId),
    'creative-intelligence:cancel': (_context, runId) => creativeIntelligence.cancel(runId),
    'creative-intelligence:remove': (_context, runId) => creativeIntelligence.remove(runId),
    'creative-intelligence:on-progress': (_context, callback) => creativeIntelligence.onProgress(callback),
    // CI-W2: Anchor Production sub-run operations.
    'creative-intelligence:start-anchor-production': (_context, runId, options) =>
      creativeIntelligence.startAnchorProduction(runId, options),
    'creative-intelligence:compile-anchor-production': (_context, runId) =>
      creativeIntelligence.compileAnchorProduction(runId),
    'creative-intelligence:get-anchor-production': (_context, runId) =>
      creativeIntelligence.getAnchorProduction(runId),
    'creative-intelligence:list-anchor-candidates': (_context, runId) =>
      creativeIntelligence.listAnchorCandidates(runId),
    'creative-intelligence:approve-anchor-candidate': (_context, runId, candidateId, reason) =>
      creativeIntelligence.approveAnchorCandidate(runId, candidateId, reason),
    'creative-intelligence:reject-anchor-candidate': (_context, runId, candidateId) =>
      creativeIntelligence.rejectAnchorCandidate(runId, candidateId),
    'creative-intelligence:retry-anchor-candidate': (_context, runId, candidateId) =>
      creativeIntelligence.retryAnchorCandidate(runId, candidateId),
    'creative-intelligence:cancel-anchor-production': (_context, runId) =>
      creativeIntelligence.cancelAnchorProduction(runId),
    'creative-intelligence:get-approved-anchor': (_context, runId) =>
      creativeIntelligence.getApprovedAnchor(runId),
    'creative-intelligence:get-anchor-approval-history': (_context, runId) =>
      creativeIntelligence.getAnchorApprovalHistory(runId),
  });
}
