import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerationSeriesExecutionService } from '@masterpiece/runtime-core/application/generation-series-execution-service.ts';

test('Series execution compiles a task through Creative Generation and archives its output', async () => {
  let series: any = {
    id: 'series-1',
    status: 'ready',
    tasks: [{
      id: 'task-1',
      status: 'ready',
      taskType: 'poster',
      title: '品牌海报',
      responsibility: '生成单一海报主画面',
      subject: '品牌',
      scene: '',
      composition: '',
      camera: '',
      preserve: ['品牌身份'],
      change: ['新版式'],
      forbidden: ['多格拼贴'],
    }],
  };
  const transitions: string[] = [];
  const seriesService = {
    get: async () => series,
    start: async () => {
      series = { ...series, status: 'running' };
      transitions.push('series:running');
      return series;
    },
    transitionTask: async (_projectId: string, _seriesId: string, _taskId: string, status: string) => {
      series = { ...series, tasks: [{ ...series.tasks[0], status }] };
      transitions.push(`task:${status}`);
      return series;
    },
    recordRun: async (_projectId: string, _seriesId: string, _taskId: string, run: { outputIds: string[] }) => {
      assert.deepEqual(run.outputIds, ['output-1']);
      series = { ...series, tasks: [{ ...series.tasks[0], status: 'succeeded' }] };
      transitions.push('task:succeeded');
      return series;
    },
    complete: async () => {
      series = { ...series, status: 'completed' };
      transitions.push('series:completed');
      return series;
    },
  };
  const service = createGenerationSeriesExecutionService(
    seriesService as never,
    {
      generate: async (_projectId: string, input: { outputType: string; userRequest: string }) => {
        assert.equal(input.outputType, 'brand_poster');
        assert.match(input.userRequest, /品牌海报/);
        return {
          runId: 'run-1',
          status: 'succeeded',
          images: [{ relativePath: 'images/image-01.png' }],
        };
      },
    } as never,
    {
      create: async (input: { imagePath: string }) => {
        assert.equal(input.imagePath, 'image-generation/run-1/images/image-01.png');
        return { id: 'output-1' };
      },
    } as never,
  );
  const result = await service.runTask('project-1', 'series-1', 'task-1', 'image-profile');
  assert.equal(result.status, 'completed');
  assert.deepEqual(transitions, [
    'series:running',
    'task:queued',
    'task:running',
    'task:succeeded',
    'series:completed',
  ]);
});
