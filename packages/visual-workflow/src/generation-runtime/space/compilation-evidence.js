// Internal server boundary. No constructor accepts a client authorization or snapshot.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createProjectDesignDirectionStore} from '../../project-design-direction.js';
import {createShortChainTaskContract} from '../generation/task-contract.js';
import {applyUserConfirmedVisualDecision} from '../generation/user-confirmed-visual-decision.js';
import {spatialSemanticEvidence} from './semantic/validate-spatial-semantics.js';
import {propositionModality} from './semantic/separate-space-semantics.js';
import {resolveTargetFunctionalProgram} from './continuation/target-functional-programs.js';
import {buildTargetSceneProjection,scopeSourceEntries} from './scene-projection/target-scene-projection.js';

export const SPACE_EVIDENCE_SCHEMA = 'space-compilation-evidence/1.0';
const captures = new WeakMap();
const consumed = new WeakSet();
const bindings = new WeakMap();
const projections = new WeakMap();
const fingerprint = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = reason => { throw Object.assign(new Error(`SPACE_EVIDENCE_INVALID: ${reason}`), {code:'SPACE_EVIDENCE_INVALID',reason}); };
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function taskScope(task) {
  const {createdAt, ...scope} = createShortChainTaskContract(task, {now:'capture'});
  if (!task.taskId) fail('task_id_required');
  if (scope.continuation) {
    const {targetFunctionalProgram,continuationBoundary,referenceRole,...intent}=scope.continuation;
    scope.continuation=intent;
  }
  return scope;
}

// projects is the server's existing filesystem authority, never an RPC field or
// injectable capture callback. Even a matching serialized snapshot is re-read
// through the real store. The returned identity has no serializable authority.
export async function captureSpaceCompilationEvidence({projects, task, packet, captured}) {
  const scope = taskScope(task);
  if (scope.deliverableFamily !== 'space' || packet?.projectId !== scope.projectId) fail('project_scope_mismatch');
  const owner = createProjectDesignDirectionStore(projects);
  const current = await owner.resolve(scope.projectId, captured?.snapshot ?? null);
  if (!current?.confirmation?.id || !current.snapshot?.recordSha256) fail('persisted_confirmation_required');
  if (fingerprint(current.confirmation) !== current.snapshot.confirmationSha256
    || fingerprint(captured?.confirmation) !== current.snapshot.confirmationSha256) fail('confirmation_mismatch');
  const root = (await projects.paths(scope.projectId)).root;
  const context = JSON.parse(await fs.readFile(path.join(root,'project-context/project-visual-context.vnext.json'),'utf8'));
  if (fingerprint(packet) !== fingerprint(context.visualDecisionPacket)) fail('analysis_packet_mismatch');
  await owner.resolve(scope.projectId,current.snapshot);
  const effective = applyUserConfirmedVisualDecision(packet,current.confirmation,scope.projectId,'space');
  if (!effective.confirmation) fail('confirmation_not_applicable');
  const record = freeze(structuredClone({schemaVersion:SPACE_EVIDENCE_SCHEMA,scope,
    sourceOwner:'project-design-direction.capture/resolve',snapshot:current.snapshot,
    confirmationId:current.confirmation.id,originalPacketFingerprint:fingerprint(packet),
    effectivePacketFingerprint:fingerprint(effective.packet),confirmation:current.confirmation,originalPacket:packet}));
  const capability = Object.freeze(Object.create(null));
  captures.set(capability,record);
  return capability;
}

export function consumeCapturedSpaceEvidence(capability, {originalPacket,confirmation,taskContract}) {
  const captured = captures.get(capability);
  if (!captured) fail('missing_or_forged_capture');
  // One compile attempt, including failed attempts. A copied identity cannot be replayed.
  captures.delete(capability);
  if (fingerprint(taskScope(taskContract)) !== fingerprint(captured.scope)) fail('task_scope_mismatch');
  if (fingerprint(originalPacket) !== captured.originalPacketFingerprint) fail('original_packet_mismatch');
  if (fingerprint(confirmation) !== captured.snapshot.confirmationSha256) fail('confirmation_mismatch');
  consumed.add(captured);
  return captured;
}

export function bindCapturedSpaceEvidence(captured, packet, taskContract) {
  if (!consumed.has(captured)) fail('missing_or_forged_consumed_capture');
  consumed.delete(captured);
  if (fingerprint(taskScope(taskContract)) !== fingerprint(captured.scope)) fail('task_scope_mismatch');
  if (fingerprint(packet) !== captured.effectivePacketFingerprint) fail('effective_packet_mismatch');
  const evidence = freeze({schemaVersion:SPACE_EVIDENCE_SCHEMA,projectId:captured.scope.projectId,
    taskId:captured.scope.taskId,generationBasis:captured.scope.generationBasis,
    capture:{...captured.snapshot,confirmationId:captured.confirmationId},
    originalPacketFingerprint:captured.originalPacketFingerprint,packetFingerprint:captured.effectivePacketFingerprint,
    originalEntries:packetEntries(captured.originalPacket,null,captured),
    entries:packetEntries(packet,captured.confirmation,captured)});
  bindings.set(evidence,{packetFingerprint:evidence.packetFingerprint,scope:taskScope(taskContract)});
  return evidence;
}

const INPUT_ROOTS = ['mediaTranslations.spatial','projectFacts','creativeDecision','colorSystem','materialSystem','lightingSystem','diagnosis','abstractions'];
const FUNCTIONAL_FIELDS = new Set(['sceneProgram','functionalNetwork','functionalRelationships','operationConstraints','requiredSpatialElements','mustBeVisible']);
const tokens = field => field.replace(/\[(\d+)\]/gu,'.$1').split('.');
function valueAt(value,field) { return tokens(field).reduce((node,key)=>node?.[key],value); }
function leaves(value,field) {
  if (typeof value === 'string') return [{fieldPath:field,text:value}];
  if (Array.isArray(value)) return value.flatMap((v,i)=>leaves(v,`${field}[${i}]`));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key,v])=>leaves(v,`${field}.${key}`));
  return [];
}
function confirmationOrigin(fieldPath,confirmation,original) {
  if (!confirmation) return null;
  const roots = [['mediaTranslations.spatial','spatialTranslation'],['colorSystem','spatialTranslation.colorBehavior'],
    ['materialSystem','spatialTranslation.materialLanguage'],['lightingSystem','spatialTranslation.lightingLanguage']];
  for (const [target,source] of roots) if (fieldPath === target || fieldPath.startsWith(target+'.') || fieldPath.startsWith(target+'[')) {
    return {sourceFieldPath:source+fieldPath.slice(target.length),transform:'identity'};
  }
  if (fieldPath === 'projectFacts.brandRole.value' && confirmation.projectIdentity?.brandRole) return {sourceFieldPath:'projectIdentity.brandRole',transform:'identity'};
  if (fieldPath.startsWith('creativeDecision.')) {
    const key=tokens(fieldPath)[1];
    // Reproduce the existing explicit trim/dedup operation with index lineage.
    // Equality is used to check this declared transform, never to guess ownership.
    if (key === 'strategicNegatives') {
      const sources=['creativeDecision.strategicNegatives','reviewTask.mustAvoid'];
      const seen=new Set(),mapped=[];
      for (const source of sources) for (const [index,text] of (valueAt(confirmation,source)||[]).entries()) {
        if (typeof text !== 'string') continue;
        const normalized=text.trim().replace(/\s+/gu,' ');
        if (normalized && !seen.has(normalized)) { seen.add(normalized);mapped.push({sourceFieldPath:`${source}[${index}]`,transform:'trim_whitespace'}); }
      }
      return mapped[Number(tokens(fieldPath)[2])] || null;
    }
    if (Object.hasOwn(confirmation.creativeDecision || {},key)) return {sourceFieldPath:fieldPath,transform:'identity'};
  }
  if (fieldPath.startsWith('abstractions[') && Array.isArray(confirmation.abstractions)) return {sourceFieldPath:fieldPath,transform:'identity'};
  const risk=fieldPath.match(/^diagnosis\.brandMisreadRisks\[(\d+)\](.*)$/u);
  if (risk && Number(risk[1]) >= (original.diagnosis?.brandMisreadRisks || []).length) return {
    sourceFieldPath:`brandMisreadRisks[${Number(risk[1])-(original.diagnosis?.brandMisreadRisks || []).length}]${risk[2]}`,transform:'identity'};
  return null;
}
function packetEntries(packet,confirmation,captured) {
  const packetFingerprint=fingerprint(packet);
  return INPUT_ROOTS.flatMap(root=>leaves(valueAt(packet,root),root))
    .filter(entry=>entry.fieldPath !== 'mediaTranslations.spatial.status').map(({fieldPath,text})=>{
    const origin=confirmationOrigin(fieldPath,confirmation,captured.originalPacket);
    const sourceText=origin ? valueAt(confirmation,origin.sourceFieldPath) : text;
    if (typeof sourceText !== 'string') fail(`source_value_missing:${fieldPath}`);
    const expected=origin?.transform === 'trim_whitespace' ? sourceText.trim().replace(/\s+/gu,' ') : sourceText;
    if (expected !== text) fail(`source_value_mismatch:${fieldPath}`);
    const originalIndex=Number(tokens(origin?.sourceFieldPath || fieldPath).findLast(key=>/^\d+$/u.test(key)) ?? -1);
    const field=tokens(fieldPath)[2];
    const typed=fieldPath.startsWith('mediaTranslations.spatial.') && FUNCTIONAL_FIELDS.has(field)
      ? spatialSemanticEvidence(sourceText,field,originalIndex) : null;
    const sourceKind=origin ? 'user_confirmed_design_intent' : 'analysis_packet';
    const sourceRecordId=origin ? captured.confirmationId : `packet:${captured.originalPacketFingerprint}`;
    return {sourceKind,sourceOwner:origin ? captured.sourceOwner : 'persisted_analysis_packet',sourceRecordId,
      packetFingerprint,fieldPath,originalIndex,originalText:sourceText,packetText:text,
      sourceFieldPath:origin?.sourceFieldPath || fieldPath,sourceTransform:origin?.transform || 'identity',
      entryFingerprint:fingerprint({packetFingerprint,fieldPath,originalIndex,sourceText,sourceRecordId}),
      sourceStatus:origin ? 'confirmed_design_intent_not_verified_property' : 'analysis_proposal',
      confirmationStatus:origin ? 'confirmed' : 'unconfirmed',
      evidenceRefs:origin ? [...(confirmation.evidenceRefs || [])] : [],
      parentScope:{fieldPath,originalText:sourceText,start:0,end:sourceText.length},
      semanticType:typed?.type || 'design_context',modality:typed?.modality || propositionModality(sourceText),
      semanticValidation:typed?.validation || 'not_a_functional_field',clauses:typed?.clauses || []};
  });
}

export function assertSpaceEvidenceBinding(evidence,packet,taskContract,purpose='execution') {
  const binding = bindings.get(evidence);
  if (!binding) fail('missing_or_forged_binding');
  if (binding.packetFingerprint !== fingerprint(packet)) fail('bound_packet_mismatch');
  if (fingerprint(binding.scope) !== fingerprint(taskScope(taskContract))) fail('bound_task_mismatch');
  if (purpose !== 'offline_review' && binding.purpose === 'offline_review') fail('experiment_cannot_authorize_execution');
  return evidence;
}

export function createOfflineSpaceEvidence({packet,basePacket,deltas,scene,task}) {
  const replay=structuredClone(basePacket),applicable=deltas.map((delta,index)=>({...delta,recordId:`delta:${index}`}))
    .filter(delta=>delta.scene === 'common' || delta.scene === scene);
  for(const delta of applicable) {
    if (fingerprint(valueAt(replay,delta.path)) !== fingerprint(delta.before)) fail(`delta_before_conflict:${delta.recordId}`);
    const keys=tokens(delta.path),last=keys.pop();
    const node=keys.reduce((value,key)=>value?.[key],replay);
    if (!node || !last) fail(`delta_path_missing:${delta.recordId}`);
    node[last]=structuredClone(delta.after);
  }
  if (fingerprint(replay) !== fingerprint(packet)) fail('delta_final_packet_mismatch');
  const captured={originalPacket:basePacket,originalPacketFingerprint:fingerprint(basePacket)};
  const entries=packetEntries(packet,null,captured).map(entry=>{
    const delta=applicable.findLast(d=>entry.fieldPath === d.path || entry.fieldPath.startsWith(d.path+'[') || entry.fieldPath.startsWith(d.path+'.'));
    return {...entry,sourceKind:delta?'offline_experiment_delta':'analysis_packet',
      sourceOwner:delta?'offline_experiment':'offline_historical_packet',sourceRecordId:delta?.recordId || entry.sourceRecordId,
      sourceStatus:delta?.status || 'unknown',confirmationStatus:delta?'proposed':'unknown',
      evidenceRefs:[...(delta?.evidenceRefs || [])],entryFingerprint:fingerprint({entry:entry.entryFingerprint,delta:delta?.recordId,scene})};
  });
  const evidence=freeze({schemaVersion:SPACE_EVIDENCE_SCHEMA,projectId:task.projectId,taskId:task.taskId,generationBasis:task.generationBasis,
    packetFingerprint:fingerprint(packet),originalPacketFingerprint:fingerprint(basePacket),entries,
    originalEntries:packetEntries(basePacket,null,captured),executionEligibility:'denied',scene});
  bindings.set(evidence,{packetFingerprint:fingerprint(packet),scope:taskScope(task),purpose:'offline_review'});
  return evidence;
}

// Adapter supplies output paths and source entry identities during the actual
// transform. This seal binds the complete IR too: a JSON sidecar is audit only.
export function sealSpaceProjection(evidence,packet,taskContract,layers,outputs,purpose,systemEntries=[]) {
  assertSpaceEvidenceBinding(evidence,packet,taskContract,purpose);
  const sidecar=freeze({schemaVersion:SPACE_EVIDENCE_SCHEMA,packetFingerprint:evidence.packetFingerprint,entries:[...evidence.entries,...systemEntries],
    originalEntries:evidence.originalEntries,capture:evidence.capture || null,outputs});
  projections.set(sidecar,{source:evidence,layerFingerprint:fingerprint(layers),scope:taskScope(taskContract)});
  return sidecar;
}
export function validateSpaceProjection(sidecar,packet,taskContract,layers,purpose) {
  const sealed=projections.get(sidecar);
  if (!sealed) fail('missing_or_forged_projection');
  assertSpaceEvidenceBinding(sealed.source,packet,taskContract,purpose);
  const {compilationEvidence,...plainLayers}=layers;
  if (sealed.layerFingerprint !== fingerprint(plainLayers)) fail('projected_output_mismatch');
  const findings=[];
  for(const entry of sidecar.entries) {
    if (entry.semanticValidation === 'block') findings.push({dimension:'semantic',fieldPath:entry.fieldPath,reason:'original_semantics_unresolved',entryFingerprint:entry.entryFingerprint});
    if (entry.semanticValidation !== 'not_a_functional_field' && entry.confirmationStatus !== 'confirmed' && entry.sourceKind !== 'system_target_program') findings.push({dimension:'source',fieldPath:entry.fieldPath,reason:'functional_source_not_confirmed'});
  }
  for(const output of sidecar.outputs) {
    if (!output.outputPath) {
      if (['unresolved','review_required'].includes(output.sceneScope)) findings.push({dimension:'visibility',reason:'unresolved_parent_or_visibility',outputBindingId:output.outputBindingId});
      continue;
    }
    if (valueAt(layers,output.outputPath) !== output.outputText) fail(`output_binding_mismatch:${output.outputPath}`);
    for(const entryId of output.sourceEntryIds) if (!sidecar.entries.some(e=>e.entryFingerprint===entryId)) fail('output_source_missing');
    const parent=sidecar.entries.find(e=>e.entryFingerprint===output.sourceEntryIds[0]);
    if (!parent || parent.originalText.slice(output.sourceRange.start,output.sourceRange.end) !== output.outputText) fail('output_original_range_mismatch');
    if (output.sceneScope !== 'current_shot' && output.sceneScope !== 'cross_scene_constraint') findings.push({dimension:'visibility',reason:'no_current_shot_permission',outputBindingId:output.outputBindingId});
    if (output.sceneScope === 'cross_scene_constraint' && output.visibilityAuthority !== 'current_boundary_only') fail('boundary_visibility_mismatch');
    if (output.visibilityAuthority === 'current_shot' && output.sceneScope !== 'current_shot') fail('foreign_visibility_escalation');
    const sources=output.sourceEntryIds.map(id=>sidecar.entries.find(e=>e.entryFingerprint===id));
    if (!sources.length || sources.some(e=>e.confirmationStatus !== 'confirmed' && e.sourceKind !== 'system_target_program')) findings.push({dimension:'source',reason:'output_source_not_confirmed',outputBindingId:output.outputBindingId});
  }
  return {schemaVersion:SPACE_EVIDENCE_SCHEMA,status:findings.length?'block':'pass',findings,
    executionEligibility:purpose==='offline_review'?'denied':findings.length?'denied':'eligible',sidecar};
}

export function bindSystemTargetProgram(evidence,packet,task,layers,purpose) {
  assertSpaceEvidenceBinding(evidence,packet,task,purpose);
  const program=resolveTargetFunctionalProgram(task.subtype);
  if (task.generationBasis==='continuation' && fingerprint(program)!==fingerprint(task.continuation?.targetFunctionalProgram)) fail('system_program_task_mismatch');
  const expected=buildTargetSceneProjection({targetProgram:program});
  const entries=[],outputs=[];
  const lists=[['_raw.sceneProgram','functionalRequirement.sceneProgram','sceneProgram'],
    ['_raw.functionalNetwork','functionalRequirement.functionalNetwork','functionalNetwork'],
    ['composition.mustBeVisible','composition.mustBeVisible','mustBeVisible'],
    ['architectureFunctionBridge.operationConstraints','architectureFunctionBridge.operationConstraints','operationConstraints']];
  for(const [outputPath,rulePath,field] of lists) {
    const values=valueAt(expected,rulePath);
    if (fingerprint(valueAt(layers,outputPath)) !== fingerprint(values)) fail(`system_projection_mismatch:${outputPath}`);
    for(const [index,text] of values.entries()) {
      const typed=spatialSemanticEvidence(text,field,index);
      const fieldPath=`systemTargetProgram.${rulePath}[${index}]`;
      const entry={sourceKind:'system_target_program',sourceOwner:'target-functional-programs/target-scene-projection',
        sourceRecordId:`${program.sceneId}:${fingerprint(program)}:${fingerprint(taskScope(task))}`,
        packetFingerprint:evidence.packetFingerprint,fieldPath,sourceFieldPath:fieldPath,originalIndex:index,originalText:text,packetText:text,
        entryFingerprint:fingerprint({fieldPath,text,task:taskScope(task)}),sourceStatus:'system_generated_task_scoped',
        confirmationStatus:'not_user_confirmation',evidenceRefs:[`task:${task.taskId}`,`program:${program.sceneId}`],
        parentScope:{fieldPath,originalText:text,start:0,end:text.length,programFingerprint:fingerprint(program)},
        semanticType:typed.type,modality:typed.modality,semanticValidation:typed.validation,clauses:typed.clauses};
      const scoped=scopeSourceEntries([{text,sourcePath:fieldPath,sourceEvidence:entry}],task.subtype)[0];
      entries.push(entry);
      outputs.push({outputBindingId:entry.entryFingerprint,sourceEntryIds:[entry.entryFingerprint],fieldPath,originalIndex:index,
        originalText:text,parentScope:entry.parentScope,semanticType:entry.semanticType,modality:entry.modality,
        outputPath:`${outputPath}[${index}]`,outputText:text,sourceRange:{start:0,end:text.length},outputRange:{start:0,end:text.length},
        sceneScope:scoped.sceneScope,visibilityAuthority:scoped.sceneScope==='current_shot'?'current_shot':scoped.sceneScope==='cross_scene_constraint'?'current_boundary_only':'none'});
    }
  }
  return {entries,outputs};
}
