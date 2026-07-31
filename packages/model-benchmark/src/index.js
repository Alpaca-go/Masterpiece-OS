import crypto from 'node:crypto';
import { validateEvaluationLoopSubmission } from '../../evaluation-loop-contracts/src/index.js';

export const MODEL_BENCHMARK_VERSION = '1.0.0';
export const BENCHMARK_DIMENSIONS = Object.freeze([
  'brandAlignment',
  'visualQuality',
  'referenceCompliance',
  'commercialUsability',
]);

function requiredText(value, field) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw Object.assign(new Error(`${field} is required.`), {
      code: 'MODEL_BENCHMARK_INVALID',
      field,
    });
  }
  return normalized;
}

export function createModelBenchmark(input, options = {}) {
  const profileIds = [...new Set((input?.apiProfileIds ?? []).map((value) => String(value).trim()))]
    .filter(Boolean);
  if (profileIds.length < 2 || profileIds.length > 3) {
    throw Object.assign(new Error('A benchmark requires two or three distinct generation models.'), {
      code: 'MODEL_BENCHMARK_MODEL_COUNT_INVALID',
    });
  }
  const snapshot = input?.promptSnapshot;
  const visualCanonId = requiredText(snapshot?.visualCanonId, 'visualCanonId');
  const visualCanonVersion = requiredText(snapshot?.visualCanonVersion, 'visualCanonVersion');
  const promptSnapshotId = requiredText(snapshot?.id, 'promptSnapshotId');
  const prompt = requiredText(snapshot?.instruction?.finalPrompt, 'finalPrompt');
  const createdAt = options.now?.() ?? new Date().toISOString();
  const benchmarkId = options.id?.() ?? `benchmark-${crypto.randomUUID()}`;
  return {
    schemaVersion: MODEL_BENCHMARK_VERSION,
    benchmarkId,
    projectId: requiredText(input?.projectId, 'projectId'),
    status: 'ready',
    frozenInput: {
      visualCanonId,
      visualCanonVersion,
      promptSnapshotId,
      promptFingerprint: snapshot.promptFingerprint,
      promptTemplateId: snapshot.deliverableTemplateId,
      promptTemplateVersion: snapshot.deliverableTemplateVersion,
      prompt,
    },
    tasks: profileIds.map((apiProfileId) => ({
      apiProfileId,
      status: 'ready',
    })),
    evaluations: [],
    createdAt,
    updatedAt: createdAt,
  };
}

export function attachBenchmarkRuns(benchmark, runs, options = {}) {
  if (runs.length !== benchmark.tasks.length) {
    throw Object.assign(new Error('Every benchmark model must produce exactly one Run record.'), {
      code: 'MODEL_BENCHMARK_RUN_COUNT_INVALID',
    });
  }
  const tasks = benchmark.tasks.map((task, index) => {
    const run = runs[index];
    if (run.apiProfileId !== task.apiProfileId) {
      throw Object.assign(new Error('Benchmark Run/Profile order does not match the frozen task list.'), {
        code: 'MODEL_BENCHMARK_RUN_PROFILE_MISMATCH',
      });
    }
    return {
      ...task,
      runId: requiredText(run.runId, 'runId'),
      providerId: requiredText(run.providerId, 'providerId'),
      modelId: requiredText(run.modelId, 'modelId'),
      status: run.status,
      imageId: run.images?.[0]?.imageId,
    };
  });
  const status = tasks.every((task) => task.status === 'succeeded')
    ? 'completed'
    : tasks.some((task) => task.status === 'failed' || task.status === 'blocked')
      ? 'completed_with_failures'
      : 'running';
  const updatedAt = options.now?.() ?? new Date().toISOString();
  return { ...benchmark, tasks, status, updatedAt };
}

export function saveHumanBenchmarkEvaluation(benchmark, input, options = {}) {
  const task = benchmark.tasks.find((entry) => entry.runId === input?.runId);
  if (!task || task.status !== 'succeeded' || !task.imageId) {
    throw Object.assign(new Error('Only a successful result in this benchmark can be evaluated.'), {
      code: 'MODEL_BENCHMARK_RESULT_INVALID',
    });
  }
  const scores = {};
  for (const dimension of BENCHMARK_DIMENSIONS) {
    const score = Number(input?.scores?.[dimension]);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw Object.assign(new Error(`${dimension} must be an integer from 1 to 5.`), {
        code: 'MODEL_BENCHMARK_SCORE_INVALID',
        field: dimension,
      });
    }
    scores[dimension] = score;
  }
  const evaluatedAt = options.now?.() ?? new Date().toISOString();
  const envelope = validateEvaluationLoopSubmission({
    evaluator: { type: 'human' },
    trace: {
      projectId: benchmark.projectId,
      benchmarkId: benchmark.benchmarkId,
      visualCanonId: benchmark.frozenInput.visualCanonId,
      visualCanonVersion: benchmark.frozenInput.visualCanonVersion,
      promptSnapshotId: benchmark.frozenInput.promptSnapshotId,
      generationRunId: task.runId,
      imageId: task.imageId,
    },
    scores,
    notes: input?.notes,
    evaluatedAt,
  });
  const evaluation = {
    mode: 'human',
    runId: task.runId,
    imageId: task.imageId,
    scores: envelope.scores,
    notes: envelope.notes,
    evaluatedAt: envelope.evaluatedAt,
    evaluationLoop: {
      schemaVersion: envelope.schemaVersion,
      trace: envelope.trace,
    },
  };
  return {
    ...benchmark,
    evaluations: [
      ...benchmark.evaluations.filter((entry) => entry.runId !== task.runId),
      evaluation,
    ],
    updatedAt: evaluatedAt,
  };
}
