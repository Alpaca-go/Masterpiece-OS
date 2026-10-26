import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createTwoDispatchGuard} from './guard.mjs';
import {fixture,configuration,reply,response} from './fixtures.mjs';

globalThis.fetch=()=>{throw new Error('REAL_NETWORK_FORBIDDEN');};
function setup(f,behavior=(_,index)=>response(reply(index===1?'DCD fake':'{}',{id:`fake-${index}`})),extra={}) {
  const calls=[];
  const guard=createTwoDispatchGuard({policy:f.policy,scopeRoot:f.scopeRoot,fetchOnce:async(url,options)=>{
    calls.push({url,options});
    assert.equal(options.redirect,'error');assert.equal(options.method,'POST');
    const state=JSON.parse(await fs.readFile(path.join(f.scopeRoot,'ledger.json'),'utf8'));
    assert.equal(state.requests.length,calls.length);assert.equal(state.requests.at(-1).registrationStatus,'reserved_before_send');
    return behavior(options,calls.length);
  },...extra});
  return {guard,calls,run:fn=>guard.runOnce(f.project.id,async()=>fn(guard.analysisProviders.createReasoner(configuration)))};
}
test('two pinned stages reserve before HTTP, preserve parameters, persist usage and stop at two',async t=>{
  const f=await fixture(t),s=setup(f);
  await s.run(async reason=>{await reason(f.dcd);await reason(f.uvu);});
  assert.equal(s.calls.length,2);assert.equal(s.guard.snapshot().status,'closed');
  for(const {options} of s.calls){const body=JSON.parse(options.body);assert.equal(body.enable_thinking,undefined);assert.equal(body.max_tokens,undefined);assert.equal(body.thinking_budget,undefined);}
  const state=JSON.parse(await fs.readFile(path.join(f.scopeRoot,'ledger.json'),'utf8'));
  assert.equal(state.requests[1].usage.totalTokens,300);assert.equal(state.requests[0].estimatedCostCny,0.0026);
  assert(!JSON.stringify(state).includes(configuration.apiKey));assert(!JSON.stringify(state).includes('DCD fake'));
});
test('third request is blocked before send and swallowed errors cannot reopen the gate',async t=>{
  const f=await fixture(t),s=setup(f);
  await assert.rejects(s.run(async reason=>{
    await reason(f.dcd);await reason(f.uvu);
    for(let i=0;i<3;i++) await assert.rejects(reason(f.uvu));
  }));
  assert.equal(s.calls.length,2);assert.equal(s.guard.snapshot().blockedAttempts.length,3);
  assert.equal((await fs.readdir(path.join(f.scopeRoot,'blocked'))).length,3);
});
for(const [name,behavior] of [
  ['HTTP failure',()=>new Response('{}',{status:500})],
  ['redirect',()=>new Response('{}',{status:307,headers:{location:'https://other.invalid'}})],
  ['network exception',()=>{throw new Error('ECONNRESET');}],
  ['missing usage',()=>response(reply('ok',{usage:null}))],
  ['invalid usage',()=>response(reply('ok',{usage:{prompt_tokens:1,completion_tokens:2,total_tokens:999}}))],
  ['missing request ID',()=>response(reply('ok',{id:''}))],
  ['response model mismatch',()=>response(reply('ok',{model:'another-model'}))],
  ['empty output',()=>response(reply(''))],
  ['truncated output',()=>response({...reply('unfinished'),choices:[{finish_reason:'length',message:{content:'unfinished'}}]})],
  ['invalid HTTP JSON',()=>new Response('not json',{status:200})],
]) test(`${name}: first failure consumes one slot and every further attempt is blocked`,async t=>{
  const f=await fixture(t),s=setup(f,behavior);
  await assert.rejects(s.run(async reason=>{await assert.rejects(reason(f.dcd));await assert.rejects(reason(f.dcd));await assert.rejects(reason(f.uvu));}));
  assert.equal(s.calls.length,1);assert.equal(s.guard.snapshot().requests.length,1);
  assert(s.guard.snapshot().terminalReason);assert(s.guard.snapshot().blockedAttempts.length>=2);
});
test('bad UVU JSON stops before the pipeline can make its parse retry',async t=>{
  const f=await fixture(t),s=setup(f,(_,i)=>response(reply(i===1?'DCD':'not JSON')));
  await assert.rejects(s.run(async reason=>{await reason(f.dcd);await reason(f.uvu);}));
  assert.equal(s.calls.length,2);assert.equal(s.guard.snapshot().requests[1].terminalReason,'UVU_JSON_INVALID');
});
for(const schema of ['analysis_repair','spatial_semantic_repair']) test(`${schema} cannot dispatch as a third request`,async t=>{
  const f=await fixture(t),s=setup(f);
  await assert.rejects(s.run(async reason=>{await reason(f.dcd);await reason(f.uvu);await reason({...f.uvu,responseSchemaName:schema,responseSchema:{type:'object'}});}));
  assert.equal(s.calls.length,2);assert.equal(s.guard.snapshot().blockedAttempts.at(-1).reason,'DISPATCH_LIMIT');
});
test('repair cannot replace UVU using the still unused second budget slot',async t=>{
  const f=await fixture(t),s=setup(f);
  await assert.rejects(s.run(async reason=>{await reason(f.dcd);await reason({...f.uvu,responseSchema:{type:'object'}});}));
  assert.equal(s.calls.length,1);assert.equal(s.guard.snapshot().terminalReason,'REPAIR_FORBIDDEN');
});
test('timeout with late successful response keeps unknown status and never refunds',async t=>{
  const f=await fixture(t);let resolveHttp;
  const s=setup(f,()=>new Promise(resolve=>{resolveHttp=resolve;}));
  await assert.rejects(s.run(async reason=>{await reason({...f.dcd,requestTimeoutMs:30});}));
  const before=s.guard.snapshot();assert.equal(before.requests.length,1);
  resolveHttp(response(reply('too late')));await new Promise(resolve=>setImmediate(resolve));
  const after=s.guard.snapshot();assert.notEqual(after.requests[0].status,'response_received');
  assert.equal(after.requests[0].usage,null);assert.equal(s.calls.length,1);
  await assert.rejects(s.run(()=>{}));assert.equal(s.calls.length,1);
});
test('concurrent calls reject the competitor and cannot exceed one in flight',async t=>{
  const f=await fixture(t),s=setup(f);
  await assert.rejects(s.run(async reason=>{const results=await Promise.allSettled([reason(f.dcd),reason(f.dcd)]);assert(results.every(r=>r.status==='rejected'));}));
  assert(s.calls.length<=1);assert(s.guard.snapshot().blockedAttempts.some(b=>b.reason==='CONCURRENT_REQUEST'));
});
test('a second project and duplicate user click terminate the same run, never get another reasoner',async t=>{
  const f=await fixture(t),s=setup(f);
  await assert.rejects(s.guard.runOnce('different-project',()=>{throw new Error('must not start');}));
  await assert.rejects(s.run(()=>{}));assert.equal(s.calls.length,0);
});
test('duplicate click while first HTTP is pending cancels and locks',async t=>{
  const f=await fixture(t);let entered;
  const ready=new Promise(r=>{entered=r;});
  const s=setup(f,()=>{entered();return new Promise(()=>{});});
  const first=s.run(reason=>reason(f.dcd));const rejected=assert.rejects(first);
  await ready;await assert.rejects(s.run(()=>{}));await rejected;
  assert.equal(s.calls.length,1);
});
test('separate process cannot reopen a persisted claim, even under another session ID',async t=>{
  const f=await fixture(t),s=setup(f);
  await s.run(async reason=>{await reason(f.dcd);await reason(f.uvu);});
  const script=`import {openLedger} from ${JSON.stringify(new URL('./ledger.mjs',import.meta.url).href)}; const [root,p]=process.argv.slice(1); try{openLedger(root,JSON.parse(p));process.exit(9)}catch(e){if(e.code!=='SESSION_REOPEN_FORBIDDEN')throw e;}`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',script,f.scopeRoot,JSON.stringify({...f.policy,sessionId:'changed-session'})],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.equal(s.calls.length,2);
});
test('crash with in-flight reservation leaves a permanent claim, no restart dispatch',async t=>{
  const f=await fixture(t);
  const script=`import {openLedger} from ${JSON.stringify(new URL('./ledger.mjs',import.meta.url).href)};const [root,p]=process.argv.slice(1);const l=openLedger(root,JSON.parse(p));l.state.requests.push({sequence:1,status:'reserved_in_flight'});l.save('reserve');process.exit(17);`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',script,f.scopeRoot,JSON.stringify(f.policy)],{encoding:'utf8'});
  assert.equal(result.status,17,result.stderr);
  assert.throws(()=>setup(f),/SESSION_REOPEN_FORBIDDEN/);
  const state=JSON.parse(await fs.readFile(path.join(f.scopeRoot,'ledger.json'),'utf8'));assert.equal(state.requests.length,1);
});
for(const change of ['model','provider','client','endpoint']) test(`configuration ${change} change / fallback denied`,async t=>{
  const f=await fixture(t),s=setup(f);const config={...configuration};
  if(change==='endpoint')config.baseUrl='https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
  else config[change]=change==='client'?()=>{}:'unapproved';
  await assert.rejects(s.guard.runOnce(f.project.id,async()=>s.guard.analysisProviders.createReasoner(config)));
  assert.equal(s.calls.length,0);
});
for(const change of ['material','intake','stage','prompt','bodyPin']) test(`${change} drift rejects before HTTP`,async t=>{
  const f=await fixture(t);
  if(change==='bodyPin')f.policy.stages[0].bodySha256='0'.repeat(64);
  const s=setup(f);
  if(change==='material')await fs.writeFile(f.attachment.path,'changed bytes');
  if(change==='intake')await fs.writeFile(f.policy.projectFile,JSON.stringify({...f.project,industry:'different'}));
  if(change==='prompt')f.dcd.prompt.messages[1].content+=' modified';
  await assert.rejects(s.run(reason=>reason(change==='stage'?f.uvu:f.dcd)));
  assert.equal(s.calls.length,0);
});
test('reservation persistence failure forbids HTTP; reopening never resets the budget',async t=>{
  const f=await fixture(t),s=setup(f,undefined,{beforePersist:label=>{if(label==='reserve')throw new Error('disk full');}});
  await assert.rejects(s.run(reason=>reason(f.dcd)));assert.equal(s.calls.length,0);
  assert.equal(s.guard.snapshot().requests.length,1);
  assert.throws(()=>setup(f),/SESSION_REOPEN_FORBIDDEN/);
});
test('response persistence failure consumes slot and cannot retry',async t=>{
  const f=await fixture(t),s=setup(f,undefined,{beforePersist:label=>{if(label==='response')throw new Error('disk full');}});
  await assert.rejects(s.run(async reason=>{await assert.rejects(reason(f.dcd));await assert.rejects(reason(f.uvu));}));
  assert.equal(s.calls.length,1);assert(s.guard.snapshot().terminalReason);
});
test('cancelled signal never reaches HTTP',async t=>{
  const f=await fixture(t),s=setup(f);const abort=new AbortController();abort.abort();
  await assert.rejects(s.run(reason=>reason({...f.dcd,signal:abort.signal})));
  assert.equal(s.calls.length,0);
});
test('external ledger modification is detected without dispatch',async t=>{
  const f=await fixture(t),s=setup(f);await fs.writeFile(path.join(f.scopeRoot,'ledger.json'),'{}');
  await assert.rejects(s.run(()=>{}));assert.equal(s.calls.length,0);
});
test('missing cost basis rejects initialization, no fake free-cost assumption',async t=>{
  const f=await fixture(t);delete f.policy.costBasis;assert.throws(()=>setup(f),/COST_BASIS_REQUIRED/);
});
test('changing ledger directory cannot silently replenish a pinned session budget',async t=>{
  const f=await fixture(t);assert.throws(()=>setup(f,undefined,{scopeRoot:path.join(f.root,'another-budget')}),/LEDGER_SCOPE_CHANGED/);
});
test('second reasoner call arriving during actual in-flight HTTP aborts without another send',async t=>{
  const f=await fixture(t);let entered;
  const ready=new Promise(r=>{entered=r;});
  const s=setup(f,()=>{entered();return new Promise(()=>{});});
  await assert.rejects(s.run(async reason=>{
    const first=reason(f.dcd);const rejected=assert.rejects(first);
    await ready;await assert.rejects(reason(f.uvu));await rejected;
  }));
  assert.equal(s.calls.length,1);assert.equal(s.guard.snapshot().terminalReason,'CONCURRENT_REQUEST');
});
test('orphaned durable ledger cannot be silently replaced if the claim file is missing',async t=>{
  const f=await fixture(t);await fs.mkdir(f.scopeRoot);await fs.writeFile(path.join(f.scopeRoot,'ledger.json'),'{}');
  assert.throws(()=>setup(f),/ORPHANED_LEDGER/);
  assert.equal(await fs.readFile(path.join(f.scopeRoot,'ledger.json'),'utf8'),'{}');
});
