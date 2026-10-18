import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { businessFixture } from './art-direction-business-fixture.ts';
import { digest } from '../src/art-direction-contract.js';
import { SEEDREAM_ADAPTER_CAPABILITY } from '../src/generation-runtime/generation/seedream-adapter.js';
import { listMultiModelAdapters } from '../src/image-adapter/multi-model.js';
import { resolveEffectiveMaxReferences } from '../src/generation-runtime/space/product-policy.js';
import { createVisualWorkflow } from '../src/service.js';
import { verifyImplementation } from '../src/integrity.js';

test('application service loads confirmation, preserves gates and sends four ordered original byte inputs through actual image adapter',async t=>{
  const f=await businessFixture(t);const before=await fs.readFile(path.join(f.paths.root,'project-context/visual-decision-packet.json'));
  const registry=await f.register();const compiled=await f.compile();
  assert.equal(compiled.compiledPrompt.userConfirmedVisualDecision.id,f.confirmation.id);
  assert.equal(compiled.taskContract.generationBasis,'art_direction_reference');
  assert.equal(compiled.compiledPrompt.trace.spaceGeneration.routeIntegrity.status,'pass');
  assert.equal(compiled.compiledPrompt.preflightReport.status,'pass');
  assert.match(compiled.compiledPrompt.finalPrompt,/ART DIRECTION REFERENCE BOUNDARY/);
  assert.match(compiled.compiledPrompt.finalPrompt,/乳白|暖白/);
  assert.match(compiled.compiledPrompt.finalPrompt,/轻薄半透明|半透明珠光/);
  const result=await f.start(compiled);
  assert.equal(result.initialRun.status,'succeeded');assert.equal(result.automaticRetryCount,0);
  assert.equal(f.requests.length,1);assert.equal(f.validations.length,1);
  assert.ok(f.validations[0].prompt.messages[1].content.includes(f.confirmation.spatialTranslation.spatialConcept));
  assert.equal(result.qualityAcceptance,'pending_human_review');
  assert.equal(result.logoIntegrity,'pending_post_composite');
  const request=f.requests[0].body;
  assert.equal(request.image.length,4);
  assert.ok(request.prompt.endsWith(compiled.compiledPrompt.finalPrompt));
  for(const [index,item] of request.image.entries())assert.equal(digest(Buffer.from(item.split(',')[1],'base64')),f.uploads[index].sha256);
  assert.equal('ref_strength' in request,false);assert.equal('ref_mode' in request,false);
  assert.ok(!request.image.some((item:string)=>digest(Buffer.from(item.split(',')[1],'base64'))===digest(f.logo)));
  const metadata=JSON.parse(await fs.readFile(path.join(await f.images.runRoot(result.initialRun.runId),'request-metadata.json'),'utf8'));
  assert.equal(metadata.referenceCount,4);
  assert.deepEqual(metadata.artDirection.references.map((item:any)=>item.sha256),registry.assets.map((item:any)=>item.sha256));
  const trace=JSON.parse(await fs.readFile(path.join(compiled.artifactDirectory,'run-trace.json'),'utf8'));
  assert.equal(trace.gateA.status,'pass');assert.equal(trace.gateB.status,'pass');
  assert.deepEqual(await fs.readFile(path.join(f.paths.root,'project-context/visual-decision-packet.json')),before);
  await assert.rejects(f.generation.postCompositeLogo({projectId:f.project.id,runId:result.initialRun.runId,imageId:result.initialRun.images[0].imageId}),/confirmation/i);
  const image=result.initialRun.images[0];
  const original=await fs.readFile(path.join(await f.images.runRoot(result.initialRun.runId),image.relativePath));
  const composite=await f.generation.postCompositeLogo({projectId:f.project.id,runId:result.initialRun.runId,imageId:image.imageId,logoAssetId:'logo-1',confirmedByUser:true,sourceCrop:{left:0,top:0,width:40,height:30},placement:{x:0.2,y:0.2,width:0.2}});
  assert.equal(composite.sourceLogoSha256,digest(f.logo));
  assert.equal(composite.qualityAcceptance,'pending_human_review');
  assert.deepEqual(await fs.readFile(composite.sourceImagePath),original);
});

test('independent provider and product capacity are consistent and unsupported models fail closed',async t=>{
  assert.equal(SEEDREAM_ADAPTER_CAPABILITY.reference.maxReferenceImages,10);
  assert.equal(listMultiModelAdapters().find(item=>item.id==='seedream-5.0-pro')?.maxReferences,10);
  assert.equal(resolveEffectiveMaxReferences({generationBasis:'art_direction_reference',adapterCapability:SEEDREAM_ADAPTER_CAPABILITY}).effectiveMax,10);
  const f=await businessFixture(t);await f.register();f.credentials.image.model='unverified-deployment';
  await assert.rejects(f.compile(),/MODEL_UNSUPPORTED/);assert.equal(f.requests.length,0);
});

test('registration rejects negative/Logo roles, duplicates, foreign authority, corrupt images and invalid MIME before modifying a directive',async t=>{
  const f=await businessFixture(t);
  for(const mutate of [
    (x:any)=>x.images[0].role='rejected_comparison',(x:any)=>x.images[0].role='logo',
    (x:any)=>x.images.push(x.images[0]),(x:any)=>x.confirmation.projectId='foreign',
    (x:any)=>x.authorization.status='draft',(x:any)=>x.images[0].sha256='0'.repeat(64),
    (x:any)=>x.images[0].mimeType='image/jpeg',(x:any)=>x.images[0].authorizationStatus='revoked',
    (x:any)=>x.images[0].projectId='foreign',(x:any)=>x.authorization.projectId='foreign',
    (x:any)=>x.images[0].content='invalid!',
    (x:any)=>{x.images[0]={...x.images[0],content:f.logo.toString('base64'),sha256:digest(f.logo),sizeBytes:f.logo.length};}
  ]){const x=structuredClone(f.registration);mutate(x);await assert.rejects(f.store.register(x));}
  await assert.rejects(fs.access(path.join(f.paths.root,'project-context/user-confirmed-visual-decision.json')));
  assert.equal(f.requests.length,0);
});

test('missing, duplicate, foreign project and unknown reference selections never become text generation',async t=>{
  const f=await businessFixture(t);await f.register();const saved=[...f.task.referenceAssetIds];
  for(const ids of [[],[saved[0],saved[0]],['foreign'],[...saved,'missing']]){f.task.referenceAssetIds=ids;await assert.rejects(f.compile());}
  f.task.referenceAssetIds=saved;
  const foreign=await f.projects.create({projectName:'Foreign'});
  await assert.rejects(f.store.capture(foreign.id,saved,f.credentials.image.model));
  assert.equal(f.requests.length,0);
});

test('post-compilation asset edits and missing files fail before any adapter transport',async t=>{
  for(const remove of [false,true]){
    const f=await businessFixture(t);const registry=await f.register();const compiled=await f.compile();const file=path.join(f.paths.root,registry.assets[0].relativePath);
    if(remove)await fs.unlink(file);else await fs.writeFile(file,Buffer.from('tampered'));
    await assert.rejects(f.start(compiled));assert.equal(f.requests.length,0);
  }
});

test('revocation, authorization change, source directive change and registry role tampering invalidate the execution snapshot',async t=>{
  for(const change of ['revoked','source','confirmation','role']){
    const f=await businessFixture(t);await f.register();const compiled=await f.compile();
    const file=path.join(f.paths.root,change==='confirmation'?'project-context/user-confirmed-visual-decision.json':'project-context/art-direction/references.json');
    const record=JSON.parse(await fs.readFile(file,'utf8'));
    if(change==='revoked')record.authorization.status='revoked';
    if(change==='source')record.authorization.source='changed';
    if(change==='role')record.assets[0].role='logo';
    if(change==='confirmation')record.spatialTranslation.structureLanguage=['Changed after approval'];
    await fs.writeFile(file,JSON.stringify(record));await assert.rejects(f.start(compiled));assert.equal(f.requests.length,0);
  }
});

test('provider profile model or protocol changes cannot silently execute a compiled reference task',async t=>{
  for(const property of ['model','protocol']){
    const f=await businessFixture(t);await f.register();const compiled=await f.compile();f.credentials.image[property]='unsupported';
    await assert.rejects(f.start(compiled));assert.equal(f.requests.length,0);
  }
});

test('edited prompts and tampered task snapshots cannot bypass compile or Provider prompt gates',async t=>{
  const f=await businessFixture(t);await f.register();const compiled=await f.compile();
  await assert.rejects(f.generation.start({projectId:f.project.id,taskId:compiled.taskContract.taskId,apiProfileId:'image',editedPrompt:'Use a different design'}));
  const taskFile=path.join(compiled.artifactDirectory,'task-contract.json');
  const task=JSON.parse(await fs.readFile(taskFile,'utf8'));task.referenceAssetIds.reverse();await fs.writeFile(taskFile,JSON.stringify(task));
  await assert.rejects(f.start(compiled));assert.equal(f.requests.length,0);
});

test('asset parent junctions and registry traversal fail closed',async t=>{
  const f=await businessFixture(t);const registry=await f.register();const compiled=await f.compile();
  const assets=path.join(f.paths.root,'project-context/art-direction/assets');const moved=path.join(f.root,'moved-assets');
  await fs.rename(assets,moved);await fs.symlink(moved,assets,process.platform==='win32'?'junction':'dir');
  await assert.rejects(f.start(compiled),/PATH_INVALID/);assert.equal(f.requests.length,0);
  assert.equal(registry.assets.length,4);
});

test('ordinary standard generation remains byte-for-byte identical across medical, restaurant and hotel projects',async t=>{
  for(const industry of ['Medical aesthetics','Restaurant','Hotel']){
    const f=await businessFixture(t,industry);
    const task={...f.task,generationBasis:'standard',referenceAssetIds:[],currentInstruction:'Create the requested practical reception',mustAvoid:[]};
    const first=await f.generation.compile({projectId:f.project.id,model:f.credentials.image.model,task});
    const second=await f.generation.compile({projectId:f.project.id,model:f.credentials.image.model,task});
    assert.equal(second.compiledPrompt.finalPrompt,first.compiledPrompt.finalPrompt);
    await f.start(first);assert.equal(f.requests.length,1);assert.equal(f.requests[0].body.image,undefined);
    assert.doesNotMatch(f.requests[0].body.prompt,/ART DIRECTION REFERENCE BOUNDARY|珠光层片|当代美术馆/);
  }
});

test('public operations verify the approved implementation before registration, compilation, generation and Logo composition',async t=>{
  const f=await businessFixture(t);
  const output=await sharp({create:{width:320,height:180,channels:3,background:'white'}}).png().toBuffer();
  const requests:any[]=[];let validationCalls=0;
  const workflow=createVisualWorkflow({root:f.root,
    fetchImpl:async(_url:any,request:any)=>{requests.push(JSON.parse(request.body));return new Response(JSON.stringify({data:[{b64_json:output.toString('base64')}]}),{status:200});},
    validationReasoner:()=>async()=>{validationCalls++;return {provider:'offline',model:'qwen3.6-plus',reportMarkdown:JSON.stringify({detectedFamily:'space',detectedSubtype:'reception',visibleEvidence:['Offline fixture'],missingRequiredItems:[],forbiddenItemsFound:[],lockedAssetViolations:[],brandMatch:'matched',brandToneMatch:'matched',sceneCompleteness:'complete',logoTextStatus:'absent',qualityIssues:[]})};}
  });
  await workflow.operations['visual-workflow:save-profile']({}, {name:'Offline image',provider:'volcengine',protocol:'seedream-image',modelId:f.credentials.image.model,modelType:'image_generation',baseUrl:'https://image.example.invalid/v3',apiKey:'offline-fixture-image'});
  await workflow.operations['visual-workflow:save-profile']({}, {name:'Offline validator',provider:'dashscope',protocol:'openai-chat-multimodal',modelId:'qwen3.6-plus',modelType:'analysis',baseUrl:'https://validator.example.invalid/v1',apiKey:'offline-fixture-validator'});
  const registration=await workflow.operations['visual-workflow:import-files']({},f.project.id,{...f.registration,purpose:'art_direction'});
  const compiled=await workflow.operations['visual-workflow:compile']({}, {projectId:f.project.id,task:{...f.task,referenceAssetIds:registration.assets.map((item:any)=>item.id)}});
  const result=await workflow.operations['visual-workflow:generate']({}, {projectId:f.project.id,taskId:compiled.taskContract.taskId});
  assert.equal(result.initialRun.status,'succeeded');assert.equal(requests.length,1);assert.equal(validationCalls,1);
  assert.equal(result.automaticRetryCount,0);assert.equal(requests[0].image.length,4);
  const implementation=JSON.parse(await fs.readFile(path.join(compiled.artifactDirectory,'workflow-implementation.json'),'utf8'));
  assert.deepEqual(implementation,await verifyImplementation());
  const runImplementation=JSON.parse(await fs.readFile(path.join(await workflow.images.runRoot(result.initialRun.runId),'workflow-implementation.json'),'utf8'));
  assert.deepEqual(runImplementation,implementation);
  const composed=await workflow.operations['visual-workflow:post-composite-logo']({}, {projectId:f.project.id,runId:result.initialRun.runId,imageId:result.initialRun.images[0].imageId,logoAssetId:'logo-1',confirmedByUser:true,sourceCrop:{left:0,top:0,width:40,height:30},placement:{x:0.2,y:0.2,width:0.2}});
  assert.equal(composed.audit.sourceLogoSha256,digest(f.logo));assert.equal(composed.audit.qualityAcceptance,'pending_human_review');
});

test('image service independently rejects reordered or relabeled execution references',async t=>{
  for(const change of ['order','role','hash','project']){
    const f=await businessFixture(t);await f.register();const compiled=await f.compile();
    const original=f.images.startCompiledCreativeTask;
    f.images.startCompiledCreativeTask=async(input:any)=>{
      const changed=structuredClone(input);
      if(change==='order')changed.references.reverse();
      if(change==='role')changed.references[0].role='logo';
      if(change==='hash')changed.references[0].sha256='0'.repeat(64);
      if(change==='project')changed.references[0].projectId='foreign';
      return original(changed);
    };
    await assert.rejects(f.start(compiled),/REQUEST_REFERENCES_CHANGED/);assert.equal(f.requests.length,0);
  }
});

test('ten unique authorized files are supported; eleven inputs or an empty set are rejected without truncation',async t=>{
  const f=await businessFixture(t);const images=[];
  for(let index=0;index<10;index++){
    const bytes=await sharp({create:{width:64+index,height:48,channels:3,background:'white'}}).png().toBuffer();
    images.push({...f.uploads[0],content:bytes.toString('base64'),sha256:digest(bytes),sizeBytes:bytes.length});
  }
  const registry=await f.store.register({...f.registration,images});
  f.task.referenceAssetIds=registry.assets.map((item:any)=>item.id);
  const compiled=await f.compile();await f.start(compiled);assert.equal(f.requests[0].body.image.length,10);
  await assert.rejects(f.store.register({...f.registration,images:[...images,images[0]]}),/SELECTION_INVALID/);
  await assert.rejects(f.store.register({...f.registration,images:[]}),/SELECTION_INVALID/);
});

test('a changed analysis context or a malformed current confirmation blocks instead of silently recompiling',async t=>{
  for(const mode of ['context','confirmation']){
    const f=await businessFixture(t);await f.register();const compiled=await f.compile();
    if(mode==='confirmation')await fs.writeFile(path.join(f.paths.root,'project-context/user-confirmed-visual-decision.json'),'{invalid');
    else {
      const file=path.join(f.paths.root,'project-context/project-visual-context.vnext.json');
      const context=JSON.parse(await fs.readFile(file,'utf8'));context.provenance.sourceFingerprint='changed';await fs.writeFile(file,JSON.stringify(context));
    }
    await assert.rejects(f.start(compiled));assert.equal(f.requests.length,0);
  }
});

test('multi-megabyte canonical image uploads register and resolve without regex stack exhaustion',async t=>{
  const f=await businessFixture(t);
  const bytes=await sharp({create:{width:1500,height:1000,channels:3,background:'white'}}).png({compressionLevel:0}).toBuffer();
  assert(bytes.length>4*1024*1024);
  const image={...f.uploads[0],content:bytes.toString('base64'),sha256:digest(bytes),sizeBytes:bytes.length};
  const registry=await f.store.register({...f.registration,images:[image]});
  const resolved=await f.store.capture(f.project.id,registry.assets.map((item:any)=>item.id),f.credentials.image.model);
  assert.equal(resolved.references[0].sha256,digest(bytes));
});
