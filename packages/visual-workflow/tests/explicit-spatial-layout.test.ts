import test from 'node:test';
import assert from 'node:assert/strict';
import {structuredAnalysisPacketFixture} from '../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import {compileSpatialMechanisms} from '../src/generation-runtime/space/semantic/compile-spatial-mechanisms.js';
import {normalizeArchitectureSemantics} from '../src/generation-runtime/space/semantic/normalize-architecture-semantics.js';
import {adaptSpaceSource} from '../src/generation-runtime/space/source-adapter.js';

function packetWithLayout(layout:string[]) {
  const p=structuredAnalysisPacketFixture();
  Object.assign(p.mediaTranslations.spatial,{structureLanguage:layout,spatialConcept:'A welcoming venue',signatureSpatialMechanism:['service counter'],brandRoleManifestation:[],brandIntegration:[],positiveDifferentiators:[],mustBeVisible:['service counter']});
  return p;
}
test('explicit ordinary layouts retain source wording and provenance without invented architecture',()=>{
  const p=packetWithLayout(['开放式','明档']);const before=structuredClone(p);
  const result=compileSpatialMechanisms(p);
  assert.deepEqual(result.architectureStrategy,['开放式','明档']);
  assert.deepEqual(result.architectureForm,['开放式','明档']);
  assert.deepEqual(result.architectureOrganization,['开放式','明档']);
  for(const [index,text]of ['开放式','明档'].entries()){
    const item=result.architectureRewrite.items.find((v:any)=>v.text===text);
    assert.equal(item.sourcePath,`mediaTranslations.spatial.structureLanguage[${index}]`);
    assert.equal(item.dropped,false);assert.equal(normalizeArchitectureSemantics(text,'structureLanguage').includedInArchitecturePrompt,true);
  }
  assert.deepEqual(p,before);
});
test('decorative or functional prose cannot grant ordinary layout authority',()=>{
  const p=packetWithLayout([]);
  p.mediaTranslations.spatial.brandIntegration=['明档'];p.mediaTranslations.spatial.signatureSpatialMechanism=['开放式'];
  p.mediaTranslations.spatial.functionalNetwork=['明档'];p.creativeDecision.uniqueUpgradeThesis='开放式';
  assert.deepEqual(compileSpatialMechanisms(p).architectureStrategy,[]);
  for(const text of ['避免明档','非开放式','开放式思维','明档招牌','明档海报'])assert.deepEqual(compileSpatialMechanisms(packetWithLayout([text])).architectureStrategy,[]);
});
test('ordinary Chinese and English layout terms pass source gates; genuinely absent architecture stays blocked',()=>{
  for(const layout of [['开放式','明档'],['开放式厨房'],['明档操作区'],['open-plan layout','open kitchen']]){
    const p=packetWithLayout(layout);
    assert.doesNotThrow(()=>adaptSpaceSource({packet:p,taskContract:{aspectRatio:'16:9'},projectContext:{}}));
  }
  assert.throws(()=>adaptSpaceSource({packet:packetWithLayout([]),taskContract:{},projectContext:{}}),/semantic.architectureStrategy/);
});
