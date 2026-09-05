import assert from 'node:assert/strict';
import test from 'node:test';
import { policyFixture } from './visual-migration-reference-policy-fixture.ts';
import {
  assertVisualMigrationProductSafeDto,
  VISUAL_MIGRATION_PRODUCT_SCHEMA,
} from '@masterpiece/runtime-core/application/visual-migration-product-contract.ts';
import {
  compileVisualMigrationProductPrompt,
  VISUAL_MIGRATION_PRODUCT_PROMPT_COMPILER_VERSION,
} from '@masterpiece/runtime-core/application/visual-migration-product-prompt-compiler.ts';
import { buildVisualMigrationProductCandidateDeclarations } from '@masterpiece/runtime-core/application/visual-migration-product-candidate-builder.ts';

test('PI-1 Product prompt is deterministic and uses only task and Canon authorities', () => {
  const { canon } = policyFixture();
  const input = {
    task: {
      projectId: 'project-1', creativeSessionId: 'session-1', taskKind: 'brand_hero' as const,
      userIntent: 'Create a restrained brand hero.', structureRequirement: 'none' as const,
      requiresCurrentProjectIdentity: true,
    },
    taskId: 'task-1', policyId: `vrp-${'a'.repeat(32)}`, canon,
  };
  const first = compileVisualMigrationProductPrompt(input);
  const second = compileVisualMigrationProductPrompt(input);
  assert.deepEqual(first, second);
  assert.equal(first.sourceMap.compilerVersion, VISUAL_MIGRATION_PRODUCT_PROMPT_COMPILER_VERSION);
  assert.match(first.markdown, /\[CURRENT PROJECT\]/);
  assert.match(first.markdown, /\[TRANSFERABLE VISUAL SYSTEM\]/);
  assert.match(first.markdown, /\[PROHIBITED TRANSFER\]/);
  assert.doesNotMatch(first.markdown, /Anchor Brief/i);
});

test('PI-1 candidate builder projects Locked Asset authority without selecting', () => {
  const { lockedAsset } = policyFixture();
  const candidates = buildVisualMigrationProductCandidateDeclarations([lockedAsset]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.sourceKind, 'locked_asset');
  assert.equal(candidates[0]?.sourceId, lockedAsset.id);
  assert.equal(candidates[0]?.role, 'identity_reference');
});

test('PI-1 recursive DTO guard rejects paths, bytes, secrets and raw provider payloads', () => {
  const safe = { schemaVersion: VISUAL_MIGRATION_PRODUCT_SCHEMA, projectId: 'project-1', status: 'task_required', updatedAt: '2026-09-03T00:00:00.000Z' };
  assert.doesNotThrow(() => assertVisualMigrationProductSafeDto(safe));
  for (const unsafe of [
    { nested: { absolutePath: 'C:\\secret.png' } },
    { nested: { apiKey: 'secret' } },
    { nested: { providerResponse: {} } },
    { nested: new Uint8Array([1, 2, 3]) },
  ]) assert.throws(() => assertVisualMigrationProductSafeDto(unsafe), /unsafe|forbidden|bytes/i);
});
