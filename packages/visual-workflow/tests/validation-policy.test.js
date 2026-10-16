import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { validateShortChainDeliverableEvidence as validate, compileShortChainCorrectionPrompt } from '../src/generation-runtime/generation/deliverable-validator.js';
import { deriveGenerationFlowState } from '../src/contracts/index.js';
import { createShortChainGenerationService } from '../src/runtime/image-generation/short-chain-service.js';
import { createDeliverableValidatorService } from '../src/runtime/image-generation/deliverable-validator-service.js';
import { postCompositeConfirmedLogo } from '../src/runtime/image-generation/logo-post-composite.js';

const task = {projectId:'project', taskId:'task', deliverableFamily:'space', subtype:'reception', shot:'entrance_view', logoUsageMode:'post_composite', count:1, referenceAssetIds:[], generationBasis:'standard', aspectRatio:'16:9', mustInclude:[], mustAvoid:[]};
const evidence = {detectedFamily:'space', detectedSubtype:'reception', visibleEvidence:['Reception counter at center with a clear walkway on the right'], brandMatch:'matched', brandToneMatch:'matched', sceneCompleteness:'complete', logoTextStatus:'absent'};
const check = extra => validate({projectId:'project',taskContract:task,runId:'run',imageId:'image',evidence:{...evidence,...extra}});

test('post-composite identity absence never violates locked assets in generation', () => {
  const result = check({lockedAssetViolations:['No logo or typography to verify'], missingRequiredItems:['Logo missing'], forbiddenItemsFound:['Blank logo area']});
  assert.equal(result.status,'unverified');
  assert.deepEqual(result.blockingFindings,[]);
  assert.equal(result.deferredIdentityFindings.length,1);
  assert.equal(result.legacyUnscopedFindings.length,2);
  assert.equal(result.logoIntegrity,'pending_post_composite');
  assert.equal(result.retryRecommended,false);
});

test('generated text is checked independently, with visible evidence', () => {
  const result = check({logoTextStatus:'incorrect',generatedIdentityEvidence:['Upper wall: three invented letter-like marks']});
  assert.equal(result.status,'failed');
  assert.deepEqual(result.blockingFindings[0].evidence,['Upper wall: three invented letter-like marks']);
  assert.equal(result.retryRecommended,false);
  assert.equal(check({logoTextStatus:'incorrect'}).status,'unverified');
});

test('uncertainty and subjective quality hints never authorize regeneration', () => {
  for (const extra of [{brandToneMatch:'uncertain'}, {qualityIssues:['Lighting could be more expressive']}, {brandToneMatch:'mismatched'}, {detectedFamily:'unknown'}, {sceneCompleteness:'uncertain'}]) {
    const result=check(extra);
    assert.equal(result.status,'unverified');
    assert.equal(result.retryRecommended,false);
    assert.deepEqual(result.blockingFindings,[]);
  }
});

test('physical blocking findings retain concrete evidence without triggering paid work', () => {
  const result=check({missingRequiredStructures:['Center: required reception counter absent'],nonIdentityLockedAssetViolations:['Left wall: specified artwork visibly replaced']});
  assert.equal(result.status,'failed');
  assert.equal(result.blockingFindings.length,2);
  assert.ok(result.blockingFindings.every(item=>item.evidence.length));
  assert.equal(result.retryRecommended,false);
});

test('non-composite modes keep identity violation evidence', () => {
  for (const mode of ['reference','blank_area']) {
    const result=validate({taskContract:{...task,logoUsageMode:mode},evidence:{...evidence,logoTextStatus:'incorrect',lockedAssetViolations:['Distorted mark at center']}});
    assert.equal(result.status,'failed');
    assert.equal(result.retryRecommended,false);
  }
});

test('text regeneration prompt does not claim pixel preservation or local editing', () => {
  const prompt=compileShortChainCorrectionPrompt({originalPrompt:'A usable reception',taskContract:task,validation:check({logoTextStatus:'incorrect',generatedIdentityEvidence:['Invented letters at center']})});
  assert.match(prompt,/previous image is not supplied/);
  assert.match(prompt,/preservation is not guaranteed/);
  assert.doesNotMatch(prompt,/Preserve the requested shot/);
});

test('a second passed validation never ranks its image over the first; uncertainty is not passed', () => {
  assert.equal(deriveGenerationFlowState({initialRun:{status:'succeeded'},initialValidation:{status:'failed',retryRecommended:true},correctionRun:{status:'succeeded'},correctionValidation:{status:'passed'}}),'awaiting_human_review');
  assert.equal(deriveGenerationFlowState({initialRun:{status:'succeeded'},initialValidation:{status:'unverified'}}),'awaiting_human_review');
});

async function fixture(t, validator) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'visual-validation-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const compilation=path.join(root,'image-generation-vnext/compilations/task');
  await fs.mkdir(compilation,{recursive:true});
  for (const [name,value] of Object.entries({'task-contract':task,'compiled-prompt':{finalPrompt:'An enterable reception',preflightReport:{status:'pass'},trace:{sourceFingerprint:'fingerprint'},route:{templateVersions:[]}},'model-payload':{model:'fixture-model'},trace:{contextFingerprint:'fingerprint'}})) {
    await fs.writeFile(path.join(compilation,`${name}.json`),JSON.stringify(value));
  }
  const runs=[];
  const requests=[];
  const images={startCompiledCreativeTask:async request=>{
    requests.push(request);
    const n=runs.length+1;
    const run={projectId:'project',runId:`run-${n}`,status:'succeeded',images:[{imageId:`image-${n}`,relativePath:`images/${n}.png`,sha256:`digest-${n}`}],createdAt:new Date().toISOString()};
    runs.push(run);return run;
  }};
  const projects={paths:async()=>({root}),get:async()=>({assets:[]})};
  const service=createShortChainGenerationService(projects,{getShortChain:async()=>({provenance:{sourceFingerprint:'fingerprint'},lockedAssets:{logoAssetIds:[]}})},()=>images,()=>({validate:validator}));
  return {root,service,runs,requests};
}

test('legacy retry recommendation cannot cause a second generation and paid first image remains available', async t => {
  const f=await fixture(t,async()=>({status:'failed',retryRecommended:true,mismatchTypes:['quality_issue']}));
  const result=await f.service.startValidated(task);
  assert.equal(f.requests.length,1);
  assert.equal(result.firstImage.imageId,'image-1');
  assert.deepEqual(result.selectedImage,result.firstImage);
  assert.equal(result.automaticRetryCount,0);
  assert.equal(result.flowState,'awaiting_human_review');
  assert.equal(result.correctionPolicy.imageEditingSupported,false);
  assert.equal(result.correctionPolicy.sourceImageAttached,false);
  assert.equal(result.correctionPolicy.contentPreservationGuaranteed,false);
  assert.equal(result.correctionRun,undefined);
  assert.deepEqual(f.requests[0].references,[]);
});

test('explicit later invocation keeps both runs and validation summaries independently', async t => {
  let count=0;
  const f=await fixture(t,async()=>({status:++count===1?'failed':'passed',retryRecommended:true}));
  const first=await f.service.startValidated(task);
  const firstFile=path.join(f.root,'image-generation-vnext/validations/run-1.summary.json');
  const before=await fs.readFile(firstFile,'utf8');
  const second=await f.service.startValidated(task);
  assert.equal(f.requests.length,2);
  assert.equal(await fs.readFile(firstFile,'utf8'),before);
  assert.equal(first.selectedImage.imageId,'image-1');
  assert.equal(second.firstImage.imageId,'image-2');
  const stored=JSON.parse(await fs.readFile(path.join(f.root,'image-generation-vnext/validations/run-2.summary.json'),'utf8'));
  assert.equal(stored.initialValidation.status,'passed');
  assert.equal(stored.qualityAcceptance,'pending_human_review');
  assert.equal((await f.service.getSession('project')).history.length,2);
});

test('validator exception retains successful first run and truthful unverified state', async t => {
  const f=await fixture(t,async()=>{throw new Error('private provider detail');});
  const result=await f.service.startValidated(task);
  assert.equal(f.requests.length,1);
  assert.equal(result.initialRun.status,'succeeded');
  assert.equal(result.terminalStatus,'unverified');
  assert.equal(result.selectedImage.imageId,'image-1');
  assert.equal(result.initialValidation.errorCode,'DELIVERABLE_VALIDATION_UNAVAILABLE');
  assert.ok(!JSON.stringify(result).includes('private provider detail'));
});

test('validator request declares stage and asks for separately scoped identity evidence', async t => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'visual-validator-prompt-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  let captured;
  const service=createDeliverableValidatorService({paths:async()=>({root})},()=>({getRun:async()=>({projectId:'project',runId:'run',status:'succeeded',images:[{imageId:'image',relativePath:'image.png'}]}),runRoot:async()=>root}),async()=>({profiles:[]}),async()=>({protocol:'openai-chat-multimodal'}),undefined,()=>async request=>{captured=request;return {reportMarkdown:JSON.stringify(evidence)};});
  const result=await service.validate({projectId:'project',runId:'run',taskContract:task,validatorProfileId:'validator'});
  assert.match(captured.prompt.messages[1].content,/Logo and identity typography MUST be absent/);
  assert.match(captured.prompt.messages[1].content,/generatedIdentityEvidence/);
  assert.match(captured.prompt.messages[1].content,/missingRequiredStructures/);
  assert.equal(captured.prompt.attachments.length,1);
  assert.equal(result.logoIntegrity,'pending_post_composite');
});

test('actual offline composite preserves the original and records confirmed logo source digest', async t => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'visual-logo-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const scenePath=path.join(root,'scene.png'), logoPath=path.join(root,'logo.png'), outputPath=path.join(root,'composite.png');
  await sharp({create:{width:100,height:100,channels:3,background:'#fff'}}).png().toFile(scenePath);
  await sharp({create:{width:10,height:10,channels:4,background:'#000'}}).png().toFile(logoPath);
  const before=await fs.readFile(scenePath);
  const result=await postCompositeConfirmedLogo({scenePath,logoPath,outputPath,sourceCrop:{left:0,top:0,width:10,height:10},placement:{x:0.2,y:0.2,width:0.2}});
  assert.deepEqual(await fs.readFile(scenePath),before);
  assert.match(result.sourceLogoSha256,/^[a-f0-9]{64}$/);
  const {data,info}=await sharp(outputPath).raw().toBuffer({resolveWithObject:true});
  assert.equal(data[(25*info.width+25)*info.channels],0);
  assert.equal(data[0],255);
});

test('post-composite service requires confirmation and records stage separately from visual acceptance', async t => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'visual-logo-stage-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await fs.mkdir(path.join(root,'images'));
  await sharp({create:{width:100,height:100,channels:3,background:'#fff'}}).png().toFile(path.join(root,'images/original.png'));
  await sharp({create:{width:10,height:10,channels:4,background:'#000'}}).png().toFile(path.join(root,'logo.png'));
  await fs.writeFile(path.join(root,'source-context-snapshot.json'),JSON.stringify({taskContract:task}));
  const service=createShortChainGenerationService({paths:async()=>({root,input:root}),get:async()=>({assets:[{id:'logo',status:'ready',relativePath:'logo.png'}]})},{},()=>({getRun:async()=>({projectId:'project',runId:'run',status:'succeeded',images:[{imageId:'image',relativePath:'images/original.png'}]}),runRoot:async()=>root}));
  const input={projectId:'project',runId:'run',imageId:'image',logoAssetId:'logo',sourceCrop:{left:0,top:0,width:10,height:10},placement:{x:0.2,y:0.2,width:0.2}};
  await assert.rejects(service.postCompositeLogo(input),{code:'LOGO_POST_COMPOSITE_CONFIRMATION_REQUIRED'});
  const result=await service.postCompositeLogo({...input,confirmedByUser:true});
  assert.equal(result.validationStage,'post_composite');
  assert.equal(result.logoIntegrity,'source_recorded_pending_visual_review');
  assert.equal(result.qualityAcceptance,'pending_human_review');
  assert.equal(result.logoAssetId,'logo');
  assert.match(result.sourceLogoSha256,/^[a-f0-9]{64}$/);
  assert.notEqual(result.outputPath,result.sourceImagePath);
});
