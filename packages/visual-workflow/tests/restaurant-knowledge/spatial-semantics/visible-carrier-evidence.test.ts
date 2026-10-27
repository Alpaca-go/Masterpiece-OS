import test from 'node:test';
import assert from 'node:assert/strict';
import {spatialSemanticEvidence as evidence, validateSpatialSemantics as validate, separateSpatialFunctionalSemantics as separate} from '../../../src/generation-runtime/space/semantic/validate-spatial-semantics.js';

for (const [text, expected] of [
  ['equipment','block'], ['reception equipment','pass'],
  ['table','block'], ['dining table','pass'],
  ['设备','block'], ['入口处的咨询设备','pass'],
  ['equipment near it','block'], ['equipment near reception counter','pass'],
  ['reception equipment is not present','block'], ['if reception equipment is present','block'],
  ['未确认入口处的咨询设备','block'], ['reception equipment and enjoying cosmic essence','block'],
]) test(`visibility carrier evidence ${expected}: ${text}`,()=>{
  const source={status:'unknown',userConfirmedFields:[]};
  const typed=evidence(text,'mustBeVisible',0,source);
  assert.equal(typed.validation,expected);
  assert.deepEqual(typed.source,source); assert.equal(typed.sourceConfirmation,'unchanged');
  const input={mustBeVisible:[text]};
  assert.equal(validate(input).status,expected);
  const result=separate(input);
  assert.equal(result.validation.status,expected);
  assert.deepEqual(result.spatial.mustBeVisible,[text]);
});

test('a valid array item cannot authorize a bare carrier or disappear during separation',()=>{
  const input={mustBeVisible:['reception equipment','equipment']};
  const result=separate(input);
  assert.equal(validate(input).status,'block');
  assert.equal(result.validation.status,'block');
  assert.deepEqual(result.spatial.mustBeVisible,input.mustBeVisible);
  assert.equal(evidence(input.mustBeVisible[1],'mustBeVisible',1).validation,'block');
});

test('node field contracts remain independent of visibility permission',()=>{
  for (const field of ['sceneProgram','functionalNetwork']) {
    assert.equal(evidence('equipment',field).type,'node');
    assert.equal(evidence('equipment',field).validation,'pass');
  }
});
