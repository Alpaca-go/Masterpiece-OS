import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SPACE_GENERATION_CORE_ID,
  compileShortChainGeneration as compileThroughCore,
  createSeedreamShortChainAdapter as createAdapterThroughCore,
  validateShortChainDeliverableEvidence as validateDeliverableThroughCore,
} from '@masterpiece/image-generation-runtime/core/space-generation-core.js';
import {
  compileShortChainGeneration as historicalCompiler,
  validateShortChainDeliverableEvidence as historicalDeliverableValidator,
} from '@masterpiece/image-generation-runtime/generation/index.js';
import { createSeedreamShortChainAdapter as historicalAdapter } from '@masterpiece/image-generation-runtime/generation/seedream-adapter.js';

test('Space Generation Core is a single facade over the existing implementation', () => {
  assert.equal(SPACE_GENERATION_CORE_ID, 'space-generation-core@1.0.0');
  assert.equal(compileThroughCore, historicalCompiler);
  assert.equal(createAdapterThroughCore, historicalAdapter);
  assert.equal(validateDeliverableThroughCore, historicalDeliverableValidator);
});
