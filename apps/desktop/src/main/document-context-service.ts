import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  DocumentContextProgress,
  DocumentContextRun,
  DocumentContextRunStatus,
  DocumentContextStage,
  DocumentContextWarning,
  DocumentVisualContext,
  DocumentVisualContextResult,
  PublicSettings,
  VisualStrategyCorpus,
  VisualTranslationDocumentSummary
} from '../shared/types';
import { buildVisualStrategyCorpus, parseStrategyDocument } from './document-processing.ts';
import { assertInside } from './analysis-contract.ts';
import type { ProviderCredentials } from './settings-store';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import { appendRuntimeEvent } from './runtime/event-log.ts';
import { RunWriteCoordinator } from './runtime/run-write-coordinator.ts';
import {
  adaptLegacyVisualTranslationResult,
  buildExtractionMessages,
  buildRepairMessages,
  compileContextBrief,
  isContextEmpty,
  normalizeExtractedContext,
  parseModelJson,
  validateDocumentVisualContext
} from './document-context-core.ts';
import { deriveDocumentProjectName } from './document-project-name.ts';

// Bundled from the repository core. Desktop owns persistence and user interaction only.
// @ts-ignore JavaScript core module intentionally has no TypeScript declaration file.
import { createOpenAICompatibleTextReasoner } from '../../../../packages/model-runtime/src/openai-compatible-text-reasoner.js';
// @ts-ignore JavaScript core module intentionally has no TypeScript declaration file.
import { classifyDocumentRole } from '../../../../packages/document-ingestion/src/document-preparation.js';

type CredentialsReader = (profileId?: string) => Promise<ProviderCredentials>;
type SettingsReader = () => Promise<PublicSettings>;
type ProgressSink = (progress: DocumentContextProgress) => void;
type TextReasonerFactory = (options: { apiKey: string; model: string; provider: string; baseUrl: string }) => (messages: any, context?: any) => Promise<any>;

interface ActiveRun {
  controller: AbortController;
  startedAt: string;
}

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.md', '.markdown', '.txt']);
const DOCUMENT_ROLES = new Set(['brand-strategy', 'creative-brief', 'visual-guideline', 'product-information', 'market-research', 'reference', 'unknown']);
const BRIEF_FILENAME = '项目视觉上下文简报.md';
const CONTEXT_FILENAME = 'document-visual-context.json';

// 应用运行期间才可能处于这些状态；重启后发现它们即为僵尸任务
const EXECUTING_STATUSES: ReadonlySet<DocumentContextRunStatus> = new Set(['pending', 'parsing', 'extracting', 'repairing']);

const STAGE_MESSAGES: Record<DocumentContextStage, string> = {
  '00-document-preparation': '正在解析与归一化策略文档',
  '01-document-role-index': '正在识别文档角色与事实优先级',
  '02-visual-context-extraction': '正在提取与视觉设计相关的项目事实',
  '03-local-normalization': '正在本地归一化提取结果',
  '04-human-confirmation': '等待人工确认提取结果',
  '05-local-brief-compiler': '正在本地编译项目视觉上下文简报'
};

const ORPHANED_RUN_MESSAGE = '应用在任务运行期间异常退出，任务已自动标记为失败；可以恢复或删除。';

function safeRunId(runId: string): string {
  if (!/^[a-f0-9-]{36}$/i.test(runId)) throw new Error('Document Context Run ID 无效');
  return runId;
}

function blockingError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw blockingError('DOCUMENT_CONTEXT_WRITE_FAILED', `写入文件失败（${path.basename(filename)}）：${result.errorMessage}`);
  }
}

async function readJson<T>(filename: string): Promise<T> {
  return JSON.parse(await fs.readFile(filename, 'utf8')) as T;
}

export function createDocumentContextService(
  readCredentials: CredentialsReader,
  readSettings: SettingsReader,
  emitProgress: ProgressSink,
  reasonerFactory: TextReasonerFactory = createOpenAICompatibleTextReasoner
) {
  const active = new Map<string, ActiveRun>();
  const writeCoordinator = new RunWriteCoordinator((metrics) => {
    console.info(JSON.stringify({ event: metrics.success ? 'DOC_CONTEXT_WRITE_SUCCEEDED' : 'DOC_CONTEXT_WRITE_FAILED', run_id: metrics.runId, operation: metrics.operation, write_duration_ms: metrics.durationMs }));
  });

  async function dataRoot(): Promise<string> {
    const settings = await readSettings();
    return path.join(path.resolve(settings.defaultDataPath), 'document-runs');
  }

  async function runRoot(runId: string): Promise<string> {
    return path.join(await dataRoot(), safeRunId(runId));
  }

  async function recordPath(runId: string): Promise<string> {
    return path.join(await runRoot(runId), 'runtime', 'run.json');
  }

  async function rawSaveRun(record: DocumentContextRun): Promise<DocumentContextRun> {
    await writeJson(await recordPath(record.id), record);
    return record;
  }

  async function saveRun(record: DocumentContextRun): Promise<DocumentContextRun> {
    return writeCoordinator.enqueue(record.id, 'run-projection', () => rawSaveRun(record));
  }

  async function readRun(runId: string): Promise<DocumentContextRun> {
    return readJson<DocumentContextRun>(await recordPath(runId));
  }

  /** 僵尸任务自动降级：磁盘记录为执行中状态但内存 active 表不存在 → 应用曾异常退出。 */
  async function reconcileOrphanedRun(record: DocumentContextRun): Promise<DocumentContextRun> {
    const executing = EXECUTING_STATUSES.has(record.status) || record.status === 'compiling';
    if (!executing || active.has(record.id)) return record;
    // 有 extracted checkpoint 的任务回到确认页而非直接失败（§13 恢复逻辑）
    const extractedPath = path.join(await runRoot(record.id), 'intermediate', 'extracted-context.json');
    const hasExtracted = await fs.access(extractedPath).then(() => true).catch(() => false);
    const downgraded: DocumentContextRun = hasExtracted
      ? { ...record, status: 'awaiting_confirmation', currentStage: '04-human-confirmation', lastError: null }
      : { ...record, status: 'failed', errorCode: record.errorCode || 'DOCUMENT_CONTEXT_MODEL_FAILED', lastError: record.lastError || ORPHANED_RUN_MESSAGE };
    try {
      const saved = await saveRun(downgraded);
      await appendRuntimeEvent(path.join(await runRoot(record.id), 'runtime'), record.id, 'ORPHANED_RUN_RECONCILED', { previous_status: record.status, next_status: downgraded.status });
      return saved;
    } catch {
      return downgraded;
    }
  }

  async function getRun(runId: string): Promise<DocumentContextRun> {
    const record = await readRun(runId).catch(() => null);
    if (!record) throw new Error('Document Context 运行记录不存在');
    return reconcileOrphanedRun(record);
  }

  async function listRuns(): Promise<DocumentContextRun[]> {
    const root = await dataRoot();
    const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
    const records = await Promise.all(entries.filter((entry) => entry.isDirectory() && /^[a-f0-9-]{36}$/i.test(entry.name)).map((entry) => getRun(entry.name).catch(() => null)));
    return records.filter((record): record is DocumentContextRun => Boolean(record)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async function inspectDocuments(paths: string[]): Promise<VisualTranslationDocumentSummary[]> {
    const unique = [...new Set(paths.map((filename) => path.resolve(filename)))];
    if (!unique.length) return [];
    return Promise.all(unique.map(async (filename) => {
      if (!SUPPORTED_EXTENSIONS.has(path.extname(filename).toLowerCase())) throw new Error(`不支持的文档格式：${path.basename(filename)}`);
      const document = await parseStrategyDocument(filename);
      return {
        path: filename,
        filename: document.filename,
        sourceType: document.sourceType,
        title: document.title,
        characterCount: document.characterCount,
        pageCount: document.pageCount,
        warnings: document.parseWarnings
      };
    }));
  }

  function emit(record: DocumentContextRun, stage: DocumentContextStage, startedAt: string, startedTick: number): void {
    emitProgress({
      runId: record.id,
      projectName: record.projectName,
      stage,
      status: record.status,
      message: STAGE_MESSAGES[stage],
      startedAt,
      elapsedMs: Math.round(performance.now() - startedTick),
      model: record.model
    });
  }

  /** 00-document-preparation + 01-document-role-index */
  async function prepareCorpus(runId: string, paths: string[]): Promise<VisualStrategyCorpus> {
    const root = await runRoot(runId);
    const inputRoot = path.join(root, 'input');
    await fs.mkdir(inputRoot, { recursive: true });
    const unique = [...new Set(paths.map((filename) => path.resolve(filename)))];
    if (!unique.length) throw blockingError('DOCUMENT_PARSE_FAILED', '请至少选择一个策略文档');
    const documents = [];
    try {
      for (let index = 0; index < unique.length; index += 1) {
        const source = unique[index]!;
        if (!SUPPORTED_EXTENSIONS.has(path.extname(source).toLowerCase())) throw new Error(`不支持的文档格式：${path.basename(source)}`);
        const stat = await fs.stat(source).catch(() => null);
        if (!stat || !stat.isFile()) throw new Error(`文档不存在：${path.basename(source)}`);
        const target = path.join(inputRoot, `${String(index + 1).padStart(2, '0')}-${path.basename(source)}`);
        if (path.resolve(source) !== path.resolve(target)) await fs.copyFile(source, target);
        const document = await parseStrategyDocument(target);
        // 01-document-role-index：规则分类，仅用于事实优先级
        const classification = classifyDocumentRole({ id: document.id, filename: document.filename, title: document.title, content: document.rawText });
        const role = typeof classification.role === 'string' ? classification.role : 'unknown';
        document.documentRole = (DOCUMENT_ROLES.has(role) ? role : 'unknown') as NonNullable<typeof document.documentRole>;
        documents.push(document);
      }
    } catch (error) {
      if ((error as { code?: string }).code === 'DOCUMENT_CONTEXT_WRITE_FAILED') throw error;
      throw blockingError('DOCUMENT_PARSE_FAILED', (error as Error).message);
    }
    const corpus = buildVisualStrategyCorpus(documents);
    if (!corpus.mergedText.trim()) throw blockingError('DOCUMENT_PARSE_FAILED', '文档内容为空，无法提取项目视觉上下文');
    await writeJson(path.join(root, 'intermediate', 'normalized-corpus.json'), corpus);
    return corpus;
  }

  /** 02-visual-context-extraction（1 次模型调用 + 最多 1 次 Repair）+ 03-local-normalization */
  async function extract(record: DocumentContextRun, corpus: VisualStrategyCorpus, credentials: ProviderCredentials): Promise<DocumentContextRun> {
    if (active.has(record.id)) throw new Error('该文档分析任务正在运行');
    const controller = new AbortController();
    const startedAt = new Date().toISOString();
    const startedTick = performance.now();
    active.set(record.id, { controller, startedAt });
    const root = await runRoot(record.id);
    let modelCallCount = 0;
    let repairCount = 0;
    try {
      const reasoner = reasonerFactory({ apiKey: credentials.apiKey, model: credentials.model, provider: credentials.provider, baseUrl: credentials.baseUrl });
      let running: DocumentContextRun = {
        ...record,
        status: 'extracting',
        currentStage: '02-visual-context-extraction',
        apiProfileId: credentials.profileId,
        provider: credentials.provider,
        model: credentials.model,
        startedAt,
        errorCode: null,
        lastError: null
      };
      running = await saveRun(running);
      emit(running, '02-visual-context-extraction', startedAt, startedTick);

      const messages = buildExtractionMessages(corpus);
      let responseText = '';
      try {
        const response = await reasoner(messages, { signal: controller.signal, maxOutputTokens: 8192 });
        modelCallCount += 1;
        responseText = String(response?.text || '');
      } catch (error) {
        if (controller.signal.aborted || (error as Error).name === 'AbortError') throw error;
        throw blockingError('DOCUMENT_CONTEXT_MODEL_FAILED', `模型调用失败：${(error as Error).message}`);
      }

      let raw: Record<string, unknown> | null = null;
      let firstErrors: string[] = [];
      try {
        raw = parseModelJson(responseText);
      } catch (error) {
        firstErrors = [(error as Error).message];
      }

      if (!raw) {
        // 允许 1 次 Repair，仍失败则明确报错（禁止多次自动修复）
        repairCount = 1;
        running = await saveRun({ ...running, status: 'repairing', repairCount });
        emit(running, '02-visual-context-extraction', startedAt, startedTick);
        let repairText = '';
        try {
          const response = await reasoner(buildRepairMessages(responseText, firstErrors), { signal: controller.signal, maxOutputTokens: 8192 });
          modelCallCount += 1;
          repairText = String(response?.text || '');
        } catch (error) {
          if (controller.signal.aborted || (error as Error).name === 'AbortError') throw error;
          throw blockingError('DOCUMENT_CONTEXT_REPAIR_FAILED', `Repair 模型调用失败：${(error as Error).message}`);
        }
        try {
          raw = parseModelJson(repairText);
        } catch (error) {
          throw blockingError('DOCUMENT_CONTEXT_REPAIR_FAILED', `Repair 后输出仍无法解析：${(error as Error).message}`);
        }
      }

      // 03-local-normalization（确定性，零模型调用）
      emit({ ...running, status: 'extracting' }, '03-local-normalization', startedAt, startedTick);
      const { context, warnings } = normalizeExtractedContext(raw, corpus, record.id);
      if (isContextEmpty(context)) {
        throw blockingError('DOCUMENT_CONTEXT_EMPTY', '未能从文档中提取到任何与视觉设计相关的项目事实');
      }
      const validation = validateDocumentVisualContext(context);
      if (!validation.valid) {
        throw blockingError('DOCUMENT_CONTEXT_SCHEMA_INVALID', `提取结果未通过 Schema 校验：${validation.errors.join('；')}`);
      }
      await writeJson(path.join(root, 'intermediate', 'extracted-context.json'), { context, warnings });

      const awaiting: DocumentContextRun = {
        ...running,
        status: 'awaiting_confirmation',
        currentStage: '04-human-confirmation',
        modelCallCount: (record.modelCallCount || 0) + modelCallCount,
        repairCount,
        warnings,
        errorCode: null,
        lastError: null
      };
      const saved = await saveRun(awaiting);
      emit(saved, '04-human-confirmation', startedAt, startedTick);
      await appendRuntimeEvent(path.join(root, 'runtime'), record.id, 'CONTEXT_EXTRACTED', { model_calls: modelCallCount, repairs: repairCount, warnings: warnings.length }).catch(() => undefined);
      return saved;
    } catch (error) {
      const cancelled = controller.signal.aborted || (error as Error).name === 'AbortError';
      const failed: DocumentContextRun = {
        ...record,
        status: cancelled ? 'cancelled' : 'failed',
        completedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - startedTick),
        modelCallCount: (record.modelCallCount || 0) + modelCallCount,
        repairCount,
        errorCode: cancelled ? null : (error as { code?: string }).code || 'DOCUMENT_CONTEXT_MODEL_FAILED',
        lastError: cancelled ? '用户已取消分析' : (error as Error).message
      };
      await saveRun(failed).catch(() => undefined);
      throw error;
    } finally {
      active.delete(record.id);
    }
  }

  async function start(paths: string[], profileId: string): Promise<DocumentContextRun> {
    const credentials = await readCredentials(profileId);
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const startedTick = performance.now();
    let record: DocumentContextRun = {
      id,
      mode: 'context_extraction',
      projectName: '文档上下文提取',
      status: 'parsing',
      apiProfileId: credentials.profileId,
      provider: credentials.provider,
      model: credentials.model,
      documentCount: paths.length,
      documentNames: paths.map((filename) => path.basename(filename)),
      createdAt,
      startedAt: createdAt,
      currentStage: '00-document-preparation',
      modelCallCount: 0,
      repairCount: 0,
      warnings: [],
      errorCode: null,
      lastError: null,
      briefFilename: null
    };
    record = await saveRun(record);
    await appendRuntimeEvent(path.join(await runRoot(id), 'runtime'), id, 'RUN_CREATED', { mode: 'context_extraction' }).catch(() => undefined);
    emit(record, '00-document-preparation', createdAt, startedTick);
    let corpus: VisualStrategyCorpus;
    try {
      corpus = await prepareCorpus(id, paths);
    } catch (error) {
      const failed: DocumentContextRun = { ...record, status: 'failed', errorCode: (error as { code?: string }).code || 'DOCUMENT_PARSE_FAILED', lastError: (error as Error).message, completedAt: new Date().toISOString() };
      await saveRun(failed).catch(() => undefined);
      throw error;
    }
    record = await saveRun({
      ...record,
      projectName: deriveDocumentProjectName(corpus),
      documentCount: corpus.documents.length,
      documentNames: corpus.documents.map((document) => document.filename.replace(/^\d{2}-/, '')),
      currentStage: '01-document-role-index'
    });
    emit(record, '01-document-role-index', createdAt, startedTick);
    return extract(record, corpus, credentials);
  }

  async function readExtracted(runId: string): Promise<{ context: DocumentVisualContext; warnings: DocumentContextWarning[] }> {
    const root = await runRoot(runId);
    const confirmed = await readJson<{ context: DocumentVisualContext }>(path.join(root, 'intermediate', 'confirmed-context.json')).catch(() => null);
    if (confirmed?.context) return { context: confirmed.context, warnings: [] };
    const extracted = await readJson<{ context: DocumentVisualContext; warnings?: DocumentContextWarning[] }>(path.join(root, 'intermediate', 'extracted-context.json')).catch(() => null);
    if (!extracted?.context) throw new Error('该任务尚未生成可确认的提取结果');
    return { context: extracted.context, warnings: extracted.warnings || [] };
  }

  async function getExtracted(runId: string): Promise<DocumentVisualContext> {
    return (await readExtracted(safeRunId(runId))).context;
  }

  /** 04-human-confirmation：写入用户确认结果（用户修改覆盖模型结果） */
  async function confirm(runId: string, context: DocumentVisualContext): Promise<DocumentContextRun> {
    const record = await getRun(runId);
    if (!['awaiting_confirmation', 'compiling', 'completed'].includes(record.status)) {
      throw new Error(`当前状态（${record.status}）不允许确认提取结果`);
    }
    const normalized: DocumentVisualContext = { ...context, schemaVersion: '1.0', sourceRunId: record.id };
    const validation = validateDocumentVisualContext(normalized);
    if (!validation.valid) {
      throw blockingError('DOCUMENT_CONTEXT_SCHEMA_INVALID', `确认结果未通过 Schema 校验：${validation.errors.join('；')}`);
    }
    const root = await runRoot(runId);
    await writeJson(path.join(root, 'intermediate', 'confirmed-context.json'), { context: normalized, confirmedAt: new Date().toISOString() });
    await appendRuntimeEvent(path.join(root, 'runtime'), runId, 'CONTEXT_CONFIRMED', {}).catch(() => undefined);
    return saveRun({ ...record, status: 'compiling', currentStage: '05-local-brief-compiler', errorCode: null, lastError: null });
  }

  /** 05-local-brief-compiler：本地编译，零模型调用 */
  async function compile(runId: string): Promise<DocumentVisualContextResult> {
    const record = await getRun(runId);
    const root = await runRoot(runId);
    const confirmed = await readJson<{ context: DocumentVisualContext }>(path.join(root, 'intermediate', 'confirmed-context.json')).catch(() => null);
    if (!confirmed?.context) throw new Error('请先确认提取结果，再编译正式简报');
    const context = confirmed.context;
    const briefMarkdown = compileContextBrief(context);
    await fs.mkdir(path.join(root, 'outputs'), { recursive: true });
    await writeJson(path.join(root, 'outputs', CONTEXT_FILENAME), context);
    try {
      await fs.writeFile(path.join(root, 'outputs', BRIEF_FILENAME), briefMarkdown, 'utf8');
    } catch (error) {
      const failed: DocumentContextRun = { ...record, status: 'failed', errorCode: 'DOCUMENT_CONTEXT_WRITE_FAILED', lastError: (error as Error).message };
      await saveRun(failed).catch(() => undefined);
      throw blockingError('DOCUMENT_CONTEXT_WRITE_FAILED', `写入简报失败：${(error as Error).message}`);
    }
    const completed: DocumentContextRun = {
      ...record,
      status: 'completed',
      currentStage: '05-local-brief-compiler',
      completedAt: new Date().toISOString(),
      errorCode: null,
      lastError: null,
      briefFilename: BRIEF_FILENAME
    };
    const saved = await saveRun(completed);
    await appendRuntimeEvent(path.join(root, 'runtime'), runId, 'RUN_COMPLETED', { brief: BRIEF_FILENAME }).catch(() => undefined);
    return { run: saved, context, briefMarkdown };
  }

  /** §13 恢复逻辑：优先走本地零模型路径 */
  async function resume(runId: string, apiProfileId?: string): Promise<DocumentContextRun> {
    const record = await getRun(runId);
    if (record.status === 'completed') return record;
    const root = await runRoot(runId);
    const hasConfirmed = await fs.access(path.join(root, 'intermediate', 'confirmed-context.json')).then(() => true).catch(() => false);
    if (hasConfirmed) return (await compile(runId)).run;
    const hasExtracted = await fs.access(path.join(root, 'intermediate', 'extracted-context.json')).then(() => true).catch(() => false);
    if (hasExtracted) {
      if (record.status === 'awaiting_confirmation') return record;
      return saveRun({ ...record, status: 'awaiting_confirmation', currentStage: '04-human-confirmation', errorCode: null, lastError: null });
    }
    const credentials = await readCredentials(apiProfileId || record.apiProfileId);
    const corpus = await readJson<VisualStrategyCorpus>(path.join(root, 'intermediate', 'normalized-corpus.json')).catch(() => null);
    if (corpus) return extract(record, corpus, credentials);
    // 连 corpus 都没有：从 input/ 重新解析
    const inputRoot = path.join(root, 'input');
    const entries = await fs.readdir(inputRoot).catch(() => []);
    if (!entries.length) throw blockingError('DOCUMENT_PARSE_FAILED', '任务输入文档缺失，无法恢复');
    const freshCorpus = await prepareCorpus(runId, entries.map((entry) => path.join(inputRoot, entry)));
    return extract(record, freshCorpus, credentials);
  }

  async function cancel(runId: string): Promise<boolean> {
    const activeRun = active.get(runId);
    if (activeRun) {
      activeRun.controller.abort();
      return true;
    }
    const record = await readRun(runId).catch(() => null);
    if (!record) return false;
    if (['completed', 'failed', 'cancelled'].includes(record.status)) return false;
    await saveRun({ ...record, status: 'cancelled', completedAt: new Date().toISOString(), lastError: '用户已取消分析' }).catch(() => undefined);
    return true;
  }

  async function briefPath(runId: string): Promise<string> {
    const record = await getRun(runId);
    if (!record.briefFilename) throw new Error('该任务尚未生成简报');
    return path.join(await runRoot(runId), 'outputs', path.basename(record.briefFilename));
  }

  async function remove(runId: string): Promise<void> {
    const activeRun = active.get(runId);
    if (activeRun) {
      activeRun.controller.abort();
      active.delete(runId);
    }
    const root = await runRoot(runId);
    const data = await dataRoot();
    assertInside(data, root);
    await fs.rm(root, { recursive: true, force: true });
  }

  /** §14 Legacy Adapter：把旧三方向任务转换为 DocumentVisualContext */
  async function adaptLegacyRun(legacyRunId: string): Promise<DocumentVisualContext> {
    const settings = await readSettings();
    const legacyRoot = path.join(path.resolve(settings.defaultDataPath), 'visual-translation-v1', safeRunId(legacyRunId));
    const run = await readJson<Record<string, unknown>>(path.join(legacyRoot, 'runtime', 'run.json')).catch(() => null);
    if (!run) throw new Error('旧任务不存在或运行记录已损坏');
    const runReport = await readJson<Record<string, unknown>>(path.join(legacyRoot, 'runtime', 'run-report.json')).catch(() => ({}));
    const briefCheckpoint = await readJson<{ output?: unknown }>(path.join(legacyRoot, 'checkpoints', '01-visual-brief.json')).catch(() => null);
    const factsCheckpoint = await readJson<{ output?: unknown }>(path.join(legacyRoot, 'checkpoints', '01-visual-relevant-facts.json')).catch(() => null);
    return adaptLegacyVisualTranslationResult({
      ...runReport,
      run,
      visualBrief: briefCheckpoint?.output,
      visualFacts: factsCheckpoint?.output
    });
  }

  return { inspectDocuments, listRuns, getRun, start, getExtracted, confirm, compile, resume, cancel, briefPath, runRoot, remove, adaptLegacyRun };
}

export type DocumentContextService = ReturnType<typeof createDocumentContextService>;
