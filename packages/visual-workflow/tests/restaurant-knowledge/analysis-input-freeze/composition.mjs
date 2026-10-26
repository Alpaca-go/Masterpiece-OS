import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createVisualWorkflow} from '../../../src/service.js';
import {createTwoDispatchGuard} from '../two-dispatch-guard/guard.mjs';
import {createSinglePostTransport} from '../two-dispatch-guard/single-post-transport.mjs';
import {freezeStage,intakeDigest} from '../two-dispatch-guard/freeze.mjs';
import {digest} from '../two-dispatch-guard/ledger.mjs';
import {buildContexts} from './contexts.mjs';

const repository=fileURLToPath(new URL('../../../../../',import.meta.url));
const report=path.join(repository,'packages/visual-workflow/reports/ftt-analysis-input-freeze');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
let invoked=false;

// Importing this module does NOTHING to projects, settings, credentials, ledger,
// or network. There is deliberately no CLI, env lookup, resume, alternate root,
// session argument, caller-supplied provider/client, or default authorization.
export async function executeAuthorizedOnce({authorization,apiKey}={}) {
  const policy=await read(path.join(report,'execution-policy.json'));
  const sourcesFile=path.join(report,'source-manifest.json');
  const sources=await read(sourcesFile);
  assert.deepEqual(authorization,{
    explicitlyAuthorized:true,task:'RKS-02E1C',policySha256:digest(policy),
    sourceManifestSha256:digest(await fs.readFile(sourcesFile)),
    sessionId:policy.sessionId,projectId:policy.projectId,ledgerRoot:policy.ledgerRoot,
    acceptAliasDrift:true,acceptNoAbsoluteCnyCap:true,
    credentialUse:'explicit-user-authorized-argument-only',allowIsolatedCredentialWrite:true
  },'EXPLICIT_REVIEWED_AUTHORIZATION_REQUIRED');
  assert.equal(typeof apiKey,'string');assert(apiKey.trim(),'EXPLICIT_CREDENTIAL_REQUIRED');
  assert.equal(invoked,false,'EXECUTOR_ALREADY_INVOKED');invoked=true;
  async function verifySources() {
    for(const file of sources.files) assert.equal(digest(await fs.readFile(path.join(repository,file.path))),file.sha256,'SOURCE_CHANGED:'+file.path);
  }
  await verifySources();
  assert.equal(digest(await fs.readFile(policy.projectFile)),policy.projectRecordSha256,'PROJECT_RECORD_CHANGED');
  assert.equal(await intakeDigest(policy.projectFile),policy.intakeSha256,'INTAKE_CHANGED');
  for(const a of policy.materials) assert.equal(digest(await fs.readFile(a.path)),a.sha256,'MATERIAL_CHANGED');
  // Existing claims, ledgers, terminal sentinels, and even ambiguous leftovers
  // stop this executor. Never choose another session/root to recover capacity.
  await assert.rejects(fs.stat(policy.ledgerRoot),{code:'ENOENT'});
  const project=await read(policy.projectFile);
  assert.equal(project.status,'ready');assert.equal(project.visualContextVNextStatus,'missing');
  const configuration={provider:policy.provider,model:policy.model,protocol:policy.protocol,
    baseUrl:policy.url.slice(0,-'/chat/completions'.length)};
  const contexts=await buildContexts(project,path.dirname(policy.projectFile));
  const pins=[await freezeStage(contexts.dcd,configuration),await freezeStage(contexts.uvu,configuration)];
  assert.deepEqual(pins,policy.stages,'REGENERATED_REQUEST_CHANGED');
  const deny=()=>{throw new Error('OUT_OF_SCOPE_NETWORK_FORBIDDEN');};
  const nativeSinglePost=createSinglePostTransport(); // no requestImpl override
  const guard=createTwoDispatchGuard({policy,scopeRoot:policy.ledgerRoot,
    fetchOnce:async(url,options)=>{await verifySources();return nativeSinglePost(url,options);}});
  const workflow=createVisualWorkflow({root:policy.workflowRoot,analysisProviders:guard.analysisProviders,
    fetchImpl:deny,validationReasoner:deny});
  try {
    // Only the isolated feature's encrypted credential store. No original/global
    // credential read/copy, no model-validation endpoint, no configuration fallback.
    const settings=await workflow.configuration.get();
    assert.equal(settings.profiles.length,0,'ISOLATED_CONFIGURATION_CHANGED');
    await workflow.configuration.saveProfile({...configuration,modelId:policy.model,modelType:'analysis',
      name:'RKS reviewed single analysis',apiKey:apiKey.trim()});
    await workflow.configuration.select({cacheEnabled:true});
    const started=Date.now();
    const result=await guard.runOnce(policy.projectId,()=>workflow.operations['visual-workflow:analyze']({},policy.projectId,true));
    const current=await workflow.projects.get(policy.projectId);
    const ledger=guard.snapshot();
    assert.equal(ledger.status,'closed');assert.equal(ledger.requests.length,2);
    assert.equal(current.status,'completed');assert.equal(current.visualContextVNextStatus,'ready');
    assert(current.lastReportFilename,'FORMAL_REPORT_MISSING');
    const reportPath=path.join(path.dirname(policy.projectFile),'outputs',current.lastReportFilename);
    assert((await fs.stat(reportPath)).isFile(),'FORMAL_REPORT_MISSING');
    // Human review of the new evidence and E0 direction is the next boundary.
    // Do not saveDraft, confirm, capture, compile, validate models or generate.
    return {status:'completed',projectId:policy.projectId,durationMs:Date.now()-started,
      provider:policy.provider,model:policy.model,modelCalls:ledger.requests.length,reportPath,
      composition:'formal-analyze-through-two-dispatch-guard',resultReturned:Boolean(result),
      next:'human review -> saveDraft -> explicit confirm -> capture -> offline prompt freeze'};
  } catch {
    guard.cancel();
    // Do not emit provider exception strings, payloads, credentials or raw output.
    throw Object.assign(new Error('AUTHORIZED_ANALYSIS_STOPPED_NO_RETRY'),{code:'AUTHORIZED_ANALYSIS_STOPPED_NO_RETRY'});
  }
}
