import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type {
  AnchorCandidate,
  AnchorCandidateEvaluation,
} from '@masterpiece/project-contracts/index.ts';
import {
  attachAnchorCandidateOutput,
  createAnchorCandidateTask,
  failAnchorCandidateGeneration,
  retryAnchorCandidate,
  reviewAnchorCandidate,
  supersedeAnchorCandidate,
  transitionAnchorCandidate,
  validateAnchorCandidate,
} from '@masterpiece/creative-production-runtime/anchor-candidate.js';
import { CREATIVE_WORKFLOW_STATES } from '@masterpiece/creative-production-runtime/session.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { CreativeSessionService } from './creative-session-service.ts';
import type { StyleProfileService } from './style-profile-service.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';

type AnchorWorkflowState =
  | 'PRIMARY_ANCHOR_READY'
  | 'PRIMARY_ANCHOR_GENERATING'
  | 'PRIMARY_ANCHOR_PENDING_REVIEW'
  | 'PRIMARY_ANCHOR_CONFIRMED';

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) {
    throw Object.assign(new Error(`Anchor Candidate 保存失败：${result.errorMessage}`), { code: 'STATE_PERSIST_FAILED' });
  }
}

async function readJson<T>(filename: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filename, 'utf8')) as T;
  } catch {
    return null;
  }
}

function assertInside(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw Object.assign(new Error('Anchor Candidate 文件路径越界。'), { code: 'ANCHOR_CANDIDATE_PATH_INVALID' });
  }
  return resolved;
}

export function createAnchorCandidateService(
  projects: ProjectStore,
  sessions: CreativeSessionService,
  styles: StyleProfileService,
  lockedAssets: LockedAssetsService,
) {
  async function locations(projectId: string, candidateId?: string) {
    const projectRoot = (await projects.paths(projectId)).root;
    const root = path.join(projectRoot, 'anchors', 'candidates');
    const candidateRoot = candidateId ? path.join(root, candidateId) : root;
    return {
      projectRoot,
      root,
      candidateRoot,
      record: path.join(candidateRoot, 'candidate.json'),
      image: path.join(candidateRoot, 'image.webp'),
      thumbnail: path.join(candidateRoot, 'thumbnail.webp'),
    };
  }

  async function persist(candidate: AnchorCandidate): Promise<AnchorCandidate> {
    validateAnchorCandidate(candidate);
    const target = await locations(candidate.projectId, candidate.id);
    await fs.mkdir(target.candidateRoot, { recursive: true });
    await writeJson(target.record, candidate);
    return candidate;
  }

  async function get(projectId: string, candidateId: string): Promise<AnchorCandidate | null> {
    const target = await locations(projectId, candidateId);
    const candidate = await readJson<AnchorCandidate>(target.record);
    return candidate ? validateAnchorCandidate(candidate) as AnchorCandidate : null;
  }

  async function list(projectId: string): Promise<AnchorCandidate[]> {
    const target = await locations(projectId);
    const entries = await fs.readdir(target.root, { withFileTypes: true }).catch(() => []);
    const candidates = await Promise.all(entries.filter((entry) => entry.isDirectory())
      .map((entry) => get(projectId, entry.name)));
    return candidates.filter((item): item is AnchorCandidate => Boolean(item))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async function advanceSession(projectId: string, targetState: AnchorWorkflowState, summary: string) {
    const session = await sessions.create(projectId);
    const current = CREATIVE_WORKFLOW_STATES.indexOf(session.workflowState);
    const target = CREATIVE_WORKFLOW_STATES.indexOf(targetState);
    if (current < target) await sessions.transition(projectId, targetState, summary);
  }

  async function create(
    projectId: string,
    input: {
      purpose?: string;
      aspectRatio?: '16:9' | '4:5' | '3:4' | '1:1';
      candidateSetId?: string;
      candidateIndex?: number;
      candidateCount?: number;
    } = {},
  ): Promise<AnchorCandidate> {
    const [styleProfile, locks] = await Promise.all([
      styles.getActive(projectId),
      lockedAssets.list(projectId),
    ]);
    if (!styleProfile) {
      throw Object.assign(new Error('创建 Anchor Candidate 前必须存在 active Style Profile。'), {
        code: 'STYLE_PROFILE_MISSING',
      });
    }
    const candidate = createAnchorCandidateTask({
      projectId,
      styleProfile,
      lockedAssetIds: locks.map((asset) => asset.id),
      purpose: input.purpose,
      aspectRatio: input.aspectRatio,
      candidateSetId: input.candidateSetId,
      candidateIndex: input.candidateIndex,
      candidateCount: input.candidateCount,
    }) as AnchorCandidate;
    await persist(candidate);
    await advanceSession(projectId, 'PRIMARY_ANCHOR_READY', 'Anchor Candidate Task 已准备。');
    return candidate;
  }

  async function beginGeneration(
    projectId: string,
    candidateId: string,
    generationRunId: string,
  ): Promise<AnchorCandidate> {
    const candidate = await get(projectId, candidateId);
    if (!candidate) throw Object.assign(new Error('Anchor Candidate 不存在。'), { code: 'ANCHOR_CANDIDATE_MISSING' });
    if (!String(generationRunId).trim()) {
      throw Object.assign(new Error('Anchor Candidate 缺少 Generation Run 引用。'), {
        code: 'ANCHOR_GENERATION_RUN_MISSING',
      });
    }
    const generating = transitionAnchorCandidate(candidate, 'generating') as AnchorCandidate;
    const updated = validateAnchorCandidate({
      ...generating,
      source: 'generated',
      generationRunId: String(generationRunId).trim(),
    }) as AnchorCandidate;
    await persist(updated);
    await advanceSession(projectId, 'PRIMARY_ANCHOR_GENERATING', 'Anchor Candidate 正在生成。');
    return updated;
  }

  async function prepareOutput(
    projectId: string,
    candidateId: string,
    sourcePath: string,
    copyIntoCandidate: boolean,
  ): Promise<{ imagePath: string; thumbnailPath: string }> {
    const target = await locations(projectId, candidateId);
    const source = copyIntoCandidate
      ? path.resolve(sourcePath)
      : assertInside(
        target.projectRoot,
        path.isAbsolute(sourcePath) ? sourcePath : path.join(target.projectRoot, sourcePath),
      );
    const stat = await fs.stat(source).catch(() => null);
    if (!stat?.isFile()) {
      throw Object.assign(new Error('Anchor Candidate 输出图片不存在。'), { code: 'ANCHOR_OUTPUT_MISSING' });
    }
    await fs.mkdir(target.candidateRoot, { recursive: true });
    let imageBuffer: Buffer;
    if (copyIntoCandidate) {
      imageBuffer = await sharp(source).rotate().webp({ quality: 92 }).toBuffer();
      await fs.writeFile(target.image, imageBuffer);
    } else {
      imageBuffer = await fs.readFile(source);
    }
    const image = copyIntoCandidate ? target.image : source;
    const thumbnailBuffer = await sharp(imageBuffer).rotate()
      .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    await fs.writeFile(target.thumbnail, thumbnailBuffer);
    return {
      imagePath: path.relative(target.projectRoot, image).replaceAll('\\', '/'),
      thumbnailPath: path.relative(target.projectRoot, target.thumbnail).replaceAll('\\', '/'),
    };
  }

  async function completeGeneration(
    projectId: string,
    candidateId: string,
    projectImagePath: string,
  ): Promise<AnchorCandidate> {
    const candidate = await get(projectId, candidateId);
    if (!candidate) throw Object.assign(new Error('Anchor Candidate 不存在。'), { code: 'ANCHOR_CANDIDATE_MISSING' });
    const output = await prepareOutput(projectId, candidateId, projectImagePath, false);
    const pending = attachAnchorCandidateOutput(candidate, {
      source: 'generated',
      generationRunId: candidate.generationRunId,
      ...output,
    }) as AnchorCandidate;
    await persist(pending);
    await advanceSession(projectId, 'PRIMARY_ANCHOR_PENDING_REVIEW', 'Anchor Candidate 等待评审。');
    return pending;
  }

  async function failGeneration(
    projectId: string,
    candidateId: string,
    failure: { errorCode?: string; errorMessage?: string },
  ): Promise<AnchorCandidate> {
    const candidate = await get(projectId, candidateId);
    if (!candidate) throw Object.assign(new Error('Anchor Candidate 不存在。'), { code: 'ANCHOR_CANDIDATE_MISSING' });
    const failed = failAnchorCandidateGeneration(candidate, failure) as AnchorCandidate;
    await persist(failed);
    await sessions.recordDecision(projectId, {
      type: 'anchor_generation_failed',
      summary: `Anchor Candidate 生成失败：${failed.generationFailure?.errorMessage}`,
      rationale: failed.generationFailure?.errorCode,
      outcome: 'rejected',
      source: 'system',
    });
    return failed;
  }

  async function upload(projectId: string, candidateId: string, sourcePath: string): Promise<AnchorCandidate> {
    const candidate = await get(projectId, candidateId);
    if (!candidate) throw Object.assign(new Error('Anchor Candidate 不存在。'), { code: 'ANCHOR_CANDIDATE_MISSING' });
    const output = await prepareOutput(projectId, candidateId, sourcePath, true);
    const pending = attachAnchorCandidateOutput(candidate, { source: 'uploaded', ...output }) as AnchorCandidate;
    await persist(pending);
    await advanceSession(projectId, 'PRIMARY_ANCHOR_PENDING_REVIEW', '外部 Anchor Candidate 等待评审。');
    return pending;
  }

  async function review(
    projectId: string,
    candidateId: string,
    input: {
      action: 'accept_primary' | 'minor_adjustment' | 'retry' | 'modify_style_profile' | 'reject';
      feedback: string;
      evaluation: AnchorCandidateEvaluation;
    },
  ): Promise<AnchorCandidate> {
    const candidate = await get(projectId, candidateId);
    if (!candidate) throw Object.assign(new Error('Anchor Candidate 不存在。'), { code: 'ANCHOR_CANDIDATE_MISSING' });
    const reviewed = reviewAnchorCandidate(candidate, input) as AnchorCandidate;
    await persist(reviewed);
    if (reviewed.status === 'accepted') {
      if (reviewed.candidateSetId) {
        const siblings = (await list(projectId)).filter((item) =>
          item.id !== reviewed.id
          && item.candidateSetId === reviewed.candidateSetId
          && ['pending_review', 'accepted'].includes(item.status));
        await Promise.all(siblings.map((item) =>
          persist(supersedeAnchorCandidate(item, reviewed.id) as AnchorCandidate)));
      }
      await advanceSession(projectId, 'PRIMARY_ANCHOR_CONFIRMED', 'Anchor Candidate 已接受为 Primary Canon。');
    } else {
      await sessions.recordDecision(projectId, {
        type: 'anchor_review',
        summary: `Anchor Candidate ${input.action}：${input.feedback}`,
        outcome: input.action === 'reject' ? 'rejected' : 'superseded',
        source: 'user',
      });
    }
    return reviewed;
  }

  async function retry(projectId: string, candidateId: string): Promise<AnchorCandidate> {
    const candidate = await get(projectId, candidateId);
    if (!candidate) throw Object.assign(new Error('Anchor Candidate 不存在。'), { code: 'ANCHOR_CANDIDATE_MISSING' });
    return persist(retryAnchorCandidate(candidate) as AnchorCandidate);
  }

  return { create, beginGeneration, completeGeneration, failGeneration, upload, review, retry, get, list };
}

export type AnchorCandidateService = ReturnType<typeof createAnchorCandidateService>;
