import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGenerationSeries,
  transitionGenerationSeries,
  transitionGenerationTask,
  recordGenerationTaskRun,
  recoverFailedGenerationTask,
} from '../packages/creative-production-runtime/src/generation-series.js';

const NOW = '2026-07-28T00:00:00.000Z';
function series() {
  return createGenerationSeries({
    projectId: 'project-1',
    name: '冯烫烫视觉重构 01',
    styleProfile: { id: 'style-1', version: '1.0.0', status: 'confirmed' },
    visualCanon: { id: 'canon-1', version: '1.0.0', status: 'confirmed' },
    lockedAssetIds: ['lock-1'],
    tasks: [
      { taskCode: 'PKG-01', taskType: 'packaging_render', title: '主包装英雄图' },
      { taskCode: 'POS-01', taskType: 'poster', title: '品牌主海报' },
    ],
  }, NOW);
}

test('Generation Series queues, pauses, resumes and archives successful outputs', () => {
  let value = transitionGenerationSeries(series(), 'running', NOW);
  const taskId = value.tasks[0].id;
  value = transitionGenerationTask(value, taskId, 'queued', {}, NOW);
  value = transitionGenerationTask(value, taskId, 'paused', {}, NOW);
  value = transitionGenerationTask(value, taskId, 'queued', {}, NOW);
  value = transitionGenerationTask(value, taskId, 'running', {}, NOW);
  value = recordGenerationTaskRun(value, taskId, {
    runId: 'run-1', status: 'succeeded', outputIds: ['output-1'],
  }, NOW);
  assert.equal(value.tasks[0].status, 'succeeded');
  assert.deepEqual(value.tasks[0].outputIds, ['output-1']);
});

test('failed Generation Task can recover without erasing run history', () => {
  let value = series();
  const taskId = value.tasks[0].id;
  value = transitionGenerationTask(value, taskId, 'queued', {}, NOW);
  value = transitionGenerationTask(value, taskId, 'running', {}, NOW);
  value = recordGenerationTaskRun(value, taskId, { runId: 'run-fail', status: 'failed', error: 'network' }, NOW);
  value = recoverFailedGenerationTask(value, taskId, NOW);
  assert.equal(value.tasks[0].status, 'ready');
  assert.deepEqual(value.tasks[0].generationRunIds, ['run-fail']);
  assert.equal(value.tasks[0].attemptCount, 1);
});

test('Series completion requires every task to succeed and Preserve cannot conflict with Change', () => {
  const value = transitionGenerationSeries(series(), 'running', NOW);
  assert.throws(() => transitionGenerationSeries(value, 'completed', NOW), {
    code: 'GENERATION_SERIES_INCOMPLETE',
  });
  assert.throws(() => createGenerationSeries({
    projectId: 'p',
    styleProfile: { id: 's', version: '1', status: 'confirmed' },
    visualCanon: { id: 'c', version: '1', status: 'confirmed' },
    tasks: [{ taskType: 'poster', preserve: ['构图'], change: ['构图'] }],
  }, NOW), { code: 'REVISION_RULE_CONFLICT' });
});
