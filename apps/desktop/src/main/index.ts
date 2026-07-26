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
  StartReferenceAnchorInput,
  StartReferenceTranslationInput,
  StartReferenceTranslationUserInput,
  StartVisualTranslationInput,
  VisualTranslationProgress
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
import { createVisualTranslationService } from './visual-translation-service';
import { createReferenceTranslationService } from './reference-translation-service';
import { createReferenceAnchorService } from './reference-anchor-service';
import { createProjectContextService } from './project-context-service';
import { createDocumentContextService } from './document-context-service';
import { createContextIntegrationService } from './context-integration-service';
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
const pipeline = createPipelineService(
  projects,
  getProviderCredentials,
  getSettings,
  (progress: AnalysisProgress) => mainWindow?.webContents.send('analysis:progress', progress)
);
const visualTranslation = createVisualTranslationService(
  getProviderCredentials,
  getSettings,
  (progress: VisualTranslationProgress) => mainWindow?.webContents.send('visual-translation:progress', progress)
);
const referenceTranslation = createReferenceTranslationService(getSettings, {
  projects,
  pipeline,
  emitProgress: (progress) => mainWindow?.webContents.send('reference-translation:progress', progress)
});
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

  ipcMain.handle('visual-translation:choose-documents', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '策略文档', extensions: ['pdf', 'docx', 'md', 'markdown', 'txt'] }]
    });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle('visual-translation:inspect-documents', (_event, paths: string[]) => visualTranslation.inspectDocuments(paths));
  ipcMain.handle('visual-translation:list-runs', () => visualTranslation.listRuns());
  ipcMain.handle('visual-translation:get-run', (_event, runId: string) => visualTranslation.getRun(runId));
  ipcMain.handle('visual-translation:start', (_event, input: StartVisualTranslationInput) => visualTranslation.start(input));
  ipcMain.handle('visual-translation:resume', (_event, runId: string, apiProfileId?: string) => visualTranslation.resume(runId, apiProfileId));
  ipcMain.handle('visual-translation:cancel', (_event, runId: string) => visualTranslation.cancel(runId));
  ipcMain.handle('visual-translation:remove', async (_event, runId: string) => {
    const record = await visualTranslation.getRun(runId).catch(() => null);
    if (record?.status === 'running') throw new Error('正在分析的任务不能删除，请先取消分析');
    await visualTranslation.remove(runId);
  });
  ipcMain.handle('visual-translation:read-report', async (_event, runId: string) => fs.readFile(await visualTranslation.reportPath(runId), 'utf8'));
  ipcMain.handle('visual-translation:export-report', async (_event, runId: string) => {
    const source = await visualTranslation.reportPath(runId);
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: path.basename(source),
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });
    if (result.canceled || !result.filePath) return null;
    await fs.copyFile(source, result.filePath);
    return result.filePath;
  });
  ipcMain.handle('visual-translation:open-folder', async (_event, runId: string) => {
    const root = await visualTranslation.runRoot(runId);
    const result = await shell.openPath(path.join(root, 'outputs'));
    if (result) throw new Error(result);
  });

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

  ipcMain.handle('reference-translation:choose-input', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [{ name: '结构化 JSON', extensions: ['json'] }]
    });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle('reference-translation:choose-reference-assets', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '参考视觉方案', extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'zip'] }]
    });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle('reference-translation:choose-project-sources', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '项目文档与视觉资产', extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'zip'] }]
    });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle('reference-translation:inspect-assets', (_event, paths: string[]) =>
    referenceTranslation.inspectAssets(paths));
  ipcMain.handle('reference-translation:run-user-input', (
    _event,
    input: StartReferenceTranslationUserInput
  ) => referenceTranslation.runUserInput(input));
  ipcMain.handle('reference-translation:run', (_event, input: StartReferenceTranslationInput) => referenceTranslation.run(input));
  ipcMain.handle('reference-translation:list-runs', () => referenceTranslation.listRuns());
  ipcMain.handle('reference-translation:get-active', () => referenceTranslation.getActive());
  ipcMain.handle('reference-translation:get-profile', (_event, runId: string) => referenceTranslation.getProfile(runId));
  ipcMain.handle('reference-translation:get-direction', (_event, runId: string) => referenceTranslation.getDirection(runId));
  ipcMain.handle('reference-translation:get-reconstruction', (_event, runId: string) => referenceTranslation.getReconstruction(runId));
  ipcMain.handle('reference-translation:read-report', (_event, runId: string) => referenceTranslation.readReport(runId));
  ipcMain.handle('reference-translation:resume', (
    _event,
    runId: string,
    apiProfileId?: string
  ) => referenceTranslation.resume(runId, apiProfileId));
  ipcMain.handle('reference-translation:retry-report', (_event, runId: string) => referenceTranslation.retryReport(runId));
  ipcMain.handle('reference-translation:cancel', (_event, runId: string) => referenceTranslation.cancel(runId));
  ipcMain.handle('reference-translation:remove', (_event, runId: string) => referenceTranslation.remove(runId));
  ipcMain.handle('reference-translation:open-folder', async (_event, runId: string) => {
    const outputPath = await referenceTranslation.ensureReportDelivery(runId);
    const result = await shell.openPath(outputPath);
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
}

function commandLineValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

if (gotTheLock) app.whenReady().then(async () => {
  const smokeRunId = commandLineValue('visual-translation-smoke-run');
  const smokeDocumentPath = commandLineValue('visual-translation-smoke-document');
  const smokeProfileId = commandLineValue('visual-translation-smoke-profile');
  const smokeStatusPath = commandLineValue('visual-translation-smoke-status');
  if ((smokeRunId || smokeDocumentPath) && smokeStatusPath) {
    const statusPath = path.resolve(smokeStatusPath);
    try {
      await fs.writeFile(statusPath, `${JSON.stringify({ status: 'running', runId: smokeRunId || null, startedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
      let result;
      if (smokeDocumentPath) {
        if (!smokeProfileId) throw new Error('Fresh Visual Translation smoke test requires --visual-translation-smoke-profile');
        result = await visualTranslation.start({ documentPaths: [path.resolve(smokeDocumentPath)], apiProfileId: smokeProfileId });
      } else {
        result = await visualTranslation.resume(smokeRunId!, smokeProfileId);
      }
      await fs.writeFile(statusPath, `${JSON.stringify({ status: 'passed', run: result.run, reportPath: await visualTranslation.reportPath(result.run.id) }, null, 2)}\n`, 'utf8');
      app.exit(0);
    } catch (error) {
      await fs.writeFile(statusPath, `${JSON.stringify({ status: 'failed', runId: smokeRunId || null, error: { name: (error as Error).name, message: (error as Error).message } }, null, 2)}\n`, 'utf8').catch(() => {});
      app.exit(1);
    }
    return;
  }
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
