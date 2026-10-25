import test from 'node:test';
import assert from 'node:assert/strict';
import {scopeSourceEntries} from '../src/generation-runtime/space/scene-projection/target-scene-projection.js';
import {TARGET_FUNCTIONAL_PROGRAMS} from '../src/generation-runtime/space/continuation/target-functional-programs.js';
import {listShortChainTemplateOptions} from '../src/generation-runtime/generation/template-registry.js';
import {compileSpacePrompt} from '../src/generation-runtime/space/compiler.js';
import {sceneInput,compileScene,networkZh,networkEn,behaviors,crossProjects} from './scene-authority-cases.ts';
const count=(text:string,value:string)=>text.split(value).length-1;
const scopes=(result:any)=>result.compiled.compiledPrompt.trace.decisionTrace.sceneScope;
const visible=(result:any)=>result.compiled.compiledPrompt.trace.decisionTrace.visibleRequirements;

test('storefront/front preserves explicit requester, exterior program and exact camera through formal and Provider prompts',t=>{
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw new Error('NETWORK_FORBIDDEN');});
  const source=sceneInput('storefront'),before=JSON.stringify(source);
  const result=compileScene(source),authority=result.compiled.compiledPrompt.trace.spaceGeneration.targetSceneAuthority;
  assert.equal(authority.targetScene,'storefront');assert.equal(authority.targetProgramId,'storefront');
  assert.equal(authority.shotSource,'user_explicit');assert.equal(authority.viewStrategy,'front');
  assert.equal(authority.gate,'pass');assert.equal(result.compiled.taskContract.shot,'front');
  assert.match(result.provider.prompt,/Scene: `storefront` \/ front/);
  for(const value of behaviors) {
    assert.equal(count(result.provider.prompt,value),0);
    const row=visible(result).find((row:any)=>row.text===value);
    assert.equal(row.owner,null);assert.equal(row.disposition,'off_frame_dependency');
  }
  assert.ok(result.provider.prompt.endsWith(result.compiled.compiledPrompt.finalPrompt));
  assert.equal('image' in result.provider,false);assert.deepEqual(result.compiled.payload.referenceAssetIds,[]);
  assert.equal(JSON.stringify(source),before);assert.equal(calls,0);
});

test('all public subtype/shot choices have resolved authority or explicitly fail closed',()=>{
  const options=listShortChainTemplateOptions().space;
  for(const subtype of options.subtypes) for(const shot of options.shots) {
    const source=sceneInput(subtype);source.task.shot=shot;
    if(!(subtype in TARGET_FUNCTIONAL_PROGRAMS)) {
      assert.throws(()=>compileScene(source),{code:'SPACE_TARGET_SCENE_AUTHORITY_UNRESOLVED'});continue;
    }
    const authority=compileScene(source).compiled.compiledPrompt.trace.spaceGeneration.targetSceneAuthority;
    assert.equal(authority.targetScene,subtype);assert.equal(authority.viewStrategy,shot);
    assert.equal(authority.shotSource,'user_explicit');
  }
});

for(const shotSource of ['legacy_project_default','target_scene_default']) test(`exterior default camera uses exterior authority: ${shotSource}`,()=>{
  const source=sceneInput('storefront');source.task.shotSource=shotSource;
  const authority=compileScene(source).compiled.compiledPrompt.trace.spaceGeneration.targetSceneAuthority;
  assert.equal(authority.viewStrategy,'exterior_front_view');assert.equal(authority.shotSource,'target_scene_default');
});

test('unknown targets cannot turn an unresolved visible requirement into executable content',()=>{
  for(const scene of ['unknown_scene','custom','restaurant']) {
    const source=sceneInput(scene);
    assert.throws(()=>compileScene(source),/No vNext template registered/);
    assert.throws(()=>compileSpacePrompt({packet:source.packet,taskContract:source.task}),
      {code:'SPACE_TARGET_SCENE_AUTHORITY_UNRESOLVED'});
  }
  const row=scopeSourceEntries([{text:behaviors[0]}],'unknown_scene')[0];
  assert.equal(row.sceneScope,'unresolved');assert.equal(row.currentShotText,'');
  assert.equal(row.clauses[0].visibilityAuthority,'none');
});

for(const network of [networkZh,networkEn]) test(`complete functional dependencies are preserved without acquiring shot visibility: ${network}`,()=>{
  const source=sceneInput('entrance',['店员在入口递交商品'],[network]),before=JSON.stringify(source.packet);
  const result=compileScene(source),row=scopes(result).find((row:any)=>row.sourcePath==='mediaTranslations.spatial.functionalNetwork[0]');
  assert.equal(row.text,network);assert.equal(row.sceneScope,'off_frame_dependency');
  assert.equal(row.currentShotText,'');assert.equal(row.clauses[0].nodes.length,4);
  assert.ok(row.clauses[0].nodes.every((node:any)=>node.entities.length));
  assert.equal(count(result.provider.prompt,network),0);
  assert.equal(count(result.provider.prompt,'店员在入口递交商品'),1);
  assert.equal(JSON.stringify(source.packet),before);
});

test('source clauses retain exact ranges and mixed local/dependency/review dispositions',()=>{
  const text=`店员在入口递交商品；${networkZh}；入口 → 未知节点`;
  const source=sceneInput('entrance',[],[text]),result=compileScene(source);
  const row=scopes(result).find((row:any)=>row.sourcePath==='mediaTranslations.spatial.functionalNetwork[0]');
  assert.equal(row.currentShotText,'店员在入口递交商品');
  assert.deepEqual(row.clauses.map((clause:any)=>clause.sceneScope),['current_shot','off_frame_dependency','review_required']);
  for(const clause of row.clauses) assert.equal(text.slice(clause.sourceStart,clause.sourceEnd),clause.text);
  assert.equal(count(result.provider.prompt,'未知节点'),0);assert.equal(count(result.provider.prompt,networkZh),0);
});

for(const text of ['点餐制作取餐就餐的完整关系','入口 → 无法确定的节点','whole project operating network']) test(`unsafe networks stay reviewable: ${text}`,()=>{
  const result=compileScene(sceneInput('entrance',[],[text]));
  const row=scopes(result).find((row:any)=>row.sourcePath==='mediaTranslations.spatial.functionalNetwork[0]');
  assert.equal(row.sceneScope,'review_required');assert.equal(row.currentShotText,'');
  assert.equal(count(result.provider.prompt,text),0);
});

test('kitchen relationships cannot inherit a boundary authority merely from their container or another entrance clause',()=>{
  const source=sceneInput('entrance',[]);
  source.packet.mediaTranslations.spatial.peopleBehavior=['staff serving at entrance; chefs cooking in kitchen'];
  source.packet.mediaTranslations.spatial.functionalRelationships=['入口到达；kitchen connects to dining tables'];
  const result=compileScene(source);
  assert.equal(count(result.provider.prompt,'staff serving at entrance'),1);
  assert.equal(count(result.provider.prompt,'chefs cooking in kitchen'),0);
  assert.equal(count(result.provider.prompt,'kitchen connects to dining tables'),0);
});

test('dining operations and Chinese actors remain visible with exactly one rendered owner',()=>{
  const values=[...behaviors,'厨师在厨房制作食品','菜品上方升起热气','顾客在餐桌用餐'];
  const source=sceneInput('dining',values);
  source.packet.mediaTranslations.spatial.functionalNetwork.push(...values);
  source.packet.mediaTranslations.spatial.peopleBehavior=values;
  source.packet.mediaTranslations.spatial.brandRoleManifestation=values;
  const result=compileScene(source);
  for(const value of values) {
    assert.equal(count(result.provider.prompt,value),1);
    const row=visible(result).find((row:any)=>row.text===value);
    assert.equal(row.disposition,'retained');assert.ok(row.renderedBlocks.includes(row.owner));
    assert.equal(row.sceneProjection.sceneScope,'current_shot');
  }
});

for(const text of ['chef preparing food','steam above dishes']) test(`unlocated storefront activity requires review: ${text}`,()=>{
  const result=compileScene(sceneInput('storefront',[text]));
  assert.equal(visible(result)[0].disposition,'review_required');assert.equal(visible(result)[0].owner,null);
  assert.equal(count(result.provider.prompt,text),0);
});

for(const text of ['chef preparing food in kitchen visible through storefront glazing',
  '厨师在厨房制作食品并透过临街橱窗玻璃可见','入口视线可见厨房制作活动']) test(`interior sightline request awaits a reviewed interface: ${text}`,()=>{
  const source=sceneInput(text.startsWith('入口')?'entrance':'storefront',[],[text]);
  const result=compileScene(source),row=scopes(result).find((row:any)=>row.sourcePath==='mediaTranslations.spatial.functionalNetwork[0]');
  assert.equal(row.sceneScope,'review_required');assert.equal(row.clauses[0].visibilityAuthority,'none');
  assert.equal(count(result.provider.prompt,text),0);
});

test('an exterior prohibition protects interior privacy as a boundary, never as a rendered interior',()=>{
  const text='Storefront access must not expose kitchen or dining interiors';
  const source=sceneInput('storefront',[]);source.packet.mediaTranslations.spatial.functionalRelationships=[text];
  const result=compileScene(source),row=scopes(result).find((row:any)=>row.text===text);
  assert.equal(row.sceneScope,'cross_scene_constraint');
  assert.equal(row.clauses[0].visibilityAuthority,'current_boundary_only');
  assert.equal(count(result.provider.prompt,text),1);
});

for(const fixture of crossProjects) test(`cross-project exterior projection follows sources, not industry: ${fixture.industry}`,()=>{
  const source=sceneInput('storefront',[fixture.local,fixture.interior]);
  source.packet.projectFacts.industry.value=fixture.industry;
  const result=compileScene(source);
  assert.equal(count(result.provider.prompt,fixture.local),1);
  assert.equal(count(result.provider.prompt,fixture.interior),0);
  assert.equal(visible(result)[0].owner,'composition');
  assert.equal(visible(result)[1].owner,null);
  assert.equal(visible(result)[1].disposition,'off_frame_dependency');
});

test('other established commercial scene authorities retain their own local activities',()=>{
  for(const [subtype,text] of [['retail','customers browsing merchandise in retail area'],['display','visitors browsing exhibits'],
    ['reception','guests checking in at reception'],['treatment_room','technicians preparing equipment in treatment room']]) {
    const source=sceneInput(subtype,[text]);
    const result=compileSpacePrompt({packet:source.packet,taskContract:source.task});
    assert.equal(count(result.finalPrompt,text),1);assert.equal(result.trace.decisionTrace.visibleRequirements[0].owner,'composition');
  }
});

test('negative project guards are preserved even when they name a foreign exterior',()=>{
  const source=sceneInput('reception',[]);
  const guard='以面向室外景观的连续拱门代替商业服务转场、纯艺术展馆或普通医美装修';
  source.packet.creativeDecision.strategicNegatives=[guard];
  assert.equal(count(compileScene(source).provider.prompt,guard),1);
});

test('explicit off-frame operational prohibitions remain boundary-only',()=>{
  const text='treatment activity and private room interiors remain off frame';
  const source=sceneInput('reception',[]);source.packet.mediaTranslations.spatial.functionalRelationships=[text];
  const result=compileScene(source);
  assert.equal(count(result.provider.prompt,text),1);
  const row=scopes(result).find((row:any)=>row.text===text);
  assert.equal(row.sceneScope,'cross_scene_constraint');assert.equal(row.currentShotText,'');
});
