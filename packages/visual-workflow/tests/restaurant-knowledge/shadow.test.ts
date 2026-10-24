import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildRestaurantBoundary,runRestaurantShadowPipeline} from '../../offline/restaurant-knowledge/index.js';
import {resources,fttInput,caseInput,originalCases,historicalPacket} from './shadow-fixtures.ts';
const run = (input: any) => runRestaurantShadowPipeline(input,resources);
function freeze(value: any) { if (value && typeof value==='object') {Object.values(value).forEach(freeze);Object.freeze(value);} return value; }

test('pre-analysis boundary cannot read a Packet and never classifies proposals or history as original facts', () => {
  const input: any = fttInput();
  Object.defineProperty(input,'packet',{get(){throw new Error('PRE_ANALYSIS_PACKET_READ');}});
  const before = buildRestaurantBoundary(input,resources);
  assert.equal(before.classification.primaryArchetype,'AR01_neighborhood_local_eatery');
  assert(before.classification.tags.every((tag: any)=>tag.sourceType==='user_confirmed_design_goal'));
  assert.deepEqual(before.missingFacts,['customers','location_context']);
  assert(!before.classification.tags.some((tag: any)=>['visual_style','material','customers'].includes(tag.dimension)));
  const bad = fttInput();bad.initialBindings.push({id:'bad',documentId:'materials',path:['note'],dimension:'material'});
  assert.throws(()=>run(bad),/PRE_ANALYSIS_SOURCE_FORBIDDEN/);
});

test('FTT reviewed upgrade proposal triggers paired direction conflict without making modernity universally incompatible', () => {
  const result = run(fttInput());
  assert.equal(result.postAnalysis.ruleMatches.length,1);
  const conflict = result.postAnalysis.conflicts.find((row: any)=>row.code==='RKS-CF-002');
  assert.equal(conflict.priority,'P0');
  assert(conflict.evidenceRefs.some((ref: string)=>ref.startsWith('user:')));
  assert(conflict.evidenceRefs.some((ref: string)=>ref.startsWith('historical_packet_fixture:')));
  assert.equal(result.postAnalysis.proposals[0].status,'probable');
  assert.equal(result.postAnalysis.proposals[0].normalization,'explicit_reviewed_exact_value_mapping');
  assert.equal(result.boundary.classification.primaryArchetype,result.postAnalysis.classification.primaryArchetype);
  assert(result.unknowns.some((row: any)=>row.id==='analysis:spatial-concept' && row.reason==='unmapped_natural_language'));
  assert.equal(result.postAnalysis.alignments.length,3);
  assert(result.unknowns.some((row: any)=>row.id==='analysis:mood'));
  assert(result.unknowns.some((row: any)=>row.id==='analysis:relationships'));
});

test('candidate materials/operations remain separately reviewable and never become confirmed B1 fields', () => {
  const result = run(fttInput());
  assert.equal(result.candidateSuggestions.length,3);
  assert.equal(result.b1Draft.status,'proposed_offline');
  assert.equal(result.b1Draft.replacesExistingDirection,false);
  assert.equal(result.b1Draft.requiresExplicitUserConfirmation,true);
  assert.equal(result.b1Draft.fields.materialLanguage,undefined);
  assert.equal(result.b1Draft.fields.visibleRequirements,undefined);
  assert(result.candidateSuggestions.every((row: any)=>row.requiresHumanReview && !row.automaticallyApplied));
  assert(result.candidateSuggestions.some((row: any)=>row.field==='materialLanguage' && row.scope==='project' && row.lifecycle==='candidate'));
  assert(result.candidateSuggestions.some((row: any)=>row.field==='visibleRequirements' && row.lifecycle==='project_observation'));
  assert(resources.knowledge.every((row: any)=>['candidate','project_observation'].includes(row.status)));
});

test('pure execution preserves all caller inputs, original historical Packet and resources across order changes', t => {
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw new Error('NETWORK_FORBIDDEN');});
  const input = fttInput();const initial=JSON.stringify({input,resources,historicalPacket});
  freeze(input);freeze(resources);
  const a=run(input);run(caseInput(originalCases[1]));const b=run(input);
  assert.deepEqual(a,b);assert.equal(JSON.stringify({input,resources,historicalPacket}),initial);
  a.b1Draft.fields.spatialConcept='caller edit';assert.notEqual(run(input).b1Draft.fields.spatialConcept,'caller edit');
  assert.equal(calls,0);
});

for (const [index,fixture] of originalCases.entries()) test(`shadow six-case isolation: ${fixture.label}`, () => {
  const input=caseInput(fixture), result=run(input);
  const expected=['AR01_neighborhood_local_eatery','AR02_standardized_fast_casual','AR04_streetfront_takeaway',null,'AR03_experience_oriented_restaurant',null];
  assert.equal(result.boundary.classification.primaryArchetype,expected[index]);
  assert.equal(result.candidateSuggestions.length,0);
  assert.equal(result.b1Draft.fields.materialLanguage,undefined);
  const styleGoal=fixture.claims.find((value: any)=>value.dimension==='visual_style' && value.sourceType==='user_confirmed_design_goal');
  assert.deepEqual(result.b1Draft.fields,styleGoal ? {spatialConcept:styleGoal.tag} : {});
  assert(!result.boundary.classification.tags.some((tag: any)=>tag.dimension==='material'));
  if(index===0)assert.deepEqual(result.postAnalysis.conflicts.map((row: any)=>row.code).sort(),['RKS-CF-001','RKS-CF-002','RKS-CF-006']);
  else assert.deepEqual(result.postAnalysis.conflicts,[]);
  if(index===1)assert(result.boundary.classification.tags.some((tag: any)=>tag.tag==='modern_bright' && tag.sourceType==='user_confirmed_design_goal'));
  if(index===2)assert(!result.boundary.classification.tags.some((tag: any)=>tag.tag==='dine_in_primary'));
  if(index===3)assert(!result.boundary.classification.tags.some((tag: any)=>tag.tag==='sichuan_local'));
  if(index===4)assert(!result.boundary.classification.tags.some((tag: any)=>tag.tag==='efficient_service'));
  if(index===5) {assert.equal(result.boundary.classification.tags.length,0);assert.equal(result.boundary.classification.missingDimensions.length,11);}
});

test('changing a brand label or trying to reuse FTT material bindings cannot move project-specific knowledge', () => {
  const input = fttInput();
  input.projectId='another-project';input.packet.projectId=input.projectId;
  input.documents.forEach((doc: any)=>doc.projectId=input.projectId);
  input.analysisBindings.forEach((binding: any)=>{if(binding.reviewedMapping)binding.reviewedMapping.projectId=input.projectId;});
  const result=run(input);
  assert.equal(result.candidateSuggestions.length,0);
  assert.equal(result.knowledgeAudit.find((row: any)=>row.knowledgeId==='rks-observation-3').reason,'project_scope_mismatch');
  assert.equal(result.b1Draft.fields.materialLanguage,undefined);
});

test('evidence binding/ownership and exact mapping fail closed instead of inferring prose', () => {
  for(const mutate of [
    (x: any)=>x.packet.projectId='foreign', (x: any)=>x.documents[0].projectId='foreign',
    (x: any)=>x.initialBindings[0].path=['__proto__'], (x: any)=>x.analysisBindings[0].reviewedMapping.projectId='foreign',
    (x: any)=>x.directionBindings[0].field='providerApiKey'
  ]) {const input=fttInput();mutate(input);assert.throws(()=>run(input),/RKS_SHADOW_INVALID/);}
  const changed=fttInput();changed.packet.creativeDecision.uniqueUpgradeThesis='An unrelated direction without a reviewed mapping';
  assert(!run(changed).postAnalysis.proposals.some((item: any)=>item.id==='analysis:upgrade'));
  const noMapping=fttInput();delete noMapping.analysisBindings[0].reviewedMapping;
  assert.equal(run(noMapping).postAnalysis.ruleMatches.length,0);
  assert(run(noMapping).unknowns.some((item: any)=>item.reason==='unmapped_natural_language'));
});

test('unverified intake/goals cannot authorize archetypes, styles or B1 drafts', () => {
  const input=fttInput();input.documents[0].verification='unverified';
  const result=run(input);
  assert.equal(result.boundary.classification.primaryArchetype,null);
  assert.deepEqual(result.b1Draft.fields,{});
  assert.equal(result.postAnalysis.conflicts.length,0);
  assert(result.unknowns.some((item: any)=>item.reason==='goal_not_confirmed'));
});

test('contradictory confirmed direction values stay unresolved rather than last-write winning', () => {
  const input=fttInput();input.documents[0].data.directions.other='A different explicit goal';
  input.directionBindings.push({documentId:'goals',path:['directions','other'],field:'spatialConcept'});
  const result=run(input);
  assert.equal(result.b1Draft.fields.spatialConcept,undefined);
  assert(result.unknowns.some((item: any)=>item.reason==='conflicting_confirmed_goal_values'));
});

test('verified structured source facts remain facts; user location/customer goals remain goals', () => {
  const input=caseInput(originalCases[1]);
  input.documents[0].sourceType='source_fact';input.documents[0].verification='verified_source';
  const result=run(input);
  assert(result.boundary.classification.tags.some((tag: any)=>tag.assertion==='fact' && tag.sourceType==='source_fact'));
  assert.deepEqual(result.boundary.missingFacts,['customers','location_context']);
  assert(!result.boundary.classification.tags.some((tag: any)=>tag.dimension==='customers'));
});

test('the shadow entry is isolated, has no I/O or production imports, and cannot dispatch a model', () => {
  const source=fs.readFileSync(new URL('../../offline/restaurant-knowledge/index.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/node:|\bfetch\s*\(|https?:|src\/|feng-tang-tang|冯烫烫/);
  assert.doesNotMatch(source,/\bimport\b|\brequire\s*\(/);
  assert.match(source,/export function runRestaurantShadowPipeline/);
});
