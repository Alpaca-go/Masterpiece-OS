import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {networkAttempts} from './network-off.mjs';
import {structuredAnalysisPacketFixture} from '../../../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import {createTwoDispatchGuard} from '../two-dispatch-guard/guard.mjs';
import {fixture,configuration,reply,response} from '../two-dispatch-guard/fixtures.mjs';

// Independent expectations, not replacements for the E1E/E1F assertions.
// Optional source root compares the exact same probes against a separate checkout.
const root=process.env.E1G_AUDIT_ROOT||fileURLToPath(new URL('../../../../../',import.meta.url));
const moduleUrl=(relative:string)=>pathToFileURL(path.join(root,'packages/visual-workflow/src',relative)).href;
const {validateSpatialSemantics:validate,separateSpatialFunctionalSemantics:separate}=await import(moduleUrl('generation-runtime/space/semantic/validate-spatial-semantics.js'));
const {completeStructuredAnalysis:complete}=await import(moduleUrl('analysis-decisions/analysis-completion-orchestrator.js'));
const records:any[]=[];
const execution={outputLanguage:'zh-CN',aspectRatio:'16:9',camera:{focalLength:'35mm'}};
const digest=(v:any)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function repair({packet}:any){const split=separate(packet.mediaTranslations.spatial);packet.mediaTranslations.spatial=split.spatial;return {packet,changes:split.changes,unresolved:split.unresolved,evidence:split.evidence};}
const validatePacket=(packet:any)=>validate(packet.mediaTranslations.spatial);
const unsafe=[
  'Only if Logo and staff operating equipment',
  'If Logo and staff operating equipment',
  '未确认Logo和员工操作设备',
  '如果出现Logo和员工操作设备',
  '如果有Logo and staff operating equipment',
  'reception equipment of it','equipment near it','reception counter and with it','Logo and equipment near it',
  'staff operating equipment; staff not using equipment',
  'staff operating equipment；员工尚未操作设备',
  'staff operating equipment and 员工没有使用设备',
  '员工操作设备; staff may be operating equipment',
  'staff operating equipment; if customers arrive',
  'staff operating equipment and enjoying cosmic essence',
  '员工使用设备并象征品牌未来',
  'Logo and staff operating equipment; staff not using equipment',
  'staff operating equipment if the store opens',
  '设备旁的员工 not operating equipment',
  'reception counter; staff do not serve customers',
  'reception counter and equipment',
  'Reception counter with a usable staff approach and not usable by visitors'
];
const legitimate=[
  'staff operating equipment and serving customers',
  '顾客在入口查看菜单','员工在柜台为顾客办理入住','工作人员使用收银机收款',
  'Customers paying at the checkout counter','餐桌位于就餐区','取餐台位于点餐区旁','Menu at the service counter',
  'staff operating equipment；员工使用设备','staff serving customers; guests checking in',
  'Reception counter with a usable staff and visitor approach','入口处的菜单',
  // A separate brand proposition may be routed out of the functional field.
  // The initial audit incorrectly treated this legal separation as a failure;
  // its raw first-run evidence is retained in the audit report.
  'staff operating equipment; lotus represents happiness'
];
for(const [expected,texts] of [['block',unsafe],['pass',legitimate]] as const)for(const text of texts)test(`E1G semantic expectation ${expected}: ${text}`,()=>{
  const source={mustBeVisible:[text]},before=digest(source),split=separate(source),gate=validate(source);
  const afterGate=validate(split.spatial).status;
  records.push({kind:'semantic',text,expected,beforeGate:gate.status,afterGate,changes:split.changes,unresolved:split.unresolved,
    retained:split.spatial.mustBeVisible,inputUnchanged:before===digest(source),repeatIdentical:digest(split)===digest(separate(source)),meets:afterGate===expected});
  assert.equal(digest(source),before);assert.deepEqual(separate(source),split);assert.equal(afterGate,expected,text);
});
for(const [field,text] of [
  ['mustBeVisible','Only if Logo and staff operating equipment'],['mustBeVisible','未确认Logo和员工操作设备'],
  ['mustBeVisible','equipment near it'],['functionalRelationships','staff operating equipment and enjoying cosmic essence'],
  ['functionalNetwork','员工尚未操作设备'],['sceneProgram','If staff operating equipment']
])test(`E1G completion must fail closed: ${field}: ${text}`,async()=>{
  const p=structuredAnalysisPacketFixture();p.mediaTranslations.spatial[field][0]=text;
  const before=digest(p);let calls=0;
  const result=await complete({packet:p,deliverable:'space',execution,validateFinalPacket:validatePacket,repairFinalPacketDeterministically:repair,
    model:async()=>{calls++;throw Error('FAKE_MODEL_REJECTED');},repairInvalidFinalPacket:async()=>{calls++;throw Error('FAKE_MODEL_REJECTED');}});
  records.push({kind:'completion',field,text,expected:'failed',status:result.status,calls,unresolvedFields:result.unresolvedFields,
    retained:result.packet.mediaTranslations.spatial[field],inputUnchanged:before===digest(p),factsUnchanged:digest(p.projectFacts)===digest(result.packet.projectFacts),meets:result.status==='failed'});
  assert.equal(digest(p),before);assert.equal(result.status,'failed');assert.equal(calls,0);
});

test('E1G source status and user confirmation remain distinct from semantic affirmation',async()=>{
  const p=structuredAnalysisPacketFixture();p.projectFacts.industry.value='unknown';p.projectFacts.industry.status='unknown';
  p.mediaTranslations.spatial.mustBeVisible=['staff operating equipment'];const before=digest(p);let calls=0;
  const result=await complete({packet:p,deliverable:'space',execution,validateFinalPacket:validatePacket,repairFinalPacketDeterministically:repair,model:async()=>{calls++;throw Error('FAKE');}});
  records.push({kind:'source-state',status:result.status,industry:result.packet.projectFacts.industry,calls,inputUnchanged:before===digest(p),meets:!['ready','ready_with_warnings'].includes(result.status)});
  assert(!['ready','ready_with_warnings'].includes(result.status));assert.deepEqual(result.packet.projectFacts,p.projectFacts);assert.equal(digest(p),before);assert.equal(calls,0);
});

test('E1G unresolved evidence survives even when sufficiency has no missing fields',async()=>{
  const p=structuredAnalysisPacketFixture();p.mediaTranslations.spatial.mustBeVisible=['staff not operating equipment'];const artifacts=new Map();let calls=0;
  const result=await complete({packet:p,deliverable:'space',execution,validateFinalPacket:validatePacket,repairFinalPacketDeterministically:repair,model:async()=>{calls++;throw Error('FAKE');},
    persistence:{saveInitial:()=>{},saveAttempt:()=>{},saveFinal:()=>{},saveAudit:()=>{},saveRuntimeArtifact:(name:string,v:any)=>artifacts.set(name,structuredClone(v))}});
  const preserved=artifacts.get('spatial-semantic-validation.repaired.json')?.unresolved?.length>0;
  records.push({kind:'unresolved',status:result.status,calls,preservedInArtifact:preserved,returnedUnresolvedFields:result.unresolvedFields,meets:result.status==='failed'&&preserved&&calls===0});
  assert.equal(result.status,'failed');assert(preserved);assert.equal(calls,0);
});

test('E1G compatibility characterization: no deterministic callback permits model semantic replacement',async()=>{
  const p=structuredAnalysisPacketFixture();p.mediaTranslations.spatial.mustBeVisible=['staff not operating equipment'];let calls=0;
  const result=await complete({packet:p,deliverable:'space',execution,validateFinalPacket:validatePacket,
    model:async()=>{throw Error('NO_STRUCTURED_REPAIR');},repairInvalidFinalPacket:async({packet}:any)=>{calls++;const next=structuredClone(packet);next.mediaTranslations.spatial.mustBeVisible=['staff operating equipment'];return next;}});
  records.push({kind:'compatibility-characterization',status:result.status,semanticModelCalls:calls,retained:result.packet.mediaTranslations.spatial.mustBeVisible,
    scope:'Characterization only. No current production callsite omits the deterministic callback.'});
  assert.equal(calls,1);assert.equal(result.status,'ready');
});

for(const scenario of ['A-no-third-attempt','B-attempt-blocked'])test(`E1G dispatch distinction ${scenario}`,async t=>{
  const f=await fixture(t);let sent=0,completion:any;
  const guard=createTwoDispatchGuard({policy:f.policy,scopeRoot:f.scopeRoot,fetchOnce:async()=>{sent++;return response(reply(sent===1?'DCD fake':'{}',{id:`e1g-${sent}`}));}});
  await assert.rejects(guard.runOnce(f.project.id,async()=>{
    const reason=guard.analysisProviders.createReasoner(configuration);await reason(f.dcd);await reason(f.uvu);
    if(scenario==='B-attempt-blocked')return reason({...f.uvu,responseSchemaName:'analysis_repair',responseSchema:{type:'object'}});
    const p=structuredAnalysisPacketFixture();p.mediaTranslations.spatial.mustBeVisible=['staff not operating equipment'];
    completion=await complete({packet:p,deliverable:'space',execution,validateFinalPacket:validatePacket,repairFinalPacketDeterministically:repair,
      model:()=>reason({...f.uvu,responseSchemaName:'analysis_repair'}),repairInvalidFinalPacket:()=>reason({...f.uvu,responseSchemaName:'spatial_semantic_repair'})});
    assert.equal(completion.status,'failed');throw Error('SEMANTIC_FAILURE');
  }));
  const snapshot=guard.snapshot();const blocked=snapshot.blockedAttempts.map((a:any)=>a.reason);
  records.push({kind:'dispatch',scenario,sent,completionStatus:completion?.status,completionModelCalls:completion?.modelCallCount,blocked,ledgerStatus:snapshot.status,meets:sent===2&&(scenario.startsWith('A')?blocked.length===0:blocked.includes('DISPATCH_LIMIT'))});
  assert.equal(sent,2);
  if(scenario.startsWith('A')){assert.equal(completion.modelCallCount,0);assert.equal(blocked.length,0);}else assert(blocked.includes('DISPATCH_LIMIT'));
});

after(async()=>{
  assert.equal(networkAttempts(),0);
  if(process.env.E1G_AUDIT_OUTPUT)await fs.writeFile(process.env.E1G_AUDIT_OUTPUT,JSON.stringify({sourceRoot:root,networkAttempts:networkAttempts(),records},null,2)+'\n');
});
