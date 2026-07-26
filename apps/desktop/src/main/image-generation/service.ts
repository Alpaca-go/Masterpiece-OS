/**
 * 生图功能 V1：编排服务（§15 / §16）。
 *
 * 职责：
 * - compile：Prompt 编译 + 三层 Gate（不提交 Provider），持久化编译产物（§15.2 dry-run 核心）
 * - start：compile → 若 Gate 通过 → DashScope 异步提交 → 轮询 → 下载校验 → Gate C → 落盘 → 成功/失败
 * - retry（§13）：新建 runId + parentRunId，继承上下文快照，记录 Prompt 差异
 * - cancel / saveReview / getRun / listRuns / openFolder / onRunUpdated
 *
 * 不负责：Renderer 直接调用 Provider、持有 API Key 给 Renderer、自行判断 Gate（Gate 在运行时执行）。
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  GeneratedImage,
  ImageGenerationCompileResult,
  ImageGenerationProgress,
  ImageGenerationProvider,
  ImageGenerationReview,
  ImageGenerationRun,
  ImageGenerationRunStatus,
  ImageGenerationRunSummary,
  ImageGenerationRetryMode,
  ImageGenerationRetryRecord,
  ImageProviderCapabilities,
  ImageProviderRegion,
  PublicSettings,
} from '../../shared/types';
import { compileImageGenerationTask } from '../../../../../packages/image-generation-runtime/src/task-builder.js';
import { downloadAndVerifyImage } from '../../../../../packages/image-generation-runtime/src/download-verify.js';
import { evaluateArtifactGate, evaluateIdentityGate } from '../../../../../packages/image-generation-runtime/src/gates.js';
import {
  createDashScopeProvider,
  buildSubmitBody,
  DASHSCOPE_CAPABILITIES,
  REGION_ENDPOINTS,
} from '../../../../../packages/image-provider-dashscope/src/index.js';
import { redactProviderRequest, redactProviderResponse } from '../../../../../packages/image-generation-runtime/src/redact.js';
import { createRunStore, RunStoreError } from './run-store.ts';
import type { GenerationContext, FileContextLoader } from './context-loader.ts';
import { resolveProjectRoot, runRootUnder, imagesDir, thumbnailsDir, RUN_FILES } from './paths.ts';
import { EXECUTING_IMAGE_RUN_STATUSES } from '../../../../../packages/image-generation-contracts/src/index.ts';

export const DEFAULT_SIZE = '1024*1024';
export const POLL_INTERVAL_MS = 3000;
export const MAX_POLL_ATTEMPTS = 200;

export interface StartOptions {
  projectId: string;
  referenceAnchorRunId: string;
  outputType?: 'master_anchor_image';
  apiProfileId?: string;
  size?: string;
  region?: ImageProviderRegion;
  modelId?: string;
  /** 直接提供 API Key（Headless CLI / 测试）；否则从 profile 或环境变量解析。 */
  apiKey?: string;
  baseUrl?: string;
  /** 当前项目 Logo 资产路径（Headless CLI 指定）。 */
  logoAssetPath?: string;
  visualRunId?: string;
  documentRunId?: string;
  dryRun?: boolean;
}

export interface RetryOptions {
  runId: string;
  mode: ImageGenerationRetryMode;
  editedPrompt?: string;
  apiKey?: string;
  apiProfileId?: string;
  dryRun?: boolean;
}

export interface ImageGenerationServiceDeps {
  /** 保留以兼容 Desktop 装配；服务内部凭据解析走 readCredentials + 环境变量。 */
  readSettings?: () => Promise<PublicSettings> | PublicSettings;
  /** 解密并读取 Provider 凭据（与 pipeline-service 一致；PublicSettings 不含明文 Key）。 */
  readCredentials?: (profileId?: string) => Promise<{ apiKey: string; baseUrl?: string; model?: string }>;
  /** 加载上游上下文（由调用方用文件加载器或真实服务装配）。 */
  loadContext: (input: { referenceRunId: string; projectId: string; logoAssetPath?: string }) => Promise<GenerationContext>;
  /** 运行目录根（dataPath）。 */
  dataPath: string;
  emitRunUpdated?: (progress: ImageGenerationProgress) => void;
  openRunFolder?: (runId: string) => Promise<void> | void;
  /** 注入用于测试 / Headless。默认 globalThis.fetch + fs.readFile。 */
  fetchImpl?: typeof fetch;
  fileReader?: (p: string) => Promise<Buffer>;
  sleepMs?: number;
  now?: () => string;
}

const STATUS_MESSAGE: Record<ImageGenerationRunStatus, string> = {
  created: '已创建生图任务',
  validating: '正在执行三层 Gate 校验',
  blocked: '已被 Gate 阻断，未提交 Provider',
  ready: '编译完成，等待提交',
  submitting: '正在提交生图任务',
  queued: '任务已排队，等待 Provider 处理',
  running: 'Provider 正在生成图片',
  downloading: '正在下载并校验图片',
  succeeded: '生图成功，等待设计师确认',
  failed: '生图失败',
  cancelled: '已取消',
};

function blockingError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

export function createImageGenerationService(deps: ImageGenerationServiceDeps) {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const fileReader = deps.fileReader ?? ((p: string) => fs.readFile(p));
  const sleepMs = deps.sleepMs ?? POLL_INTERVAL_MS;
  const nowFn = deps.now ?? (() => new Date().toISOString());
  const listeners = new Set<(progress: ImageGenerationProgress) => void>();

  function storeFor(projectId: string) {
    return createRunStore(deps.dataPath, projectId);
  }

  function toProgress(run: ImageGenerationRun): ImageGenerationProgress {
    const startedAt = run.startedAt ?? run.createdAt;
    const end = run.completedAt ?? nowFn();
    const elapsedMs = Math.max(0, Date.parse(end) - Date.parse(startedAt));
    return {
      runId: run.runId,
      projectId: run.projectId,
      status: run.status,
      message: STATUS_MESSAGE[run.status] ?? run.status,
      startedAt,
      elapsedMs,
      providerId: run.providerId,
      modelId: run.modelId,
      providerTaskId: run.providerTaskId,
    };
  }

  function emit(run: ImageGenerationRun): void {
    const progress = toProgress(run);
    for (const listener of listeners) {
      try {
        listener(progress);
      } catch {
        /* 忽略单个监听器的异常 */
      }
    }
    deps.emitRunUpdated?.(progress);
  }

  /** 解析 API Key：显式 > 解密凭据（profile） > 环境变量。 */
  async function resolveApiKey(options: { apiKey?: string; apiProfileId?: string }): Promise<string | undefined> {
    if (options.apiKey) return options.apiKey;
    if (deps.readCredentials) {
      try {
        const credentials = await deps.readCredentials(options.apiProfileId || undefined);
        if (credentials?.apiKey) return credentials.apiKey;
      } catch {
        /* 无可用凭据时回退到环境变量 */
      }
    }
    return process.env.MASTERPIECE_DASHSCOPE_API_KEY || undefined;
  }

  function endpointFor(region: ImageProviderRegion, baseUrl?: string): string {
    if (baseUrl) return baseUrl.replace(/\/$/, '');
    return REGION_ENDPOINTS[region] ?? REGION_ENDPOINTS.beijing;
  }

  /** 编译（dry-run 核心），持久化编译产物，返回结果。不提交 Provider。 */
  async function compile(options: StartOptions): Promise<{
    run: ImageGenerationRun;
    result: ImageGenerationCompileResult;
    context: GenerationContext;
  }> {
    const now = nowFn();
    const ctx = await deps.loadContext({
      referenceRunId: options.referenceAnchorRunId,
      projectId: options.projectId,
      logoAssetPath: options.logoAssetPath,
    });
    const runId = crypto.randomUUID();
    const taskId = `igt-${runId.slice(0, 8)}`;
    const size = options.size ?? DEFAULT_SIZE;
    const region = options.region ?? 'beijing';
    const modelId = options.modelId ?? DASHSCOPE_CAPABILITIES.modelId;
    const capabilities = DASHSCOPE_CAPABILITIES;
    const apiKey = await resolveApiKey(options);
    const endpoint = endpointFor(region, options.baseUrl);
    // dry-run 不调用模型，允许无凭据完成离线 Gate 校验；真实运行仍要求真实 Key（否则 Gate B 阻断）。
    // 占位符仅用于 Gate 判定，不会写入 task.json（task-builder 不落盘 providerConfig）。
    const gateApiKey = apiKey ?? (options.dryRun ? 'DRY_RUN_PLACEHOLDER' : '');

    const compiled = compileImageGenerationTask({
      projectId: options.projectId,
      runId,
      taskId,
      referenceAnchorRunId: options.referenceAnchorRunId,
      anchorApproved: ctx.anchorApproved,
      resolvedContext: ctx.resolvedContext,
      capsule: ctx.capsule,
      anchorBriefMarkdown: ctx.anchorBriefMarkdown,
      references: ctx.references,
      capabilities,
      providerConfig: { apiKey: gateApiKey, baseUrl: endpoint },
      parameters: { size, region, thinkingMode: false },
      createdAt: now,
      visualRunId: options.visualRunId,
      documentRunId: options.documentRunId,
    });

    const store = storeFor(options.projectId);
    await store.writeTask(runId, compiled.task);
    await store.writeSnapshot(runId, compiled.snapshot);
    await store.writeCompiledPrompt(runId, compiled.compiledPromptMarkdown);
    await store.writePromptSourceMap(runId, compiled.promptSourceMap);
    await store.writeWarnings(runId, compiled.gate.warnings);

    const run: ImageGenerationRun = {
      schemaVersion: '1.0',
      runId,
      projectId: options.projectId,
      taskId,
      status: compiled.gate.blocked ? 'blocked' : 'ready',
      outputType: 'master_anchor_image',
      providerId: 'dashscope',
      modelId,
      region,
      createdAt: now,
      updatedAt: now,
      gate: compiled.gate,
      images: [],
      ...(compiled.gate.blocked
        ? { errorCode: compiled.gate.errors[0]?.code, errorMessage: compiled.gate.errors[0]?.message }
        : {}),
    };
    await store.saveRun(run);
    await store.appendEvent(runId, compiled.gate.blocked ? 'RUN_BLOCKED' : 'RUN_COMPILED', {
      errors: compiled.gate.errors.map((e: { code: string }) => e.code),
      warnings: compiled.gate.warnings.length,
    });
    emit(run);

    const result: ImageGenerationCompileResult = {
      runId,
      compiledPrompt: compiled.compiledPromptMarkdown,
      promptVersion: compiled.task.promptVersion,
      gate: compiled.gate,
      providerPayloadPreview: compiled.providerPayloadPreview as Record<string, unknown>,
      promptSourceMap: compiled.promptSourceMap as Record<string, unknown>,
    };
    return { run, result, context: ctx };
  }

  /** 完整运行：compile → 提交 → 轮询 → 下载 → Gate C → 落盘。 */
  async function start(options: StartOptions): Promise<ImageGenerationRun> {
    const { run } = await compile(options);
    if (run.gate.blocked || options.dryRun) return run;
    return executeLive(run, options);
  }

  /** 提交并执行实时轮询/下载（被 start 与 retry 共用）。 */
  async function executeLive(
    run: ImageGenerationRun,
    options: { apiKey?: string; apiProfileId?: string; baseUrl?: string },
  ): Promise<ImageGenerationRun> {
    const store = storeFor(run.projectId);
    const now = nowFn();
    const apiKey = await resolveApiKey(options);
    if (!apiKey) {
      const blocked: ImageGenerationRun = {
        ...run,
        status: 'blocked',
        errorCode: 'PROVIDER_CONFIG_MISSING',
        errorMessage: '缺少 DashScope API Key（请在设置中配置 Profile 或设置环境变量 MASTERPIECE_DASHSCOPE_API_KEY）。',
        updatedAt: now,
      };
      await store.saveRun(blocked);
      emit(blocked);
      return blocked;
    }

    const region = run.region;
    const modelId = run.modelId;
    const endpoint = endpointFor(region, options.baseUrl);
    const provider: ImageGenerationProvider = createDashScopeProvider({
      apiKey,
      region,
      modelId,
      baseUrl: endpoint,
      fetchImpl,
      fileReader,
    });

    const persistedTask = await readPersistedTask(run.runId, run.projectId);

    const metrics = {
      providerId: 'dashscope',
      modelId,
      region,
      startedAt: now,
      providerRequestCount: 0,
      providerPollCount: 0,
      retryCount: 0,
      outputImageCount: 0,
    };

    let activeRun: ImageGenerationRun = { ...run, status: 'submitting', startedAt: now, updatedAt: now };
    await store.saveRun(activeRun);
    await store.appendEvent(activeRun.runId, 'PROVIDER_SUBMITTED', {});
    emit(activeRun);

    let providerTaskId: string | undefined;
    try {
      const submitResult = await provider.submit(persistedTask, undefined);
      providerTaskId = submitResult.providerTaskId;
      metrics.providerRequestCount += 1;
      activeRun = { ...activeRun, providerTaskId, providerRequestId: submitResult.requestId, status: 'submitting' };
      await store.saveRun(activeRun);

      // 脱敏请求记录
      const body = await buildSubmitBody(persistedTask, { fileReader });
      await store.writeProviderRequest(
        activeRun.runId,
        redactProviderRequest({ endpoint, region, modelId, body }),
      );

      return await pollAndDownload(activeRun, provider, providerTaskId, persistedTask, endpoint, region, modelId, metrics, now);
    } catch (error) {
      const code = (error as { code?: string }).code ?? 'PROVIDER_ERROR';
      const message = (error as Error).message;
      // 网络/限流错误标记为失败（不自动无限重试）
      activeRun = {
        ...activeRun,
        status: 'failed',
        completedAt: nowFn(),
        updatedAt: nowFn(),
        errorCode: code,
        errorMessage: message,
      };
      await store.saveRun(activeRun).catch(() => undefined);
      await store.appendEvent(activeRun.runId, 'RUN_FAILED', { errorCode: code }).catch(() => undefined);
      emit(activeRun);
      throw error;
    }
  }

  /**
   * 轮询 Provider 直到终态，下载并校验，执行 Gate C，落盘。
   * 被 executeLive（提交后）与 resume（重启恢复）共用，避免重复提交。
   */
  async function pollAndDownload(
    initialRun: ImageGenerationRun,
    provider: ImageGenerationProvider,
    providerTaskId: string,
    persistedTask: unknown,
    endpoint: string,
    region: ImageProviderRegion,
    modelId: string,
    metrics: Record<string, unknown>,
    startedAt: string,
  ): Promise<ImageGenerationRun> {
    const store = storeFor(initialRun.projectId);
    let activeRun = initialRun;

    let finalStatus = await provider.getStatus(providerTaskId);
    (metrics as { providerPollCount: number }).providerPollCount =
      ((metrics as { providerPollCount?: number }).providerPollCount ?? 0) + 1;
    let attempts = 0;
    while (['pending', 'running'].includes(finalStatus.state) && attempts < MAX_POLL_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, sleepMs));
      attempts += 1;
      finalStatus = await provider.getStatus(providerTaskId);
      (metrics as { providerPollCount: number }).providerPollCount += 1;
      const mapped: ImageGenerationRunStatus =
        finalStatus.state === 'pending' ? 'queued' : finalStatus.state === 'running' ? 'running' : activeRun.status;
      activeRun = { ...activeRun, status: mapped, updatedAt: nowFn() };
      await store.saveRun(activeRun);
      await store.writeProviderResponse(
        activeRun.runId,
        redactProviderResponse({
          requestId: finalStatus.requestId,
          providerTaskId,
          state: finalStatus.state,
          model: modelId,
          parameters: (persistedTask as { parameters?: unknown })?.parameters,
          usage: finalStatus.usage,
          images: finalStatus.images,
        }),
      );
      emit(activeRun);
      if (finalStatus.state === 'succeeded' || finalStatus.state === 'failed' || finalStatus.state === 'cancelled') {
        break;
      }
    }

    if (finalStatus.state === 'cancelled') {
      activeRun = { ...activeRun, status: 'cancelled', completedAt: nowFn(), updatedAt: nowFn() };
      await store.saveRun(activeRun);
      await store.appendEvent(activeRun.runId, 'RUN_CANCELLED', {});
      emit(activeRun);
      return activeRun;
    }

    if (finalStatus.state === 'failed') {
      activeRun = {
        ...activeRun,
        status: 'failed',
        completedAt: nowFn(),
        updatedAt: nowFn(),
        errorCode: finalStatus.error?.code ?? 'PROVIDER_TASK_FAILED',
        errorMessage: finalStatus.error?.message ?? 'Provider 任务失败。',
      };
      await store.saveRun(activeRun);
      await store.appendEvent(activeRun.runId, 'RUN_FAILED', { errorCode: activeRun.errorCode });
      emit(activeRun);
      return activeRun;
    }

    // succeeded → 下载
    activeRun = { ...activeRun, status: 'downloading', updatedAt: nowFn() };
    await store.saveRun(activeRun);
    await store.appendEvent(activeRun.runId, 'IMAGE_DOWNLOAD_STARTED', {});
    emit(activeRun);

    const images = finalStatus.images ?? [];
    const first = images[0];
    if (!first || (!first.url && !first.b64)) {
      activeRun = {
        ...activeRun,
        status: 'failed',
        completedAt: nowFn(),
        updatedAt: nowFn(),
        errorCode: 'IMAGE_RESULT_URL_MISSING',
        errorMessage: 'Provider 结果缺少图片 URL 或数据。',
      };
      await store.saveRun(activeRun);
      emit(activeRun);
      return activeRun;
    }

    const root = runRootUnder(await resolveProjectRoot(deps.dataPath, activeRun.projectId), activeRun.runId);
    const targetPath = path.join(imagesDir(root), 'image-01.png');
    const thumbPath = path.join(thumbnailsDir(root), 'image-01.webp');
    const downloaded = await downloadAndVerifyImage({
      url: first.url,
      b64: first.b64,
      targetPath,
      thumbnailPath: thumbPath,
      fetchImpl,
      allowedMimeTypes: DASHSCOPE_CAPABILITIES.outputMimeTypes,
    });

    const gateC = evaluateArtifactGate({
      providerTaskId,
      providerResult: { images },
      downloaded,
      allowedMimeTypes: DASHSCOPE_CAPABILITIES.outputMimeTypes,
    });
    if (gateC.length > 0) {
      activeRun = {
        ...activeRun,
        status: 'failed',
        completedAt: nowFn(),
        updatedAt: nowFn(),
        errorCode: gateC[0]!.code,
        errorMessage: gateC[0]!.message,
      };
      await store.saveRun(activeRun);
      await store.appendEvent(activeRun.runId, 'RUN_FAILED', { errorCode: activeRun.errorCode });
      emit(activeRun);
      return activeRun;
    }

    const generated: GeneratedImage[] = [
      {
        imageId: 'image-01',
        relativePath: 'images/image-01.png',
        thumbnailRelativePath: 'thumbnails/image-01.webp',
        mimeType: downloaded.mimeType ?? 'image/png',
        sizeBytes: downloaded.sizeBytes ?? 0,
        width: downloaded.width,
        height: downloaded.height,
        sha256: downloaded.sha256 ?? '',
        downloadedAt: nowFn(),
      },
    ];

    const completedAt = nowFn();
    activeRun = {
      ...activeRun,
      status: 'succeeded',
      images: generated,
      completedAt,
      updatedAt: completedAt,
    };
    (metrics as { completedAt: string }).completedAt = completedAt;
    (metrics as { durationMs: number }).durationMs = Math.max(0, Date.parse(completedAt) - Date.parse(startedAt));
    (metrics as { outputImageCount: number }).outputImageCount = generated.length;
    (metrics as { outputSize?: string }).outputSize =
      downloaded.width && downloaded.height ? `${downloaded.width}x${downloaded.height}` : undefined;
    (metrics as { providerUsage?: unknown }).providerUsage = finalStatus.usage;
    await store.saveRun(activeRun);
    await store.writeMetrics(activeRun.runId, metrics as never);
    await store.appendEvent(activeRun.runId, 'RUN_SUCCEEDED', { imageCount: generated.length });
    emit(activeRun);
    return activeRun;
  }

  /**
   * §12.3 应用启动恢复：对已有 providerTaskId 的执行中运行重新轮询/下载；
   * 无 providerTaskId 且处于 submitting 的运行标记为失败（RUN_RECOVERY_FAILED）。
   */
  async function resume(runId: string): Promise<ImageGenerationRun | null> {
    const run = await getRun(runId);
    if (!run) return null;
    if (!EXECUTING_IMAGE_RUN_STATUSES.includes(run.status)) return run;
    const store = storeFor(run.projectId);
    if (!run.providerTaskId) {
      if (run.status === 'submitting') {
        const failed: ImageGenerationRun = {
          ...run,
          status: 'failed',
          errorCode: 'RUN_RECOVERY_FAILED',
          errorMessage: '重启恢复时发现 submitting 状态但缺少 providerTaskId，无法继续。',
          updatedAt: nowFn(),
        };
        await store.saveRun(failed);
        await store.appendEvent(runId, 'RUN_RECOVERY_FAILED', {});
        emit(failed);
      }
      return run;
    }
    const apiKey = await resolveApiKey({});
    if (!apiKey) {
      return run; // 无 Key 无法恢复，保留原状由用户手动重试
    }
    const endpoint = endpointFor(run.region);
    const provider = createDashScopeProvider({
      apiKey,
      region: run.region,
      modelId: run.modelId,
      baseUrl: endpoint,
      fetchImpl,
      fileReader,
    });
    const persistedTask = await readPersistedTask(run.runId, run.projectId).catch(() => null);
    if (!persistedTask) return run;
    const metrics = {
      providerId: 'dashscope',
      modelId: run.modelId,
      region: run.region,
      startedAt: run.startedAt ?? run.createdAt,
      providerRequestCount: 1,
      providerPollCount: 0,
      retryCount: 0,
      outputImageCount: 0,
    };
    return pollAndDownload(run, provider, run.providerTaskId, persistedTask, endpoint, run.region, run.modelId, metrics, run.startedAt ?? run.createdAt);
  }

  async function readPersistedTask(runId: string, projectId: string) {
    const root = runRootUnder(await resolveProjectRoot(deps.dataPath, projectId), runId);
    return JSON.parse(await fs.readFile(path.join(root, RUN_FILES.task), 'utf8'));
  }

  /** 扫描 projects 目录，读取每个 project.json 的真实 id（目录名是 name-id8，非 id）。 */
  async function listAllProjectIds(): Promise<string[]> {
    const base = path.join(deps.dataPath, 'projects');
    const projectDirs = await fs.readdir(base, { withFileTypes: true }).catch(() => []);
    const ids: string[] = [];
    for (const pd of projectDirs) {
      if (!pd.isDirectory()) continue;
      try {
        const record = JSON.parse(
          await fs.readFile(path.join(base, pd.name, 'project.json'), 'utf8'),
        ) as { id?: string };
        if (record.id) ids.push(record.id);
      } catch { /* 跳过损坏目录 */ }
    }
    return ids;
  }

  async function getRun(runId: string, projectId?: string): Promise<ImageGenerationRun | null> {
    if (projectId) return storeFor(projectId).readRun(runId);
    for (const id of await listAllProjectIds()) {
      const run = await storeFor(id).readRun(runId).catch(() => null);
      if (run) return run;
    }
    return null;
  }

  async function listRuns(projectId?: string): Promise<ImageGenerationRunSummary[]> {
    if (projectId) {
      const runs = await storeFor(projectId).listRuns();
      return runs.map(toSummary);
    }
    const all: ImageGenerationRunSummary[] = [];
    for (const id of await listAllProjectIds()) {
      const runs = await storeFor(id).listRuns().catch(() => []);
      all.push(...runs.map(toSummary));
    }
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function toSummary(run: ImageGenerationRun): ImageGenerationRunSummary {
    return {
      runId: run.runId,
      projectId: run.projectId,
      status: run.status,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      providerId: run.providerId,
      modelId: run.modelId,
      imageCount: run.images.length,
      hasBlockingErrors: run.gate.blocked,
      warningCount: run.gate.warnings.length,
      reviewDecision: run.review?.decision,
      parentRunId: run.parentRunId,
    };
  }

  async function cancel(runId: string): Promise<boolean> {
    // 扫描定位 run
    const run = await getRun(runId);
    if (!run) return false;
    const store = storeFor(run.projectId);
    if (EXECUTING_IMAGE_RUN_STATUSES.includes(run.status)) {
      const cancelled: ImageGenerationRun = {
        ...run,
        status: 'cancelled',
        completedAt: nowFn(),
        updatedAt: nowFn(),
        errorMessage: run.errorMessage ?? '用户已取消生图任务',
      };
      await store.saveRun(cancelled);
      await store.appendEvent(runId, 'RUN_CANCELLED', {});
      emit(cancelled);
      return true;
    }
    return false;
  }

  /** §13 手动重试：新建 runId + parentRunId，继承上下文，记录 Prompt 差异。 */
  async function retry(options: RetryOptions): Promise<ImageGenerationRun> {
    const parent = await getRun(options.runId);
    if (!parent) throw new Error('父运行不存在，无法重试。');
    const persistedTask = await readPersistedTask(parent.runId, parent.projectId).catch(() => null);
    if (!persistedTask) throw new Error('父运行缺少 task.json，无法重试。');

    const now = nowFn();
    const ctx = await deps.loadContext({
      referenceRunId: persistedTask.sourceReferenceAnchorRunId,
      projectId: parent.projectId,
    });

    const size = persistedTask.parameters?.size ?? DEFAULT_SIZE;
    const region: ImageProviderRegion = persistedTask.region ?? 'beijing';
    const modelId = persistedTask.modelId ?? DASHSCOPE_CAPABILITIES.modelId;
    const apiKey = await resolveApiKey({ apiKey: options.apiKey, apiProfileId: options.apiProfileId });
    const endpoint = endpointFor(region);
    const gateApiKey = apiKey ?? (options.dryRun ? 'DRY_RUN_PLACEHOLDER' : '');
    const runId = crypto.randomUUID();
    const taskId = `igt-${runId.slice(0, 8)}`;

    const compiled = compileImageGenerationTask({
      projectId: parent.projectId,
      runId,
      taskId,
      referenceAnchorRunId: persistedTask.sourceReferenceAnchorRunId,
      anchorApproved: ctx.anchorApproved,
      resolvedContext: ctx.resolvedContext,
      capsule: ctx.capsule,
      anchorBriefMarkdown: ctx.anchorBriefMarkdown,
      references: ctx.references,
      capabilities: DASHSCOPE_CAPABILITIES,
      providerConfig: { apiKey: gateApiKey, baseUrl: endpoint },
      parameters: { size, region, thinkingMode: false },
      createdAt: now,
    });

    // edited_prompt：覆盖编译 Prompt 并重新执行 Gate A（身份安全），避免引入参考身份泄漏
    if (options.mode === 'edited_prompt' && options.editedPrompt && options.editedPrompt.trim()) {
      compiled.compiledPromptMarkdown = options.editedPrompt;
      compiled.task.compiledPrompt = options.editedPrompt;
      const identityErrors = evaluateIdentityGate({
        resolvedContext: ctx.resolvedContext,
        anchorApproved: ctx.anchorApproved,
        capsule: ctx.capsule,
        compiledPromptMarkdown: options.editedPrompt,
      });
      compiled.gate.errors.push(...identityErrors);
      compiled.gate.blocked = compiled.gate.blocked || identityErrors.length > 0;
    }

    const store = storeFor(parent.projectId);
    await store.writeTask(runId, compiled.task);
    await store.writeSnapshot(runId, compiled.snapshot);
    await store.writeCompiledPrompt(runId, compiled.compiledPromptMarkdown);
    await store.writePromptSourceMap(runId, compiled.promptSourceMap);
    await store.writeWarnings(runId, compiled.gate.warnings);

    const retryRecord: ImageGenerationRetryRecord = {
      retryRunId: runId,
      parentRunId: parent.runId,
      mode: options.mode,
      createdAt: now,
      ...(options.mode === 'edited_prompt' && options.editedPrompt
        ? { promptDiffSummary: `edited_prompt：Prompt 由设计师手动改写（${options.editedPrompt.length} 字符）。` }
        : {}),
    };

    const run: ImageGenerationRun = {
      schemaVersion: '1.0',
      runId: runId,
      projectId: parent.projectId,
      taskId: compiled.task.taskId,
      status: compiled.gate.blocked ? 'blocked' : 'ready',
      outputType: 'master_anchor_image',
      providerId: 'dashscope',
      modelId,
      region,
      parentRunId: parent.runId,
      retryMode: options.mode,
      createdAt: now,
      updatedAt: now,
      gate: compiled.gate,
      images: [],
      ...(compiled.gate.blocked
        ? { errorCode: compiled.gate.errors[0]?.code, errorMessage: compiled.gate.errors[0]?.message }
        : {}),
    };
    await store.saveRun(run);

    // 父运行追加 retry-history
    const history = await store.readRetryHistory(parent.runId);
    history.push(retryRecord);
    await store.writeRetryHistory(parent.runId, history);
    await store.appendEvent(parent.runId, 'RETRY_CREATED', { mode: options.mode, retry_run_id: run.runId });
    emit(run);

    if (options.dryRun || run.gate.blocked) {
      return run;
    }

    // 完整重试：复用 executeLive（不重新编译，避免产生第三个 run）
    return executeLive(run, {
      apiKey: options.apiKey,
      apiProfileId: options.apiProfileId,
      baseUrl: endpoint,
    });
  }

  async function saveReview(review: ImageGenerationReview): Promise<ImageGenerationRun> {
    const run = await getRun(review.runId);
    if (!run) throw new Error('运行记录不存在，无法保存评价。');
    const store = storeFor(run.projectId);
    await store.writeReview(review.runId, review);
    const updated: ImageGenerationRun = { ...run, review, updatedAt: nowFn() };
    await store.saveRun(updated);
    await store.appendEvent(review.runId, 'REVIEW_SAVED', { decision: review.decision });
    emit(updated);
    return updated;
  }

  async function openFolder(runId: string): Promise<void> {
    const run = await getRun(runId);
    if (!run) throw new Error('运行记录不存在。');
    if (deps.openRunFolder) {
      await deps.openRunFolder(runId);
      return;
    }
    const root = runRootUnder(await resolveProjectRoot(deps.dataPath, run.projectId), runId);
    await fs.mkdir(root, { recursive: true });
    if (process.platform === 'win32') {
      // best-effort：仅确保目录存在；Headless 下不弹窗
    }
  }

  function onRunUpdated(callback: (progress: ImageGenerationProgress) => void): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  /** §12.3 启动恢复：扫描全部执行中运行并 resume。 */
  async function recoverAll(): Promise<ImageGenerationRun[]> {
    const summaries = await listRuns();
    const executing = summaries.filter((r) => EXECUTING_IMAGE_RUN_STATUSES.includes(r.status));
    const results: ImageGenerationRun[] = [];
    for (const r of executing) {
      const recovered = await resume(r.runId);
      if (recovered) results.push(recovered);
    }
    return results;
  }

  return {
    compile,
    start,
    retry,
    cancel,
    getRun,
    listRuns,
    saveReview,
    openFolder,
    onRunUpdated,
    resume,
    recoverAll,
    toProgress,
  };
}

export type ImageGenerationService = ReturnType<typeof createImageGenerationService>;
export { RunStoreError };
