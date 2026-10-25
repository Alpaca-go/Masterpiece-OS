import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {compileSpacePrompt} from '../../src/generation-runtime/space/compiler.js';
import {compileShortChainGeneration} from '../../src/generation-runtime/generation/compile.js';
import {listShortChainTemplateOptions} from '../../src/generation-runtime/generation/template-registry.js';
import {isKnownTargetScene} from '../../src/generation-runtime/space/scene-projection/target-scene-projection.js';
import {compareFidelity} from '../restaurant-knowledge/ftt-fidelity-comparison.ts';
import {customInput} from './custom-compatibility-fixture.ts';

test('custom preview binds a complete source program to its project without granting a camera',t=>{
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw new Error('NETWORK_FORBIDDEN');});
  const input=customInput(),before=JSON.stringify(input),result=compileSpacePrompt(input);
  const authority=result.trace.targetSceneAuthority;
  assert.equal(authority.sourceProjectId,input.packet.projectId);
  assert.equal(authority.functionalBlockSource,'source_defined_custom_program');
  assert.equal(authority.executionBoundary,'pure_compile_preview_only');assert.equal(authority.cameraVisibilityAuthority,'none');
  assert.equal(authority.gate,'review_required');assert.equal(authority.sourceProgramValidation,'pass');
  assert.deepEqual(authority.authorityGate,{status:'review_required',checkedBlocks:[]});
  assert.equal(authority.viewStrategy,null);assert.equal(authority.viewStrategySource,'not_applicable_without_camera');
  assert.match(result.blocksById.task.text,/preview.*not an authorized image request/);
  assert.match(result.blocksById.functional_requirement.text,/Project-level Functional Dependencies \(not a visibility list\)/);
  assert.doesNotMatch(result.blocksById.functional_requirement.text,/\*\*Current-shot Program Nodes/);
  for(const field of ['sceneProgram','functionalNetwork','functionalRelationships','mustBeVisible','structureLanguage','signatureSpatialMechanism']) {
    for(const [index,text] of input.packet.mediaTranslations.spatial[field].entries()) {
      const row=result.trace.decisionTrace.customProgram.entries.find((row:any)=>row.sourcePath===`mediaTranslations.spatial.${field}[${index}]`);
      assert.equal(row.text,text);assert.equal(row.evidenceClass,'model_proposal');assert.equal(row.sceneScope,'source_defined_program');
      assert.ok(result.finalPrompt.includes(text));
    }
  }
  const visible=result.trace.decisionTrace.visibleRequirements[0];
  assert.equal(visible.owner,null);assert.equal(visible.disposition,'preview_only');
  assert.equal(visible.previewOwner,'composition');assert.equal(visible.executionAuthority,'none_without_camera_binding');
  assert.equal(visible.finalPromptRetained,false);assert.equal(visible.textPresentInFinalPrompt,true);
  assert.equal(visible.sceneProjection.sceneScope,'source_defined_program');
  assert.equal(JSON.stringify(input),before);assert.equal(calls,0);
});

test('custom previews retain project geometry, materials, color scope and light without inventing parameters',()=>{
  const input=customInput(),result=compileSpacePrompt(input);
  assert.ok(result.finalPrompt.includes(input.packet.mediaTranslations.spatial.structureLanguage[0]));
  for(const material of input.packet.materialSystem) {
    assert.ok(result.finalPrompt.includes(material.material));
    for(const behavior of material.behavior) assert.ok(result.finalPrompt.includes(behavior));
  }
  assert.match(result.blocksById.color.text,/Unknown ratios stay unknown/);
  assert.ok(result.finalPrompt.includes(input.packet.lightingSystem.source[0]));
});

test('custom source binding rejects absent or foreign project ownership',()=>{
  for(const mutate of [
    (input:any)=>input.taskContract.projectId='foreign',
    (input:any)=>delete input.taskContract.projectId,
    (input:any)=>delete input.packet.projectId,
    (input:any)=>input.packet.projectId='',
    (input:any)=>input.projectContext.visualDecisionPacket={projectId:'foreign'}
  ]) {const input=customInput();mutate(input);assert.throws(()=>compileSpacePrompt(input),{code:'SPACE_TARGET_SCENE_AUTHORITY_UNRESOLVED'});}
});

test('a standard custom preview cannot accept a camera, scene alias, instruction, references or a fake target program',()=>{
  for(const patch of [
    {shot:'front'},{shotSource:'user_explicit'},{shotSource:'target_scene_default'},{scene:'storefront'},
    {currentInstruction:'Show only the exterior'},{referenceAssetIds:['image']},{referenceAssetIds:'image'},
    {continuation:{targetFunctionalProgram:{sceneId:'custom'}}},{artDirection:{}},{deliverableFamily:'packaging'},
    {shot:{id:'front'}},{currentInstruction:{text:'exterior'}}
  ]) {const input=customInput();Object.assign(input.taskContract,patch);assert.throws(()=>compileSpacePrompt(input),{code:'SPACE_TARGET_SCENE_AUTHORITY_UNRESOLVED'});}
});

test('incomplete custom evidence is not replaced by an invented program or visibility list',()=>{
  for(const field of ['sceneProgram','mustBeVisible','functionalNetwork','functionalRelationships','signatureSpatialMechanism']) {
    const input=customInput();input.packet.mediaTranslations.spatial[field]=[];
    assert.throws(()=>compileSpacePrompt(input));
  }
  const input=customInput();input.packet.mediaTranslations.spatial.mustBeVisible=['an unresolved dream'];
  assert.throws(()=>compileSpacePrompt(input),{code:'SPACE_TARGET_SCENE_AUTHORITY_UNRESOLVED'});
});

test('unknown subtypes and other generation modes cannot opt into custom compatibility',()=>{
  for(const subtype of ['unknown_scene','customish','restaurant','exhibition','interior_panorama','counter']) {
    const input=customInput();input.taskContract.subtype=subtype;
    assert.throws(()=>compileSpacePrompt(input),{code:'SPACE_TARGET_SCENE_AUTHORITY_UNRESOLVED'});
  }
  for(const basis of ['reference_first','art_direction_reference','continuation']) {
    const input=customInput();input.taskContract.generationBasis=basis;
    assert.throws(()=>compileSpacePrompt(input),{code:'SPACE_TARGET_SCENE_AUTHORITY_UNRESOLVED'});
  }
});

test('custom remains outside public template generation',()=>{
  const input=customInput();
  assert.ok(!listShortChainTemplateOptions().space.subtypes.includes('custom'));
  assert.equal(isKnownTargetScene('custom'),false);
  assert.throws(()=>compileShortChainGeneration({projectContext:{visualDecisionPacket:input.packet},task:{...input.taskContract,
    deliverableFamily:'space',shot:'front',shotSource:'user_explicit',currentInstruction:'Render a custom scene'}}),/No vNext template registered/);
});

test('glass text in a custom preview cannot become an executable visible owner',()=>{
  const input=customInput();
  input.packet.mediaTranslations.spatial.mustBeVisible.push('chef preparing food in kitchen visible through storefront glazing');
  const result=compileSpacePrompt(input),row=result.trace.decisionTrace.visibleRequirements[1];
  assert.equal(row.owner,null);assert.equal(row.executionAuthority,'none_without_camera_binding');
  assert.match(result.finalPrompt,/No camera or window visibility is granted/);
  assert.equal(result.trace.targetSceneAuthority.cameraVisibilityAuthority,'none');
});

test('RKS-02C mapped scene formal and Provider prompt hashes, source maps and controls remain identical',()=>{
  const original=JSON.parse(fs.readFileSync(new URL('../../reports/scene-authority-repair/after.json',import.meta.url),'utf8'));
  const current=compareFidelity();
  for(const [index,row] of current.rows.entries()) for(const group of ['A','B']) {
    const expected=original.rows[index].groups[group],actual=row[group];
    assert.equal(actual.inputSha256,expected.inputSha256);assert.equal(actual.formalSha256,expected.formalSha256);
    assert.equal(actual.providerSha256,expected.providerSha256);assert.deepEqual(actual.sourceMap,expected.sourceMap);
    assert.deepEqual(row.controls,original.rows[index].controls);assert.deepEqual(row.task,original.rows[index].task);
    assert.deepEqual(actual.trace.spaceGeneration.targetSceneAuthority,expected.trace.spaceGeneration.targetSceneAuthority);
  }
});

test('existing methodology test expectations are unchanged from the frozen input',()=>{
  const bytes=fs.readFileSync(new URL('./acceptance.test.mjs',import.meta.url));
  const hash=crypto.createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/gu,'\n')).digest('hex');
  assert.equal(hash,'0f8862ec10c67d5fe4f4598f162bd46c71a9069f615c378779dac5dc91f740ba');
});
