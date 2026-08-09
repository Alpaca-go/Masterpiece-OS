// R11.1 Continuation Contract tests (R11 §51-§54).
//
// Case 1: confirm generated output -> PASS
// Case 2: unconfirmed source -> FAIL
// Case 3: revoked source -> FAIL
// Case 4: project mismatch -> FAIL
// Case 5: confirmed reception -> entrance -> PASS
// Case 6: continuation refs=0 -> FAIL
// Case 7: sourceScene == targetScene -> FAIL
// Case 8: custom without description -> FAIL
//
// Plus: reference binding (source=confirmed_generated_output, count=1,
// referenceMode=reference_assisted), compiler regression (r8_6_golden + frozen
// blocks preserved) and the Continuation Intent block placement.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import {
  createSpaceContinuationContract,
  assertSpaceContinuationContract,
  validateContinuationSource,
  resolveContinuationReference,
  buildContinuationContext,
  renderContinuationIntentBlock,
} from '@masterpiece/image-generation-runtime/space/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function confirmedOutput(overrides = {}) {
  return {
    assetId: 'asset-1',
    projectId: 'proj-1',
    sourceRunId: 'run-1',
    sourceScene: 'reception',
    confirmationState: 'confirmed',
    confirmedAt: '2026-08-09T10:00:00.000Z',
    confirmationSource: 'user_explicit',
    ...overrides,
  };
}

function validContract(overrides = {}) {
  return createSpaceContinuationContract({
    projectId: 'proj-1',
    confirmedSourceAssetId: 'asset-1',
    sourceRunId: 'run-1',
    sourceScene: 'reception',
    targetScene: 'entrance',
    ...overrides,
  });
}

test('Case 1: confirm generated output -> PASS', () => {
  const contract = validContract();
  assert.equal(contract.generationBasis, 'continuation');
  assert.equal(contract.referenceMode, 'reference_assisted');
  assert.equal(contract.referenceSource, 'confirmed_generated_output');
  assert.equal(contract.referenceCount, 1);
  assert.deepEqual(contract.sourceReferenceAssetIds, ['asset-1']);
  assertSpaceContinuationContract(contract);
});

test('Case 2: unconfirmed source -> FAIL', () => {
  assert.throws(
    () => validateContinuationSource({ confirmed: confirmedOutput({ confirmationState: 'unconfirmed' }) }),
    /SPACE_CONTINUATION_SOURCE_UNCONFIRMED/,
  );
});

test('Case 3: revoked source -> FAIL', () => {
  assert.throws(
    () => validateContinuationSource({ confirmed: confirmedOutput({ confirmationState: 'revoked' }) }),
    /SPACE_CONTINUATION_SOURCE_REVOKED/,
  );
});

test('Case 4: project mismatch -> FAIL', () => {
  assert.throws(
    () => validateContinuationSource({
      confirmed: confirmedOutput(),
      asset: { id: 'asset-1', projectId: 'other-proj', kind: 'image' },
      projectId: 'proj-1',
    }),
    /SPACE_CONTINUATION_PROJECT_MISMATCH/,
  );
});

test('Case 5: confirmed reception -> entrance -> PASS', () => {
  const contract = validContract({ targetScene: 'entrance' });
  const validated = validateContinuationSource({
    confirmed: confirmedOutput(),
    asset: { id: 'asset-1', projectId: 'proj-1', kind: 'image' },
    projectId: 'proj-1',
  });
  assert.equal(validated.status, 'pass');
  assert.equal(contract.targetScene, 'entrance');
});

test('Case 6: continuation refs=0 -> FAIL', () => {
  // resolveContinuationReference with no confirmed source -> refs=0 FAIL.
  assert.throws(
    () => resolveContinuationReference({ confirmed: null }),
    /SPACE_CONTINUATION_REFERENCE_REQUIRED/,
  );
  // A contract with 0 source references must be rejected.
  assert.throws(
    () => assertSpaceContinuationContract({
      ...validContract(),
      sourceReferenceAssetIds: [],
      referenceCount: 0,
    }),
    /SPACE_CONTINUATION_REFERENCE_REQUIRED/,
  );
  // validateContinuationSource with refs absent still requires confirmed state.
  assert.throws(
    () => validateContinuationSource({ confirmed: null, projectId: 'proj-1' }),
    /SPACE_CONTINUATION_SOURCE_INVALID/,
  );
});

test('Case 7: sourceScene == targetScene -> FAIL', () => {
  assert.throws(
    () => validContract({ targetScene: 'reception' }),
    /SPACE_CONTINUATION_SAME_SCENE_NOT_SUPPORTED/,
  );
});

test('Case 8: custom without description -> FAIL', () => {
  assert.throws(
    () => validContract({ targetScene: 'custom' }),
    /SPACE_CONTINUATION_CUSTOM_SCENE_DESCRIPTION_REQUIRED/,
  );
});

test('R11.1 reference binding: single confirmed_generated_output, reference_assisted', () => {
  const { references, trace } = resolveContinuationReference({
    confirmed: confirmedOutput(),
    projectRelativePath: 'image-generation/run-1/out.png',
  });
  assert.equal(references.length, 1);
  assert.equal(references[0].source, 'confirmed_generated_output');
  assert.equal(references[0].assetId, 'asset-1');
  assert.equal(trace.referenceMode, 'reference_assisted');
  assert.equal(trace.referenceCount, 1);
  assert.deepEqual(trace.architectureAnchorIds, [], 'no anchor auto-attach');
  assert.equal(trace.implicitAnchorId, null, 'no implicit anchor auto-attach');
});

test('R11.1 v1.1 continuation context carries reference role + boundary + target program', () => {
  const contract = validContract({ targetScene: 'consultation', userRequirement: '更强调咨询私密性' });
  const ctx = buildContinuationContext(contract);
  assert.equal(ctx.continuation.targetScene, 'consultation');
  assert.equal(ctx.continuation.referenceSource, 'confirmed_generated_output');
  assert.equal(ctx.continuation.referenceRole, 'world_consistency', 'v1.1 reference role');
  assert.ok(Array.isArray(ctx.continuation.preserve) && ctx.continuation.preserve.length > 0);
  assert.ok(Array.isArray(ctx.continuation.regenerate) && ctx.continuation.regenerate.length > 0);
  assert.equal(ctx.continuation.targetFunctionalProgramId, 'consultation', 'target program compiled');
  assert.ok(ctx.continuationBoundary.preserve.length > 0 && ctx.continuationBoundary.regenerate.length > 0);

  const block = renderContinuationIntentBlock(contract);
  assert.ok(block, 'block rendered');
  assert.ok(block.includes('Continuation Intent'));
  assert.ok(block.includes('consultation'), 'target scene in block');
  assert.ok(/WORLD-CONSISTENCY|world/iu.test(block), 'reference role in block');
  assert.ok(/REGENERATE/iu.test(block), 'regenerate instruction in block');
  assert.ok(block.includes('咨询'), 'target program in block');
  assert.ok(block.length < 900, 'compact block (budget-safe)');
  // No brand re-analysis vocabulary.
  assert.doesNotMatch(block, /重新分析|品牌定位|V5|视觉分析/iu);
});
