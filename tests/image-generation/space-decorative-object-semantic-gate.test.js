// R10.4.1 — Decorative Object Semantic Gate test.
//
// A decorative object (艺术装置 / 雕塑 / centerpiece) may appear in Brand
// Translation / optional styling, but must never be a functional / operational
// / architectural HARD requirement. The gate deterministically demotes e.g.
// "接待台正对入口，视线引导至艺术装置" into "接待台正对入口，建立清晰入口视觉焦点和空间导向"
// while preserving spatial intent, function and circulation. Real operational
// objects (开放厨房 / 药柜 / 格栅 / 茶席) must NOT be mis-demoted.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEMANTIC_CLASS,
  classifyPhrase,
  separateSpaceSemantics,
  validateSpatialSemantics,
  demoteDecorativeObjectFromFunctionalLayer,
  normalizeFunctionalHardConstraint,
} from '@masterpiece/image-generation-runtime/space/index.js';

test('R10.4.1 DECORATIVE_OBJECT class is added to the semantic vocabulary', () => {
  assert.equal(SEMANTIC_CLASS.DECORATIVE_OBJECT, 'decorative_object');
});

test('R10.4.1 a decorative-object functional phrase classifies as DECORATIVE_OBJECT', () => {
  const a = classifyPhrase('接待台正对入口，视线引导至艺术装置', 'functionalRelationships');
  assert.equal(a.classification, SEMANTIC_CLASS.DECORATIVE_OBJECT);
  const b = classifyPhrase('主要空间围绕大型雕塑展开', 'functionalNetwork');
  assert.equal(b.classification, SEMANTIC_CLASS.DECORATIVE_OBJECT);
});

test('R10.4.1 deterministic demotion preserves spatial intent and removes the object', () => {
  const demoted = demoteDecorativeObjectFromFunctionalLayer(
    '接待台正对入口，视线引导至艺术装置',
    'functionalRelationships',
  );
  assert.ok(demoted, 'demoted phrase returned');
  assert.ok(/入口/.test(demoted), 'keeps 入口');
  assert.ok(/视觉焦点|空间导向/.test(demoted), 'keeps visual focus / orientation');
  assert.doesNotMatch(demoted, /艺术装置|雕塑/, 'no decorative object');
});

test('R10.4.1 gate blocks decorative-object hard requirements', () => {
  const result = validateSpatialSemantics({
    functionalRelationships: ['接待台正对入口，视线引导至艺术装置'],
  });
  assert.equal(result.status, 'block');
  assert.ok(result.findings.some((f) => f.classification === 'decorative_object'));
});

test('R10.4.1 gate passes a clean functional phrase', () => {
  const result = validateSpatialSemantics({
    functionalRelationships: ['接待台正对入口并组织主要到达路径'],
  });
  assert.equal(result.status, 'pass');
});

test('R10.4.1 functional hygiene: FTT open kitchen and YJLF herbal cabinet are NOT mis-demoted', () => {
  // Real operational objects must survive as functional hard requirements.
  assert.equal(validateSpatialSemantics({ functionalRelationships: ['开放厨房作为核心运营区域'] }).status, 'pass');
  assert.equal(validateSpatialSemantics({ functionalNetwork: ['药材展示柜承担陈列与服务功能'] }).status, 'pass');
  assert.equal(validateSpatialSemantics({ functionalNetwork: ['入口侧设置小型艺术陈设作为次级视觉点缀'] }).status, 'pass');
});

test('R10.4.1 separateSpaceSemantics routes decorative objects away from architecture', () => {
  const buckets = separateSpaceSemantics([
    { text: '接待台正对入口，视线引导至艺术装置', sourceField: 'functionalRelationships' },
    { text: '入口→接待：短走廊缓冲', sourceField: 'functionalNetwork' },
  ]);
  for (const item of buckets.architectureSemantics) {
    assert.doesNotMatch(String(item.text ?? ''), /艺术装置|雕塑/iu, 'no decorative object in architecture');
  }
  assert.ok(buckets.decorativeIdentitySemantics.length >= 1, 'decorative object routed to decor bucket');
});

test('R10.4.1 normalizeFunctionalHardConstraint produces a safe functional value', () => {
  const safe = normalizeFunctionalHardConstraint('前台成为迎宾中心，并引导视线至大型艺术装置', 'functionalRelationships');
  assert.ok(safe, 'safe value returned');
  assert.doesNotMatch(safe, /艺术装置/, 'no decorative object');
});
