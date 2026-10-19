import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {businessFixture} from './art-direction-business-fixture.ts';
import {createProjectDesignDirectionStore} from '../src/project-design-direction.js';
import {createStandardGenerationInput} from '../../../apps/web/src/features/visual-workflow/api.ts';
import {assertEditorSemanticFidelity} from './design-direction-editor-evidence.mjs';

const read=async(file:string)=>JSON.parse(await fs.readFile(new URL(file,import.meta.url),'utf8'));
const form=await read('./commercial-attribute-form.json');
const prior=await read('./architectural-refinement-form.json');

test('commercial refinement keeps architecture, art, lateral composition, palette and guardrails unchanged',()=>{
  for(const field of ['spatialConcept','structureLanguage','artisticFocus','compositionRequirements','colorEntries','colorAvoid','functionalProgram','functionalRelationships','mustAvoid','lightingContrast','lightingAvoid'])assert.deepEqual(form.fields[field],prior.fields[field],field);
  assert.deepEqual(form.fields.materialEntries[1],prior.fields.materialEntries[1]);
  for(const field of ['material','brandRole','forbidden'])assert.deepEqual(form.fields.materialEntries[0][field],prior.fields.materialEntries[0][field],field);
  for(const term of prior.fields.materialEntries[0].behavior.split('\n').slice(0,4))assert(form.fields.materialEntries[0].behavior.includes(term));
  assert.equal(Object.keys(form.fields).filter(key=>JSON.stringify(form.fields[key])!==JSON.stringify(prior.fields[key])).length,5);
});

test('restrained service cues, unlettered identity carriers, fine edges and diffuse light reach the standard request',async t=>{
  const f=await businessFixture(t);
  const store=createProjectDesignDirectionStore(f.projects);
  const draft=await store.saveDraft(f.project.id,{fields:form.fields,sourceStatement:form.sourceStatement,expectedRecordSha256:null});
  const confirmed=await store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:draft.recordSha256});
  const input=createStandardGenerationInput({projectId:f.project.id,family:'space',subtype:'reception',shot:'entrance_view',shotExplicit:false,ratio:'16:9',instruction:'生成符合项目气质的空间效果图',include:'',avoid:'',hasLogo:true,directionRecordSha256:confirmed.recordSha256});
  const compiled=await f.generation.compile({...input,model:f.credentials.image.model});
  const run=await f.generation.start({projectId:f.project.id,taskId:compiled.taskContract.taskId,apiProfileId:'image'});
  assert.equal(run.status,'succeeded');assert.equal(f.requests.length,1);assert.equal(f.validations.length,0);
  const body=f.requests[0].body;
  if(process.env.COMMERCIAL_ATTRIBUTE_OUTPUT){
    await fs.mkdir(process.env.COMMERCIAL_ATTRIBUTE_OUTPUT,{recursive:true});
    await fs.writeFile(`${process.env.COMMERCIAL_ATTRIBUTE_OUTPUT}/focused-prompt.txt`,compiled.compiledPrompt.finalPrompt);
    await fs.writeFile(`${process.env.COMMERCIAL_ATTRIBUTE_OUTPUT}/focused-trace.json`,JSON.stringify(compiled.compiledPrompt.trace,null,2));
  }
  assertEditorSemanticFidelity(form.fields,confirmed.confirmation,compiled.compiledPrompt.effectiveVisualDecisionPacket,compiled.compiledPrompt.finalPrompt,body);
  assert.equal(compiled.taskContract.generationBasis,'standard');assert.deepEqual(compiled.taskContract.referenceAssetIds,[]);
  assert.equal(Object.hasOwn(body,'image'),false);assert.equal(body.model,'doubao-seedream-5-0-pro-260628');assert.equal(body.size,'2K');
  assert.equal(compiled.taskContract.logoUsageMode,'post_composite');
  assert(body.prompt.includes('no rendered brand name, wordmark, logotype, signage text'));
  assert([...body.prompt].length<=12000);
  for(const term of ['check-in and appointment service','one discreet tablet','one small unlettered desk card','one closed unlettered service booklet','small water tray','staff-guided service threshold','small blank direction plaque','quiet unlettered identity surface','secondary to the building','边缘纤细收束','柔和宽缓的阴影过渡'])assert(body.prompt.includes(term),term);
});
