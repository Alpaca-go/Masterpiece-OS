import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {businessFixture} from './art-direction-business-fixture.ts';
import {createProjectDesignDirectionStore} from '../src/project-design-direction.js';
import {createStandardGenerationInput} from '../../../apps/web/src/features/visual-workflow/api.ts';
import {assertEditorSemanticFidelity} from './design-direction-editor-evidence.mjs';

const read=async(file:string)=>JSON.parse(await fs.readFile(new URL(file,import.meta.url),'utf8'));
const form=await read('./architectural-refinement-form.json');
const prior=await read('./architectural-integration-form.json');

test('refinement preserves the integrated direction and approved atmosphere without expanding drift guards',()=>{
  for(const field of ['spatialConcept','colorEntries','colorAvoid','lightingLanguage','lightingContrast','lightingInteraction','lightingAvoid','functionalProgram'])assert.deepEqual(form.fields[field],prior.fields[field],field);
  assert.deepEqual(form.fields.materialEntries[1],prior.fields.materialEntries[1]);
  assert.equal(form.fields.materialEntries[0].material,prior.fields.materialEntries[0].material);
  assert.equal(form.fields.materialEntries[0].brandRole,prior.fields.materialEntries[0].brandRole);
  assert.equal(form.fields.materialEntries[0].forbidden,prior.fields.materialEntries[0].forbidden);
  assert(form.fields.artisticFocus.startsWith(prior.fields.artisticFocus.split('\n')[0]));
  for(const term of prior.fields.materialEntries[0].behavior.split('\n').slice(0,4))assert(form.fields.materialEntries[0].behavior.includes(term));
  assert.equal(form.fields.mustAvoid.split('\n').length,prior.fields.mustAvoid.split('\n').length);
  assert.doesNotMatch(form.fields.structureLanguage,/\d+(?:\.\d+)?\s*(?:米|m\b)/u);
});

test('P1-P4 survive confirmation, projection, formal compilation and the actual standard provider adapter',async t=>{
  const f=await businessFixture(t);
  const store=createProjectDesignDirectionStore(f.projects);
  const draft=await store.saveDraft(f.project.id,{fields:form.fields,sourceStatement:form.sourceStatement,expectedRecordSha256:null});
  const confirmed=await store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:draft.recordSha256});
  const input=createStandardGenerationInput({projectId:f.project.id,family:'space',subtype:'reception',shot:'entrance_view',shotExplicit:false,ratio:'16:9',instruction:'生成符合项目气质的空间效果图',include:'',avoid:'',hasLogo:true,directionRecordSha256:confirmed.recordSha256});
  const compiled=await f.generation.compile({...input,model:f.credentials.image.model});
  const result=await f.start(compiled);
  assert.equal(result.initialRun.status,'succeeded');
  assert.equal(result.automaticRetryCount,0);
  assert.equal(f.requests.length,1);assert.equal(f.validations.length,1);
  assert.equal(compiled.taskContract.generationBasis,'standard');
  assert.deepEqual(compiled.taskContract.referenceAssetIds,[]);
  assert.equal(Object.hasOwn(f.requests[0].body,'image'),false);
  assert.equal(f.requests[0].body.model,'doubao-seedream-5-0-pro-260628');
  assert.equal(f.requests[0].body.size,'2K');
  if(process.env.ARCHITECTURAL_REFINEMENT_OUTPUT){
    await fs.mkdir(process.env.ARCHITECTURAL_REFINEMENT_OUTPUT,{recursive:true});
    await fs.writeFile(`${process.env.ARCHITECTURAL_REFINEMENT_OUTPUT}/focused-prompt.txt`,compiled.compiledPrompt.finalPrompt);
    await fs.writeFile(`${process.env.ARCHITECTURAL_REFINEMENT_OUTPUT}/focused-trace.json`,JSON.stringify(compiled.compiledPrompt.trace,null,2));
  }
  assertEditorSemanticFidelity(form.fields,confirmed.confirmation,compiled.compiledPrompt.effectiveVisualDecisionPacket,compiled.compiledPrompt.finalPrompt,f.requests[0].body);
  for(const term of ['上部连续关系完整保留','近景边缘退让','中尺度层片衔接','交叠方向和前后间距','visitor service face','staff work face','spread laterally','partly free-standing','consultation and operational entrances','正常建筑摄影透视'])assert(f.requests[0].body.prompt.includes(term),term);
  assert.equal(confirmed.source.notOriginalBrandFact,true);
});
