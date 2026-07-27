import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSourceGate, resolvePresetWarnings } from '../../packages/image-generation-runtime/src/gates.js';
import { resolveGenerationPolicy } from '../../packages/image-generation-runtime/src/policies.js';

const source = (preset) => ({ preset, purpose: preset === 'integrated_anchor' || preset === 'visual_extension' ? 'production' : 'exploration', userIntent: {} });
const reference = (role) => ({ role, assetId: role, localPath: '/x', sha256: 'x', source: 'user_selected', includeReason: 'test' });

test('visual_extension does not require document or reference context', () => {
  const errors = evaluateSourceGate({
    sources: source('visual_extension'),
    policy: resolveGenerationPolicy('visual_extension'),
    context: { visualContext: {}, references: [reference('current_project_identity')] },
  });
  assert.deepEqual(errors, []);
});

test('document_concept does not require a visual project or logo', () => {
  const errors = evaluateSourceGate({
    sources: source('document_concept'),
    policy: resolveGenerationPolicy('document_concept'),
    context: { documentContext: {}, references: [] },
  });
  assert.deepEqual(errors, []);
  assert.ok(resolvePresetWarnings({ sources: source('document_concept'), context: {} }).some((item) => item.code === 'CONCEPT_ONLY'));
});

test('reference_preview allows awaiting_decision with warning and rejects rejected runs', () => {
  const base = { referenceCapsule: {}, references: [reference('reference_style')] };
  assert.deepEqual(evaluateSourceGate({
    sources: source('reference_preview'),
    policy: resolveGenerationPolicy('reference_preview'),
    context: { ...base, referenceDecision: { status: 'awaiting_decision' } },
  }), []);
  assert.ok(resolvePresetWarnings({ sources: source('reference_preview'), context: { ...base, referenceDecision: { status: 'awaiting_decision' } } })
    .some((item) => item.code === 'UNAPPROVED_REFERENCE_PREVIEW'));
  assert.ok(evaluateSourceGate({
    sources: source('reference_preview'),
    policy: resolveGenerationPolicy('reference_preview'),
    context: { ...base, referenceDecision: { status: 'rejected', decision: 'rejected' } },
  }).some((item) => item.code === 'REFERENCE_RUN_REJECTED'));
});

test('integrated_anchor retains approval, identity image, resolved context and conflict gates', () => {
  const errors = evaluateSourceGate({
    sources: source('integrated_anchor'),
    policy: resolveGenerationPolicy('integrated_anchor'),
    context: { visualContext: {}, referenceCapsule: {}, referenceDecision: { status: 'completed' }, references: [reference('reference_style')] },
  });
  assert.ok(errors.some((item) => item.code === 'RESOLVED_CONTEXT_REQUIRED'));
  assert.ok(errors.some((item) => item.code === 'REFERENCE_ANCHOR_NOT_APPROVED'));
  assert.ok(errors.some((item) => item.code === 'CURRENT_IDENTITY_IMAGE_REQUIRED'));
});
