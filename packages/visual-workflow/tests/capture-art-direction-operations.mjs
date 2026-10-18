// Offline public-operation acceptance. Real integrity verification and official
// reasoner/request builders remain active; only provider transports are recorded.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createVisualWorkflow} from '../src/service.js';
import {createQwenReasoner} from '../src/model-runtime/qwen-reasoner.js';
import {verifyImplementation} from '../src/integrity.js';
import {digest} from '../src/art-direction-contract.js';
import {businessFixture} from './art-direction-business-fixture.ts';
globalThis.fetch=async()=>{throw new Error('REAL_PROVIDER_NETWORK_FORBIDDEN');};
const [source,bundle,output,selectionFile,confirmationFile,profileMetadataFile]=process.argv.slice(2);
if(!confirmationFile)throw new Error('Usage: capture-art-direction-operations.mjs SOURCE BUNDLE OUTPUT SELECTION CONFIRMATION');
assert(!path.resolve(output).startsWith(path.resolve(source)+path.sep));
await fs.mkdir(path.dirname(output),{recursive:true});await fs.mkdir(output);
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const profiles=profileMetadataFile?await read(profileMetadataFile):{
  image:{provider:'volcengine',protocol:'seedream-image',modelId:'doubao-seedream-5-0-pro-260628',modelType:'image_generation',baseUrl:'https://ark.cn-beijing.volces.com/api/v3'},
  analysis:{provider:'dashscope',protocol:'openai-chat-multimodal',modelId:'qwen3.6-plus',modelType:'analysis',baseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1'}
};
for(const profile of [profiles.image,profiles.analysis]){const url=new URL(profile.baseUrl);assert(!url.username&&!url.password&&!url.search&&!url.hash);}
const write=(name,value)=>fs.writeFile(path.join(output,name),JSON.stringify(value,null,2)+'\n');
async function inventory(root){const rows=[];async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){assert(!entry.isSymbolicLink());const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else rows.push({path:path.relative(root,file).replaceAll('\\','/'),sha256:digest(await fs.readFile(file))});}}await walk(root);return rows.sort((a,b)=>a.path.localeCompare(b.path));}
const sourceBefore=await inventory(source);const bundleBefore=await inventory(bundle);
const implementation=await verifyImplementation();
assert.equal(implementation.implementationDigest,'a90b0cc873a7999525148c660c05b2f22c90e2399d7c0c73001eebabe84627b3');
const responseBytes=await sharp({create:{width:320,height:180,channels:3,background:'white'}}).png().toBuffer();
const evidenceResult={detectedFamily:'space',detectedSubtype:'reception',visibleEvidence:['Synthetic offline transport fixture, no visual acceptance'],missingRequiredItems:[],forbiddenItemsFound:[],lockedAssetViolations:[],brandMatch:'matched',brandToneMatch:'matched',sceneCompleteness:'complete',logoTextStatus:'absent',qualityIssues:[]};
async function configuredWorkflow(root){
  const images=[];const validations=[];
  const workflow=createVisualWorkflow({root,
    fetchImpl:async(url,request)=>{assert.equal(images.length,0,'More than one image request for one operation');images.push({url,method:request.method,body:JSON.parse(request.body)});return new Response(JSON.stringify({data:[{b64_json:responseBytes.toString('base64')}]}),{status:200});},
    validationReasoner:credentials=>createQwenReasoner({...credentials,client:async request=>{assert.equal(validations.length,0,'More than one validation request for one operation');validations.push({url:request.url,body:request.body});return {choices:[{message:{content:JSON.stringify(evidenceResult)}}]};}})
  });
  await workflow.operations['visual-workflow:save-profile']({}, {name:'Offline image fixture',...profiles.image,apiKey:'OFFLINE_FIXTURE_ONLY'});
  await workflow.operations['visual-workflow:save-profile']({}, {name:'Offline validator fixture',...profiles.analysis,apiKey:'OFFLINE_FIXTURE_ONLY'});
  return {workflow,images,validations};
}
const record=await read(path.join(source,'project.json'));const root=path.join(output,'workflow');const clone=path.join(root,'data/projects',record.id);
await fs.mkdir(clone,{recursive:true});await fs.copyFile(path.join(source,'project.json'),path.join(clone,'project.json'));
for(const name of ['input','project-context'])await fs.cp(path.join(source,name),path.join(clone,name),{recursive:true,force:false,errorOnExist:true});
for(const name of ['outputs','runtime','prepared'])await fs.mkdir(path.join(clone,name),{recursive:true});
const selection=await read(selectionFile);const confirmation=await read(confirmationFile);const referenceManifest=await read(path.join(bundle,'reference-manifest.json'));
assert.equal(confirmation.projectId,record.id);
const uploads=[];
for(const item of selection.images){
  const file=path.resolve(bundle,item.path);assert(file.startsWith(path.resolve(bundle)+path.sep));
  const asset=referenceManifest.images.find(row=>row.path===item.path);assert.equal(asset.role,'approved_art_direction_reference');
  const bytes=await fs.readFile(file);assert.equal(digest(bytes),asset.sha256);assert.equal(bytes.length,asset.size_bytes);
  uploads.push({name:path.basename(file),content:bytes.toString('base64'),mimeType:path.extname(file)==='.png'?'image/png':'image/jpeg',sha256:asset.sha256,sizeBytes:bytes.length,role:asset.role,authorizationStatus:'confirmed',responsibility:item.responsibility,direction:item.direction});
}
const main=await configuredWorkflow(root);
const registration=await main.workflow.operations['visual-workflow:import-files']({},record.id,{purpose:'art_direction',confirmation,authorization:{...selection.authorization,sourceDocumentSha256:digest(await fs.readFile(path.join(bundle,'jiuzhou-art-direction.md')))},images:uploads});
const task={deliverableFamily:'space',subtype:'reception',shot:'entrance_view',aspectRatio:'16:9',count:1,generationBasis:'art_direction_reference',logoUsageMode:'post_composite',referenceAssetIds:registration.assets.map(item=>item.id),currentInstruction:confirmation.reviewTask.currentInstruction,mustAvoid:confirmation.reviewTask.mustAvoid};
const compiled=await main.workflow.operations['visual-workflow:compile']({}, {projectId:record.id,task});
const result=await main.workflow.operations['visual-workflow:generate']({}, {projectId:record.id,taskId:compiled.taskContract.taskId});
assert.equal(result.initialRun.status,'succeeded');assert.equal(result.automaticRetryCount,0);assert.equal(main.images.length,1);assert.equal(main.validations.length,1);
const wire=main.images[0];assert.equal(wire.body.image.length,4);
for(const [index,image] of wire.body.image.entries())assert.equal(digest(Buffer.from(image.split(',')[1],'base64')),uploads[index].sha256);
assert(wire.body.prompt.endsWith(compiled.compiledPrompt.finalPrompt));
const runRoot=await main.workflow.images.runRoot(result.initialRun.runId);
const compileImplementation=await read(path.join(compiled.artifactDirectory,'workflow-implementation.json'));const runImplementation=await read(path.join(runRoot,'workflow-implementation.json'));
assert.deepEqual(compileImplementation,implementation);assert.deepEqual(runImplementation,implementation);
const requestEvidence=await read(path.join(runRoot,'art-direction-request-evidence.json'));assert.equal(requestEvidence.requestBodySha256,digest(wire.body));
const standards=[];const cleanup=[];
try{
  for(const industry of ['Medical aesthetics','Restaurant','Hotel']){
    const f=await businessFixture({after:callback=>cleanup.push(callback)},industry);
    const standard=await configuredWorkflow(f.root);
    const compiledStandard=await standard.workflow.operations['visual-workflow:compile']({}, {projectId:f.project.id,task:{deliverableFamily:'space',subtype:'reception',shot:'entrance_view',aspectRatio:'16:9',count:1,generationBasis:'standard',referenceAssetIds:[],logoUsageMode:'post_composite',currentInstruction:'Create a practical reception and waiting scene'}});
    const resultStandard=await standard.workflow.operations['visual-workflow:generate']({}, {projectId:f.project.id,taskId:compiledStandard.taskContract.taskId});
    assert.equal(resultStandard.initialRun.status,'succeeded');assert.equal(standard.images.length,1);assert.equal(standard.validations.length,1);assert.equal('image' in standard.images[0].body,false);
    assert(!standard.images[0].body.prompt.includes('ART DIRECTION REFERENCE BOUNDARY'));
    const stamp=await read(path.join(await standard.workflow.images.runRoot(resultStandard.initialRun.runId),'workflow-implementation.json'));assert.deepEqual(stamp,implementation);
    standards.push({industry,publicOperationsPassed:true,implementationDigest:stamp.implementationDigest,promptSha256:digest(compiledStandard.compiledPrompt.finalPrompt),inputImages:0,modelCalls:0,mockImageCalls:1,mockValidationCalls:1,request:standard.images[0]});
  }
}finally{for(const callback of cleanup)await callback();}
await write('public-image-request.json',wire);await write('public-validator-request.json',main.validations[0]);
await write('registered-assets.json',registration);await write('task-contract.json',compiled.taskContract);await write('request-evidence.json',requestEvidence);
await write('public-operation-stamps.json',{compileImplementation,runImplementation,publicOperationsPassed:true});
await write('standard-requests.json',standards);
await fs.writeFile(path.join(output,'formal-prompt.txt'),compiled.compiledPrompt.finalPrompt);await fs.writeFile(path.join(output,'provider-prompt.txt'),wire.body.prompt);
await write('call-and-parameter-audit.json',{providerCalls:0,realCredentialReads:0,representative:{imageCalls:main.images.length,validationCalls:main.validations.length,automaticRegenerations:result.automaticRetryCount},otherStandardCases:standards.map(({request,...metadata})=>metadata),image:{model:wire.body.model,size:wire.body.size,referenceCount:wire.body.image.length,requestFields:Object.keys(wire.body)},validation:{model:main.validations[0].body.model,requestFields:Object.keys(main.validations[0].body),stream:main.validations[0].body.stream,max_tokens:main.validations[0].body.max_tokens??null,enable_thinking:main.validations[0].body.enable_thinking??null,max_tokensPresent:Object.hasOwn(main.validations[0].body,'max_tokens'),enable_thinkingPresent:Object.hasOwn(main.validations[0].body,'enable_thinking')},budgetHardCapEnforcedByCurrentProduction:false,scope:'one generate operation; manual repeated operations are not a project-level call cap'});
assert.deepEqual(await inventory(source),sourceBefore);assert.deepEqual(await inventory(bundle),bundleBefore);
await write('readonly-proof.json',{originalProjectUnchanged:true,originalBundleUnchanged:true,sourceInventory:sourceBefore,bundleInventory:bundleBefore,implementation,publicOperationsPassed:true,providerCalls:0,formalPromptSha256:digest(compiled.compiledPrompt.finalPrompt),formalPromptCharacters:[...compiled.compiledPrompt.finalPrompt].length,artifactDirectory:compiled.artifactDirectory,runRoot,syntheticResponses:true,humanAcceptanceChanged:false});
console.log(JSON.stringify({publicOperationsPassed:true,inputImages:4,standardCases:3,providerCalls:0,implementationDigest:implementation.implementationDigest,formalPromptSha256:digest(compiled.compiledPrompt.finalPrompt)}));
