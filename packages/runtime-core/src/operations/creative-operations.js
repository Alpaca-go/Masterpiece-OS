export function createVisualMemoryOperations({ visualMemory, referencePacks }) {
  return Object.freeze({
    'visual-memory:get': (_context, projectId) => visualMemory.get(projectId),
    'visual-memory:compile': (_context, projectId) => visualMemory.compile(projectId),
    'visual-memory:get-reference-pack': (_context, projectId) => referencePacks.get(projectId),
    'visual-memory:build-reference-pack': (_context, projectId) => referencePacks.build(projectId),
  });
}

export function createCreativeSessionOperations({
  creativeSessions,
  creativeDirections,
  styleProfiles,
  visualCanons,
  imageGeneration,
  creativeReading,
  creativeGeneration,
}) {
  return Object.freeze({
    'creative-session:get': (_context, projectId) => creativeSessions.get(projectId),
    'creative-session:create': (_context, projectId) => creativeSessions.create(projectId),
    'creative-session:get-workspace': async (_context, projectId) => {
      const [session, creativeDirection, styleProfile, visualCanon, runs] = await Promise.all([
        creativeSessions.create(projectId),
        creativeDirections.getActive(projectId),
        styleProfiles.getActive(projectId),
        visualCanons.getActive(projectId),
        imageGeneration.listRuns(projectId),
      ]);
      return { session, creativeDirection, styleProfile, visualCanon, runs };
    },
    'creative-session:read': (_context, projectId, apiProfileId) => creativeReading.run(projectId, apiProfileId),
    'creative-session:generate': (_context, projectId, input) => creativeGeneration.generate(projectId, input),
    'creative-session:retry-same': (_context, projectId, runId, apiProfileId) => creativeGeneration.retrySameInstruction(projectId, runId, apiProfileId),
    'creative-session:regenerate-instruction': (_context, projectId, runId, apiProfileId) => creativeGeneration.regenerateInstruction(projectId, runId, apiProfileId),
    'creative-session:start-benchmark': (_context, projectId, input) => creativeGeneration.startBenchmark(projectId, input),
    'creative-session:list-benchmarks': (_context, projectId) => creativeGeneration.listBenchmarks(projectId),
    'creative-session:save-benchmark-evaluation': (_context, projectId, benchmarkId, input) => creativeGeneration.saveBenchmarkEvaluation(projectId, benchmarkId, input),
    'creative-session:evaluate': (_context, projectId, runId, input) => creativeGeneration.evaluate(projectId, runId, input),
    'creative-session:regenerate-from-evaluation': (_context, projectId, runId, apiProfileId) => creativeGeneration.regenerateFromEvaluation(projectId, runId, apiProfileId),
    'creative-session:append-feedback': (_context, projectId, content) => creativeSessions.appendMessage(projectId, {
      role: 'user',
      type: 'user_feedback',
      content,
    }),
    'creative-session:get-run': (_context, runId) => imageGeneration.getRun(runId),
    'creative-session:get-image-data-url': (_context, runId, imageId) => imageGeneration.readImageDataUrl(runId, imageId),
  });
}

export function createCreativeProductionOperations({
  lockedAssets,
  creativeProductionBootstrap,
  quickStyleExtraction,
  styleProfiles,
  anchorGeneration,
  visualExplorations,
  anchorCandidates,
  visualCanons,
  generationSeries,
  generationSeriesExecution,
  formalAssets,
  imageGeneration,
  readTextFile,
  joinPath,
}) {
  return Object.freeze({
    'creative-production:list-locked-assets': (_context, projectId) => lockedAssets.list(projectId),
    'creative-production:prepare': (_context, projectId) => creativeProductionBootstrap.prepare(projectId),
    'creative-production:regenerate-context': (_context, projectId, input) => creativeProductionBootstrap.regenerate(projectId, input),
    'creative-production:quick-extract-style': (_context, projectId, runId) => quickStyleExtraction.extract(projectId, runId),
    'creative-production:confirm-style-profile': (_context, projectId, profileId) => styleProfiles.confirm(projectId, profileId),
    'creative-production:list-anchor-candidates': (_context, projectId) => anchorGeneration.list(projectId),
    'creative-production:list-visual-explorations': (_context, projectId) => visualExplorations.list(projectId),
    'creative-production:generate-visual-exploration': (_context, projectId, input) => visualExplorations.generate(projectId, input),
    'creative-production:select-visual-concept': (_context, projectId, explorationId, conceptId, rationale) => visualExplorations.select(projectId, explorationId, conceptId, rationale),
    'creative-production:generate-anchor': (_context, projectId, input) => anchorGeneration.generate(projectId, input),
    'creative-production:generate-anchor-set': (_context, projectId, input) => anchorGeneration.generateSet(projectId, input),
    'creative-production:retry-anchor': (_context, projectId, candidateId, input) => anchorGeneration.retry(projectId, candidateId, input),
    'creative-production:review-anchor': (_context, projectId, candidateId, input) => anchorCandidates.review(projectId, candidateId, input),
    'creative-production:list-style-profiles': (_context, projectId) => styleProfiles.list(projectId),
    'creative-production:list-visual-canons': (_context, projectId) => visualCanons.list(projectId),
    'creative-production:build-visual-canon': (_context, projectId, input) => visualCanons.build(projectId, input),
    'creative-production:build-visual-canon-from-exploration': async (_context, projectId, explorationId, input) => {
      const exploration = await visualExplorations.get(projectId, explorationId);
      if (!exploration) {
        throw Object.assign(new Error('Visual Exploration 不存在。'), { code: 'VISUAL_EXPLORATION_MISSING' });
      }
      return visualCanons.buildFromExploration(projectId, { exploration, ...input });
    },
    'creative-production:confirm-visual-canon': (_context, projectId, canonId) => visualCanons.confirm(projectId, canonId),
    'creative-production:get-series': (_context, projectId, seriesId) => generationSeries.get(projectId, seriesId),
    'creative-production:list-series': (_context, projectId) => generationSeries.list(projectId),
    'creative-production:create-series': (_context, projectId, input) => generationSeries.create(projectId, input),
    'creative-production:create-revision': (_context, projectId, seriesId, input) => generationSeries.createRevision(projectId, seriesId, input),
    'creative-production:pause-series': (_context, projectId, seriesId) => generationSeries.pause(projectId, seriesId),
    'creative-production:resume-series': (_context, projectId, seriesId) => generationSeries.resume(projectId, seriesId),
    'creative-production:cancel-series': (_context, projectId, seriesId) => generationSeries.cancel(projectId, seriesId),
    'creative-production:run-series-task': (_context, projectId, seriesId, taskId, apiProfileId) => generationSeriesExecution.runTask(projectId, seriesId, taskId, apiProfileId),
    'creative-production:run-series': (_context, projectId, seriesId, apiProfileId) => generationSeriesExecution.runAll(projectId, seriesId, apiProfileId),
    'creative-production:list-formal-assets': (_context, projectId, seriesId) => formalAssets.list(projectId, seriesId),
    'creative-production:review-formal-asset': (_context, projectId, seriesId, outputId, input) => formalAssets.review(projectId, seriesId, outputId, input),
    'creative-production:get-run-prompt': async (_context, runId) => {
      const root = await imageGeneration.runRoot(runId);
      if (!root) return null;
      return readTextFile(joinPath(root, 'compiled-prompt.md')).catch(() => null);
    },
    'creative-production:get-run-metadata': async (_context, projectId, runId) => {
      const snapshot = await imageGeneration.readPromptSnapshot(runId, projectId);
      if (!snapshot) return null;
      return {
        outputType: snapshot.outputType,
        promptVersion: snapshot.promptVersion || snapshot.compilerVersion,
        templateId: snapshot.deliverableTemplateId,
        templateVersion: snapshot.deliverableTemplateVersion,
      };
    },
  });
}
