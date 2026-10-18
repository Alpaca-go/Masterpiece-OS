import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {businessFixture} from './art-direction-business-fixture.ts';
import {createProjectDesignDirectionStore} from '../src/project-design-direction.js';
import {createStandardGenerationInput} from '../../../apps/web/src/features/visual-workflow/api.ts';
import {assertEditorSemanticFidelity} from './design-direction-editor-evidence.mjs';

const read=async(file:string)=>JSON.parse(await fs.readFile(new URL(file,import.meta.url),'utf8'));
const form=await read('./architectural-integration-form.json');
const previous=await read('./architectural-language-form.json');

test('integrated project direction reaches the standard provider body without a reference input',async t=>{
  const f=await businessFixture(t);
  const store=createProjectDesignDirectionStore(f.projects);
  const draft=await store.saveDraft(f.project.id,{fields:form.fields,sourceStatement:form.sourceStatement,expectedRecordSha256:null});
  const confirmed=await store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:draft.recordSha256});
  const input=createStandardGenerationInput({projectId:f.project.id,family:'space',subtype:'reception',shot:'entrance_view',shotExplicit:false,ratio:'16:9',instruction:'生成符合项目气质的空间效果图',include:'',avoid:'',hasLogo:true,directionRecordSha256:confirmed.recordSha256});
  const compiled=await f.generation.compile({...input,model:f.credentials.image.model});
  const result=await f.start(compiled);
  const prompt=compiled.compiledPrompt.finalPrompt;
  if(process.env.ARCHITECTURAL_INTEGRATION_OUTPUT){
    await fs.mkdir(process.env.ARCHITECTURAL_INTEGRATION_OUTPUT,{recursive:true});
    await fs.writeFile(path.join(process.env.ARCHITECTURAL_INTEGRATION_OUTPUT,'focused-prompt.txt'),prompt);
    await fs.writeFile(path.join(process.env.ARCHITECTURAL_INTEGRATION_OUTPUT,'focused-trace.json'),JSON.stringify(compiled.compiledPrompt.trace,null,2)+'\n');
  }
  assert.equal(result.initialRun.status,'succeeded');assert.equal(result.automaticRetryCount,0);
  assert.equal(f.requests.length,1);assert.equal(f.validations.length,1);
  assert.equal(compiled.taskContract.generationBasis,'standard');assert.deepEqual(compiled.taskContract.referenceAssetIds,[]);
  assert.equal(Object.hasOwn(f.requests[0].body,'image'),false);
  assertEditorSemanticFidelity(form.fields,confirmed.confirmation,compiled.compiledPrompt.effectiveVisualDecisionPacket,prompt,f.requests[0].body);
  for(const term of ['沿建筑边缘展开的一套空间系统','竖向建筑界面延展至上部边界','成组候客与艺术停留区','背景半开放过渡区','错位私密入口边界','seats and small tables','强直射光与硬阴影','不使用品牌紫','中央居中'])assert(prompt.includes(term),term);
  assert(!prompt.includes('成为唯一主艺术焦点。'));
  assert.deepEqual(form.fields.colorEntries.slice(0,2),previous.fields.colorEntries.slice(0,2));
  assert.deepEqual(form.fields.materialEntries[1],previous.fields.materialEntries[1]);
  assert(form.fields.materialEntries[0].behavior.startsWith(previous.fields.materialEntries[0].behavior));
  assert.equal(form.fields.lightingContrast,previous.fields.lightingContrast);
  assert.equal(form.fields.colorEntries[2].spatialUsage,'local_accent');
  assert.equal(confirmed.source.notOriginalBrandFact,true);
  await assert.rejects(fs.access(path.join(f.paths.root,'project-context/art-direction/references.json')));
});
