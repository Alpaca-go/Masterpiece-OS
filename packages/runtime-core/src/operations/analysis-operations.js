export function createAnalysisOperations({ pipeline }) {
  return Object.freeze({
    'analysis:start': (_context, projectId, forceReasoning, apiProfileId) => (
      pipeline.start(projectId, forceReasoning, apiProfileId)
    ),
    'analysis:cancel': (_context, projectId) => pipeline.cancel(projectId),
  });
}
