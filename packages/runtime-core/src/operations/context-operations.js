export function createProjectContextOperations({ projectContext }) {
  return Object.freeze({
    'project-context:get': (_context, projectId) => projectContext.get(projectId),
    'project-context:rebuild': (_context, projectId) => projectContext.rebuild(projectId),
    'project-context:export': (_context, projectId) => projectContext.export(projectId),
    'project-context:get-vnext': (_context, projectId) => projectContext.getVNext(projectId),
    'project-context:rebuild-vnext': (_context, projectId) => projectContext.rebuildVNext(projectId),
    'project-context:generation-readiness': (_context, projectId) => projectContext.getGenerationContextReadiness(projectId),
  });
}

export function createContextIntegrationOperations({ contextIntegration }) {
  return Object.freeze({
    'context-integration:link': (_context, projectId, runId) => contextIntegration.linkDocumentContext(projectId, runId),
    'context-integration:unlink': (_context, projectId) => contextIntegration.unlinkDocumentContext(projectId),
    'context-integration:get-link': (_context, projectId) => contextIntegration.getLink(projectId),
    'context-integration:get-visual-status': (_context, projectId) => contextIntegration.getVisualStatus(projectId),
    'context-integration:get-resolved': (_context, projectId) => contextIntegration.getResolved(projectId),
    'context-integration:resolve': (_context, projectId, userOverrides) => contextIntegration.resolve(projectId, userOverrides),
    'context-integration:list-conflicts': (_context, projectId) => contextIntegration.listConflicts(projectId),
    'context-integration:apply-conflict-resolution': (_context, projectId, resolutions) => contextIntegration.applyConflictResolution(projectId, resolutions),
    'context-integration:migrate': (_context, projectId) => contextIntegration.migrate(projectId),
    'context-integration:export': (_context, projectId) => contextIntegration.export(projectId),
    'context-integration:is-doc-referenced': (_context, runId) => contextIntegration.isDocumentContextReferenced(runId),
  });
}
