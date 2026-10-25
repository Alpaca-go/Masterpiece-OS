// Offline evidence builder. Reads tracked synthetic fixtures only; no user data or transport.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {compileSpacePrompt} from '../../src/generation-runtime/space/compiler.js';
import {verifyImplementation} from '../../src/integrity.js';
import {isKnownTargetScene} from '../../src/generation-runtime/space/scene-projection/target-scene-projection.js';
import {listShortChainTemplateOptions} from '../../src/generation-runtime/generation/template-registry.js';
import {compareFidelity} from '../restaurant-knowledge/ftt-fidelity-comparison.ts';
import {sceneInput,compileScene} from '../scene-authority-cases.ts';
import {customInput} from './custom-compatibility-fixture.ts';
const baseline='81c0256a6966c0d1dbe56eb822ad32849172e8c6';
const repository=new URL('../../../../',import.meta.url),report=new URL('../../reports/scene-authority-compatibility/',import.meta.url);
const sha=(value:any)=>crypto.createHash('sha256').update(value).digest('hex');
const read=(file:string)=>fs.readFileSync(new URL(file,repository));
const old=(file:string)=>execFileSync('git',['show',`${baseline}:${file}`],{maxBuffer:20*1024*1024});
const json=(file:string,data:any)=>fs.writeFileSync(new URL(file,report),JSON.stringify(data,null,2)+'\n');
let networkAttempts=0;globalThis.fetch=async()=>{networkAttempts++;throw new Error('NETWORK_FORBIDDEN');};
const input=customInput(),inputBefore=JSON.stringify(input),custom=compileSpacePrompt(input);
assert.equal(JSON.stringify(input),inputBefore);
json('custom-preview-evidence.json',{input,formalPrompt:custom.finalPrompt,formalSha256:sha(custom.finalPrompt),
  sourceMap:custom.trace.blockSources,trace:custom.trace,
  fieldMatches:custom.trace.decisionTrace.customProgram.entries.map((entry:any)=>({...entry,inFormalPrompt:custom.finalPrompt.includes(entry.text)})),
  providerRequest:null,publicGenerationAuthorized:false,reason:'pure_compile_preview_only'});
const original=JSON.parse(read('packages/visual-workflow/reports/scene-authority-repair/after.json').toString('utf8'));
const current=compareFidelity();
const parity=current.rows.flatMap((row,index)=>['A','B'].map(group=>{
  const expected=original.rows[index].groups[group],actual=row[group];
  assert.equal(actual.formalSha256,expected.formalSha256);assert.equal(actual.providerSha256,expected.providerSha256);
  assert.equal(actual.inputSha256,expected.inputSha256);assert.deepEqual(actual.sourceMap,expected.sourceMap);
  assert.deepEqual(actual.trace.spaceGeneration.targetSceneAuthority,expected.trace.spaceGeneration.targetSceneAuthority);
  return {subtype:row.scene.subtype,shot:row.scene.shot,group,inputSha256:actual.inputSha256,
    formalSha256:actual.formalSha256,providerSha256:actual.providerSha256,unchanged:true,
    authority:actual.audit.authority,behaviors:actual.audit.behaviors,networkScopeConcerns:actual.audit.networkScopeConcerns};
}));
json('mapped-scene-parity.json',parity);
const options=listShortChainTemplateOptions().space;
assert.deepEqual(options,JSON.parse(read('packages/visual-workflow/reports/scene-authority-repair/scene-contract-audit.json').toString('utf8')).options);
const publicAudit=options.subtypes.map(subtype=>{
  let result:any;
  try {const compiled=compileScene(sceneInput(subtype)).compiled;result={status:'compiler_resolved',authority:compiled.compiledPrompt.trace.spaceGeneration.targetSceneAuthority};}
  catch(error:any) {result={status:'compiler_blocked',code:error.code,message:error.message};}
  return {subtype,uiOption:true,hasFunctionalProgram:isKnownTargetScene(subtype),...result};
});
json('public-scene-audit.json',{options,uiChanged:false,publicOperationIntegrityApproved:false,scenes:publicAudit,
  custom:{uiOption:false,staticFunctionalProgram:false,pureCompilePreview:'bounded_compatibility',cameraRequest:'blocked',publicTemplate:'not_registered'},
  unknownSubtype:{customFallback:false,status:'blocked'}});
const manifestPath='packages/visual-workflow/implementation-integrity.json';
assert.deepEqual(read(manifestPath),old(manifestPath));
const manifest=JSON.parse(read(manifestPath).toString('utf8'));
const stagePaths=execFileSync('git',['diff',baseline,'--name-only','--','packages/visual-workflow/src','packages/visual-workflow/prompts','apps/web/src/features/visual-workflow'],{encoding:'utf8'}).trim().split(/\r?\n/u).filter(Boolean);
assert.deepEqual(stagePaths.sort(),['packages/visual-workflow/src/generation-runtime/space/compiler.js','packages/visual-workflow/src/generation-runtime/space/source-adapter.js']);
const pendingFiles=manifest.files.flatMap((entry:any)=>{
  const path=`packages/visual-workflow/${entry.path}`,actual=sha(read(path));
  return actual===entry.sha256?[]:[{path,registeredSha256:entry.sha256,stageBaseSha256:sha(old(path)),candidateSha256:actual,changedInThisStage:stagePaths.includes(path)}];
});
assert.equal(pendingFiles.length,4);
const unchangedRoots=['packages/visual-workflow/prompts','packages/visual-workflow/implementation-integrity.json','packages/visual-workflow/src/generation-baseline-lock.js',
  'packages/visual-workflow/src/project-design-direction.js','packages/visual-workflow/src/model-config.js',
  'packages/visual-workflow/offline','packages/visual-workflow/reports/p7b-single-generation','packages/visual-workflow/reports/restaurant-knowledge',
  'apps/web/src/features/visual-workflow','config/repository-contract','evaluation','space-generator','package-lock.json',
  'packages/image-generation-runtime','packages/runtime-core'];
assert.equal(execFileSync('git',['diff',baseline,'--name-only','--',...unchangedRoots],{encoding:'utf8'}).trim(),'');
assert.deepEqual(read('packages/visual-workflow/tests/methodology/acceptance.test.mjs'),old('packages/visual-workflow/tests/methodology/acceptance.test.mjs'));
let integrityError:any;
try {await verifyImplementation();}catch(error:any){integrityError=error.message;}
assert.match(integrityError,/VISUAL_WORKFLOW_IMPLEMENTATION_CHANGED/);
json('protected-change-approval.json',{stage:'RKS-02C.1',baseline,branch:'codex/rks-scene-authority-compatibility',status:'pending_human_review',
  stageChanges:pendingFiles.filter((entry:any)=>entry.changedInThisStage),cumulativePendingFiles:pendingFiles,
  manifest:{sha256:sha(read(manifestPath)),unchanged:true,qualityAcceptance:manifest.qualityAcceptance,totalEntries:manifest.files.length},
  integrityError,unchangedRoots,existingMethodologyTestUnchanged:true,qualityAcceptanceChanged:false,goldenChanged:false,
  sourcePolicy:'source-defined preview; no camera authority; public gates unchanged',
  counters:{realAnalysis:0,realImageGeneration:0,realValidation:0,automaticRetries:0,networkAttempts,userProjectsRead:0,userProjectsWritten:0,publish:0}});
fs.writeFileSync(new URL('candidate.diff',report),execFileSync('git',['diff',baseline,'--',...stagePaths],{encoding:'utf8'}));
const final=JSON.parse(fs.readFileSync(new URL('final-results.json',report),'utf8'));
const failureAudit=['workflow','current-flows','repository-policy'].map(name=>{
  const result=final.find((entry:any)=>entry.name===name),log=fs.readFileSync(new URL(result.log,report),'utf8');
  const blocks=(log.split('✖ failing tests:')[1] || '').split(/(?=test at )/u).filter(block=>block.includes('test at '));
  return {name,exitCode:result.exitCode,failures:blocks.map(block=>({location:block.split('\n')[0],test:block.split('\n').find(line=>line.startsWith('✖ ')),
    category:name==='repository-policy'?'existing_repository_policy':block.includes('VISUAL_WORKFLOW_IMPLEMENTATION_CHANGED')?'pending_integrity_approval':'behavior_regression'}))};
});
assert.ok(failureAudit.every(result=>result.failures.every(failure=>failure.category!=='behavior_regression')));
json('failure-audit.json',failureAudit);
assert.equal(networkAttempts,0);
console.log(`Custom source evidence captured; ${parity.length} mapped groups unchanged; ${pendingFiles.length} cumulative hashes pending; zero transport.`);
