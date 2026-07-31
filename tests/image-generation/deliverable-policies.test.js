import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELIVERABLE_POLICIES,
  getDeliverableNegativeRules,
  validateAllDeliverablePolicies,
} from '@masterpiece/image-generation-runtime/deliverables/index.js';

test('all seven deliverable policies are structurally valid', () => {
  assert.equal(Object.keys(DELIVERABLE_POLICIES).length, 7);
  for (const [deliverable, result] of Object.entries(validateAllDeliverablePolicies())) {
    assert.equal(result.valid, true, `${deliverable}: ${result.issues.join(', ')}`);
  }
});

test('interior policy requires a complete spatial scene and rejects VI collections', () => {
  const value = DELIVERABLE_POLICIES.interior_scene;
  for (const concept of ['完整室内空间', '墙面', '地面', '天花', '顾客用餐区', '动线', '灯光', '空间纵深']) {
    assert.ok(value.requiredPromptConcepts.includes(concept), concept);
  }
  assert.equal(value.maxIdentityReferences, 1);
  assert.equal(value.maxSpatialReferences, 3);
  assert.equal(value.allowsFlatLay, false);
  assert.ok(getDeliverableNegativeRules('interior_scene').some((rule) => /VI 物料平铺/.test(rule)));
});

test('VI application remains the explicit material-display control group', () => {
  const value = DELIVERABLE_POLICIES.vi_application;
  assert.equal(value.allowsFlatLay, true);
  assert.equal(value.allowsMockupCollection, true);
  assert.doesNotMatch(getDeliverableNegativeRules('vi_application').join('\n'), /不要生成名片|不要生成围裙/);
});
