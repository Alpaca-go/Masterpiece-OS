import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
import type {
  AnalysisProgress,
  CreateProjectInput,
  SaveApiProfileInput,
  SaveSettingsInput,
  SaveModelBenchmarkEvaluationInput,
  StartModelBenchmarkInput,
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
import { createDesktopAnalysisRuntimeAdapter } from './analysis-runtime-adapter.ts';
import { createReferenceAnchorService } from './reference-anchor-service';
import { createImageGenerationService, type ImageGenerationService } from './image-generation/service';
import { createVNextImageGenerationService } from './image-generation/vnext-service.ts';
import { createVNextDeliverableValidatorService } from './image-generation/vnext-deliverable-validator-service.ts';
import { createFileContextLoader } from './image-generation/context-loader';
import { createProjectContextService } from './project-context-service';
import { createDocumentContextService } from './document-context-service';
import { createContextIntegrationService } from './context-integration-service';
import { createCreativeSessionService } from './creative-session-service';
import { createCreativeReadingService } from './creative-reading-service';
import { createCreativeDirectionService } from './creative-direction-service';
import { createStyleProfileService } from './style-profile-service';
import { createLockedAssetsService } from './locked-assets-service';
import { createAnchorCandidateService } from './anchor-candidate-service';
import { createVisualCanonService } from './visual-canon-service';
import { createGenerationPromptService } from './generation-prompt-service';
import { createGenerationBlueprintService } from './generation-blueprint-service';
import { createVisualMemoryService } from './visual-memory-service';
import { createReferencePackService } from './reference-pack-service';
import { createCreativeGenerationService, type CreativeGenerationService } from './creative-generation-service';
import { createGenerationSeriesService } from './generation-series-service';
import { createFormalAssetsService } from './formal-assets-service';
import { createAnchorGenerationService, type AnchorGenerationService } from './anchor-generation-service';
import {
  createVisualExplorationService,
  type VisualExplorationService
} from './visual-exploration-service';
import { createCreativeProductionBootstrapService } from './creative-production-bootstrap-service';
import { createQuickStyleExtractionService } from './quick-style-extraction-service';
import {
  createGenerationSeriesExecutionService,
  type GenerationSeriesExecutionService
} from './generation-series-execution-service';
import { assertInside, sanitizeFilenamePart } from './analysis-contract';
import { startWebRpcServer, type WebRpcServer } from './web-rpc-server';
import {
  createAnalysisOperations,
  createContextIntegrationOperations,
  createCreativeProductionOperations,
  createCreativeSessionOperations,
  createDocumentOperations,
  createImageGenerationOperations,
  createProjectContextOperations,
  createProjectOperations,
  createReferenceOperations,
  createSharedRuntime,
  createVisualMemoryOperations,
} from '@masterpiece/runtime-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;
let webRpcServer: WebRpcServer | null = null;
const webMode = process.env.MASTERPIECE_WEB_MODE === '1';
type InvokeHandler = Parameters<typeof ipcMain.handle>[1];
const webRpcHandlers = new Map<string, InvokeHandler>();
const sharedRuntime = createSharedRuntime();

function registerHandler(channel: string, listener: InvokeHandler): void {
  webRpcHandlers.set(channel, listener);
  ipcMain.handle(channel, listener);
}

function registerRuntimeOperations(entries: Record<string, (...args: any[]) => unknown>): void {
  sharedRuntime.registerOperations(entries);
  for (const channel of Object.keys(entries)) {
    registerHandler(channel, (_event, ...args) => sharedRuntime.registry.execute(channel, args));
  }
}

async function invokeWebRpc(channel: string, args: unknown[]): Promise<unknown> {
  const handler = webRpcHandlers.get(channel);
  if (!handler) throw new Error(`WEB_RPC_CHANNEL_NOT_FOUND: ${channel}`);
  return handler({} as IpcMainInvokeEvent, ...args);
}

function emitClientEvent(channel: string, payload: unknown): void {
  mainWindow?.webContents.send(channel, payload);
  webRpcServer?.emit(channel, payload);
}

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
let anchorGeneration: AnchorGenerationService;
let visualExplorations: VisualExplorationService;
let generationSeriesExecution: GenerationSeriesExecutionService;
const pipeline = createPipelineService(
  projects,
  getProviderCredentials,
  getSettings,
  (progress: AnalysisProgress) => emitClientEvent('analysis:progress', progress),
  createDesktopAnalysisRuntimeAdapter(app),
);
const documentContext = createDocumentContextService(
  getProviderCredentials,
  getSettings,
  (progress) => emitClientEvent('document-context:progress', progress)
);
const projectContext = createProjectContextService({
  projects,
  showSaveDialog: (defaultPath: string) =>
    dialog.showSaveDialog(mainWindow!, {
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
});
const vnextDeliverableValidator = createVNextDeliverableValidatorService(
  projects,
  () => imageGeneration,
  getSettings,
  getProviderCredentials,
  projectContext,
);
const vnextImageGeneration = createVNextImageGenerationService(
  projects,
  projectContext,
  () => imageGeneration,
  () => vnextDeliverableValidator,
);
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
  emitProgress: (progress) => emitClientEvent('reference-anchor:progress', progress)
});
const creativeSessions = createCreativeSessionService(projects);
const creativeDirections = createCreativeDirectionService(
  projects,
  creativeSessions,
  getProviderCredentials
);
const generationBlueprints = createGenerationBlueprintService(
  projects,
  creativeSessions,
  creativeDirections
);
const styleProfiles = createStyleProfileService(projects, creativeSessions);
const lockedAssets = createLockedAssetsService(projects, creativeSessions);
const visualMemory = createVisualMemoryService(
  projects,
  creativeSessions,
  creativeDirections,
  lockedAssets
);
const anchorCandidates = createAnchorCandidateService(projects, creativeSessions, styleProfiles, lockedAssets);
const visualCanons = createVisualCanonService(projects, creativeSessions, styleProfiles, lockedAssets, anchorCandidates);
const referencePacks = createReferencePackService(projects, visualMemory, visualCanons);
const generationPrompts = createGenerationPromptService(
  projects,
  creativeSessions,
  styleProfiles,
  lockedAssets,
  visualCanons,
  creativeDirections,
  generationBlueprints,
  visualMemory,
  referencePacks
);
const creativeReading = createCreativeReadingService(
  projects,
  creativeSessions,
  lockedAssets,
  getProviderCredentials,
  creativeDirections
);
const generationSeries = createGenerationSeriesService(
  projects,
  creativeSessions,
  styleProfiles,
  lockedAssets,
  visualCanons
);
const formalAssets = createFormalAssetsService(projects);
const creativeProductionBootstrap = createCreativeProductionBootstrapService(
  projects,
  creativeSessions,
  lockedAssets,
  styleProfiles,
  creativeDirections,
  visualMemory,
  referencePacks
);
const quickStyleExtraction = createQuickStyleExtractionService(
  referenceAnchor,
  creativeSessions,
  lockedAssets,
  styleProfiles
);

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
      ...(webMode ? {} : { preload: path.join(__dirname, '../preload/index.cjs') }),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  if (!webMode) mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function registerIpc(): void {
  registerHandler('settings:get', () => getSettings());
  registerHandler('settings:save', (_event, input: SaveSettingsInput) => saveSettings(input));
  registerHandler('settings:save-profile', (_event, input: SaveApiProfileInput) => saveApiProfile(input));
  registerHandler('settings:delete-profile', (_event, profileId: string) => deleteApiProfile(profileId));
  registerHandler('settings:set-default-profile', (_event, profileId: string) => setDefaultApiProfile(profileId));
  registerHandler('settings:set-profile-enabled', (_event, profileId: string, enabled: boolean) => setApiProfileEnabled(profileId, enabled));
  registerHandler('settings:test-profile', (_event, input: SaveApiProfileInput) => testApiProfile(input));

  registerRuntimeOperations(createProjectOperations({ projects, pipeline }));
  registerHandler('projects:choose-files', async (_event, kind: 'assets' | 'logo' | 'brief' | 'reference') => {
    const filters = kind === 'logo' || kind === 'reference'
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
  registerHandler('projects:choose-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    });
    return result.canceled ? [] : result.filePaths;
  });
  registerRuntimeOperations(createAnalysisOperations({ pipeline }));

  registerHandler('report:read', async (_event, projectId: string) => {
    const project = await projects.get(projectId);
    if (!project.lastReportFilename) throw new Error('项目尚未生成报告');
    const paths = await projects.paths(projectId);
    return fs.readFile(assertInside(paths.outputs, path.join(paths.outputs, project.lastReportFilename)), 'utf8');
  });
  registerHandler('report:rename', async (_event, projectId: string, requestedFilename: string) => {
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
  registerHandler('report:export', async (_event, projectId: string) => {
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
  registerHandler('report:open-folder', async (_event, projectId: string) => {
    const paths = await projects.paths(projectId);
    const result = await shell.openPath(paths.outputs);
    if (result) throw new Error(result);
  });

  registerRuntimeOperations(createProjectContextOperations({ projectContext }));
  registerRuntimeOperations(createVisualMemoryOperations({ visualMemory, referencePacks }));

  // ── Phase 4：三大功能轻量整合（Context Integration）──
  registerRuntimeOperations(createContextIntegrationOperations({ contextIntegration }));

  registerHandler('document-context:choose-documents', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '策略文档', extensions: ['pdf', 'docx', 'md', 'markdown', 'txt'] }]
    });
    return result.canceled ? [] : result.filePaths;
  });
  registerRuntimeOperations(createDocumentOperations({
    documentContext,
    readTextFile: (source: string) => fs.readFile(source, 'utf8'),
  }));
  registerHandler('document-context:export', async (_event, runId: string) => {
    const source = await documentContext.briefPath(runId);
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: path.basename(source),
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });
    if (result.canceled || !result.filePath) return null;
    await fs.copyFile(source, result.filePath);
    return result.filePath;
  });
  registerHandler('document-context:open-folder', async (_event, runId: string) => {
    const root = await documentContext.runRoot(runId);
    const result = await shell.openPath(path.join(root, 'outputs'));
    if (result) throw new Error(result);
  });

  // ── Phase 3：参考视觉转换 Anchor 工作流 ──
  registerHandler('reference-anchor:choose-reference-assets', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '核心参考图', extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'zip'] }]
    });
    return result.canceled ? [] : result.filePaths;
  });
  registerRuntimeOperations(createReferenceOperations({ referenceAnchor }));
  registerHandler('reference-anchor:export', async (_event, runId: string) => {
    const source = await referenceAnchor.briefPath(runId);
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: path.basename(source),
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });
    if (result.canceled || !result.filePath) return null;
    await fs.copyFile(source, result.filePath);
    return result.filePath;
  });
  registerHandler('reference-anchor:open-folder', async (_event, runId: string) => {
    const root = await referenceAnchor.runRoot(runId);
    const result = await shell.openPath(path.join(root, 'outputs'));
    if (result) throw new Error(result);
  });

  // ---- 生图功能 V1（§16 Desktop IPC）----
  registerRuntimeOperations(createImageGenerationOperations({
    service: imageGeneration,
    vnextService: vnextImageGeneration,
  }));
  registerHandler('image-generation:open-folder', (_event, runId: string) => imageGeneration.openFolder(runId));
  registerRuntimeOperations(createCreativeSessionOperations({
    creativeSessions,
    creativeDirections,
    styleProfiles,
    visualCanons,
    imageGeneration,
    creativeReading,
    creativeGeneration,
  }));

  registerRuntimeOperations(createCreativeProductionOperations({
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
    readTextFile: (source: string) => fs.readFile(source, 'utf8'),
    joinPath: path.join,
  }));

}

if (gotTheLock) app.whenReady().then(async () => {
  const settings = await getSettings();
  const dataPath = path.resolve(settings.defaultDataPath);
  imageGeneration = createImageGenerationService({
    readSettings: getSettings,
    readCredentials: (profileId) => getProviderCredentials(profileId),
    loadContext: createFileContextLoader(dataPath, projects).loadContext,
    dataPath,
    emitRunUpdated: (progress) => emitClientEvent('image-generation:run-updated', progress),
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
  anchorGeneration = createAnchorGenerationService(
    styleProfiles,
    lockedAssets,
    anchorCandidates,
    imageGeneration,
    creativeDirections,
    generationBlueprints,
    visualMemory,
    referencePacks
  );
  visualExplorations = createVisualExplorationService(
    projects,
    creativeSessions,
    creativeDirections,
    styleProfiles,
    imageGeneration
  );
  generationSeriesExecution = createGenerationSeriesExecutionService(
    generationSeries,
    creativeGeneration,
    formalAssets
  );
  registerIpc();
  if (webMode) {
    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (!rendererUrl) throw new Error('WEB_RENDERER_URL_MISSING');
    const allowedOrigin = new URL(rendererUrl).origin;
    const port = Number(process.env.MASTERPIECE_WEB_RPC_PORT ?? 4317);
    webRpcServer = await startWebRpcServer({
      port,
      allowedOrigin,
      invoke: invokeWebRpc
    });
    createWindow();
    mainWindow?.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        void mainWindow?.webContents.executeJavaScript(`({
          shellReady: Boolean(document.querySelector('.app-shell')),
          renderError: Boolean(document.querySelector('[role="alert"]')),
          title: document.title,
          rootClass: document.querySelector('#root')?.firstElementChild?.className || '',
          rootText: (document.querySelector('#root')?.textContent || '').slice(0, 120)
        })`).then((state) => {
          console.info(JSON.stringify({ event: 'WEB_RENDERER_SMOKE', ...state }));
        });
      }, 4_000);
    });
    console.info(JSON.stringify({
      event: 'WEB_MODE_READY',
      rendererUrl,
      rpcUrl: webRpcServer.url
    }));
    if (process.env.MASTERPIECE_WEB_OPEN_BROWSER !== '0') {
      await shell.openExternal(rendererUrl);
    }
  } else {
    createWindow();
  }
  app.on('activate', () => {
    if (!webMode && BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  void webRpcServer?.close();
});
