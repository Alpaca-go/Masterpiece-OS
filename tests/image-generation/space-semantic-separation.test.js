// Tests: space semantic separation (R8.5.1 §6, §7, §8)
//
// Covers Case A/B/C from the doc §23 test set, plus the classifier's
// deterministic behavior on brand-motif vs architectural content.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyPhrase,
  separateSpaceSemantics,
  SEMANTIC_CLASS,
} from '@masterpiece/image-generation-runtime/generation/space-quality/index.js';

test('classifier: motif+spatial language is ambiguous (will be normalized)', () => {
  const r = classifyPhrase('peacock feather inspired spatial language', 'x');
  // The phrase mixes motif literals with real spatial vocabulary, so the
  // classifier marks it ambiguous. The normalizer strips the motif while
  // preserving the spatial property; the architecture prompt will not contain
  // the literal motif.
  assert.equal(r.classification, SEMANTIC_CLASS.AMBIGUOUS);
  assert.ok(r.motifHits.length > 0, 'expects motif hits');
  assert.ok(r.archHits + r.propertyHits > 0, 'expects spatial property hits');
});

test('classifier: pure motif (no spatial language) is brand_motif', () => {
  // No spatial vocabulary words — only motif + decorative markers.
  const r = classifyPhrase('peacock feather ornament', 'mustBeVisible');
  assert.equal(r.classification, SEMANTIC_CLASS.BRAND_MOTIF);
});

test('classifier: pure architectural phrase is architectural', () => {
  const r = classifyPhrase('layered translucent boundary', 'x');
  assert.equal(r.classification, SEMANTIC_CLASS.ARCHITECTURAL);
});

test('classifier: color+accent is color_accent, never architectural', () => {
  const r = classifyPhrase('lavender accent lighting', 'x');
  assert.equal(r.classification, SEMANTIC_CLASS.COLOR_ACCENT);
});

test('classifier: identity-bearing phrase is decorative_identity', () => {
  const r = classifyPhrase('入口处大型发光Logo', 'brandIntegration');
  assert.equal(r.classification, SEMANTIC_CLASS.DECORATIVE_IDENTITY);
});

test('classifier: color as form generator is color_geometry risk', () => {
  const r = classifyPhrase('从入口到诊疗室的渐变色彩过渡（白->浅紫->深紫）', 'signatureSpatialMechanism');
  assert.equal(r.classification, SEMANTIC_CLASS.COLOR_GEOMETRY);
});

test('classifier: ambiguous phrase has BOTH motif and architecture', () => {
  const r = classifyPhrase('feather-like layered translucent boundary', 'x');
  assert.equal(r.classification, SEMANTIC_CLASS.AMBIGUOUS);
  assert.ok(r.motifHits.length > 0, 'expects motif hits');
  assert.ok(r.archHits + r.propertyHits > 0, 'expects architecture hits');
});

test('separate: architecture, brand, ambiguous, color, identity, functional', () => {
  const items = [
    { text: 'peacock feather ornament', sourceField: 'mustBeVisible' },
    { text: 'layered translucent boundary', sourceField: 'x' },
    { text: 'feather-like layered translucent boundary', sourceField: 'x' },
    { text: 'lavender accent lighting', sourceField: 'x' },
    { text: '入口处大型发光Logo', sourceField: 'brandIntegration' },
    { text: '咨询室：私密、温暖、柔和光线', sourceField: 'functionalNetwork' },
  ];
  const buckets = separateSpaceSemantics(items);
  // "peacock feather ornament" is pure brand_motif (no spatial language).
  assert.equal(buckets.brandMotifSemantics.length, 1, 'peacock ornament only');
  assert.equal(buckets.architectureSemantics.length, 1, 'layered boundary only');
  assert.equal(buckets.ambiguousSemantics.length, 1, 'feather-like boundary');
  assert.equal(buckets.colorAccentSemantics.length, 1, 'lavender accent');
  assert.equal(buckets.decorativeIdentitySemantics.length, 1, 'logo');
  assert.equal(buckets.functionalSemantics.length, 1, 'consulting room');
});

test('classifier: empty / non-string input is graceful', () => {
  // Not a documented requirement, but the auditor must not crash on missing
  // fields. We expect either functional fallback (no signal) or some safe
  // classification.
  for (const t of ['', null, undefined, 0, [], {}]) {
    const r = classifyPhrase(t, 'x');
    assert.ok(Object.values(SEMANTIC_CLASS).includes(r.classification), `safe classification for ${JSON.stringify(t)}`);
  }
});
