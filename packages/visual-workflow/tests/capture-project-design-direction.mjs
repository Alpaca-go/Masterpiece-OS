// Offline evidence from the owning business services. Public operations remain
// guarded and are reported separately; this tool never changes integrity records.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createProjectStore} from '../src/project-store.js';
import {createProjectDesignDirectionStore} from '../src/project-design-direction.js';
import {createImageService} from '../src/image-service.js';
import {createShortChainGenerationService} from '../src/runtime/image-generation/short-chain-service.js';
import {createDeliverableValidatorService} from '../src/runtime/image-generation/deliverable-validator-service.js';
import {createQwenReasoner} from '../src/model-runtime/qwen-reasoner.js';
import {createVisualWorkflow} from '../src/service.js';
import {digest} from '../src/art-direction-contract.js';
import {createStandardGenerationInput} from '../../../apps/web/src/features/visual-workflow/api.ts';

globalThis.fetch=async()=>{throw new Error('REAL_PROVIDER_NETWORK_FORBIDDEN');};
const [source,output,confirmationFile]=process.argv.slice(2);
if (!confirmationFile) throw new Error('Usage: capture-project-design-direction.mjs SOURCE_PROJECT OUTPUT CONFIRMATION');
assert(!path.resolve(output).startsWith(path.resolve(source)+path.sep));
await fs.mkdir(path.dirname(output),{recursive:true});await fs.mkdir(output);
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const write=(name,value)=>fs.writeFile(path.join(output,name),JSON.stringify(value,null,2)+'\n');
async function inventory(root) {const entries=[];async function walk(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){assert(!item.isSymbolicLink());const file=path.join(dir,item.name);if(item.isDirectory())await walk(file);else entries.push({path:path.relative(root,file).replaceAll('\\','/'),sha256:digest(await fs.readFile(file))});}}await walk(root);return entries.sort((a,b)=>a.path.localeCompare(b.path));}
const before=await inventory(source);const record=await read(path.join(source,'project.json'));
const root=path.join(output,'workflow');const clone=path.join(root,'data/projects',record.id);
await fs.mkdir(clone,{recursive:true});await fs.copyFile(path.join(source,'project.json'),path.join(clone,'project.json'));
for(const name of ['input','project-context'])await fs.cp(path.join(source,name),path.join(clone,name),{recursive:true,errorOnExist:true,force:false});
for(const name of ['outputs','runtime','prepared'])await fs.mkdir(path.join(clone,name),{recursive:true});
const projects=createProjectStore(path.join(root,'data'));const directions=createProjectDesignDirectionStore(projects);
const confirmation=await read(confirmationFile);assert.equal(confirmation.projectId,record.id);
const current=await directions.get(record.id);
const draft=await directions.saveDraft(record.id,{confirmation,sourceStatement:'User confirmed project design goals on 2026-10-18. Four approved works are offline visual-quality calibration only, not original brand evidence and not generation inputs.',expectedRecordSha256:current.recordSha256});
const approved=await directions.confirm(record.id,{confirmedByUser:true,expectedRecordSha256:draft.recordSha256});
await assert.rejects(fs.access(path.join(clone,'project-context/art-direction/references.json')));
const context={getShortChain:async()=>read(path.join(clone,'project-context/project-visual-context.vnext.json')),rebuildShortChain:async()=>{throw new Error('OFFLINE_REBUILD_FORBIDDEN');}};
const model='doubao-seedream-5-0-pro-260628';const credentials={image:{profileId:'offline-image',model,provider:'volcengine',protocol:'seedream-image',modelType:'image_generation',baseUrl:'https://ark.cn-beijing.volces.com/api/v3/images/generations',apiKey:'OFFLINE_FIXTURE_ONLY'},validator:{model:'qwen3.6-plus',provider:'dashscope',protocol:'openai-chat-multimodal',modelType:'analysis',baseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'OFFLINE_FIXTURE_ONLY'}};
const configuration={get:async()=>({imageProfileId:'image',analysisProfileId:'validator',profiles:[]}),readCredentials:async id=>credentials[id]};
const imageRequests=[];const validatorRequests=[];
const synthetic=await sharp({create:{width:320,height:180,channels:3,background:'white'}}).png().toBuffer();
const images=createImageService(root,projects,configuration,()=>{},async(url,request)=>{imageRequests.push({url,method:request.method,body:JSON.parse(request.body)});return new Response(JSON.stringify({data:[{b64_json:synthetic.toString('base64')}]}),{status:200});});
const evidence={detectedFamily:'space',detectedSubtype:'reception',visibleEvidence:['Synthetic offline output, no image quality acceptance'],missingRequiredItems:[],forbiddenItemsFound:[],lockedAssetViolations:[],brandMatch:'matched',brandToneMatch:'matched',sceneCompleteness:'complete',logoTextStatus:'absent',qualityIssues:[]};
const validator=createDeliverableValidatorService(projects,()=>images,configuration.get,configuration.readCredentials,context,credential=>createQwenReasoner({...credential,client:async request=>{validatorRequests.push({url:request.url,body:request.body});return {choices:[{message:{content:JSON.stringify(evidence)}}]};}}));
const generation=createShortChainGenerationService(projects,context,()=>images,()=>validator);
const webInput=createStandardGenerationInput({projectId:record.id,family:'space',subtype:'reception',shot:'entrance_view',shotExplicit:false,ratio:'16:9',instruction:'生成符合项目气质的空间效果图',include:'',avoid:'',hasLogo:true,directionRecordSha256:approved.recordSha256});
const compiled=await generation.compile({...webInput,model});
const result=await generation.startValidated({projectId:record.id,taskId:compiled.taskContract.taskId,apiProfileId:'image',validatorProfileId:'validator'});
assert.equal(result.initialRun.status,'succeeded');assert.equal(imageRequests.length,1);assert.equal(validatorRequests.length,1);assert.equal('image' in imageRequests[0].body,false);assert.equal(result.automaticRetryCount,0);
assert(imageRequests[0].body.prompt.endsWith(compiled.compiledPrompt.finalPrompt));
const runRoot=await images.runRoot(result.initialRun.runId);
const metadata=await read(path.join(runRoot,'request-metadata.json'));assert.equal(metadata.referenceCount,0);
assert.equal(metadata.designDirection.confirmationSha256,digest(confirmation));
let publicOperationStatus='not_run';
try {await createVisualWorkflow({root,fetchImpl:globalThis.fetch}).operations['visual-workflow:report']({},record.id,'project_design_direction');publicOperationStatus='PASS';}
catch(error) {assert.match(error.message,/IMPLEMENTATION_CHANGED/);publicOperationStatus='BLOCKED_BY_UNAPPROVED_INTEGRITY';}
assert.deepEqual(await inventory(source),before);
await fs.writeFile(path.join(output,'formal-prompt.txt'),compiled.compiledPrompt.finalPrompt);
await fs.writeFile(path.join(output,'provider-prompt.txt'),imageRequests[0].body.prompt);
await write('provider-request.json',imageRequests[0]);await write('validator-request.json',validatorRequests[0]);
await write('effective-packet.json',compiled.compiledPrompt.effectiveVisualDecisionPacket);
await write('decision-source-record.json',approved);await write('web-compile-input.json',webInput);
await write('decision-trace.json',compiled.compiledPrompt.trace);await write('request-metadata.json',metadata);
await write('readonly-proof.json',{originalProjectUnchanged:true,sourceInventory:before});
await write('offline-evidence.json',{sourceProjectId:record.id,testCopy:clone,providerCalls:0,syntheticResponses:true,
  publicOperationStatus,businessServicesPassed:true,webTaskBuilderUsed:true,referenceImages:0,imageFieldPresent:false,
  formalPromptSha256:digest(compiled.compiledPrompt.finalPrompt),providerPromptSha256:digest(imageRequests[0].body.prompt),
  requestBodySha256:digest(imageRequests[0].body),confirmationSha256:digest(confirmation),recordSha256:approved.recordSha256,
  model,recordedMockImageRequests:1,recordedMockValidationRequests:1,automaticRegenerations:0,humanQualityAcceptance:'pending',runRoot});
console.log(JSON.stringify({providerCalls:0,businessServicesPassed:true,publicOperationStatus,referenceImages:0,promptSha256:digest(compiled.compiledPrompt.finalPrompt)}));
