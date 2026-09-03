/**
 * 生图功能 V1：运行记录持久化（§11 / §12）。
 *
 * 复用 Shared Runtime 的原子写入 / 事件日志 / 运行写入协调器，
 * 不重新实现第二套持久化系统（§12.1）。
 */
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
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
  ImageGenerationContextSnapshotV2,
} from '../../shared/types.ts';
import { resolveProjectRoot, runRootUnder, imageGenRootUnder, standaloneImageGenRoot, RUN_FILES, imagesDir, thumbnailsDir, visualMigrationAuditsDir, visualMigrationCorrectionsDir } from './paths.ts';

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

export function serializeRunJsonArtifact(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function createRunStore(dataPath: string, projectId: string) {
  const standalone = projectId.startsWith('document-');
  const coordinator = new RunWriteCoordinator((metrics: RunWriteMetrics) => {
    if (!metrics.success) {
      console.warn(`[image-generation] run-store write failed: ${metrics.operation} (run ${metrics.runId})`);
    }
  });

  let projectRootPromise: Promise<string> | null = null;
  function projectRoot(): Promise<string> {
    if (!projectRootPromise) projectRootPromise = standalone
      ? Promise.resolve(standaloneImageGenRoot(dataPath, projectId))
      : resolveProjectRoot(dataPath, projectId);
    return projectRootPromise;
  }

  async function root(runId: string): Promise<string> {
    return standalone ? path.join(await projectRoot(), runId) : runRootUnder(await projectRoot(), runId);
  }

  async function ensureDirs(runId: string): Promise<string> {
    const r = await root(runId);
    await fs.mkdir(imagesDir(r), { recursive: true });
    await fs.mkdir(thumbnailsDir(r), { recursive: true });
    return r;
  }

  async function writeCreateOnce(input: {
    runId: string;
    operation: string;
    directory: string;
    filename: string;
    value: unknown;
    conflictCode: string;
    writeCode: string;
  }): Promise<{ created: boolean; bytes: Buffer }> {
    return coordinator.enqueue(input.runId, input.operation, async () => {
      await fs.mkdir(input.directory, { recursive: true });
      const target = path.join(input.directory, input.filename);
      const bytes = serializeRunJsonArtifact(input.value);
      const temp = path.join(input.directory, `.${crypto.randomUUID()}.tmp`);
      try {
        const handle = await fs.open(temp, 'wx');
        try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
        try { await fs.link(temp, target); return { created: true, bytes }; }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
          const existing = await fs.readFile(target).catch(() => null);
          if (existing?.equals(bytes)) return { created: false, bytes: existing };
          throw new RunStoreError(input.conflictCode, `${input.filename} already exists with different content.`);
        }
      } catch (error) {
        if ((error as { code?: string }).code === input.conflictCode) throw error;
        throw new RunStoreError(input.writeCode, `${input.filename} create-once write failed: ${(error as Error).message}`);
      } finally { await fs.unlink(temp).catch(() => undefined); }
    });
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

    async writeSnapshot(runId: string, snapshot: SourceContextSnapshot | ImageGenerationContextSnapshotV2 | unknown): Promise<void> {
      await writeJsonSafe(path.join(await root(runId), RUN_FILES.snapshot), snapshot);
    },

    async readSnapshot<T = unknown>(runId: string): Promise<T | null> {
      return readJsonSafe<T>(path.join(await root(runId), RUN_FILES.snapshot));
    },

    async readRunArtifact(runId: string, filename: string): Promise<Buffer | null> {
      if (path.basename(filename) !== filename) {
        throw new RunStoreError('RUN_STORE_PATH_INVALID', 'Run artifact filename must be canonical and run-relative.');
      }
      return fs.readFile(path.join(await root(runId), filename)).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
    },

    async writeGenerationEvidenceSnapshotCreateOnce(
      runId: string,
      snapshot: unknown,
    ): Promise<{ created: boolean; bytes: Buffer }> {
      return coordinator.enqueue(runId, 'generation-evidence-snapshot:create-once', async () => {
        const r = await ensureDirs(runId);
        const target = path.join(r, RUN_FILES.generationEvidenceSnapshot);
        const bytes = serializeRunJsonArtifact(snapshot);
        const temp = path.join(r, `.generation-evidence-${crypto.randomUUID()}.tmp`);
        try {
          const handle = await fs.open(temp, 'wx');
          try {
            await handle.writeFile(bytes);
            await handle.sync();
          } finally {
            await handle.close();
          }
          try {
            await fs.link(temp, target);
            return { created: true, bytes };
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
            const existing = await fs.readFile(target).catch(() => null);
            if (existing && existing.equals(bytes)) return { created: false, bytes: existing };
            throw new RunStoreError(
              'GENERATION_EVIDENCE_CONFLICT',
              'Generation Evidence Snapshot already exists with different content.',
            );
          }
        } catch (error) {
          if ((error as { code?: string }).code === 'GENERATION_EVIDENCE_CONFLICT') throw error;
          throw new RunStoreError(
            'GENERATION_EVIDENCE_WRITE_FAILED',
            `Generation Evidence Snapshot create-once write failed: ${(error as Error).message}`,
          );
        } finally {
          await fs.unlink(temp).catch(() => undefined);
        }
      });
    },

    async readGenerationEvidenceSnapshot<T = unknown>(runId: string): Promise<T | null> {
      return readJsonSafe<T>(path.join(await root(runId), RUN_FILES.generationEvidenceSnapshot));
    },

    async writeVisualMigrationAuditCreateOnce(runId: string, auditId: string, audit: unknown) {
      if (!/^vma-[a-f0-9]{32}$/u.test(auditId)) throw new RunStoreError('RUN_STORE_PATH_INVALID', 'Visual Migration Audit id is invalid.');
      const directory = path.join(visualMigrationAuditsDir(await root(runId)), auditId);
      return writeCreateOnce({ runId, operation: 'visual-migration-audit:create-once', directory,
        filename: 'audit.json', value: audit, conflictCode: 'VISUAL_MIGRATION_AUDIT_CONFLICT', writeCode: 'VISUAL_MIGRATION_AUDIT_WRITE_FAILED' });
    },

    async readVisualMigrationAudit<T = unknown>(runId: string, auditId: string): Promise<T | null> {
      if (!/^vma-[a-f0-9]{32}$/u.test(auditId)) throw new RunStoreError('RUN_STORE_PATH_INVALID', 'Visual Migration Audit id is invalid.');
      return readJsonSafe<T>(path.join(visualMigrationAuditsDir(await root(runId)), auditId, 'audit.json'));
    },

    async writeVisualMigrationCorrectionPlanCreateOnce(runId: string, planId: string, plan: unknown) {
      if (!/^vmcrp-[a-f0-9]{32}$/u.test(planId)) throw new RunStoreError('RUN_STORE_PATH_INVALID', 'Visual Migration correction plan id is invalid.');
      const directory = path.join(visualMigrationCorrectionsDir(await root(runId)), planId);
      return writeCreateOnce({ runId, operation: 'visual-migration-correction:create-once', directory,
        filename: 'correction-plan.json', value: plan, conflictCode: 'VISUAL_MIGRATION_CORRECTIVE_PLAN_CONFLICT', writeCode: 'VISUAL_MIGRATION_CORRECTIVE_PLAN_CONFLICT' });
    },

    async readVisualMigrationCorrectionPlan<T = unknown>(runId: string, planId: string): Promise<T | null> {
      if (!/^vmcrp-[a-f0-9]{32}$/u.test(planId)) throw new RunStoreError('RUN_STORE_PATH_INVALID', 'Visual Migration correction plan id is invalid.');
      return readJsonSafe<T>(path.join(visualMigrationCorrectionsDir(await root(runId)), planId, 'correction-plan.json'));
    },

    async writeCompiledPrompt(runId: string, markdown: string): Promise<void> {
      const r = await root(runId);
      await fs.writeFile(path.join(r, RUN_FILES.compiledPrompt), markdown, 'utf8');
    },

    async writePromptSourceMap(runId: string, map: unknown): Promise<void> {
      await writeJsonSafe(path.join(await root(runId), RUN_FILES.promptSourceMap), map);
    },

    async writeVisualUpgradeArtifacts(runId: string, artifacts: {
      visualAnalysis: unknown;
      creativeDirection: unknown;
      generationBlueprint: unknown;
      visualMemory?: unknown;
      referencePack?: unknown;
      generationResult: unknown;
    }): Promise<void> {
      const r = await root(runId);
      await Promise.all([
        writeJsonSafe(path.join(r, RUN_FILES.visualAnalysis), artifacts.visualAnalysis),
        writeJsonSafe(path.join(r, RUN_FILES.creativeDirection), artifacts.creativeDirection),
        writeJsonSafe(path.join(r, RUN_FILES.generationBlueprint), artifacts.generationBlueprint),
        ...(artifacts.visualMemory
          ? [writeJsonSafe(path.join(r, RUN_FILES.visualMemory), artifacts.visualMemory)]
          : []),
        ...(artifacts.referencePack
          ? [writeJsonSafe(path.join(r, RUN_FILES.referencePack), artifacts.referencePack)]
          : []),
        writeJsonSafe(path.join(r, RUN_FILES.generationResult), artifacts.generationResult),
      ]);
    },

    async writeGenerationResult(runId: string, result: unknown): Promise<void> {
      await writeJsonSafe(path.join(await root(runId), RUN_FILES.generationResult), result);
    },

    async writeDeliverableArtifacts(runId: string, artifacts: {
      deliverablePolicy: unknown;
      userIntentResolution: unknown;
      referencePlan: unknown;
      compileFingerprint: unknown;
    }): Promise<void> {
      const r = await root(runId);
      await Promise.all([
        writeJsonSafe(path.join(r, RUN_FILES.deliverablePolicy), artifacts.deliverablePolicy),
        writeJsonSafe(path.join(r, RUN_FILES.userIntentResolution), artifacts.userIntentResolution),
        writeJsonSafe(path.join(r, RUN_FILES.referencePlan), artifacts.referencePlan),
        writeJsonSafe(path.join(r, RUN_FILES.compileFingerprint), artifacts.compileFingerprint),
      ]);
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
      const base = standalone ? await projectRoot() : imageGenRootUnder(await projectRoot());
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
