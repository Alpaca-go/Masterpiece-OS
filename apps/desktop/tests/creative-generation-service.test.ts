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
      assert.equal(input.outputType, undefined);
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
  const run = await service.generate('project-1', { userRequest: '生成一张横版品牌海报' });
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
