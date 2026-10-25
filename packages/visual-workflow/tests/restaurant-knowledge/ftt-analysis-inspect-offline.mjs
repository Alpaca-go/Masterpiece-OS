// Read-only configuration review + pure prompt/asset sizing. No reasoner or pipeline invocation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {inventoryProject} from '@masterpiece/visual-workflow/cli/inventory.js';
import {createAnalysisProjectConfig} from '@masterpiece/visual-workflow/cli/analysis-engine/config/schema.js';
import {prepareVisualAssets} from '@masterpiece/visual-workflow/cli/analysis-engine/preparation/visual-preparation.js';
import {prepareBenchmarks} from '@masterpiece/visual-workflow/cli/analysis-engine/preparation/benchmark-preparation.js';
import {buildDeepCreativeDirectorPrompt} from '@masterpiece/visual-workflow/cli/analysis-engine/creative-director/prompt-builder.js';
import {buildUnifiedVisualUnderstandingPrompt} from '@masterpiece/visual-workflow/runtime/unified-visual-understanding.js';
import {buildFusionEnhancedTask,analysisFactualConstraints} from '@masterpiece/visual-workflow/runtime/analysis-contract.js';
const [reportArg,settingsArg] = process.argv.slice(2);
assert(reportArg && settingsArg);
globalThis.fetch = () => {throw new Error('OFFLINE_ONLY');};
const reportRoot = path.resolve(reportArg);
const read = async p=>JSON.parse(await fs.readFile(p,'utf8'));
const sha = bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const preparation = await read(path.join(reportRoot,'preparation-record.json'));
const project = await read(path.join(preparation.projectRoot,'project.json'));
const settingsBytes = await fs.readFile(settingsArg);
const settings = JSON.parse(settingsBytes);
const selected = settings.profiles.find(p=>p.id===settings.analysisProfileId);
assert(selected);
// Only explicitly allowlisted non-secret metadata leaves the settings file.
const profile = Object.fromEntries(['id','provider','modelId','baseUrl','protocol','modelType'].map(k=>[k,selected[k]]));
assert.equal(profile.modelId,'qwen3.6-plus');
assert.equal(profile.protocol,'openai-chat-multimodal');
assert.equal(profile.modelType,'analysis');
const url = new URL(profile.baseUrl);
assert.equal(url.protocol,'https:');
assert(url.hostname.endsWith('.cn-beijing.maas.aliyuncs.com'));
assert.equal(url.pathname,'/compatible-mode/v1');
assert(!url.search && !url.username && !url.password);
await fs.writeFile(path.join(reportRoot,'model-region-review.json'),JSON.stringify({
  reviewedAt:new Date().toISOString(),selectedSourceProfile:profile,
  proposedPinnedRequest:{provider:'dashscope',resolvedAdapter:'qwen',model:profile.modelId,
    url:profile.baseUrl+'/chat/completions',protocol:profile.protocol,method:'POST',stream:false},
  sourceSettingsSha256:sha(settingsBytes),publicProfileSha256:sha(JSON.stringify(profile)),
  beijingEndpointSyntax:true,credentialRead:false,credentialVerified:false,accountModelAccessVerified:false,
  isolatedProfileInstalled:false,isolatedApiProfileId:project.apiProfileId,
  globalSettingsFallbackAllowed:false,modelAliasMayChangeServerSide:true,
  inferencePhysicalLocationGuaranteed:false,
  currentRequestOptions:{enable_thinking:'omitted for DCD and UVU; provider default applies',max_tokens:'omitted',thinking_budget:'omitted'},
  references:['https://help.aliyun.com/zh/model-studio/beijing-access-information','https://help.aliyun.com/zh/model-studio/qwen3-6-plus'],
  status:'metadata_review_only_not_model_validation'
},null,2)+'\n');
const auditRoot = path.resolve('.codex-smoke/rks-02e1a/prompt-sizing');
const inputRoot = path.join(preparation.projectRoot,'input');
const inventory = await inventoryProject(inputRoot);
const config = createAnalysisProjectConfig({version:'5.0',projectName:project.projectName,
  userTask:buildFusionEnhancedTask(project.description,project.projectName),
  brandFacts:{brandName:project.brandName,industry:project.industry,detectedBrandName:project.detectedBrandName,
    detectedIndustry:project.detectedIndustry,factConfidence:project.factConfidence,
    factualConstraints:analysisFactualConstraints(project.industry,project.lockedFacts,project.factConfidence.industry),logoAssets:project.logoFiles},
  benchmarkContext:{category:[],creativeExcellence:[]},
  performance:{targetMinutes:10,maximumMinutes:15,maxDetailAssets:5,maxReportCharacters:8000,enablePreparationCache:false},
  overrides:{additionalLockedAssets:[],allowLogoRedesign:false,requiredApplications:[],forbiddenChanges:project.lockedFacts,outputLanguage:project.outputLanguage}
},{projectName:path.basename(preparation.projectRoot)});
const visualPreparation = await prepareVisualAssets(inventory,config,{projectRoot:auditRoot,cacheRoot:path.join(auditRoot,'visual'),disableCache:true});
const benchmarkPreparation = await prepareBenchmarks(config,{projectRoot:auditRoot,cacheRoot:path.join(auditRoot,'benchmarks'),disableCache:true});
const dcd = await buildDeepCreativeDirectorPrompt({inventory,config,projectRoot:preparation.projectRoot,
  projectName:path.basename(preparation.projectRoot),visualPreparation,benchmarkPreparation});
const uvu = buildUnifiedVisualUnderstandingPrompt(project,project.assets.map(a=>a.id));
const stages=[];
for(const stage of [{name:'deep_creative_director',text:dcd.messages.map(m=>m.content).join('\n'),attachments:dcd.attachments},
  {name:'unified_visual_understanding',text:'你是 Unified Visual Understanding 引擎。只基于 ProjectRecord 与原始视觉附件返回严格 JSON，不读取或复述分析报告。\n'+uvu,
    attachments:project.assets.map(a=>({assetId:a.id,path:path.join(inputRoot,a.relativePath)}))}]) {
  const images=[];
  for(const a of stage.attachments) {
    const optimized = await sharp(a.path,{animated:false}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true})
      .flatten({background:'#ffffff'}).jpeg({quality:82,mozjpeg:true}).toBuffer({resolveWithObject:true});
    const {width,height} = optimized.info;
    images.push({assetId:a.assetId,width,height,encodedBytes:optimized.data.length,
      approximateVisualTokens:Math.ceil(width/32)*Math.ceil(height/32)});
  }
  stages.push({stage:stage.name,textCharacters:stage.text.length,textUtf8Bytes:Buffer.byteLength(stage.text),
    textSha256:sha(stage.text),attachmentCount:images.length,images,
    approximateVisualTokens:images.reduce((n,a)=>n+a.approximateVisualTokens,0),
    textTokenPlanningRange:[Math.ceil(stage.text.length/4),stage.text.length*2],
    caveat:'Text range is a sizing assumption, not tokenization. Image grid is approximate; provider rounding/special tokens can differ. Attachment labels not included in text count.'});
}
assert.equal(sha(await fs.readFile(settingsArg)),sha(settingsBytes));
await fs.writeFile(path.join(reportRoot,'offline-input-sizing.json'),JSON.stringify({
  generatedAt:new Date().toISOString(),kind:'pure_prompt_sizing_not_analysis_run',pipelineInvoked:false,reasonerInvoked:false,
  modelCalls:0,benchmarkResolverCalls:benchmarkPreparation.resolverCalls,
  cacheArtifactsRoot:auditRoot,productionProjectPreparedDirectoryChanged:false,stages,
  caveat:'DCD context uses UUID basename exactly as current bootstrap does; actual projectName also occurs in userTask/brandFacts. Cache path differs from a future real run; re-freeze real request hashes before dispatch.'
},null,2)+'\n');
console.log(JSON.stringify(stages.map(({stage,textCharacters,attachmentCount,approximateVisualTokens,textTokenPlanningRange})=>({stage,textCharacters,attachmentCount,approximateVisualTokens,textTokenPlanningRange}))));
