import test from 'node:test';
import assert from 'node:assert/strict';
import { createCreativeGenerationService } from '../src/main/creative-generation-service.ts';

test('Conversational generation accepts only user request and records the resulting Run reference', async () => {
  const calls: string[] = [];
  let workflowState = 'GENERATION_READY';
  const snapshot = { id: 'snapshot-1' };
  const prompts = {
    compile: async (_projectId: string, input: { userRequest: string; outputType?: string }) => {
      assert.equal(input.userRequest, '生成一张横版品牌海报');
      assert.equal(input.outputType, 'brand_poster');
      calls.push('compile');
      return snapshot;
    },
    recordRun: async (_projectId: string, snapshotId: string, runId: string) => {
      assert.equal(snapshotId, 'snapshot-1');
      assert.equal(runId, 'run-1');
      calls.push('record');
    },
  };
  const imageGeneration = {
    startPromptSnapshot: async (input: { snapshot: unknown }) => {
      assert.equal(input.snapshot, snapshot);
      calls.push('provider');
      return { runId: 'run-1', status: 'succeeded' };
    },
  };
  const sessions = {
    create: async () => ({ workflowState }),
    transition: async (_projectId: string, next: string) => {
      workflowState = next;
      calls.push(next);
    },
  };
  const service = createCreativeGenerationService(
    prompts as never,
    imageGeneration as never,
    sessions as never,
  );
  const run = await service.generate('project-1', {
    userRequest: '生成一张横版品牌海报',
    outputType: 'brand_poster',
  });
  assert.equal(run.runId, 'run-1');
  assert.deepEqual(calls, [
    'compile',
    'GENERATING',
    'provider',
    'record',
    'REVIEWING_OUTPUTS',
  ]);
});

test('same-instruction retry reuses the persisted snapshot without rerunning Reading or compiling', async () => {
  const snapshot = { id: 'snapshot-1', userRequest: '生成一张品牌海报' };
  let recordedRunId = '';
  const service = createCreativeGenerationService(
    {
      compile: async () => { throw new Error('compile must not run'); },
      recordRun: async (_projectId: string, snapshotId: string, runId: string) => {
        assert.equal(snapshotId, snapshot.id);
        recordedRunId = runId;
      },
    } as never,
    {
      readPromptSnapshot: async (runId: string, projectId: string) => {
        assert.equal(runId, 'run-parent');
        assert.equal(projectId, 'project-1');
        return snapshot;
      },
      startPromptSnapshot: async (input: { snapshot: unknown; parentRunId?: string }) => {
        assert.equal(input.snapshot, snapshot);
        assert.equal(input.parentRunId, 'run-parent');
        return { runId: 'run-retry', status: 'succeeded' };
      },
    } as never,
    {} as never,
  );
  const run = await service.retrySameInstruction('project-1', 'run-parent', 'profile-image');
  assert.equal(run.runId, 'run-retry');
  assert.equal(recordedRunId, 'run-retry');
});

test('evaluation is persisted against the generating Canon and drives a traceable regeneration', async () => {
  let workflowState = 'REVIEWING_OUTPUTS';
  let savedReview: any;
  let regeneratedRequest = '';
  const parentSnapshot = {
    id: 'snapshot-parent',
    userRequest: 'Create the approved packaging render.',
    outputType: 'packaging_render',
    visualCanonId: 'canon-1',
    visualCanonVersion: '2.0.0',
  };
  const parentRun: any = {
    runId: 'run-parent',
    projectId: 'project-1',
    images: [{ imageId: 'image-1' }],
  };
  const prompts = {
    compile: async (_projectId: string, input: { userRequest: string; outputType?: string }) => {
      regeneratedRequest = input.userRequest;
      assert.equal(input.outputType, 'packaging_render');
      return { ...parentSnapshot, id: 'snapshot-revision', userRequest: input.userRequest };
    },
    recordRun: async () => undefined,
  };
  const imageGeneration = {
    getRun: async () => parentRun,
    readPromptSnapshot: async () => parentSnapshot,
    saveReview: async (review: any) => {
      savedReview = review;
      parentRun.review = review;
      return parentRun;
    },
    startPromptSnapshot: async (input: { parentRunId?: string }) => {
      assert.equal(input.parentRunId, 'run-parent');
      return { runId: 'run-revision', status: 'succeeded' };
    },
  };
  const decisions: any[] = [];
  const transitions: string[] = [];
  const sessions = {
    create: async () => ({ workflowState }),
    transition: async (_projectId: string, next: string) => {
      workflowState = next;
      transitions.push(next);
    },
    recordDecision: async (_projectId: string, decision: any) => {
      decisions.push(decision);
    },
  };
  const service = createCreativeGenerationService(
    prompts as never,
    imageGeneration as never,
    sessions as never,
  );

  await service.evaluate('project-1', 'run-parent', {
    brandAlignment: { score: 2, notes: 'Restore the Canon palette.' },
    visualConsistency: { score: 3, notes: 'Restore the approved lighting.' },
    assetUsability: { score: 4, notes: 'Composition is usable.' },
    deviationDetection: { severity: 'major', findings: ['Logo placement is incorrect.'] },
  });
  assert.equal(savedReview.decision, 'rejected');
  assert.equal(savedReview.evaluation.evaluatedAgainst.visualCanonVersion, '2.0.0');
  assert.equal(decisions[0].type, 'image_evaluation');

  const run = await service.regenerateFromEvaluation('project-1', 'run-parent', 'profile-image');
  assert.equal(run.runId, 'run-revision');
  assert.match(regeneratedRequest, /Restore the Canon palette/);
  assert.match(regeneratedRequest, /Logo placement is incorrect/);
  assert.deepEqual(transitions, [
    'REVISION_IN_PROGRESS',
    'GENERATING',
    'REVIEWING_OUTPUTS',
  ]);
});
