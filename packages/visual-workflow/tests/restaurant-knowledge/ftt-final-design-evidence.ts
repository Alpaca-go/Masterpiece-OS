// Explicit offline review artifact writer. No production changes or user-project APIs.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {compileFinalDesign} from './ftt-final-design-compile.ts';
import {baseline,model,windowGoal} from './ftt-final-design-fixture.ts';
import {readRepo,sha256} from './ftt-fidelity-fixture.ts';
import {verifyImplementation} from '../../src/integrity.js';
import {analysisDirectionSuggestion} from '../../src/analysis-direction-suggestion.js';
import {compileShortChainGeneration} from '../../src/generation-runtime/generation/compile.js';
import {classifyPhrase} from '../../src/generation-runtime/space/semantic/separate-space-semantics.js';
const directory=new URL('../../reports/ftt-final-design/',import.meta.url);
fs.mkdirSync(directory,{recursive:true});
const json=(name:string,value:any)=>fs.writeFileSync(new URL(name,directory),JSON.stringify(value,null,2)+'\n');
const md=(name:string,value:string)=>fs.writeFileSync(new URL(name,directory),value.trim()+'\n');
const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8',maxBuffer:30*1024*1024});
let networkAttempts=0;globalThis.fetch=async()=>{networkAttempts++;throw new Error('NETWORK_FORBIDDEN');};
const implementation=await verifyImplementation(),result=compileFinalDesign(),fixture=result.fixture;
const sourceFiles=[
  'space-generator/quality-baselines/current-verification/source-packets/_packets/feng-tang-tang/visual-decision-packet.json',
  'space-generator/quality-baselines/current-verification/space-golden/feng-tang-tang/golden-selection.json',
  'space-generator/quality-baselines/current-verification/space-golden/feng-tang-tang/final-dining-1/evaluation.json',
  'space-generator/quality-baselines/current-verification/space-golden/feng-tang-tang/final-dining-1/manifest.json',
  'space-generator/quality-baselines/current-verification/space-golden/feng-tang-tang/final-dining-1/prompt.md',
  'packages/visual-workflow/reports/restaurant-knowledge/ftt-direction-proposal.json',
  'packages/visual-workflow/reports/restaurant-knowledge/ftt-evidence-trace.md',
  'packages/visual-workflow/reports/restaurant-knowledge/rks-candidate-knowledge.json',
  'packages/visual-workflow/reports/restaurant-shadow/RKS-02A-report.md',
  'packages/visual-workflow/reports/restaurant-shadow/direction-conflict-matrix.json',
  'packages/visual-workflow/reports/restaurant-shadow/ftt-shadow-result.json',
  'packages/visual-workflow/reports/restaurant-fidelity/AB-review.md',
  'packages/visual-workflow/reports/restaurant-fidelity/compiled-evidence.json',
  'packages/visual-workflow/reports/scene-authority-repair/README.md',
  'packages/visual-workflow/reports/scene-authority-repair/after.json',
  'packages/visual-workflow/reports/scene-authority-integrity/README.md',
  'packages/visual-workflow/reports/scene-authority-integrity/manifest-change-audit.json',
  'packages/visual-workflow/reports/scene-authority-integrity/closure-evidence.json'
];
const sources=sourceFiles.map(path=>({path,sha256:sha256(readRepo(path)),unchangedFromBaseline:readRepo(path).equals(execFileSync('git',['show',`${baseline}:${path}`],{maxBuffer:30*1024*1024}))}));
assert.ok(sources.every(source=>source.unchangedFromBaseline));
const selection=JSON.parse(readRepo(sourceFiles[1]).toString('utf8'));
const evaluation=JSON.parse(readRepo(sourceFiles[2]).toString('utf8'));
const imageRelative='space-generator/quality-baselines/current-verification/space-golden/feng-tang-tang/final-dining-1/output.png';
const repository=new URL('../../../../',import.meta.url);
const imagePresent=fs.existsSync(fileURLToPath(repository)+imageRelative);
json('source-index.json',{baseline,sources,userInstruction:{ref:fixture.userDirection.source,transcription:fixture.userDirection,
  assertion:'user-confirmed design goals only; not verified current property facts'},
  historicalAcceptance:{selection:selection.golds[0],materialNote:evaluation.dimensions.materialAndLighting.note,
    compositionNote:evaluation.dimensions.composition.note,imagePath:imageRelative,imagePresent,
    imageInspected:false,recordedImageSha256:selection.golds[0].imageSha256,newQualityScore:null,
    limitation:'Historical text acceptance is reviewed; no new image inspection or acceptance is claimed'},
  historicalPacketProvenance:'Original analysis provenance is preserved as historical source metadata; it does not describe new model analysis of B',
  actualImage1RunAssociation:'undetermined'});
json('experimental-inputs.json',{scope:result.scope,originalProjectId:fixture.originalProjectId,logicalKnowledgeOwner:fixture.logicalKnowledgeOwner,
  currentUserProjectAssociation:null,commonChanges:fixture.commonChanges,A:fixture.A,
  BByScene:Object.fromEntries(fixture.variants.map(row=>[row.scene.subtype,{packet:row.B,task:row.task}]))});
json('field-deltas.json',{commonIntakeAdaptation:fixture.commonChanges,deltas:fixture.deltas,
  originalFullGlobalNetwork:fixture.historical.mediaTranslations.spatial.functionalNetwork,
  preservedGlobalChain:fixture.B.mediaTranslations.spatial.functionalNetwork[0],unknowns:fixture.unknowns,
  materialBehaviorAuthority:'Qualitative color-character transcription, not measured optics or automatic approval of a finish'});
const cell=(value:any)=>JSON.stringify(value).replaceAll('|',' / ').replaceAll('\n',' ');
md('field-diff.md',`# A → B 字段差异\n\n仅实验 Packet 变化；正式 Compiler、模板与 B1 决策未修改。common 表示所有 B 镜头共同方向，具体镜头行覆盖 common。每项原值、目标值、来源及待确认状态完整保存在 [field-deltas.json](field-deltas.json)。\n\n共同入口适配：A/B 均不使用原硬可见品牌文字；原 mustBeVisible 的 0、1、3 项转人工后期合成清单，A 保留第 2 项，B 则另选明确的经营假设。原始 Packet 仍被语义门禁拒绝。\n\n| 范围 / 字段 | 类别 | A 或共同 B 原值 | B 新值 | 原因 / 来源 |\n| --- | --- | --- | --- | --- |\n${fixture.deltas.map(delta=>`| ${delta.scene} / ${delta.path} | ${delta.category} | ${cell(delta.before)} | ${cell(delta.after)} | ${delta.reason} / ${delta.evidenceRefs.join(', ')} |`).join('\n')}\n\nC/D 未提升为 A；材料色感与参数未知分开。B 未形成任何人工确认记录。`);
const oldPhrase='wooden dining tables and chairs with accessible service aisles in dining area';
const revised=fixture.B.mediaTranslations.spatial.mustBeVisible[4];
json('authoring-normalization.json',{kind:'experiment_author_wording_not_compiler_patch',before:oldPhrase,after:revised,
  beforeClassification:classifyPhrase(oldPhrase,'mustBeVisible'),afterClassification:classifyPhrase(revised,'mustBeVisible'),
  reason:'Explicit table and opposing-side access relation authored for the experiment; singular exemplifies the furniture relation without specifying a count. No protected classifier or existing expectation was modified.'});
const rows=result.rows.map(row=>{
  const visible=row.B.trace.decisionTrace.visibleRequirements;
  const coreReady=row.scene.subtype==='dining' && visible.every((entry:any)=>entry.disposition==='retained' && entry.owner && entry.finalPromptRetained);
  if(row.scene.subtype==='dining') assert.ok(coreReady);
  const readiness={offlineInputStatus:coreReady?'complete_for_qualitative_design_review':row.scene.subtype==='storefront'?'partial_exterior_only':'conditional_entrance_boundary_only',
    displayStatus:coreReady?'等待人工确认与模型授权':row.scene.subtype==='storefront'?'未获得完整生图许可：隔窗可见待审核':'入口局部方案待人工审核；局部堂食视线未授权',
    humanConfirmed:false,modelAuthorized:false,readyToInvoke:false,visualQuality:'not_evaluated',
    sceneBlockers:row.scene.subtype==='dining'?[]:row.scene.subtype==='storefront'?['window_visibility_review_required','exterior_material_suitability_and_street_conditions_unknown']:['partial_dining_interior_visibility_not_authorized'],
    pendingHumanDecisions:['qualitative material and palette direction','open-kitchen layout as a design proposal, not an existing-property fact','raw B versus advisory B* text','actual model-call budget and authorization'],
    otherScenesDoNotBlockThisScene:true};
  const rawRefusal:any={};
  try {compileShortChainGeneration({projectContext:{visualDecisionPacket:fixture.historical},task:structuredClone(row.A.task),model});rawRefusal.status='compiled';}
  catch(error:any) {rawRefusal.status='blocked';rawRefusal.code=error.code;rawRefusal.message=error.message;}
  assert.equal(rawRefusal.code,'ANALYSIS_SPATIAL_SEMANTICS_INVALID');
  const path=`prompts-${row.scene.subtype}.md`;
  let text=`# ${row.scene.subtype} / ${row.scene.shot}：RKS-02D 完整文本对照\n\nA 是公开后期合成适配后的历史分析对照，不是可直接生图的原始 Packet；B 是待确认实验方向。两者任务、模型和 Provider 参数相同。没有真实请求。\n\n\`\`\`json\n${JSON.stringify({controls:row.controls,task:row.A.task,providerBodyExceptPrompt:{...row.B.providerBody,prompt:'see below'},readiness},null,2)}\n\`\`\`\n`;
  for(const group of ['A','B']) {
    const compiled=row[group];
    text+=`\n## ${group}：正式 Compiler 输出\n\nSHA256: ${compiled.formalSha256}\n\n\`\`\`text\n${compiled.formalPrompt}\n\`\`\`\n\n## ${group}：离线 Provider Prompt\n\nSHA256: ${compiled.providerSha256}。只格式化请求，没有调用 transport。\n\n\`\`\`text\n${compiled.providerBody.prompt}\n\`\`\`\n`;
  }
  text+=`\n## B*：仅实验副本的人工审阅建议稿\n\n这是正式 B 输出的建议修订副本，不是 Compiler 输出、已确认 Prompt 或获准 Provider 请求。SHA256: ${row.advisory.sha256}。正式路由及指纹需在未来执行前另行复核。\n\n\`\`\`text\n${row.advisory.text}\n\`\`\`\n`;
  md(path,text);
  return {scene:row.scene,controls:row.controls,task:row.A.task,readiness,rawHistoricalPacket:rawRefusal,promptDocument:path,
    A:{inputSha256:row.A.inputSha256,formalSha256:row.A.formalSha256,providerSha256:row.A.providerSha256,sourceMap:row.A.sourceMap,trace:row.A.trace,preflight:row.A.preflight},
    B:{inputSha256:row.B.inputSha256,formalSha256:row.B.formalSha256,providerSha256:row.B.providerSha256,sourceMap:row.B.sourceMap,trace:row.B.trace,preflight:row.B.preflight},
    advisory:{...row.advisory,text:undefined,promptDocument:path},
    windowGoalAudit:row.scene.subtype==='storefront'?visible.find((entry:any)=>entry.text===windowGoal):null};
});
json('compiled-evidence.json',{scope:result.scope,rows});
json('template-advisory-patches.json',{protectedTemplatesModified:false,advisoryIsOfficialCompilerOutput:false,
  retainedRenderingQualityText:'High-end architectural visualization, photoreal, physically based materials.',
  retainedNegativeGuard:'no generic AI clinic look',scenes:result.rows.map(row=>({scene:row.scene.subtype,...row.advisory,text:undefined}))});
const b1Drafts=fixture.variants.map(row=>{
  const projection=analysisDirectionSuggestion(row.B.projectId,row.B,sha256(JSON.stringify(row.B)));
  return {scene:row.scene.subtype,status:'review_only_not_save_payload',projectId:row.B.projectId,sourceType:'RKS02D_manual_experiment_draft',
    projection,fieldDeltaRefs:fixture.deltas.filter(delta=>delta.scene==='common'||delta.scene===row.scene.subtype).map(delta=>({path:delta.path,category:delta.category,evidenceRefs:delta.evidenceRefs})),
    humanConfirmed:false,saveCalled:false,confirmCalled:false,existingDecisionModified:false};
});
json('b1-future-drafts.json',{scope:'Source-traceable suggestions for future explicit manual transfer; not product integration',
  userGoalLane:fixture.userDirection,historicalAndHypothesisLanes:fixture.deltas.filter(delta=>delta.category!=='A'),drafts:b1Drafts,
  warning:'Original B1 sourceType labels remain projector metadata; input is an authored experiment, not a new model analysis or persisted user decision'});
const cards=JSON.parse(readRepo('packages/visual-workflow/reports/restaurant-knowledge/rks-candidate-knowledge.json').toString('utf8'));
json('knowledge-use.json',{productionRksIntegrated:false,rksMode:'offline_shadow_only',projectOwnerAlias:{originalProjectId:fixture.originalProjectId,logicalKnowledgeOwner:fixture.logicalKnowledgeOwner,currentUserProjectAssociation:null},
  selected:fixture.selectedKnowledge.map(selected=>({selection:selected,originalCard:cards.find((card:any)=>card.knowledgeId===selected.id),
    adoption:'manual experiment-only selection',stateUpdated:false,validatedCasesUpdated:false})),
  redBrick:'not applied to core B; independent optional material review',operations:'historical observation translated explicitly by offline author; not newly confirmed property',
  actualImage1RunAssociation:'undetermined',knowledgePromoted:false});
const protectedRoots=['packages/visual-workflow/src','packages/visual-workflow/prompts','packages/visual-workflow/implementation-integrity.json',
  'apps/web/src/features/visual-workflow','packages/visual-workflow/offline','packages/visual-workflow/reports/restaurant-knowledge',
  'packages/visual-workflow/reports/restaurant-shadow','packages/visual-workflow/reports/restaurant-fidelity','packages/visual-workflow/reports/scene-authority-integrity',
  'packages/visual-workflow/reports/p7b-single-generation','evaluation','space-generator','config/repository-contract','package-lock.json'];
assert.equal(git('diff',baseline,'--name-only','--',...protectedRoots).trim(),'');
const manifestPath='packages/visual-workflow/implementation-integrity.json';
assert.deepEqual(readRepo(manifestPath),execFileSync('git',['show',`${baseline}:${manifestPath}`]));
assert.deepEqual(await verifyImplementation(),implementation);assert.equal(networkAttempts,0);
json('scope-and-readiness.json',{baseline,branch:'codex/rks-ftt-final-design-review',implementation,protectedRoots,protectedDiff:[],manifestSha256:sha256(readRepo(manifestPath)),
  sceneReadiness:rows.map(row=>({scene:row.scene.subtype,...row.readiness})),
  actualImage1RunAssociation:'undetermined',knowledgePromoted:false,qualityAccepted:false,userProjectsRead:false,userProjectsWritten:false,credentialsRead:false,
  counters:{...result.counters,networkAttempts},deployments:0,published:0,merged:false});
console.log(`Three offline A/B pairs captured; dining core complete, pending human confirmation/model authorization; storefront window remains review_required; zero transport.`);
