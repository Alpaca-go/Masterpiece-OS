// r2.0 §4.13 / Phase D: Gate A (compile-time integrity) unit tests.
//
// Pins the contract for assertSpaceGenerationRouteGateA:
//   - the gate is read-only on the COMPILED prompt (never reads an
//     edited / user override)
//   - the gate fails closed on missing required blocks, wrong block
//     order, prompt budget violation, wrong compiler id, missing
//     reference, wrong aspect ratio, and bad spatial semantic
//   - the gate keeps the short-chain-service.ts:561-568 minimum fix: when
//     trace.promptCharacters is missing/NaN, fall back to the literal
//     length of the COMPILED prompt
//
// The legacy `assertSpaceGenerationRouteIntegrity` keeps working
// (re-exported from the same file) so the existing 9-test file under
// `tests/image-generation/space-route-integrity.test.js` is unaffected.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSpaceGenerationRouteGateA,
  SPACE_COMPILE_INTEGRITY_GATE_VERSION,
} from '@masterpiece/image-generation-runtime/space/gates/compile-integrity-gate.js';
import { ACTIVE_SPACE_ROUTE_BASELINE } from '@masterpiece/image-generation-runtime/space/quality-baselines/active-space-route-baseline.js';

const REQUIRED_BLOCKS = ACTIVE_SPACE_ROUTE_BASELINE.requiredBlockIds;

function compileInput(overrides = {}) {
  const generationBasis = overrides.generationBasis ?? 'standard';
  const referenceCount = overrides.referenceCount ?? (
    generationBasis === 'reference_first' || generationBasis === 'continuation' ? 1 : 0
  );
  return {
    taskContract: {
      deliverableFamily: 'space',
      generationBasis,
      referenceAssetIds: referenceCount ? ['ref-1'] : [],
      ...(generationBasis === 'continuation' ? {
        continuation: {
          referenceRole: 'world_consistency',
          targetFunctionalProgram: { sceneId: 'consultation' },
          continuationBoundary: { preserve: [], regenerate: [] },
        },
      } : {}),
    },
    compilerMode: 'r8_6_golden',
    trace: {
      spaceGeneration: {
        compilerId: 'phase9b-quality-compiler',
        promptCharacters: 6500,
        architectureCharacters: 3000,
      },
    },
    blockIds: REQUIRED_BLOCKS,
    providerReferenceCount: referenceCount,
    referenceMode: referenceCount ? 'reference_assisted' : 'text_only',
    referenceSources: referenceCount
      ? (generationBasis === 'continuation' ? ['confirmed_generated_output'] : ['user_explicit'])
      : [],
    spatialSemanticReport: { status: 'pass', findings: [] },
    requestedAspectRatio: '16:9',
    providerAspectRatio: '16:9',
    providerSize: '2560*1440',
    ...overrides,
  };
}

test('D-1: Gate A version constant is exported and follows the gate versioning scheme', () => {
  assert.match(SPACE_COMPILE_INTEGRITY_GATE_VERSION, /^space-compile-integrity-gate@/);
});

test('D-1: Gate A returns null for non-space deliverable families (matches legacy)', () => {
  const input = compileInput();
  input.taskContract.deliverableFamily = 'packaging';
  assert.equal(assertSpaceGenerationRouteGateA(input), null);
});

test('D-1: standard + refs=0 reaches r8_6_golden with all required blocks', () => {
  const result = assertSpaceGenerationRouteGateA(compileInput());
  assert.equal(result.routeIntegrity.status, 'pass');
  assert.equal(result.referenceMode, 'text_only');
  assert.equal(result.routeIntegrity.canonicalCompilerMode, 'r8_6_golden');
});

test('D-1: reference_first + refs=1 reaches r8_6_golden with explicit provenance', () => {
  const result = assertSpaceGenerationRouteGateA(compileInput({
    generationBasis: 'reference_first',
  }));
  assert.equal(result.routeIntegrity.status, 'pass');
  assert.equal(result.routeIntegrity.referencePolicyMatched, true);
});

test('D-1: continuation + refs=1 reaches r8_6_golden with world_consistency source', () => {
  const result = assertSpaceGenerationRouteGateA(compileInput({
    generationBasis: 'continuation',
  }));
  assert.equal(result.routeIntegrity.status, 'pass');
  assert.equal(result.routeIntegrity.referencePolicyMatched, true);
});

test('D-1: phase9b_quality compiler mode is normalized to canonical r8_6_golden', () => {
  const result = assertSpaceGenerationRouteGateA(compileInput({
    compilerMode: 'phase9b_quality',
  }));
  assert.equal(result.routeIntegrity.canonicalCompilerMode, 'r8_6_golden');
  assert.equal(result.routeIntegrity.compilerMatched, true);
});

test('D-1: missing required block fails closed with SPACE_COMPILER_ROUTE_MISMATCH', () => {
  const input = compileInput({ blockIds: REQUIRED_BLOCKS.slice(0, 6) });
  let caught;
  try {
    assertSpaceGenerationRouteGateA(input);
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'SPACE_COMPILER_ROUTE_MISMATCH');
  assert.equal(caught.details.compilerMatched, true);
  assert.equal(caught.details.requiredBlocksPresent, false);
});

test('D-1: wrong block order fails closed (regression: orderedSubset)', () => {
  // Reverse the order — every required block is present but the
  // subset is no longer in the canonical order.
  const input = compileInput({ blockIds: [...REQUIRED_BLOCKS].reverse() });
  let caught;
  try {
    assertSpaceGenerationRouteGateA(input);
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'SPACE_COMPILER_ROUTE_MISMATCH');
  assert.equal(caught.details.blockOrderMatched, false);
});

test('D-1: prompt budget violation fails closed (over cap)', () => {
  const input = compileInput();
  input.trace.spaceGeneration.promptCharacters = 8000; // > 7500 baseline max
  let caught;
  try { assertSpaceGenerationRouteGateA(input); } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'SPACE_COMPILER_ROUTE_MISMATCH');
  assert.equal(caught.details.promptBudgetMatched, false);
});

test('D-1: prompt budget violation fails closed (under floor)', () => {
  const input = compileInput();
  input.trace.spaceGeneration.promptCharacters = 5000; // < 5800 baseline min
  let caught;
  try { assertSpaceGenerationRouteGateA(input); } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.details.promptBudgetMatched, false);
});

test('D-1: reference_first with refs=0 fails closed (regression: SPACE_REFERENCE_FIRST_REFERENCE_REQUIRED)', () => {
  const input = compileInput({ generationBasis: 'reference_first', referenceCount: 0 });
  let caught;
  try { assertSpaceGenerationRouteGateA(input); } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'SPACE_REFERENCE_FIRST_REFERENCE_REQUIRED');
});

test('D-1: continuation with refs=0 fails closed (regression: SPACE_CONTINUATION_REFERENCE_REQUIRED)', () => {
  const input = compileInput({ generationBasis: 'continuation', referenceCount: 0 });
  let caught;
  try { assertSpaceGenerationRouteGateA(input); } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'SPACE_CONTINUATION_REFERENCE_REQUIRED');
});

test('D-1: spatial semantic report != pass fails closed with ANALYSIS_SPATIAL_SEMANTICS_INVALID', () => {
  const input = compileInput();
  input.spatialSemanticReport = { status: 'block', findings: [{ code: 'X' }] };
  let caught;
  try { assertSpaceGenerationRouteGateA(input); } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'ANALYSIS_SPATIAL_SEMANTICS_INVALID');
});

test('D-1: aspect ratio mismatch fails closed with SPACE_PROVIDER_ASPECT_RATIO_MISMATCH', () => {
  const input = compileInput();
  input.providerSize = '1024*1024'; // 1:1 — but requested is 16:9
  let caught;
  try { assertSpaceGenerationRouteGateA(input); } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'SPACE_PROVIDER_ASPECT_RATIO_MISMATCH');
});

test('D-1: budget fallback (short-chain-service.ts:561-568 minimum fix) — missing promptCharacters uses compiled prompt length', () => {
  // trace.promptCharacters is undefined; Gate A must fall back to the
  // literal length of the COMPILED prompt (input.promptCharacters).
  const input = compileInput();
  delete input.trace.spaceGeneration.promptCharacters;
  input.promptCharacters = 6500;
  const result = assertSpaceGenerationRouteGateA(input);
  assert.equal(result.routeIntegrity.status, 'pass');
  assert.equal(result.promptCharacters, 6500);
});

test('D-1: budget fallback (short-chain-service.ts:561-568 minimum fix) — NaN promptCharacters also uses fallback', () => {
  const input = compileInput();
  input.trace.spaceGeneration.promptCharacters = Number.NaN;
  input.promptCharacters = 6500;
  const result = assertSpaceGenerationRouteGateA(input);
  assert.equal(result.promptCharacters, 6500);
});

test('D-1: Gate A is read-only on compile artifacts — it does NOT expose an editedPrompt field', () => {
  // Sanity: the function signature has no `editedPrompt` / `actualPrompt`
  // / `userOverride` / `correctedPrompt` field. The compile-time
  // contract is intentionally narrower than the start() input.
  const result = assertSpaceGenerationRouteGateA(compileInput());
  const exposedFields = Object.keys(result);
  for (const forbidden of [
    'editedPrompt',
    'actualPrompt',
    'userOverride',
    'correctedPrompt',
  ]) {
    assert.ok(!exposedFields.includes(forbidden), `Gate A must not expose ${forbidden}`);
  }
});
