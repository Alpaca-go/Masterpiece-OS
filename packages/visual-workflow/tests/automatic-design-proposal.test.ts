import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {structuredAnalysisPacketFixture} from '../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import {buildUnifiedVisualUnderstandingPrompt} from '../src/runtime/unified-visual-understanding.js';
import {buildVisualDecisionPacket} from '../src/runtime/visual-decision-packet.js';
import {analysisDirectionSuggestion} from '../src/analysis-direction-suggestion.js';
import {createProjectDesignDirectionStore} from '../src/project-design-direction.js';
import {classifyPhrase} from '../src/generation-runtime/space/semantic/separate-space-semantics.js';
import {BRAND_MOTIF_TERMS} from '../src/generation-runtime/space/semantic/lexicons.js';
import {businessFixture} from './art-direction-business-fixture.ts';

function modelOutput() {
  const output:any=structuredAnalysisPacketFixture();
  const s=output.mediaTranslations.spatial;
  s.designProposal={sourceType:'model_proposal',basis:['asset:motif-1 supports open display edges'],assumptions:['The customer interaction occurs at one worktable'],unresolvedQuestions:['Actual room dimensions remain unknown']};
  s.compositionRequirements=['Keep the customer approach visible without cropping the worktable'];
  s.mustBeVisible=['An independent comparison worktable separates two accessible chairs facing each other across the table'];
  for(const group of ['primary','secondary','accent']) for(const color of s.colorBehavior[group]) {
    color.surfaceApplicability=group==='accent'?'Small display backing panels only':'Surrounding architectural surfaces';
    color.spatialUsage=group==='accent'?'local_accent':'secondary_surface';
  }
  return output;
}

test('default model request asks for automatic proposals while retaining evidence and unknown-fact boundaries',()=>{
  const prompt=buildUnifiedVisualUnderstandingPrompt({id:'new-project',projectName:'Equipment studio',industry:'Retail',description:'Hands-on comparison with accessible circulation'},['asset-1']);
  assert.match(prompt,/主动形成可执行的空间设计提案/);
  assert.match(prompt,/Hands-on comparison with accessible circulation/);
  assert.match(prompt,/不要求原素材已经写出全部设计答案/);
  assert.match(prompt,/真实层高、结构受力、面积、设备规格等未知事实保持未知/);
  assert.match(prompt,/'?surfaceApplicability/);
  assert.match(prompt,/compositionRequirements/);
  assert.doesNotMatch(prompt,/九州|珠光|弱紫|只能来自当前项目证据或用户确认|没有证据时人物和功能关系保持空数组/);
});

test('model output keeps scoped colors, composition and proposal provenance through normalization and autofill',()=>{
  const output=modelOutput();const before=structuredClone(output);
  const packet:any=buildVisualDecisionPacket({core:output,extracted:output});
  const suggestion=analysisDirectionSuggestion(packet.projectId,packet,'model-output');
  assert.deepEqual(suggestion.designProposal,output.mediaTranslations.spatial.designProposal);
  assert.equal(suggestion.fields.compositionRequirements,output.mediaTranslations.spatial.compositionRequirements[0]);
  assert.equal(suggestion.fields.colorEntries[2].surfaceApplicability,'Small display backing panels only');
  assert.equal(suggestion.fields.colorEntries[2].spatialUsage,'local_accent');
  assert.equal(suggestion.sourceType,'analysis_suggestion');
  assert.deepEqual(packet.lockedAssets,output.lockedAssets);
  assert.deepEqual(output,before);
  suggestion.designProposal.assumptions.push('local edit');
  assert.deepEqual(packet.mediaTranslations.spatial.designProposal,output.mediaTranslations.spatial.designProposal);
});

test('invalid scope or claimed confirmation cannot acquire proposal authority',()=>{
  const output=modelOutput();
  output.mediaTranslations.spatial.colorBehavior.accent[0].spatialUsage='fill_everywhere';
  output.mediaTranslations.spatial.designProposal.sourceType='user_confirmed';
  const packet:any=buildVisualDecisionPacket({core:output,extracted:output});
  assert.equal(packet.mediaTranslations.spatial.designProposal,undefined);
  const suggestion=analysisDirectionSuggestion(packet.projectId,packet,'partial');
  assert.equal(suggestion.fields.colorEntries[2].spatialUsage,'');
  assert(suggestion.missingFields.some((item:any)=>item.field==='colorEntries[2].spatialUsage'));
});

test('functional relation recognition does not grant authority to identity, motifs or color geometry',()=>{
  assert.equal(classifyPhrase('Two chairs face each other across a worktable','mustBeVisible').classification,'functional');
  assert.equal(classifyPhrase('两侧座椅隔台相向，各自可进出','mustBeVisible').classification,'functional');
  for(const phrase of ['Logo across a worktable with chairs facing each other',`${BRAND_MOTIF_TERMS[0]} chairs facing across the table`,'Purple flowing table with chairs facing each other']) {
    assert.notEqual(classifyPhrase(phrase,'mustBeVisible').classification,'functional');
  }
});

test('automatic suggestion can be confirmed without field rewriting and reaches actual offline image adapter',async t=>{
  const f=await businessFixture(t,'Retail');
  const output=modelOutput();output.projectId=f.project.id;
  const packet=buildVisualDecisionPacket({core:output,extracted:output});
  await fs.writeFile(path.join(f.paths.root,'project-context/visual-decision-packet.json'),JSON.stringify(packet));
  const store=createProjectDesignDirectionStore(f.projects);
  const view=await store.get(f.project.id);
  assert.equal(view.status,'missing');assert.equal(view.recordSha256,null);
  const draft=await store.saveDraft(f.project.id,{fields:view.analysisSuggestion.fields,sourceStatement:'Reviewed model proposal; unknown dimensions remain unknown.',expectedRecordSha256:null});
  assert.deepEqual(draft.validationIssues,[]);
  await store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:draft.recordSha256});
  const compiled=await f.generation.compile({projectId:f.project.id,model:f.credentials.image.model,task:{...f.task,generationBasis:'standard',referenceAssetIds:[],currentInstruction:'Generate the reviewed project proposal',mustAvoid:[]}});
  await f.start(compiled);
  assert.equal(f.requests.length,1);
  for(const required of [output.mediaTranslations.spatial.mustBeVisible[0],output.mediaTranslations.spatial.compositionRequirements[0],'Small display backing panels only']) assert(f.requests[0].body.prompt.includes(required),required);
  assert.equal('image' in f.requests[0].body,false);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.paths.root,'project-context/visual-decision-packet.json'),'utf8')),packet);
});
