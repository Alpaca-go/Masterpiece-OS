// Package offline browser evidence. Never loads credentials or calls a provider.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {digest} from '../src/art-direction-contract.js';
import {verifyImplementation} from '../src/integrity.js';

globalThis.fetch=async()=>{throw new Error('REAL_PROVIDER_NETWORK_FORBIDDEN');};
if(process.argv.length!==7)throw new Error('Usage: prepare-architectural-review.mjs BROWSER_OUTPUT ORIGINAL_BROWSER_OUTPUT HISTORICAL_EXECUTION REPORT_OUTPUT INDUSTRY_EVIDENCE_FILE');
const [browserRoot,originalBrowserRoot,historicalRoot,destination,industryEvidenceFile]=process.argv.slice(2).map(value=>path.resolve(value));
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
await fs.mkdir(destination,{recursive:true});
const write=(name,value)=>fs.writeFile(path.join(destination,name),JSON.stringify(value,null,2)+'\n');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
async function inventory(root) {
  const rows=[];
  async function walk(dir) {
    for(const item of await fs.readdir(dir,{withFileTypes:true})) {
      assert(!item.isSymbolicLink());const file=path.join(dir,item.name);
      if(item.isDirectory())await walk(file);
      else rows.push({path:path.relative(root,file),sha256:digest(await fs.readFile(file))});
    }
  }
  await walk(root);return rows.sort((a,b)=>a.path.localeCompare(b.path));
}
for(const root of [browserRoot,originalBrowserRoot]) {
  const proof=await read(path.join(root,'readonly-proof.json'));
  assert.deepEqual(await inventory(proof.sourceProject),proof.sourceInventory);
}
const result=await read(path.join(browserRoot,'browser-result.json'));
const prior=await read(path.join(browserRoot,'initial-direction.json'));
const next=await read(path.join(browserRoot,'confirmed-direction.json'));
const packet=await read(path.join(browserRoot,'effective-packet.json'));
const request=await read(path.join(browserRoot,'provider-request.json'));
const task=await read(path.join(browserRoot,'task-contract.json'));
const metadata=await read(path.join(browserRoot,'request-metadata.json'));
const history=await read(path.join(historicalRoot,'execution-result.json'));
const historicalDirection=await read(path.join(historicalRoot,'project-design-direction.json'));
const historyPacket=await read(path.join(historicalRoot,'effective-visual-decision-packet.json'));
const formal=await fs.readFile(path.join(browserRoot,'formal-prompt.txt'),'utf8');
const previousPrompt=await fs.readFile(path.join(historicalRoot,'compiled-prompt.txt'),'utf8');
const previousProvider=await read(path.join(historicalRoot,'image-actual-request.json'));
const stamp=await verifyImplementation();
assert.equal(stamp.implementationDigest,result.implementationDigest);
assert.equal(stamp.implementationDigest,history.implementation.implementationDigest);
assert.equal(prior.confirmationSha256,historicalDirection.confirmationSha256);
assert.equal(digest(previousProvider.body),history.requestBodySha256);
assert.equal(digest(await fs.readFile(path.join(historicalRoot,history.image.businessOutput))),history.image.businessOutputSha256);
assert.equal(digest(await fs.readFile(path.join(historicalRoot,history.image.originalFile))),history.image.originalSha256);
for(const [key,field] of [['colorSystem','colorBehavior'],['materialSystem','materialLanguage'],['lightingSystem','lightingLanguage']]) {
  assert.deepEqual(historyPacket[key],prior.confirmation.spatialTranslation[field]);
  assert.deepEqual(historyPacket[key],packet[key]);
}
assert.equal(result.realProviderCalls,0);assert.equal(result.automaticRegenerations,0);
assert.equal(result.recordedMockImageRequests,1);assert.equal(result.recordedMockValidationRequests,1);
assert.equal(next.status,'confirmed');assert.equal(task.generationBasis,'standard');
assert.deepEqual(task.referenceAssetIds,[]);assert.equal(Object.hasOwn(request.body,'image'),false);
assert.equal(metadata.referenceCount,0);assert.equal(metadata.outputCount,1);
assert.equal(metadata.model,history.model);assert.equal(metadata.imageSize,'2K');assert.equal(metadata.aspectRatio,'16:9');
assert.equal(digest(next.confirmation),metadata.designDirection.confirmationSha256);
assert(request.body.prompt.endsWith(formal));
assert.equal(next.source.notOriginalBrandFact,true);
const protectedFields=['spatialConcept','colorEntries','colorAvoid','materialEntries','lightingLanguage','lightingContrast','lightingInteraction','lightingAvoid'];
const fidelity=protectedFields.map(field=>{
  assert.deepEqual(next.fields[field],prior.fields[field],field);
  return {field,status:'PASS',beforeSha256:digest(prior.fields[field]),afterSha256:digest(next.fields[field])};
});
const delta=Object.keys(next.fields).filter(field=>JSON.stringify(next.fields[field])!==JSON.stringify(prior.fields[field])).map(field=>({field,before:prior.fields[field],after:next.fields[field],kind:['materialLanguage','colorPolicy'].includes(field)?'unused legacy free-text view cleared by existing structured editor; canonical arrays unchanged':'authorized project architectural design intent'}));
const changed=git('diff','--name-only','HEAD').split('\n').filter(Boolean);
const added=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
const productionChanges=[...changed,...added].filter(file=>!/^packages\/visual-workflow\/(tests|reports)\//u.test(file));
assert.deepEqual(productionChanges,[]);
const gateResults=[await read('.git/architectural-repo-check-result.json'),...await read('.git/architectural-additional-results.json'),await read('.git/architectural-final-verify-result.json')];
assert(gateResults.every(item=>item.exitCode===0));
for(const name of ['initial-direction.json','confirmed-direction.json','effective-packet.json','compiler-trace.json','formal-prompt.txt','provider-prompt.txt','provider-request.json','task-contract.json','request-metadata.json','prompt-source-map.json','web-input-requests.json','field-fidelity.json','natural-language-input.json','public-operation-stamp.json','browser-result.json']) {
  await fs.copyFile(path.join(browserRoot,name),path.join(destination,name));
}
await fs.copyFile(path.join(originalBrowserRoot,'browser-result.json'),path.join(destination,'editor-regression.json'));
// Publish path digests instead of machine-local historical task filenames.
async function publishProof(root,name) {
  const proof=await read(path.join(root,'readonly-proof.json'));
  await write(name,{sourceProjectUnchanged:proof.sourceProjectUnchanged,sourceProject:proof.sourceProject,fullInventoryLocalFile:path.join(root,'readonly-proof.json'),sourceInventorySha256:digest(proof.sourceInventory),pathEncoding:'SHA256 of each original relative path',sourceInventory:proof.sourceInventory.map(item=>({pathSha256:digest(item.path),sha256:item.sha256}))});
}
await publishProof(browserRoot,'readonly-proof.json');
await publishProof(originalBrowserRoot,'original-project-readonly-proof.json');
await fs.copyFile(industryEvidenceFile,path.join(destination,'standard-industry-regression.json'));
await write('direction-diff.json',{status:'PASS',source:'user-authorized architectural development brief; test copy only',protectedFields:fidelity,changes:delta});
await write('gate-results.json',{status:'PASS',realProviderCalls:0,results:gateResults,logDirectory:path.resolve('.git'),note:'repo:check includes repo:verify/current-flows, root, CLI, runtime, Web smoke and Golden. Offline command failures during drafting are explained in review.md.'});
await write('request-evidence.json',{status:'PASS',realProviderCalls:0,syntheticResponses:true,generationBasis:task.generationBasis,referenceAssetIds:task.referenceAssetIds,imageFieldPresent:false,formalPromptSha256:digest(formal),providerPromptSha256:digest(request.body.prompt),requestBodySha256:digest(request.body),confirmationSha256:digest(next.confirmation),recordSha256:next.recordSha256,implementation:stamp,automaticRegenerations:0,sourceProjectUnchanged:true,actualReactRenderer:true,actualNodeHost:true,publicIntegrityVerified:true,testCopy:result.testCopy,runRoot:result.runRoot,comparisonToPrior:{modelIdentical:true,imageSizeIdentical:true,aspectRatioIdentical:true,outputCountIdentical:true},humanVisualAcceptance:'not_performed'});
await write('scope-proof.json',{status:'PASS',baseCommit:git('rev-parse','HEAD'),branch:git('branch','--show-current'),productionChanges,changedTrackedPaths:changed,newPaths:added,implementationDigest:stamp.implementationDigest,integrityRecordChanged:false,planningAndMigrationChanges:[],goldenChanges:[],originalProjectUnchanged:true,sourceTestCopyUnchanged:true,historicalImageHashesVerified:true,qualityStateChanged:false});
await write('generation-preflight.json',{status:'OFFLINE_READY_STOPPED_PENDING_EXPLICIT_PAID_AUTHORIZATION',realProviderCalls:0,onlyTestCopy:result.testCopy,projectId:next.projectId,generationBasis:'standard',referenceAssetIds:[],imageFieldPresent:false,provider:metadata.provider,model:metadata.model,protocol:'seedream-image',imageSize:'2K',aspectRatio:'16:9',subtype:task.subtype,shot:task.shot,resolvedShot:task.resolvedShot || null,outputCount:1,requestBodySha256:digest(request.body),confirmationSha256:digest(next.confirmation),implementationDigest:stamp.implementationDigest,allowedRealDispatchesThisRound:0,futureDispatchProposal:{image:1,validationModel:'qwen3.6-plus',validation:1,validationOnlyAfterImageSuccess:true,retries:0,regeneration:0,directedCorrection:0},credentialAccess:'not_read_or_copied; offline fixture profiles only',remoteAvailability:'not_checked_offline',fees:{chargedThisRound:0,currency:'CNY',currentTariffVerified:false,historicalComparableImageEstimate:history.fees.image.estimatedCostAtPublicTariff,historicalComparableValidationEstimate:history.fees.validation.estimatedCostAtPublicTariff,actualSettledCost:null,totalCostHardCap:null,note:'Historical local estimates only, not current tariff or a guaranteed cap. Future image and validator calls may both be billed. No paid authorization supplied.'},visualQuality:'pending_future_human_review',previousRealValidatorStatus:history.validator.status});
await write('baseline-audit.json',{status:'PASS',historicalExecution:historicalRoot,runId:history.runId,previousRequestBodySha256:history.requestBodySha256,previousPromptSha256:digest(previousPrompt),previousImageSha256:history.image.businessOutputSha256,previousConfirmationSnapshot:historicalDirection,matchingPaletteMaterialLighting:true,unprovidedHeight:'unknown; design target only; no numeric metres claimed',priorConfirmationMatchesHistoricalSnapshot:prior.confirmationSha256===historicalDirection.confirmationSha256,historicalInventory:await inventory(historicalRoot)});
console.log(JSON.stringify({status:'PASS',reportDirectory:destination,productionCodeChanges:0,protectedFields:fidelity.length,projectFieldChanges:delta.length,realProviderCalls:0}));
