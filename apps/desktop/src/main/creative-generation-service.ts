import type { ImageGenerationRun } from '../shared/types.ts';
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
  }): Promise<ImageGenerationRun> {
    const snapshot = await prompts.compile(projectId, { userRequest: input.userRequest });
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

  return { generate };
}

export type CreativeGenerationService = ReturnType<typeof createCreativeGenerationService>;
