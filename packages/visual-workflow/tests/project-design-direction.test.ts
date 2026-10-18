import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {businessFixture} from './art-direction-business-fixture.ts';
import {createProjectDesignDirectionStore} from '../src/project-design-direction.js';
import {createShortChainGenerationService} from '../src/runtime/image-generation/short-chain-service.js';
import {compileShortChainGeneration} from '../src/generation-runtime/generation/compile.js';
import {createStandardGenerationInput} from '../../../apps/web/src/features/visual-workflow/api.ts';
import {digest} from '../src/art-direction-contract.js';
import {createVisualWorkflow} from '../src/service.js';
import sharp from 'sharp';

async function directed(t:any) {
  const f=await businessFixture(t);
  const store=createProjectDesignDirectionStore(f.projects);
  const draft=await store.saveDraft(f.project.id,{confirmation:f.confirmation,sourceStatement:'User-approved project design decisions; four artworks are offline visual calibration only, not brand facts or generation inputs.',expectedRecordSha256:null});
  const confirmed=await store.confirm(f.project.id,{expectedRecordSha256:draft.recordSha256,confirmedByUser:true});
  const input=createStandardGenerationInput({projectId:f.project.id,family:'space',subtype:'reception',shot:'entrance_view',shotExplicit:false,ratio:'16:9',instruction:'生成符合项目气质的空间效果图',include:'',avoid:'',hasLogo:true,directionRecordSha256:confirmed.recordSha256});
  return {...f,store,confirmed,input,compileStandard:()=>f.generation.compile({...input,model:f.credentials.image.model})};
}
test('project direction saves and confirms without registering or uploading a single reference',async t=>{
  const f=await directed(t);
  assert.equal(f.confirmed.status,'confirmed');
  await assert.rejects(fs.access(path.join(f.paths.root,'project-context/art-direction/references.json')));
  await assert.rejects(fs.access(path.join(f.paths.root,'project-context/user-confirmed-visual-decision.json')));
  const reopened=await createProjectDesignDirectionStore(f.projects).get(f.project.id);
  assert.deepEqual(reopened,f.confirmed);
  assert.equal(reopened.source.notOriginalBrandFact,true);
});
test('web standard task, effective Packet, official compiler, actual image request and validator share the confirmed direction',async t=>{
  const f=await directed(t);const before=await fs.readFile(path.join(f.paths.root,'project-context/visual-decision-packet.json'));
  const compiled=await f.compileStandard();
  const direct=compileShortChainGeneration({projectContext:await f.context.getShortChain(f.project.id),task:compiled.taskContract,model:f.credentials.image.model,userConfirmedVisualDecision:f.confirmation});
  assert.equal(compiled.compiledPrompt.finalPrompt,direct.compiledPrompt.finalPrompt);
  assert.match(compiled.compiledPrompt.finalPrompt,/当代美术馆|展馆/);assert.match(compiled.compiledPrompt.finalPrompt,/半透明/);
  for (const prohibited of f.confirmation.reviewTask.mustAvoid) assert(compiled.compiledPrompt.finalPrompt.includes(prohibited));
  assert.deepEqual(compiled.compiledPrompt.effectiveVisualDecisionPacket.mediaTranslations.spatial,{...f.confirmation.spatialTranslation,status:'ready'});
  assert.notDeepEqual(compiled.compiledPrompt.effectiveVisualDecisionPacket.colorSystem,f.packet.colorSystem);
  const result=await f.start(compiled);
  assert.equal(result.initialRun.status,'succeeded');assert.equal(f.requests.length,1);
  assert.equal('image' in f.requests[0].body,false);assert.equal(result.automaticRetryCount,0);
  assert(f.requests[0].body.prompt.endsWith(compiled.compiledPrompt.finalPrompt));
  assert.doesNotMatch(f.requests[0].body.prompt,/ART DIRECTION REFERENCE BOUNDARY|Image 1:/);
  assert.match(f.validations[0].prompt.messages[1].content,/当代美术馆/);
  const run=await f.images.runRoot(result.initialRun.runId);
  const snapshot=JSON.parse(await fs.readFile(path.join(run,'source-context-snapshot.json'),'utf8'));
  assert.equal(snapshot.designDirection.confirmationSha256,digest(f.confirmation));
  assert.equal(snapshot.taskContract.referenceAssetIds.length,0);
  assert.deepEqual(await fs.readFile(path.join(f.paths.root,'project-context/visual-decision-packet.json')),before);
});
test('a changed analysis Packet cannot silently overwrite or reuse the confirmed decision',async t=>{
  const f=await directed(t);const prior=structuredClone(f.confirmed.confirmation);
  const packet=structuredClone(f.packet);packet.mediaTranslations.spatial.spatialConcept='Conflicting old model proposal';
  await fs.writeFile(path.join(f.paths.root,'project-context/visual-decision-packet.json'),JSON.stringify(packet));
  const next=await f.store.get(f.project.id);assert.equal(next.status,'needs_reconfirmation');assert.deepEqual(next.confirmation,prior);
  await assert.rejects(f.compileStandard(),/RECONFIRM_REQUIRED/);
  const refreshed=await f.store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:next.recordSha256});
  assert.equal(refreshed.status,'confirmed');assert.deepEqual(refreshed.confirmation,prior);
});
test('an analysis request preserves direction and requires explicit reconfirmation even if analysis fails or app restarts',async t=>{
  const f=await directed(t);await f.store.markForReview(f.project.id);
  const reopened=await createProjectDesignDirectionStore(f.projects).get(f.project.id);
  assert.equal(reopened.status,'needs_reconfirmation');assert.equal(reopened.reason,'analysis_requested');
  assert.deepEqual(reopened.confirmation,f.confirmation);await assert.rejects(f.compileStandard(),/RECONFIRM_REQUIRED/);
});
test('decision changes after compile block dispatch and keep all history',async t=>{
  const f=await directed(t);const compiled=await f.compileStandard();
  await f.store.saveDraft(f.project.id,{confirmation:f.confirmation,sourceStatement:'Edited review',expectedRecordSha256:f.confirmed.recordSha256});
  await assert.rejects(f.start(compiled),/RECONFIRM_REQUIRED|COMPILATION_STALE/);assert.equal(f.requests.length,0);
  assert((await fs.readdir(path.join(f.paths.root,'project-context/design-direction-history'))).length>=3);
});
test('cross-project, stale editing, non-confirmation and invalid confirmed decisions are rejected',async t=>{
  const f=await directed(t);
  await assert.rejects(f.store.confirm(f.project.id,{expectedRecordSha256:f.confirmed.recordSha256}),/CONFIRMATION_REQUIRED/);
  await assert.rejects(f.store.saveDraft(f.project.id,{confirmation:f.confirmation,sourceStatement:'x',expectedRecordSha256:null}),/EDIT_CONFLICT/);
  await assert.rejects(f.store.saveDraft(f.project.id,{confirmation:{...f.confirmation,projectId:crypto.randomUUID()},sourceStatement:'x',expectedRecordSha256:f.confirmed.recordSha256}),/USER_CONFIRMED_VISUAL_DECISION_INVALID/);
});
test('a newly confirmed decision invalidates a previously compiled ordinary task with no direction',async t=>{
  const f=await businessFixture(t);const compiled=await f.generation.compile({projectId:f.project.id,model:f.credentials.image.model,task:{...f.task,generationBasis:'standard',referenceAssetIds:[]}});
  const store=createProjectDesignDirectionStore(f.projects);
  const draft=await store.saveDraft(f.project.id,{confirmation:f.confirmation,sourceStatement:'Explicit user decision',expectedRecordSha256:null});
  await store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:draft.recordSha256});
  await assert.rejects(f.start(compiled),/COMPILATION_STALE/);assert.equal(f.requests.length,0);
});
test('ordinary industries remain byte-identical and contain no direction or image request fields',async t=>{
  for(const industry of ['Medical aesthetics','Restaurant','Hotel']) {
    const f=await businessFixture(t,industry);const task={...f.task,generationBasis:'standard',referenceAssetIds:[]};
    const before=compileShortChainGeneration({projectContext:await f.context.getShortChain(f.project.id),model:f.credentials.image.model,task:{...task,projectId:f.project.id}});
    const compiled=await f.generation.compile({projectId:f.project.id,model:f.credentials.image.model,task});
    assert.equal(compiled.compiledPrompt.finalPrompt,before.compiledPrompt.finalPrompt);
    await f.start(compiled);assert.equal('image' in f.requests[0].body,false);
    assert.equal(compiled.compiledPrompt.userConfirmedVisualDecision,null);
  }
});
test('existing four-image art direction route remains independent and operational',async t=>{
  const f=await directed(t);await f.register();const compiled=await f.compile();await f.start(compiled);
  assert.equal(f.requests[0].body.image.length,4);assert.equal((await f.store.get(f.project.id)).status,'confirmed');
});
test('the plain-language web editor saves and confirms a usable direction without JSON editing',async t=>{
  const f=await directed(t);
  const draft=await f.store.saveDraft(f.project.id,{fields:f.confirmed.fields,sourceStatement:'User reviewed plain-language design direction',expectedRecordSha256:f.confirmed.recordSha256});
  await f.store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:draft.recordSha256});
  const compiled=await f.compileStandard();assert.equal(compiled.compiledPrompt.preflightReport.status,'pass');
  assert.match(compiled.compiledPrompt.finalPrompt,/半透明/);
});
test('guarded public web operations save, confirm, compile, generate, reopen and invalidate on an analysis request',async t=>{
  const f=await businessFixture(t);const requests:any[]=[];
  const output=await sharp({create:{width:320,height:180,channels:3,background:'white'}}).png().toBuffer();
  const workflow=createVisualWorkflow({root:f.root,
    fetchImpl:async(_url:any,input:any)=>{requests.push(JSON.parse(input.body));return new Response(JSON.stringify({data:[{b64_json:output.toString('base64')}]}),{status:200});},
    analysisProviders:{createReasoner:()=>async()=>{throw new Error('OFFLINE_ANALYSIS_STOP');}},
    validationReasoner:()=>async()=>({provider:'offline',model:'qwen3.6-plus',reportMarkdown:JSON.stringify({detectedFamily:'space',detectedSubtype:'reception',visibleEvidence:['offline'],missingRequiredItems:[],forbiddenItemsFound:[],lockedAssetViolations:[],brandMatch:'matched',brandToneMatch:'matched',sceneCompleteness:'complete',logoTextStatus:'absent',qualityIssues:[]})})
  });
  const op=workflow.operations;
  await op['visual-workflow:save-profile']({}, {name:'Offline image',provider:'volcengine',protocol:'seedream-image',modelId:f.credentials.image.model,modelType:'image_generation',baseUrl:'https://image.example.invalid/v3',apiKey:'OFFLINE_FIXTURE_ONLY'});
  await op['visual-workflow:save-profile']({}, {name:'Offline validator',provider:'dashscope',protocol:'openai-chat-multimodal',modelId:'qwen3.6-plus',modelType:'analysis',baseUrl:'https://validator.example.invalid/v1',apiKey:'OFFLINE_FIXTURE_ONLY'});
  const draft=await op['visual-workflow:import-files']({},f.project.id,{purpose:'project_design_direction',action:'save_draft',expectedRecordSha256:null,confirmation:f.confirmation,sourceStatement:'Explicit user-approved test direction'});
  const confirmed=await op['visual-workflow:import-files']({},f.project.id,{purpose:'project_design_direction',action:'confirm',expectedRecordSha256:draft.recordSha256,confirmedByUser:true});
  const compiled=await op['visual-workflow:compile']({},createStandardGenerationInput({projectId:f.project.id,family:'space',subtype:'reception',shot:'entrance_view',shotExplicit:false,ratio:'16:9',instruction:'生成符合项目气质的空间效果图',include:'',avoid:'',hasLogo:true,directionRecordSha256:confirmed.recordSha256}));
  await op['visual-workflow:generate']({}, {projectId:f.project.id,taskId:compiled.taskContract.taskId});
  assert.equal(requests.length,1);assert.equal('image' in requests[0],false);
  const restarted=createVisualWorkflow({root:f.root});
  assert.equal((await restarted.operations['visual-workflow:report']({},f.project.id,'project_design_direction')).status,'confirmed');
  await assert.rejects(op['visual-workflow:analyze']({},f.project.id,true));
  const retained=await op['visual-workflow:report']({},f.project.id,'project_design_direction');
  assert.equal(retained.status,'needs_reconfirmation');assert.deepEqual(retained.confirmation,f.confirmation);
});
