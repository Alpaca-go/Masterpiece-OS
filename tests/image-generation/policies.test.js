import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IMAGE_GENERATION_POLICIES,
  IMAGE_GENERATION_PRESET_CAPABILITIES,
  resolveGenerationPolicy,
} from '@masterpiece/image-generation-runtime/policies.js';

test('four generation presets expose distinct policies', () => {
  assert.deepEqual(Object.keys(IMAGE_GENERATION_POLICIES), [
    'visual_extension',
    'document_concept',
    'reference_preview',
    'integrated_anchor',
  ]);
  assert.equal(IMAGE_GENERATION_PRESET_CAPABILITIES.length, 4);
});

test('independent presets only require their selected source', () => {
  assert.equal(resolveGenerationPolicy('visual_extension').requireDocumentContext, false);
  assert.equal(resolveGenerationPolicy('visual_extension').requireReferenceContext, false);
  assert.equal(resolveGenerationPolicy('document_concept').allowTextOnlyGeneration, true);
  assert.equal(resolveGenerationPolicy('document_concept').requireCurrentIdentityImage, false);
  assert.equal(resolveGenerationPolicy('reference_preview').allowUnapprovedReferencePreview, true);
  assert.equal(resolveGenerationPolicy('reference_preview').requireResolvedContext, false);
});

test('integrated anchor preserves strict production requirements', () => {
  const policy = resolveGenerationPolicy('integrated_anchor');
  assert.equal(policy.requireResolvedContext, true);
  assert.equal(policy.requireReferenceApproval, true);
  assert.equal(policy.requireCurrentIdentityImage, true);
  assert.equal(policy.requireReferenceImage, true);
});

test('unknown presets fail explicitly', () => {
  assert.throws(() => resolveGenerationPolicy('poster'), { code: 'GENERATION_PRESET_UNSUPPORTED' });
});
