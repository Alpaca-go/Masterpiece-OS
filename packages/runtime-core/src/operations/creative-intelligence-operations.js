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
  });
}
