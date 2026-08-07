// Space quality gate tests (Recovery R5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { runSpaceQualityGate } from '../../packages/image-generation-runtime/src/vnext/space-quality/index.js';

const REQUIRED_IDS = [
  'spatial_intent',
  'architecture_language',
  'architecture_function_bridge',
  'architectural_concept',
];

function archRichBlocks(extra = {}) {
  const base = {
    spatial_intent: { text: '# Spatial Intent\n\n' + 'x'.repeat(200) },
    architecture_language: { text: '# Arch Lang\n\n' + 'y'.repeat(200) },
    architecture_context: { text: '# Ctx\n\ncontext' },
    architecture_function_bridge: { text: '# Bridge\n\n' + 'z'.repeat(200) },
    architectural_concept: { text: '# Concept\n\n' + 'w'.repeat(200) },
    architecture_dna: { text: '# DNA\n\n' + 'd'.repeat(100) },
    brand_translation: { text: '# Brand\n\nbrand' },
    negative_constraints: { text: '# Neg\n\nno neon' },
  };
  return { ...base, ...extra };
}

test('passes when all architecture blocks present, ordered, references >= 1', () => {
  const blocksById = archRichBlocks();
  const blockIds = Object.keys(blocksById);
  const result = runSpaceQualityGate({
    finalPrompt: 'x'.repeat(2000),
    blockIds,
    blocksById,
    referenceCount: 1,
  });
  assert.equal(result.status, 'pass', JSON.stringify(result.findings));
});

test('SPACE_REFERENCE_MISSING blocks first formal generation when referenceCount=0', () => {
  const blocksById = archRichBlocks();
  const result = runSpaceQualityGate({
    finalPrompt: 'x'.repeat(2000),
    blockIds: Object.keys(blocksById),
    blocksById,
    referenceCount: 0,
  });
  assert.equal(result.status, 'blocked');
  assert.ok(result.findings.some((f) => f.code === 'SPACE_REFERENCE_MISSING'));
});

test('SPACE_REFERENCE_MISSING suppressed by explicit bypass (debug)', () => {
  const blocksById = archRichBlocks();
  const result = runSpaceQualityGate({
    finalPrompt: 'x'.repeat(2000),
    blockIds: Object.keys(blocksById),
    blocksById,
    referenceCount: 0,
    hasExplicitReferenceBypass: true,
  });
  assert.equal(result.status, 'pass');
});

test('ARCHITECTURE_CONTEXT_MISSING when required block absent', () => {
  const blocksById = archRichBlocks();
  delete blocksById.architectural_concept;
  const result = runSpaceQualityGate({
    finalPrompt: 'x',
    blockIds: Object.keys(blocksById),
    blocksById,
    referenceCount: 1,
  });
  assert.equal(result.status, 'blocked');
  assert.ok(result.findings.some((f) => f.code === 'ARCHITECTURE_CONTEXT_MISSING'));
});

test('ARCHITECTURE_CONTEXT_MISSING when brand appears before concept', () => {
  const blocksById = archRichBlocks();
  // Order: brand before concept.
  const blockIds = [
    'spatial_intent',
    'architecture_language',
    'architecture_function_bridge',
    'brand_translation',
    'architectural_concept',
    'architecture_dna',
    'negative_constraints',
  ];
  const result = runSpaceQualityGate({
    finalPrompt: 'x',
    blockIds,
    blocksById,
    referenceCount: 1,
  });
  assert.equal(result.status, 'blocked');
  assert.ok(
    result.findings.some(
      (f) => f.code === 'ARCHITECTURE_CONTEXT_MISSING' && /after architectural concept/i.test(f.detail),
    ),
  );
});

test('SPACE_POSITIVE_ARCHITECTURE_TOO_WEAK when arch content thin', () => {
  const thin = {};
  for (const id of REQUIRED_IDS) thin[id] = { text: `# ${id}\n\nshort` };
  thin.architecture_dna = { text: '# dna\nshort' };
  thin.architecture_context = { text: '# c\nshort' };
  thin.brand_translation = { text: '# b\nb' };
  thin.negative_constraints = { text: '# n\nno' };
  const result = runSpaceQualityGate({
    finalPrompt: 'x',
    blockIds: Object.keys(thin),
    blocksById: thin,
    referenceCount: 1,
  });
  assert.equal(result.status, 'blocked');
  assert.ok(result.findings.some((f) => f.code === 'SPACE_POSITIVE_ARCHITECTURE_TOO_WEAK'));
});

test('SPACE_NEGATIVE_DENSITY_TOO_HIGH is warn-only', () => {
  const blocksById = archRichBlocks();
  // Make negatives huge relative to architecture.
  blocksById.negative_constraints = { text: '# Neg\n\n' + 'n'.repeat(800) };
  const result = runSpaceQualityGate({
    finalPrompt: 'x',
    blockIds: Object.keys(blocksById),
    blocksById,
    referenceCount: 1,
  });
  assert.equal(result.status, 'pass', 'warn-only must not block');
  assert.ok(result.findings.some((f) => f.code === 'SPACE_NEGATIVE_DENSITY_TOO_HIGH' && f.severity === 'warn'));
});

test('PROMPT_EMPTY blocks on empty prompt', () => {
  const result = runSpaceQualityGate({ finalPrompt: '', blockIds: [], blocksById: {}, referenceCount: 1 });
  assert.equal(result.status, 'blocked');
  assert.ok(result.findings.some((f) => f.code === 'PROMPT_EMPTY'));
});
