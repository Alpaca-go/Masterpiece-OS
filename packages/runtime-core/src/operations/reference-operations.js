export function createReferenceOperations({ referenceAnchor }) {
  return Object.freeze({
    'reference-anchor:inspect-assets': (_context, paths) => referenceAnchor.inspectAssets(paths),
    'reference-anchor:list-runs': () => referenceAnchor.listRuns(),
    'reference-anchor:get-run': (_context, runId) => referenceAnchor.getRun(runId),
    'reference-anchor:start': (_context, input) => referenceAnchor.start(input),
    'reference-anchor:get-capsule': (_context, runId) => referenceAnchor.getCapsule(runId),
    'reference-anchor:get-capsule-markdown': (_context, runId) => referenceAnchor.getCapsuleMarkdown(runId),
    'reference-anchor:get-brief': (_context, runId) => referenceAnchor.getBrief(runId),
    'reference-anchor:update-preference': (_context, runId, preference, avoidance) => referenceAnchor.updatePreference(runId, preference, avoidance),
    'reference-anchor:retry-brief': (_context, runId, editedBrief) => referenceAnchor.retryBrief(runId, editedBrief),
    'reference-anchor:set-decision': (_context, runId, decision, note) => referenceAnchor.setDecision(runId, decision, note),
    'reference-anchor:adapt-legacy-run': (_context, runId) => referenceAnchor.adaptLegacyRun(runId),
    'reference-anchor:cancel': (_context, runId) => referenceAnchor.cancel(runId),
    'reference-anchor:remove': async (_context, runId) => {
      const record = await referenceAnchor.getRun(runId).catch(() => null);
      if (record && ['preparing', 'analyzing_reference', 'compiling_capsule', 'compiling_brief'].includes(record.status)) {
        throw new Error('正在分析的 Anchor 任务不能删除，请先取消分析');
      }
      await referenceAnchor.remove(runId);
    },
  });
}
