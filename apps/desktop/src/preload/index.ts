import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type {
  AnalysisProgress,
  DesktopApi,
  DocumentContextProgress,
  ReferenceAnchorProgress,
  ReferenceTranslationProgress,
  VisualTranslationProgress
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
  visualTranslation: {
    chooseDocuments: () => ipcRenderer.invoke('visual-translation:choose-documents'),
    inspectDocuments: (paths) => ipcRenderer.invoke('visual-translation:inspect-documents', paths),
    listRuns: () => ipcRenderer.invoke('visual-translation:list-runs'),
    getRun: (runId) => ipcRenderer.invoke('visual-translation:get-run', runId),
    start: (input) => ipcRenderer.invoke('visual-translation:start', input),
    resume: (runId, apiProfileId) => ipcRenderer.invoke('visual-translation:resume', runId, apiProfileId),
    cancel: (runId) => ipcRenderer.invoke('visual-translation:cancel', runId),
    remove: (runId) => ipcRenderer.invoke('visual-translation:remove', runId),
    readReport: (runId) => ipcRenderer.invoke('visual-translation:read-report', runId),
    exportReport: (runId) => ipcRenderer.invoke('visual-translation:export-report', runId),
    openFolder: (runId) => ipcRenderer.invoke('visual-translation:open-folder', runId),
    onProgress(callback) {
      const listener = (_event: Electron.IpcRendererEvent, progress: VisualTranslationProgress) => callback(progress);
      ipcRenderer.on('visual-translation:progress', listener);
      return () => ipcRenderer.removeListener('visual-translation:progress', listener);
    }
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
  referenceTranslation: {
    chooseInput: () => ipcRenderer.invoke('reference-translation:choose-input'),
    chooseReferenceAssets: () => ipcRenderer.invoke('reference-translation:choose-reference-assets'),
    chooseProjectSources: () => ipcRenderer.invoke('reference-translation:choose-project-sources'),
    inspectAssets: (paths) => ipcRenderer.invoke('reference-translation:inspect-assets', paths),
    runUserInput: (input) => ipcRenderer.invoke('reference-translation:run-user-input', input),
    run: (input) => ipcRenderer.invoke('reference-translation:run', input),
    listRuns: () => ipcRenderer.invoke('reference-translation:list-runs'),
    getActive: () => ipcRenderer.invoke('reference-translation:get-active'),
    getProfile: (runId) => ipcRenderer.invoke('reference-translation:get-profile', runId),
    getDirection: (runId) => ipcRenderer.invoke('reference-translation:get-direction', runId),
    getReconstruction: (runId) => ipcRenderer.invoke('reference-translation:get-reconstruction', runId),
    readReport: (runId) => ipcRenderer.invoke('reference-translation:read-report', runId),
    resume: (runId, apiProfileId) => ipcRenderer.invoke('reference-translation:resume', runId, apiProfileId),
    retryReport: (runId) => ipcRenderer.invoke('reference-translation:retry-report', runId),
    cancel: (runId) => ipcRenderer.invoke('reference-translation:cancel', runId),
    remove: (runId) => ipcRenderer.invoke('reference-translation:remove', runId),
    openFolder: (runId) => ipcRenderer.invoke('reference-translation:open-folder', runId),
    onProgress(callback) {
      const listener = (_event: Electron.IpcRendererEvent, progress: ReferenceTranslationProgress) => callback(progress);
      ipcRenderer.on('reference-translation:progress', listener);
      return () => ipcRenderer.removeListener('reference-translation:progress', listener);
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
  files: {
    getPathForFile: (file) => webUtils.getPathForFile(file)
  },
  projectContext: {
    get: (projectId) => ipcRenderer.invoke('project-context:get', projectId),
    rebuild: (projectId) => ipcRenderer.invoke('project-context:rebuild', projectId),
    export: (projectId) => ipcRenderer.invoke('project-context:export', projectId)
  }
};

contextBridge.exposeInMainWorld('masterpiece', api);
