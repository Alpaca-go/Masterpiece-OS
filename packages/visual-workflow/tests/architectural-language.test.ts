import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {businessFixture} from './art-direction-business-fixture.ts';
import {createProjectDesignDirectionStore} from '../src/project-design-direction.js';
import {createStandardGenerationInput} from '../../../apps/web/src/features/visual-workflow/api.ts';
import {assertEditorSemanticFidelity} from './design-direction-editor-evidence.mjs';
import {digest} from '../src/art-direction-contract.js';

const read=async (relative:string)=>JSON.parse(await fs.readFile(new URL(relative,import.meta.url),'utf8'));
const form=await read('./architectural-language-form.json');
const previous=await read('./design-direction-form.json');

test('architectural revision preserves approved atmosphere, structured palette, material optics and light',()=>{
  for(const key of ['spatialConcept','colorEntries','colorAvoid','materialEntries','lightingLanguage','lightingContrast','lightingInteraction','lightingAvoid']) {
    assert.deepEqual(form.fields[key],previous.fields[key],key);
  }
  assert(form.fields.mustAvoid.startsWith(previous.fields.mustAvoid));
  assert(form.fields.artisticFocus.startsWith(previous.fields.artisticFocus));
  assert.doesNotMatch(form.fields.structureLanguage,/\d+(?:\.\d+)?\s*(?:米|m\b)/u);
});

test('project direction alone reaches formal standard request with height, open transition and usable functions',async t=>{
  const f=await businessFixture(t);
  const packetFile=path.join(f.paths.root,'project-context/visual-decision-packet.json');
  const original=await fs.readFile(packetFile);
  const store=createProjectDesignDirectionStore(f.projects);
  const draft=await store.saveDraft(f.project.id,{fields:form.fields,sourceStatement:form.sourceStatement,expectedRecordSha256:null});
  assert.equal(draft.status,'draft');
  const confirmed=await store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:draft.recordSha256});
  const input=createStandardGenerationInput({projectId:f.project.id,family:'space',subtype:'reception',shot:'entrance_view',shotExplicit:false,ratio:'16:9',instruction:'生成符合项目气质的空间效果图',include:'',avoid:'',hasLogo:true,directionRecordSha256:confirmed.recordSha256});
  const compiled=await f.generation.compile({...input,model:f.credentials.image.model});
  const result=await f.start(compiled);
  assert.equal(result.initialRun.status,'succeeded');
  assert.equal(f.requests.length,1);assert.equal(f.validations.length,1);
  assert.equal(result.automaticRetryCount,0);
  assert.equal(compiled.taskContract.generationBasis,'standard');
  assert.deepEqual(compiled.taskContract.referenceAssetIds,[]);
  assert.equal(Object.hasOwn(f.requests[0].body,'image'),false);
  assert.equal(f.requests[0].body.size,'2K');
  if(process.env.ARCHITECTURAL_REVIEW_OUTPUT) {
    await fs.mkdir(process.env.ARCHITECTURAL_REVIEW_OUTPUT,{recursive:true});
    await fs.writeFile(path.join(process.env.ARCHITECTURAL_REVIEW_OUTPUT,'fixture-formal-prompt.txt'),compiled.compiledPrompt.finalPrompt);
    await fs.writeFile(path.join(process.env.ARCHITECTURAL_REVIEW_OUTPUT,'fixture-trace.json'),JSON.stringify(compiled.compiledPrompt.trace,null,2)+'\n');
  }
  const fidelity=assertEditorSemanticFidelity(form.fields,confirmed.confirmation,compiled.compiledPrompt.effectiveVisualDecisionPacket,compiled.compiledPrompt.finalPrompt,f.requests[0].body);
  assert.equal(fidelity.status,'PASS');
  for(const term of ['视觉净高','竖向呼吸感','顶部呼吸空间','开敞层次','狭长走廊','offset screened access','grouped seating','艺术停留','超广角'])assert(f.requests[0].body.prompt.includes(term),term);
  assert.equal(confirmed.source.notOriginalBrandFact,true);
  assert.equal(confirmed.source.kind,'user_design_decision');
  assert.deepEqual(await fs.readFile(packetFile),original);
  assert.equal((await store.get(f.project.id)).status,'confirmed');
});

test('three other industries keep their actual standard request bodies byte-identical to the reviewed baseline',async t=>{
  const baseline=await read('../reports/design-direction-editor/standard-industry-regression.json');
  const rows=[];
  for(const industry of ['Medical aesthetics','Restaurant','Hotel']) {
    const f=await businessFixture(t,industry);
    const task={...f.task,projectId:f.project.id,generationBasis:'standard',referenceAssetIds:[],currentInstruction:'Create a practical reception and waiting scene',mustAvoid:[]};
    const compiled=await f.generation.compile({projectId:f.project.id,task,model:f.credentials.image.model});
    await f.start(compiled);
    const prior=baseline.rows.find((row:any)=>row.industry===industry);
    assert.deepEqual(f.requests[0].body,prior.request.body,industry);
    assert.equal(Object.hasOwn(f.requests[0].body,'image'),false);
    assert.equal(compiled.compiledPrompt.userConfirmedVisualDecision,null);
    rows.push({industry,actualRequestEqual:true,baselineRequestSha256:prior.currentRequestSha256,currentRequestSha256:digest(f.requests[0].body),referenceImages:0,realProviderCalls:0,request:f.requests[0]});
  }
  if(process.env.ARCHITECTURAL_REVIEW_OUTPUT) {
    await fs.mkdir(process.env.ARCHITECTURAL_REVIEW_OUTPUT,{recursive:true});
    await fs.writeFile(path.join(process.env.ARCHITECTURAL_REVIEW_OUTPUT,'standard-industry-regression.json'),JSON.stringify({status:'PASS',comparison:'Previously reviewed actual standard bodies; no baseline updates',rows},null,2)+'\n');
  }
});
