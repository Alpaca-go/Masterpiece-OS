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
