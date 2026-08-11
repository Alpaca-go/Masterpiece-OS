import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
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
import { createDesktopAnalysisRuntimeAdapter } from './analysis-runtime-adapter.ts';
import { assertInside } from './analysis-contract';
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
  createReportOperations,
  createSettingsOperations,
  createSharedRuntime,
  createVisualMemoryOperations,
} from '@masterpiece/runtime-core';
import {
  createRuntimeServices,
  type RuntimeServices,
} from '@masterpiece/runtime-core/application/runtime-services.ts';

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

let runtimeServices: RuntimeServices;

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
  const {
    projects,
    reports,
    pipeline,
    documentContext,
    projectContext,
    contextIntegration,
    referenceAnchor,
    imageGeneration,
    vnextImageGeneration,
    creativeSessions,
    creativeDirections,
    styleProfiles,
    lockedAssets,
    visualMemory,
    anchorCandidates,
    visualCanons,
    referencePacks,
    creativeReading,
    creativeProductionBootstrap,
    quickStyleExtraction,
    creativeGeneration,
    anchorGeneration,
    visualExplorations,
    generationSeries,
    generationSeriesExecution,
    formalAssets,
  } = runtimeServices;
  registerRuntimeOperations(createSettingsOperations({
    get: getSettings,
    save: saveSettings,
    saveProfile: saveApiProfile,
    deleteProfile: deleteApiProfile,
    setDefaultProfile: setDefaultApiProfile,
    setProfileEnabled: setApiProfileEnabled,
    testProfile: testApiProfile,
  }));

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

  registerRuntimeOperations(createReportOperations({ reports }));
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
  runtimeServices = createRuntimeServices({
    dataPath,
    readSettings: getSettings,
    readCredentials: getProviderCredentials,
    analysisRuntime: createDesktopAnalysisRuntimeAdapter(app),
    showSaveDialog: (defaultPath: string) =>
      dialog.showSaveDialog(mainWindow!, {
        defaultPath,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      }),
    openPath: async (targetPath: string) => {
      const result = await shell.openPath(targetPath);
      if (result) throw new Error(result);
    },
    emitAnalysisProgress: (progress) => emitClientEvent('analysis:progress', progress),
    emitDocumentProgress: (progress) => emitClientEvent('document-context:progress', progress),
    emitReferenceProgress: (progress) => emitClientEvent('reference-anchor:progress', progress),
    emitImageRunUpdated: (progress) => emitClientEvent('image-generation:run-updated', progress),
  });
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
