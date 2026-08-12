import assert from 'node:assert/strict';
import test from 'node:test';

import { createImageGenerationOperations, createOperationRegistry } from '@masterpiece/runtime-core';

test('Image, continuation and packaging operations dispatch without Electron', async () => {
  const calls = [];
  const service = {
    getCapabilities: async () => ({ standard: true }),
    getPresetCapabilities: async () => [],
    getSourcePreview: async () => ({}),
    compile: async (input) => ({ result: { kind: 'compiled', input } }),
    start: async (input) => ({ kind: 'started', input }),
    getRun: async () => null,
    listRuns: async () => [],
    cancel: async () => {},
    retry: async (input) => input,
    saveReview: async () => ({}),
    readImageDataUrl: async () => 'data:image/png;base64,test',
  };
  const shortChainService = {
    listOptions: async () => ['standard-space', 'packaging'],
    compile: async (input) => ({ kind: 'vnext-compiled', input }),
    start: async (input) => ({ kind: 'vnext-started', input }),
    startValidated: async (input) => ({ kind: 'validated', input }),
    getSession: async () => ({}),
    confirmDirection: async () => ({}),
    confirmGeneratedOutput: async () => ({}),
    revokeGeneratedOutput: async () => ({}),
    getConfirmedGeneratedOutputs: async () => [],
    continueSameType: async (...args) => calls.push(args),
    saveProjectPromptAsset: async () => ({}),
    postCompositeLogo: async () => ({}),
  };
  const registry = createOperationRegistry();
  registry.registerAll(createImageGenerationOperations({ service, shortChainService }));

  assert.deepEqual(await registry.execute('image-generation:compile', [{ projectId: 'p1' }]), {
    kind: 'compiled',
    input: { projectId: 'p1' },
  });
  assert.deepEqual(await registry.execute('image-generation:short-chain-compile', [{ outputType: 'packaging_render' }]), {
    kind: 'vnext-compiled',
    input: { outputType: 'packaging_render' },
  });
  await registry.execute('image-generation:short-chain-continue-same-type', ['p1', 'continue', 'profile', true]);
  assert.deepEqual(calls, [['p1', 'continue', 'profile', true]]);
});
