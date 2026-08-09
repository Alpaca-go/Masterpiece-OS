import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSpatialSemantics,
} from '@masterpiece/image-generation-runtime/space/semantic/validate-spatial-semantics.js';
import {
  resolveSpatialColorRole,
} from '@masterpiece/image-generation-runtime/space/semantic/resolve-spatial-color-role.js';

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

test('motif, color geometry and Logo in functional fields fail closed', () => {
  const cases = [
    { functionalNetwork: ['接待区-孔雀羽毛视觉元素'] },
    { functionalRelationships: ['紫色渐变定义咨询区'] },
    { mustBeVisible: ['Logo作为主要视觉焦点'] },
  ];
  for (const spatial of cases) {
    const result = validateSpatialSemantics(spatial);
    assert.equal(result.status, 'block');
    assert.equal(result.findings[0].severity, 'block');
  }
});

test('color role keeps chromatic brand identity local and neutral base dominant', () => {
  assert.equal(resolveSpatialColorRole({ name: 'Peacock Violet', role: 'brand_identity' }), 'local_accent');
  assert.equal(resolveSpatialColorRole({ name: 'warm white', role: 'spatial_base' }), 'dominant_field');
  assert.equal(resolveSpatialColorRole({ name: 'red', role: 'brand_identity' }), 'local_accent');
  assert.equal(resolveSpatialColorRole({ name: 'wood tone', role: 'material_finish' }), 'local_accent');
});
