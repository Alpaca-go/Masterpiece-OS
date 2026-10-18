import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { readJson, writeJson, inside } from './configuration.js';
import { digest } from './art-direction-contract.js';
import { applyUserConfirmedVisualDecision } from './generation-runtime/generation/user-confirmed-visual-decision.js';

const recordPath = 'project-context/design-direction.json';
const legacyPath = 'project-context/user-confirmed-visual-decision.json';
const fields = ['spatialConcept', 'structureLanguage', 'materialLanguage', 'lightingLanguage', 'colorPolicy', 'functionalProgram', 'mustAvoid'];
function fail(code) { throw Object.assign(new Error(code), {code}); }
function lines(value) { return String(value || '').split('\n').map(item => item.trim()).filter(Boolean); }
function text(value) { return Array.isArray(value) ? value.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join('\n') : String(value || ''); }
export function designDirectionFields(confirmation) {
  const spatial = confirmation?.spatialTranslation || {};
  return {
    spatialConcept: spatial.spatialConcept || '', structureLanguage: text(spatial.structureLanguage),
    materialLanguage: text((spatial.materialLanguage || []).map(item => typeof item === 'string' ? item : `${item.material}：${text(item.behavior)}`)),
    lightingLanguage: text(spatial.lightingLanguage?.source), colorPolicy: spatial.colorBehavior ? [
      ...['primary','secondary','accent'].flatMap(group=>(spatial.colorBehavior[group] || []).map(item=>`${({primary:'主色',secondary:'辅色',accent:'局部点缀'})[group]} ${item.name}：${[item.role,item.surfaceApplicability].filter(Boolean).join('；')}`)),
      ...(spatial.colorBehavior.forbidden || []).map(item=>`避免：${item}`)
    ].join('\n') : '',
    functionalProgram: text(spatial.mustBeVisible), mustAvoid: text(confirmation?.reviewTask?.mustAvoid || confirmation?.creativeDecision?.strategicNegatives)
  };
}
function buildConfirmation(projectId, input, sourceStatement) {
  if (fields.some(field => !String(input[field] || '').trim())) fail('PROJECT_DESIGN_DIRECTION_FIELDS_REQUIRED');
  const spatialConcept = input.spatialConcept.trim();
  const functional = lines(input.functionalProgram);
  return {
    schemaVersion:'1.0', id:crypto.randomUUID(), projectId, status:'confirmed',
    sourceDocument:sourceStatement, evidenceRefs:['project_user_design_decision'], appliesTo:{deliverableFamilies:['space']},
    creativeDecision:{brandRoleStatement:spatialConcept, uniqueUpgradeThesis:spatialConcept, strategicNegatives:lines(input.mustAvoid), toneBoundaries:[{target:spatialConcept,avoid:lines(input.mustAvoid)}]},
    abstractions:[],
    spatialTranslation:{spatialConcept,structureLanguage:lines(input.structureLanguage),
      materialLanguage:lines(input.materialLanguage).map(material=>({material,behavior:[],brandRole:'用户确认的材料表现目标',forbidden:[]})),
      lightingLanguage:{source:lines(input.lightingLanguage),forbidden:[]},
      colorBehavior:{primary:[{name:input.colorPolicy.trim(),role:'用户确认的空间配色行为',spatialUsage:'dominant_field'}],secondary:[],accent:[],forbidden:[]},
      sceneProgram:functional,functionalNetwork:functional,functionalRelationships:functional,mustBeVisible:functional,
      brandRoleManifestation:lines(input.structureLanguage),signatureSpatialMechanism:lines(input.structureLanguage),positiveDifferentiators:[spatialConcept]}
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
    const changed = record?.status==='confirmed' && (record.analysisFingerprint!==analysisFingerprint || project.status!=='completed' || project.visualContextVNextStatus!=='ready');
    const status = changed ? 'needs_reconfirmation' : record?.status || 'missing';
    return {root,packet,record,view:{projectId,status,reason:changed?'analysis_or_intake_changed':record?.reason || null,
      recordSha256:record ? digest(record) : null,analysisFingerprint,source:record?.source || null,
      fields:record?.fields || designDirectionFields(null),confirmedAt:record?.confirmedAt || null,
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
      const values=supplied ? designDirectionFields(supplied) : Object.fromEntries(fields.map(field=>[field,String(input.fields?.[field] || '').trim()]));
      if (fields.some(field=>values[field].length>12000)) fail('PROJECT_DESIGN_DIRECTION_TOO_LONG');
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
