import type {
  GenerationPromptSnapshot,
  GenerationSeries,
  GenerationTask,
} from '../../../../packages/project-contracts/src/index.ts';
import type { CreativeGenerationService } from './creative-generation-service.ts';
import type { FormalAssetsService } from './formal-assets-service.ts';
import type { GenerationSeriesService } from './generation-series-service.ts';

const OUTPUT_TYPE: Record<GenerationTask['taskType'], GenerationPromptSnapshot['outputType']> = {
  canon_candidate: 'brand_poster',
  packaging_render: 'packaging_render',
  poster: 'brand_poster',
  vi_application: 'vi_application',
};

function compileTaskRequest(task: GenerationTask): string {
  return [
    task.title,
    task.responsibility,
    task.subject && `主体：${task.subject}`,
    task.scene && `场景：${task.scene}`,
    task.composition && `构图：${task.composition}`,
    task.camera && `镜头：${task.camera}`,
    task.preserve.length && `必须保留：${task.preserve.join('；')}`,
    task.change.length && `本次改变：${task.change.join('；')}`,
    task.forbidden.length && `禁止：${task.forbidden.join('；')}`,
  ].filter(Boolean).join('。');
}

export function createGenerationSeriesExecutionService(
  seriesService: GenerationSeriesService,
  creativeGeneration: CreativeGenerationService,
  formalAssets: FormalAssetsService,
) {
  async function runTask(
    projectId: string,
    seriesId: string,
    taskId: string,
    apiProfileId?: string,
  ): Promise<GenerationSeries> {
    let series = await seriesService.get(projectId, seriesId);
    if (!series) throw Object.assign(new Error('Generation Series 不存在。'), {
      code: 'GENERATION_SERIES_MISSING',
    });
    if (series.status === 'ready') series = await seriesService.start(projectId, seriesId);
    if (series.status !== 'running') {
      throw Object.assign(new Error(`Series 当前状态 ${series.status} 不允许执行任务。`), {
        code: 'GENERATION_SERIES_NOT_RUNNING',
      });
    }
    let task = series.tasks.find((item) => item.id === taskId);
    if (!task) throw Object.assign(new Error('Generation Task 不存在。'), {
      code: 'GENERATION_TASK_MISSING',
    });
    if (task.status === 'failed') {
      series = await seriesService.recoverTask(projectId, seriesId, taskId);
      task = series.tasks.find((item) => item.id === taskId)!;
    }
    if (task.status === 'ready') {
      series = await seriesService.transitionTask(projectId, seriesId, taskId, 'queued');
      task = series.tasks.find((item) => item.id === taskId)!;
    }
    if (task.status === 'queued') {
      series = await seriesService.transitionTask(projectId, seriesId, taskId, 'running');
      task = series.tasks.find((item) => item.id === taskId)!;
    }
    const run = await creativeGeneration.generate(projectId, {
      userRequest: compileTaskRequest(task),
      outputType: OUTPUT_TYPE[task.taskType],
      apiProfileId,
    });
    const outputs = [];
    if (run.status === 'succeeded') {
      for (const image of run.images) {
        outputs.push(await formalAssets.create({
          projectId,
          seriesId,
          taskId,
          generationRunId: run.runId,
          imagePath: `image-generation/${run.runId}/${image.relativePath}`,
        }));
      }
    }
    series = await seriesService.recordRun(projectId, seriesId, taskId, {
      runId: run.runId,
      status: run.status === 'succeeded' ? 'succeeded' : 'failed',
      outputIds: outputs.map((output) => output.id),
      error: run.errorMessage,
    });
    if (series.tasks.every((item) => item.status === 'succeeded')) {
      series = await seriesService.complete(projectId, seriesId);
    }
    return series;
  }

  async function runAll(projectId: string, seriesId: string, apiProfileId?: string) {
    let series = await seriesService.get(projectId, seriesId);
    if (!series) throw Object.assign(new Error('Generation Series 不存在。'), {
      code: 'GENERATION_SERIES_MISSING',
    });
    for (const task of series.tasks.filter((item) => !['succeeded', 'cancelled'].includes(item.status))) {
      series = await runTask(projectId, seriesId, task.id, apiProfileId);
      if (series.status === 'failed' || series.status === 'cancelled') break;
    }
    return series;
  }

  return { runTask, runAll };
}

export type GenerationSeriesExecutionService = ReturnType<typeof createGenerationSeriesExecutionService>;
