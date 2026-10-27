import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {networkAttempts} from './network-off.mjs';
import {structuredAnalysisPacketFixture} from '../../../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import {classifyPhrase} from '../../../src/generation-runtime/space/semantic/separate-space-semantics.js';
import {validateSpatialSemantics,separateSpatialFunctionalSemantics} from '../../../src/generation-runtime/space/semantic/validate-spatial-semantics.js';
import {completeStructuredAnalysis} from '../../../src/analysis-decisions/analysis-completion-orchestrator.js';

// Immutable E1E review expectations. The old audit is evidence, never refreshed.
const audit=JSON.parse(await fs.readFile(new URL('../../../reports/rks-02e1e-integrity-review/review-probes.json',import.meta.url),'utf8'));
const archived=JSON.parse(await fs.readFile(new URL('./source-fields.json',import.meta.url),'utf8'));
const execution={outputLanguage:'zh-CN',aspectRatio:'16:9',camera:{focalLength:'35mm'}};
const validate=(packet:any)=>validateSpatialSemantics(packet.mediaTranslations.spatial);
function repair({packet}:any) {
  const result=separateSpatialFunctionalSemantics(packet.mediaTranslations.spatial);
  const next=structuredClone(packet);next.mediaTranslations.spatial=result.spatial;
  return {packet:next,changes:result.changes,unresolved:result.unresolved,evidence:result.evidence};
}
function packet() {const p=structuredAnalysisPacketFixture();Object.assign(p.mediaTranslations.spatial,structuredClone(archived.spatial));return p;}
for(const {text,expected} of audit.rows) test(`E1E blocking expectation: ${text}`,()=>{
  const original={mustBeVisible:[text]},before=JSON.stringify(original);
  const result=separateSpatialFunctionalSemantics(original);
  assert.equal(validateSpatialSemantics(result.spatial).status,expected);
  assert.equal(result.validation.status,expected);
  if(expected==='block') assert(result.unresolved.length>0);
  assert.equal(JSON.stringify(original),before);
  assert.deepEqual(separateSpatialFunctionalSemantics(result.spatial).spatial,result.spatial);
});

test('the E1E mixed visibility defect cannot become ready or call optional repair models',async()=>{
  const p=structuredAnalysisPacketFixture();p.mediaTranslations.spatial.mustBeVisible=['Logo and equipment conveying happiness'];
  const before=JSON.stringify(p);let calls=0;
  const result=await completeStructuredAnalysis({packet:p,deliverable:'space',execution,validateFinalPacket:validate,
    repairFinalPacketDeterministically:repair,model:async()=>{calls++;throw Error('MODEL_FORBIDDEN');},
    repairInvalidFinalPacket:async()=>{calls++;throw Error('MODEL_FORBIDDEN');}});
  assert.equal(result.status,'failed');assert.equal(calls,0);assert.equal(result.modelCallCount,0);
  assert.deepEqual(result.packet.mediaTranslations.spatial.mustBeVisible,p.mediaTranslations.spatial.mustBeVisible);
  assert.equal(JSON.stringify(p),before);
});

test('complete positive units reject unrecognized tails, negation, wishes, identity and color',()=>{
  const units=['staff operating equipment','厨师正在备餐','Waiting area seating','入口处的咨询设备',
    'Two chairs face each other across a worktable','steam above dishes'];
  for(const unit of units){
    assert.equal(validateSpatialSemantics({mustBeVisible:[unit]}).status,'pass');
    for(const suffix of [' and enjoying cosmic essence',' conveying happiness',' 并畅想未来','; unknown activity',' and Logo'])
      assert.equal(validateSpatialSemantics({mustBeVisible:[unit+suffix]}).status,'block',unit+suffix);
  }
  for(const text of ['设备','桌子','equipment','table','maybe staff serving food','staff not operating equipment at reception',
    '员工没有使用设备在接待区','顾客希望在餐桌用餐','purple table','petal curved counter','optional sculpture']) {
    const source={mustBeVisible:[text,'staff operating equipment']};
    const result=separateSpatialFunctionalSemantics(source);
    // Unresolved operations / styled carriers cannot be discarded to earn pass.
    if(!['optional sculpture'].includes(text)) assert.equal(result.validation.status,'block',text);
    assert.notEqual(classifyPhrase(text,'mustBeVisible').classification,'functional',text);
  }
});

test('pure brand demotion is not permission to render a decorative object as a visible function',()=>{
  for(const text of ['optional sculpture','Logo','purple wall geometry'])
    assert.equal(validateSpatialSemantics({mustBeVisible:[text]}).status,'block');
});

test('approved architectural requirements consume every clause and reject appended unknown or negative predicates',async()=>{
  for(const name of ['design-direction','architectural-language','architectural-integration','architectural-refinement',
    'architecture-commercial-layer','commercial-attribute','fig2-fig3-spatial-direction']) {
    const form=JSON.parse(await fs.readFile(new URL(`../../${name}-form.json`,import.meta.url),'utf8'));
    for(const text of form.fields.visibleRequirements.split('\n')) {
      assert.equal(validateSpatialSemantics({mustBeVisible:[text]}).status,'pass',text);
      for(const tail of [' and enjoying cosmic essence',' and not usable','; unknown equipment operation',' 并畅想未来'])
        assert.equal(validateSpatialSemantics({mustBeVisible:[text+tail]}).status,'block',text+tail);
    }
  }
  for(const text of ['equipment and tables','reception counter and equipment','reception counter and chairs','reception equipment may be included','reception equipment hidden',
    'reception counter is optional and secondary','reception art','reception counter with happiness'])
    assert.equal(validateSpatialSemantics({mustBeVisible:[text]}).status,'block',text);
});

test('safe separation precedes structured model batches without filling missing material evidence',async()=>{
  const p=packet();p.mediaTranslations.spatial.materialLanguage=[];const before=JSON.stringify(p);
  const events:string[]=[];const artifacts=new Map();
  const result=await completeStructuredAnalysis({packet:p,deliverable:'space',execution,validateFinalPacket:validate,
    repairFinalPacketDeterministically:input=>{events.push('deterministic');return repair(input);},
    model:async()=>{events.push('structured-model');throw Error('NO_SUPPORTED_REPAIR');},
    repairInvalidFinalPacket:async()=>{events.push('semantic-model');throw Error('MODEL_FORBIDDEN');},
    persistence:{saveInitial:()=>{},saveAttempt:()=>{},saveFinal:()=>{},saveAudit:()=>{},saveRuntimeArtifact:(name:string,value:any)=>artifacts.set(name,structuredClone(value))}});
  assert.equal(events[0],'deterministic');assert(events.includes('structured-model'));assert(!events.includes('semantic-model'));
  assert.equal(result.status,'failed');assert.deepEqual(result.packet.mediaTranslations.spatial.materialLanguage,[]);
  assert.equal(artifacts.get('spatial-semantic-validation.repaired.json').changes.length,6);
  assert.equal(artifacts.get('spatial-semantic-validation.repaired.json').phase,'before_optional_model_repair');
  assert(artifacts.get('spatial-semantic-validation.repaired.json').evidence.every((r:any)=>r.semanticOnly&&r.sourceConfirmation==='unchanged'));
  assert.equal(JSON.stringify(p),before);assert.deepEqual(result.packet.projectFacts,p.projectFacts);
});

test('unresolved clauses outside the visible field cannot be hidden by a passing final gate',async()=>{
  const p=structuredAnalysisPacketFixture();p.mediaTranslations.spatial.sceneProgram=['Logo吸引顾客点餐'];
  assert.equal(validate(p).status,'pass');let calls=0;
  const result=await completeStructuredAnalysis({packet:p,deliverable:'space',execution,validateFinalPacket:validate,
    repairFinalPacketDeterministically:repair,model:async()=>{calls++;throw Error('MODEL_FORBIDDEN');}});
  assert.equal(result.status,'failed');assert.equal(calls,0);
});

for(const failure of ['validator','separator','repaired-persistence']) test(`local ${failure} exception before optional repair uses zero model calls`,async()=>{
  const p=packet();p.mediaTranslations.spatial.materialLanguage=[];let calls=0;
  const result=await completeStructuredAnalysis({packet:p,deliverable:'space',execution,
    validateFinalPacket:value=>{if(failure==='validator')throw Error('LOCAL_FAILURE');return validate(value);},
    repairFinalPacketDeterministically:value=>{if(failure==='separator')throw Error('LOCAL_FAILURE');return repair(value);},
    model:async()=>{calls++;throw Error('MODEL_FORBIDDEN');},repairInvalidFinalPacket:async()=>{calls++;throw Error('MODEL_FORBIDDEN');},
    persistence:{saveInitial:()=>{},saveAttempt:()=>{},saveFinal:()=>{},saveAudit:()=>{},saveRuntimeArtifact:(name:string)=>{
      if(failure==='repaired-persistence'&&name==='spatial-semantic-validation.repaired.json')throw Error('LOCAL_WRITE_FAILED');}}});
  assert.equal(result.status,'failed');assert.equal(calls,0);assert.equal(result.modelCallCount,0);
});

test('unknown source facts still require confirmation after safe local semantic separation',async()=>{
  const p=packet();p.projectFacts.industry.value='unknown';p.projectFacts.industry.status='unknown';let calls=0;
  const result=await completeStructuredAnalysis({packet:p,deliverable:'space',execution,validateFinalPacket:validate,
    repairFinalPacketDeterministically:repair,model:async()=>{calls++;throw Error('MODEL_FORBIDDEN');}});
  assert(!['ready','ready_with_warnings'].includes(result.status));assert.equal(calls,0);
  assert.equal(result.packet.projectFacts.industry.value,'unknown');assert.equal(result.packet.projectFacts.industry.status,'unknown');
});

test('corrupt packet shape fails before optional model callbacks',async()=>{
  let calls=0;
  await assert.rejects(completeStructuredAnalysis({packet:null,deliverable:'space',execution,validateFinalPacket:validate,
    repairFinalPacketDeterministically:repair,model:async()=>{calls++;throw Error('MODEL_FORBIDDEN');}}));
  assert.equal(calls,0);
});
test('targeted semantic regression uses zero network primitives',()=>assert.equal(networkAttempts(),0));
