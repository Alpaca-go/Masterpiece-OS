import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PACKAGING_GENERATION_CORE_ID,
  compileImageGenerationTask as compileThroughCore,
  migrateImageGenerationSourcesV2 as migrateThroughCore,
} from '@masterpiece/image-generation-runtime/core/packaging-generation-core.js';
import {
  compileImageGenerationTask as historicalCompiler,
  migrateImageGenerationSourcesV2 as historicalMigration,
} from '@masterpiece/image-generation-runtime/task-builder.js';

test('Packaging Generation Core preserves the single compiler and migration implementation', () => {
  assert.equal(PACKAGING_GENERATION_CORE_ID, 'packaging-generation-core@1.0.0');
  assert.equal(compileThroughCore, historicalCompiler);
  assert.equal(migrateThroughCore, historicalMigration);
});
