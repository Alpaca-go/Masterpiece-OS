// Tests: space motif stripping (R8.5.1 §11)
//
// Case D from the doc: "feather-like layered translucent boundary" must
// normalize to "layered translucent overlapping curved boundary" (or a
// semantically equivalent abstraction). The CJK equivalent must also be
// stripped of motif and reduced to spatial property only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeArchitectureSemantics,
  compileRawPhrases,
} from '@masterpiece/image-generation-runtime/generation/space-quality/index.js';

test('strip: feather-like English -> layered curved abstraction', () => {
  const r = normalizeArchitectureSemantics('feather-like layered translucent boundary', 'x');
  assert.ok(r.normalized, 'expects a non-null normalized phrase');
  assert.ok(!/feather|plume|peacock/i.test(r.normalized), 'no motif literal in normalized output');
  assert.ok(/layered|translucent|overlap|curv|boundary/i.test(r.normalized),
    'preserves layered/translucent/boundary/cuvature');
  assert.equal(r.classification, 'ambiguous');
});

test('strip: Chinese "模拟羽毛的层叠与包裹感" leaves the spatial action only', () => {
  const r = normalizeArchitectureSemantics('流畅的曲线墙面或隔断，模拟羽毛的层叠与包裹感', 'signatureSpatialMechanism');
  assert.ok(r.normalized, 'expects non-null normalized');
  assert.ok(!/羽|翎|孔雀/.test(r.normalized), 'no motif literal');
  assert.ok(/曲线|墙面|隔断/.test(r.normalized), 'preserves spatial property');
});

test('strip: brand-poetic title in parens is removed', () => {
  const r = normalizeArchitectureSemantics('翎羽之境 (Realm of Feathers) - 沉浸式美学空间', 'spatialConcept');
  assert.ok(r.normalized);
  assert.ok(!/Realm of Feathers|翎羽之境/.test(r.normalized));
});

test('strip: peacock -> layered radial (NOT a different motif)', () => {
  const r = normalizeArchitectureSemantics('peacock gradient on the ceiling', 'x');
  assert.ok(r.normalized);
  assert.ok(!/peacock/i.test(r.normalized), 'peacock literal must be removed');
  // Substitution is "layered radial" — abstract spatial property.
  assert.ok(/radial|layered/i.test(r.normalized), 'expects "layered radial"');
});

test('strip: not all motifs are replaced with another motif', () => {
  // A motif MUST NEVER be replaced with a different motif. Acceptable
  // replacements are abstract spatial property words (curved, layered,
  // soft, overlapping, etc.) — no lotus/feather/iris/butterfly.
  const phrases = [
    'feather curve in the ceiling',
    'floral pattern on the wall',
    'lotus sculpture by the entry',
    'plume membrane on the facade',
  ];
  for (const p of phrases) {
    const r = normalizeArchitectureSemantics(p, 'x');
    if (r.normalized) {
      assert.ok(!/feather|plume|lotus|floral|peacock|butterfly/i.test(r.normalized),
        `motif-to-motif substitution detected in "${p}" -> "${r.normalized}"`);
    }
  }
});

test('strip: pure motif without spatial content is dropped from architecture', () => {
  const r = normalizeArchitectureSemantics('孔雀元素', 'mustBeVisible');
  // No spatial property to keep — must not enter Architecture IR.
  assert.equal(r.includedInArchitecturePrompt, false);
});

test('compileRawPhrases: separates architecture vs brand', () => {
  const { architectural, brand } = compileRawPhrases([
    'feather-like layered translucent boundary',
    'peacock gradient on the ceiling',
    'continuous curved ceiling with no hard edge',
  ]);
  // Two motif items should be normalized into architecture; their original
  // raw forms go to brand.
  assert.ok(architectural.length >= 1, 'expects at least one architecture item');
  assert.ok(brand.length >= 1, 'expects at least one brand-motif item');
  for (const a of architectural) {
    assert.ok(!/feather|plume|peacock|羽|翎|孔雀/.test(a.text),
      'architecture must not contain raw motif literal');
  }
});
