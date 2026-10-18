import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { sha256, previewArtDirectionRequest } from './art-direction-review.mjs';
import { compileShortChainGeneration } from '../src/generation-runtime/generation/compile.js';
import { validateProjectVisualContext } from '../src/runtime/project-visual-context-builder.js';
import { validateSpatialSemantics } from '../src/generation-runtime/space/semantic/validate-spatial-semantics.js';

// Local review command only: no service.start, credentials or provider execution.
globalThis.fetch = async () => { throw new Error('OFFLINE_ART_DIRECTION_NETWORK_FORBIDDEN'); };
const [project, bundle, output, priorTaskFile, inputFile] = process.argv.slice(2).map(value => path.resolve(value));
if (!inputFile) throw new Error('Usage: capture-art-direction.mjs PROJECT BUNDLE OUTPUT PRIOR_TASK PROJECT_INPUT');
const repo = fileURLToPath(new URL('../../../', import.meta.url));
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
async function inventory(root) {
  const out=[];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir,{withFileTypes:true})) {
      const file=path.join(dir,entry.name);
      if (entry.isSymbolicLink()) throw new Error('REVIEW_INPUT_SYMLINK_FORBIDDEN');
      if (entry.isDirectory()) await walk(file);
      else out.push({path:path.relative(root,file).replaceAll('\\','/'),sha256:sha256(await fs.readFile(file))});
    }
  }
  await walk(root);return out.sort((a,b)=>a.path.localeCompare(b.path));
}
assert(!output.startsWith(project+path.sep) && output!==project && !output.startsWith(bundle+path.sep) && output!==bundle);
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.mkdir(output); // Preserve every previous review, never overwrite it.
const write=(name,value)=>fs.writeFile(path.join(output,name),JSON.stringify(value,null,2)+'\n');
const before=await inventory(project);
const bundleBefore=await inventory(bundle);
const context=await read(path.join(project,'project-context/project-visual-context.vnext.json'));
const originalPacket=await read(path.join(project,'project-context/visual-decision-packet.json'));
const confirmation=await read(inputFile);
assert.equal(context.projectId,confirmation.projectId);
assert.deepEqual(context.visualDecisionPacket,originalPacket);
assert.equal(validateProjectVisualContext(context).valid,true);
const previousTask=await read(priorTaskFile);
const model='doubao-seedream-5-0-pro-260628';
const instruction=confirmation.reviewTask.currentInstruction;
const task={...previousTask,taskId:'art-direction-review',currentInstruction:instruction,mustAvoid:confirmation.reviewTask.mustAvoid,referenceAssetIds:[]};
assert.equal(task.generationBasis,'standard');assert.equal(task.subtype,'reception');assert.equal(task.shot,'entrance_view');assert.equal(task.aspectRatio,'16:9');assert.equal(task.count,1);

// Replay the exact HEAD compiler in an ignored review tree to prove the
// authority wiring defect; never checkout/reset source or load shared business code.
const baseline=path.join(output,'baseline-package');
await fs.cp(path.join(packageRoot,'src'),path.join(baseline,'src'),{recursive:true});
for (const relative of ['generation-runtime/generation/compile.js','generation-runtime/generation/user-confirmed-visual-decision.js','generation-runtime/space/compiler.js','generation-runtime/space/source-adapter.js']) {
  const bytes=execFileSync('git',['show',`HEAD:packages/visual-workflow/src/${relative}`],{cwd:repo});
  await fs.writeFile(path.join(baseline,'src',relative),bytes);
}
const baselineCompile=(await import(pathToFileURL(path.join(baseline,'src/generation-runtime/generation/compile.js')).href)).compileShortChainGeneration;
const input={projectContext:context,model,task};
const snapshot=JSON.stringify(input);
const old=baselineCompile(input);
const oldWithConfirmation=baselineCompile({...input,userConfirmedVisualDecision:confirmation});
assert.equal(old.compiledPrompt.finalPrompt,oldWithConfirmation.compiledPrompt.finalPrompt);
const standardUnchanged=compileShortChainGeneration(input);
assert.equal(standardUnchanged.compiledPrompt.finalPrompt,old.compiledPrompt.finalPrompt);
const result=compileShortChainGeneration({...input,userConfirmedVisualDecision:confirmation});
assert.equal(JSON.stringify(input),snapshot);
assert.equal(result.compiledPrompt.preflightReport.status,'pass');
const effective=result.compiledPrompt.effectiveVisualDecisionPacket;
const semantic=validateSpatialSemantics(effective.mediaTranslations.spatial);
assert.equal(semantic.status,'pass');
assert.equal(result.compiledPrompt.userConfirmedVisualDecision.id,confirmation.id);

const zipManifest=await read(path.join(bundle,'reference-manifest.json'));
const doc=await fs.readFile(path.join(bundle,'jiuzhou-art-direction.md'));
for (const item of zipManifest.images) {
  const registered=bundleBefore.find(entry=>entry.path===item.path);
  assert(registered && registered.sha256===item.sha256,'Attachment manifest digest mismatch');
  assert.equal((await fs.stat(path.join(bundle,item.path))).size,item.size_bytes);
}
const manifest={projectId:confirmation.projectId,status:'confirmed',sourceDocumentSha256:sha256(doc),source:'User attachment and explicit 2026-10-18 request',images:zipManifest.images.map(item=>({...item,id:path.basename(item.path).replace(/\.[^.]+$/u,''),projectId:confirmation.projectId,mimeType:item.path.endsWith('.png')?'image/png':'image/jpeg'}))};
const selectedIds=['approved-translucent-canopy','approved-sculptural-ceiling','approved-pearl-installation','approved-gallery-entrance'];
const standard=await previewArtDirectionRequest({root:bundle,manifest,projectId:confirmation.projectId,basis:'standard',selectedIds:[],model,prompt:result.compiledPrompt.finalPrompt});
const mapping='Input images in order: image 1 — primary architectural target: thin translucent canopy and spatial continuity; image 2 — secondary architectural target: thin layered structure integrated with space; image 3 — pearl optical layering and installation scale; image 4 — gallery negative space, daylight and restrained palette. Transfer attributes, not a collage. Use one primary artistic system. Do not reproduce text, logos or watermarks visible in these references. Target use remains a working reception with waiting, access and consultation privacy.\n\n';
const reference=await previewArtDirectionRequest({root:bundle,manifest,projectId:confirmation.projectId,basis:'art_direction_reference',selectedIds,model,prompt:mapping+result.compiledPrompt.finalPrompt});
await write('registered-references.json',manifest);
await write('task-contract.json',result.taskContract);
await write('project-input.json',confirmation);
await write('standard-request.json',standard);
await write('reference-request.json',reference); // Contains the actual base64 bytes; ignored, local only.
await write('request-evidence.json',reference.evidence);
await fs.writeFile(path.join(output,'formal-prompt.txt'),result.compiledPrompt.finalPrompt);
await fs.writeFile(path.join(output,'provider-prompt.txt'),standard.body.prompt);
await fs.writeFile(path.join(output,'reference-provider-prompt.txt'),reference.body.prompt);
await fs.writeFile(path.join(output,'historical-proposals-prompt.txt'),old.compiledPrompt.finalPrompt);
await write('source-trace.json',result.compiledPrompt);

const fields=['creativeDecision','abstractions','mediaTranslations.spatial','colorSystem','materialSystem','lightingSystem'];
const get=(value,keys)=>keys.split('.').reduce((v,key)=>v?.[key],value);
const conflicts=[];
function compare(value,rootPath) {
  if (typeof value==='string') {
    const replacement=get(effective,rootPath.replace(/\[(\d+)\]/gu,'.$1'));
    if (replacement!==value) conflicts.push({sourcePath:rootPath,original:value,sourceType:'historical_model_proposal',executionAuthority:'superseded_by_explicit_project_user_direction',handling:'read_only_original_retained; replaced_in_compilation_memory_only',replacement:replacement??null,stillInHistoricalPrompt:old.compiledPrompt.finalPrompt.includes(value),stillInFinalPrompt:result.compiledPrompt.finalPrompt.includes(value)});
  } else if (Array.isArray(value)) value.forEach((item,i)=>compare(item,`${rootPath}[${i}]`));
  else if (value && typeof value==='object') for (const [key,item] of Object.entries(value)) compare(item,`${rootPath}.${key}`);
}
for (const field of fields) compare(get(originalPacket,field),field);
await write('conflict-matrix.json',conflicts);
const keyConflicts=conflicts.filter(item=>/紫色|S形|灯带|艺术吊灯|科技感|神秘|灯光在墙面|Logo与抽象/.test(item.original));
assert(keyConflicts.filter(item=>item.stillInFinalPrompt).length===0,'Conflicting historical wording leaked into final prompt');
await write('review-proof.json',{
  baselineCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),
  modelCalls:0,credentialsRead:false,historyUnchanged:JSON.stringify(before)===JSON.stringify(await inventory(project)),bundleUnchanged:JSON.stringify(bundleBefore)===JSON.stringify(await inventory(bundle)),
  projectInventory:before,bundleInventory:bundleBefore,contextSha256:sha256(JSON.stringify(context)),projectInputSha256:sha256(await fs.readFile(inputFile)),
  baselineIgnoresConfirmation:true,unconfirmedStandardPromptUnchanged:true,
  formalPromptSha256:sha256(result.compiledPrompt.finalPrompt),formalPromptCharacters:[...result.compiledPrompt.finalPrompt].length,
  standardInputImages:0,referencePreviewInputImages:4,referenceProductionRouteAvailable:false,
  semanticGate:semantic,compileGate:result.compiledPrompt.preflightReport,
  keyConflicts,changedLeafCount:conflicts.length,unknown:['material thickness','manufacturing and fastening','exact color area ratios','visual quality pending human acceptance']
});
assert.deepEqual(before,await inventory(project));assert.deepEqual(bundleBefore,await inventory(bundle));
console.log(JSON.stringify({output,modelCalls:0,standardInputImages:0,referencePreviewInputImages:4,formalPromptCharacters:[...result.compiledPrompt.finalPrompt].length,changedLeafCount:conflicts.length}));
