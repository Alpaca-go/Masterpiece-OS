import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SPACE_GENERATION_CORE_ID,
  compileVNextImageGeneration as compileThroughCore,
  createSeedreamVNextAdapter as createAdapterThroughCore,
  validateVNextDeliverableEvidence as validateDeliverableThroughCore,
} from '@masterpiece/image-generation-runtime/core/space-generation-core.js';
import {
  compileVNextImageGeneration as historicalCompiler,
  validateVNextDeliverableEvidence as historicalDeliverableValidator,
} from '@masterpiece/image-generation-runtime/vnext/index.js';
import { createSeedreamVNextAdapter as historicalAdapter } from '@masterpiece/image-generation-runtime/vnext/seedream-adapter.js';

test('Space Generation Core is a single facade over the existing implementation', () => {
  assert.equal(SPACE_GENERATION_CORE_ID, 'space-generation-core@1.0.0');
  assert.equal(compileThroughCore, historicalCompiler);
  assert.equal(createAdapterThroughCore, historicalAdapter);
  assert.equal(validateDeliverableThroughCore, historicalDeliverableValidator);
});
