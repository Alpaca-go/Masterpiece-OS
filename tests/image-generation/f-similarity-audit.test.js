// r2.0 §6.7 / §8 / Phase F-1: similarity-audit helper + threshold
// constant + evidence-checkpoint types unit tests.
//
// The F-1 contract layer is the SINGLE source of truth for:
//   - the 6 audit dimensions and the v2.0 thresholds
//   - the pure helper that turns raw scores into pass flags
//   - the run-evidence file name union and the per-file status shape
//
// This file pins:
//   - VNEXT_SIMILARITY_AUDIT_THRESHOLDS is frozen + carries the v2.0 numbers
//   - assertVNextSimilarityAudit happy paths (5+1 dims, boundary at 4 and 2.5)
//   - assertVNextSimilarityAudit invalid scores throw (no silent UI results)
//   - assertVNextSimilarityAudit custom thresholds honor caller-supplied values
//   - overall pass requires all 6 dims individually
//   - the contracts module surface is consistent (F-1 types are exported)
//
// Run: node --test tests/image-generation/f-similarity-audit.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import * as contracts from '@masterpiece/image-generation-contracts/index.ts';

// F-1 exports the THRESHOLDS constant + the assert helper. Type-level
// shapes (VNextSimilarityAuditScores, VNextEvidenceCheckpoint, etc.) are
// pure TypeScript interfaces and have no runtime presence, so this test
// file only exercises the runtime API surface + duck-type checks where
// applicable.
const {
  VNEXT_SIMILARITY_AUDIT_THRESHOLDS,
  assertVNextSimilarityAudit,
} = contracts;

// A complete valid scores payload. Every test starts from a copy of
// this and tweaks one or two fields.
function scores(overrides = {}) {
  return {
    visualWorldFidelity: 4,
    sceneAccuracy: 4,
    functionalRealism: 4,
    targetSceneAuthority: 4,
    referenceAlignment: 4,
    nearCopyRisk: 2,
    ...overrides,
  };
}

// ---------------------------------------------------------------------
// 1. Threshold constant shape
// ---------------------------------------------------------------------

test('F-1: VNEXT_SIMILARITY_AUDIT_THRESHOLDS carries the documented v2.0 numbers', () => {
  assert.equal(VNEXT_SIMILARITY_AUDIT_THRESHOLDS.minScore, 4, 'minScore must be 4 per r2.0 §6.7');
  assert.equal(VNEXT_SIMILARITY_AUDIT_THRESHOLDS.maxNearCopyRisk, 2.5, 'maxNearCopyRisk must be 2.5 per r2.0 §6.7');
  assert.equal(typeof VNEXT_SIMILARITY_AUDIT_THRESHOLDS.auditorVersion, 'string');
  assert.ok(VNEXT_SIMILARITY_AUDIT_THRESHOLDS.auditorVersion.length > 0, 'auditorVersion must be non-empty');
  assert.match(
    VNEXT_SIMILARITY_AUDIT_THRESHOLDS.auditorVersion,
    /^space-similarity-audit@/,
    'auditorVersion must be tagged with the space-similarity-audit@ prefix for trace compatibility',
  );
});

test('F-1: VNEXT_SIMILARITY_AUDIT_THRESHOLDS is frozen (cannot be mutated by callers)', () => {
  assert.equal(Object.isFrozen(VNEXT_SIMILARITY_AUDIT_THRESHOLDS), true);
});

// ---------------------------------------------------------------------
// 2. assertVNextSimilarityAudit happy path
// ---------------------------------------------------------------------

test('F-1: all 6 dimensions at the minimum (4) passes every dimension + overall', () => {
  const result = assertVNextSimilarityAudit(scores());
  assert.deepEqual(result, {
    visualWorldFidelity: true,
    sceneAccuracy: true,
    functionalRealism: true,
    targetSceneAuthority: true,
    referenceAlignment: true,
    nearCopyRisk: true,
    overall: true,
  });
});

test('F-1: all 6 dimensions at 5 (max) passes every dimension + overall', () => {
  const result = assertVNextSimilarityAudit(scores({
    visualWorldFidelity: 5,
    sceneAccuracy: 5,
    functionalRealism: 5,
    targetSceneAuthority: 5,
    referenceAlignment: 5,
    nearCopyRisk: 1,
  }));
  assert.equal(result.overall, true);
  assert.equal(result.visualWorldFidelity, true);
  assert.equal(result.nearCopyRisk, true);
});

test('F-1: all 6 dimensions at 3 (below threshold) fails every dimension + overall', () => {
  const result = assertVNextSimilarityAudit(scores({
    visualWorldFidelity: 3,
    sceneAccuracy: 3,
    functionalRealism: 3,
    targetSceneAuthority: 3,
    referenceAlignment: 3,
    nearCopyRisk: 4,
  }));
  assert.equal(result.visualWorldFidelity, false);
  assert.equal(result.sceneAccuracy, false);
  assert.equal(result.functionalRealism, false);
  assert.equal(result.targetSceneAuthority, false);
  assert.equal(result.referenceAlignment, false);
  assert.equal(result.nearCopyRisk, false, 'nearCopyRisk=4 is > 2.5 → fail');
  assert.equal(result.overall, false);
});

// ---------------------------------------------------------------------
// 3. nearCopyRisk boundary at 2.5
// ---------------------------------------------------------------------

// The 6 SCORE dimensions are validated as integers in 1..5 (the
// multimodal LLM is asked for integers; non-integer values throw).
// The 2.5 threshold is a POLICY boundary, not a score boundary —
// in the integer-score model, the practical cap is "nearCopyRisk ≤ 2".
// Tests below validate the integer-score boundary behavior:

test('F-1: nearCopyRisk = 2 (last integer ≤ 2.5 cap) passes', () => {
  const result = assertVNextSimilarityAudit(scores({ nearCopyRisk: 2 }));
  assert.equal(result.nearCopyRisk, true, 'nearCopyRisk=2 is the last integer within the inclusive 2.5 cap');
  assert.equal(result.overall, true);
});

test('F-1: nearCopyRisk = 3 (first integer > 2.5 cap) fails', () => {
  const result = assertVNextSimilarityAudit(scores({ nearCopyRisk: 3 }));
  assert.equal(result.nearCopyRisk, false, 'nearCopyRisk=3 is the first integer above the inclusive 2.5 cap');
  assert.equal(result.overall, false, 'overall must fail when any one dimension fails');
});

test('F-1: nearCopyRisk = 1 (very low risk) passes', () => {
  const result = assertVNextSimilarityAudit(scores({ nearCopyRisk: 1 }));
  assert.equal(result.nearCopyRisk, true);
  assert.equal(result.overall, true);
});

// ---------------------------------------------------------------------
// 4. Invalid scores throw (UI must never trust silent results)
// ---------------------------------------------------------------------

test('F-1: dimension = 0 throws (out of 1..5 range)', () => {
  assert.throws(
    () => assertVNextSimilarityAudit(scores({ visualWorldFidelity: 0 })),
    /visualWorldFidelity/,
  );
});

test('F-1: dimension = 6 throws (out of 1..5 range)', () => {
  assert.throws(
    () => assertVNextSimilarityAudit(scores({ referenceAlignment: 6 })),
    /referenceAlignment/,
  );
});

test('F-1: dimension = -1 throws (negative out of range)', () => {
  assert.throws(
    () => assertVNextSimilarityAudit(scores({ sceneAccuracy: -1 })),
    /sceneAccuracy/,
  );
});

test('F-1: dimension = 3.5 throws (non-integer)', () => {
  assert.throws(
    () => assertVNextSimilarityAudit(scores({ functionalRealism: 3.5 })),
    /functionalRealism/,
  );
});

test('F-1: dimension = NaN throws (not finite)', () => {
  assert.throws(
    () => assertVNextSimilarityAudit(scores({ targetSceneAuthority: Number.NaN })),
    /targetSceneAuthority/,
  );
});

test('F-1: dimension = Infinity throws (not finite)', () => {
  assert.throws(
    () => assertVNextSimilarityAudit(scores({ visualWorldFidelity: Number.POSITIVE_INFINITY })),
    /visualWorldFidelity/,
  );
});

test('F-1: dimension = "4" (string) throws (must be number)', () => {
  assert.throws(
    () => assertVNextSimilarityAudit(scores({ sceneAccuracy: '4' })),
    /sceneAccuracy/,
  );
});

test('F-1: dimension = null throws (must be number)', () => {
  assert.throws(
    () => assertVNextSimilarityAudit(scores({ nearCopyRisk: null })),
    /nearCopyRisk/,
  );
});

// ---------------------------------------------------------------------
// 5. Custom thresholds (caller-driven policy overrides)
// ---------------------------------------------------------------------

test('F-1: custom minScore = 5 raises the bar — 4 is no longer enough', () => {
  const result = assertVNextSimilarityAudit(
    scores(),
    { minScore: 5, maxNearCopyRisk: 2.5 },
  );
  // Every forward dimension = 4 must now fail.
  assert.equal(result.visualWorldFidelity, false);
  assert.equal(result.sceneAccuracy, false);
  assert.equal(result.functionalRealism, false);
  assert.equal(result.targetSceneAuthority, false);
  assert.equal(result.referenceAlignment, false);
  // nearCopyRisk is independent of minScore, only maxNearCopyRisk.
  assert.equal(result.nearCopyRisk, true);
  assert.equal(result.overall, false);
});

test('F-1: custom maxNearCopyRisk = 1 — nearCopyRisk = 2 must fail', () => {
  const result = assertVNextSimilarityAudit(
    scores({ nearCopyRisk: 2 }),
    { minScore: 4, maxNearCopyRisk: 1 },
  );
  assert.equal(result.nearCopyRisk, false, 'nearCopyRisk=2 exceeds tightened cap=1');
  assert.equal(result.overall, false);
});

test('F-1: custom thresholds honor both — overall only true when BOTH constraints are met', () => {
  // All dims = 5 (passes minScore=5) + nearCopyRisk = 1 (passes maxRisk=1)
  const result = assertVNextSimilarityAudit(
    scores({
      visualWorldFidelity: 5,
      sceneAccuracy: 5,
      functionalRealism: 5,
      targetSceneAuthority: 5,
      referenceAlignment: 5,
      nearCopyRisk: 1,
    }),
    { minScore: 5, maxNearCopyRisk: 1 },
  );
  assert.equal(result.overall, true);
});

// ---------------------------------------------------------------------
// 6. Overall = true requires every dimension individually true
// ---------------------------------------------------------------------

test('F-1: 5 dimensions pass + 1 fails → overall false, the failing bool is false', () => {
  const result = assertVNextSimilarityAudit(scores({ sceneAccuracy: 3 }));
  assert.equal(result.visualWorldFidelity, true);
  assert.equal(result.functionalRealism, true);
  assert.equal(result.targetSceneAuthority, true);
  assert.equal(result.referenceAlignment, true);
  assert.equal(result.nearCopyRisk, true);
  assert.equal(result.sceneAccuracy, false, 'only sceneAccuracy must be flagged');
  assert.equal(result.overall, false, 'overall must be false when any one dimension fails');
});

test('F-1: only nearCopyRisk fails → overall false, others all true', () => {
  const result = assertVNextSimilarityAudit(scores({ nearCopyRisk: 5 }));
  assert.equal(result.visualWorldFidelity, true);
  assert.equal(result.sceneAccuracy, true);
  assert.equal(result.functionalRealism, true);
  assert.equal(result.targetSceneAuthority, true);
  assert.equal(result.referenceAlignment, true);
  assert.equal(result.nearCopyRisk, false, 'nearCopyRisk=5 is essentially a 1:1 copy → fail');
  assert.equal(result.overall, false);
});

// ---------------------------------------------------------------------
// 7. Result shape (returns exactly the 7 documented boolean fields)
// ---------------------------------------------------------------------

test('F-1: result has exactly 7 fields: 6 dimensions + overall, no extras', () => {
  const result = assertVNextSimilarityAudit(scores());
  const keys = Object.keys(result).sort();
  assert.deepEqual(keys, [
    'functionalRealism',
    'nearCopyRisk',
    'overall',
    'referenceAlignment',
    'sceneAccuracy',
    'targetSceneAuthority',
    'visualWorldFidelity',
  ]);
});

// ---------------------------------------------------------------------
// 8. Default thresholds are the v2.0 thresholds (no caller override)
// ---------------------------------------------------------------------

test('F-1: when no thresholds arg is passed, the v2.0 thresholds are used', () => {
  // visualWorldFidelity = 3 with default minScore = 4 must fail
  const result = assertVNextSimilarityAudit(scores({ visualWorldFidelity: 3 }));
  assert.equal(result.visualWorldFidelity, false, 'default minScore must be 4');
  // nearCopyRisk = 2 with default maxNearCopyRisk = 2.5 must pass
  assert.equal(result.nearCopyRisk, true, 'default maxNearCopyRisk must be 2.5');
});
