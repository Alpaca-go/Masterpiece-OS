export function createProjectOperations({ projects, pipeline }) {
  return Object.freeze({
    'projects:list': async () => {
      const records = await projects.list();
      return Promise.all(records.map((record) => pipeline.reconcileOrphanedProject(record)));
    },
    'projects:create': (_context, input) => projects.create(input),
    'projects:get': async (_context, projectId) => (
      pipeline.reconcileOrphanedProject(await projects.get(projectId))
    ),
    'projects:remove': async (_context, projectId) => {
      const project = await pipeline.reconcileOrphanedProject(await projects.get(projectId));
      if (project.status === 'running' || pipeline.isActive(projectId)) {
        throw new Error('正在分析的项目不能删除，请先取消分析');
      }
      await projects.remove(projectId);
    },
    'projects:scan-assets': (_context, projectId) => projects.scan(projectId),
    'projects:remove-asset': (_context, projectId, assetId) => projects.removeAsset(projectId, assetId),
    'projects:remove-batch': (_context, projectId, batchId) => projects.removeBatch(projectId, batchId),
    'projects:clear-assets': (_context, projectId) => projects.clearAssets(projectId),
    'projects:import-files': (_context, projectId, paths, kind) => projects.importFiles(projectId, paths, kind),
  });
}
