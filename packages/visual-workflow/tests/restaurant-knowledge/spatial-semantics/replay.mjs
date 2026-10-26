// Explicit, offline artifact replay. This is not a .test file and no test or
// production module discovers machine-local inputs automatically.
import {networkAttempts} from './network-off.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {classifyPhrase} from '../../../src/generation-runtime/space/semantic/separate-space-semantics.js';
import {validateSpatialSemantics,separateSpatialFunctionalSemantics} from '../../../src/generation-runtime/space/semantic/validate-spatial-semantics.js';
import {completeStructuredAnalysis} from '../../../src/analysis-decisions/analysis-completion-orchestrator.js';
const [archivePath,outPath]=process.argv.slice(2);
assert(archivePath && outPath,'Usage: replay.mjs <archived artifact-manifest.json> <new offline output directory>');
const repository=fileURLToPath(new URL('../../../../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=async filename=>JSON.parse(await fs.readFile(filename,'utf8'));
const manifest=await read(archivePath);
for(const a of manifest.artifacts)assert.equal(sha(await fs.readFile(a.path)),a.sha256,'ARCHIVED_ARTIFACT_CHANGED');
const archiveDir=path.dirname(path.resolve(archivePath));
const index=await read(path.join(archiveDir,'report-checksums.json'));
for(const a of index.files)assert.equal(sha(await fs.readFile(path.join(archiveDir,a.path))),a.sha256,'ARCHIVED_REPORT_CHANGED');
const packetRecord=manifest.artifacts.find(a=>path.basename(a.path)==='visual-decision-packet.json');
assert(packetRecord,'ARCHIVED_PACKET_REQUIRED');
const packet=await read(packetRecord.path),original=JSON.stringify(packet);
const baseline='2302aa9fd39af0cee613e98f1e1a54cdd94b741e';
const prefix='packages/visual-workflow/src/';
async function historicalModule(relative,replacements={}) {
  const filename=prefix+relative;
  let source=execFileSync('git',['show',baseline+':'+filename],{cwd:repository,encoding:'utf8'});
  source=source.replace(/from\s+(['"])(\.{1,2}\/[^'"]+)\1/gu,(_match,_quote,reference)=>{
    const url=replacements[reference] || new URL(reference,pathToFileURL(path.join(repository,filename))).href;
    return 'from '+JSON.stringify(url);
  });
  return 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
}
const beforeClassifierUrl=await historicalModule('generation-runtime/space/semantic/separate-space-semantics.js');
const beforeClassifier=await import(beforeClassifierUrl);
const beforeGate=await import(await historicalModule('generation-runtime/space/semantic/validate-spatial-semantics.js',{'./separate-space-semantics.js':beforeClassifierUrl}));
const beforeCompletion=await import(await historicalModule('analysis-decisions/analysis-completion-orchestrator.js'));
let beforeRepairAttempts=0,candidateModelAttempts=0;
const noModel=async()=>{candidateModelAttempts++;throw new Error('OFFLINE_MODEL_FORBIDDEN');};
const before=await beforeCompletion.completeStructuredAnalysis({packet:structuredClone(packet),deliverable:'space',execution:{outputLanguage:'zh-CN'},projectLanguage:'zh-CN',
  validateFinalPacket:p=>beforeGate.validateSpatialSemantics(p.mediaTranslations.spatial),
  repairInvalidFinalPacket:async()=>{beforeRepairAttempts++;throw Object.assign(new Error('SIMULATED_EXISTING_BUDGET_REFUSAL_NO_MODEL_RESULT'),{code:'DISPATCH_LIMIT'});},model:noModel});
const separated=separateSpatialFunctionalSemantics(packet.mediaTranslations.spatial);
const candidate=await completeStructuredAnalysis({packet:structuredClone(packet),deliverable:'space',execution:{outputLanguage:'zh-CN'},projectLanguage:'zh-CN',
  validateFinalPacket:p=>validateSpatialSemantics(p.mediaTranslations.spatial),
  repairFinalPacketDeterministically:({packet:p})=>{
    const result=separateSpatialFunctionalSemantics(p.mediaTranslations.spatial),next=structuredClone(p);
    next.mediaTranslations.spatial=result.spatial;
    return {packet:next,changes:result.changes,unresolved:result.unresolved};
  },repairInvalidFinalPacket:noModel,model:noModel});
assert.equal(JSON.stringify(packet),original,'SOURCE_PACKET_MUTATED');
assert.equal(sha(await fs.readFile(packetRecord.path)),packetRecord.sha256);
assert.equal(candidateModelAttempts,0);assert.equal(networkAttempts(),0);
const fields=['functionalNetwork','functionalRelationships','mustBeVisible','sceneProgram','brandRoleManifestation','peopleBehavior'];
const rows=(spatial,classifier)=>fields.flatMap(field=>(spatial[field]||[]).map((value,index)=>({field,index,value,classification:classifier(value,field)})));
const evidence={baselineCommit:baseline,verifiedArchiveArtifacts:manifest.artifacts.length,verifiedArchiveReports:index.files.length,
  sourcePacketSha256:packetRecord.sha256,sourceFingerprint:packet.provenance.sourceFingerprint,
  before:{validation:beforeGate.validateSpatialSemantics(packet.mediaTranslations.spatial),completionStatus:before.status,
    rejectedRepairInvocations:beforeRepairAttempts,simulatedRefusalOnly:true,modelResultSupplied:false,
    rows:rows(packet.mediaTranslations.spatial,beforeClassifier.classifyPhrase)},
  candidate:{status:['ready','ready_with_warnings'].includes(candidate.status)?'OFFLINE_CANDIDATE_PASS':'OFFLINE_CANDIDATE_FAILED',
    completionStatus:candidate.status,modelCallCount:candidate.modelCallCount,validation:validateSpatialSemantics(separated.spatial),
    changes:separated.changes,unresolved:separated.unresolved,rows:rows(separated.spatial,classifyPhrase)},
  networkAttempts:networkAttempts(),candidateModelAttempts,sourcePacketMutated:false,
  formalProjectStateChanged:false,notFormalAnalysisSuccess:true,notImageQualityAcceptance:true};
await fs.mkdir(outPath,{recursive:true});
await fs.writeFile(path.join(outPath,'replay-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
await fs.writeFile(path.join(outPath,'offline-candidate-packet.json'),JSON.stringify(candidate.packet,null,2)+'\n');
console.log(JSON.stringify({before:before.status,candidate:evidence.candidate.status,changes:separated.changes.length,
  unresolved:separated.unresolved.length,modelRequests:candidateModelAttempts,networkAttempts:networkAttempts(),originalUnchanged:true}));
