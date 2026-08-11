import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createRuntimeServices } from '@masterpiece/runtime-core/application/runtime-services.ts';

test('Current Runtime service graph composes with Desktop and Electron completely off', () => {
  const settings = {
    profiles: [],
    defaultProfileId: null,
    defaultDataPath: path.join(os.tmpdir(), 'masterpiece-runtime-test'),
    cacheEnabled: true,
    logLevel: 'error',
    directionGenerationMode: 'execution_oriented_v2',
    analysisPipelineMode: 'retrieval_first',
    imageGenerationPipelineMode: 'vnext',
  };
  const services = createRuntimeServices({
    dataPath: settings.defaultDataPath,
    readSettings: async () => settings,
    readCredentials: async () => { throw new Error('provider must stay offline'); },
    analysisRuntime: { resolvePromptRoot: () => path.join(process.cwd(), 'apps/cli/src/v5/prompts') },
  });

  assert.ok(services.projects);
  assert.ok(services.pipeline);
  assert.ok(services.referenceAnchor);
  assert.ok(services.imageGeneration);
  assert.ok(services.creativeGeneration);
});
