import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { structuredAnalysisPacketFixture } from '../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import { compileShortChainGeneration } from '../src/generation-runtime/generation/compile.js';
import { applyUserConfirmedVisualDecision } from '../src/generation-runtime/generation/user-confirmed-visual-decision.js';
import { previewArtDirectionRequest, sha256 } from './art-direction-review.mjs';

function fixture(industry = 'Hospitality') {
  const packet = structuredAnalysisPacketFixture();
  packet.projectFacts.industry.value = industry;
  const projectId = packet.projectId;
  const task = { projectId, deliverableFamily:'space', subtype:'reception', shot:'entrance_view', generationBasis:'standard', count:1, aspectRatio:'16:9', currentInstruction:'Preserve reception access and privacy.' };
  const confirmation = { schemaVersion:'1.0', id:'approved-spatial-direction', projectId, status:'confirmed', sourceDocument:'Explicit project review', evidenceRefs:['approved-asset'], appliesTo:{deliverableFamilies:['space']},
    creativeDecision:{preserveCore:['Keep the project identity for post-composite']}, abstractions:[],
    spatialTranslation:{ ...structuredClone(packet.mediaTranslations.spatial),
      spatialConcept:'Exhibition courtyard reception with quiet white space and daylight',
      structureLanguage:['Thin translucent partitions filter daylight across the courtyard'],
      signatureSpatialMechanism:['Thin translucent partitions filter daylight across the courtyard'],
      brandRoleManifestation:['One layered pearl art installation'],
      positiveDifferentiators:['Quiet exhibition space'],
      colorBehavior:{primary:[{name:'Warm white',spatialUsage:'dominant_field',role:'background'}],secondary:[],accent:[],forbidden:[]},
      materialLanguage:[{material:'Translucent pearl sheets',behavior:['Daylight transmission across thin layers'],brandRole:'Spatial partition',forbidden:[]}],
      lightingLanguage:{source:['Diffuse daylight'],interactionWithMaterials:['Daylight through thin sheets'],forbidden:[]}
    } };
  return { packet, task, confirmation, input:{projectContext:{projectId,visualDecisionPacket:packet}, task, model:'offline-model'} };
}

test('official space route applies project confirmation before compiler and semantic gates, without mutating history', () => {
  const {input, confirmation, packet} = fixture();
  const before = structuredClone(input);
  const historical = compileShortChainGeneration(input);
  const result = compileShortChainGeneration({...input,userConfirmedVisualDecision:confirmation});
  assert.deepEqual(input,before);
  assert.notEqual(result.compiledPrompt.finalPrompt,historical.compiledPrompt.finalPrompt);
  assert.match(result.compiledPrompt.finalPrompt,/Exhibition courtyard/);
  assert.match(result.compiledPrompt.finalPrompt,/Translucent pearl sheets/);
  assert.match(result.compiledPrompt.finalPrompt,/user_confirmed_design_intent/);
  assert.equal(result.compiledPrompt.userConfirmedVisualDecision.id,confirmation.id);
  assert.equal(result.compiledPrompt.trace.userConfirmedVisualDecision.id,confirmation.id);
  assert.deepEqual(result.compiledPrompt.effectiveVisualDecisionPacket.lockedAssets,packet.lockedAssets);
  assert.ok(result.compiledPrompt.effectiveVisualDecisionPacket.provenance.createdFrom.includes('approved-asset'));
  assert.equal(result.compiledPrompt.trace.decisionTrace.materials[0].evidenceClass,'user_confirmed');
  assert.equal(result.compiledPrompt.preflightReport.status,'pass');
  assert.equal(result.taskContract.generationBasis,'standard');
  assert.deepEqual(result.taskContract.referenceAssetIds,[]);
});

test('project, approval and invalid spatial data fail closed in the official route', () => {
  const {input,confirmation} = fixture();
  for (const change of [ c=>{c.projectId='different-project';}, c=>{c.status='draft';}, c=>{c.spatialTranslation.structureLanguage=[];} ]) {
    const c=structuredClone(confirmation); change(c);
    assert.throws(()=>compileShortChainGeneration({...input,userConfirmedVisualDecision:c}),/USER_CONFIRMED_VISUAL_DECISION_INVALID/);
  }
  const c=structuredClone(confirmation); c.spatialTranslation.functionalNetwork=['大型艺术装置']; c.spatialTranslation.functionalRelationships=['大型艺术装置'];
  assert.throws(()=>compileShortChainGeneration({...input,userConfirmedVisualDecision:c}),/SOURCE_INSUFFICIENT|SEMANTIC/);
});

test('family scope does not apply a spatial confirmation to another deliverable', () => {
  const {packet,confirmation}=fixture();
  assert.equal(applyUserConfirmedVisualDecision(packet,confirmation,packet.projectId,'packaging').packet,packet);
});

test('other medical, restaurant and hotel standard tasks retain their input; no art direction leaks by industry or name', () => {
  for (const industry of ['Medical aesthetics','Restaurant','Hotel']) {
    const {input,confirmation}=fixture(industry);
    const original=compileShortChainGeneration(input);
    compileShortChainGeneration({...input,userConfirmedVisualDecision:confirmation});
    assert.equal(compileShortChainGeneration(input).compiledPrompt.finalPrompt,original.compiledPrompt.finalPrompt);
    assert.doesNotMatch(original.compiledPrompt.finalPrompt,/Exhibition courtyard|Translucent pearl sheets/);
    assert.equal(original.compiledPrompt.userConfirmedVisualDecision,null);
    assert.ok(original.compiledPrompt.trace.decisionTrace.materials.every(item=>item.evidenceClass==='model_proposal'));
  }
});

async function assets(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'art-direction-review-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const bytes=await sharp({create:{width:32,height:32,channels:3,background:'white'}}).png().toBuffer();
  await fs.writeFile(path.join(root,'approved.png'),bytes);
  const item={id:'approved',projectId:'project',path:'approved.png',mimeType:'image/png',role:'approved_art_direction_reference',sha256:sha256(bytes),size_bytes:bytes.length};
  return {root, manifest:{projectId:'project',status:'confirmed',sourceDocumentSha256:sha256('explicit approval'),images:[item]}, projectId:'project',basis:'art_direction_reference',selectedIds:['approved'], model:'doubao-seedream-5-0-pro-260628',prompt:'Explicit offline test'};
}

test('adapter feasibility encodes and verifies actual registered bytes; standard remains zero images', async t => {
  const options=await assets(t);
  const result=await previewArtDirectionRequest(options);
  assert.equal(result.evidence.inputImageCount,1);
  assert.equal(result.evidence.references[0].decodedPayloadSha256,options.manifest.images[0].sha256);
  assert.match(result.body.image[0],/^data:image\/png;base64,/);
  assert.equal('headers' in result,false);
  const standard=await previewArtDirectionRequest({...options,basis:'standard',selectedIds:[]});
  assert.equal('image' in standard.body,false);
  await assert.rejects(previewArtDirectionRequest({...options,basis:'standard'}),/STANDARD_REFERENCE_FORBIDDEN/);
});

test('negative, logo, cross-project, missing, duplicate, unapproved, corrupt and path-traversal references fail closed', async t => {
  const options=await assets(t);
  for (const mutate of [
    o=>{o.manifest.images[0].role='rejected_comparison';},o=>{o.manifest.images[0].role='logo';},
    o=>{o.manifest.images[0].projectId='foreign';},o=>{o.manifest.projectId='foreign';},
    o=>{o.manifest.status='draft';},o=>{o.selectedIds=['missing'];},o=>{o.selectedIds=['approved','approved'];},
    o=>{o.manifest.images[0].sha256='0'.repeat(64);},o=>{o.manifest.images[0].size_bytes=1;},
    o=>{o.manifest.images[0].mimeType='image/jpeg';},o=>{o.manifest.images[0].path='../approved.png';},
    o=>{o.manifest.images[0].path='C:/private.png';},o=>{o.basis='reference_first';}
  ]) { const o=structuredClone(options);mutate(o);await assert.rejects(previewArtDirectionRequest(o)); }
  await fs.writeFile(path.join(options.root,'approved.png'),'not an image');
  const corrupt=Buffer.from('not an image');
  options.manifest.images[0].size_bytes=corrupt.length;options.manifest.images[0].sha256=sha256(corrupt);
  await assert.rejects(previewArtDirectionRequest(options));
});

test('missing files and parent-directory symlinks cannot leave the authorized review root', async t => {
  const options=await assets(t);
  options.manifest.images[0].path='absent.png';
  await assert.rejects(previewArtDirectionRequest(options));
  await fs.symlink(options.root,path.join(options.root,'linked'),process.platform==='win32'?'junction':'dir');
  options.manifest.images[0].path='linked/approved.png';
  await assert.rejects(previewArtDirectionRequest(options),/REFERENCE_SYMLINK_FORBIDDEN/);
});
