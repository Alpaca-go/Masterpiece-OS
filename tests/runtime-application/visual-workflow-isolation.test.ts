import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { createVisualWorkflow } from '@masterpiece/visual-workflow/service.js';
import { createProjectStore as createSharedProjectStore } from '@masterpiece/runtime-core/application/project-store.ts';
import { structuredAnalysisPacketFixture } from './analysis-runtime-fixtures.ts';
// Extraction parity is a test-only comparison; production imports are forbidden.
// @ts-ignore — owned JavaScript capability.
import { compileShortChainGeneration as isolatedCompile, resolveSpaceCompilerMode } from '@masterpiece/visual-workflow/generation-runtime/generation/compile.js';
// @ts-ignore — upstream JavaScript capability.
import { compileShortChainGeneration as sharedCompile } from '@masterpiece/image-generation-runtime/generation/compile.js';
// @ts-ignore
import { buildProjectVisualContext } from '@masterpiece/visual-workflow/runtime/project-visual-context-builder.js';
// @ts-ignore
import { visualDecisionPacketToPromptSourceObject } from '@masterpiece/visual-workflow/runtime/visual-decision-packet.js';
// @ts-ignore
import { verifyImplementation } from '@masterpiece/visual-workflow/integrity.js';
// @ts-ignore — test-only payload parity against the extraction source.
import { createMultiModelImageAdapter } from '@masterpiece/image-generation-adapter/multi-model.js';

async function fixture(t: any, extra: any = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'visual-workflow-isolation-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = createVisualWorkflow({ root, ...extra });
  await service.configuration.saveProfile({ modelType: 'analysis', provider: 'qwen', modelId: 'qwen3.6-plus', baseUrl: 'https://analysis.example.invalid/v1', apiKey: 'fixture-analysis-key' });
  await service.configuration.saveProfile({ modelType: 'image_generation', provider: 'volcengine', modelId: 'image-deployment', baseUrl: 'https://image.example.invalid/v3', protocol: 'seedream-image', apiKey: 'fixture-image-key' });
  return {root, service};
}

test('workflow profile copy is a one-time credential snapshot, never a live shared setting', async t => {
  let reads = 0;
  let sourceKey = 'fixture-original-key';
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'visual-workflow-profiles-'));
  t.after(() => fs.rm(root, {recursive:true, force:true}));
  const service = createVisualWorkflow({root,
    readExistingSettings: async () => { reads++; return {profiles:[{id:'old-profile', name:'Original', modelType:'analysis', modelId:'qwen3.6-plus', provider:'qwen', baseUrl:'https://example.invalid/v1', isEnabled:true, hasApiKey:true}]}; },
    readExistingCredentials: async () => ({apiKey:sourceKey}),
  });
  await service.importConfiguration();
  sourceKey = 'fixture-external-change';
  assert.equal((await service.configuration.readCredentials()).apiKey, 'fixture-original-key');
  assert.equal(reads, 1);
  const visible = await service.configuration.get();
  assert.equal(JSON.stringify(visible).includes('fixture-original-key'), false);
  const credentialFiles = await fs.readdir(path.join(root,'credentials'));
  for (const file of credentialFiles) assert.equal((await fs.readFile(path.join(root,'credentials',file))).includes(Buffer.from('fixture-original-key')), false);
  await assert.rejects(service.importConfiguration(), /不会覆盖/u);
});

test('independent project store and the shared project store reject each other’s ownership', async t => {
  const {root,service} = await fixture(t);
  const project = await service.projects.create({projectName:'Independent project'});
  const shared = createSharedProjectStore(async () => ({defaultDataPath:path.join(root,'data')} as any));
  await assert.rejects(shared.get(project.id), /PROJECT_BELONGS_TO_INDEPENDENT_WORKFLOW/u);
  await assert.rejects(service.projects.get(crypto.randomUUID()), {code:'ENOENT'});
  assert.equal((await service.projects.get(project.id)).workflowOwner,'visual-workflow');
});

test('one-time project migration excludes planning/migration artifacts and does not follow later source changes', async t => {
  const sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(),'visual-workflow-source-'));
  t.after(() => fs.rm(sourceRoot,{recursive:true,force:true}));
  const id = crypto.randomUUID();
  await fs.mkdir(path.join(sourceRoot,'input/assets'),{recursive:true});
  await fs.mkdir(path.join(sourceRoot,'outputs'),{recursive:true});
  await fs.writeFile(path.join(sourceRoot,'input/assets/source.png'),'source-bytes');
  await fs.writeFile(path.join(sourceRoot,'outputs/report.md'),'original report');
  await fs.writeFile(path.join(sourceRoot,'outputs/creative_decision.json'),'{}');
  const sourceProject = {id, projectName:'Copy',status:'completed',updatedAt:new Date().toISOString(),lastReportFilename:'report.md', planningBriefFiles:[{sourceId:'planning'}],creativeSessionId:'shared-session',assets:[{id:'asset',mimeType:'image/png',relativePath:'assets/source.png',usage:'analysis_source'}]};
  const {service} = await fixture(t,{readExistingProject:async () => ({root:sourceRoot,project:sourceProject})});
  const copied = await service.importProject(id);
  await fs.writeFile(path.join(sourceRoot,'outputs/report.md'),'later migration overwrite');
  const target = await service.projects.paths(id);
  assert.equal(await fs.readFile(path.join(target.outputs,'report.md'),'utf8'),'original report');
  assert.equal(copied.creativeSessionId,undefined);
  assert.deepEqual(copied.planningBriefFiles,[]);
  await assert.rejects(fs.stat(path.join(target.outputs,'creative_decision.json')),{code:'ENOENT'});
  await assert.rejects(service.importProject(id),/不会覆盖/u);
});

test('reference-first, continuation and foreign references are rejected before compilation or provider access', async t => {
  const {service} = await fixture(t);
  for (const task of [{generationBasis:'reference_first'}, {generationBasis:'continuation'}, {referenceAssetIds:['foreign']}]) {
    await assert.rejects(service.compile({projectId:crypto.randomUUID(),task}),/VISUAL_WORKFLOW_STANDARD_ONLY/u);
  }
});

test('completed analysis supplies migrated Logo roles without overriding a new intake selection', async t => {
  const {service} = await fixture(t);
  const project = await service.projects.create({projectName:'Migrated Logo'});
  await service.projects.update(project.id,{assets:[{id:'identified-logo',relativePath:'assets/identity.png',mimeType:'image/png'},{id:'new-logo',relativePath:'assets/new.png',mimeType:'image/png',role:'visual'}],status:'completed',visualContextVNextStatus:'ready'});
  await fs.writeFile(path.join(service.projects.projectRoot(project.id),'project-context/visual-decision-packet.json'),JSON.stringify({lockedAssets:[{type:'logo',assetId:'identified-logo'}]}));
  const restored = await service.projects.get(project.id);
  assert.equal(restored.assets[0].role,'logo');
  assert.deepEqual(restored.logoFiles,['assets/identity.png']);
  await service.operations['visual-workflow:select-logo']({},project.id,'new-logo');
  const selected = await service.projects.get(project.id);
  assert.equal(selected.status,'ready');
  assert.equal(selected.assets.find((asset:any)=>asset.role==='logo').id,'new-logo');
});

test('owned standard compilation ignores global mode flags and preserves extracted prompt/payload bytes', async t => {
  const {service} = await fixture(t);
  const registry = JSON.parse(await fs.readFile(new URL('../../packages/visual-workflow/src/assets/architecture-anchors/registry.json',import.meta.url),'utf8'));
  const registered = Object.values(registry.brands)[0] as any;
  const industry = registered.anchors[0].applicability.industries[0];
  const project = await service.projects.create({projectName:registered.brandDisplayName,industry});
  const packet = structuredAnalysisPacketFixture();
  packet.projectId = project.id;
  packet.projectFacts.brandName.value = registered.brandDisplayName;
  packet.projectFacts.industry.value = industry;
  const context = buildProjectVisualContext({project, structuredAnalysis:{visualDecisionPacket:packet,promptSourceObject:visualDecisionPacketToPromptSourceObject(packet)}});
  const task = {projectId:project.id,deliverableFamily:'space',subtype:'reception',shot:'entrance_view',aspectRatio:'16:9',currentInstruction:'Create a complete arrival and waiting scene',generationBasis:'standard',referenceAssetIds:[],logoUsageMode:'post_composite'};
  const saved = process.env.MASTERPIECE_SPACE_COMPILER_MODE;
  t.after(() => { if (saved === undefined) delete process.env.MASTERPIECE_SPACE_COMPILER_MODE; else process.env.MASTERPIECE_SPACE_COMPILER_MODE=saved; });
  process.env.MASTERPIECE_SPACE_COMPILER_MODE='r8_6_golden';
  const upstream = sharedCompile({projectContext:context,task});
  process.env.MASTERPIECE_SPACE_COMPILER_MODE='vnext_legacy';
  assert.equal(resolveSpaceCompilerMode(),'r8_6_golden');
  const owned = isolatedCompile({projectContext:context,task});
  assert.equal(owned.compiledPrompt.finalPrompt,upstream.compiledPrompt.finalPrompt);
  assert.deepEqual(owned.payload,upstream.payload);
});

test('offline E2E: owned import, analysis, report and image request complete without shared settings or real providers', async t => {
  let reasoningCalls=0;
  let validationCalls=0;
  const packet=structuredAnalysisPacketFixture();
  const markdown=['# Example Brand视觉方案升级报告',...Array.from({length:11},(_,index) => index===3 ? '## 3. 视觉资产决策\n| 视觉资产 | 决策 |\n|---|---|\n| Logo | 保留 |' : `## ${index}. ${index===5?'唯一视觉升级命题':'章节'}`)].join('\n\n');
  const bytes=await sharp({create:{width:256,height:144,channels:3,background:'#ddd'}}).png().toBuffer();
  let capturedRequest:any;
  const {service} = await fixture(t,{
    analysisProviders:{createReasoner:() => async () => { reasoningCalls++; return {runId:`fixture-${reasoningCalls}`,provider:'qwen',model:'qwen3.6-plus',completedAt:new Date().toISOString(),reportMarkdown:reasoningCalls===1?markdown:JSON.stringify(packet)}; }},
    fetchImpl:async (_url:unknown,request:any) => {capturedRequest=JSON.parse(request.body);return new Response(JSON.stringify({data:[{b64_json:bytes.toString('base64')}]}),{status:200});},
    validationReasoner:(credential:any) => async () => { validationCalls++; assert.equal(credential.model,'qwen3.6-plus'); return {reportMarkdown:JSON.stringify({detectedFamily:'space',detectedSubtype:'reception',visibleEvidence:['A usable reception desk, circulation, floor, ceiling and waiting area'],missingRequiredItems:[],forbiddenItemsFound:[],lockedAssetViolations:[],brandMatch:'matched',brandToneMatch:'matched',sceneCompleteness:'complete',logoTextStatus:'absent',qualityIssues:[]})}; },
  });
  const registry = JSON.parse(await fs.readFile(new URL('../../packages/visual-workflow/src/assets/architecture-anchors/registry.json',import.meta.url),'utf8'));
  const registered = Object.values(registry.brands)[0] as any;
  let project=await service.projects.create({projectName:'Example Brand',brandName:registered.brandDisplayName,industry:registered.anchors[0].applicability.industries[0]});
  project=await service.projects.importFiles(project.id,[{name:'logo.png',size:bytes.length,content:bytes.toString('base64')}]);
  const result=await service.operations['visual-workflow:analyze']({},project.id,true);
  assert.equal(result.project.status,'completed');
  assert.match(await service.operations['visual-workflow:report']({},project.id),/^# Example Brand/u);
  assert.equal(reasoningCalls,2);
  const compiled=await service.operations['visual-workflow:compile']({}, {projectId:project.id,task:{deliverableFamily:'space',subtype:'reception',shot:'entrance_view',aspectRatio:'16:9',currentInstruction:'Create a complete standard scene',generationBasis:'standard',referenceAssetIds:[],logoUsageMode:'post_composite'}});
  const completed=await service.operations['visual-workflow:generate']({}, {projectId:project.id,taskId:compiled.taskContract.taskId});
  const generated=completed.initialRun;
  assert.equal(validationCalls,1);
  assert.equal(completed.flowState,'passed');
  assert.equal(generated.status,'succeeded');
  assert.equal(capturedRequest.model,'image-deployment');
  const sourceAdapter = createMultiModelImageAdapter({adapterId:'seedream-5.0-pro',modelId:'image-deployment',apiKey:'fixture-image-key',baseUrl:'https://image.example.invalid/v3'});
  assert.deepEqual(capturedRequest, sourceAdapter.compileRequest({prompt:compiled.compiledPrompt.finalPrompt,negativeRules:[],aspectRatio:'16:9',imageSize:'2K',outputCount:1,references:[]}).body);
  assert.equal(generated.images.length,1);
  assert.match((await service.images.imageData(generated.runId,generated.images[0].imageId)).dataUrl,/^data:image\/png;base64,/u);
});

test('implementation integrity rejects an altered owned module instead of accepting drift', async t => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'visual-workflow-drift-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await fs.writeFile(path.join(root,'module.js'),'expected');
  await fs.writeFile(path.join(root,'implementation-integrity.json'),JSON.stringify({owner:'visual-workflow',files:[{path:'module.js',sha256:crypto.createHash('sha256').update('expected').digest('hex')}]}));
  await verifyImplementation(root);
  await fs.writeFile(path.join(root,'module.js'),'changed');
  await assert.rejects(verifyImplementation(root),/VISUAL_WORKFLOW_IMPLEMENTATION_CHANGED/u);
});
