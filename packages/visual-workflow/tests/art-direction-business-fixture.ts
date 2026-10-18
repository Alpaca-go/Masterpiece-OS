import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { structuredAnalysisPacketFixture } from '../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import { createProjectStore } from '../src/project-store.js';
import { createImageService } from '../src/image-service.js';
import { createArtDirectionStore } from '../src/art-direction-store.js';
import { createShortChainGenerationService } from '../src/runtime/image-generation/short-chain-service.js';
import { createDeliverableValidatorService } from '../src/runtime/image-generation/deliverable-validator-service.js';
import { buildProjectVisualContext } from '../src/runtime/project-visual-context-builder.js';
import { visualDecisionPacketToPromptSourceObject } from '../src/runtime/visual-decision-packet.js';
import { digest } from '../src/art-direction-contract.js';

export async function businessFixture(t:any, industry='Medical aesthetics') {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'art-direction-business-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const projects=createProjectStore(path.join(root,'data'));
  let project=await projects.create({projectName:'Explicit direction example',industry});
  const packet=structuredAnalysisPacketFixture();packet.projectId=project.id;packet.projectFacts.industry.value=industry;
  const logo=await sharp({create:{width:40,height:30,channels:4,background:'#123456'}}).png().toBuffer();
  await fs.writeFile(path.join((await projects.paths(project.id)).input,'assets/logo.png'),logo);
  project=await projects.update(project.id,{status:'completed',visualContextVNextStatus:'ready',assets:[{id:'logo-1',status:'ready',role:'logo',usage:'analysis_source',relativePath:'assets/logo.png',originalName:'logo.png',mimeType:'image/png',sha256:digest(logo),sizeBytes:logo.length}]});
  const projectContext=buildProjectVisualContext({project,structuredAnalysis:{visualDecisionPacket:packet,promptSourceObject:visualDecisionPacketToPromptSourceObject(packet)}});
  const paths=await projects.paths(project.id);
  await fs.writeFile(path.join(paths.root,'project-context/visual-decision-packet.json'),JSON.stringify(packet));
  await fs.writeFile(path.join(paths.root,'project-context/project-visual-context.vnext.json'),JSON.stringify(projectContext));
  const context={getShortChain:async(id:string)=>JSON.parse(await fs.readFile(path.join((await projects.paths(id)).root,'project-context/project-visual-context.vnext.json'),'utf8')),rebuildShortChain:async()=>{throw new Error('NO_REBUILD');}};
  const model='doubao-seedream-5-0-pro-260628';
  const settings={imageProfileId:'image',analysisProfileId:'validator',profiles:[]};
  const credentials:any={image:{profileId:'image',modelType:'image_generation',protocol:'seedream-image',provider:'volcengine',model,apiKey:'offline-fixture',baseUrl:'https://image.example.invalid/v3'},validator:{profileId:'validator',protocol:'openai-chat-multimodal',model:'qwen3.6-plus',provider:'dashscope',modelType:'analysis'}};
  const configuration={get:async()=>settings,readCredentials:async(id:string)=>credentials[id]};
  const requests:any[]=[];const validations:any[]=[];
  const output=await sharp({create:{width:320,height:180,channels:3,background:'white'}}).png().toBuffer();
  const images=createImageService(root,projects,configuration,()=>{},async(url:any,request:any)=>{requests.push({url,body:JSON.parse(request.body)});return new Response(JSON.stringify({data:[{b64_json:output.toString('base64')}]}),{status:200});});
  const validator=createDeliverableValidatorService(projects,()=>images,configuration.get,configuration.readCredentials,context,()=>async(input:any)=>{validations.push(input);return {provider:'offline',model:'qwen3.6-plus',reportMarkdown:JSON.stringify({detectedFamily:'space',detectedSubtype:'reception',visibleEvidence:['Offline fixture only'],missingRequiredItems:[],forbiddenItemsFound:[],lockedAssetViolations:[],brandMatch:'matched',brandToneMatch:'matched',sceneCompleteness:'complete',logoTextStatus:'absent',qualityIssues:[]})};});
  const generation=createShortChainGenerationService(projects,context,()=>images,()=>validator);
  const store=createArtDirectionStore(projects);
  const confirmation=JSON.parse(await fs.readFile(new URL('../reports/jiuzhou-art-direction/project-input.json',import.meta.url),'utf8'));confirmation.projectId=project.id;
  const roles=['architectural_form','spatial_integration','material_optics','spatial_atmosphere'];
  const uploads=await Promise.all(roles.map(async(responsibility,index)=>{
    const bytes=await sharp({create:{width:64+index,height:48,channels:3,background:['#eeeeee','#dddddd','#cccccc','#bbbbbb'][index]}}).png().toBuffer();
    return {name:`approved-${responsibility}.png`,content:bytes.toString('base64'),sha256:digest(bytes),sizeBytes:bytes.length,mimeType:'image/png',role:'approved_art_direction_reference',authorizationStatus:'confirmed',responsibility,direction:`Explicit attribute ${responsibility}`};
  }));
  const registration={projectId:project.id,confirmation,authorization:{status:'confirmed',source:'Explicit offline test approval',sourceDocumentSha256:digest('fixture approval')},images:uploads};
  const task:any={deliverableFamily:'space',subtype:'reception',shot:'entrance_view',count:1,aspectRatio:'16:9',generationBasis:'art_direction_reference',logoUsageMode:'post_composite',currentInstruction:confirmation.reviewTask.currentInstruction,mustAvoid:confirmation.reviewTask.mustAvoid};
  async function register(){const result=await store.register(registration);task.referenceAssetIds=result.assets.map((item:any)=>item.id);return result;}
  const compile=()=>generation.compile({projectId:project.id,model:credentials.image.model,task});
  const start=(compiled:any)=>generation.startValidated({projectId:project.id,taskId:compiled.taskContract.taskId,apiProfileId:'image',validatorProfileId:'validator'});
  return {root,projects,project,packet,context,credentials,configuration,images,generation,store,requests,validations,registration,uploads,confirmation,task,register,compile,start,paths,logo};
}
