import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSpatialFunctionalValue,
  validateSpatialSemantics,
} from '@masterpiece/image-generation-runtime/space/semantic/validate-spatial-semantics.js';
import {
  resolveSpatialColorRole,
} from '@masterpiece/image-generation-runtime/space/semantic/resolve-spatial-color-role.js';
import {
  sanitizeBrandItem,
  sanitizeDifferentiators,
} from '@masterpiece/image-generation-runtime/space/semantic/sanitize-brand-expression.js';

test('functional circulation and privacy mechanisms pass', () => {
  for (const value of [
    '入口 → 接待 → 等候形成连续视线关系',
    '弧形半透明隔断建立半私密等候区',
    '开放厨房连接出餐口并保持服务动线清晰',
    '木作药柜连接展示区与咨询等候区',
  ]) {
    assert.equal(validateSpatialSemantics({ functionalNetwork: [value] }).status, 'pass', value);
  }
});

test('neutral required scene fixtures do not become brand motifs by field provenance alone', () => {
  const result = validateSpatialSemantics({
    functionalNetwork: ['接待区', '咨询室', '治疗室', '休息区'],
    functionalRelationships: [
      '接待区通过半透明玻璃隔断与咨询室形成视觉连接，保障隐私',
      '咨询室通过走廊动线衔接治疗室',
    ],
    mustBeVisible: ['接待台', '咨询室隔断', '治疗室照明设备', '休息区座椅'],
  });

  assert.equal(result.status, 'pass');
  assert.deepEqual(result.findings, []);
});

test('motif, color geometry and Logo in functional fields fail closed', () => {
  const cases = [
    { functionalNetwork: ['接待区-孔雀羽毛视觉元素'] },
    { functionalNetwork: ['孔雀形态引导动线'] },
    { mustBeVisible: ['花瓣装饰雕塑'] },
    { functionalRelationships: ['紫色渐变定义咨询区'] },
    { mustBeVisible: ['Logo作为主要视觉焦点'] },
  ];
  for (const spatial of cases) {
    const result = validateSpatialSemantics(spatial);
    assert.equal(result.status, 'block');
    assert.equal(result.findings[0].severity, 'block');
  }
});

test('literal brand motifs are stripped from brand and differentiator prompt text', () => {
  const brand = sanitizeBrandItem('孔雀层叠、舒展的曲面抽象元素体现精致');
  const differentiators = sanitizeDifferentiators(['孔雀羽毛元素的抽象美学应用']);
  for (const value of [brand.text, ...differentiators]) {
    assert.equal(/孔雀|羽毛|花瓣/iu.test(value), false, value);
  }
});

test('color role keeps chromatic brand identity local and neutral base dominant', () => {
  assert.equal(resolveSpatialColorRole({ name: 'Peacock Violet', role: 'brand_identity' }), 'local_accent');
  assert.equal(resolveSpatialColorRole({ name: 'warm white', role: 'spatial_base' }), 'dominant_field');
  assert.equal(resolveSpatialColorRole({ name: 'red', role: 'brand_identity' }), 'local_accent');
  assert.equal(resolveSpatialColorRole({ name: 'wood tone', role: 'material_finish' }), 'local_accent');
});

test('deterministic repair removes identity labels only when spatial meaning survives', () => {
  assert.equal(
    normalizeSpatialFunctionalValue(
      '取餐区：通过简洁标识与清晰动线设计，与就餐区形成功能区分',
      'functionalRelationships',
    ),
    '取餐区：通过清晰动线设计，与就餐区形成功能区分',
  );
  assert.equal(
    normalizeSpatialFunctionalValue('取餐区标识与动线', 'mustBeVisible'),
    '取餐区动线',
  );
  assert.equal(normalizeSpatialFunctionalValue('孔雀形态引导动线', 'functionalRelationships'), null);
});
