import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileFinalDesign} from './ftt-final-design-compile.ts';
import {makeFinalDesignFixture,furnitureVisible,serviceVisible,windowGoal,model,entranceActivity} from './ftt-final-design-fixture.ts';
import {operations,sha256,historicalBytes} from './ftt-fidelity-fixture.ts';
const count=(text:string,value:string)=>text.split(value).length-1;
const result=compileFinalDesign();
test('historical full packet and source classifications stay distinct from user goals and experiment hypotheses',()=>{
  assert.equal(sha256(historicalBytes),'e3564d51888661989eeb16de8923992a4e1148268e7f55e7427c4c70e6fb613c');
  const fixture=result.fixture;
  assert.equal(fixture.originalProjectId,fixture.historical.projectId);
  assert.equal(fixture.actualImage1RunAssociation,'undetermined');
  assert.deepEqual(fixture.B.provenance,fixture.historical.provenance);
  assert.equal(fixture.B.provenance.userConfirmedFields,undefined);
  assert.equal(fixture.B.projectFacts.brandRole.status,'proposed');
  assert.ok(fixture.deltas.every(row=>row.evidenceRefs.length && row.reason));
  assert.ok(fixture.deltas.some(row=>row.category==='B' && row.status!=='user_design_goal_in_experimental_copy'));
});
test('A is the disclosed shared post-composite adaptation rather than a silent repair of historical input',()=>{
  const expected=structuredClone(result.fixture.historical);
  expected.mediaTranslations.spatial.mustBeVisible=[expected.mediaTranslations.spatial.mustBeVisible[2]];
  assert.deepEqual(result.fixture.A,expected);assert.deepEqual(result.fixture.postCompositeChecklist.map(row=>row.sourceIndex),[0,1,3]);
});
test('all scene pairs retain identical camera, request, model, aspect, count and zero-reference controls',()=>{
  for(const row of result.rows) {
    assert.deepEqual(row.A.task,row.B.task);assert.equal(row.B.task.shotSource,'user_explicit');
    assert.equal(row.controls.model,model);assert.equal(row.controls.count,1);assert.equal(row.controls.imageSize,'2K');
    assert.equal(row.controls.referenceImages,0);assert.equal('image' in row.B.providerBody,false);
    assert.deepEqual({...row.A.providerBody,prompt:null},{...row.B.providerBody,prompt:null});
    assert.ok(row.B.providerBody.prompt.endsWith(row.B.formalPrompt));assert.equal(row.B.route.status,'pass');
  }
});
test('dining core input has actual, singular execution owners for cooking, steam, customers, counter and furniture',()=>{
  const row=result.rows.find(row=>row.scene.subtype==='dining')!;
  for(const value of [...operations,serviceVisible,furnitureVisible]) {
    const entry=row.B.trace.decisionTrace.visibleRequirements.find((entry:any)=>entry.text===value);
    assert.equal(entry.disposition,'retained',value);assert.ok(entry.owner);
    assert.equal(entry.sceneProjection.sceneScope,'current_shot');assert.ok(entry.finalPromptRetained);
    assert.equal(count(row.B.formalPrompt,value),1);assert.equal(count(row.B.providerBody.prompt,value),1);
  }
  assert.equal(row.B.trace.spaceGeneration.targetSceneAuthority.targetScene,'dining');
});
test('entrance retains a local activity and dining-access boundary without demanding the full interior network',()=>{
  const row=result.rows.find(row=>row.scene.subtype==='entrance')!;
  assert.equal(count(row.B.formalPrompt,entranceActivity),1);
  const network=row.B.trace.decisionTrace.sceneScope.find((entry:any)=>entry.sourcePath==='mediaTranslations.spatial.functionalNetwork[0]');
  assert.equal(network.sceneScope,'off_frame_dependency');assert.equal(count(row.B.formalPrompt,network.text),0);
  assert.ok(row.B.trace.decisionTrace.crossSceneConstraints.some((entry:any)=>entry.text.includes('Entrance access connects')));
  const localNodes=row.B.trace.decisionTrace.sceneScope.filter((entry:any)=>entry.sourceContainer==='mediaTranslations.spatial.sceneProgram');
  assert.deepEqual(localNodes.map((entry:any)=>entry.text),['入口到达与通行路径','入口局部服务活动']);
  assert.ok(localNodes.every((entry:any)=>entry.sceneScope==='current_shot'));
  for(const value of operations) assert.equal(count(row.B.formalPrompt,value),0);
});
test('storefront window objective stays review_required with no owner or automatic indoor visibility',()=>{
  const row=result.rows.find(row=>row.scene.subtype==='storefront')!;
  const entry=row.B.trace.decisionTrace.visibleRequirements.find((entry:any)=>entry.text===windowGoal);
  assert.equal(entry.disposition,'review_required');assert.equal(entry.owner,null);assert.equal(entry.outputText,null);
  assert.equal(count(row.B.formalPrompt,windowGoal),0);assert.equal(count(row.B.providerBody.prompt,windowGoal),0);
  const authority=row.B.trace.spaceGeneration.targetSceneAuthority;
  assert.equal(authority.targetScene,'storefront');assert.equal(authority.viewStrategy,'front');assert.equal(authority.shotSource,'user_explicit');
  const localNodes=row.B.trace.decisionTrace.sceneScope.filter((entry:any)=>entry.sourceContainer==='mediaTranslations.spatial.sceneProgram');
  assert.deepEqual(localNodes.map((entry:any)=>entry.text),['门头与外立面','临街外侧的到达路径']);
  assert.ok(localNodes.every((entry:any)=>entry.sceneScope==='current_shot'));
});
test('B uses qualitative historical color/material direction without inventing dimensions, Kelvin or optics',()=>{
  for(const row of result.rows) {
    assert.doesNotMatch(row.B.formalPrompt,/3000|3500|1\.5m|45cm|75cm|1\.2m|半通透|格栅|高反射|重点照明（射灯）/);
    assert.ok(row.B.formalPrompt.includes('暖色木'));assert.ok(row.B.formalPrompt.includes('赤陶'));
    assert.ok(row.B.formalPrompt.includes('光学参数'));
    assert.doesNotMatch(row.B.formalPrompt,/红砖/); // Independent optional review, not silently applied.
  }
  assert.ok(result.rows[0].A.formalPrompt.includes('3000K-3500K'));
});
test('advisory copy is explicitly separate, auditable and keeps rendering and negative-identity safeguards',()=>{
  for(const row of result.rows) {
    let replay=row.B.formalPrompt;
    for(const patch of row.advisory.patches) {assert.equal(count(replay,patch.before),1);replay=replay.replace(patch.before,patch.after);}
    assert.equal(replay,row.advisory.text);assert.equal(row.advisory.providerRequest,null);
    assert.ok(replay.includes('High-end architectural visualization'));
    assert.ok(replay.includes('no generic AI clinic look'));assert.ok(replay.includes('do NOT render it in-scene'));
    assert.equal(row.advisory.status,'unapproved_experimental_text_proposal_not_official_compiler_output');
  }
});
test('knowledge cards retain lifecycle, owner and no validated cases',()=>{
  const knowledge=JSON.parse(fs.readFileSync(new URL('../../reports/restaurant-knowledge/rks-candidate-knowledge.json',import.meta.url),'utf8'));
  for(const selection of result.fixture.selectedKnowledge) {
    const source=knowledge.find((row:any)=>row.knowledgeId===selection.id);
    assert.equal(source.status,selection.status);assert.equal(source.scope,'project');
    assert.deepEqual(source.validatedCases,[]);assert.ok(source.sourceProjects.includes('feng-tang-tang'));
  }
});
test('pure review cannot mutate fixtures, dispatch network or create user confirmations',t=>{
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw new Error('NETWORK_FORBIDDEN');});
  const before=JSON.stringify(makeFinalDesignFixture());const again=compileFinalDesign();
  assert.equal(JSON.stringify(makeFinalDesignFixture()),before);assert.equal(calls,0);
  assert.deepEqual(again.counters,{realAnalysis:0,realGeneration:0,realValidation:0,automaticRetries:0,referenceInputs:0});
  for(const row of again.rows) assert.equal(row.B.trace.userConfirmedVisualDecision,null);
});
