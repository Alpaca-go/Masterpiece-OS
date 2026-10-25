// Explicit offline report builder; no integrity/Golden updates or provider transport.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {sha256,readRepo} from './restaurant-knowledge/ftt-fidelity-fixture.ts';
import {sceneInput,compileScene,crossProjects} from './scene-authority-cases.ts';
import {listShortChainTemplateOptions} from '../src/generation-runtime/generation/template-registry.js';
import {isKnownTargetScene,resolveTargetViewStrategy} from '../src/generation-runtime/space/scene-projection/target-scene-projection.js';
const baseline='949a838d0fbdb70f27d600e6a93c4545f8751e12';
const root=new URL('../reports/scene-authority-repair/',import.meta.url);
const json=(name:string,data:any)=>fs.writeFileSync(new URL(name,root),JSON.stringify(data,null,2)+'\n');
const md=(name:string,data:string)=>fs.writeFileSync(new URL(name,root),data.trim()+'\n');
const before=JSON.parse(fs.readFileSync(new URL('before.json',root),'utf8'));
const after=JSON.parse(fs.readFileSync(new URL('after.json',root),'utf8'));
for(const [index,row] of after.rows.entries()) for(const group of ['A','B']) {
  assert.equal(row.groups[group].inputSha256,before.rows[index].groups[group].inputSha256);
  assert.equal(sha256(row.groups[group].formalPrompt),row.groups[group].formalSha256);
  assert.equal(sha256(row.groups[group].providerPrompt),row.groups[group].providerSha256);
}
let networkAttempts=0;globalThis.fetch=async()=>{networkAttempts++;throw new Error('NETWORK_FORBIDDEN');};
const supplementary=crossProjects.map(fixture=>{
  const source=sceneInput('storefront',[fixture.local,fixture.interior]);source.packet.projectFacts.industry.value=fixture.industry;
  const result=compileScene(source);
  return {id:fixture.id,industry:fixture.industry,input:source,
    formalPrompt:result.compiled.compiledPrompt.finalPrompt,providerPrompt:result.provider.prompt,
    trace:result.compiled.compiledPrompt.trace,sourceMap:result.compiled.compiledPrompt.sourceMap};
});
for(const [id,subtype,text] of [
  ['glass-request','storefront','chef preparing food in kitchen visible through storefront glazing'],
  ['glass-negative','storefront','Storefront access must not expose kitchen or dining interiors'],
  ['entrance-local','entrance','店员在入口递交商品'],
  ['network-ambiguous','entrance','入口 → 无法确定的节点']
]) {
  const source=sceneInput(subtype,[],[text]);
  const result=compileScene(source);
  supplementary.push({id,industry:source.packet.projectFacts.industry.value,input:source,
    formalPrompt:result.compiled.compiledPrompt.finalPrompt,providerPrompt:result.provider.prompt,
    trace:result.compiled.compiledPrompt.trace,sourceMap:result.compiled.compiledPrompt.sourceMap});
}
json('supplementary-evidence.json',{counters:{networkAttempts,realModels:0,realImages:0},scenarios:supplementary});
const changes=execFileSync('git',['diff','--name-only','--','packages/visual-workflow/src'],{encoding:'utf8'}).trim().split(/\r?\n/u);
assert.equal(changes.length,3);
const protection=changes.map(path=>({path,oldSha256:sha256(execFileSync('git',['show',`${baseline}:${path}`])),newSha256:sha256(readRepo(path)),approval:'pending'}));
const manifestPath='packages/visual-workflow/implementation-integrity.json';
const manifest=JSON.parse(readRepo(manifestPath).toString('utf8'));
const manifestAudit=manifest.files.map((entry:any)=>({path:entry.path,recordedSha256:entry.sha256,actualSha256:sha256(readRepo(`packages/visual-workflow/${entry.path}`))}));
const changedHashes=manifestAudit.filter((entry:any)=>entry.recordedSha256!==entry.actualSha256);
assert.equal(changedHashes.length,3);
assert.equal(sha256(readRepo(manifestPath)),sha256(execFileSync('git',['show',`${baseline}:${manifestPath}`])));
json('protected-change-approval.json',{baseline,branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),
  status:'candidate_pending_human_review',productionFiles:protection,manifest:{path:manifestPath,sha256:sha256(readRepo(manifestPath)),unchanged:true,
    qualityAcceptance:manifest.qualityAcceptance,checked:manifestAudit.length,mismatches:changedHashes},
  protectedPromptDigestsUpdated:false,goldenUpdated:false,qualityAcceptanceUpdated:false,publicOperations:'blocked_by_existing_integrity_guard',
  userProjectsRead:false,userProjectsWritten:false,knowledgePromoted:false,deployments:0,realAnalysis:0,realImages:0,realValidation:0,retries:0,references:0});
fs.writeFileSync(new URL('candidate.diff',root),execFileSync('git',['diff','--','packages/visual-workflow/src'],{encoding:'utf8'}));
const options=listShortChainTemplateOptions().space;
json('scene-contract-audit.json',{options,subtypes:options.subtypes.map(subtype=>({subtype,known:isKnownTargetScene(subtype),
  disposition:isKnownTargetScene(subtype)?'resolved':'review_required_compile_blocked',
  cameras:options.shots.map(shot=>({shot,...resolveTargetViewStrategy({scene:subtype,shot,shotSource:'user_explicit'})})),
  defaultCamera:resolveTargetViewStrategy({scene:subtype,shot:'front',shotSource:'legacy_project_default'})})),
  sources:{user_explicit:'preserve exact requested shot',target_scene_default:'scene-owned default',legacy_project_default:'scene-owned default when mapped'},
  cameraDoesNotGrantInteriorVisibility:true,custom:'unresolved without an existing explicit target functional program; blocked',
  noSubtype:'low-level inspection compatibility only; public task contract rejects missing subtype',
  windowVisibility:'pending_interface_review_no_new_production_fields'});
const cell=(value:any)=>String(value??'').replaceAll('|',' / ').replaceAll('\n',' ');
const rows:any[]=[];
function collect(id:string,trace:any,formal:string,provider:string) {
  const authority=trace.spaceGeneration.targetSceneAuthority;
  for(const entry of trace.decisionTrace.sceneScope ?? []) for(const clause of entry.clauses ?? []) {
    const output=clause.sceneScope==='current_shot' || clause.sceneScope==='cross_scene_constraint' ? clause.text : '';
    const formalMatch=!!output && formal.includes(output),providerMatch=!!output && provider.includes(output);
    rows.push({scenario:id,sourcePath:entry.sourcePath,sourceOrigins:entry.sourceOrigins,sourceValue:entry.text,clause:clause.text,
      normalizedEntities:clause.entities,nodes:clause.nodes,range:[clause.sourceStart,clause.sourceEnd],targetScene:authority.targetScene,
      cameraSource:authority.shotSource,visibilityAuthority:clause.visibilityAuthority,projection:clause.sceneScope,
      disposition:clause.sceneScope==='review_required'?'review_required':formalMatch && providerMatch?'rendered':'withheld',
      formalMatch,providerMatch,output});
  }
  for(const entry of trace.decisionTrace.visibleRequirements ?? []) rows.push({scenario:id,sourcePath:entry.sourcePath,
    sourceValue:entry.text,normalizedEntities:entry.sceneProjection.clauses.flatMap((clause:any)=>clause.entities ?? []),
    targetScene:authority.targetScene,cameraSource:authority.shotSource,visibilityAuthority:entry.owner?'current_executable_owner':'none',
    projection:entry.sceneProjection.sceneScope,traceDisposition:entry.disposition,
    disposition:entry.finalPromptRetained?'rendered':entry.disposition==='review_required'?'review_required':'withheld',owner:entry.owner,
    formalMatch:!!entry.outputText && formal.includes(entry.outputText),providerMatch:!!entry.outputText && provider.includes(entry.outputText),output:entry.outputText});
}
for(const row of after.rows) for(const group of ['A','B']) {
  const result=row.groups[group];collect(`${row.scene.subtype}/${group}`,result.trace,result.formalPrompt,result.providerPrompt);
}
for(const row of supplementary) collect(row.id,row.trace,row.formalPrompt,row.providerPrompt);
json('field-lineage.json',rows);
md('field-evidence.md',`# 逐字段 / 子句可见性证据\n\n原句、原路径、来源别名、子句区间、网络节点与 trace 见 [完整血缘](field-lineage.json)。匹配仅说明文本进入 Prompt，不代表视觉质量。\n\n| 场景 | 源字段 / 原值 | 规范实体 | 目标 / 权威 | 投影 / 处置 | 正式 / Provider 匹配 |\n| --- | --- | --- | --- | --- | --- |\n${rows.map(row=>`| ${cell(row.scenario)} | ${cell(row.sourcePath)}: ${cell(row.clause||row.sourceValue)} | ${cell((row.normalizedEntities??[]).map((entity:any)=>entity.value+'→'+entity.scene).join(', '))} | ${cell(row.targetScene)} / ${cell(row.visibilityAuthority)} | ${cell(row.projection)} / ${cell(row.disposition)} | ${row.formalMatch} / ${row.providerMatch} |`).join('\n')}`);
for(const [index,row] of after.rows.entries()) {
  const original=before.rows[index];
  assert.deepEqual(original.task,row.task);
  let text=`# ${row.scene.subtype} / ${row.scene.shot} 修复前后离线对照\n\n相同历史派生输入和任务；不是用户实际 Run 或视觉验收。\n`;
  for(const group of ['A','B']) for(const [label,result] of [['修复前',original.groups[group]],['修复后',row.groups[group]]] as any[]) {
    text+=`\n## ${group} ${label}\n\n正式 SHA256: ${result.formalSha256}；Provider SHA256: ${result.providerSha256}\n\n场景权威：\n\n\`\`\`json\n${JSON.stringify(result.audit.authority,null,2)}\n\`\`\`\n\n正式 Prompt：\n\n\`\`\`text\n${result.formalPrompt}\n\`\`\`\n\nProvider Prompt：\n\n\`\`\`text\n${result.providerPrompt}\n\`\`\`\n`;
  }
  md(`prompts-${row.scene.subtype}.md`,text);
}
assert.equal(networkAttempts,0);
const failureAudit=['workflow','current-flows'].map(name=>{
  const log=`logs/final-${name}.txt`,body=fs.readFileSync(new URL(log,root),'utf8');
  const detail=body.split('✖ failing tests:')[1] || '';
  const failures=detail.split(/(?=test at )/u).filter(block=>block.includes('test at ')).map(block=>({
    location:block.split(/\r?\n/u)[0],test:block.split(/\r?\n/u).find(line=>line.startsWith('✖ ')),
    category:block.includes('VISUAL_WORKFLOW_IMPLEMENTATION_CHANGED')?'pending_integrity_approval':
      block.includes('SPACE_TARGET_SCENE_AUTHORITY_UNRESOLVED: custom')?'unmapped_custom_intentionally_closed':'unexpected_regression'}));
  assert.ok(failures.every(failure=>failure.category!=='unexpected_regression'));
  return {name,log,failures};
});
json('failure-audit.json',failureAudit);
console.log(`Review artifacts: ${rows.length} field/clause rows; ${protection.length} pending file hashes; zero network`);
