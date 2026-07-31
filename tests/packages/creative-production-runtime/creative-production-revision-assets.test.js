import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerationSeries } from '@masterpiece/creative-production-runtime/generation-series.js';
import {
  createRevisionTask,
  createGenerationOutput,
  reviewGenerationOutput,
} from '@masterpiece/creative-production-runtime/revision-assets.js';

const NOW = '2026-07-28T00:00:00.000Z';
function baseSeries() {
  return createGenerationSeries({
    projectId: 'project-1',
    styleProfile: { id: 'style', version: '1', status: 'confirmed' },
    visualCanon: { id: 'canon', version: '1', status: 'confirmed' },
    tasks: [{ taskCode: 'PKG-01', taskType: 'packaging_render', title: '包装' }],
  }, NOW);
}

test('revision task preserves parent/base lineage and clears run history', () => {
  const base = baseSeries();
  const revised = createRevisionTask(base, {
    parentTaskId: base.tasks[0].id,
    baseImageId: 'output-1',
    mode: 'edit',
    preserve: ['构图', '光线'],
    change: ['降低背景饱和度'],
  }, [], NOW);
  const task = revised.tasks[1];
  assert.equal(task.parentTaskId, base.tasks[0].id);
  assert.equal(task.baseImageId, 'output-1');
  assert.equal(task.mode, 'edit');
  assert.deepEqual(task.generationRunIds, []);
});

test('revision cannot change a critical Logo Locked Asset', () => {
  const base = baseSeries();
  assert.throws(() => createRevisionTask(base, {
    parentTaskId: base.tasks[0].id,
    baseImageId: 'output-1',
    change: ['重绘 Logo'],
  }, [{ id: 'lock', name: 'Logo', type: 'logo', priority: 'critical' }], NOW), {
    code: 'LOCKED_ASSET_CONFLICT',
  });
});

test('formal asset review and Supporting Canon promotion require explicit human confirmation', () => {
  const output = createGenerationOutput({
    projectId: 'p', seriesId: 's', taskId: 't', generationRunId: 'r',
    imagePath: 'image-generation/r/images/image-01.png',
  }, NOW);
  assert.equal(reviewGenerationOutput(output, { action: 'accept_formal', note: '通过' }, NOW).status, 'formal');
  assert.throws(() => reviewGenerationOutput(output, {
    action: 'promote_supporting_canon',
  }, NOW), { code: 'SUPPORTING_CANON_CONFIRMATION_REQUIRED' });
  assert.equal(reviewGenerationOutput(output, {
    action: 'promote_supporting_canon',
    humanConfirmed: true,
  }, NOW).status, 'supporting_canon');
});
