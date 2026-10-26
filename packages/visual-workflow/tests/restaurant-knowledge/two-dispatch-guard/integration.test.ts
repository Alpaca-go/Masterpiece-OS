import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createVisualWorkflow} from '../../../src/service.js';
import {createProjectDesignDirectionStore} from '../../../src/project-design-direction.js';
import {inventoryProject} from '../../../src/cli/inventory.js';
import {createAnalysisProjectConfig} from '../../../src/cli/analysis-engine/config/schema.js';
import {prepareVisualAssets} from '../../../src/cli/analysis-engine/preparation/visual-preparation.js';
import {prepareBenchmarks} from '../../../src/cli/analysis-engine/preparation/benchmark-preparation.js';
import {buildDeepCreativeDirectorPrompt} from '../../../src/cli/analysis-engine/creative-director/prompt-builder.js';
import {buildUnifiedVisualUnderstandingPrompt} from '../../../src/runtime/unified-visual-understanding.js';
import {buildFusionEnhancedTask,analysisFactualConstraints} from '../../../src/runtime/analysis-contract.js';
import {structuredAnalysisPacketFixture} from '../../../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import {createTwoDispatchGuard} from './guard.mjs';
import {freezeStage,UVU_SYSTEM} from './freeze.mjs';
import {fixture,configuration,reply,response} from './fixtures.mjs';

globalThis.fetch=()=>{throw new Error('REAL_NETWORK_FORBIDDEN');};
const markdown=['# Offline test studio视觉方案升级报告',...Array.from({length:11},(_,i)=>i===3?'## 3. 视觉资产决策\n| 视觉资产 | 决策 |\n|---|---|\n| Logo | 保留 |':`## ${i}. ${i===5?'唯一视觉升级命题':'章节'}`)].join('\n\n');
async function integration(t:any,packetEdit=(p:any)=>p,first=markdown) {
  const f=await fixture(t);
  const project=f.project;
  const config=createAnalysisProjectConfig({version:'5.0',projectName:project.projectName,
    userTask:buildFusionEnhancedTask(project.description,project.projectName),
    brandFacts:{brandName:project.brandName,industry:project.industry,detectedBrandName:project.detectedBrandName,detectedIndustry:project.detectedIndustry,
      factConfidence:project.factConfidence,factualConstraints:analysisFactualConstraints(project.industry,project.lockedFacts,project.factConfidence.industry),logoAssets:project.logoFiles},
    benchmarkContext:{category:[],creativeExcellence:[]},performance:{targetMinutes:10,maximumMinutes:15,maxDetailAssets:5,maxReportCharacters:8000,enablePreparationCache:false},
    overrides:{additionalLockedAssets:[],allowLogoRedesign:false,requiredApplications:[],forbiddenChanges:project.lockedFacts,outputLanguage:project.outputLanguage}},
    {projectName:path.basename(f.projectRoot)});
  const inventory=await inventoryProject(path.join(f.projectRoot,'input'));
  const visualPreparation=await prepareVisualAssets(inventory,config,{projectRoot:f.projectRoot,cacheRoot:path.join(f.projectRoot,'prepared/visual'),disableCache:true});
  const benchmarkPreparation=await prepareBenchmarks(config,{projectRoot:f.projectRoot,cacheRoot:path.join(f.projectRoot,'prepared/benchmarks'),disableCache:true});
  const dcd:any={projectRoot:f.projectRoot,projectName:path.basename(f.projectRoot),config,inventory,visualPreparation,benchmarkPreparation};
  dcd.prompt=await buildDeepCreativeDirectorPrompt(dcd);
  const uvu={prompt:{messages:[{role:'system',content:UVU_SYSTEM},{role:'user',content:buildUnifiedVisualUnderstandingPrompt(project,project.assets.map((a:any)=>a.id))}],
    attachments:project.assets.map((a:any)=>({assetId:a.id,path:path.join(f.projectRoot,'input',a.relativePath),mediaType:'image',format:'png',readable:true}))}};
  f.policy.stages=[await freezeStage(dcd,configuration),await freezeStage(uvu,configuration)];
  let sent=0;
  const packet=packetEdit(structuredAnalysisPacketFixture());
  const guard=createTwoDispatchGuard({policy:f.policy,scopeRoot:f.scopeRoot,fetchOnce:async(_url:any,options:any)=>{
    assert.equal(options.redirect,'error');sent++;
    return response(reply(sent===1?first:typeof packet==='string'?packet:JSON.stringify(packet),{id:`fake-integration-${sent}`}));
  }});
  const service=createVisualWorkflow({root:f.root,analysisProviders:guard.analysisProviders,
    fetchImpl:()=>{throw new Error('IMAGE_NETWORK_FORBIDDEN');},validationReasoner:()=>{throw new Error('VALIDATION_FORBIDDEN');}});
  // Synthetic local credentials only, never read user settings or environment secrets.
  await service.configuration.saveProfile({...configuration,modelId:configuration.model,modelType:'analysis',name:'Offline fixture'});
  await service.configuration.select({cacheEnabled:false});
  return {...f,guard,service,sent:()=>sent,run:()=>guard.runOnce(project.id,()=>service.operations['visual-workflow:analyze']({},project.id,true))};
}
test('formal create/import/analyze via injected provider succeeds with exactly two fake HTTP responses',async t=>{
  const f=await integration(t);
  const result=await f.run();
  assert.equal(f.sent(),2);assert.equal(result.project.status,'completed');assert.equal(result.project.visualContextVNextStatus,'ready');
  assert.equal(f.guard.snapshot().status,'closed');
  assert(await fs.stat(path.join(f.projectRoot,'project-context/visual-decision-packet.json')));
  assert.match(await f.service.operations['visual-workflow:report']({},f.project.id),/视觉方案升级报告/);
  // This entire project lives in a temporary synthetic test root; no FTT project is opened.
});
test('formal UVU parse path does not retry after invalid JSON',async t=>{
  const f=await integration(t,()=> 'this is not JSON');
  await assert.rejects(f.run());assert.equal(f.sent(),2);
  const p=await f.service.projects.get(f.project.id);assert.notEqual(p.status,'completed');assert.notEqual(p.visualContextVNextStatus,'ready');
  assert.equal(f.guard.snapshot().requests[1].terminalReason,'UVU_JSON_INVALID');
});
test('formal spatial semantic repair is blocked; existing semantic gate still fails',async t=>{
  const f=await integration(t,p=>{p.mediaTranslations.spatial.functionalNetwork=['Logo brand symbol as the central circulation node'];return p;});
  await assert.rejects(f.run());assert.equal(f.sent(),2);
  assert(f.guard.snapshot().blockedAttempts.some((a:any)=>a.reason==='DISPATCH_LIMIT'));
  assert.notEqual((await f.service.projects.get(f.project.id)).status,'completed');
});
test('formal structured decision repair catches errors but cannot obtain a third dispatch',async t=>{
  const f=await integration(t,p=>{p.mediaTranslations.spatial.materialLanguage=[];return p;});
  await assert.rejects(f.run());assert.equal(f.sent(),2);
  assert(f.guard.snapshot().blockedAttempts.length>=1);
  assert.notEqual((await f.service.projects.get(f.project.id)).visualContextVNextStatus,'ready');
});
test('formal report validation is not bypassed by two-call budget logic',async t=>{
  const f=await integration(t,p=>p,'# incomplete report');
  await assert.rejects(f.run());assert.equal(f.sent(),1);
  assert.notEqual((await f.service.projects.get(f.project.id)).status,'completed');
});
test('formal project eligibility and direction confirmation still reject unanalyzed project',async t=>{
  const f=await integration(t);
  const directions=createProjectDesignDirectionStore(f.service.projects);
  await assert.rejects(directions.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:null}),/ANALYSIS_REQUIRED/);
  assert.equal((await directions.get(f.project.id)).status,'missing');
  assert.equal(f.sent(),0);assert.equal((await f.service.projects.get(f.project.id)).status,'ready');
});
