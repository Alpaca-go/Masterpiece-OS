import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectRecord } from '../src/shared/types.ts';
import {
  LEGACY_SHORT_CHAIN_CONTEXT_FILENAME,
  LEGACY_SHORT_CHAIN_GENERATION_DIRECTORY,
  readLegacyShortChainProjectFields,
} from '../src/main/legacy-stage-name-migration.ts';

test('retired stage-named project fields migrate into the Short-Chain record shape', () => {
  const legacy = {
    visualContextVNextFilename: 'project-visual-context.vnext.json',
    visualContextVNextStatus: 'ready',
    visualContextVNextVersion: 7,
    visualContextVNextLastBuiltAt: '2026-08-01T00:00:00.000Z',
  } as unknown as ProjectRecord;

  assert.deepEqual(readLegacyShortChainProjectFields(legacy), {
    filename: LEGACY_SHORT_CHAIN_CONTEXT_FILENAME,
    status: 'ready',
    version: 7,
    lastBuiltAt: '2026-08-01T00:00:00.000Z',
  });
  assert.equal(LEGACY_SHORT_CHAIN_GENERATION_DIRECTORY, 'image-generation-vnext');
});
