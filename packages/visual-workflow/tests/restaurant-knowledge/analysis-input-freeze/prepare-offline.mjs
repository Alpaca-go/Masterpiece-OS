import fs from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createProjectStore} from '../../../src/project-store.js';
import {createProjectDesignDirectionStore} from '../../../src/project-design-direction.js';
import {intakeDigest} from '../two-dispatch-guard/freeze.mjs';
import {digest} from '../two-dispatch-guard/ledger.mjs';
import {buildContexts} from './contexts.mjs';
import {captureStage} from './capture.mjs';

let networkAttempts=0;
const deny=()=>{networkAttempts++;throw new Error('REAL_NETWORK_FORBIDDEN');};
globalThis.fetch=deny;https.request=deny;https.get=deny;http.request=deny;http.get=deny;
const repository=fileURLToPath(new URL('../../../../../',import.meta.url));
process.chdir(repository);
const baseline='3d7fe3b8355266ce84a175fb61a3b53fbb37e360';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
assert.equal(git('rev-parse','HEAD'),baseline);
assert.equal(git('branch','--show-current'),'codex/rks-ftt-two-dispatch-guard');
const previous='packages/visual-workflow/reports/ftt-analysis-preparation';
const report=path.resolve('packages/visual-workflow/reports/ftt-analysis-input-freeze');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const prep=await read(previous+'/preparation-record.json');
const materials=await read(previous+'/material-sha256.json');
const proof=await read(previous+'/source-readonly-proof.json');
const candidate=await read('packages/visual-workflow/reports/ftt-two-dispatch-guard/candidate-scope.json');
const projectFile=path.join(prep.projectRoot,'project.json');
async function files(root,relative='') {
  const rows=[];
  for(const e of (await fs.readdir(path.join(root,relative),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
    assert(!e.isSymbolicLink(),'SYMLINK_FORBIDDEN');
    const rel=path.join(relative,e.name);
    if(e.isDirectory())rows.push(...await files(root,rel));
    else rows.push({path:rel.replaceAll('\\','/'),sha256:digest(await fs.readFile(path.join(root,rel)))});
  }return rows;
}
const originalBefore=await files(materials.sourceProjectRoot);
assert.deepEqual(originalBefore,proof.before,'ORIGINAL_PROJECT_CHANGED');
const projectBytes=await fs.readFile(projectFile);
assert.equal(digest(projectBytes),candidate.projectRecordSha256,'ISOLATED_PROJECT_CHANGED');
const project=JSON.parse(projectBytes);
assert.equal(project.id,candidate.projectId);assert.equal(project.workflowOwner,'visual-workflow');
assert.equal(project.projectName,'冯烫烫');assert.equal(project.industry,'餐饮服务 / 四川特色小吃 / 跷脚牛肉');
assert.equal(project.status,'ready');assert.equal(project.visualContextVNextStatus,'missing');assert.equal(project.assets.length,10);
const sourceAssets=[];
for(const a of materials.assets) {
  const asset=project.assets.find(v=>v.id===a.targetAssetId);assert(asset);
  const filename=path.join(prep.projectRoot,a.targetRelativePath);
  const sha256=digest(await fs.readFile(filename));
  assert.equal(sha256,a.expectedSha256,'MATERIAL_CHANGED');assert.equal(asset.sha256,sha256);
  sourceAssets.push({assetId:asset.id,path:filename,sha256});
}
const inputBefore=await files(path.join(prep.projectRoot,'input'));
assert.equal(inputBefore.length,10,'INPUT_SET_CHANGED');
const projects=createProjectStore(prep.dataRoot);
const direction=await createProjectDesignDirectionStore(projects).get(project.id);
assert.equal(direction.status,'missing');
assert.equal(direction.analysisFingerprint,prep.analysisFingerprintFromReadOnlyDirectionView,'IDENTITY_FINGERPRINT_CHANGED');
assert.equal(await fs.stat(candidate.ledgerRoot).then(()=>true,()=>false),false,'LIVE_LEDGER_ALREADY_EXISTS');
const beforeTree=await files(prep.projectRoot);
const contexts=await buildContexts(project,prep.projectRoot);
assert.equal(contexts.inventory.totalFiles,10);assert.equal(contexts.inventory.imageCount,10);
assert.equal(contexts.visualPreparation.attachmentCount,6);assert.equal(contexts.benchmarkPreparation.resolverCalls,0);
const configuration={provider:candidate.provider,model:candidate.model,protocol:candidate.protocol,
  baseUrl:candidate.url.slice(0,-'/chat/completions'.length)};
const localUploads=path.resolve('.codex-smoke/rks-02e1c/uploads');
const stages=[await captureStage(contexts.dcd,configuration,localUploads),await captureStage(contexts.uvu,configuration,localUploads)];
assert.deepEqual(stages.map(s=>s.stage),['DCD','UVU']);
assert.equal(stages[1].uploads.length,10);
await fs.mkdir(report,{recursive:true});
const write=(name,value)=>fs.writeFile(path.join(report,name),JSON.stringify(value,null,2)+'\n');
for(const s of stages) await write(s.stage.toLowerCase()+'-request.json',s);
const sourcePaths=git('ls-files','--','packages/visual-workflow/src','packages/visual-workflow/prompts',
  'packages/visual-workflow/implementation-integrity.json','packages/visual-workflow/offline',
  'packages/visual-workflow/tests/restaurant-knowledge/two-dispatch-guard','package.json','package-lock.json',
  'CURRENT_BASELINE.md','BASELINE_LOCK.md','docs/repository/AGENT_REPOSITORY_RULES.md','docs/repository/REPOSITORY_CONTRACT.md').split(/\r?\n/).filter(Boolean);
for(const f of await files(path.dirname(fileURLToPath(import.meta.url))))sourcePaths.push(path.relative(repository,path.join(path.dirname(fileURLToPath(import.meta.url)),f.path)).replaceAll('\\','/'));
const sourceFiles=[];
for(const p of [...new Set(sourcePaths)].sort())sourceFiles.push({path:p,sha256:digest(await fs.readFile(p))});
await write('source-manifest.json',{baselineCommit:baseline,files:sourceFiles,filesSha256:digest(sourceFiles),
  runtime:{node:process.version,platform:process.platform,arch:process.arch,sharpVersions:sharp.versions},
  meaning:'content pins; no prompt/golden/integrity baseline refreshed'});
const sourceManifestSha256=digest(await fs.readFile(path.join(report,'source-manifest.json')));
const policy={sessionId:'rks-02e1c-ftt-3d7fe3b8-once',projectId:project.id,workflowRoot:prep.workflowRoot,
  projectFile,projectRecordSha256:digest(projectBytes),intakeSha256:await intakeDigest(projectFile),
  ledgerRoot:candidate.ledgerRoot,provider:candidate.provider,model:candidate.model,protocol:candidate.protocol,url:candidate.url,
  maxDispatches:2,concurrency:1,retries:0,materials:sourceAssets,
  stages:stages.map(({stage,messagesSha256,attachments,url,bodySha256})=>({stage,messagesSha256,attachments,url,bodySha256})),
  costBasis:{currency:'CNY',reviewedAt:'2026-10-26',sourceUrl:'https://help.aliyun.com/zh/model-studio/qwen3-6-plus',
    meaning:'Beijing Model Studio workspace pay-as-you-go published estimate; thinking+answer billed as output; not invoice or absolute cap',
    tiers:[{maxInputTokens:256000,inputPerMillion:2,outputPerMillion:12},{maxInputTokens:1000000,inputPerMillion:8,outputPerMillion:48}]}};
await write('execution-policy.json',policy);
const policySha256=digest(policy);
await write('authorization-template.json',{explicitlyAuthorized:true,task:'RKS-02E1C',policySha256,sourceManifestSha256,
  sessionId:policy.sessionId,projectId:policy.projectId,ledgerRoot:policy.ledgerRoot,
  acceptAliasDrift:true,acceptNoAbsoluteCnyCap:true,credentialUse:'explicit-user-authorized-argument-only',allowIsolatedCredentialWrite:true,
  _warning:'TEMPLATE ONLY; remove this warning only after explicit human authorization. This file is not authorization.'});
const originalAfter=await files(materials.sourceProjectRoot);assert.deepEqual(originalAfter,originalBefore);
assert.deepEqual(await files(path.join(prep.projectRoot,'input')),inputBefore);
assert.equal(digest(await fs.readFile(projectFile)),digest(projectBytes));
const afterTree=await files(prep.projectRoot);
const added=afterTree.filter(a=>!beforeTree.some(b=>a.path===b.path));
for(const a of added)assert(a.path.startsWith('prepared/visual/'),'UNEXPECTED_PROJECT_WRITE');
const protectedRoots=['packages/visual-workflow/src','packages/visual-workflow/prompts','packages/visual-workflow/implementation-integrity.json',
  'apps/web/src/features/visual-workflow','packages/visual-workflow/offline','packages/visual-workflow/reports/p7b-single-generation',
  'packages/visual-workflow/reports/restaurant-shadow','packages/visual-workflow/reports/restaurant-knowledge','evaluation','space-generator','config/repository-contract','package-lock.json','apps/web-runtime/src'];
assert.equal(git('diff',baseline,'--name-only','--',...protectedRoots),'');
assert.equal(networkAttempts,0);
await write('freeze-manifest.json',{task:'RKS-02E1C',createdAt:new Date().toISOString(),baselineCommit:baseline,
  dispatchAuthorized:false,realAnalysisExecuted:false,sessionId:policy.sessionId,ledgerRoot:policy.ledgerRoot,liveLedgerCreated:false,
  project:{id:project.id,name:project.projectName,industry:project.industry,status:project.status,contextStatus:project.visualContextVNextStatus,
    directionStatus:direction.status,projectRecordSha256:digest(projectBytes),intakeSha256:policy.intakeSha256,
    analysisFingerprint:direction.analysisFingerprint,inputTreeSha256:digest(inputBefore),materials:sourceAssets},
  sourceManifestSha256,policySha256,originalProject:{id:materials.sourceProjectId,fileCount:originalAfter.length,treeSha256:digest(originalAfter),unchanged:true},
  protectedRoots,protectedDiff:[],localPreparationOnly:added,
  localPreparationFiles:afterTree.filter(a=>a.path.startsWith('prepared/visual/')),
  stages:stages.map(s=>({stage:s.stage,messagesSha256:s.messagesSha256,encodedMessagesSha256:s.encodedMessagesSha256,
    bodySha256:s.bodySha256,sourceAttachments:s.attachments.length,uploadedAttachments:s.uploads.length,bodyBytes:s.bodyBytes,
    textUtf8Bytes:s.encodedTextUtf8Bytes,approximateVisualTokens:s.uploads.reduce((n,a)=>n+a.approximateVisualTokens,0)})),
  counters:{realProviderDispatch:0,realAnalysis:0,imageGeneration:0,modelValidation:0,automaticRetries:0,networkAttempts,offlineEncoderInterceptions:4},
  credentialsRead:false,credentialsWritten:false,analysisSuccessEvidenceCreated:false,
  modelParametersChanged:false,shadowOnly:true,designConfirmationWritten:false});
console.log(JSON.stringify({task:'RKS-02E1C',projectUnchanged:true,originalFilesUnchanged:originalAfter.length,stages:stages.map(s=>({stage:s.stage,bodySha256:s.bodySha256,uploads:s.uploads.length})),policySha256,sourceManifestSha256,realProviderRequests:0}));
