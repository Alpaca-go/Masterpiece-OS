/**
 * 生图功能 V1：运行记录持久化（§11 / §12）。
 *
 * 复用 desktop runtime 的原子写入 / 事件日志 / 运行写入协调器，
 * 不重新实现第二套持久化系统（§12.1）。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { atomicWriteJsonWithRetry } from '../runtime/atomic-write.ts';
import { appendRuntimeEvent } from '../runtime/event-log.ts';
import { RunWriteCoordinator } from '../runtime/run-write-coordinator.ts';
import type { RunWriteMetrics } from '../runtime/run-write-coordinator.ts';
import type {
  ImageGenerationRun,
  ImageGenerationMetrics,
  ImageGenerationReview,
  ImageGenerationRetryRecord,
  ImageGenerationWarning,
  SourceContextSnapshot,
} from '../../shared/types';
import { resolveProjectRoot, runRootUnder, imageGenRootUnder, RUN_FILES, imagesDir, thumbnailsDir } from './paths.ts';

export class RunStoreError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'RunStoreError';
  }
}

async function writeJsonSafe(filePath: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filePath, value);
  if (!result.success) {
    throw new RunStoreError('RUN_STORE_WRITE_FAILED', `写入 ${path.basename(filePath)} 失败：${result.errorMessage}`);
  }
}

async function readJsonSafe<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

export function createRunStore(dataPath: string, projectId: string) {
  const coordinator = new RunWriteCoordinator((metrics: RunWriteMetrics) => {
    if (!metrics.success) {
      console.warn(`[image-generation] run-store write failed: ${metrics.operation} (run ${metrics.runId})`);
    }
  });

  let projectRootPromise: Promise<string> | null = null;
  function projectRoot(): Promise<string> {
    if (!projectRootPromise) projectRootPromise = resolveProjectRoot(dataPath, projectId);
    return projectRootPromise;
  }

  async function root(runId: string): Promise<string> {
    return runRootUnder(await projectRoot(), runId);
  }

  async function ensureDirs(runId: string): Promise<string> {
    const r = await root(runId);
    await fs.mkdir(imagesDir(r), { recursive: true });
    await fs.mkdir(thumbnailsDir(r), { recursive: true });
    return r;
  }

  return {
    coordinator,

    async saveRun(run: ImageGenerationRun): Promise<ImageGenerationRun> {
      const r = await ensureDirs(run.runId);
      await writeJsonSafe(path.join(r, RUN_FILES.run), run);
      return run;
    },

    async readRun(runId: string): Promise<ImageGenerationRun | null> {
      return readJsonSafe<ImageGenerationRun>(path.join(await root(runId), RUN_FILES.run));
    },

    async writeTask(runId: string, task: unknown): Promise<void> {
      await writeJsonSafe(path.join(await root(runId), RUN_FILES.task), task);
    },

    async writeSnapshot(runId: string, snapshot: SourceContextSnapshot): Promise<void> {
      await writeJsonSafe(path.join(await root(runId), RUN_FILES.snapshot), snapshot);
    },

    async writeCompiledPrompt(runId: string, markdown: string): Promise<void> {
      const r = await root(runId);
      await fs.writeFile(path.join(r, RUN_FILES.compiledPrompt), markdown, 'utf8');
    },

    async writePromptSourceMap(runId: string, map: unknown): Promise<void> {
      await writeJsonSafe(path.join(await root(runId), RUN_FILES.promptSourceMap), map);
    },

    async writeProviderRequest(runId: string, redacted: unknown): Promise<void> {
      await writeJsonSafe(path.join(await root(runId), RUN_FILES.providerRequest), redacted);
    },

    async writeProviderResponse(runId: string, redacted: unknown): Promise<void> {
      await writeJsonSafe(path.join(await root(runId), RUN_FILES.providerResponse), redacted);
    },

    async writeWarnings(runId: string, warnings: ImageGenerationWarning[]): Promise<void> {
      await writeJsonSafe(path.join(await root(runId), RUN_FILES.warnings), warnings);
    },

    async writeMetrics(runId: string, metrics: ImageGenerationMetrics): Promise<void> {
      await writeJsonSafe(path.join(await root(runId), RUN_FILES.metrics), metrics);
    },

    async writeReview(runId: string, review: ImageGenerationReview): Promise<void> {
      await writeJsonSafe(path.join(await root(runId), RUN_FILES.review), review);
    },

    async writeRetryHistory(runId: string, history: ImageGenerationRetryRecord[]): Promise<void> {
      await writeJsonSafe(path.join(await root(runId), RUN_FILES.retryHistory), history);
    },

    async readRetryHistory(runId: string): Promise<ImageGenerationRetryRecord[]> {
      return (await readJsonSafe<ImageGenerationRetryRecord[]>(path.join(await root(runId), RUN_FILES.retryHistory))) ?? [];
    },

    async appendEvent(runId: string, event: string, detail?: Record<string, unknown>): Promise<void> {
      const r = await ensureDirs(runId);
      await appendRuntimeEvent(path.join(r, 'runtime'), runId, event, detail).catch(() => undefined);
      // 兼容 §11.2：events.ndjson 也在 run 根目录记录一份（便于人类排查）
      const ndjson = path.join(r, RUN_FILES.events);
      const line = `${JSON.stringify({ ts: new Date().toISOString(), event, ...(detail ?? {}) })}\n`;
      await fs.appendFile(ndjson, line, 'utf8').catch(() => undefined);
    },

    /** 列出本项目的全部生图运行（按 createdAt 倒序）。 */
    async listRuns(): Promise<ImageGenerationRun[]> {
      const base = imageGenRootUnder(await projectRoot());
      const entries = await fs.readdir(base, { withFileTypes: true }).catch(() => []);
      const runs = await Promise.all(
        entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => this.readRun(entry.name).catch(() => null)),
      );
      return runs
        .filter((run: ImageGenerationRun | null): run is ImageGenerationRun => Boolean(run))
        .sort((a: ImageGenerationRun, b: ImageGenerationRun) => b.createdAt.localeCompare(a.createdAt));
    },
  };
}

export type RunStore = ReturnType<typeof createRunStore>;
