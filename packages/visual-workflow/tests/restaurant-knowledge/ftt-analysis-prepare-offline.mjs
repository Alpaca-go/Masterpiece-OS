// Explicit RKS-02E1A preparation utility. Never starts an analysis or creates a Run.
// Run from repository root with explicit source project, new workflow root and report directory.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';

const [sourceArg, destinationArg, reportArg] = process.argv.slice(2);
assert(sourceArg && destinationArg && reportArg, 'Pass source project root, NEW workflow root, report directory');
const sourceRoot = await fs.realpath(sourceArg);
const workflowRoot = path.resolve(destinationArg);
const reportRoot = path.resolve(reportArg);
assert(workflowRoot.startsWith(path.resolve('.codex-smoke') + path.sep), 'Destination must be an ignored workspace experiment');
assert(!workflowRoot.startsWith(sourceRoot + path.sep));
assert.equal(await fs.stat(workflowRoot).catch(() => null), null, 'Never overwrite/reuse a prepared experiment');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const counters = {realAnalysis:0,realGeneration:0,modelValidation:0,automaticRetries:0,providerDispatch:0,networkAttempts:0};
const denyNetwork = () => { counters.networkAttempts++; throw new Error('OFFLINE_PREPARATION_NETWORK_FORBIDDEN'); };
globalThis.fetch = denyNetwork;
http.request = http.get = https.request = https.get = denyNetwork;
net.connect = net.createConnection = tls.connect = denyNetwork;
const {createVisualWorkflow} = await import('@masterpiece/visual-workflow/service.js');
const sharp = (await import('sharp')).default;
async function snapshot(root, relative = '') {
  const result = [];
  for (const entry of (await fs.readdir(path.join(root,relative),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
    const rel = path.join(relative,entry.name);
    assert(!entry.isSymbolicLink(), 'Source symlink requires separate review');
    if(entry.isDirectory()) result.push(...await snapshot(root,rel));
    else if(entry.isFile()) result.push({path:rel.replaceAll('\\','/'),sha256:sha(await fs.readFile(path.join(root,rel)))});
  }
  return result;
}
const before = await snapshot(sourceRoot);
const sourceBytes = await fs.readFile(path.join(sourceRoot,'project.json'));
// Pin the previous E1R read-only eligibility audit; do not silently substitute another project.
assert.equal(sha(sourceBytes),'420db426e5cf71dd19bbab0516d8f6924d371040ff8cdc1d8d4090c1afb5413b');
const source = JSON.parse(sourceBytes);
assert.equal(source.id,'3b5b03c0-915a-41aa-9c54-4ffaa166ab88');
assert.equal(source.projectName,'冯烫烫');
const assets = source.assets.filter(a=>a.usage==='analysis_source');
assert.equal(assets.length,10);
assert.equal(new Set(assets.map(a=>a.sha256)).size,10);
const uploads = [], ledger = [];
for(const a of assets) {
  const inputPath = path.resolve(sourceRoot,'input',a.relativePath);
  assert(inputPath.startsWith(path.join(sourceRoot,'input')+path.sep));
  const bytes = await fs.readFile(inputPath);
  assert.equal(sha(bytes),a.sha256);
  assert.equal(bytes.length,a.sizeBytes);
  const meta = await sharp(bytes).metadata();
  assert(meta.width && meta.height);
  ledger.push({sourceAssetId:a.id,originalName:a.originalName,sourceRelativePath:'input/'+a.relativePath,
    expectedSha256:a.sha256,actualSourceSha256:sha(bytes),bytes:bytes.length,width:meta.width,height:meta.height});
  uploads.push({name:a.originalName,size:bytes.length,content:bytes.toString('base64')});
}
await fs.mkdir(reportRoot,{recursive:true});
await fs.mkdir(workflowRoot,{recursive:true});
const workflow = createVisualWorkflow({root:workflowRoot,fetchImpl:denyNetwork,
  analysisProviders:{createReasoner:denyNetwork},validationReasoner:denyNetwork});
const draft = await workflow.operations['visual-workflow:create-project']({}, {
  projectName:'冯烫烫',industry:'餐饮服务 / 四川特色小吃 / 跷脚牛肉',
  description:'RKS-02E1A 独立分析准备项目。仅原始素材分析输入；未授权模型请求。E0 已确认设计目标另存审阅记录，不由新分析自动覆盖。'
});
assert.equal(draft.status,'draft');
const imported = await workflow.operations['visual-workflow:import-files']({},draft.id,uploads);
assert.equal(imported.status,'ready');
assert.equal(imported.visualContextVNextStatus,'missing');
assert.equal(imported.imageCount,10);
const projectRoot = workflow.projects.projectRoot(draft.id);
for(const row of ledger) {
  const asset = imported.assets.find(a=>a.sha256===row.expectedSha256);
  assert(asset && asset.usage==='analysis_source');
  const targetBytes = await fs.readFile(path.join(projectRoot,'input',asset.relativePath));
  assert.equal(sha(targetBytes),row.expectedSha256);
  Object.assign(row,{targetAssetId:asset.id,targetRelativePath:'input/'+asset.relativePath,
    actualImportedSha256:sha(targetBytes),verified:true,usage:asset.usage});
}
const direction = await workflow.operations['visual-workflow:report']({},draft.id,'project_design_direction');
assert.equal(direction.status,'missing');
for(const dir of ['outputs','runtime','project-context']) assert.deepEqual(await fs.readdir(path.join(projectRoot,dir)),[]);
assert.equal(await fs.stat(path.join(workflowRoot,'settings.json')).catch(()=>null),null);
assert.equal(await fs.stat(path.join(workflowRoot,'credentials')).catch(()=>null),null);
const after = await snapshot(sourceRoot);
assert.deepEqual(after,before,'Source project changed during preparation');
assert.equal(counters.networkAttempts,0);
const write = (name,value) => fs.writeFile(path.join(reportRoot,name),JSON.stringify(value,null,2)+'\n');
await write('material-sha256.json',{sourceProjectId:source.id,sourceProjectRoot:sourceRoot,
  sourceRecordSha256:sha(sourceBytes),targetProjectId:draft.id,targetProjectRoot:projectRoot,
  sourcePreserved:true,sourceAndImportedBytesEqual:true,analysisImages:10,generationReferenceImages:0,assets:ledger});
await write('source-readonly-proof.json',{sourceProjectId:source.id,before,after,unchanged:true});
await write('preparation-record.json',{task:'RKS-02E1A',createdAt:new Date().toISOString(),
  baselineCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),
  workflowRoot,dataRoot:path.join(workflowRoot,'data'),projectRoot,projectId:draft.id,
  projectName:imported.projectName,industry:imported.industry,
  operations:[{channel:'visual-workflow:create-project',count:1,resultStatus:draft.status},
    {channel:'visual-workflow:import-files',count:1,fileCount:10,resultStatus:imported.status}],
  finalStatus:imported.status,visualContextVNextStatus:imported.visualContextVNextStatus,directionStatus:direction.status,
  projectRecordSha256:sha(await fs.readFile(path.join(projectRoot,'project.json'))),
  analysisFingerprintFromReadOnlyDirectionView:direction.analysisFingerprint,
  fingerprintMeaning:'intake identity only; no completed analysis or confirmed direction',
  credentialsCopied:false,settingsCopied:false,apiProfileId:imported.apiProfileId,
  analysisRun:null,packet:null,report:null,confirmedExecutableFreeze:null,
  counters,sourceReadOnlyUnchanged:true,dispatchAuthorization:false,
  stopReason:'Existing workflow cannot enforce a global two-dispatch/no-retry limit; proposal only, no real analysis'});
console.log(JSON.stringify({projectId:draft.id,projectRoot,status:imported.status,context:imported.visualContextVNextStatus,verifiedImages:ledger.length,counters}));
