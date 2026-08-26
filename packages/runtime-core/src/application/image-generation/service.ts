/**
 * 生图功能 V1：编排服务（§15 / §16）。
 *
 * 职责：
 * - compile：Prompt 编译 + 三层 Gate（不提交 Provider），持久化编译产物（§15.2 dry-run 核心）
 * - start：compile → 若 Gate 通过 → DashScope 同步优先提交（必要时异步轮询）→ 下载校验 → Gate C → 落盘
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
  ImageGenerationOutputType,
  ImageGenerationSourceBundle,
  ImageGenerationSourceBundleV3,
  GenerationSourceContext,
  ImageProviderCapabilities,
  ImageProviderRegion,
  ProviderTaskStatus,
  PublicSettings,
  ModelBenchmark,
  SaveModelBenchmarkEvaluationInput,
} from '../../shared/types.ts';
import type { GenerationPromptSnapshot } from '@masterpiece/project-contracts/index.ts';
import { validateGenerationPromptSnapshot } from '@masterpiece/creative-production-runtime/generation-prompt.js';
import {
  compileImageGenerationTask,
  migrateImageGenerationSourcesV2,
  createCompileFingerprint,
  stableHash,
  verifyCompileFingerprint,
  evaluateDeliverableGate,
  downloadAndVerifyImage,
  evaluateArtifactGate,
  evaluateIdentityGate,
  redactProviderRequest,
  redactProviderResponse,
  IMAGE_GENERATION_PRESET_CAPABILITIES,
} from '@masterpiece/image-generation-runtime/core/packaging-generation-core.js';
import {
  buildSubmitBody,
  DASHSCOPE_CAPABILITIES,
  resolveDashScopeEndpoint,
} from '@masterpiece/image-provider-dashscope/index.js';
import {
  createWanImageGenerationAdapter,
  createMultiModelImageAdapter,
} from '@masterpiece/image-generation-adapter/index.js';
import { createRunStore, RunStoreError } from './run-store.ts';
import type { GenerationContext, FileContextLoader } from './context-loader.ts';
import {
  createGenerationSourceLoader,
  normalizeImageGenerationSources,
  toLegacyImageGenerationSources,
  type AnyImageGenerationSourceBundle,
} from './context-loaders/index.ts';
import { resolveProjectRoot, runRootUnder, standaloneImageGenRoot, imagesDir, thumbnailsDir, RUN_FILES } from './paths.ts';
import { EXECUTING_IMAGE_RUN_STATUSES } from '@masterpiece/image-generation-contracts/index.ts';
import { atomicWriteJsonWithRetry } from '../runtime/atomic-write.ts';
import {
  attachBenchmarkRuns,
  createModelBenchmark,
  saveHumanBenchmarkEvaluation,
} from '@masterpiece/model-benchmark/index.js';

export const DEFAULT_SIZE = '1024*1024';

function sizeToAspectRatio(size: string): string {
  const match = size.match(/^(\d+)[*xX](\d+)$/);
  if (!match) return '1:1';
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return '1:1';
  const divisor = (left: number, right: number): number => (
    right === 0 ? left : divisor(right, left % right)
  );
  const common = divisor(width, height);
  return `${width / common}:${height / common}`;
}
export const POLL_INTERVAL_MS = 3000;
export const MAX_POLL_ATTEMPTS = 200;

function resolveVisualUpgradeArtifacts(snapshot: unknown, run: ImageGenerationRun) {
  const value = snapshot as {
    creativeDirectionSnapshot?: Record<string, unknown>;
    creativeDirection?: Record<string, unknown>;
    generationBlueprint?: Record<string, unknown>;
    visualMemory?: Record<string, unknown>;
    referencePack?: Record<string, unknown>;
  };
  const creativeDirection = value?.creativeDirectionSnapshot || value?.creativeDirection;
  const generationBlueprint = value?.generationBlueprint;
  if (!creativeDirection || !generationBlueprint) return null;
  const source = (creativeDirection.source ?? {}) as Record<string, unknown>;
  return {
    visualAnalysis: {
      schemaVersion: '1.0',
      projectId: run.projectId,
      sourceReportPath: source.reportPath,
      oldVisualProblems: creativeDirection.oldVisualProblems ?? [],
      capturedAt: run.createdAt,
    },
    creativeDirection,
    generationBlueprint,
    ...(value.visualMemory ? { visualMemory: value.visualMemory } : {}),
    ...(value.referencePack ? { referencePack: value.referencePack } : {}),
    generationResult: run,
  };
}

export interface StartOptions {
  sources?: ImageGenerationSourceBundle | ImageGenerationSourceBundleV3;
  /** V3 正式提交必须指向用户最后确认的编译 revision。 */
  compileRunId?: string;
  projectId?: string;
  referenceAnchorRunId?: string;
  outputType?: ImageGenerationOutputType;
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

export interface CreativePromptStartOptions {
  snapshot: GenerationPromptSnapshot;
  parentRunId?: string;
  apiProfileId?: string;
  size?: string;
  region?: ImageProviderRegion;
  modelId?: string;
  apiKey?: string;
  baseUrl?: string;
  dryRun?: boolean;
}

export interface CompiledCreativeTaskStartOptions {
  projectId: string;
  compiledPrompt: string;
  promptVersion: string;
  snapshot: unknown;
  sourceMap: Record<string, unknown>;
  references: Array<{
    id: string;
    role: 'identity_reference' | 'structure_reference' | 'core_reference';
    projectRelativePath: string;
  }>;
  event: string;
  apiProfileId?: string;
  size?: string;
  region?: ImageProviderRegion;
  modelId?: string;
  apiKey?: string;
  baseUrl?: string;
  dryRun?: boolean;
}

export interface ImageGenerationServiceDeps {
  /** 保留以兼容 Desktop 装配；服务内部凭据解析走 readCredentials + 环境变量。 */
  readSettings?: () => Promise<PublicSettings> | PublicSettings;
  /** 解密并读取 Provider 凭据（与 pipeline-service 一致；PublicSettings 不含明文 Key）。 */
  readCredentials?: (profileId?: string) => Promise<{
    apiKey: string;
    baseUrl?: string;
    model?: string;
    protocol?: string;
    provider?: string;
    profileId?: string;
  }>;
  /** 加载上游上下文（由调用方用文件加载器或真实服务装配）。 */
  loadContext: (input: { referenceRunId: string; projectId: string; logoAssetPath?: string }) => Promise<GenerationContext>;
  loadSources?: (sources: ImageGenerationSourceBundle) => Promise<GenerationSourceContext>;
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
  const compileTask = compileImageGenerationTask as any;
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const fileReader = deps.fileReader ?? ((p: string) => fs.readFile(p));
  const sleepMs = deps.sleepMs ?? POLL_INTERVAL_MS;
  const nowFn = deps.now ?? (() => new Date().toISOString());
  const listeners = new Set<(progress: ImageGenerationProgress) => void>();

  function storeFor(projectId: string) {
    return createRunStore(deps.dataPath, projectId);
  }

  async function benchmarkRoot(projectId: string): Promise<string> {
    const projectRoot = await resolveProjectRoot(deps.dataPath, projectId);
    return path.join(projectRoot, 'image-generation', 'benchmarks');
  }

  async function writeBenchmark(benchmark: ModelBenchmark): Promise<ModelBenchmark> {
    const root = await benchmarkRoot(benchmark.projectId);
    await fs.mkdir(root, { recursive: true });
    const result = await atomicWriteJsonWithRetry(
      path.join(root, `${benchmark.benchmarkId}.json`),
      benchmark,
    );
    if (!result.success) {
      throw Object.assign(new Error(result.errorMessage || 'Benchmark 写入失败。'), {
        code: 'MODEL_BENCHMARK_WRITE_FAILED',
      });
    }
    return benchmark;
  }

  async function readBenchmark(projectId: string, benchmarkId: string): Promise<ModelBenchmark | null> {
    try {
      return JSON.parse(await fs.readFile(
        path.join(await benchmarkRoot(projectId), `${benchmarkId}.json`),
        'utf8',
      )) as ModelBenchmark;
    } catch {
      return null;
    }
  }

  async function rootForRun(run: ImageGenerationRun): Promise<string> {
    if (run.virtualProjectId) return path.join(standaloneImageGenRoot(deps.dataPath, run.virtualProjectId), run.runId);
    return runRootUnder(await resolveProjectRoot(deps.dataPath, run.projectId), run.runId);
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

  /** 解析完整 Provider 配置，避免只取 Key 后丢失 Profile 的业务空间 Endpoint 与模型。 */
  async function resolveProviderConfig(options: {
    apiKey?: string;
    apiProfileId?: string;
    baseUrl?: string;
    modelId?: string;
  }): Promise<{
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    profileId?: string;
    protocol?: string;
    provider?: string;
  }> {
    if (options.apiKey) {
      return {
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
        model: options.modelId,
        profileId: options.apiProfileId,
        protocol: 'dashscope-wan-image',
        provider: 'dashscope',
      };
    }
    if (deps.readCredentials) {
      try {
        const credentials = await deps.readCredentials(options.apiProfileId || undefined);
        if (credentials?.apiKey) {
          return {
            apiKey: credentials.apiKey,
            baseUrl: options.baseUrl || credentials.baseUrl,
            model: options.modelId || credentials.model,
            profileId: options.apiProfileId || credentials.profileId,
            protocol: credentials.protocol,
            provider: credentials.provider,
          };
        }
      } catch (error) {
        // 用户明确选择了 Profile 时，配置错误必须暴露，不能静默换用其他 Key。
        if (options.apiProfileId) throw error;
      }
    }
    return {
      apiKey: process.env.MASTERPIECE_DASHSCOPE_API_KEY || undefined,
      baseUrl: options.baseUrl,
      model: options.modelId,
      profileId: options.apiProfileId,
      protocol: 'dashscope-wan-image',
      provider: 'dashscope',
    };
  }

  function multiModelAdapterId(protocol?: string) {
    const map: Record<string, 'gpt-image-2' | 'nano-banana' | 'seedream-5.0-pro'> = {
      'openai-image-generation': 'gpt-image-2',
      'google-gemini-image': 'nano-banana',
      'seedream-image': 'seedream-5.0-pro',
    };
    return protocol ? map[protocol] : undefined;
  }

  function providerIdForProtocol(protocol?: string): ImageGenerationRun['providerId'] {
    if (protocol === 'openai-image-generation') return 'openai';
    if (protocol === 'google-gemini-image') return 'google';
    if (protocol === 'seedream-image') return 'volcengine';
    return 'dashscope';
  }

  function endpointFor(region: ImageProviderRegion, baseUrl?: string): string {
    return resolveDashScopeEndpoint(region, baseUrl);
  }

  /** 返回 Provider 静态能力（用于 UI 展示与 Prompt 编译约束；不依赖 API Key）。 */
  function getCapabilities(): ImageProviderCapabilities {
    return DASHSCOPE_CAPABILITIES;
  }

  function getPresetCapabilities() {
    return IMAGE_GENERATION_PRESET_CAPABILITIES;
  }

  async function loadSourceContext(options: StartOptions, sources: AnyImageGenerationSourceBundle): Promise<GenerationSourceContext> {
    if (options.sources) {
      return deps.loadSources
        ? deps.loadSources(toLegacyImageGenerationSources(sources))
        : createGenerationSourceLoader(deps.dataPath).load(sources);
    }
    const legacy = await deps.loadContext({
      referenceRunId: options.referenceAnchorRunId!,
      projectId: options.projectId!,
      logoAssetPath: options.logoAssetPath,
    });
    return {
      preset: 'integrated_anchor',
      purpose: 'production',
      projectId: options.projectId,
      visualContext: legacy.resolvedContext,
      resolvedContext: legacy.resolvedContext,
      referenceCapsule: legacy.capsule,
      anchorBriefMarkdown: legacy.anchorBriefMarkdown,
      referenceDecision: {
        status: legacy.anchorApproved ? 'completed' : 'awaiting_decision',
        decision: legacy.anchorApproved ? 'approved' : undefined,
      },
      references: legacy.references,
      warnings: [],
      sourceMetadata: {
        visualRunId: options.visualRunId,
        documentRunId: options.documentRunId,
        referenceAnchorRunId: options.referenceAnchorRunId,
      },
    };
  }

  async function getSourcePreview(options: StartOptions) {
    const sources = normalizeImageGenerationSources(options);
    const context = await loadSourceContext(options, sources);
    const compiled = compileTask({
      runId: 'preview',
      taskId: 'preview',
      sources,
      context,
      capabilities: DASHSCOPE_CAPABILITIES,
      providerConfig: { apiKey: 'PREVIEW', baseUrl: endpointFor(options.region ?? 'beijing', options.baseUrl) },
      parameters: { size: options.size ?? DEFAULT_SIZE, region: options.region ?? 'beijing' },
      createdAt: nowFn(),
    });
    const used = compiled.snapshot.sourcesUsed;
    return {
      preset: 'sourcePreset' in sources ? sources.sourcePreset : sources.preset,
      ...('sourcePreset' in sources
        ? { sourcePreset: sources.sourcePreset, deliverable: sources.deliverable }
        : {}),
      purpose: sources.purpose,
      sourcesUsed: used,
      sourcesNotUsed: Object.entries(used).filter(([, value]) => !value).map(([key]) => key),
      referenceCount: context.references.length,
      identityBound: context.references.some((item) => item.role !== 'reference_style'),
      referenceStatus: context.referenceDecision?.status,
      warnings: compiled.gate.warnings,
      gate: compiled.gate,
    };
  }

  /** 解析某运行的本地根目录（供 open-folder / 读取图片使用）。 */
  async function runRoot(runId: string): Promise<string | null> {
    const run = await getRun(runId);
    if (!run) return null;
    return rootForRun(run);
  }

  /** 读取已生成图片并以 data URL 形式返回给 Renderer 预览（主进程读盘，渲染层不直接接触文件）。 */
  async function readImageDataUrl(runId: string, imageId: string): Promise<{ mimeType: string; dataUrl: string } | null> {
    const run = await getRun(runId);
    if (!run) return null;
    const image = run.images.find((i) => i.imageId === imageId);
    if (!image) return null;
    const root = await rootForRun(run);
    const filePath = path.join(root, image.relativePath);
    const buffer = await fs.readFile(filePath);
    const mimeType = image.mimeType || 'image/png';
    return { mimeType, dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}` };
  }

  /** 编译（dry-run 核心），持久化编译产物，返回结果。不提交 Provider。 */
  async function compile(options: StartOptions): Promise<{
    run: ImageGenerationRun;
    result: ImageGenerationCompileResult;
    context: GenerationSourceContext;
  }> {
    const now = nowFn();
    const sources = normalizeImageGenerationSources(options);
    const ctx = await loadSourceContext(options, sources);
    const runId = crypto.randomUUID();
    const taskId = `igt-${runId.slice(0, 8)}`;
    const size = options.size ?? DEFAULT_SIZE;
    const region = options.region ?? 'beijing';
    const modelId = options.modelId ?? DASHSCOPE_CAPABILITIES.modelId;
    const capabilities = DASHSCOPE_CAPABILITIES;
    const providerConfig = await resolveProviderConfig(options);
    const apiKey = providerConfig.apiKey;
    const endpoint = endpointFor(region, providerConfig.baseUrl);
    const resolvedModelId = options.modelId ?? providerConfig.model ?? modelId;
    // dry-run 不调用模型，允许无凭据完成离线 Gate 校验；真实运行仍要求真实 Key（否则 Gate B 阻断）。
    // 占位符仅用于 Gate 判定，不会写入 task.json（task-builder 不落盘 providerConfig）。
    const gateApiKey = apiKey ?? (options.dryRun ? 'DRY_RUN_PLACEHOLDER' : '');

    const isSourceBundleRequest = Boolean(options.sources);
    const isV3Request = 'sourcePreset' in sources;
    const compiled = isSourceBundleRequest
      ? compileTask({
          runId,
          taskId,
          sources,
          context: ctx,
          capabilities: { ...capabilities, modelId: resolvedModelId },
          providerConfig: { apiKey: gateApiKey, baseUrl: endpoint },
          parameters: { size, region, thinkingMode: false },
          createdAt: now,
        })
      : compileTask({
          projectId: options.projectId,
          runId,
          taskId,
          referenceAnchorRunId: options.referenceAnchorRunId,
          anchorApproved: ctx.referenceDecision?.decision === 'approved',
          resolvedContext: ctx.resolvedContext,
          capsule: ctx.referenceCapsule,
          anchorBriefMarkdown: ctx.anchorBriefMarkdown,
          references: ctx.references,
          capabilities: { ...capabilities, modelId: resolvedModelId },
          providerConfig: { apiKey: gateApiKey, baseUrl: endpoint },
          parameters: { size, region, thinkingMode: false },
          createdAt: now,
          visualRunId: options.visualRunId,
          documentRunId: options.documentRunId,
        });

    const scopeId = sources.projectId || sources.visual?.projectId || `document-${sources.document?.documentRunId}`;
    const store = storeFor(scopeId);
    const providerId = providerIdForProtocol(providerConfig.protocol);
    const storedTask = {
      ...compiled.task,
      providerId,
      modelId: resolvedModelId,
    };
    await store.writeTask(runId, storedTask);
    await store.writeSnapshot(runId, compiled.snapshot);
    await store.writeCompiledPrompt(runId, compiled.compiledPromptMarkdown);
    await store.writePromptSourceMap(runId, compiled.promptSourceMap);
    await store.writeWarnings(runId, compiled.gate.warnings);
    if (isV3Request) {
      await store.writeDeliverableArtifacts(runId, {
        deliverablePolicy: compiled.deliverablePolicy,
        userIntentResolution: compiled.userIntentResolution,
        referencePlan: compiled.referencePlan,
        compileFingerprint: compiled.compileFingerprint,
      });
    }

    const run: ImageGenerationRun = {
      schemaVersion: isV3Request ? '3.0' : isSourceBundleRequest ? '2.0' : '1.0',
      runId,
      projectId: scopeId,
      ...(compiled.task.virtualProjectId ? { virtualProjectId: compiled.task.virtualProjectId } : {}),
      ...(isSourceBundleRequest && !isV3Request
        ? { preset: sources.preset, purpose: sources.purpose, sources }
        : {}),
      ...(isV3Request
        ? {
            sourcePreset: sources.sourcePreset,
            deliverable: sources.deliverable,
            purpose: sources.purpose,
            sources,
          }
        : {}),
      taskId,
      status: compiled.gate.blocked ? 'blocked' : 'ready',
      outputType: compiled.task.outputType as ImageGenerationOutputType,
      providerId,
      modelId: resolvedModelId,
      region,
      ...(providerConfig.profileId ? { apiProfileId: providerConfig.profileId } : {}),
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
      ...(isV3Request
        ? {
            sourcePreset: sources.sourcePreset,
            deliverable: sources.deliverable,
            deliverablePolicy: compiled.deliverablePolicy,
            userIntentResolution: compiled.userIntentResolution,
            referencePlan: compiled.referencePlan,
            compileFingerprint: compiled.compileFingerprint,
          }
        : {}),
    };
    return { run, result, context: ctx };
  }

  /** 完整运行：compile → 提交 → 轮询 → 下载 → Gate C → 落盘。 */
  async function start(options: StartOptions): Promise<ImageGenerationRun> {
    const sources = normalizeImageGenerationSources(options);
    if ('sourcePreset' in sources) {
      if (!options.compileRunId) {
        throw blockingError('COMPILE_INPUT_STALE', '请先编译并确认当前交付类型与用户要求，再开始生图。');
      }
      const run = await getRun(options.compileRunId);
      if (!run || run.schemaVersion !== '3.0') {
        throw blockingError('COMPILE_INPUT_STALE', '已确认的编译 revision 不存在，请重新编译。');
      }
      const persistedTask = await readPersistedTask(run.runId, run.projectId);
      const earlyMismatches = [
        stableHash(sources) !== persistedTask.compileFingerprint?.sourceBundleHash ? 'sourceBundleHash' : undefined,
        stableHash(sources.userIntent) !== persistedTask.compileFingerprint?.userIntentHash ? 'userIntentHash' : undefined,
        stableHash(sources.deliverable) !== persistedTask.compileFingerprint?.deliverableHash ? 'deliverableHash' : undefined,
      ].filter(Boolean);
      if (earlyMismatches.length) {
        throw Object.assign(
          new Error(`当前生图输入已变化（${earlyMismatches.join(', ')}），请重新编译确认。`),
          { code: 'COMPILE_INPUT_STALE', mismatches: earlyMismatches },
        );
      }
      const context = await loadSourceContext(options, sources);
      const current = compileTask({
        runId: run.runId,
        taskId: run.taskId,
        sources,
        context,
        capabilities: { ...DASHSCOPE_CAPABILITIES, modelId: run.modelId },
        providerConfig: { apiKey: 'FINGERPRINT_CHECK' },
        parameters: {
          size: options.size ?? persistedTask.parameters?.size ?? DEFAULT_SIZE,
          region: options.region ?? persistedTask.region ?? 'beijing',
          thinkingMode: persistedTask.parameters?.thinkingMode ?? false,
        },
        createdAt: persistedTask.compileFingerprint?.compiledAt ?? persistedTask.createdAt,
      });
      const verification = verifyCompileFingerprint(persistedTask.compileFingerprint, {
        sourceBundle: sources,
        userIntent: sources.userIntent,
        deliverable: sources.deliverable,
        referencePlan: current.referencePlan,
        compiledPrompt: current.compiledPromptMarkdown,
      });
      if (!verification.valid) {
        throw Object.assign(
          new Error(`当前生图输入已变化（${verification.mismatches.join(', ')}），请重新编译确认。`),
          { code: 'COMPILE_INPUT_STALE', mismatches: verification.mismatches },
        );
      }
      if (run.gate.blocked || options.dryRun) return run;
      return executeLive(run, options);
    }
    const { run } = await compile(options);
    if (run.gate.blocked || options.dryRun) return run;
    return executeLive(run, options);
  }

  /**
   * Creative Production Provider Bridge：复用现有 Run Store / Provider / 下载与恢复链路，
   * 但直接使用已验证的 Generation Prompt Snapshot，不再经过 legacy Preset 编译器。
   */
  async function startCompiledCreativeTask(
    options: CompiledCreativeTaskStartOptions,
  ): Promise<ImageGenerationRun> {
    if (!options.compiledPrompt.trim()) {
      throw Object.assign(new Error('Creative Task Prompt 不能为空。'), { code: 'PROMPT_EMPTY' });
    }
    if (options.references.length > 2) {
      throw Object.assign(new Error('Creative Task 最多只能发送 2 张必要品牌资产。'), {
        code: 'GENERATION_REFERENCE_LIMIT_EXCEEDED',
      });
    }
    const projectRoot = await resolveProjectRoot(deps.dataPath, options.projectId);
    const references = await Promise.all(options.references.map(async (reference) => {
      const localPath = path.resolve(projectRoot, reference.projectRelativePath);
      if (localPath !== projectRoot && !localPath.startsWith(`${projectRoot}${path.sep}`)) {
        throw blockingError('REFERENCE_ASSET_NOT_FOUND', 'Creative Task 参考图路径越界。');
      }
      const content = await fs.readFile(localPath).catch(() => null);
      if (!content) {
        throw blockingError('REFERENCE_ASSET_NOT_FOUND', `Creative Task 参考图不存在：${reference.id}`);
      }
      return {
        assetId: reference.id,
        role: reference.role === 'identity_reference'
          ? 'current_project_logo'
          : reference.role === 'structure_reference'
            ? 'current_project_product'
            : 'reference_style',
        localPath,
        sha256: crypto.createHash('sha256').update(content).digest('hex'),
        source: 'user_selected',
        includeReason: `Creative Production ${reference.role}`,
      };
    }));
    const providerConfig = await resolveProviderConfig(options);
    const runId = crypto.randomUUID();
    const taskId = `igt-${crypto.randomUUID()}`;
    const now = nowFn();
    const region = options.region ?? 'beijing';
    const modelId = options.modelId || providerConfig.model || DASHSCOPE_CAPABILITIES.modelId;
    const providerId = providerIdForProtocol(providerConfig.protocol);
    const task = {
      schemaVersion: '1.0',
      taskId,
      projectId: options.projectId,
      runId,
      outputType: 'concept_image',
      contextSnapshotPath: RUN_FILES.snapshot,
      references,
      compiledPrompt: options.compiledPrompt,
      promptVersion: options.promptVersion,
      providerId,
      modelId,
      region,
      parameters: {
        size: options.size ?? DEFAULT_SIZE,
        outputCount: 1,
        watermark: false,
        thinkingMode: false,
      },
      createdAt: now,
    };
    const run: ImageGenerationRun = {
      schemaVersion: '1.0',
      runId,
      projectId: options.projectId,
      taskId,
      status: 'ready',
      outputType: 'concept_image',
      providerId,
      modelId,
      region,
      ...(providerConfig.profileId ? { apiProfileId: providerConfig.profileId } : {}),
      createdAt: now,
      updatedAt: now,
      gate: { blocked: false, errors: [], warnings: [] },
      images: [],
    };
    const store = storeFor(options.projectId);
    await store.writeTask(runId, task);
    await store.writeSnapshot(runId, options.snapshot);
    await store.writeCompiledPrompt(runId, options.compiledPrompt);
    await store.writePromptSourceMap(runId, options.sourceMap);
    await store.writeWarnings(runId, []);
    await store.saveRun(run);
    const artifacts = resolveVisualUpgradeArtifacts(options.snapshot, run);
    if (artifacts) await store.writeVisualUpgradeArtifacts(runId, artifacts);
    await store.appendEvent(runId, options.event, options.sourceMap);
    emit(run);
    if (options.dryRun) return run;
    const adapterId = multiModelAdapterId(providerConfig.protocol);
    const completed = adapterId
      ? await executeMultiModelLive(run, task, references, {
        prompt: options.compiledPrompt,
        negativeRules: [],
        aspectRatio: sizeToAspectRatio(options.size ?? DEFAULT_SIZE),
      }, providerConfig, adapterId)
      : await executeLive(run, options);
    if (artifacts) await store.writeGenerationResult(runId, completed);
    return completed;
  }

  async function startPromptSnapshot(options: CreativePromptStartOptions): Promise<ImageGenerationRun> {
    const snapshot = validateGenerationPromptSnapshot(options.snapshot) as GenerationPromptSnapshot;
    const projectRoot = await resolveProjectRoot(deps.dataPath, snapshot.projectId);
    const references = await Promise.all(snapshot.selectedReferences.map(async (reference) => {
      const localPath = path.resolve(projectRoot, reference.projectRelativePath);
      if (localPath !== projectRoot && !localPath.startsWith(`${projectRoot}${path.sep}`)) {
        throw blockingError('REFERENCE_ASSET_NOT_FOUND', '最终参考图路径越界。');
      }
      const content = await fs.readFile(localPath).catch(() => null);
      if (!content) throw blockingError('REFERENCE_ASSET_NOT_FOUND', `最终参考图不存在：${reference.id}`);
      const role = reference.role === 'identity_reference'
        ? 'current_project_logo'
        : reference.role === 'structure_reference'
          ? 'current_project_product'
          : 'reference_style';
      return {
        assetId: reference.id,
        role,
        localPath,
        sha256: crypto.createHash('sha256').update(content).digest('hex'),
        source: 'user_selected',
        includeReason: `Creative Session ${reference.role}`,
      };
    }));
    const providerConfig = await resolveProviderConfig(options);
    const runId = crypto.randomUUID();
    const taskId = `igt-${crypto.randomUUID()}`;
    const now = nowFn();
    const region = options.region ?? 'beijing';
    const modelId = options.modelId || providerConfig.model || DASHSCOPE_CAPABILITIES.modelId;
    const providerId = providerIdForProtocol(providerConfig.protocol);
    const task = {
      schemaVersion: '1.0',
      taskId,
      projectId: snapshot.projectId,
      runId,
      outputType: 'concept_image',
      contextSnapshotPath: RUN_FILES.snapshot,
      references,
      compiledPrompt: snapshot.instruction.finalPrompt,
      promptVersion: snapshot.promptVersion || snapshot.compilerVersion,
      assetType: snapshot.outputType,
      visualCanon: {
        id: snapshot.visualCanonId,
        version: snapshot.visualCanonVersion,
      },
      promptSnapshot: {
        id: snapshot.id,
        ...(snapshot.deliverableTemplateId
          ? { templateId: snapshot.deliverableTemplateId }
          : {}),
        ...(snapshot.deliverableTemplateVersion
          ? { templateVersion: snapshot.deliverableTemplateVersion }
          : {}),
        ...(snapshot.promptFingerprint
          ? { fingerprint: snapshot.promptFingerprint }
          : {}),
      },
      providerId,
      modelId,
      region,
      parameters: {
        size: options.size ?? DEFAULT_SIZE,
        outputCount: 1,
        watermark: false,
        thinkingMode: false,
      },
      createdAt: now,
    };
    const run: ImageGenerationRun = {
      schemaVersion: '1.0',
      runId,
      projectId: snapshot.projectId,
      taskId,
      status: 'ready',
      outputType: 'concept_image',
      providerId,
      modelId,
      region,
      ...(providerConfig.profileId ? { apiProfileId: providerConfig.profileId } : {}),
      ...(options.parentRunId ? { parentRunId: options.parentRunId, retryMode: 'same_prompt' as const } : {}),
      createdAt: now,
      updatedAt: now,
      gate: { blocked: false, errors: [], warnings: [] },
      images: [],
    };
    const store = storeFor(snapshot.projectId);
    await store.writeTask(runId, task);
    await store.writeSnapshot(runId, snapshot);
    await store.writeCompiledPrompt(runId, snapshot.instruction.finalPrompt);
    await store.writePromptSourceMap(runId, {
      promptSnapshotId: snapshot.id,
      sessionId: snapshot.sessionId,
      styleProfile: `${snapshot.styleProfileId}@${snapshot.styleProfileVersion}`,
      visualCanon: `${snapshot.visualCanonId}@${snapshot.visualCanonVersion}`,
      ...(snapshot.visualMemoryId ? { visualMemory: snapshot.visualMemoryId } : {}),
      ...(snapshot.referencePackId ? { referencePack: snapshot.referencePackId } : {}),
      lockedAssetIds: snapshot.lockedAssetIds,
      selectedReferences: snapshot.selectedReferences,
    });
    await store.writeWarnings(runId, []);
    await store.saveRun(run);
    const artifacts = resolveVisualUpgradeArtifacts(snapshot, run);
    if (artifacts) await store.writeVisualUpgradeArtifacts(runId, artifacts);
    await store.appendEvent(runId, 'CREATIVE_PROMPT_SNAPSHOT_ATTACHED', {
      promptSnapshotId: snapshot.id,
      sessionId: snapshot.sessionId,
    });
    emit(run);
    if (options.dryRun) return run;
    const adapterId = multiModelAdapterId(providerConfig.protocol);
    const completed = adapterId
      ? await executeMultiModelLive(run, task, references, {
        prompt: snapshot.instruction.finalPrompt,
        negativeRules: snapshot.instruction.avoid,
        aspectRatio: aspectRatioForSnapshot(snapshot),
        promptFingerprint: snapshot.promptFingerprint,
      }, providerConfig, adapterId)
      : await executeLive(run, options);
    if (artifacts) await store.writeGenerationResult(runId, completed);
    return completed;
  }

  function aspectRatioForSnapshot(snapshot: GenerationPromptSnapshot): string {
    if (['interior_scene', 'storefront_scene'].includes(snapshot.outputType)) return '16:9';
    if (snapshot.outputType === 'packaging_render') return '3:4';
    if (snapshot.outputType === 'vi_application') return '1:1';
    return '4:5';
  }

  async function executeMultiModelLive(
    initialRun: ImageGenerationRun,
    task: Record<string, unknown>,
    references: Array<{ localPath: string; assetId: string; role: string }>,
    generationInput: {
      prompt: string;
      negativeRules: string[];
      aspectRatio: string;
      promptFingerprint?: string;
    },
    providerConfig: {
      apiKey?: string;
      baseUrl?: string;
      model?: string;
      protocol?: string;
    },
    adapterId: 'gpt-image-2' | 'nano-banana' | 'seedream-5.0-pro',
  ): Promise<ImageGenerationRun> {
    const store = storeFor(initialRun.projectId);
    const startedAt = nowFn();
    let run: ImageGenerationRun = {
      ...initialRun,
      status: 'submitting',
      startedAt,
      updatedAt: startedAt,
      providerExecutionMode: 'synchronous',
    };
    await store.saveRun(run);
    emit(run);
    try {
      const adapter = createMultiModelImageAdapter({
        adapterId,
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl,
        modelId: providerConfig.model,
      });
      const adapterReferences = await Promise.all(references.map(async (reference) => {
        const data = await fileReader(reference.localPath);
        const extension = path.extname(reference.localPath).toLowerCase();
        const mimeType = extension === '.jpg' || extension === '.jpeg'
          ? 'image/jpeg'
          : extension === '.webp'
            ? 'image/webp'
            : 'image/png';
        return {
          name: path.basename(reference.localPath),
          mimeType,
          data: data.toString('base64'),
        };
      }));
      const universalInput = {
        prompt: generationInput.prompt,
        negativeRules: generationInput.negativeRules,
        aspectRatio: generationInput.aspectRatio,
        imageSize: '2K',
        outputCount: 1,
        references: adapterReferences,
      };
      const request = adapter.compileRequest(universalInput);
      await store.writeProviderRequest(run.runId, {
        adapterId,
        adapterVersion: adapter.version,
        method: request.method,
        url: new URL(request.url).origin + new URL(request.url).pathname,
        bodyKind: request.bodyKind,
        modelId: run.modelId,
        referenceCount: references.length,
        ...(generationInput.promptFingerprint
          ? { promptFingerprint: generationInput.promptFingerprint }
          : {}),
      });
      await store.appendEvent(run.runId, 'MULTI_MODEL_REQUEST_SUBMITTED', {
        adapterId,
        modelId: run.modelId,
      });
      run = { ...run, status: 'running', updatedAt: nowFn() };
      await store.saveRun(run);
      emit(run);
      const result = await adapter.execute(universalInput, { fetchImpl });
      const providerTaskId = result.requestId || `sync-${run.runId}`;
      await store.writeProviderResponse(run.runId, {
        adapterId,
        status: result.status,
        requestId: result.requestId,
        modelId: result.modelId,
        imageCount: result.images.length,
      });
      run = {
        ...run,
        providerTaskId,
        status: 'downloading',
        updatedAt: nowFn(),
      };
      await store.saveRun(run);
      emit(run);
      const first = result.images[0];
      const root = await rootForRun(run);
      const downloaded = await downloadAndVerifyImage({
        url: first?.url,
        b64: first?.b64,
        targetPath: path.join(imagesDir(root), 'image-01.png'),
        thumbnailPath: path.join(thumbnailsDir(root), 'image-01.webp'),
        fetchImpl,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      });
      if (downloaded.downloadFailed || !downloaded.written || !downloaded.decoded) {
        throw Object.assign(new Error(downloaded.error || 'Generated image validation failed.'), {
          code: 'IMAGE_DOWNLOAD_FAILED',
        });
      }
      const completedAt = nowFn();
      const generated: GeneratedImage = {
        imageId: 'image-01',
        relativePath: 'images/image-01.png',
        thumbnailRelativePath: 'thumbnails/image-01.webp',
        mimeType: downloaded.mimeType || first?.mimeType || 'image/png',
        sizeBytes: downloaded.sizeBytes || 0,
        width: downloaded.width,
        height: downloaded.height,
        sha256: downloaded.sha256 || '',
        downloadedAt: completedAt,
      };
      run = {
        ...run,
        status: 'succeeded',
        images: [generated],
        completedAt,
        updatedAt: completedAt,
      };
      await store.saveRun(run);
      await store.writeGenerationResult(run.runId, run);
      await store.writeMetrics(run.runId, {
        startedAt,
        completedAt,
        durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
        providerSubmitCount: 1,
        providerPollCount: 0,
        outputImageCount: 1,
        outputSize: downloaded.width && downloaded.height
          ? `${downloaded.width}x${downloaded.height}`
          : undefined,
      } as never);
      await store.appendEvent(run.runId, 'RUN_SUCCEEDED', {
        adapterId,
        imageCount: 1,
      });
      emit(run);
      return run;
    } catch (error) {
      const failed: ImageGenerationRun = {
        ...run,
        status: 'failed',
        completedAt: nowFn(),
        updatedAt: nowFn(),
        errorCode: String((error as { code?: string }).code || 'MODEL_ADAPTER_REQUEST_FAILED'),
        errorMessage: (error as Error).message,
      };
      await store.saveRun(failed);
      await store.writeGenerationResult(failed.runId, failed);
      await store.appendEvent(failed.runId, 'RUN_FAILED', {
        adapterId,
        errorCode: failed.errorCode,
      });
      emit(failed);
      return failed;
    }
  }

  async function startBenchmark(
    snapshotInput: GenerationPromptSnapshot,
    apiProfileIds: string[],
    dryRun = false,
  ): Promise<ModelBenchmark> {
    const snapshot = validateGenerationPromptSnapshot(snapshotInput) as GenerationPromptSnapshot;
    await Promise.all(apiProfileIds.map(async (apiProfileId) => {
      const config = await resolveProviderConfig({ apiProfileId });
      if (!config.apiKey) {
        throw Object.assign(new Error(`Benchmark 模型配置缺少 API Key：${apiProfileId}`), {
          code: 'PROVIDER_CONFIG_MISSING',
        });
      }
      if (config.protocol !== 'dashscope-wan-image' && !multiModelAdapterId(config.protocol)) {
        throw Object.assign(new Error(`Benchmark 不支持协议：${config.protocol || 'missing'}`), {
          code: 'PROVIDER_PROFILE_INCOMPATIBLE',
        });
      }
    }));
    let benchmark = createModelBenchmark({
      projectId: snapshot.projectId,
      promptSnapshot: snapshot,
      apiProfileIds,
    }) as ModelBenchmark;
    await writeBenchmark(benchmark);
    benchmark = {
      ...benchmark,
      status: 'running',
      updatedAt: nowFn(),
    };
    await writeBenchmark(benchmark);
    const runs = await Promise.all(benchmark.tasks.map((task) => startPromptSnapshot({
      snapshot,
      apiProfileId: task.apiProfileId,
      dryRun,
    })));
    benchmark = attachBenchmarkRuns(benchmark, runs, { now: nowFn }) as ModelBenchmark;
    return writeBenchmark(benchmark);
  }

  async function listBenchmarks(projectId: string): Promise<ModelBenchmark[]> {
    const root = await benchmarkRoot(projectId);
    const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
    const values = await Promise.all(entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map(async (entry) => {
        try {
          return JSON.parse(await fs.readFile(path.join(root, entry.name), 'utf8')) as ModelBenchmark;
        } catch {
          return null;
        }
      }));
    return values
      .filter((value): value is ModelBenchmark => Boolean(value))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async function saveBenchmarkEvaluation(
    projectId: string,
    benchmarkId: string,
    input: SaveModelBenchmarkEvaluationInput,
  ): Promise<ModelBenchmark> {
    const benchmark = await readBenchmark(projectId, benchmarkId);
    if (!benchmark) {
      throw Object.assign(new Error('Benchmark 不存在。'), {
        code: 'MODEL_BENCHMARK_NOT_FOUND',
      });
    }
    const updated = saveHumanBenchmarkEvaluation(benchmark, input, { now: nowFn }) as ModelBenchmark;
    return writeBenchmark(updated);
  }

  /** 提交并执行实时轮询/下载（被 start 与 retry 共用）。 */
  async function executeLive(
    run: ImageGenerationRun,
    options: { apiKey?: string; apiProfileId?: string; baseUrl?: string; modelId?: string },
  ): Promise<ImageGenerationRun> {
    const store = storeFor(run.projectId);
    const now = nowFn();
    const providerConfig = await resolveProviderConfig({
      ...options,
      apiProfileId: options.apiProfileId || run.apiProfileId,
      modelId: options.modelId || run.modelId,
    });
    const apiKey = providerConfig.apiKey;
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

    const persistedTask = await readPersistedTask(run.runId, run.projectId);
    const adapterId = multiModelAdapterId(providerConfig.protocol);
    if (adapterId) {
      const persisted = persistedTask as {
        compiledPrompt?: string;
        parameters?: { size?: string };
        references?: Array<{ localPath: string; assetId: string; role: string }>;
        promptSnapshot?: { fingerprint?: string };
      };
      return executeMultiModelLive(
        {
          ...run,
          providerId: providerIdForProtocol(providerConfig.protocol),
        },
        persistedTask,
        persisted.references ?? [],
        {
          prompt: persisted.compiledPrompt ?? '',
          negativeRules: [],
          aspectRatio: sizeToAspectRatio(persisted.parameters?.size ?? DEFAULT_SIZE),
          promptFingerprint: persisted.promptSnapshot?.fingerprint,
        },
        providerConfig,
        adapterId,
      );
    }
    if (providerConfig.protocol && providerConfig.protocol !== 'dashscope-wan-image') {
      const failed: ImageGenerationRun = {
        ...run,
        status: 'failed',
        completedAt: now,
        updatedAt: now,
        errorCode: 'PROVIDER_PROFILE_INCOMPATIBLE',
        errorMessage: `不支持的图像生成协议：${providerConfig.protocol}`,
      };
      await store.saveRun(failed);
      emit(failed);
      return failed;
    }

    const region = run.region;
    const modelId = run.modelId;
    const endpoint = endpointFor(region, providerConfig.baseUrl);
    const provider: ImageGenerationProvider = createWanImageGenerationAdapter({
      apiKey,
      region,
      modelId,
      baseUrl: endpoint,
      fetchImpl,
      fileReader,
    });

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
      activeRun = {
        ...activeRun,
        providerTaskId,
        providerRequestId: submitResult.requestId,
        providerExecutionMode: submitResult.executionMode,
        status: 'submitting',
      };
      await store.saveRun(activeRun);

      // 脱敏请求记录
      const body = await buildSubmitBody(persistedTask, { fileReader });
      await store.writeProviderRequest(
        activeRun.runId,
        redactProviderRequest({ endpoint, region, modelId, body }),
      );

      return await pollAndDownload(
        activeRun,
        provider,
        providerTaskId,
        persistedTask,
        endpoint,
        region,
        modelId,
        metrics,
        now,
        submitResult.initialStatus,
      );
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
      return activeRun;
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
    initialStatus?: ProviderTaskStatus,
  ): Promise<ImageGenerationRun> {
    const store = storeFor(initialRun.projectId);
    let activeRun = initialRun;

    let finalStatus = initialStatus ?? await provider.getStatus(providerTaskId);
    if (!initialStatus) {
      (metrics as { providerPollCount: number }).providerPollCount =
        ((metrics as { providerPollCount?: number }).providerPollCount ?? 0) + 1;
    }
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

    const root = await rootForRun(activeRun);
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
        return failed;
      }
      return run;
    }
    if (run.providerExecutionMode === 'synchronous') {
      const failed: ImageGenerationRun = {
        ...run,
        status: 'failed',
        errorCode: 'RUN_RECOVERY_RETRY_REQUIRED',
        errorMessage: '同步生图在客户端退出后无法恢复远端结果，请使用“相同 Prompt 重试”。',
        updatedAt: nowFn(),
      };
      await store.saveRun(failed);
      emit(failed);
      return failed;
    }
    const providerConfig = await resolveProviderConfig({
      apiProfileId: run.apiProfileId,
      modelId: run.modelId,
    });
    const apiKey = providerConfig.apiKey;
    if (!apiKey) {
      return run; // 无 Key 无法恢复，保留原状由用户手动重试
    }
    const endpoint = endpointFor(run.region, providerConfig.baseUrl);
    const provider = createWanImageGenerationAdapter({
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
    const run = await storeFor(projectId).readRun(runId);
    const root = run ? await rootForRun(run) : runRootUnder(await resolveProjectRoot(deps.dataPath, projectId), runId);
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
    const standalone = await fs.readdir(path.join(deps.dataPath, 'standalone-image-generation'), { withFileTypes: true }).catch(() => []);
    ids.push(...standalone.filter((entry) => entry.isDirectory() && entry.name.startsWith('document-')).map((entry) => entry.name));
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

    if (persistedTask.schemaVersion === '2.0' || persistedTask.schemaVersion === '3.0') {
      const now = nowFn();
      const runId = crypto.randomUUID();
      const taskId = `igt-${runId.slice(0, 8)}`;
      const sourceCandidate = parent.sources ??
        (persistedTask.schemaVersion === '3.0'
          ? {
              schemaVersion: '3.0',
              sourcePreset: persistedTask.sourcePreset,
              deliverable: persistedTask.deliverable,
              purpose: persistedTask.purpose,
              projectId: persistedTask.projectId,
              visual: persistedTask.sources?.visualRunId
                ? { projectId: persistedTask.projectId, visualRunId: persistedTask.sources.visualRunId }
                : undefined,
              document: persistedTask.sources?.documentRunId
                ? { documentRunId: persistedTask.sources.documentRunId }
                : undefined,
              reference: persistedTask.sources?.referenceAnchorRunId
                ? { referenceAnchorRunId: persistedTask.sources.referenceAnchorRunId }
                : undefined,
              userIntent: { prompt: persistedTask.userIntent?.original ?? '' },
            }
          : undefined);
      if (!sourceCandidate) {
        throw blockingError('SOURCE_BUNDLE_INVALID', '旧运行缺少来源快照，无法安全迁移到 V3 后重试。');
      }
      const sources = migrateImageGenerationSourcesV2(sourceCandidate) as ImageGenerationSourceBundleV3;
      const parentRoot = await rootForRun(parent);
      const snapshot = JSON.parse(await fs.readFile(path.join(parentRoot, RUN_FILES.snapshot), 'utf8'));
      const context: GenerationSourceContext = {
        preset: 'integrated_anchor',
        purpose: sources.purpose,
        projectId: sources.projectId,
        visualContext: snapshot.visualSummary,
        documentContext: snapshot.documentSummary,
        resolvedContext: snapshot.visualSummary?.identity
          ? snapshot.visualSummary
          : {
              identity: snapshot.identity,
              lockedAssets: snapshot.lockedAssets,
              conflicts: [],
            },
        referenceCapsule: snapshot.referenceSummary,
        references: persistedTask.references ?? [],
        warnings: snapshot.warnings ?? [],
        sourceMetadata: persistedTask.sources ?? {},
      };
      const providerConfig = await resolveProviderConfig({
        apiKey: options.apiKey,
        apiProfileId: options.apiProfileId || parent.apiProfileId,
        modelId: parent.modelId,
      });
      const compiled = compileTask({
        runId,
        taskId,
        sources,
        context,
        capabilities: { ...DASHSCOPE_CAPABILITIES, modelId: parent.modelId },
        providerConfig: {
          apiKey: providerConfig.apiKey ?? (options.dryRun ? 'DRY_RUN_PLACEHOLDER' : ''),
          baseUrl: providerConfig.baseUrl,
        },
        parameters: {
          size: persistedTask.parameters?.size ?? DEFAULT_SIZE,
          region: persistedTask.region ?? parent.region,
          thinkingMode: persistedTask.parameters?.thinkingMode ?? false,
        },
        createdAt: now,
      });
      if (options.mode === 'edited_prompt' && options.editedPrompt?.trim()) {
        const prompt = options.editedPrompt.trim();
        compiled.compiledPromptMarkdown = prompt;
        compiled.task.compiledPrompt = prompt;
        compiled.compileFingerprint = createCompileFingerprint({
          sourceBundle: sources,
          userIntent: sources.userIntent,
          deliverable: sources.deliverable,
          referencePlan: compiled.referencePlan,
          compiledPrompt: prompt,
          compiledAt: now,
        });
        compiled.task.compileFingerprint = compiled.compileFingerprint;
        const deliverableErrors = evaluateDeliverableGate({
          deliverable: sources.deliverable,
          sourcePreset: sources.sourcePreset,
          purpose: sources.purpose,
          userIntentResolution: compiled.userIntentResolution,
          compiledPrompt: prompt,
          referencePlan: compiled.referencePlan,
        });
        compiled.gate.errors = [
          ...compiled.gate.errors.filter((error: { code: string }) =>
            ![
              'DELIVERABLE_PROMPT_INCOMPLETE',
              'INTERIOR_SCENE_SPATIAL_REQUIREMENTS_MISSING',
              'STOREFRONT_SCENE_REQUIREMENTS_MISSING',
            ].includes(error.code)),
          ...deliverableErrors,
        ];
        compiled.gate.blocked = compiled.gate.errors.length > 0;
      }
      const store = storeFor(parent.projectId);
      await store.writeTask(runId, compiled.task);
      await store.writeSnapshot(runId, compiled.snapshot);
      await store.writeCompiledPrompt(runId, compiled.compiledPromptMarkdown);
      await store.writePromptSourceMap(runId, compiled.promptSourceMap);
      await store.writeWarnings(runId, compiled.gate.warnings);
      await store.writeDeliverableArtifacts(runId, {
        deliverablePolicy: compiled.deliverablePolicy,
        userIntentResolution: compiled.userIntentResolution,
        referencePlan: compiled.referencePlan,
        compileFingerprint: compiled.compileFingerprint,
      });
      const run: ImageGenerationRun = {
        ...parent,
        schemaVersion: '3.0',
        runId,
        taskId,
        sourcePreset: sources.sourcePreset,
        deliverable: sources.deliverable,
        preset: undefined,
        sources,
        outputType: compiled.task.outputType,
        status: compiled.gate.blocked ? 'blocked' : 'ready',
        gate: compiled.gate,
        parentRunId: parent.runId,
        retryMode: options.mode,
        providerTaskId: undefined,
        providerRequestId: undefined,
        providerExecutionMode: undefined,
        apiProfileId: options.apiProfileId || parent.apiProfileId,
        createdAt: now,
        updatedAt: now,
        startedAt: undefined,
        completedAt: undefined,
        images: [],
        review: undefined,
        errorCode: compiled.gate.blocked ? compiled.gate.errors[0]?.code : undefined,
        errorMessage: compiled.gate.blocked ? compiled.gate.errors[0]?.message : undefined,
      };
      await store.saveRun(run);
      const history = await store.readRetryHistory(parent.runId);
      history.push({
        retryRunId: runId,
        parentRunId: parent.runId,
        mode: options.mode,
        createdAt: now,
        ...(options.mode === 'edited_prompt'
          ? { promptDiffSummary: `edited_prompt (${compiled.compiledPromptMarkdown.length} chars)` }
          : {}),
      });
      await store.writeRetryHistory(parent.runId, history);
      emit(run);
      if (options.dryRun || run.gate.blocked) return run;
      return executeLive(run, {
        apiKey: options.apiKey,
        apiProfileId: options.apiProfileId || parent.apiProfileId,
      });
    }

    const now = nowFn();
    const ctx = await deps.loadContext({
      referenceRunId: persistedTask.sourceReferenceAnchorRunId,
      projectId: parent.projectId,
    });

    const size = persistedTask.parameters?.size ?? DEFAULT_SIZE;
    const region: ImageProviderRegion = persistedTask.region ?? 'beijing';
    const modelId = persistedTask.modelId ?? DASHSCOPE_CAPABILITIES.modelId;
    const providerConfig = await resolveProviderConfig({
      apiKey: options.apiKey,
      apiProfileId: options.apiProfileId || parent.apiProfileId,
      modelId,
    });
    const apiKey = providerConfig.apiKey;
    const endpoint = endpointFor(region, providerConfig.baseUrl);
    const gateApiKey = apiKey ?? (options.dryRun ? 'DRY_RUN_PLACEHOLDER' : '');
    const runId = crypto.randomUUID();
    const taskId = `igt-${runId.slice(0, 8)}`;

    const compiled = compileTask({
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
      ...(providerConfig.profileId ? { apiProfileId: providerConfig.profileId } : {}),
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
      apiProfileId: options.apiProfileId || parent.apiProfileId,
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
    const root = await rootForRun(run);
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

  async function readPromptSnapshot(runId: string, projectId: string): Promise<GenerationPromptSnapshot | null> {
    const raw = await storeFor(projectId).readSnapshot(runId);
    if (!raw || (raw as { schemaVersion?: string }).schemaVersion !== '6.0') return null;
    try {
      return validateGenerationPromptSnapshot(raw) as GenerationPromptSnapshot;
    } catch {
      return null;
    }
  }

  return {
    compile,
    start,
    startPromptSnapshot,
    startCompiledCreativeTask,
    startBenchmark,
    listBenchmarks,
    saveBenchmarkEvaluation,
    retry,
    cancel,
    getRun,
    listRuns,
    saveReview,
    openFolder,
    onRunUpdated,
    resume,
    recoverAll,
    runRoot,
    readImageDataUrl,
    readPromptSnapshot,
    getCapabilities,
    getPresetCapabilities,
    getSourcePreview,
    toProgress,
  };
}

export type ImageGenerationService = ReturnType<typeof createImageGenerationService>;
export { RunStoreError };
