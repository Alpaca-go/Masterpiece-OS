import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMain, type IpcMainInvokeEvent } from 'electron';
import type {
  AnalysisProgress,
  ConflictResolutionInput,
  CreateProjectInput,
  SaveApiProfileInput,
  SaveSettingsInput,
  SaveModelBenchmarkEvaluationInput,
  StartModelBenchmarkInput,
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
import { createDesktopAnalysisRuntimeAdapter } from './analysis-runtime-adapter.ts';
import { createReferenceAnchorService } from './reference-anchor-service';
import { createImageGenerationService, type ImageGenerationService } from './image-generation/service';
import { registerImageGenerationIpc } from './image-generation/ipc';
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
import { createAnalysisOperations, createProjectOperations, createSharedRuntime } from '@masterpiece/runtime-core';

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

  registerHandler('project-context:get', (_event, projectId: string) => projectContext.get(projectId));
  registerHandler('project-context:rebuild', (_event, projectId: string) => projectContext.rebuild(projectId));
  registerHandler('project-context:export', (_event, projectId: string) => projectContext.export(projectId));
  registerHandler('project-context:get-vnext', (_event, projectId: string) => projectContext.getVNext(projectId));
  registerHandler('project-context:rebuild-vnext', (_event, projectId: string) => projectContext.rebuildVNext(projectId));
  registerHandler('project-context:generation-readiness', (_event, projectId: string) => projectContext.getGenerationContextReadiness(projectId));
  registerHandler('visual-memory:get', (_event, projectId: string) => visualMemory.get(projectId));
  registerHandler('visual-memory:compile', (_event, projectId: string) => visualMemory.compile(projectId));
  registerHandler('visual-memory:get-reference-pack', (_event, projectId: string) => referencePacks.get(projectId));
  registerHandler('visual-memory:build-reference-pack', (_event, projectId: string) => referencePacks.build(projectId));

  // ── Phase 4：三大功能轻量整合（Context Integration）──
  registerHandler('context-integration:link', (_event, projectId: string, runId: string) => contextIntegration.linkDocumentContext(projectId, runId));
  registerHandler('context-integration:unlink', (_event, projectId: string) => contextIntegration.unlinkDocumentContext(projectId));
  registerHandler('context-integration:get-link', (_event, projectId: string) => contextIntegration.getLink(projectId));
  registerHandler('context-integration:get-visual-status', (_event, projectId: string) => contextIntegration.getVisualStatus(projectId));
  registerHandler('context-integration:get-resolved', (_event, projectId: string) => contextIntegration.getResolved(projectId));
  registerHandler('context-integration:resolve', (_event, projectId: string, userOverrides?: Record<string, unknown>) => contextIntegration.resolve(projectId, userOverrides));
  registerHandler('context-integration:list-conflicts', (_event, projectId: string) => contextIntegration.listConflicts(projectId));
  registerHandler('context-integration:apply-conflict-resolution', (_event, projectId: string, resolutions: ConflictResolutionInput[]) => contextIntegration.applyConflictResolution(projectId, resolutions));
  registerHandler('context-integration:migrate', (_event, projectId: string) => contextIntegration.migrate(projectId));
  registerHandler('context-integration:export', async (_event, projectId: string) => {
    const source = await contextIntegration.export(projectId);
    return source;
  });
  registerHandler('context-integration:is-doc-referenced', (_event, runId: string) => contextIntegration.isDocumentContextReferenced(runId));

  registerHandler('document-context:choose-documents', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '策略文档', extensions: ['pdf', 'docx', 'md', 'markdown', 'txt'] }]
    });
    return result.canceled ? [] : result.filePaths;
  });
  registerHandler('document-context:inspect-documents', (_event, paths: string[]) => documentContext.inspectDocuments(paths));
  registerHandler('document-context:list-runs', () => documentContext.listRuns());
  registerHandler('document-context:get-run', (_event, runId: string) => documentContext.getRun(runId));
  registerHandler('document-context:start', (_event, paths: string[], profileId: string) => documentContext.start(paths, profileId));
  registerHandler('document-context:get-extracted', (_event, runId: string) => documentContext.getExtracted(runId));
  registerHandler('document-context:confirm', (_event, runId: string, context) => documentContext.confirm(runId, context));
  registerHandler('document-context:compile', (_event, runId: string) => documentContext.compile(runId));
  registerHandler('document-context:resume', (_event, runId: string, apiProfileId?: string) => documentContext.resume(runId, apiProfileId));
  registerHandler('document-context:cancel', (_event, runId: string) => documentContext.cancel(runId));
  registerHandler('document-context:remove', async (_event, runId: string) => {
    const record = await documentContext.getRun(runId).catch(() => null);
    if (record && ['parsing', 'extracting', 'repairing'].includes(record.status)) throw new Error('正在分析的任务不能删除，请先取消分析');
    await documentContext.remove(runId);
  });
  registerHandler('document-context:read-brief', async (_event, runId: string) => fs.readFile(await documentContext.briefPath(runId), 'utf8'));
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
  registerHandler('document-context:adapt-legacy-run', (_event, runId: string) => documentContext.adaptLegacyRun(runId));
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
  registerHandler('reference-anchor:inspect-assets', (_event, paths: string[]) => referenceAnchor.inspectAssets(paths));
  registerHandler('reference-anchor:list-runs', () => referenceAnchor.listRuns());
  registerHandler('reference-anchor:get-run', (_event, runId: string) => referenceAnchor.getRun(runId));
  registerHandler('reference-anchor:start', (_event, input: StartReferenceAnchorInput) => referenceAnchor.start(input));
  registerHandler('reference-anchor:get-capsule', (_event, runId: string) => referenceAnchor.getCapsule(runId));
  registerHandler('reference-anchor:get-capsule-markdown', (_event, runId: string) => referenceAnchor.getCapsuleMarkdown(runId));
  registerHandler('reference-anchor:get-brief', (_event, runId: string) => referenceAnchor.getBrief(runId));
  registerHandler('reference-anchor:update-preference', (
    _event,
    runId: string,
    preference: string,
    avoidance: string[]
  ) => referenceAnchor.updatePreference(runId, preference, avoidance));
  registerHandler('reference-anchor:retry-brief', (_event, runId: string, editedBrief?: string) => referenceAnchor.retryBrief(runId, editedBrief));
  registerHandler('reference-anchor:set-decision', (
    _event,
    runId: string,
    decision: AnchorDecision,
    note?: string
  ) => referenceAnchor.setDecision(runId, decision, note));
  registerHandler('reference-anchor:adapt-legacy-run', (_event, runId: string) => referenceAnchor.adaptLegacyRun(runId));
  registerHandler('reference-anchor:cancel', (_event, runId: string) => referenceAnchor.cancel(runId));
  registerHandler('reference-anchor:remove', async (_event, runId: string) => {
    const record = await referenceAnchor.getRun(runId).catch(() => null);
    if (record && ['preparing', 'analyzing_reference', 'compiling_capsule', 'compiling_brief'].includes(record.status)) {
      throw new Error('正在分析的 Anchor 任务不能删除，请先取消分析');
    }
    await referenceAnchor.remove(runId);
  });
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
  registerImageGenerationIpc(imageGeneration, {
    handle: registerHandler
  } as unknown as IpcMain, vnextImageGeneration);
  registerHandler('creative-session:get', (_event, projectId: string) =>
    creativeSessions.get(projectId));
  registerHandler('creative-session:create', (_event, projectId: string) =>
    creativeSessions.create(projectId));
  registerHandler('creative-session:get-workspace', async (_event, projectId: string) => {
    const [session, creativeDirection, styleProfile, visualCanon, runs] = await Promise.all([
      creativeSessions.create(projectId),
      creativeDirections.getActive(projectId),
      styleProfiles.getActive(projectId),
      visualCanons.getActive(projectId),
      imageGeneration.listRuns(projectId),
    ]);
    return { session, creativeDirection, styleProfile, visualCanon, runs };
  });
  registerHandler('creative-session:read', (_event, projectId: string, apiProfileId?: string) =>
    creativeReading.run(projectId, apiProfileId));
  registerHandler('creative-session:generate', (
    _event,
    projectId: string,
    input: {
      userRequest: string;
      apiProfileId?: string;
      size?: string;
      dryRun?: boolean;
      outputType?: 'interior_scene' | 'storefront_scene' | 'packaging_render'
        | 'brand_poster' | 'vi_application' | 'illustration';
    }
  ) => creativeGeneration.generate(projectId, input));
  registerHandler('creative-session:retry-same', (
    _event,
    projectId: string,
    runId: string,
    apiProfileId?: string
  ) => creativeGeneration.retrySameInstruction(projectId, runId, apiProfileId));
  registerHandler('creative-session:regenerate-instruction', (
    _event,
    projectId: string,
    runId: string,
    apiProfileId?: string
  ) => creativeGeneration.regenerateInstruction(projectId, runId, apiProfileId));
  registerHandler('creative-session:start-benchmark', (
    _event,
    projectId: string,
    input: StartModelBenchmarkInput
  ) => creativeGeneration.startBenchmark(projectId, input));
  registerHandler('creative-session:list-benchmarks', (
    _event,
    projectId: string
  ) => creativeGeneration.listBenchmarks(projectId));
  registerHandler('creative-session:save-benchmark-evaluation', (
    _event,
    projectId: string,
    benchmarkId: string,
    input: SaveModelBenchmarkEvaluationInput
  ) => creativeGeneration.saveBenchmarkEvaluation(projectId, benchmarkId, input));
  registerHandler('creative-session:evaluate', (
    _event,
    projectId: string,
    runId: string,
    input: {
      brandAlignment: { score: number; notes: string };
      visualConsistency: { score: number; notes: string };
      assetUsability: { score: number; notes: string };
      deviationDetection: { severity: 'none' | 'minor' | 'major'; findings: string[] };
    }
  ) => creativeGeneration.evaluate(projectId, runId, input));
  registerHandler('creative-session:regenerate-from-evaluation', (
    _event,
    projectId: string,
    runId: string,
    apiProfileId?: string
  ) => creativeGeneration.regenerateFromEvaluation(projectId, runId, apiProfileId));
  registerHandler('creative-session:append-feedback', (_event, projectId: string, content: string) =>
    creativeSessions.appendMessage(projectId, {
      role: 'user',
      type: 'user_feedback',
      content,
    }));
  registerHandler('creative-session:get-run', (_event, runId: string) =>
    imageGeneration.getRun(runId));
  registerHandler('creative-session:get-image-data-url', (_event, runId: string, imageId: string) =>
    imageGeneration.readImageDataUrl(runId, imageId));

  registerHandler('creative-production:list-locked-assets', (_event, projectId: string) =>
    lockedAssets.list(projectId));
  registerHandler('creative-production:prepare', (_event, projectId: string) =>
    creativeProductionBootstrap.prepare(projectId));
  registerHandler('creative-production:regenerate-context', (
    _event,
    projectId: string,
    input: { directionBrief?: string }
  ) => creativeProductionBootstrap.regenerate(projectId, input));
  registerHandler('creative-production:quick-extract-style', (
    _event,
    projectId: string,
    referenceAnchorRunId: string
  ) => quickStyleExtraction.extract(projectId, referenceAnchorRunId));
  registerHandler('creative-production:confirm-style-profile', (
    _event,
    projectId: string,
    profileId: string
  ) => styleProfiles.confirm(projectId, profileId));
  registerHandler('creative-production:list-anchor-candidates', (_event, projectId: string) =>
    anchorGeneration.list(projectId));
  registerHandler('creative-production:list-visual-explorations', (_event, projectId: string) =>
    visualExplorations.list(projectId));
  registerHandler('creative-production:generate-visual-exploration', (
    _event,
    projectId: string,
    input: {
      conceptCount?: number;
      apiProfileId?: string;
      dryRun?: boolean;
    }
  ) => visualExplorations.generate(projectId, input));
  registerHandler('creative-production:select-visual-concept', (
    _event,
    projectId: string,
    explorationId: string,
    conceptId: string,
    rationale: string
  ) => visualExplorations.select(projectId, explorationId, conceptId, rationale));
  registerHandler('creative-production:generate-anchor', (
    _event,
    projectId: string,
    input: {
      purpose?: string;
      aspectRatio?: '16:9' | '4:5' | '3:4' | '1:1';
      apiProfileId?: string;
      dryRun?: boolean;
    }
  ) => anchorGeneration.generate(projectId, input));
  registerHandler('creative-production:generate-anchor-set', (
    _event,
    projectId: string,
    input: {
      purpose?: string;
      aspectRatio?: '16:9' | '4:5' | '3:4' | '1:1';
      candidateCount?: number;
      apiProfileId?: string;
      dryRun?: boolean;
    }
  ) => anchorGeneration.generateSet(projectId, input));
  registerHandler('creative-production:retry-anchor', (
    _event,
    projectId: string,
    candidateId: string,
    input: { apiProfileId?: string; dryRun?: boolean }
  ) => anchorGeneration.retry(projectId, candidateId, input));
  registerHandler('creative-production:review-anchor', (
    _event,
    projectId: string,
    candidateId: string,
    input: Parameters<typeof anchorCandidates.review>[2]
  ) => anchorCandidates.review(projectId, candidateId, input));
  registerHandler('creative-production:list-style-profiles', (_event, projectId: string) =>
    styleProfiles.list(projectId));
  registerHandler('creative-production:list-visual-canons', (_event, projectId: string) =>
    visualCanons.list(projectId));
  registerHandler('creative-production:build-visual-canon', (
    _event,
    projectId: string,
    input: Parameters<typeof visualCanons.build>[1]
  ) => visualCanons.build(projectId, input));
  registerHandler('creative-production:build-visual-canon-from-exploration', async (
    _event,
    projectId: string,
    explorationId: string,
    input: {
      sharedRules?: string[];
      variationRules?: string[];
    }
  ) => {
    const exploration = await visualExplorations.get(projectId, explorationId);
    if (!exploration) {
      throw Object.assign(new Error('Visual Exploration 不存在。'), {
        code: 'VISUAL_EXPLORATION_MISSING'
      });
    }
    return visualCanons.buildFromExploration(projectId, { exploration, ...input });
  });
  registerHandler('creative-production:confirm-visual-canon', (
    _event,
    projectId: string,
    canonId: string
  ) => visualCanons.confirm(projectId, canonId));
  registerHandler('creative-production:get-series', (_event, projectId: string, seriesId: string) =>
    generationSeries.get(projectId, seriesId));
  registerHandler('creative-production:list-series', (_event, projectId: string) =>
    generationSeries.list(projectId));
  registerHandler('creative-production:create-series', (
    _event,
    projectId: string,
    input: { name: string; tasks: unknown[] }
  ) => generationSeries.create(projectId, input));
  registerHandler('creative-production:create-revision', (
    _event,
    projectId: string,
    seriesId: string,
    input: unknown
  ) => generationSeries.createRevision(projectId, seriesId, input));
  registerHandler('creative-production:pause-series', (_event, projectId: string, seriesId: string) =>
    generationSeries.pause(projectId, seriesId));
  registerHandler('creative-production:resume-series', (_event, projectId: string, seriesId: string) =>
    generationSeries.resume(projectId, seriesId));
  registerHandler('creative-production:cancel-series', (_event, projectId: string, seriesId: string) =>
    generationSeries.cancel(projectId, seriesId));
  registerHandler('creative-production:run-series-task', (
    _event,
    projectId: string,
    seriesId: string,
    taskId: string,
    apiProfileId?: string
  ) => generationSeriesExecution.runTask(projectId, seriesId, taskId, apiProfileId));
  registerHandler('creative-production:run-series', (
    _event,
    projectId: string,
    seriesId: string,
    apiProfileId?: string
  ) => generationSeriesExecution.runAll(projectId, seriesId, apiProfileId));
  registerHandler('creative-production:list-formal-assets', (
    _event,
    projectId: string,
    seriesId: string
  ) => formalAssets.list(projectId, seriesId));
  registerHandler('creative-production:review-formal-asset', (
    _event,
    projectId: string,
    seriesId: string,
    outputId: string,
    input: unknown
  ) => formalAssets.review(projectId, seriesId, outputId, input));
  registerHandler('creative-production:get-run-prompt', async (_event, runId: string) => {
    const root = await imageGeneration.runRoot(runId);
    if (!root) return null;
    return fs.readFile(path.join(root, 'compiled-prompt.md'), 'utf8').catch(() => null);
  });
  registerHandler('creative-production:get-run-metadata', async (
    _event,
    projectId: string,
    runId: string
  ) => {
    const snapshot = await imageGeneration.readPromptSnapshot(runId, projectId);
    if (!snapshot) return null;
    return {
      outputType: snapshot.outputType,
      promptVersion: snapshot.promptVersion || snapshot.compilerVersion,
      templateId: snapshot.deliverableTemplateId,
      templateVersion: snapshot.deliverableTemplateVersion
    };
  });
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
