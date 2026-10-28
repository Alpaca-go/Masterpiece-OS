import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {businessFixture} from './art-direction-business-fixture.ts';
import {createProjectDesignDirectionStore} from '../src/project-design-direction.js';
import {applyUserConfirmedVisualDecision} from '../src/generation-runtime/generation/user-confirmed-visual-decision.js';
import {compileShortChainGeneration} from '../src/generation-runtime/generation/compile.js';
import {captureSpaceCompilationEvidence,consumeCapturedSpaceEvidence,bindCapturedSpaceEvidence,assertSpaceEvidenceBinding,createOfflineSpaceEvidence,validateSpaceProjection} from '../src/generation-runtime/space/compilation-evidence.js';
import {adaptSpaceSource} from '../src/generation-runtime/space/source-adapter.js';
import {compileSpacePrompt} from '../src/generation-runtime/space/compiler.js';
import {makeFinalDesignFixture} from './restaurant-knowledge/ftt-final-design-fixture.ts';
import {networkAttempts} from './restaurant-knowledge/spatial-semantics/network-off.mjs';
import {resolveTargetFunctionalProgram} from '../src/generation-runtime/space/continuation/target-functional-programs.js';

async function confirmed(t:any,change=(confirmation:any)=>{}) {
  const f=await businessFixture(t);
  change(f.confirmation);
  const owner=createProjectDesignDirectionStore(f.projects);
  const draft=await owner.saveDraft(f.project.id,{confirmation:f.confirmation,sourceStatement:'Explicit isolated offline test decision',expectedRecordSha256:null});
  await owner.confirm(f.project.id,{expectedRecordSha256:draft.recordSha256,confirmedByUser:true});
  const captured=await owner.capture(f.project.id);
  const task={...f.task,projectId:f.project.id,taskId:'evidence-offline-task',generationBasis:'standard',referenceAssetIds:[]};
  const packet=(await f.context.getShortChain(f.project.id)).visualDecisionPacket;
  const mint=()=>captureSpaceCompilationEvidence({projects:f.projects,task,packet,captured});
  return {...f,owner,captured,task,packet,mint};
}
test('real persisted owner capture can issue a task-bound one-use compilation identity',async t=>{
  const f=await confirmed(t),before=JSON.stringify(f.packet),cap=await f.mint();
  const record=consumeCapturedSpaceEvidence(cap,{originalPacket:f.packet,confirmation:f.captured!.confirmation,taskContract:f.task});
  const effective=applyUserConfirmedVisualDecision(f.packet,f.captured!.confirmation,f.project.id).packet;
  const evidence=bindCapturedSpaceEvidence(record,effective,f.task);
  assert.equal(evidence.capture.confirmationId,f.captured!.confirmation.id);
  assert.equal(evidence.capture.recordSha256,f.captured!.snapshot.recordSha256);
  assert.equal(evidence.capture.analysisFingerprint,f.captured!.snapshot.analysisFingerprint);
  assert.equal(assertSpaceEvidenceBinding(evidence,effective,f.task),evidence);
  assert.throws(()=>consumeCapturedSpaceEvidence(cap,{originalPacket:f.packet,confirmation:f.captured!.confirmation,taskContract:f.task}),/missing_or_forged_capture/);
  assert.throws(()=>assertSpaceEvidenceBinding(structuredClone(evidence),effective,f.task),/missing_or_forged_binding/);
  assert.equal(JSON.stringify(f.packet),before); assert.equal(f.requests.length,0);
});
const simple=(c:any)=>Object.assign(c.spatialTranslation,{
  spatialConcept:'clear reception and waiting area',structureLanguage:['curved reception partitions'],
  signatureSpatialMechanism:['curved reception partitions'],brandRoleManifestation:['warm reception surfaces'],
  sceneProgram:['reception','waiting area'],functionalNetwork:['reception connects to waiting area'],
  functionalRelationships:['keep entrance clear'],mustBeVisible:['reception equipment'],positiveDifferentiators:['clear reception circulation']
});
async function bound(f:any) {
  const captured=consumeCapturedSpaceEvidence(await f.mint(),{originalPacket:f.packet,confirmation:f.captured.confirmation,taskContract:f.task});
  const packet=applyUserConfirmedVisualDecision(f.packet,f.captured.confirmation,f.project.id).packet;
  return {packet,evidence:bindCapturedSpaceEvidence(captured,packet,f.task)};
}
test('vertical production service capture -> bindings -> Projection -> Adapter -> Compiler stays offline',async t=>{
  const f=await confirmed(t,simple),before=JSON.stringify(f.packet);
  const compiled=await f.generation.compile({projectId:f.project.id,model:f.credentials.image.model,task:f.task});
  const gate=compiled.compiledPrompt.trace.compilationEvidence;
  assert.equal(gate.status,'pass');assert.equal(gate.executionEligibility,'eligible');
  const outputs=gate.sidecar.outputs.filter(o=>o.outputPath);
  assert(outputs.length>=5);assert(outputs.every(o=>o.sourceEntryIds.length===1));
  assert(outputs.some(o=>o.outputPath==='architectureFunctionBridge.operationConstraints[0]' && o.semanticType==='constraint'));
  assert.equal(gate.sidecar.capture.confirmationId,f.captured!.confirmation.id);
  assert.equal(JSON.stringify(f.packet),before);assert.equal(f.requests.length,0);assert.equal(networkAttempts(),0);
});
test('Compiler rejects missing and serialized evidence; tampered projected values fail validation',async t=>{
  const f=await confirmed(t,simple),b=await bound(f),input={packet:b.packet,taskContract:f.task,sourceEvidence:b.evidence};
  assert.throws(()=>compileSpacePrompt({...input,sourceEvidence:undefined}),/missing_or_forged_binding/);
  assert.throws(()=>compileSpacePrompt({...input,sourceEvidence:JSON.parse(JSON.stringify(b.evidence))}),/missing_or_forged_binding/);
  const layers=adaptSpaceSource(input);layers._raw.sceneProgram[0]='kitchen';
  assert.throws(()=>validateSpaceProjection(layers.compilationEvidence,b.packet,f.task,layers,'execution'),/projected_output_mismatch/);
});
for(const text of ['if reception equipment is present; reception equipment','reception equipment and enjoying cosmic essence']) test(`parent conditions/unknown cannot disappear: ${text}`,async t=>{
  const f=await confirmed(t,c=>{simple(c);c.spatialTranslation.mustBeVisible=[text];}),b=await bound(f);
  assert.throws(()=>compileSpacePrompt({packet:b.packet,taskContract:f.task,sourceEvidence:b.evidence}),error=>error.code==='SPACE_EXECUTION_EVIDENCE_BLOCKED' && error.originalGate.status==='block');
});
test('off-frame entries retain source range and no current-shot output',async t=>{
  const f=await confirmed(t,c=>{simple(c);c.spatialTranslation.sceneProgram.push('kitchen');}),b=await bound(f);
  const result=compileSpacePrompt({packet:b.packet,taskContract:f.task,sourceEvidence:b.evidence});
  const sidecar=result.trace.compilationEvidence.sidecar;
  const foreign=sidecar.outputs.filter(o=>o.fieldPath==='mediaTranslations.spatial.sceneProgram[2]');
  assert(foreign.length>0);assert(foreign.every(o=>o.outputPath===null && o.visibilityAuthority==='none'));
  assert(!result.layers._raw.sceneProgram.includes('kitchen'));
});
test('review_required window visibility cannot authorize generation',async t=>{
  const f=await confirmed(t,c=>{simple(c);c.spatialTranslation.mustBeVisible=['chef preparing food in kitchen visible through reception glazing'];}),b=await bound(f);
  assert.throws(()=>compileSpacePrompt({packet:b.packet,taskContract:f.task,sourceEvidence:b.evidence}),error=>error.code==='SPACE_EXECUTION_EVIDENCE_BLOCKED' && error.evidenceGate.findings.some(x=>x.dimension==='visibility'));
});
test('unknown array entry cannot disappear beside a valid visible entry',async t=>{
  const f=await confirmed(t,c=>{simple(c);c.spatialTranslation.mustBeVisible=['equipment','reception equipment'];}),b=await bound(f);
  assert.throws(()=>compileSpacePrompt({packet:b.packet,taskContract:f.task,sourceEvidence:b.evidence}),error=>error.code==='SPACE_EXECUTION_EVIDENCE_BLOCKED' && error.originalGate.findings.some(x=>x.original==='equipment'));
});
test('duplicate projected entries keep distinct source indices and bindings',async t=>{
  const f=await confirmed(t,c=>{simple(c);c.spatialTranslation.sceneProgram=['reception','reception','waiting area'];}),b=await bound(f);
  const result=compileSpacePrompt({packet:b.packet,taskContract:f.task,sourceEvidence:b.evidence});
  const rows=result.trace.compilationEvidence.sidecar.outputs.filter(o=>o.outputPath?.startsWith('_raw.sceneProgram'));
  assert.deepEqual(rows.map(o=>o.originalIndex),[0,1,2]);assert.equal(new Set(rows.map(o=>o.outputBindingId)).size,3);
});
test('start still re-resolves the real owner after offline compilation',async t=>{
  const f=await confirmed(t,simple),compiled=await f.generation.compile({projectId:f.project.id,model:f.credentials.image.model,task:f.task});
  await f.owner.markForReview(f.project.id);await assert.rejects(f.start(compiled),/RECONFIRM_REQUIRED/);
  assert.equal(f.requests.length,0);assert.equal(f.validations.length,0);
});
for(const basis of ['reference_first','continuation']) test(`${basis} system program has task/registry ownership, independent semantic and visibility gates`,async t=>{
  const f=await confirmed(t,simple);
  Object.assign(f.task,{generationBasis:basis,subtype:'consultation',referenceAssetIds:['offline-reference'],
    ...(basis==='continuation'?{continuation:{sourceScene:'dining',targetScene:'consultation',sourceAssetId:'offline-reference',sourceRunId:'offline-run',targetFunctionalProgram:resolveTargetFunctionalProgram('consultation')}}:{})});
  const b=await bound(f),layers=adaptSpaceSource({packet:b.packet,taskContract:f.task,sourceEvidence:b.evidence});
  const gate=validateSpaceProjection(layers.compilationEvidence,b.packet,f.task,layers,'execution');
  const entries=gate.sidecar.entries.filter(e=>e.sourceKind==='system_target_program');
  assert(entries.length>0);assert(entries.every(e=>e.confirmationStatus==='not_user_confirmation'));
  assert(entries.every(e=>e.evidenceRefs.includes(`task:${f.task.taskId}`)));
  // Frozen semantic grammar still rejects some registry wording. A system
  // source cannot bypass that gate, nor can it claim user confirmation.
  assert.equal(gate.status,'block');
  assert.throws(()=>compileSpacePrompt({packet:b.packet,taskContract:f.task,sourceEvidence:b.evidence}),error=>error.code==='SPACE_EXECUTION_EVIDENCE_BLOCKED');
  assert.equal(f.requests.length,0);
});
test('continuation cannot supply an invented system program',async t=>{
  const f=await confirmed(t,simple);
  Object.assign(f.task,{generationBasis:'continuation',subtype:'consultation',referenceAssetIds:['offline-reference'],continuation:{sourceScene:'dining',targetScene:'consultation',targetFunctionalProgram:{...resolveTargetFunctionalProgram('consultation'),requiredFunctions:['invented program']}}});
  const b=await bound(f);
  assert.throws(()=>adaptSpaceSource({packet:b.packet,taskContract:f.task,sourceEvidence:b.evidence}),/system_program_task_mismatch/);
});
test('FTT delta ledger reaches Compiler as proposed offline evidence; no formal payload',()=>{
  const fixture=makeFinalDesignFixture(),before=JSON.stringify(fixture),v=fixture.variants.find(v=>v.scene.subtype==='dining')!;
  const evidence=createOfflineSpaceEvidence({packet:v.B,basePacket:fixture.A,deltas:fixture.deltas,scene:'dining',task:v.task});
  const row=evidence.entries.find(e=>e.fieldPath==='mediaTranslations.spatial.functionalRelationships[0]')!;
  assert.equal(row.sourceStatus,'proposed_for_human_review_not_confirmed');assert.equal(row.confirmationStatus,'proposed');
  assert.deepEqual(row.evidenceRefs,['knowledge:rks-observation-5','human_selection:golds[0].reason']);
  assert.equal(row.originalText,v.B.mediaTranslations.spatial.functionalRelationships[0]);
  const review=compileShortChainGeneration({task:v.task,projectContext:{visualDecisionPacket:v.B},offlineEvidence:evidence,evidencePurpose:'offline_review'});
  assert.equal(review.status,'review_only');assert.equal(review.payload,null);assert.equal(review.dispatchable,false);
  assert.equal(review.executionEligibility,'denied');assert(!('taskContract' in review));assert(!('finalPrompt' in review));
  assert(review.evidence.entries.some(e=>e.sourceRecordId===row.sourceRecordId && e.confirmationStatus==='proposed'));
  assert.throws(()=>compileSpacePrompt({packet:v.B,taskContract:v.task,sourceEvidence:evidence}),/experiment_cannot_authorize_execution/);
  assert.equal(JSON.stringify(fixture),before);assert.equal(networkAttempts(),0);
});
for(const change of ['missing','conflict','changed']) test(`FTT invalid delta binding rejects ${change}`,()=>{
  const f=makeFinalDesignFixture(),v=f.variants.find(v=>v.scene.subtype==='dining')!,deltas=structuredClone(f.deltas),packet=structuredClone(v.B);
  const index=deltas.findIndex(d=>d.path==='mediaTranslations.spatial.functionalRelationships' && d.scene==='common');
  if(change==='missing')deltas.splice(index,1);
  if(change==='conflict')deltas[index].before=['wrong'];
  if(change==='changed')packet.mediaTranslations.spatial.functionalRelationships[0]+=' changed';
  assert.throws(()=>createOfflineSpaceEvidence({packet,basePacket:f.A,deltas,scene:'dining',task:v.task}),/delta_before_conflict|delta_final_packet_mismatch/);
});
test('duplicate entries bind to their declared indices; unchanged analysis never inherits confirmation',async t=>{
  const f=await confirmed(t,c=>{c.spatialTranslation.functionalNetwork=['reception','reception','waiting area'];});
  const captured=consumeCapturedSpaceEvidence(await f.mint(),{originalPacket:f.packet,confirmation:f.captured!.confirmation,taskContract:f.task});
  const effective=applyUserConfirmedVisualDecision(f.packet,f.captured!.confirmation,f.project.id).packet;
  const evidence=bindCapturedSpaceEvidence(captured,effective,f.task);
  const entries=evidence.entries.filter(e=>/^mediaTranslations\.spatial\.functionalNetwork\[/u.test(e.fieldPath));
  assert.deepEqual(entries.map(e=>[e.originalIndex,e.originalText]),[[0,'reception'],[1,'reception'],[2,'waiting area']]);
  assert.equal(new Set(entries.map(e=>e.entryFingerprint)).size,3);
  assert.deepEqual(entries.map(e=>e.sourceFieldPath),['spatialTranslation.functionalNetwork[0]','spatialTranslation.functionalNetwork[1]','spatialTranslation.functionalNetwork[2]']);
  assert(entries.every(e=>e.confirmationStatus==='confirmed' && e.sourceStatus==='confirmed_design_intent_not_verified_property'));
  assert(evidence.originalEntries.every(e=>e.confirmationStatus==='unconfirmed'));
  assert(evidence.entries.filter(e=>e.fieldPath.startsWith('projectFacts.brandName')).every(e=>e.confirmationStatus==='unconfirmed'));
  assert(Object.isFrozen(evidence.entries[0].parentScope));
});
for(const operation of ['delete','rewrite','reorder']) test(`effective Packet ${operation} invalidates exact binding`,async t=>{
  const f=await confirmed(t,c=>{c.spatialTranslation.functionalNetwork=['reception','waiting area'];});
  const captured=consumeCapturedSpaceEvidence(await f.mint(),{originalPacket:f.packet,confirmation:f.captured!.confirmation,taskContract:f.task});
  const effective=applyUserConfirmedVisualDecision(f.packet,f.captured!.confirmation,f.project.id).packet;
  if(operation==='delete')effective.mediaTranslations.spatial.functionalNetwork.pop();
  if(operation==='rewrite')effective.mediaTranslations.spatial.functionalNetwork[0]='dining';
  if(operation==='reorder')effective.mediaTranslations.spatial.functionalNetwork.reverse();
  assert.throws(()=>bindCapturedSpaceEvidence(captured,effective,f.task),/effective_packet_mismatch/);
});
test('plain trusted flags and matching serialized snapshots cannot authorize direct compilation',async t=>{
  const f=await confirmed(t);
  for(const fake of [f.captured,structuredClone(await f.mint()),{trusted:true,sourceOwner:'project-design-direction.capture/resolve',...f.captured!.snapshot}]) {
    assert.throws(()=>compileShortChainGeneration({task:f.task,projectContext:{visualDecisionPacket:f.packet},userConfirmedVisualDecision:f.captured!.confirmation,captureEvidence:fake}),/missing_or_forged_capture/);
  }
  assert.throws(()=>bindCapturedSpaceEvidence({effectivePacketFingerprint:'forged'},f.packet,f.task),/missing_or_forged_consumed_capture/);
  assert.equal(f.requests.length,0);
});
test('needs_reconfirmation cannot issue evidence',async t=>{
  const f=await confirmed(t);await f.owner.markForReview(f.project.id);
  await assert.rejects(f.mint(),/RECONFIRM_REQUIRED/);
});
test('stale confirmation snapshot cannot issue evidence',async t=>{
  const f=await confirmed(t);
  await f.owner.saveDraft(f.project.id,{confirmation:f.confirmation,sourceStatement:'Changed isolated test decision',expectedRecordSha256:f.captured!.snapshot.recordSha256});
  const next=await f.owner.get(f.project.id);await f.owner.confirm(f.project.id,{expectedRecordSha256:next.recordSha256,confirmedByUser:true});
  await assert.rejects(f.mint(),/COMPILATION_STALE/);
});
test('analysis fingerprint changes cannot issue evidence',async t=>{
  const f=await confirmed(t),p=path.join(f.paths.root,'project-context/visual-decision-packet.json');
  const packet=JSON.parse(await fs.readFile(p,'utf8'));packet.mediaTranslations.spatial.spatialConcept+=' changed';
  await fs.writeFile(p,JSON.stringify(packet));await assert.rejects(f.mint(),/RECONFIRM_REQUIRED/);
});
test('context Packet mismatch is rejected even with a valid capture',async t=>{
  const f=await confirmed(t);f.packet.mediaTranslations.spatial.spatialConcept+=' injected';
  await assert.rejects(f.mint(),/analysis_packet_mismatch/);
});
for(const field of ['projectId','taskId','generationBasis','currentInstruction']) test(`captured permission rejects changed ${field}`,async t=>{
  const f=await confirmed(t),cap=await f.mint();
  const task={...f.task,[field]:field==='generationBasis'?'reference_first':'changed',...(field==='generationBasis'?{referenceAssetIds:['explicit-ref']}:{})};
  assert.throws(()=>consumeCapturedSpaceEvidence(cap,{originalPacket:f.packet,confirmation:f.captured!.confirmation,taskContract:task}),/task_scope_mismatch/);
});
test('post-capture Packet and confirmation mutations are rejected',async t=>{
  const f=await confirmed(t),packet=structuredClone(f.packet);packet.mediaTranslations.spatial.sceneProgram[0]+=' changed';
  const cap=await f.mint();
  assert.throws(()=>consumeCapturedSpaceEvidence(cap,{originalPacket:packet,confirmation:f.captured!.confirmation,taskContract:f.task}),/original_packet_mismatch/);
  const next=await f.mint(),confirmation=structuredClone(f.captured!.confirmation);confirmation.spatialTranslation.sceneProgram[0]+=' changed';
  assert.throws(()=>consumeCapturedSpaceEvidence(next,{originalPacket:f.packet,confirmation,taskContract:f.task}),/confirmation_mismatch/);
});
