// r2.0 §4.13 / Phase D: Gate B (provider-prompt) unit tests.
//
// Pins the contract for assertProviderPromptGateB:
//   - non-empty prompt
//   - character count within provider capability
//   - generation basis sanity: standard rejects reference boundary
//     block, reference_first requires the reference boundary block,
//     continuation is permissive (world_consistency is a structural
//     property, not a string)
//   - target scene marker is present (when basis != standard)
//
// Gate B is independent of the compile artifacts. It is the
// Provider-side final sanity check on the actual prompt string.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertProviderPromptGateB,
  SPACE_PROVIDER_PROMPT_GATE_VERSION,
} from '@masterpiece/image-generation-runtime/space/gates/provider-prompt-gate.js';

const SEEDREAM_CAPABILITY = Object.freeze({
  reference: { maxReferenceImages: 2 },
  prompt: { maxCharacters: 12000 },
});

function referenceFirstPrompt(extra = '') {
  return [
    '# Task',
    'Generate a single premium-grade space image for **九州美学** (医美).',
    'Scene: `consultation` / human_scale_consultation_view.',
    '',
    '# Architecture-Function Bridge',
    '...consultation-specific content...',
    '',
    'REFERENCE BOUNDARY (high-priority instruction):',
    'The target scene is a different functional class from the reference; inherit design language only.',
    'Target scene: consultation.',
    'Preserve from the reference image:',
    '- architectural language',
    '- material combination',
    '- lighting temperament',
    'Target scene is authoritative for:',
    '- function',
    '- furniture',
    '- privacy',
    extra,
  ].filter(Boolean).join('\n');
}

test('D-2: Gate B version constant is exported and follows the gate versioning scheme', () => {
  assert.match(SPACE_PROVIDER_PROMPT_GATE_VERSION, /^space-provider-prompt-gate@/);
});

test('D-2: reference_first with boundary block passes', () => {
  const result = assertProviderPromptGateB({
    actualPrompt: referenceFirstPrompt(),
    compiledPrompt: referenceFirstPrompt(),
    providerCapability: SEEDREAM_CAPABILITY,
    generationBasis: 'reference_first',
    targetScene: 'consultation',
    targetSceneLabel: 'consultation',
  });
  assert.equal(result.passed, true);
  assert.equal(result.checks.nonEmpty, true);
  assert.equal(result.checks.withinProviderCap, true);
  assert.equal(result.checks.generationBasisMatches, true);
  assert.equal(result.checks.targetSceneMarker, true);
});

test('D-2: reference_first prompt that lost the boundary block fails closed', () => {
  // A user edit that strips the Reference Boundary is a real
  // Provider-prompt regression (it would let the model re-fall into
  // the old "high-fidelity reference" semantics). Strip every line
  // from the boundary header to the next blank line.
  const full = referenceFirstPrompt().split('\n');
  const startIdx = full.findIndex((line) => line.startsWith('REFERENCE BOUNDARY'));
  assert.ok(startIdx >= 0, 'test setup: prompt should contain the boundary block');
  const stripped = full.slice(0, startIdx).join('\n');
  let caught;
  try {
    assertProviderPromptGateB({
      actualPrompt: stripped,
      compiledPrompt: referenceFirstPrompt(),
      providerCapability: SEEDREAM_CAPABILITY,
      generationBasis: 'reference_first',
      targetScene: 'consultation',
      targetSceneLabel: 'consultation',
    });
  } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'SPACE_PROVIDER_PROMPT_INVALID');
  assert.equal(caught.details.checks.generationBasisMatches, false);
});

test('D-2: standard prompt that accidentally carries a reference boundary fails closed', () => {
  const prompt = 'A standard prompt\n\nREFERENCE BOUNDARY (high-priority instruction):\nstuff';
  let caught;
  try {
    assertProviderPromptGateB({
      actualPrompt: prompt,
      compiledPrompt: prompt,
      providerCapability: SEEDREAM_CAPABILITY,
      generationBasis: 'standard',
    });
  } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'SPACE_PROVIDER_PROMPT_INVALID');
  assert.equal(caught.details.unexpectedReferenceLabel, 'REFERENCE BOUNDARY');
});

test('D-2: empty prompt fails closed (non-empty check)', () => {
  let caught;
  try {
    assertProviderPromptGateB({
      actualPrompt: '',
      compiledPrompt: '',
      providerCapability: SEEDREAM_CAPABILITY,
      generationBasis: 'standard',
    });
  } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'SPACE_PROVIDER_PROMPT_INVALID');
  assert.equal(caught.details.checks.nonEmpty, false);
});

test('D-2: prompt over provider cap fails closed (withinProviderCap check)', () => {
  const oversized = 'x'.repeat(12001);
  let caught;
  try {
    assertProviderPromptGateB({
      actualPrompt: oversized,
      compiledPrompt: oversized,
      providerCapability: SEEDREAM_CAPABILITY,
      generationBasis: 'standard',
    });
  } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'SPACE_PROVIDER_PROMPT_INVALID');
  assert.equal(caught.details.checks.withinProviderCap, false);
  assert.equal(caught.details.characterCount, 12001);
  assert.equal(caught.details.providerCap, 12000);
});

test('D-2: prompt exactly at the cap passes (withinProviderCap boundary)', () => {
  const atCap = 'x'.repeat(12000);
  const result = assertProviderPromptGateB({
    actualPrompt: atCap,
    compiledPrompt: atCap,
    providerCapability: SEEDREAM_CAPABILITY,
    generationBasis: 'standard',
  });
  assert.equal(result.passed, true);
  assert.equal(result.checks.withinProviderCap, true);
});

test('D-2: continuation prompt is permissive on world_consistency string (it is a STRUCTURAL role)', () => {
  // The R11.1 v1.2 Continuation Intent block renderer is currently
  // broken for the V5 packet path (pre-existing bug, not r2.0 scope);
  // the rendered prompt does NOT contain "world_consistency" or
  // "Continuation Intent" as literal strings. Gate B's continuation
  // path is therefore permissive on these strings: the world_consistency
  // role is verified by Gate A's reference policy match. The actual
  // prompt just needs to reach the model.
  const continuationPrompt = [
    '# Task',
    'Scene: `consultation`',
    '# Architecture-Function Bridge',
    '咨询室 ... 1 对 1 / 1 对 2 专业咨询',
  ].join('\n');
  const result = assertProviderPromptGateB({
    actualPrompt: continuationPrompt,
    compiledPrompt: continuationPrompt,
    providerCapability: SEEDREAM_CAPABILITY,
    generationBasis: 'continuation',
    targetScene: 'consultation',
    targetSceneLabel: 'consultation',
  });
  assert.equal(result.passed, true);
  assert.equal(result.checks.generationBasisMatches, true);
});

test('D-2: continuation prompt missing target scene marker still fails closed (Check 4)', () => {
  const prompt = 'Continuation prompt without target scene marker';
  let caught;
  try {
    assertProviderPromptGateB({
      actualPrompt: prompt,
      compiledPrompt: prompt,
      providerCapability: SEEDREAM_CAPABILITY,
      generationBasis: 'continuation',
      targetScene: 'consultation',
      targetSceneLabel: 'consultation',
    });
  } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'SPACE_PROVIDER_PROMPT_INVALID');
  assert.equal(caught.details.checks.targetSceneMarker, false);
});

test('D-2: reference_first prompt missing target scene marker fails closed (Check 4)', () => {
  // Build a prompt that has the Reference Boundary block but no
  // "consultation" or its label anywhere — e.g. a hypothetical
  // regression where the boundary was edited but the target scene
  // marker was lost. The gate must catch this.
  const prompt = [
    '# Task',
    'Generate a single premium-grade space image.',
    'Scene: `lobby`',
    '',
    'REFERENCE BOUNDARY (high-priority instruction):',
    'Preserve from the reference image:',
    '- architectural language',
    '- material combination',
  ].join('\n');
  let caught;
  try {
    assertProviderPromptGateB({
      actualPrompt: prompt,
      compiledPrompt: referenceFirstPrompt(),
      providerCapability: SEEDREAM_CAPABILITY,
      generationBasis: 'reference_first',
      targetScene: 'consultation',
      targetSceneLabel: 'consultation',
    });
  } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.details.checks.targetSceneMarker, false);
});

test('D-2: target scene label (Chinese) is also accepted (i18n compatibility)', () => {
  const prompt = referenceFirstPrompt()
    .replace(/Scene: `consultation`/, 'Scene: 咨询室');
  const result = assertProviderPromptGateB({
    actualPrompt: prompt,
    compiledPrompt: prompt,
    providerCapability: SEEDREAM_CAPABILITY,
    generationBasis: 'reference_first',
    targetScene: 'consultation',
    targetSceneLabel: '咨询室',
  });
  assert.equal(result.passed, true);
  assert.equal(result.checks.targetSceneMarker, true);
});

test('D-2: standard prompt with no target scene requirement passes (Check 4 is N/A)', () => {
  const prompt = 'A simple standard prompt with no target scene reference';
  const result = assertProviderPromptGateB({
    actualPrompt: prompt,
    compiledPrompt: prompt,
    providerCapability: SEEDREAM_CAPABILITY,
    generationBasis: 'standard',
  });
  assert.equal(result.passed, true);
  assert.equal(result.checks.targetSceneMarker, true);
});

test('D-2: invalid generationBasis fails closed', () => {
  let caught;
  try {
    assertProviderPromptGateB({
      actualPrompt: 'any prompt',
      compiledPrompt: 'any prompt',
      providerCapability: SEEDREAM_CAPABILITY,
      generationBasis: 'something_unknown',
      targetScene: 'consultation',
    });
  } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'SPACE_PROVIDER_PROMPT_INVALID');
});

test('D-2: missing actualPrompt parameter fails closed (treated as empty)', () => {
  let caught;
  try {
    assertProviderPromptGateB({
      providerCapability: SEEDREAM_CAPABILITY,
      generationBasis: 'standard',
    });
  } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.code, 'SPACE_PROVIDER_PROMPT_INVALID');
  assert.equal(caught.details.checks.nonEmpty, false);
});

test('D-2: provider capability with smaller cap is honored', () => {
  const tightCap = Object.freeze({ prompt: { maxCharacters: 100 }, reference: {} });
  const prompt = 'x'.repeat(101);
  let caught;
  try {
    assertProviderPromptGateB({
      actualPrompt: prompt,
      compiledPrompt: prompt,
      providerCapability: tightCap,
      generationBasis: 'standard',
    });
  } catch (error) { caught = error; }
  assert.ok(caught, 'expected throw');
  assert.equal(caught.details.providerCap, 100);
});

test('D-2: isEdited flag is returned in the success payload (audit trail)', () => {
  const prompt = referenceFirstPrompt();
  const result = assertProviderPromptGateB({
    actualPrompt: prompt,
    compiledPrompt: prompt,
    providerCapability: SEEDREAM_CAPABILITY,
    generationBasis: 'reference_first',
    targetScene: 'consultation',
    targetSceneLabel: 'consultation',
    isEdited: true,
  });
  assert.equal(result.passed, true);
  assert.equal(result.isEdited, true);
});
