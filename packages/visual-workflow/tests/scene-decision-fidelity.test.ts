import test from 'node:test';
import assert from 'node:assert/strict';
import {structuredAnalysisPacketFixture} from '../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import {compileSpacePrompt} from '../src/generation-runtime/space/compiler.js';
import {compileShortChainGeneration} from '../src/generation-runtime/generation/compile.js';
import {sanitizeBrandItem} from '../src/generation-runtime/space/semantic/sanitize-brand-expression.js';
import {scopeSourceEntries} from '../src/generation-runtime/space/scene-projection/target-scene-projection.js';
import {__setArchitectureAnchorRegistryForTest,loadArchitectureAnchorRegistry,selectArchitectureAnchors} from '../src/generation-runtime/space/architecture-context.js';

function input(industry='Hospitality') {
  const packet=structuredAnalysisPacketFixture();
  packet.projectFacts.industry.value=industry;
  return {packet,projectContext:{visualDecisionPacket:packet},taskContract:{projectId:'generic',deliverableFamily:'space',subtype:'reception',shot:'entrance_view',aspectRatio:'16:9',generationBasis:'standard',currentInstruction:'Create a complete reception scene'}};
}
test('artistic focus is composed once and remains distinct from operations',()=>{
  const source=input('Medical aesthetics');
  const artwork='A large abstract art installation at reception';
  source.packet.mediaTranslations.spatial.signatureSpatialMechanism.push(artwork);
  source.packet.mediaTranslations.spatial.brandRoleManifestation.push(artwork);
  const result=compileSpacePrompt(source);
  assert.match(result.blocksById.composition.text,/project_artistic_focus.*large abstract art installation/);
  assert.equal(result.finalPrompt.split(artwork).length-1,1);
  assert.ok(!result.layers._raw.functionalNetwork.includes(artwork));
  assert.ok(!result.layers.semantic.architectureActions.includes(artwork));
  assert.ok(result.layers._raw.brandRoleManifestation.includes(artwork)); // Historical container retained.
  assert.match(result.blocksById.composition.text,/mounting, dimensions.*unspecified/);
  assert.ok(result.trace.decisionTrace.artisticFocus[0].sourcePath.includes('signatureSpatialMechanism'));
});
test('optional artwork stays optional and a source without art does not acquire an installation',()=>{
  const source=input();
  assert.equal(compileSpacePrompt(source).layers.composition.artisticFocus.length,0);
  source.packet.mediaTranslations.spatial.brandRoleManifestation.push('Optional sculpture at reception');
  assert.equal(compileSpacePrompt(source).layers.composition.artisticFocus[0].priority,'optional');
});
test('single reception shot keeps other program nodes in the trace rather than displaying their interiors',()=>{
  const source=input('Medical aesthetics');
  const spatial=source.packet.mediaTranslations.spatial;
  spatial.sceneProgram=['Reception arrival','Private consultation room','Treatment room','Recovery lounge'];
  spatial.functionalNetwork=['Reception links to waiting','Private consultation room supports confidential discussion','Treatment room contains procedure beds'];
  spatial.functionalRelationships=['Reception access protects privacy before treatment'];
  spatial.mustBeVisible=['Reception desk','Privacy partitions','Treatment equipment'];
  spatial.brandRoleManifestation.push('Consultation room uses softly curved walls');
  const result=compileSpacePrompt(source);
  assert.deepEqual(result.layers._raw.sceneProgram,['Reception arrival']);
  assert.match(result.blocksById.functional_requirement.text,/Reception links to waiting/);
  for(const id of ['functional_requirement','composition','brand_translation','architecture_language']) assert.doesNotMatch(result.blocksById[id].text,/procedure beds|Treatment equipment|Consultation room uses/);
  assert.ok(result.trace.decisionTrace.sceneScope.some((entry:any)=>entry.text.includes('procedure beds') && entry.sceneScope==='off_frame_dependency'));
  assert.match(result.blocksById.architecture_function_bridge.text,/access and privacy boundaries/);
});
test('scene projection preserves trace and does not translate a color or transparency keyword into new geometry',()=>{
  const source=input();source.taskContract.subtype='consultation';
  source.packet.mediaTranslations.spatial.brandRoleManifestation=['Translucent glass with a red surface accent'];
  const result=compileSpacePrompt(source);
  assert.doesNotMatch(result.finalPrompt,/localized purple|curved layered translucent consultation enclosure/);
  assert.match(result.finalPrompt,/Translucent glass with a red surface accent/);
});
test('gallery character passes sanitization while identity text remains protected',()=>{
  assert.equal(sanitizeBrandItem('A gallery-like reception with an art installation').disposition,'kept');
  assert.equal(sanitizeBrandItem('空间作为艺术画廊，艺术装置与接待功能共同组织动线').disposition,'kept');
  assert.equal(sanitizeBrandItem('Logo art installation').reason,'in_scene_identity_post_composite');
  const source=input('Medical aesthetics');
  source.taskContract.currentInstruction='Art-exhibition character alongside reception, consultation access and visitor privacy';
  const result=compileSpacePrompt(source);
  assert.match(result.blocksById.task.text,/Art-exhibition character/);
  assert.doesNotMatch(result.finalPrompt,/do not turn the space into a gallery|品牌附着于建筑语言/);
  assert.match(result.finalPrompt,/Industry constrains use, access and privacy/);
});
test('source-scoped decisions occur once instead of being repeated through strategy/form/organization',()=>{
  const source=input(); const phrase='Complex curved ceiling surfaces organize the reception';
  source.packet.mediaTranslations.spatial.signatureSpatialMechanism=[phrase];
  const result=compileSpacePrompt(source);
  assert.equal(result.finalPrompt.split(phrase).length-1,1);
  assert.match(result.blocksById.architecture_language.text,/Complex curved ceiling/);
  assert.doesNotMatch(result.blocksById.architecture_dna.text,/Complex curved ceiling/);
});
test('unconfirmed color scopes and ratios remain proposals without mandatory large-area authority',()=>{
  const source=input();
  source.packet.colorSystem.primary=[{name:'Strong red',role:'Background',ratio:86} as any];
  const result=compileSpacePrompt(source);
  assert.match(result.blocksById.color.text,/proposed spatial scope: dominant_field/);
  assert.match(result.blocksById.color.text,/ratio: 86/);
  assert.match(result.blocksById.color.text,/Do not execute an unconfirmed dominant field/);
  assert.equal(result.trace.decisionTrace.color[0].executionAuthority,'proposal_only');
  assert.match(result.blocksById.color.text,/gradient.*independently authorizes/);
  assert.doesNotMatch(result.blocksById.color.text,/仅作局部点缀/);
  source.taskContract.currentInstruction='Use strong red as the dominant background, with a complex curved ceiling';
  assert.match(compileSpacePrompt(source).blocksById.task.text,/Use strong red as the dominant background/);
});
test('brand names and stored brand keys cannot auto-select architecture examples',()=>{
  const source=input();
  const a=compileShortChainGeneration({projectContext:{...source.projectContext,brandKey:'any-stored-brand'},task:source.taskContract});
  source.packet.projectFacts.brandName.value='A different brand';
  const b=compileShortChainGeneration({projectContext:source.projectContext,task:source.taskContract});
  assert.deepEqual(a.compiledPrompt.phase9b.anchorIds,[]);
  assert.deepEqual(b.compiledPrompt.phase9b.anchorIds,[]);
  assert.equal(a.compiledPrompt.phase9b.architectureContextIncluded,false);
  assert.match(a.compiledPrompt.finalPrompt,/No optional architecture examples/);
});
test('explicit optional examples require scene and mechanism compatibility and cannot outrank the project',t=>{
  const saved=loadArchitectureAnchorRegistry();t.after(()=>__setArchitectureAnchorRegistryForTest(saved));
  const anchor=(id:string,scene:string,mechanism:string)=>({id,role:'example',primaryMechanism:mechanism,applicability:{industries:['hospitality'],sceneTypes:[scene]}});
  __setArchitectureAnchorRegistryForTest({brands:{example:{anchors:[anchor('curved-reception','reception','Curved ceiling'),anchor('consultation-example','consultation','Curved ceiling'),anchor('membrane-example','reception','Layered translucent membrane ceiling')]}},selectionPolicy:{defaultMaxCount:3}});
  const criteria={industry:'hospitality',sceneType:'reception',mechanismEvidence:['Complex curved ceiling surfaces']};
  assert.deepEqual(selectArchitectureAnchors('example',criteria).map((entry:any)=>entry.anchor.id),['curved-reception']);
  assert.deepEqual(selectArchitectureAnchors('example',{industry:'hospitality'}),[]);
  const source=input('hospitality');source.packet.mediaTranslations.spatial.structureLanguage=['Complex curved ceiling surfaces'];
  const result=compileSpacePrompt({...source,brandKey:'example'});
  assert.deepEqual(result.anchors.map((entry:any)=>entry.id),['curved-reception']);
  assert.match(result.blocksById.architecture_context.text,/User-confirmed intent.*take priority/);
  assert.doesNotMatch(result.blocksById.architecture_context.text,/accepted for this brand|never conflicting/);
  assert.equal(result.referenceImages.length,0);
});
for(const industry of ['Medical aesthetics','Hospitality','Restaurant']) {
  test(`${industry}: formal route retains complex architecture and explicit strong color without manufacturing art`,()=>{
    const source=input(industry);
    source.taskContract.currentInstruction='Create a reception with a strong blue background and complex curved architecture';
    source.packet.mediaTranslations.spatial.structureLanguage=['Complex curved ceiling surfaces'];
    const snapshot=JSON.stringify(source);
    const result=compileShortChainGeneration({projectContext:source.projectContext,task:source.taskContract});
    assert.match(result.compiledPrompt.finalPrompt,/Complex curved ceiling surfaces/);
    assert.match(result.compiledPrompt.finalPrompt,/strong blue background/);
    assert.equal(result.compiledPrompt.trace.decisionTrace.artisticFocus.length,0);
    assert.equal(result.compiledPrompt.trace.spaceGeneration.routeIntegrity.status,'pass');
    assert.deepEqual(result.compiledPrompt.phase9b.anchorIds,[]);
    assert.ok(result.payload.prompt.endsWith(result.compiledPrompt.finalPrompt));
    assert.equal(JSON.stringify(source),snapshot);
  });
}
test('source scopes retain provenance and unknown scenes remain explicitly unresolved',()=>{
  const entries=[{text:'Treatment room',sourcePath:'sceneProgram[1]'}];
  assert.equal(scopeSourceEntries(entries,'reception')[0].sceneScope,'off_frame_dependency');
  assert.equal(scopeSourceEntries(entries,'custom_scene')[0].sceneScope,'unresolved');
  assert.equal(entries[0].sourcePath,'sceneProgram[1]');
});
