// Explicit offline report writer. Never imported by production or the core.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {runRestaurantShadowPipeline} from '../../offline/restaurant-knowledge/index.js';
import {verifyImplementation} from '../../src/integrity.js';
import {resources,fttInput,caseInput,originalCases,historicalBytes,historicalSha256} from './shadow-fixtures.ts';
import {compareShadowDirections} from './shadow-comparison.ts';
const base='3bcac082dbf4371a0938bb20db9b1bb52f13fd01';
const directory=new URL('../../reports/restaurant-shadow/',import.meta.url);
const write=(name: string,value: any)=>fs.writeFileSync(new URL(name,directory),JSON.stringify(value,null,2)+'\n');
const hash=(value: string | Buffer)=>crypto.createHash('sha256').update(value).digest('hex');
const fetchBefore=globalThis.fetch;
let networkAttempts=0;
globalThis.fetch=async()=>{networkAttempts++;throw new Error('NETWORK_FORBIDDEN');};
try {
  const input=fttInput();const snapshot=JSON.stringify({input,resources});
  const result=runRestaurantShadowPipeline(input,resources);
  const six=originalCases.map((fixture: any)=>({projectId:fixture.projectId,label:fixture.label,
    result:runRestaurantShadowPipeline(caseInput(fixture),resources)}));
  const comparison=compareShadowDirections();
  assert.equal(JSON.stringify({input,resources}),snapshot);
  const implementation=await verifyImplementation();
  const originalManifest=JSON.parse(fs.readFileSync(new URL('../../reports/restaurant-knowledge/evidence-manifest.json',import.meta.url),'utf8'));
  assert.equal(historicalSha256,originalManifest.sources.find((source: any)=>source.id==='historical_packet').sha256);
  assert.equal(hash(historicalBytes),historicalSha256);
  assert.equal(networkAttempts,0);
  fs.mkdirSync(directory,{recursive:true});
  write('ftt-shadow-result.json',{scope:'Historical Packet fixture review and fixed user targets only; no actual image1 Run attribution',
    fixtureProvenance:input.fixtureProvenance,result});
  write('direction-conflict-matrix.json',{scope:'Direction review, not actual-run root-cause matrix',
    rows:result.postAnalysis.conflicts,alignments:result.postAnalysis.alignments,
    areas:[
      {area:'project_positioning',status:'review_required',evidence:result.postAnalysis.ruleMatches},
      {area:'service_model',status:'compatible_presence_only',claimIds:['analysis:dine-in','analysis:takeaway'],limitation:'No service priority, customer count or style inferred'},
      {area:'spatial_suggestion',status:'review_required',claimIds:['analysis:spatial-concept','analysis:relationships'],limitation:'Unmapped prose retained, no arbitrary interpretation'},
      {area:'brand_mood',status:'partially_bound_review_required',claimIds:['analysis:brand-role','analysis:value-position','analysis:mood'],limitation:'Value-position annotation aligns; other mood prose remains unresolved'}
    ],actualImage1RunAssociation:'undetermined'});
  write('offline-comparison.json',comparison);
  write('six-case-results.json',{scope:'Existing RKS-01 six synthetic counterexamples; no project data migration',
    cases:six,knowledgeStatesUnchanged:true,expectedArchetypes:['AR01_neighborhood_local_eatery','AR02_standardized_fast_casual','AR04_streetfront_takeaway',null,'AR03_experience_oriented_restaurant',null]});
  const protectedPaths=['packages/visual-workflow/implementation-integrity.json','packages/visual-workflow/src/analysis-direction-suggestion.js',
    'packages/visual-workflow/src/project-design-direction.js','packages/visual-workflow/src/generation-runtime/space/source-adapter.js',
    'packages/visual-workflow/src/generation-runtime/space/compiler.js','packages/visual-workflow/src/generation-runtime/space/semantic/separate-space-semantics.js',
    'packages/visual-workflow/src/generation-runtime/generation/seedream-adapter.js','packages/visual-workflow/src/image-adapter/multi-model.js',
    'packages/visual-workflow/offline/restaurant-knowledge/rks-tag-dictionary.json',
    'packages/visual-workflow/offline/restaurant-knowledge/rks-archetypes.json','packages/visual-workflow/offline/restaurant-knowledge/rks-conflict-rules.json',
    'packages/visual-workflow/reports/restaurant-knowledge/rks-candidate-knowledge.json',
    'packages/visual-workflow/reports/restaurant-knowledge/ftt-direction-proposal.json',
    'packages/visual-workflow/reports/restaurant-knowledge/ftt-root-cause-matrix.json','package-lock.json'];
  const protection=protectedPaths.map(path=>{
    const actual=fs.readFileSync(path);
    const original=execFileSync('git',['show',`${base}:${path}`],{maxBuffer:20e6});
    assert.equal(hash(actual),hash(original),`PROTECTED_CHANGE: ${path}`);
    return {path,sha256:hash(actual),unchanged:true};
  });
  const protectedRoots=['packages/visual-workflow/src','packages/visual-workflow/prompts','apps/web/src/features/visual-workflow',
    'packages/visual-workflow/reports/p7b-single-generation','golden','evaluation','space-generator','config/repository-contract'];
  assert.equal(execFileSync('git',['diff',base,'--name-only','--',...protectedRoots],{encoding:'utf8'}).trim(),'');
  const legacyPath='packages/visual-workflow/offline/restaurant-knowledge/index.js';
  const legacy=execFileSync('git',['show',`${base}:${legacyPath}`]);
  assert(fs.readFileSync(legacyPath).subarray(0,legacy.length).equals(legacy));
  write('evidence-index.json',{phase:'RKS-02A',baselineCommit:base,implementation,
    legacyClassifier:{path:legacyPath,originalSectionSha256:hash(legacy),unchangedPrefix:true,change:'new pure exports appended; original classifier implementation unchanged'},
    historicalPacket:{path:'space-generator/quality-baselines/current-verification/source-packets/_packets/feng-tang-tang/visual-decision-packet.json',
      sha256:historicalSha256,role:'historical_fixture_only'},protection,protectedRoots,protectedDiff:[],
    sourceLanes:{originalVerifiedFacts:result.boundary.classification.tags.filter((tag: any)=>tag.sourceType==='source_fact'),
      fixedUserGoals:result.boundary.classification.tags.filter((tag: any)=>tag.sourceType==='user_confirmed_design_goal'),
      aiProposals:result.postAnalysis.proposals,historicalAndCandidateSuggestions:result.candidateSuggestions},
    generatedReports:['ftt-shadow-result.json','direction-conflict-matrix.json','offline-comparison.json','six-case-results.json'],
    counters:{realAnalysis:0,realGeneration:0,realValidation:0,automaticRetries:0,networkAttempts},
    productionEnabled:false,userProjectsAccessed:false,userProjectsWritten:false,credentialsRead:false,knowledgePromoted:false,
    image1ActualRunAssociation:'undetermined'});
  console.log(JSON.stringify({conflicts:result.postAnalysis.conflicts.map((row: any)=>row.code),alignments:result.postAnalysis.alignments.length,
    sixCases:six.length,compileScenarios:comparison.rows.length,retained:comparison.rows.map(row=>row.fields.filter(field=>field.bRetained).length),
    protectedFilesUnchanged:protection.length,networkAttempts}));
} finally {globalThis.fetch=fetchBefore;}
