import test from 'node:test';
import assert from 'node:assert/strict';
import {compareShadowDirections} from './shadow-comparison.ts';

test('A/B uses actual B1 projection and pure compilers with controlled synthetic input, no confirmation or transport', t => {
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw new Error('NETWORK_FORBIDDEN');});
  const result=compareShadowDirections();
  assert.equal(result.rows.length,4);
  assert.deepEqual(result.rows.map(row=>row.fields.filter(field=>field.bRetained).length),[2,2,3,3]);
  assert(result.rows.every(row=>row.fields.every(field=>!field.aRetained)));
  assert(result.rows.every(row=>row.evaluation.materialsApplied===false));
  assert.equal(result.B.b1Draft.status,'proposed_offline');
  assert.equal(result.B.b1Draft.replacesExistingDirection,false);
  assert(result.historicalB1Projection.result.fields.spatialConcept.includes('温暖'));
  assert.equal(calls,0);
});
