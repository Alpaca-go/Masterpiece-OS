import test from 'node:test';
import assert from 'node:assert/strict';
import {scopeSourceEntries} from '../src/generation-runtime/space/scene-projection/target-scene-projection.js';
import {compileSpacePrompt} from '../src/generation-runtime/space/compiler.js';
import {structuredAnalysisPacketFixture} from '../../../tests/runtime-application/analysis-runtime-fixtures.ts';

for (const text of [
  'Reception circulation connects to treatment through a screened access route',
  'Reception waiting must not expose consultation conversations',
  'Recovery return traffic must avoid the reception queue',
  'Reception is adjacent to consultation with an acoustic privacy boundary',
  '接待区到治疗区的患者动线与员工通道分离',
  '接待区与治疗区之间应保持隔声边界',
  '咨询区入口不得从接待座位直接看到，保护隐私',
  '恢复区返回人流不得与接待候客队列交叉'
]) test(`cross-zone relationship remains a current boundary constraint: ${text}`,()=>{
  const [entry]=scopeSourceEntries([{text,sourcePath:'mediaTranslations.spatial.functionalRelationships[0]'}],'reception');
  assert.equal(entry.sceneScope,'cross_scene_constraint');
  assert.equal(entry.text,text);
  assert.ok(entry.boundaryConstraints.length);
  assert.ok(entry.boundaryConstraints.every((clause:any)=>clause.visibilityAuthority==='current_boundary_only'));
  assert.equal(entry.currentShotText,'');
});

for (const text of ['Treatment room contains procedure beds','Consultation room furniture and display walls','Recovery room equipped with lounge beds','治疗室内有诊疗设备']) test(`foreign interior remains off frame: ${text}`,()=>{
  const [entry]=scopeSourceEntries([{text,sourcePath:'mediaTranslations.spatial.mustBeVisible[0]'}],'reception');
  assert.equal(entry.sceneScope,'off_frame_dependency');
  assert.equal(entry.boundaryConstraints.length,0);
  assert.equal(entry.currentShotText,'');
});

test('mixed clauses preserve the local operational relation without granting interior visibility',()=>{
  const text='Treatment room contains procedure beds; reception access to treatment protects privacy; Reception waiting seats remain accessible';
  const [entry]=scopeSourceEntries([{text,sourcePath:'mediaTranslations.spatial.functionalRelationships[2]'}],'reception');
  assert.equal(entry.text,text);
  assert.equal(entry.currentShotText,'Reception waiting seats remain accessible');
  assert.deepEqual(entry.boundaryConstraints.map((clause:any)=>clause.text),['reception access to treatment protects privacy']);
  assert.deepEqual(entry.offFrameEntities.map((clause:any)=>clause.text),['Treatment room contains procedure beds']);
});

test('a foreign-only privacy statement is retained only in an operational source context',()=>{
  const text='Protect consultation privacy at the access boundary';
  assert.equal(scopeSourceEntries([{text,sourcePath:'mediaTranslations.spatial.functionalRelationships[0]'}],'reception')[0].sceneScope,'cross_scene_constraint');
  assert.equal(scopeSourceEntries([{text,sourcePath:'mediaTranslations.spatial.mustBeVisible[0]'}],'reception')[0].sceneScope,'off_frame_dependency');
});

test('formal compiler retains legitimate relationships once without exposing foreign interiors or mutating input',()=>{
  const packet=structuredAnalysisPacketFixture();
  const relation='Reception access to treatment must protect patient privacy';
  const consultation='Reception circulation connects to consultation through an acoustic boundary';
  packet.mediaTranslations.spatial.functionalRelationships=[relation,consultation];
  packet.mediaTranslations.spatial.sceneProgram=['Reception waiting','Treatment room contains procedure beds'];
  packet.mediaTranslations.spatial.functionalNetwork=['Reception arrival','Treatment room contains procedure beds'];
  const before=JSON.stringify(packet);
  const compiled=compileSpacePrompt({packet,projectContext:{},taskContract:{generationBasis:'standard',subtype:'reception',aspectRatio:'16:9'}});
  for(const text of [relation,consultation]) {
    assert.match(compiled.blocksById.architecture_function_bridge.text,new RegExp(text));
    assert.equal(compiled.finalPrompt.split(text).length-1,1);
    assert.ok(compiled.trace.decisionTrace.crossSceneConstraints.some((entry:any)=>entry.text===text && entry.sourcePath.includes('operationConstraints')));
  }
  assert.match(compiled.blocksById.architecture_function_bridge.text,/current-shot boundary only; other interiors remain off frame/);
  for(const id of ['functional_requirement','composition','architecture_language']) assert.doesNotMatch(compiled.blocksById[id].text,/procedure beds|Reception access to treatment must/);
  assert.ok(compiled.trace.decisionTrace.sceneScope.some((entry:any)=>entry.offFrameEntities.some((clause:any)=>clause.text.includes('procedure beds'))));
  assert.equal(JSON.stringify(packet),before);
});
