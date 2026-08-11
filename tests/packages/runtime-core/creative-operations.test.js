import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCreativeProductionOperations,
  createCreativeSessionOperations,
  createOperationRegistry,
  createVisualMemoryOperations,
} from '@masterpiece/runtime-core';

test('Creative session, production and visual-memory operations dispatch without Electron', async () => {
  const registry = createOperationRegistry();
  const imageGeneration = {
    listRuns: async () => ['run-1'],
    getRun: async (id) => ({ id }),
    readImageDataUrl: async () => 'data:',
    runRoot: async () => '/runs/r1',
    readPromptSnapshot: async () => ({ outputType: 'brand_poster', compilerVersion: '1' }),
  };
  registry.registerAll(createVisualMemoryOperations({
    visualMemory: { get: async () => ({ id: 'memory' }), compile: async () => ({}) },
    referencePacks: { get: async () => ({}), build: async () => ({}) },
  }));
  registry.registerAll(createCreativeSessionOperations({
    creativeSessions: { create: async () => ({ id: 'session' }), get: async () => ({}), appendMessage: async () => ({}) },
    creativeDirections: { getActive: async () => ({ id: 'direction' }) },
    styleProfiles: { getActive: async () => ({ id: 'style' }) },
    visualCanons: { getActive: async () => ({ id: 'canon' }) },
    imageGeneration,
    creativeReading: { run: async () => ({}) },
    creativeGeneration: {
      generate: async () => ({}), retrySameInstruction: async () => ({}), regenerateInstruction: async () => ({}),
      startBenchmark: async () => ({}), listBenchmarks: async () => [], saveBenchmarkEvaluation: async () => ({}),
      evaluate: async () => ({}), regenerateFromEvaluation: async () => ({}),
    },
  }));
  const noOp = new Proxy({}, { get: () => async () => ({}) });
  registry.registerAll(createCreativeProductionOperations({
    lockedAssets: noOp,
    creativeProductionBootstrap: noOp,
    quickStyleExtraction: noOp,
    styleProfiles: noOp,
    anchorGeneration: noOp,
    visualExplorations: { ...noOp, get: async () => null },
    anchorCandidates: noOp,
    visualCanons: noOp,
    generationSeries: noOp,
    generationSeriesExecution: noOp,
    formalAssets: noOp,
    imageGeneration,
    readTextFile: async () => 'prompt',
    joinPath: (...parts) => parts.join('/'),
  }));

  const workspace = await registry.execute('creative-session:get-workspace', ['p1']);
  assert.equal(workspace.session.id, 'session');
  assert.deepEqual(await registry.execute('visual-memory:get', ['p1']), { id: 'memory' });
  assert.equal(await registry.execute('creative-production:get-run-prompt', ['run-1']), 'prompt');
  await assert.rejects(
    registry.execute('creative-production:build-visual-canon-from-exploration', ['p1', 'missing', {}]),
    (error) => error.code === 'VISUAL_EXPLORATION_MISSING',
  );
});
