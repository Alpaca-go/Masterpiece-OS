// r2.0 §4.13 / Phase E: deriveGenerationFlowState unit tests.
//
// Pins the 5-state flow state machine. The 5 states (plus the
// terminal 'passed') are exposed verbatim to the UI; the renderer
// maps each to a banner copy and a first-image preservation rule.
//
// Check priority in deriveGenerationFlowState:
//   1. initialRun.status !== 'succeeded'                 → 'initial_failed'
//   2. !initialValidation (still pending)               → 'awaiting_validation'
//   3. initialValidation.status !== 'failed'             → 'passed'
//   4. initialValidation.retryRecommended !== true      → 'passed'
//   5. !correctionRun (no correction was issued)         → 'correcting'
//   6. correctionRun.status !== 'succeeded'             → 'correction_start_failed'
//   7. !correctionValidation (still pending)             → 'correcting'
//   8. correctionValidation.status === 'failed'          → 'correction_still_failed'
//   9. otherwise                                          → 'passed'

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveGenerationFlowState,
} from '@masterpiece/image-generation-contracts/index.ts';

function spaceRun(overrides = {}) {
  return {
    schemaVersion: '1.0',
    runId: 'run-1',
    projectId: 'p',
    taskId: 't-1',
    status: 'succeeded',
    images: [{
      imageId: 'img-1',
      relativePath: 'images/img-1.png',
      mimeType: 'image/png',
      sizeBytes: 1,
      sha256: 'abc',
      downloadedAt: '2026-08-10T00:00:00.000Z',
    }],
    ...overrides,
  };
}

function spaceValidation(overrides = {}) {
  return {
    schemaVersion: '1.0',
    projectId: 'p',
    taskId: 't-1',
    runId: 'run-1',
    imageId: 'img-1',
    status: 'passed',
    detectedFamily: 'space',
    detectedSubtype: 'reception',
    visibleEvidence: ['visible'],
    missingRequiredItems: [],
    forbiddenItemsFound: [],
    lockedAssetViolations: [],
    brandMatch: 'matched',
    mismatchTypes: [],
    retryRecommended: false,
    validatorId: 'v',
    validatorVersion: '1',
    validatedAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  };
}

test('E-1: state 1 (initial_failed) — initial Provider call did not produce a successful run', () => {
  const state = deriveGenerationFlowState({
    initialRun: spaceRun({ status: 'failed' }),
  });
  assert.equal(state, 'initial_failed');
});

test('E-1: state 1 (initial_failed) also fires for blocked runs', () => {
  const state = deriveGenerationFlowState({
    initialRun: spaceRun({ status: 'blocked' }),
  });
  assert.equal(state, 'initial_failed');
});

test('E-1: state 2 (awaiting_validation) — initial succeeded, no validation yet', () => {
  const state = deriveGenerationFlowState({
    initialRun: spaceRun(),
    // initialValidation intentionally undefined
  });
  assert.equal(state, 'awaiting_validation');
});

test('E-1: passed — initial validation passed (terminal)', () => {
  const state = deriveGenerationFlowState({
    initialRun: spaceRun(),
    initialValidation: spaceValidation({ status: 'passed' }),
  });
  assert.equal(state, 'passed');
});

test('E-1: passed — initial validation failed but retryRecommended is false (validator said do-not-retry)', () => {
  const state = deriveGenerationFlowState({
    initialRun: spaceRun(),
    initialValidation: spaceValidation({ status: 'failed', retryRecommended: false }),
  });
  assert.equal(state, 'passed');
});

test('E-1: state 3 (correcting) — initial validation failed with retry, no correction issued yet', () => {
  const state = deriveGenerationFlowState({
    initialRun: spaceRun(),
    initialValidation: spaceValidation({ status: 'failed', retryRecommended: true }),
    // correctionRun intentionally undefined
  });
  assert.equal(state, 'correcting');
});

test('E-1: state 3 (correcting) — correction run succeeded, validation still pending', () => {
  const state = deriveGenerationFlowState({
    initialRun: spaceRun(),
    initialValidation: spaceValidation({ status: 'failed', retryRecommended: true }),
    correctionRun: spaceRun({ runId: 'run-2' }),
    // correctionValidation intentionally undefined
  });
  assert.equal(state, 'correcting');
});

test('E-1: state 4 (correction_start_failed) — correction Provider call itself failed', () => {
  const state = deriveGenerationFlowState({
    initialRun: spaceRun(),
    initialValidation: spaceValidation({ status: 'failed', retryRecommended: true }),
    correctionRun: spaceRun({ runId: 'run-2', status: 'failed' }),
  });
  assert.equal(state, 'correction_start_failed');
});

test('E-1: state 4 (correction_start_failed) — correction run blocked (also failed)', () => {
  const state = deriveGenerationFlowState({
    initialRun: spaceRun(),
    initialValidation: spaceValidation({ status: 'failed', retryRecommended: true }),
    correctionRun: spaceRun({ runId: 'run-2', status: 'blocked' }),
  });
  assert.equal(state, 'correction_start_failed');
});

test('E-1: state 5 (correction_still_failed) — correction validated but still failed', () => {
  const state = deriveGenerationFlowState({
    initialRun: spaceRun(),
    initialValidation: spaceValidation({ status: 'failed', retryRecommended: true }),
    correctionRun: spaceRun({ runId: 'run-2' }),
    correctionValidation: spaceValidation({ status: 'failed', retryRecommended: false }),
  });
  assert.equal(state, 'correction_still_failed');
});

test('E-1: passed (terminal) — correction succeeded and validated as passed', () => {
  const state = deriveGenerationFlowState({
    initialRun: spaceRun(),
    initialValidation: spaceValidation({ status: 'failed', retryRecommended: true }),
    correctionRun: spaceRun({ runId: 'run-2' }),
    correctionValidation: spaceValidation({ status: 'passed' }),
  });
  assert.equal(state, 'passed');
});

test('E-1: passed (terminal) — correction succeeded and validation status=unverified', () => {
  const state = deriveGenerationFlowState({
    initialRun: spaceRun(),
    initialValidation: spaceValidation({ status: 'failed', retryRecommended: true }),
    correctionRun: spaceRun({ runId: 'run-2' }),
    correctionValidation: spaceValidation({ status: 'unverified' }),
  });
  assert.equal(state, 'passed');
});

test('E-1: enum shape — 6 distinct states, no duplicates', () => {
  const states = [
    'initial_failed',
    'awaiting_validation',
    'correcting',
    'correction_start_failed',
    'correction_still_failed',
    'passed',
  ];
  assert.equal(new Set(states).size, states.length, 'states must be unique');
});
