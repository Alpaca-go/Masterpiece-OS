import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attachBenchmarkRuns,
  createModelBenchmark,
  saveHumanBenchmarkEvaluation,
} from '@masterpiece/model-benchmark/index.js';

const snapshot = {
  id: 'prompt-1',
  visualCanonId: 'canon-1',
  visualCanonVersion: '2.0.0',
  promptFingerprint: 'sha256:prompt',
  deliverableTemplateId: 'poster',
  deliverableTemplateVersion: '1.0.0',
  instruction: { finalPrompt: 'ONE FROZEN PROMPT' },
};

test('benchmark freezes one Canon and Prompt Snapshot for two or three explicit models', () => {
  const benchmark = createModelBenchmark({
    projectId: 'project-1',
    promptSnapshot: snapshot,
    apiProfileIds: ['gpt', 'nano', 'seedream'],
  }, {
    id: () => 'benchmark-1',
    now: () => '2026-07-29T00:00:00.000Z',
  });
  assert.equal(benchmark.tasks.length, 3);
  assert.equal(benchmark.frozenInput.prompt, 'ONE FROZEN PROMPT');
  assert.equal(benchmark.frozenInput.visualCanonId, 'canon-1');
  assert.throws(() => createModelBenchmark({
    projectId: 'project-1',
    promptSnapshot: snapshot,
    apiProfileIds: ['gpt'],
  }), (error) => error.code === 'MODEL_BENCHMARK_MODEL_COUNT_INVALID');
});

test('benchmark compares persisted results only through human evaluation', () => {
  const benchmark = createModelBenchmark({
    projectId: 'project-1',
    promptSnapshot: snapshot,
    apiProfileIds: ['gpt', 'nano'],
  });
  const completed = attachBenchmarkRuns(benchmark, [
    {
      apiProfileId: 'gpt',
      runId: 'run-gpt',
      providerId: 'openai',
      modelId: 'gpt-image-2',
      status: 'succeeded',
      images: [{ imageId: 'image-gpt' }],
    },
    {
      apiProfileId: 'nano',
      runId: 'run-nano',
      providerId: 'google',
      modelId: 'gemini-image',
      status: 'succeeded',
      images: [{ imageId: 'image-nano' }],
    },
  ]);
  const evaluated = saveHumanBenchmarkEvaluation(completed, {
    runId: 'run-gpt',
    scores: {
      brandAlignment: 5,
      visualQuality: 4,
      referenceCompliance: 5,
      commercialUsability: 4,
    },
    notes: 'Designer review',
  });
  assert.equal(completed.status, 'completed');
  assert.equal(evaluated.evaluations[0].mode, 'human');
  assert.equal('winner' in evaluated, false);
  assert.equal('overallScore' in evaluated.evaluations[0], false);
});
