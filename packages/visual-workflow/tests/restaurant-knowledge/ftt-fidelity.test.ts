import test from 'node:test';
import assert from 'node:assert/strict';
import {historical,historicalBytes,readRepo,sourcePaths,sha256,makeFidelityFixture,operations,unknownFacts} from './ftt-fidelity-fixture.ts';
import {compareFidelity,functionalPollution,auditCompiled} from './ftt-fidelity-comparison.ts';
import {cases,runCase,nonSichuanCase} from './ftt-fidelity-cross-project.ts';
const comparison=compareFidelity();
test('FTT fixture is a frozen byte-identical historical restaurant Packet, never a generic example or image1 Run',()=>{
  assert.equal(sha256(historicalBytes),'e3564d51888661989eeb16de8923992a4e1148268e7f55e7427c4c70e6fb613c');
  assert.deepEqual(historicalBytes,readRepo(sourcePaths.packet));
  assert(Object.isFrozen(historical.mediaTranslations.spatial));
  assert.equal(historical.projectFacts.brandName.value,'冯烫烫');
  assert.match(historical.projectFacts.industry.value,/跷脚牛肉/);
  assert.deepEqual(historical.mediaTranslations.spatial.sceneProgram,['点餐','取餐','堂食','外带','明档展示']);
  assert.equal(unknownFacts.actualImage1RunAssociation,'undetermined');
});
test('raw refusal remains evidence; common post-composite adaptation is exact and shared',()=>{
  for(const row of comparison.rows) assert.equal(row.raw.code,'ANALYSIS_SPATIAL_SEMANTICS_INVALID');
  const f=makeFidelityFixture(),expected=structuredClone(historical);
  expected.mediaTranslations.spatial.mustBeVisible=[historical.mediaTranslations.spatial.mustBeVisible[2]];
  assert.deepEqual(f.A,expected);
  assert.deepEqual(f.identityChecklist.map(x=>x.sourceIndex),[0,1,3]);
  assert.equal(f.A.creativeDecision.uniqueUpgradeThesis,historical.creativeDecision.uniqueUpgradeThesis);
});
test('every B mutation is replayable from the explicit direction delta ledger; no hidden input or property change',()=>{
  const f=makeFidelityFixture(),replayed=structuredClone(f.A);
  for(const delta of f.deltas) {
    const parts=delta.path.split('.'),key=parts.pop()!;let node=replayed;
    for(const part of parts) node=node[part];
    assert.deepEqual(node[key],delta.before);assert(delta.evidence);node[key]=structuredClone(delta.after);
  }
  assert.deepEqual(replayed,f.B);
  assert.deepEqual(f.B.projectFacts.brandName,historical.projectFacts.brandName);
  assert.deepEqual(f.B.mediaTranslations.spatial.sceneProgram,f.A.mediaTranslations.spatial.sceneProgram);
  assert.deepEqual(f.B.mediaTranslations.spatial.functionalNetwork,f.A.mediaTranslations.spatial.functionalNetwork);
  assert.equal(f.B.projectFacts.brandRole.status,'proposed');
  assert.equal(f.B.projectFacts.brandRole.confidence,0);
  assert(Object.values(unknownFacts).every(value=>['unknown','undetermined'].includes(value)));
});
test('all three paired scenes have identical shot, subtype, model, standard, aspect, count and zero-reference controls',()=>{
  assert.deepEqual(comparison.rows.map(row=>[row.task.subtype,row.task.shot]),[['entrance','entrance_view'],['storefront','front'],['dining','three_quarter_wide']]);
  for(const row of comparison.rows) {
    assert.deepEqual(row.A.task,row.B.task);
    assert.deepEqual({...row.A.providerBody,prompt:null},{...row.B.providerBody,prompt:null});
    assert.equal(row.controls.generationBasis,'standard');assert.equal(row.controls.aspectRatio,'16:9');
    assert.equal(row.controls.referenceImages,0);assert.equal('image' in row.B.providerBody,false);
    assert(row.B.providerBody.prompt.endsWith(row.B.formalPrompt));
  }
});
test('project goal reaches the actual commercial-purpose block; full restaurant program has no generic consultation functions',()=>{
  for(const row of comparison.rows) {
    assert(row.B.formalPrompt.includes('**Commercial Purpose**: '+comparison.fixture.goals.positioning));
    assert(row.A.formalPrompt.includes('快餐与小吃服务'));
    assert(!row.B.formalPrompt.includes('更轻盈、现代的快餐视觉'));
    assert.deepEqual(row.A.audit.positiveFunctionalPollution,[]);assert.deepEqual(row.B.audit.positiveFunctionalPollution,[]);
    assert.equal(row.B.audit.negativeClinicGuard.polarity,'negative_guard_not_positive_program');
  }
  const polluted=structuredClone(historical);polluted.mediaTranslations.spatial.sceneProgram.push('consultation rooms','酒店接待');
  assert.equal(functionalPollution(polluted).length,2);
});
test('visible operating hypotheses obey resolved entrance and dining scope; unresolved authority is audited as a blocker',()=>{
  const entrance=comparison.rows[0],dining=comparison.rows[2];
  assert(entrance.B.audit.behaviors.every(row=>!row.retained && row.trace.reason==='foreign_scene_entity'));
  assert(dining.B.audit.behaviors.every(row=>row.retained && row.trace.owner==='composition'));
  for(const row of comparison.rows) {
    for(const group of [row.A,row.B]) if(!group.audit.scopeResolved) {
      assert.equal(group.audit.readyForRealGeneration,false);
      assert(group.audit.blockers.includes('unresolved_scene_authority'));
    }
  }
  // Test the review contract, not a frozen expectation that the production bug must persist.
  const fake={compiledPrompt:{finalPrompt:'',trace:{decisionTrace:{sceneScope:[],visibleRequirements:[]},spaceGeneration:{targetSceneAuthority:{gate:'pass'}}}}};
  assert(auditCompiled(historical,fake,'storefront').blockers.includes('unresolved_scene_authority'));
});
test('the original ambiguous pot/steam item is not misreported as preserved English operating fields',()=>{
  assert(!historical.mediaTranslations.spatial.mustBeVisible.includes(operations[0]));
  for(const row of comparison.rows) {
    assert(row.A.audit.rawVisibleRequirements.some((value: any)=>value.reason==='unresolved_visible_requirement'));
    assert.equal(row.B.audit.behaviors.length,3);
    assert(row.A.sourceMap.functional_requirement.includes('_raw.functionalNetwork'));
  }
});
test('material physics, light numeric parameters and unreviewed structures retain original proposal authority',()=>{
  const f=comparison.fixture;
  assert.deepEqual(f.B.materialSystem.map((x: any)=>x.behavior),f.A.materialSystem.map((x: any)=>x.behavior));
  assert.deepEqual(f.B.materialSystem.map((x: any)=>x.material),f.A.materialSystem.map((x: any)=>x.material));
  assert.deepEqual(f.B.lightingSystem,f.A.lightingSystem);
  assert(!JSON.stringify(f.B.materialSystem).includes('红砖'));
  assert(!JSON.stringify(f.B.materialSystem).includes('赤陶'));
  assert(f.selectedKnowledge.some(x=>x.id==='rks-observation-3' && x.use.includes('withheld')));
  for(const row of comparison.rows) assert.equal(row.B.audit.inheritedParameters.status,'review_required');
});
test('historical human material evidence is independently pinned and does not authorize red brick or new physical parameters',()=>{
  const evaluationBytes=readRepo(sourcePaths.evaluation),selectionBytes=readRepo(sourcePaths.selection);
  assert.equal(sha256(evaluationBytes),'ff1c5f11f27dcdf435eb5fff90b2c3e948a820ce5f6b493422bc550234f8a66c');
  assert.equal(sha256(selectionBytes),'65daac53a8eaf6fb132d92e563f2aca17b21d19983c7321e9e3cab8c98818539');
  const evaluation=JSON.parse(evaluationBytes.toString('utf8'));
  const note=evaluation.dimensions.materialAndLighting.note;
  assert.match(note,/暖色木\/赤陶.*厨房暖光/);assert.doesNotMatch(note,/红砖|3000|3500|反射/);
  assert(comparison.fixture.selectedKnowledge.every(row=>row.scope==='project' && !row.knowledgeStateChanged));
});
test('no compiler pass, keyword count or prompt length authorizes visual quality or generation',()=>{
  for(const row of comparison.rows) for(const group of [row.A,row.B]) {
    assert.equal(group.audit.readyForRealGeneration,false);assert.equal(group.audit.visualQuality,'not_evaluated_no_images');
    assert(group.audit.templateCues.some((cue: any)=>cue.id==='generic_reception_privacy'));
    assert(group.audit.blockers.includes('designer_review_pending'));
  }
});
test('pure compilation and report inputs cannot dispatch network calls or mutate historical sources',t=>{
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw new Error('NETWORK_FORBIDDEN');});
  const before=sha256(readRepo(sourcePaths.packet));compareFidelity();
  assert.equal(calls,0);assert.equal(sha256(readRepo(sourcePaths.packet)),before);
  assert.deepEqual(comparison.counters,{realAnalysis:0,realGeneration:0,realValidation:0,automaticRetries:0});
});
const expected=['AR01_neighborhood_local_eatery','AR02_standardized_fast_casual','AR04_streetfront_takeaway',null,'AR03_experience_oriented_restaurant',null];
for(const [index,fixture] of cases.entries()) test('RKS-02B cross-project attempted FTT adoption: '+fixture.label,()=>{
  const result=runCase(fixture);
  assert.equal(result.boundary.classification.primaryArchetype,expected[index]);
  assert.deepEqual(result.candidateSuggestions,[]);
  assert.equal(result.knowledgeAudit.find((x: any)=>x.knowledgeId==='rks-observation-3').reason,'project_scope_mismatch');
  assert.equal(result.knowledgeAudit.find((x: any)=>x.knowledgeId==='rks-observation-5').reason,'project_scope_mismatch');
  const goal=fixture.claims.find((x: any)=>x.dimension==='visual_style' && x.sourceType==='user_confirmed_design_goal');
  assert.deepEqual(result.b1Draft.fields,goal?{spatialConcept:goal.tag}:{});
  if(index===1) assert(result.boundary.classification.tags.some((x: any)=>x.tag==='modern_bright'));
  if(index===2) assert(!result.boundary.classification.tags.some((x: any)=>x.tag==='dine_in_primary'));
  if(index===3) assert(!result.boundary.classification.tags.some((x: any)=>x.tag==='sichuan_local'));
  if(index===4) assert(!result.boundary.classification.tags.some((x: any)=>x.tag==='efficient_service'));
  if(index===5) assert.equal(result.boundary.classification.tags.length,0);
});
test('a separately declared non-Sichuan restaurant cannot inherit FTT materials or acquire invented cuisine/style mappings',()=>{
  const result=runCase(nonSichuanCase);
  assert.deepEqual(result.candidateSuggestions,[]);
  assert(!result.boundary.classification.tags.some((row: any)=>row.tag==='sichuan_local' || row.dimension==='material'));
  assert.equal(result.b1Draft.fields.materialLanguage,undefined);
  assert(!JSON.stringify(result.b1Draft.fields).includes('红砖'));
});
