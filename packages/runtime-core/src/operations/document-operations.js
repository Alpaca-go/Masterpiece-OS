export function createDocumentOperations({ documentContext, readTextFile }) {
  return Object.freeze({
    'document-context:inspect-documents': (_context, paths) => documentContext.inspectDocuments(paths),
    'document-context:list-runs': () => documentContext.listRuns(),
    'document-context:get-run': (_context, runId) => documentContext.getRun(runId),
    'document-context:start': (_context, paths, profileId) => documentContext.start(paths, profileId),
    'document-context:get-extracted': (_context, runId) => documentContext.getExtracted(runId),
    'document-context:confirm': (_context, runId, value) => documentContext.confirm(runId, value),
    'document-context:compile': (_context, runId) => documentContext.compile(runId),
    'document-context:resume': (_context, runId, apiProfileId) => documentContext.resume(runId, apiProfileId),
    'document-context:cancel': (_context, runId) => documentContext.cancel(runId),
    'document-context:remove': async (_context, runId) => {
      const record = await documentContext.getRun(runId).catch(() => null);
      if (record && ['parsing', 'extracting', 'repairing'].includes(record.status)) {
        throw new Error('正在分析的任务不能删除，请先取消分析');
      }
      await documentContext.remove(runId);
    },
    'document-context:read-brief': async (_context, runId) => readTextFile(await documentContext.briefPath(runId)),
    'document-context:adapt-legacy-run': (_context, runId) => documentContext.adaptLegacyRun(runId),
  });
}
