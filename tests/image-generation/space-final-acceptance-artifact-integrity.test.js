// R10.4.1 — Final Acceptance Artifact Integrity Gate test.
//
// Every final sample must be bound to its real run/output: runId, imageSha256,
// promptHash, compilerId, commitSha, baselineId, generatedAt. The gate is
// fail-closed: image hash mismatch, run id mismatch, prompt mismatch, stale
// sample, wrong baseline, or wrong compiler all block final acceptance.
// Historical samples (e.g. r9-parity reused as a "fresh" r10.4.1 sample) must
// be rejected from the fresh pass count.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyFinalAcceptanceArtifactIntegrity } from '@masterpiece/image-generation-runtime/quality/final-acceptance-artifact-integrity.js';

const REPAIR_COMMIT_SHA = 'r10-4-1-repair-commit';
const REPAIR_COMMIT_TIME = '2026-08-09T08:00:00.000Z';

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function validEvaluation(overrides = {}) {
  const png = Buffer.from('fresh-output-bytes');
  return {
    schemaVersion: '1.0',
    sampleId: 'jzmx-standard-r10.4.1',
    runId: 'run-123',
    imageSha256: sha256(png),
    promptHash: 'prompt-hash-abc',
    compilerId: 'phase9b-quality-compiler',
    commitSha: REPAIR_COMMIT_SHA,
    baselineId: 'r10.4.1-post-repair',
    generatedAt: '2026-08-09T09:00:00.000Z',
    evaluatedAt: '2026-08-09T10:00:00.000Z',
    result: 'pass',
    humanEvaluation: true,
    scores: {},
    ...overrides,
  };
}

function validInput(overrides = {}) {
  const png = Buffer.from('fresh-output-bytes');
  return {
    evaluation: validEvaluation(),
    run: { runId: 'run-123' },
    outputBuffer: png,
    compiledPromptHash: 'prompt-hash-abc',
    acceptedCompilerIds: ['phase9b-quality-compiler'],
    expectedBaselineId: 'r10.4.1-post-repair',
    repairCommitSha: REPAIR_COMMIT_SHA,
    repairCommitTime: REPAIR_COMMIT_TIME,
    ...overrides,
  };
}

test('R10.4.1 a fresh, bound sample passes', () => {
  const result = verifyFinalAcceptanceArtifactIntegrity(validInput());
  assert.equal(result.status, 'pass');
  assert.equal(result.sampleIsFresh, true);
  assert.equal(result.historicalOnly, false);
});

test('R10.4.1 image sha mismatch blocks (hash binding)', () => {
  const result = verifyFinalAcceptanceArtifactIntegrity(validInput({
    evaluation: validEvaluation({ imageSha256: 'deadbeef' }),
  }));
  assert.equal(result.status, 'block');
  assert.ok(result.findings.some((f) => f.startsWith('imageSha256')));
});

test('R10.4.1 run id mismatch blocks (run binding)', () => {
  const result = verifyFinalAcceptanceArtifactIntegrity(validInput({
    run: { runId: 'run-OTHER' },
  }));
  assert.equal(result.status, 'block');
  assert.ok(result.findings.some((f) => f.startsWith('runId')));
});

test('R10.4.1 prompt hash mismatch blocks', () => {
  const result = verifyFinalAcceptanceArtifactIntegrity(validInput({
    compiledPromptHash: 'different-prompt-hash',
  }));
  assert.equal(result.status, 'block');
  assert.ok(result.findings.some((f) => f.startsWith('promptHash')));
});

test('R10.4.1 wrong baseline blocks', () => {
  const result = verifyFinalAcceptanceArtifactIntegrity(validInput({
    evaluation: validEvaluation({ baselineId: 'r9-parity' }),
  }));
  assert.equal(result.status, 'block');
  assert.ok(result.findings.some((f) => f.startsWith('baselineId')));
});

test('R10.4.1 stale sample (generated before the repair commit) blocks as stale', () => {
  const result = verifyFinalAcceptanceArtifactIntegrity(validInput({
    evaluation: validEvaluation({ generatedAt: '2026-08-08T00:00:00.000Z' }),
  }));
  assert.equal(result.status, 'block');
  assert.equal(result.staleSample, true);
  assert.equal(result.sampleIsFresh, false);
  assert.ok(result.findings.some((f) => f.startsWith('freshness')));
});

test('R10.4.1 wrong compiler blocks', () => {
  const result = verifyFinalAcceptanceArtifactIntegrity(validInput({
    evaluation: validEvaluation({ compilerId: 'legacy-compiler' }),
  }));
  assert.equal(result.status, 'block');
  assert.ok(result.findings.some((f) => f.startsWith('compilerId')));
});

test('R10.4.1 missing required evaluation fields block', () => {
  const { imageSha256, ...missing } = validEvaluation();
  const result = verifyFinalAcceptanceArtifactIntegrity(validInput({ evaluation: missing }));
  assert.equal(result.status, 'block');
  assert.ok(result.findings.some((f) => f.startsWith('field.imageSha256')));
});

test('R10.4.1 an old r9-parity sample marked historical is allowed but flagged historicalOnly', () => {
  const png = Buffer.from('old-r9-parity-bytes');
  const result = verifyFinalAcceptanceArtifactIntegrity(validInput({
    allowHistorical: true,
    evaluation: validEvaluation({
      imageSha256: sha256(png),
      baselineId: 'r9-parity',
      generatedAt: '2026-08-08T00:00:00.000Z',
    }),
    outputBuffer: png,
  }));
  // Historical sample must not silently pass as fresh: it is flagged and must
  // be excluded from the fresh pass count.
  assert.equal(result.historicalOnly, true);
  assert.equal(result.sampleIsFresh, false);
});
