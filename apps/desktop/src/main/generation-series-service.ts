import fs from 'node:fs/promises';
import path from 'node:path';
import type { GenerationSeries } from '../../../../packages/project-contracts/src/index.ts';
import {
  createGenerationSeries,
  recordGenerationTaskRun,
  recoverFailedGenerationTask,
  transitionGenerationSeries,
  transitionGenerationTask,
  validateGenerationSeries,
} from '../../../../packages/creative-production-runtime/src/generation-series.js';
import { createRevisionTask } from '../../../../packages/creative-production-runtime/src/revision-assets.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { CreativeSessionService } from './creative-session-service.ts';
import type { StyleProfileService } from './style-profile-service.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';
import type { VisualCanonService } from './visual-canon-service.ts';

async function writeJson(filename: string, value: unknown) {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) throw Object.assign(new Error(`Generation Series 保存失败：${result.errorMessage}`), {
    code: 'STATE_PERSIST_FAILED',
  });
}

export function createGenerationSeriesService(
  projects: ProjectStore,
  sessions: CreativeSessionService,
  styles: StyleProfileService,
  lockedAssets: LockedAssetsService,
  canons: VisualCanonService,
) {
  async function seriesRoot(projectId: string, seriesId: string) {
    return path.join((await projects.paths(projectId)).root, 'generations', seriesId);
  }
  async function persist(series: GenerationSeries) {
    validateGenerationSeries(series);
    const root = await seriesRoot(series.projectId, series.id);
    await fs.mkdir(path.join(root, 'tasks'), { recursive: true });
    await Promise.all(series.tasks.map((task) => writeJson(path.join(root, 'tasks', `${task.id}.json`), task)));
    await writeJson(path.join(root, 'series.json'), series);
    return series;
  }
  async function get(projectId: string, seriesId: string): Promise<GenerationSeries | null> {
    try {
      const value = JSON.parse(await fs.readFile(path.join(await seriesRoot(projectId, seriesId), 'series.json'), 'utf8'));
      return validateGenerationSeries(value) as GenerationSeries;
    } catch { return null; }
  }
  async function create(projectId: string, input: { name: string; tasks: unknown[] }) {
    const [style, canon, locks] = await Promise.all([
      styles.getActive(projectId), canons.getActive(projectId), lockedAssets.list(projectId),
    ]);
    if (!style || !canon) throw Object.assign(new Error('Series 缺少 active Style Profile 或 Visual Canon。'), {
      code: 'GENERATION_SERIES_CONTEXT_MISSING',
    });
    const series = createGenerationSeries({
      projectId,
      name: input.name,
      tasks: input.tasks,
      styleProfile: style,
      visualCanon: canon,
      lockedAssetIds: locks.map((item) => item.id),
    }) as GenerationSeries;
    await persist(series);
    await sessions.setActiveEntity(projectId, 'generation_series', series);
    return series;
  }
  async function mutate(projectId: string, seriesId: string, fn: (value: GenerationSeries) => GenerationSeries) {
    const current = await get(projectId, seriesId);
    if (!current) throw Object.assign(new Error('Generation Series 不存在。'), { code: 'GENERATION_SERIES_MISSING' });
    return persist(fn(current));
  }
  return {
    create,
    get,
    start: (projectId: string, id: string) => mutate(projectId, id, (value) => transitionGenerationSeries(value, 'running') as GenerationSeries),
    pause: (projectId: string, id: string) => mutate(projectId, id, (value) => transitionGenerationSeries(value, 'paused') as GenerationSeries),
    resume: (projectId: string, id: string) => mutate(projectId, id, (value) => transitionGenerationSeries(value, 'running') as GenerationSeries),
    cancel: (projectId: string, id: string) => mutate(projectId, id, (value) => transitionGenerationSeries(value, 'cancelled') as GenerationSeries),
    transitionTask: (projectId: string, id: string, taskId: string, status: string) =>
      mutate(projectId, id, (value) => transitionGenerationTask(value, taskId, status) as GenerationSeries),
    recordRun: (projectId: string, id: string, taskId: string, run: unknown) =>
      mutate(projectId, id, (value) => recordGenerationTaskRun(value, taskId, run) as GenerationSeries),
    recoverTask: (projectId: string, id: string, taskId: string) =>
      mutate(projectId, id, (value) => recoverFailedGenerationTask(value, taskId) as GenerationSeries),
    createRevision: async (projectId: string, id: string, input: unknown) => {
      const locks = await lockedAssets.list(projectId);
      return mutate(projectId, id, (value) =>
        createRevisionTask(value, input, locks) as GenerationSeries);
    },
  };
}

export type GenerationSeriesService = ReturnType<typeof createGenerationSeriesService>;
