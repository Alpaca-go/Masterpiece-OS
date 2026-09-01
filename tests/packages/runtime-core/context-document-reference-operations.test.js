import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createContextIntegrationOperations,
  createDocumentOperations,
  createOperationRegistry,
  createProjectContextOperations,
  createReferenceOperations,
} from '@masterpiece/runtime-core';

test('Context, Document and Reference operations dispatch without Electron', async () => {
  const calls = [];
  const releasedReferencePaths = [];
  const registry = createOperationRegistry();
  registry.registerAll(createProjectContextOperations({
    projectContext: {
      get: async (id) => ({ id }),
      rebuild: async () => ({}),
      export: async () => null,
      getShortChain: async () => ({}),
      rebuildShortChain: async () => ({}),
      getGenerationContextReadiness: async () => ({ ready: true }),
    },
  }));
  registry.registerAll(createContextIntegrationOperations({
    contextIntegration: {
      linkDocumentContext: async (...args) => calls.push(['link', ...args]),
      unlinkDocumentContext: async () => {},
      getLink: async () => null,
      getVisualStatus: async () => ({}),
      getResolved: async () => ({}),
      resolve: async () => ({}),
      listConflicts: async () => [],
      applyConflictResolution: async () => ({}),
      migrate: async () => ({}),
      export: async () => null,
      isDocumentContextReferenced: async () => false,
    },
  }));
  registry.registerAll(createDocumentOperations({
    documentContext: {
      inspectDocuments: async (paths) => paths,
      listRuns: async () => [],
      getRun: async () => ({}),
      start: async () => ({}),
      getExtracted: async () => ({}),
      confirm: async () => ({}),
      compile: async () => ({}),
      resume: async () => ({}),
      cancel: async () => {},
      briefPath: async () => 'brief.md',
      adaptLegacyRun: async () => ({}),
    },
    readTextFile: async (source) => `read:${source}`,
  }));
  registry.registerAll(createReferenceOperations({
    referenceAnchor: {
      inspectAssets: async (paths) => paths,
      listRuns: async () => [],
      getRun: async () => ({}),
      start: async (input) => input,
      getCapsule: async () => ({}),
      getCapsuleMarkdown: async () => '',
      getBrief: async () => '',
      updatePreference: async () => ({}),
      retryBrief: async () => ({}),
      setDecision: async () => ({}),
      adaptLegacyRun: async () => ({}),
      cancel: async () => {},
    },
    releaseReferenceAssets: async (paths) => releasedReferencePaths.push(...paths),
  }));

  assert.deepEqual(await registry.execute('project-context:get', ['p1']), { id: 'p1' });
  await registry.execute('context-integration:link', ['p1', 'd1']);
  assert.deepEqual(calls, [['link', 'p1', 'd1']]);
  assert.equal(await registry.execute('document-context:read-brief', ['d1']), 'read:brief.md');
  assert.deepEqual(
    await registry.execute('reference-anchor:start', [{ projectId: 'p1', referenceAssetPaths: ['ref.png'] }]),
    { projectId: 'p1', referenceAssetPaths: ['ref.png'] },
  );
  assert.deepEqual(releasedReferencePaths, ['ref.png']);
});
