import crypto from 'node:crypto';

const SERIES_TRANSITIONS = {
  draft: ['ready', 'cancelled'],
  ready: ['running', 'cancelled'],
  running: ['paused', 'completed', 'failed', 'cancelled'],
  paused: ['running', 'cancelled'],
  failed: ['running', 'cancelled'],
  completed: [],
  cancelled: [],
};
const TASK_TRANSITIONS = {
  ready: ['queued', 'cancelled'],
  queued: ['running', 'paused', 'cancelled'],
  running: ['paused', 'succeeded', 'failed', 'cancelled'],
  paused: ['queued', 'cancelled'],
  failed: ['ready', 'cancelled'],
  succeeded: [],
  cancelled: [],
};
const TYPES = ['canon_candidate', 'packaging_render', 'poster', 'vi_application'];
function text(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set((values ?? []).map(text).filter(Boolean))]; }

function makeTask(series, input, index, now) {
  const taskType = input.taskType;
  if (!TYPES.includes(taskType)) throw Object.assign(new Error('Generation Task 类型无效。'), {
    code: 'GENERATION_TASK_INVALID',
  });
  return {
    schemaVersion: '6.0',
    id: input.id || `generation-task-${crypto.randomUUID()}`,
    projectId: series.projectId,
    seriesId: series.id,
    taskCode: text(input.taskCode) || `TASK-${String(index + 1).padStart(2, '0')}`,
    taskType,
    title: text(input.title) || text(input.taskCode) || `Task ${index + 1}`,
    responsibility: text(input.responsibility),
    subject: text(input.subject),
    scene: text(input.scene),
    composition: text(input.composition),
    camera: text(input.camera),
    aspectRatio: input.aspectRatio || '4:5',
    outputCount: 1,
    styleProfileId: series.styleProfileId,
    styleProfileVersion: series.styleProfileVersion,
    visualCanonId: series.visualCanonId,
    visualCanonVersion: series.visualCanonVersion,
    preferredCanonImageTypes: unique(input.preferredCanonImageTypes),
    lockedAssetIds: [...series.lockedAssetIds],
    referenceAssetIds: unique(input.referenceAssetIds),
    preserve: unique(input.preserve),
    change: unique(input.change),
    forbidden: unique(input.forbidden),
    status: 'ready',
    promptCompilerVersion: series.promptCompilerVersion,
    generationRunIds: [],
    outputIds: [],
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function createGenerationSeries(input, now = new Date().toISOString()) {
  if (!text(input?.projectId) || input?.styleProfile?.status !== 'confirmed'
    || input?.visualCanon?.status !== 'confirmed') {
    throw Object.assign(new Error('Generation Series 需要 confirmed Style Profile 与 Visual Canon。'), {
      code: 'GENERATION_SERIES_CONTEXT_MISSING',
    });
  }
  const series = {
    schemaVersion: '6.0',
    id: input.id || `generation-series-${crypto.randomUUID()}`,
    projectId: text(input.projectId),
    name: text(input.name) || 'Generation Series',
    status: 'draft',
    styleProfileId: input.styleProfile.id,
    styleProfileVersion: input.styleProfile.version,
    visualCanonId: input.visualCanon.id,
    visualCanonVersion: input.visualCanon.version,
    lockedAssetIds: unique(input.lockedAssetIds),
    promptCompilerVersion: text(input.promptCompilerVersion) || '1.0.0',
    modelAdapterVersion: text(input.modelAdapterVersion) || 'dashscope-wan-v1',
    tasks: [],
    createdAt: now,
    updatedAt: now,
  };
  series.tasks = (input.tasks ?? []).map((task, index) => makeTask(series, task, index, now));
  series.status = series.tasks.length ? 'ready' : 'draft';
  return validateGenerationSeries(series);
}

export function transitionGenerationSeries(series, nextStatus, now = new Date().toISOString()) {
  validateGenerationSeries(series);
  if (!(SERIES_TRANSITIONS[series.status] ?? []).includes(nextStatus)) {
    throw Object.assign(new Error(`Series 不可从 ${series.status} 转换到 ${nextStatus}。`), {
      code: 'GENERATION_SERIES_TRANSITION_INVALID',
    });
  }
  if (nextStatus === 'completed' && series.tasks.some((task) => task.status !== 'succeeded')) {
    throw Object.assign(new Error('Series 仍有未成功任务。'), { code: 'GENERATION_SERIES_INCOMPLETE' });
  }
  return validateGenerationSeries({ ...series, status: nextStatus, updatedAt: now });
}

export function transitionGenerationTask(series, taskId, nextStatus, detail = {}, now = new Date().toISOString()) {
  validateGenerationSeries(series);
  const task = series.tasks.find((item) => item.id === taskId);
  if (!task) throw Object.assign(new Error('Generation Task 不存在。'), { code: 'GENERATION_TASK_MISSING' });
  if (!(TASK_TRANSITIONS[task.status] ?? []).includes(nextStatus)) {
    throw Object.assign(new Error(`Task 不可从 ${task.status} 转换到 ${nextStatus}。`), {
      code: 'GENERATION_TASK_TRANSITION_INVALID',
    });
  }
  const tasks = series.tasks.map((item) => item.id === taskId ? {
    ...item,
    status: nextStatus,
    ...(detail.error ? { lastError: text(detail.error) } : {}),
    updatedAt: now,
  } : item);
  return validateGenerationSeries({ ...series, tasks, updatedAt: now });
}

export function recordGenerationTaskRun(series, taskId, run, now = new Date().toISOString()) {
  validateGenerationSeries(series);
  const tasks = series.tasks.map((task) => task.id === taskId ? {
    ...task,
    generationRunIds: unique([...task.generationRunIds, run.runId]),
    outputIds: unique([...task.outputIds, ...(run.outputIds ?? [])]),
    attemptCount: task.attemptCount + 1,
    status: run.status === 'succeeded' ? 'succeeded' : 'failed',
    ...(run.error ? { lastError: text(run.error) } : {}),
    updatedAt: now,
  } : task);
  if (!tasks.some((task) => task.id === taskId)) {
    throw Object.assign(new Error('Generation Task 不存在。'), { code: 'GENERATION_TASK_MISSING' });
  }
  return validateGenerationSeries({ ...series, tasks, updatedAt: now });
}

export function recoverFailedGenerationTask(series, taskId, now = new Date().toISOString()) {
  return transitionGenerationTask(series, taskId, 'ready', {}, now);
}

export function validateGenerationSeries(series) {
  if (!series || series.schemaVersion !== '6.0' || !text(series.id) || !text(series.projectId)
    || !Array.isArray(series.tasks)) {
    throw Object.assign(new Error('Generation Series 无效。'), { code: 'GENERATION_SERIES_INVALID' });
  }
  const codes = new Set();
  for (const task of series.tasks) {
    if (task.seriesId !== series.id || task.projectId !== series.projectId || codes.has(task.taskCode)
      || task.outputCount !== 1 || !TYPES.includes(task.taskType)) {
      throw Object.assign(new Error('Generation Task 归属、编号或类型无效。'), {
        code: 'GENERATION_TASK_INVALID',
      });
    }
    codes.add(task.taskCode);
    const conflicts = task.preserve.filter((rule) => task.change.includes(rule));
    if (conflicts.length) throw Object.assign(new Error(`Preserve 与 Change 冲突：${conflicts.join('、')}`), {
      code: 'REVISION_RULE_CONFLICT',
    });
  }
  return series;
}
