import test from 'node:test';
import assert from 'node:assert/strict';
import {networkAttempts} from './network-off.mjs';
import {FIELD_TYPES,spatialSemanticEvidence as evidence,validateSpatialSemantics as validate,
  separateSpatialFunctionalSemantics as separate} from '../../../src/generation-runtime/space/semantic/validate-spatial-semantics.js';
import {structuredAnalysisPacketFixture} from '../../../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import {completeStructuredAnalysis} from '../../../src/analysis-decisions/analysis-completion-orchestrator.js';

const fields=Object.keys(FIELD_TYPES);
const examples=[
 {type:'node',text:'接待大厅',allowed:['functionalNetwork','mustBeVisible','requiredSpatialElements','sceneProgram']},
 {type:'activity',text:'staff operating equipment',allowed:['functionalNetwork','mustBeVisible','sceneProgram']},
 {type:'relation',text:'展示界面连接比较工作台，服务通道位于两侧',allowed:fields},
 {type:'constraint',text:'Storefront access must not expose kitchen or dining interiors',allowed:fields.filter(f=>f!=='mustBeVisible')},
 {type:'visibility_request',text:'入口视线可见厨房制作活动',allowed:fields},
];
for(const field of fields)for(const row of examples) test(`field contract ${field} / ${row.type}`,()=>{
 const source={status:'unknown',source:'offline_unconfirmed_proposal',userConfirmedFields:[],evidenceRefs:['fixture:source']};
 const before=structuredClone(source),result=evidence(row.text,field,3,source);
 assert.equal(result.type,row.type);assert.equal(result.validation,row.allowed.includes(field)?'pass':'block');
 assert.equal(result.original,row.text);assert.equal(result.field,field);assert.equal(result.index,3);
 assert.deepEqual(result.parent,{original:row.text,field,index:3,start:0,end:row.text.length});
 assert.deepEqual(result.source,before);assert.deepEqual(source,before);assert.notEqual(result.source,source);
 assert.equal(result.sourceConfirmation,'unchanged');assert.equal(result.semanticOnly,true);
 assert.equal(validate({[field]:[row.text]}).status,result.validation);
 const split=separate({[field]:[row.text]});assert.equal(split.validation.status,result.validation);
 assert.deepEqual(split.spatial[field],[row.text]);
});
for(const field of fields)for(const [text,modality] of [
 ['员工没有操作设备','negative_observation'],
 ['Only if Logo and staff operating equipment','conditional'],
 ['未确认Logo和员工操作设备','unconfirmed'],
 ['如果入口连接厨房；员工操作设备','conditional'],
 ['staff operating equipment; unknown operational tail','unconfirmed'],
 ['staff operating equipment and enjoying cosmic essence','affirmative'],
]) test(`field contract scope ${field}: ${text}`,()=>{
 const source={[field]:[text]},before=structuredClone(source),typed=evidence(text,field);
 assert.equal(typed.modality,modality);assert.equal(typed.validation,'block');assert.ok(typed.reason);
 if(modality==='negative_observation')assert.equal(typed.type,'activity');
 const split=separate(source);assert.equal(split.validation.status,'block');
 assert.deepEqual(split.spatial[field],[text]);assert.deepEqual(source,before);
 assert.deepEqual(separate(split.spatial).spatial,split.spatial);
 assert.ok(split.evidence.some(x=>x.original===text&&x.modality===modality&&x.validation==='block'));
});
for(const [text,type,modality] of [
 ['入口不得暴露厨房','constraint','prohibition'],
 ['treatment activity and private room interiors remain off frame','constraint','prohibition'],
 ['preserve visitor privacy','constraint','affirmative'],
 ['takeaway handoff keeps a clear route','constraint','affirmative'],
 ['consultation is primary','constraint','affirmative'],
 ['seating supports 1-to-1 / 1-to-2','constraint','affirmative'],
 ['Reception: a usable reception counter connects to waiting area seating through clear visitor circulation.','relation','affirmative'],
 ['Reception and waiting share readable circulation','relation','affirmative'],
 ['Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route','relation','affirmative'],
 ['厨师在厨房制作食品并透过临街橱窗玻璃可见','visibility_request','affirmative'],
]) test(`field contract complete relation or prescription: ${text}`,()=>{
 const result=evidence(text,'functionalRelationships');assert.equal(result.validation,'pass');assert.equal(result.type,type);assert.equal(result.modality,modality);
 for(const tail of ['; unknown activity',' and enjoying cosmic essence',' 并畅想未来']) {
   const split=separate({functionalRelationships:[text+tail]});assert.equal(split.validation.status,'block');
   assert.deepEqual(split.spatial.functionalRelationships,[text+tail]);
 }
 for(const prefix of ['Only if ','尚未确认']) assert.equal(evidence(prefix+text,'functionalRelationships').validation,'block');
});
for(const text of ['候客区','半开放艺术停留与过渡区','Flowing visitor circulation','接待区','比较工作台'])test(`field contract named node without invented action: ${text}`,()=>{
 for(const field of ['functionalNetwork','requiredSpatialElements','sceneProgram']) {
   const result=evidence(text,field);assert.equal(result.type,'node');assert.equal(result.validation,'pass');
   assert.deepEqual(separate({[field]:[text]}).spatial[field],[text]);
 }
});
for(const text of ['equipment near it','reception counter near it','equipment behind this','equipment beside that','reception counter and with it',
 '入口 → 无法确定的节点','点餐制作取餐就餐的完整关系','whole project operating network',
 '形成高效服务动线; 支持多场景消费','位置与设置方式待确认','入口不得','Storefront access must not expose',
 '入口不得暴露厨房 and enjoying cosmic essence','takeaway handoff keeps',
 '展示界面连接，服务通道位于它旁边']) test(`field contract unresolved fragment stays closed: ${text}`,()=>{
 for(const field of fields){assert.equal(evidence(text,field).validation,'block');const r=separate({[field]:[text]});assert.equal(r.validation.status,'block');assert.deepEqual(r.spatial[field],[text]);}
});
test('field contract source clauses retain exact spans and parent scope without confirmation',()=>{
 const text='  Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route  ';
 const r=evidence(text,'functionalRelationships',2,{status:'proposed',evidenceRefs:['local:design']});
 assert.equal(r.validation,'pass');assert.equal(r.clauses.length,3);
 for(const c of r.clauses){assert.equal(text.slice(c.start,c.end),c.text);assert.equal(c.parent.original,text);assert.equal(c.parent.index,2);}
 assert.equal(r.source.status,'proposed');assert.equal(r.sourceConfirmation,'unchanged');
});
test('field contract brand separation keeps original index, ranges and source evidence',()=>{
 const source={mustBeVisible:['Logo','Logo; staff operating equipment'],provenance:{status:'unknown'},userConfirmedFields:[]};
 const evidenceSource={status:'unknown',source:'offline_source',evidenceRefs:['fixture:2']};
 const before=structuredClone(source),r=separate(source,{mustBeVisible:[{status:'unknown'},evidenceSource]});
 assert.equal(r.validation.status,'pass');assert.deepEqual(source,before);
 assert.deepEqual(r.spatial.mustBeVisible,['staff operating equipment']);
 const item=r.evidence[0];assert.equal(item.index,1);assert.equal(item.outputIndex,0);
 assert.equal(item.original,source.mustBeVisible[1]);assert.deepEqual(item.source,evidenceSource);
 assert.equal(item.parent.original,source.mustBeVisible[1]);
 for(const fragment of item.sourceFragments)assert.equal(item.original.slice(fragment.sourceRange.start,fragment.sourceRange.end),fragment.sourceFragment);
 assert.deepEqual(separate(r.spatial).spatial,r.spatial);
 assert.deepEqual(r.spatial.provenance,source.provenance);assert.deepEqual(r.spatial.userConfirmedFields,[]);
});
test('field contract separator and validator agree for illegal field shapes',()=>{
 for(const field of fields)for(const value of [null,'接待大厅',[null],[''],['接待大厅',null]]){
  const source={[field]:value},r=separate(source);assert.equal(r.validation.status,'block');assert.deepEqual(r.spatial[field],value);
  assert.ok(r.validation.evidence.some(e=>e.validation==='block'&&e.reason));
 }
});
test('field contract six-field source state cannot become confirmed on completion',async()=>{
 const packet=structuredAnalysisPacketFixture();packet.provenance.userConfirmedFields=[];
 packet.projectFacts.industry.value='unknown';packet.projectFacts.industry.status='unknown';packet.projectFacts.industry.confidence=0;
 const original=structuredClone(packet);let calls=0;
 const result=await completeStructuredAnalysis({packet,deliverable:'space',execution:{outputLanguage:'zh-CN',aspectRatio:'16:9',camera:{focalLength:'35mm'}},
  validateFinalPacket:p=>validate(p.mediaTranslations.spatial),repairFinalPacketDeterministically:({packet:p})=>{
   const r=separate(p.mediaTranslations.spatial);return {packet:{...p,mediaTranslations:{...p.mediaTranslations,spatial:r.spatial}},changes:r.changes,unresolved:r.unresolved,evidence:r.evidence};},
  model:async()=>{calls++;throw Error('NO_MODEL');}});
 assert.deepEqual(packet,original);assert.deepEqual(result.packet.projectFacts,original.projectFacts);
 assert.deepEqual(result.packet.provenance,original.provenance);assert.equal(calls,0);
 assert.equal(result.status,'requires_confirmation');
});
test('field contract observations require no network',()=>assert.equal(networkAttempts(),0));
