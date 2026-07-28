import type { ImageGenerationRun } from '../shared/types.ts';
import type { GenerationPromptSnapshot } from '../../../../packages/project-contracts/src/index.ts';
import type { CreativeSessionService } from './creative-session-service.ts';
import type { GenerationPromptService } from './generation-prompt-service.ts';
import type { ImageGenerationService } from './image-generation/service.ts';

export function createCreativeGenerationService(
  prompts: GenerationPromptService,
  imageGeneration: ImageGenerationService,
  sessions: CreativeSessionService,
) {
  async function generate(projectId: string, input: {
    userRequest: string;
    apiProfileId?: string;
    size?: string;
    dryRun?: boolean;
    outputType?: GenerationPromptSnapshot['outputType'];
  }): Promise<ImageGenerationRun> {
    const snapshot = await prompts.compile(projectId, {
      userRequest: input.userRequest,
      outputType: input.outputType,
    });
    const session = await sessions.create(projectId);
    if (session.workflowState === 'GENERATION_READY') {
      await sessions.transition(projectId, 'GENERATING', 'Creative Session 生图运行已开始。');
    }
    const run = await imageGeneration.startPromptSnapshot({
      snapshot,
      apiProfileId: input.apiProfileId,
      size: input.size,
      dryRun: input.dryRun,
    });
    await prompts.recordRun(
      projectId,
      snapshot.id,
      run.runId,
      run.status === 'succeeded' ? '生成完成。' : `生图运行状态：${run.status}。`,
    );
    if (run.status === 'succeeded') {
      const current = await sessions.create(projectId);
      if (current.workflowState === 'GENERATING') {
        await sessions.transition(projectId, 'REVIEWING_OUTPUTS', '生图完成，等待用户反馈。');
      }
    }
    return run;
  }

  async function retrySameInstruction(projectId: string, runId: string, apiProfileId?: string) {
    const snapshot = await imageGeneration.readPromptSnapshot(runId, projectId);
    if (!snapshot) {
      throw Object.assign(new Error('无法恢复该运行的 Prompt Snapshot，旧版运行请重新生成指令。'), {
        code: 'GENERATION_SNAPSHOT_MISSING',
      });
    }
    const run = await imageGeneration.startPromptSnapshot({
      snapshot,
      parentRunId: runId,
      apiProfileId,
    });
    await prompts.recordRun(
      projectId,
      snapshot.id,
      run.runId,
      `使用相同生成指令重试：${run.status}。`,
    );
    return run;
  }

  async function regenerateInstruction(projectId: string, runId: string, apiProfileId?: string) {
    const snapshot = await imageGeneration.readPromptSnapshot(runId, projectId);
    if (!snapshot) {
      throw Object.assign(new Error('无法恢复该运行的用户任务。'), {
        code: 'GENERATION_SNAPSHOT_MISSING',
      });
    }
    return generate(projectId, { userRequest: snapshot.userRequest, apiProfileId });
  }

  return { generate, retrySameInstruction, regenerateInstruction };
}

export type CreativeGenerationService = ReturnType<typeof createCreativeGenerationService>;
