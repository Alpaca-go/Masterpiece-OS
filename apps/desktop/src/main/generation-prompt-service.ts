import fs from 'node:fs/promises';
import path from 'node:path';
import type { GenerationPromptSnapshot } from '../../../../packages/project-contracts/src/index.ts';
import {
  compileGenerationPromptSnapshot,
  validateGenerationPromptSnapshot,
} from '../../../../packages/creative-production-runtime/src/generation-prompt.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { CreativeSessionService } from './creative-session-service.ts';
import type { StyleProfileService } from './style-profile-service.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';
import type { VisualCanonService } from './visual-canon-service.ts';

async function writeJson(filename: string, value: unknown) {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) throw Object.assign(new Error(`Prompt Snapshot 保存失败：${result.errorMessage}`), {
    code: 'STATE_PERSIST_FAILED',
  });
}

export function createGenerationPromptService(
  projects: ProjectStore,
  sessions: CreativeSessionService,
  styles: StyleProfileService,
  lockedAssets: LockedAssetsService,
  canons: VisualCanonService,
) {
  async function root(projectId: string) {
    return path.join((await projects.paths(projectId)).root, 'generations', 'prompt-snapshots');
  }

  async function compile(projectId: string, input: {
    userRequest: string;
    outputType?: GenerationPromptSnapshot['outputType'];
    requestId?: string;
  }): Promise<GenerationPromptSnapshot> {
    const [session, styleProfile, visualCanon, locks] = await Promise.all([
      sessions.create(projectId),
      styles.getActive(projectId),
      canons.getActive(projectId),
      lockedAssets.list(projectId),
    ]);
    if (!styleProfile || !visualCanon) {
      throw Object.assign(new Error('生成前缺少 active Style Profile 或 Visual Canon。'), {
        code: 'GENERATION_CONTEXT_MISSING',
      });
    }
    const snapshot = compileGenerationPromptSnapshot({
      projectId,
      sessionId: session.id,
      requestId: input.requestId,
      userRequest: input.userRequest,
      outputType: input.outputType,
      styleProfile,
      visualCanon,
      lockedAssets: locks,
    }) as GenerationPromptSnapshot;
    const directory = await root(projectId);
    await fs.mkdir(directory, { recursive: true });
    await writeJson(path.join(directory, `${snapshot.id}.json`), snapshot);
    await sessions.appendMessage(projectId, {
      role: 'user',
      type: 'generation_request',
      content: snapshot.userRequest,
    });
    const current = await sessions.create(projectId);
    if (current.workflowState === 'VISUAL_CANON_CONFIRMED') {
      await sessions.transition(projectId, 'GENERATION_READY', 'Generation Prompt Snapshot 已编译。');
    }
    return snapshot;
  }

  async function get(projectId: string, snapshotId: string): Promise<GenerationPromptSnapshot | null> {
    try {
      const raw = JSON.parse(await fs.readFile(path.join(await root(projectId), `${snapshotId}.json`), 'utf8'));
      return validateGenerationPromptSnapshot(raw) as GenerationPromptSnapshot;
    } catch {
      return null;
    }
  }

  async function recordRun(projectId: string, snapshotId: string, runId: string, summary: string) {
    const snapshot = await get(projectId, snapshotId);
    if (!snapshot) throw Object.assign(new Error('Prompt Snapshot 不存在。'), { code: 'GENERATION_SNAPSHOT_MISSING' });
    return sessions.appendMessage(projectId, {
      role: 'assistant',
      type: 'generation_result',
      content: summary || '生图运行已创建。',
      generationRunId: runId,
    });
  }

  return { compile, get, recordRun };
}

export type GenerationPromptService = ReturnType<typeof createGenerationPromptService>;
