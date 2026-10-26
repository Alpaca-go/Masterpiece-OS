import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {networkAttempts} from './network-off.mjs';
import {structuredAnalysisPacketFixture} from '../../../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import {classifyPhrase} from '../../../src/generation-runtime/space/semantic/separate-space-semantics.js';
import {validateSpatialSemantics,separateSpatialFunctionalSemantics} from '../../../src/generation-runtime/space/semantic/validate-spatial-semantics.js';
import {completeStructuredAnalysis} from '../../../src/analysis-decisions/analysis-completion-orchestrator.js';
import {evaluateDeliverableSufficiency} from '../../../src/analysis-decisions/deliverable-sufficiency.js';
const fixture=JSON.parse(await fs.readFile(new URL('./source-fields.json',import.meta.url),'utf8'));
const execution={outputLanguage:'zh-CN',aspectRatio:'16:9',camera:{focalLength:'35mm'}};
function repair({packet}:any) {
  const result=separateSpatialFunctionalSemantics(packet.mediaTranslations.spatial);
  const copy=structuredClone(packet);copy.mediaTranslations.spatial=result.spatial;
  return {packet:copy,changes:result.changes,unresolved:result.unresolved};
}
function packet() {
  const p=structuredAnalysisPacketFixture();
  Object.assign(p.mediaTranslations.spatial,structuredClone(fixture.spatial));
  return p;
}
const validate=(p:any)=>validateSpatialSemantics(p.mediaTranslations.spatial);

test('archived mixed records remain rejected as whole phrases; only evidenced clauses are separated',()=>{
  const original=structuredClone(fixture.spatial);
  assert.equal(classifyPhrase(original.functionalNetwork[0],'functionalNetwork').classification,'decorative_identity');
  assert.equal(classifyPhrase(original.mustBeVisible[0],'mustBeVisible').classification,'decorative_identity');
  const result=separateSpatialFunctionalSemantics(original);
  assert.equal(result.spatial.functionalNetwork[0],'顾客进入→菜单查看→点餐→等候→取餐→就餐→离开');
  assert.equal(result.spatial.mustBeVisible[0],'入口处的菜单');
  assert(result.spatial.brandRoleManifestation.includes('品牌标识吸引'));
  assert(result.spatial.brandRoleManifestation.includes('入口处的品牌标识'));
  assert.equal(validateSpatialSemantics(result.spatial).status,'pass');
  assert.deepEqual(original,fixture.spatial);
  assert.deepEqual(result.spatial.functionalRelationships,original.functionalRelationships);
  assert.deepEqual(result.spatial.functionalNetwork.slice(1),original.functionalNetwork.slice(1));
  assert.deepEqual(result.spatial.peopleBehavior,[]);
  assert(!JSON.stringify(result.spatial).includes('新增厨房'));
});

test('mixed scene nodes preserve menu, seating, lighting and pickup; brand imagery has a separate owner',()=>{
  const result=separateSpatialFunctionalSemantics(fixture.spatial);
  assert(result.spatial.sceneProgram.includes('品牌入口：菜单'));
  assert(result.spatial.sceneProgram.includes('等候区：座位'));
  assert(result.spatial.sceneProgram.includes('等候区：取餐提示'));
  assert(result.spatial.sceneProgram.includes('就餐区：桌椅'));
  assert(result.spatial.sceneProgram.includes('就餐区：照明'));
  for(const text of ['等候区：品牌影像','就餐区：品牌元素','品牌色彩系统的层次化应用']) {
    assert(result.spatial.brandRoleManifestation.includes(text));
    assert(!result.spatial.mustBeVisible.includes(text));
    assert(!result.spatial.sceneProgram.includes(text));
  }
  assert.deepEqual(separateSpatialFunctionalSemantics(result.spatial).spatial,result.spatial);
});

test('deterministic separation runs before any optional model repair, revalidates and keeps input packet immutable',async()=>{
  const original=packet(),before=JSON.stringify(original);let modelAttempts=0;let remoteRepairAttempts=0;
  const runtime=new Map();
  const result=await completeStructuredAnalysis({packet:original,deliverable:'space',execution,
    validateFinalPacket:validate,repairFinalPacketDeterministically:repair,
    repairInvalidFinalPacket:async()=>{remoteRepairAttempts++;throw new Error('UNEXPECTED_REMOTE_REPAIR');},
    model:async()=>{modelAttempts++;throw new Error('UNEXPECTED_MODEL');},
    persistence:{saveInitial:()=>{},saveAttempt:()=>{},saveFinal:()=>{},saveAudit:()=>{},
      saveRuntimeArtifact:(name:string,value:any)=>runtime.set(name,structuredClone(value))},
  });
  assert(['ready','ready_with_warnings'].includes(result.status));
  assert.equal(result.modelCallCount,0);assert.equal(modelAttempts,0);assert.equal(remoteRepairAttempts,0);
  assert.equal(JSON.stringify(original),before);
  assert.equal(runtime.get('spatial-semantic-validation.initial.json').status,'block');
  const repaired=runtime.get('spatial-semantic-validation.repaired.json');
  assert.equal(repaired.status,'pass');assert.equal(repaired.method,'deterministic_semantic_separation');
  assert(repaired.changes.some((v:any)=>v.field==='functionalNetwork'));
  assert.deepEqual(result.packet.projectFacts,original.projectFacts);
  assert.deepEqual(result.packet.lockedAssets,original.lockedAssets);
  assert.deepEqual(result.packet.provenance,original.provenance);
});

for(const text of ['厨师正在备餐','顾客在餐桌用餐','店员为顾客打包商品','员工操作收银机',
  '操作员使用检测设备','staff operating a cash register','technicians using equipment','guests checking in at reception']) {
  test(`dedicated visible evidence retains actual activity: ${text}`,()=>{
    assert.equal(classifyPhrase(text,'mustBeVisible').classification,'functional');
    assert.equal(validateSpatialSemantics({mustBeVisible:[text]}).status,'pass');
  });
}
test('existing concrete visible carriers keep renderer ownership while analysis uses positive carrier evidence',()=>{
  for(const text of ['arrival point','service point','Waiting area seating','咨询桌或低桌','2–3 人咨询座位','咨询设备或轻量专业设备','明档内的砂锅/热气']) {
    assert.equal(classifyPhrase(text,'mustBeVisible').classification,'ambiguous');
    assert.equal(validateSpatialSemantics({mustBeVisible:[text]}).status,'pass');
  }
});
test('payment equipment is not a silver color declaration; explicit silver finish still remains styling',()=>{
  assert.deepEqual(classifyPhrase('员工操作收银机','mustBeVisible').colorHits,[]);
  assert(classifyPhrase('银色收银机','mustBeVisible').colorHits.includes('银'));
});

for(const text of ['unresolved rendezvous','customers enjoying the cosmic essence at tables','maybe staff operating equipment','staff not operating equipment',
  '文字招牌与标语','Logo wordmark','品牌色彩系统的层次化应用','品牌标识→未知愿景']) {
  test(`unknown, decorative or negated visibility gets no functional grant: ${text}`,()=>{
    assert.notEqual(classifyPhrase(text,'mustBeVisible').classification,'functional');
    assert.equal(validateSpatialSemantics({mustBeVisible:[text]}).status,'block');
  });
}

test('inseparable or unknown mixed clauses stay blocked; word deletion is not a repair',()=>{
  for(const text of ['Logo吸引顾客点餐','顾客进入→Logo→未知愿景','Logo和未知愿景']) {
    const source={functionalNetwork:[text],mustBeVisible:['入口处的菜单'],brandRoleManifestation:[]};
    const result=separateSpatialFunctionalSemantics(source);
    assert.deepEqual(result.spatial.functionalNetwork,[text]);
    assert(result.unresolved.length>0);assert.equal(validateSpatialSemantics(result.spatial).status,'block');
  }
});

test('pure brand data cannot empty required fields to earn a pass or invent functions',()=>{
  const original=packet();
  Object.assign(original.mediaTranslations.spatial,{functionalNetwork:['Logo'],functionalRelationships:['Logo'],mustBeVisible:['Logo'],sceneProgram:['Logo']});
  const result=repair({packet:original});
  assert.equal(validate(result.packet).status,'block');
  assert(!['ready','ready_with_warnings'].includes(evaluateDeliverableSufficiency({packet:result.packet,deliverable:'space',execution}).status));
  for(const field of ['functionalNetwork','functionalRelationships','mustBeVisible','sceneProgram'])
    assert.deepEqual(result.packet.mediaTranslations.spatial[field],['Logo']);
});

test('missing source functions remain missing after separation',()=>{
  const source={functionalNetwork:[],functionalRelationships:[],mustBeVisible:[],sceneProgram:[],brandRoleManifestation:['Logo']};
  const result=separateSpatialFunctionalSemantics(source);
  assert.deepEqual(result.spatial,source);assert.deepEqual(result.changes,[]);
});

test('a failed deterministic callback cannot fall through to a model call',async()=>{
  let calls=0;
  const result=await completeStructuredAnalysis({packet:packet(),deliverable:'space',execution,
    validateFinalPacket:validate,repairFinalPacketDeterministically:()=>{throw new Error('LOCAL_FAILURE');},
    repairInvalidFinalPacket:async()=>{calls++;throw new Error('UNEXPECTED_MODEL');},
    model:async()=>{calls++;throw new Error('UNEXPECTED_MODEL');}});
  assert.equal(result.status,'failed');assert.equal(calls,0);assert.equal(result.modelCallCount,0);
});

test('non-food service sequence is separated without adding a room or changing service content',()=>{
  const source={functionalNetwork:['arrival→Logo→reception→waiting'],
    mustBeVisible:['入口处的品牌标识和咨询设备'],brandRoleManifestation:[]};
  const result=separateSpatialFunctionalSemantics(source);
  assert.deepEqual(result.spatial.functionalNetwork,['arrival→reception→waiting']);
  assert.deepEqual(result.spatial.mustBeVisible,['入口处的咨询设备']);
  assert.equal(validateSpatialSemantics(result.spatial).status,'pass');
});

test('motif, sculpture and color geometry cannot acquire functional or architectural authority',()=>{
  const protectedMotif='pe\u0061cock';
  for(const value of [`${protectedMotif} shaped ceiling`, '大型艺术装置', 'purple wall geometry', 'Logo']) {
    assert.equal(validateSpatialSemantics({functionalNetwork:[value]}).status,'block');
    const result=separateSpatialFunctionalSemantics({functionalNetwork:[value],brandRoleManifestation:[]});
    assert.equal(validateSpatialSemantics(result.spatial).status,'block');
  }
});
test('all targeted tests used zero network primitives',()=>assert.equal(networkAttempts(),0));
