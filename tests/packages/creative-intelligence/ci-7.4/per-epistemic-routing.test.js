/**
 * CI-W1C.7.4 — Epistemic Routing (PER-01..07).
 *
 * Verifies that `epistemic-routing.ts` does NOT auto-promote and
 * preserves epistemic class:
 *   - USER_REQUIREMENT → USER_REQ (never TRUTH)
 *   - MODEL_INFERENCE → INFERENCE (never TRUTH)
 *   - UNKNOWN → UNKNOWN (never fabricated)
 *   - FACT + truthKey → TRUTH
 *   - FACT + no truthKey → EVIDENCE_ONLY
 *
 * Also verifies that sourceRole != epistemicClass is preserved.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PLANNING_TO_TRUTH_KEY,
  routePlanningClaim,
  assertEpistemicClassPreserved
} from '../../../../packages/creative-intelligence/src/strategic-synthesis/index.ts';

function makeClaim(over) {
  return {
    claimId: 'src:industry:abcd',
    key: 'industry',
    value: 'organic grocery',
    epistemicClass: 'FACT',
    sourceDocumentId: 'src',
    chunkRefs: ['chunk-1'],
    ...over
  };
}

// ---------------------------------------------------------------------------
// PER-01..04 — four-way routing
// ---------------------------------------------------------------------------

test('PER-01: FACT + truthKey → TRUTH (industry → business.industry)', () => {
  const claim = makeClaim({ key: 'industry', epistemicClass: 'FACT' });
  const decision = routePlanningClaim(claim);
  assert.equal(decision.destination, 'TRUTH');
  assert.equal(decision.truthKey, 'business.industry');
  assert.ok(decision.routedId.startsWith('planning-fact:'));
});

test('PER-02: FACT + no truthKey → EVIDENCE_ONLY (not promoted to TRUTH)', () => {
  // brand_positioning has no truthKey in the minimal registry.
  const claim = makeClaim({ key: 'brand_positioning', epistemicClass: 'FACT' });
  const decision = routePlanningClaim(claim);
  assert.equal(decision.destination, 'EVIDENCE_ONLY');
  assert.equal(decision.truthKey, undefined);
  assert.ok(decision.routedId.startsWith('planning-evidence:'));
});

test('PER-03: USER_REQUIREMENT → USER_REQ (never TRUTH, even if truthKey exists)', () => {
  // industry has a truthKey, but USER_REQUIREMENT must NOT be promoted.
  const claim = makeClaim({ key: 'industry', epistemicClass: 'USER_REQUIREMENT' });
  const decision = routePlanningClaim(claim);
  assert.equal(decision.destination, 'USER_REQ');
  assert.equal(decision.truthKey, undefined);
  assert.ok(decision.routedId.startsWith('planning-req:'));
});

test('PER-04: MODEL_INFERENCE → INFERENCE; UNKNOWN → UNKNOWN (no fabrication)', () => {
  const inf = makeClaim({ key: 'industry', epistemicClass: 'MODEL_INFERENCE' });
  const unk = makeClaim({ key: 'industry', epistemicClass: 'UNKNOWN' });
  assert.equal(routePlanningClaim(inf).destination, 'INFERENCE');
  assert.equal(routePlanningClaim(unk).destination, 'UNKNOWN');
  // The routed ids must be distinct from TRUTH/USER_REQ/EVIDENCE_ONLY.
  assert.ok(routePlanningClaim(inf).routedId.startsWith('planning-inference:'));
  assert.ok(routePlanningClaim(unk).routedId.startsWith('planning-unknown:'));
});

// ---------------------------------------------------------------------------
// PER-05..06 — registry and assert
// ---------------------------------------------------------------------------

test('PER-05: PLANNING_TO_TRUTH_KEY only contains industry + brand_role (CI-W1C.7.4 minimal)', () => {
  assert.equal(Object.keys(PLANNING_TO_TRUTH_KEY).length, 2);
  assert.equal(PLANNING_TO_TRUTH_KEY.industry, 'business.industry');
  assert.equal(PLANNING_TO_TRUTH_KEY.brand_role, 'brand.role');
  // The other 14 keys must NOT be in the registry.
  for (const k of [
    'brand_positioning',
    'business_model',
    'product_service',
    'target_audience',
    'audience_problem',
    'brand_promise',
    'competitive_context',
    'differentiation_logic',
    'communication_task',
    'strategic_objective',
    'experience_objective',
    'transformation_objective',
    'touchpoint_priority',
    'brand_personality'
  ]) {
    assert.equal(PLANNING_TO_TRUTH_KEY[k], undefined, `unexpected truthKey mapping for ${k}`);
  }
});

test('PER-06: assertEpistemicClassPreserved accepts PLANNING_STRATEGIC_SOURCE with any class', () => {
  // All four epistemic classes are valid under PLANNING_STRATEGIC_SOURCE.
  for (const ec of ['FACT', 'USER_REQUIREMENT', 'MODEL_INFERENCE', 'UNKNOWN']) {
    assertEpistemicClassPreserved('PLANNING_STRATEGIC_SOURCE', ec);
  }
  // A non-planning sourceRole is rejected (defensive).
  assert.throws(
    () => assertEpistemicClassPreserved('LEGACY_VISUAL_EVIDENCE', 'FACT'),
    /PLANNING-SOURCE-ROLE-MISMATCH/
  );
  assert.throws(
    () => assertEpistemicClassPreserved('UNKNOWN_SOURCE', 'FACT'),
    /PLANNING-SOURCE-ROLE-MISMATCH/
  );
});

// ---------------------------------------------------------------------------
// PER-07 — exhaustiveness: unknown epistemic class throws
// ---------------------------------------------------------------------------

test('PER-07: routePlanningClaim refuses unknown epistemic class', () => {
  const claim = makeClaim({ epistemicClass: 'NOT_A_REAL_CLASS' });
  assert.throws(() => routePlanningClaim(claim), /PLANNING-EPISTEMIC-ROUTING-UNHANDLED/);
});
