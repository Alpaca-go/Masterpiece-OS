import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { AnalysisProgress, AnalysisResult } from '../shared/types';
import { redactSecret } from './analysis-contract';
import { buildBrandDnaCoreReportFilename, buildBrandDnaReportFilename } from './brand-dna-contract';
import type { ProjectStore } from './project-store';
import type { ProviderCredentials } from './settings-store';

// Bundled from the repository core. Desktop remains the consumer, never the dependency.
// @ts-ignore JavaScript core module intentionally has no TypeScript declaration file.
import { createOpenAICompatibleTextReasoner } from '../../../../src/v5/adapters/openai-compatible-text-reasoner.js';
// @ts-ignore JavaScript core module intentionally has no TypeScript declaration file.
import { runBrandDnaPipeline } from '../../../../src/v5/brand-dna/run-brand-dna-pipeline.js';
// @ts-ignore JavaScript core module intentionally has no TypeScript declaration file.
import { BRAND_DNA_PROTOCOL } from '../../../../src/v5/brand-dna/protocol-config.js';

type ProgressSink = (progress: AnalysisProgress) => void;
type CredentialsReader = (profileId?: string) => Promise<ProviderCredentials>;

interface ActiveRun {
  controller: AbortController;
  startedAt: string;
}

interface CoreDelivery {
  brandDna: any;
  reportMarkdown: string;
  filename: string;
  outputPath: string;
}

function digest(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function looksInternalDocumentName(value: unknown): boolean {
  return /^[0-9a-f]{8}-[0-9a-f-]{27,}(?:\.[a-z0-9]+)?$/i.test(String(value || '').trim());
}

function renderExtensionStatus(
  markdown: string,
  stages: Record<string, unknown>,
  failureMessage: string
): string {
  const statusItems: Array<[string, string]> = [
    ['creative-thesis-decision', '选择唯一创意命题'],
    ['visual-causal-translation', '将 DNA 基因因果映射为视觉变量并建立统一 Image System'],
    ['gpt-image-task-compiler', '编译 4～8 个生图任务']
  ];
  const items = statusItems.map(([stage, label]) =>
    `- ${Object.prototype.hasOwnProperty.call(stages, stage) ? '✓ 已完成' : '○ 待继续'}：${label}`
  );
  return markdown.replace(
    /## 8\. 下一阶段[\s\S]*$/,
    `## 8. 创意扩展进度\n\n${items.join('\n')}\n\n> 当前中断原因：${failureMessage}\n`
  );
}

async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rm(filePath, { force: true });
  await fs.rename(temporary, filePath);
}

function friendlyError(error: Error & { code?: string; details?: { httpStatus?: number } }, credentials: ProviderCredentials): string {
  const message = redactSecret(error.message, credentials.apiKey);
  if (/401|403|API Key|unauthorized|forbidden/i.test(message)) return 'API Key 无效或无权访问当前模型';
  if (/404|model.*not found|does not exist/i.test(message)) return 'Model ID 或 Base URL 不存在';
  if (/TIME_BUDGET_EXCEEDED|超时|aborted|abort/i.test(message)) return '分析超时或已被取消';
  if (/empty|空内容/i.test(message)) return '模型返回空内容，未生成报告';
  if (error.code === 'API_ERROR' || error.code === 'REQUEST_FAILED') {
    return `模型 API 请求失败
Provider：${credentials.provider}
Model：${credentials.model}
HTTP：${error.details?.httpStatus || '未返回'}
原因：${message}`;
  }
  return message;
}

export function createBrandDnaPipelineService(
  projects: ProjectStore,
  readCredentials: CredentialsReader,
  emitProgress: ProgressSink
) {
  const active = new Map<string, ActiveRun>();

  async function start(projectId: string, _forceReasoning = true, apiProfileId?: string): Promise<AnalysisResult> {
    if (active.has(projectId)) throw new Error('该项目正在分析中');
    const project = await projects.get(projectId);
    if (project.mode !== 'brand-dna') throw new Error('当前项目不是品牌 DNA 分析模式');
    const credentials = await readCredentials(apiProfileId || project.apiProfileId || undefined);
    const projectPaths = await projects.paths(projectId);
    const controller = new AbortController();
    const startedAt = new Date().toISOString();
    const started = performance.now();
    let currentStage: AnalysisProgress['stage'] = 'preparing-documents';
    let documentCount = project.documents.length;
    const coreState: { delivery: CoreDelivery | null } = { delivery: null };
    let latestCheckpointStages: Record<string, unknown> = {};
    active.set(projectId, { controller, startedAt });

    const progress = (
      stage: AnalysisProgress['stage'],
      message: string,
      extra: Partial<AnalysisProgress> = {}
    ) => {
      currentStage = stage;
      emitProgress({
        projectId,
        mode: 'brand-dna',
        stage,
        message,
        startedAt,
        elapsedMs: Math.round(performance.now() - started),
        assetCount: documentCount,
        model: credentials.model,
        ...extra
      });
    };

    await projects.update(projectId, {
      status: 'running',
      provider: credentials.provider,
      model: credentials.model,
      apiProfileId: credentials.profileId,
      reasoningQualityTier: credentials.qualityTier,
      lastError: null
    });

    try {
      progress('preparing-documents', '正在整理品牌策划文档');
      progress('parsing-documents', '正在解析 PDF、DOCX、Markdown 与文本内容');
      const summary = await projects.scanDocuments(projectId, controller.signal);
      documentCount = summary.totalFiles;
      if (!summary.totalFiles) throw new Error('项目文档为空，请先上传品牌策划文档');
      if (!summary.parsedCount) throw new Error('没有可用于分析的有效文档文本');
      if (controller.signal.aborted) throw new DOMException('用户主动取消', 'AbortError');

      const corpus = await projects.loadBrandCorpus(projectId, controller.signal);
      const checkpointPath = path.join(projectPaths.runtime, 'brand-dna-checkpoint.json');
      const checkpointManifest = {
        version: 1,
        protocolVersion: BRAND_DNA_PROTOCOL.protocolVersion,
        corpusDigest: digest(corpus.documents.map((document: any) => ({
          id: document.id,
          filename: document.filename,
          rawText: document.rawText,
          sections: document.sections
        }))),
        provider: credentials.provider,
        model: credentials.model,
        baseUrlDigest: digest(credentials.baseUrl),
        qualityTier: credentials.qualityTier
      };
      let checkpointState: { manifest: typeof checkpointManifest; stages: Record<string, unknown>; updatedAt: string } = {
        manifest: checkpointManifest,
        stages: {},
        updatedAt: new Date().toISOString()
      };
      try {
        const saved = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
        if (digest(saved?.manifest) === digest(checkpointManifest) && saved?.stages && typeof saved.stages === 'object') {
          checkpointState = saved;
        }
      } catch {
        // Missing, stale or malformed checkpoints are ignored; the pipeline restarts safely.
      }
      latestCheckpointStages = checkpointState.stages;
      const originalNames = new Map(project.documents.map((document) => [document.id, document.originalName]));
      for (const document of corpus.documents as any[]) {
        const originalName = originalNames.get(document.id);
        if (!originalName) continue;
        document.filename = originalName;
        if (looksInternalDocumentName(document.title)) {
          document.title = path.basename(originalName, path.extname(originalName));
        }
      }
      for (const source of corpus.sourceIndex as any[]) {
        source.filename = originalNames.get(source.documentId) || source.filename;
      }
      const savedEvidence = checkpointState.stages['atomic-evidence'] as any;
      for (const chunk of savedEvidence?.chunks || []) {
        const originalName = originalNames.get(chunk.sourceId);
        if (!originalName) continue;
        chunk.filename = originalName;
        if (looksInternalDocumentName(chunk.documentTitle)) {
          chunk.documentTitle = path.basename(originalName, path.extname(originalName));
        }
      }
      const reasoner = createOpenAICompatibleTextReasoner({
        apiKey: credentials.apiKey,
        model: credentials.model,
        baseUrl: credentials.baseUrl,
        provider: credentials.provider
      });
      const execution = await runBrandDnaPipeline({
        corpus,
        projectNameHint: project.projectName,
        abortSignal: controller.signal,
        qualityTier: credentials.qualityTier,
        reasoner,
        resumeStages: checkpointState.stages,
        async onCheckpoint(stageName: string, value: unknown) {
          checkpointState.stages[stageName] = value;
          checkpointState.updatedAt = new Date().toISOString();
          await writeJsonAtomic(checkpointPath, checkpointState);
        },
        async onCoreComplete(core: { brandDna: any; reportMarkdown: string }) {
          const coreProjectName = core.brandDna.projectName?.status === 'missing'
            ? project.projectName
            : core.brandDna.projectName?.value || project.projectName;
          const filename = buildBrandDnaCoreReportFilename(coreProjectName, credentials.model);
          const outputPath = path.join(projectPaths.outputs, filename);
          await writeJsonAtomic(path.join(projectPaths.runtime, 'brand-dna-core.json'), core.brandDna);
          await fs.writeFile(outputPath, core.reportMarkdown, 'utf8');
          coreState.delivery = { ...core, filename, outputPath };
        },
        onProgress(event: { stage: AnalysisProgress['stage']; message: string; elapsedMs?: number }) {
          progress(event.stage, event.message);
        }
      });
      if (controller.signal.aborted) throw new DOMException('用户主动取消', 'AbortError');

      const finalProjectName = String(execution.projectName || project.projectName).trim() || project.projectName;
      const filename = buildBrandDnaReportFilename(finalProjectName, credentials.model);
      const outputPath = path.join(projectPaths.outputs, filename);
      const brandDnaPath = path.join(projectPaths.runtime, 'brand-dna.json');
      await fs.writeFile(brandDnaPath, `${JSON.stringify(execution.brandDna, null, 2)}\n`, 'utf8');
      const intermediatesPath = path.join(projectPaths.runtime, 'brand-dna-intermediates.json');
      await fs.writeFile(intermediatesPath, `${JSON.stringify(execution.intermediateObjects, null, 2)}\n`, 'utf8');
      const completedAt = new Date().toISOString();
      const durationMs = Math.round(performance.now() - started);
      const runtimeReportPath = path.join(projectPaths.runtime, 'run-report.json');
      await fs.writeFile(runtimeReportPath, `${JSON.stringify({
        version: '5.0',
        mode: 'brand-dna',
        analysisProfile: 'brand-dna',
        desktopProjectId: projectId,
        apiProfileId: credentials.profileId,
        provider: execution.provider || credentials.provider,
        model: execution.modelId || credentials.model,
        startedAt,
        completedAt,
        durationMs,
        documentCount: summary.totalFiles,
        parsedDocumentCount: summary.parsedCount,
        retryCount: execution.retryCount,
        schemaRetryCount: execution.schemaRetryCount,
        qualityRepairCount: execution.qualityRepairCount,
        qualityTier: execution.qualityTier,
        deepBenchmarkPassed: execution.deepBenchmarkPassed,
        qualityAudit: execution.qualityAudit,
        protocolMetadata: execution.metadata,
        warnings: execution.warnings,
        outputFile: filename,
        brandDnaFile: path.basename(brandDnaPath),
        intermediateObjectsFile: path.basename(intermediatesPath)
      }, null, 2)}\n`, 'utf8');
      await fs.writeFile(outputPath, execution.reportMarkdown, 'utf8');
      if (coreState.delivery && coreState.delivery.outputPath !== outputPath) {
        await fs.rm(coreState.delivery.outputPath, { force: true });
      }
      if (project.lastReportFilename && project.lastReportFilename !== filename) {
        await fs.rm(path.join(projectPaths.outputs, path.basename(project.lastReportFilename)), { force: true });
      }

      const brandName = execution.brandDna.brandName?.status === 'missing'
        ? finalProjectName
        : execution.brandDna.brandName?.value || finalProjectName;
      const category = execution.brandDna.category?.status === 'missing'
        ? project.industry
        : execution.brandDna.category?.value || project.industry;
      const updated = await projects.update(projectId, {
        projectName: finalProjectName,
        detectedProjectName: finalProjectName,
        projectNameConfidence: 0.9,
        brandName,
        detectedBrandName: brandName,
        industry: category,
        detectedIndustry: category,
        factConfidence: { brandName: 0.9, industry: 0.8 },
        status: 'completed',
        provider: credentials.provider,
        model: credentials.model,
        apiProfileId: credentials.profileId,
        reasoningQualityTier: credentials.qualityTier,
        lastRunAt: completedAt,
        lastDurationMs: durationMs,
        lastReportFilename: filename,
        lastError: null,
        assetCount: summary.totalFiles,
        imageCount: 0
      });
      progress('completed', '品牌 DNA 分析完成');
      return {
        project: updated,
        mode: 'brand-dna',
        reportFilename: filename,
        reportPath: outputPath,
        runtimeReportPath,
        apiProfileId: credentials.profileId,
        provider: execution.provider || credentials.provider,
        model: execution.modelId || credentials.model,
        durationMs,
        assetCount: summary.totalFiles,
        imageCount: 0,
        reasoningCacheHit: false,
        warnings: execution.warnings
      };
    } catch (error) {
      const cancelled = controller.signal.aborted || (error as Error).name === 'AbortError';
      const typedError = error as Error & {
        code?: string;
        audit?: Record<string, unknown>;
        details?: { httpStatus?: number };
      };
      const message = cancelled ? '用户已取消分析' : friendlyError(typedError, credentials);
      const code = typedError.code;
      if (!cancelled && coreState.delivery) {
        const delivery = coreState.delivery;
        const completedAt = new Date().toISOString();
        const durationMs = Math.round(performance.now() - started);
        const continuationMessage = `核心品牌 DNA 已完成并保存；创意视觉扩展在“${currentStage}”阶段中断：${message}。再次分析将从阶段存档继续。`;
        delivery.reportMarkdown = renderExtensionStatus(delivery.reportMarkdown, latestCheckpointStages, message);
        await fs.writeFile(delivery.outputPath, delivery.reportMarkdown, 'utf8');
        const runtimeReportPath = path.join(projectPaths.runtime, 'run-report.json');
        await writeJsonAtomic(runtimeReportPath, {
          version: '5.0',
          mode: 'brand-dna',
          analysisProfile: 'brand-dna',
          status: 'completed-core',
          desktopProjectId: projectId,
          apiProfileId: credentials.profileId,
          provider: credentials.provider,
          model: credentials.model,
          qualityTier: credentials.qualityTier,
          startedAt,
          completedAt,
          durationMs,
          extensionFailedStage: currentStage,
          extensionErrorCode: code || 'EXTENSION_FAILED',
          extensionError: message,
          outputFile: delivery.filename,
          brandDnaFile: 'brand-dna-core.json',
          checkpointFile: 'brand-dna-checkpoint.json'
        }).catch(() => {});
        const coreProjectName = delivery.brandDna.projectName?.status === 'missing'
          ? project.projectName
          : delivery.brandDna.projectName?.value || project.projectName;
        const brandName = delivery.brandDna.brandName?.status === 'missing'
          ? coreProjectName
          : delivery.brandDna.brandName?.value || coreProjectName;
        const category = delivery.brandDna.category?.status === 'missing'
          ? project.industry
          : delivery.brandDna.category?.value || project.industry;
        const updated = await projects.update(projectId, {
          projectName: coreProjectName,
          detectedProjectName: coreProjectName,
          projectNameConfidence: 0.9,
          brandName,
          detectedBrandName: brandName,
          industry: category,
          detectedIndustry: category,
          factConfidence: { brandName: 0.9, industry: 0.8 },
          status: 'completed-core',
          provider: credentials.provider,
          model: credentials.model,
          apiProfileId: credentials.profileId,
          reasoningQualityTier: credentials.qualityTier,
          lastRunAt: completedAt,
          lastDurationMs: durationMs,
          lastReportFilename: delivery.filename,
          lastError: continuationMessage,
          assetCount: documentCount,
          imageCount: 0
        });
        progress('completed', '品牌 DNA 核心分析已完成；创意视觉扩展可继续');
        return {
          project: updated,
          mode: 'brand-dna',
          reportFilename: delivery.filename,
          reportPath: delivery.outputPath,
          runtimeReportPath,
          apiProfileId: credentials.profileId,
          provider: credentials.provider,
          model: credentials.model,
          durationMs,
          assetCount: documentCount,
          imageCount: 0,
          reasoningCacheHit: false,
          warnings: [continuationMessage]
        };
      }
      const status = cancelled
        ? 'cancelled'
        : code === 'FAILED_QUALITY_GATE'
          ? 'failed-quality-gate'
          : code === 'FAILED_SCHEMA'
            ? 'failed-schema'
            : code === 'UNSUPPORTED_MODEL_TIER'
              ? 'unsupported-model-tier'
              : 'failed';
      await fs.writeFile(path.join(projectPaths.runtime, 'run-report.json'), `${JSON.stringify({
        version: '5.0',
        mode: 'brand-dna',
        analysisProfile: 'brand-dna',
        status,
        desktopProjectId: projectId,
        apiProfileId: credentials.profileId,
        provider: credentials.provider,
        model: credentials.model,
        qualityTier: credentials.qualityTier,
        startedAt,
        failedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - started),
        failedStage: currentStage,
        errorCode: code || 'ANALYSIS_FAILED',
        error: message,
        qualityAudit: typedError.audit || null
      }, null, 2)}\n`, 'utf8').catch(() => {});
      await projects.update(projectId, { status, lastError: message });
      progress(cancelled ? 'cancelled' : 'failed', cancelled ? '分析已取消' : `分析失败：${message}`, {
        failedAtStage: currentStage as Exclude<AnalysisProgress['stage'], 'failed' | 'cancelled' | 'completed'>
      });
      throw new Error(message);
    } finally {
      active.delete(projectId);
    }
  }

  function cancel(projectId: string): boolean {
    const run = active.get(projectId);
    if (!run) return false;
    run.controller.abort();
    return true;
  }

  return { start, cancel };
}

export type BrandDnaPipelineService = ReturnType<typeof createBrandDnaPipelineService>;
