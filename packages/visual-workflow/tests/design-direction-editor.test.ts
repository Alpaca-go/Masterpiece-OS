import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {businessFixture} from './art-direction-business-fixture.ts';
import {createProjectDesignDirectionStore} from '../src/project-design-direction.js';
import {designDirectionFields} from '../src/project-design-direction.js';
import {assertEditorSemanticFidelity} from './design-direction-editor-evidence.mjs';
const form=JSON.parse(await fs.readFile(new URL('./design-direction-form.json',import.meta.url),'utf8'));

test('natural-language form values retain independent semantic fields through official standard business compilation',async t=>{
  const f=await businessFixture(t);const store=createProjectDesignDirectionStore(f.projects);
  const draft=await store.saveDraft(f.project.id,{...form,expectedRecordSha256:null});assert.deepEqual(draft.validationIssues,[]);
  const confirmed=await store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:draft.recordSha256});
  const compiled=await f.generation.compile({projectId:f.project.id,model:f.credentials.image.model,task:{...f.task,generationBasis:'standard',referenceAssetIds:[],currentInstruction:'生成符合项目气质的空间效果图',mustAvoid:[]}});
  await f.start(compiled);
  const evidence=assertEditorSemanticFidelity(form.fields,confirmed.confirmation,compiled.compiledPrompt.effectiveVisualDecisionPacket,compiled.compiledPrompt.finalPrompt,f.requests[0].body);
  assert(compiled.compiledPrompt.sourceMap.composition.includes('mediaTranslations.spatial.compositionRequirements'));
  assert(evidence.rows.length>30);assert.equal(f.requests.length,1);assert.equal(f.validations.length,1);
  const reopened=designDirectionFields(confirmed.confirmation);
  assert.deepEqual(reopened.colorEntries,form.fields.colorEntries);assert.deepEqual(reopened.materialEntries,form.fields.materialEntries);
});
test('ambiguous color scope, misplaced full color prose, missing optics and duplicated function relations require clarification',async t=>{
  const f=await businessFixture(t);const store=createProjectDesignDirectionStore(f.projects);let expectedRecordSha256=null;
  const changes=[(value:any)=>{value.colorEntries[2].spatialUsage='';},(value:any)=>{value.colorEntries[2].surfaceApplicability='适量';},
    (value:any)=>{value.colorEntries[0].name='主色与局部点缀：整段配色';},(value:any)=>{value.materialEntries[0].behavior='';},
    (value:any)=>{value.functionalNetwork=value.functionalProgram;},(value:any)=>{value.colorEntries[2].spatialUsage='dominant_field';}];
  for(const change of changes){const fields=structuredClone(form.fields);change(fields);const draft=await store.saveDraft(f.project.id,{fields,sourceStatement:form.sourceStatement,expectedRecordSha256});expectedRecordSha256=draft.recordSha256;assert(draft.validationIssues.length>0);await assert.rejects(store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256}),error=>error.code==='PROJECT_DESIGN_DIRECTION_SEMANTICS_REQUIRED');assert.equal((await store.get(f.project.id)).status,'draft');}
  assert.equal(f.requests.length,0);
});
