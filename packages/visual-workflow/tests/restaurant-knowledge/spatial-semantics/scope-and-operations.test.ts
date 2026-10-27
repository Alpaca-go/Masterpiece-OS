import test from 'node:test';
import assert from 'node:assert/strict';
import {networkAttempts} from './network-off.mjs';
import {validateSpatialSemantics as validate, separateSpatialFunctionalSemantics as separate,
  normalizeSpatialFunctionalValue, demoteDecorativeObjectFromFunctionalLayer} from '../../../src/generation-runtime/space/semantic/validate-spatial-semantics.js';
import {completeStructuredAnalysis} from '../../../src/analysis-decisions/analysis-completion-orchestrator.js';
import {structuredAnalysisPacketFixture} from '../../../../../tests/runtime-application/analysis-runtime-fixtures.ts';

// Independent assertions for this repair; all older audit assertions remain intact.
const positives = [
  'staff operating equipment and serving customers',
  '顾客在入口查看菜单', '员工在柜台为顾客办理入住', '工作人员使用收银机收款',
  'Customers paying at the checkout counter', '餐桌位于就餐区',
  '取餐台位于点餐区旁', 'Menu at the service counter',
  'employees using a scanner and assisting visitors at reception',
  'guests checking in and paying at the reception counter',
  'staff cleaning equipment and serving drinks', '访客在柜台查看价目表',
  '店员使用支付终端收款', '座椅设在等候区内', 'price list at the checkout counter',
];
const mutations = [
  (s:string) => `Only if Logo and ${s}`,
  (s:string) => `Unless ${s}`,
  (s:string) => `尚未确认Logo和${s}`,
  (s:string) => `${s}; staff not using equipment`,
  (s:string) => `${s} and enjoying cosmic essence`,
  (s:string) => `${s}并象征品牌未来`,
  (s:string) => `${s}; unknown operational tail`,
];
for (const text of positives) {
  test(`scope repair affirmative proposition: ${text}`, () => {
    assert.equal(validate({mustBeVisible:[text]}).status, 'pass');
    assert.equal(separate({mustBeVisible:[text]}).unresolved.length, 0);
  });
  for (const mutate of mutations) {
    const unsafe = mutate(text);
    test(`scope repair rejects extension: ${unsafe}`, () => {
      const source = {mustBeVisible:[unsafe]}, before = structuredClone(source);
      const result = separate(source);
      assert.equal(result.validation.status, 'block');
      assert.ok(result.unresolved.some(row => row.original === unsafe));
      assert.deepEqual(result.spatial.mustBeVisible, [unsafe]);
      assert.deepEqual(source, before);
      assert.deepEqual(result, separate(source));
    });
  }
}
for (const text of ['equipment near it', 'reception equipment of it', 'reception counter and with it',
  'Logo and equipment near it', 'equipment behind this', 'equipment beside that',
  'reception counter near it', 'staff operating equipment but no customers',
  '员工没有使用设备', '员工不会操作设备', '员工尚未操作设备']) {
  test(`scope repair incomplete or negative unit: ${text}`, () => {
    const result = separate({mustBeVisible:[text]});
    assert.equal(result.validation.status, 'block');
    assert.deepEqual(result.spatial.mustBeVisible, [text]);
  });
}
const fields = ['functionalNetwork','functionalRelationships','mustBeVisible','operationConstraints','requiredSpatialElements','sceneProgram'];
for (const field of fields) {
  for (const unknown of ['unknown operational clause', 'staff operating equipment and enjoying cosmic essence',
    'Only if Logo and staff operating equipment']) {
    test(`scope repair completion blocks ${field}: ${unknown}`, async () => {
      const packet = structuredAnalysisPacketFixture();
      packet.mediaTranslations.spatial[field] = ['staff operating equipment', unknown];
      const before = structuredClone(packet); let calls = 0;
      const artifacts = new Map();
      const result = await completeStructuredAnalysis({packet,deliverable:'space',
        execution:{outputLanguage:'zh-CN',aspectRatio:'16:9',camera:{focalLength:'35mm'}},
        validateFinalPacket:p=>validate(p.mediaTranslations.spatial),
        repairFinalPacketDeterministically:({packet:p})=>{
          const separation=separate(p.mediaTranslations.spatial);
          return {packet:{...p,mediaTranslations:{...p.mediaTranslations,spatial:separation.spatial}},
            changes:separation.changes,unresolved:separation.unresolved,evidence:separation.evidence};
        },
        model:async()=>{calls++;throw Error('NO_MODEL_ALLOWED');},
        repairInvalidFinalPacket:async()=>{calls++;throw Error('NO_MODEL_ALLOWED');},
        persistence:{saveInitial:()=>{},saveAttempt:()=>{},saveFinal:()=>{},saveAudit:()=>{},
          saveRuntimeArtifact:(name,value)=>artifacts.set(name,structuredClone(value))}});
      assert.equal(result.status,'failed'); assert.equal(calls,0);
      assert.deepEqual(packet,before); assert.deepEqual(result.packet.projectFacts,before.projectFacts);
      assert.ok(result.packet.mediaTranslations.spatial[field].includes(unknown));
      const artifact=artifacts.get('spatial-semantic-validation.repaired.json');
      assert.ok(artifact.unresolved.some(row=>row.field===field && row.original===unknown));
      assert.ok(artifact.evidence.some(row=>row.field===field && row.value===unknown && row.validation==='block'));
    });
  }
  test(`scope repair invalid field shape preserved: ${field}`,()=>{
    for(const value of [null, 'equipment', [null], ['']]) {
      const source={[field]:value}, result=separate(source);
      assert.equal(result.validation.status,'block');
      assert.deepEqual(result.spatial[field],value);
    }
  });
}
test('scope repair legacy normalizers retain unknown and conditional tails',()=>{
  for(const normalize of [normalizeSpatialFunctionalValue,demoteDecorativeObjectFromFunctionalLayer])
    for(const text of ['staff operating equipment; unknown operational tail','Only if Logo and staff operating equipment']) {
      assert.equal(normalize(text,'functionalRelationships'),text);
      assert.equal(validate({functionalRelationships:[normalize(text,'functionalRelationships')]}).status,'block');
    }
});
test('scope repair independent brand statement keeps functional proposition and provenance',()=>{
  const source={mustBeVisible:['Logo; staff operating equipment'],sourceStatus:'model_proposal',userConfirmed:false};
  const result=separate(source);
  assert.equal(result.validation.status,'pass');
  assert.deepEqual(result.spatial.mustBeVisible,['staff operating equipment']);
  assert.deepEqual(result.spatial.brandRoleManifestation,['Logo']);
  assert.equal(result.spatial.sourceStatus,'model_proposal');assert.equal(result.spatial.userConfirmed,false);
});
test('scope repair uses zero network primitives',()=>assert.equal(networkAttempts(),0));
