import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {businessFixture} from './art-direction-business-fixture.ts';
import {createProjectDesignDirectionStore} from '../src/project-design-direction.js';
import {createStandardGenerationInput} from '../../../apps/web/src/features/visual-workflow/api.ts';
import {assertEditorSemanticFidelity} from './design-direction-editor-evidence.mjs';

const read=async(file:string)=>JSON.parse(await fs.readFile(new URL(file,import.meta.url),'utf8'));
const form=await read('./architecture-commercial-layer-form.json');
const prior=await read('./commercial-attribute-form.json');

test('hall protection changes only four project relation fields and keeps the established art, material and light',()=>{
  const changed=Object.keys(form.fields).filter(field=>JSON.stringify(form.fields[field])!==JSON.stringify(prior.fields[field]));
  assert.deepEqual(changed.sort(),['functionalNetwork','functionalRelationships','visibleRequirements','compositionRequirements'].sort());
  for(const field of Object.keys(prior.fields).filter(field=>!changed.includes(field)))assert.deepEqual(form.fields[field],prior.fields[field],field);
  assert(form.fields.functionalNetwork.includes(prior.fields.functionalNetwork.split('\n')[1]));
  assert(form.fields.compositionRequirements.includes(prior.fields.compositionRequirements.split('\n')[2]));
  assert(!form.fields.visibleRequirements.includes('one closed unlettered service booklet and a small water tray'));
});

test('open hall, complete service face, single screened threshold and optional cues survive standard provider dispatch',async t=>{
  const f=await businessFixture(t);
  const store=createProjectDesignDirectionStore(f.projects);
  const draft=await store.saveDraft(f.project.id,{fields:form.fields,sourceStatement:form.sourceStatement,expectedRecordSha256:null});
  const confirmed=await store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:draft.recordSha256});
  const input=createStandardGenerationInput({projectId:f.project.id,family:'space',subtype:'reception',shot:'entrance_view',shotExplicit:false,ratio:'16:9',instruction:'生成符合项目气质的空间效果图',include:'',avoid:'',hasLogo:true,directionRecordSha256:confirmed.recordSha256});
  const compiled=await f.generation.compile({...input,model:f.credentials.image.model});
  const run=await f.generation.start({projectId:f.project.id,taskId:compiled.taskContract.taskId,apiProfileId:'image'});
  assert.equal(run.status,'succeeded');assert.equal(f.requests.length,1);assert.equal(f.validations.length,0);
  const body=f.requests[0].body;
  if(process.env.ARCHITECTURE_COMMERCIAL_OUTPUT){
    await fs.mkdir(process.env.ARCHITECTURE_COMMERCIAL_OUTPUT,{recursive:true});
    await fs.writeFile(`${process.env.ARCHITECTURE_COMMERCIAL_OUTPUT}/focused-prompt.txt`,compiled.compiledPrompt.finalPrompt);
    await fs.writeFile(`${process.env.ARCHITECTURE_COMMERCIAL_OUTPUT}/focused-trace.json`,JSON.stringify(compiled.compiledPrompt.trace,null,2));
  }
  assertEditorSemanticFidelity(form.fields,confirmed.confirmation,compiled.compiledPrompt.effectiveVisualDecisionPacket,compiled.compiledPrompt.finalPrompt,body);
  assert.equal(compiled.taskContract.generationBasis,'standard');assert.deepEqual(compiled.taskContract.referenceAssetIds,[]);
  assert.equal(Object.hasOwn(body,'image'),false);assert.equal(body.model,'doubao-seedream-5-0-pro-260628');assert.equal(body.size,'2K');
  assert.equal(compiled.taskContract.count,1);assert.equal(compiled.taskContract.aspectRatio,'16:9');assert.equal(compiled.taskContract.logoUsageMode,'post_composite');
  assert(body.prompt.includes('no rendered brand name, wordmark, logotype, signage text'));assert([...body.prompt].length<=12000);
  for(const term of ['完整横向开敞空间','完整接待服务面','不被大型层片遮挡','不构成夹击主厅的狭窄画框','不陈列并列门洞','a single onward service threshold','at most one small service accessory','desk card is optional','even when no people are present','unobstructed by sheets','may be reduced to protect the open hall','consultation privacy remains protected'])assert(body.prompt.includes(term),term);
});
