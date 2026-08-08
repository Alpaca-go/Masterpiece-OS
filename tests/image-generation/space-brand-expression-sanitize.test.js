// Tests: brand-expression sanitizer (R8.5 redirected).
//
// The Brand Translation block must not feed raw motif nouns, in-scene
// identity, long creative prose, people/ops items, or color-as-geometry back
// into the positive prompt. These tests assert each disposition and that
// surviving lines contain no literal motif tokens.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeBrandItem,
  sanitizeBrandManifestation,
  sanitizeMaterial,
  sanitizeMaterials,
  sanitizeLighting,
  sanitizeDifferentiators,
} from '@masterpiece/image-generation-runtime/vnext/space-quality/index.js';

const MOTIF_TOKEN = /feather|peacock|plume|petal|lotus|\u7fbd\u6bdb|\u5b54\u96c0|\u7fce\u7fbd|\u82b1\u74e3|\u83b2/iu;

test('in-scene identity items are dropped (post-composite)', () => {
  for (const raw of ['\u53d1\u5149\u7684\u54c1\u724cLogo', '\u54c1\u724cSlogan\u5899\u9762\u6587\u5b57', 'illuminated wordmark on wall']) {
    const r = sanitizeBrandItem(raw);
    assert.equal(r.disposition, 'dropped', raw);
    assert.equal(r.reason, 'in_scene_identity_post_composite');
  }
});

test('people/operations items are dropped', () => {
  const r = sanitizeBrandItem('\u5458\u5de5\u5236\u670d\u878d\u5165\u54c1\u724c\u8272');
  assert.equal(r.disposition, 'dropped');
  assert.equal(r.reason, 'people_operations_not_spatial');
});

test('long creative-direction prose is dropped', () => {
  const r = sanitizeBrandItem(
    '\u539f\u6765\u7684\u533b\u7f8e\u5f62\u8c61\u8fc7\u4e8e\u533b\u7597\u5316\u548c\u51b7\u51b0\u51b0\uff0c\u7f3a\u4e4f\u60c5\u611f\u8fde\u63a5\u548c\u7f8e\u5b66\u9ad8\u5ea6\u3002\u901a\u8fc7\u5b54\u96c0\u7fbd\u6bdb\u8fd9\u4e00\u610f\u8c61\uff0c\u7ed3\u5408\u7d2b\u8272\u8c03\u548c\u827a\u672f\u88c5\u7f6e\u611f\u7684\u7a7a\u95f4\u8bbe\u8ba1\uff0c\u5c06\u54c1\u724c\u5347\u7ea7\u4e3a\u9ad8\u7aef\u751f\u6d3b\u7f8e\u5b66\u54c1\u724c\u3002',
  );
  assert.equal(r.disposition, 'dropped');
  assert.equal(r.reason, 'creative_prose_too_long');
});

test('motif-bearing items are normalized into surface behavior with no motif token', () => {
  const r = sanitizeBrandItem('\u62bd\u8c61\u7fbd\u6bdb\u7eb9\u7406\u7684\u5899\u9762\u6216\u5c4f\u98ce');
  assert.equal(r.disposition, 'normalized');
  assert.equal(r.reason, 'motif_to_surface_behavior');
  assert.ok(!MOTIF_TOKEN.test(r.text), `motif leaked: ${r.text}`);
  assert.ok(/\u5c42\u53e0|\u8212\u5c55|\u66f2\u9762|\u808c\u7406/u.test(r.text));
});

test('motif title "(Realm of Feathers)" normalizes without motif token', () => {
  const r = sanitizeBrandItem('\u7fce\u7fbd\u4e4b\u5883 (Realm of Feathers) - \u6c89\u6d78\u5f0f\u7f8e\u5b66\u7a7a\u95f4');
  assert.equal(r.disposition, 'normalized');
  assert.ok(!MOTIF_TOKEN.test(r.text), `motif leaked: ${r.text}`);
});

test('color gradient across rooms is demoted to a local accent', () => {
  const r = sanitizeBrandItem('\u4ece\u5165\u53e3\u5230\u8bca\u7597\u5ba4\u7684\u6e10\u53d8\u8272\u5f69\u8fc7\u6e21\uff08\u767d->\u6d45\u7d2b->\u6df1\u7d2b\uff09');
  assert.equal(r.disposition, 'normalized');
  assert.equal(r.reason, 'color_demoted_to_accent');
  assert.ok(/\u70b9\u7f00/u.test(r.text));
});

test('decorative prop (ribbon) and gallery poetry are dropped', () => {
  assert.equal(sanitizeBrandItem('\u7d2b\u8272\u4e1d\u5e26\u6216\u8f6f\u88c5\u7ec6\u8282').reason, 'decorative_object_prop');
  assert.equal(sanitizeBrandItem('\u7a7a\u95f4\u4f5c\u4e3a\u827a\u672f\u753b\u5eca\uff0c\u5c55\u793a\u7f8e\u5b66\u7406\u5ff5').reason, 'gallery_poetry_non_commercial');
});

test('concise material/finish statements are kept', () => {
  const r = sanitizeBrandItem('\u9ad8\u54c1\u8d28\u7684\u6750\u8d28\u89e6\u611f');
  assert.equal(r.disposition, 'kept');
});

test('sanitizeBrandManifestation dedupes and reports stats', () => {
  const out = sanitizeBrandManifestation([
    '\u62bd\u8c61\u7fbd\u6bdb\u7eb9\u7406\u7684\u5899\u9762\u6216\u5c4f\u98ce',
    '\u62bd\u8c61\u7fbd\u6bdb\u7eb9\u7406\u7684\u5899\u9762\u6216\u5c4f\u98ce',
    '\u53d1\u5149\u7684\u54c1\u724cLogo',
    '\u9ad8\u54c1\u8d28\u7684\u6750\u8d28\u89e6\u611f',
  ]);
  // Two identical motif lines dedupe to one; identity dropped.
  assert.equal(out.lines.length, 2);
  assert.equal(out.stats.total, 4);
  assert.equal(out.stats.normalized, 1);
  assert.equal(out.stats.kept, 1);
  assert.equal(out.stats.dropped, 2);
  for (const line of out.lines) assert.ok(!MOTIF_TOKEN.test(line), line);
});

// ---- Material / lighting color-role demotion (R8.5 redirected) ----------
// A chromatic brand-color material listed as "brand color carrier / visual
// focal point" must be demoted to an accent-only role; neutral base materials
// (white concrete, stainless steel) must be left untouched.

test('chromatic brand-color material is demoted to accent-only role', () => {
  const r = sanitizeMaterial({
    material: '\u7d2b\u8272\u4e9a\u514b\u529b/\u73bb\u7483',
    behavior: ['\u900f\u5149', '\u5149\u6ed1', '\u8272\u5f69\u9971\u548c'],
    brandRole: '\u54c1\u724c\u8272\u8f7d\u4f53\uff0c\u89c6\u89c9\u7126\u70b9',
  });
  assert.equal(r.colorAccent, true);
  assert.ok(/\u5c40\u90e8\u70b9\u7f00/u.test(r.brandRole), `brandRole not demoted: ${r.brandRole}`);
  assert.ok(/\u4e0d\u5f97\u7528\u4e8e\u5929\u82b1|\u5899\u9762|\u9694\u65ad/u.test(r.brandRole));
  assert.ok(r.behavior.some((b) => /\u5c40\u90e8\u70b9\u7f00/u.test(b)));
});

test('neutral base materials are NOT demoted', () => {
  for (const name of ['\u767d\u8272/\u7070\u8272\u6df7\u51dd\u571f\u6216\u5fae\u6c34\u6ce5', '\u91d1\u5c5e\uff08\u4e0d\u9508\u94a2/\u9ec4\u94dc\uff09', '\u539f\u6728']) {
    const r = sanitizeMaterial({ material: name, behavior: ['x'], brandRole: 'base' });
    assert.equal(r.colorAccent, undefined, `wrongly demoted neutral: ${name}`);
    assert.equal(r.brandRole, 'base');
  }
});

test('sanitizeMaterials maps a list and preserves forbidden arrays', () => {
  const out = sanitizeMaterials([
    { material: '\u7d2b\u8272\u4e9a\u514b\u529b', behavior: ['\u900f\u5149'], forbidden: ['\u5ec9\u4ef7\u5851\u6599\u611f'] },
    { material: '\u5fae\u6c34\u6ce5', behavior: ['\u7ec6\u817b'] },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].colorAccent, true);
  assert.deepEqual(out[0].forbidden, ['\u5ec9\u4ef7\u5851\u6599\u611f']);
  assert.equal(out[1].colorAccent, undefined);
});

test('lighting drops in-scene identity and demotes colored-light interaction', () => {
  const r = sanitizeLighting({
    source: ['\u9690\u85cf\u5f0f\u706f\u5e26', '\u80cc\u5149\u53d1\u5149\u5b57'],
    contrast: 'soft',
    interactionWithMaterials: ['\u5149\u7ebf\u900f\u8fc7\u4e9a\u514b\u529b\u5c55\u73b0\u7d2b\u8272\u901a\u900f\u611f'],
    forbidden: ['\u9891\u95ea'],
  });
  assert.ok(!r.source.some((s) => /\u53d1\u5149\u5b57/u.test(s)), 'identity lighting not removed');
  assert.ok(/\u5c40\u90e8\u70b9\u7f00/u.test(r.interactionWithMaterials[0]));
  assert.deepEqual(r.forbidden, ['\u9891\u95ea']);
});

test('differentiators demote a color-only claim to a local accent', () => {
  const out = sanitizeDifferentiators([
    '\u72ec\u7279\u7684\u7d2b\u8272\u54c1\u724c\u8c03\u6027\u8bc6\u522b',
    '\u7cbe\u81f4\u7684\u6750\u8d28\u89e6\u611f',
  ]);
  assert.ok(/\u4e0d\u4f5c\u7a7a\u95f4\u4e3b\u8272\u8c03/u.test(out[0]));
  // A material/finish statement without a color-as-geometry claim is kept.
  assert.equal(out[1], '\u7cbe\u81f4\u7684\u6750\u8d28\u89e6\u611f');
});
