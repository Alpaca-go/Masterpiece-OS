import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import type {
  AnalysisProgress,
  ConflictResolutionInput,
  CreateProjectInput,
  SaveApiProfileInput,
  SaveSettingsInput,
  AnchorDecision,
  StartReferenceAnchorInput
} from '../shared/types';
import { createProjectStore } from './project-store';
import {
  deleteApiProfile,
  getProviderCredentials,
  getSettings,
  saveApiProfile,
  saveSettings,
  setApiProfileEnabled,
  setDefaultApiProfile,
  testApiProfile
} from './settings-store';
import { createPipelineService } from './pipeline-service';
import { createReferenceAnchorService } from './reference-anchor-service';
import { createImageGenerationService, type ImageGenerationService } from './image-generation/service';
import { registerImageGenerationIpc } from './image-generation/ipc';
import { createFileContextLoader } from './image-generation/context-loader';
import { createProjectContextService } from './project-context-service';
import { createDocumentContextService } from './document-context-service';
import { createContextIntegrationService } from './context-integration-service';
import { createCreativeSessionService } from './creative-session-service';
import { createCreativeReadingService } from './creative-reading-service';
import { createStyleProfileService } from './style-profile-service';
import { createLockedAssetsService } from './locked-assets-service';
import { createAnchorCandidateService } from './anchor-candidate-service';
import { createVisualCanonService } from './visual-canon-service';
import { createGenerationPromptService } from './generation-prompt-service';
import { createCreativeGenerationService, type CreativeGenerationService } from './creative-generation-service';
import { createGenerationSeriesService } from './generation-series-service';
import { createFormalAssetsService } from './formal-assets-service';
import { assertInside, sanitizeFilenamePart } from './analysis-contract';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.warn(JSON.stringify({ event: 'SECOND_INSTANCE_BLOCKED', timestamp: new Date().toISOString() }));
  app.quit();
} else {
  app.on('second-instance', () => {
    console.warn(JSON.stringify({ event: 'SECOND_INSTANCE_BLOCKED', timestamp: new Date().toISOString() }));
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

const projects = createProjectStore(getSettings);
/** 生图功能 V1 主进程服务（在 app ready 后构造，以便安全解析数据目录）。 */
let imageGeneration: ImageGenerationService;
let creativeGeneration: CreativeGenerationService;
const pipeline = createPipelineService(
  projects,
  getProviderCredentials,
  getSettings,
  (progress: AnalysisProgress) => mainWindow?.webContents.send('analysis:progress', progress)
);
const documentContext = createDocumentContextService(
  getProviderCredentials,
  getSettings,
  (progress) => mainWindow?.webContents.send('document-context:progress', progress)
);
const projectContext = createProjectContextService({
  projects,
  showSaveDialog: (defaultPath: string) =>
    dialog.showSaveDialog(mainWindow!, {
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
});
const contextIntegration = createContextIntegrationService({
  readSettings: getSettings,
  projects,
  projectContext,
  documentContext,
  showSaveDialog: (defaultPath: string) =>
    dialog.showSaveDialog(mainWindow!, {
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
});
const referenceAnchor = createReferenceAnchorService(getSettings, {
  projects,
  pipeline,
  projectContext,
  documentContext,
  contextIntegration,
  emitProgress: (progress) => mainWindow?.webContents.send('reference-anchor:progress', progress)
});
const creativeSessions = createCreativeSessionService(projects);
const styleProfiles = createStyleProfileService(projects, creativeSessions);
const lockedAssets = createLockedAssetsService(projects, creativeSessions);
const anchorCandidates = createAnchorCandidateService(projects, creativeSessions, styleProfiles, lockedAssets);
const visualCanons = createVisualCanonService(projects, creativeSessions, styleProfiles, lockedAssets, anchorCandidates);
const generationPrompts = createGenerationPromptService(
  projects,
  creativeSessions,
  styleProfiles,
  lockedAssets,
  visualCanons
);
const creativeReading = createCreativeReadingService(
  projects,
  creativeSessions,
  lockedAssets,
  getProviderCredentials
);
const generationSeries = createGenerationSeriesService(
  projects,
  creativeSessions,
  styleProfiles,
  lockedAssets,
  visualCanons
);
const formalAssets = createFormalAssetsService(projects);

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#f4f2ed',
    title: 'Masterpiece OS Desktop',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function registerIpc(): void {
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:save', (_event, input: SaveSettingsInput) => saveSettings(input));
  ipcMain.handle('settings:save-profile', (_event, input: SaveApiProfileInput) => saveApiProfile(input));
  ipcMain.handle('settings:delete-profile', (_event, profileId: string) => deleteApiProfile(profileId));
  ipcMain.handle('settings:set-default-profile', (_event, profileId: string) => setDefaultApiProfile(profileId));
  ipcMain.handle('settings:set-profile-enabled', (_event, profileId: string, enabled: boolean) => setApiProfileEnabled(profileId, enabled));
  ipcMain.handle('settings:test-profile', (_event, input: SaveApiProfileInput) => testApiProfile(input));

  ipcMain.handle('projects:list', async () => {
    const records = await projects.list();
    return Promise.all(records.map((record) => pipeline.reconcileOrphanedProject(record)));
  });
  ipcMain.handle('projects:create', (_event, input: CreateProjectInput) => projects.create(input));
  ipcMain.handle('projects:get', async (_event, projectId: string) => pipeline.reconcileOrphanedProject(await projects.get(projectId)));
  ipcMain.handle('projects:remove', async (_event, projectId: string) => {
    // 以内存活跃表为准：僵尸 running 记录（应用异常退出遗留）会先被自动降级为 failed，随后放行删除
    const project = await pipeline.reconcileOrphanedProject(await projects.get(projectId));
    if (project.status === 'running' || pipeline.isActive(projectId)) throw new Error('正在分析的项目不能删除，请先取消分析');
    await projects.remove(projectId);
  });
  ipcMain.handle('projects:scan-assets', (_event, projectId: string) => projects.scan(projectId));
  ipcMain.handle('projects:remove-asset', (_event, projectId: string, assetId: string) => projects.removeAsset(projectId, assetId));
  ipcMain.handle('projects:remove-batch', (_event, projectId: string, batchId: string) => projects.removeBatch(projectId, batchId));
  ipcMain.handle('projects:clear-assets', (_event, projectId: string) => projects.clearAssets(projectId));
  ipcMain.handle('projects:choose-files', async (_event, kind: 'assets' | 'logo' | 'brief') => {
    const filters = kind === 'logo'
      ? [{ name: 'Logo 图片', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
      : kind === 'brief'
        ? [{ name: '项目说明', extensions: ['md', 'txt', 'json', 'pdf'] }]
        : [{ name: '视觉方案', extensions: ['zip', 'jpg', 'jpeg', 'png', 'webp', 'pdf'] }];
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters
    });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle('projects:choose-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle('projects:import-files', (
    _event,
    projectId: string,
    paths: string[],
    kind: 'assets' | 'logo' | 'brief'
  ) => projects.importFiles(projectId, paths, kind));

  ipcMain.handle('analysis:start', (_event, projectId: string, forceReasoning: boolean, apiProfileId?: string) => pipeline.start(projectId, forceReasoning, apiProfileId));
  ipcMain.handle('analysis:cancel', (_event, projectId: string) => pipeline.cancel(projectId));

  ipcMain.handle('report:read', async (_event, projectId: string) => {
    const project = await projects.get(projectId);
    if (!project.lastReportFilename) throw new Error('项目尚未生成报告');
    const paths = await projects.paths(projectId);
    return fs.readFile(assertInside(paths.outputs, path.join(paths.outputs, project.lastReportFilename)), 'utf8');
  });
  ipcMain.handle('report:rename', async (_event, projectId: string, requestedFilename: string) => {
    const project = await projects.get(projectId);
    if (!project.lastReportFilename) throw new Error('项目尚未生成报告');
    const base = sanitizeFilenamePart(path.parse(String(requestedFilename || '')).name);
    if (!base || base === '未命名') throw new Error('报告文件名不能为空');
    const filename = `${base}.md`;
    if (filename === project.lastReportFilename) return project;
    const paths = await projects.paths(projectId);
    const source = assertInside(paths.outputs, path.join(paths.outputs, project.lastReportFilename));
    const destination = assertInside(paths.outputs, path.join(paths.outputs, filename));
    if (await fs.stat(destination).then(() => true).catch(() => false)) throw new Error('输出目录中已存在同名报告');
    await fs.rename(source, destination);
    return projects.update(projectId, { lastReportFilename: filename });
  });
  ipcMain.handle('report:export', async (_event, projectId: string) => {
    const project = await projects.get(projectId);
    if (!project.lastReportFilename) throw new Error('项目尚未生成报告');
    const paths = await projects.paths(projectId);
    const source = assertInside(paths.outputs, path.join(paths.outputs, project.lastReportFilename));
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: project.lastReportFilename,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });
    if (result.canceled || !result.filePath) return null;
    await fs.copyFile(source, result.filePath);
    return result.filePath;
  });
  ipcMain.handle('report:open-folder', async (_event, projectId: string) => {
    const paths = await projects.paths(projectId);
    const result = await shell.openPath(paths.outputs);
    if (result) throw new Error(result);
  });

  ipcMain.handle('project-context:get', (_event, projectId: string) => projectContext.get(projectId));
  ipcMain.handle('project-context:rebuild', (_event, projectId: string) => projectContext.rebuild(projectId));
  ipcMain.handle('project-context:export', (_event, projectId: string) => projectContext.export(projectId));

  // ── Phase 4：三大功能轻量整合（Context Integration）──
  ipcMain.handle('context-integration:link', (_event, projectId: string, runId: string) => contextIntegration.linkDocumentContext(projectId, runId));
  ipcMain.handle('context-integration:unlink', (_event, projectId: string) => contextIntegration.unlinkDocumentContext(projectId));
  ipcMain.handle('context-integration:get-link', (_event, projectId: string) => contextIntegration.getLink(projectId));
  ipcMain.handle('context-integration:get-visual-status', (_event, projectId: string) => contextIntegration.getVisualStatus(projectId));
  ipcMain.handle('context-integration:get-resolved', (_event, projectId: string) => contextIntegration.getResolved(projectId));
  ipcMain.handle('context-integration:resolve', (_event, projectId: string, userOverrides?: Record<string, unknown>) => contextIntegration.resolve(projectId, userOverrides));
  ipcMain.handle('context-integration:list-conflicts', (_event, projectId: string) => contextIntegration.listConflicts(projectId));
  ipcMain.handle('context-integration:apply-conflict-resolution', (_event, projectId: string, resolutions: ConflictResolutionInput[]) => contextIntegration.applyConflictResolution(projectId, resolutions));
  ipcMain.handle('context-integration:migrate', (_event, projectId: string) => contextIntegration.migrate(projectId));
  ipcMain.handle('context-integration:export', async (_event, projectId: string) => {
    const source = await contextIntegration.export(projectId);
    return source;
  });
  ipcMain.handle('context-integration:is-doc-referenced', (_event, runId: string) => contextIntegration.isDocumentContextReferenced(runId));

  ipcMain.handle('document-context:choose-documents', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '策略文档', extensions: ['pdf', 'docx', 'md', 'markdown', 'txt'] }]
    });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle('document-context:inspect-documents', (_event, paths: string[]) => documentContext.inspectDocuments(paths));
  ipcMain.handle('document-context:list-runs', () => documentContext.listRuns());
  ipcMain.handle('document-context:get-run', (_event, runId: string) => documentContext.getRun(runId));
  ipcMain.handle('document-context:start', (_event, paths: string[], profileId: string) => documentContext.start(paths, profileId));
  ipcMain.handle('document-context:get-extracted', (_event, runId: string) => documentContext.getExtracted(runId));
  ipcMain.handle('document-context:confirm', (_event, runId: string, context) => documentContext.confirm(runId, context));
  ipcMain.handle('document-context:compile', (_event, runId: string) => documentContext.compile(runId));
  ipcMain.handle('document-context:resume', (_event, runId: string, apiProfileId?: string) => documentContext.resume(runId, apiProfileId));
  ipcMain.handle('document-context:cancel', (_event, runId: string) => documentContext.cancel(runId));
  ipcMain.handle('document-context:remove', async (_event, runId: string) => {
    const record = await documentContext.getRun(runId).catch(() => null);
    if (record && ['parsing', 'extracting', 'repairing'].includes(record.status)) throw new Error('正在分析的任务不能删除，请先取消分析');
    await documentContext.remove(runId);
  });
  ipcMain.handle('document-context:read-brief', async (_event, runId: string) => fs.readFile(await documentContext.briefPath(runId), 'utf8'));
  ipcMain.handle('document-context:export', async (_event, runId: string) => {
    const source = await documentContext.briefPath(runId);
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: path.basename(source),
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });
    if (result.canceled || !result.filePath) return null;
    await fs.copyFile(source, result.filePath);
    return result.filePath;
  });
  ipcMain.handle('document-context:adapt-legacy-run', (_event, runId: string) => documentContext.adaptLegacyRun(runId));
  ipcMain.handle('document-context:open-folder', async (_event, runId: string) => {
    const root = await documentContext.runRoot(runId);
    const result = await shell.openPath(path.join(root, 'outputs'));
    if (result) throw new Error(result);
  });

  // ── Phase 3：参考视觉转换 Anchor 工作流 ──
  ipcMain.handle('reference-anchor:choose-reference-assets', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '核心参考图', extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'zip'] }]
    });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle('reference-anchor:inspect-assets', (_event, paths: string[]) => referenceAnchor.inspectAssets(paths));
  ipcMain.handle('reference-anchor:list-runs', () => referenceAnchor.listRuns());
  ipcMain.handle('reference-anchor:get-run', (_event, runId: string) => referenceAnchor.getRun(runId));
  ipcMain.handle('reference-anchor:start', (_event, input: StartReferenceAnchorInput) => referenceAnchor.start(input));
  ipcMain.handle('reference-anchor:get-capsule', (_event, runId: string) => referenceAnchor.getCapsule(runId));
  ipcMain.handle('reference-anchor:get-capsule-markdown', (_event, runId: string) => referenceAnchor.getCapsuleMarkdown(runId));
  ipcMain.handle('reference-anchor:get-brief', (_event, runId: string) => referenceAnchor.getBrief(runId));
  ipcMain.handle('reference-anchor:update-preference', (
    _event,
    runId: string,
    preference: string,
    avoidance: string[]
  ) => referenceAnchor.updatePreference(runId, preference, avoidance));
  ipcMain.handle('reference-anchor:retry-brief', (_event, runId: string, editedBrief?: string) => referenceAnchor.retryBrief(runId, editedBrief));
  ipcMain.handle('reference-anchor:set-decision', (
    _event,
    runId: string,
    decision: AnchorDecision,
    note?: string
  ) => referenceAnchor.setDecision(runId, decision, note));
  ipcMain.handle('reference-anchor:adapt-legacy-run', (_event, runId: string) => referenceAnchor.adaptLegacyRun(runId));
  ipcMain.handle('reference-anchor:cancel', (_event, runId: string) => referenceAnchor.cancel(runId));
  ipcMain.handle('reference-anchor:remove', async (_event, runId: string) => {
    const record = await referenceAnchor.getRun(runId).catch(() => null);
    if (record && ['preparing', 'analyzing_reference', 'compiling_capsule', 'compiling_brief'].includes(record.status)) {
      throw new Error('正在分析的 Anchor 任务不能删除，请先取消分析');
    }
    await referenceAnchor.remove(runId);
  });
  ipcMain.handle('reference-anchor:export', async (_event, runId: string) => {
    const source = await referenceAnchor.briefPath(runId);
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: path.basename(source),
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });
    if (result.canceled || !result.filePath) return null;
    await fs.copyFile(source, result.filePath);
    return result.filePath;
  });
  ipcMain.handle('reference-anchor:open-folder', async (_event, runId: string) => {
    const root = await referenceAnchor.runRoot(runId);
    const result = await shell.openPath(path.join(root, 'outputs'));
    if (result) throw new Error(result);
  });

  // ---- 生图功能 V1（§16 Desktop IPC）----
  registerImageGenerationIpc(imageGeneration, ipcMain);
  ipcMain.handle('creative-session:get', (_event, projectId: string) =>
    creativeSessions.get(projectId));
  ipcMain.handle('creative-session:create', (_event, projectId: string) =>
    creativeSessions.create(projectId));
  ipcMain.handle('creative-session:get-workspace', async (_event, projectId: string) => {
    const [session, styleProfile, visualCanon, runs] = await Promise.all([
      creativeSessions.create(projectId),
      styleProfiles.getActive(projectId),
      visualCanons.getActive(projectId),
      imageGeneration.listRuns(projectId),
    ]);
    return { session, styleProfile, visualCanon, runs };
  });
  ipcMain.handle('creative-session:read', (_event, projectId: string, apiProfileId?: string) =>
    creativeReading.run(projectId, apiProfileId));
  ipcMain.handle('creative-session:generate', (
    _event,
    projectId: string,
    input: { userRequest: string; apiProfileId?: string; size?: string; dryRun?: boolean }
  ) => creativeGeneration.generate(projectId, input));
  ipcMain.handle('creative-session:retry-same', (
    _event,
    projectId: string,
    runId: string,
    apiProfileId?: string
  ) => creativeGeneration.retrySameInstruction(projectId, runId, apiProfileId));
  ipcMain.handle('creative-session:regenerate-instruction', (
    _event,
    projectId: string,
    runId: string,
    apiProfileId?: string
  ) => creativeGeneration.regenerateInstruction(projectId, runId, apiProfileId));
  ipcMain.handle('creative-session:append-feedback', (_event, projectId: string, content: string) =>
    creativeSessions.appendMessage(projectId, {
      role: 'user',
      type: 'user_feedback',
      content,
    }));
  ipcMain.handle('creative-session:get-run', (_event, runId: string) =>
    imageGeneration.getRun(runId));
  ipcMain.handle('creative-session:get-image-data-url', (_event, runId: string, imageId: string) =>
    imageGeneration.readImageDataUrl(runId, imageId));

  ipcMain.handle('creative-production:list-locked-assets', (_event, projectId: string) =>
    lockedAssets.list(projectId));
  ipcMain.handle('creative-production:list-anchor-candidates', (_event, projectId: string) =>
    anchorCandidates.list(projectId));
  ipcMain.handle('creative-production:list-style-profiles', (_event, projectId: string) =>
    styleProfiles.list(projectId));
  ipcMain.handle('creative-production:list-visual-canons', (_event, projectId: string) =>
    visualCanons.list(projectId));
  ipcMain.handle('creative-production:get-series', (_event, projectId: string, seriesId: string) =>
    generationSeries.get(projectId, seriesId));
  ipcMain.handle('creative-production:list-formal-assets', (
    _event,
    projectId: string,
    seriesId: string
  ) => formalAssets.list(projectId, seriesId));
}

if (gotTheLock) app.whenReady().then(async () => {
  const settings = await getSettings();
  const dataPath = path.resolve(settings.defaultDataPath);
  imageGeneration = createImageGenerationService({
    readSettings: getSettings,
    readCredentials: (profileId) => getProviderCredentials(profileId),
    loadContext: createFileContextLoader(dataPath, projects).loadContext,
    dataPath,
    emitRunUpdated: (progress) => mainWindow?.webContents.send('image-generation:run-updated', progress),
    openRunFolder: async (runId) => {
      const root = await imageGeneration.runRoot(runId);
      if (!root) throw new Error('运行记录不存在。');
      const result = await shell.openPath(root);
      if (result) throw new Error(result);
    },
  });
  creativeGeneration = createCreativeGenerationService(
    generationPrompts,
    imageGeneration,
    creativeSessions
  );
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
