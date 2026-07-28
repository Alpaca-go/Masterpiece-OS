import crypto from 'node:crypto';
import path from 'node:path';
import { validateGenerationSeries } from './generation-series.js';

function text(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set((values ?? []).map(text).filter(Boolean))]; }
function relative(value) {
  const normalized = text(value).replaceAll('\\', '/');
  if (!normalized || path.posix.isAbsolute(normalized) || /^[a-z]:\//iu.test(normalized)
    || normalized.split('/').includes('..')) {
    throw Object.assign(new Error('Generation Output 必须使用项目内相对路径。'), {
      code: 'GENERATION_OUTPUT_PATH_INVALID',
    });
  }
  return normalized;
}

export function createRevisionTask(series, input, lockedAssets = [], now = new Date().toISOString()) {
  validateGenerationSeries(series);
  const parent = series.tasks.find((task) => task.id === input.parentTaskId);
  if (!parent) throw Object.assign(new Error('修正版父任务不存在。'), { code: 'PARENT_TASK_MISSING' });
  if (!text(input.baseImageId)) throw Object.assign(new Error('修正版缺少 baseImageId。'), {
    code: 'BASE_IMAGE_MISSING',
  });
  const preserve = unique(input.preserve);
  const change = unique(input.change);
  const overlap = preserve.filter((rule) => change.includes(rule));
  if (overlap.length) throw Object.assign(new Error(`Preserve 与 Change 冲突：${overlap.join('、')}`), {
    code: 'REVISION_RULE_CONFLICT',
  });
  const critical = lockedAssets.filter((asset) => asset.priority === 'critical');
  const forbiddenChange = change.find((rule) => critical.some((asset) =>
    rule.toLowerCase().includes(text(asset.name).toLowerCase())
    || (asset.type === 'logo' && /logo|标志|标准字/iu.test(rule))
    || (asset.type === 'packaging_structure' && /包装结构|盒型|瓶型|袋型/iu.test(rule))));
  if (forbiddenChange) throw Object.assign(new Error(`修正版试图修改 critical Locked Asset：${forbiddenChange}`), {
    code: 'LOCKED_ASSET_CONFLICT',
  });
  const siblings = series.tasks.filter((task) => task.parentTaskId === parent.id).length;
  const task = {
    ...parent,
    id: `generation-task-${crypto.randomUUID()}`,
    taskCode: `${parent.taskCode}-${input.mode === 'variant' ? 'V' : 'R'}${siblings + 2}`,
    title: text(input.title) || `${parent.title}${input.mode === 'variant' ? '变体' : '修正版'} ${siblings + 2}`,
    mode: input.mode === 'variant' ? 'variant' : 'edit',
    parentTaskId: parent.id,
    baseImageId: text(input.baseImageId),
    preserve,
    change,
    status: 'ready',
    generationRunIds: [],
    outputIds: [],
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  return validateGenerationSeries({ ...series, tasks: [...series.tasks, task], updatedAt: now });
}

export function createGenerationOutput(input, now = new Date().toISOString()) {
  return validateGenerationOutput({
    schemaVersion: '6.0',
    id: input.id || `generation-output-${crypto.randomUUID()}`,
    projectId: text(input.projectId),
    seriesId: text(input.seriesId),
    taskId: text(input.taskId),
    generationRunId: text(input.generationRunId),
    imagePath: relative(input.imagePath),
    version: Number.isInteger(input.version) && input.version > 0 ? input.version : 1,
    ...(input.parentOutputId ? { parentOutputId: text(input.parentOutputId) } : {}),
    status: 'candidate',
    createdAt: now,
    updatedAt: now,
  });
}

export function reviewGenerationOutput(output, review, now = new Date().toISOString()) {
  validateGenerationOutput(output);
  if (output.status !== 'candidate') throw Object.assign(new Error('只有 candidate 输出可以评审。'), {
    code: 'GENERATION_OUTPUT_REVIEW_INVALID',
  });
  const action = review?.action;
  const status = action === 'accept_formal'
    ? 'formal'
    : action === 'reject'
      ? 'rejected'
      : action === 'promote_supporting_canon'
        ? 'supporting_canon'
        : null;
  if (!status) throw Object.assign(new Error('输出评审动作无效。'), {
    code: 'GENERATION_OUTPUT_REVIEW_INVALID',
  });
  if (status === 'supporting_canon' && review?.humanConfirmed !== true) {
    throw Object.assign(new Error('提升 Supporting Canon 必须人工确认。'), {
      code: 'SUPPORTING_CANON_CONFIRMATION_REQUIRED',
    });
  }
  return validateGenerationOutput({
    ...output,
    status,
    ...(text(review?.note) ? { reviewNote: text(review.note) } : {}),
    ...(status === 'rejected' && text(review?.failureReason)
      ? { failureReason: text(review.failureReason) }
      : {}),
    updatedAt: now,
  });
}

export function validateGenerationOutput(output) {
  if (!output || output.schemaVersion !== '6.0'
    || !text(output.id) || !text(output.projectId) || !text(output.seriesId)
    || !text(output.taskId) || !text(output.generationRunId)
    || !Number.isInteger(output.version) || output.version < 1
    || !['candidate', 'formal', 'rejected', 'supporting_canon'].includes(output.status)) {
    throw Object.assign(new Error('Generation Output 无效。'), { code: 'GENERATION_OUTPUT_INVALID' });
  }
  relative(output.imagePath);
  return output;
}
