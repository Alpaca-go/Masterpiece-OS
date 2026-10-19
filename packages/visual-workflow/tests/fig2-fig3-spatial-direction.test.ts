import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {businessFixture} from './art-direction-business-fixture.ts';
import {createProjectDesignDirectionStore} from '../src/project-design-direction.js';
import {createStandardGenerationInput} from '../../../apps/web/src/features/visual-workflow/api.ts';
import {assertEditorSemanticFidelity} from './design-direction-editor-evidence.mjs';

const form=JSON.parse(await fs.readFile(new URL('./fig2-fig3-spatial-direction-form.json',import.meta.url),'utf8'));

test('direction correction replaces the rejected art mechanism and preserves five functional targets through the standard adapter',async t=>{
  const f=await businessFixture(t);
  const store=createProjectDesignDirectionStore(f.projects);
  const draft=await store.saveDraft(f.project.id,{fields:form.fields,sourceStatement:form.sourceStatement,expectedRecordSha256:null});
  const confirmed=await store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:draft.recordSha256});
  const input=createStandardGenerationInput({projectId:f.project.id,family:'space',subtype:'reception',shot:'entrance_view',shotExplicit:false,ratio:'16:9',instruction:'生成符合项目气质的空间效果图',include:'',avoid:'',hasLogo:true,directionRecordSha256:confirmed.recordSha256});
  const compiled=await f.generation.compile({...input,model:f.credentials.image.model});
  const run=await f.generation.start({projectId:f.project.id,taskId:compiled.taskContract.taskId,apiProfileId:'image'});
  assert.equal(run.status,'succeeded');assert.equal(f.requests.length,1);assert.equal(f.validations.length,0);
  const body=f.requests[0].body;
  const fidelity=assertEditorSemanticFidelity(form.fields,confirmed.confirmation,compiled.compiledPrompt.effectiveVisualDecisionPacket,compiled.compiledPrompt.finalPrompt,body);
  assert.equal(fidelity.rows.length,38);
  for(const old of ['同一艺术系统保留局部建筑尺度的大型主曲面','以中尺度过渡层片连接局部精密薄片','半透明珠光层片艺术装置','大型主曲面保留张力，中尺度层片衔接'])assert(!body.prompt.includes(old),old);
  for(const target of ['complete visitor-facing reception counter','one complete sofa and armchair group','small table and paired seats','一至两处干净连续的建筑曲面','温暖、柔和、均匀的漫射自然日光','浅木质保留自然纹理','private care interiors stay screened','冲突时减去装饰，保留功能面积与可用性'])assert(body.prompt.includes(target),target);
  assert.equal(compiled.taskContract.generationBasis,'standard');assert.deepEqual(compiled.taskContract.referenceAssetIds,[]);
  assert(!Object.hasOwn(body,'image'));assert.equal(body.model,'doubao-seedream-5-0-pro-260628');assert.equal(body.size,'2K');
  assert.equal(compiled.taskContract.count,1);assert.equal(compiled.taskContract.aspectRatio,'16:9');assert(body.prompt.length<=12000);
  assert(body.prompt.includes('no rendered brand name, wordmark, logotype, signage text'));
});

test('simplified hall direction remains project-local and does not replace an unedited project in the same store',async t=>{
  const f=await businessFixture(t,'Restaurant');
  const untouched=await f.projects.create({projectName:'Unedited project',industry:'Hotel'});
  const store=createProjectDesignDirectionStore(f.projects);
  const before=await fs.readFile((await f.projects.paths(untouched.id)).root+'/project.json');
  const draft=await store.saveDraft(f.project.id,{fields:form.fields,sourceStatement:form.sourceStatement,expectedRecordSha256:null});
  await store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:draft.recordSha256});
  assert.equal((await store.get(untouched.id)).status,'missing');
  assert.deepEqual(await fs.readFile((await f.projects.paths(untouched.id)).root+'/project.json'),before);
  assert.equal(f.requests.length,0);assert.equal(f.validations.length,0);
});
