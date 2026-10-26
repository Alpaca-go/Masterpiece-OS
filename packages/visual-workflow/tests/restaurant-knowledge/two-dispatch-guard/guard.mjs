import path from 'node:path';
import fs from 'node:fs/promises';
import {createQwenReasoner} from '../../../src/model-runtime/qwen-reasoner.js';
import {parseStructuredResponse} from '../../../src/model-runtime/response-parser.js';
import {contextPin,intakeDigest} from './freeze.mjs';
import {digest,failure,openLedger} from './ledger.mjs';

// Experiment-only composition. No default network client, CLI, credentials lookup,
// global settings fallback, production import or automatic resume is provided.
// fetchOnce is a trusted one-shot HTTP primitive; tests supply a local fake.
export function createTwoDispatchGuard({policy:inputPolicy,scopeRoot,fetchOnce,beforePersist}) {
  const policy=structuredClone(inputPolicy);
  if(!policy || policy.maxDispatches!==2 || policy.concurrency!==1 || policy.retries!==0 ||
    !policy.sessionId || !policy.projectId || policy.model!=='qwen3.6-plus' || policy.provider!=='dashscope' ||
    policy.protocol!=='openai-chat-multimodal' || typeof fetchOnce!=='function') throw failure('POLICY_INVALID');
  if(!policy.ledgerRoot || path.resolve(scopeRoot)!==path.resolve(policy.ledgerRoot)) throw failure('LEDGER_SCOPE_CHANGED');
  const url=new URL(policy.url);
  if(url.protocol!=='https:' || !url.hostname.endsWith('.cn-beijing.maas.aliyuncs.com') ||
    url.pathname!=='/compatible-mode/v1/chat/completions' || url.search || url.hash || url.username || url.password) throw failure('REGION_INVALID');
  if(policy.stages?.length!==2 || policy.stages[0].stage!=='DCD' || policy.stages[1].stage!=='UVU' ||
    !policy.stages.every(s=>s.url===policy.url && /^[a-f0-9]{64}$/.test(s.bodySha256) && s.attachments?.length)) throw failure('STAGE_PINS_REQUIRED');
  const basis=policy.costBasis;
  if(!basis || basis.currency!=='CNY' || !basis.sourceUrl?.startsWith('https://help.aliyun.com/') ||
    !basis.reviewedAt || !Array.isArray(basis.tiers) || !basis.tiers.length ||
    !basis.tiers.every(t=>Number.isSafeInteger(t.maxInputTokens) && t.maxInputTokens>0 && Number.isFinite(t.inputPerMillion) && t.inputPerMillion>0 && Number.isFinite(t.outputPerMillion) && t.outputPerMillion>0)) throw failure('COST_BASIS_REQUIRED');
  const ledger=openLedger(scopeRoot,policy,beforePersist);
  let started=false,activeRun=false,reasonerCreated=false,busy=false,current=null;
  const sessionAbort=new AbortController();
  const stop=reason=>{ledger.terminal(reason);sessionAbort.abort();};
  function deny(reason,detail=current?.attemptDetail || {}) {stop(reason);return ledger.blocked(reason,detail);}
  async function checkInput() {
    if(await intakeDigest(policy.projectFile)!==policy.intakeSha256) throw failure('INTAKE_CHANGED');
    for(const a of policy.materials || []) if(digest(await fs.readFile(a.path))!==a.sha256) throw failure('MATERIAL_CHANGED');
    if(!policy.materials?.length) throw failure('MATERIALS_MISSING');
  }
  function checkConfiguration(c) {
    if(c.provider!==policy.provider || c.model!==policy.model || c.protocol!==policy.protocol ||
      c.baseUrl.replace(/\/$/u,'')+'/chat/completions'!==policy.url || c.client || c.environment) throw deny('CONFIGURATION_CHANGED');
  }
  async function client(request) {
    if(!current || current.clientUsed) throw deny('CLIENT_REENTRY_FORBIDDEN');
    current.clientUsed=true;
    ledger.assertOwned();
    await checkInput();
    ledger.assertOwned();
    if(request.signal?.aborted || sessionAbort.signal.aborted) throw deny('CANCELLED_BEFORE_SEND');
    const bodyText=JSON.stringify(request.body);
    if(request.url!==policy.url || request.body.model!==policy.model || digest(bodyText)!==current.pin.bodySha256) throw deny('REQUEST_BODY_CHANGED');
    if(ledger.state.requests.length>=2) throw deny('DISPATCH_LIMIT');
    const entry={sessionId:policy.sessionId,projectId:policy.projectId,provider:policy.provider,model:policy.model,
      url:policy.url,region:'cn-beijing',stage:current.pin.stage,sequence:ledger.state.requests.length+1,
      bodySha256:digest(bodyText),messagesSha256:current.pin.messagesSha256,
      attachments:current.pin.attachments,registeredAt:new Date().toISOString(),
      registrationStatus:'reserved_before_send',status:'reserved_in_flight',providerRequestId:null,usage:null,
      costBasis:basis,estimatedCostCny:null,terminalReason:null};
    ledger.state.requests.push(entry); // never pop/refund, even if persist or HTTP fails
    ledger.save('reserve');
    ledger.assertOwned();
    const signal=AbortSignal.any([request.signal,sessionAbort.signal].filter(Boolean));
    let onAbort;
    const aborted=new Promise((_,reject)=>{
      onAbort=()=>reject(failure('REQUEST_STATUS_UNKNOWN'));
      if(signal.aborted)onAbort();else signal.addEventListener('abort',onAbort,{once:true});
    });
    try {
      if(signal.aborted) throw failure('CANCELLED_BEFORE_SEND');
      entry.dispatchedAt=new Date().toISOString();
      // Exactly ONE HTTP primitive invocation, no redirect or retry/fallback loop.
      // No await lies between final signal check and invoking the primitive.
      const responsePromise=(async()=>{
        const response=await fetchOnce(policy.url,{method:'POST',headers:request.headers,body:bodyText,signal,redirect:'error'});
        if(response.redirected || response.status>=300 && response.status<400) throw failure('HTTP_REDIRECT_FORBIDDEN');
        if(!response.ok) throw failure('HTTP_ERROR');
        const value=await response.json();
        return value;
      })();
      const response=await Promise.race([responsePromise,aborted]);
      if(signal.aborted || ledger.isStopped()) throw failure('REQUEST_STATUS_UNKNOWN');
      ledger.assertOwned();
      if(typeof response.id!=='string' || !/^[a-zA-Z0-9_.:-]{1,200}$/.test(response.id)) throw failure('PROVIDER_REQUEST_ID_MISSING');
      entry.providerRequestId=response.id;
      if(response.model!==policy.model) throw failure('RESPONSE_MODEL_CHANGED');
      const u=response.usage;
      if(!u || !['prompt_tokens','completion_tokens','total_tokens'].every(k=>Number.isSafeInteger(u[k]) && u[k]>=0) ||
        u.total_tokens!==u.prompt_tokens+u.completion_tokens) throw failure('USAGE_MISSING_OR_INVALID');
      entry.usage={inputTokens:u.prompt_tokens,outputTokens:u.completion_tokens,totalTokens:u.total_tokens};
      const tier=basis.tiers.find(t=>u.prompt_tokens<=t.maxInputTokens);
      if(!tier) throw failure('COST_BASIS_UNAVAILABLE');
      entry.estimatedCostCny=(u.prompt_tokens*tier.inputPerMillion+u.completion_tokens*tier.outputPerMillion)/1e6;
      const choice=response.choices?.[0];
      if(choice?.finish_reason!=='stop' || typeof choice.message?.content!=='string' || !choice.message.content.trim()) throw failure('RESPONSE_INVALID');
      if(current.pin.stage==='UVU') {
        try {parseStructuredResponse(choice.message.content);} catch {throw failure('UVU_JSON_INVALID');}
      }
      entry.status='response_received';entry.completedAt=new Date().toISOString();
      ledger.state.status=entry.sequence===2?'budget_exhausted':'first_response_received';
      ledger.save('response');
      return response;
    } catch(error) {
      const allowed=new Set(['HTTP_REDIRECT_FORBIDDEN','HTTP_ERROR','PROVIDER_REQUEST_ID_MISSING','RESPONSE_MODEL_CHANGED',
        'USAGE_MISSING_OR_INVALID','COST_BASIS_UNAVAILABLE','RESPONSE_INVALID','UVU_JSON_INVALID','LEDGER_WRITE_FAILED','CANCELLED_BEFORE_SEND']);
      const code=allowed.has(error.code)?error.code:'REQUEST_STATUS_UNKNOWN';
      entry.status=code==='REQUEST_STATUS_UNKNOWN'?'unknown':'failed';entry.terminalReason=code;
      stop(code);
      try {ledger.save('terminal');} catch {/* Permanent claim + terminal latch remain; never retry persistence to dispatch. */}
      throw failure(code);
    } finally {signal.removeEventListener('abort',onAbort);}
  }
  const analysisProviders=Object.freeze({createReasoner(configuration){
    if(!activeRun || reasonerCreated) throw deny('REASONER_SESSION_REUSE');
    reasonerCreated=true;
    checkConfiguration(configuration);
    // Ignores no supplied client: rejects it above. Every stage uses this ONE client.
    const reasoner=createQwenReasoner({apiKey:configuration.apiKey,model:policy.model,
      baseUrl:configuration.baseUrl,client});
    return async context=>{
      const attemptDetail={attemptedSequence:ledger.state.requests.length+1,
        stage:context.responseSchema || context.responseSchemaName?'REPAIR':context.config?'DCD':'UVU_OR_UNKNOWN',
        messagesSha256:digest(context.prompt?.messages || []),declaredAttachmentsSha256:digest(context.prompt?.attachments || []),
        bodySha256:null,bodyDigestNote:'actual encoded body not built for a pre-client refusal'};
      if(!activeRun) throw deny('SESSION_NOT_ACTIVE',attemptDetail);
      if(busy) throw deny('CONCURRENT_REQUEST',attemptDetail);
      busy=true;
      current={attemptDetail,clientUsed:false};
      try {
        ledger.assertOwned(attemptDetail);
        await checkInput();
        const index=ledger.state.requests.length;
        if(index>=2) throw deny('DISPATCH_LIMIT');
        const pin=policy.stages[index];
        let actual;
        try {actual=await contextPin(context);} catch(error) {throw deny(error.code==='REPAIR_FORBIDDEN'?'REPAIR_FORBIDDEN':'UNKNOWN_STAGE');}
        if(digest(actual)!==digest({stage:pin.stage,messagesSha256:pin.messagesSha256,attachments:pin.attachments})) throw deny('STAGE_OR_INPUT_CHANGED');
        if(pin.stage==='DCD' && path.resolve(context.projectRoot)!==path.dirname(path.resolve(policy.projectFile))) throw deny('PROJECT_CHANGED');
        current.pin=pin;
        const result=await reasoner({...context,signal:AbortSignal.any([context.signal,sessionAbort.signal].filter(Boolean))});
        ledger.assertOwned();
        return result;
      } catch(error) {
        const code=/^[A-Z_]+$/.test(error.code || '')?error.code:'GUARDED_REASONER_FAILED';
        if(!ledger.isStopped()) throw deny(code);
        throw failure(code);
      } finally {current=null;busy=false;}
    };
  }});
  async function runOnce(projectId,operation) {
    if(started || projectId!==policy.projectId) throw deny(started?'DUPLICATE_ANALYSIS':'PROJECT_CHANGED');
    started=true;activeRun=true;
    try {
      ledger.assertOwned();await checkInput();ledger.state.status='active';ledger.save('begin');
      const value=await operation();
      if(ledger.isStopped()) throw failure('SESSION_TERMINATED');
      ledger.assertOwned();
      if(ledger.state.requests.length!==2 || ledger.state.requests.some(r=>r.status!=='response_received')) throw failure('INCOMPLETE_SESSION');
      ledger.state.status='closed';ledger.save('close');
      // Closed is not analysis success: caller must independently verify the formal
      // pipeline's project eligibility/result. Claim prevents another run forever.
      return value;
    } catch(error) {
      stop(ledger.state.terminalReason || (/^[A-Z_]+$/.test(error.code || '')?error.code:'ANALYSIS_STOPPED'));
      try{ledger.save('terminal');}catch{}
      throw failure(ledger.state.terminalReason || 'ANALYSIS_STOPPED');
    } finally {activeRun=false;}
  }
  return Object.freeze({analysisProviders,runOnce,snapshot:ledger.snapshot,
    cancel:()=>stop('CANCELLED_BY_CALLER')});
}
