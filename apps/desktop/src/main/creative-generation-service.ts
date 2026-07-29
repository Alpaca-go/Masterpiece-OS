import type { ImageGenerationRun } from '../shared/types.ts';
import type { GenerationPromptSnapshot } from '../../../../packages/project-contracts/src/index.ts';
import type { ImageGenerationEvaluation } from '../../../../packages/image-generation-contracts/src/index.ts';
import {
  compileEvaluationPromptAdjustment,
  compileImageEvaluation,
} from '../../../../packages/image-generation-runtime/src/evaluation.js';
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
    parentRunId?: string;
    expectedVisualCanonId?: string;
    expectedVisualCanonVersion?: string;
  }): Promise<ImageGenerationRun> {
    const snapshot = await prompts.compile(projectId, {
      userRequest: input.userRequest,
      outputType: input.outputType,
      expectedVisualCanonId: input.expectedVisualCanonId,
      expectedVisualCanonVersion: input.expectedVisualCanonVersion,
    });
    const session = await sessions.create(projectId);
    if (['GENERATION_READY', 'REVISION_IN_PROGRESS'].includes(session.workflowState)) {
      await sessions.transition(projectId, 'GENERATING', 'Creative Session 生图运行已开始。');
    }
    const run = await imageGeneration.startPromptSnapshot({
      snapshot,
      parentRunId: input.parentRunId,
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

  async function evaluate(projectId: string, runId: string, input: {
    brandAlignment: { score: number; notes: string };
    visualConsistency: { score: number; notes: string };
    assetUsability: { score: number; notes: string };
    deviationDetection: { severity: 'none' | 'minor' | 'major'; findings: string[] };
  }) {
    const [run, snapshot] = await Promise.all([
      imageGeneration.getRun(runId),
      imageGeneration.readPromptSnapshot(runId, projectId),
    ]);
    if (!run || run.projectId !== projectId || !run.images[0]) {
      throw Object.assign(new Error('只能评价当前项目中已生成图片的运行。'), {
        code: 'IMAGE_EVALUATION_RUN_INVALID',
      });
    }
    if (!snapshot) {
      throw Object.assign(new Error('评价需要可追溯的 Prompt Snapshot。'), {
        code: 'GENERATION_SNAPSHOT_MISSING',
      });
    }
    const evaluation = compileImageEvaluation({
      ...input,
      visualCanonId: snapshot.visualCanonId,
      visualCanonVersion: snapshot.visualCanonVersion,
      generationRunId: runId,
      imageId: run.images[0].imageId,
      promptSnapshotId: snapshot.id,
    }) as ImageGenerationEvaluation;
    const decision = evaluation.deviationDetection.severity === 'major' || evaluation.overallScore < 3
      ? 'rejected'
      : evaluation.overallScore < 4
        ? 'usable_after_edit'
        : 'selected';
    const reviewedAt = new Date().toISOString();
    const updated = await imageGeneration.saveReview({
      runId,
      imageId: run.images[0].imageId,
      decision,
      score: Math.round(evaluation.overallScore) as 1 | 2 | 3 | 4 | 5,
      directionCorrect: evaluation.visualConsistency.score >= 4,
      brandIdentityCorrect: evaluation.brandAlignment.score >= 4,
      referenceUsageCorrect: evaluation.brandAlignment.score >= 3,
      compositionUseful: evaluation.assetUsability.score >= 3,
      notes: [
        evaluation.brandAlignment.notes,
        evaluation.visualConsistency.notes,
        evaluation.assetUsability.notes,
        ...evaluation.deviationDetection.findings,
      ].join('；'),
      evaluation,
      reviewedAt,
    });
    await sessions.recordDecision(projectId, {
      type: 'image_evaluation',
      summary: `生成版本评价 ${evaluation.overallScore.toFixed(2)} / 5`,
      rationale: evaluation.promptAdjustments.join('；'),
      outcome: decision === 'rejected' ? 'rejected' : 'confirmed',
      source: 'user',
    });
    return updated;
  }

  async function regenerateFromEvaluation(projectId: string, runId: string, apiProfileId?: string) {
    const [run, snapshot] = await Promise.all([
      imageGeneration.getRun(runId),
      imageGeneration.readPromptSnapshot(runId, projectId),
    ]);
    if (!run || run.projectId !== projectId || !snapshot) {
      throw Object.assign(new Error('无法恢复评价版本的生成上下文。'), {
        code: 'GENERATION_SNAPSHOT_MISSING',
      });
    }
    const evaluation = run.review?.evaluation;
    if (!evaluation
      || evaluation.evaluatedAgainst.generationRunId !== runId
      || evaluation.evaluatedAgainst.imageId !== run.images[0]?.imageId
      || evaluation.evaluatedAgainst.promptSnapshotId !== snapshot.id
      || evaluation.evaluatedAgainst.visualCanonId !== snapshot.visualCanonId
      || evaluation.evaluatedAgainst.visualCanonVersion !== snapshot.visualCanonVersion) {
      throw Object.assign(new Error('评价与当前 Generation Result 或 Prompt Snapshot 不匹配。'), {
        code: 'IMAGE_EVALUATION_STALE',
      });
    }
    const adjustment = compileEvaluationPromptAdjustment(evaluation);
    const session = await sessions.create(projectId);
    if (session.workflowState === 'REVIEWING_OUTPUTS') {
      await sessions.transition(projectId, 'REVISION_IN_PROGRESS', '已根据版本评价建立 Prompt Adjustment。');
    }
    return generate(projectId, {
      userRequest: `${snapshot.userRequest}\n\n${adjustment}`,
      outputType: snapshot.outputType,
      apiProfileId,
      parentRunId: runId,
      expectedVisualCanonId: snapshot.visualCanonId,
      expectedVisualCanonVersion: snapshot.visualCanonVersion,
    });
  }

  return {
    generate,
    retrySameInstruction,
    regenerateInstruction,
    evaluate,
    regenerateFromEvaluation,
  };
}

export type CreativeGenerationService = ReturnType<typeof createCreativeGenerationService>;
