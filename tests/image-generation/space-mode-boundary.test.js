// R11.2.2 Mode Boundary — Reference-First / Continuation semantics.
//
// Freezes the three generation modes, the cross-scene advisory rule, and the
// Route Semantic Gate (composition-preservation leak + high-fidelity semantic
// mismatch must fail closed for Continuation; Reference-First cross-scene usage
// is advisory only, never blocking).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const spaceUrl = pathToFileURL(path.join(
  repoRoot,
  'packages/image-generation-runtime/src/space/index.js',
)).href;
const {
  SPACE_GENERATION_MODES,
  evaluateSpaceModeBoundary,
  isHighFidelityReferenceRole,
  detectCompositionPreservationLeak,
  validateSpaceGenerationModeSemantics,
} = await import(spaceUrl);

test('R11.2.2 the three modes are frozen with distinct semantics', () => {
  assert.equal(SPACE_GENERATION_MODES.standard.referenceMode, 'text_only');
  assert.equal(SPACE_GENERATION_MODES.reference_first.referenceRole, 'high_fidelity_visual_reference');
  assert.equal(SPACE_GENERATION_MODES.continuation.referenceRole, 'world_consistency');
  assert.equal(SPACE_GENERATION_MODES.continuation.referenceSource, 'confirmed_generated_output');
});

// Test A — same-scene Reference-First: no advisory.
test('R11.2.2 Test A: same-scene generated-output reference has no advisory', () => {
  const decision = evaluateSpaceModeBoundary({
    currentMode: 'reference_first',
    sourceAssetOrigin: 'generated_output',
    sourceScene: 'reception',
    targetScene: 'reception',
  });
  assert.equal(decision.crossSceneKnown, false);
  assert.equal(decision.advisory, null);
});

// Test B — cross-scene generated output in Reference-First: advisory shown.
test('R11.2.2 Test B: cross-scene generated-output reference triggers advisory', () => {
  const decision = evaluateSpaceModeBoundary({
    currentMode: 'reference_first',
    sourceAssetOrigin: 'generated_output',
    sourceScene: 'reception',
    targetScene: 'consultation',
  });
  assert.equal(decision.crossSceneKnown, true);
  assert.equal(decision.advisory?.code, 'SPACE_REFERENCE_FIRST_CROSS_SCENE_ADVISORY');
  assert.equal(decision.advisory?.severity, 'info');
  assert.equal(decision.recommendedMode, 'continuation');
});

// Test C — "仍使用参考优先": the advisory must never fail closed.
test('R11.2.2 Test C: cross-scene Reference-First stays advisory-only (never blocking)', () => {
  const gate = validateSpaceGenerationModeSemantics({
    generationBasis: 'reference_first',
    referenceRole: 'high_fidelity_visual_reference',
    referenceSources: ['user_explicit'],
    referenceCount: 1,
    sourceAssetOrigin: 'generated_output',
    sourceScene: 'reception',
    targetScene: 'consultation',
  });
  assert.equal(gate.status, 'pass');
  assert.equal(gate.advisory?.code, 'SPACE_REFERENCE_FIRST_CROSS_SCENE_ADVISORY');
});

// Test E — user-upload cross-scene unknown: no scene-mismatch assertion.
test('R11.2.2 Test E: user-upload reference never asserts a scene mismatch', () => {
  const decision = evaluateSpaceModeBoundary({
    currentMode: 'reference_first',
    sourceAssetOrigin: 'user_upload',
    sourceScene: undefined,
    targetScene: 'consultation',
  });
  assert.equal(decision.crossSceneKnown, false);
  assert.equal(decision.advisory, null);
  assert.doesNotThrow(() => validateSpaceGenerationModeSemantics({
    generationBasis: 'reference_first',
    referenceRole: 'high_fidelity_visual_reference',
    referenceSources: ['user_explicit'],
    referenceCount: 1,
    sourceAssetOrigin: 'user_upload',
    targetScene: 'consultation',
  }));
});

// Test F — continuation route requires world_consistency semantics.
test('R11.2.2 Test F: continuation passes with world_consistency + confirmed source', () => {
  const gate = validateSpaceGenerationModeSemantics({
    generationBasis: 'continuation',
    referenceRole: 'world_consistency',
    referenceSources: ['confirmed_generated_output'],
    referenceCount: 1,
    sourceScene: 'reception',
    targetScene: 'consultation',
    finalPrompt: '# Task\nScene: consultation / human_scale_consultation_view\n',
  });
  assert.equal(gate.status, 'pass');
  assert.equal(gate.advisory, null);
});

// Test G — composition-preservation leak in a continuation prompt must FAIL.
test('R11.2.2 Test G: composition-preservation leak fails closed', () => {
  assert.equal(
    detectCompositionPreservationLeak('Preserve the requested shot/composition: entrance_view'),
    true,
  );
  assert.equal(detectCompositionPreservationLeak('# Task\nRegenerate composition for consultation.'), false);
  assert.throws(
    () => validateSpaceGenerationModeSemantics({
      generationBasis: 'continuation',
      referenceRole: 'world_consistency',
      referenceSources: ['confirmed_generated_output'],
      referenceCount: 1,
      finalPrompt: 'Preserve the requested shot/composition: entrance_view',
    }),
    { code: 'SPACE_CONTINUATION_COMPOSITION_PRESERVATION_LEAK' },
  );
});

// Test H — high-fidelity semantic leak in a continuation must FAIL.
test('R11.2.2 Test H: high-fidelity reference semantics fail closed for continuation', () => {
  assert.equal(isHighFidelityReferenceRole('high_fidelity_visual_reference'), true);
  assert.equal(isHighFidelityReferenceRole('world_consistency'), false);
  assert.throws(
    () => validateSpaceGenerationModeSemantics({
      generationBasis: 'continuation',
      referenceRole: 'high_fidelity_visual_reference',
      referenceSources: ['confirmed_generated_output'],
      referenceCount: 1,
    }),
    { code: 'SPACE_CONTINUATION_REFERENCE_SEMANTIC_MISMATCH' },
  );
});

test('R11.2.2 continuation without exactly one confirmed source fails closed', () => {
  assert.throws(
    () => validateSpaceGenerationModeSemantics({
      generationBasis: 'continuation',
      referenceRole: 'world_consistency',
      referenceSources: ['user_explicit'],
      referenceCount: 1,
    }),
    { code: 'SPACE_CONTINUATION_REFERENCE_REQUIRED' },
  );
});

test('R11.2.2 standard with references fails closed', () => {
  assert.throws(
    () => validateSpaceGenerationModeSemantics({
      generationBasis: 'standard',
      referenceCount: 1,
    }),
    { code: 'SPACE_STANDARD_REFERENCE_NOT_ALLOWED' },
  );
});
