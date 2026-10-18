// Local evidence command. Uses application services with a recording transport,
// never rewrites an integrity manifest or executes a real provider request.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { createProjectStore } from '../src/project-store.js';
import { createImageService } from '../src/image-service.js';
import { createArtDirectionStore } from '../src/art-direction-store.js';
import { createVisualWorkflow } from '../src/service.js';
import { createShortChainGenerationService } from '../src/runtime/image-generation/short-chain-service.js';
import { createDeliverableValidatorService } from '../src/runtime/image-generation/deliverable-validator-service.js';
import { digest } from '../src/art-direction-contract.js';
import { businessFixture } from './art-direction-business-fixture.ts';

globalThis.fetch=async()=>{throw new Error('OFFLINE_NETWORK_FORBIDDEN');};
const [project,bundle,output,selectionFile,confirmationFile,baselineRef]=process.argv.slice(2);
if(!baselineRef)throw new Error('Usage: capture-art-direction-business.mjs PROJECT BUNDLE OUTPUT SELECTION CONFIRMATION BASELINE_REF');
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
async function inventory(root){const records=[];async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){assert(!entry.isSymbolicLink());const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else records.push({path:path.relative(root,file).replaceAll('\\','/'),sha256:digest(await fs.readFile(file))});}}await walk(root);return records.sort((a,b)=>a.path.localeCompare(b.path));}
assert(!path.resolve(output).startsWith(path.resolve(project)+path.sep));
await fs.mkdir(path.dirname(output),{recursive:true});await fs.mkdir(output);
const write=(name,value)=>fs.writeFile(path.join(output,name),JSON.stringify(value,null,2)+'\n');
const sourceBefore=await inventory(project);const bundleBefore=await inventory(bundle);
const record=await read(path.join(project,'project.json'));
const root=path.join(output,'workflow');const copy=path.join(root,'data/projects',record.id);
await fs.mkdir(copy,{recursive:true});
await fs.copyFile(path.join(project,'project.json'),path.join(copy,'project.json'));
for(const name of ['input','project-context'])await fs.cp(path.join(project,name),path.join(copy,name),{recursive:true,errorOnExist:true,force:false});
for(const name of ['outputs','runtime','prepared'])await fs.mkdir(path.join(copy,name),{recursive:true});
const projects=createProjectStore(path.join(root,'data'));
const context={getShortChain:async id=>read(path.join((await projects.paths(id)).root,'project-context/project-visual-context.vnext.json')),rebuildShortChain:async()=>{throw new Error('OFFLINE_REBUILD_FORBIDDEN');}};
const selection=await read(selectionFile);const confirmation=await read(confirmationFile);
assert.equal(record.id,confirmation.projectId);
const manifest=await read(path.join(bundle,'reference-manifest.json'));
const sourceDocumentSha256=digest(await fs.readFile(path.join(bundle,'jiuzhou-art-direction.md')));
const uploads=[];
for(const selected of selection.images){
  const original=manifest.images.find(item=>item.path===selected.path);
  assert.equal(original.role,'approved_art_direction_reference');
  const file=path.resolve(bundle,selected.path);assert(file.startsWith(path.resolve(bundle)+path.sep));
  const bytes=await fs.readFile(file);assert.equal(digest(bytes),original.sha256);assert.equal(bytes.length,original.size_bytes);
  uploads.push({name:path.basename(file),mimeType:path.extname(file)==='.png'?'image/png':'image/jpeg',sizeBytes:bytes.length,content:bytes.toString('base64'),sha256:original.sha256,role:original.role,authorizationStatus:'confirmed',responsibility:selected.responsibility,direction:selected.direction});
}
const registration=await createArtDirectionStore(projects).register({projectId:record.id,confirmation,authorization:{...selection.authorization,sourceDocumentSha256},images:uploads});
const model='doubao-seedream-5-0-pro-260628';const profileId='offline-image-profile';
const configuration={get:async()=>({imageProfileId:profileId,analysisProfileId:'offline-validator',profiles:[]}),readCredentials:async id=>id===profileId?{profileId,model,provider:'volcengine',protocol:'seedream-image',modelType:'image_generation',baseUrl:'https://ark.cn-beijing.volces.com/api/v3',apiKey:'OFFLINE_RECORDING_ONLY'}:{profileId:id,model:'qwen3.6-plus',provider:'dashscope',protocol:'openai-chat-multimodal',modelType:'analysis'}};
const responseBytes=await sharp({create:{width:320,height:180,channels:3,background:'#eeeeee'}}).png().toBuffer();
const requests=[];let validationCalls=0;let capturedValidation;
const images=createImageService(root,projects,configuration,()=>{},async(url,input)=>{requests.push({url,method:input.method,body:JSON.parse(input.body)});return new Response(JSON.stringify({data:[{b64_json:responseBytes.toString('base64')}]}),{status:200});});
const validator=createDeliverableValidatorService(projects,()=>images,configuration.get,configuration.readCredentials,context,()=>async input=>{validationCalls++;capturedValidation=input;return {provider:'offline-fixture',model:'qwen3.6-plus',reportMarkdown:JSON.stringify({detectedFamily:'space',detectedSubtype:'reception',visibleEvidence:['Synthetic offline transport fixture; no visual acceptance'],missingRequiredItems:[],forbiddenItemsFound:[],lockedAssetViolations:[],brandMatch:'matched',brandToneMatch:'matched',sceneCompleteness:'complete',logoTextStatus:'absent',qualityIssues:[]})};});
const generation=createShortChainGenerationService(projects,context,()=>images,()=>validator);
const task={deliverableFamily:'space',subtype:'reception',shot:'entrance_view',count:1,aspectRatio:'16:9',generationBasis:'art_direction_reference',currentInstruction:confirmation.reviewTask.currentInstruction,mustAvoid:confirmation.reviewTask.mustAvoid,referenceAssetIds:registration.assets.map(item=>item.id),logoUsageMode:'post_composite'};
const compiled=await generation.compile({projectId:record.id,model,task});
const result=await generation.startValidated({projectId:record.id,taskId:compiled.taskContract.taskId,apiProfileId:profileId,validatorProfileId:'offline-validator'});
assert.equal(result.initialRun.status,'succeeded');assert.equal(requests.length,1);assert.equal(validationCalls,1);assert.equal(result.automaticRetryCount,0);
const request=requests[0];assert.equal(request.body.image.length,4);
for(const [index,data] of request.body.image.entries())assert.equal(digest(Buffer.from(data.split(',')[1],'base64')),uploads[index].sha256);
assert.equal(compiled.payload.prompt,compiled.compiledPrompt.finalPrompt);
assert(request.body.prompt.endsWith(compiled.compiledPrompt.finalPrompt));
const runRoot=await images.runRoot(result.initialRun.runId);
assert.equal(await fs.readFile(path.join(runRoot,'compiled-prompt.txt'),'utf8'),compiled.compiledPrompt.finalPrompt);
const runSnapshot=await read(path.join(runRoot,'source-context-snapshot.json'));
assert.deepEqual(runSnapshot.taskContract,compiled.taskContract);
assert.equal(runSnapshot.taskContract.artDirection.confirmationSha256,digest(confirmation));
const requestMetadata=await read(path.join(runRoot,'request-metadata.json'));
assert.equal(requestMetadata.artDirection.requestBodySha256,digest(request.body));
assert(capturedValidation.prompt.messages[1].content.includes(confirmation.spatialTranslation.spatialConcept));
const facade=createVisualWorkflow({root,fetchImpl:globalThis.fetch});
await assert.rejects(facade.operations['visual-workflow:compile']({}, {projectId:record.id,task}),/IMPLEMENTATION_CHANGED/);
await write('business-request.json',request); // Exact body, no auth header; ignored local artifact.
await write('registered-assets.json',registration);
await write('task-contract.json',compiled.taskContract);
await write('request-evidence.json',requestMetadata.artDirection);
await write('compilation.json',compiled);
await write('mock-result.json',{...result,providerCalls:0,recordedMockImageRequests:1,recordedMockValidationCalls:1,syntheticResponse:true});
await fs.writeFile(path.join(output,'formal-prompt.txt'),compiled.compiledPrompt.finalPrompt);
await fs.writeFile(path.join(output,'provider-prompt.txt'),request.body.prompt);

// Compare actual Standard requests to the reviewed Git source, in an ignored
// read-only reconstruction. No baseline fixture or current source is altered.
const baselineRoot=path.join(output,'reviewed-source');
const prefix='packages/visual-workflow/';
const files=execFileSync('git',['ls-tree','-r','--name-only',baselineRef,'--',prefix+'src'],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(Boolean);
for(const file of files){const target=path.join(baselineRoot,file.slice(prefix.length));await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,execFileSync('git',['show',`${baselineRef}:${file}`],{cwd:repo}));}
const baselineModule=await import(pathToFileURL(path.join(baselineRoot,'src/runtime/image-generation/short-chain-service.js')).href);
const baselineImages=await import(pathToFileURL(path.join(baselineRoot,'src/image-service.js')).href);
const standards=[];const cleanup=[];
try{
  for(const industry of ['Medical aesthetics','Restaurant','Hotel']){
    const f=await businessFixture({after:callback=>cleanup.push(callback)},industry);
    let baselineRequest;
    const originalImages=baselineImages.createImageService(path.join(f.root,'baseline-runs'),f.projects,f.configuration,()=>{},async(url,input)=>{baselineRequest={url,body:JSON.parse(input.body)};return new Response(JSON.stringify({data:[{b64_json:responseBytes.toString('base64')}]}),{status:200});});
    const originalGeneration=baselineModule.createShortChainGenerationService(f.projects,f.context,()=>originalImages,()=>{throw new Error('BASELINE_VALIDATION_NOT_REQUESTED');});
    const standardTask={...f.task,generationBasis:'standard',referenceAssetIds:[],currentInstruction:'Create a practical reception and waiting scene',mustAvoid:[]};
    const previous=await originalGeneration.compile({projectId:f.project.id,model,task:standardTask});
    await originalGeneration.start({projectId:f.project.id,taskId:previous.taskContract.taskId,apiProfileId:'image'});
    const current=await f.generation.compile({projectId:f.project.id,model,task:standardTask});await f.start(current);
    assert.equal(current.compiledPrompt.finalPrompt,previous.compiledPrompt.finalPrompt);assert.deepEqual(f.requests[0],baselineRequest);assert(!f.requests[0].body.image);
    standards.push({industry,baselineRef,promptIdentical:true,actualRequestIdentical:true,referenceCount:0,promptSha256:digest(current.compiledPrompt.finalPrompt)});
  }
}finally{for(const callback of cleanup)await callback();}
await write('standard-parity.json',standards);
assert.deepEqual(await inventory(project),sourceBefore);assert.deepEqual(await inventory(bundle),bundleBefore);
await write('readonly-proof.json',{providerCalls:0,credentialReads:0,modelCalls:0,recordedMockImageRequests:1,recordedMockValidationCalls:1,publicIntegrityGate:'blocked_unchanged',applicationIntegration:'official compile/startValidated/image-service/adapter/validator with recording transport',originalProjectUnchanged:true,originalBundleUnchanged:true,sourceInventory:sourceBefore,bundleInventory:bundleBefore,baselineRef,formalPromptSha256:digest(compiled.compiledPrompt.finalPrompt),formalPromptCharacters:[...compiled.compiledPrompt.finalPrompt].length,artifactDirectory:compiled.artifactDirectory,runRoot,qualityAcceptance:'pending_human_review'});
console.log(JSON.stringify({output,providerCalls:0,mockRequests:1,inputImages:4,standardParity:standards.length,formalPromptCharacters:[...compiled.compiledPrompt.finalPrompt].length}));
