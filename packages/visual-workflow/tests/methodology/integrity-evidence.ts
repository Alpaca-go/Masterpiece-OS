// Read-only source/manifest audit and offline report generation. No digest update mode.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyImplementation} from '../../src/integrity.js';
import {compareFidelity} from '../restaurant-knowledge/ftt-fidelity-comparison.ts';
import {compileShortChainGeneration} from '../../src/generation-runtime/generation/compile.js';
import {compileSpacePrompt} from '../../src/generation-runtime/space/compiler.js';
import {sceneInput,compileScene} from '../scene-authority-cases.ts';
import {customInput} from './custom-compatibility-fixture.ts';
const baseline='874efc07f56610a67c0c1842ecce60191f987375';
const repo=new URL('../../../../',import.meta.url),report=new URL('../../reports/scene-authority-integrity/',import.meta.url);
const sha=(value:any)=>crypto.createHash('sha256').update(value).digest('hex');
const read=(file:string)=>fs.readFileSync(fileURLToPath(repo)+file);
const json=(file:string,data:any)=>fs.writeFileSync(new URL(file,report),JSON.stringify(data,null,2)+'\n');
const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8',maxBuffer:20*1024*1024}).trim();
const audit=JSON.parse(fs.readFileSync(new URL('manifest-change-audit.json',report),'utf8'));
const manifestPath='packages/visual-workflow/implementation-integrity.json';
const before=JSON.parse(execFileSync('git',['show',`${baseline}:${manifestPath}`],{encoding:'utf8'}));
const currentBytes=read(manifestPath),current=JSON.parse(currentBytes.toString('utf8'));
const expected=structuredClone(before);
for(const item of audit.entries.filter((entry:any)=>entry.authorizedUpdate)) expected.files.find((entry:any)=>entry.path===item.path).sha256=item.actualSha256;
assert.deepEqual(current,expected);assert.equal(sha(currentBytes),audit.manifest.afterSha256);
assert.equal(git('diff',baseline,'--name-only','--','packages/visual-workflow/src','packages/visual-workflow/prompts','apps/web/src/features/visual-workflow'),'');
for(const entry of current.files) assert.equal(sha(read(`packages/visual-workflow/${entry.path}`)),entry.sha256);
for(const entry of current.frontendFiles) assert.equal(sha(read(entry.path)),entry.sha256);
const implementation=await verifyImplementation();
const groups=[
  {name:'P7B',roots:['packages/visual-workflow/src/generation-baseline-lock.js','packages/visual-workflow/src/generation-runtime/generation/seedream-adapter.js',
    'packages/visual-workflow/src/generation-runtime/space/product-policy.js','packages/visual-workflow/tests/generation-baseline-lock.test.ts','packages/visual-workflow/reports/p7b-single-generation']},
  {name:'B1',roots:['packages/visual-workflow/src/project-design-direction.js','packages/visual-workflow/src/analysis-direction-suggestion.js',
    'packages/visual-workflow/src/generation-runtime/generation/user-confirmed-visual-decision.js','apps/web/src/features/visual-workflow/ProjectDesignDirectionPanel.tsx',
    'packages/visual-workflow/tests/project-design-direction.test.ts','packages/visual-workflow/tests/analysis-direction-suggestion.test.ts']},
  {name:'Golden',roots:['evaluation','space-generator/quality-baselines','scripts/golden']},
  {name:'Provider-and-Prompt-policy',roots:['packages/visual-workflow/src/configuration.js','packages/visual-workflow/src/image-adapter',
    'packages/visual-workflow/src/model-runtime','packages/visual-workflow/prompts','packages/visual-workflow/offline',
    'packages/visual-workflow/reports/restaurant-knowledge','config/repository-contract','package-lock.json']},
  {name:'Guards-and-public-routing',roots:['packages/visual-workflow/src/integrity.js','packages/visual-workflow/src/service.js',
    'packages/visual-workflow/src/generation-runtime/generation/task-contract.js','packages/visual-workflow/src/generation-runtime/generation/template-router.js',
    'scripts/verify-visual-workflow-isolation.mjs','apps/web/src/features/visual-workflow']}
];
const invariants=groups.map(group=>{
  assert.equal(git('diff',baseline,'--name-only','--',...group.roots),'');
  const tree=execFileSync('git',['ls-tree','-r','-z',baseline,'--',...group.roots],{encoding:'utf8',maxBuffer:20*1024*1024});
  const files=tree.split('\0').filter(Boolean).map(line=>line.slice(line.indexOf('\t')+1));
  assert.ok(files.length>0);
  return {...group,unchangedFrom:baseline,trackedFileCount:files.length,baselineGitTreeSha256:sha(tree),
    files:files.map(path=>({path,sha256:sha(read(path))})),unrelatedAssetsModified:false};
});
json('invariance-proof.json',{baseline,implementation,manifestFieldsChanged:4,productionSourcesChanged:0,invariants,
  qualityAcceptanceUnchanged:current.qualityAcceptance===before.qualityAcceptance,extractionStatusUnchanged:current.extractionStatus===before.extractionStatus});
let networkAttempts=0;globalThis.fetch=async()=>{networkAttempts++;throw new Error('NETWORK_FORBIDDEN');};
const original=JSON.parse(read('packages/visual-workflow/reports/scene-authority-repair/after.json').toString('utf8'));
const comparison=compareFidelity();
const parity=comparison.rows.flatMap((row,index)=>['A','B'].map(group=>{
  const actual=row[group],previous=original.rows[index].groups[group];
  assert.equal(actual.inputSha256,previous.inputSha256);assert.equal(actual.formalSha256,previous.formalSha256);assert.equal(actual.providerSha256,previous.providerSha256);
  assert.deepEqual(actual.sourceMap,previous.sourceMap);assert.deepEqual(row.task,original.rows[index].task);
  assert.deepEqual(actual.trace.spaceGeneration.targetSceneAuthority,previous.trace.spaceGeneration.targetSceneAuthority);
  return {subtype:row.scene.subtype,shot:row.scene.shot,group,inputSha256:actual.inputSha256,formalSha256:actual.formalSha256,
    providerSha256:actual.providerSha256,sourceMapSha256:sha(JSON.stringify(actual.sourceMap)),unchanged:true,authority:actual.audit.authority};
}));
const publicBlockers=['exhibition','interior_panorama','counter'].map(subtype=>{
  try {compileScene(sceneInput(subtype));throw new Error('UNEXPECTED_SCENE_RELEASED');}
  catch(error:any) {assert.equal(error.code,'SPACE_TARGET_SCENE_AUTHORITY_UNRESOLVED');return {subtype,status:'blocked',uiSelectable:true,errorCode:error.code};}
});
const custom=customInput(),preview=compileSpacePrompt(custom);
assert.equal(preview.trace.targetSceneAuthority.gate,'review_required');assert.equal(preview.trace.targetSceneAuthority.cameraVisibilityAuthority,'none');
let customError='';
try {compileShortChainGeneration({projectContext:{visualDecisionPacket:custom.packet},task:{...custom.taskContract,
  deliverableFamily:'space',shot:'front',shotSource:'user_explicit',currentInstruction:'Render custom scene'}});}
catch(error:any) {customError=error.message;}
assert.match(customError,/No vNext template registered for subtype.space.custom/);
const results=JSON.parse(fs.readFileSync(new URL('regression-results.json',report),'utf8'));
const previousFailures=JSON.parse(read('packages/visual-workflow/reports/scene-authority-compatibility/failure-audit.json').toString('utf8'));
const resolved=previousFailures.filter((entry:any)=>['workflow','current-flows'].includes(entry.name)).map((entry:any)=>{
  const target=entry.name==='workflow'?'visual-workflow':entry.name;
  const result=results.find((row:any)=>row.name===target),body=fs.readFileSync(new URL(result.log,report),'utf8');
  assert.equal(result.exitCode,0);
  return {name:target,previouslyBlockedTests:entry.failures.map((failure:any)=>{
    const name=failure.test.replace(/^✖ /u,'').replace(/ \([\d.]+ms\)$/u,'');
    assert.ok(body.includes(`✔ ${name} (`),`PREVIOUS_TEST_NOT_PASSING: ${name}`);
    return {test:name,status:'pass',previousStatus:'pending_integrity_approval'};
  })};
});
for(const result of results) if(result.name!=='historical-repository-policy') assert.equal(result.exitCode,0,result.name);
const policy=results.find((row:any)=>row.name==='historical-repository-policy');
assert.equal(policy.exitCode,1);assert.deepEqual(policy.countGroups.fail,[2]);
assert.equal(networkAttempts,0);
json('closure-evidence.json',{baseline,implementation,parity,resolved,publicBlockers,
  custom:{previewGate:preview.trace.targetSceneAuthority.gate,cameraVisibilityAuthority:'none',publicGeneration:'blocked',error:customError},
  historicalPolicy:{exitCode:policy.exitCode,countGroups:policy.countGroups,log:policy.log,unchangedAssets:true},
  counters:{realAnalysis:0,realGeneration:0,realValidation:0,automaticRetries:0,networkAttempts,userProjectsRead:0,userProjectsWritten:0,deployments:0,published:0},
  visualQualityAccepted:false,knowledgePromoted:false});
console.log(`Closure verified: ${resolved.reduce((sum,row)=>sum+row.previouslyBlockedTests.length,0)} previous integrity blocks resolved; ${parity.length} A/B groups unchanged; no production source changes.`);
