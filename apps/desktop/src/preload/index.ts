import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type {
  AnalysisProgress,
  DesktopApi,
  DocumentContextProgress,
  ReferenceAnchorProgress,
  ImageGenerationProgress
} from '../shared/types';

const api: DesktopApi = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (input) => ipcRenderer.invoke('settings:save', input),
    saveProfile: (input) => ipcRenderer.invoke('settings:save-profile', input),
    deleteProfile: (profileId) => ipcRenderer.invoke('settings:delete-profile', profileId),
    setDefaultProfile: (profileId) => ipcRenderer.invoke('settings:set-default-profile', profileId),
    setProfileEnabled: (profileId, enabled) => ipcRenderer.invoke('settings:set-profile-enabled', profileId, enabled),
    testProfile: (input) => ipcRenderer.invoke('settings:test-profile', input)
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    create: (input) => ipcRenderer.invoke('projects:create', input),
    get: (projectId) => ipcRenderer.invoke('projects:get', projectId),
    remove: (projectId) => ipcRenderer.invoke('projects:remove', projectId),
    chooseFiles: (kind) => ipcRenderer.invoke('projects:choose-files', kind),
    chooseFolder: () => ipcRenderer.invoke('projects:choose-folder'),
    importFiles: (projectId, paths, kind) => ipcRenderer.invoke('projects:import-files', projectId, paths, kind),
    scanAssets: (projectId) => ipcRenderer.invoke('projects:scan-assets', projectId),
    removeAsset: (projectId, assetId) => ipcRenderer.invoke('projects:remove-asset', projectId, assetId),
    removeBatch: (projectId, batchId) => ipcRenderer.invoke('projects:remove-batch', projectId, batchId),
    clearAssets: (projectId) => ipcRenderer.invoke('projects:clear-assets', projectId)
  },
  analysis: {
    start: (projectId, forceReasoning, apiProfileId) => ipcRenderer.invoke('analysis:start', projectId, forceReasoning, apiProfileId),
    cancel: (projectId) => ipcRenderer.invoke('analysis:cancel', projectId),
    onProgress(callback) {
      const listener = (_event: Electron.IpcRendererEvent, progress: AnalysisProgress) => callback(progress);
      ipcRenderer.on('analysis:progress', listener);
      return () => ipcRenderer.removeListener('analysis:progress', listener);
    }
  },
  report: {
    read: (projectId) => ipcRenderer.invoke('report:read', projectId),
    rename: (projectId, filename) => ipcRenderer.invoke('report:rename', projectId, filename),
    export: (projectId) => ipcRenderer.invoke('report:export', projectId),
    openFolder: (projectId) => ipcRenderer.invoke('report:open-folder', projectId)
  },
  documentContext: {
    chooseDocuments: () => ipcRenderer.invoke('document-context:choose-documents'),
    inspectDocuments: (paths) => ipcRenderer.invoke('document-context:inspect-documents', paths),
    listRuns: () => ipcRenderer.invoke('document-context:list-runs'),
    getRun: (runId) => ipcRenderer.invoke('document-context:get-run', runId),
    start: (paths, profileId) => ipcRenderer.invoke('document-context:start', paths, profileId),
    getExtracted: (runId) => ipcRenderer.invoke('document-context:get-extracted', runId),
    confirm: (runId, context) => ipcRenderer.invoke('document-context:confirm', runId, context),
    compile: (runId) => ipcRenderer.invoke('document-context:compile', runId),
    resume: (runId, apiProfileId) => ipcRenderer.invoke('document-context:resume', runId, apiProfileId),
    cancel: (runId) => ipcRenderer.invoke('document-context:cancel', runId),
    remove: (runId) => ipcRenderer.invoke('document-context:remove', runId),
    readBrief: (runId) => ipcRenderer.invoke('document-context:read-brief', runId),
    export: (runId) => ipcRenderer.invoke('document-context:export', runId),
    adaptLegacyRun: (runId) => ipcRenderer.invoke('document-context:adapt-legacy-run', runId),
    openFolder: (runId) => ipcRenderer.invoke('document-context:open-folder', runId),
    onProgress(callback) {
      const listener = (_event: Electron.IpcRendererEvent, progress: DocumentContextProgress) => callback(progress);
      ipcRenderer.on('document-context:progress', listener);
      return () => ipcRenderer.removeListener('document-context:progress', listener);
    }
  },
  referenceAnchor: {
    chooseReferenceAssets: () => ipcRenderer.invoke('reference-anchor:choose-reference-assets'),
    inspectAssets: (paths) => ipcRenderer.invoke('reference-anchor:inspect-assets', paths),
    listRuns: () => ipcRenderer.invoke('reference-anchor:list-runs'),
    getRun: (runId) => ipcRenderer.invoke('reference-anchor:get-run', runId),
    start: (input) => ipcRenderer.invoke('reference-anchor:start', input),
    getCapsule: (runId) => ipcRenderer.invoke('reference-anchor:get-capsule', runId),
    getBrief: (runId) => ipcRenderer.invoke('reference-anchor:get-brief', runId),
    getCapsuleMarkdown: (runId) => ipcRenderer.invoke('reference-anchor:get-capsule-markdown', runId),
    updatePreference: (runId, preference, avoidance) => ipcRenderer.invoke('reference-anchor:update-preference', runId, preference, avoidance),
    retryBrief: (runId, editedBrief) => ipcRenderer.invoke('reference-anchor:retry-brief', runId, editedBrief),
    setDecision: (runId, decision, note) => ipcRenderer.invoke('reference-anchor:set-decision', runId, decision, note),
    adaptLegacyRun: (runId) => ipcRenderer.invoke('reference-anchor:adapt-legacy-run', runId),
    cancel: (runId) => ipcRenderer.invoke('reference-anchor:cancel', runId),
    remove: (runId) => ipcRenderer.invoke('reference-anchor:remove', runId),
    export: (runId) => ipcRenderer.invoke('reference-anchor:export', runId),
    openFolder: (runId) => ipcRenderer.invoke('reference-anchor:open-folder', runId),
    onProgress(callback) {
      const listener = (_event: Electron.IpcRendererEvent, progress: ReferenceAnchorProgress) => callback(progress);
      ipcRenderer.on('reference-anchor:progress', listener);
      return () => ipcRenderer.removeListener('reference-anchor:progress', listener);
    }
  },
  imageGeneration: {
    getCapabilities: (apiProfileId) => ipcRenderer.invoke('image-generation:get-capabilities', apiProfileId),
    getPresetCapabilities: () => ipcRenderer.invoke('image-generation:get-preset-capabilities'),
    getSourcePreview: (input) => ipcRenderer.invoke('image-generation:get-source-preview', input),
    compile: (input) => ipcRenderer.invoke('image-generation:compile', input),
    compileVNext: (input) => ipcRenderer.invoke('image-generation:vnext-compile', input),
    getVNextOptions: () => ipcRenderer.invoke('image-generation:vnext-options'),
    startVNext: (input) => ipcRenderer.invoke('image-generation:vnext-start', input),
    startValidatedVNext: (input) => ipcRenderer.invoke('image-generation:vnext-start-validated', input),
    getVNextSession: (projectId) => ipcRenderer.invoke('image-generation:vnext-session', projectId),
    confirmVNextDirection: (projectId, runId, imageId) =>
      ipcRenderer.invoke('image-generation:vnext-confirm-direction', projectId, runId, imageId),
    confirmVNextGeneratedOutput: (projectId, runId, imageId) =>
      ipcRenderer.invoke('image-generation:vnext-confirm-generated-output', projectId, runId, imageId),
    revokeVNextGeneratedOutput: (projectId, assetId) =>
      ipcRenderer.invoke('image-generation:vnext-revoke-generated-output', projectId, assetId),
    getVNextConfirmedGeneratedOutputs: (projectId) =>
      ipcRenderer.invoke('image-generation:vnext-confirmed-generated-outputs', projectId),
    continueVNextSameType: (projectId, currentInstruction, apiProfileId, dryRun) =>
      ipcRenderer.invoke(
        'image-generation:vnext-continue-same-type',
        projectId,
        currentInstruction,
        apiProfileId,
        dryRun,
      ),
    saveVNextProjectPromptAsset: (input) =>
      ipcRenderer.invoke('image-generation:vnext-save-prompt-asset', input),
    postCompositeVNextLogo: (input) =>
      ipcRenderer.invoke('image-generation:vnext-post-composite-logo', input),
    start: (input) => ipcRenderer.invoke('image-generation:start', input),
    getRun: (runId) => ipcRenderer.invoke('image-generation:get-run', runId),
    listRuns: (projectId) => ipcRenderer.invoke('image-generation:list-runs', projectId),
    cancel: (runId) => ipcRenderer.invoke('image-generation:cancel', runId),
    retry: (input) => ipcRenderer.invoke('image-generation:retry', input),
    saveReview: (review) => ipcRenderer.invoke('image-generation:save-review', review),
    openFolder: (runId) => ipcRenderer.invoke('image-generation:open-folder', runId),
    getImageDataUrl: (runId, imageId) => ipcRenderer.invoke('image-generation:get-image-data-url', runId, imageId),
    onRunUpdated(callback) {
      const listener = (_event: Electron.IpcRendererEvent, progress: ImageGenerationProgress) => callback(progress);
      ipcRenderer.on('image-generation:run-updated', listener);
      return () => ipcRenderer.removeListener('image-generation:run-updated', listener);
    }
  },
  creativeSession: {
    get: (projectId) => ipcRenderer.invoke('creative-session:get', projectId),
    create: (projectId) => ipcRenderer.invoke('creative-session:create', projectId),
    getWorkspace: (projectId) => ipcRenderer.invoke('creative-session:get-workspace', projectId),
    read: (projectId, apiProfileId) => ipcRenderer.invoke('creative-session:read', projectId, apiProfileId),
    generate: (projectId, input) => ipcRenderer.invoke('creative-session:generate', projectId, input),
    retrySame: (projectId, runId, apiProfileId) =>
      ipcRenderer.invoke('creative-session:retry-same', projectId, runId, apiProfileId),
    regenerateInstruction: (projectId, runId, apiProfileId) =>
      ipcRenderer.invoke('creative-session:regenerate-instruction', projectId, runId, apiProfileId),
    startBenchmark: (projectId, input) =>
      ipcRenderer.invoke('creative-session:start-benchmark', projectId, input),
    listBenchmarks: (projectId) =>
      ipcRenderer.invoke('creative-session:list-benchmarks', projectId),
    saveBenchmarkEvaluation: (projectId, benchmarkId, input) =>
      ipcRenderer.invoke(
        'creative-session:save-benchmark-evaluation',
        projectId,
        benchmarkId,
        input
      ),
    evaluate: (projectId, runId, input) =>
      ipcRenderer.invoke('creative-session:evaluate', projectId, runId, input),
    regenerateFromEvaluation: (projectId, runId, apiProfileId) =>
      ipcRenderer.invoke('creative-session:regenerate-from-evaluation', projectId, runId, apiProfileId),
    appendFeedback: (projectId, content) =>
      ipcRenderer.invoke('creative-session:append-feedback', projectId, content),
    getRun: (runId) => ipcRenderer.invoke('creative-session:get-run', runId),
    getImageDataUrl: (runId, imageId) =>
      ipcRenderer.invoke('creative-session:get-image-data-url', runId, imageId)
  },
  creativeProduction: {
    prepare: (projectId) => ipcRenderer.invoke('creative-production:prepare', projectId),
    regenerateContext: (projectId, input) =>
      ipcRenderer.invoke('creative-production:regenerate-context', projectId, input),
    quickExtractStyle: (projectId, referenceAnchorRunId) =>
      ipcRenderer.invoke('creative-production:quick-extract-style', projectId, referenceAnchorRunId),
    listLockedAssets: (projectId) =>
      ipcRenderer.invoke('creative-production:list-locked-assets', projectId),
    listAnchorCandidates: (projectId) =>
      ipcRenderer.invoke('creative-production:list-anchor-candidates', projectId),
    listVisualExplorations: (projectId) =>
      ipcRenderer.invoke('creative-production:list-visual-explorations', projectId),
    generateVisualExploration: (projectId, input) =>
      ipcRenderer.invoke('creative-production:generate-visual-exploration', projectId, input),
    selectVisualConcept: (projectId, explorationId, conceptId, rationale) =>
      ipcRenderer.invoke(
        'creative-production:select-visual-concept',
        projectId,
        explorationId,
        conceptId,
        rationale
      ),
    confirmStyleProfile: (projectId, profileId) =>
      ipcRenderer.invoke('creative-production:confirm-style-profile', projectId, profileId),
    generateAnchor: (projectId, input) =>
      ipcRenderer.invoke('creative-production:generate-anchor', projectId, input),
    generateAnchorSet: (projectId, input) =>
      ipcRenderer.invoke('creative-production:generate-anchor-set', projectId, input),
    retryAnchor: (projectId, candidateId, input) =>
      ipcRenderer.invoke('creative-production:retry-anchor', projectId, candidateId, input),
    reviewAnchor: (projectId, candidateId, input) =>
      ipcRenderer.invoke('creative-production:review-anchor', projectId, candidateId, input),
    listStyleProfiles: (projectId) =>
      ipcRenderer.invoke('creative-production:list-style-profiles', projectId),
    listVisualCanons: (projectId) =>
      ipcRenderer.invoke('creative-production:list-visual-canons', projectId),
    buildVisualCanon: (projectId, input) =>
      ipcRenderer.invoke('creative-production:build-visual-canon', projectId, input),
    buildVisualCanonFromExploration: (projectId, explorationId, input) =>
      ipcRenderer.invoke(
        'creative-production:build-visual-canon-from-exploration',
        projectId,
        explorationId,
        input
      ),
    confirmVisualCanon: (projectId, canonId) =>
      ipcRenderer.invoke('creative-production:confirm-visual-canon', projectId, canonId),
    getSeries: (projectId, seriesId) =>
      ipcRenderer.invoke('creative-production:get-series', projectId, seriesId),
    listSeries: (projectId) =>
      ipcRenderer.invoke('creative-production:list-series', projectId),
    createSeries: (projectId, input) =>
      ipcRenderer.invoke('creative-production:create-series', projectId, input),
    createRevision: (projectId, seriesId, input) =>
      ipcRenderer.invoke('creative-production:create-revision', projectId, seriesId, input),
    pauseSeries: (projectId, seriesId) =>
      ipcRenderer.invoke('creative-production:pause-series', projectId, seriesId),
    resumeSeries: (projectId, seriesId) =>
      ipcRenderer.invoke('creative-production:resume-series', projectId, seriesId),
    cancelSeries: (projectId, seriesId) =>
      ipcRenderer.invoke('creative-production:cancel-series', projectId, seriesId),
    runSeriesTask: (projectId, seriesId, taskId, apiProfileId) =>
      ipcRenderer.invoke('creative-production:run-series-task', projectId, seriesId, taskId, apiProfileId),
    runSeries: (projectId, seriesId, apiProfileId) =>
      ipcRenderer.invoke('creative-production:run-series', projectId, seriesId, apiProfileId),
    listFormalAssets: (projectId, seriesId) =>
      ipcRenderer.invoke('creative-production:list-formal-assets', projectId, seriesId),
    reviewFormalAsset: (projectId, seriesId, outputId, input) =>
      ipcRenderer.invoke('creative-production:review-formal-asset', projectId, seriesId, outputId, input),
    getRunPrompt: (runId) =>
      ipcRenderer.invoke('creative-production:get-run-prompt', runId),
    getRunMetadata: (projectId, runId) =>
      ipcRenderer.invoke('creative-production:get-run-metadata', projectId, runId)
  },
  files: {
    getPathForFile: (file) => webUtils.getPathForFile(file)
  },
  projectContext: {
    get: (projectId) => ipcRenderer.invoke('project-context:get', projectId),
    rebuild: (projectId) => ipcRenderer.invoke('project-context:rebuild', projectId),
    export: (projectId) => ipcRenderer.invoke('project-context:export', projectId),
    getVNext: (projectId) => ipcRenderer.invoke('project-context:get-vnext', projectId),
    rebuildVNext: (projectId) => ipcRenderer.invoke('project-context:rebuild-vnext', projectId)
  },
  visualMemory: {
    get: (projectId) => ipcRenderer.invoke('visual-memory:get', projectId),
    compile: (projectId) => ipcRenderer.invoke('visual-memory:compile', projectId),
    getReferencePack: (projectId) => ipcRenderer.invoke('visual-memory:get-reference-pack', projectId),
    buildReferencePack: (projectId) => ipcRenderer.invoke('visual-memory:build-reference-pack', projectId)
  },
  contextIntegration: {
    linkDocumentContext: (projectId, runId) => ipcRenderer.invoke('context-integration:link', projectId, runId),
    unlinkDocumentContext: (projectId) => ipcRenderer.invoke('context-integration:unlink', projectId),
    getLink: (projectId) => ipcRenderer.invoke('context-integration:get-link', projectId),
    getVisualStatus: (projectId) => ipcRenderer.invoke('context-integration:get-visual-status', projectId),
    getResolved: (projectId) => ipcRenderer.invoke('context-integration:get-resolved', projectId),
    resolve: (projectId, userOverrides) => ipcRenderer.invoke('context-integration:resolve', projectId, userOverrides),
    listConflicts: (projectId) => ipcRenderer.invoke('context-integration:list-conflicts', projectId),
    applyConflictResolution: (projectId, resolutions) => ipcRenderer.invoke('context-integration:apply-conflict-resolution', projectId, resolutions),
    migrate: (projectId) => ipcRenderer.invoke('context-integration:migrate', projectId),
    export: (projectId) => ipcRenderer.invoke('context-integration:export', projectId),
    isDocumentContextReferenced: (runId) => ipcRenderer.invoke('context-integration:is-doc-referenced', runId)
  }
};

contextBridge.exposeInMainWorld('masterpiece', api);
