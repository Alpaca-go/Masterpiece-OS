import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { readJson, writeJson, inside } from './configuration.js';
import { digest } from './art-direction-contract.js';
import { applyUserConfirmedVisualDecision } from './generation-runtime/generation/user-confirmed-visual-decision.js';

const recordPath = 'project-context/design-direction.json';
const legacyPath = 'project-context/user-confirmed-visual-decision.json';
const fields = ['spatialConcept', 'structureLanguage', 'materialLanguage', 'lightingLanguage', 'colorPolicy', 'functionalProgram', 'mustAvoid',
  'lightingContrast', 'lightingInteraction', 'lightingAvoid', 'colorAvoid', 'functionalNetwork', 'functionalRelationships', 'visibleRequirements', 'artisticFocus', 'compositionRequirements'];
const requiredFields = {spatialConcept:'空间体验与设计目标',structureLanguage:'建筑结构与空间组织',lightingLanguage:'自然光与照明',
  functionalProgram:'功能节点',functionalNetwork:'功能网络与通行连接',functionalRelationships:'跨区域运营与隐私关系',visibleRequirements:'画面必须可见的功能设施',mustAvoid:'必须避免的设计表现'};
function fail(code) { throw Object.assign(new Error(code), {code}); }
function lines(value) { return String(value || '').split('\n').map(item => item.trim()).filter(Boolean); }
function text(value) { return Array.isArray(value) ? value.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join('\n') : String(value || ''); }
function editorFields(value = {}) {
  const result=Object.fromEntries(fields.map(field=>[field,String(value[field] || '').trim()]));
  result.colorEntries=(Array.isArray(value.colorEntries)?value.colorEntries:[]).map(item=>({
    name:String(item?.name || '').trim(),paletteRole:String(item?.paletteRole || '').trim(),role:String(item?.role || '').trim(),
    surfaceApplicability:String(item?.surfaceApplicability || '').trim(),spatialUsage:String(item?.spatialUsage || '').trim()
  }));
  result.materialEntries=(Array.isArray(value.materialEntries)?value.materialEntries:[]).map(item=>({
    material:String(item?.material || '').trim(),behavior:String(item?.behavior || '').trim(),brandRole:String(item?.brandRole || '').trim(),forbidden:String(item?.forbidden || '').trim()
  }));
  return result;
}
function semanticIssues(input) {
  const issues=Object.entries(requiredFields).filter(([field])=>!input[field]).map(([,label])=>`请补充${label}`);
  if (!input.colorEntries.length) issues.push('请按主色、辅色或局部点缀分别填写颜色；历史整段配色文字不能自动授予空间范围');
  input.colorEntries.forEach((item,index)=>{
    if (!item.name || !['primary','secondary','accent'].includes(item.paletteRole) || !item.role || !item.surfaceApplicability) issues.push(`颜色 ${index+1}：请明确名称、色彩职责及适用表面`);
    if (/[\n：:；;]|主色|辅色|点缀|大面积|仅用于/u.test(item.name)) issues.push(`颜色 ${index+1}：名称中混有配色关系，请把职责和范围分开确认`);
    if (/^(待定|未知|不确定|按需|适量|未明确)[。.!！]?$/u.test(item.surfaceApplicability)) issues.push(`颜色 ${index+1}：适用表面仍含糊，请补充具体边界`);
    if (!['dominant_field','secondary_surface','local_accent','soft_furnishing','detail_trim','post_composite_only'].includes(item.spatialUsage)) issues.push(`颜色 ${index+1}：请明确空间作用范围；不会自动按主色铺满空间`);
    if (item.paletteRole==='accent' && !['local_accent','soft_furnishing','detail_trim','post_composite_only'].includes(item.spatialUsage)) issues.push(`颜色 ${index+1}：局部点缀不能同时授权大面积主导，请重新明确职责`);
  });
  if (!input.materialEntries.length) issues.push('请分别填写材料名称与光学表现');
  input.materialEntries.forEach((item,index)=>{
    if (!item.material || !item.behavior || !item.brandRole) issues.push(`材料 ${index+1}：请分别补充名称、光学行为和空间职责；无特殊光学效果也请明确说明`);
  });
  const functional=['functionalProgram','functionalNetwork','functionalRelationships'];
  if (functional.some((field,index)=>input[field] && functional.slice(index+1).some(other=>input[field]===input[other]))) issues.push('功能节点、通行连接与跨区域关系不能使用同一段文字，请分别确认');
  return issues;
}
export function designDirectionFields(confirmation) {
  const spatial = confirmation?.spatialTranslation || {};
  return {
    spatialConcept: spatial.spatialConcept || '', structureLanguage: text(spatial.structureLanguage),
    materialLanguage: text((spatial.materialLanguage || []).map(item => typeof item === 'string' ? item : `${item.material}：${text(item.behavior)}`)),
    lightingLanguage: text(spatial.lightingLanguage?.source), colorPolicy: spatial.colorBehavior ? [
      ...['primary','secondary','accent'].flatMap(group=>(spatial.colorBehavior[group] || []).map(item=>`${({primary:'主色',secondary:'辅色',accent:'局部点缀'})[group]} ${item.name}：${[item.role,item.surfaceApplicability].filter(Boolean).join('；')}`)),
      ...(spatial.colorBehavior.forbidden || []).map(item=>`避免：${item}`)
    ].join('\n') : '',
    colorEntries:['primary','secondary','accent'].flatMap(paletteRole=>(spatial.colorBehavior?.[paletteRole] || []).map(item=>({name:item.name || '',paletteRole,role:item.role || '',surfaceApplicability:item.surfaceApplicability || '',spatialUsage:item.spatialUsage || ''}))),
    materialEntries:(spatial.materialLanguage || []).map(item=>({material:typeof item==='string'?item:item.material || '',behavior:text(item.behavior),brandRole:item.brandRole || '',forbidden:text(item.forbidden)})),
    lightingContrast:spatial.lightingLanguage?.contrast || '',lightingInteraction:text(spatial.lightingLanguage?.interactionWithMaterials),lightingAvoid:text(spatial.lightingLanguage?.forbidden),colorAvoid:text(spatial.colorBehavior?.forbidden),
    functionalProgram:text(spatial.sceneProgram),functionalNetwork:text(spatial.functionalNetwork),functionalRelationships:text(spatial.functionalRelationships),
    visibleRequirements:text(spatial.mustBeVisible),artisticFocus:text(spatial.signatureSpatialMechanism),compositionRequirements:text(spatial.compositionRequirements),
    mustAvoid:text([...(confirmation?.reviewTask?.mustAvoid || []),...(confirmation?.creativeDecision?.strategicNegatives || [])])
  };
}
function buildConfirmation(projectId, input, sourceStatement) {
  const issues=semanticIssues(input);
  if (issues.length) throw Object.assign(new Error(issues.join('；')), {code:'PROJECT_DESIGN_DIRECTION_SEMANTICS_REQUIRED',issues});
  const spatialConcept = input.spatialConcept.trim();
  const colorBehavior=Object.fromEntries(['primary','secondary','accent'].map(role=>[role,input.colorEntries.filter(item=>item.paletteRole===role).map(({paletteRole,...item})=>item)]));
  const artisticFocus=lines(input.artisticFocus);
  return {
    schemaVersion:'1.0', id:crypto.randomUUID(), projectId, status:'confirmed',
    sourceDocument:sourceStatement, evidenceRefs:['project_user_design_decision'], appliesTo:{deliverableFamilies:['space']},
    creativeDecision:{brandRoleStatement:spatialConcept, uniqueUpgradeThesis:spatialConcept, strategicNegatives:lines(input.mustAvoid), toneBoundaries:[{target:spatialConcept,avoid:lines(input.mustAvoid)}]},
    abstractions:[],
    spatialTranslation:{spatialConcept,structureLanguage:lines(input.structureLanguage),
      materialLanguage:input.materialEntries.map(item=>({...item,behavior:lines(item.behavior),forbidden:lines(item.forbidden)})),
      lightingLanguage:{source:lines(input.lightingLanguage),contrast:input.lightingContrast,interactionWithMaterials:lines(input.lightingInteraction),forbidden:lines(input.lightingAvoid)},
      colorBehavior:{...colorBehavior,forbidden:lines(input.colorAvoid)},
      sceneProgram:lines(input.functionalProgram),functionalNetwork:lines(input.functionalNetwork),functionalRelationships:lines(input.functionalRelationships),mustBeVisible:lines(input.visibleRequirements),
      compositionRequirements:lines(input.compositionRequirements),
      brandRoleManifestation:artisticFocus.length?artisticFocus:lines(input.structureLanguage),signatureSpatialMechanism:artisticFocus.length?artisticFocus:lines(input.structureLanguage),positiveDifferentiators:[spatialConcept]}
  };
}
export function createProjectDesignDirectionStore(projects) {
  async function safe(root, relative) {
    let current = root;
    for (const segment of relative.split('/')) {
      current = inside(root,path.relative(root,path.join(current,segment)));
      const stat = await fs.lstat(current).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
      if (stat?.isSymbolicLink()) fail('PROJECT_DESIGN_DIRECTION_PATH_INVALID');
    }
    return current;
  }
  async function state(projectId) {
    const project = await projects.get(projectId);
    const root = (await projects.paths(projectId)).root;
    if ((await fs.lstat(root)).isSymbolicLink()) fail('PROJECT_DESIGN_DIRECTION_PATH_INVALID');
    const stored = await readJson(await safe(root,recordPath), null);
    const legacy = stored ? null : await readJson(await safe(root,legacyPath), null);
    const packet = await readJson(await safe(root,'project-context/visual-decision-packet.json'),null);
    const context = await readJson(await safe(root,'project-context/project-visual-context.vnext.json'),null);
    const analysisFingerprint = digest({packet,contextPacket:context?.visualDecisionPacket || null,
      identity:{projectName:project.projectName,brandName:project.brandName,industry:project.industry,description:project.description},
      assets:(project.assets || []).filter(asset=>!asset.usage || asset.usage==='analysis_source').map(({id,sha256,role})=>({id,sha256,role}))});
    if (stored && (stored.projectId!==projectId || stored.schemaVersion!=='1.0' || !['draft','confirmed','needs_reconfirmation'].includes(stored.status))) fail('PROJECT_DESIGN_DIRECTION_RECORD_INVALID');
    if (stored?.confirmation && stored.confirmation.projectId!==projectId || legacy && legacy.projectId!==projectId) fail('PROJECT_DESIGN_DIRECTION_PROJECT_MISMATCH');
    const record = stored || (legacy ? {schemaVersion:'1.0',projectId,status:'needs_reconfirmation',confirmation:legacy,
      fields:designDirectionFields(legacy),source:{kind:'user_design_decision',statement:legacy.sourceDocument || '历史确认记录，需核对来源',evidenceRole:'offline_visual_calibration'},reason:'legacy_confirmation_requires_review'} : null);
    const editing=record?.fields?.colorEntries && record?.fields?.materialEntries ? editorFields(record.fields) : record?.confirmation ? designDirectionFields(record.confirmation) : editorFields(record?.fields);
    const validationIssues=record ? semanticIssues(editing) : [];
    const semanticReview=record?.status==='confirmed' && validationIssues.length>0;
    const changed = record?.status==='confirmed' && (record.analysisFingerprint!==analysisFingerprint || project.status!=='completed' || project.visualContextVNextStatus!=='ready');
    const status = changed || semanticReview ? 'needs_reconfirmation' : record?.status || 'missing';
    return {root,packet,record,view:{projectId,status,reason:semanticReview?'editor_semantics_requires_review':changed?'analysis_or_intake_changed':record?.reason || null,
      recordSha256:record ? digest(record) : null,analysisFingerprint,source:record?.source || null,
      fields:editing,validationIssues,confirmedAt:record?.confirmedAt || null,
      confirmationSha256:record?.confirmation ? digest(record.confirmation) : null,
      confirmation:record?.confirmation || null, boundAnalysisFingerprint:record?.analysisFingerprint || null}};
  }
  async function mutate(projectId, expectedRecordSha256, action) {
    const root=(await projects.paths(projectId)).root;
    const lock=await safe(root,'project-context/design-direction.lock');
    const handle=await fs.open(lock,'wx').catch(error=>{if(error.code==='EEXIST')fail('PROJECT_DESIGN_DIRECTION_BUSY');throw error;});
    try {
      const current=await state(projectId);
      if (current.view.recordSha256!==expectedRecordSha256) fail('PROJECT_DESIGN_DIRECTION_EDIT_CONFLICT');
      const project=await projects.get(projectId);
      if (project.status==='running') fail('PROJECT_DESIGN_DIRECTION_ANALYSIS_RUNNING');
      const next=await action(current);
      const directory=await safe(root,'project-context/design-direction-history');
      await fs.mkdir(directory,{recursive:true});
      await writeJson(path.join(directory,`${crypto.randomUUID()}.json`),{projectId,at:new Date().toISOString(),before:current.record,after:next});
      await writeJson(await safe(root,recordPath),next);
      return (await state(projectId)).view;
    } finally {await handle.close();await fs.unlink(lock);}
  }
  async function saveDraft(projectId,input) {
    if (!input.sourceStatement?.trim() || input.sourceStatement.length>4000) fail('PROJECT_DESIGN_DIRECTION_SOURCE_REQUIRED');
    return mutate(projectId,input.expectedRecordSha256,async current=>{
      const supplied=input.confirmation;
      if (supplied) applyUserConfirmedVisualDecision(current.packet,supplied,projectId,'space');
      const values=supplied ? designDirectionFields(supplied) : editorFields(input.fields);
      if (fields.some(field=>values[field].length>12000)) fail('PROJECT_DESIGN_DIRECTION_TOO_LONG');
      if (values.colorEntries.length>24 || values.materialEntries.length>24 || [...values.colorEntries,...values.materialEntries].some(item=>Object.values(item).some(value=>value.length>12000))) fail('PROJECT_DESIGN_DIRECTION_TOO_LONG');
      return {schemaVersion:'1.0',projectId,status:'draft',fields:values,confirmation:supplied || null,
        source:{kind:'user_design_decision',statement:input.sourceStatement.trim(),evidenceRole:'offline_visual_calibration',notOriginalBrandFact:true},
        updatedAt:new Date().toISOString()};
    });
  }
  async function confirm(projectId,input) {
    if (input.confirmedByUser!==true) fail('PROJECT_DESIGN_DIRECTION_CONFIRMATION_REQUIRED');
    return mutate(projectId,input.expectedRecordSha256,async current=>{
      const project=await projects.get(projectId);
      if (!current.record || !current.packet || current.packet.projectId!==projectId || project.status!=='completed' || project.visualContextVNextStatus!=='ready') fail('PROJECT_DESIGN_DIRECTION_ANALYSIS_REQUIRED');
      if (current.view.validationIssues.length) throw Object.assign(new Error(current.view.validationIssues.join('；')), {code:'PROJECT_DESIGN_DIRECTION_SEMANTICS_REQUIRED',issues:current.view.validationIssues});
      const confirmation=current.record.confirmation || buildConfirmation(projectId,current.record.fields,current.record.source.statement);
      applyUserConfirmedVisualDecision(current.packet,confirmation,projectId,'space');
      return {...current.record,status:'confirmed',confirmation,analysisFingerprint:current.view.analysisFingerprint,
        confirmedAt:new Date().toISOString(),reason:null};
    });
  }
  async function markForReview(projectId) {
    const current=await state(projectId);
    if (!current.record) return;
    return mutate(projectId,current.view.recordSha256,async item=>({...item.record,status:'needs_reconfirmation',reason:'analysis_requested',updatedAt:new Date().toISOString()}));
  }
  async function capture(projectId) {
    const {view,packet}=await state(projectId);
    if (view.status==='missing') return null;
    if (view.status!=='confirmed') fail('PROJECT_DESIGN_DIRECTION_RECONFIRM_REQUIRED');
    applyUserConfirmedVisualDecision(packet,view.confirmation,projectId,'space');
    return {confirmation:view.confirmation,snapshot:{projectId,recordSha256:view.recordSha256,confirmationSha256:view.confirmationSha256,
      analysisFingerprint:view.analysisFingerprint,source:view.source,confirmedAt:view.confirmedAt}};
  }
  async function resolve(projectId,snapshot) {
    const current=await capture(projectId);
    if (JSON.stringify(current?.snapshot || null)!==JSON.stringify(snapshot || null)) fail('PROJECT_DESIGN_DIRECTION_COMPILATION_STALE');
    return current;
  }
  return {get:async projectId=>(await state(projectId)).view,saveDraft,confirm,markForReview,capture,resolve};
}
