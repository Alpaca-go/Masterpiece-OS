import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {structuredAnalysisPacketFixture} from '../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import {analysisDirectionSuggestion} from '../src/analysis-direction-suggestion.js';
import {createProjectDesignDirectionStore} from '../src/project-design-direction.js';
import {createVisualWorkflow} from '../src/service.js';
import {businessFixture} from './art-direction-business-fixture.ts';
import {projectDesignDirectionStatusText} from '../../../apps/web/src/features/visual-workflow/api.ts';

test('presentation distinguishes absent Packet, insufficient evidence and usable suggestions with zero model calls',async t=>{
  const f=await businessFixture(t,'Hospitality');
  const store=createProjectDesignDirectionStore(f.projects);
  const packetFile=path.join(f.paths.root,'project-context/visual-decision-packet.json');
  const cases=[
    {packet:null,availability:'missing_packet',label:'暂无分析结果，尚未设置设计方向'},
    {packet:{...f.packet,mediaTranslations:{...f.packet.mediaTranslations,spatial:{status:'ready'}},creativeDecision:{strategicNegatives:['Risk-only text']}},availability:'insufficient_evidence',label:'分析证据不足，设计方向建议待补充'},
    {packet:{...f.packet,mediaTranslations:{...f.packet.mediaTranslations,spatial:{...f.packet.mediaTranslations.spatial,status:'insufficient'}}},availability:'insufficient_evidence',label:'分析证据不足，设计方向建议待补充'},
    {packet:f.packet,availability:'available',label:'AI 分析建议可用，尚未人工确认'},
  ];
  for(const item of cases){
    if(item.packet)await fs.writeFile(packetFile,JSON.stringify(item.packet));else await fs.unlink(packetFile);
    const view=await store.get(f.project.id);
    assert.equal(view.status,'missing');assert.equal(view.recordSha256,null);assert.equal(view.confirmationSha256,null);
    assert.equal(view.analysisSuggestion.availability,item.availability);
    assert.equal(projectDesignDirectionStatusText(view),item.label);
    assert.deepEqual(view,await store.get(f.project.id));
    await assert.rejects(fs.access(path.join(f.paths.root,'project-context/design-direction.json')));
  }
  assert.equal(f.requests.length,0);assert.equal(f.validations.length,0);
  for(const [status,label]of Object.entries({draft:'草稿，尚未确认生效',confirmed:'已确认，将用于标准空间生图',needs_reconfirmation:'需要重新确认，当前禁止按旧方向生图'})){
    assert.equal(projectDesignDirectionStatusText({status,analysisSuggestion:{availability:'missing_packet'}} as any),label);
  }
});

test('explicit analysis fields map deterministically with leaf provenance and without mutating the Packet',()=>{
  const packet:any=structuredAnalysisPacketFixture();
  const spatial=packet.mediaTranslations.spatial;
  spatial.compositionRequirements=['Human scale'];
  spatial.colorBehavior.primary[0].surfaceApplicability='reception wall only';
  spatial.colorBehavior.primary[0].spatialUsage='secondary_surface';
  const before=structuredClone(packet);
  const result=analysisDirectionSuggestion(packet.projectId,packet,'analysis-fingerprint');
  assert.deepEqual(result,analysisDirectionSuggestion(packet.projectId,JSON.parse(JSON.stringify(packet)),'analysis-fingerprint'));
  assert.deepEqual(packet,before);
  assert.equal(result.sourceType,'analysis_suggestion');assert.equal(result.analysisFingerprint,'analysis-fingerprint');
  const expected={spatialConcept:'A clear sequence of service zones',structureLanguage:'open frame',
    lightingLanguage:'soft area light',lightingContrast:'low contrast',lightingInteraction:'soft reflection',lightingAvoid:'colored effect light',
    colorAvoid:'neon gradient',functionalProgram:'arrival\nservice\nconsultation',
    functionalNetwork:spatial.functionalNetwork.join('\n'),functionalRelationships:'guest sees service point from arrival',
    visibleRequirements:'arrival point\nservice point',artisticFocus:'Layered open frames guide movement',compositionRequirements:'Human scale',mustAvoid:'generic decoration'};
  for(const [field,value]of Object.entries(expected)){assert.equal(result.fields[field],value);assert(result.sourcePaths[field]?.length,field);}
  assert.deepEqual(result.sourcePaths.spatialConcept,['mediaTranslations.spatial.spatialConcept']);
  assert.deepEqual(result.sourcePaths.lightingLanguage,['mediaTranslations.spatial.lightingLanguage.source[0]']);
  assert.deepEqual(result.sourcePaths.mustAvoid,['creativeDecision.strategicNegatives[0]']);
  assert.equal(result.fields.colorEntries[0].spatialUsage,'secondary_surface');
  assert.equal(result.fields.colorEntries[0].surfaceApplicability,'reception wall only');
  assert.equal(result.fields.materialEntries[0].brandRole,spatial.materialLanguage[0].brandRole);
  assert(!('creativeDecision' in result));assert(!('confirmation' in result));
});

test('missing spatial evidence stays blank; color rank, global systems and risk observations cannot grant scope or prohibitions',()=>{
  const packet:any=structuredAnalysisPacketFixture();
  const spatial=packet.mediaTranslations.spatial;
  delete spatial.spatialConcept;spatial.structureLanguage=['unknown',{text:'not a sourced string'}];
  delete spatial.functionalNetwork;delete spatial.materialLanguage[0].brandRole;
  spatial.colorBehavior.primary[0].ratio=80;
  packet.diagnosis.brandMisreadRisks[0].description='RISK_MUST_NOT_BECOME_A_BAN';
  spatial.sceneMisreadRisks=['SCENE_RISK_ONLY'];packet.creativeDecision.strategicNegatives=[];
  const result=analysisDirectionSuggestion(packet.projectId,packet,'fingerprint');
  assert.equal(result.fields.spatialConcept,'');assert.equal(result.fields.structureLanguage,'');assert.equal(result.fields.functionalNetwork,'');
  assert.equal(result.fields.mustAvoid,'');assert.equal(result.fields.materialEntries[0].brandRole,'');
  for(const color of result.fields.colorEntries){assert.equal(color.surfaceApplicability,'');assert.equal(color.spatialUsage,'');}
  assert(result.missingFields.some(item=>item.field==='colorEntries[0].spatialUsage'&&item.reason==='explicit_spatial_scope_required'));
  assert(result.missingFields.some(item=>item.field==='materialEntries[0].brandRole'&&item.reason==='explicit_material_role_required'));
  assert(!JSON.stringify(result).includes('RISK_MUST_NOT_BECOME_A_BAN'));assert(!JSON.stringify(result).includes('SCENE_RISK_ONLY'));
  delete packet.mediaTranslations.spatial;
  const absent=analysisDirectionSuggestion(packet.projectId,packet,'fingerprint');
  assert.deepEqual(absent.fields.colorEntries,[]);assert.deepEqual(absent.fields.materialEntries,[]);
  assert.equal(absent.fields.lightingLanguage,'');assert.equal(absent.fields.colorPolicy,'');
  assert.throws(()=>analysisDirectionSuggestion('another-project',packet,'fingerprint'),/PROJECT_MISMATCH/);
  assert.throws(()=>analysisDirectionSuggestion('',null,'fingerprint'),/PROJECT_MISMATCH/);
  const noPacket=analysisDirectionSuggestion('project-without-analysis',null,'fingerprint');
  assert.equal(noPacket.fields.spatialConcept,'');assert(noPacket.missingFields.length>0);
});

test('rereading a missing direction uses the current Packet and fingerprint without persisting the previous suggestion',async t=>{
  const f=await businessFixture(t,'Hospitality');const store=createProjectDesignDirectionStore(f.projects);
  const previous=await store.get(f.project.id);
  const packet=structuredClone(f.packet);packet.mediaTranslations.spatial.spatialConcept='Updated explicit analysis concept';
  await fs.writeFile(path.join(f.paths.root,'project-context/visual-decision-packet.json'),JSON.stringify(packet));
  const current=await store.get(f.project.id);
  assert.equal(current.analysisSuggestion.fields.spatialConcept,'Updated explicit analysis concept');
  assert.notEqual(current.analysisFingerprint,previous.analysisFingerprint);
  assert.equal(current.analysisSuggestion.analysisFingerprint,current.analysisFingerprint);
  assert.equal(current.status,'missing');assert.equal(current.recordSha256,null);
  await assert.rejects(fs.access(path.join(f.paths.root,'project-context/design-direction.json')));
});

test('read-only existing report RPC supplies suggestions for missing directions without creating any decision files',async t=>{
  const f=await businessFixture(t,'Hospitality');
  const op=createVisualWorkflow({root:f.root,fetchImpl:()=>{throw new Error('NETWORK_FORBIDDEN');}}).operations;
  const record=path.join(f.paths.root,'project-context/design-direction.json');
  const before=await fs.readdir(path.join(f.paths.root,'project-context'));
  const view=await op['visual-workflow:report']({},f.project.id,'project_design_direction');
  assert.equal(view.status,'missing');assert.equal(view.recordSha256,null);assert.equal(view.confirmationSha256,null);assert.equal(view.source,null);
  assert.equal(view.fields.spatialConcept,'');assert.equal(view.analysisSuggestion.fields.spatialConcept,f.packet.mediaTranslations.spatial.spatialConcept);
  assert.deepEqual(view,await op['visual-workflow:report']({},f.project.id,'project_design_direction'));
  assert.deepEqual(await fs.readdir(path.join(f.paths.root,'project-context')),before);
  await assert.rejects(fs.access(record));assert.equal(f.requests.length,0);assert.equal(f.validations.length,0);
  const foreign=structuredClone(f.packet);foreign.projectId=crypto.randomUUID();
  await fs.writeFile(path.join(f.paths.root,'project-context/visual-decision-packet.json'),JSON.stringify(foreign));
  await assert.rejects(op['visual-workflow:report']({},f.project.id,'project_design_direction'),/PROJECT_MISMATCH/);
});

test('draft, confirmed and needs_reconfirmation retain their fields, hashes, source and disk bytes across suggestion reads',async t=>{
  const f=await businessFixture(t,'Hospitality');const store=createProjectDesignDirectionStore(f.projects);
  const form=JSON.parse(await fs.readFile(new URL('./design-direction-form.json',import.meta.url),'utf8'));
  let mutation=await store.saveDraft(f.project.id,{...form,expectedRecordSha256:null});
  for(const status of ['draft','confirmed','needs_reconfirmation']){
    if(status==='confirmed')mutation=await store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:mutation.recordSha256});
    if(status==='needs_reconfirmation'){await store.markForReview(f.project.id);const {analysisSuggestion,...rest}=await store.get(f.project.id);mutation=rest;}
    const record=path.join(f.paths.root,'project-context/design-direction.json');const before=await fs.readFile(record);
    const {analysisSuggestion,...rest}=await store.get(f.project.id);
    assert.equal(rest.status,status);assert.deepEqual(rest,mutation);assert.deepEqual(await fs.readFile(record),before);
    assert.notEqual(analysisSuggestion.fields.spatialConcept,rest.fields.spatialConcept);
    assert.equal(analysisSuggestion.projectId,f.project.id);
  }
  assert.equal(f.requests.length,0);assert.equal(f.validations.length,0);
});
