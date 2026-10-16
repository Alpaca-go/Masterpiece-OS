import test from 'node:test';
import assert from 'node:assert/strict';
import {compileSpacePrompt} from '../src/generation-runtime/space/compiler.js';
import {compileSpatialMechanisms} from '../src/generation-runtime/space/semantic/compile-spatial-mechanisms.js';
import {textToActions} from '../src/generation-runtime/space/semantic/action-verbs.js';
import {resolveSpatialColorRole} from '../src/generation-runtime/space/semantic/resolve-spatial-color-role.js';
import {sanitizeMaterial, sanitizeLighting} from '../src/generation-runtime/space/semantic/sanitize-brand-expression.js';

function input(industry = 'Hospitality') {
  return {taskContract:{generationBasis:'standard',aspectRatio:'16:9'},projectContext:{},packet:{
    schemaVersion:'1.0', validation:{hardFactStatus:'pass',executionDataStatus:'ready'},
    projectFacts:{brandName:{value:'Independent example'},industry:{value:industry},brandRole:{value:'Welcoming service'}},
    creativeDecision:{uniqueUpgradeThesis:'Service clarity',targetWorldview:[]},
    mediaTranslations:{spatial:{spatialConcept:'Layered light and clear circulation',
      signatureSpatialMechanism:['Layered light washes the reception wall'],
      structureLanguage:['Complex curved ceiling surfaces'],
      functionalNetwork:['Reception connects to waiting area'],functionalRelationships:['Preserve visitor privacy'],
      sceneProgram:['Reception','Waiting area'],mustBeVisible:['Reception counter'],brandRoleManifestation:[],positiveDifferentiators:[]}},
    colorSystem:{primary:[{name:'Blue',role:'品牌识别'}],secondary:[{name:'Neutral',role:'背景色'}],accent:[],forbidden:[]},
    materialSystem:[{material:'Blue glass',behavior:['Low reflection; transmitted light through layered thickness'],brandRole:'Reception partition',forbidden:[]}],
    lightingSystem:{source:['Diffuse daylight'],interactionWithMaterials:['Colored light filters through glass'],forbidden:[]}
  }};
}

test('bilingual background scope works for neutral and chromatic colors',()=>{
  for(const name of ['Blue','White','Red']) {
    assert.equal(resolveSpatialColorRole({name,role:'背景色'}),'dominant_field');
    assert.equal(resolveSpatialColorRole({name,role:'background'}),'dominant_field');
  }
});
test('identity rank and color names cannot manufacture spatial scope',()=>{
  assert.equal(resolveSpatialColorRole({name:'Flowing blue',role:'品牌主色'}),'unspecified');
  assert.equal(resolveSpatialColorRole({name:'White',role:'primary'}),'unspecified');
  assert.equal(resolveSpatialColorRole({role:'background and accent'}),'unresolved_conflict');
  assert.equal(resolveSpatialColorRole({spatialUsage:'post_composite_only'}),'post_composite_only');
});
test('role, ratio and carrier mutations reach the final compiler while materials and functions stay fixed',()=>{
  const source=input(); const before=compileSpacePrompt(source);
  for(const mutate of [
    p=>{p.colorSystem.primary[0].spatialUsage='dominant_field';},
    p=>{p.colorSystem.secondary[0].ratio=83;},
    p=>{p.colorSystem.primary[0].surfaceApplicability='Textiles only';},
    p=>{p.colorSystem.secondary[0].name='Alternate neutral';}
  ]) {
    const next=structuredClone(source); mutate(next.packet);
    const after=compileSpacePrompt(next);
    assert.notEqual(after.finalPrompt,before.finalPrompt);
    assert.equal(after.blocksById.material.text,before.blocksById.material.text);
    assert.equal(after.blocksById.functional_requirement.text,before.blocksById.functional_requirement.text);
    assert.equal(after.blocksById.architecture_language.text,before.blocksById.architecture_language.text);
  }
  assert.match(before.blocksById.color.text,/area ratio: unknown/);
  assert.match(before.blocksById.color.text,/existing model proposals/);
});
test('conflicting scope is visible, not resolved through matcher order',()=>{
  const source=input();source.packet.colorSystem.primary[0].role='background and local accent';
  const result=compileSpacePrompt(source);
  assert.match(result.blocksById.color.text,/UNRESOLVED.*colorSystem.primary\[0\]/);
  assert.equal(result.trace.decisionTrace.color[0].unresolved,true);
});
test('chromatic and neutral materials preserve carrier, optical behavior and role without adding optics',()=>{
  for(const material of ['Blue glass','Clear glass','Red resin','Grey stone']) {
    const source={material,behavior:['Partition thickness controls transmission and edge reflection'],brandRole:'Large partition',forbidden:[]};
    const snapshot=structuredClone(source);
    const result=sanitizeMaterial(source);
    assert.deepEqual(result,source);
    result.behavior.push('Local probe');
    assert.deepEqual(source,snapshot);
  }
  const source=input();const compiled=compileSpacePrompt(source);
  assert.match(compiled.blocksById.material.text,/Low reflection; transmitted light through layered thickness/);
  assert.match(compiled.blocksById.material.text,/Reception partition/);
  assert.doesNotMatch(compiled.finalPrompt,/pearl|珠光/iu);
});
test('lighting retains supplied optical interaction and filters identity light',()=>{
  const source={source:['Diffuse daylight','illuminated letters'],interactionWithMaterials:['Blue glass transmits light across the wall'],forbidden:[]};
  const result=sanitizeLighting(source);
  assert.deepEqual(result.source,['Diffuse daylight']);
  assert.deepEqual(result.interactionWithMaterials,source.interactionWithMaterials);
});
for(const phrase of ['Circulation flow guides visitors','动线流动引导访客','Layered light falls on the wall','层叠光影照亮接待台','Complex curved ceiling and curved walls','复杂曲线天花与连续曲墙','Translucent glass partitions filter views']) {
  test(`actions retain the supplied object: ${phrase}`,()=>{
    const actions=textToActions(phrase);
    assert.ok(actions.signals.length>0);
    for(const field of ['strategy','form','organization']) assert.deepEqual(actions[field],[phrase]);
  });
}
test('nonspatial sources are excluded before action derivation',()=>{
  const source=input();const before=compileSpacePrompt(source);
  source.packet.creativeDecision.targetWorldview=['Radial suspended flowing ceiling'];
  source.packet.creativeDecision.uniqueUpgradeThesis='Curved layered walls';
  source.packet.colorSystem.primary[0].name='Radial Flow Blue';
  const after=compileSpacePrompt(source);
  assert.deepEqual(after.layers.semantic.architectureActions,before.layers.semantic.architectureActions);
  assert.ok(after.layers.semantic.provenance.records.filter(r=>r.sourceGroup==='creativeDecision').every(r=>r.actionDisposition==='excluded_before_action_derivation'));
  const mechanisms=compileSpatialMechanisms(source.packet);
  assert.ok(!mechanisms.architectureSemantics.some(r=>r.sourceField.startsWith('colorSystem')));
});
test('motif translation does not invent geometry and explicit complex architecture survives',()=>{
  const source=input();
  source.packet.mediaTranslations.spatial.signatureSpatialMechanism=['Flower texture on the wall'];
  let result=compileSpatialMechanisms(source.packet);
  assert.ok(!result.architectureActions.some(text=>/soft layered surface relief/iu.test(text)));
  source.packet.mediaTranslations.spatial.signatureSpatialMechanism=['Flower motif on complex curved ceiling surfaces'];
  result=compileSpatialMechanisms(source.packet);
  assert.ok(result.architectureActions.includes('Flower motif on complex curved ceiling surfaces'));
});
test('functional movement remains outside geometric actions and material paths retain original indices',()=>{
  const source=input();
  source.packet.mediaTranslations.spatial.functionalNetwork=['Flowing visitor circulation'];
  source.packet.materialSystem.unshift({material:'Unspecified optical sample',behavior:[],forbidden:[]});
  const compiled=compileSpacePrompt(source);
  assert.ok(!compiled.layers.semantic.architectureActions.includes('Flowing visitor circulation'));
  assert.match(compiled.blocksById.functional_requirement.text,/Flowing visitor circulation/);
  assert.equal(compiled.trace.decisionTrace.materials[0].sourcePath,'materialSystem[1]');
});
test('full compiler preserves complex architectural intent across industries without adding installations',()=>{
  for(const industry of ['Medical aesthetics','Hospitality','Restaurant']) {
    const source=input(industry);const snapshot=JSON.stringify(source);
    const compiled=compileSpacePrompt(source);
    assert.match(compiled.blocksById.architecture_language.text,/Complex curved ceiling surfaces/);
    assert.match(compiled.blocksById.functional_requirement.text,/Reception connects to waiting area/);
    assert.match(compiled.blocksById.architecture_function_bridge.text,/Preserve visitor privacy/);
    assert.doesNotMatch(compiled.finalPrompt,/sculpture|艺术装置/iu);
    assert.equal(JSON.stringify(source),snapshot);
    assert.equal(compiled.trace.decisionTrace.materials[0].sourcePath,'materialSystem[0]');
    assert.ok(compiled.trace.decisionTrace.mechanisms.every(r=>r.sourcePath && r.evidenceClass==='system_inference'));
  }
});
