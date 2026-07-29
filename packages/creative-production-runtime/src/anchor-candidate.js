import crypto from 'node:crypto';
import path from 'node:path';

export const ANCHOR_CANDIDATE_STATUSES = Object.freeze([
  'not_created',
  'task_ready',
  'generating',
  'generation_failed',
  'pending_review',
  'accepted',
  'rejected',
  'revision_required',
]);

export const ANCHOR_EVALUATION_DIMENSIONS = Object.freeze([
  'color',
  'composition',
  'material',
  'lighting',
  'graphic_language',
  'brand_assets',
  'overall_tone',
]);

const TRANSITIONS = Object.freeze({
  not_created: ['task_ready'],
  task_ready: ['generating', 'pending_review'],
  generating: ['generation_failed', 'pending_review', 'rejected'],
  generation_failed: [],
  pending_review: ['accepted', 'rejected', 'revision_required'],
  revision_required: ['task_ready'],
  accepted: [],
  rejected: [],
});

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
}

function relativeFile(value, field) {
  const normalized = text(value).replaceAll('\\', '/');
  if (!normalized) return '';
  if (path.posix.isAbsolute(normalized) || /^[a-z]:\//iu.test(normalized) || normalized.split('/').includes('..')) {
    throw Object.assign(new Error(`Anchor Candidate ${field} 必须是项目内相对路径。`), {
      code: 'ANCHOR_CANDIDATE_PATH_INVALID',
    });
  }
  return normalized;
}

export function createAnchorCandidateTask(input, now = new Date().toISOString()) {
  if (!text(input?.projectId) || !text(input?.styleProfile?.id) || !text(input?.styleProfile?.version)) {
    throw Object.assign(new Error('Anchor Candidate 缺少项目或 Style Profile 引用。'), {
      code: 'ANCHOR_CANDIDATE_INVALID',
    });
  }
  if (input.styleProfile.status !== 'confirmed') {
    throw Object.assign(new Error('只有 confirmed Style Profile 可以创建 Anchor Candidate。'), {
      code: 'STYLE_PROFILE_NOT_CONFIRMED',
    });
  }
  const aspectRatio = input?.aspectRatio || '4:5';
  if (!['16:9', '4:5', '3:4', '1:1'].includes(aspectRatio)) {
    throw Object.assign(new Error('Anchor Candidate 画幅无效。'), { code: 'ANCHOR_CANDIDATE_INVALID' });
  }
  const candidate = {
    schemaVersion: '6.0',
    id: input?.id || `anchor-candidate-${crypto.randomUUID()}`,
    projectId: text(input.projectId),
    status: 'task_ready',
    revision: Number.isInteger(input?.revision) && input.revision > 0 ? input.revision : 1,
    ...(input?.parentCandidateId ? { parentCandidateId: text(input.parentCandidateId) } : {}),
    styleProfileId: text(input.styleProfile.id),
    styleProfileVersion: text(input.styleProfile.version),
    lockedAssetIds: unique(input?.lockedAssetIds),
    task: {
      type: 'brand_hero',
      purpose: text(input?.purpose) || '验证 Style Profile 转换为真实图像后的整体视觉方向。',
      aspectRatio,
      outputCount: 1,
    },
    reviewHistory: [],
    createdAt: now,
    updatedAt: now,
  };
  return validateAnchorCandidate(candidate);
}

export function transitionAnchorCandidate(candidate, nextStatus, now = new Date().toISOString()) {
  validateAnchorCandidate(candidate);
  if (!(TRANSITIONS[candidate.status] ?? []).includes(nextStatus)) {
    throw Object.assign(new Error(`Anchor Candidate 状态不可从 ${candidate.status} 转换到 ${nextStatus}。`), {
      code: 'ANCHOR_CANDIDATE_TRANSITION_INVALID',
    });
  }
  return validateAnchorCandidate({ ...candidate, status: nextStatus, updatedAt: now });
}

export function attachAnchorCandidateOutput(candidate, output, now = new Date().toISOString()) {
  validateAnchorCandidate(candidate);
  const source = output?.source;
  if (!['generated', 'uploaded'].includes(source)) {
    throw Object.assign(new Error('Anchor Candidate 输出来源无效。'), { code: 'ANCHOR_CANDIDATE_INVALID' });
  }
  if (source === 'generated' && candidate.status !== 'generating') {
    throw Object.assign(new Error('生成结果只能附加到 generating Candidate。'), {
      code: 'ANCHOR_CANDIDATE_TRANSITION_INVALID',
    });
  }
  if (source === 'uploaded' && candidate.status !== 'task_ready') {
    throw Object.assign(new Error('外部图片只能附加到 task_ready Candidate。'), {
      code: 'ANCHOR_CANDIDATE_TRANSITION_INVALID',
    });
  }
  const imagePath = relativeFile(output?.imagePath, 'imagePath');
  if (!imagePath) {
    throw Object.assign(new Error('Anchor Candidate 缺少结果图片。'), { code: 'ANCHOR_OUTPUT_MISSING' });
  }
  const generationRunId = text(output?.generationRunId || candidate.generationRunId);
  if (source === 'generated' && !generationRunId) {
    throw Object.assign(new Error('生成型 Anchor Candidate 缺少 Generation Run 引用。'), {
      code: 'ANCHOR_GENERATION_RUN_MISSING',
    });
  }
  const withOutput = {
    ...candidate,
    source,
    ...(generationRunId ? { generationRunId } : {}),
    imagePath,
    ...(output?.thumbnailPath
      ? { thumbnailPath: relativeFile(output.thumbnailPath, 'thumbnailPath') }
      : {}),
    updatedAt: now,
  };
  return transitionAnchorCandidate(withOutput, 'pending_review', now);
}

export function failAnchorCandidateGeneration(candidate, failure, now = new Date().toISOString()) {
  validateAnchorCandidate(candidate);
  if (candidate.status !== 'generating') {
    throw Object.assign(new Error('只有 generating Candidate 可以记录生成失败。'), {
      code: 'ANCHOR_CANDIDATE_TRANSITION_INVALID',
    });
  }
  const errorCode = text(failure?.errorCode) || 'IMAGE_GENERATION_FAILED';
  const errorMessage = text(failure?.errorMessage) || 'Anchor Candidate 图片生成失败。';
  return transitionAnchorCandidate({
    ...candidate,
    generationFailure: {
      errorCode,
      errorMessage,
      failedAt: now,
    },
    updatedAt: now,
  }, 'generation_failed', now);
}

function validateEvaluation(evaluation) {
  if (!evaluation || !text(evaluation.evaluatedAt)) {
    throw Object.assign(new Error('Anchor Candidate 缺少七维评价。'), { code: 'ANCHOR_EVALUATION_MISSING' });
  }
  for (const dimension of ANCHOR_EVALUATION_DIMENSIONS) {
    const item = evaluation[dimension];
    if (!Number.isInteger(item?.score) || item.score < 1 || item.score > 5 || !text(item?.notes)) {
      throw Object.assign(new Error(`Anchor Candidate ${dimension} 评价无效。`), {
        code: 'ANCHOR_EVALUATION_INVALID',
      });
    }
  }
  return evaluation;
}

export function reviewAnchorCandidate(candidate, review, now = new Date().toISOString()) {
  validateAnchorCandidate(candidate);
  if (candidate.status !== 'pending_review') {
    throw Object.assign(new Error('只有 pending_review Candidate 可以评审。'), {
      code: 'ANCHOR_CANDIDATE_TRANSITION_INVALID',
    });
  }
  const action = review?.action;
  if (!['accept_primary', 'minor_adjustment', 'retry', 'modify_style_profile', 'reject'].includes(action)) {
    throw Object.assign(new Error('Anchor Candidate 评审动作无效。'), { code: 'ANCHOR_REVIEW_INVALID' });
  }
  const evaluation = validateEvaluation(review?.evaluation);
  if (action === 'accept_primary' && (evaluation.brand_assets.score < 3 || evaluation.overall_tone.score < 3)) {
    throw Object.assign(new Error('品牌资产或整体气质评价低于 3 分，不能接受为 Primary Canon。'), {
      code: 'ANCHOR_ACCEPTANCE_GATE_FAILED',
    });
  }
  const nextStatus = action === 'accept_primary'
    ? 'accepted'
    : action === 'reject'
      ? 'rejected'
      : 'revision_required';
  const updated = {
    ...candidate,
    evaluation,
    reviewHistory: [...candidate.reviewHistory, {
      action,
      feedback: text(review?.feedback),
      createdAt: now,
    }],
    updatedAt: now,
  };
  return transitionAnchorCandidate(updated, nextStatus, now);
}

export function retryAnchorCandidate(candidate, now = new Date().toISOString()) {
  validateAnchorCandidate(candidate);
  if (!['generation_failed', 'revision_required', 'rejected'].includes(candidate.status)) {
    throw Object.assign(new Error('只有需要修改或已驳回的 Candidate 可以重试。'), {
      code: 'ANCHOR_CANDIDATE_TRANSITION_INVALID',
    });
  }
  return createAnchorCandidateTask({
    projectId: candidate.projectId,
    styleProfile: {
      id: candidate.styleProfileId,
      version: candidate.styleProfileVersion,
      status: 'confirmed',
    },
    lockedAssetIds: candidate.lockedAssetIds,
    purpose: candidate.task.purpose,
    aspectRatio: candidate.task.aspectRatio,
    revision: candidate.revision + 1,
    parentCandidateId: candidate.id,
  }, now);
}

export function validateAnchorCandidate(candidate) {
  if (!candidate || candidate.schemaVersion !== '6.0') {
    throw Object.assign(new Error('Anchor Candidate Schema 版本无效。'), { code: 'ANCHOR_CANDIDATE_INVALID' });
  }
  for (const field of ['id', 'projectId', 'styleProfileId', 'styleProfileVersion']) {
    if (!text(candidate[field])) {
      throw Object.assign(new Error(`Anchor Candidate ${field} 不能为空。`), { code: 'ANCHOR_CANDIDATE_INVALID' });
    }
  }
  if (!ANCHOR_CANDIDATE_STATUSES.includes(candidate.status)
    || !Number.isInteger(candidate.revision) || candidate.revision < 1
    || !Array.isArray(candidate.lockedAssetIds) || !Array.isArray(candidate.reviewHistory)) {
    throw Object.assign(new Error('Anchor Candidate 状态、版本或引用无效。'), { code: 'ANCHOR_CANDIDATE_INVALID' });
  }
  if (candidate.task?.type !== 'brand_hero' || candidate.task?.outputCount !== 1
    || !text(candidate.task?.purpose)
    || !['16:9', '4:5', '3:4', '1:1'].includes(candidate.task?.aspectRatio)) {
    throw Object.assign(new Error('Anchor Candidate Task 无效。'), { code: 'ANCHOR_CANDIDATE_INVALID' });
  }
  if (candidate.imagePath) relativeFile(candidate.imagePath, 'imagePath');
  if (candidate.thumbnailPath) relativeFile(candidate.thumbnailPath, 'thumbnailPath');
  if (candidate.status === 'generation_failed'
    && (!text(candidate.generationFailure?.errorCode)
      || !text(candidate.generationFailure?.errorMessage)
      || !text(candidate.generationFailure?.failedAt))) {
    throw Object.assign(new Error('生成失败的 Anchor Candidate 必须包含错误详情。'), {
      code: 'ANCHOR_CANDIDATE_INVALID',
    });
  }
  if (['pending_review', 'accepted', 'rejected', 'revision_required'].includes(candidate.status)
    && !candidate.imagePath) {
    throw Object.assign(new Error('可评审 Candidate 必须包含图片。'), { code: 'ANCHOR_OUTPUT_MISSING' });
  }
  if (candidate.evaluation) validateEvaluation(candidate.evaluation);
  return candidate;
}
